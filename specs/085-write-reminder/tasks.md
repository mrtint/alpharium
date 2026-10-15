# Tasks: 쓸 차례 알림 — 배터리 예외가 없는 사용자에게 완주를 약속하지 않기

**Input**: `/specs/085-write-reminder/`
- [plan.md](./plan.md)
- [spec.md](./spec.md)
- [research.md](./research.md)
- [data-model.md](./data-model.md)
- [contracts/write-reminder.md](./contracts/write-reminder.md)
- [quickstart.md](./quickstart.md)

**Tests**: 필수다. 헌법 「개발 방식」이 계약을 먼저 쓰고 테스트를 먼저 쓰라고 정한다. 구현 태스크마다 그 앞에 실패하는 테스트가 있다.

**Organization**
- 태스크는 스펙의 User Story 순서로 놓였다.
- jest는 `npx jest <경로> --selectProjects logic|ui` 순서로 부른다.
- RNTL 14의 `render`·`renderHook`·`rerender`·`fireEvent`는 Promise를 돌려주므로 `await`한다.

## Phase 1: Setup

- [ ] T001 브랜치와 시작점을 확인한다.
  - `git branch --show-current`가 `085-write-reminder`인지 본다.
  - `npm test`를 한 번 돌려 시작점이 초록인지 기록한다. 실패가 있으면 이 기능의 것이 아님을 적어 둔다.
- [ ] T002 이 기능이 바꾸는 자리를 잠근 기존 계약을 읽는다.
  - `__tests__/schedule/notification-port.test.ts` — 67–78의 `trigger: null`, `trigger: {` 금지, 19–39의 키 집합.
  - `__tests__/schedule/background-generation.test.ts` — 223–411의 `present` 단언.
  - `__tests__/app/app-auto-write-source.test.ts` — OP6·OP7·WP1–WP3.
  - `__tests__/app/use-auto-write-claim.test.tsx`, `__tests__/ui/auto-write-open-assembly.test.tsx`(082 하니스).
  - `__tests__/config/day-boundary-source.test.ts` — DB11 ALLOWED.
  - `__tests__/ui/settings-battery-row.test.tsx`, `__tests__/app/battery-row.test.ts`, `__tests__/app/target-hour.test.ts`(74–80), `__tests__/ui/settings-screen.test.tsx`(65).
  - `__tests__/i18n/ko-golden.test.ts` — G1·G2·`ADDED_AFTER_GOLDEN`, 230 부근의 `PERMISSION_REQUIREMENTS`.
  - SL3(`photoSkipText`).
  - 옛 문구 단언: `__tests__/onboarding/requirements.test.ts`(83–86), Maestro `.maestro/settings-time-place.yml`(106)·`.maestro/scheduled-diary-notification.yml`(66) — `grep -rln "정한 시간대\|일기가 완성돼도\|많이 늦어질\|제때 써요\|일기를 써요. 이미" __tests__ .maestro`.
  - 결과는 `specs/085-write-reminder/research.md`에 「R22 — 기존 계약이 잠그는 자리」 표로 덧붙인다. 줄마다 「파일 · 단언 · 이 기능에서 어떻게 바뀌나」를 적는다.

## Phase 2: Foundational — 문구 자리와 골든 장치

**목적**: 모든 이야기가 쓸 문구 영역과, 옛 값을 바꿀 수 있는 골든 장치를 먼저 세운다.

### Tests (먼저)

- [ ] T003 `__tests__/i18n/ko-golden.test.ts`에 `CHANGED_AFTER_GOLDEN` 장치를 더한다(GD1).
  - 항목 모양: `{ spec: "085", literal?: { from, to }, outputs?: [{ key, path?, from, to }] }`.
  - G1의 비교: 골든 리터럴 집합에 각 `literal.from`이 **있음을 먼저 단언**한다. 그다음 `from`을 빼고 `to`를 넣은 집합을, 현재 집합에서 `ADDED_AFTER_GOLDEN`을 뺀 것과 비교한다.
  - G2의 비교: 골든 출력의 각 `key`(`path`가 있으면 JSON 안의 그 자리)가 `from`임을 먼저 단언한다. 그다음 `to`로 바꿔 비교한다.
  - 항목에는 다음을 넣는다. `from`은 골든 json의 지금 값이고, `to`는 승인 문구다.
    - `permBatteryHint` — 리터럴, 그리고 `SETTINGS_TEXT` 출력의 그 자리.
    - `"매일 ${}쯤 ${} 일기를 써요. 이미 쓴 날은 건너뛰어요."` — 리터럴(`ko-literals.golden.json` 81행), 그리고 `previewSentence` 출력 여덟.
    - 온보딩 넷(FR-024) — 리터럴, 그리고 `PERMISSION_REQUIREMENTS` 출력의 해당 자리.
    - 골든 json을 열어 실제 키 이름과 경로를 확인한다.
  - `ADDED_AFTER_GOLDEN`을 고친다.
    - `"저전력 모드를 끄면 제때 써요"`를 `"저전력 모드가 꺼져 있으면 먼저 써 둘 때가 있어요"`로 바꾼다.
    - T005의 새 리터럴 다섯을 더한다.
  - 실행해서, 카탈로그가 아직 옛 값이라 **실패하는 것을 본다**.

### Implementation

- [ ] T004 카탈로그 값을 바꾼다.
  - `src/i18n/catalogs/ko/settings.ts`
    - `settings.permBatteryHint` = 「제한 없음이면 열지 않아도 먼저 써 둘 때가 있어요」
    - `targetHour.preview` = `` (hourText, day) => `매일 ${hourText}쯤 ${day} 일기를 쓸 차례라고 알려요. 열면 바로 써요. 이미 쓴 날은 건너뛰어요.` ``
  - `src/i18n/catalogs/ko/settings-platform.ts`
    - `permBatteryHintIos` = 「저전력 모드가 꺼져 있으면 먼저 써 둘 때가 있어요」
  - `src/i18n/catalogs/ko/onboarding.ts`
    - `notifications.rationale` = 「쓸 차례와 다 쓴 일기를 알려 드리기 위해 씁니다.」
    - `notifications.ifDenied` = 「쓸 차례도, 다 쓴 일기도 알려 드리지 못해요.」
    - `"battery-exception".rationale` = 「휴대폰이 절전에 들어가도 열지 않아도 먼저 써 둘 수 있게 허용을 요청합니다.」
    - `"battery-exception".ifDenied` = 「앱을 열 때까지 쓰지 못할 수 있어요.」
  - 각 파일의 머리 주석에 「085 — 사실대로(소유자 승인 2026-10-15)」를 적는다.
- [ ] T005 새 영역 `src/i18n/catalogs/ko/reminder.ts`를 만든다.
  - `src/i18n/catalogs/ko/index.ts`에 `reminder`로 등록한다.
  - 넣을 것:
    - `title: (name, month, date) => ` + "`${name}${particleFor(name)} ${month}월 ${date}일 일기를 쓸 차례예요`"
    - `channelName: "일기 쓸 시각 알림"`
    - `notificationOff: "알림이 꺼져 있어 쓸 차례를 알리지 못해요"`
    - `developerLine: (n, month, date, hour) => ` + "`쓸 차례 알림 · ${n}개 예약 · 다음 ${month}월 ${date}일 ${hour}시`"
    - `developerNone: "쓸 차례 알림 · 예약 없음"`
  - 머리 주석에 「보드 밖 — 소유자 승인 2026-10-15(설계문서 §6·spec Clarifications)」와 「일기 내용·감상 없음(020 FR-012)」을 적는다.
  - `as const`를 쓰지 않는다(K1).
  - T003이 통과하고 `npx tsc --noEmit`이 0인지 본다(`Catalog = typeof ko`).
- [ ] T006 옛 문구를 리터럴로 단언한 테스트를 찾아 새 값으로 고친다.
  - 찾기: `grep -rn "제때 써요\|일기를 써요. 이미\|정한 시간대\|일기가 완성돼도\|많이 늦어질" __tests__ .maestro`
  - 해당 파일: `__tests__/app/target-hour.test.ts`, `__tests__/app/battery-row.test.ts`, `__tests__/ui/settings-screen.test.tsx`, `__tests__/ui/settings-battery-row.test.tsx`, `__tests__/onboarding/requirements.test.ts`, `.maestro/settings-time-place.yml`, `.maestro/scheduled-diary-notification.yml`(Maestro는 기기 없이 못 돌리므로 T044에서 한 번 돌린다).
  - `npm test` 전체가 통과하는지 본다.

**Checkpoint**: 문구가 사실대로 바뀌었고, 골든이 그 바뀜을 드러낸다. 골든 json은 `git diff`에 나오지 않는다(GD2).

## Phase 3: User Story 1 — 정한 시각에 쓸 차례를 알린다 (P1) 🎯 MVP

**Goal**: 목표 시각마다 날짜별 예약이 걸리고, 앱이 돌 때마다 다시 맞춰진다. 알림을 누르면 그 날로 열려 「한 번」이 다시 열리고 057이 쓴다. 해당 요구사항: FR-001~FR-010, FR-012, FR-021, FR-022, FR-023.

**Independent Test**
- `npx jest __tests__/schedule/reminder-plan.test.ts __tests__/schedule/reminders.test.ts __tests__/schedule/reminder-port.test.ts __tests__/schedule/reminder-deps.test.ts __tests__/app/notification-behavior.test.ts __tests__/app/reminder-summary.test.ts --selectProjects logic`
- `npx jest __tests__/app/use-reminder-sync.test.tsx __tests__/app/use-auto-write-claim.test.tsx __tests__/ui/reminder-rearm-assembly.test.tsx __tests__/ui/developer-reminder-line.test.tsx --selectProjects ui`
- quickstart §3 A·A′·F·H

### Tests (먼저 — 실패를 본다)

- [ ] T007 [P] [US1] 새 파일 `__tests__/schedule/reminder-plan.test.ts` — RP1·RP2·RP3·RP5·RP6·RP7·RP8.
  - 이 태스크에서 쓴 날은 비워 둔다(RP4는 US2).
  - RP1: 꺼짐이면 `[]`.
  - RP2: 22시 목표에서 `now`가 21:00이면 첫 항목이 오늘 · `at` 오늘 22:00이다. `now`가 22:00 또는 22:30이면 첫 항목이 내일이다.
  - RP3: 7시 목표에서 `now`가 06:00이면 첫 항목 `day`가 어제이고 `at`이 오늘 07:00이다.
  - 7개이고, `day`가 모두 다르다.
  - RP5: 10월 31일 → 11월 1일, 12월 31일 → 1월 1일.
  - RP6: `id`와 `title`.
  - RP8: `name === null`이면 `[]`.
  - RP7(소스 계약, 주석을 걷은 뒤): `new Date()`(인자 없음)가 없고, `getHours(`가 없고, `includesTodayAtHour(`가 있다.
  - `reminderTitle("은동", "2026-10-15")`가 「은동이가 10월 15일 일기를 쓸 차례예요」인지 본다.
  - 모듈이 없어 **실패하는 것을 본다**.
- [ ] T008 [P] [US1] 새 파일 `__tests__/schedule/reminders.test.ts` — RC1·RC3·RC4·RC5·RC6·RC7.
  - 대역 `ReminderPort`와 `prepare`는 호출을 배열에 기록한다.
  - RC1:
    - `prepare`가 먼저 불린다.
    - 걸린 것 셋을 둔다 — 계획과 같은 것 1, `at`이 다른 것 1, 계획에 없는 것 1. 이때 `cancel`은 뒤의 둘, `schedule`은 계획 중 같은 것을 뺀 나머지다.
    - 모든 `cancel`이 모든 `schedule`보다 먼저다. 그 뒤에 `presented`, `dismiss`가 온다.
  - RC3:
    - `prepare`가 던져도 계속한다.
    - `cancel` 하나가 던져도 나머지를 계속한다. `schedule` 하나가 던져도 나머지를 계속한다.
    - `scheduled()`가 던지면 `cancel`은 0번이고 계획 전부를 `schedule`한다.
    - `presented()`가 던져도 던지지 않는다.
  - RC4: 두 번 동시에 부르면, 첫 호출의 마지막 통로 호출이 둘째 호출의 `prepare`보다 먼저다.
  - RC5: 두 번 부르는 사이에 대역 일기 목록을 바꾸면 둘째 계획이 그 목록을 따른다.
  - RC6: `loadSettings`가 던지면 `cancel`·`schedule`·`dismiss`가 모두 0번이다. `listDiaryDays`가 던져도 같다.
  - 꺼짐: 걸린 것은 모두 취소되고, 트레이의 우리 알림은 모두 `dismiss`된다.
  - RC7: 소스 계약 — `reminders.ts`·`reminder-plan.ts`·`reminder-port.ts`(`reminder-deps.ts`는 T010).
  - FX3: `reminders.ts`에 주석을 걷은 뒤 `getPermission`·`getPermissionsAsync`가 없다(FR-016, `reminder-deps.ts`는 T010).
  - 모듈이 없어 **실패하는 것을 본다**.
- [ ] T009 [P] [US1] 새 파일 `__tests__/schedule/reminder-port.test.ts` — RT1~RT4.
  - `jest.mock("expo-notifications", () => ({ ... }))`로 쓰는 함수만 대역한다. 가상 모듈이 아니다(설치돼 있다). 저장소에 선례는 없다.
  - RT2:
    - `schedule`이 넘기는 것을 본다: `identifier`, `content.title`, `content.data`(`{ day, kind: "write-reminder", at }`), `trigger`(`type`이 DATE 값, `date: at`, `channelId: "diary-reminder"`).
    - `content.body`가 없다.
  - RT3:
    - `scheduled()`는 접두사 밖(완성 알림 id)을 거르고 `{ id, day, at, title }`를 준다. `data.at`이 숫자가 아니면 `at: null`이다.
    - `presented()`는 `request.identifier` 접두사로 거른다.
    - 두 함수는 기저 API가 던지면 **던진다**.
  - RT4: `cancel`·`dismiss`는 기저 API가 던져도 던지지 않는다.
  - RT1: 소스 계약(지연 import).
  - **실패하는 것을 본다**.
- [ ] T010 [P] [US1] 새 파일 `__tests__/schedule/reminder-deps.test.ts` — RD1~RD4. 통로 함수는 주입 가능한 꼴로 시험한다(`expoReminderDeps`가 내부에서 쓰는 통로를 인자로 덮을 수 있게 한다).
  - RD2: 설정 통로 `read()`가 던지면 `loadSettings`가 던진다. 깨진 JSON이면 던진다. `null`이면 기본값이다.
  - RD4:
    - 캐릭터가 없으면 `loadName`이 `null`이다.
    - `names`가 주어지면 이름 파일을 읽지 않는다. `undefined`면 읽는다.
    - 이름 파일 읽기가 던지면 기본 이름이다.
  - RC7·FX3의 `reminder-deps.ts` 몫: 주석을 걷은 뒤 `AppState`·`react-native`·`getPermission`·`getPermissionsAsync`가 없다.
  - **실패하는 것을 본다**.
- [ ] T011 [P] [US1] 새 파일 `__tests__/app/notification-behavior.test.ts` — FG1·FG2·RA5.
  - FG1: `data.kind === "write-reminder"`이면 네 값 모두 거짓이다.
  - FG2: 완성 알림(`data: { day }`), `data` 없음, `request` 없음은 배너·목록이 참이고 소리·배지가 거짓이다.
  - RA5: `isWriteReminderResponse`가 쓸 차례 응답에만 참이다. `null`·완성 알림·모양이 깨진 응답은 거짓이다.
  - **실패하는 것을 본다**.
- [ ] T012 [P] [US1] 새 파일 `__tests__/app/reminder-summary.test.ts` — DV1.
  - `[]` → 「쓸 차례 알림 · 예약 없음」.
  - 3개(가장 이른 `at`이 10월 15일 22:00) → 「쓸 차례 알림 · 3개 예약 · 다음 10월 15일 22시」. 순서가 섞여 있어도 가장 이른 것을 고른다.
  - `at === null`이 섞여 있으면 개수에는 세고 「다음」에서는 뺀다.
  - 모두 `null`이면 `undefined`다.
  - **실패하는 것을 본다**.
- [ ] T013 [P] [US1] `__tests__/app/use-auto-write-claim.test.tsx`에 RA1~RA4를 더한다.
  - RA1: 소모한 뒤 `rearmAutoWrite()` → `claimAutoWrite()`가 참이다.
  - RA2: `rearmAutoWrite()` 뒤 `rerender`하면 `claimAutoWrite`의 참조가 바뀐다.
  - RA3: `firstRunTried.current`가 참이거나 `writeBlocked`이면 다시 열어도 거짓이다.
  - RA4: 다시 연 뒤 두 번째 claim은 거짓이다.
  - RA2: `rerender` 뒤에도 `rearmAutoWrite`의 참조는 같다.
  - RA8: 082 CL6(128–133)을 고친다 — 키는 `claimAutoWrite,rearmAutoWrite,spendAutoWrite`, 이름에 「085 FR-023 예외」를 적는다.
  - **실패하는 것을 본다**.
- [ ] T014 [P] [US1] 새 파일 `__tests__/ui/reminder-rearm-assembly.test.tsx` — RA7.
  - 082 `auto-write-open-assembly.test.tsx`의 하니스를 따른다: 진짜 `resolveAutoWrite` + 두 훅 + 진짜 홈 + 진짜 `createPipeline()`과 등록부.
  - 「한 번」을 소모한 실행을 만든다 — 재료 있는 어제를 안 쓴 채로 두고 `spendAutoWrite()`로 소모한다(어제를 써서 소모하면 다시 쓸 날이 없어진다).
  - 쓸 차례 응답을 하니스의 웜 응답 경로로 보낸다. 하니스는 `App.tsx`의 `onResponse` 처리처럼 `isWriteReminderResponse`이면 `rearmAutoWrite()`를 부르고 `AppState` `active`를 흉내 낸다. 그러면 백엔드 `generate`가 1번 불린다.
  - 같은 절차를 완성 알림 응답으로 하면 0번이다.
  - **실패하는 것을 본다**.
- [ ] T015 [P] [US1] 새 파일 `__tests__/app/use-reminder-sync.test.tsx` — SY1·SY2·SY3·SY5.
  - 진짜 `createLiveWrites()`와, 호출 인자와 횟수를 기록하는 대역 `reconcile`을 쓴다.
  - SY1:
    - 마운트에서 정확히 1번.
    - `AppState` `active` 콜백에서 1번 더. `jest.spyOn(AppState, "addEventListener")`로 걸고 복원하지 않는다(AGENTS).
    - 설정 객체 참조가 바뀌면 1번 더. 이름이 바뀌면 1번 더.
  - SY1·SY2: `beginWrite` 직후는 0번이고, `end({ ok: true })` 뒤에 1번이다. `beginWipe` → `end()` 뒤에도 1번이다.
  - SY5: 넘긴 `names`가 `reconcile` 인자에 있다. `names`가 `undefined`면 인자도 `undefined`다.
  - SY3: 언마운트 뒤 `end`를 불러도 0번이다.
  - 모듈이 없어 **실패하는 것을 본다**.
- [ ] T016 [P] [US1] 새 파일 `__tests__/ui/developer-reminder-line.test.tsx` — DV3.
  - `DeveloperScreen`에 `reminderLine="쓸 차례 알림 · 예약 없음"`을 주면 `testID="developer-reminder-line"` 글자가 보이고, `developer-group-failures` 묶음보다 뒤에 있다.
  - `reminderLine`이 없으면 그 testID가 없다.
  - props 모양은 기존 `DeveloperScreen` 테스트를 따른다.
  - **실패하는 것을 본다**.

### Implementation

- [ ] T017 [US1] `reminderTitle`과 계획 파일을 만든다.
  - `src/schedule/notification-text.ts`에 `reminderTitle(name, day)`를 더한다(`text().reminder.title`, `autoWriteDoneText`와 같은 꼴).
  - `src/schedule/reminder-plan.ts`를 만든다.
    - `REMINDER_ID_PREFIX`를 둔다.
    - 타입은 `ReminderPlanEntry { id; day; at; title }`(data-model)이다.
    - `planReminders({ now, settings, writtenDays, name })`:
      - 꺼짐이거나 `name === null`이면 `[]`.
      - 발화 후보를 만든다. `[y, m, d] = dayOf(now)`를 나눈 뒤 `new Date(y, m-1, d + k, targetHour)`로 k = 0..7을 만든다.
      - `getTime() > now.getTime()`인 앞 7개를 고른다. `getHours()`는 쓰지 않는다(DB11).
      - 각 발화의 `day`는 `includesTodayAtHour(targetHour) ? dayOf(발화) : dayOf(발화 - 1일)`이다. 전날도 `new Date(y, m-1, d+k-1)`로 만든다.
  - 머리 주석에 계약 경로, research R3·R15, 「`now`를 인자로(D4)」를 적는다.
  - T007이 통과하는지 본다.
- [ ] T018 [US1] `src/schedule/reminder-port.ts`를 만든다.
  - `ReminderPort`, `expoReminderPort()`, `REMINDER_CHANNEL_ID = "diary-reminder"`를 둔다(RT1~RT4).
  - 머리 주석에 research R2·R4·R16을 적는다.
  - T009가 통과하는지 본다.
- [ ] T019 [US1] `src/schedule/reminders.ts`를 만든다.
  - `reconcileReminders(deps)`와 모듈 하나의 순서 줄(`let tail = Promise.resolve()`)을 둔다.
  - RC1·RC3~RC6을 구현한다.
  - 거둘 것은 이 시점에는 「꺼짐이면 전부」와 「`day === null`」만 둔다. 쓴 날·사흘 밖은 T030에서 더한다.
  - T008이 통과하는지 본다.
- [ ] T020 [US1] `src/schedule/reminder-deps.ts`를 만든다(RD1~RD4).
  - `src/schedule/settings.ts`에서 설정 문자열 해석을 `parseAutoDiarySettings`로 떼어 export한다. 이미 있으면 그것을 쓴다. 기존 `loadAutoDiarySettings`의 동작은 그대로 둔다.
  - `listDiaryDays`는 `fileStore(expoFileSystemPort("diary")).listDays()`로 한다(App.tsx와 같은 통로 — task.ts는 파이프라인 store를 쓴다).
  - 헌법 검사 `checkScheduleFile`·`checkSimulationFile`에 걸리면 이유를 plan의 Post-design re-check에 적는다.
  - T010이 통과하는지 본다.
- [ ] T021 [US1] `src/app/notification-behavior.ts`를 만든다(`notificationBehaviorFor`, `isWriteReminderResponse`).
  - `App.tsx` `AppFrame`의 `setNotificationHandler`를 `handleNotification: async (n) => notificationBehaviorFor(n)`로 바꾼다(FG3).
  - T011이 통과하는지 본다.
- [ ] T022 [US1] `src/app/use-auto-write-claim.ts`에 `rearmAutoWrite`를 더한다(RA1~RA4, research R14).
  - 다시 연 횟수를 state로 두고 `claimAutoWrite`의 `useCallback` deps에 넣는다. `rearmAutoWrite`는 `useCallback(…, [])`이고 state는 updater(`n => n + 1`)로 올려 정체가 바뀌지 않게 한다(research R21).
  - ref는 콜백 안에서만 읽는다(React Compiler).
  - 머리 주석의 「되살리는 함수를 두지 않는다」를 「소모를 되돌리는 길은 쓸 차례 알림 응답의 `rearmAutoWrite` 하나다(085 FR-023)」로 고친다. `specs/082-auto-write-claim-handoff/contracts/auto-write-open.md`의 CL6에 「→ 085 FR-023으로 개정」을 단다.
  - T013이 통과하고 나머지 CL 테스트도 통과하는지 본다.
- [ ] T023 [US1] `App.tsx` `AppFrame`의 웜 응답 처리(`notificationPort.onResponse`)를 고친다.
  - `isWriteReminderResponse(r)`이면 `rearmAutoWrite()`를 부른다(RA6). 라우팅은 그대로다.
  - `useAutoWriteClaim`이 돌려준 값에서 `rearmAutoWrite`를 꺼내 쓴다. 정체가 바뀌지 않는 값이라 마운트 effect의 deps에 넣어도 effect가 다시 돌지 않는다 — `lastResponse`가 다시 라우팅되지 않는지 확인한다.
  - T014가 통과하는지 본다. 하니스가 `App.tsx`와 다르게 묶지 않도록 T026의 소스 단언이 잠근다.
- [ ] T024 [US1] `src/app/reminder-summary.ts`를 만든다(`reminderSummaryLine(list)` → `string | undefined`, DV1).
  - 문구는 `text().reminder`에서 가져온다.
  - 시는 `new Date(at).getHours()`로 얻는다. 대신 `__tests__/config/day-boundary-source.test.ts`의 DB11 ALLOWED에 `src/app/reminder-summary.ts`를 이유(「표시용 시 — 하루 기준 계산이 아니다(085 research R15)」)와 함께 올린다(DV4).
  - T012가 통과하고 DB11도 통과하는지 본다.
- [ ] T025 [US1] `src/app/use-reminder-sync.ts`를 만든다(SY1·SY2·SY3·SY5).
  - 시그니처: `useReminderSync({ liveWrites, settings, names, reconcile? })`. `reconcile`의 기본값은 `(n) => reconcileReminders(expoReminderDeps({ names: n }))`다.
  - effect A는 `[settings, names]`를 deps로 두고 마운트 때도 돈다. `names`는 `AppFrame`이 이름 파일을 읽기 전이면 `undefined`다(T026이 그렇게 넘긴다).
  - effect B는 `AppState` `change → active`와 `liveWrites.onChange`(콜백 안에서 `current() === null`일 때만)를 구독한다. 마운트 때는 부르지 않는다. 최신 `names`는 ref로 콜백 안에서 읽는다.
  - 실패는 `.catch(() => {})`로 삼킨다.
  - T015가 통과하는지 본다.
- [ ] T026 [US1] `App.tsx` `AppFrame`을 고친다.
  - `useReminderSync({ liveWrites, settings: <자동 쓰기 설정>, names: <읽었으면 customNames, 아니면 undefined> })`를 정확히 한 번 쓴다. 이름을 읽었는지는 907 부근의 이름 읽기 effect가 세우는 값으로 가른다(없으면 state 하나를 더한다). 실제 state 이름은 357·907 부근에서 확인한다.
  - 개발자 겹 effect(690–702 부근, `route === "developer"`)에서 `expoReminderPort().scheduled()`를 읽는다. 결과는 `reminderSummaryLine`으로 `developerReminderLine` state에 넣고, 실패하면 `undefined`로 둔다.
  - `DeveloperScreen`에 `reminderLine={developerReminderLine}`을 넘긴다.
  - `__tests__/app/app-auto-write-source.test.ts`를 고친다.
    - OP6을 넓힌다(SY4): `DiarySection`…`SettingsSection` 구간과 `src/ui/DiaryHomeScreen.tsx`에 `expo-notifications`·`reminder-port`·`reconcileReminders`가 없다.
    - 소스 단언을 더한다:
      - `useReminderSync(`가 `App.tsx`에 정확히 한 번 있다(SY1).
      - `setNotificationHandler` 블록에 `notificationBehaviorFor(`가 있다(FG3).
      - `onResponse` 블록에 `isWriteReminderResponse(`와 `rearmAutoWrite()`가 있다(RA6).
- [ ] T027 [US1] `src/ui/DeveloperScreen.tsx`에 `reminderLine?: string` prop을 더한다.
  - `FailuresGroup` 아래에 한 행(`testID="developer-reminder-line"`)으로 그린다. 위 행들의 자리는 그대로다.
  - T016이 통과하는지 본다.
- [ ] T028 [US1] `src/schedule/notification-port.ts`의 `ensureChannel`이 `diary-reminder` 채널도 만들게 한다.
  - 이름은 `text().reminder.channelName`, 중요도는 HIGH다. `REMINDER_CHANNEL_ID`는 `reminder-port.ts`에서 import한다.
  - 이 채널이 없으면 쓸 차례 알림이 기본 채널로 간다(020 N3·research R17).
  - 계약 테스트는 US3의 T034(CH2)다. 여기서는 `npx jest __tests__/schedule/notification-port.test.ts --selectProjects logic`이 깨지지 않는지만 본다.

**Checkpoint**
- 앱을 열면 예약 7개가 걸린다. 개발자 줄로 보인다.
- 쓰기·지우기가 끝날 때마다 차이가 맞춰진다.
- 앱이 앞에 있을 때 발화하면 알림이 숨는다.
- 알림을 누르면 「한 번」이 다시 열린다.

## Phase 4: User Story 2 — 이미 쓴 날에는 「쓸 차례」라고 하지 않는다 (P1)

**Goal**: 쓴 날은 예약하지 않고, 트레이에 떠 있으면 거둔다. 백그라운드 태스크는 끝날 때마다 맞추고, 쓴 날이면 쓸 차례 알림을 거둔 뒤 완성 알림을 보낸다. 해당 요구사항: FR-001(쓴 날 제외), FR-008(거둠), FR-009(태스크), FR-011, FR-017.

**Independent Test**
- `npx jest __tests__/schedule/reminder-plan.test.ts __tests__/schedule/reminders.test.ts __tests__/schedule/task-reminder.test.ts --selectProjects logic`
- quickstart §3 B·C

### Tests (먼저 — 실패를 본다)

- [ ] T029 [P] [US2] `__tests__/schedule/reminder-plan.test.ts`에 RP4를 더한다.
  - 22시 목표에서 오늘·모레가 쓴 날이면, 그 두 `day`가 없고 개수가 5다.
  - 7시 목표에서 어제가 쓴 날이면, 오늘 07:00 발화가 없다.
  - **실패하는 것을 본다**.
- [ ] T030 [P] [US2] `__tests__/schedule/reminders.test.ts`에 RC2를 더한다.
  - 켜짐 상태에서 트레이에 우리 알림 넷을 둔다: 쓴 날 하나, `selectableDays(now)` 밖 하나, 안 쓴 사흘 안 하나, `day: null` 하나.
  - 안 쓴 사흘 안의 것을 뺀 셋만 `dismiss`된다.
  - **실패하는 것을 본다**.
- [ ] T031 [P] [US2] 새 파일 `__tests__/schedule/task-reminder.test.ts` — TK1~TK4, CH4.
  - deps 대역은 `__tests__/schedule/task-manual.test.ts`의 조립을 따른다. `reconcileReminders?: () => Promise<void>`를 주입한다. `notificationPort` 대역의 `ensureChannel`·`present`도 호출 순서를 기록한다.
  - TK1·CH4: 성공하면 순서가 `reconcile` → `ensureChannel` → `present`다.
  - TK2: `reconcile`이 던져도 결과는 `"ran"`이고, `present`는 1번, 시도 기록의 끝은 성공이다.
  - TK3:
    - 판정이 건너뜀이면 `reconcile` 1번, `present` 0번.
    - 파이프라인이 실패하면 `reconcile` 1번.
    - 성공이면 `reconcile`이 정확히 1번이다.
  - TK4: `manual: true`로 성공해도 같은 순서다.
  - **실패하는 것을 본다**.

### Implementation

- [ ] T032 [US2] 쓴 날과 거둘 것을 반영한다.
  - `src/schedule/reminder-plan.ts`: `writtenDays`에 든 `day`의 발화를 뺀다(RP4).
  - `src/schedule/reminders.ts`: 거둘 것에 「켜짐이면 쓴 날 또는 `selectableDays(now())` 밖」을 더한다(RC2).
  - T029·T030이 통과하는지 본다.
- [ ] T033 [US2] `src/schedule/task.ts`를 고친다.
  - `AutoDiaryTaskDeps`에 `reconcileReminders?: () => Promise<void>`를 더한다. 기본값은 `() => reconcileReminders(expoReminderDeps())`다.
  - `runAutoDiaryTask`가 결과를 돌려주기 직전, 시도 기록의 끝 뒤에 맞추기를 한 번 부른다.
    - 성공 경로는 `runBody`의 `if (result.ok) {` 안에서 `sendCompletionNotification` 전에 부른다. 한 번만 부르도록 성공 여부로 가른다.
    - 실패는 `.catch(() => {})`로 삼킨다.
  - `sendCompletionNotification`은 `present` 전에 `notificationPort.ensureChannel().catch(() => {})`를 부른다(CH4).
  - 머리 주석에 FR-009·FR-011과 research R7·R17을 적는다.
  - T031이 통과하는지 본다.
  - 기존 `__tests__/schedule/background-generation.test.ts`·`task-manual.test.ts`·`task-simulation.test.ts`도 통과해야 한다. 기본 조립이 jest에서 `expo-notifications`를 부르게 되므로, 그 테스트들의 deps에 `reconcileReminders: async () => {}`를 더한다. `notificationPort` 대역에 `ensureChannel`이 없으면 더한다.

**Checkpoint**
- 쓴 날에는 예약도 트레이 알림도 남지 않는다.
- 백그라운드가 쓰면 「쓸 차례」 알림이 「다 썼어요」 알림으로 바뀐다.
- 건너뛰기만 하는 실행도 7번 창을 연장하고 오래된 알림을 거둔다.

## Phase 5: User Story 3 — 완성 알림이 「일기 완성 알림」 채널로 간다 (P2)

**Goal**: 완성 알림을 앱 채널로 보내고(C2), 두 채널을 보장한다. 해당 요구사항: FR-007.

**Independent Test**
- `npx jest __tests__/schedule/notification-port.test.ts --selectProjects logic`
- quickstart §3 B의 채널 확인, I

### Tests (먼저 — 실패를 본다)

- [ ] T034 [US3] `__tests__/schedule/notification-port.test.ts`를 CH1·CH2·CH3에 맞게 고친다.
  - CH1:
    - 67–70의 `trigger:\s*null` 단언을 `trigger:\s*\{\s*channelId:\s*CHANNEL_ID\s*\}`로 바꾼다.
    - 72–74의 금지를 `SchedulableTriggerInputTypes|DAILY|TIME_INTERVAL|\bdate:`로 바꾼다. `trigger: {` 금지는 걷는다(research R5).
  - CH2: `setNotificationChannelAsync` 호출이 두 번(`CHANNEL_ID`, `REMINDER_CHANNEL_ID`)이고 둘 다 `AndroidImportance.HIGH`인지 소스로 확인한다.
  - CH3: 키 집합 단언은 그대로 둔다.
  - 옛 코드에서 CH1이 **실패하는 것을 본다**. CH2는 T028 때문에 이미 통과하므로, T028을 잠깐 되돌려 실패를 본 뒤 다시 넣는다.

### Implementation

- [ ] T035 [US3] `src/schedule/notification-port.ts`를 고친다.
  - `present`의 트리거를 `{ channelId: CHANNEL_ID }`로 바꾼다.
  - 머리말을 바꾼다. 「완료 직후 즉시 로컬 알림(`trigger: null`)만 쓴다 … 예약 알림·DAILY 트리거는 쓰지 않는다(019의 alarm 배제 계승)」를 다음 문장으로 대체한다: 「완성 알림은 즉시 게시이고 `diary-completed` 채널로 간다(085 C2 — `trigger: null`이면 Expo 기본 채널로 게시됐다). 예약은 쓸 차례 알림(`reminder-port.ts`)에만 있다. 020의 배제 근거는 research 085 R4.」
  - 43행 JSDoc의 「trigger: null」과 90행 인라인 주석 「trigger: null = 즉시」도 `{ channelId }`로 고친다.
  - T034가 통과하는지 본다.

**Checkpoint**: 두 알림이 각자의 채널로 간다.

## Phase 6: User Story 4 — 설정이 사실대로 말한다 (P2)

**Goal**: 설정과 온보딩 문구가 사실대로이고, 알림이 꺼진 사용자에게 한 줄을 보인다. 해당 요구사항: FR-013~FR-016, FR-024.

**Independent Test**
- `npx jest __tests__/app/notification-off-line.test.ts __tests__/app/target-hour.test.ts __tests__/app/battery-row.test.ts __tests__/config/promise-copy.test.ts --selectProjects logic`
- `npx jest __tests__/ui/settings-notification-off.test.tsx --selectProjects ui`
- quickstart §3 E·G

### Tests (먼저 — 실패를 본다)

- [ ] T036 [P] [US4] 새 파일 `__tests__/app/notification-off-line.test.ts` — ST1.
  - `(true, "denied")` → 문구.
  - `(true, "allowed")`, `(true, "partial")`, `(true, "unread")` → `undefined`.
  - `(false, "denied")` → `undefined`.
  - **실패하는 것을 본다**.
- [ ] T037 [P] [US4] 새 파일 `__tests__/ui/settings-notification-off.test.tsx` — ST2.
  - `SettingsScreen`에 `notificationOffText="…"`를 주면 알림 행(`settings-perm-notifications`) 안에 그 글자가 보인다. 단언 방식은 사진 건너뜀 줄 테스트를 따른다.
  - 주지 않으면 그 글자가 없다.
  - 사진 행의 `photoSkipText`는 영향을 받지 않는다.
  - **실패하는 것을 본다**.
- [ ] T038 [P] [US4] 문구를 테스트에 박는다.
  - ST3: `__tests__/app/target-hour.test.ts`
    - 22시 h12 → 「매일 오후 10시쯤 그날 일기를 쓸 차례라고 알려요. 열면 바로 써요. 이미 쓴 날은 건너뛰어요.」
    - 7시 → 「어제」
  - ST4: `__tests__/app/battery-row.test.ts`에 두 문장.
  - ST5: 온보딩 `PERMISSION_REQUIREMENTS`의 넷을 `__tests__/onboarding/requirements.test.ts`에 단언한다(T006이 옛 값을 고친 자리).
  - ST6: 새 파일 `__tests__/config/promise-copy.test.ts`(소스 계약)를 만든다.
    - 대상: `src/i18n/catalogs/ko/settings.ts`·`settings-platform.ts`·`onboarding.ts`.
    - 단언: 주석을 걷은 뒤 「제때 써요」·「일기를 써요.」·「정한 시간대에」가 없다.
  - FX1을 같은 파일에 넣는다(주석을 걷은 뒤 검사한다 — `plugins/with-battery-exception.js` 머리 주석에 권한 이름이 정당하게 나온다).
    - `app.json`과 `plugins/*.js`에 `SCHEDULE_EXACT_ALARM`·`USE_EXACT_ALARM`이 없다.
    - `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`는 `blockedPermissions`에만 있다.
    - `package.json`에 `expo-battery`가 없다.
  - T004 뒤라 문구 단언은 통과한다. 이 태스크의 일은 문장을 테스트에 박는 것이다.

### Implementation

- [ ] T039 [US4] `src/app/notification-off-line.ts`를 만든다(`notificationOffLine(enabled, tag)`, 문구는 `text().reminder.notificationOff`). T036이 통과하는지 본다.
- [ ] T040 [US4] `src/ui/SettingsScreen.tsx`에 `notificationOffText?: string` prop을 더한다.
  - 권한 행 매핑에서 `key === "notifications" && notificationOffText !== undefined`이면 `{ hint: notificationOffText, hintTone: "danger" }`를 붙인다.
  - T037이 통과하는지 본다.
- [ ] T041 [US4] `App.tsx` `SettingsSection`에서 값을 넘긴다.
  - 렌더에서 `const notificationOffText = notificationOffLine(<자동 쓰기 켜짐>, permissionTags.notifications)`로 한 번 계산한다.
  - `{...(notificationOffText !== undefined ? { notificationOffText } : {})}`로 넘긴다. SL3의 `photoSkipText` 넘김과 같은 모양이다.
  - 실제 이름은 2414·2505 부근에서 확인한다.
  - `__tests__/app/app-auto-write-source.test.ts`에 소스 단언 한 줄을 더한다: `notificationOffLine(`이 `App.tsx`에 정확히 한 번 있다.

**Checkpoint**: 설정과 온보딩이 거짓 약속을 하지 않고, 알림이 꺼진 사용자는 그 사실을 본다.

## Phase 7: Polish — 방어 확인·실기기·문서

- [ ] T042 `npm test` 전체와 `npm run lint`를 실행해 통과를 확인한다.
  - 가드 표(B3·B6·069 G-1)가 깨지면 등록하고, research R13에 결과를 적는다. FX2(새 `*_FILE` 없음)는 B6이 그대로 통과하는 것으로 확인한다.
  - 헌법 검사에 새 예외가 필요했다면 plan의 Post-design re-check에 적는다.
- [ ] T043 위반 주입 V1~V12(contracts 표)를 하나씩 한다.
  - 주입한 뒤에는 치환이 실제로 들어갔는지 grep으로 먼저 확인한다.
  - 해당 테스트가 실패하는 것을 본 뒤 되돌린다. 되돌린 뒤에는 원래 문자열이 돌아왔는지 다시 grep한다(AGENTS 058).
  - 결과 표를 quickstart 「실측」에 적는다.
- [ ] T044 실기기에서 확인한다(SM-S901N dev, quickstart §2·§3).
  - 백업을 `exec-out`으로 받고 `tar tf`로 확인한 뒤 시작한다.
  - 볼 시나리오:
    - A — 배터리 예외 끔·화면 끔. 알림이 뜬 시각과 목표 시각의 차이를 기록한다.
    - A′ — 같은 실행에서 이미 자동 쓰기가 한 번 시작한 뒤 알림을 누른다.
    - B — 배터리 예외 있음. 거둠과 완성 알림 채널을 본다.
    - C — 손으로 먼저 쓴다. 알림이 없어야 한다.
    - D — 자동 쓰기 끔. 예약이 없어야 한다.
    - E — 알림 권한 끔. 빨간 줄을 본다.
    - F — 앞에서 발화. 숨어야 한다.
    - G — 설정·온보딩 문구.
    - H — 개발자 줄을 `dumpsys`와 대조한다.
    - I — 쓸 차례 채널만 끈다.
  - Maestro 흐름 둘(`settings-time-place`·`scheduled-diary-notification`)을 `maestro test`로 한 번 돌린다(새 문구 단언).
  - 끝나면 배터리 예외·`svc power`·`dumpsys battery`를 되돌리고 백업을 복원한다.
  - 결과를 quickstart 「실측」에 적는다. **A가 실패하면(알림이 뜨지 않으면) 멈추고 소유자에게 보고한다.**
- [ ] T045 [P] `AGENTS.md`를 고친다.
  - 「085 — 쓸 차례 알림」 절을 더한다: 결론, 사전 확인(소스와 짐작), 실측, 남은 위험(7일 동안 앱이 돌지 않을 때, 시간대, 부정확한 알람, iOS 실기기 없음, 캐릭터 읽기 실패).
  - 020 절과 `notification-port` 관련 「즉시 알림만」 서술을 고친다.
  - 062의 「관찰(062 밖): 완성 알림이 … Miscellaneous」 줄을 「085가 고쳤다」로 바꾼다.
  - 057의 「한 실행에 한 번」 서술과 082 절의 「소모는 되살아나지 않는다(소유자 결정)」에 「085 — 쓸 차례 알림을 누르면 한 번 더(FR-023)」를 덧붙인다.
  - 「저장소의 현재 상태」의 ★ 백그라운드 줄에 쓸 차례 알림이 안전망이라는 한 줄을 더한다.
- [ ] T046 [P] 문서를 실측에 맞춘다.
  - `specs/085-write-reminder/quickstart.md`의 「실측」을 채운다.
  - `specs/085-write-reminder/research.md`의 짐작 항목(R2)을 실측으로 고친다. 확인된 것과 확인되지 않은 것을 가른다.
  - 설계문서 `docs/superpowers/specs/2026-10-15-write-reminder-design.md` §9(이후 바뀐 것)에 구현·실측에서 다시 바뀐 것이 있으면 덧붙인다.

## Dependencies

- Phase 1 → Phase 2 → US1 → US2 순서다. US2는 US1의 계획·맞추기 파일을 고친다.
- US3(Phase 5)는 Phase 2 뒤 언제든 할 수 있다. 다만 T028(US1)이 채널 둘을 먼저 넣으므로 T034는 T028 뒤에 한다.
- US4(Phase 6)는 Phase 2 뒤 언제든 할 수 있다. 문구는 Phase 2가 이미 바꿨다.
- Phase 7은 모두 끝난 뒤에 한다.

## Parallel Example

- US1 Tests: T007~T016은 서로 다른 파일이다. 단, T013은 기존 파일에 더한다.
- US2 Tests: T029·T030·T031.
- US4 Tests: T036·T037·T038.

## Implementation Strategy

- **MVP는 Phase 1~3(US1)이다.** 예약이 걸리고 다시 맞춰지고, 누르면 쓴다. 이것만으로 「앱이 얼어 있어도 열게 한다」가 성립한다.
- 실기기 시나리오 A로 핵심 가정(얼어 있는 프로세스에 알람이 닿는가)을 가장 먼저 볼 수 있다.
- 그다음 순서: US2(사실과 다른 「쓸 차례」 제거) → US3(채널) → US4(문구·꺼짐 줄) → Polish.
