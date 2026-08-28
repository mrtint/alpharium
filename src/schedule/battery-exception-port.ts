/**
 * 배터리 최적화 예외 안내·요청 통로 (020).
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/battery-exception.md
 *       E1
 *       spec.md FR-010, 019 findings.md "다음 스펙에서 고려할 사항"
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `expo-intent-launcher`로 시스템 설정 화면·다이얼로그를 띄운다. 이 저장소가
 * 005·011에서 겪은 "손으로 짠 JNI"의 위험이 없는 표준 Expo 모듈이다.
 *
 * **`requestException()`은 반환값이 없다**(원칙 IV) — 사용자가 수락/거부/취소
 * 무엇을 했는지 측정하지 않는다. 실패해도 다음 `run()`이 그냥 느릴 뿐
 * 틀리지 않으므로 알릴 것이 없다.
 *
 * 지연 import: `expo-intent-launcher`를 메서드 안에서 `await import`한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface BatteryExceptionPort {
  /**
   * `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` 인텐트를 띄운다. 매니페스트에
   * 권한이 선언돼 있으면 앱을 나가지 않고 시스템 다이얼로그로 예외를
   * 요청한다(config plugin이 선언, E2). 자동 생성을 처음 켤 때 1회만
   * 불린다(FR-010 MUST NOT — 그 판정은 호출부가 한다).
   *
   * **반환값 없음**(원칙 IV). 인텐트가 실패해도 예외를 밖으로 던지지 않는다.
   */
  requestException(): Promise<void>;
  /**
   * 배터리 최적화 예외 설정 "목록" 화면을 연다. 거부 후 설정 화면의
   * 상시 링크가 이걸 부른다(E4).
   */
  openSettingsList(): Promise<void>;
}

/**
 * 기기의 배터리 예외 통로.
 */
export function expoBatteryExceptionPort(): BatteryExceptionPort {
  return {
    async requestException() {
      try {
        const IntentLauncher = await import("expo-intent-launcher");
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
          { data: "package:com.anonymous.alpharium" },
        );
      } catch {
        // 인텐트가 실패(액티비티 없음 등)해도 예외를 밖으로 던지지 않는다.
        // 자동 생성은 이것과 무관하게 동작한다(느릴 뿐).
        await openAppSettingsFallback();
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
    const { Linking } = await import("react-native");
    await Linking.openSettings();
  } catch {
    // 여기서도 실패하면 할 수 있는 게 없다 — 조용히 넘어간다.
  }
}
