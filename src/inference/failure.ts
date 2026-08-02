/**
 * T035 — 종료 사유 **다섯 가지** (004 FR-350, 001 FR-027)
 *
 * 넷은 추론 실패(004 FR-350)이고, 다섯째는 실패가 아니라 **미완결**(001 FR-027)이다.
 * 취소·이탈은 추론이 실패한 것이 아니라 완결되지 않은 것이므로 004의 분류와 **구분해서**
 * 다룬다 — 다만 저장 축에 도달하지 않는다는 결과는 같다.
 *
 * **어느 경우든**: 일기를 저장하지 않는다 (004 FR-351). 대체 문장으로 메우지 않는다
 * (004 FR-353). 재시도가 가능하다 (004 FR-354). 부분 결과가 남지 않는다 (001 FR-027).
 *
 * 넷을 구별하는 이유는 006이 사용자에게 무엇이 갈리는지 알려야 하기 때문이다
 * (004 FR-350) — **사용자 표현 방식은 006의 몫이다** (004 FR-356).
 */

export enum TerminationReason {
  /** 입력 구성 실패 — 모델을 **호출하지 않는다** (004 FR-352). */
  PromptBuild = "prompt-build",
  /** 모델 응답 실패 — 모델이 응답하지 않음. */
  EngineCall = "engine-call",
  /** 형식 실패 — 본문 식별 불가 또는 빈 본문 (004 FR-340). */
  Format = "format",
  /** 화자 위반 — 화자 판정 불통과 (004 FR-345). 고쳐서 저장하지 않는다 (FR-349). */
  SpeakerViolation = "speaker-violation",
  /** 사용자 취소·이탈 (001 FR-027). **추론 실패가 아니라 미완결이다.** */
  Cancelled = "cancelled",
}

/** 004 FR-350이 분류한 추론 실패 넷. 취소는 여기 없다. */
export const INFERENCE_FAILURES = [
  TerminationReason.PromptBuild,
  TerminationReason.EngineCall,
  TerminationReason.Format,
  TerminationReason.SpeakerViolation,
] as const;

export const ALL_TERMINATION_REASONS = [
  ...INFERENCE_FAILURES,
  TerminationReason.Cancelled,
] as const;

/**
 * 추론 실패인가 — 아니면 미완결인가.
 *
 * 006이 이 구별을 쓴다: 실패는 「재시도 / 환경 확인」을 안내하지만(006 FR-523),
 * 취소는 사용자가 스스로 멈춘 것이므로 같은 자리에 두지 않는다.
 */
export function isInferenceFailure(reason: TerminationReason): boolean {
  return reason !== TerminationReason.Cancelled;
}

/** 취소·이탈인가 (001 FR-027). */
export function isCancellation(reason: TerminationReason): boolean {
  return reason === TerminationReason.Cancelled;
}
