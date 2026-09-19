import { render, screen, waitFor } from "@testing-library/react-native";

import { OnboardingScreen } from "../../src/ui/OnboardingScreen";
import { PERMISSION_REQUIREMENTS } from "../../src/onboarding/requirements";
import type { PermissionState } from "../../src/signals/port";

/**
 * ★ 040 — `onAllStepsDecided` 콜백 없이도(021 단독 사용) 동작한다 (FR-004).
 *
 * 계약: specs/040-onboarding-parallel-setup/spec.md FR-004
 *       specs/043-modernist-splash-permissions/spec.md FR-007a
 *
 * **별도 파일로 분리한 이유**(043): `onboarding-all-steps-decided.test.tsx`의
 * fake-timer 다단계 전환 테스트와 같은 파일(심지어 별도 describe)에 두면
 * jest-expo RNTL의 `screen` 싱글톤이 오염돼 이 real-timer 테스트가
 * `render()` 직후의 화면을 못 찾는 현상이 재현됐다 — 그 파일 자체가 이미
 * "파일을 나누면 jest가 각 파일을 독립된 워커/모듈 레지스트리로 돌려
 * 해소된다"고 기록한 것과 같은 계열의 문제라 같은 처방(파일 분리)을
 * 적용했다.
 */

function makePorts() {
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
    essentialAssets: {
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
  flag: {
    completed: false,
    batteryNoticeShown: false,
    welcomeShown: false,
    downloadConsented: false,
  },
};

describe("040 — onAllStepsDecided, 콜백 없는 단독 사용", () => {
  it("콜백이 없어도(021 단독 사용) 에러 없이 동작한다", async () => {
    const ports = makePorts();
    await render(<OnboardingScreen {...BASE_PROPS} ports={ports} onComplete={() => {}} />);
    await waitFor(() => expect(screen.getByTestId("onboarding-step-photos")).toBeTruthy(), {
      timeout: 4000,
    });
  });
});
