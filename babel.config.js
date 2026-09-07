// 032 — NativeWind v4. `className` prop을 RN 코어 컴포넌트에 먹이려면
// babel/metro 두 레이어가 다 필요하다(032 research.md R2). 이 프로젝트는 이전에
// `babel.config.js`가 없어 Expo 기본값에 의존했다 — NativeWind가 명시 설정을
// 요구하므로 여기서 처음 만든다.
//
// `jsxImportSource: "nativewind"` — `className`을 코어 컴포넌트 일괄 지원.
//   빼면 `cssInterop`을 컴포넌트마다 수동 등록해야 한다(1인 개발자 조립 방식과
//   맞지 않음).
//
// **`nativewind/babel` 프리셋은 넣지 않는다**(032 research.md R8). `babel-preset-expo`의
// `jsxImportSource`만으로 `className` → style 변환이 동작하고, `metro.config.js`의
// `withNativeWind`가 CSS 컴파일을 맡는다. 프리셋으로 갈아타면 className 변환 경로
// 전체가 바뀌어 032 회귀 위험이 생긴다.
//
// ─────────────────────────────────────────────────────────────────────────────
// ★ 033 — `react-native-worklets/plugin`을 넣는다 (2026-09-07 실측)
//
// **032가 여기 적어 둔 "이 플러그인이 설치돼 있지 않다"는 스테일이었다.** 032가
// 진행 중 reanimated·worklets를 SDK 57 정합 버전으로 명시 핀했고(4.5.1 / 0.10.1)
// `node_modules/react-native-worklets/plugin/`이 실제로 있다. "spec FR-005가
// 배제"라는 서술도 사실과 다르다 — 032 FR-005는 reanimated를 **명시적으로 예외
// 허용**했다("NativeWind 도입이 곧 reanimated 도입이다").
//
// **왜 필요한가**: reanimated 4.x는 `useAnimatedStyle`·`withTiming` 안의 함수를
// worklet으로 컴파일해 UI 스레드에서 돌린다. 이 플러그인이 없으면 그 변환이
// 일어나지 않는다.
//
// **⚠️ 이 실패는 조용하다.** 오류를 내지 않고 애니메이션만 안 돈다 — 011의
// `has_media=0`, 013의 URI 계약 불일치, 020의 헤드리스 `defineTask` 미등록과 같은
// 계열이다. 게다가 jest는 reanimated를 목으로 대체하므로(`jest/setup-ui.ts`)
// **기기 없는 테스트가 이 결함을 구조적으로 못 잡는다.** 실기기 육안이 유일한
// 확인 통로다(033 spec FR-022).
//
// **플러그인은 배열의 마지막에 온다** — reanimated/worklets의 요구사항이다.
// ─────────────────────────────────────────────────────────────────────────────
//
// 이 파일은 `logic`·`ui` 두 jest 프로젝트 양쪽에 적용된다(둘 다 babel을 거침).
// `logic` 테스트는 `src/ui/theme/tokens.ts`(순수 값)만 import하고 컴포넌트를
// import하지 않아야 트랜스폼 함정을 피한다.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: ["react-native-worklets/plugin"],
  };
};
