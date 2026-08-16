/**
 * 모델 파일 내려받기 — 시작·진행·중단·재개·공간.
 *
 * 계약: specs/003-character-model-files/contracts/acquisition.md
 *
 * 헌법 「로스터」의 **"사용자가 고른 캐릭터의 모델만 내려받는 구조여야 한다(MUST)"** 가
 * 여기서 성립한다. 구조의 문제이므로 나중에 고칠 수 없다.
 *
 * **GB 단위 파일을 다루는 유일한 자리다.** 002의 저장이 수십 KB였던 것과 다르며, 그래서
 * 진행·중단·재개·공간이 부가 기능이 아니라 본체다.
 */

import type { Character } from "../diary/types";
import type { DownloadPort, DiskSpacePort, MetadataPort, ModelFilePort } from "./port";
import { assetFor } from "./roster";
import { pausedFor, readState, withPaused, withVerdict, withoutAsset, writeState } from "./storage";
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
 * **한 번에 하나만 받는다**(FR-020). 진행 중인 캐릭터를 **메모리에** 들고 뒤의 요청은
 * 거부한다 — 저장소에 남기면 앱이 죽었을 때 영원히 진행 중인 캐릭터가 생긴다(002의
 * `running` Set과 같은 판단).
 *
 * **"진행 중"과 "중단됨"은 다른 것이다**: 전자는 순간의 상태라 메모리에, 후자는 "여기까지
 * 받았다"는 사실이라 기기에 남는다.
 */
export interface Acquisition {
  prepare(
    character: Character,
    onProgress?: (p: DownloadProgress) => void,
  ): Promise<AcquisitionResult>;
  pause(): Promise<void>;
  /** 지금 받는 중인 캐릭터. 없으면 null */
  busyWith(): Character | null;
}

export function createAcquisition(ports: AcquisitionPorts): Acquisition {
  /** 지금 받는 중인 캐릭터. **메모리에만 있다** */
  let running: Character | null = null;
  /** 지금 작업. 중단에 쓴다 */
  let handle: { pause(): Promise<void> } | null = null;

  return {
    busyWith() {
      return running;
    },

    async pause() {
      if (handle !== null) await handle.pause();
    },

    async prepare(character, onProgress) {
      // 1. 다른 캐릭터를 받는 중인가 (FR-020).
      //
      // 앞의 것을 취소하고 바꿔치기하지 않는다 — 사용자가 멈추면 새 요청이 통하므로
      // (FR-020a) 갇히지 않는다.
      if (running !== null && running !== character) {
        return { ok: false, failure: { kind: "busy", busyWith: running } };
      }

      // **자리를 곧바로 잡는다.** 아래에 `await`가 있으므로, 여기서 잡지 않으면 두 요청이
      // 나란히 busy 검사를 통과해 둘 다 받기 시작한다 — 헌법 로스터가 금지한 상태다.
      // 자바스크립트가 단일 스레드라 해도 `await` 사이에 다른 요청이 끼어들 수 있다.
      running = character;
      try {
        const asset = assetFor(character);
        const state = await readState(ports.metadata);
        const paused = pausedFor(state, asset.key);

        // 2. 공간을 본다 (FR-019).
        //
        // **기준 크기를 아직 재지 않았으면(0) 사전 판정을 건너뛴다** — 없는 기준으로
        // 판정하지 않는다(research.md 「값을 언제 채우는가」). 그 경우 받는 도중에
        // 공간이 떨어질 수 있고, 그것은 network 실패로 드러난다.
        if (asset.expectedBytes > 0) {
          const available = await ports.disk.availableBytes();
          if (available < asset.expectedBytes * SPACE_HEADROOM) {
            return { ok: false, failure: { kind: "insufficient-space" } };
          }
        }

        const report = (bytesWritten: number, totalBytes: number) => {
          onProgress?.({
            character,
            fraction: fractionOf(bytesWritten, totalBytes, asset.expectedBytes),
          });
        };

        // 3. 이어받거나 처음부터 받는다 (FR-015, FR-016).
        const task =
          paused !== null
            ? ports.download.resume(asset.key, paused.state, (p) =>
                report(p.bytesWritten, p.totalBytes),
              )
            : ports.download.start(asset.key, asset.url, (p) =>
                report(p.bytesWritten, p.totalBytes),
              );

        handle = task;
        const outcome = await task.wait();

        // 4-a. 사용자가 멈췄다. **실패가 아니다** — 이어받을 수 있는 상태로 남긴다.
        if (outcome.kind === "paused") {
          await writeState(
            ports.metadata,
            withPaused(await readState(ports.metadata), {
              assetKey: asset.key,
              state: outcome.state,
            }),
          );
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
        const settled = withVerdict(
          // 다 받았으므로 중단 정보는 더 이상 유효하지 않다.
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
        running = null;
        handle = null;
      }
    },
  };
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
