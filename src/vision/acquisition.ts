/**
 * 사진 보는 모델을 받고 지운다.
 *
 * 계약: specs/011-photo-vision-summary/spec.md FR-026~031
 *       specs/011-photo-vision-summary/data-model.md 「준비 상태를 둘에서 하나로」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **003의 것을 고치지 않고 쓴다.**
 *
 * `DownloadPort`·`ModelFilePort`·`MetadataPort`가 **이미 캐릭터를 모른다** —
 * `start(key, url, …)`처럼 자산키와 주소만 받는다(`src/models/port.ts`). 캐릭터 모양은
 * `models/acquisition.ts`의 busy 슬롯과 `assetFor()`에만 있다.
 *
 * 그래서 **이 파일이 003의 계약을 하나도 바꾸지 않고** 같은 통로를 쓴다. 008이
 * 「고친 것은 그것을 부르는 쪽뿐이다」로 정한 것과 같은 판단이며, 003의 테스트가
 * 두껍다는 것이 그 판단의 근거다.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * **⚠️ 지금은 캐릭터와 동시에 받을 수 있다.** 003의 「한 번에 하나」(FR-020)가 이 쌍에는
 * 적용되지 않는다 — `models/acquisition.ts`의 busy 슬롯이 캐릭터 단위이기 때문이다.
 * **미룬 것이며 잊은 것이 아니다**(tasks.md T009~T011의 「미룬 까닭」).
 */

import { readinessOf } from "../models/readiness";
import type { DiskSpacePort, DownloadPort, MetadataPort, ModelFilePort } from "../models/port";
import { readState, verdictFor, withVerdict, writeState } from "../models/storage";
import type { DownloadFailure, ModelReadiness } from "../models/types";
import { foldVisionReadiness } from "./readiness";
import { visionAssets, type VisionAsset } from "./roster";

/** 이 모듈이 기기에 의존하는 전부. 테스트는 통째로 대역으로 바꾼다 */
export type VisionAcquisitionPorts = {
  files: ModelFilePort;
  metadata: MetadataPort;
  disk: DiskSpacePort;
  download: DownloadPort;
};

export type VisionAcquisitionResult = { ok: true } | { ok: false; failure: DownloadFailure };

/**
 * 사진 보는 모델의 준비 상태를 읽는다.
 *
 * **두 파일을 각각 보고 하나로 접는다**(FR-026). 밖으로는 `ModelReadiness` 하나만
 * 나가므로 **화면이 파일 개수를 알 수 없다**(원칙 III).
 */
export async function visionReadiness(ports: VisionAcquisitionPorts): Promise<ModelReadiness> {
  const assets = visionAssets();

  // 상태 파일은 한 번만 읽는다 — 003이 한 파일에 모아 둔 이유가 그것이다.
  const state = await readState(ports.metadata).catch(() => ({}) as never);

  const [base, projector] = await Promise.all([
    readinessOfAsset(ports, assets.base, state),
    readinessOfAsset(ports, assets.projector, state),
  ]);

  return foldVisionReadiness(base, projector);
}

/** 파일 하나의 준비 상태. **003의 `readinessOf()`를 그대로 쓴다** */
async function readinessOfAsset(
  ports: VisionAcquisitionPorts,
  asset: VisionAsset,
  state: Awaited<ReturnType<typeof readState>>,
): Promise<ModelReadiness> {
  const file = await ports.files.facts(asset.key);

  return readinessOf({
    assetKey: asset.key,
    expectedBytes: asset.expectedBytes,
    expectedMd5: asset.md5,
    file,
    verdict: verdictFor(state, asset.key),
    // **이어받기를 다루지 않는다** — 008이 캐릭터에서 푼 문제이고, 여기서 다시 열면
    // 두 축이 엉킨다. 받다 만 것은 다시 받는다.
    paused: null,
    hasPartialFile: false,
  });
}

/**
 * 사진 보는 모델을 받는다. **두 파일을 차례로 받는다**(FR-027).
 *
 * **하나라도 실패하면 실패다** — 본체만 있는 상태로 「준비됐다」고 말하지 않는다.
 * `initMultimodal`이 mmproj 없이는 서지 않으므로 그것은 거짓이 된다.
 *
 * **★ md5를 채록한다**(FR-031, 원칙 V). 로스터의 지문이 비어 있으면 받은 파일에서
 * 읽어 남긴다 — 003의 `readiness.md` 「기준값이 아직 없을 때」와 같은 방식이며,
 * **미리 적는 지문은 어디서 왔든 짐작이다.**
 */
export async function prepareVision(
  ports: VisionAcquisitionPorts,
  onProgress?: (fraction: number | null) => void,
): Promise<VisionAcquisitionResult> {
  const assets = visionAssets();
  const total = assets.base.expectedBytes + assets.projector.expectedBytes;

  let done = 0;
  for (const asset of [assets.base, assets.projector]) {
    const outcome = await fetchOne(ports, asset, (bytes) => {
      // **캐릭터 단위 진행률과 같은 성질이다** — 파일이 둘이라는 것이 드러나지 않게
      // 합쳐서 하나의 비율로 낸다(FR-026).
      onProgress?.(total > 0 ? Math.min(1, (done + bytes) / total) : null);
    });

    if (!outcome.ok) return outcome;
    done += asset.expectedBytes;
  }

  onProgress?.(1);
  return { ok: true };
}

async function fetchOne(
  ports: VisionAcquisitionPorts,
  asset: VisionAsset,
  onBytes: (bytes: number) => void,
): Promise<VisionAcquisitionResult> {
  // 이미 있으면 다시 받지 않는다.
  const facts = await ports.files.facts(asset.key);
  if (facts.exists && (facts.bytes ?? 0) >= asset.expectedBytes) {
    onBytes(asset.expectedBytes);
    return { ok: true };
  }

  // 공간을 본다. **크기를 밖으로 말하지 않는다**(003 FR-019a).
  const free = await ports.disk.availableBytes();
  if (free < asset.expectedBytes) return { ok: false, failure: { kind: "insufficient-space" } };

  const handle = ports.download.start(asset.key, asset.url, (progress) => {
    onBytes(progress.bytesWritten);
  });

  const outcome = await handle.wait();
  if (outcome.kind === "failed") {
    return { ok: false, failure: { kind: "network", reason: outcome.reason } };
  }
  if (outcome.kind === "paused") {
    return { ok: false, failure: { kind: "network", reason: "받다 멈췄다" } };
  }

  // ★ 지문을 본다 — 없으면 채록하고, 있으면 검증한다(FR-031).
  const hash = await ports.files.contentHash(asset.key);
  if (hash === null) return { ok: false, failure: { kind: "verification-failed" } };

  if (asset.md5 !== "" && hash !== asset.md5) {
    // 온전하지 않은 파일을 남기지 않는다 — 남기면 다음에 「있다」로 읽힌다.
    await ports.files.remove(asset.key).catch(() => {});
    return { ok: false, failure: { kind: "verification-failed" } };
  }

  const bytes = (await ports.files.facts(asset.key)).bytes ?? 0;
  const state = await readState(ports.metadata).catch(() => ({}) as never);
  await writeState(
    ports.metadata,
    withVerdict(state, {
      assetKey: asset.key,
      verifiedMd5: hash,
      verifiedBytes: bytes,
      // **기준값이 없으면 통과로 남긴다** — 채록이지 검증이 아니며, 그 사실이
      // 로스터의 빈 `md5`로 드러나 있다(원칙 V).
      passed: asset.md5 === "" || hash === asset.md5,
    }),
  ).catch(() => {});

  return { ok: true };
}

/**
 * 사진 보는 모델을 지운다. **두 파일 전부다**(FR-028).
 *
 * 하나만 지우면 남은 것이 자리를 차지한 채 「일부만 있음」이 되고, 사용자는 지웠다고
 * 생각하는데 공간이 그대로다.
 */
export async function removeVision(ports: VisionAcquisitionPorts): Promise<void> {
  const assets = visionAssets();
  for (const asset of [assets.base, assets.projector]) {
    await ports.files.remove(asset.key).catch(() => {});
  }
}

/**
 * 사진 보는 모델이 차지하는 자리 (FR-029).
 *
 * **두 파일을 합쳐 하나의 수로 낸다** — 003이 캐릭터 단위로 합산한 것과 같은 이유이며,
 * 쪼개 보이면 파일 구성이 드러난다.
 */
export async function visionStorageBytes(ports: VisionAcquisitionPorts): Promise<number> {
  const assets = visionAssets();

  // **`bytesUsed`를 쓴다 — 부분 파일까지 센다**(003 FR-028). `facts()`는 완성된 파일만
  // 보므로, 받다 만 것이 자리를 차지하고 있는데 0으로 보인다.
  const sizes = await Promise.all(
    [assets.base, assets.projector].map((asset) => ports.files.bytesUsed(asset.key).catch(() => 0)),
  );

  return sizes.reduce((sum, bytes) => sum + bytes, 0);
}
