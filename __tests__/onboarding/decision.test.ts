import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  describePhotoAccessLimit,
  nextStep,
  planOnboardingSteps,
  shouldShowOnboarding,
} from "../../src/onboarding/decision";
import { PERMISSION_REQUIREMENTS } from "../../src/onboarding/requirements";
import type { PermissionState } from "../../src/signals/port";

/**
 * 온보딩 진행 판정의 계약 테스트.
 *
 * 계약: specs/021-unified-permission-onboarding/contracts/onboarding-decision.md
 *       D2~D6
 *       spec.md FR-005·FR-006·FR-008·FR-013·FR-015·FR-016
 *
 * 순수 함수다 — (플래그, 권한 상태, 플랫폼)의 함수이며 `new Date()`를 부르지 않는다.
 * D3 표(5개 PermissionState × 건너뜀 여부)를 직접 센다(SC-007).
 */

const ALL_STATES: PermissionState[] = ["granted", "limited", "denied", "blocked", "undetermined"];

const REQS = PERMISSION_REQUIREMENTS;

describe("D2 — shouldShowOnboarding (029 FR-019·020, 2-인자)", () => {
  it("D1 — completed !== true면 essentialAssetsReady와 무관하게 온보딩", () => {
    expect(shouldShowOnboarding({ completed: false, batteryNoticeShown: false }, false)).toBe(true);
    expect(shouldShowOnboarding({ completed: false, batteryNoticeShown: true }, true)).toBe(true);
  });

  it("D3 — completed === true인데 필수 에셋이 준비 안 됐으면 온보딩 (FR-020)", () => {
    expect(shouldShowOnboarding({ completed: true, batteryNoticeShown: false }, false)).toBe(true);
  });

  it("D4 — completed === true이고 필수 에셋도 준비됐으면 홈으로", () => {
    expect(shouldShowOnboarding({ completed: true, batteryNoticeShown: false }, true)).toBe(false);
    expect(shouldShowOnboarding({ completed: true, batteryNoticeShown: true }, true)).toBe(false);
  });
});

describe("D3 — StepStatus 판정 (5개 상태 × 건너뜀)", () => {
  function statusFor(state: PermissionState | undefined, skipped: boolean): string {
    const steps = planOnboardingSteps({
      platform: "android",
      requirements: REQS,
      states: state === undefined ? {} : { photos: state },
      batteryNoticeShown: false,
      skippedThisSession: skipped ? ["photos"] : [],
    });
    return steps.find((s) => s.requirement.key === "photos")!.status;
  }

  it("granted → satisfied", () => {
    expect(statusFor("granted", false)).toBe("satisfied");
  });

  it("limited → satisfied (FR-015 — 부분 허용도 통과)", () => {
    expect(statusFor("limited", false)).toBe("satisfied");
  });

  it("undetermined → actionable", () => {
    expect(statusFor("undetermined", false)).toBe("actionable");
  });

  it("denied → actionable (다시 요청 가능)", () => {
    expect(statusFor("denied", false)).toBe("actionable");
  });

  it("blocked → blocked (건너뜀 여부와 무관, FR-016)", () => {
    expect(statusFor("blocked", false)).toBe("blocked");
    expect(statusFor("blocked", true)).toBe("blocked");
  });

  it("건너뛴 항목은 skipped-eligible (blocked 제외)", () => {
    expect(statusFor("undetermined", true)).toBe("skipped-eligible");
    expect(statusFor("denied", true)).toBe("skipped-eligible");
  });

  it("states에 없으면 actionable로 간주한다 (안전한 기본)", () => {
    expect(statusFor(undefined, false)).toBe("actionable");
  });

  it("모든 상태가 어느 한 StepStatus로 매핑된다 (누락 없음)", () => {
    const valid = ["satisfied", "actionable", "blocked", "skipped-eligible"];
    for (const s of ALL_STATES) {
      expect(valid).toContain(statusFor(s, false));
    }
  });
});

describe("D3 — battery-exception은 batteryNoticeShown으로 판정", () => {
  function batteryStatus(shown: boolean): string {
    const steps = planOnboardingSteps({
      platform: "android",
      requirements: REQS,
      states: {},
      batteryNoticeShown: shown,
      skippedThisSession: [],
    });
    return steps.find((s) => s.requirement.key === "battery-exception")!.status;
  }

  it("batteryNoticeShown: true → satisfied", () => {
    expect(batteryStatus(true)).toBe("satisfied");
  });

  it("batteryNoticeShown: false → actionable", () => {
    expect(batteryStatus(false)).toBe("actionable");
  });

  it("batteryNoticeShown: false이고 건너뛰면 skipped-eligible", () => {
    const steps = planOnboardingSteps({
      platform: "android",
      requirements: REQS,
      states: {},
      batteryNoticeShown: false,
      skippedThisSession: ["battery-exception"],
    });
    expect(steps.find((s) => s.requirement.key === "battery-exception")!.status).toBe(
      "skipped-eligible",
    );
  });
});

describe("D4 — planOnboardingSteps", () => {
  it("platform 필터: ios 온보딩에서 android 전용 항목이 빠진다", () => {
    const androidOnly = REQS.map((r) =>
      r.key === "location" ? { ...r, platforms: ["android"] as const } : r,
    );
    const steps = planOnboardingSteps({
      platform: "ios",
      requirements: androidOnly,
      states: {},
      batteryNoticeShown: false,
      skippedThisSession: [],
    });
    expect(steps.find((s) => s.requirement.key === "location")).toBeUndefined();
  });

  it("platform 필터: android 온보딩에서 ios 전용 항목이 빠진다", () => {
    const iosOnly = REQS.map((r) =>
      r.key === "location" ? { ...r, platforms: ["ios"] as const } : r,
    );
    const steps = planOnboardingSteps({
      platform: "android",
      requirements: iosOnly,
      states: {},
      batteryNoticeShown: false,
      skippedThisSession: [],
    });
    expect(steps.find((s) => s.requirement.key === "location")).toBeUndefined();
  });

  it("order 오름차순으로 정렬된다", () => {
    const steps = planOnboardingSteps({
      platform: "android",
      requirements: [...REQS].reverse(),
      states: {},
      batteryNoticeShown: false,
      skippedThisSession: [],
    });
    const orders = steps.map((s) => s.requirement.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});

describe("D5 — nextStep", () => {
  it("첫 actionable을 고른다", () => {
    const steps = planOnboardingSteps({
      platform: "android",
      requirements: REQS,
      states: { photos: "granted", location: "denied" },
      batteryNoticeShown: false,
      skippedThisSession: [],
    });
    expect(nextStep(steps)?.requirement.key).toBe("location");
  });

  it("actionable이 뒤에 있어도 order가 앞인 blocked를 먼저 고른다", () => {
    const steps = planOnboardingSteps({
      platform: "android",
      requirements: REQS,
      states: { photos: "blocked", location: "undetermined" },
      batteryNoticeShown: false,
      skippedThisSession: [],
    });
    expect(nextStep(steps)?.requirement.key).toBe("photos");
  });

  it("전부 satisfied면 null (시작하기 활성화)", () => {
    const steps = planOnboardingSteps({
      platform: "android",
      requirements: REQS,
      states: {
        photos: "granted",
        location: "granted",
        notifications: "granted",
      },
      batteryNoticeShown: true,
      skippedThisSession: [],
    });
    expect(nextStep(steps)).toBeNull();
  });

  it("전부 satisfied이거나 skipped-eligible이면 null", () => {
    const steps = planOnboardingSteps({
      platform: "android",
      requirements: REQS,
      states: { photos: "granted" },
      batteryNoticeShown: true,
      skippedThisSession: ["location", "notifications"],
    });
    expect(nextStep(steps)).toBeNull();
  });

  it("★ 031 — 사진 허용 후 다음 단계가 location이다 (photo-location 단계 부재, 무한 루프 없음)", () => {
    // 이 스펙 이전에는 사진 granted → photo-location이 늘 "undetermined" →
    // statusOf가 "actionable" → nextStep이 photo-location을 영원히 반환했다.
    const steps = planOnboardingSteps({
      platform: "android",
      requirements: PERMISSION_REQUIREMENTS,
      states: { photos: "granted" },
      batteryNoticeShown: false,
      skippedThisSession: [],
    });
    expect(steps.map((s) => s.requirement.key)).not.toContain("photo-location");
    expect(nextStep(steps)?.requirement.key).toBe("location");
  });
});

describe("describePhotoAccessLimit (data-model.md §2, FR-015)", () => {
  it("state가 limited면 partial", () => {
    expect(describePhotoAccessLimit({ state: "limited", visiblePhotoCount: null })).toBe("partial");
    expect(describePhotoAccessLimit({ state: "limited", visiblePhotoCount: 100 })).toBe("partial");
  });

  it("state가 granted이고 조회된 사진이 0장이면 partial (limited가 안 오는 기기)", () => {
    expect(describePhotoAccessLimit({ state: "granted", visiblePhotoCount: 0 })).toBe("partial");
  });

  it("state가 granted이고 사진이 있으면 full", () => {
    expect(describePhotoAccessLimit({ state: "granted", visiblePhotoCount: 42 })).toBe("full");
  });

  it("state가 granted이고 조회 안 했으면 full", () => {
    expect(describePhotoAccessLimit({ state: "granted", visiblePhotoCount: null })).toBe("full");
  });

  it("그 외 상태는 unknown", () => {
    expect(describePhotoAccessLimit({ state: "denied", visiblePhotoCount: null })).toBe("unknown");
    expect(describePhotoAccessLimit({ state: "undetermined", visiblePhotoCount: null })).toBe(
      "unknown",
    );
    expect(describePhotoAccessLimit({ state: "blocked", visiblePhotoCount: null })).toBe("unknown");
  });
});

describe("D1 — 순수성 (소스 검사)", () => {
  const RAW = readFileSync(join(__dirname, "../../src/onboarding/decision.ts"), "utf8");
  const CODE = RAW.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("new Date()·Date.now()를 부르지 않는다", () => {
    expect(CODE).not.toMatch(/new Date\(/);
    expect(CODE).not.toMatch(/Date\.now\(/);
  });

  it("expo-*·react-native·diary/·models/·schedule/를 import하지 않는다", () => {
    expect(CODE).not.toMatch(/from\s+["']expo-/);
    expect(CODE).not.toMatch(/from\s+["']react-native["']/);
    expect(CODE).not.toMatch(/from\s+["'][^"']*diary\//);
    expect(CODE).not.toMatch(/from\s+["'][^"']*models\//);
    expect(CODE).not.toMatch(/from\s+["'][^"']*schedule\//);
  });
});
