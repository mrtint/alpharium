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
import { mergeProgress, planSegments, remainingSegments } from "./plan";
import type { SegmentedResume } from "./types";

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
  let segmentsToFetch: ReturnType<typeof planSegments>["segments"];
  let receivedBytes: number[];

  if (opts.resume) {
    totalBytes = opts.resume.totalBytes;
    segmentCount = opts.resume.segmentCount;
    segmentsToFetch = remainingSegments(opts.resume);
    receivedBytes = [...opts.resume.receivedBytes];
  } else {
    const support = await deps.range.probeRange(url);
    if (support.kind === "unsupported") {
      return { kind: "fallback" };
    }
    totalBytes = support.totalBytes;
    const plan = planSegments(totalBytes);
    // 파일이 작아 단일 구간이면 세그먼트 이득이 없다 — 폴백으로.
    if (plan.segments.length <= 1) {
      return { kind: "fallback" };
    }
    segmentCount = plan.segments.length;
    segmentsToFetch = plan.segments;
    receivedBytes = plan.segments.map(() => 0);
  }

  // 재개인데 남은 구간이 없다 — 이미 다 받았다. 호출자가 곧바로 지문 검증으로.
  if (segmentsToFetch.length === 0) {
    opts.onProgress(1);
    return { kind: "completed" };
  }

  // 3. 한 구간 실패 시 나머지를 취소할 내부 컨트롤러. 사용자 멈춤 신호와 합친다.
  const internal = new AbortController();
  const onPause = () => internal.abort();
  opts.pauseSignal.addEventListener("abort", onPause, { once: true });

  const report = () => opts.onProgress(mergeProgress(receivedBytes, totalBytes));

  try {
    // 4. 모든 남은 구간을 병렬로.
    const results = await Promise.all(
      segmentsToFetch.map((segment) =>
        deps.range.fetchRange(
          key,
          url,
          segment,
          (delta) => {
            receivedBytes[segment.index] += delta;
            report();
          },
          internal.signal,
        ),
      ),
    );

    // 5. 결과 취합.
    const failed = results.find((r) => r.kind === "failed");
    if (failed && failed.kind === "failed") {
      internal.abort();
      return { kind: "failed", reason: failed.reason };
    }

    if (results.some((r) => r.kind === "aborted") || opts.pauseSignal.aborted) {
      return {
        kind: "paused",
        resume: { assetKey: key, totalBytes, segmentCount, receivedBytes },
      };
    }

    opts.onProgress(1);
    return { kind: "completed" };
  } finally {
    opts.pauseSignal.removeEventListener("abort", onPause);
  }
}
