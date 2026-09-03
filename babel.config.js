// 032 — NativeWind v4. `className` prop을 RN 코어 컴포넌트에 먹이려면
// babel/metro 두 레이어가 다 필요하다(research.md R2). 이 프로젝트는 이전에
// `babel.config.js`가 없어 Expo 기본값에 의존했다 — NativeWind가 명시 설정을
// 요구하므로 여기서 처음 만든다.
//
// `jsxImportSource: "nativewind"` — `className`을 코어 컴포넌트 일괄 지원.
//   빼면 `cssInterop`을 컴포넌트마다 수동 등록해야 한다(1인 개발자 조립 방식과
//   맞지 않음).
//
// ⚠️ **`nativewind/babel` 프리셋을 넣지 않는다**(research.md R8, 실측
// 2026-09-03). v4.2의 `nativewind/babel`은 `react-native-worklets/plugin`을
// 끌어들이는데 이 플러그인이 설치돼 있지 않다(reanimated 계열 — spec FR-005가
// 배제). 대신 `babel-preset-expo`의 `jsxImportSource`만으로 `className` → style
// 변환이 동작하고, `metro.config.js`의 `withNativeWind`가 CSS 컴파일을 맡는다.
// 이 조합이 네이티브 링크 0을 지킨다.
//
// 이 파일은 `logic`·`ui` 두 jest 프로젝트 양쪽에 적용된다(둘 다 babel을 거침).
// `logic` 테스트는 `src/ui/theme/tokens.ts`(순수 값)만 import하고 컴포넌트를
// import하지 않아야 트랜스폼 함정을 피한다.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
  };
};
