/**
 * 020 — 배터리 최적화 예외 요청과 알림 권한을 매니페스트에 선언한다
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
 * **넣는 권한 둘**:
 *  - `POST_NOTIFICATIONS` — Android 13(API 33)+에서 `expo-notifications`의
 *    런타임 권한 요청(`requestPermissionsAsync()`)이 먹으려면 매니페스트
 *    선언이 선행돼야 한다(contracts/notification.md N3).
 *  - `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` — 이 권한이 선언돼야
 *    `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` 인텐트가 앱을 나가지
 *    않고 시스템 다이얼로그로 예외를 요청할 수 있다. 없으면 설정 목록
 *    화면으로만 보낼 수 있다(contracts/battery-exception.md E1·E2).
 *
 * **남용 경계**: `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`는 스토어 정책상
 * "왜 필요한지" 설명 없이 요청하면 위반이 될 수 있다 — 그 설명 화면은
 * `AutoDiarySettingsScreen`(E3)이 담당하고, 이 플러그인은 매니페스트 선언만
 * 한다. 요청 자체는 자동 생성을 처음 켤 때 1회뿐이다(FR-010 MUST NOT).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");

/** 매니페스트에 선언할 권한들. */
const PERMISSIONS = [
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
];

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
