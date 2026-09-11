/**
 * 자동 첫 일기 생성 시도 판정 — **순수 함수** (040).
 *
 * 계약: specs/040-onboarding-parallel-setup/data-model.md `AutoDiaryAttempt`
 *       contracts/first-run-gate.md G6
 *       spec.md FR-008·FR-008a·FR-009
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * liveness 통과 후 그날 첫 일기를 자동 생성해도 되는가만 답한다. **실제
 * `pipeline.run()` 호출은 이 모듈이 하지 않는다**(G7) — `app/wiring.ts`가
 * 이 함수의 결과를 보고 트리거한다.
 *
 * 결과를 저장하지 않는다 — 중복 호출 방지는 `app/wiring.ts`의 세션 스코프
 * 플래그가 한다(research.md #4).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { LivenessOutcome } from "../welcome/liveness";

export function shouldAutoGenerate(input: {
  livenessOutcome: LivenessOutcome;
  dayWritable: boolean;
}): boolean {
  return input.livenessOutcome === "ok" && input.dayWritable;
}
