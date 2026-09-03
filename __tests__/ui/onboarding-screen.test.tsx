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

// `jest-expo`는 워커마다 RN 런타임을 세우고, CI 러너는 2코어라 첫 `render()`가
// 기본 5초 타임아웃을 넘길 수 있다(AGENTS.md "Windows에서 느린 것은 Defender"와
// 같은 계열). `diary-home.test.tsx`·`diary-home-notification.test.tsx`의 선례를 따른다.
jest.setTimeout(30000);

/** 모든 권한 상태를 원하는 값으로 돌려주는 mock 통로 묶음. */
function makePorts(overrides?: {
  photo?: PermissionState;
  location?: PermissionState;
  notification?: "granted" | "denied";
  essentialAssets?: {
    readFacts: () => Promise<{ key: string; ready: boolean }[]>;
    downloadEssentials: (
      onProgress: (f: number) => void,
    ) => Promise<
      { ok: true } | { ok: false; reason: "insufficient-space" | "network" | "unknown" }
    >;
    hasSpaceForEssentials: () => Promise<boolean>;
  };
}) {
  const calls: string[] = [];
  const photoState = { value: overrides?.photo ?? ("undetermined" as PermissionState) };
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
        requestPhotoPermission: async () => {
          calls.push("requestPhoto");
          photoState.value = "granted";
          return photoState.value;
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
      // 029 — 필수 에셋 통로. 기본 대역은 "전부 준비됨"이라 assets 단계를 건너뛴다.
      essentialAssets: overrides?.essentialAssets ?? {
        readFacts: async () => [
          { key: "v1", ready: true },
          { key: "v2", ready: true },
          { key: "a1", ready: true },
        ],
        downloadEssentials: async (onProgress: (f: number) => void) => {
          onProgress(1);
          return { ok: true as const };
        },
        hasSpaceForEssentials: async () => true,
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
    // 031 — photos 다음 단계는 location이다(photo-location 단계 제거).
    await waitFor(() => expect(screen.getByTestId("onboarding-step-location")).toBeTruthy());
  });

  it("★ 031 — 사진 허용 후 photo-location 단계가 나타나지 않는다", async () => {
    const { ports } = makePorts();
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);

    await waitFor(() => expect(screen.getByTestId("onboarding-allow")).toBeTruthy());
    fireEvent.press(screen.getByTestId("onboarding-allow"));

    await waitFor(() => expect(screen.getByTestId("onboarding-step-location")).toBeTruthy());
    expect(screen.queryByTestId("onboarding-step-photo-location")).toBeNull();
  });
});

describe("S1.3 — [건너뛰기] (FR-008)", () => {
  it("건너뛰면 통로를 부르지 않고 다음 단계로", async () => {
    const { ports, calls } = makePorts();
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);

    await waitFor(() => expect(screen.getByTestId("onboarding-skip")).toBeTruthy());
    fireEvent.press(screen.getByTestId("onboarding-skip"));

    // 031 — photos 다음 단계는 location이다.
    await waitFor(() => expect(screen.getByTestId("onboarding-step-location")).toBeTruthy());
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

/**
 * ★ 029 — "필수 에셋 다운로드" 단계 (FR-015~017·022, contracts/onboarding-assets.md §D).
 *
 * 권한 단계가 전부 끝났을 때(current === null) 필수 에셋이 준비 안 됐으면 assets
 * 단계가 뜬다. 이 단계는 건너뛸 수 없다(SR2). 진행률 바 하나(SR3). 준비되면
 * [시작하기](SR4). 실패 시 안내 + [다시 시도](SR5).
 */
describe("029 — 필수 에셋 다운로드 단계 (SR1~SR8)", () => {
  const allGranted = {
    photo: "granted" as PermissionState,
    location: "granted" as PermissionState,
    notification: "granted" as const,
  };

  it("OS1 — 권한 전부 satisfied + 에셋 미준비면 assets 단계가 뜬다 (SR1·SR2·SR3)", async () => {
    const { ports } = makePorts({
      ...allGranted,
      essentialAssets: {
        readFacts: async () => [{ key: "v1", ready: false }],
        downloadEssentials: async () => ({ ok: true as const }),
        hasSpaceForEssentials: async () => true,
      },
    });
    await render(
      <OnboardingScreen
        {...BASE_PROPS}
        flag={{ completed: false, batteryNoticeShown: true }}
        ports={ports}
        onComplete={() => {}}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("onboarding-step-assets")).toBeTruthy(), {
      timeout: 4000,
    });
    // SR3 — 진행률 바 하나.
    expect(screen.getByTestId("onboarding-assets-progress")).toBeTruthy();
    // SR2 — 건너뛰기 없음.
    expect(screen.queryByTestId("onboarding-skip")).toBeNull();
    // SR3 — 준비 전에는 [시작하기] 없음.
    expect(screen.queryByTestId("onboarding-start")).toBeNull();
  });

  it("OS2 — 에셋이 준비되면 assets 단계를 건너뛰고 [시작하기]가 뜬다 (SR4)", async () => {
    const { ports } = makePorts(allGranted); // 기본 대역 = 전부 ready
    await render(
      <OnboardingScreen
        {...BASE_PROPS}
        flag={{ completed: false, batteryNoticeShown: true }}
        ports={ports}
        onComplete={() => {}}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("onboarding-start")).toBeTruthy(), {
      timeout: 4000,
    });
    expect(screen.queryByTestId("onboarding-step-assets")).toBeNull();
  });

  it("OS3 — 다운로드가 공간 부족으로 실패하면 안내 + [다시 시도] (SR5)", async () => {
    let attempts = 0;
    const { ports } = makePorts({
      ...allGranted,
      essentialAssets: {
        readFacts: async () => [{ key: "v1", ready: false }],
        downloadEssentials: async () => {
          attempts += 1;
          return { ok: false as const, reason: "insufficient-space" as const };
        },
        hasSpaceForEssentials: async () => false,
      },
    });
    await render(
      <OnboardingScreen
        {...BASE_PROPS}
        flag={{ completed: false, batteryNoticeShown: true }}
        ports={ports}
        onComplete={() => {}}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("onboarding-assets-download")).toBeTruthy(), {
      timeout: 4000,
    });
    fireEvent.press(screen.getByTestId("onboarding-assets-download"));

    await waitFor(() => expect(screen.getByText(/저장 공간이 부족/)).toBeTruthy(), {
      timeout: 4000,
    });
    expect(screen.getByTestId("onboarding-assets-retry")).toBeTruthy();
    expect(screen.queryByTestId("onboarding-start")).toBeNull();

    // OS4 — [다시 시도]가 downloadEssentials를 재호출한다 (SR6).
    fireEvent.press(screen.getByTestId("onboarding-assets-retry"));
    await waitFor(() => expect(attempts).toBeGreaterThanOrEqual(2), { timeout: 4000 });
  });
});
