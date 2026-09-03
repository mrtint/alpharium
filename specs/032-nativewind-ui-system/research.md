# Research: NativeWind + React Native Reusables 기반 미니멀 UI 시스템

**Feature**: 032-nativewind-ui-system
**Date**: 2026-09-03
**Phase**: 0 (Outline & Research)

이 문서는 spec.md의 Clarifications가 이미 확정한 결정을 **구현 수준의 사실**로
내려, plan.md의 Technical Context에서 "NEEDS CLARIFICATION"이 하나도 남지 않게
한다. 각 항목은 Decision / Rationale / Alternatives 형식.

---

## R1. NativeWind 버전과 Expo 57 호환

**Decision**: NativeWind **v4.x**(`nativewind@^4`), 페어 의존성 `tailwindcss@^3.4`.
버전은 `npx expo install nativewind tailwindcss`로 해석하고 `npx expo install
--check`로 검증한다(`npm view` 금지 — AGENTS.md). NativeWind는 Expo가 관리하는
패키지가 아니므로 `expo install --check`가 이 항목 자체를 검사하진 않지만, Expo
57 + RN 0.86과의 조합은 실기기 첫 렌더로 확인한다(헌법 원칙 I의 `llama.rn`과
같은 계열의 주의).

**Rationale**:
- NativeWind v4는 babel 플러그인 + Metro 트랜스폼 + 런타임(`react-native-css-interop`)
  구조. v5는 프리릴리스라 배제.
- RN 0.86 / React 19.2는 NativeWind v4가 지원하는 범위. `tailwindcss` v3는 v4의
  안정 조합(tailwind v4는 별도 검증 필요, 이번엔 v3).

**⚠️ 정정 (2026-09-03 구현 중 실측)**: 이 항목은 원래 "새 네이티브 모듈 없음 →
release 재확인 불필요"로 결론냈으나 **틀렸다**. `nativewind@4.2.6` →
`react-native-css-interop@0.2.6`이 `react-native-reanimated@>=3.6.2`를
**peerDependency**(optional 아님)로 요구해 `npx expo install nativewind`가
`react-native-reanimated@4.6.0`(C++ 코드젠 네이티브 모듈)과 `react-native-worklets`를
함께 설치했다. 사용자 결정: NativeWind 유지 + reanimated 수용. **귀결: release
재확인 1회 필요**(spec FR-017 정정, BC9 정정). gesture-handler·edge-to-edge·
`@rn-primitives/*`는 여전히 배제(그건 컴포넌트 선택이지 NativeWind 요구가 아님).

**Alternatives considered**:
- **NativeWind v5(프리릴리스)**: 성능·API 개선이 있으나 프리릴리스라 회귀 위험.
  이 저장소는 안정 조합만 쓴다(헌법 「기술적 귀결」의 태도).
- **StyleSheet + 자체 토큰 객체만**: NativeWind 없이 `theme.ts` 상수 + `StyleSheet`
  팩토리로도 토큰화는 가능. 그러나 로드맵 11번이 "NativeWind + RN Reusables 도입"을
  과제로 명시했고, className 기반이 RN Reusables 컴포넌트 조립과 맞물린다.
  → 채택 안 함, 단 **토큰 계층 자체는 NativeWind와 독립인 `.ts` 상수로도 두어**
  logic 프로젝트에서 빠르게 검사 가능하게 한다(R6).

---

## R2. babel / metro 설정 도입 (현재 두 파일 다 없음)

**Decision**: 두 파일을 새로 만든다.

`babel.config.js`:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: ["nativewind/babel"],
  };
};
```

`metro.config.js`:
```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: "./global.css" });
```

`global.css` (저장소 루트):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`App.tsx` 최상단에 `import "./global.css";` 부수 효과 import 1줄 추가.

`tailwind.config.js` (저장소 루트):
```js
module.exports = {
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class", // ★ R3 참조 — "media"가 아니라 "class"로 고정
  theme: { extend: { /* R4의 알파리움 토큰 */ } },
};
```

**Rationale**:
- 현재 `babel.config.js`/`metro.config.js`가 없다 = Expo 기본값에 의존 중. NativeWind는
  둘 다 필수. `babel-preset-expo`를 명시 preset으로 옮기고 `jsxImportSource:
  "nativewind"`로 `className` prop이 모든 RN 코어 컴포넌트에 먹게 한다.
- `withNativeWind`에 `input`을 주면 `global.css`가 Metro 트랜스폼 파이프라인에
  들어간다.

**Alternatives considered**:
- **`nativewind/babel`만 넣고 `jsxImportSource` 생략**: v4에서는 `cssInterop`을
  컴포넌트마다 수동 등록해야 함. `jsxImportSource`가 코어 컴포넌트 일괄 지원이라
  1인 개발자 조립 방식(spec 배경)에 맞다.
- **`app.json`의 expo babel 설정으로**: Expo는 babel을 `app.json`으로 안 받는다.
  `babel.config.js`가 정답.

**⚠️ 함정 (plan/tasks에서 반영)**:
- **Metro는 gradle 빌드가 끝난 뒤 띄운다**(AGENTS.md) — 설정 파일 추가 후 첫
  실행은 `npx expo start --clear`로 캐시를 비운다("Loading from localhost:8081..."
  영구 정지 방지).
- `npx expo prebuild`가 필요한 변경은 아님(babel/metro/css는 JS 레이어). 단
  **`expo run:android`로 dev 빌드를 다시 만들 때 Metro 캐시 clear**는 한다.

---

## R3. 다크 모드 — NativeWind가 시스템 색 스킴을 따라가지 않게 고정

**Decision**: `tailwind.config.js`에 `darkMode: "class"`를 두고 **`dark:` variant를
한 번도 쓰지 않으며, `Appearance.setColorScheme`/`toggleColorScheme`를 절대 호출하지
않는다.** 팔레트는 라이트 값 하나만 정의한다(spec FR-003, FR-019).

031의 방어(`plugins/with-force-light-theme.js` = `AppTheme` 부모 `DayNight` →
`Light`, `expo-system-ui` = `MODE_NIGHT_NO`, `forceDarkAllowed=false`)는 **그대로
둔다** — 이 스펙이 건드리지 않는다.

**Rationale**:
- NativeWind v4의 다크 모드 기본값은 `media`이고, 그러면 런타임이 RN `Appearance`를
  읽어 OS 다크 설정에 따라 `dark:` 스타일을 적용한다. 우리는 `dark:` 클래스를
  아예 안 쓰므로 `media`여도 무해하지만, **`class`로 명시**하면 "이 앱은 색 스킴을
  런타임에 안 본다"가 설정에서 드러나고, 실수로 `dark:`를 넣어도 토글이 없어
  영구 라이트로 남는다(context7: `class`면 `setFlag`로 명시 토글해야만 바뀜).
- 031의 계약 테스트 `__tests__/ui/dark-mode-no-scheme.test.ts`는 **`src/ui/*.tsx`가
  `useColorScheme`/`Appearance.get|addChangeListener`를 쓰는지** 검사한다. NativeWind
  런타임의 `Appearance` 읽기는 `node_modules` 안이라 이 테스트에 안 걸린다. 단
  **우리 컴포넌트 코드(`src/ui/components/`)에서 `useColorScheme`을 import하지
  않도록** 계약 테스트를 확장한다(R7).

**Alternatives considered**:
- **진짜 다크 팔레트 대응**: spec Clarifications가 명시적으로 "라이트 고정 유지,
  다크는 후속 스펙"으로 확정. 031 assumption과도 일치.
- **`darkMode`를 아예 설정 안 함**: 기본 `media`. 위 이유로 `class` 명시가 낫다.

---

## R4. 알파리움 "따뜻하고 조용한 미니멀" 팔레트 방향

**Decision**: `tailwind.config.js`의 `theme.extend.colors`에 **의미론적 토큰**을
둔다(원시 색 팔레트가 아니라 역할 이름):

| 토큰 이름 | 역할 | 방향(최종 값은 실기기 관찰로 확정) |
|---|---|---|
| `bg` | 화면 배경 | 따뜻한 아이보리/오프화이트 (예: `#FBF8F3` 계열) |
| `surface` | 카드·행 배경 | 배경보다 살짝 밝거나 같은 톤 + 얇은 경계 |
| `border` | 구분선·경계 | 저채도 따뜻한 회갈색, hairline 두께 |
| `text` | 본문 글자 | 진한 웜 그레이/브라운블랙 — **배경 대비 4.5:1 이상 (WCAG AA)** |
| `text-muted` | 보조·캡션 | 중간 웜 그레이 — 큰 텍스트면 3:1, 본문 크기면 4.5:1 |
| `accent` | 주요 버튼·강조 | 절제된 테라코타/머스터드 계열 1색 (머티리얼 파랑 아님) |
| `accent-foreground` | accent 위 글자 | accent 대비 4.5:1 |
| `danger` | 삭제·되돌릴 수 없는 동작 | 차분한 벽돌색 |

간격 스케일: tailwind 기본 4px 그리드 유지(`p-2`=8, `p-4`=16 …). 모서리 반경
토큰: `rounded-card`(예 12), `rounded-pill`. 그림자: 안드로이드에서 과하지 않게
`elevation` 낮게(0~2) 또는 그림자 대신 `border`로.

**명암비 검증 방법**: 팔레트 값을 정한 뒤 `text`/`bg`, `accent-foreground`/`accent`,
`text-muted`/`surface` 쌍을 WCAG 대비 계산으로 확인(계산식은 코드나 quickstart에
남긴다 — 헌법 원칙 V "번역의 근거를 남긴다"). 실기기 SM-S928N에서 육안 확인은
SC-005.

**Rationale**:
- 헌법: 이 앱은 "정확한 기록 장치가 아니라 감상". 화면 톤도 조용하고 따뜻해야
  한다. 머티리얼 기본 파랑·순수 회색을 피하는 것이 spec FR-002.
- 의미론적 토큰이라야 SC-002("토큰 1개 바꾸면 전체 반영")가 성립하고, 다크
  팔레트를 나중에 같은 이름으로 얹을 수 있다(FR-003).

**Alternatives considered**:
- **원시 색 팔레트(`warm-50`~`warm-900`)만**: 화면이 `warm-100`을 직접 참조하면
  "배경"이라는 역할이 코드에서 안 보이고 다크 대응 시 전 화면 수정. → 역할
  토큰 채택.
- **여러 강조색**: 미니멀 톤과 충돌. 강조는 1색(+danger).

---

## R5. React Native Reusables — "라이브러리"가 아니라 복사 패턴

**Decision**: RN Reusables는 npm 단일 패키지가 아니라 **shadcn 스타일의 복사-소유
컴포넌트**다. 이번 스펙은 RN Reusables의 **디자인 관례(변형 있는 버튼, 카드, 텍스트
스타일)만 참고**해 `src/ui/components/`에 **직접 작성**한다. reanimated·gesture-handler·
`@rn-primitives/*` 네이티브 의존은 들이지 않고(spec FR-005), 필요한 상호작용은
RN 코어(`Pressable`·`Modal`·`Animated`)로 구현한다(025가 `react-native-pager-view`를
같은 이유로 배제한 선례).

만드는 컴포넌트(spec FR-004, Clarifications):
1. `Button` — `variant: "primary" | "secondary" | "danger"`, `Pressable` 기반
2. `Card` / `Section` — 카드·섹션 컨테이너
3. `ListRow` — 목록 행 (좌: 라벨, 우: 값/액션/chevron)
4. `SectionHeader` — 섹션 제목
5. `Text` 스타일 세트 — `Title` / `Body` / `Caption` (RN `Text` 래퍼 + className)
6. `Toggle` — 스위치 (RN 코어 `Switch` 래퍼, accent 색)
7. `SelectRow` — 값 선택 행 (일기 작성자·자동 생성 시각 — 옵션 목록에서 하나
   선택, 025/AuthorPicker/DayPicker의 기존 선택 UX 패턴 재사용)

**Rationale**:
- RN Reusables를 통째로 설치하면 reanimated가 딸려 온다(spec이 배제한 것). 관례만
  가져오면 네이티브 링크 0.
- 컴포넌트를 `src/ui/components/`에 소유하면 "알파리움 고유 커스텀을 코드 수준에서
  일괄 조정"(spec 배경)이 그대로 성립.

**Alternatives considered**:
- **`nativewindui`(별도 패키지)**: 컴포넌트 품질은 좋으나 reanimated·gesture-handler
  의존. 배제.
- **RN Paper 등 기성 UI 킷**: 머티리얼 톤이라 spec FR-002와 정면 충돌.

---

## R6. 디자인 토큰 코드의 물리적 위치와 jest 프로젝트

**Decision** (spec Clarifications 확정):
- **순수 값 상수** → `src/ui/theme/tokens.ts` (`.ts`). 색 역할 이름 → 값 매핑,
  간격·반경 상수, **WCAG 대비 계산 헬퍼**. `logic` 프로젝트가 검사(약 7초).
- **`tailwind.config.js`** → 저장소 루트. `tokens.ts`를 `require`해 단일 출처로
  삼는다(값을 두 번 쓰지 않는다 — 018의 `promptPrefix()` 바이트 동일성 교훈과
  같은 계열).
- **재사용 컴포넌트** → `src/ui/components/*.tsx`. `ui` 프로젝트가 검사.
- 새 최상위 경계(`src/design/`)를 만들지 않는다 — `checkSourceFile`이 이미
  `src/ui/`를 본다.

**Rationale**:
- `tokens.ts`가 `.ts`면 `jest-projects.test.ts`의 "화면 라이브러리 import하는
  스위트는 .tsx" 규칙과 무관(그건 테스트 파일 규칙). 토큰 테스트
  `__tests__/*.test.ts`가 `logic`에서 대비값·역할 존재를 잠근다.
- `tailwind.config.js`가 `tokens.ts`를 `require` → 한 곳에서 톤 조정(SC-002).

**Alternatives considered**:
- **토큰을 `tailwind.config.js`에만**: `logic` 프로젝트에서 못 읽고(설정 파일
  형태), 대비 계산 테스트를 붙이기 어렵다. → `tokens.ts` 단일 출처.
- **`.tsx`로**: 순수 값에 RN 런타임 불필요. `.ts`가 빠르다.

---

## R7. 헌법 검사(`checkSourceFile`) 확장

**Decision**: `scripts/constitution-rules.ts`의 `checkSourceFile`에 규칙을 **더하지
않아도 되는지 확인**하고, 필요한 최소만 추가한다:

- 기존 규칙(모델 자산·프롬프트·진단 축)은 그대로 유효 — NativeWind `className`은
  이 정규식들과 무관.
- **새 규칙(추가)**: `src/ui/` 아래에서 `useColorScheme`·`Appearance` import 금지를
  031의 `dark-mode-no-scheme.test.ts`가 `.tsx`만 본다 → `src/ui/theme/`·
  `src/ui/components/`의 `.ts`/`.tsx` 전부로 확장하거나, `checkSourceFile`에
  `UI_TOUCHES_COLOR_SCHEME` 정규식을 더한다. **둘 중 하나면 충분** — plan에서
  "계약 테스트 확장"으로 택한다(헌법 검사보다 테스트가 이 저장소 관례에 가까움,
  007 이후).
- **`className` 오탐 없음 확인**: `checkSourceFile`의 어떤 정규식도 `className=`,
  `bg-`, `text-` 등을 잡지 않는다(코드로 확인 — plan T에 포함).

**Rationale**:
- 헌법 원칙 III/IV 경계는 NativeWind 도입으로 바뀌지 않는다 — 화면이 여전히
  모델·프롬프트·지표에 안 닿는다.
- 색 스킴 감지 금지는 031이 세운 문이며, 11번은 그 문을 넓히지 않고 **컴포넌트
  계층까지 같은 문을 적용**한다.

**Alternatives considered**:
- **헌법 검사에 NativeWind 전용 규칙 다수 추가**: 과함. `className` 사용은 위반이
  아니라 이 스펙의 목적. 검사는 "색 스킴 감지"와 "기존 경계"만.

---

## R8. jest-expo + NativeWind 트랜스폼 상호작용 (기존 테스트 회귀 방지)

**Decision**:
- `babel.config.js`에 `nativewind/babel` 플러그인을 넣으면 **`ui` 프로젝트
  (`jest-expo` preset)와 `logic` 프로젝트(babel-jest + babel-preset-expo) 양쪽에
  적용**된다(둘 다 babel을 거침).
- 기존 `.tsx` 테스트는 `@testing-library/react-native`의 `render`를 쓰고 `className`을
  거의 안 쓰므로 **그대로 통과**해야 한다. NativeWind는 `className`이 없으면
  아무 것도 안 한다.
- **위험 A — `global.css` import 해석**: 테스트 환경에서 `import "./global.css"`가
  jest에서 깨질 수 있다. → `jest` 설정의 `moduleNameMapper`에 `\\.css$` →
  빈 모듈, 또는 `nativewind/jest-preset`을 `ui` 프로젝트에 얹는다. plan에서
  실제로 돌려 보고 최소 대응을 고른다(007·025의 "jest transform 함정"과 같은
  계열, tasks에 명시적 검증 태스크).
- **위험 B — `logic` 프로젝트의 `transformIgnorePatterns`**: 현재
  `node_modules/(?!(expo|expo-modules-core|@expo)/)`. NativeWind 런타임
  (`react-native-css-interop`, `nativewind`)이 `.ts` 테스트에서 import되면
  트랜스폼에서 빠져 `SyntaxError`. → **`logic` 테스트는 `src/ui/theme/tokens.ts`
  (순수 값)만 import하고 컴포넌트를 import하지 않게 유지**(R6의 분리가 이걸
  보장). 그래도 필요하면 `transformIgnorePatterns`에 `nativewind` 추가.
- **위험 C — `jest-projects.test.ts` 파일 수 가드**: 새 `.tsx` 컴포넌트 테스트가
  `ui`에, 새 `.ts` 토큰 테스트가 `logic`에 정확히 한 번씩 잡히는지 이 가드가
  자동 확인. 새 파일이 `testMatch`에 안 맞으면(예: `__tests__/components/`
  하위 폴더) 가드가 잡는다 — 기존 `__tests__/ui/`·`__tests__/` 평면 구조를
  따른다.

**Rationale**:
- 이 저장소는 "jest transform이 조용히 깨진다"를 007·024·025에서 반복해서
  당했다. NativeWind 도입은 트랜스폼 파이프라인을 건드리므로 **tasks에 회귀
  검증을 1급 태스크로** 둔다.

**Alternatives considered**:
- **`ui` 프로젝트만 NativeWind 트랜스폼**: babel 플러그인은 프로젝트별로 못
  나눔(babel.config.js는 전역). `logic`은 토큰 `.ts`만 보게 해서 회피.

---

## R9. edge-to-edge — 이번 스펙에서 손대지 않음 (재확인)

**Decision**: `react-native-edge-to-edge` 도입 없음. `SystemBars` 제어 없음.
현재 `android/gradle.properties`의 `edgeToEdgeEnabled=true` + `App.tsx`의
`SafeAreaProvider`/`SafeAreaView` 인셋 처리를 **유지만** 한다(spec FR-020).

**Rationale**:
- `react-native-edge-to-edge`는 네이티브 링크 = release 재확인 트리거(012).
  spec Clarifications가 "후속으로 분리"로 확정.
- 20번 로드맵의 "11번에서 함께"는 이 스펙에서 명시적으로 되돌렸다(spec 배경 +
  FR-020). 20번 후속 스펙에서 다룬다.

**Alternatives considered**:
- **`SystemBars`만 가볍게**: `react-native-edge-to-edge`가 제공하는 컴포넌트라
  결국 그 패키지를 깐다. 배제.

---

## R10. 점진 전환 순서와 "혼재" 중간 상태

**Decision** (2단계, spec Clarifications):
1. **1단계 — 기반**: `tokens.ts`, `tailwind.config.js`, `global.css`, babel/metro
   설정, `src/ui/components/*` 7종 + 각 `.tsx` 계약 테스트, `logic`의 토큰
   테스트. 이 단계는 화면을 안 바꾸므로 실기기 확인 불필요(기존 테스트 그대로
   통과 + 앱 첫 렌더만 확인).
2. **2단계 — 화면 이관** (한 화면씩, 각각 독립 커밋 가능):
   a. `DiaryListScreen` (219줄, 025 슬라이더 회귀 없음 — 상세와 짝)
   b. `DiaryDetailScreen` (494줄, 025 슬라이더·갤러리 + 017 사진 0장 표시 유지)
   c. `DiaryHomeScreen`의 생성 중 뷰 (`screen.kind === "writing"`, 진행률·글
      미표시 유지 — FR-011)
   d. `OnboardingScreen` (359줄) + 에셋 다운로드 단계(합산 진행률 유지 — FR-007)
   e. 설정 탭 조립 (`AutoDiarySettingsScreen` + `AuthorPicker` + `VisionPicker`
      + `GeocodingSettingToggle` + `PermissionsSection`) — `App.tsx`의
      `SettingsScreen`/`AutoDiarySection` 조립부 포함

각 화면 이관 시: 기능·문안·네비게이션 불변(FR-008), 그 화면의 기존 `.tsx`
테스트가 깨지지 않는지 확인(FR-015), 관련 Maestro 흐름이 깨지면 함께 갱신
(FR-018).

**"완료" 기준**: 위 a~e **전부** 이관된 시점(spec FR-013). 캐릭터 선택 화면
(`CharacterListScreen`)·개발자 탭(`DiagnosticsScreen`·`GenerationProbe`·
`SignalProbe`·`PromptPreviewPanel`)은 SHOULD(여유 되면), 완료 조건 아님.

**혼재 중간 상태**: 이관 안 된 화면은 기존 `StyleSheet`로 계속 동작(FR-012).
톤 차이가 사용자에게 보이는 것은 의도된 중간 상태(spec Edge Cases).

**Rationale**:
- 목록·상세를 먼저 하는 이유: 사용자가 매일 보는 화면 + 025 회귀 리스크가 가장
  커서 먼저 검증 사이클을 돌린다.
- 설정 탭을 마지막: 조립부(`App.tsx`)가 얽혀 있고 컴포넌트(Toggle·SelectRow)가
  1단계에서 다 나온 뒤라야 깔끔.

**Alternatives considered**:
- **전 화면 일괄 전환 (한 커밋)**: 025에서 큰 UI 변경이 회귀를 숨긴 전례. 한
  화면씩 = 각 커밋이 독립 검증 가능.
- **온보딩 먼저 (첫인상)**: 회귀 리스크는 목록·상세가 크다. 첫인상 개선은 US2(P2).

---

## R11. Maestro 흐름 영향

**Decision**: 다음 흐름이 화면 요소를 `id`/`testID`·문안으로 찾는다 — 이관 시
깨지면 **함께 갱신**하고, 새 흐름을 만들면 `scripts/run-device-tests.mjs`의
`FLOWS`에 등록한다(spec FR-018, AGENTS.md).

영향 가능성 높은 기존 흐름:
- `.maestro/diary-user-path.yml`, `.maestro/diary-body-screen.yml`,
  `.maestro/diary-photo-gallery.yml` (목록·상세)
- `.maestro/writing-flow-simplified.yml`, `.maestro/writing-monologue*.yml` (홈·생성 중)
- `.maestro/unified-permission-onboarding.yml` (온보딩)
- `.maestro/scheduled-diary-notification.yml` (설정 탭 진입 — 020·021·024가 stale
  버그를 반복해서 겪은 흐름)
- `.maestro/skeleton.yml` (탭 네비게이션 — 022가 stale 수정)

**대응 원칙**: `testID`는 유지하고 스타일만 바꾼다(FR-008). 025의 교훈 —
여러 텍스트 조각을 한 `<Text>`에 넣으면 `testID`가 자식에 전파 안 됨 →
`accessibilityLabel` 병행. 새 컴포넌트(`ListRow` 등)는 `testID` prop을 받게
설계.

**Rationale**: 이 저장소는 Maestro stale을 020·022·023·025에서 매번 겪었다.
이관마다 "그 화면의 Maestro 흐름을 돌린다"를 태스크에 못 박는다.

---

## 미해결 (plan에서 실측으로 답)

없음 — spec Clarifications가 5개 결정을 확정했고, 위 R1~R11이 구현 사실로 내렸다.
다만 **실행 중 검증**이 필요한 두 가지를 tasks에 1급 태스크로 둔다:
1. **R8 위험 A/B** — NativeWind 도입 후 `npm run test:ui`·`test:logic` 전체가
   그대로 통과하는지(트랜스폼·`global.css`·`transformIgnorePatterns`).
2. **R4** — 팔레트 값의 WCAG 대비가 4.5:1을 넘는지(계산 + SM-S928N 육안).
