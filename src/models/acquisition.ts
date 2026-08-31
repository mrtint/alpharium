/**
 * 모델 파일 내려받기 — 시작·진행·중단·재개·공간.
 *
 * 계약: specs/003-character-model-files/contracts/acquisition.md
 *       specs/026-parallel-model-download/contracts/concurrent-acquisition.md
 *
 * 헌법 「로스터」의 **"사용자가 고른 캐릭터의 모델만 내려받는 구조여야 한다(MUST)"** 가
 * 여기서 성립한다. 구조의 문제이므로 나중에 고칠 수 없다.
 *
 * **GB 단위 파일을 다루는 유일한 자리다.** 002의 저장이 수십 KB였던 것과 다르며, 그래서
 * 진행·중단·재개·공간이 부가 기능이 아니라 본체다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **026이 "한 번에 하나"(003 FR-020)를 해제했다.** 서로 다른 캐릭터를 무제한 동시에
 * 받는다. `busy` 거부 갈래는 유지되나(FR-028) 의미가 **"같은 캐릭터 중복 요청"**으로
 * 좁아진다(FR-003) — 같은 파일을 두 다운로드가 동시에 쓰면 손상되기 때문이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Character } from "../diary/types";
import { remainingCapacity } from "./segmented/plan";
import type { DownloadPort, DiskSpacePort, MetadataPort, ModelFilePort } from "./port";
import { assetFor } from "./roster";
import {
  pausedFor,
  readState,
  segmentedFor,
  withPaused,
  withSegmentedResume,
  withVerdict,
  withoutAsset,
  writeState,
} from "./storage";
import type { DownloadFailure, DownloadProgress } from "./types";
import { verifyDownloaded } from "./verification";

/**
 * 요구하는 공간 여유 배수.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 값은 실측이 아니라 판단이다**(research.md §3, 헌법 원칙 V).
 *
 * 딱 맞게 시작하면 여유가 0이 되어 안드로이드의 공간 확보 대상이 되고, 방금 받은 모델이
 * 지워질 수 있다(FR-021e의 상황을 우리가 만드는 셈). 이어받기의 임시 파일도 최종 파일과
 * 잠시 함께 존재할 수 있다.
 *
 * **실기기에서 재서 확정한다**(FR-019c, quickstart F6, T043). 그때까지 이 숫자는 잠정이며
 * 확정된 사실로 읽지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const SPACE_HEADROOM = 1.15;

export type AcquisitionPorts = {
  files: ModelFilePort;
  metadata: MetadataPort;
  disk: DiskSpacePort;
  download: DownloadPort;
};

export type AcquisitionResult =
  { ok: true; verified: boolean } | { ok: false; failure: DownloadFailure };

/**
 * 내려받기를 다루는 것.
 *
 * **서로 다른 캐릭터를 동시에 받는다**(026 FR-001·002). 받는 중인 캐릭터들을 **메모리에**
 * `Map`으로 들고, **같은 캐릭터의 중복 요청만** 거부한다(FR-003) — 저장소에 남기면 앱이
 * 죽었을 때 영원히 진행 중인 캐릭터가 생긴다(003의 판단, FR-009).
 *
 * **"진행 중"과 "중단됨"은 다른 것이다**: 전자는 순간의 상태라 메모리에, 후자는 "여기까지
 * 받았다"는 사실이라 기기에 남는다.
 */
export interface Acquisition {
  prepare(
    character: Character,
    onProgress?: (p: DownloadProgress) => void,
  ): Promise<AcquisitionResult>;
  /** 멈춘다. 인자 없으면 받는 중인 전부, 있으면 그 캐릭터만 (026 FR-004) */
  pause(character?: Character): Promise<void>;
  /** 지금 받는 중인 캐릭터들. 없으면 빈 배열 (026 FR-005) */
  busyWith(): Character[];
}

/** 받는 중인 한 캐릭터의 상태. 멈추기 핸들 + 공간 판정용 최신 바이트 */
type Running = {
  handle: { pause(): Promise<void> };
  /** 지금까지 받은 바이트. 진행 콜백이 갱신한다. 공간 판정(§6)에만 쓰이고 밖으로 안 나감 */
  receivedBytes: number;
};

export function createAcquisition(ports: AcquisitionPorts): Acquisition {
  /** 지금 받는 중인 캐릭터들. **메모리에만 있다** */
  const running = new Map<Character, Running>();

  return {
    busyWith() {
      return [...running.keys()];
    },

    async pause(character) {
      if (character === undefined) {
        for (const entry of running.values()) await entry.handle.pause();
        return;
      }
      await running.get(character)?.handle.pause();
    },

    async prepare(character, onProgress) {
      // 1. **같은 캐릭터**를 이미 받는 중인가 (026 FR-003).
      //
      //    003의 "다른 캐릭터면 거부"와 달리, 이제는 같은 캐릭터의 중복 요청만 막는다.
      //    서로 다른 캐릭터는 무제한 병행한다(FR-001·002). `busyWith`는 그 캐릭터
      //    자신이다 — 무엇을 멈춰야 재요청이 통하는지 알린다.
      if (running.has(character)) {
        return { ok: false, failure: { kind: "busy", busyWith: character } };
      }

      // **자리를 곧바로 잡는다.** 아래에 `await`가 있으므로, 여기서 잡지 않으면 두 요청이
      // 나란히 검사를 통과해 같은 파일을 둘이 쓴다 — 파일이 손상된다.
      // 자바스크립트가 단일 스레드라 해도 `await` 사이에 다른 요청이 끼어들 수 있다.
      const slot: Running = { handle: { async pause() {} }, receivedBytes: 0 };
      running.set(character, slot);
      try {
        const asset = assetFor(character);
        const state = await readState(ports.metadata);
        const paused = pausedFor(state, asset.key);
        const segmented = segmentedFor(state, asset.key);

        // 2. 공간을 본다 (FR-019, 026 FR-007).
        //
        // **기준 크기를 아직 재지 않았으면(0) 사전 판정을 건너뛴다** — 없는 기준으로
        // 판정하지 않는다(research.md 「값을 언제 채우는가」). 그 경우 받는 도중에
        // 공간이 떨어질 수 있고, 그것은 network 실패로 드러난다.
        //
        // **동시 다운로드에서는 이미 받는 중인 것들의 남은 용량을 여유에서 뺀다**
        // (026 §6) — 시작 시점을 각자 통과한 여러 다운로드가 공간을 다 써 버리지
        // 않도록. 이 자산의 슬롯은 방금 만들었으므로 receivedBytes=0이라 스스로를
        // 빼도 무해하지만, 명시적으로 제외한다.
        if (asset.expectedBytes > 0) {
          const available = await ports.disk.availableBytes();
          let inFlight = 0;
          for (const [c, entry] of running) {
            if (c === character) continue;
            inFlight += remainingCapacity(assetFor(c).expectedBytes, entry.receivedBytes);
          }
          if (available - inFlight < asset.expectedBytes * SPACE_HEADROOM) {
            return { ok: false, failure: { kind: "insufficient-space" } };
          }
        }

        const report = (bytesWritten: number, totalBytes: number) => {
          slot.receivedBytes = bytesWritten;
          onProgress?.({
            character,
            fraction: fractionOf(bytesWritten, totalBytes, asset.expectedBytes),
          });
        };

        // 3. 이어받거나 처음부터 받는다 (FR-015, FR-016, 026 FR-022).
        //
        //    세그먼트 재개 상태가 있으면 그것을, 단일 스트림 중단 상태가 있으면 그것을,
        //    둘 다 없으면 처음부터. 세그먼트와 단일 스트림 재개는 상호배타다.
        const task =
          segmented !== null
            ? ports.download.resume(asset.key, asset.url, segmented, (p) =>
                report(p.bytesWritten, p.totalBytes),
              )
            : paused !== null
              ? ports.download.resume(asset.key, asset.url, paused.state, (p) =>
                  report(p.bytesWritten, p.totalBytes),
                )
              : ports.download.start(asset.key, asset.url, (p) =>
                  report(p.bytesWritten, p.totalBytes),
                );

        slot.handle = task;
        const outcome = await task.wait();

        // 4-a. 사용자가 멈췄다. **실패가 아니다** — 이어받을 수 있는 상태로 남긴다.
        //
        //      `outcome.state`가 `SegmentedResume` 모양(`segmentCount` 있음)이면
        //      `withSegmentedResume`, 아니면 `withPaused` (data-model.md 상태 전이).
        if (outcome.kind === "paused") {
          const fresh = await readState(ports.metadata);
          const next = isSegmentedResume(outcome.state, asset.key)
            ? withSegmentedResume(fresh, {
                assetKey: asset.key,
                totalBytes: outcome.state.totalBytes,
                segmentCount: outcome.state.segmentCount,
                receivedBytes: outcome.state.receivedBytes,
              })
            : withPaused(fresh, { assetKey: asset.key, state: outcome.state });
          await writeState(ports.metadata, next);
          return { ok: false, failure: { kind: "network", reason: "받다가 멈췄다" } };
        }

        // 4-b. 끊겼다. **"받았음"으로 판정되지 않는다**(FR-018).
        if (outcome.kind === "failed") {
          return { ok: false, failure: { kind: "network", reason: outcome.reason } };
        }

        // 5. 다 받았다. **검증을 통과해야 쓸 수 있다**(FR-007, FR-021a).
        const verdict = await verifyDownloaded(ports.files, {
          assetKey: asset.key,
          expectedBytes: asset.expectedBytes,
          expectedMd5: asset.md5,
        });

        // 검증에 실패하면 기록을 남기되 **대체 자산으로 채우지 않는다**(FR-035, 원칙 I).
        // `withoutAsset`이 세그먼트 재개 상태도 함께 비운다 (026) — 다 받았으므로 유효하지 않다.
        const settled = withVerdict(
          withoutAsset(await readState(ports.metadata), asset.key),
          verdict,
        );
        await writeState(ports.metadata, settled);

        if (!verdict.passed) {
          return { ok: false, failure: { kind: "verification-failed" } };
        }

        return { ok: true, verified: asset.md5 !== "" };
      } finally {
        // 성공·실패와 무관하게 빠진다. 빠지지 않으면 실패한 캐릭터를 영영 다시 시도할 수 없다.
        running.delete(character);
      }
    },
  };
}

/**
 * `TransferOutcome.paused`의 `state`가 026의 `SegmentedResume`인지 본다.
 *
 * 003의 단일 스트림 재개는 `savable()`의 불투명 값이라 `segmentCount`가 없다.
 * 세그먼트 재개는 우리가 만든 명시적 구조라 있다 (data-model.md).
 */
function isSegmentedResume(
  state: unknown,
  assetKey: string,
): state is { assetKey: string; totalBytes: number; segmentCount: number; receivedBytes: number[] } {
  return (
    typeof state === "object" &&
    state !== null &&
    "segmentCount" in state &&
    "receivedBytes" in state &&
    Array.isArray((state as { receivedBytes: unknown }).receivedBytes) &&
    // 다른 자산의 것이 섞이지 않는다.
    ("assetKey" in state ? (state as { assetKey: string }).assetKey === assetKey : true)
  );
}

/**
 * 진행도를 0~1로 만든다.
 *
 * **"모름"을 지어내지 않는다**(원칙 V). 서버가 `Content-Length`를 주지 않으면 `totalBytes`가
 * `-1`이고(research.md §1), 그때는 매핑의 예상 크기로 갈음한다. **그것도 없으면 null이다** —
 * 그럴듯한 백분율을 만들어 보이는 것이 원칙 V 위반이다.
 *
 * **바이트가 이 함수 밖으로 나가지 않는다**(FR-013a) — `totalBytes`가 곧 모델 크기다.
 */
export function fractionOf(
  bytesWritten: number,
  totalBytes: number,
  expectedBytes: number,
): number | null {
  const total = totalBytes > 0 ? totalBytes : expectedBytes > 0 ? expectedBytes : 0;
  if (total <= 0) return null;
  return Math.min(1, bytesWritten / total);
}
