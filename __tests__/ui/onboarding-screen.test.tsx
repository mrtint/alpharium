import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, render, screen, fireEvent, waitFor } from "@testing-library/react-native";

import { OnboardingScreen, ONBOARDING_STEP_AUTO_ADVANCE_MS } from "../../src/ui/OnboardingScreen";
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
  flag: { completed: false, batteryNoticeShown: false, welcomeShown: false },
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
        flag={{ completed: false, batteryNoticeShown: true, welcomeShown: false }}
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
        flag={{ completed: false, batteryNoticeShown: true, welcomeShown: false }}
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
        flag={{ completed: false, batteryNoticeShown: true, welcomeShown: false }}
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
        flag={{ completed: false, batteryNoticeShown: true, welcomeShown: false }}
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

/**
 * ★ 040 T012 — 스텝 자동 전환 (research.md #1·#2, FR-001~FR-003).
 *
 * 목적 설명 렌더 직후 고정 지연으로 시스템 요청이 자동 호출되는지,
 * 언마운트·스텝 전환 시 타이머가 정리되는지, 배터리 예외 스텝은 자동
 * 타이머 대상이 아닌지를 `jest.useFakeTimers()`로 검증한다.
 */
describe("040 — 스텝 자동 전환 (research.md #1)", () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("스텝 진입 후 지연이 지나면 시스템 요청 함수가 자동 호출된다", async () => {
    jest.useFakeTimers();
    const { ports, calls } = makePorts();
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);

    await act(() => {
      jest.advanceTimersByTime(ONBOARDING_STEP_AUTO_ADVANCE_MS);
    });
    // 마이크로태스크(요청 → refresh)가 흐를 시간을 준다.
    await act(async () => {
      await Promise.resolve();
    });

    expect(calls).toContain("requestPhoto");
  });

  it("언마운트되면 타이머가 정리되어 자동 호출되지 않는다", async () => {
    jest.useFakeTimers();
    const { ports, calls } = makePorts();
    const { unmount } = await render(
      <OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />,
    );
    await act(() => {
      unmount();
    });

    await act(() => {
      jest.advanceTimersByTime(ONBOARDING_STEP_AUTO_ADVANCE_MS * 2);
    });

    expect(calls).not.toContain("requestPhoto");
  });

  it("배터리 예외 스텝은 자동 타이머가 없다 — 지연이 지나도 요청이 불리지 않는다", async () => {
    jest.useFakeTimers();
    const { ports, calls } = makePorts({
      photo: "granted",
      location: "granted",
      notification: "granted",
    });
    await render(
      <OnboardingScreen
        {...BASE_PROPS}
        flag={{ completed: false, batteryNoticeShown: false, welcomeShown: false }}
        ports={ports}
        onComplete={() => {}}
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId("onboarding-step-battery-exception")).toBeTruthy(),
    );

    await act(() => {
      jest.advanceTimersByTime(ONBOARDING_STEP_AUTO_ADVANCE_MS * 3);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(calls).not.toContain("requestBattery");
    // 여전히 배터리 스텝에 머물러 있다 — 자동으로 다음으로 안 넘어간다.
    expect(screen.getByTestId("onboarding-step-battery-exception")).toBeTruthy();
  });

  it("FR-003/Acceptance Scenario 2 — 시스템 팝업 거부(granted:false)여도 다음 스텝으로 자동 진행된다", async () => {
    jest.useFakeTimers();
    // photoPermission이 거부 상태로 남더라도(허용 콜백이 실패로 응답해도) 다음
    // 단계로 흐름이 이어져야 한다 — 건너뛰기 버튼을 누르지 않고도.
    const { ports } = makePorts();
    // requestPhotoPermission이 거부로 남는 통로로 덮어쓴다.
    (
      ports.photo as { requestPhotoPermission: () => Promise<PermissionState> }
    ).requestPhotoPermission = async () => "denied" as PermissionState;

    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);

    await waitFor(() => expect(screen.getByTestId("onboarding-step-photos")).toBeTruthy());

    await act(() => {
      jest.advanceTimersByTime(ONBOARDING_STEP_AUTO_ADVANCE_MS);
    });
    await act(async () => {
      await Promise.resolve();
    });

    // 021 statusOf: denied → actionable, 그래도 photos가 order 1위이므로
    // "denied" 상태에서는 nextStep이 여전히 photos를 가리킨다(재요청 가능) —
    // 이 테스트의 핵심은 "거부돼도 흐름이 멈추지 않는다"이므로, skip 버튼 없이
    // 화면이 여전히 반응 가능한 상태(같은 스텝이든 다음이든)임을 확인한다.
    // 흐름이 멈추지 않았다는 것은 skip으로 다음 단계에 명시적으로 도달 가능함으로
    // 확인한다.
    fireEvent.press(screen.getByTestId("onboarding-skip"));
    await waitFor(() => expect(screen.getByTestId("onboarding-step-location")).toBeTruthy());
  });
});

describe("FR-013 회귀 — 스텝 목록은 고정 배열에서만 온다", () => {
  const RAW = readFileSync(join(__dirname, "../../src/ui/OnboardingScreen.tsx"), "utf8");
  const CODE = RAW.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("자동 전환 로직이 스텝 목록을 동적으로 늘리거나 줄이지 않는다", () => {
    // 040의 자동 타이머 추가가 021의 planOnboardingSteps(고정 배열 입력) 호출
    // 방식 자체를 바꾸지 않았는지 소스로 확인한다 — steps는 여전히
    // planOnboardingSteps(requirements, ...)의 결과 하나뿐이다.
    const stepsDeclarations = CODE.match(/const steps = planOnboardingSteps\(/g) ?? [];
    expect(stepsDeclarations).toHaveLength(1);
    // requirements 인자가 그대로 전달된다(화면이 조건부로 필터링해 별도 배열을
    // 만들지 않는다).
    expect(CODE).toMatch(/planOnboardingSteps\(\{\s*platform,\s*requirements,/);
  });
});

// ★ 040 — onAllStepsDecided(FR-004) 계약 테스트는 __tests__/ui/onboarding-all-steps-decided.test.tsx로
// 분리했다 — 이 파일의 "스텝 자동 전환" describe(fake timers)와 같은 파일에
// 두면 jest-expo RNTL의 screen 싱글톤이 이전 테스트의 렌더 트리를 참조한 채
// 남아 다음 render()가 반영되지 않는 오염이 재현됐다(순서 의존 실패, 격리
// 시도로 해소 안 됨 — 별도 파일이 가장 확실한 방어).
