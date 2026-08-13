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
  | { kind: "generation-failed"; reason: string };

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
  generate(request: DiaryRequest): Promise<GenerationResult>;
}

/** 추론 위치 선택이 거부된 까닭. */
export type SelectionFailure = "environment-unresolved" | "location-forbidden";
