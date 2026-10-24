# Tasks: 안드로이드 배터리 예외 인지

**Input**: `specs/104-battery-exception-awareness/` — plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 이 저장소는 계약을 먼저 정하고 테스트를 먼저 쓴다(AGENTS 「작업 습관」). 모든 구현 태스크 앞에 실패하는 테스트 태스크를 둔다. 계약 테스트는 주석을 먼저 걷어내고 소스를 읽는다. `npm test`는 기기 없이 돈다.

**Organization**: 사용자 스토리별(US1·US2 P1, US3·US4 P2). `[P]`는 다른 파일이고 미완료 태스크에 기대지 않는다.

## Phase 1: Setup

- [X] T001 `git branch --show-current`가 `104-battery-exception-awareness`인지 확인하고, `design/DESIGN.md`를 읽는다(홈 안내 화면 작업 전 필수 — AGENTS)
- [X] T002 `npx expo install expo-battery`로 `package.json`·`package-lock.json`에 `expo-battery`(SDK 57 호환 `~57.0.3`)를 더하고 `npx expo install --check`가 통과하는지 본다
- [X] T003 `__tests__/config/promise-copy.test.ts` FX1의 「expo-battery를 들이지 않는다」(085 FR-019 방어)를 새 규칙으로 고친다 — `expo-battery`는 의존성에 있어도 되고, 대신 `src/` 전체에서 `expo-battery`를 부르는 파일이 `src/schedule/battery-exception-port.ts` 하나뿐이며 `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`·정확 알람 권한을 선언하지 않는다(앞 두 `it`은 그대로). 이 태스크가 T002 직후 같은 변경 안에 있어야 `npm test`가 깨지지 않는다
- [X] T004 `expo-battery`가 jest(`logic`·`ui`)에서 import 가능한지 확인한다 — 네이티브 모듈이라 통로 테스트는 `loadBattery`를 주입해 가짜로 돈다. 필요하면 `package.json`의 `jest` 설정(`moduleNameMapper`·`setupFiles`) 또는 `jest/setup-ui.ts`에 `expo-battery` 대역을 더한다

## Phase 2: Foundational (US1·US3·US4가 모두 쓴다)

**⚠️ 이 단계가 끝나야 사용자 스토리를 시작한다**

- [X] T005 [P] 기존 `__tests__/schedule/battery-exception-port.test.ts`에 BE1~BE6 테스트를 먼저 쓴다 — 안드로이드 `true`→`restricted`·`false`→`exempt`, 던짐·모듈 로드 실패→`unknown`, iOS는 `loadBattery`를 부르지 않고 `unknown`, `openSettingsList()` 불변, 소스 계약(주석 제거 후 `expo-battery` import는 이 파일 하나, `await import("react-native")` 없음). 실패하는 것을 확인한다
- [X] T006 `src/schedule/battery-exception-port.ts`에 `BatteryExceptionStatus = "exempt" | "restricted" | "unknown"`과 `BatteryExceptionPort.readStatus()`를 더한다(안드로이드만 `expo-battery`의 `isBatteryOptimizationEnabledAsync()`를 호출 시점에 지연 로드, 플랫폼은 `appPlatform`과 호출 시점 `require("react-native")`, 던지지 않음, `loadBattery`·`platform` 주입 가능). T005 통과

**Checkpoint**: 읽기 통로 완성

## Phase 3: User Story 1 — 백그라운드가 쓸 수 있는 기기에서는 완성 알림만 받는다 (P1) 🎯 MVP

**Goal**: `exempt`일 때 쓸 차례 알림이 정각 + 30분에 걸려, 그 안에 저장되면 알림 없이 완성 알림만 온다. 저장된 뒤에만 거두는 안전장치는 그대로다.

**Independent Test**: 계획·맞추기 테스트로 `exempt`→+30분, 저장 뒤 예약이 거둬지고 저장 전에는 남는 것을 확인하고, SM-S901N에서 quickstart Q3·Q4.

- [X] T007 [P] [US1] `__tests__/schedule/reminder-plan.test.ts`에 RD1~RD5 테스트를 먼저 쓴다 — `reminderDelayFor`(`exempt`=30, 그 밖=0, `REMINDER_DELAY_MINUTES`=30), `planReminders`의 `delayMinutes`가 `at`에만 더해지고 `id`·`day`·`title`은 정각 기준 그대로, 범위 밖(음수·60·소수·NaN)은 `RangeError`, 정각 이전·정각+delay 이후면 오늘 발화가 계획에 듦, 오전 목표 「그날/어제」 매핑 불변. 기존 RP1~RP8은 `delayMinutes: 0`으로 갱신해 그대로 통과해야 한다
- [X] T008 [US1] `src/schedule/reminder-plan.ts`에 `REMINDER_DELAY_MINUTES = 30`(주석: 사람이 정한 값 — 잡 간격 15분 + 쓰기 한도 10분, 측정 아님), `reminderDelayFor(status)`, `planReminders`의 `delayMinutes`(0 이상 60 미만 정수, 아니면 `RangeError`)를 구현한다. `at = 정각 + delay`, 건너뜀 판정은 지연이 적용된 시각 기준(`fire.getTime() <= now`). T007 통과
- [X] T009 [P] [US1] `__tests__/schedule/reminders.test.ts`와 `reminder-deps.test.ts`에 RC9~RC13·RD6 테스트를 먼저 쓴다 — `ReminderDeps.loadBatteryStatus`가 던지면 `unknown`(맞추기 계속), `exempt`면 계획 `at`이 +30분, 설정 꺼짐이면 상태를 읽지 않음, 걸린 정각 예약이 `exempt`로 +30분으로 바뀜, **조립(RC13)**: `exempt` 예약이 쓰기 저장(일기 목록에 날 생김) 뒤 맞추기에서 거둬지고 저장 전에는 남음, **RC12**: 어떤 상태에서도 `writtenDays`에 없는 날의 예약은 취소되지 않음, `expoReminderDeps()`의 `loadBatteryStatus`가 덮을 수 있는 `batteryPort.readStatus()`를 부름
- [X] T010 [US1] `src/schedule/reminders.ts`의 `ReminderDeps`에 `loadBatteryStatus`를 더하고 `reconcileOnce`가 `reminderDelayFor(status)`를 `planReminders`에 넘기게 한다(읽기 실패는 `unknown`, 설정이 꺼졌으면 읽지 않음). 거두는 로직(RC12)은 건드리지 않는다. T009 중 reminders 테스트 통과
- [X] T011 [US1] `src/schedule/reminder-deps.ts`의 `expoReminderDeps`에 `batteryPort` 덮어쓰기와 `loadBatteryStatus`(`expoBatteryExceptionPort().readStatus()`)를 더한다. T009 중 deps 테스트 통과
- [X] T012 [US1] 위반 주입으로 방어를 검증한다 — ① `reminderDelayFor`를 `restricted`에도 30으로 바꿔 T007·T009이 실패하는지, ② 맞추기의 취소 조건을 「쓰는 중」 기준으로 바꿔 RC12가 실패하는지 확인한 뒤 되돌린다(치환이 적용됐는지 먼저 단언)

**Checkpoint**: 알림 지연 동작이 기기 없이 검증된다 — MVP

## Phase 4: User Story 2 — 예외가 없거나 모르면 알림은 종전처럼 제때 간다 (P1)

**Goal**: `restricted`·`unknown`·iOS는 이 변경 전과 같은 정각 알림이다. 상태가 바뀌면 예약이 다시 맞춰진다.

**Independent Test**: 세 상태에서 같은 설정의 계획이 정각인지, 상태 변경·전경 복귀·업데이트 뒤 재예약이 되는지.

- [X] T013 [P] [US2] `__tests__/schedule/reminders.test.ts`에 SC-003·SC-007 테스트를 더한다 — `restricted`·`unknown`·읽기 실패·iOS에서 모든 `at`이 이 변경 전과 같은 정각(전수), 읽기 실패에도 예약이 걸림, 상태가 `restricted`→`exempt`→`restricted`로 바뀌면 각 맞추기에서 `at`이 +30분/정각으로 되돌아오고 같은 `id`의 예약이 하나만 남음
- [X] T014 [P] [US2] `__tests__/app/use-reminder-sync.test.tsx`에 전경 복귀(`AppState → active`)에서 맞추기가 다시 불리는지(상태 변경 반영 경로, 기존 효과 B) 단언을 더한다 — 새 호출 시점을 만들지 않았음을 확인한다
- [X] T015 [US2] T013·T014이 T008·T010·T011만으로 통과하는지 확인하고, 실패하는 갈래가 있으면 `src/schedule/reminders.ts`를 고친다(추가 구현이 없어야 정상 — 있으면 plan R6·R7을 재검토)

**Checkpoint**: US1+US2 — 모든 상태에서 알림 시각이 spec대로

## Phase 5: User Story 3 — 설정에서 배터리 예외 상태를 본다 (P2)

**Goal**: 설정 배터리 행에 「허용됨」/「허용 안 함」 꼬리표, 모르면 없음, 돌아오면 갱신.

**Independent Test**: 꼬리표 판정·훅·설정 화면 테스트와 SM-S901N quickstart Q1.

- [X] T016 [P] [US3] `__tests__/app/permission-tags.test.ts`에 PT1·PT7 테스트를 먼저 쓴다 — `permissionTagFor("battery", facts)`가 `exempt`→`allowed`·`restricted`→`denied`·`unknown`→`unread`, 기존 세 행 판정 불변
- [X] T017 [P] [US3] `__tests__/ui/settings-screen.test.tsx`(`usePermissionTags` 훅 케이스가 여기 있다)에 PT2 테스트를 더한다 — 읽기 전·실패는 `battery: "unread"`, 마운트와 `AppState → active`마다 `battery`를 다시 읽음. `__tests__/ui/settings-battery-row.test.tsx`에 PT4~PT6을 더한다 — `settings-tag-battery`가 허용됨/허용 안 함/없음, 보조 줄·누름 동작 불변, iOS는 꼬리표 없이 화살표만. `PermissionTags` 타입에 `battery`가 필수가 되므로 `permissionTags` 픽스처를 쓰는 기존 테스트(`settings-notification-off`·`settings-policy-rows`·`developer-off`·`font-license`·`settings-license-row`·`settings-screen`·`settings-battery-row`·`settings-this-phone`)도 `battery: "unread"`로 맞춘다
- [X] T018 [US3] `src/app/permission-tags.ts`에 `PermissionFacts.battery: BatteryExceptionStatus`, `TaggedPermission += "battery"`, `permissionTagFor`의 battery 갈래를 구현하고 머리 주석의 「배터리는 상태를 읽을 수 없어 꼬리표가 없다(FR-025)」를 고친다. T016 통과
- [X] T019 [US3] `src/ui/use-permission-tags.ts`의 `UNREAD`와 `setTags`에 `battery`를 더한다. T017의 훅 테스트 통과
- [X] T020 [US3] `src/ui/SettingsScreen.tsx` 배터리 행의 `trailing`을 `PermissionTrailing`(`tag={permissionTags.battery}`, testID `settings-tag-battery`)으로 바꾼다. T017의 화면 테스트 통과
- [X] T021 [US3] `App.tsx`의 `readPermissions`에 `battery: await onboardingPorts.battery.readStatus().catch(unknown)`를 더한다(PT3). 관련 `App` 조립 테스트가 있으면 갱신한다

**Checkpoint**: 설정에서 상태가 보인다

## Phase 6: User Story 4 — 백그라운드가 못 써서 열어야 했던 순간 예외를 권한다 (P2)

**Goal**: 예외가 없는 채 앱 열기 자동 쓰기가 저장되면 홈에 한 줄 + [설정 열기]·[닫기], 7일간 숨김, 예외를 주고 돌아오면 사라짐.

**Independent Test**: 판정·기록·훅·화면 테스트와 SM-S901N quickstart Q2.

- [X] T022 [P] [US4] `__tests__/app/battery-notice.test.ts`에 BN1~BN4 테스트를 먼저 쓴다 — 안드로이드 && `restricted` && (닫은 적 없음 또는 7일 이상 경과)만 참, 정확히 7일 경계, 미래 `dismissedAt`·`"unreadable"`은 거짓, iOS·`exempt`·`unknown` 거짓, 하루 경계·`getHours` 미사용(소스 계약)
- [X] T023 [P] [US4] `__tests__/app/battery-notice-store.test.ts`에 BS1~BS3 테스트를 먼저 쓴다 — 없음·깨짐→`null`, 통로 예외→`"unreadable"`, `saveDismissedAt`이 `{at}`로 덮음, 기기 통로는 `preferences/battery-notice-dismissed.json`·`File` 동기 메서드만(소스 계약), `scripts/layer1/baseline.ts` 표에 파일이 있음(G-1 가드 테스트 통과)
- [X] T024 [US4] `src/app/battery-notice.ts`를 구현한다(`BATTERY_NOTICE_HIDE_MS`, `shouldShowBatteryNotice` — `now` 인자, 순수). T022 통과
- [X] T025 [US4] `src/app/battery-notice-store.ts`를 구현한다(`BatteryNoticeStorePort`, `loadDismissedAt`, `saveDismissedAt`, `expoBatteryNoticeStorePort` — `skip-store.ts`의 임시 파일 교체 방식, 지연 import). T023의 store 테스트 통과
- [X] T026 [US4] `scripts/layer1/baseline.ts`의 설정 파일 표에 `battery-notice-dismissed.json` 한 줄(`delete`, 사유: 홈 배터리 안내를 닫은 시각 기록 104)과 `specs/069-e2e-layer1-screen-flows/contracts/baseline-state.md` 표 한 줄을 더한다. G-1 드리프트 가드 통과
- [X] T027 [P] [US4] `__tests__/ui/use-battery-notice.test.tsx`에 UB1~UB7 테스트를 먼저 쓴다 — 저장 신호 후 판정이 참이면 보임, 거짓·읽기 실패면 안 보임, 떠 있는 동안 `AppState → active`에 `restricted` 아니면 숨김(기록 없음), `onDismiss`가 `now`를 기록하고 숨김(기록 실패는 삼킴), `onOpenSettings`가 `openSettingsList` 호출, 중복 신호는 그대로, iOS는 어떤 읽기도 안 함
- [X] T028 [US4] `src/app/use-battery-notice.ts`를 구현한다(`expo-*`를 모름, 통로·`now`·`platform` 주입, `AppState`는 다시 읽는 때만 고름). T027 통과
- [X] T029 [P] [US4] `src/i18n/catalogs/ko/`에 안내 문구(「배터리 사용 제한을 풀어 두면 화면이 꺼진 채로도 일기를 써드릴 수 있어요」)와 버튼 「설정 열기」·「닫기」(기존 키가 있으면 재사용)를 더하고 `__tests__/i18n/ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`에 올린다
- [X] T030 [P] [US4] `__tests__/ui/home-auto-write.test.tsx`(HS1 — 자동 쓰기 홈)와 `__tests__/ui/diary-list.test.tsx`(HS2)에 HS1·HS2를 먼저 쓴다 — `generate(…, {auto:true})`가 `result.ok`일 때만 `onAutoWriteSaved`가 불리고 실패·그만두기·`already-running`·`auto` 없는 「쓰기」에는 불리지 않음, `DiaryListScreen`이 `batteryNotice`를 쓰는 중이 아닐 때만 그리며 버튼 testID(`home-battery-notice-open`·`-dismiss`)와 접근성 라벨을 가짐
- [X] T031 [US4] `src/ui/DiaryListScreen.tsx`에 `BatteryNotice` 한 줄(문구·콜백은 props, 쓰는 중 갈래 제외, `design/DESIGN.md` 토큰·최소 누름 영역)을 더하고, `src/ui/DiaryHomeScreen.tsx`의 `generate` 성공 분기에 `options.auto === true && result.ok`일 때 `onAutoWriteSaved?.(params.day)`를, props에 `onAutoWriteSaved`·`batteryNotice`를 더한다. T030 통과
- [X] T032 [US4] `App.tsx`에서 `useBatteryNotice`를 배선한다(`readStatus`는 `onboardingPorts.battery`, `openSettingsList`, 저장소 `expoBatteryNoticeStorePort()`, `platform=appPlatform(Platform.OS)`, 문구는 카탈로그) — `onAutoWriteSaved`와 `batteryNotice`를 홈에 넘긴다
- [X] T033 [US4] 위반 주입 — 판정에서 `"unreadable"`을 참으로 바꿔 T022이 실패하는지, `generate`의 `auto` 조건을 지워 「쓰기」 버튼 뒤에도 불려 T030가 실패하는지 확인한 뒤 되돌린다

**Checkpoint**: 모든 스토리가 독립적으로 동작

## Phase 7: Polish & Cross-Cutting

- [X] T034 [P] 문서 정합(FR-018) — `specs/085-write-reminder/spec.md` FR-019와 `research.md`의 「예외 여부를 읽는 통로를 들이지 않는다」, `specs/055-*`(설정 권한 꼬리표)의 배터리 꼬리표 없음 서술에 「104가 뒤집음」을 덧대지 않고 고치거나 지운다(AGENTS: 앞의 서술을 고친다). `AGENTS.md`의 「자동 쓰기·알림·기록」 줄에 104 한 줄(예외 상태에 따른 쓸 차례 알림 지연 30분·안전장치·설정 꼬리표·홈 안내)
- [X] T035 [P] 소스 계약 테스트를 더한다(`__tests__/app/battery-notice-source.test.ts`, 주석을 걷어낸 뒤 소스를 읽는다) — 새 화면 한글(`DiaryListScreen`의 안내)은 카탈로그에만(062), `task.ts`와 `use-reminder-sync.ts`가 같은 `expoReminderDeps`를 쓴다(FR-008), `App.tsx`가 `useBatteryNotice`를 배선한다. `expo-battery` 호출 한 곳·권한 부재는 T003이 맡는다. 또 FR-014·FR-016·FR-017 회귀로 기존 `__tests__/onboarding/` 테스트(온보딩 배터리 카드 불변)와 `__tests__/config/promise-copy.test.ts` ST3~ST6(시각 미리보기·배터리 행 보조 줄)과 `notify`·`task-reminder` 테스트가 변경 없이 통과함을 확인한다
- [X] T036 `npm test`와 `npm run lint`(eslint + tsc + 헌법 검사 + prettier)를 실제로 돌려 통과를 확인한다. `tsc` 0이 완료 조건이다. 같은 규칙의 복제가 다른 파일에 있는지 소스를 센다(예: 배터리 행 꼬리표·`TaggedPermission` 소비처)
- [X] T037 (기기 미연결 — `dumpsys` 대신 prebuild 뒤 `gradlew :app:processDebugMainManifest`의 병합 매니페스트에서 `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` 부재와 `expo-battery`가 권한을 더하지 않음을 확인; 기기 쪽 `dumpsys`·설치는 T038에서) `npx expo prebuild --platform android --clean` 뒤 `adb shell dumpsys package com.a810labs.pocketlog`에서 `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` 부재를 확인한다(SC-006). debug APK를 지우지 않고 설치한다(모델 ~2GB 보존)
- [ ] T038 quickstart.md의 실기기 Q1~Q5를 SM-S901N dev에서 수행하고 본 것·못 본 것을 `quickstart.md` 아래에 적는다 — 특히 Q3(헤드리스 읽기 가정). 기기가 없으면 완료로 치지 않고 보고에 못 봤다고 적는다(원칙 V)

## Dependencies & Execution Order

- Phase 1 → Phase 2 → (Phase 3 | Phase 5 | Phase 6는 서로 독립, 모두 Phase 2에 기댄다) → Phase 4(Phase 3에 기댄다) → Phase 7
- US1(MVP) 안: T007→T008, T009→T010→T011, T012은 마지막
- US3: T016·T017 → T018 → T019 → T020 → T021
- US4: T022·T023 → T024·T025 → T026, T027 → T028, T029 → T030 → T031 → T032 → T033. T031은 T029(문구)에 기댄다

## Parallel Examples

- Phase 2: T005 단독 후 T006
- US1: T007 ∥ T009, 이후 T008 ∥ (T010→T011)
- US3 ∥ US4: T016·T017·T022·T023·T027·T029·T030의 테스트 파일은 모두 서로 다르다

## Implementation Strategy

- **MVP = Phase 1~3 (US1)**: 소유자가 본 불편(완성 알림 전에 쓸 차례 알림)이 해소된다. 이 시점에 멈춰도 `restricted`·`unknown`·iOS는 정각이라 안전하다(US2는 그 검증).
- 이어 US2(검증) → US3(꼬리표) → US4(홈 안내) 순으로 늘린다. 각 단계 끝에 `npm test`.
- 실기기 확인(T037·T038)은 구현 전체가 끝난 뒤 한 번에 한다. 하룻밤 소크는 완료 조건이 아니다.

## Phase 8: Convergence

- [X] T039 `src/schedule/battery-exception-port.ts` 머리 주석의 「085는 읽는 통로를 들이지 않았으나 소유자가 2026-10-15에 뒤집었다」를 현재 사실(예외 상태를 읽는 곳은 이 파일 하나이고 지연·꼬리표·안내가 이 값에서 정해진다)만 남기도록 고친다 per FR-018 (partial)
- [X] T040 `__tests__/ui/settings-screen.test.tsx`의 「C4 — 배터리는 꼬리표 없이 보조 줄과 › 만」을 읽지 못한 상태(`battery: "unread"`)의 사실로 이름·단언을 바로잡는다 per FR-009 (partial)

## Phase 9: Convergence

- [X] T041 `specs/085-write-reminder/contracts/write-reminder.md`의 `planReminders` 시그니처(7행)와 deps 목록(20행)을 현재 코드(`delayMinutes` 입력, `loadBatteryStatus` 의존성)에 맞게 고친다 per FR-018 (partial)
