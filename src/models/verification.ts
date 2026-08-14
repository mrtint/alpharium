/**
 * 내용 검증.
 *
 * 계약: specs/003-character-model-files/contracts/readiness.md
 *
 * **크기가 아니라 내용으로 본다**(FR-021). 전송 중 조용히 망가진 파일은 크기가 그대로일
 * 수 있고, 그 파일이 "쓸 수 있음"으로 통과하면 헌법 원칙 V가 요구한 "받았는데 깨졌음"이
 * 판정되지 않는다.
 *
 * **내려받기가 끝난 직후 한 번만 부른다**(FR-021a). GB 전체를 읽으므로 상태를 물을 때마다
 * 부르면 화면이 멈춘다 — 그쪽은 존재·크기만 본다(FR-021d).
 */

import type { ModelFilePort } from "./port";
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
