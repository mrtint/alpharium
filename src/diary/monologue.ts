/**
 * 쓰는 중 독백 — 진행 단계·갈래별 문구를 순환/무작위로 고른다.
 *
 * 계약: specs/015-writing-monologue/contracts/monologue.md
 *       specs/015-writing-monologue/data-model.md 「MonologueLine」
 *       specs/016-writing-monologue-expansion/contracts/monologue-branch.md
 *       specs/016-writing-monologue-expansion/data-model.md 「MonologueLine (확장)」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **문구는 사람이 미리 쓴 고정 문장집합에서만 고른다. 모델이 생성하지 않는다**
 * (원칙 IV). 사진 장수·순번을 문구에 끼워 넣지 않는다(FR-004, FR-013).
 *
 * **캐릭터를 타입으로 받지 않는다** — `roster.ts`·`persona.ts`·`Character`를
 * import하지 않는다(원칙 III). 모델 로드 단계의 캐릭터 이름은 `string`
 * 매개변수로만 받는다 — 호출자(화면)가 `persona.ts`의 `displayName`을 읽어
 * 문자열만 넘긴다(016 clarify 결정). **화면 문구에는 넣지 않는다**(사용자
 * 요청으로 2026-08-23 철회) — 진단 로그에만 남긴다. 일기 프롬프트에도
 * 들어가지 않는다(`prompt.ts`가 여전히 화자 규칙의 유일한 통과 지점이다).
 *
 * **사진 보기 문구는 011의 캡션 엔진이 실제로 하는 일(사진 한 장을 보고
 * 짧은 서술 하나를 만드는 것)에만 근거한다**(FR-005) — 인물 식별, 촬영
 * 시각·장소 판별, 장소에 대한 주관적 감상을 전제하는 표현은 쓰지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { text } from "../i18n/current";
import type { AtLeast10 } from "../i18n/catalogs/shapes";
import type { MonologueBranch, ProgressStage } from "../inference/types";

/*
 * 062 — 후보 문장집합은 한국어 카탈로그(`src/i18n/catalogs/ko/monologue.ts`)로 옮겼다. 후보 수는 거기서 `AtLeast10`
 * 튜플이 잠근다(FR-009). 이 파일은 고르는 일만 한다.
 */

/**
 * 진행 단계에 맞는 독백 문구를 고른다.
 *
 * `previous`와 같은 문구를 고르지 않는다(FR-010) — 후보 배열이 최소 2개
 * 이상 원소를 갖도록 타입이 강제하므로, `previous`와 다른 후보가 항상
 * 최소 1개 존재한다. 안전판 분기를 따로 두지 않는다(015 계승).
 *
 * `characterName`은 받기만 하고 쓰지 않는다(2026-08-23 철회) — 015 이후
 * 호출자(화면)가 여전히 이름을 넘겨주므로 시그니처는 유지하되, 화면 문구에
 * 이름을 넣는 기능 자체는 필요 없다고 판단해 뺐다.
 *
 * 순수 함수다 — 내부 상태·부수효과를 갖지 않는다. "직전 문구"는 호출자
 * (화면)가 들고 있다가 매번 인자로 넘긴다.
 */
export function pickMonologue(
  stage: ProgressStage,
  branch: MonologueBranch | undefined,
  previous: string | undefined,
  characterName?: string,
  random: () => number = Math.random,
): string {
  const candidates = candidatesFor(stage, branch);
  const pool = candidates.filter((line) => line !== previous);
  const usable = pool.length > 0 ? pool : candidates;

  const index = Math.floor(random() * usable.length);
  const clamped = Math.min(index, usable.length - 1);
  return usable[clamped];
}

function candidatesFor(stage: ProgressStage, branch: MonologueBranch | undefined): AtLeast10 {
  const T = text().monologue;
  if (stage === "signals") return T.signals;
  if (stage === "generation") return T.generation;

  if (stage === "vision") {
    return branch === "many" ? T.visionMany : T.visionNormal;
  }

  // stage === "load"
  return branch === "hot" ? T.loadHot : T.loadCold;
}
