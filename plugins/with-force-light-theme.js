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
 * **실기기 조사로 확인한 진짜 원인 (2026-09-03, SM-S928N/One UI 8.5)**
 *
 * `cmd uimode night yes`에서 앱 배경이 정확히 `#303030`(= `background_material_dark`,
 * rgb(48,48,48))으로 나온다. **이건 force-dark 반전이 아니다** — force-dark라면
 * 글자·이미지까지 전부 반전됐을 텐데, 관측된 건 앱 콘텐츠가 아예 안 그려진 채
 * `#303030` 단색이었다. 즉 **윈도우 데코 배경이 테마에서 다크로 칠해진 것**이다:
 *
 *   `MainActivity`의 매니페스트 `android:theme`는 `Theme.App.SplashScreen`이고
 *   그 부모가 `AppTheme`, `AppTheme`의 부모가 `Theme.AppCompat.DayNight.NoActionBar`
 *   (**DayNight**)다. 시스템 night 모드에서 윈도우가 만들어질 때 `DayNight`가
 *   `android:windowBackground`/`colorBackground`를 다크로 해석한다.
 *
 *   `expo-system-ui`(`userInterfaceStyle: "light"` → `AppCompatDelegate
 *   .setDefaultNightMode(MODE_NIGHT_NO)`)는 **리소스 해석 계층만** 라이트로
 *   되돌린다(`dumpsys`의 `mLastConfigurationFromResources`에 `night` 없음 확인).
 *   하지만 윈도우 데코 배경은 이미 만들어질 때 칠해졌고, 매니페스트
 *   `android:configChanges`에 `uiMode`가 있어 Activity가 재생성되지 않아
 *   스테일한 다크 배경이 그대로 남는다.
 *
 * **수정: `AppTheme`의 부모를 `DayNight` → `Light`로 바꾼다.** 그러면 시스템
 * night 모드와 무관하게 윈도우 배경이 항상 라이트로 해석된다. `expo-system-ui`는
 * 그대로 두어(`userInterfaceStyle: "light"`) RN 뷰·컴포넌트 레벨의 라이트 고정을
 * 이중으로 보장한다.
 *
 * `android:forceDarkAllowed="false"`도 `AppTheme`·`Theme.App.SplashScreen`
 * 양쪽에 남긴다 — Light 테마에도 force-dark를 씌우는 제조사 대비 무해한 방어다.
 * API 29(Android 10)+ 속성이라 aapt2가 자동으로 `-v29` variant로 분리하며,
 * 낮은 버전에서는 무시될 뿐 빌드가 깨지지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { withAndroidStyles, AndroidConfig } = require("@expo/config-plugins");

const LIGHT_PARENT = "Theme.AppCompat.Light.NoActionBar";

/**
 * `styles.xml`(xml2js 파싱 결과)을 받아 라이트 고정을 적용한다:
 *
 *   1. `AppTheme`의 `parent`를 `Theme.AppCompat.Light.NoActionBar`로 바꾼다
 *      (원래 `Theme.AppCompat.DayNight.NoActionBar`). **이것이 실제 수정이다** —
 *      윈도우 배경이 시스템 night 모드를 따라 다크로 칠해지는 것을 막는다.
 *   2. `AppTheme`·`Theme.App.SplashScreen` 둘 다에 `android:forceDarkAllowed
 *      = false` item을 더한다(제조사 force-dark 대비 방어, 중복 미추가).
 *
 * 다른 `<style>`은 건드리지 않는다.
 */
function addForceLightItem(androidStyles) {
  // 1. AppTheme parent: DayNight → Light
  const appTheme = androidStyles.resources?.style?.find((s) => s.$?.name === "AppTheme");
  if (appTheme && appTheme.$) {
    appTheme.$.parent = LIGHT_PARENT;
  }

  // 2. forceDarkAllowed=false (양쪽 테마, 방어)
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
module.exports.LIGHT_PARENT = LIGHT_PARENT;
