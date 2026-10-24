/**
 * 배터리 최적화 예외 안내 통로 (020, 065에서 직접 요청을 걷었다).
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/battery-exception.md
 *       E1
 *       spec.md FR-010, 019 findings.md "다음 스펙에서 고려할 사항"
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `expo-intent-launcher`로 시스템 설정 화면·다이얼로그를 띄운다. 이 저장소가
 * 005·011에서 겪은 "손으로 짠 JNI"의 위험이 없는 표준 Expo 모듈이다.
 *
 * **설정 목록을 여는 것뿐이고 예외를 직접 요청하지 않는다**(065). 직접 요청
 * (`ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`)은 `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`
 * 권한 선언이 필요한데, Google Play는 그 권한을 메신저·자동화·운동·기기 연결·안전·VPN처럼
 * 예외 없이는 핵심 기능이 망가지는 앱에만 허용한다. 이 앱은 예외가 없어도 하루 1~2회는
 * 돌고(019) 앱을 열면 바로 쓴다(057) — 늦어질 뿐 망가지지 않는다. 그래서 권한을 선언하지
 * 않고(`app.json`의 `blockedPermissions`가 다른 경로로 들어와도 걷는다) 사용자가 직접 끄는
 * 설정 목록만 연다. 반환값이 없다(원칙 IV) — 사용자가 무엇을 했는지 재지 않는다.
 *
 * 지연 import: `expo-intent-launcher`를 메서드 안에서 `await import`한다.
 *
 * **예외 상태를 읽는다**(`readStatus`, 104). 쓸 차례 알림을 늦출지(`reminder-plan.ts`)·설정 꼬리표·홈 안내가 모두 이 값 하나로 정해진다. `expo-battery`를 부르는 곳은 이 파일뿐이다
 * (`__tests__/config/promise-copy.test.ts` FX1). 읽는 것은 「최적화가 켜져 있는가」 한 가지이고 결과 외에 아무것도 남기지 않는다
 * (원칙 IV). 읽지 못한 것(던짐·iOS·모듈 없음)은 `unknown`이다 — 「예외 있음」으로 채우지 않는다(원칙 V).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { appPlatform, type AppPlatform } from "../app/platform";

/** 읽은 순간의 예외 상태. 저장하지 않는다 */
export type BatteryExceptionStatus = "exempt" | "restricted" | "unknown";

export interface BatteryExceptionPort {
  /**
   * 배터리 최적화 예외 설정 "목록" 화면을 연다. 온보딩 배터리 단계의 [허용]·[설정 열기]가
   * 이걸 부른다. 인텐트가 실패해도 예외를 밖으로 던지지 않는다.
   */
  openSettingsList(): Promise<void>;
  /**
   * 배터리 사용 「제한 없음」 여부를 읽는다 (104). 안드로이드의 최적화 예외가 켜져 있지 않으면 `restricted`, 있으면 `exempt`.
   * 던지지 않는다 — 읽지 못하면 `unknown`이다.
   */
  readStatus(): Promise<BatteryExceptionStatus>;
}

/** 통로를 덮는 자리 — 테스트가 기기 없이 갈아 끼운다 */
export type BatteryExceptionDeps = {
  /** 플랫폼. 던지면 읽지 못한 것으로 본다 */
  platform?: () => AppPlatform;
  /** `expo-battery`를 불러온다 */
  loadBattery?: () => Promise<{ isBatteryOptimizationEnabledAsync(): Promise<boolean> }>;
};

/**
 * 기기의 배터리 예외 통로.
 */
export function expoBatteryExceptionPort(deps: BatteryExceptionDeps = {}): BatteryExceptionPort {
  const platform = deps.platform ?? runtimePlatform;
  const loadBattery = deps.loadBattery ?? (() => import("expo-battery"));
  return {
    async readStatus() {
      try {
        if (platform() === "ios") return "unknown";
        const battery = await loadBattery();
        const optimized = await battery.isBatteryOptimizationEnabledAsync();
        if (optimized === true) return "restricted";
        if (optimized === false) return "exempt";
        return "unknown";
      } catch {
        return "unknown";
      }
    },

    async openSettingsList() {
      try {
        const IntentLauncher = await import("expo-intent-launcher");
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS,
        );
      } catch {
        await openAppSettingsFallback();
      }
    },
  };
}

/** 인텐트가 통하지 않는 기기의 마지막 수단 — 앱 설정 화면을 연다. */
async function openAppSettingsFallback(): Promise<void> {
  try {
    // `await import`가 아니다 — iOS에서 앱이 죽는다(066, `os-settings-port.ts` 머리말).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Linking } = require("react-native") as { Linking: { openSettings(): Promise<void> } };
    await Linking.openSettings();
  } catch {
    // 여기서도 실패하면 할 수 있는 게 없다 — 조용히 넘어간다.
  }
}

/** 호출 시점에 읽는다 — `await import("react-native")`가 아니다(066, iOS에서 앱이 죽는다) */
function runtimePlatform(): AppPlatform {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Platform } = require("react-native") as { Platform: { OS: string } };
  return appPlatform(Platform.OS);
}
