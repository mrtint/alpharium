# Tasks: 시간대 지정 자동 일기 작성과 완성 알림

> **진행 상태(2026-08-28, `/speckit-implement` 2차)**: 53/58 완료.
> **끝난 것** — Phase 1~6의 코드·테스트 전부. Phase 1(의존·config
> plugin·019 하네스 제거·`checkScheduleFile`·Maestro 등록), Phase 2(스케줄·
> 설정·재시도 순수 판정), US1(`background-port`·`battery-exception-port`·
> `task.ts`·`AutoDiarySettingsScreen`·`App.tsx` "설정" 탭 배선·
> `settings-effects.ts` S6 순서), US2(`notify`·`notification-port`·
> `notification-routing`·`App.tsx` 알림 리스너·`DiaryHomeScreen initialDay`·
> `initialScreen` 확장·`acknowledgeNotified`), US3(`lock.ts`·`lock-port.ts`·
> `pipeline.ts` 옵셔널 `acquireLock?`·`wiring.ts` owner 배선·개발자 탭
> 트리거 버튼), Polish(위반 주입 T048·T049 확인, `pruneNotified` 호출부
> 확정 T050, AGENTS.md 기록 T051). `npm test`(1752 통과, 91 스위트)·
> `npm run lint`(0 error)·헌법 검사·prettier 전부 클린.
> **남은 것** — 실기기 검증 5개(T053·T053a·T053b·T054·T055). 전부 실기기가
> 필요하다(사람 수행) — debug 같은 세션 확인, SC-003 배터리 예외 라운드,
> SC-002 24h 무예외 소크, release 재확인, `npm run test:device`.

**Input**: Design documents from `/specs/020-scheduled-diary-notification/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/(×6), quickstart.md — 모두 존재함

**Tests**: **포함한다.** 헌법 「개발 방식」이 "계약을 먼저 정하고
테스트를 먼저 쓴다"를 MUST로 요구하고, 이 저장소는 007·009·012 이래
**소스 선언을 `readFileSync`로 직접 읽는 계약 테스트**를 관례로 굳혔다.
스케줄·알림·잠금 판정은 전부 순수 함수로 설계됐으므로(plan.md 「경계」)
기기 없이 검증 가능하다. 실기기로만 증명되는 항목(OS가 실제로
실행했는가, 알림이 실제로 떴는가)은 quickstart.md 수행으로 대체한다.

**Organization**: spec.md의 User Story 1(P1, 시각 선택·자동 생성) →
User Story 2(P2 아님 — spec은 P1) → User Story 3(P2, 경합 방지) 순서.
US1·US2는 spec에서 **둘 다 P1**이며 "시각 없이 알림만, 알림 없이
시각만으로는 기능이 완성되지 않는다"고 명시했다 — 그래서 US1(생성
경로) 다음 US2(알림 경로)를 잇고, MVP는 **US1 + US2**로 본다. US3(P2)는
경합 잠금이며 US1·US2 없이도 독립 가치가 있으나 우선순위가 낮다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능(다른 파일, 완료되지 않은 작업에 의존하지 않음)
- **[Story]**: 어느 사용자 스토리에 속하는가(US1, US2, US3)
- 파일 경로를 정확히 포함한다

## Path Conventions

단일 프로젝트(plan.md 「Structure Decision」). 스케줄·알림·잠금의 순수
판정은 신규 디렉터리 `src/schedule/`에 모으고 기기 통로(`*-port.ts`)만
얇게 둔다. 기존 제품 계층(`src/diary/`, `src/inference/`, `src/config/`)은
**재사용만** 한다 — 예외는 `pipeline.ts`의 옵셔널 `acquireLock?` 확장
(US3), `App.tsx`·`DiaryHomeScreen.tsx`의 알림 라우팅 배선(US2). 019
하네스(`src/spike/`)는 이 스펙에서 제거한다.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 신규 의존성 설치, 매니페스트 권한 선언, `src/schedule/`
디렉터리 준비, 019 하네스 제거.

- [X] T001 `npx expo install expo-notifications expo-intent-launcher`를
  실행해 package.json·package-lock에 반영한다(research.md §1·§5 — Expo
  관리 패키지이므로 `npm view`로 버전을 추측하지 않는다). `npx expo
  install --check`로 검증한다.
- [X] T002 `plugins/with-battery-exception.js`를 만든다 —
  `AndroidManifest.xml`에 `android.permission.POST_NOTIFICATIONS`와
  `android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`를 선언하는
  선언적 config plugin (contracts/battery-exception.md E2,
  `plugins/with-release-signing.js` 패턴). `app.json`/`app.config`의
  plugins 배열에 등록한다.
- [X] T003 [P] `src/spike/` 디렉터리를 통째로 제거한다(`git rm -r
  src/spike/`) — `background-diary-task.ts`,
  `DiagnosticsBackgroundPanel.tsx`, `verification-log.ts`
  (research.md §9, plan.md 「019 스파이크 코드의 처리」).
- [X] T004 [P] `src/ui/DiagnosticsScreen.tsx`에서
  `DiagnosticsBackgroundPanel` 진입점(019 T010이 추가한 한 곳)을
  되돌린다 — import와 렌더 모두.
- [X] T005 [P] `scripts/check-constitution.mts`에서 `checkSpikeFile`
  import와 호출을 제거한다. `scripts/constitution-rules.ts`의
  `checkSpikeFile` 함수와 `SPIKE_TOUCHES_PRODUCT_LAYER` 상수는
  **`src/schedule/` 경계용으로 개명·재활용**한다 — `checkScheduleFile`,
  `SCHEDULE_TOUCHES_PRODUCT_LAYER`. 대상 정규식은 기존 스파이크 목록
  (`diary\/store|models\/roster|diary\/prompt|diary\/acceptance`)에서
  **`models/roster`·`diary/prompt`·`diary/acceptance`는 유지**하고
  (`src/schedule/`는 캐릭터 로스터·프롬프트·판정에 직접 닿을 이유가
  없다 — 원칙 III·IV), **`\bbackend\b.*\.generate`를 추가**한다
  (contracts/background-generation.md B3·B8). **`diary/store`는
  대상에서 뺀다** — `src/schedule/task.ts`가 `wiring.ts`를 거쳐
  `store.listDays()`를 읽어야 하므로 직접 import 금지는 과하다. 이
  예외를 `checkScheduleFile`의 주석에 명시한다(`task.ts`는 wiring
  경유로만 store에 닿는다). `checkScheduleFile`의 대상 경로 판정은
  `src/schedule/`로 시작하는지로 한다(기존 `src/spike/` 판정과 같은
  구조). `src/app/notification-routing.ts`는 이 스캔 대상에 넣지
  않는다 — 순수 라우팅 판정이며 `diary/*`를 import하지 않는다는 것을
  T030의 계약 테스트가 검사한다. `check-constitution.mts`의
  `checkSourceFiles` 루프에 등록한다.
- [X] T006 [P] `__tests__/spike/` 디렉터리를 제거한다
  (`harness-boundary.test.ts`, `verification-log.test.ts`).
- [X] T007 `.maestro/scheduled-diary-notification.yml`을 만들고
  `scripts/run-device-tests.mjs`의 `FLOWS` 배열에 등록한다
  (quickstart.md §7, AGENTS.md — 등록 안 하면 초록불인데 검증 0).
  이 시점에는 흐름 본문이 최소여도 되나 파일·등록은 존재해야 한다.

**Checkpoint**: `npm run lint`가 통과한다(`src/spike/` 제거 후 헌법
검사가 깨지지 않는다). `npm test`가 통과한다(`__tests__/spike/` 제거 후
`jest-projects.test.ts`의 파일 수 검사가 여전히 `> 40`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 사용자 스토리가 의존하는 순수 판정 함수와 설정
영속화. **이 단계 없이는 US1·US2·US3 어느 것도 시작할 수 없다.**

**⚠️ CRITICAL**: 이 단계가 끝나기 전에는 사용자 스토리 작업을 시작하지
않는다.

### 계약 테스트 먼저 (헌법 「개발 방식」 MUST)

- [X] T008 [P] `__tests__/schedule/settings.test.ts`를 만든다 —
  contracts/auto-diary-settings.md S3·S8: `loadAutoDiarySettings`가 파일
  없음/손상 시 `DEFAULT_AUTO_DIARY_SETTINGS`, `targetHour` 범위 밖이면
  그 필드만 7로, `enabled`/`batteryExceptionPrompted` 비-boolean이면
  false. 소스에 `lastRunAt` 류 실행 이력 필드 없음(S7). 이 시점엔
  **실패해야 한다**(`src/schedule/settings.ts`가 아직 없음).
- [X] T009 [P] `__tests__/schedule/notified-store.test.ts`를 만든다 —
  S5·S8: `loadNotifiedState`가 없으면 `{}`, 손상 엔트리는 무시,
  `pruneNotified`가 **날짜 문자열 비교만**으로 오래된 엔트리를
  잘라낸다(값·시간을 안 본다). 실패해야 한다.
- [X] T010 [P] `__tests__/schedule/decision.test.ts`를 만든다 —
  contracts/schedule-decision.md D2·D6: `decideSchedule`의 네 갈래
  (`disabled`/`not-near-target`/`all-written`/`act:true`), 자정 wrap
  (`targetHour=23, WINDOW_HOURS=3`), `now`가 인자임을 소스에서 확인
  (`new Date()` 없음), `WINDOW_HOURS`가 export되지 않음. 실패해야 한다.
- [X] T011 [P] `__tests__/schedule/retry.test.ts`를 만든다 — D5·D6:
  `pickRetryDay`의 결과가 **항상 `selectableDays`의 원소이거나
  `null`**, 가장 최근 미완성 1개를 고른다, 전부 있으면 `null`, 009 범위
  밖 날짜는 후보가 못 된다(위반 주입). 실패해야 한다.

### 순수 함수와 설정 구현

- [X] T012 [P] `src/schedule/settings.ts`를 만든다 —
  contracts/auto-diary-settings.md S1·S3·S4: `AutoDiarySettings` 타입,
  `DEFAULT_AUTO_DIARY_SETTINGS`, `AutoDiarySettingsPort` 인터페이스,
  `loadAutoDiarySettings`/`saveAutoDiarySettings`(항상 값 반환, 부분
  손상 관대, `.writing` 임시 파일 + `moveSync`),
  `expoAutoDiarySettingsPort()`(지연 import, `preferences/auto-diary.json`
  — 007 `selection-store.ts`와 같은 디렉터리). T008을 통과시킨다.
- [X] T013 [P] `src/schedule/notified-store.ts`를 만든다 — S5:
  `NotifiedEntry`/`NotifiedState` 타입, `loadNotifiedState`(없으면 `{}`),
  `saveNotifiedState`, `pruneNotified`(순수, 날짜 문자열 비교만),
  `expoNotifiedStorePort()`(지연 import, `preferences/notified.json`).
  T009를 통과시킨다.
- [X] T014 [P] `src/schedule/retry.ts`를 만든다 —
  contracts/schedule-decision.md D5: `pickRetryDay(selectableDays,
  existingDiaryDays)` 순수 함수. 04:00·3일을 다시 계산하지 않는다(입력
  배열만 본다). T011을 통과시킨다.
- [X] T015 `src/schedule/decision.ts`를 만든다 —
  contracts/schedule-decision.md D1~D4: `decideSchedule` 순수 함수,
  `WINDOW_HOURS`(파일 상수, 3, **export 안 함**), 자정 wrap 처리,
  `now`는 인자. T014(`pickRetryDay`)에 의존. T010을 통과시킨다.

**Checkpoint**: `npm run test:logic`이 T008~T011을 통과시킨다. 스케줄
판정과 설정 영속화가 기기 없이 검증됐다.

---

## Phase 3: User Story 1 - 원하는 시간대를 고르고, 그 근방에 일기가 쓰인다 (Priority: P1)

**Goal**: 사용자가 설정에서 대략적인 목표 시각(기본 오전 7시)을 고르면,
하루 경계가 지난 뒤 그 시각 근방에 백그라운드에서 전날 일기가 자동
생성된다. 앱을 열지 않아도.

**Independent Test**: quickstart.md §2 — 설정에서 시각을 바꾸고(또는
현재+몇 분), 화면을 끄고 잠근 뒤 그 시각 근방에 실제로 생성이
트리거되는지(정확한 분이 아니라 합리적 오차 범위 안). `adb shell
dumpsys jobscheduler`로 등록 확인, 방치 후 목록에 새 일기 줄.

### 계약 테스트 먼저

- [X] T016 [P] [US1] `__tests__/schedule/background-generation.test.ts`를
  만든다 — contracts/background-generation.md B2·B8: `runAutoDiaryTask`가
  `decideSchedule` 없이 `pipeline.run()`을 부르지 않는다(소스 검사),
  `backend.generate()` 직접 호출 없음(006 `DIRECT_GENERATE` 패턴 재적용),
  `result.ok === false`면 알림 발송 없음, `"skipped"`에서 `Failed`를
  반환하지 않음, `register()`가 `targetHour`를 인자로 받지 않음. `now`를
  한 번만 만든다(B7). 실패해야 한다.
- [X] T017 [P] [US1] `__tests__/schedule/background-port.test.ts`를
  만든다 — B4: `BackgroundSchedulePort`의 `register`/`unregister`/
  `reschedule` 시그니처, `MINIMUM_INTERVAL_MINUTES`가 이 파일 상수(15),
  `reschedule`가 `unregister` → `register` 순서임을 소스에서 확인.
  실패해야 한다.

### 구현

- [X] T018 [P] [US1] `src/schedule/background-port.ts`를 만든다 — B4:
  `BackgroundSchedulePort` 인터페이스와 `expoBackgroundSchedulePort()`
  (지연 import `expo-background-task`·`expo-task-manager`,
  `MINIMUM_INTERVAL_MINUTES = 15`, `register`는 목표 시각을 파라미터로
  넣지 않음, `reschedule = unregister → register`). T017을 통과시킨다.
- [X] T019 [US1] `src/schedule/task.ts`를 만든다 —
  contracts/background-generation.md B1·B2·B3·B6·B7: 전역 스코프
  `TaskManager.defineTask(AUTO_DIARY_TASK_NAME, ...)`,
  `runAutoDiaryTask(): Promise<"ran" | "skipped" | "failed">` 본체
  (설정 읽기 → `selectableDays`+`store.listDays()` → `decideSchedule`
  → `createAppPipeline()` → `loadSelection()`/`loadVisionSetting()` →
  `pipeline.run()` → 성공 시 알림은 **US2에서** 배선, 지금은 TODO 주석
  으로 자리만 → 반환). `now`는 진입에서 한 번. `wiring.ts` 재사용,
  `acceptance`/`backend.generate`/`prompt` 직접 호출 없음. T016을
  통과시킨다.
- [X] T020 [P] [US1] `src/schedule/battery-exception-port.ts`를 만든다 —
  contracts/battery-exception.md E1: `BatteryExceptionPort` 인터페이스와
  `expoBatteryExceptionPort()`(지연 import `expo-intent-launcher`,
  `requestException()`은 **반환값 void**(원칙 IV), `openSettingsList()`,
  인텐트 실패 시 예외를 밖으로 던지지 않고 `Linking.openSettings()`
  폴백).
- [X] T021 [P] [US1]
  `__tests__/schedule/battery-exception-port.test.ts`를 만든다 —
  E7: `requestException()`이 결과를 반환하지 않음, 소스에 "정각"/"매일
  7시"/"7:00" 문자열 없음(FR-002). `src/schedule/battery-exception-port.ts`
  대상.
- [X] T022 [US1] `src/ui/AutoDiarySettingsScreen.tsx`를 만든다 —
  contracts/auto-diary-settings.md S6, battery-exception.md E3·E4·E5:
  목표 시각 선택 UI(시 단위, 0–23), "자동 생성" on/off 토글, 근사치
  안내 문구(E5, "그 무렵에 씁니다"), 배터리 상시 링크(E4, `enabled`·
  `batteryExceptionPrompted`와 무관하게 **항상** 표시). **판정은 화면이
  하지 않는다** — props로 받은 `settings`와 콜백만. `state.ts` 순수
  전이 함수를 쓰는 기존 화면 패턴을 따른다.
- [X] T023 [P] [US1] `__tests__/ui/AutoDiarySettingsScreen.test.tsx`를
  만든다 — 토글·시각 선택 UI가 존재, 근사치 문구가 렌더된다(`.*무렵.*`),
  배터리 링크가 항상 보인다. 소스에 "정각"/"매일 7시" 문자열 없음(E5).
- [X] T024 [US1] `App.tsx`에 자동 생성 설정을 배선한다 — `import
  "./src/schedule/task"`(부수 효과, 전역 defineTask 등록,
  contracts/background-generation.md B1). 개발자 탭 또는 일기 설정
  영역에 `AutoDiarySettingsScreen` 진입점 추가(진단 탭 게이트와
  무관하게 사용자 화면 — FR-001). 토글 켬/끔/시각 변경 시
  contracts/auto-diary-settings.md S6의 부수 효과 순서(알림 권한 →
  배터리 예외 1회 → save → `backgroundPort.register()`/`unregister()`/
  `reschedule()`)를 실행한다. `enabled: true`인 채 앱 마운트 시
  `backgroundPort.register()` idempotent 호출(B5 — 재부팅 후 재등록).
- [X] T024a [P] [US1] `__tests__/ui/auto-diary-wiring.test.tsx`(또는
  T023 스위트에 케이스 추가)를 만든다 — contracts/auto-diary-settings.md
  S6·FR-009의 부수 효과 배선을 mock `backgroundPort`로 검사한다:
  (1) 토글 끔 → `unregister()` 정확히 1회, `register()`·`reschedule()`
  미호출. (2) 토글 켬(권한 granted mock) → save 후 `register()` 1회.
  (3) 목표 시각 변경(enabled 유지) → `reschedule()` 1회. (4)
  `batteryExceptionPrompted: true`인 상태로 토글 켬 →
  `batteryExceptionPort.requestException()` **미호출**(FR-010 MUST
  NOT). 이 시점엔 실패해야 한다(T024 배선 전).
- [X] T025 [US1] `.maestro/scheduled-diary-notification.yml`에 US1
  흐름을 채운다 — 설정 화면이 뜨고, 토글·시각 선택 UI가 있고, 근사치
  안내 문구(`.*무렵.*`)와 배터리 상시 링크(`.*배터리 설정.*`)가
  화면에 있다(정규식 부분 매칭, AGENTS.md).

**Checkpoint**: `npm test`가 T016·T017·T023·T024a를 통과시킨다.
`AutoDiarySettingsScreen`에서 시각을 고르고 자동 생성을 켤 수 있다.
전역 태스크가 등록된다. **quickstart.md §2·§5 실기기 검증은 이
시점에서 가능**(US2 알림 없이도 "일기가 자동으로 생겼는가"는
목록으로 확인) — 단 debug 한정, release 재확인은 T054.

---

## Phase 4: User Story 2 - 완성되면 알림이 오고, 눌러서 바로 본다 (Priority: P1)

**Goal**: 자동 생성이 성공하면 로컬 알림이 뜨고, 누르면 앱이 열리며
방금 생성된 일기 상세로 바로 이동한다(목록을 거치지 않는다). 실패엔
알림이 없다. 같은 날짜 중복 알림은 쌓이지 않는다.

**Independent Test**: quickstart.md §3 — 자동 생성 완료를 만들고(§2 또는
§4의 수동 트리거), 알림이 뜨는지·탭 시 정확히 그 날짜 상세로 가는지.
콜드 스타트(`force-stop` 후 탭)도 확인. dedup: 미확인 알림 있을 때
재생성 → 갱신, 확인 후 재시도 → 알림 없음.

### 계약 테스트 먼저

- [X] T026 [P] [US2] `__tests__/schedule/notify.test.ts`를 만든다 —
  contracts/notification.md N1·N9: `decideNotify`의 네 갈래
  (`generation-failed`/`already-acknowledged`/`replace`/`new`),
  `send: false`면 어떤 경우에도 알림 없음. 실패해야 한다.
- [X] T027 [P] [US2]
  `__tests__/app/notification-routing.test.ts`를 만든다 — N5·N9:
  `routeFromNotification`이 `null`·형식 불명 → `null`,
  `YYYY-MM-DD`만 `{ day }`로 통과. 실패해야 한다.
- [X] T028 [P] [US2] `__tests__/schedule/notification-port.test.ts`를
  만든다 — N2·N9: 알림 문구 상수 2개(`NOTIFICATION_TITLE`/`BODY`)에
  일기 본문 참조 없음, "즐거운 하루" 류 감상 없음, `present()`가
  `trigger: null`만 씀(소스에 시각 트리거 없음), 캐릭터·모델 정보 없음.
  실패해야 한다.

### 구현

- [X] T029 [P] [US2] `src/schedule/notify.ts`를 만든다 —
  contracts/notification.md N1: `decideNotify` 순수 함수와 `NotifyDecision`
  타입. 문구는 만들지 않는다(어댑터가 상수를 쓴다). T026을 통과시킨다.
- [X] T030 [P] [US2] `src/app/notification-routing.ts`를 만든다 —
  N5: `routeFromNotification(response): { day } | null` 순수 함수.
  `expo-notifications`의 `NotificationResponse` 타입만 참조, 화면
  전이는 안 한다. T027을 통과시킨다.
- [X] T031 [US2] `src/schedule/notification-port.ts`를 만든다 —
  contracts/notification.md N2·N3: `NotificationPort` 인터페이스,
  고정 문구 상수 2개, `expoNotificationPort()`(지연 import
  `expo-notifications`, `ensureChannel`=`setNotificationChannelAsync
  ("diary-completed", { importance: HIGH })`, `requestPermission`,
  `present(day)`=`scheduleNotificationAsync({ content: { title, body,
  data: { day } }, trigger: null })` 반환값은 identifier,
  `dismiss(id)`, `lastResponse()`, `onResponse(handler)`). T028을
  통과시킨다.
- [X] T032 [US2] `src/schedule/task.ts`의 성공 경로에 알림 발송을
  배선한다 — contracts/background-generation.md B2-8, notification.md
  N4: `pipeline.run()`이 `result.ok === true`면 `loadNotifiedState()` →
  그 날짜 엔트리로 `decideNotify({ day, generationSucceeded: true,
  notified })` → `send` 갈래별로 `port.dismiss()`(replace 모드) +
  `port.present(day)` → `saveNotifiedState()` 갱신(`{ sentAt, acknowledged:
  false, notificationId }`). `result.ok === false`면 `decideNotify`를
  아예 부르지 않는다(이중 방어, N7). T016(이미 존재)이 이 배선을
  재검사하도록 필요 시 케이스 추가.
- [X] T033 [US2] `App.tsx`에 알림 응답 리스너를 배선한다 —
  contracts/notification.md N3·N6: 모듈 로드 시
  `Notifications.setNotificationHandler(...)`(포그라운드 배너,
  research.md §1), 앱 시작 시 `notificationPort.ensureChannel()`,
  마운트 시 `port.lastResponse()` 1회 await → `routeFromNotification`
  → `pendingRoute` 상태, `port.onResponse(r => setPendingRoute(
  routeFromNotification(r)))`(해제 함수 정리). `pendingRoute?.day`를
  `DiaryHomeScreen`에 `initialDay` prop으로 넘긴다.
- [X] T034 [US2] `src/ui/DiaryHomeScreen.tsx`에 `initialDay` prop을
  더한다 — contracts/notification.md N6: `initialDay`가 주어지면
  `initialScreen()`(또는 마운트 effect)이 목록 대신 그 날짜의 `detail`
  상태를 첫 화면으로 만든다(**목록을 거치지 않는다**, FR-006, SC-004).
  `store.load(initialDay)`로 entry를 읽어 `toDetail` 경로 재사용.
  상세 진입 시(이 경로 + 기존 `openItem`) 그 날짜의 `notified` 엔트리를
  `acknowledged: true`로 갱신(FR-007 (2)).
- [X] T035 [P] [US2] `__tests__/ui/DiaryHomeScreen.notification.test.tsx`를
  만든다 — `initialDay`가 주어지면 첫 화면이 목록이 아니라 상세다
  (FR-006), 상세 진입이 `acknowledged`를 갱신한다(mock store로).
- [X] T036 [US2] `src/app/state.ts`(또는 해당 순수 전이 모듈)에
  `initialScreen`이 `initialDay`를 받아 `detail` 상태를 돌려주는 확장을
  더한다 — 006 FR-030 패턴. 순수 함수이므로 `__tests__/app/state.test.ts`에
  케이스 추가(목록 안 거침).
- [X] T037 [US2] `.maestro/scheduled-diary-notification.yml`에 알림
  라우팅 흐름을 더한다 — `data.day`를 심은 알림 발행(테스트 훅 또는
  `adb`) 후 탭 시뮬레이션 → 상세가 바로 뜬다(목록 헤더가 안 보인다).

**Checkpoint**: `npm test`가 T026·T027·T028·T035를 통과시킨다.
**MVP 완성 — US1 + US2**: 시각을 고르면 그 근방에 자동 생성되고,
완료되면 알림이 떠서 눌러 바로 읽는다. quickstart.md §2·§3 실기기
검증 가능 — **debug 한정, release 재확인은 T054**.

---

## Phase 5: User Story 3 - 화면에서 쓰는 것과 자동으로 쓰이는 것이 서로를 방해하지 않는다 (Priority: P2)

**Goal**: 화면 수동 생성과 백그라운드 자동 생성이 같은 날짜에 겹쳐도,
최종적으로 그 날짜의 일기가 정확히 하나이고 파일이 손상되지 않는다.
늦게 시작한 쪽은 조용히 지지 않고 명시적으로 물러난다.

**Independent Test**: quickstart.md §4 — 개발자 탭의 "지금 자동 생성
트리거" 버튼으로, 화면에서 "쓰기"를 누른 직후 겹쳐 트리거. 최종적으로
일기 1개, 손상 없음. `adb logcat`으로 두 실행의 시작/종료 순서 확인.
순수 판정 100회 시뮬레이션(SC-005).

### 계약 테스트 먼저

- [X] T038 [P] [US3] `__tests__/schedule/lock.test.ts`를 만든다 —
  contracts/generation-lock.md L2·L8·L9: `decideAcquire`가 fresh
  잠금은 deny, stale(`STALE_LOCK_MS` 초과)은 덮어쓰기, `isMine`이
  false면 `release`가 남의 잠금을 안 지운다, **100회 무작위 순서
  시뮬레이션에서 두 `granted`가 동시에 유효한 시점 0건**(SC-005).
  실패해야 한다.
- [X] T039 [P] [US3] `__tests__/diary/pipeline.lock.test.ts`를 만든다 —
  contracts/generation-lock.md L5·L8: `PipelineDeps.acquireLock?`가
  **옵셔널**임(주지 않으면 기존 2인자 호출이 그대로 통과, 회귀 없음),
  주면 취득 실패 시 `{ ok: false, stage: "already-running" }`로 즉시
  반환, `finally`에서 `release` 호출, `pipeline.ts`가 `expo-file-system`을
  import하지 않음(파일 통로는 주입). 실패해야 한다.

### 구현

- [X] T040 [P] [US3] `src/schedule/lock.ts`를 만든다 —
  contracts/generation-lock.md L2: `LockRecord` 타입, `STALE_LOCK_MS`
  (5분, export하되 `pipeline.ts`·`task.ts`가 하드코딩 안 하는지 소스
  검사), `decideAcquire`/`isMine` 순수 함수. T038을 통과시킨다.
- [X] T041 [P] [US3] `src/schedule/lock-port.ts`를 만든다 —
  contracts/generation-lock.md L3·L4: `LockPort` 인터페이스,
  `expoLockPort()`(지연 import, `locks/diary-generation.lock`,
  `store.ts`의 `.writing` + `moveSync` 원자적 쓰기 패턴),
  `acquireLock(port, owner, nowMs)`/`releaseLock(port, record)` 조합
  함수.
- [X] T042 [US3] `src/diary/pipeline.ts`에 `acquireLock?` 옵셔널
  확장을 더한다 — contracts/generation-lock.md L5: `PipelineDeps`에
  `acquireLock?: (owner) => Promise<LockHandle | null>`, `run()`에서
  `isDayWritable` 다음·`running.has` 다음에 `deps.acquireLock`가 있으면
  취득 시도, `null`이면 `stop("already-running", "...")`,
  `finally`에서 `running.delete` + `handle?.release()`. **주지 않으면
  기존 동작**(002~019 회귀 없음). T039를 통과시킨다.
- [X] T043 [US3] `src/app/wiring.ts`에 `acquireLock` 배선을 더한다 —
  contracts/generation-lock.md L5: `createAppPipeline()`이 owner-bound
  클로저를 만들어 `createPipeline({ ..., acquireLock })`에 넘긴다.
  화면 경로는 `"screen"`, 태스크 경로는 `"background"`. `Date.now()`는
  여기서 부른다(순수 `decideAcquire`는 `nowMs` 인자). `WiringDeps`에
  잠금 통로 주입 지점 추가(테스트가 기기 없이 갈아끼움).
- [X] T044 [US3] `src/schedule/task.ts`가 `wiring.ts` 경로로 잠금을
  얻도록 확인·조정한다 — T043의 `createAppPipeline()`이 이미
  `"background"` owner로 배선하므로 `task.ts`는 추가 작업 없이
  `pipeline.run()`만 부른다. 취득 실패로 인한 `already-running` 결과 →
  `runAutoDiaryTask`가 `"skipped"` 반환(B2-7, L6 — 다음 콜백 재시도).
- [X] T045 [US3] `src/ui/DiaryHomeScreen.tsx`의 `already-running` 처리
  경로를 확인한다 — contracts/generation-lock.md L6: 잠금 취득 실패도
  기존 `already-running` stage로 오므로, 화면이 "이미 쓰는 중" 안내를
  보이거나 진행 중 결과를 기다린다(User Story 3 Scenario 2). 기존
  `already-running` 화면 문구가 이 경우도 자연스럽게 덮는지 확인,
  아니면 문구만 조정(새 화면 상태를 만들지 않는다).
- [X] T046 [US3] 개발자 탭(dev 게이트)에 "지금 자동 생성 트리거"
  디버그 버튼을 더한다 — quickstart.md §4: `runAutoDiaryTask()`를 직접
  부른다(019 하네스의 "지금 즉시 트리거"와 같은 목적, `task.ts` 로직
  100% 재사용). `showsOnScreen(environment)` 게이트 안에만
  (`DiagnosticsScreen` 또는 개발자 탭), prod에서 닿지 않는다.
- [X] T047 [US3] `.maestro/scheduled-diary-notification.yml`에 경합
  흐름 자리를 더한다(실기기에서 시각을 못 바꾸는 제약상 최소한:
  개발자 탭의 트리거 버튼이 존재하고, 눌러도 크래시하지 않는다).

**Checkpoint**: `npm test`가 T038·T039를 통과시킨다. `lock.test.ts`
100회 시뮬레이션이 SC-005를 증명한다. quickstart.md §4 실기기 검증
(경합 재현 + narrative 백그라운드 완주 시간 측정) 가능.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 여러 스토리에 걸친 마감과 실기기 검증.

- [X] T048 [P] `__tests__/schedule/` 전체에 위반 주입 케이스를
  보강한다 — contracts/의 각 "위반 주입" 표(D6, B8, N9, L8, S8, E7)에서
  아직 테스트로 옮기지 않은 항목을 채운다. 특히 소스 문자열 검사
  (007·009·012 관례): `WINDOW_HOURS`/`STALE_LOCK_MS` 미노출,
  `new Date()` 부재, 알림 문구의 본문·감상 부재.
- [X] T049 [P] `scripts/constitution-rules.ts`의 `checkScheduleFile`
  (T005에서 개명)에 위반 주입을 해본다 — `src/schedule/` 파일이 임시로
  `diary/acceptance`나 `backend.generate()`를 참조하도록 고쳐 헌법
  검사가 잡는지 확인하고 되돌린다(007~019 전체의 공통 관례).
- [X] T050 `pruneNotified` 호출 지점을 확정한다 —
  contracts/auto-diary-settings.md S5: `loadNotifiedState`가 load 시
  자동 적용할지 명시적으로만 부를지. `task.ts`의 알림 발송 직후 또는
  `App.tsx` 시작 시 1회. `keepFrom`은 `selectableDays(now)`의 가장
  오래된 값에서 며칠 더 뺀 여유값.
- [X] T051 `AGENTS.md`에 020의 핵심 결론을 짧게 추가한다(저장소 관례,
  019가 남긴 자리) — "020이 019 하네스를 제거하고 제품 경로로
  대체했다", "스케줄·알림·잠금의 순수 판정은 `src/schedule/`에,
  기기 통로는 `*-port.ts`에", "경합은 `pipeline.run()`의 옵셔널
  `acquireLock?` + 파일 잠금 + stale 5분", 그리고 **실기기 검증에서
  실제로 관측된 값**(SC-003 실측, narrative 백그라운드 완주 시간,
  배터리 인텐트가 실제 도착한 제조사 설정 화면).
- [X] T052 `npm run lint`와 `npm test`를 전부 돌려 초록불 확인 —
  `jest-projects.test.ts`의 파일 수 검사(`> 40`)가 `src/schedule/`
  테스트 추가·`src/spike/` 테스트 제거 후에도 통과하는지, 헌법 검사·
  prettier·tsc 전부 클린인지.
- [ ] T053 **debug 실기기 검증 — 같은 세션 확인** — quickstart.md
  §2b·§3·§4를 수행한다. SC-001(근사치 문구만으로 이해되는가, 사람
  판단), SC-004(알림 탭 1회로 상세 도달), SC-005(경합 1회 재현 —
  최종 일기 1개·손상 없음), SC-006(캐릭터 미준비로 자동 생성 실패 시
  알림 0건). narrative 백그라운드 완주 시간을 재고 4분 초과면
  `lock.ts`의 `STALE_LOCK_MS`를 재검토한다(generation-lock.md L7 —
  **게이트: 이 측정 없이 T054로 넘어가지 않는다**).
- [ ] T053a **debug 실기기 검증 — SC-003 (배터리 예외 라운드)** —
  quickstart.md §2c. `adb shell dumpsys deviceidle whitelist
  +com.anonymous.alpharium`로 예외를 준 뒤(019 §8 방식), 목표 시각을
  현재+몇 분으로 맞추고 화면을 끈 채 관측한다. **MUST**: 목표 시각
  으로부터 1시간 이내에 자동 생성이 최소 1회 시도된다. **SHOULD**:
  최소 3회의 트리거된 실행을 모아 그 과반이 목표 시각으로부터 40분
  이내였는가(019 표본 2회 10분·32분과 대조). 표본이 3회에 못 미치면
  "best-effort, 원시값만 기록"으로 남긴다(spec SC-003이 이미 관측
  지향값임을 명시).
- [ ] T053b **debug 실기기 검증 — SC-002 (24시간 무예외 소크)** —
  quickstart.md §2c 별도 라운드. `adb shell dumpsys deviceidle
  whitelist -com.anonymous.alpharium`로 예외를 해제하고 기기를 실제로
  24시간 이상 방치한다(중간에 화면을 켜면 Doze 조건이 깨진다 — 019
  research §7). **MUST**: 목표 시각이 지난 뒤 24시간 안에 자동 생성이
  최소 1회 시도된다(019 최악 19시간 33분과 대조). `dumpsys
  jobscheduler`의 `Minimum latency`가 정확히 전달됐는지 함께 확인한다.
- [ ] T054 **release 재확인** — quickstart.md §6. `expo prebuild
  --clean` → 서명 키 되돌리기 → `assembleRelease`. 매니페스트에
  `POST_NOTIFICATIONS`·`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`가 있는지
  (`adb shell dumpsys package`), Metro 없이 자동 생성 1회 + 알림 탭이
  R8/ProGuard에서 `expo-notifications`·`expo-intent-launcher` JNI
  심볼과 함께 도는지. 「이 빌드는 잘못 만들어졌다」가 아닌지.
- [ ] T055 `npm run test:device`로 `.maestro/scheduled-diary-notification.yml`
  이 실기기에서 통과하는지 확인한다(`FLOWS` 등록됨 — T007).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존 없음. 즉시 시작. T003~T006(스파이크 제거)은
  서로 병렬, T001(의존 설치)·T002(config plugin)와도 병렬 가능.
- **Foundational (Phase 2)**: Setup 완료에 의존. **모든 US를 막는다.**
  T012~T014는 병렬, T015는 T014(`pickRetryDay`)에 의존.
- **User Story 1 (Phase 3)**: Foundational 완료 후 시작. US2·US3에
  의존하지 않는다.
- **User Story 2 (Phase 4)**: Foundational 완료 후 시작. **US1의
  `task.ts`(T019)에 알림 발송을 얹으므로**(T032) US1의 T019가 먼저
  있어야 한다 — 완전 독립은 아니나, US1 없이도 알림 판정·라우팅
  (T029·T030·T034)은 독립 테스트 가능.
- **User Story 3 (Phase 5)**: Foundational 완료 후 시작. `pipeline.ts`
  확장(T042)은 US1·US2와 다른 파일이라 병렬 가능하나, `wiring.ts`
  배선(T043)이 US1의 `task.ts`·US2의 알림과 같은 조립 경로를 건드리므로
  US1·US2 이후가 안전하다.
- **Polish (Phase 6)**: 원하는 US가 모두 끝난 뒤.

### User Story Dependencies

- **US1 (P1)**: Foundational 후 시작. 다른 스토리 의존 없음.
- **US2 (P1)**: Foundational 후 시작. `task.ts` 성공 경로 배선(T032)은
  US1 T019에 의존. 나머지(판정·라우팅·화면)는 독립.
- **US3 (P2)**: Foundational 후 시작. `pipeline.ts`·`lock.ts`는 독립,
  `wiring.ts`·`DiaryHomeScreen` 배선은 US1·US2 이후 권장.

### Within Each User Story

- 계약 테스트를 먼저 쓰고 **실패를 확인**한 뒤 구현한다(헌법 「개발
  방식」 MUST).
- 순수 함수(`decision`/`retry`/`notify`/`lock`) → 기기 통로(`*-port`)
  → 조합(`task.ts`) → 화면 배선(`App.tsx`/`DiaryHomeScreen`).
- 스토리 완료 후 다음 우선순위로.

### Parallel Opportunities

- Setup: T001·T002와 T003·T004·T005·T006이 병렬(다른 파일).
- Foundational: T008~T011(테스트 4개) 병렬, T012~T014(구현 3개) 병렬.
- US1: T016·T017(테스트) 병렬, T018·T020·T021(port·battery) 병렬,
  T023·T024a(화면·배선 테스트)는 T022·T024와 별도.
- US2: T026·T027·T028(테스트 3개) 병렬, T029·T030(순수 2개) 병렬.
- US3: T038·T039(테스트) 병렬, T040·T041(lock·lock-port) 병렬.
- Polish: T048·T049 병렬.
- 팀이 있으면 Foundational 후 US1·US2·US3를 세 사람이 나눌 수 있으나,
  `wiring.ts`·`task.ts`·`App.tsx`가 공유 파일이라 그 세 파일의 배선
  태스크(T024·T032·T033·T043·T044)는 직렬로 조정해야 한다.

---

## Parallel Example: User Story 1

```bash
# 계약 테스트를 먼저, 함께 (실패 확인):
Task: "background-generation.test.ts 계약 테스트 (T016)"
Task: "background-port.test.ts 계약 테스트 (T017)"
Task: "battery-exception-port.test.ts 계약 테스트 (T021)"

# 기기 통로를 함께 (다른 파일):
Task: "src/schedule/background-port.ts 구현 (T018)"
Task: "src/schedule/battery-exception-port.ts 구현 (T020)"
```

---

## Implementation Strategy

### MVP = User Story 1 + User Story 2 (둘 다 P1)

spec.md가 명시했다 — "시각 없이 알림만, 알림 없이 시각만으로는 이
기능이 완성되지 않는다". 따라서:

1. Phase 1: Setup (의존 설치, 스파이크 제거, 매니페스트 권한).
2. Phase 2: Foundational (스케줄·설정 순수 판정 — 모든 US를 막는다).
3. Phase 3: US1 (설정 화면 + 백그라운드 자동 생성).
4. Phase 4: US2 (완료 알림 + 탭 라우팅).
5. **STOP and VALIDATE**: quickstart.md §2·§3 실기기 — 시각을 고르면
   그 근방에 생기고, 완료되면 알림이 떠 눌러 읽는다.
6. 이 시점에서 배포 가능한 최소 기능.

### Incremental Delivery

1. Setup + Foundational → 기반 완성.
2. US1 → 실기기 §2·§5 → "자동으로 쓰인다" 데모.
3. US2 → 실기기 §3 → "알려주고, 눌러 본다" 데모 (MVP!).
4. US3 → 실기기 §4 → "겹쳐도 안 깨진다" 데모.
5. Polish → 실기기 전체 검증 + release 재확인 + AGENTS.md 기록.

### Parallel Team Strategy

- Foundational까지 함께.
- 이후 Developer A: US1(설정·태스크), Developer B: US2(알림·라우팅),
  Developer C: US3(잠금).
- `wiring.ts`·`task.ts`·`App.tsx` 배선 태스크만 직렬 조정(공유 파일).

---

## Notes

- `[P]` = 다른 파일, 미완료 작업 의존 없음.
- `[Story]` 라벨은 추적용 — Setup·Foundational·Polish는 라벨 없음.
- **계약 테스트는 소스 선언을 직접 읽는다**(007·009·012 관례) — jest가
  타입을 지우므로 `tsc`만 잡는 위반(옵셔널 여부, `new Date()` 부재,
  상수 미노출)이 있다.
- **위반 주입으로 방어를 검증한다**(007~019 공통) — 새 규칙마다 실제로
  어겨 보고 테스트·헌법 검사가 잡는지 확인.
- 커밋 메시지는 한국어(헌법 「개발 방식」).
- 각 태스크 또는 논리적 묶음 후 커밋. 체크포인트에서 멈춰 스토리를
  독립 검증.
- 피할 것: `pipeline.ts`가 `expo-file-system`을 직접 import(store 통해서만),
  알림 문구에 일기 본문·감상, `AutoDiarySettings`에 실행 이력 필드,
  스케줄 판정이 04:00·3일을 다시 계산(day-boundary.ts 통해서만),
  `src/schedule/`가 `diary/acceptance`·`backend.generate`에 직접 닿기.
