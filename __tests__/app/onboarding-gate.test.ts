/**
 * 059 — 온보딩 게이트 판정 (계약 OB1·OB2, research R7).
 *
 * 「온보딩부터 다시」의 `force`가 `completed` 기기에서 죽어 있던 갈래를 잠근다 — 옛 식(`|| completed`)으로 되돌리면 OB1이 잡는다.
 */

import { onboardingGateNeeded, permissionStepsDecided } from "../../src/app/onboarding-gate";

describe("OB1 — 다시 보기를 요청하면 완료한 기기에서도 게이트가 열린다", () => {
  it("completed·force·아직 안 끝냄 → 필요하다(고친 갈래)", () => {
    expect(onboardingGateNeeded({ completed: true, force: true, decidedThisSession: false })).toBe(
      true,
    );
  });

  it("파생값: completed·force 면 결정으로 세지 않는다", () => {
    expect(
      permissionStepsDecided({ decidedThisSession: false, completed: true, force: true }),
    ).toBe(false);
  });

  it("처음 실행(completed 아님)은 필요하다", () => {
    expect(
      onboardingGateNeeded({ completed: false, force: false, decidedThisSession: false }),
    ).toBe(true);
  });
});

describe("OB2 — 닫히는 갈래", () => {
  it("완료했고 force 가 아니면 필요 없다", () => {
    expect(onboardingGateNeeded({ completed: true, force: false, decidedThisSession: false })).toBe(
      false,
    );
    expect(
      permissionStepsDecided({ decidedThisSession: false, completed: true, force: false }),
    ).toBe(true);
  });

  it("이번 세션에 권한 단계를 끝냈으면 항상 필요 없다", () => {
    for (const completed of [true, false]) {
      for (const force of [true, false]) {
        expect(onboardingGateNeeded({ completed, force, decidedThisSession: true })).toBe(false);
        expect(permissionStepsDecided({ decidedThisSession: true, completed, force })).toBe(true);
      }
    }
  });
});
