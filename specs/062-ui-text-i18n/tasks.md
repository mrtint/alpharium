---

description: "062 화면 문구의 다국어 구조 — 태스크"
---

# Tasks: 화면 문구의 다국어 구조 — 카탈로그와 기기 언어 해석

**Input**: Design documents from `specs/062-ui-text-i18n/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/i18n.md, quickstart.md

**Tests**: 헌법 「개발 방식」이 계약 → 테스트 먼저를 요구한다. 각 단계의 테스트 태스크는 구현보다 먼저 쓰고 실패를 확인한다(골든 G1·G2는 예외 — 지금 코드에 대해 초록으로 시작해 이관 내내 초록이어야 한다).

**Organization**: 사용자 이야기별. US1(한국어 불변)·US2(기본 언어 폴백)·US4(프롬프트 불변)가 P1, US3(언어 하나 추가 시연)가 P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일이고 앞 태스크에 의존하지 않아 함께 돌릴 수 있다
- 계약 번호(L·D·C·K·B·G·X·V)는 [contracts/i18n.md](contracts/i18n.md)

---

## Phase 1: Setup

- [X] T001 `git branch --show-current`가 `062-ui-text-i18n`인지 눈으로 확인하고, `npx expo install expo-localization`으로 의존성을 더한다(버전은 손으로 적지 않는다). `package.json`·`package-lock.json` 변경만 있는지 `git diff --stat`으로 본다. config plugin은 `app.json`에 넣지 않는다(Clarification Q2, research R1)
- [X] T002 [P] `npx expo install --check`가 통과하는지 확인한다

---

## Phase 2: Foundational (모든 이야기의 전제)

**Purpose**: 이관 전 골든을 잡고, 감지 → 해석 → 카탈로그 선택 통로와 빈 한국어 카탈로그 뼈대를 세운다. **이 단계가 끝나기 전에는 문구를 옮기지 않는다.**

### 골든 — 이관 전 상태를 먼저 기록 (G1·G2, FR-020)

- [X] T003 리터럴 추출 함수를 `__tests__/i18n/ko-literals.ts`에 쓴다: 주석을 걷고(`.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")`) 한글이 든 문자열·템플릿·JSX 텍스트를 뽑아 템플릿의 `${…}`를 `${}`로 바꾸고 정렬한 배열을 돌려준다(research R9). 대상 파일 목록은 research R5 「화면 문구」 갈래(`src/ui/home-text.ts`·`settings-text.ts`·`developer-text.ts`, `src/app/diagnostics-text.ts`·`diagnostics-view.ts`·`failure-toast.ts`·`target-hour.ts`·`skipped-line.ts`, `src/diary/monologue.ts`, `src/onboarding/requirements.ts`, `src/schedule/notification-text.ts`·`notification-port.ts`, `src/ui/*.tsx` 중 한글 리터럴이 있는 파일, `App.tsx`)를 상수로 둔다. **python으로 쓰지 않는다**(CRLF·`\b` 함정)
- [X] T004 T003의 추출을 지금 코드에 돌려 `__tests__/i18n/ko-literals.golden.json`을 만들고, 만든 파일을 다시 읽어 항목을 하나씩 본다. 화면 문구가 아닌 오탐(JSX 안 비교식·주석 조각 등 — research R5 실측 수에 섞여 있다)은 추출 함수를 고쳐 빼고, 남은 항목이 전부 실제 화면 문구인지 확인한 뒤 파일별 개수를 골든 머리에 적는다
- [X] T005 이관 전 함수 출력 골든 `__tests__/i18n/ko-outputs.golden.json`을 만든다: `home-text.ts`의 요일·`monthText`·`dayOfMonthText`·상태 줄 함수, `target-hour.ts`의 시각·미리보기·시간대 줄, `skipped-line.ts`, `notification-text.ts`(받침 있는 이름·없는 이름·한글 아닌 이름), `monologue.ts`의 선택 함수(고정 시드·단계별), `requirements.ts`의 `ifDenied` 넷, `diagnostics-view.ts`의 칸·실패 줄 조립, `settings-text.ts`·`developer-text.ts`·`diagnostics-text.ts`의 함수 항목을 대표 입력으로 불러 `{ "호출 설명": "결과" }`로 저장한다
- [X] T006 `__tests__/i18n/ko-golden.test.ts`를 쓴다: (G1) T003 추출 결과 == `ko-literals.golden.json`, (G2) 각 골든 항목을 지금 함수로 다시 불러 바이트 동일. **이 시점에 초록이어야 한다** — 이후 이관 태스크마다 이 테스트의 「지금 함수」 대응표만 카탈로그 쪽으로 옮긴다

### 통로 — 계약 테스트 먼저 (L·D·C·K)

- [X] T007 [P] `__tests__/i18n/resolve.test.ts` — L1~L5 (contracts 예시 여섯 줄 그대로, 가짜 목록 `["ko","xx"]` 포함, L5는 소스에서 `new Date`·`Date.now`·모듈 `let` 0건)
- [X] T008 [P] `__tests__/i18n/locale-port.test.ts` — D1(소스: 최상단 `import … "expo-localization"` 0건, 함수 안 `require` 1건), D2(`jest.mock`으로 `getLocales`가 던짐·`[]`·`[{languageTag:""}]`·배열 아님 → `null`), D3(순서·원문 유지)
- [X] T009 [P] `__tests__/i18n/current.test.ts` — C1(감지 함수를 한 번만 부름 — `jest.isolateModules` + 목 호출 수), C2(`Object.is(text(), text())`), C3(소스: `AppState` 0건)
- [X] T010 [P] `__tests__/i18n/catalog-shape.test.ts` — K1(소스: `catalogs/ko/`에 `as const` 0건 — 튜플 타입 주석은 허용), K4(카탈로그 함수가 대표 입력에 던지지 않는다), `DEFAULT_LANGUAGE ∈ SUPPORTED_LANGUAGES`, B4(제품 `SUPPORTED_LANGUAGES`가 정확히 `["ko"]`)
- [X] T011 `src/i18n/languages.ts` — `export type Language = "ko"`, `SUPPORTED_LANGUAGES: readonly Language[] = ["ko"]`, `DEFAULT_LANGUAGE: Language = "ko"` (data-model 「Language」)
- [X] T012 `src/i18n/resolve.ts` — `resolveLanguage(detected, supported, fallback): LanguageResolution` (`{ detected, chosen, matched }`, data-model). T007 초록
- [X] T013 `src/i18n/locale-port.ts` — `readDeviceLocales(): readonly string[] | null`, 호출 시점 `require("expo-localization")` try/catch, 빈 태그 거름, 빈 결과는 `null`(빈 배열을 돌려주지 않는다). T008 초록
- [X] T014 `src/i18n/catalogs/ko/index.ts`(빈 영역 객체 뼈대) · `src/i18n/catalogs/index.ts`(`export type Catalog = typeof ko`, `CATALOGS: Readonly<Record<Language, Catalog>>`) · `src/i18n/current.ts`(`text()`·`languageResolution()`, 첫 호출에서 한 번 결정·캐시). T009·T010 초록
- [X] T015 `npm run test:logic`·`npx tsc --noEmit` 통과 확인(G1·G2 포함 초록)

**Checkpoint**: 통로가 서고 골든이 지금 코드를 잠갔다. 문구 이관을 시작할 수 있다.

---

## Phase 3: User Story 1 — 한국어 사용자는 아무것도 달라진 것을 느끼지 않는다 (P1) 🎯 MVP

**Goal**: 화면 문구 전부를 `src/i18n/catalogs/ko/`로 옮기고 화면·알림이 `text()`를 거친다. 한국어 출력은 바이트 동일.

**Independent Test**: `__tests__/i18n/ko-golden.test.ts`(G1·G2)와 기존 화면·원문 대조 테스트가 기대값 무수정으로 초록.

**영역마다 지키는 규칙** (모든 T016~T026에 적용):
(a) 원래 상수·함수 이름을 키로 쓴다(`SETTINGS_TEXT.autoWrite` → `text().settings.autoWrite`, data-model). 이름 없이 화면 파일에 박혀 있던 리터럴은 그 뜻으로 새 키를 짓는다(예: `home.needsAuthor`). (a′) **리터럴 이관**(한글 리터럴이 있는 파일)과 **참조 교체**(문구 모음을 import만 하던 소비자 파일 — 한글 리터럴 없음)를 구분해 둘 다 한다. (b) 판정 로직은 제자리에 두고 결과를 카탈로그 함수 인자로 준다(K4). (c) 화면 모듈은 `text()`를 렌더·함수 안에서 부르고 모듈 최상단에서 평가하지 않는다(C4). (d) 그 영역을 참조하는 기존 테스트는 **import 경로·접근식만** 바꾸고 기대 문자열은 고치지 않는다(G4 — 각 태스크 끝에 `git diff -U0 __tests__ | grep '^[-+].*[가-힣]'`로 기대 문자열 줄 변경이 없는지 본다). (e) T006의 G2 대응표를 그 영역의 카탈로그 함수로 옮기고 G1·G2가 초록인지 본다. (f) 영역 끝마다 `npm run test:logic`·`npm run test:ui`·`npx tsc --noEmit`.

- [X] T016 [US1] **calendar 영역** — `src/i18n/catalogs/ko/calendar.ts`: 요일 긴·짧은 표(`readonly [string, string, string, string, string, string, string]` 튜플 타입), `monthText(year, month)`, `dayOfMonthText(date)`. `src/ui/home-text.ts`의 `WEEKDAY_LONG`·`WEEKDAY_SHORT`·`monthText`·`dayOfMonthText`와 `DateJumpDialog.tsx`·`DayPicker.tsx`의 같은 표기가 이것을 쓰게 한다. 날짜·시각 표기를 `Intl`로 바꾸지 않는다(research R11)
- [X] T017 [US1] **home 영역** — `src/i18n/catalogs/ko/home.ts`: `src/ui/home-text.ts`의 나머지 문구·조립 함수(조사를 품은 문장은 카탈로그 함수 안에서 `particleFor` 등을 부른다, FR-005), `src/app/failure-toast.ts`의 `FAILED`·`TOAST_TEXT` 류, `src/ui/DiaryHomeScreen.tsx`의 `toFailed("일기 작성자를 준비해야 한다")`·「…을(를) 쓸 수 없어」 안내, 리터럴 이관: `DiaryListScreen.tsx`. 참조 교체: `home-text.ts`·`failure-toast.ts`를 import하던 `WritingPaper.tsx`·`WrittenDayPaper.tsx`·`MaterialGrid.tsx`·`MaterialDialogs.tsx`·`OverwriteConfirmDialog.tsx`·`FailureToast.tsx`·`PhotoCarousel.tsx` 등(`grep -rln "home-text|failure-toast" src App.tsx`로 목록을 확정한다). `home-text.ts`는 카탈로그를 가리키는 판정 없는 조립만 남기거나 비면 지운다
- [X] T018 [US1] **문구로 분기하는 코드 제거**(research R8, B5) — 먼저 `__tests__/app/state.test.ts` 등 `toFailed`·`AppScreen` `failed` 모양을 잠그는 기존 계약을 읽는다. `DiaryHomeScreen.tsx`의 `/준비/.test(screen.message)`를 값 비교(`screen.message === text().home.needsAuthor` 또는 기존 계약이 허용하면 `redownload` 표식)로 바꾼다. `src/`·`App.tsx`에서 한글 피연산자의 `.test(`·`includes(`·`===`·`startsWith(`를 세어 같은 방식으로 바꾼다
- [X] T019 [US1] **settings 영역** — `src/i18n/catalogs/ko/settings.ts`: `src/ui/settings-text.ts`(`SETTINGS_TEXT`), `src/app/skipped-line.ts`의 `SKIPPED_LINE` 틀, `src/app/target-hour.ts`의 「오후 10시쯤」·미리보기·시간대 줄 문장 틀(시각 계산·`CITY_NAMES` 표의 판정은 제자리, 도시 이름 표는 화면 문구라 카탈로그), 참조 교체: `settings-text.ts`·`skipped-line.ts`·`target-hour.ts`를 import하던 `SettingsScreen.tsx`·`SettingsFrame.tsx`·`RenameScreen.tsx`·`TargetHourDialog.tsx`·`PlaceNameDialog.tsx`·`WipeConfirmDialog.tsx`·`RedownloadConfirmDialog.tsx` 등(grep으로 확정). `src/app/`이 `src/ui/`를 import하지 않는 관례(056)는 그대로다 — 둘 다 `src/i18n/`을 본다
- [X] T020 [US1] **onboarding·welcome·download 영역** — `src/i18n/catalogs/ko/onboarding.ts`·`welcome.ts`·`download.ts`: 리터럴 이관: `OnboardingScreen.tsx`·`WelcomeScreen.tsx`·`LogoScreen.tsx`·`DownloadProgressScreen.tsx`·`DownloadConsentDialog.tsx`의 상수·리터럴, 참조 교체: `BuildErrorScreen.tsx` 등 이 영역 문구를 쓰는 소비자, `src/onboarding/requirements.ts`의 화면 문구(`ifDenied` 넷 등 — 요구 목록의 키·순서·판정은 제자리, 문구만 `text().onboarding` 참조). 「홈 캡션·온보딩·설정이 같은 값을 본다」(048)가 유지되는지 `__tests__/ui/denied-guidance.test.tsx`로 본다. `src/welcome/liveness.ts`의 `LIVENESS_INPUT`은 모델 입력이라 옮기지 않는다(research R5)
- [X] T021 [US1] **monologue 영역** — `src/i18n/catalogs/ko/monologue.ts`: `src/diary/monologue.ts`의 후보 표(`AtLeast10` 타입 유지 — 다른 언어가 개수를 줄이면 tsc가 잡는다). 선택 로직은 `monologue.ts`에 남고 후보는 `text().monologue`에서 읽는다. `checkMonologueFile`(roster·persona·`Character` 금지)의 대상에 `src/i18n/catalogs/ko/monologue.ts`를 더한다(`scripts/constitution-rules.ts`)
- [X] T022 [US1] **notification 영역(헤드리스)** — `src/i18n/catalogs/ko/notification.ts`: 완성 알림 제목 함수 `autoWriteDone(name, month, date)`(조사 포함), 채널 이름 「일기 완성 알림」. `src/schedule/notification-text.ts`·`notification-port.ts`가 `text().notification`을 쓴다(C5). `scripts/constitution-rules.ts`의 `SCHEDULE_TOUCHES_PRODUCT_LAYER`가 `src/i18n` import를 막지 않는지 확인한다
- [X] T023 [US1] **developer 영역** — `src/i18n/catalogs/ko/developer.ts`: `src/ui/developer-text.ts`(`DEVELOPER_TEXT`) 리터럴 이관, 그것을 쓰던 `DeveloperScreen.tsx`·`DeveloperToast.tsx`·`App.tsx` 참조 교체(Clarification Q4 — 개발 화면도 옮긴다)
- [X] T024 [US1] **diagnostics 영역** — `src/i18n/catalogs/ko/diagnostics.ts`: `src/app/diagnostics-text.ts`(`DIAGNOSTICS_TEXT`), `src/app/diagnostics-view.ts`의 「n장」·「n장 (일부)」·「n곳」·실패 시각 「M월 d일 HH:MM」 조립, `DiagnosticsParts.tsx`의 리터럴 이관, `DiagnosticsScreen.tsx`·`App.tsx`의 참조 교체. `DIAGNOSTICS_HIDES_AXES` 규칙 대상에 `src/i18n/catalogs/ko/diagnostics.ts`를 더한다(research R12)
- [X] T025 [US1] `src/app/failure-text.ts`를 지운다(research R5 — import하는 곳 0). 지우기 전 `grep -rn "failure-text\|describeFailure\|describeStage\|describeGenerationReason" src App.tsx __tests__`로 다시 확인하고, 지운 뒤 `npx tsc --noEmit` 0. `failure-toast.ts`의 그 이름을 부르는 주석을 고친다. 이 파일이 T003 골든 대상 목록에 애초에 없음을 확인하고, `ko-golden.test.ts` 머리 주석의 「명시 차이」에 「삭제: failure-text.ts — 죽은 코드, 화면에 닿지 않음」을 적는다
- [X] T026 [US1] `App.tsx`와 그 밖에 남은 화면 한글 리터럴을 옮긴다 — T003 추출을 `src/`·`App.tsx` 전체에 돌려 research R5의 「모델 입력」·「내부 값」 파일 밖에 남은 것이 0인지 본다
- [X] T027 [US1] G1을 전환한다 — `ko-golden.test.ts`의 G1이 대상 파일 대신 `src/i18n/catalogs/ko/`에서 추출한 다중집합을 골든과 비교하게 하고, 다중집합 차이는 새 진단 언어 줄(T034)만 허용한다

**Checkpoint**: 한국어 화면 문구가 전부 카탈로그에서 오고 G1·G2·기존 테스트가 기대값 무수정으로 초록.

---

## Phase 4: User Story 2 — 기기 언어가 지원 목록에 없어도 기본 언어로 온전히 보인다 (P1)

**Goal**: 영어·읽기 실패·지역 변형에서 한국어로 떨어지고, 감지한 것과 고른 것이 구분되며, 헤드리스도 같은 해석을 탄다.

**Independent Test**: 해석 테스트(L)와 헤드리스 알림 테스트, 진단 언어 줄(V)이 초록 + quickstart §2 실기기.

- [X] T028 [P] [US2] `__tests__/i18n/fallback.test.ts` — `jest.mock`으로 `locale-port`가 `["en-US"]`·`null`·`["ko-KR"]`·`["KO"]`을 돌려줄 때 `languageResolution()`이 `{ chosen: "ko", matched: false/false/true/true, detected: 입력 그대로 }`(SC-006). 각 경우 `jest.isolateModules`로 새로 불러 C1 캐시와 섞이지 않게 한다
- [X] T029 [P] [US2] `__tests__/schedule/notification-locale.test.ts` — 감지가 `["en-US"]`일 때 헤드리스 경로(`runAutoDiaryTask`가 부르는 알림 제목 조립)가 한국어 골든 결과와 같다(FR-010, US2-4). 화면 쪽 상태(React)를 거치지 않음을 소스로 확인(`src/schedule/`이 `src/ui/` import 0)
- [X] T030 [P] [US2] `__tests__/app/diagnostics-language.test.ts` — V1: `languageLine({ detected: ["en-US","ko-KR"], chosen: "ko", matched: true })` → 「en-US → 한국어」, `detected: null` → 「모름 → 한국어」(첫 태그만 보인다). V2: 문자열 조립은 `src/app/diagnostics-view.ts`에 있고 `DiagnosticsParts.tsx`는 문자열만 받는다(소스)
- [X] T031 [US2] `src/i18n/catalogs/ko/diagnostics.ts`에 라벨 「언어」·「모름」·`languageName: Record<Language, string>`(`ko` → 「한국어」)을 더하고, `src/app/diagnostics-view.ts`에 `languageLine(resolution)`을 둔다
- [X] T032 [US2] 진단 「환경」 묶음에 언어 줄을 그린다 — `App.tsx`의 `DiagnosticsLayer`가 `languageResolution()`을 읽어 `languageLine()` 결과를 `DiagnosticsScreen`에 넘기고, `DiagnosticsScreen.tsx`/`DiagnosticsParts.tsx`가 기존 환경 줄과 같은 모양으로 그린다. `__tests__/ui/` 진단 화면 테스트에 줄이 보이는지 한 줄 단언을 더한다
- [X] T033 [US2] T028~T030 초록, `npm test` 통과
- [X] T034 [US2] T027의 G1 차이 목록에 진단 언어 줄 문구(「언어」·「모름」·「한국어」)를 「새로 더함 — FR-011b」로 적는다

**Checkpoint**: 폴백·헤드리스·진단 표시가 기기 없이 검증됐다.

---

## Phase 5: User Story 4 — 일기를 쓰는 모델의 입력은 그대로다 (P1)

**Goal**: 화면 언어가 프롬프트·생성 경로로 새지 않고, 061 테스트가 무수정 통과한다.

**Independent Test**: `git diff main -- __tests__/diary/prompt-e2sn.test.ts __tests__/diary/prompt.test.ts` 0줄 + 두 테스트 초록 + X2.

- [X] T035 [P] [US4] `__tests__/i18n/boundaries.test.ts`에 B2를 쓴다 — `src/diary/prompt.ts`·`src/diary/pipeline.ts`·`src/inference/`·`src/signals/`·`src/vision/`이 `src/i18n/`을 import하지 않는다(소스, 주석 걷고)
- [X] T036 [US4] 같은 파일에 B3를 쓴다 — `src/ui/`·`src/app/`·`App.tsx`가 신호 값의 `.reason`, 준비 상태(`models/readiness`·`vision/readiness`)의 reason, pipeline `stop()` detail을 화면 문구로 그리지 않는다(research R5의 grep 근거를 소스 검사로 옮긴다)
- [X] T037 [US4] `npx jest __tests__/diary/prompt-e2sn.test.ts __tests__/diary/prompt.test.ts __tests__/diary/prompt-signature.test.ts`가 초록이고, 두 061 파일의 `git diff main` 이 0줄임을 확인한다(G3, SC-002)

**Checkpoint**: 프롬프트 경계가 소스로 잠겼다.

---

## Phase 6: User Story 3 — 개발자는 언어 하나를 파일 하나와 목록 한 줄로 더한다 (P2)

**Goal**: 테스트 전용 가짜 카탈로그로 감지 → 해석 → 선택 → 표시를 통과시키고, 키 누락을 tsc가 잡는 것을 보인다.

**Independent Test**: X1~X3 초록 + `catalog-types.ts`의 `@ts-expect-error`가 `npm run lint`(tsc)에서 성립.

- [X] T038 [P] [US3] `__tests__/i18n/fixtures/xx.ts` — `export const xx = { ...ko, home: { ...ko.home, <항목 하나>: "[xx] …" } } satisfies Catalog`(테스트 전용, 제품 `src/`에 두지 않는다)
- [X] T039 [P] [US3] `__tests__/i18n/catalog-types.ts` — K2: `xx`에서 항목 하나를 뺀 객체에 `// @ts-expect-error` + `satisfies Catalog`, 함수 인자 모양을 바꾼 객체에 같은 방식. K3: `Record<"ko" | "xx", Catalog>`에 `xx`가 빠지면 `@ts-expect-error`. 이 파일이 `tsconfig`의 검사 대상에 들어가는지 `npx tsc --noEmit --listFiles | grep catalog-types`로 확인한다
- [X] T040 [US3] `__tests__/i18n/add-language.test.tsx` — X1: `jest.mock`으로 `src/i18n/languages`(`["ko","xx"]`)·`src/i18n/catalogs/index`(`{ ko, xx }`)·`src/i18n/locale-port`(`["xx-YY"]`)를 바꾸고 `jest.isolateModules`로 `languageResolution().chosen === "xx"`, 홈 화면을 렌더해 T038에서 바꾼 항목이 `[xx]` 문구로 보인다. X2: 같은 상태에서 `buildPrompt()`(대표 신호)가 목 없이 만든 결과와 바이트 동일(US4-2). X3: 이 테스트가 `jest.mock`으로 바꾸는 제품 모듈이 그 셋뿐임을 소스로 확인한다
- [X] T041 [US3] T038~T040 초록, `npm run lint` 통과(K2·K3 포함)

**Checkpoint**: 「언어 하나 = 카탈로그 하나 + 목록 한 줄」이 테스트로 시연됐다(SC-005).

---

## Phase 7: Polish & 경계 잠금

- [X] T042 `scripts/constitution-rules.ts`에 규칙을 더하고 `__tests__/scripts/check-constitution.test.ts`에 각 규칙의 위반·통과 사례를 더한다: B1(화면 한글은 `src/i18n/catalogs/` 밖에서 금지, 허용 목록 = research R5 「모델 입력」·「내부 값」 파일 + `persona.ts`(R6) — 항목마다 이유 한 줄), K5(`src/i18n/`의 금지 import), K6(`src/ui/`·`src/app/`·`src/schedule/`·`src/onboarding/`·`App.tsx`의 `diary/particle` import 금지), D4(`expo-localization` import는 `src/i18n/locale-port.ts`만)
- [X] T043 `__tests__/i18n/boundaries.test.ts`에 허용 목록·규칙이 가리키는 경로가 모두 존재함을 단언한다(060 CC3 교훈). 이관으로 사라진 경로를 가리키던 기존 규칙(`DIAGNOSTICS_HIDES_AXES`·`UI_TOUCHES_PROMPT`·`checkMonologueFile` 대상 등)을 새 경로로 갱신했는지 본다(research R12)
- [X] T044 `__tests__/i18n/boundaries.test.ts`에 B5를 쓴다 — `src/`·`App.tsx`(주석 걷고)에서 한글이 든 피연산자를 가진 `.test(`·`includes(`·`===`·`!==`·`startsWith(`가 0건(T018이 없앤 것이 되살아나지 않는다). 같은 파일에 C4를 쓴다 — `src/ui/`·`src/app/`·`src/schedule/`·`src/onboarding/`·`src/diary/monologue.ts`·`App.tsx`의 모듈 최상단(들여쓰기 0)에서 `text()`를 평가하는 선언이 0건. 같은 파일에 B6을 쓴다 — `DiaryEntry`와 `preferences/` 파일 타입(research R13 목록)의 필드 이름 목록을 소스에서 읽어 기대 목록과 같음을 단언한다
- [X] T045 위반 주입(quickstart §1 표 일곱 줄)을 하나씩 해 보고 각각 기대한 검사가 실패하는지, 치환이 실제로 적용됐는지 먼저 단언한 뒤 되돌린다. 되돌린 뒤 원래 문자열이 돌아왔는지 다시 grep한다(058 교훈)
- [X] T046 `npm test`·`npm run lint` 전부 통과(SC-008). FR-019 확인: 이번 변경의 새 파일 목록(`git diff --name-status main`)에 번역·문구 품질을 채점·비교하는 코드가 없다(골든은 바이트 동일 대조뿐)
- [X] T047 dev 실기기(SM-S901N) — quickstart §2의 1~5를 돈다: prebuild `--clean` 뒤 `dumpsys package`의 권한 목록 비교, 한국어 기기 화면·진단 「ko-KR → 한국어」, 영어 기기(앱 재진입 전후 `pidof`로 프로세스 재시작 여부 기록)·진단 「en-US → 한국어」, 영어 기기에서 백그라운드 완성 알림 제목·채널 이름, 기기 언어 원복. `pm clear`를 하지 않는다. 결과를 `specs/062-ui-text-i18n/quickstart.md` 「실기기 결과」에, 못 본 것을 「미확인 잔여」에(release 포함) 적는다(SC-007)
- [X] T048 `AGENTS.md`에 062 결론을 남긴다 — 「기능별 핵심 결론」에 062 절(카탈로그 자리·`text()` 규칙·모델 입력 경계·문구 분기 금지·실기기 관측), 「저장소의 현재 상태」에 한 줄, 「코드를 어디에 두는가」에 `src/i18n/`. 화면 원문 대조 테스트의 참조점이 카탈로그로 옮겨졌다는 사실을 「테스트 작성의 함정」 또는 047 절에 한 줄로

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2**: 의존성 설치 뒤 통로를 세운다. **T003~T006(골든)은 어떤 이관보다 먼저다** — 이관이 시작된 뒤에 잡은 골든은 「이전」을 기록하지 못한다.
- **Phase 2 → Phase 3(US1)**: `text()`가 있어야 이관할 수 있다.
- **US1 영역 순서**: T016(calendar)이 T017(home)·T019(settings)보다 먼저(요일·월 표기를 함께 쓴다). T018은 T017 뒤. T020~T024는 T016 뒤라면 서로 독립(다른 파일)이나, 같은 공용 화면 파일을 건드리면 순서대로 한다. T025·T026·T027은 영역 이관이 끝난 뒤.
- **US2**: T028(해석)은 Phase 2 뒤 언제든. T029는 T022 뒤. T030~T032는 T024 뒤. T034는 T027 뒤.
- **US4**: T035·T036은 Phase 3 뒤(이관이 끝나야 경계가 의미 있다). T037은 언제든 다시 돌린다.
- **US3**: Phase 3 뒤(가짜 카탈로그가 `ko`를 펼치므로 카탈로그가 차 있어야 한다).
- **Polish**: 모든 이야기 뒤. T047(실기기)은 T046 뒤.

## Parallel Opportunities

- Phase 2: T007·T008·T009·T010(테스트 네 파일) 함께.
- US2: T028·T029·T030 함께(서로 다른 테스트 파일).
- US4: T035는 US3의 T038·T039와 함께 쓸 수 있다(T036은 같은 파일이라 T035 뒤).
- US3: T038·T039 함께.

```text
# Phase 2 계약 테스트를 함께 쓴다
T007 __tests__/i18n/resolve.test.ts
T008 __tests__/i18n/locale-port.test.ts
T009 __tests__/i18n/current.test.ts
T010 __tests__/i18n/catalog-shape.test.ts
```

## Implementation Strategy

- **MVP = Phase 1 + 2 + US1**: 한국어 화면이 카탈로그에서 오고 바이트 동일. 이 상태로도 「언어 하나 추가」의 구조는 성립한다.
- 이어서 US2(폴백·진단 표시) → US4(프롬프트 경계) → US3(시연) → Polish(헌법 검사·위반 주입·실기기·AGENTS).
- **반쯤 옮긴 상태를 머지하지 않는다**(브레인스토밍 결정) — 한 PR로 끝낸다.

## Phase 8: Convergence

- [X] T049 data-model.md 「Catalog」 영역 표에 구현에서 나눈 영역(`frame`·`skippedLine`·`targetHour`·`diagnosticsLanguage`)과 그 이유(G2 골든의 `JSON.stringify` 키 집합 보존)를 더한다 per plan: data-model 「Catalog」 (partial)
