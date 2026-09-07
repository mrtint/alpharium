// UI 테스트(`jest-expo` 프로젝트) 공통 설정.
//
// `jest-expo`는 워커마다 React Native 런타임을 세우고, CI 러너는 2코어
// (`--maxWorkers=2`)라 첫 `render()`가 기본 5초 타임아웃을 넘길 수 있다. 2026-08-29에
// generation-probe·signal-probe·permission-panel 등 서로 다른 스위트가 CI 스케줄이
// 불운할 때 산발적으로 5초 초과로 깨졌다 — **코드 결함이 아니라 워커 경합이다**
// (AGENTS.md "Windows에서 느린 것은 Defender", 006의 `--maxWorkers=50%` 조정과 같은
// 계열).
//
// 개별 `.tsx`마다 `jest.setTimeout(30000)`을 흩뿌리는 대신(이미 여러 파일이 그렇게
// 하고 있었다) 한 자리에서 프로젝트 전체에 건다. 순수 로직(`.ts`, node 환경)은 이
// 파일을 로드하지 않으므로 7초대 속도가 그대로다.
jest.setTimeout(30000);

/* ─────────────────────────────────────────────────────────────────────────────
 * 033 — `react-native-reanimated` 목 (2026-09-07 실측)
 *
 * **reanimated는 jest에서 그대로 못 쓴다.** 목 없이 import하면 네이티브 모듈이
 * 없어 죽는다:
 *
 *   TypeError: Cannot read properties of undefined (reading 'loadUnpackers')
 *     at react-native-worklets/src/WorkletsModule/NativeWorklets.native.ts:411
 *
 * **★ 공식 목(`react-native-reanimated/mock`)도 안 통한다** — 그것이
 * `src/mock.ts:20`에서 **실제 index를 다시 import**해 같은 자리에서 똑같이
 * 죽는다. `jest-expo` 프리셋에도 reanimated 목이 없다(`moduleMocks` 확인).
 * 그래서 손으로 쓴다. 세 방법을 실제로 돌려 확인한 결과다.
 *
 * **⚠️ 이 목의 대가**: 기기 없는 테스트는 눌림 반응이 **"배선됐는가"만 검증하고
 * "실제로 움직이는가"는 검증하지 못한다**(033 contracts/press-feedback.md PF7).
 * 특히 `babel.config.js`의 worklets 플러그인이 빠져도 **테스트는 초록이다** —
 * 목이 진짜 reanimated를 대신하기 때문이다. 초록불을 "동작한다"로 읽지 않는다:
 * 011·013·020이 전부 "기기 없는 테스트 전부 통과 + 실기기에서 조용히 안 됨"이었다.
 *
 * 표면은 `Button`·`ListRow`가 실제로 쓰는 것만 둔다 — 안 쓰는 API를 미리 채우면
 * 그것이 032가 남긴 "만들고 안 쓰는" 자리가 된다.
 * ───────────────────────────────────────────────────────────────────────────── */
jest.mock("react-native-reanimated", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock 팩토리는 호이스팅되므로 상단 import를 못 쓴다
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: {
      View,
      Text: View,
      ScrollView: View,
      Image: View,
      createAnimatedComponent: (component: unknown) => component,
    },
    useSharedValue: (initial: unknown) => ({ value: initial }),
    // 스타일 계산 결과를 테스트가 검사하지 않는다(PF7) — 빈 스타일로 충분하다.
    useAnimatedStyle: () => ({}),
    withTiming: (toValue: unknown) => toValue,
    withSpring: (toValue: unknown) => toValue,
    Easing: { linear: (t: number) => t, ease: (t: number) => t, out: (f: unknown) => f },
  };
});
