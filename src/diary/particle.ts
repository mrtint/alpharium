/**
 * 캐릭터 이름 → 한국어 조사(이/가).
 *
 * 계약: specs/016-writing-monologue-expansion/contracts/particle.md
 *       specs/016-writing-monologue-expansion/research.md §5
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`monologue.ts`와 같은 격리를 따른다** — `Character`·`../models/roster`·
 * `./persona`를 import하지 않는다(원칙 III). 이름 문자열 하나만 받는 순수
 * 함수다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 한글 완성형 시작 코드포인트("가") */
const HANGUL_BASE = 0xac00;
/** 한글 완성형 끝 코드포인트("힣") */
const HANGUL_LAST = 0xd7a3;

/**
 * 이름 뒤에 붙는 주격 조사를 고른다.
 *
 * 마지막 글자가 한글 완성형이면 받침 유무(`(codePoint - 0xAC00) % 28`)로
 * 판정한다 — 0이면 받침 없음("가"), 그 외는 받침 있음("이"). 한글이 아니거나
 * 빈 문자열이면 `"가"`를 기본값으로 돌려준다(예외를 던지지 않는다).
 */
export function particleFor(name: string): "이" | "가" {
  const last = name.at(-1);
  if (last === undefined) return "가";

  const code = last.codePointAt(0);
  if (code === undefined || code < HANGUL_BASE || code > HANGUL_LAST) return "가";

  const hasBatchim = (code - HANGUL_BASE) % 28 !== 0;
  return hasBatchim ? "이" : "가";
}
