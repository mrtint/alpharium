# Contract: 빌드 설정 + 다크 고정 (BC)

**Feature**: 032-nativewind-ui-system
NativeWind 도입에 필요한 babel/metro/tailwind/css 설정과, 031의 라이트 고정을
NativeWind 레이어에서도 지키는 계약. 계약 테스트는 소스/설정 파일을
`readFileSync`로 직접 읽어 잠근다(007 이후 이 저장소 관례).

---

## BC1 — `babel.config.js` 존재하고 NativeWind 플러그인을 싣는다

- 파일이 저장소 루트에 존재한다.
- `presets`에 `babel-preset-expo`가 있고 `{ jsxImportSource: "nativewind" }` 옵션을
  준다.
- `plugins`에 `"nativewind/babel"`이 있다.
- **위반 주입**: `jsxImportSource`를 빼면 → `className`이 코어 컴포넌트에 안 먹어
  이관 화면이 스타일 없이 렌더(BC7이 잡음).

## BC2 — `metro.config.js` 존재하고 `withNativeWind`로 감싼다

- 파일이 저장소 루트에 존재한다.
- `getDefaultConfig(__dirname)` 결과를 `withNativeWind(config, { input: "./global.css" })`로
  감싸 export한다.
- **위반 주입**: `input` 경로를 틀리면 → tailwind base가 안 실려 리셋 스타일 누락.

## BC3 — `global.css` 존재하고 3개 지시문을 싣는다

- 파일이 저장소 루트에 존재한다.
- `@tailwind base;` `@tailwind components;` `@tailwind utilities;` 세 줄을 포함한다.

## BC4 — `App.tsx`가 `global.css`를 부수 효과 import 한다

- `App.tsx` 상단에 `import "./global.css";`(또는 상대 경로) 한 줄이 있다.
- **위반 주입**: 이 줄을 지우면 → 런타임에 스타일 미적용.

## BC5 — `tailwind.config.js`가 `tokens.ts`를 단일 출처로 쓴다

- 파일이 저장소 루트에 존재한다.
- `require("./src/ui/theme/tokens")`(또는 상대 경로)로 토큰을 가져온다.
- `theme.extend.colors`의 키 집합 == `tokens.ts`의 `COLORS` 키 집합 (정확히 일치).
- `presets`에 `require("nativewind/preset")`가 있다.
- **위반 주입**: `colors`에 `tokens.ts`에 없는 키를 추가하거나 하드코딩 hex를
  넣으면 → BC5 FAIL (값 이중 정의 금지 — 018 교훈).

## BC6 — 다크 모드가 `class`이고 `dark:` variant를 아무도 안 쓴다

- `tailwind.config.js`에 `darkMode: "class"`가 있다 (`"media"` 아님).
- `src/ui/**/*.{ts,tsx}`와 `App.tsx`에 `dark:` prefix className이 **0건**.
- `src/ui/theme/`·`src/ui/components/`의 `.ts`+`.tsx`에 `useColorScheme`·
  `Appearance.getColorScheme`·`Appearance.setColorScheme`·`toggleColorScheme`·
  `Appearance.addChangeListener` **0건** (031 `dark-mode-no-scheme.test.ts` 확장).
- **위반 주입**: 아무 컴포넌트에 `className="dark:bg-black"` → BC6 FAIL.
  `import { useColorScheme } from "react-native"` → BC6 FAIL.
- **근거**: spec FR-019, 031 라이트 고정. NativeWind가 OS 색 스킴을 따라가면
  존재하지 않는 다크 팔레트로 분기해 화면이 깨진다.

## BC7 — NativeWind 트랜스폼 회귀 없음 (실행 검증, 2026-09-03 정정)

`__tests__/nativewind-transform.test.tsx` (jest `ui`):

- `className`을 준 `<View>`·`<Text>`(단일·다중·style 혼재)가 **예외 없이
  렌더된다**.
- **`toHaveStyle`로 tailwind 클래스가 style로 변환됐는지는 검사하지 않는다** —
  NativeWind의 className→style은 Metro 번들 시점 CSS 컴파일이라 jest(jest-expo)엔
  없다. `nativewind/test`를 쓰면 되지만 그 모듈이 `transformIgnorePatterns` 밖이라
  jest-expo에서 SyntaxError로 깨진다(실측). 031 `dark-mode-no-scheme.test.ts`가
  이미 쓰는 방식(소스 레벨 + 렌더 안전성)을 따른다.
- 실제 스타일 적용은 **실기기 육안**으로 본다(SC-005, T047/T059).
- **위반 주입**: `babel.config.js`에서 `jsxImportSource: "nativewind"`를 빼면
  `className` prop이 코어 컴포넌트 타입에서 사라져 `tsc`가 FAIL(간접) — 또는
  babel 트랜스폼 자체가 깨지면 이 테스트가 렌더 단계에서 FAIL.
- **근거**: research R8 위험 A(정정). jest transform이 조용히 깨지는 것을
  007·024·025에서 반복해 당했으므로 "렌더는 된다"만이라도 잠근다.

## BC8 — 기존 테스트 전체 회귀 없음 (실행 검증, 게이트)

NativeWind·설정 파일 도입 직후:

- `npm run test:logic` 전부 통과 (이전 개수 이상).
- `npm run test:ui` 전부 통과 (이전 개수 이상).
- `npm run lint` 통과 (eslint + `tsc --noEmit` + `check:constitution` + prettier).
- `jest-projects.test.ts` 파일 수 가드 통과.
- **대응 지점** (research R8): `global.css` import가 jest에서 깨지면
  `moduleNameMapper`(`\\.css$` → 빈 모듈) 또는 `nativewind` jest 프리셋 최소
  적용. `logic`의 `transformIgnorePatterns`에 `nativewind` 추가가 필요하면 한다
  (단 `logic` 테스트는 `tokens.ts`만 import하고 컴포넌트를 import하지 않게 유지 —
  R6 분리가 이걸 보장).

## BC9 — 네이티브 모듈 경계 (게이트, 2026-09-03 정정)

- `package.json` `dependencies`에 추가된 것은 `nativewind`, `tailwindcss`뿐이다.
- **단, `nativewind@4.2` → `react-native-css-interop@0.2.6`이 `react-native-reanimated`를
  peerDependency로 요구**해 `npx expo install nativewind`가 `react-native-reanimated@4.6.0`
  (+ `react-native-worklets`)을 함께 설치한다. 이는 NativeWind 자체의 요구이며
  사용자가 수용을 결정했다(2026-09-03).
- `react-native-gesture-handler`, `react-native-edge-to-edge`, `@rn-primitives/*`는
  **여전히 추가 안 됨**.
- **근거**: spec FR-005(정정)·FR-017(정정). reanimated가 들어오므로 **release
  재확인 1회 필요**(012 기준) — debug 5개 화면군 확인 + release 빌드 1회
  (`llama.rn` 로드·첫 렌더·prod 환경).
- 검증: `git diff main -- package.json`으로 추가 dependency 확인,
  `npm ls react-native-gesture-handler react-native-edge-to-edge`가 "empty"인지.
