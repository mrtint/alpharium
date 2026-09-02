/**
 * 필수 에셋(공용 사진 모델 + 온보딩 기본 캐릭터)의 기기 통로 (029).
 *
 * 계약: specs/029-writing-flow-simplification/contracts/onboarding-assets.md B
 *       (BR1~BR5)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`src/app/`에 둔다 — `src/onboarding/`이 아니다.** `checkOnboardingFile`이
 * `src/onboarding/**`의 `models/roster` import를 막고, 이 파일은 `assetFor("quiet")`가
 * 필요하다. `src/app/`은 "조립"이라 로스터 접근이 허용된다(`checkSourceFile`의
 * `UI_TOUCHES_MODEL`은 `src/ui/`만 대상). research §5.
 *
 * **순수 판정(`essential-assets.ts`)은 `src/onboarding/`에 그대로 있다** — 그 파일은
 * `Character` 타입과 문자열 상수뿐이라 `checkOnboardingFile`을 통과한다.
 *
 * **자산의 URL·바이트를 화면으로 넘기지 않는다**(BR4, 원칙 III) — 이 통로가 돌려주는
 * 것은 `{ key, ready }`와 진행률 `fraction` 하나뿐이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createAcquisition, SPACE_HEADROOM } from "../models/acquisition";
import { expoModelPorts } from "../models/expo-port";
import { readinessOf } from "../models/readiness";
import { assetFor } from "../models/roster";
import { pausedFor, readState, verdictFor } from "../models/storage";
import { prepareVision, visionReadiness, type VisionAcquisitionPorts } from "../vision/acquisition";
import { essentialDownloadFraction } from "../onboarding/essential-assets";
import { visionAssets } from "../vision/roster";

export type EssentialAssetFact = { key: string; ready: boolean };

export type EssentialDownloadResult =
  { ok: true } | { ok: false; reason: "insufficient-space" | "network" | "unknown" };

export type EssentialAssetsPort = {
  /** 필수 자산 3개의 준비 상태를 실시간 조회 (BR1, FR-019·020). */
  readFacts(): Promise<EssentialAssetFact[]>;
  /**
   * 필수 자산을 받는다 (BR2, FR-015·017·021). 011 `prepareVision` + 003
   * `prepare("quiet")`를 부르고, 두 진행을 합산해 하나의 fraction으로 넘긴다.
   * 이미 받은 부분은 이어받는다(026 자동).
   */
  downloadEssentials(onProgress: (fraction: number) => void): Promise<EssentialDownloadResult>;
  /** 받기 전 공간이 충분한지 (BR3, FR-022). 003 `SPACE_HEADROOM` 재사용. */
  hasSpaceForEssentials(): Promise<boolean>;
};

/** `ModelReadiness`를 "쓸 수 있는가" boolean으로. `ready`만 참. */
function isReady(kind: string): boolean {
  return kind === "ready";
}

export function expoEssentialAssetsPort(): EssentialAssetsPort {
  const modelPorts = expoModelPorts();
  // `VisionAcquisitionPorts`는 `ModelPorts`의 부분집합이라 그대로 넘긴다.
  const visionPorts = modelPorts as unknown as VisionAcquisitionPorts;

  return {
    async readFacts() {
      const quietKey = assetFor("quiet").key;

      const [vision, quiet] = await Promise.all([
        visionReadiness(visionPorts).catch(() => ({ kind: "not-downloaded" as const })),
        (async () => {
          try {
            const state = await readState(modelPorts.metadata);
            const asset = assetFor("quiet");
            const facts = await modelPorts.files.facts(asset.key);
            return readinessOf({
              assetKey: asset.key,
              expectedBytes: asset.expectedBytes,
              expectedMd5: asset.md5,
              file: facts,
              verdict: verdictFor(state, asset.key),
              paused: pausedFor(state, asset.key),
              hasPartialFile: false,
            });
          } catch {
            return { kind: "not-downloaded" as const };
          }
        })(),
      ]);

      const visionReady = isReady(vision.kind);
      return [
        { key: "v1", ready: visionReady },
        { key: "v2", ready: visionReady },
        { key: quietKey, ready: isReady(quiet.kind) },
      ];
    },

    async downloadEssentials(onProgress) {
      // 두 갈래의 진행을 합산한다. 각 갈래의 총 바이트는 로스터에서 온다(이 통로
      // 안에서만 — 화면으로 나가지 않는다, BR4).
      const va = visionAssets();
      const visionTotal = va.base.expectedBytes + va.projector.expectedBytes;
      const quietTotal = assetFor("quiet").expectedBytes;

      let visionReceived = 0;
      let quietReceived = 0;
      const report = () =>
        onProgress(
          essentialDownloadFraction([
            { receivedBytes: visionReceived, totalBytes: visionTotal },
            { receivedBytes: quietReceived, totalBytes: quietTotal },
          ]),
        );

      try {
        const acquisition = createAcquisition(modelPorts);

        const visionOutcome = await prepareVision(visionPorts, (fraction) => {
          visionReceived = fraction === null ? visionReceived : fraction * visionTotal;
          report();
        });
        if (!visionOutcome.ok) {
          return { ok: false, reason: mapFailure(visionOutcome.failure.kind) };
        }
        visionReceived = visionTotal;
        report();

        const quietOutcome = await acquisition.prepare("quiet", (p) => {
          quietReceived = p.fraction === null ? quietReceived : p.fraction * quietTotal;
          report();
        });
        if (!quietOutcome.ok) {
          return { ok: false, reason: mapFailure(quietOutcome.failure.kind) };
        }
        quietReceived = quietTotal;
        report();

        return { ok: true };
      } catch {
        return { ok: false, reason: "unknown" };
      }
    },

    async hasSpaceForEssentials() {
      try {
        const va = visionAssets();
        const need =
          (va.base.expectedBytes + va.projector.expectedBytes + assetFor("quiet").expectedBytes) *
          SPACE_HEADROOM;
        const available = await modelPorts.disk.availableBytes();
        return available >= need;
      } catch {
        // 조회 실패 시 막지 않는다 — 실제 다운로드가 insufficient-space로 알린다.
        return true;
      }
    },
  };
}

/** `DownloadFailure["kind"]`를 온보딩 화면이 이해하는 세 갈래로. */
function mapFailure(kind: string): "insufficient-space" | "network" | "unknown" {
  if (kind === "insufficient-space") return "insufficient-space";
  if (kind === "network") return "network";
  return "unknown";
}
