/**
 * 작명 입력 검증 — **순수 함수** (035).
 *
 * 계약: specs/035-model-ready-welcome-naming/contracts/character-name.md N5~N7
 *       spec.md FR-012·FR-013·FR-016·FR-021
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **검사는 둘뿐이다**(N5). 빈 문자열/공백만과 길이 초과.
 *
 * **세 번째 갈래를 만들지 않는다.** 금칙어·패턴·모델 식별자 필터를 더하는 순간
 * 이 함수가 로스터나 캐릭터 식별자 목록을 알아야 하고, 그것이 원칙 III 경계의
 * 오염이다 — 화면·작명 계층은 모델을 몰라야 한다.
 *
 * **사용자가 "kanana"라고 지어도 된다**(FR-021). 헌법 원칙 III가 금하는 것은
 * **앱이 모델 식별자를 노출하는 것**이지 사용자가 그런 문자열을 입력하는 것이
 * 아니다. 사용자가 스스로 지은 이름은 앱이 노출한 것이 아니다.
 *
 * 005의 `acceptance.ts`가 판정 갈래 넷을 테스트로 세어 지킨 것과 같은 방어를
 * 쓴다 — `naming.test.ts`가 실패 사유의 개수를 직접 센다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * 이름 글자 수 상한 — **사람이 정한 값이다**(FR-013).
 *
 * 012의 `USER_VISIBLE_SIGNAL_AXES`, 021의 `PERMISSION_REQUIREMENTS`, 023의
 * `BUCKET_COUNT`가 선례다 — **코드가 화면 폭을 재서 정하지 않는다**(원칙 V).
 *
 * 근거: 현행 기본 이름이 전부 2~4자(금동이·루이·오드·샤오바이·모카)이고,
 * `DiaryHomeScreen`의 "○○을(를) 쓸 수 없어 ○○(으)로 옮겼다" 같은 조합 문구가
 * 두 줄로 넘치지 않는 범위다. 12자면 한글 이름으로 넉넉하다.
 */
export const NAME_MAX_LENGTH = 12;

/**
 * 검증 결과.
 *
 * **성공하면 다듬은 값을 함께 준다**(N7) — 부르는 쪽이 다시 `trim()`하지
 * 않도록. 원본을 저장하면 앞뒤 공백이 파일에 남는다(FR-016).
 */
export type NameValidation =
  { ok: true; value: string } | { ok: false; reason: "empty" | "too-long" };

/**
 * 사용자가 입력한 이름이 쓸 수 있는가 (FR-012·FR-013·FR-016).
 *
 * **첫 만남과 설정 편집이 이 함수 하나를 공유한다**(W18) — 두 자리에 각각
 * 검증을 두면 규칙이 갈라진다.
 *
 * **길이는 다듬은 뒤에 잰다** — 앞뒤 공백 때문에 상한을 넘는 것으로 판정하면
 * 사용자가 이유를 알 수 없다.
 */
export function validateCharacterName(raw: string): NameValidation {
  const trimmed = raw.trim();

  if (trimmed === "") return { ok: false, reason: "empty" };
  if (trimmed.length > NAME_MAX_LENGTH) return { ok: false, reason: "too-long" };

  return { ok: true, value: trimmed };
}
