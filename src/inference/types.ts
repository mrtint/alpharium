/**
 * 추론 어댑터 계약.
 *
 * 일기 생성 코드가 보는 유일한 문이다. 구현체가 어디서 도는지 호출자는 모른다(FR-025).
 * 계약: specs/001-project-skeleton-setup/contracts/inference.md (isAvailable)
 *       specs/002-diary-pipeline-contracts/contracts/diary.md (generate)
 *
 * 헌법 원칙 I — 어느 구현체도 미리 만들어 둔 응답이나 대체 응답을 반환하지 않는다.
 * 서버에 닿지 못하면 닿지 못했다는 사실이 결과이지, 대신 만든 답이 결과가 아니다.
 */

import type { DiaryRequest } from "../diary/types";

/** on-device: 기기의 네이티브 추론 모듈 / desktop-server: 개발자 기계의 추론 서버 */
export type InferenceLocation = "on-device" | "desktop-server";

/**
 * 생성 진행 신호 (015 FR-001).
 *
 * "지금 무엇을 하는가"를 실시간으로 알린다 — `GenerationFailure`(어디서 실패로
 * 멈췄는가)와는 이름·목적이 다른 독립 타입이다. 문자열 리터럴 유니온뿐이며
 * 숫자·시간·객체 필드를 담지 않는다(원칙 IV) — 필드를 더하면 그 순간 진행률이
 * 된다.
 *
 * **`"load"`가 016에서 더해졌다.** 실행 순서상 `"vision"`과 `"generation"`
 * 사이다 — 캐릭터 모델은 사진 보기에 쓰인 VLM과 별개 엔진이라 사진을 다 본
 * 뒤에만 열린다(engine-port.ts E1 불변식, specs/016 data-model.md).
 */
export type ProgressStage = "signals" | "vision" | "generation" | "load";

/**
 * 진행 단계 안의 하위 갈래 (016 신설).
 *
 * `stage`와 독립된 별개 타입이다 — `"load"` 단계는 `"cold"`/`"hot"`,
 * `"vision"` 단계는 `"normal"`/`"many"`로 문구 풀을 다시 가른다. 그 외
 * 단계(`"signals"`·`"generation"`)와 `"load"`의 로드-시작 신호(아직 콜드/핫
 * 미확정)에서는 `undefined`다. 문자열 리터럴 유니온뿐이며 숫자·시간·객체
 * 필드를 담지 않는다(원칙 IV, ProgressStage와 같은 방어).
 *
 * 계약: specs/016-writing-monologue-expansion/data-model.md「MonologueBranch」
 */
export type MonologueBranch = "cold" | "hot" | "normal" | "many";

/**
 * 네이티브 모듈 적재 상태.
 *
 * `unavailable`과 `failed`를 뭉뚱그리지 않는다. 시뮬레이터에서 모듈이 없는 것은
 * 예상된 상태이고(local), 실기기에서 없는 것은 문제다(dev). 같은 값이면 둘을 구분할 수 없다.
 */
export type ModuleStatus =
  { kind: "loaded" } | { kind: "unavailable"; reason: string } | { kind: "failed"; reason: string };

/**
 * 생성에 성공했을 때 돌아오는 것. 본문 텍스트뿐이다.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/diary.md
 *
 * 모델 이름·소요 시간·점수를 담지 않는다(원칙 III·IV). 담을 자리를 만들면 그것이 모델
 * 비교의 시작점이 된다.
 */
export type DiaryDraft = { text: string };

/**
 * 생성이 되지 않은 까닭.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **어느 갈래에도 `text` 필드가 없다(FR-016, 헌법 원칙 I).**
 *
 * "일기를 생성할 수 없습니다" 같은 플레이스홀더도 금지다. 그럴듯한 텍스트가 일기 자리에
 * 들어가는 순간 가짜 일기와 구분이 사라진다. `reason`은 진단용 사실이지 사용자가 읽을
 * 일기가 아니며, 그래서 이름을 `text`와 달리 두었다.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `not-implemented`는 가짜 응답이 아니다. 원칙 I이 금지한 것은 *미리 만들어 둔 응답을
 * 보여주는 경로*이며, 없는 것을 없다고 말하는 것은 그 반대다.
 */
export type GenerationFailure =
  | { kind: "not-implemented" }
  | { kind: "backend-unavailable"; reason: string }
  | { kind: "generation-failed"; reason: string }
  // ─── 005가 더한 갈래 ───────────────────────────────────────────────────────
  //
  // **계약을 바꾼 것이 아니라 넓힌 것이다**(005 FR-025). 002가 이것을 유니온으로 둔 것은
  // 갈래가 늘 것을 전제한 구조이며, 늘어난 갈래가 위 불변식(「`text` 없음」)을 지키는 한
  // 「자리 수와 갈래를 넓히지 않는다」에 걸리지 않는다 — 그 조항이 막은 것은
  // `DiaryEntry`·`DiaryRequest`의 모양이 바뀌는 것이다.
  //
  // **갈래를 넷으로 가른 이유는 사용자가 할 일이 다르기 때문이다**(005 FR-017d).
  // 뭉개면 「다시 시도하면 되는가」와 「이 캐릭터로는 계속 이럴 수 있는가」를 구분할 수
  // 없다. 003이 `ModelReadiness`를 넷으로 가른 것과 같은 판단이다.
  //
  // **`not-implemented`는 남는다** — 시각 처리(`quick`/`detailed`)가 아직 없다는 것을
  // 말하는 데 쓰인다(005 FR-022). 이름이 맞고, 없앨 이유가 없다.
  | { kind: "model-load-failed"; reason: "not-found" | "load-failed" }
  /**
   * 사진을 보지 못했다 (011 FR-021·027).
   *
   * ─────────────────────────────────────────────────────────────────────────
   * **「보지 않음」으로 조용히 낮추지 않는다**(005 FR-022의 판단을 잇는다).
   *
   * 사용자가 「빠르게 봄」을 골랐는데 사진을 보지 않은 일기가 나오면, **그 일기는
   * 사용자가 요청한 것이 아니다.** 001이 차단된 추론 위치를 바꿔치기하지 않은 것,
   * 003이 없는 모델을 다른 캐릭터로 대체하지 않은 것과 같은 계열이다.
   *
   * **`model-load-failed`와 따로 두는 까닭**: 사용자가 할 일이 다르다 — 이쪽은
   * 「사진 보는 것을 준비해야 한다」이고 저쪽은 「캐릭터를 준비해야 한다」이다.
   *
   * **이 갈래에도 `text`가 없다**(002 FR-016). 사진을 못 본 대신 쓴 글을 주지 않는다.
   * ─────────────────────────────────────────────────────────────────────────
   */
  | { kind: "vision-failed"; reason: "not-ready" | "failed" | "cancelled" }
  /**
   * 생성은 됐으나 판정에서 거부됐다 (005 FR-016).
   *
   * **`why`는 진단용이며 사용자에게 그대로 보이지 않는다**(005 FR-017e). 「되뱉었다」·
   * 「언어가 다르다」는 캐릭터 뒤의 모델을 드러내는 말이므로, 화면에서는 「할 수 있는
   * 것」으로 옮긴다.
   *
   * **거부된 글 자체는 담지 않는다**(005 FR-017c). 담으면 그것이 `text`가 새는 경로가
   * 된다 — 이름을 `text`와 달리 둔 `reason`조차 두지 않고 갈래만 남기는 이유다.
   */
  | { kind: "rejected"; why: "empty" | "echo" | "language" | "unfinished" }
  /** 시간 한도를 넘었다 (005 FR-021). 기기가 버거운 것이다 */
  | { kind: "timed-out" }
  /** 앱이 앞을 벗어나 끊겼다 (005 FR-021b·c). 사용자가 떠나서 그런 것이다 */
  | { kind: "interrupted" };

/** 생성 결과. 실패도 값이다 — 예외로 던지지 않는다. */
export type GenerationResult = DiaryDraft | GenerationFailure;

/** 결과가 실패인지 판정한다. 성공 갈래에만 `text`가 있다. */
export function isGenerationFailure(result: GenerationResult): result is GenerationFailure {
  return "kind" in result;
}

/**
 * 추론 어댑터.
 *
 * 001에서 `isAvailable()`을 정했고, 002가 `generate()`를 더한다(FR-014).
 * **`isAvailable()`은 001 그대로 둔다.**
 *
 * 이 기능에서 두 구현 모두 `not-implemented`를 반환한다(FR-015). 실제 생성은 다음 기능이다.
 *
 * **예외를 던지지 않는다.** 실패는 값이어야 파이프라인이 어느 단계에서 멈췄는지 말할 수
 * 있다(FR-019). 001에서 `ModuleStatus`를 값으로 둔 것과 같은 이유다.
 */
export interface InferenceBackend {
  readonly location: InferenceLocation;
  isAvailable(): Promise<ModuleStatus>;
  generate(
    request: DiaryRequest,
    onStage?: (stage: ProgressStage, branch?: MonologueBranch) => void,
  ): Promise<GenerationResult>;
}

/** 추론 위치 선택이 거부된 까닭. */
export type SelectionFailure = "environment-unresolved" | "location-forbidden";
