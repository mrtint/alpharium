/**
 * 전체화면 로고 노출 조건 — **순수 함수** (040).
 *
 * 계약: specs/040-onboarding-parallel-setup/research.md #6
 *       contracts/first-run-gate.md G3
 *       spec.md FR-001·FR-010, SC-005
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `onboardingNeeded === false`면 항상 `false`를 반환한다(이미 온보딩을 마친
 * 기존 사용자, FR-010/SC-005). "이번 세션에 로고를 이미 보여줬는가"
 * (`onboardingStarted`)는 이 모듈이 아니라 `App.tsx`가 세션 로컬 상태로
 * 소유한다(research.md #6) — 로고 노출 여부를 영구 저장하지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function shouldShowLogo(onboardingNeeded: boolean): boolean {
  return onboardingNeeded;
}
