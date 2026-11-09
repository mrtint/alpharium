/**
 * 첫 일기 흐름의 단계 전이 — **순수 함수** (111, 규칙 문서 0장 D1·L2).
 *
 * 계약: specs/111-first-diary-branch/contracts/first-diary-flow.md FD1~FD11
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 정상 동작 확인을 지난 뒤 「오늘을 쓸지 물을지·쓸지·되돌릴지」만 답한다. `resolveFirstRunStage`의 입력을 늘리지 않는다 —
 * 첫 일기는 그 판정의 `done` 뒤의 일이다. 저장하지 않는다(세션 로컬). **실제 쓰기는 홈이 한다.**
 *
 * **`failed`만 되돌린다.** 끊김(`interrupted`)·다른 쓰기(`busy`)·거절(`refused`)·그만두기(`stopped`)는 모델이 안 도는 것을
 * 뜻하지 않는다. 되돌림은 한 실행에 한 번이다(`rolledBack`).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type FirstDiaryStep = "before" | "reading" | "asking" | "writing" | "done";

export type FirstDiaryState = {
  step: FirstDiaryStep;
  /** 이 실행에서 되돌림을 썼는가 */
  rolledBack: boolean;
};

export type FirstWriteOutcome = "saved" | "stopped" | "interrupted" | "busy" | "refused" | "failed";

export type FirstDiaryEvent =
  | { kind: "liveness-passed" }
  | { kind: "liveness-skipped" }
  | { kind: "material-read"; canAsk: boolean }
  | { kind: "confirmed" }
  | { kind: "later" }
  | { kind: "write-settled"; outcome: FirstWriteOutcome };

export const INITIAL_FIRST_DIARY: FirstDiaryState = { step: "before", rolledBack: false };

/** 표에 없는 조합은 상태를 그대로 돌려준다 */
export function firstDiaryNext(state: FirstDiaryState, event: FirstDiaryEvent): FirstDiaryState {
  switch (state.step) {
    case "before":
      if (event.kind === "liveness-passed") return { ...state, step: "reading" };
      if (event.kind === "liveness-skipped") return { ...state, step: "done" };
      return state;
    case "reading":
      if (event.kind === "material-read") {
        return { ...state, step: event.canAsk ? "asking" : "done" };
      }
      return state;
    case "asking":
      if (event.kind === "confirmed") return { ...state, step: "writing" };
      if (event.kind === "later") return { ...state, step: "done" };
      return state;
    case "writing":
      if (event.kind !== "write-settled") return state;
      if (event.outcome === "failed" && !state.rolledBack) {
        return { step: "before", rolledBack: true };
      }
      return { ...state, step: "done" };
    case "done":
      return state;
  }
}
