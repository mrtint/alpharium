import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { OnboardingScreen, ONBOARDING_STEP_AUTO_ADVANCE_MS } from "../../src/ui/OnboardingScreen";
import { PERMISSION_REQUIREMENTS } from "../../src/onboarding/requirements";
import type { PermissionState } from "../../src/signals/port";

/**
 * 통합 온보딩 화면 테스트 (021, ★ 043 — 설명 카드 제거·OS 다이얼로그 연속
 * 자동 호출로 재작성).
 *
 * 계약: specs/021-unified-permission-onboarding/contracts/onboarding-screen.md
 *       S1·S5
 *       specs/043-modernist-splash-permissions/spec.md FR-007a·FR-007c·
 *       FR-008·FR-008a·FR-009
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **043의 핵심 변경**: 사진·위치·알림 세 단계는 설명 카드(`rationale`/
 * `ifDenied`)와 [허용]/[건너뛰기] 버튼을 화면에 두지 않는다 — 스텝 진입과
 * 동시에(짧은 지연 후) 요청 함수가 자동 호출되고, 거부되면 화면이 자동으로
 * 다음 단계로 넘어간다(FR-008 — `decision.ts`의 `statusOf()`가 `denied`를
 * `actionable`로 판정하므로, 이 자동 전환은 화면이 능동적으로
 * `skip(key)`를 호출해야 성립한다). `blocked`(다시 묻지 않음)만 예외적으로
 * [설정 열기] 버튼이 남는다(FR-008a). 배터리 예외 단계는 기존 021 방식
 * (안내 문구 + [설정 열기]/[건너뛰기])을 그대로 유지한다(FR-007c).
 * ─────────────────────────────────────────────────────────────────────────────
 */

jest.setTimeout(30000);

/** 모든 권한 상태를 원하는 값으로 돌려주는 mock 통로 묶음. */
function makePorts(overrides?: {
  photo?: PermissionState;
  photoResult?: PermissionState;
  location?: PermissionState;
  locationResult?: PermissionState;
  notification?: "granted" | "denied" | "undetermined" | "blocked";
  notificationResult?: "granted" | "denied";
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
    value: overrides?.notification ?? ("undetermined" as const),
  };

  return {
    calls,
    ports: {
      photo: {
        photoPermission: async () => photoState.value,
        requestPhotoPermission: async () => {
          calls.push("requestPhoto");
          const result = overrides?.photoResult ?? ("granted" as PermissionState);
          photoState.value = result;
          return result;
        },
      },
      notification: {
        ensureChannel: async () => {
          calls.push("ensureChannel");
        },
        requestPermission: async () => {
          calls.push("requestNotification");
          const result = overrides?.notificationResult ?? ("granted" as const);
          notifState.value = result;
          return result;
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
          const result = overrides?.locationResult ?? ("granted" as PermissionState);
          locState.value = result;
          return result;
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
  flag: {
    completed: false,
    batteryNoticeShown: false,
    welcomeShown: false,
    downloadConsented: false,
  },
};

async function advance(ms: number = ONBOARDING_STEP_AUTO_ADVANCE_MS) {
  await act(() => {
    jest.advanceTimersByTime(ms);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("043 — 사진·위치·알림 단계에 설명 카드·버튼이 없다 (FR-007a·FR-009)", () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("사진 단계 진입 시 rationale·ifDenied 텍스트가 렌더되지 않는다", async () => {
    const { ports } = makePorts();
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);

    await waitFor(() => expect(screen.getByTestId("onboarding-step-photos")).toBeTruthy());

    const photoReq = PERMISSION_REQUIREMENTS.find((r) => r.key === "photos")!;
    expect(screen.queryByText(photoReq.rationale)).toBeNull();
    expect(screen.queryByText(photoReq.ifDenied)).toBeNull();
  });

  it("사진·위치·알림 단계에는 onboarding-allow 버튼이 없다", async () => {
    const { ports } = makePorts();
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);

    await waitFor(() => expect(screen.getByTestId("onboarding-step-photos")).toBeTruthy());
    expect(screen.queryByTestId("onboarding-allow")).toBeNull();
  });

  it("사진·위치·알림 단계에는 onboarding-skip 버튼이 없다 (FR-008)", async () => {
    const { ports } = makePorts();
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);

    await waitFor(() => expect(screen.getByTestId("onboarding-step-photos")).toBeTruthy());
    expect(screen.queryByTestId("onboarding-skip")).toBeNull();
  });

  it("배터리 예외 단계(actionable)에는 여전히 onboarding-skip·allow 버튼이 있다 (FR-007c)", async () => {
    const { ports } = makePorts({
      photo: "granted",
      location: "granted",
      notification: "granted",
    });
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);

    await waitFor(() =>
      expect(screen.getByTestId("onboarding-step-battery-exception")).toBeTruthy(),
    );
    // 배터리 예외는 조회 API가 없어 항상 actionable로 시작한다(blocked
    // 판정 없음) — [허용] 버튼이 뜬다. [설정 열기]는 별도 액션(FR-007c의
    // openSettingsList 경로)이며 이 상태에서는 렌더되지 않는다.
    expect(screen.getByTestId("onboarding-skip")).toBeTruthy();
    expect(screen.getByTestId("onboarding-allow")).toBeTruthy();
  });
});

describe("043 — 스텝 진입 즉시 자동 호출 (FR-007a)", () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("사진 단계 진입 후 지연이 지나면 requestPhotoPermission이 자동 호출된다", async () => {
    jest.useFakeTimers();
    const { ports, calls } = makePorts();
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);

    await advance();

    expect(calls).toContain("requestPhoto");
  });

  it("허용되면 다음 단계(location)로 자동 전환된다", async () => {
    jest.useFakeTimers();
    const { ports } = makePorts({ photoResult: "granted" });
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);

    await advance();

    await waitFor(() => expect(screen.getByTestId("onboarding-step-location")).toBeTruthy());
  });
});

describe("★ 043 CRITICAL — 거부(denied) 시 자동 건너뛰기 (FR-008 핵심)", () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("사진 요청이 거부(denied)로 응답해도 자동으로 다음 단계(location)로 전환된다", async () => {
    jest.useFakeTimers();
    const { ports } = makePorts({ photoResult: "denied" });
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);

    await waitFor(() => expect(screen.getByTestId("onboarding-step-photos")).toBeTruthy());

    await advance();

    // FR-008 — 거부는 곧 건너뛰기와 같은 효과. 화면에 skip 버튼이 없으므로
    // 화면 스스로 다음 단계로 넘어가야 한다(수동 스킵 없이).
    await waitFor(() => expect(screen.getByTestId("onboarding-step-location")).toBeTruthy());
  });

  it("위치 요청이 거부돼도 자동으로 알림 단계로 전환된다", async () => {
    jest.useFakeTimers();
    const { ports } = makePorts({
      photo: "granted",
      locationResult: "denied",
    });
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);

    await waitFor(() => expect(screen.getByTestId("onboarding-step-location")).toBeTruthy());
    await advance();

    await waitFor(() => expect(screen.getByTestId("onboarding-step-notifications")).toBeTruthy());
  });

  it("blocked(다시 묻지 않음)면 자동 전환하지 않고 [설정 열기]가 뜬다 (FR-008a)", async () => {
    jest.useFakeTimers();
    const { ports, calls } = makePorts({ photo: "blocked" });
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);

    // 초기 refresh()가 끝나 `blocked`가 반영될 시간을 먼저 준다 — 그 전에는
    // states가 비어 있어 첫 렌더가 일시적으로 actionable로 보일 수 있다.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByTestId("onboarding-open-settings")).toBeTruthy());
    expect(screen.queryByTestId("onboarding-allow")).toBeNull();

    calls.length = 0; // 초기 판정 과정에서 남았을 수 있는 호출 기록을 비운다.

    // blocked로 확정된 뒤에는 타이머가 지나도 requestPhoto가 자동 호출되지
    // 않는다 — blocked는 인앱 요청이 무효라 자동 재시도 자체를 하지 않는다.
    await advance();
    expect(calls).not.toContain("requestPhoto");
    // 여전히 같은 단계에 머문다.
    expect(screen.getByTestId("onboarding-step-photos")).toBeTruthy();
  });
});

describe("배터리 예외 스텝은 자동 타이머가 없다 (research.md #2, FR-007c)", () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("지연이 지나도 requestBattery가 자동 호출되지 않는다", async () => {
    jest.useFakeTimers();
    const { ports, calls } = makePorts({
      photo: "granted",
      location: "granted",
      notification: "granted",
    });
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);

    await waitFor(() =>
      expect(screen.getByTestId("onboarding-step-battery-exception")).toBeTruthy(),
    );

    await advance(ONBOARDING_STEP_AUTO_ADVANCE_MS * 3);

    expect(calls).not.toContain("requestBattery");
    expect(screen.getByTestId("onboarding-step-battery-exception")).toBeTruthy();
  });
});

describe("[시작하기] (FR-011·SC-003)", () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("모든 단계가 만족되면 [시작하기]가 뜨고 onComplete가 불린다", async () => {
    jest.useFakeTimers();
    const onComplete = jest.fn();
    const { ports } = makePorts();
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={onComplete} />);

    // 사진 → 위치 → 알림 자동 통과, 배터리는 버튼으로.
    await advance();
    await waitFor(() => expect(screen.getByTestId("onboarding-step-location")).toBeTruthy());
    await advance();
    await waitFor(() => expect(screen.getByTestId("onboarding-step-notifications")).toBeTruthy());
    await advance();
    await waitFor(() =>
      expect(screen.getByTestId("onboarding-step-battery-exception")).toBeTruthy(),
    );

    await fireEvent.press(screen.getByTestId("onboarding-skip"));

    await waitFor(() => expect(screen.getByTestId("onboarding-start")).toBeTruthy(), {
      timeout: 4000,
    });
    await fireEvent.press(screen.getByTestId("onboarding-start"));

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ completed: true }));
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
        flag={{
          completed: false,
          batteryNoticeShown: true,
          welcomeShown: false,
          downloadConsented: false,
        }}
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
 * 043은 이 분기의 구조를 변경하지 않는다 — 스타일만 토큰 자동 상속.
 */
describe("029 — 필수 에셋 다운로드 단계 (SR1~SR8, 043 무변경 회귀)", () => {
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
        flag={{
          completed: false,
          batteryNoticeShown: true,
          welcomeShown: false,
          downloadConsented: false,
        }}
        ports={ports}
        onComplete={() => {}}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("onboarding-step-assets")).toBeTruthy(), {
      timeout: 4000,
    });
    expect(screen.getByTestId("onboarding-assets-progress")).toBeTruthy();
    expect(screen.queryByTestId("onboarding-skip")).toBeNull();
    expect(screen.queryByTestId("onboarding-start")).toBeNull();
  });

  it("OS2 — 에셋이 준비되면 assets 단계를 건너뛰고 [시작하기]가 뜬다 (SR4)", async () => {
    const { ports } = makePorts(allGranted);
    await render(
      <OnboardingScreen
        {...BASE_PROPS}
        flag={{
          completed: false,
          batteryNoticeShown: true,
          welcomeShown: false,
          downloadConsented: false,
        }}
        ports={ports}
        onComplete={() => {}}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("onboarding-start")).toBeTruthy(), {
      timeout: 4000,
    });
    expect(screen.queryByTestId("onboarding-step-assets")).toBeNull();
  });
});

describe("FR-013 회귀 — 스텝 목록은 고정 배열에서만 온다", () => {
  const RAW = readFileSync(join(__dirname, "../../src/ui/OnboardingScreen.tsx"), "utf8");
  const CODE = RAW.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("자동 전환 로직이 스텝 목록을 동적으로 늘리거나 줄이지 않는다", () => {
    const stepsDeclarations = CODE.match(/const steps = planOnboardingSteps\(/g) ?? [];
    expect(stepsDeclarations).toHaveLength(1);
    expect(CODE).toMatch(/planOnboardingSteps\(\{\s*platform,\s*requirements,/);
  });
});
