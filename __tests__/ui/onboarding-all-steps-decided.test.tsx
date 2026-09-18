import { act, cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react-native";

import { OnboardingScreen, ONBOARDING_STEP_AUTO_ADVANCE_MS } from "../../src/ui/OnboardingScreen";
import { PERMISSION_REQUIREMENTS } from "../../src/onboarding/requirements";
import type { PermissionState } from "../../src/signals/port";

/**
 * ★ 040 — `onAllStepsDecided` (FR-004). ★ 043 — 설명 카드 제거 후 동작 갱신.
 *
 * 계약: specs/040-onboarding-parallel-setup/spec.md FR-004
 *       specs/043-modernist-splash-permissions/spec.md FR-007a·FR-008
 *       tasks.md T013
 *
 * 별도 파일에 둔 이유: `__tests__/ui/onboarding-screen.test.tsx`의
 * "스텝 자동 전환"(fake timers) describe와 같은 파일에서 실행하면
 * jest-expo RNTL의 `screen` 싱글톤이 오염돼(순서 의존 실패) 이 테스트가
 * `render()` 직후의 화면을 못 찾는 현상이 재현됐다 — 파일을 나누면
 * jest가 각 파일을 독립된 워커/모듈 레지스트리로 돌려 해소된다.
 *
 * **043 갱신**: 사진·위치·알림 단계에는 더 이상 `onboarding-skip` 버튼이
 * 없으므로(FR-008), 그 단계들은 fake timer로 자동 호출을 진행시켜 통과시키고
 * 배터리 단계에서만 기존처럼 `onboarding-skip`을 누른다.
 */

jest.setTimeout(30000);

/**
 * ★ 043 — `photoPermission()`/`location.status()`/`notification.getPermission()`
 * (refresh가 부르는 조회 함수)이 요청 함수의 결과를 반영하도록 상태를
 * 추적한다 — 원래 고정값("undetermined")만 반환하던 버전은 043의 "요청
 * 결과에 따라 자동 진행"을 검증할 수 없었다(요청이 `granted`를 반환해도
 * 조회는 계속 `undetermined`로 덮어써 화면이 절대 다음 단계로 못 감).
 */
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
  const photoState = { value: "undetermined" as PermissionState };
  const locState = { value: "undetermined" as PermissionState };
  const notifState = { value: "undetermined" as "granted" | "denied" | "undetermined" | "blocked" };

  return {
    photo: {
      photoPermission: async () => photoState.value,
      requestPhotoPermission: async () => {
        photoState.value = "granted";
        return photoState.value;
      },
    },
    notification: {
      ensureChannel: async () => {},
      requestPermission: async () => {
        notifState.value = "granted";
        return "granted" as const;
      },
      getPermission: async () => notifState.value,
    },
    battery: {
      requestException: async () => {},
      openSettingsList: async () => {},
    },
    location: {
      status: async () => locState.value,
      request: async () => {
        locState.value = "granted";
        return locState.value;
      },
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

describe("040 — onAllStepsDecided (FR-004, 043 자동 진행으로 갱신)", () => {
  afterEach(async () => {
    jest.clearAllTimers();
    jest.useRealTimers();
    await act(async () => {
      cleanup();
    });
  });

  it("사진·위치·알림 자동 통과 + 배터리 건너뛰기로 에셋 미준비여도 onAllStepsDecided가 불린다", async () => {
    jest.useFakeTimers();
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
    const { unmount } = await render(
      <OnboardingScreen
        {...BASE_PROPS}
        ports={ports}
        onComplete={() => {}}
        onAllStepsDecided={onAllStepsDecided}
      />,
    );

    // 사진·위치·알림 세 단계는 자동 타이머로 통과(FR-007a) — 기본 mock이
    // 전부 "granted"를 반환하므로 순서대로 넘어간다. `waitFor`는 fake timer
    // 상태에서 내부 폴링이 함께 멈추므로 쓰지 않는다 — 매 반복마다 타이머를
    // 진행시키고 마이크로태스크를 흘려보내는 것만으로 충분하다
    // (onboarding-screen.test.tsx의 advance() 헬퍼와 같은 패턴).
    for (let i = 0; i < 3; i += 1) {
      await act(() => {
        jest.advanceTimersByTime(ONBOARDING_STEP_AUTO_ADVANCE_MS);
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
    }

    // 배터리 단계는 여전히 건너뛰기 버튼으로(FR-007c).
    await waitFor(
      () => expect(screen.getByTestId("onboarding-step-battery-exception")).toBeTruthy(),
      { timeout: 4000 },
    );
    fireEvent.press(screen.getByTestId("onboarding-skip"));

    await waitFor(() => expect(onAllStepsDecided).toHaveBeenCalledTimes(1), { timeout: 4000 });
    expect(onAllStepsDecided).toHaveBeenCalledTimes(1);

    await act(() => {
      unmount();
    });
  });
});

// ★ 043 — "콜백이 없어도(021 단독 사용) 에러 없이 동작한다" 테스트는
// __tests__/ui/onboarding-standalone-usage.test.tsx로 분리했다 — 이 파일의
// fake-timer 다단계 전환 테스트와 같은 파일(별도 describe로도)에 두면
// jest-expo RNTL의 `screen` 싱글톤이 오염돼 그 real-timer 테스트가
// `render()` 직후의 화면을 못 찾는 현상이 재현됐다.
