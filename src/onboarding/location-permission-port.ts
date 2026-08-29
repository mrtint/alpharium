/**
 * 위치(장소명) 권한 조회·요청 통로 (021).
 *
 * 계약: specs/021-unified-permission-onboarding/contracts/permission-ports.md P2
 *       spec.md FR-004·FR-008
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `expo-location`의 foreground 권한 API를 지연 import한다. 017이 이미 이 패키지를
 * 들였고 App.tsx의 `onToggleGeocoding`이 인라인으로 부르지만, 온보딩은 이 통로를
 * 거친다 — 화면이 `expo-*`를 직접 import하지 않게(007~020 관례).
 *
 * **조회(`status`)는 요청하지 않는다**(004 FR-011 규칙 계승) — 화면이 열렸다는
 * 이유로 권한 창을 띄우면 맥락 없이 거절당하고 `blocked`가 된다. 요청은 사용자가
 * 버튼을 눌렀을 때만(`request`).
 *
 * research.md §2 실측 결과가 `platforms: ["ios"]`면, 안드로이드에서는 이 통로가
 * 온보딩 단계에서 호출되지 않는다(`requirements.ts`의 게이트).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { PermissionState } from "../signals/port";

export interface LocationPermissionPort {
  /** 현재 foreground 위치 권한 상태. **요청하지 않는다.** */
  status(): Promise<PermissionState>;
  /** 사용자가 버튼을 눌렀을 때만. 결과 상태를 돌려준다. */
  request(): Promise<PermissionState>;
}

/** `expo-location` 응답을 다섯 갈래 중 하나로 옮긴다. `limited`는 위치에 해당 없음. */
function toPermissionState(response: { status: string; canAskAgain?: boolean }): PermissionState {
  if (response.status === "granted") return "granted";
  if (response.status === "undetermined") return "undetermined";
  return response.canAskAgain === false ? "blocked" : "denied";
}

/** 실제 `expo-location`을 쓰는 통로. */
export function expoLocationPermissionPort(): LocationPermissionPort {
  return {
    async status() {
      try {
        const Location = await import("expo-location");
        return toPermissionState(await Location.getForegroundPermissionsAsync());
      } catch {
        // 조회하지 못하면 「아직 묻지 않음」으로 다룬다 — 아는 척하지 않는다(원칙 V).
        return "undetermined";
      }
    },

    async request() {
      try {
        const Location = await import("expo-location");
        return toPermissionState(await Location.requestForegroundPermissionsAsync());
      } catch {
        return "denied";
      }
    },
  };
}
