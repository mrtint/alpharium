import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

import { OnboardingScreen } from "../../src/ui/OnboardingScreen";
import { PERMISSION_REQUIREMENTS } from "../../src/onboarding/requirements";
import type { PermissionState } from "../../src/signals/port";

/**
 * 통합 온보딩 화면 테스트 (021).
 *
 * 계약: specs/021-unified-permission-onboarding/contracts/onboarding-screen.md
 *       S1·S5
 *       spec.md FR-005~FR-008·FR-013·FR-016, SC-003·SC-008
 */

/** 모든 권한 상태를 원하는 값으로 돌려주는 mock 통로 묶음. */
function makePorts(overrides?: {
  photo?: PermissionState;
  photoLocation?: PermissionState;
  location?: PermissionState;
  notification?: "granted" | "denied";
}) {
  const calls: string[] = [];
  const photoState = { value: overrides?.photo ?? ("undetermined" as PermissionState) };
  const photoLocState = {
    value: overrides?.photoLocation ?? ("undetermined" as PermissionState),
  };
  const locState = { value: overrides?.location ?? ("undetermined" as PermissionState) };
  const notifState = {
    value:
      overrides?.notification ??
      ("undetermined" as "granted" | "denied" | "undetermined" | "blocked"),
  };

  return {
    calls,
    ports: {
      photo: {
        photoPermission: async () => photoState.value,
        locationPermission: async () => photoLocState.value,
        requestPhotoPermission: async () => {
          calls.push("requestPhoto");
          photoState.value = "granted";
          return photoState.value;
        },
        requestLocationPermission: async () => {
          calls.push("requestPhotoLocation");
          photoLocState.value = "granted";
          return photoLocState.value;
        },
      },
      notification: {
        ensureChannel: async () => {
          calls.push("ensureChannel");
        },
        requestPermission: async () => {
          calls.push("requestNotification");
          notifState.value = overrides?.notification ?? "granted";
          return notifState.value;
        },
        getPermission: async () => notifState.value,
      },
      battery: {
        requestException: async () => {
          calls.push("requestBattery");
        },
        openSettingsList: async () => {
          calls.push("openBatterySettings");
        },
      },
      location: {
        status: async () => locState.value,
        request: async () => {
          calls.push("requestLocation");
          locState.value = "granted";
          return locState.value;
        },
      },
      osSettings: {
        openAppSettings: async () => {
          calls.push("openAppSettings");
        },
      },
    },
  };
}

const BASE_PROPS = {
  platform: "android" as const,
  requirements: PERMISSION_REQUIREMENTS,
  flag: { completed: false, batteryNoticeShown: false },
};

describe("S1 — 첫 단계 (FR-005·FR-006)", () => {
  it("전 단계 undetermined면 첫 단계가 photos다", async () => {
    const { ports } = makePorts();
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);
    await waitFor(() => expect(screen.getByTestId("onboarding-step-photos")).toBeTruthy());
  });

  it("[허용]을 누르면 그 단계 통로가 불리고 다음 단계로 넘어간다", async () => {
    const { ports, calls } = makePorts();
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);

    await waitFor(() => expect(screen.getByTestId("onboarding-allow")).toBeTruthy());
    fireEvent.press(screen.getByTestId("onboarding-allow"));

    await waitFor(() => expect(calls).toContain("requestPhoto"));
    await waitFor(() => expect(screen.getByTestId("onboarding-step-photo-location")).toBeTruthy());
  });
});

describe("S1.3 — [건너뛰기] (FR-008)", () => {
  it("건너뛰면 통로를 부르지 않고 다음 단계로", async () => {
    const { ports, calls } = makePorts();
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);

    await waitFor(() => expect(screen.getByTestId("onboarding-skip")).toBeTruthy());
    fireEvent.press(screen.getByTestId("onboarding-skip"));

    await waitFor(() => expect(screen.getByTestId("onboarding-step-photo-location")).toBeTruthy());
    expect(calls).not.toContain("requestPhoto");
  });
});

describe("S1.4 — [시작하기] (FR-011·SC-003)", () => {
  it("전부 건너뛰면 [시작하기]가 뜨고 onComplete({completed:true})가 불린다", async () => {
    const { ports } = makePorts();
    const onComplete = jest.fn();
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={onComplete} />);

    // 단계 수(4~5)만큼 건너뛴다. 현재 단계 컨테이너 testID가 바뀔 때까지 기다린다.
    function currentStepId(): string | null {
      for (const req of PERMISSION_REQUIREMENTS) {
        if (screen.queryByTestId(`onboarding-step-${req.key}`)) return req.key;
      }
      return null;
    }

    for (let i = 0; i < PERMISSION_REQUIREMENTS.length + 1; i += 1) {
      const here = currentStepId();
      if (here === null) break;
      fireEvent.press(screen.getByTestId("onboarding-skip"));
      await waitFor(() => {
        expect(currentStepId() === here && screen.queryByTestId("onboarding-start") === null).toBe(
          false,
        );
      });
    }

    await waitFor(() => expect(screen.getByTestId("onboarding-start")).toBeTruthy(), {
      timeout: 4000,
    });
    fireEvent.press(screen.getByTestId("onboarding-start"));

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ completed: true }));
  });
});

describe("S1.1 — blocked 단계 (FR-016)", () => {
  it("blocked면 [허용] 대신 [설정 열기]가 뜨고 osSettings가 불린다", async () => {
    const { ports, calls } = makePorts({ photo: "blocked" });
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);

    await waitFor(() => expect(screen.getByTestId("onboarding-open-settings")).toBeTruthy(), {
      timeout: 4000,
    });
    expect(screen.queryByTestId("onboarding-allow")).toBeNull();

    fireEvent.press(screen.getByTestId("onboarding-open-settings"));
    await waitFor(() => expect(calls).toContain("openAppSettings"), { timeout: 4000 });
  });
});

describe("S1 — 플랫폼 필터 (FR-003)", () => {
  it("ios + location.platforms:['android']이면 위치 단계가 안 나온다", async () => {
    const { ports } = makePorts({
      photo: "granted",
      photoLocation: "granted",
      notification: "granted",
    });
    const reqs = PERMISSION_REQUIREMENTS.map((r) =>
      r.key === "location" ? { ...r, platforms: ["android"] as const } : r,
    );
    await render(
      <OnboardingScreen
        platform="ios"
        requirements={reqs}
        flag={{ completed: false, batteryNoticeShown: true }}
        ports={ports}
        onComplete={() => {}}
      />,
    );
    // 전부 satisfied → [시작하기]. 위치 단계는 필터로 빠졌다.
    await waitFor(() => expect(screen.getByTestId("onboarding-start")).toBeTruthy(), {
      timeout: 4000,
    });
  });
});

describe("S5 — 소스 검사 (SC-008, 원칙 III)", () => {
  const RAW = readFileSync(join(__dirname, "../../src/ui/OnboardingScreen.tsx"), "utf8");
  const CODE = RAW.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("expo-*를 직접 import하지 않는다 (통로 주입)", () => {
    expect(CODE).not.toMatch(/from\s+["']expo-/);
  });

  it("models/roster·ModelAsset·assetFor를 참조하지 않는다 (FR-022)", () => {
    expect(CODE).not.toMatch(/models\/roster|\bModelAsset\b|\bassetFor\b/);
  });

  it("모델 식별자 문자열이 없다", () => {
    expect(RAW).not.toMatch(/kanana|exaone|hyperclovax|qwen3?|gemma3?|GGUF|Q4_|Q8_/i);
  });
});
