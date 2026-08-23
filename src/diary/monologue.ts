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
 * 문자열만 넘긴다(016 clarify 결정). 화면에 보이는 진행 문구일 뿐 일기
 * 프롬프트에는 들어가지 않는다(`prompt.ts`가 여전히 화자 규칙의 유일한
 * 통과 지점이다).
 *
 * **사진 보기 문구는 011의 캡션 엔진이 실제로 하는 일(사진 한 장을 보고
 * 짧은 서술 하나를 만드는 것)에만 근거한다**(FR-005) — 인물 식별, 촬영
 * 시각·장소 판별, 장소에 대한 주관적 감상을 전제하는 표현은 쓰지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { MonologueBranch, ProgressStage } from "../inference/types";
import { particleFor } from "./particle";

/** 최소 10개 원소를 강제하는 튜플 — 후보 부족을 컴파일 타임에 막는다(FR-009) */
type AtLeast10 = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  ...string[],
];

/** 최소 2개 원소 튜플 — 015가 세운 하한 (signals 단계, 확장 대상 아님) */
type AtLeast2 = readonly [string, string, ...string[]];

/** 015 그대로 — 신호 확인 단계는 이번 확장 대상이 아니다(spec Assumptions) */
const SIGNALS_CANDIDATES: AtLeast2 = [
  "그날의 기록을 확인하는 중…",
  "하루를 되짚어보는 중…",
  "무엇이 있었는지 헤아리는 중…",
];

/**
 * 사진 보기 — "보통" 갈래 (011의 캡션 엔진 실측 범위 안에서만 작성).
 *
 * 캡션 엔진(`CAPTION_PROMPT`: "이 사진에 보이는 것을 한 문장으로 설명하라")이
 * 하는 일은 사진 한 장을 보고 짧은 서술 하나를 만드는 것뿐이다 — 인물 식별,
 * 촬영 시각·장소 판별, 장소에 대한 감상은 이 엔진의 출력 범위 밖이다.
 */
const VISION_NORMAL_CANDIDATES: AtLeast10 = [
  "오늘 찍은 사진들을 살펴보는 중…",
  "사진을 들여다보는 중…",
  "사진 속에 뭐가 담겼는지 찬찬히 보는 중…",
  "또 한 장을 살펴보는 중…",
  "찬찬히 눈에 담는 중…",
  "사진 한 장 한 장을 들여다보는 중…",
  "무엇이 찍혔는지 살펴보는 중…",
  "사진을 하나씩 넘겨보는 중…",
  "오늘 남긴 사진들을 훑어보는 중…",
  "사진에 담긴 모습을 살펴보는 중…",
  "화면 속 장면을 들여다보는 중…",
];

/**
 * 사진 보기 — "많음" 갈래. 캡션 대상이 상한(5장)에 닿은 하루에만 쓰인다.
 * 숫자·정확한 장수는 담지 않는다(FR-007).
 */
const VISION_MANY_CANDIDATES: AtLeast10 = [
  "살펴볼 사진이 많아 반가워하는 중…",
  "볼거리가 많은 하루라 부지런히 살펴보는 중…",
  "사진이 넉넉해서 하나씩 꼼꼼히 보는 중…",
  "오늘은 사진이 많아 즐겁게 살펴보는 중…",
  "여러 장을 차례로 들여다보는 중…",
  "이것저것 살펴볼 게 많아 부지런히 보는 중…",
  "사진이 풍성해서 천천히 넘겨보는 중…",
  "오늘 남긴 사진이 많아 흥미롭게 보는 중…",
  "한 장씩 부지런히 넘겨가며 보는 중…",
  "사진이 가득해서 살펴보는 중…",
  "오늘따라 사진이 많아 유심히 보는 중…",
];

/**
 * 모델 로드 — "콜드 스타트" 갈래. `{name}` 자리를 이름+조사로 채운다.
 * 실제로 하는 일(모델을 새로 올림)에 근거한 문구만 쓴다.
 */
const LOAD_COLD_TEMPLATES: AtLeast10 = [
  "{name} 글을 쓸 준비를 하는 중…",
  "{name} 연필과 지우개를 준비하는 중…",
  "{name} 글쓸 준비를 위해 책상을 정리하는 중…",
  "{name} 이제 막 자리에 앉는 중…",
  "{name} 새로 글을 쓸 채비를 하는 중…",
  "{name} 오늘의 이야기를 시작할 준비를 하는 중…",
  "{name} 조용히 마음을 가다듬는 중…",
  "{name} 처음부터 차근차근 준비하는 중…",
  "{name} 글쓰기에 앞서 자리를 잡는 중…",
  "{name} 오늘 쓸 이야기를 위해 준비하는 중…",
  "{name} 이제 막 준비를 마쳐가는 중…",
];

/**
 * 모델 로드 — "핫 스타트" 갈래. 이미 열려 있던 모델을 재사용하는 사실에
 * 근거한 문구만 쓴다(콜드와 다른 인상 — 처음 준비 vs 이어서 하기).
 */
const LOAD_HOT_TEMPLATES: AtLeast10 = [
  "{name} 이전에 썼던 글들을 정리하는 중…",
  "{name} 지저분한 책상을 정돈하는 중…",
  "{name} 다시 자리에 앉는 중…",
  "{name} 이어서 쓸 준비를 하는 중…",
  "{name} 잠깐 정리하고 다시 시작하는 중…",
  "{name} 하던 일을 마저 정돈하는 중…",
  "{name} 금방 다시 준비를 마치는 중…",
  "{name} 익숙하게 자리를 잡는 중…",
  "{name} 이어 쓸 채비를 하는 중…",
  "{name} 잠시 정리한 뒤 다시 준비하는 중…",
  "{name} 빠르게 다시 준비하는 중…",
];

/** 글쓰기 단계 — 015의 3개를 폐기하고 10개로 대체한다(spec Assumptions) */
const GENERATION_CANDIDATES: AtLeast10 = [
  "글을 쓰는 중…",
  "생각을 문장으로 옮기는 중…",
  "한 줄 한 줄 적어보는 중…",
  "주인의 오늘 하루를 떠올려보는 중…",
  "하루의 기록들을 멋진 글로 정리하는 중…",
  "오늘 일상이 어땠는지 들여다보는 중…",
  "떠오르는 생각을 정리해서 적는 중…",
  "오늘 하루를 글로 옮기는 중…",
  "차근차근 이야기를 엮어가는 중…",
  "문장을 다듬어가며 적는 중…",
  "오늘의 이야기를 써 내려가는 중…",
];

/**
 * 진행 단계에 맞는 독백 문구를 고른다.
 *
 * `previous`와 같은 문구를 고르지 않는다(FR-010) — 후보 배열이 최소 2개
 * 이상 원소를 갖도록 타입이 강제하므로, `previous`와 다른 후보가 항상
 * 최소 1개 존재한다. 안전판 분기를 따로 두지 않는다(015 계승).
 *
 * `characterName`은 `stage === "load"`이고 `branch`가 확정된 경우에만
 * 쓰인다 — 그 외 조합에서는 무시된다.
 *
 * 순수 함수다 — 내부 상태를 갖지 않는다. "직전 문구"는 호출자(화면)가
 * 들고 있다가 매번 인자로 넘긴다.
 */
export function pickMonologue(
  stage: ProgressStage,
  branch: MonologueBranch | undefined,
  previous: string | undefined,
  characterName?: string,
  random: () => number = Math.random,
): string {
  const candidates = candidatesFor(stage, branch);
  // ★ 이름 치환은 필터링보다 먼저 한다 — 그렇지 않으면 `previous`(치환된
  // 문자열)가 템플릿 원문과 절대 같아지지 않아 "직전과 다른 후보" 필터가
  // 아무 효과도 내지 못한다(2026-08-23 T009 테스트가 이 회귀를 잡았다).
  const rendered = candidates.map((line) => renderName(line, stage, characterName));

  const pool = rendered.filter((line) => line !== previous);
  const usable = pool.length > 0 ? pool : rendered;

  const index = Math.floor(random() * usable.length);
  const clamped = Math.min(index, usable.length - 1);
  return usable[clamped];
}

function renderName(line: string, stage: ProgressStage, characterName: string | undefined): string {
  if (stage !== "load" || characterName === undefined) return line;
  return line.replace("{name}", `${characterName}${particleFor(characterName)}`);
}

function candidatesFor(
  stage: ProgressStage,
  branch: MonologueBranch | undefined,
): AtLeast2 | AtLeast10 {
  if (stage === "signals") return SIGNALS_CANDIDATES;
  if (stage === "generation") return GENERATION_CANDIDATES;

  if (stage === "vision") {
    return branch === "many" ? VISION_MANY_CANDIDATES : VISION_NORMAL_CANDIDATES;
  }

  // stage === "load"
  return branch === "hot" ? LOAD_HOT_TEMPLATES : LOAD_COLD_TEMPLATES;
}
