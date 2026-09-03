---
description: "Task list for 032-nativewind-ui-system implementation"
---

# Tasks: NativeWind + React Native Reusables 기반 미니멀 UI 시스템 도입

**Input**: `specs/032-nativewind-ui-system/` — plan.md, spec.md, research.md,
data-model.md, contracts/{build-config,design-tokens,ui-components,screen-migration}.md,
quickstart.md

**Tests**: 포함한다. 헌법 「개발 방식」 MUST("계약을 먼저 정하고 테스트를 먼저
쓴다") + 이 저장소 관례(007 이후 계약 테스트가 소스 선언을 직접 읽는다).

**Organization**: 유저 스토리별 phase. US3(재사용 컴포넌트 계층)이 spec에서
P3이지만 US1·US2 화면 이관의 **전제**이므로 Foundational로 끌어올린다(research
R10: "1단계 기반 → 2단계 화면 이관"). spec 우선순위는 유지하되 의존 순서상
Phase 3 = 컴포넌트 계층, Phase 4 = US1 화면, Phase 5 = US2 화면.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일, 선행 태스크 없음 → 병렬 가능
- **[Story]**: US1 / US2 / US3 (setup·foundational·polish은 라벨 없음)
- 모든 태스크에 정확한 파일 경로

## Path Conventions

- 단일 RN/Expo 프로젝트. 화면 계층 `src/ui/`, 신규 `src/ui/theme/`·
  `src/ui/components/`, 빌드 설정 4파일은 저장소 루트, 테스트 `__tests__/`
  (`.ts`=logic / `.tsx`=ui 두 프로젝트).

---

## Phase 1: Setup (빌드/스타일 기반)

**Purpose**: NativeWind 설정 파일·의존성. 이후 모든 작업의 전제.

- [X] T001 `npx expo install nativewind tailwindcss` 실행 후 `npx expo install --check`로
      검증. `package.json` `dependencies`에 `nativewind`·`tailwindcss`만 추가됐고
      reanimated·gesture-handler·edge-to-edge·`@rn-primitives/*`는 없음을 확인
      (contracts/build-config.md BC9). `npm view` 사용 금지(AGENTS.md).
- [X] T002 [P] 저장소 루트에 `babel.config.js` 생성 — `presets: [["babel-preset-expo",
      { jsxImportSource: "nativewind" }]]`. **`nativewind/babel` 프리셋은 넣지
      않는다**(실측 2026-09-03): v4.2의 `nativewind/babel`은 `react-native-worklets/plugin`
      (reanimated 계열, spec FR-005가 배제)을 끌어들여 `logic`·`ui` 두 jest
      프로젝트가 전부 `[BABEL] .plugins is not a valid Plugin property`로 깨졌다.
      `jsxImportSource`만으로 `className` → style 변환이 동작하고 CSS 컴파일은
      `metro.config.js`의 `withNativeWind`가 맡는다 — 네이티브 링크 0 유지.
      (research.md R2·R8, contracts/build-config.md BC1)
- [X] T003 [P] 저장소 루트에 `metro.config.js` 생성 —
      `withNativeWind(getDefaultConfig(__dirname), { input: "./global.css" })`
      (research.md R2, contracts/build-config.md BC2).
- [X] T004 [P] 저장소 루트에 `global.css` 생성 — `@tailwind base; @tailwind
      components; @tailwind utilities;` 3줄 (contracts/build-config.md BC3).
- [X] T005 `App.tsx` 최상단 import 블록에 `import "./global.css";` 한 줄 추가
      (contracts/build-config.md BC4). 다른 변경 없음.
- [X] T006 저장소 루트에 `nativewind-env.d.ts` 생성(`/// <reference
      types="nativewind/types" />`)하고 TypeScript가 이 파일을 픽업하게 한다.
      **현재 `tsconfig.json`에 `include`가 없고 `extends: "expo/tsconfig.base"`가
      기본 범위를 제공하므로** `include`를 새로 쓰면 검사 범위가 좁아질 위험이
      있다 — `files: ["nativewind-env.d.ts"]`만 추가하거나, `include`를 쓰면
      `expo` 기본과 동일 범위(`**/*.ts`·`**/*.tsx`·`.expo/types/**/*.ts`·
      `expo-env.d.ts`)를 유지한다. T031에서 `tsc --noEmit`가 검사하는 파일 수가
      main 대비 줄지 않았는지 확인. (research.md R2)
- [X] T007 첫 렌더 스모크: `npx expo start --clear`로 Metro 캐시 비우고(설정 파일
      추가 후 필수 — AGENTS.md "Loading from localhost:8081 영구 정지" 방지) 앱이
      뜨는지, 기존 화면이 깨지지 않는지 확인(아직 이관 전이라 톤은 그대로).

**Checkpoint**: NativeWind 파이프라인 연결됨. 아직 화면 미변경.

---

## Phase 2: Foundational — 디자인 토큰 계층 (BLOCKING)

**Purpose**: `tokens.ts` 단일 출처 + `tailwind.config.js` 연결. 컴포넌트·화면
이관 전부의 전제. **⚠️ 이 phase 완료 전에는 컴포넌트/화면 작업 불가.**

- [X] T008 [P] `__tests__/theme-tokens.test.ts` 작성(먼저, FAIL 확인) — jest
      `logic`. 검사: `COLORS` 9키(`bg`·`surface`·`border`·`text`·`textMuted`·
      `accent`·`accentForeground`·`danger`·`dangerForeground`) 존재·hex 문자열·
      `readonly`(DT1); `RADIUS`·`TYPE` 구조(DT2); `contrastRatio` 순수 함수
      경계값(DT3); WCAG AA 쌍 6개 ≥ 목표(DT4); `tailwind.config.js` 색 키 ==
      `COLORS` 키(DT5); `COLORS_DARK`·색 스킴 분기 없음(DT6). (contracts/design-tokens.md)
- [X] T009 `src/ui/theme/tokens.ts` 생성 — `COLORS`(라이트 값만, `as const`),
      `RADIUS`, `TYPE`(시스템 서체 — `fontFamily` 없음), `contrastRatio(a,b)`
      순수 함수. 색 값은 data-model.md §1.1의 방향 예시에서 시작하되
      `contrastRatio`로 6쌍이 목표(text/bg·text/surface·textMuted/bg·
      accentForeground/accent·dangerForeground/danger ≥ 4.5, danger/bg ≥ 3.0)를
      넘도록 조정. **1패스로 확정 — 반복 미세조정 금지**(헌법 개발 방식).
- [X] T010 저장소 루트에 `tailwind.config.js` 생성 — `require("./src/ui/theme/tokens")`로
      `theme.extend.colors`/`borderRadius`/`fontSize` 구성(값 하드코딩 금지 —
      단일 출처, 018 교훈), `presets: [require("nativewind/preset")]`,
      `darkMode: "class"`, `content: ["./App.tsx", "./src/**/*.{ts,tsx}"]`
      (contracts/build-config.md BC5·BC6, contracts/design-tokens.md DT5).
- [X] T011 T008 재실행 — `npm run test:logic`에서 `theme-tokens.test.ts` 전부
      GREEN. 기존 logic 테스트 개수 이상 통과(회귀 0 — contracts/build-config.md BC8).
- [X] T012 위반 주입 검증: `tokens.ts`의 `COLORS`를 `let`으로 / `text`를 밝은
      회색으로 / `tailwind.config.js`에 하드코딩 hex 추가 — 각각 T008이 FAIL함을
      확인 후 되돌린다(007~014 관례).

**Checkpoint**: 토큰 계층 완성. 이제 컴포넌트/화면 작업 가능.

---

## Phase 3: User Story 3 — 재사용 컴포넌트 계층 (Priority: P3, 의존상 선행) 🎯

**Goal**: `src/ui/components/` 7종 컴포넌트 + NativeWind 트랜스폼 회귀 방어.
한 곳에서 톤 조정 → 전체 반영(SC-002)의 물리적 기반.

**Independent Test**: 토큰 1개 값을 바꾸면 그 토큰을 쓰는 컴포넌트가 전부 바뀐다.
`npm run test:ui`에서 7개 컴포넌트 계약 테스트 통과. `jest-projects.test.ts`
파일 수 가드 통과.

### Tests for US3 (먼저 작성, FAIL 확인) ⚠️

- [ ] T013 [P] [US3] `__tests__/nativewind-transform.test.tsx` 작성 —
      `className="bg-bg p-4"` 준 `<View>`가 예외 없이 렌더 + 스타일 적용
      (`toHaveStyle` 또는 `props.style`). (contracts/build-config.md BC7,
      research.md R8 위험 A)
- [ ] T014 [P] [US3] `__tests__/ui/button.test.tsx` 작성 — 3 변형(`primary`·
      `secondary`·`danger`) 렌더, `disabled` 시 press 무효, `children` 표시,
      `testID` 조회, hex 리터럴 0·`useColorScheme` 0·도메인 import 0
      (contracts/ui-components.md UC1·UC-C1·UC-C3·UC-C4).
- [ ] T015 [P] [US3] `__tests__/ui/card.test.tsx` 작성 — `Card`/`Section`
      `children` 렌더, `Section` `title` 유무별 헤더, `testID` (UC2).
- [ ] T016 [P] [US3] `__tests__/ui/list-row.test.tsx` 작성 — `label`/`value`
      표시, `onPress` 콜백, `right` 노드, `disabled` 무효, `testID` (UC3).
- [ ] T017 [P] [US3] `__tests__/ui/section-header.test.tsx` 작성 — 텍스트 표시,
      `testID` (UC4).
- [ ] T018 [P] [US3] `__tests__/ui/text-styles.test.tsx` 작성 — 4 변형 렌더,
      `numberOfLines`·`selectable`·`accessibilityLabel` 통과, `testID` (UC5).
- [ ] T019 [P] [US3] `__tests__/ui/toggle.test.tsx` 작성 — `value` 반영, 토글 시
      콜백 반대값, `disabled` 무효, `testID` (UC6).
- [ ] T020 [P] [US3] `__tests__/ui/select-row.test.tsx` 작성 — 옵션 렌더, 선택
      표식(+`accessibilityLabel`), `onSelect` index, `disabledIndices` 무효,
      `${testID}-option-${i}` (UC7).

### Implementation for US3

- [ ] T021 [P] [US3] `src/ui/components/Text.tsx` 생성 — `AppText` +
      `variant: "title"|"body"|"bodyStrong"|"caption"` (또는 별칭 export),
      `TYPE` 상수 + 색 토큰, RN `Text` 나머지 prop 통과. (UC5) *다른 컴포넌트가
      의존하므로 먼저.*
- [ ] T022 [P] [US3] `src/ui/components/Button.tsx` 생성 — `Pressable` 기반,
      `variant` 3종, `accessibilityRole`/`State`, 토큰 className만. (UC1)
- [ ] T023 [P] [US3] `src/ui/components/Card.tsx` 생성 — `Card` + `Section`
      (`title?` → `SectionHeader`). (UC2)
- [ ] T024 [P] [US3] `src/ui/components/SectionHeader.tsx` 생성 — `Text`
      (sectionTitle 타이포). (UC4)
- [ ] T025 [P] [US3] `src/ui/components/ListRow.tsx` 생성 — `onPress` 유무로
      `Pressable`/`View`, 좌 label·우 value/right/chevron, 하단 hairline. (UC3)
- [ ] T026 [P] [US3] `src/ui/components/Toggle.tsx` 생성 — RN `Switch` 래퍼,
      `trackColor`/`thumbColor` = accent/surface 토큰. (UC6)
- [ ] T027 [P] [US3] `src/ui/components/SelectRow.tsx` 생성 — 옵션별 `Pressable`,
      `accessibilityState`, 선택 표식 + `accessibilityLabel`(025 교훈),
      `disabledIndices`. (UC7)
- [ ] T028 [US3] T013~T020 재실행 — `npm run test:ui` 전부 GREEN. 기존 ui 테스트
      개수 이상 통과(회귀 0). `jest-projects.test.ts` 파일 수 가드 통과. (UC8, BC8)
- [ ] T028a [US3] SC-002 실증 — `tokens.ts`의 `COLORS.accent` 값을 임시로 다른
      hex로 바꾸고 `npm run test:ui`(스냅샷/`toHaveStyle`) 또는 컴포넌트 렌더
      결과에서 `Button` `primary`의 배경이 함께 바뀜을 확인 → 되돌린다. "한 곳
      바꾸면 전체 반영"을 코드로 증명. (spec SC-002)
- [ ] T029 [US3] `__tests__/ui/dark-mode-no-scheme.test.ts`(031) 확장 — 검사
      대상 glob에 `src/ui/theme/`·`src/ui/components/`의 `.ts`+`.tsx` 포함,
      `useColorScheme`·`Appearance.*` 0건 유지(contracts/build-config.md BC6,
      research.md R7). `npm run test:ui` GREEN.
- [ ] T030 [US3] 위반 주입 검증: `Button.tsx`에 `style={{ backgroundColor:
      "#B5623C" }}` → T014 FAIL; 아무 컴포넌트에 `import { useColorScheme }
      from "react-native"` → T029 FAIL; 컴포넌트 테스트 하나를 `.ts`로 → 파일 수
      가드/`render` 부재 FAIL. 각각 확인 후 되돌린다.
- [ ] T031 [US3] `npm run lint` GREEN — eslint + `tsc --noEmit`(nativewind-env.d.ts로
      `className` 인식) + `check:constitution`(위반 0, `className` 오탐 없음 —
      research.md R7) + prettier.

**Checkpoint**: 재사용 컴포넌트 계층 완성. SC-002(T028a로 실증)·SC-004 충족.
화면 이관 준비됨.

---

## Phase 4: User Story 1 — 매일 보는 화면이 조용하고 따뜻한 톤으로 (Priority: P1) 🎯 MVP

**Goal**: 일기 목록·상세·설정 탭이 새 디자인 토큰·재사용 컴포넌트 위로 전환.
표현만 바뀌고 기능·문안·네비게이션·`testID`·헌법 경계 불변.

**Independent Test**: 목록·상세·설정을 전환 전후로 비교 — 색·간격·타이포가 공유
토큰에서 나오고 화면마다 제각각이던 값이 사라짐. 각 화면의 기존 `.tsx` 테스트
초록. 다크 모드 켠 상태에서 라이트 고정 유지.

> 각 화면은 독립 커밋. 이관 순서: 목록 → 상세(025 회귀 리스크) → 설정 탭.

### US1-a: `DiaryListScreen` 이관 (contracts/screen-migration.md SM1)

- [ ] T032 [US1] `src/ui/DiaryListScreen.tsx` 이관 — `StyleSheet.create`/인라인
      `style`를 `className`(토큰 클래스) + 재사용 컴포넌트(`ListRow` for 일기
      항목, `Button` for "일기 쓰기", `AppText`)로 교체. **불변**: `onWrite`
      인자 없음, 사진 갈래 3문구(`"사진 N장"`/`"사진 없음"`/`"사진 모름"`),
      빈 상태 문구, `testID`(`denied-notices`·`day-<date>`), 날짜 `YYYY-MM-DD`,
      모델·지표 미노출, 고르는 자리 사진 갈래 미표시, `movedNotice`/`revertedFrom`
      문자열만. (SM1)
- [ ] T033 [US1] `npm run test:ui`에서 `__tests__/ui/diary-list.test.tsx` 전부
      GREEN(수정 없이 — FR-015). 원시 hex·`style={{` 잔존 0 확인
      (`grep -nE '#[0-9A-Fa-f]{6}|style=\{\{' src/ui/DiaryListScreen.tsx` →
      `hairlineWidth`/flex 관용값만).
- [ ] T034 [US1] Maestro: `.maestro/diary-user-path.yml`·`today-diary.yml`·
      `past-day-diary.yml`·`writing-flow-simplified.yml` 중 목록이 등장하는
      흐름을 실기기 1회. 깨지면 `testID` 유지 원칙으로 구현을 고침. 흐름이
      stale이면(014 이후) 흐름 갱신 + `FLOWS` 등록 확인. (SM1, FR-018)

### US1-b: `DiaryDetailScreen` 이관 (contracts/screen-migration.md SM2)

- [ ] T035 [US1] `src/ui/DiaryDetailScreen.tsx` 이관 — className + 재사용
      컴포넌트로 교체하되 **025 슬라이더·갤러리 구조는 건드리지 않는다**:
      `photo-slider-pager`/`photo-slider-cell-<i>`/`photo-slider-position`
      (`N / M` + `accessibilityLabel`), 갤러리 `Modal`(RN 코어)·`photo-gallery-*`·
      시작 인덱스·순환 없음·닫기 시 스크롤 유지, `resizeMode="contain"`.
      017: 사진 0장 → "사진: 없었다" + 슬라이더 없음, 사본 실패 →
      `diary-photo-missing` + "이 사진은 이제 없다", `diary-photo` testID 유지.
      제목·본문·"이 일기가 본 것" 절 문안 유지. 사후 소요시간 표기 규칙 불변
      (원칙 IV 1.2.0). (SM2)
- [ ] T036 [US1] `npm run test:ui`에서 `__tests__/ui/diary-detail.test.tsx`·
      `__tests__/ui/photo-gallery.test.tsx` 전부 GREEN(수정 없이). 원시 hex·
      `style={{` 잔존 0 확인.
- [ ] T037 [US1] Maestro: `.maestro/diary-body-screen.yml`·`diary-photo-gallery.yml`
      실기기 1회. 025 검증 특기(quickstart 시나리오 B 2b): `many-camera` 12장
      하루 → 슬라이더 `1 / 8` → 스와이프 `2 / 8`, 사진 탭 → 갤러리 그 인덱스
      시작, 마지막 순환 안 함, 닫기 시 스크롤 유지. 사진 0장 하루 → "사진:
      없었다". (SM2, SC-006)

### US1-c: 설정 탭 조립 이관 (contracts/screen-migration.md SM5)

- [ ] T038 [P] [US1] `src/ui/AuthorPicker.tsx` 이관 — `SelectRow` 재사용(또는
      className만). **불변**: persona 이름·소개·준비 여부만(원칙 III, `roster`·
      모델 식별자 미접촉), `author-picker`/`author-option-<i>` testID를 `SelectRow`
      `testID` prop으로 전달해 유지. (SM5)
- [ ] T039 [P] [US1] `src/ui/GeocodingSettingToggle.tsx` 이관 — `Toggle`(또는
      `SelectRow` 3-way면 `SelectRow`) 재사용. 기존 동작·`testID` 유지. (SM5)
- [ ] T040 [P] [US1] `src/ui/VisionPicker.tsx` 이관 — `SelectRow` 재사용. 4-way
      (자동/보지 않음/빠르게 봄/자세히 봄) 옵션·기존 `testID` 유지. (SM5)
- [ ] T041 [P] [US1] `src/ui/AutoDiarySettingsScreen.tsx` 이관 — `Card`/`Section`·
      `ListRow`·`SelectRow`(자동 생성 시각 0–23)·`Toggle`(enabled)로 교체.
      **불변**: 시각은 시 단위만, "정각"·"매일 7시" 정밀도 암시 문구 없음(020),
      기존 `testID`. (SM5)
- [ ] T042 [P] [US1] `src/ui/PermissionsSection.tsx` 이관 — `Card`/`ListRow`·
      `Button`(OS 링크)로 교체. **불변**: 5행 라이브 상태, OS 링크, `AppState`
      `change→active` 복귀 갱신(021 SC-006), 031이 뺀 `photo-location` 행 없음,
      기존 `testID`. (SM5)
- [ ] T043 [US1] `App.tsx`의 설정 탭 조립부(`SettingsScreen`/`AutoDiarySection`
      함수) + 탭바 스타일(`styles.tab`/`tabOn`/`tabOff`)을 className/토큰으로
      교체. **불변**: 탭 라벨("일기"/"설정"/"개발자")·`setTab` 동작, 개발자 탭
      노출 조건(`showsDiagnostics` — prod 없음), 흐름·탭 구조(029, FR-021).
      `global.css` import(T005)는 그대로. (SM5)
- [ ] T044 [US1] `npm run test:ui`에서 `auto-diary-settings-screen`·
      `permissions-section`·`author-picker`·`vision-picker`·
      `geocoding-setting-toggle` 테스트 전부 GREEN(수정 없이). 5개 파일 + App.tsx
      설정부에 원시 hex·`style={{` 잔존 0.
- [ ] T045 [US1] Maestro: `.maestro/scheduled-diary-notification.yml`(설정 탭
      진입 — 020·021·024 stale 반복 주의)·`skeleton.yml`(탭 네비 — 022 stale
      수정) 실기기 1회. (SM5, FR-018)

### US1 통합 검증

- [ ] T046 [US1] `npm run lint` GREEN(eslint + tsc + `check:constitution` 위반 0
      + prettier). `check:constitution`가 이관된 목록·상세·설정에서 모델·프롬프트·
      지표·색 스킴 위반 0.
- [ ] T047 [US1] SM-S928N debug 실기기 육안(quickstart 시나리오 B 4): 목록·상세·
      설정이 따뜻한 라이트 톤(오프화이트 배경, 절제된 강조색 — 머티리얼 파랑
      아님), 본문 대비 또렷. `adb shell "cmd uimode night yes"` → 세 화면 여전히
      라이트(dimmed·색 반전 0). 확인 후 `cmd uimode night no` 복원. **혼재 조기
      확인**: 캐릭터 선택 탭·개발자 탭(dev 빌드)을 한 번씩 열어 크래시·스타일
      누락 없음(미이관 화면이 MVP 시점에 정상 — SC-008, FR-012). (SC-005)

**Checkpoint**: US1 완료 — 매일 보는 3개 화면이 새 톤. MVP.

---

## Phase 5: User Story 2 — 온보딩과 생성 중 화면도 같은 톤 (Priority: P2)

**Goal**: 온보딩(권한 카드 + 에셋 다운로드)과 생성 중 화면 전환. 첫인상과 대기
순간까지 일관.

**Independent Test**: 앱을 새로 설치해 온보딩 진행 → 이어서 일기 생성 → 생성 중
화면. 두 화면이 핵심 화면군과 같은 토큰을 쓰고, 온보딩 단계 구성·문안과 생성 중
표시 규칙(진행률·글 미표시)이 전환 전과 같음.

### US2-a: `DiaryHomeScreen` 생성 중 뷰 이관 (contracts/screen-migration.md SM3)

- [ ] T048 [US2] `src/ui/DiaryHomeScreen.tsx`에서 **`screen.kind === "writing"`
      JSX 블록과 그 블록이 참조하는 `StyleSheet` 엔트리만** 이관 —
      className/토큰 + `AppText`·`Button`("그만두기"). `DiaryHomeScreen`이 렌더하는
      `DiaryListScreen`(US1-a T032에서 이미 이관)·`DayPicker` 등 자식은 건드리지
      않는다. **불변**: 진행률 숫자·경과 시간·생성 중인 글 **없음**(005 FR-028b,
      015·016), 회전 표시(`ActivityIndicator` — 진행률 파라미터 없음) +
      "그만두기"만, 홈 흐름·탭 구조·"일기 쓰기 1탭" 불변(029, FR-021). (SM3, FR-011)
- [ ] T049 [US2] `npm run test:ui`에서 `__tests__/ui/diary-home.test.tsx`·
      `diary-home-notification.test.tsx`(+ 015·016 계약 테스트 있으면) 전부
      GREEN(수정 없이). writing 뷰 소스에 원시 hex·`style={{` 잔존 0.
      **029 홈 흐름 회귀 확인**: `diary-home.test.tsx`의 "홈에 위젯 4개가 없다"·
      "일기 쓰기 1탭" 관련 단언이 GREEN(위젯 미복원), `writing-flow-simplified.yml`
      통과. (spec FR-021)
- [ ] T050 [US2] Maestro: `.maestro/writing-monologue.yml`·
      `writing-monologue-expansion.yml`·`writing-flow-simplified.yml`·
      `generate-diary.yml` 실기기 1회. (SM3, FR-018)

### US2-b: `OnboardingScreen` + 에셋 단계 이관 (contracts/screen-migration.md SM4)

- [ ] T051 [US2] `src/ui/OnboardingScreen.tsx` 이관 — `Card`/`Section`·`Button`
      (`[허용]`/`[건너뛰기]`/`[시작하기]`)·`AppText` + 진행률 표시(에셋 단계)
      className/토큰. **불변**: 권한 단계 순서·문안·건너뛰기 가능성(021·031),
      031이 뺀 `photo-location` 단계 없음, 단계 `testID`(`onboarding-step-*`),
      에셋 다운로드 **합산 진행률 하나**·항목별 나열 없음·완료 전 `[시작하기]`
      비활성·건너뛰기 없음(029), 뒤로 가기 없음, 완료 시 `onboarding.json`
      `completed: true`. (SM4)
- [ ] T052 [US2] `npm run test:ui`에서 `onboarding-screen.test.tsx`·
      `onboarding-complete-gate.test.tsx`·`denied-guidance.test.tsx` 전부
      GREEN(수정 없이). 소스에 원시 hex·`style={{` 잔존 0.
- [ ] T053 [US2] Maestro: `.maestro/unified-permission-onboarding.yml` 실기기 1회
      (⚠️ `pm clear`로 앱 데이터 날림 — 이 흐름을 US2-a·US1 실기기 검증보다
      **나중에** 돌리거나 모델 재배치 준비. 024 §7 교훈). (SM4, FR-018)

### US2 통합 검증

- [ ] T054 [US2] `npm run lint` GREEN. `check:constitution` 위반 0(생성 중 뷰가
      지표·글 미노출, 온보딩이 모델 식별자 미노출).
- [ ] T055 [US2] SM-S928N debug 실기기 육안: `pm clear` 후 새 온보딩 → 권한
      카드 새 톤·단계 순서·문안 그대로·에셋 다운로드 합산 진행률 하나·완료 전
      "시작하기" 비활성. "일기 쓰기" → 생성 중 화면에 진행률 숫자·경과 시간·글
      조각 **없음**(2회 관측). 다크 모드 켠 상태 라이트 고정. (SC-005, SC-007)

**Checkpoint**: US1 + US2 완료 — 핵심 화면군 5개 전부 전환.

---

## Phase 6: Polish & 완료 게이트 (contracts/screen-migration.md SM6)

**Purpose**: 전체 회귀·혼재 상태·완료 게이트 검증.

- [ ] T056 혼재 상태 확인(quickstart 시나리오 C): 이관된 5개 화면과 미이관 화면
      (`CharacterListScreen`, 개발자 탭 `DiagnosticsScreen`·`GenerationProbe`·
      `SignalProbe`·`PromptPreviewPanel`)을 오가며 크래시·스타일 누락 없음.
      (SC-008, FR-012)
- [ ] T057 [P] 전체 테스트 게이트: `npm run test:logic` + `npm run test:ui` +
      `npm run lint` 전부 GREEN. `jest-projects.test.ts` 파일 수 가드 통과.
      이전(main) 대비 테스트 개수 증가(회귀 0). (contracts/build-config.md BC8)
- [ ] T058 [P] `git diff main -- package.json` — 추가 dependency가 `nativewind`·
      `tailwindcss`뿐. 새 네이티브 모듈 0 → release 재확인 생략(012 기준).
      (contracts/build-config.md BC9, FR-017)
- [ ] T059 SM-S928N debug 실기기 완료 게이트(quickstart 시나리오 D): 5개 화면군
      라이트 톤 + 다크 모드 켠 상태 라이트 고정 + 025 슬라이더·갤러리 회귀 없음
      + 생성 중 뷰 진행률·글 미표시 + WCAG 대비 육안 OK. SM1~SM5 관련 Maestro
      흐름 전부 통과(갱신 포함). (SM6, SC-001·SC-005·SC-006·SC-007·SC-009)
- [ ] T060 [P] SHOULD(여유 되면, 완료 조건 아님): `CharacterListScreen` 이관 —
      className/토큰 + 재사용 컴포넌트. 기존 `character-list.test.tsx` GREEN 유지.
      개발자 탭 화면은 이관하지 않는다(배포 빌드에서 닿을 수 없음 — 원칙 III).
- [ ] T061 PR 생성 — `032-nativewind-ui-system` → `main`. 커밋 메시지 한국어
      (헌법 개발 방식). `.githooks`가 main 직접 커밋을 막음. spec.md
      Success Criteria·quickstart 시나리오 D 체크리스트를 PR 본문에 첨부.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 의존 없음. 즉시 시작. T001 → (T002·T003·T004 [P]) → T005 →
  T006 → T007.
- **Phase 2 (Foundational — 토큰)**: Phase 1 완료 후. **모든 이후 작업 BLOCK.**
  T008 → T009 → T010 → T011 → T012.
- **Phase 3 (US3 — 컴포넌트)**: Phase 2 완료 후. T013~T020 [P] → T021 먼저(Text)
  → T022~T027 [P] → T028 → T028a → T029 → T030 → T031.
- **Phase 4 (US1 — 매일 보는 화면)**: Phase 3 완료 후. US1-a(T032~T034) →
  US1-b(T035~T037) → US1-c(T038~T042 [P], T043, T044~T045) → T046 → T047.
- **Phase 5 (US2 — 온보딩·생성 중)**: Phase 3 완료 후(Phase 4와 병렬 가능하나
  실기기 검증은 T053 `pm clear` 순서 주의). US2-a(T048~T050) → US2-b(T051~T053)
  → T054 → T055.
- **Phase 6 (Polish)**: Phase 4·5 완료 후. T056 → T057·T058 [P] → T059 →
  T060 [P, 선택] → T061.

### User Story Dependencies

- **US3 (P3, 선행)**: Phase 2 후 시작. 다른 스토리에 의존 없음. US1·US2의 전제.
- **US1 (P1)**: US3(컴포넌트) 완료 후. US2와 독립(각자 다른 화면).
- **US2 (P2)**: US3 완료 후. US1과 독립. 단 실기기 검증 T053(`pm clear`)은 US1
  실기기 검증 뒤 또는 모델 재배치 후.

### Within Each Story

- 테스트 먼저(FAIL 확인) → 구현 → 테스트 GREEN → 위반 주입 검증 → lint.
- `Text.tsx`(T021)가 다른 컴포넌트보다 먼저(의존).
- 화면 이관: 각 화면 = [이관 → 기존 테스트 GREEN → Maestro] 3태스크 묶음.

### Parallel Opportunities

- T002·T003·T004 (설정 파일 3개, 서로 다른 파일).
- T013~T020 (컴포넌트 테스트 8개, 서로 다른 파일).
- T022~T027 (컴포넌트 구현 6개 — T021 이후, 서로 다른 파일).
- T038~T042 (설정 탭 5개 파일 이관, 서로 다른 파일 — App.tsx T043은 이후).
- T057·T058, T060 (Polish 병렬).
- **US1 화면 이관(Phase 4)과 US2 화면 이관(Phase 5)**은 서로 다른 화면 파일이라
  개발 병렬 가능(실기기 검증만 순서 조율).

---

## Parallel Example: Phase 3 (US3 컴포넌트)

```bash
# 테스트 먼저 (전부 병렬):
Task: "T013 __tests__/nativewind-transform.test.tsx"
Task: "T014 __tests__/ui/button.test.tsx"
Task: "T015 __tests__/ui/card.test.tsx"
Task: "T016 __tests__/ui/list-row.test.tsx"
Task: "T017 __tests__/ui/section-header.test.tsx"
Task: "T018 __tests__/ui/text-styles.test.tsx"
Task: "T019 __tests__/ui/toggle.test.tsx"
Task: "T020 __tests__/ui/select-row.test.tsx"

# Text.tsx (T021) 먼저 — 나머지가 의존.
# 그 다음 구현 병렬:
Task: "T022 src/ui/components/Button.tsx"
Task: "T023 src/ui/components/Card.tsx"
Task: "T024 src/ui/components/SectionHeader.tsx"
Task: "T025 src/ui/components/ListRow.tsx"
Task: "T026 src/ui/components/Toggle.tsx"
Task: "T027 src/ui/components/SelectRow.tsx"
```

---

## Implementation Strategy

### MVP (US1까지)

1. Phase 1 (Setup) — NativeWind 파이프라인.
2. Phase 2 (Foundational) — 토큰 계층. **BLOCK 해제.**
3. Phase 3 (US3) — 재사용 컴포넌트 7종.
4. Phase 4 (US1) — 목록·상세·설정 이관.
5. **STOP & VALIDATE**: T047 SM-S928N 육안. 매일 보는 화면이 새 톤이면 MVP 데모
   가능(핵심 화면군 3/5).

### Incremental Delivery

1. Setup + Foundational + US3 → 컴포넌트 계층 완성(SC-002·SC-004).
2. + US1 → 목록·상세·설정 전환 → 실기기 검증 → 데모 (MVP).
3. + US2 → 온보딩·생성 중 전환 → 실기기 검증 → 핵심 5개군 완료.
4. Phase 6 → 혼재·회귀·완료 게이트 → PR.

### 스펙 "완료" 기준 (SM6, quickstart 시나리오 D)

- SM1~SM5 5개 화면군 전부 이관(원시 hex·매직 px 0).
- `test:logic`·`test:ui`·`lint` 전부 GREEN, 파일 수 가드 통과, 회귀 0.
- SM1~SM5 Maestro 흐름 전부 통과.
- SM-S928N debug: 라이트 톤 + 다크 고정 + 025 회귀 없음 + 생성 중 미노출 + 대비 OK.
- 새 네이티브 모듈 0 → release 재확인 생략.
- 미이관 화면 정상 동작(혼재 허용).
- PR 머지(main 직접 금지).

---

## Notes

- **[P]** = 다른 파일, 의존 없음. 같은 파일(App.tsx T043, 여러 화면) 동시 편집
  금지.
- 이관 태스크는 **표현만** 바꾼다 — 기능·문안·`testID`·네비게이션 불변. 그 화면의
  기존 `.tsx` 테스트가 **수정 없이** 통과해야 한다(FR-015, SM 공통 원칙).
- 테스트 FAIL 먼저 확인(TDD — 헌법 MUST). 위반 주입으로 방어 검증(007~014 관례).
- 태스크 또는 논리 묶음마다 커밋(한국어 메시지).
- 각 화면 이관 = 독립 커밋 → 회귀가 한 화면에 국한.
- 새 Maestro 흐름을 만들면 `scripts/run-device-tests.mjs`의 `FLOWS`에 등록
  (AGENTS.md — 미등록 시 초록불인데 미검증).
- `git branch --show-current`로 브랜치 눈 확인(022 사고 — `BRANCH:` 필드는 스펙
  디렉터리 이름).
- Metro 설정 변경 후 첫 실행은 `npx expo start --clear`(AGENTS.md).
- 미확인으로 남길 수 있는 것: 회전 시 동작(`orientation: "portrait"` 고정 —
  016·025 계열), iOS 표시(Android 전용 검증).
