/**
 * 출력 판정.
 *
 * 계약: specs/005-diary-generation/contracts/acceptance.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 파일이 헌법 원칙 I의 마지막 방어선이자, 원칙 IV가 가장 쉽게 무너지는 자리다.**
 *
 * 002가 `GenerationFailure`에 `text`를 두지 않아 **타입에서** 막았다. 이 모듈이
 * **실행에서** 막는다. 둘이 함께 있어야 「그럴듯한 무언가」가 일기 자리에 들어가는 것을
 * 실제로 못 한다.
 *
 * 동시에 이 모듈은 **판정 코드가 채점 코드로 자라는 압력을 받는 유일한 자리다.** 유사도를
 * 재고 싶어지고, 품질을 보고 싶어지고, 임계값을 두고 싶어진다. **그 압력에 대한 방어가
 * 계약으로 못 박혀 있다** — 그것이 이 저장소를 되돌리게 한 실패의 재발 방지다(원칙 IV).
 *
 * **여기서 지키는 것**:
 *  1. 갈래는 **넷뿐이다**(FR-018b). 더하려면 계약을 먼저 고친다
 *  2. **임계값으로 통과를 가르지 않는다**(FR-016b-2). 유사도·비율·점수 금지
 *  3. **수를 담지 않는다**(FR-018c). 담기면 그것으로 모델을 견주게 된다
 *  4. **글을 고치지 않는다**(FR-017). 잘라내기·다듬기·재작성 금지
 *  5. **거부된 글을 실어 나르지 않는다**(FR-017c)
 *  6. 화자 뒤집힘·사실 단언을 **판정하지 않는다**(FR-018). 의미를 읽어야 하는 것이며
 *     프롬프트로 막고 사람이 읽어 확인한다
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Ending } from "../inference/engine-port";
import type { Character } from "./types";

/**
 * 거부된 까닭. **넷뿐이다**(FR-018b).
 *
 * **이 목록에 갈래를 더하려면 원칙 IV를 어기지 않는지 먼저 따져야 한다.**
 * "너무 짧다"·"반복이 많다"·"일기 같지 않다"는 전부 품질 판단이며 여기 들어올 수 없다.
 *
 * 상한이 계약인 이유: 판정은 한 번에 무너지지 않는다. 갈래 하나가 그럴듯한 이유로 늘고,
 * 다음에 또 하나가 늘고, 어느 순간 채점기가 되어 있다. **넷이라는 수를 못 박아 두면
 * 다섯 번째를 넣을 때 반드시 계약 문서를 다시 읽게 된다.**
 *
 * `acceptance.test.ts`의 A-7이 이 수를 자동으로 지킨다.
 */
export const REJECT_REASONS = ["empty", "echo", "language", "unfinished"] as const;

export type RejectReason = (typeof REJECT_REASONS)[number];

/**
 * 판정 결과.
 *
 * **텍스트를 담지 않는다**(FR-017c). 거부된 글이 실려 나가면 그것이 `text`가 새는
 * 경로가 된다 — 통과한 글은 부르는 쪽이 이미 들고 있으므로 돌려줄 이유도 없다.
 *
 * **수를 담지 않는다**(FR-018c). 길이·비율·점수 어느 것도 없다.
 */
export type Verdict = { ok: true } | { ok: false; why: RejectReason };

const REJECT = (why: RejectReason): Verdict => ({ ok: false, why });

/* ────────────────────────── 문자 범위 ────────────────────────── */

/** 한글 음절 */
const HANGUL = /[가-힣]/;
/** 한자 (CJK 통합 한자) */
const HANJA = /[一-鿿]/;
/** 라틴 문자 */
const LATIN = /[A-Za-z]/;

/**
 * 되뱉기 판정에서 비교할 줄의 최소 길이.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 값은 짐작이며 실측이 아니다**(헌법 원칙 V).
 *
 * 너무 짧으면 "나는 오늘" 같은 흔한 표현이 걸려 정상 일기가 거부되고, 너무 길면 부분
 * 되뱉기를 놓친다. 12자는 「한 문장의 뜻이 담길 만한 길이」라는 짐작이다.
 *
 * **이것은 임계값이 아니다**(FR-016b-2와 구분된다). 통과·거부를 가르는 점수가 아니라
 * **무엇을 비교할지 고르는 값**이며, 비교 대상이 정해진 뒤의 판정은 "들어 있다/없다"의
 * 불리언뿐이다. 이 구분이 흐려지면 FR-016b-2가 무의미해지므로 여기 적어 둔다.
 *
 * **실기기에서 오탐이 보이면 고친다**(quickstart D6).
 * ─────────────────────────────────────────────────────────────────────────────
 */
const MIN_ECHO_LENGTH = 12;

/* ────────────────────────── 갈래별 판정 ────────────────────────── */

/** A1. 비었는가 (FR-016a). **길이 하한을 두지 않는다** — 하한은 임계값이다 */
function isEmpty(text: string): boolean {
  return text.trim().length === 0;
}

/**
 * A2. 되뱉었는가 (FR-016b-1).
 *
 * **부분 문자열 포함 여부만 본다. 불리언이다.**
 * 유사도·비율·n-gram을 쓰지 않는다(FR-016b-2) — 전부 임계값을 필요로 하고 임계값은 점수다.
 */
function isEcho(text: string, instructions: string[]): boolean {
  return instructions.some((line) => {
    const trimmed = line.trim();
    return trimmed.length >= MIN_ECHO_LENGTH && text.includes(trimmed);
  });
}

/**
 * A3. 캐릭터의 언어인가 (FR-016c).
 *
 * **불리언의 조합이지 비율이 아니다.** "한국어다움 70%"를 재지 않는다.
 *
 * **비대칭이 의도적이다**: 한국어 캐릭터는 다른 문자를 금지하지 않는다 — 고유명사와
 * 영어 낱말이 섞이는 것은 정상이다. 반대로 `chinese`·`english`는 한글을 금지한다.
 * **헌법이 그 방향만 못 박았기 때문이다**("한국어로는 쓰지 않는다 MUST NOT").
 * 헌법이 말하지 않은 것을 우리가 더 금지하지 않는다.
 */
function isWrongLanguage(text: string, character: Character): boolean {
  const hangul = HANGUL.test(text);
  const hanja = HANJA.test(text);
  const latin = LATIN.test(text);

  switch (character) {
    case "quiet":
    case "narrative":
    case "imaginative":
      // 한글이 있으면 된다. 다른 문자가 섞이는 것은 막지 않는다.
      return !hangul;
    case "chinese":
      return !hanja || hangul;
    case "english":
      return !latin || hangul || hanja;
  }
}

/* ────────────────────────── 판정 ────────────────────────── */

/**
 * 생성된 글이 일기가 될 수 있는지 판정한다.
 *
 * **순서가 정해져 있다: unfinished → empty → echo → language.**
 *
 * `unfinished`가 첫째인 이유가 중요하다. **끊긴 결과에도 거기까지 생성된 `text`가 들어
 * 있다**(research §2). 다른 판정을 먼저 하면 끊긴 글이 나머지를 통과할 수 있고, 그러면
 * 순서에 의존하는 취약한 방어가 된다. **끝나지 않은 글은 내용을 볼 필요가 없다.**
 *
 * 순서가 정해져 있으면 같은 입력에 항상 같은 `why`가 나온다 — 테스트가 안정되고,
 * 사용자가 보는 말도 안정된다.
 *
 * **`ending`을 인자로 받는 이유**: 「중간에 잘렸는가」는 문자열을 봐서는 모른다. 문장
 * 부호로 추측하면 그것이 휴리스틱이고 임계값의 시작이다. **모듈이 사실을 주므로 짐작할
 * 필요가 없다**(research §1).
 *
 * **`instructions`를 인자로 받는 이유**: 되뱉기 판정이 프롬프트의 지시문과 비교해야
 * 한다. 이 모듈이 스스로 프롬프트를 만들면 프롬프트가 두 곳에 있게 된다(FR-013b 위반).
 *
 * **글을 고치지 않는다**(FR-017). 통과/거부만 하며, 잘라내거나 다듬어 통과시키면 그것은
 * 모델이 쓴 일기가 아니라 우리가 만든 일기가 된다.
 */
export function judge(
  text: string,
  ending: Ending,
  character: Character,
  instructions: string[],
): Verdict {
  // 1. 끝나지 않았는가 — 가장 먼저. 내용을 볼 필요가 없다.
  if (ending.kind !== "eos") return REJECT("unfinished");

  // 2. 비었는가
  if (isEmpty(text)) return REJECT("empty");

  // 3. 되뱉었는가
  if (isEcho(text, instructions)) return REJECT("echo");

  // 4. 캐릭터의 언어인가
  if (isWrongLanguage(text, character)) return REJECT("language");

  return { ok: true };
}
