# Contract — 쓸 차례 알림 (085)

계약 ID는 테스트 이름에 그대로 쓴다. 근거는 [research.md](../research.md), 값의 모양은 [data-model.md](../data-model.md)에 있다.

## RP — 계획 (`src/schedule/reminder-plan.ts`, 순수)

`planReminders({ now, settings, writtenDays, name }): ReminderPlanEntry[]`

- **RP1** `settings.enabled === false`이면 `[]`.
- **RP2** 오후 목표(예: 22)에서 `now`가 오늘 21:00이면 첫 항목은 `day = 오늘`, `at = 오늘 22:00`이다. `now`가 오늘 22:00이거나 그 뒤면 첫 항목은 내일이다.
- **RP3** 오전 목표(예: 7)에서 `now`가 오늘 06:00이면 첫 항목은 `day = 어제`, `at = 오늘 07:00`이다.
- **RP4** 쓴 날은 빠진다. 결과는 앞으로 7번의 발화 가운데 그 날 몫이 쓰이지 않은 것뿐이다(최대 7개).
- **RP5** 자정과 월말·연말을 넘겨도 `day`·`at`이 로컬 달력대로다.
- **RP6** `id === "diary-reminder-" + day`, `title === reminderTitle(name, day)`.
- **RP7** 이 파일은 `new Date()`(인자 없음)를 부르지 않고 `getHours()`를 쓰지 않으며(DB11 — research R15) 정오 상수를 두지 않는다. 그 날 몫은 `includesTodayAtHour`로 묻는다.
- **RP8** `name === null`(고른 캐릭터 없음 — research R8)이면 `[]`.

## RC — 맞추기 (`src/schedule/reminders.ts`)

`reconcileReminders(deps): Promise<void>`. deps는 `{ port: ReminderPort, now: () => Date, prepare: () => Promise<void>, loadSettings: () => Promise<AutoDiarySettings>, listDiaryDays: () => Promise<readonly DayDate[]>, loadName: () => Promise<string | null> }`다. `loadSettings`·`listDiaryDays`·`loadName`은 읽지 못하면 던진다(research R18).

- **RC1** 차이만 고친다(research R16).
  1. `prepare()`
  2. `port.scheduled()`
  3. 걸린 것 중 계획에 `id`·`at`·`title`이 같은 줄이 없는 것은 `cancel`
  4. 계획 중 걸린 것에 같은 셋이 없는 것은 `schedule`
  5. `port.presented()`
  6. 거둘 것을 `dismiss`
- **RC2** 거둘 것: 자동 쓰기가 꺼졌으면 전부. 켜져 있으면 `day`가 쓴 날이거나, `selectableDays(now)` 밖이거나, `null`인 것.
- **RC3** 어떤 통로가 던져도 밖으로 던지지 않고 남은 단계를 이어 간다.
  - `prepare`가 던져도 계속한다.
  - `cancel` 하나가 던져도 나머지를 이어 간다. `schedule` 하나가 던져도 같다.
  - `scheduled()`가 던지면 계획 전부를 `schedule`하고(같은 id는 바꿔 낀다), 우리 예약이 있을 수 있는 날(어제 ~ 8일 뒤)의 id 중 계획에 없는 것을 `cancel`한다(꺼졌는데 예약이 남지 않게 — 코드 리뷰 반영).
  - `presented()`가 던지면 거두기를 건너뛴다.
- **RC4** 동시에 불려도 한 줄로 선다 — 모듈 하나의 순서 줄이 앞 맞추기가 끝난 뒤 다음을 시작한다.
- **RC5** 설정·일기 목록·이름은 부를 때마다 deps로 다시 읽는다.
- **RC6** `loadSettings`·`listDiaryDays`·`loadName`(켜져 있을 때) 중 하나라도 던지면 `cancel`·`schedule`·`dismiss`를 하나도 하지 않는다(research R18).
- **RC8** 시각이 지났지만(`at <= now`) 아직 걸려 있는 예약은, 켜져 있고 그 날을 안 썼고 그 날이 `selectableDays(now)` 안이면 취소하지 않는다 — 부정확 알람·삼성 얼림 동안은 아직 전달 전이다(085 실기기 2026-10-15: 17:01:53 백그라운드 잡의 맞추기가 아직 안 뜬 17:00 예약을 취소함). `scheduled()`를 읽지 못한 경로도 켜져 있으면 쓴 날의 id만 취소한다.
- **RC7** `src/schedule/reminders.ts`·`reminder-plan.ts`·`reminder-port.ts`·`reminder-deps.ts`는 `AppState`·`react-native`를 참조하지 않는다(OP7). `reminders.ts`·`reminder-plan.ts`는 `../app/`을 import하지 않는다.

## RD — 기본 조립 (`src/schedule/reminder-deps.ts`)

`expoReminderDeps(overrides?: { names?: CustomNames; settingsPort?; store?; selectionPort?; namesPort?; notificationPort? }): ReminderDeps` — `names` 밖의 덮개는 테스트용 통로 주입이다.

- **RD1** `prepare`는 `expoNotificationPort().ensureChannel()`이다.
- **RD2** `loadSettings`는 설정 통로의 `read()`를 직접 부른다. 던지면 던지고, 해석에 실패하면(깨진 JSON) 던지고, `null`(파일 없음)이면 기본값이다. 읽은 문자열의 해석은 `src/schedule/settings.ts`의 해석 함수를 쓴다. 해석 함수가 export되지 않았으면 그 파일에 `parseAutoDiarySettings`를 export로 뗀다.
- **RD3** `listDiaryDays`는 `fileStore(expoFileSystemPort("diary")).listDays()`다(App.tsx와 같은 통로). 실패는 던진다.
- **RD4** `loadName`: 캐릭터는 `loadSelection(expoSelectionPort()) ?? ONBOARDING_DEFAULT_CHARACTER`다(홈의 `resolveGenerationParams`와 같은 규칙 — research R8, 구현 중 실기기에서 바뀜). 이름은 `displayNameOf(character, names ?? await loadCustomNames(...).catch(() => ({})))`다. `names`가 주어지면 파일을 읽지 않는다. `undefined`면 파일을 읽는다(research R19).

## RT — 통로 (`src/schedule/reminder-port.ts`)

`ReminderPort`는 `{ scheduled(); schedule(entry); cancel(id); presented(); dismiss(id) }`이다.

- **RT1** `expo-notifications`는 메서드 안에서 불러온다(`expoReminderPort(load = () => import("expo-notifications"))` — jest `logic`에서는 동적 import가 돌지 않아 `load`로 대역을 넘긴다).
- **RT2** `schedule`은 `scheduleNotificationAsync({ identifier: entry.id, content: { title: entry.title, data: { day: entry.day, kind: "write-reminder", at: entry.at } }, trigger: { type: SchedulableTriggerInputTypes.DATE, date: entry.at, channelId: REMINDER_CHANNEL_ID } })`를 부른다. 본문(`body`)은 없다.
- **RT3** `scheduled()`는 `getAllScheduledNotificationsAsync()`의 결과를 접두사로 거르고 `{ id, day, at, title }`를 준다(data-model — 트리거를 되읽지 않는다). `presented()`는 `getPresentedNotificationsAsync()`의 결과를 `request.identifier` 접두사로 거르고 `{ id, day }`를 준다. 둘 다 **실패하면 던진다**(빈 목록으로 바꾸지 않는다).
- **RT4** `cancel`·`dismiss`는 대상이 없어도 던지지 않는다.

## RA — 누르면 한 번 더 (`src/app/use-auto-write-claim.ts` + `src/app/notification-behavior.ts` + `App.tsx`)

- **RA1** `useAutoWriteClaim`이 `rearmAutoWrite()`를 돌려준다. 부르면 다음 `claimAutoWrite()`가 (다른 조건이 같다면) 참이 된다.
- **RA2** `rearmAutoWrite()` 뒤 `claimAutoWrite`의 정체가 바뀐다(홈 effect가 다시 돈다). `rearmAutoWrite` 자신의 정체는 바뀌지 않는다(research R21).
- **RA3** 다시 열어도 `firstRunTried.current`가 참이면 거짓, `writeBlocked`이면 거짓이다(064·040이 앞선다).
- **RA4** 다시 연 뒤 한 번 claim하면 다시 소모된다(누름 하나에 한 번).
- **RA5** `isWriteReminderResponse(r)`는 `r.notification.request.content.data.kind === "write-reminder"`일 때만 참이다. 완성 알림·`null`·모양이 깨진 응답은 거짓이다.
- **RA6** `App.tsx`의 웜 응답 처리(`notificationPort.onResponse`)는 `isWriteReminderResponse(r)`이면 `rearmAutoWrite()`를 부른다. 라우팅(`routeFromNotification`)은 그대로다.
- **RA8** 082 CL6은 「키는 `claimAutoWrite,rearmAutoWrite,spendAutoWrite`」로 바뀐다. 소모를 되돌리는 길은 `rearmAutoWrite`뿐이다(research R21).
- **RA7** (조립) 「한 번」이 이미 소모된 실행에서 쓸 차례 알림 응답을 받으면 홈이 그 날의 「쓰는 중」으로 시작한다. 완성 알림 응답에서는 시작하지 않는다 — 082의 조립 하니스(`__tests__/ui/auto-write-open-assembly.test.tsx`)를 따른다.

## CH — 채널과 완성 알림 (`src/schedule/notification-port.ts`, `task.ts`)

- **CH1** `present`는 `trigger: { channelId: CHANNEL_ID }`를 보낸다(C2). 이 파일에는 `SchedulableTriggerInputTypes`·`DAILY`·`TIME_INTERVAL`·`date:`가 없다.
- **CH2** `ensureChannel`은 `diary-completed`(「일기 완성 알림」, HIGH)와 `diary-reminder`(「일기 쓸 시각 알림」, DEFAULT — 소유자 결정 2026-10-15)를 각각 따로 만든다(하나가 실패해도 다른 하나는 선다).
- **CH3** `NotificationPort`의 키 집합은 그대로다(쓸 차례 통로는 따로 있다).
- **CH4** `sendCompletionNotification`은 `present` 전에 `ensureChannel()`을 부른다(research R17). 실패는 삼킨다.

## TK — 태스크 (`src/schedule/task.ts`)

- **TK1** 저장 성공(`result.ok`)이면 맞추기를 await한 뒤 완성 알림을 보낸다.
- **TK2** 맞추기가 실패해도 결과(`ran`)·시도 기록·완성 알림은 바뀌지 않는다.
- **TK3** 결과가 건너뜀·실패여도 태스크가 끝날 때 맞추기를 한 번 부른다(research R7). 성공이면 TK1의 한 번뿐이다(두 번 부르지 않는다).
- **TK4** 수동 실행(`manual: true`)도 같은 경로다.

## SY — 앱의 맞추기 배선 (`src/app/use-reminder-sync.ts` + `App.tsx`)

- **SY1** `AppFrame`이 `useReminderSync`를 정확히 한 번 쓴다. effect A는 `[settings, names]`를 deps로 두고 마운트 때도 돈다. effect B는 `AppState` → `active`와 `liveWrites.onChange`(`current() === null`일 때)를 구독하며 마운트 때는 부르지 않는다.
- **SY2** 칸이 찼을 때(`current() !== null`)의 `onChange`는 맞추기를 부르지 않는다.
- **SY3** 언마운트하면 구독을 끊는다.
- **SY4** `DiarySection`…`SettingsSection` 구간과 `src/ui/DiaryHomeScreen.tsx`는 `expo-notifications`·`reminder-port`·`reconcileReminders`를 참조하지 않는다(OP6 확장).
- **SY5** 훅은 받은 `names`를 맞추기 deps에 넘긴다. 이름 파일을 아직 읽지 않았으면(`undefined`) 그대로 `undefined`를 넘긴다(research R19).

## FG — 앞쪽 숨김 (`src/app/notification-behavior.ts`)

- **FG1** `notificationBehaviorFor(n)`은 `n.request.content.data.kind === "write-reminder"`이면 `{ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }`를 준다.
- **FG2** 그 밖(완성 알림, `data` 없음, 모양이 깨짐)은 `{ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }`(지금 값)이다.
- **FG3** `App.tsx`의 `setNotificationHandler`가 이 함수를 부른다.

## ST — 설정·온보딩 문구

- **ST1** `notificationOffLine(enabled, tag)`는 `enabled && tag === "denied"`일 때만 「알림이 꺼져 있어 쓸 차례를 알리지 못해요」를 주고, 그 밖은 `undefined`다(`unread`도 `undefined`).
- **ST2** `SettingsScreen`의 알림 행이 `notificationOffText`를 빨간 보조 줄(`hintTone: "danger"`)로 그린다. 사진 행의 `photoSkipText`는 그대로다(SL3).
- **ST3** `previewSentence(hour, format)`는 「매일 {시각}쯤 {그날|어제} 일기를 쓸 차례라고 알려요. 휴대폰에 따라 늦게 알릴 때가 있어요. 열면 바로 써요. 이미 쓴 날은 건너뛰어요.」다.
- **ST4** `batteryRowHint("android")`는 「제한 없음이면 열지 않아도 먼저 써 둘 때가 있어요」, `batteryRowHint("ios")`는 「저전력 모드가 꺼져 있으면 먼저 써 둘 때가 있어요」다.
- **ST5** `PERMISSION_REQUIREMENTS`의 알림·배터리 `rationale`·`ifDenied`가 FR-024의 넷이다.
- **ST6** 카탈로그 `settings.ts`·`settings-platform.ts`·`onboarding.ts`에 「제때 써요」·「일기를 써요.」·「정한 시간대에」가 없다(SC-005).

## DV — 개발자 화면

- **DV1** `reminderSummaryLine(list)`는 빈 목록이면 「쓸 차례 알림 · 예약 없음」을 준다. 아니면 「쓸 차례 알림 · {N}개 예약 · 다음 {M}월 {d}일 {H}시」이고, 다음 시각은 `at`이 가장 이른 것이다. `at === null`인 항목은 세되 다음 시각 후보에서 뺀다. 모두 `null`이면 `undefined`(줄 없음 — FR-022 「읽지 못하면 그리지 않는다」, 승인되지 않은 문구를 만들지 않는다).
- **DV2** `AppFrame`은 `route === "developer"`일 때 `scheduled()`를 읽는다. 실패하면 줄이 없다(`undefined`).
- **DV3** `DeveloperScreen`은 `reminderLine`을 `FailuresGroup`(`developer-group-failures`) 아래에 그린다(`testID="developer-reminder-line"`).
- **DV4** `src/app/reminder-summary.ts`는 DB11 ALLOWED에 이유(「표시용 시 — 하루 기준 계산이 아니다」)와 함께 오른다(research R15).

## GD — 062 골든

- **GD1** `CHANGED_AFTER_GOLDEN` 표는 바뀐 리터럴과 출력을 `from`·`to`로 든다. G1·G2는 골든의 `from`을 먼저 단언하고 `to`로 바꿔 비교한다. 항목은 다음과 같다.
  - 리터럴: `permBatteryHint`, `targetHour.preview` 틀 `"매일 ${}쯤 ${} 일기를 써요. 이미 쓴 날은 건너뛰어요."`, 온보딩 넷
  - 출력: `SETTINGS_TEXT.permBatteryHint`, `previewSentence` 여덟, `PERMISSION_REQUIREMENTS` 출력의 해당 자리
- **GD2** 골든 json은 바뀌지 않는다(`git diff`에 없음).
- **GD3** 새 리터럴(`reminder` 영역 다섯, 바뀐 `permBatteryHintIos`)은 `ADDED_AFTER_GOLDEN`에 있다.

## FX — 바꾸지 않는 것

- **FX1** (주석을 걷은 뒤) `app.json`·`plugins/`에 `SCHEDULE_EXACT_ALARM`·`USE_EXACT_ALARM`·`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`(`blockedPermissions` 밖) 선언이 없고, `package.json`에 `expo-battery`가 없다(FR-019).
- **FX2** `src/`에 새 `*_FILE = "*.json"` 상수가 없다(FR-018 — B6 목록 그대로).
- **FX3** `reminders.ts`·`reminder-deps.ts`는 알림 권한을 묻지 않는다(`getPermission`·`getPermissionsAsync` 없음 — FR-016).

## 위반 주입 (구현 뒤 하나씩 — 실패로 뒤집혀야 한다)

| # | 주입 | 잡는 것 |
| --- | --- | --- |
| V1 | 계획이 쓴 날을 빼지 않게 | RP4 |
| V2 | 오전 목표의 그 날 몫을 발화일로 | RP3 |
| V3 | 맞추기가 같은 예약도 취소·재예약 | RC1 |
| V4 | 태스크가 완성 알림 뒤에 맞추기 | TK1 |
| V5 | 훅이 칸이 찰 때도 맞추기 | SY2 |
| V6 | `present`를 `trigger: null`로 되돌림 | CH1 |
| V7 | 쓸 차례 알림을 앞에서도 보임 | FG1 |
| V8 | 알림 꺼짐 줄을 `unread`에서도 | ST1 |
| V9 | 설정을 못 읽을 때 꺼짐으로 보고 전부 취소 | RC6 |
| V10 | `CHANGED_AFTER_GOLDEN`의 `from`을 틀리게 | GD1 |
| V11 | 웜 응답에서 `rearmAutoWrite`를 빼기 | RA6·RA7 |
| V12 | 완성 알림 전 `ensureChannel` 빼기 | CH4 |
