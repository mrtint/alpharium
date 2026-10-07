/**
 * 020 — 알림 권한을 매니페스트에 선언한다 (배터리 예외 권한은 065에서 걷었다)
 * (contracts/battery-exception.md E2, FR-010).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 `android/app/src/main/AndroidManifest.xml`을 직접 고치지 않는가**
 *
 * `.gitignore`가 `/android`를 무시한다 — 추적되지 않는 생성물이다. 직접 고치면
 * `npx expo prebuild --platform android --clean`에 지워지고, 다음 사람이
 * 재현할 수 없다. `with-release-signing.js`가 서명 설정에 대해 같은 판단을
 * 한 것과 같은 이유다(004에서 `expo run:android`가 prebuild를 건너뛰어
 * 권한이 빠진 APK가 설치된 사고가 근거).
 *
 * **넣는 권한 하나**:
 *  - `POST_NOTIFICATIONS` — Android 13(API 33)+에서 `expo-notifications`의
 *    런타임 권한 요청(`requestPermissionsAsync()`)이 먹으려면 매니페스트
 *    선언이 선행돼야 한다(contracts/notification.md N3).
 *
 * **`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`는 넣지 않는다**(065). 020은 이 권한으로
 * 시스템 다이얼로그에서 예외를 직접 요청했지만, Google Play가 그 권한을 예외 없이는
 * 핵심 기능이 망가지는 앱(메신저·자동화·운동·기기 연결·안전·VPN)에만 허용한다 —
 * 선언만으로 심사 대상이 된다. 배터리 예외는 권한이 필요 없는 설정 목록
 * (`IGNORE_BATTERY_OPTIMIZATION_SETTINGS`)으로만 안내하고, `app.json`의
 * `blockedPermissions`가 다른 라이브러리를 거쳐 들어오는 것까지 걷는다.
 * 파일 이름은 020 그대로 둔다(플러그인 목록·이력이 이 이름을 가리킨다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");

/** 매니페스트에 선언할 권한들. */
const PERMISSIONS = ["android.permission.POST_NOTIFICATIONS"];

/**
 * `<manifest>` 바로 아래에 `<uses-permission>` 항목을 더한다.
 *
 * 이미 있으면 다시 넣지 않는다(prebuild가 여러 번 돌 수 있다) —
 * `AndroidConfig.Permissions.addPermission`이 중복을 걸러 준다.
 */
function addBatteryExceptionPermissions(androidManifest) {
  for (const permission of PERMISSIONS) {
    AndroidConfig.Permissions.addPermission(androidManifest, permission);
  }
  return androidManifest;
}

/**
 * @param {object} config
 */
module.exports = function withBatteryException(config) {
  return withAndroidManifest(config, (manifestConfig) => {
    manifestConfig.modResults = addBatteryExceptionPermissions(manifestConfig.modResults);
    return manifestConfig;
  });
};

// 테스트가 순수 함수만 검증할 수 있도록 함께 내보낸다(기기·prebuild 없이 돈다).
module.exports.addBatteryExceptionPermissions = addBatteryExceptionPermissions;
module.exports.PERMISSIONS = PERMISSIONS;
