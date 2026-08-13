/**
 * 준비 상태 판정.
 *
 * 계약: specs/003-character-model-files/contracts/readiness.md
 *
 * **이 기능이 다른 축에 내주는 값이다.** 002의 파이프라인이 "이 캐릭터를 지금 쓸 수
 * 있는가"를 물을 때 답하는 자리이며, 화면이 무엇을 보일지 정하는 자리이기도 하다.
 *
 * **순수 함수다.** 파일 시스템을 안에서 부르지 않는다 — 002의 `day-boundary.ts`가 `now`를
 * 인자로 받은 것과 같은 이유이며, 안에서 읽으면 "파일이 없는 경우"를 시험할 수 없다.
 * 그 덕에 넷을 가르는 규칙 전체가 기기 없이 검증된다.
 *
 * 헌법 원칙 V — "받지 않음"과 "받다 말았음"과 "받았는데 깨졌음"을 가른다. 002가 `none`과
 * `unknown`을 가른 것과 같은 이유이며, 뭉개는 순간 "왜 못 쓰는지"를 말할 수 없게 된다.
 */

import type { FileFacts } from "./port";
import type { AssetKey, ModelReadiness, PausedDownload, VerificationVerdict } from "./types";

/**
 * 판정에 필요한 전부.
 *
 * 자산 자체(`ModelAsset`)를 받지 않고 **필요한 조각만** 받는다(FR-003) — 자산을 통째로
 * 넘기면 매핑이 이 모듈까지 흘러온다.
 */
export type ReadinessInput = {
  /** 이 캐릭터가 지금 가리키는 자산 */
  assetKey: AssetKey;
  /** 기준 크기. **아직 재지 않았으면 0** (contracts/readiness.md 「기준값이 아직 없을 때」) */
  expectedBytes: number;
  /** 기준 지문. 아직 재지 않았으면 빈 문자열 */
  expectedMd5: string;
  /** 파일의 지금 상태. 내용을 읽지 않고 안 것 */
  file: FileFacts;
  /** 남아 있는 검증 결과. 없으면 null */
  verdict: VerificationVerdict | null;
  /** 중단된 내려받기. 없으면 null */
  paused: PausedDownload | null;
  /** 부분 파일이 남아 있는가. 앱이 갑자기 죽으면 중단 정보 없이 이것만 남는다 */
  hasPartialFile: boolean;
};

/**
 * 까닭 문구.
 *
 * **모델 정보를 담지 않는다**(FR-004, D15). 자산키·지문·크기·주소가 들어가면 오류 메시지가
 * 원칙 III의 누출 경로가 된다. 사용자가 무엇을 할 수 있는지만 말한다.
 */
const REASON = {
  interrupted: "받다가 멈췄다",
  incomplete: "다 받지 못했다",
  unverified: "아직 확인하지 않았다",
  staleVerdict: "예전에 받은 것이라 다시 받아야 한다",
  corrupted: "받은 파일이 온전하지 않다",
} as const;

/**
 * 지금 어떤 상태인가.
 *
 * **판정 순서가 중요하다**(contracts/readiness.md 「넷을 가르는 규칙」). 위에서부터 본다.
 */
export function readinessOf(input: ReadinessInput): ModelReadiness {
  const { file, verdict, paused, hasPartialFile } = input;

  // 1~2. 파일이 없다. 이어받을 흔적이 있으면 '받다 말았음', 없으면 '받지 않음'.
  //
  // 흔적이 있는데 '받지 않음'이라고 하면 이어받기(FR-015)를 사용자에게 제안할 수 없고,
  // 부분 파일이 공간을 먹고 있다는 사실도 가려진다(FR-029).
  if (!file.exists) {
    if (paused !== null) {
      return { kind: "partial", reason: REASON.interrupted, resumable: true };
    }
    if (hasPartialFile) {
      // 앱이 갑자기 죽어 savable()을 부르지 못한 경우(research.md §1).
      // 이어받을 수는 없지만 '받지 않음'도 아니다 — 지울 것이 남아 있다.
      return { kind: "partial", reason: REASON.interrupted, resumable: false };
    }
    return { kind: "not-downloaded" };
  }

  // 3. 파일이 있는데 크기가 기준과 다르다.
  //
  // **기준이 없으면(0) 이 조건을 건너뛴다.** 로스터의 크기는 실제로 받아 본 파일에서
  // 재기로 했으므로(research.md 「값을 언제 채우는가」), 그 전까지 0이다. 0을 기준으로
  // 견주면 모든 파일이 영원히 '받다 말았음'이 된다 — 없는 기준으로 판정하지 않는다.
  const hasSizeBaseline = input.expectedBytes > 0;
  if (hasSizeBaseline && file.bytes !== input.expectedBytes) {
    return { kind: "partial", reason: REASON.incomplete, resumable: paused !== null };
  }

  // 4. 검증한 기록이 없다 (FR-021c).
  //
  // **기준값이 없어도 이 조건은 살아 있다.** 지문을 계산해 기록하는 절차는 반드시 거쳐야
  // 하며, 달라지는 것은 "무엇과 비교하는가"뿐이다. 파일의 존재는 판정 기준이 아니다 —
  // 이전 버전이 남긴 것, 사용자가 넣은 것, 검증 전에 앱이 죽은 것이 여기 걸린다.
  if (verdict === null) {
    return { kind: "unusable", reason: REASON.unverified };
  }

  // 5. 다른 자산의 결과다 (설계 중 발견).
  //
  // 로스터가 바뀌어 캐릭터가 다른 자산을 가리키게 되면 옛 결과가 새 자산의 것으로
  // 오독된다. 무엇을 검증했는지 적어 두었으므로 어긋남이 드러난다.
  if (verdict.assetKey !== input.assetKey) {
    return { kind: "unusable", reason: REASON.staleVerdict };
  }

  // 6. 검증을 통과하지 못했다 (FR-022).
  if (!verdict.passed) {
    return { kind: "unusable", reason: REASON.corrupted };
  }

  // 6b. 검증할 때 본 크기와 지금 크기가 다르다 (FR-021e).
  //
  // **검증 결과는 "그때 온전했다"는 기록이지 "지금도 있다"는 뜻이 아니다.** 안드로이드가
  // 공간 확보를 위해 지우거나 사용자가 파일 관리자로 건드릴 수 있으므로 드문 일이 아니다.
  // 기준 크기가 없어도 이 비교는 할 수 있다 — 검증할 때 본 크기가 기준이 된다.
  if (file.bytes !== verdict.verifiedBytes) {
    return { kind: "unusable", reason: REASON.corrupted };
  }

  // 7. 전부 통과.
  return { kind: "ready" };
}
