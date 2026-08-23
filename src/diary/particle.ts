/**
 * 캐릭터 이름 → 한국어 조사(이/가, 은/는).
 *
 * 계약: specs/016-writing-monologue-expansion/contracts/particle.md
 *       specs/016-writing-monologue-expansion/research.md §5
 *       specs/017-diary-body-screen/contracts/particle.md
 *       specs/017-diary-body-screen/research.md §5
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
 * 마지막 글자의 받침 유무를 판정한다(017 PT1 — 두 조사 함수가 공유하는 유일한
 * 판정 로직).
 *
 * 한글 완성형이 아니거나 빈 문자열이면 `undefined`(판정 불가)를 돌려준다 —
 * 호출자가 각자의 기본 조사로 처리한다.
 */
function hasBatchim(name: string): boolean | undefined {
  const last = name.at(-1);
  if (last === undefined) return undefined;

  const code = last.codePointAt(0);
  if (code === undefined || code < HANGUL_BASE || code > HANGUL_LAST) return undefined;

  return (code - HANGUL_BASE) % 28 !== 0;
}

/**
 * 이름 뒤에 붙는 주격 조사를 고른다.
 *
 * 받침이 있으면 "이", 없거나 판정 불가면 "가"(예외를 던지지 않는다).
 */
export function particleFor(name: string): "이" | "가" {
  return hasBatchim(name) ? "이" : "가";
}

/**
 * 이름 뒤에 붙는 보조사(은/는)를 고른다(017).
 *
 * 받침이 있으면 "은", 없거나 판정 불가면 "는"(예외를 던지지 않는다) —
 * `particleFor()`가 받침 없음 쪽을 기본값으로 삼는 것과 대응한다.
 */
export function topicParticleFor(name: string): "은" | "는" {
  return hasBatchim(name) ? "은" : "는";
}
