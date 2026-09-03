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

## BC7 — NativeWind 트랜스폼 회귀 없음 (실행 검증)

`__tests__/nativewind-transform.test.tsx` (jest `ui`):

- `className="bg-bg p-4"` 를 준 `<View>`가 예외 없이 렌더된다.
- 렌더 결과에 스타일이 실제로 적용된다(배경색 또는 padding이 `style`에 반영 —
  `toHaveStyle` 또는 `props.style` 검사).
- **위반 주입**: babel 플러그인 미설정 상태로 이 테스트를 돌리면 FAIL.
- **근거**: research R8 위험 A. 이 저장소는 jest transform이 조용히 깨지는 것을
  007·024·025에서 반복해 당했다.

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

## BC9 — 새 네이티브 모듈 0개 (게이트)

- `package.json` `dependencies`에 추가된 것은 `nativewind`, `tailwindcss`
  (+ 이들의 순수 JS 전이 의존)뿐이다.
- `react-native-reanimated`, `react-native-gesture-handler`,
  `react-native-edge-to-edge`, `@rn-primitives/*` **추가 안 됨**.
- `android/` prebuild 산출물에 새 네이티브 모듈 링크 없음 (`expo prebuild` 불필요 —
  변경이 JS 레이어).
- **근거**: spec FR-005·FR-017, 012 기준. 이 게이트가 참이면 release 재확인
  불필요 = debug 1회로 충분.
