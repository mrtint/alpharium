/**
 * 쓰는 중 독백 — 진행 단계별 문구를 순환/무작위로 고른다.
 *
 * 계약: specs/015-writing-monologue/contracts/monologue.md
 *       specs/015-writing-monologue/data-model.md 「MonologueLine」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **문구는 사람이 미리 쓴 고정 문장집합에서만 고른다. 모델이 생성하지 않는다**
 * (원칙 IV). 사진 장수·순번을 문구에 끼워 넣지 않는다(FR-004, FR-013).
 *
 * **캐릭터를 인자로 받지 않는다** — `roster.ts`·`persona.ts`·`Character`를
 * import하지 않는다(원칙 III). 화면에 보이는 진행 문구일 뿐 일기 프롬프트에는
 * 들어가지 않는다(`prompt.ts`가 여전히 화자 규칙의 유일한 통과 지점이다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ProgressStage } from "../inference/types";

/**
 * 단계별 문구 후보. 각 단계 최소 2개, 서로 다른 서술어로 준비한다
 * (research.md §7) — 타입 자체가 1개짜리 배열을 허용하지 않는다.
 */
const CANDIDATES: Record<ProgressStage, readonly [string, string, ...string[]]> = {
  signals: ["그날의 기록을 확인하는 중…", "하루를 되짚어보는 중…", "무엇이 있었는지 헤아리는 중…"],
  vision: ["사진을 들여다보는 중…", "또 한 장을 살펴보는 중…", "찬찬히 눈에 담는 중…"],
  generation: ["글을 쓰는 중…", "생각을 문장으로 옮기는 중…", "한 줄 한 줄 적어보는 중…"],
};

/**
 * 진행 단계에 맞는 독백 문구를 고른다.
 *
 * `previous`와 같은 문구를 고르지 않는다(FR-014) — 후보 배열이 최소 2개
 * 원소를 갖도록 타입이 강제하므로, `previous`와 다른 후보가 항상 최소 1개
 * 존재한다. 안전판 분기를 따로 두지 않는다(C3 정정).
 *
 * 순수 함수다 — 내부 상태를 갖지 않는다. "직전 문구"는 호출자(화면)가
 * 들고 있다가 매번 인자로 넘긴다.
 */
export function pickMonologue(
  stage: ProgressStage,
  previous: string | undefined,
  random: () => number = Math.random,
): string {
  const candidates = CANDIDATES[stage];
  const pool = candidates.filter((line) => line !== previous);
  const usable = pool.length > 0 ? pool : candidates;

  const index = Math.floor(random() * usable.length);
  const clamped = Math.min(index, usable.length - 1);
  return usable[clamped];
}
