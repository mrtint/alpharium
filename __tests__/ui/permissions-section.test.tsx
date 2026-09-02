import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";

import { PermissionsSection } from "../../src/ui/PermissionsSection";
import { PERMISSION_REQUIREMENTS } from "../../src/onboarding/requirements";
import type { PermissionState } from "../../src/signals/port";

/**
 * 설정 "권한" 섹션 테스트 (021).
 *
 * 계약: specs/021-unified-permission-onboarding/contracts/onboarding-screen.md
 *       S2·S5
 *       spec.md FR-015·FR-016·FR-017·FR-018·FR-019·FR-020, SC-005·SC-006
 */

// CI 러너(2코어)에서 `jest-expo` 첫 `render()`가 기본 5초를 넘길 수 있다 —
// `onboarding-screen.test.tsx`·`diary-home.test.tsx`의 선례를 따른다.
jest.setTimeout(30000);

function makePorts(overrides?: { photo?: PermissionState; location?: PermissionState }) {
  const calls: string[] = [];
  return {
    calls,
    ports: {
      photo: {
        photoPermission: async () => overrides?.photo ?? ("granted" as PermissionState),
        requestPhotoPermission: async () => {
          calls.push("requestPhoto");
          return "granted" as PermissionState;
        },
      },
      notification: {
        ensureChannel: async () => {},
        requestPermission: async () => "granted" as const,
        getPermission: async () => "granted" as const,
      },
      battery: {
        requestException: async () => {},
        openSettingsList: async () => {
          calls.push("openBatterySettings");
        },
      },
      location: {
        status: async () => overrides?.location ?? ("granted" as PermissionState),
        request: async () => "granted" as PermissionState,
      },
      osSettings: {
        openAppSettings: async () => {
          calls.push("openAppSettings");
        },
      },
      // 029 — PermissionsSection은 이 통로를 쓰지 않지만 OnboardingPorts 타입이 요구한다.
      essentialAssets: {
        readFacts: async () => [],
        downloadEssentials: async () => ({ ok: true as const }),
        hasSpaceForEssentials: async () => true,
      },
    },
  };
}

const BASE = {
  platform: "android" as const,
  requirements: PERMISSION_REQUIREMENTS,
};

describe("S2 — 031: photo-location 행 제거 (SC-005)", () => {
  it("★ 권한 섹션에 사진 위치 행이 없다 (4개 행만)", async () => {
    const { ports } = makePorts();
    await render(<PermissionsSection {...BASE} ports={ports} onRestartOnboarding={() => {}} />);
    await screen.findByTestId("permission-row-photos");
    expect(screen.queryByTestId("permission-row-photo-location")).toBeNull();
    expect(screen.getByTestId("permission-row-location")).toBeTruthy();
    expect(screen.getByTestId("permission-row-notifications")).toBeTruthy();
    expect(screen.getByTestId("permission-row-battery-exception")).toBeTruthy();
  });
});

describe("S2 — 배터리 상시 링크 (FR-018)", () => {
  it("배터리 예외 설정 링크가 항상 보이고 openSettingsList를 부른다", async () => {
    const { ports, calls } = makePorts();
    await render(<PermissionsSection {...BASE} ports={ports} onRestartOnboarding={() => {}} />);
    const link = await screen.findByTestId("permission-battery-open-settings");
    fireEvent.press(link);
    await waitFor(() => expect(calls).toContain("openBatterySettings"));
  });
});

describe("S2 — blocked 행 (FR-016)", () => {
  it("blocked면 [설정 열기]가 뜨고 osSettings를 부른다", async () => {
    const { ports, calls } = makePorts({ photo: "blocked" });
    await render(<PermissionsSection {...BASE} ports={ports} onRestartOnboarding={() => {}} />);
    const link = await screen.findByTestId("permission-photos-open-settings");
    fireEvent.press(link);
    await waitFor(() => expect(calls).toContain("openAppSettings"));
  });
});

describe("S2 — limited 행 (FR-015)", () => {
  it("limited면 전체 허용 링크가 뜬다", async () => {
    const { ports } = makePorts({ photo: "limited" });
    await render(<PermissionsSection {...BASE} ports={ports} onRestartOnboarding={() => {}} />);
    expect(await screen.findByTestId("permission-photos-open-settings")).toBeTruthy();
    expect(screen.getByText(/전부를 보지 못할 수 있/)).toBeTruthy();
  });
});

describe("S2 — 온보딩 다시 하기 (FR-019)", () => {
  it("[온보딩 다시 하기]가 onRestartOnboarding을 부른다", async () => {
    const { ports } = makePorts();
    const onRestart = jest.fn();
    await render(<PermissionsSection {...BASE} ports={ports} onRestartOnboarding={onRestart} />);
    fireEvent.press(await screen.findByTestId("permission-restart-onboarding"));
    expect(onRestart).toHaveBeenCalled();
  });
});

describe("S2 — 플랫폼 필터 (FR-003)", () => {
  it("android에서 location.platforms:['ios']이면 그 행이 안 나온다", async () => {
    const { ports } = makePorts();
    const reqs = PERMISSION_REQUIREMENTS.map((r) =>
      r.key === "location" ? { ...r, platforms: ["ios"] as const } : r,
    );
    await render(
      <PermissionsSection
        platform="android"
        requirements={reqs}
        ports={ports}
        onRestartOnboarding={() => {}}
      />,
    );
    await screen.findByTestId("permission-restart-onboarding");
    expect(screen.queryByTestId("permission-row-location")).toBeNull();
  });
});

describe("S2.2 — 포그라운드 복귀 재조회 (FR-020, SC-006)", () => {
  it("AppState가 active가 되면 권한을 다시 조회한다", async () => {
    let handler: ((s: string) => void) | null = null;
    const spy = jest.spyOn(AppState, "addEventListener").mockImplementation(((
      _event: string,
      cb: (s: string) => void,
    ) => {
      handler = cb;
      return { remove: () => {} };
    }) as typeof AppState.addEventListener);

    let reads = 0;
    const ports: any = {
      photo: {
        photoPermission: async () => {
          reads += 1;
          return "granted";
        },
        locationPermission: async () => "granted",
        requestPhotoPermission: async () => "granted",
        requestLocationPermission: async () => "granted",
      },
      notification: {
        ensureChannel: async () => {},
        requestPermission: async () => "granted",
        getPermission: async () => "granted",
      },
      battery: { requestException: async () => {}, openSettingsList: async () => {} },
      location: { status: async () => "granted", request: async () => "granted" },
      osSettings: { openAppSettings: async () => {} },
    };

    await render(<PermissionsSection {...BASE} ports={ports} onRestartOnboarding={() => {}} />);
    await screen.findByTestId("permission-restart-onboarding");
    const before = reads;
    const fire = handler as ((s: string) => void) | null;
    expect(fire).not.toBeNull();
    fire?.("active");
    await waitFor(() => expect(reads).toBeGreaterThan(before));
    spy.mockRestore();
  });
});

describe("S5 — 소스 검사 (원칙 III)", () => {
  const RAW = readFileSync(join(__dirname, "../../src/ui/PermissionsSection.tsx"), "utf8");
  const CODE = RAW.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("expo-*를 직접 import하지 않는다", () => {
    expect(CODE).not.toMatch(/from\s+["']expo-/);
  });

  it("models/roster·ModelAsset·assetFor를 참조하지 않는다 (FR-022)", () => {
    expect(CODE).not.toMatch(/models\/roster|\bModelAsset\b|\bassetFor\b/);
  });
});
