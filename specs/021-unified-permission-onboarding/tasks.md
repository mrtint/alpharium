# Tasks: 앱 요구 권한 실측 및 통합 신청 절차

> **진행 상태(2026-08-29, 실기기 검증 완료)**: 37/37 완료.
> **끝난 것** — Phase 1~5의 코드·테스트 전부, Phase 7의 위반 주입(T033)·
> 문안 리뷰(T034)·전체 GREEN(T035)·AGENTS.md(T036). `src/onboarding/`
> (`requirements`·`decision`·`flag`·`flag-port`·`location-permission-port`·
> `os-settings-port`), `src/ui/OnboardingScreen.tsx`·`PermissionsSection.tsx`,
> App.tsx 진입 게이트·`deniedNotices` 배선, 020 `settings.ts`·
> `settings-effects.ts`에서 `batteryExceptionPrompted` 제거,
> `NotificationPort.getPermission()` 추가, `checkOnboardingFile` 헌법 규칙,
> `.maestro/unified-permission-onboarding.yml`(FLOWS 등록). 기기 없는
> 테스트 1853개(+8 스위트)·lint·헌법 검사·prettier 전부 클린.
> **실기기 검증(2026-08-29, SM-S901N/Galaxy S22, Android 16, debug) — 전부 완료.**
> T030·T031·T032·T037 확인. Maestro 흐름 2개 PASS(021 + 020 회귀), 온보딩
> 진입 게이트·부분 사진 허용(`limited`)·설정 "권한" 섹션·복귀 갱신(SC-006)·
> D2(온보딩 권한으로 `has_media=1` 실제 생성)·D6(020→021 시드) 확인. T030:
> 안드로이드도 `reverseGeocodeAsync`는 위치 권한 필요 → `location.platforms`
> `["android","ios"]` 유지 확정, `requirements.ts` 주석 교체. Android 14
> `limited`는 **온다** → `visiblePhotoCount` 분기는 dead path(유지).

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

- [X] T030 [US1] **§2 실측 — 확인(2026-08-29, SM-S901N/Galaxy S22, Android 16, debug)**.
  같은 하루(08-27, rich 3장, 좌표 37.5172,127.0473 = 강남 일대)를 **위치 권한 유무별로
  두 번** 생성해 대조:
  - **ACCESS_FINE_LOCATION 부여**: `DiaryEntry.placeName = {"kind":"known","value":"강남구"}`,
    일기 본문에 "사진 3장을 통해 **강남구** 근처를 알 수 있다."
  - **ACCESS_FINE_LOCATION·COARSE 거부**(`adb shell pm revoke`): `placeName = {"kind":"unknown"}`,
    본문에 지명 없음("어디를 갔는지... 전혀 알 수 없다").
  → **안드로이드에서도 `expo-location`의 `reverseGeocodeAsync`는 위치 권한이 있어야
  지명을 준다** (권한 없으면 예외 → `geocoding-port.ts`가 삼켜 `unknown`, 별도 "권한
  없음" 갈래 없음 — 원칙 IV). 따라서 `requirements.ts`의 `location.platforms`는
  **`["android","ios"]` 유지** — 안드로이드에서 이 단계는 실제로 의미가 있다.
  "T030 실측 대기" 주석을 실측 결과로 교체했다(`requirements.ts` line 28·77 영역).
- [X] T031 [US2] **§3 실측 — 확인(2026-08-29, SM-S901N, Android 16, debug)**.
  온보딩 사진 단계에서 [허용] → OS 다이얼로그의 **"제한된 액세스 허용"** 선택 →
  포토피커에서 사진 2장 선택 → **완료**. 결과:
  `READ_MEDIA_VISUAL_USER_SELECTED: granted=true` / `READ_MEDIA_IMAGES: granted=false`
  (`adb shell dumpsys package`로 확인). 이 상태에서 온보딩이 **사진 단계를 통과**
  (다음 단계 `location`으로 진행)했고, 설정 "권한" 섹션의 사진 행이 **"일부만 허용됨"
  + "그날의 사진 전부를 보지 못할 수 있어요." + [전체 허용]** 로 렌더됐다 →
  `describePhotoAccessLimit`가 `"partial"`을 반환 → **`expo-media-library`가 안드로이드
  16에서 `accessPrivileges: "limited"`(또는 그에 상응하는 `PermissionState: "limited"`)를
  실제로 준다**는 결론. 따라서 T026의 `describePhotoAccessLimit` 첫 분기(`state === "limited"`)
  로 충분하고, **`visiblePhotoCount` 분기는 이 기기에서 dead path다**(구형 안드로이드
  대비로 남겨 둠 — 제거하지 않음, 유지 비용 0). [전체 허용] → OS 앱 설정 진입 →
  `pm grant READ_MEDIA_IMAGES` → 앱 복귀 시 행이 **"허용됨"으로 자동 갱신**(SC-006,
  `AppState` `change→active` 리스너 동작 확인). `src/signals/port.ts`·`expo-port.ts`의
  "확인되지 않았다" 주석은 이 결과로 갱신 대상(T037 후속).
- [X] T032 **확인(2026-08-29)**. 온보딩·설정 두 화면에 노출된 권한 항목이
  `PERMISSION_REQUIREMENTS`의 5갈래(photos·photo-location·location·notifications·
  battery-exception)와 일치하고 `order` 1..5대로 표시됨을 실기기에서 확인했다.
  안드로이드가 자동 부여한 항목(pm clear 후에도 일부 granted로 시작하는 경우)은
  satisfied로 건너뛰어 첫 actionable 단계가 기기 상태에 따라 달라지는 것이 정상 —
  `requirements.ts` 데이터 수정 불요.

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
- [X] T037 **실기기 검증(debug 1회, 원칙 V) — 완료(2026-08-29, SM-S901N/Galaxy S22,
  Android 16 / SDK 36, debug APK)**. 관측값:
  - **설치**: 020 release APK가 깔려 있어 서명 불일치(`INSTALL_FAILED_UPDATE_INCOMPATIBLE`)
    → `adb uninstall` 후 debug 설치(사용자 승인). 기기 일기·모델 함께 삭제됨(AGENTS.md
    경고대로).
  - **D1 (진입 게이트, FR-005·SC-001)**: 새 설치 첫 실행에서 일기 목록이 아니라
    **"시작하기 전에" 온보딩 화면**이 먼저 떴다. "1 / 5" = 사진 단계, rationale·ifDenied
    문구 정상. `pm clear` 후에도 `onboarding.json` 플래그가 지워져 다시 "1 / 5"부터
    재시작 — 게이트가 플래그로만 판정함을 확인.
  - **D3 (부분 허용, T031)**: 위 T031 참조. `limited` 상태 정상 처리.
  - **D4 (전부 건너뛰기, FR-013·SC-003)**: Maestro 흐름이 [건너뛰기]를 단계가 사라질
    때까지 누른 뒤 [시작하기] → 일기 목록 도달, **크래시 없음**. 재실행
    (`clearState:false`)에서 온보딩 **재노출 안 됨**(FR-011).
  - **D5 (설정 "권한" 섹션 + OS 링크 + 복귀 갱신)**: 설정 탭에 020 자동 생성 설정
    + 배터리 링크 아래로 **"권한" 섹션** 렌더. 5개 행 전부 라이브 상태 표시
    (photos "허용됨"/"일부만 허용됨", location "아직 묻지 않음", notifications
    "거부됨 — 다시 요청할 수 있어요" 등), 상태별 [허용]/[전체 허용]/[설정 열기]
    버튼, 하단 [권한 안내 다시 보기]. [전체 허용] 탭 → `com.android.settings`
    `InstalledAppDetails` 진입 확인. OS에서 권한 부여 후 앱 복귀 시 행이 자동 갱신
    (SC-006).
  - **Maestro** `npm run test:device` 대상 흐름:
    - `.maestro/unified-permission-onboarding.yml` — **전체 PASS**(5개 체크포인트).
      단, 흐름의 M2가 원래 `onboarding-step-photos` id를 박아 두어, 사진 권한이
      이미(부분) 부여된 기기에서는 첫 단계가 사진이 아니라 실패했다 → 흐름을
      **권한 상태 무관하게** 수정(`id: "onboarding-step-.*"` + skip-all 루프).
    - `.maestro/scheduled-diary-notification.yml`(020) — 021이 건드린 설정 화면
      회귀 확인차 실행. **개발자 탭을 탭하던 stale 버그**(020 자동 생성 설정은
      `settings` 탭에 있음)를 발견·수정(설정 탭 탭) → **PASS**. 021 회귀 아님.
  - **D6 (020→021 업그레이드 시드) — 확인(2026-08-29)**. 020만 돌던 기기 상태를
    재현: `files/preferences/onboarding.json` 삭제 + 구형
    `auto-diary.json`(`{"enabled":true,"targetHour":7,"batteryExceptionPrompted":true}`)
    작성. 앱 재시작 → **온보딩이 다시 뜸**("시작하기 전에") — `seedFromAutoDiary`가
    `completed: false` 반환. 현재 단계가 "5 / 5"(=`doneCount 4`)이고 배터리 단계가
    **온보딩 흐름에 안 나타남** — `batteryExceptionPrompted: true` → `batteryNoticeShown: true`
    시드로 `planOnboardingSteps`가 배터리를 `satisfied`로 봄. `loadAutoDiarySettings`는
    구형 필드를 무시(파싱에서 021이 제거), `flag.ts`만 raw로 읽어 시드 — 두 동작
    다 확인. (`onboarding.json`은 [시작하기]나 단계 액션 전까지 안 써지고 매 실행
    `auto-diary.json`에서 재시드 — 설계대로.)
  - **D2 (온보딩 후 실제 생성 `has_media>0`) — 확인(2026-08-29)**. 캐릭터 모델
    (`a1.bin` kanana-Q4_K_M, md5 로스터값 일치)과 VLM 모델(`v1.bin`+`v2.bin`
    LFM2.5-VL-450M, md5 로스터값 일치)을 개발 기계에서 받아 `run-as`로
    `files/models/`에 넣고 `state.json`에 `passed: true` verdict 3개 작성
    (010 도구가 아니라 수동 배치 — 010은 사진 심기 전용이라 모델은 못 넣음).
    사진 있는 하루(08-28, rich 3장, 앞서 심겨 있던 것) + `빠르게 봄` 선택 →
    생성. `adb logcat` 확인: **`RNLlama: loadPrompt:580 [DEBUG] Input processed:
    n_past=278, ... has_media=1`** (VLM이 사진을 IMAGE 청크로 실제 디코드, 013
    리사이즈로 청크 2개), 이어서 캐릭터 모델이 **706 토큰 프롬프트**(캡션이 텍스트
    재료로 들어간 길이 — 사진 없는 하루면 ~400)로 `completion` 실행. **021 온보딩이
    부여한 사진 권한으로 VLM→캐릭터 파이프라인이 사진을 실제로 읽었다**는 증거
    (011 결함 "has_media=0"의 반대). 생성 완료: 08-28 일기가 **사진 내용을 정확히
    반영**했다("루이와 함께 킹-푸 레스토랑", "발코니에 화분", 씨앗 템플릿의
    다육식물·카페·식당 간판과 일치) + 짐작 말투("사진을 통해...엿볼 수 있었다",
    "알 수 없다") + 관측 못 하는 것 단언 안 함("루이의 일과나 감정...은 사진에
    담기지 않았다"). `signalsUsed.photos`에 3장 다 담김(`content://media/...` id),
    `complete: true`.
  - **미확인 잔여**: 없음(T030·T031·T032·D1~D6 전부 확인). 새 네이티브 모듈 없어
    release 재확인은 생략(012 기준). ※ 실기기 검증용으로 개발 기계에서 받은
    모델 3개(`a1.bin`·`v1.bin`·`v2.bin`)와 합성 하루는 010 원칙대로 "경로가
    도는가"만 봤고 품질 결론에 쓰지 않았다.

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
