/**
 * 세그먼트 병렬 전송 조립 — `RangeFetchPort`를 주입받아 구간들을 병렬로 받는다.
 *
 * 계약: specs/026-parallel-model-download/contracts/segmented-transfer.md 「조립」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`runSegmented`는 지문 검증도 `state.json` 쓰기도 하지 않는다** — 호출자
 * (`expo-port.ts`, 그 위의 `acquisition.ts`) 몫이다. 여기서는 "구간들을 받아 파일에
 * 쓴다"까지만.
 *
 * **`Character`를 모른다** (FR-019) — `AssetKey`만. `checkSegmentedFile`이 이 경계를
 * 잠근다.
 *
 * **진행률은 `fraction` 하나로만 콜백된다** (FR-016) — `mergeProgress`가 구간별 바이트를
 * 합쳐 낸다. 구간 개수·구간별 값이 콜백 밖으로 나가지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { AssetKey } from "../types";
import type { RangeFetchPort } from "../port";
import {
  SEGMENT_CONCURRENCY,
  mergeProgress,
  planSegments,
  receivedFromDone,
  remainingSegments,
} from "./plan";
import type { Segment, SegmentCheckpoint, SegmentedResume } from "./types";

export type SegmentedDeps = { range: RangeFetchPort };

export type SegmentedTransferResult =
  | { kind: "completed" }
  /** Range 미지원 또는 파일이 작음 → 호출자가 단일 스트림으로 */
  | { kind: "fallback" }
  | { kind: "paused"; resume: SegmentedResume }
  | { kind: "failed"; reason: string };

export type SegmentedOptions = {
  /** 있으면 이어받기 — 남은 구간부터 */
  resume?: SegmentedResume;
  /** 구간별 바이트를 합친 진행률 하나. 모르면 null (003 fractionOf와 동형) */
  onProgress: (fraction: number | null) => void;
  /**
   * 전체 크기가 정해진 순간 1회 호출된다 (`probeRange` 성공 또는 `resume`에서).
   *
   * **기기 통로(`expo-port.ts`)가 003의 `TransferProgress { bytesWritten, totalBytes }`
   * 모양을 복원하는 데 쓴다** — 003의 `fractionOf`가 그대로 동작하려면 실제 total이
   * 필요하다. 순수 코어 자체는 이 값을 진행률 계산에만 쓰고 밖으로 흘리지 않는다
   * (원칙 III — `onProgress`는 여전히 `fraction` 하나뿐). 폴백 경로에서는 호출되지
   * 않는다(호출자가 003 `createDownloadTask`의 진행 보고를 그대로 받는다).
   */
  onSizeResolved?: (totalBytes: number) => void;
  /**
   * 구간 하나가 끝나 최종 파일에 놓인 직후 누적 재개 기록으로 불린다 (113).
   *
   * **직렬이다** — 직전 호출이 끝난 뒤 다음을 부른다. 던져도 받기는 계속된다(최적화일 뿐).
   * 폴백(단일 스트림)에서는 부르지 않는다.
   */
  onCheckpoint?: SegmentCheckpoint;
  /** 사용자 "멈추기" */
  pauseSignal: AbortSignal;
};

/**
 * 세그먼트 병렬로 받는다. 흐름은 contracts/segmented-transfer.md 「조립」 1~5.
 */
export async function runSegmented(
  deps: SegmentedDeps,
  key: AssetKey,
  url: string,
  opts: SegmentedOptions,
): Promise<SegmentedTransferResult> {
  // 1~2. 계획을 정한다.
  let totalBytes: number;
  let segmentCount: number;
  let plan: ReturnType<typeof planSegments>;
  let segmentsToFetch: Segment[];
  const doneIndices = new Set<number>();

  if (opts.resume) {
    totalBytes = opts.resume.totalBytes;
    segmentCount = opts.resume.segmentCount;
    plan = planSegments(totalBytes, segmentCount);
    segmentsToFetch = remainingSegments(opts.resume);
    for (const index of opts.resume.doneIndices) doneIndices.add(index);
  } else {
    const support = await deps.range.probeRange(url);
    if (support.kind === "unsupported") {
      return { kind: "fallback" };
    }
    totalBytes = support.totalBytes;
    plan = planSegments(totalBytes);
    // 파일이 작아 단일 구간이면 세그먼트 이득이 없다 — 폴백으로.
    if (plan.segments.length <= 1) {
      return { kind: "fallback" };
    }
    segmentCount = plan.segments.length;
    segmentsToFetch = plan.segments;
  }

  // 진행 합산은 끝난 구간을 이미 받은 것으로 세어 시작한다 (113, FR-009).
  const receivedBytes = receivedFromDone(plan, [...doneIndices]);

  // 전체 크기가 정해졌다 — 기기 통로가 003 진행 보고 모양을 복원하는 데 쓴다.
  opts.onSizeResolved?.(totalBytes);

  // 재개인데 남은 구간이 없다 — 이미 다 받았다. 호출자가 곧바로 지문 검증으로.
  if (segmentsToFetch.length === 0) {
    opts.onProgress(1);
    return { kind: "completed" };
  }

  // 3. 한 구간 실패 시 나머지를 취소할 내부 컨트롤러. 사용자 멈춤 신호와 합친다.
  const internal = new AbortController();
  const onPause = () => internal.abort();
  opts.pauseSignal.addEventListener("abort", onPause, { once: true });
  // 신호가 진입 전이나 probe 중에 이미 발동했으면 리스너가 불리지 않는다 — 그대로 두면 멈춤이 무시된다.
  if (opts.pauseSignal.aborted) internal.abort();

  const report = () => opts.onProgress(mergeProgress(receivedBytes, totalBytes));
  if (opts.resume) report();

  const snapshot = (): SegmentedResume => ({
    assetKey: key,
    totalBytes,
    segmentCount,
    doneIndices: [...doneIndices].sort((a, b) => a - b),
  });

  /** 체크포인트 호출을 한 줄로 세운다. 던져도 받기는 계속된다. */
  let checkpointChain: Promise<void> = Promise.resolve();
  const checkpoint = (): Promise<void> => {
    const entry = snapshot();
    checkpointChain = checkpointChain.then(async () => {
      try {
        await opts.onCheckpoint?.(entry);
      } catch {
        // 이어받기만 잃는다 — 최종 지문 검증이 안전망이다.
      }
    });
    return checkpointChain;
  };

  try {
    // 4. 남은 구간을 동시에 `SEGMENT_CONCURRENCY`개씩 받는다 (113 — 일꾼이 큐에서 하나씩 꺼낸다).
    const queue = [...segmentsToFetch];
    let failure: string | null = null;
    let aborted = false;

    const worker = async (): Promise<void> => {
      while (!internal.signal.aborted) {
        const segment = queue.shift();
        if (segment === undefined) return;
        const outcome = await deps.range.fetchRange(
          key,
          url,
          segment,
          (delta) => {
            receivedBytes[segment.index] += delta;
            report();
          },
          internal.signal,
        );
        if (outcome.kind === "completed") {
          doneIndices.add(segment.index);
          await checkpoint();
          continue;
        }
        if (outcome.kind === "failed") {
          failure ??= outcome.reason;
        } else {
          aborted = true;
        }
        // 실패든 취소든 새 구간을 꺼내지 않고 진행 중인 구간을 취소한다.
        internal.abort();
        return;
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(SEGMENT_CONCURRENCY, segmentsToFetch.length) }, worker),
    );

    // 5. 결과 취합.
    if (failure !== null) {
      return { kind: "failed", reason: failure };
    }

    // 모두 끝났으면 멈춤 신호가 늦게 왔어도 끝난 것이다.
    if (doneIndices.size >= plan.segments.length) {
      opts.onProgress(1);
      return { kind: "completed" };
    }

    if (aborted || opts.pauseSignal.aborted) {
      return { kind: "paused", resume: snapshot() };
    }

    opts.onProgress(1);
    return { kind: "completed" };
  } finally {
    opts.pauseSignal.removeEventListener("abort", onPause);
  }
}
