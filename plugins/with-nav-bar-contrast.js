/**
 * 116 — 안드로이드 3버튼 내비게이션 바 위의 시스템 대비 막(scrim)을 끈다.
 *
 * 하단 바(115)는 색을 화면 맨 아래(내비게이션 바 자리)까지 채운다. 그런데 내비게이션 바가
 * 투명이면(`android:navigationBarColor`) API 29+가 `enforceNavigationBarContrast`(기본 true)로
 * 반투명 흰 막을 덧씌워 그 자리의 바 색이 옅어진다(SM-S901N 실측: 빨강 236,48,19 →
 * 분홍 253,235,232). 이 속성을 `false`로 두면 막이 없어진다. API 29 미만에서는 무시된다.
 *
 * `/android`는 gitignore된 생성물이라 `styles.xml`을 직접 고치지 않고 plugin으로 건다
 * (`with-force-light-theme.js`와 같은 이유). 막을 끈 뒤 검정·빨강 바 위 3버튼 아이콘이
 * 보이는지는 기기에서 본다.
 */

const { withAndroidStyles, AndroidConfig } = require("@expo/config-plugins");

function addNavBarContrastItem(androidStyles) {
  return AndroidConfig.Styles.assignStylesValue(androidStyles, {
    add: true,
    parent: AndroidConfig.Styles.getAppThemeGroup(),
    name: "android:enforceNavigationBarContrast",
    value: "false",
  });
}

module.exports = function withNavBarContrast(config) {
  return withAndroidStyles(config, (stylesConfig) => {
    stylesConfig.modResults = addNavBarContrastItem(stylesConfig.modResults);
    return stylesConfig;
  });
};

module.exports.addNavBarContrastItem = addNavBarContrastItem;
