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
/** 050 — 레이아웃 애니메이션 체이닝 스텁. `jest.mock` 팩토리는 `mock` 접두사가 붙은 바깥 이름만 볼 수 있다 */
function mockLayoutAnimationStub(): Record<string, unknown> {
  const stub: Record<string, unknown> = {};
  for (const method of ["duration", "delay", "reduceMotion", "springify", "easing"]) {
    stub[method] = () => stub;
  }
  return stub;
}

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
    // 046 — 프로그레스 바 깜빡임(ProgressSegmentBar)이 쓴다. 목에서는 값
    // 자체를 검사하지 않으므로(PF7과 같은 논리) 인자를 그대로 통과시키는
    // 최소 구현으로 충분하다.
    withRepeat: (toValue: unknown) => toValue,
    withSequence: (...values: unknown[]) => values[0],
    // 049 — gesture-handler가 reanimated를 감지하면(`useSharedValue`가 있으면) `useEvent`로
    // 제스처 이벤트를 UI 스레드에 잇는다. 목에는 UI 스레드가 없으므로 빈 핸들러를 준다 —
    // 홈 스트립의 팬은 `runOnJS(true)`라 콜백이 JS에서 돌고, 테스트는 `fireGestureHandler`로
    // 그 콜백을 직접 쏜다.
    useEvent: () => () => {},
    setGestureState: () => {},
    // 050 — RNR 대화상자·메뉴 복사본(`src/ui/rnr/native-only-animated-view.tsx`)이 `entering`/
    // `exiting`에 레이아웃 애니메이션을 준다. 목에는 움직임이 없으므로 체이닝만 되는 빈 객체를
    // 준다(`.duration()`·`.delay()`·`.reduceMotion()`이 자기 자신). 움직임은 실기기에서 본다(C9).
    FadeIn: mockLayoutAnimationStub(),
    FadeOut: mockLayoutAnimationStub(),
    ReduceMotion: { System: "system", Always: "always", Never: "never" },
    Easing: {
      linear: (t: number) => t,
      ease: (t: number) => t,
      in: (f: unknown) => f,
      out: (f: unknown) => f,
      inOut: (f: unknown) => f,
    },
  };
});

/* ─────────────────────────────────────────────────────────────────────────────
 * 046 — `react-native-reanimated-carousel` 목.
 *
 * 이 라이브러리는 내부적으로 `react-native-worklets`를 다시 require해
 * 위 reanimated 목을 우회하고 같은 `loadUnpackers` 오류로 죽는다(033의
 * reanimated 목 필요성과 같은 뿌리 — 네이티브 모듈이 jest 환경에 없다).
 *
 * 이 목이 흉내내는 것은 딱 하나 — **`data` 배열의 첫 항목에 대해
 * `renderItem`을 1회 호출해 렌더링한다.** 무한 순환·스와이프·자동 전환
 * 같은 실제 캐러셀 동작은 이 목으로 검증할 수 없다(033 PF7과 같은 대가) —
 * 그 부분은 quickstart.md의 실기기 검증으로 보완한다. `testID`만 그대로
 * 전달해 계약 테스트가 화면 배선(캐러셀이 렌더 트리에 있는지)을 확인할
 * 수 있게 한다.
 * ───────────────────────────────────────────────────────────────────────────── */
jest.mock("react-native-reanimated-carousel", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock 팩토리는 호이스팅되므로 상단 import를 못 쓴다
  const { createElement } = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native");
  return {
    __esModule: true,
    // 051 — 배선 검사용으로 `loop`·`onSnapToItem`·`onProgressChange`·`onConfigurePanGesture`·`data`·
    // `style`을 host props로 넘긴다(계약 CAR3·CAR5). 넘김·순환은 이 목으로 검증할 수 없다 — 실기기(C9).
    Carousel: ({
      data,
      renderItem,
      testID,
      loop,
      onSnapToItem,
      onProgressChange,
      onConfigurePanGesture,
      style,
    }: {
      data: unknown[];
      renderItem: (info: { item: unknown; index: number }) => unknown;
      testID?: string;
      loop?: boolean;
      onSnapToItem?: (index: number) => void;
      onProgressChange?: (progress: number) => void;
      onConfigurePanGesture?: (gesture: unknown) => void;
      style?: unknown;
    }) =>
      createElement(
        View,
        { testID, loop, onSnapToItem, onProgressChange, onConfigurePanGesture, data, style },
        data.length > 0 ? renderItem({ item: data[0], index: 0 }) : null,
      ),
  };
});

/* ─────────────────────────────────────────────────────────────────────────────
 * 049 — `react-native-gesture-handler`의 공식 jest 설정.
 *
 * 홈 스트립의 주 넘기기(`Gesture.Pan`)를 `fireGestureHandler`로 쏘려면 네이티브
 * 모듈 목이 필요하다. **`package.json`의 `setupFiles`에 넣지 않는다** — ui
 * 프로젝트는 `jest-expo` 프리셋의 `setupFiles`(RN·expo 설정 둘)를 쓰는데, 그 키를
 * 적으면 프리셋 값이 통째로 **대체**되어 두 설정이 조용히 빠진다.
 * ───────────────────────────────────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- 목 등록 파일이라 부수 효과 import만 필요하다
require("react-native-gesture-handler/jestSetup");
