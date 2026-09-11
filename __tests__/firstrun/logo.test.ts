import { shouldShowLogo } from "../../src/firstrun/logo";

/**
 * 로고 화면 노출 조건의 계약 테스트 (040).
 *
 * 계약: specs/040-onboarding-parallel-setup/research.md #6
 *       contracts/first-run-gate.md G3
 *       tasks.md T006
 */

describe("G3 — 로고는 온보딩이 필요할 때만", () => {
  it("onboardingNeeded: false면 항상 false", () => {
    expect(shouldShowLogo(false)).toBe(false);
  });

  it("onboardingNeeded: true면 true", () => {
    expect(shouldShowLogo(true)).toBe(true);
  });
});
