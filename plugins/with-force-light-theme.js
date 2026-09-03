/**
 * 031 — One UI 8.5+에서 앱을 라이트로 고정한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 `android/app/src/main/res/values/styles.xml`을 직접 고치지 않는가**
 *
 * `.gitignore`가 `/android`를 무시한다 — 추적되지 않는 생성물이다. 직접 고치면
 * `npx expo prebuild --platform android --clean`에 지워지고, 다음 사람이
 * 재현할 수 없다. `with-battery-exception.js`가 매니페스트에 대해, `with-release-
 * signing.js`가 서명 설정에 대해 같은 판단을 한 것과 같은 이유다.
 *
 * **왜 `expo-system-ui`(app.json의 `userInterfaceStyle: "light"`)만으로 부족한가**
 *
 * `expo-system-ui`는 `userInterfaceStyle`이 네이티브 uiMode에 적용되게 한다 —
 * 없으면 `@expo/prebuild-config`가 경고만 내고 무시한다(설치본 확인, 2026-09-03).
 * 그런데 `styles.xml`의 `AppTheme` 부모가 `Theme.AppCompat.DayNight.NoActionBar`
 * (**DayNight**)이고, One UI 8.5는 앱이 라이트를 선언해도 뷰 색을 런타임에
 * 반전하는 **force-dark** 알고리즘을 씌우는 사례가 보고돼 있다(031 실기기 조사:
 * `adb shell "cmd uimode night yes"` 후 화면이 회색~검정으로 관측). 그래서
 * `android:forceDarkAllowed="false"`를 앱 테마에 명시해 이 반전을 끈다.
 *
 * `expo-system-ui`(선언 레벨) + `forceDarkAllowed`(변환 차단 레벨)를 함께 두면
 * One UI 버전과 무관하게 라이트가 유지된다.
 *
 * `android:forceDarkAllowed`는 API 29(Android 10)+ 속성이다. `minSdk 24`이지만
 * 낮은 버전에서는 무시될 뿐(force-dark 자체가 없음) 빌드가 깨지지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { withAndroidStyles, AndroidConfig } = require("@expo/config-plugins");

/**
 * `forceDarkAllowed=false`를 넣을 스타일들.
 *
 * `AppTheme`뿐 아니라 **`Theme.App.SplashScreen`도** 넣는다 — `MainActivity`의
 * 매니페스트 `android:theme`가 이것이고(`expo-splash-screen`), 윈도우 데코가
 * 만들어질 때 읽는 것은 이 스타일의 **자기 속성 집합**이지 상속 체인이 아니다.
 * `AppTheme`에만 넣으면 `Theme.App.SplashScreen`이 상속으로 받지 못해
 * force-dark가 그대로 적용된다(031 실기기: 배경이 rgb(48,48,48)로 반전).
 */
function addForceLightItem(androidStyles) {
  let out = AndroidConfig.Styles.assignStylesValue(androidStyles, {
    add: true,
    parent: AndroidConfig.Styles.getAppThemeGroup(),
    name: "android:forceDarkAllowed",
    value: "false",
  });
  out = AndroidConfig.Styles.assignStylesValue(out, {
    add: true,
    parent: { name: "Theme.App.SplashScreen" },
    name: "android:forceDarkAllowed",
    value: "false",
  });
  return out;
}

/**
 * @param {object} config
 */
module.exports = function withForceLightTheme(config) {
  return withAndroidStyles(config, (stylesConfig) => {
    stylesConfig.modResults = addForceLightItem(stylesConfig.modResults);
    return stylesConfig;
  });
};

// 테스트가 순수 함수만 검증할 수 있도록 함께 내보낸다(기기·prebuild 없이 돈다).
module.exports.addForceLightItem = addForceLightItem;
