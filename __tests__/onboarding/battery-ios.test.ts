/**
 * 068 — 온보딩의 배터리 단계는 iOS에 없다 (contracts/ios-settings.md C4, spec FR-003).
 *
 * iOS에는 배터리 최적화 예외가 없다. 043 FR-017이 `battery-exception`을 안드로이드 전용으로 정정했고, 068은 설정 행만 iOS 문구로
 * 바꾼다 — 온보딩은 그대로여야 한다. 기존 테스트는 「android를 포함한다」만 잠가서 iOS 쪽 빠짐을 지켜 주지 못했다.
 */

import { planOnboardingSteps } from "../../src/onboarding/decision";
import { PERMISSION_REQUIREMENTS } from "../../src/onboarding/requirements";

const base = {
  requirements: PERMISSION_REQUIREMENTS,
  states: {},
  batteryNoticeShown: false,
  skippedThisSession: [],
} as const;

describe("068 C4 — battery-exception은 안드로이드 전용", () => {
  it('선언은 platforms ["android"]뿐이다', () => {
    const battery = PERMISSION_REQUIREMENTS.find((r) => r.key === "battery-exception");
    expect(battery?.platforms).toEqual(["android"]);
  });

  it("iOS 단계 목록에 battery-exception이 없다", () => {
    const keys = planOnboardingSteps({ ...base, platform: "ios" }).map((s) => s.requirement.key);
    expect(keys).not.toContain("battery-exception");
    expect(keys).toEqual(["photos", "location", "notifications"]);
  });

  it("안드로이드 단계 목록에는 마지막으로 있다", () => {
    const keys = planOnboardingSteps({ ...base, platform: "android" }).map(
      (s) => s.requirement.key,
    );
    expect(keys[keys.length - 1]).toBe("battery-exception");
  });
});
