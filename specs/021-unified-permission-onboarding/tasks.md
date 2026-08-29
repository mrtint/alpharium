# Tasks: 앱 요구 권한 실측 및 통합 신청 절차

> **진행 상태(2026-08-29, `/speckit-implement`)**: 33/37 완료.
> **끝난 것** — Phase 1~5의 코드·테스트 전부, Phase 7의 위반 주입(T033)·
> 문안 리뷰(T034)·전체 GREEN(T035)·AGENTS.md(T036). `src/onboarding/`
> (`requirements`·`decision`·`flag`·`flag-port`·`location-permission-port`·
> `os-settings-port`), `src/ui/OnboardingScreen.tsx`·`PermissionsSection.tsx`,
> App.tsx 진입 게이트·`deniedNotices` 배선, 020 `settings.ts`·
> `settings-effects.ts`에서 `batteryExceptionPrompted` 제거,
> `NotificationPort.getPermission()` 추가, `checkOnboardingFile` 헌법 규칙,
> `.maestro/unified-permission-onboarding.yml`(FLOWS 등록). 기기 없는
> 테스트 1853개(+8 스위트)·lint·헌법 검사·prettier 전부 클린.
> **남은 것** — 실기기 검증 4개(T030·T031·T032·T037). 전부 Android 실기기가
> 필요하다(사람 수행). T030·T031이 research 미결 둘(위치 권한 안드로이드
> 영향, Android 14 `limited` 여부)을 확정한다 — 코드 구조는 두 결과를
> 모두 수용하도록 잡혀 있고 데이터/분기만 바뀐다.

**Input**: Design documents from `/specs/021-unified-permission-onboarding/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/(×5),
quickstart.md — 모두 존재함

**Tests**: **포함한다.** 헌법 「개발 방식」이 "계약을 먼저 정하고 테스트를 먼저 쓴다"를
MUST로 요구하고, 이 저장소는 007·009·012·020 이래 **소스 선언을 `readFileSync`로 직접
읽는 계약 테스트**를 관례로 굳혔다. 온보딩 판정(`decision`·`flag`·`requirements`)은 전부
순수 함수로 설계됐으므로 기기 없이 검증 가능하다. 실기기로만 증명되는 항목(권한이 실제로
붙었는가, OS 설정 화면이 열렸는가)은 quickstart.md 수행으로 대체한다.

**Organization**: spec.md의 User Story 1(P1, 통합 온보딩) → User Story 2(P1, 거부·부분
허용 정직한 대응) → User Story 3(P2, 재요청 경로). US1·US2는 spec에서 **둘 다 P1**이며
MVP는 **US1 + US2**로 본다. US3(P2)는 설정 "권한" 섹션이며 US1·US2 없이도 독립 가치가
있으나 우선순위가 낮다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능(다른 파일, 완료되지 않은 작업에 의존하지 않음)
- **[Story]**: 어느 사용자 스토리에 속하는가(US1, US2, US3)
- 파일 경로를 정확히 포함한다

## Path Conventions

단일 프로젝트(plan.md 「Structure Decision」). 온보딩의 순수 판정은 신규 디렉터리
`src/onboarding/`에 모으고 기기 통로(`*-port.ts`)만 얇게 둔다. 화면은 `src/ui/`. 020
파일(`src/schedule/settings.ts`·`settings-effects.ts`)은 최소 표면으로 수정한다. App.tsx는
진입 게이트 하나를 얹는다.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: `src/onboarding/` 디렉터리 준비, 헌법 검사 규칙 추가, Maestro 흐름 등록.
**신규 의존성 없음**(plan.md — 기존 `expo-*`만 재사용).

- [X] T001 `src/onboarding/` 디렉터리를 만든다. 빈 `index.ts`는 두지 않는다(각 파일을
  직접 import). `.gitkeep` 불필요 — T003부터 파일이 들어온다.
- [X] T002 `scripts/constitution-rules.ts`에 `checkOnboardingFile`을 추가한다
  (research.md §8, plan.md Constitution Check). `checkScheduleFile`과 동형:
  - 대상 `src/onboarding/` 아래 `.ts`.
  - `ONBOARDING_TOUCHES_PRODUCT_LAYER` = `/\bfrom\s+["'][^"']*(?:models\/roster|diary\/prompt|diary\/acceptance|schedule\/settings)["']|\b(?:backend|adapter|engine)\s*\.\s*generate\s*\(/`
    — `onboarding/`이 로스터·프롬프트·판정·`schedule/settings`에 닿는 것을 막는다.
  - `FLAG_GROWS_HISTORY` = `/\b(Date|timestamp|history|attemptCount|lastRun|count)\b/`
    — **`src/onboarding/flag.ts`에만** 적용(파일명으로 게이트). 주석 제외 후 코드에
    이 토큰이 있으면 위반(원칙 IV, data-model.md §3).
- [X] T003 [P] `scripts/check-constitution.mts`의 `checkSourceFiles()` 안
  `.tsx?` 분기에 `violations.push(...checkOnboardingFile(child, contents))`를 추가하고,
  상단 import에 `checkOnboardingFile`을 넣는다(020이 `checkScheduleFile`을 등록한 것과
  같은 자리).
- [X] T004 [P] `.maestro/unified-permission-onboarding.yml`을 만들고
  `scripts/run-device-tests.mjs`의 `FLOWS` 배열에 등록한다(AGENTS.md 경고 — 등록 안
  하면 초록불인데 안 돎). 흐름: 새 설치 → 온보딩 화면 텍스트 확인 → 각 단계
  `testID`로 [건너뛰기] → [시작하기] → 일기 목록 도달(quickstart.md 「Maestro 흐름
  등록」).

**Checkpoint**: 디렉터리·검사·흐름 등록 완료. 순수 판정 구현 시작 가능.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 필수 권한 목록 상수 + 순수 판정 + 플래그 영속화. **모든 US가 이것에
의존한다.**

**⚠️ CRITICAL**: 이 Phase가 끝나기 전에는 어떤 US 화면도 구현할 수 없다.

### 계약 테스트 먼저 (FAIL 확인 후 구현)

- [X] T005 [P] `__tests__/onboarding-requirements.test.ts`를 쓴다
  (contracts/permission-requirements.md R4). 소스를 `readFileSync`로 읽어: `order`가
  `[1,2,3,4,5]`, `battery-exception`이 최대, `PermissionKey` 5멤버, `rationale`/`ifDenied`가
  모델 토큰 정규식에 매칭 안 됨, `platforms` 비어있지 않음, `PERMISSION_REQUIREMENTS`가
  `readonly`, `requirements.ts`가 `diary/`·`models/`·`schedule/` 미import. **지금은
  FAIL한다.**
- [X] T006 [P] `__tests__/onboarding-decision.test.ts`를 쓴다
  (contracts/onboarding-decision.md D6). `shouldShowOnboarding` 3갈래,
  `planOnboardingSteps`의 D3 표 전체(5개 `PermissionState` × 건너뜀 여부),
  플랫폼 필터(FR-003), `battery-exception`이 `batteryNoticeShown`으로 판정, `order` 정렬,
  `nextStep`이 `blocked`도 고름, 순수성(`expo-*`·`react-native`·`diary/`·`new Date(`
  미포함). **FAIL 확인.**
- [X] T007 [P] `__tests__/onboarding-flag.test.ts`를 쓴다
  (contracts/onboarding-flag.md F5). 시드 4갈래(§F4), 부분 손상 관대, 원자적 쓰기 후
  두 필드만 직렬화, 금지 토큰(`Date`·`count`·…) 미포함, `schedule/` 미import. **FAIL
  확인.**
- [X] T008 [P] `__tests__/constitution-onboarding.test.ts`를 쓴다(위반 주입, 007~020
  관례). `flag.ts` 소스에 `Date`를 끼운 문자열 → `checkOnboardingFile`이 잡음.
  `src/onboarding/foo.ts`가 `from "../diary/prompt"` → 잡음. 정상 소스 → 위반 0.
  **FAIL 확인**(규칙은 T002에서 이미 있으므로 이 테스트는 규칙 동작을 잠근다).

### 구현

- [X] T009 [P] `src/onboarding/requirements.ts`를 만든다
  (data-model.md §1, contracts/permission-requirements.md). `PermissionKey`·
  `PermissionRequirement` 타입, `PERMISSION_REQUIREMENTS` 상수(5항목,
  `order` 1..5). `location.platforms`는 **`["android","ios"]`로 일단 두고 T030에서
  실측 후 확정**(주석으로 "T030 실측 대기" 명시). `rationale`/`ifDenied`는
  contracts R3 초안 문구. T005가 GREEN이 되게.
- [X] T010 [P] `src/onboarding/decision.ts`를 만든다
  (data-model.md §4, contracts/onboarding-decision.md). `StepStatus`·`OnboardingStep`
  타입, `shouldShowOnboarding`·`planOnboardingSteps`·`nextStep`. **`new Date()` 안 부름.**
  `expo-*`·`react-native` import 없음. T006이 GREEN이 되게.
- [X] T011 `src/onboarding/flag-port.ts`를 만든다
  (contracts/onboarding-flag.md F2). `OnboardingFlagPort` 인터페이스 +
  `expoOnboardingFlagPort()`. `read`/`write`는 `src/schedule/notified-store.ts`의
  원자적 쓰기(`.writing` → move)를 복제. `readAutoDiaryRaw()`는
  `files/preferences/auto-diary.json`을 **경로 하드코딩으로** 직접 읽음
  (`schedule/settings.ts` import 금지). 지연 import(`expo-file-system`).
- [X] T012 `src/onboarding/flag.ts`를 만든다
  (data-model.md §3, contracts/onboarding-flag.md F1·F3·F4). `OnboardingFlag`·
  `DEFAULT_ONBOARDING_FLAG`, `loadOnboardingFlag`(F4 시드 로직 포함),
  `saveOnboardingFlag`. **필드는 boolean 2개만.** T007·T008이 GREEN이 되게. (T011에
  의존)

**Checkpoint**: `npm run test:logic` + `npm run lint`에서 T005~T008 GREEN, 헌법 검사
통과. 순수 기반 완성 — US 화면 구현 시작 가능.

---

## Phase 3: User Story 1 - 통합 온보딩 흐름 (Priority: P1) 🎯 MVP

**Goal**: 앱 최초 진입 시 필요한 권한을 고정 순서(사진 → 사진 좌표 → 알림 → 배터리
예외)로 한자리에서 순차 안내·요청하고, 완료 플래그를 세운 뒤 일기 목록으로 진입한다.

**Independent Test**: 새 설치 상태로 앱을 열어 온보딩 화면이 일기 목록보다 먼저 뜨고,
각 단계에서 권한 창이 뜨며, 전부 허용 후 [시작하기]로 일기 목록에 도달하고 재실행 시
다시 뜨지 않는다(quickstart D1).

### 통로 (기기 경계)

- [X] T013 [P] [US1] `src/onboarding/location-permission-port.ts`를 만든다
  (contracts/permission-ports.md P2). `LocationPermissionPort` 인터페이스 +
  `expoLocationPermissionPort()`. `expo-location`의
  `getForegroundPermissionsAsync`/`requestForegroundPermissionsAsync`를 지연 import,
  응답을 `PermissionState`로 매핑(`canAskAgain:false` → `blocked`).
- [X] T014 [P] [US1] `src/onboarding/os-settings-port.ts`를 만든다
  (contracts/permission-ports.md P3). `OsSettingsPort` +
  `expoOsSettingsPort()`. `react-native`의 `Linking.openSettings()` 지연 import, 실패
  시 예외를 밖으로 던지지 않음(`battery-exception-port.ts` 패턴).
- [X] T015 [P] [US1] `__tests__/permission-ports.test.ts`를 쓴다
  (contracts/permission-ports.md P5). `location-permission-port` 응답 4갈래 매핑(mock),
  `os-settings-port`가 `Linking.openSettings` 실패 시 안 던짐, 두 파일이 순수 판정
  계층 미import. **FAIL → T013·T014로 GREEN.**

### 화면

- [X] T016 [P] [US1] `__tests__/onboarding-screen.test.tsx`를 쓴다
  (contracts/onboarding-screen.md S5, 항목 1~5·9·10). 전 단계 `undetermined` →
  첫 단계 `photos` → [허용] mock `granted` → 다음 단계. [건너뛰기] → 통로 0회 호출.
  마지막까지 건너뛰면 [시작하기] → `onComplete({ completed: true, ... })`.
  `blocked` → [설정 열기]. `platform:"ios"` + `location.platforms:["android"]` → 위치
  단계 스킵. `expo-*`·`models/roster` 미import. **FAIL 확인.**
- [X] T017 [US1] `src/ui/OnboardingScreen.tsx`를 만든다
  (contracts/onboarding-screen.md S1). `OnboardingScreenProps`(platform·requirements·
  flag·ports·onComplete). 마운트 시 `Promise.all`로 권한 조회 → `planOnboardingSteps`
  → `nextStep`. 단계별 `rationale` + [허용]/[건너뛰기], `blocked`면 [설정 열기].
  [허용] 동작은 S1.2 표대로(key별 통로 호출 → 재조회 → 재판정). `skippedThisSession`은
  `useState` 배열. **생성 트리거·진행률 없음**(원칙 IV). `testID`를 단계·버튼에 부여
  (Maestro·R8 생존). T016이 GREEN이 되게.
  - **포그라운드 복귀 재조회**(spec Edge Case "온보딩 도중 앱이 백그라운드로 갔다가
    돌아오면 권한 상태 재조회"): `AppState`의 `change` 구독 → `"active"`이면 권한
    재조회 후 재판정. 이미 허용된 단계는 `satisfied` 유지. 언마운트 시 해제
    (`PermissionsSection`의 S2.2와 같은 패턴).
- [X] T018 [US1] `App.tsx`에 진입 게이트를 넣는다 (T012·T013·T014·T017에 의존)
  (contracts/onboarding-screen.md S4). `AppFrame` 상단에서 `loadOnboardingFlag`를
  `useState<OnboardingFlag|null>`+`useEffect`로 읽고, `flag === null`이면 `null` 렌더,
  `!flag.completed || forceOnboarding`이면 `<OnboardingScreen>`만 렌더(탭 UI 안 그림),
  `onComplete`에서 `saveOnboardingFlag` → `setFlag` → `setForceOnboarding(false)`.
  `forceOnboarding` state 추가(US3 T029가 `onRestartOnboarding`으로 켬).
  `ensureAutoDiaryTaskDefined()`· `clearStaleLocksOnStart()`·알림 라우팅 useEffect는
  게이트와 무관하게 유지. 통로 팩토리
  (`expoPhotoPort`/`expoNotificationPort`/`expoBatteryExceptionPort`/
  `expoLocationPermissionPort`/`expoOsSettingsPort`)를 `useMemo`로 만들어 주입
  (`expoLocationPermissionPort`·`expoOsSettingsPort`는 T013·T014 산출물).
- [X] T019 [US1] `App.tsx`에서 `platform`을 넘긴다 — `react-native`의 `Platform.OS`를
  `"android" | "ios"`로 좁혀 `OnboardingScreen`·(US3의) `PermissionsSection`에 전달.
  (T018에 이어)

**Checkpoint**: 새 설치 → 온보딩 → 전부 허용/건너뛰기 → 일기 목록 진입이 화면
테스트로 검증됨. `npm run test:ui` GREEN. US1 독립 완결.

---

## Phase 4: User Story 2 - 거부·부분 허용 정직한 대응 (Priority: P1)

**Goal**: 권한을 거부/건너뛰어도 앱이 죽지 않고, 거부된 권한에 의존하는 기능이 어떤
영향을 받는지 각 화면에 정직하게 표시된다. Android 14 부분 허용도 다룬다.

**Independent Test**: 온보딩에서 각 권한을 하나씩 거부/건너뛰고, 앱이 계속 진행되며
해당 기능 화면에 "이 기능은 X 권한이 없어 …"류 안내가 뜬다(quickstart D4).

### 020 변경 (배터리 로직 흡수)

- [X] T020 [P] [US2] `src/schedule/settings.ts`에서 `batteryExceptionPrompted`를
  제거한다(data-model.md §6, research.md §7). `AutoDiarySettings` 타입,
  `DEFAULT_AUTO_DIARY_SETTINGS`, `loadAutoDiarySettings`의 파싱, `saveAutoDiarySettings`의
  직렬화 4곳. `loadAutoDiarySettings`는 알 수 없는 필드에 이미 관대하므로 옛 파일의
  값은 자연히 무시됨.
- [X] T021 [US2] `src/schedule/settings-effects.ts`의 `applyToggleOn`에서 배터리 예외
  로직을 제거한다(data-model.md §6). `!current.batteryExceptionPrompted` 판정 +
  `deps.batteryPort.requestException()` + 플래그 세팅 3줄 삭제, `SettingsEffectDeps`
  에서 `batteryPort` 필드 삭제. `applyToggleOff`/`applyTargetHour`는 변경 없음.
  `ToggleOnResult.notificationDenied`는 유지(FR-014 — S3 표).
- [X] T022 [P] [US2] 020 계약 테스트에서 `batteryExceptionPrompted`를 검사하던
  부분을 삭제·수정한다. `__tests__/` 아래 020 관련 스위트를 grep(`batteryExceptionPrompted`)
  해서 전부. `applyToggleOn`의 `batteryPort` 주입을 기대하던 테스트도 함께.
  `npm run test:logic` + `tsc`가 클린해질 때까지.

### 거부 안내 (FR-014, SC-004)

- [X] T023 [P] [US2] `__tests__/denied-guidance.test.tsx`를 쓴다
  (contracts/onboarding-screen.md S3·S5). `AutoDiarySettingsScreen`에 알림 권한
  denied 시 "알림 권한이 없어 …"(020 N8, 기존 `notificationDenied` 경로 유지 확인) +
  배터리 예외 미설정 시 "자동 생성이 늦어질 수 있습니다" + [배터리 예외 설정]. 문구가
  `PERMISSION_REQUIREMENTS[key].ifDenied`에서 옴(중복 정의 없음). **FAIL 확인.**
- [X] T024 [US2] `src/ui/AutoDiarySettingsScreen.tsx`에 자동 생성 **지연 경고 문구**를
  추가한다(US1 시나리오 3). 기존 `notificationDenied` 표시는 유지. "자동 생성이 정한
  시간보다 늦어질 수 있습니다"를 표시하되, **[배터리 예외 설정] 버튼은 여기 두지
  않는다** — 그 버튼은 T028의 `PermissionsSection`("권한" 섹션)에만 있다(FR-018 —
  "설정 '권한' 섹션으로 흡수", D1 중복 회피). 문구는 `PERMISSION_REQUIREMENTS
  ["battery-exception"].ifDenied`에서. T023이 GREEN이 되게.
- [X] T025 [P] [US2] 사진·위치 거부 안내를 **일기 목록 화면 상단 배너**에 추가한다
  (contracts/onboarding-screen.md S3 표, FR-014 "그 기능이 사용되는 화면"). `DiaryListScreen`
  상단(제목 아래)에 사진 권한이 denied/blocked면 "사진을 볼 수 없어 일기는 사진 없이
  쓰입니다.", 위치가 denied(android에서 `location.platforms`에 android가 있을 때만)면
  "장소명 없이 씁니다." — `PERMISSION_REQUIREMENTS[...].ifDenied` 재사용. 권한 상태는
  `PhotoPort`/`LocationPermissionPort` 주입으로 조회(`DiaryListScreen`이 이미 받는 props
  경로 확인 후 없으면 `DiaryHomeScreen` → `DiaryListScreen`으로 전달). 화면 테스트를
  `__tests__/denied-guidance.test.tsx`에 추가.
- [X] T026 [US2] 부분 허용(`limited`) 처리를 `OnboardingScreen`·(US3)`PermissionsSection`
  에 넣는다(FR-015, contracts S2.1, data-model.md §2 "부분 허용 안내 판정").
  `describePhotoAccessLimit({ state, visiblePhotoCount })` 순수 함수를
  `src/onboarding/decision.ts`에 추가하고(T010 파일), 반환이 `"partial"`이면 화면에
  "그날의 사진 전부를 보지 못할 수 있다" + [전체 허용](`osSettings.openAppSettings()`).
  `"partial"` 판정: `state === "limited"` **또는** (`state === "granted"` &&
  `visiblePhotoCount === 0`). 온보딩 단계는 `limited`도 `satisfied`로 통과(이미 T010 D3).
  `describePhotoAccessLimit`의 계약 테스트를 `onboarding-decision.test.ts`(T006)에 추가.
  **T031이 실측 후** `visiblePhotoCount` 분기의 유지/정교화를 확정한다.

**Checkpoint**: 전부 거부해도 크래시 없음 + 각 기능 화면의 정직한 안내가 화면
테스트로 검증됨. `npm run test:logic` + `test:ui` + `lint`(020 잔재 tsc 클린) GREEN.
**MVP(US1+US2) 완성.**

---

## Phase 5: User Story 3 - 재요청 경로 (Priority: P2)

**Goal**: 020 "설정" 탭에 "권한" 섹션을 신설해 각 권한의 현재 상태·OS 설정 링크·배터리
상시 링크·온보딩 재실행을 한자리에 모으고, 포그라운드 복귀 시 상태를 갱신한다.

**Independent Test**: "설정" 탭 → "권한" 섹션에서 각 권한 상태가 보이고, 거부/`blocked`
권한의 [설정 열기]가 OS 설정 화면으로 이동하며, OS에서 켜고 돌아오면 상태가 갱신된다
(quickstart D5).

- [X] T027 [P] [US3] `__tests__/permissions-section.test.tsx`를 쓴다
  (contracts/onboarding-screen.md S5 항목 6~8). `limited` 행에 [전체 허용], `blocked`
  행에 [설정 열기], [온보딩 다시 하기] → `onRestartOnboarding` 호출, `AppState`
  `change` → `"active"` → 권한 재조회 mock 재호출. 현재 플랫폼에 없는 항목은 행
  미표시(FR-003). **FAIL 확인.**
- [X] T028 [US3] `src/ui/PermissionsSection.tsx`를 만든다
  (contracts/onboarding-screen.md S2, data-model.md §5). `PermissionsSectionProps`
  (platform·requirements·ports·onRestartOnboarding). 각 `requirement`를 행으로(플랫폼
  필터), 상태별 문구·버튼(S2.1). 배터리 행은 상태 `unknown`이어도 설명 + [배터리 예외
  설정] 상시. 하단 [온보딩 다시 하기]. **`AppState` `change` 구독** → `"active"`이면
  전 권한 재조회 후 리렌더(FR-020, SC-006), 언마운트 시 해제. `expo-*` 직접 import
  없음(통로 주입). T027이 GREEN이 되게.
- [X] T029 [US3] `src/ui/AutoDiarySettingsScreen.tsx`(020 "설정" 탭)에서
  `PermissionsSection`을 마운트한다. `App.tsx`가 통로들과 `onRestartOnboarding`
  (= `() => setForceOnboarding(true)`)·`platform`을 `AutoDiarySection` → 화면으로
  전달. `PermissionPanel`(진단, dev 전용)은 손대지 않음.

**Checkpoint**: 설정 "권한" 섹션이 화면 테스트로 검증됨. `npm run test:ui` GREEN. 재요청
경로 완결.

---

## Phase 6: 실측 반영 (FR-001, research 미결 해소)

**Purpose**: research.md §2·§3의 미결을 실기기로 확정하고 상수/트리거를 확정한다.
**코드 구조는 이미 두 결과를 수용하도록 설계됨** — 데이터/분기만 확정.

- [ ] T030 [US1] **§2 실측**: Android 실기기에서 위치 권한 유무별 `expo-location`
  `reverseGeocodeAsync` 결과를 대조한다(quickstart D0·§2). 안드로이드 장소명에 영향이
  **있으면** `requirements.ts`의 `location.platforms`를 `["android","ios"]` 유지,
  **없으면** `["ios"]`로 바꾼다(→ 안드로이드 온보딩에서 자동 제외). T009의 "T030 실측
  대기" 주석 제거.
- [ ] T031 [US2] **§3 실측**: Android 14 기기에서 "선택한 사진만 허용" 후
  `getPermissionsAsync` 응답의 `accessPrivileges`를 `adb logcat`으로 관측한다
  (quickstart D3). `"limited"`가 **오면** T026의 `describePhotoAccessLimit` 첫 분기로
  충분 — `visiblePhotoCount` 분기를 dead path로 두거나 제거. **안 오면**
  `visiblePhotoCount`를 실제로 채우는 경로(온보딩/설정이 첫 사진 조회의 개수를
  `describePhotoAccessLimit`에 넘김)를 T026 함수에 연결하고, 화면이 그 개수를 조회하도록
  배선. `src/signals/port.ts`·`expo-port.ts`의 "확인되지 않았다" 주석을 실측 결과로
  갱신(원칙 V — 실측 근거 남김).
- [ ] T032 필수 권한 목록이 D0 실측과 일치하는지 최종 확인하고, 불일치 시
  `requirements.ts`의 `order`·항목을 고친다(코드가 아니라 데이터).

---

## Phase 7: Polish & 검증

- [X] T033 [P] 위반 주입 확인(AGENTS.md 관례): `flag.ts`에 `const now = new Date()`를
  잠깐 넣어 `npm run lint`가 잡는지, `src/onboarding/decision.ts`에
  `import { buildPrompt } from "../diary/prompt"`를 잠깐 넣어 잡는지, `src/onboarding/`
  아무 파일에 `from "../schedule/settings"`를 잠깐 넣어 잡는지(경계) 확인 후 되돌린다.
- [X] T034 [P] 문안 리뷰(SC-008, 원칙 II·III): `PERMISSION_REQUIREMENTS`의 모든
  `rationale`·`ifDenied`, `OnboardingScreen`·`PermissionsSection`의 하드코딩 문구를
  사람이 읽어 — 모델 식별자·파라미터·양자화 0건, "안다/압니다/기록합니다"류 단언
  문장 없음. 걸리면 사실 서술로 고친다.
- [X] T035 [P] `npm test` 전체 GREEN 확인(신규 스위트 포함), `npm run lint` 0 error
  (checkOnboardingFile 등록됨, 020 `batteryExceptionPrompted` 잔재 tsc 클린),
  `__tests__/jest-projects.test.ts`가 신규 `.ts`/`.tsx` 스위트를 양쪽 프로젝트에서
  올바르게 잡는지. 추가 grep 확인: `src/onboarding/` 아래에 `process.env` 직접 접근이
  0건(FR-021 — env는 `src/config/environment.ts`에서만), `src/ui/OnboardingScreen.tsx`·
  `PermissionsSection.tsx`가 `models/roster`·`ModelAsset`·`assetFor`를 참조하지 않음
  (FR-022 — 기존 `checkSourceFile`이 잡지만 이중 확인).
- [X] T036 AGENTS.md에 021 절을 추가한다(007~020 관례). 핵심 결론: 통합 온보딩 고정
  순서·뒤로 가기 없음·실시간 재판정, `onboarding.json` 분리·시드, 020
  `batteryExceptionPrompted` 흡수, `checkOnboardingFile` 규칙, FR-001 실측 결과
  (§2·§3), 실기기 검증 결과(T037).
- [ ] T037 **실기기 검증(debug 1회, 원칙 V)** — quickstart.md D0~D6 전부 수행(사람).
  새 네이티브 모듈 없으므로 release 재확인은 하지 않는다. `npm run test:device`
  (`.maestro/unified-permission-onboarding.yml`)를 함께 돌린다. 결과(관측값·화면
  캡처)를 이 파일과 AGENTS.md에 남긴다.

---

## Dependencies & Execution Order

- **Phase 1 (T001-T004)** → 나머지 전부의 선행.
- **Phase 2 (T005-T012)** → 모든 US의 선행. T011 → T012. T005~T008(테스트) → T009~T012
  (구현).
- **Phase 3 US1 (T013-T019)**: T013·T014·T015·T016 병렬 → T017(T013·T014·T016) →
  T018(T012·T013·T014·T017) → T019(T018).
- **Phase 4 US2 (T020-T026)**: T020·T022 병렬 → T021(T020). T023 → T024. T025(T009,
  화면 props 경로) · T026(T010·T014) 병렬. **US1과 독립** — 020 변경·거부 안내는
  온보딩 화면과 다른 파일. 단 T026의 `describePhotoAccessLimit`는 T010의 `decision.ts`에
  추가되므로 T010 완료 필요.
- **Phase 5 US3 (T027-T029)**: T027 → T028(T009·T010·T013·T014) → T029(T018·T028).
- **Phase 6 (T030-T032)**: T009·T017·T026 이후(실측 대상 코드가 있어야). 실기기 필요.
- **Phase 7 (T033-T037)**: 전부 이후. T037이 최종.

### 병렬 실행 예

```
# Phase 2 테스트 (다른 파일):
T005 onboarding-requirements.test.ts
T006 onboarding-decision.test.ts
T007 onboarding-flag.test.ts
T008 constitution-onboarding.test.ts

# Phase 2 구현 (T005~T008 GREEN 목표):
T009 requirements.ts  ||  T010 decision.ts     # 서로 독립
T011 flag-port.ts → T012 flag.ts               # 순차

# MVP 이후 US2·US3 병렬 시작 가능 (US1 완료 후):
T020/T022 (020 변경)  ||  T027 (US3 테스트)
```

## Implementation Strategy

- **MVP = Phase 1 + 2 + 3(US1) + 4(US2)**. 온보딩이 뜨고, 권한을 받고/건너뛰고, 거부
  영향이 정직하게 보이고, 020 배터리 로직이 흡수된다.
- **US3(Phase 5)**는 재요청 경로 — MVP 없이도 독립 가치가 있으나 P2.
- **Phase 6 실측**은 US1·US2 코드가 있어야 의미가 있으므로 뒤에 둔다. 결과가 어느
  쪽이든 `requirements.ts` 데이터와 T026·T031의 분기만 바뀐다.
- 각 Phase 끝에서 `npm run test:logic`(개발 중) / `npm test`(커밋 전) / `npm run lint`.
- 커밋 메시지는 한국어(헌법 「개발 방식」).
