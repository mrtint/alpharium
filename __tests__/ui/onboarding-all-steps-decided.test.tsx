import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

import { OnboardingScreen } from "../../src/ui/OnboardingScreen";
import { PERMISSION_REQUIREMENTS } from "../../src/onboarding/requirements";
import type { PermissionState } from "../../src/signals/port";

/**
 * ★ 040 — `onAllStepsDecided` (FR-004).
 *
 * 계약: specs/040-onboarding-parallel-setup/spec.md FR-004
 *       tasks.md T017 인접 — OnboardingScreen이 App.tsx에게 "권한 스텝이
 *       전부 결정됐다(에셋 준비와 무관)"를 알리는 통로.
 *
 * 별도 파일에 둔 이유: `__tests__/ui/onboarding-screen.test.tsx`의
 * "스텝 자동 전환"(fake timers) describe와 같은 파일에서 실행하면
 * jest-expo RNTL의 `screen` 싱글톤이 오염돼(순서 의존 실패) 이 테스트가
 * `render()` 직후의 화면을 못 찾는 현상이 재현됐다 — 파일을 나누면
 * jest가 각 파일을 독립된 워커/모듈 레지스트리로 돌려 해소된다.
 */

jest.setTimeout(30000);

function makePorts(overrides?: {
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
  return {
    photo: {
      photoPermission: async () => "undetermined" as PermissionState,
      requestPhotoPermission: async () => "granted" as PermissionState,
    },
    notification: {
      ensureChannel: async () => {},
      requestPermission: async () => "granted" as const,
      getPermission: async () => "undetermined" as const,
    },
    battery: {
      requestException: async () => {},
      openSettingsList: async () => {},
    },
    location: {
      status: async () => "undetermined" as PermissionState,
      request: async () => "granted" as PermissionState,
    },
    osSettings: {
      openAppSettings: async () => {},
    },
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
  };
}

const BASE_PROPS = {
  platform: "android" as const,
  requirements: PERMISSION_REQUIREMENTS,
  flag: { completed: false, batteryNoticeShown: false, welcomeShown: false },
};

describe("040 — onAllStepsDecided (FR-004)", () => {
  it("권한 스텝을 전부 건너뛰면 에셋이 미준비여도 onAllStepsDecided가 불린다", async () => {
    const onAllStepsDecided = jest.fn();
    const ports = makePorts({
      essentialAssets: {
        // 에셋이 준비 안 된 상태 — 그래도 콜백은 불려야 한다(FR-004는
        // 에셋 준비와 무관하다).
        readFacts: async () => [{ key: "v1", ready: false }],
        downloadEssentials: async () => ({ ok: true as const }),
        hasSpaceForEssentials: async () => true,
      },
    });
    await render(
      <OnboardingScreen
        {...BASE_PROPS}
        ports={ports}
        onComplete={() => {}}
        onAllStepsDecided={onAllStepsDecided}
      />,
    );

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
      await waitFor(
        () => {
          expect(currentStepId()).not.toBe(here);
        },
        { timeout: 4000 },
      );
    }

    await waitFor(() => expect(onAllStepsDecided).toHaveBeenCalledTimes(1), { timeout: 4000 });
    // 에셋 미준비 단계 UI가 남아 있어도(콜백을 무시하고 계속 이 컴포넌트를
    // 쓰는 경우의 방어) 콜백은 정확히 한 번만 불린다.
    expect(onAllStepsDecided).toHaveBeenCalledTimes(1);
  });

  it("콜백이 없어도(021 단독 사용) 에러 없이 동작한다", async () => {
    const ports = makePorts();
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);
    await waitFor(() => expect(screen.getByTestId("onboarding-step-photos")).toBeTruthy(), {
      timeout: 4000,
    });
  });
});
