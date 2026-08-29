/**
 * OS 설정 화면 이동 통로 (021).
 *
 * 계약: specs/021-unified-permission-onboarding/contracts/permission-ports.md P3
 *       spec.md FR-017, research.md §6
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 안드로이드는 권한별 딥링크를 표준으로 주지 않는다 — 앱 상세 설정 화면이 현실적
 * 최선이다. 사진·위치·알림 권한을 거기서 켠다.
 *
 * 배터리 예외 목록은 이 통로가 아니라 기존 `BatteryExceptionPort.openSettingsList()`
 * (`IGNORE_BATTERY_OPTIMIZATION_SETTINGS` 인텐트)를 쓴다.
 *
 * 실패해도 예외를 밖으로 던지지 않는다 — `battery-exception-port.ts`의
 * `openAppSettingsFallback` 패턴.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface OsSettingsPort {
  /** OS의 이 앱 상세 설정 화면을 연다. */
  openAppSettings(): Promise<void>;
}

/** 실제 `react-native`의 `Linking`을 쓰는 통로. */
export function expoOsSettingsPort(): OsSettingsPort {
  return {
    async openAppSettings() {
      try {
        const { Linking } = await import("react-native");
        await Linking.openSettings();
      } catch {
        // 열지 못해도 예외를 던지지 않는다 — 사용자가 직접 설정으로 갈 수 있다.
      }
    },
  };
}
