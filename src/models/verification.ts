/**
 * 내용 검증.
 *
 * 계약: specs/003-character-model-files/contracts/readiness.md
 *
 * **크기가 아니라 내용으로 본다**(FR-021). 전송 중 조용히 망가진 파일은 크기가 그대로일
 * 수 있고, 그 파일이 "쓸 수 있음"으로 통과하면 헌법 원칙 V가 요구한 "받았는데 깨졌음"이
 * 판정되지 않는다.
 *
 * **내려받기가 끝난 직후와 받기를 시작할 때(110)만 부른다**(FR-021a). GB 전체를 읽으므로 상태를
 * 물을 때마다 부르면 화면이 멈춘다 — 그쪽은 존재·크기만 본다(FR-021d).
 */

import type { MetadataPort, ModelFilePort } from "./port";
import { readinessOf } from "./readiness";
import {
  pausedFor,
  readState,
  segmentedFor,
  verdictFor,
  withVerdict,
  withoutAsset,
  writeState,
} from "./storage";
import type { AssetKey, VerificationVerdict } from "./types";

/** 무엇과 견줄 것인가. 자산을 통째로 받지 않고 필요한 조각만 받는다(FR-003). */
export type VerificationTarget = {
  assetKey: AssetKey;
  /** 기준 크기. 아직 재지 않았으면 0 */
  expectedBytes: number;
  /** 기준 지문. 아직 재지 않았으면 빈 문자열 */
  expectedMd5: string;
};

/**
 * 받은 파일이 받으려던 그 파일인지 본다.
 *
 * **기준 지문이 없으면 채록이 된다**(contracts/readiness.md 「기준값이 아직 없을 때」).
 * 로스터의 지문은 실제로 받아 본 파일에서 재기로 했으므로, 첫 회에는 비교할 대상이 없다.
 * 그때는 계산한 값을 **기록**하고 통과시킨다 — 그 값이 로스터에 들어간 뒤부터 진짜 검증이
 * 된다.
 *
 * **이것이 "검증 없이 통과시키는 것"과 다르다**: 기록을 남기는 절차는 반드시 거치며,
 * 기록이 없으면 준비 상태가 `unusable`로 남는다(FR-021c). 달라지는 것은 "무엇과
 * 비교하는가"뿐이다.
 */
export async function verifyDownloaded(
  files: ModelFilePort,
  target: VerificationTarget,
): Promise<VerificationVerdict> {
  const facts = await files.facts(target.assetKey);
  const hash = await files.contentHash(target.assetKey);

  // 파일이 없거나 지문을 낼 수 없으면 기록할 것이 없다. 채록도 검증도 성립하지 않는다.
  if (!facts.exists || facts.bytes === null || hash === null) {
    return {
      assetKey: target.assetKey,
      verifiedMd5: "",
      verifiedBytes: 0,
      passed: false,
    };
  }

  // 기준이 있으면 견주고, 없으면 채록한다.
  const hasBaseline = target.expectedMd5 !== "";
  const passed = hasBaseline ? hash === target.expectedMd5 : true;

  return {
    assetKey: target.assetKey,
    verifiedMd5: hash,
    verifiedBytes: facts.bytes,
    passed,
  };
}

/**
 * 받기 전에 이미 있는 파일을 정리한다 (110). `ready`면 받을 것이 없고, `download`면 받아야 한다.
 *
 * 받기가 끝난 뒤 검증 기록 전에 앱이 죽으면 온전한 파일이 기록 없이 남는다(iPhone 13 mini, 2026-11-01 —
 * 같은 파일을 처음부터 다시 받았다). **크기로 통과시키지 않는다** — 구간은 끝나는 차례대로 제 오프셋에 쓰이므로
 * 합치던 도중에 죽은 파일도 크기가 기준과 같을 수 있다.
 *
 * 이어받기 기록이 있으면 손대지 않는다. 그 파일은 크기가 맞아도 아직 다 받지 않은 것이다.
 * 검증 기록을 쓰지 못하면 예외가 그대로 올라간다 — `ready`를 돌려주면 받았다고 하면서 준비되지 않은 상태가 된다.
 */
export async function settleExistingFile(
  ports: { files: ModelFilePort; metadata: MetadataPort },
  target: VerificationTarget,
): Promise<"ready" | "download"> {
  const state = await readState(ports.metadata);
  const paused = pausedFor(state, target.assetKey);
  const segmentedResume = segmentedFor(state, target.assetKey);
  if (paused !== null || segmentedResume !== null) return "download";

  const file = await ports.files.facts(target.assetKey);
  const readiness = readinessOf({
    assetKey: target.assetKey,
    expectedBytes: target.expectedBytes,
    expectedMd5: target.expectedMd5,
    file,
    verdict: verdictFor(state, target.assetKey),
    paused,
    segmentedResume,
    hasPartialFile: false,
  });
  if (readiness.kind === "ready") return "ready";

  // 기준 크기가 없으면 견줄 것이 없다 — 없는 기준으로 판정하지 않는다(readiness.ts 3번과 같은 규칙).
  if (target.expectedBytes <= 0 || file.bytes !== target.expectedBytes) {
    // 구간 받기는 파일을 자르지 않으므로 기준보다 큰 파일은 받아도 작아지지 않는다 — 두면 검증 실패와 다시 받기가 끝없이 돈다.
    if (target.expectedBytes > 0 && (file.bytes ?? 0) > target.expectedBytes) {
      await ports.files.remove(target.assetKey);
    }
    // 남은 기록을 두면 받는 도중에 죽은 파일의 크기가 기준에 닿는 순간 지문 없이 「준비됨」이 된다.
    if (verdictFor(state, target.assetKey) !== null) {
      await writeState(ports.metadata, withoutAsset(state, target.assetKey));
    }
    return "download";
  }

  // 지문 계산이 던져도 받으러 간다 — 깨진 파일이 있는 기기가 재시도마다 같은 자리에서 막히면 안 된다.
  const verdict = await verifyDownloaded(ports.files, target).catch(() => null);
  const current = await readState(ports.metadata);
  if (verdict?.passed) {
    await writeState(ports.metadata, withVerdict(withoutAsset(current, target.assetKey), verdict));
    return "ready";
  }

  await ports.files.remove(target.assetKey);
  await writeState(ports.metadata, withoutAsset(current, target.assetKey));
  return "download";
}

/**
 * 남은 검증 결과가 지금 파일과 어긋나는지 본다.
 *
 * **검증 결과는 "그때 온전했다"는 기록이지 "지금도 있다"는 뜻이 아니다**(FR-021d).
 * 안드로이드가 공간 확보를 위해 지우거나 사용자가 파일 관리자로 지울 수 있으므로 드문 일이
 * 아니다.
 *
 * 어긋난 결과는 **정리되어야 한다**(FR-021e) — 남겨 두면 다음에도 같은 혼란이 생기고,
 * "쓸 수 있다고 말하는데 파일이 없는" 상태가 방치된다(SC-019).
 */
export function verdictMatchesFile(
  verdict: VerificationVerdict,
  facts: { exists: boolean; bytes: number | null },
): boolean {
  if (!facts.exists) return false;
  return facts.bytes === verdict.verifiedBytes;
}
