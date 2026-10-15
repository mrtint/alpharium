# Research — 085 쓸 차례 알림

모든 항목은 2026-10-15에 소스·문서를 읽어 얻은 것이다. **실측**은 실기기에서 본 것, **소스**는 코드를 읽은 것, **짐작**은 둘 다 아닌 것이다.

## R1. 배터리 예외를 읽는 통로 — 들이지 않는다

- **소스**: 설치된 네이티브 모듈(`node_modules/*/android`)에 `isIgnoringBatteryOptimizations`가 없다. `src/schedule/battery-exception-port.ts`는 설정 목록(`IGNORE_BATTERY_OPTIMIZATION_SETTINGS`)을 여는 일만 한다.
- **문서**: `expo-battery`의 `isBatteryOptimizationEnabledAsync()`(Android 6+, 문서에 권한 언급 없음)가 Expo가 관리하는 유일한 통로다.
- **Decision**: 들이지 않는다. 쓸 차례 알림을 모든 사용자에게 보내므로(spec Clarifications) 읽을 이유가 없다.
- **Alternatives**: 예외가 없는 사용자에게만 보내기 / 배터리 행에 상태 표시만 하기 — 새 네이티브 의존성과 재빌드가 필요하다. 그리고 예외가 있어도 OS가 스스로 깨운 잡의 완주는 미확인이라 안전망을 빼는 근거가 없다(소유자 결정 2026-10-15).

## R2. 예약 알림은 앱 없이 OS가 띄운다

- **소스** (`expo-notifications` 57.0.15):
  - 안드로이드 `ExpoSchedulingDelegate.scheduleNotification`
    - `SchedulableNotificationTrigger`는 요청을 SharedPreferences에 저장하고 `setupAlarm`(`AlarmManager.RTC_WAKEUP`)을 건다.
    - 발화하면 `NotificationsService`(네이티브 리시버)가 `receive`로 게시한다. JS가 돌지 않는다.
    - BOOT·REBOOT 리시버가 `setupScheduledNotifications`로 다시 건다.
  - `setupAlarm`은 `Build.VERSION.SDK_INT < S || canScheduleExactAlarms()`일 때만 `setExactAndAllowWhileIdle`이고, 아니면 `setAndAllowWhileIdle`(부정확)이다. 앱 매니페스트(`app.json`)에는 `SCHEDULE_EXACT_ALARM`·`USE_EXACT_ALARM`이 없다. 그래서 Android 12+는 **부정확**하다.
  - DATE 트리거: `DateTrigger(channelId, timestamp)`, `nextTriggerDate`는 그 시각이 지나면 `null`이다. 지난 시각을 걸면 저장하지 않고 지운다.
  - iOS: `TriggerRecords.swift`의 `DateTriggerRecord`(96–110)는 날짜 트리거를 `UNTimeIntervalNotificationTrigger(timeInterval: date.timeIntervalSinceNow)`로 바꾼다. 예약표에는 처음 간격만 남아 울릴 시각을 되읽을 수 없다. 그래서 울릴 시각은 알림 `data.at`에 함께 싣는다(R16). OS가 전달한다.
- **Decision**: DATE 트리거로 날짜별 일회 예약을 건다. `SCHEDULE_EXACT_ALARM`은 더하지 않는다(Play가 알람·캘린더 앱에 제한, spec FR-019).
- **짐작(실기기 quickstart §3에서 본다)**:
  - 얼어 있는 프로세스(`freezer:/frozen`)에 알람 브로드캐스트가 닿는가
  - Doze에서 부정확한 알람의 지연
  - 게시된 예약 알림을 같은 id로 `dismissNotificationAsync`할 수 있는가

## R3. DAILY 반복을 고르지 않는다

- **소스**: `DailyTrigger.nextTriggerDate()`는 오늘 `hour:minute`가 지금보다 뒤면 오늘을 준다. 다시 걸어도 오늘 발화를 건너뛸 수 없다.
- **Decision**: 날짜별 일회 예약을 7개까지 건다(소유자 결정). 이미 쓴 날은 걸지 않고, 날짜(`data.day`)를 실어 020 라우팅이 그 날로 연다.
- **Alternatives**: DAILY 하나 — 목표 시각 전에 손으로 쓴 날에도 「쓸 차례」가 뜨고(원칙 V 계열) 날짜를 싣지 못한다.

## R4. 020의 「예약 알림 배제」 근거는 이 기능에 닿지 않는다

- 020 `research.md` §1은 DAILY 예약을 「그 시각에 일기가 생성돼 있다는 보장이 없다」로 배제했다. 그때 알림의 뜻은 「다 썼다」였다.
- 019 `spec.md` Clarifications의 「alarm 배제」는 **생성을 깨우는 수단**에 대한 것이었다.
- 이 기능의 알림은 「열면 쓴다」이고, 생성 트리거는 여전히 WorkManager/BGTask다.
- **Decision**: `notification-port.ts` 머리말의 「예약·DAILY 트리거를 쓰지 않는다」를 고친다. 완성 알림은 여전히 즉시 게시이고, 예약은 쓸 차례 알림 통로(`reminder-port.ts`)에만 둔다.

## R5. 완성 알림의 채널 (C2)

- **소스**: `scheduleNotificationAsync.js`의 `parseTrigger`는 `type`이 없고 `channelId`만 있는 객체를 안드로이드에서 `{ type: "channel", channelId }`로 바꾼다. 다른 플랫폼에서는 `null`(즉시)이다(`Platform.select`). 안드로이드 `ExpoSchedulingDelegate`는 `ChannelAwareTrigger`면 곧바로 `receive`한다.
- **Decision**: `present`가 `trigger: { channelId: "diary-completed" }`를 보낸다. iOS는 동작이 같다(즉시).
- **잠긴 계약**: `__tests__/schedule/notification-port.test.ts` 67–74가 `trigger: null`을 요구하고 `trigger: {`를 금지한다. 계약을 「`trigger: { channelId: CHANNEL_ID }` 하나, `SchedulableTriggerInputTypes`·`DAILY`·`date:` 없음」으로 바꾼다(C2를 고치는 것이 이 기능의 범위다).

## R6. 앞쪽 발화 숨김 (FR-021)

- **소스**: 안드로이드 `ExpoHandlingDelegate.handleNotification`은 `isAppInForeground()`(ProcessLifecycle RESUMED)일 때만 JS `handleNotification`에 묻는다. 뒤에 있으면 네이티브가 그대로 게시한다. iOS는 앞에 있을 때 `willPresent`가 JS 핸들러에 묻는다. 핸들러가 3초 안에 답하지 않으면 보이지 않는다.
- **Decision**: `App.tsx`의 `setNotificationHandler`가 순수 함수 `notificationBehaviorFor(notification)`(`src/app/notification-behavior.ts`)를 부른다. `data.kind === "write-reminder"`면 배너·목록·소리·배지를 모두 거짓으로, 그 밖은 지금 값(배너·목록 참)으로 둔다.

## R7. 맞추기를 부르는 자리 — 등록부를 듣는다

- **소스(080)**: 이 프로세스의 모든 쓰기와 지우기가 등록부 `liveWrites` 칸 하나를 지난다.
  - 홈의 쓰기(손으로·057·060 진단 요청)
  - 080 합류가 보는 남의 쓰기
  - 백그라운드·수동 태스크
  - 첫 실행 자동 첫 일기(`createAppPipeline`이 `beginWrite`를 주입)
  - 058 지우기(`beginWipe`)
- 칸은 `runStages`가 돌아온 뒤(저장 뒤)에 비고, 그때 `onChange`가 불린다.
- 홈에서 앱(`AppFrame`)으로 올라오는 성공 콜백은 없다. `onGenerated`는 `DiarySection` 안에서 캐릭터 선택만 저장하고, 첫 실행 자동 첫 일기는 성공을 밖으로 알리지 않는다(`Promise<void>`).
- **Decision**: 새 훅 `useReminderSync`(`src/app/use-reminder-sync.ts`)가 `AppFrame`에서 맞추기를 부른다(태스크는 아래 「헤드리스·순서」). 부르는 때는 다음과 같다.
  1. 마운트
  2. `AppState` → `active`
  3. `liveWrites.onChange`에서 칸이 비었을 때(`current() === null`) — 쓰기·지우기의 끝, 성공·실패 무관
  4. 자동 쓰기 설정(`settingsValues.autoDiary`)이나 이름(`customNames`)이 바뀔 때
- 각 성공 경로에 콜백을 더하지 않는다. 경로가 하나 늘어도 등록부를 지나면 맞춘다.
- **헤드리스·순서**: `runAutoDiaryTask`는 **끝날 때마다**(결과와 무관 — analyze 1회차: spec US1 AS7·US2 AS4가 「백그라운드가 돌 때」 연장·거둠을 요구한다) 맞추기를 직접 부르고, 저장 성공이면 그다음 완성 알림을 보낸다(FR-011). 15분마다 깨는 기기에서 알람을 매번 다시 걸지 않게 맞추기는 차이만 고친다(R16). 화면이 없는 실행에는 훅이 없기 때문이고, 완성 알림 전에 쓸 차례 알림을 거둬야 하기 때문이다. 앱이 그려져 있으면 훅도 같은 끝을 듣고 맞추기를 한 번 더 부른다. 맞추기는 모듈 하나의 순서 줄(`inOrder`, 078 시도 기록과 같은 꼴)로 세워 겹치지 않게 하므로 무해하다.
- **AppState를 `src/schedule/`에 두지 않는다**: OP7(`app-auto-write-source.test.ts`)이 금지한다. 훅은 `src/app/`에 둔다.
- **Alternatives**: 홈→앱 성공 콜백을 새로 내고 첫 실행 경로도 고친다 — 경로가 다섯이고, 하나를 빠뜨리면 조용히 안 맞춘다(080 「같은 상태를 나눠 쓰는 조립」 교훈). 등록부 한 곳이 더 좁다.

## R8. 표시 이름과 캐릭터

- **소스**: `task.ts`는 `loadSelection(expoSelectionPort())`로 캐릭터를 읽고 없으면 `no-character`로 건너뛴다. 이름은 `displayNameOf(character, await loadCustomNames(...))`다.
- **Decision**: 맞추기도 같은 통로로 캐릭터·이름을 읽는다.
  - 고른 캐릭터가 없으면 계획이 빈다. 자동 쓰기가 돌 수 없는 상태에서 「쓸 차례」를 알리지 않는다.
  - 이름을 못 읽으면 기본 이름이다(035 N3).

## R9. 062 골든 — 바뀐 값을 드러내는 방법

- **소스**: `__tests__/i18n/ko-golden.test.ts`
  - G1은 리터럴 집합을 비교한다. `ADDED_AFTER_GOLDEN`이 더해진 리터럴만 뺀다.
  - G2는 문구 함수 출력과 상수 JSON의 바이트를 비교한다. `SETTINGS_TEXT` 전체, `previewSentence` 0·9·12·22시 × h12·h24.
  - **값을 바꾸는 장치가 없다.** `GOLDEN_WRITE=1`은 「이전」을 지운다(AGENTS 062).
- 이 기능이 바꾸는 옛 값:
  - `settings.permBatteryHint`(G1 리터럴, G2 `SETTINGS_TEXT`)
  - `targetHour.preview`(G1 리터럴, G2 `previewSentence` 8개)
  - `settingsPlatform.permBatteryHintIos`(G1에서 `ADDED_AFTER_GOLDEN`, G2 밖)
  - 온보딩 `permissions.notifications`·`permissions["battery-exception"]`의 `rationale`·`ifDenied` 넷(R20, analyze 1회차)
- **Decision**: 골든 json은 다시 쓰지 않는다. 테스트에 `CHANGED_AFTER_GOLDEN`을 더한다.
  - 항목 하나 = `{ spec: "085", literal?: { from, to }, outputs?: [{ key, path?, from, to }] }`
  - G1은 골든 집합에서 `from`을 빼고 `to`를 넣어 비교하고, G2는 골든 JSON의 그 자리 값이 `from`임을 먼저 단언한 뒤 `to`로 바꿔 비교한다.
  - 「이전」은 json에, 「바뀜」은 테스트 표에 남는다.
  - `permBatteryHintIos`는 `ADDED_AFTER_GOLDEN`의 리터럴을 새 값으로 바꾼다(G2 밖).
- **Alternatives**:
  - 옛 키를 두고 새 키를 더한다 — 화면에 안 쓰이는 옛 문구가 카탈로그에 남는다.
  - 골든을 다시 쓴다 — AGENTS가 금지한다.

## R10. 새 문구의 자리

- 새 카탈로그 영역 `reminder`(`src/i18n/catalogs/ko/reminder.ts`). 062 골든 키에 묶인 영역(`settings`·`notification`)에 새 키를 섞지 않는다(074·078·081 선례).
  - `title(name, month, date)` — 조사는 `particleFor`. `notification.autoWriteDone`과 같은 꼴
  - `channelName`
  - `notificationOff`
  - `developerLine(n, month, date, hour)`
  - `developerNone`
- 바뀐 값 셋(`permBatteryHint`·`permBatteryHintIos`·`targetHour.preview`)은 제자리에서 값만 바꾼다(R9).
- 새 리터럴은 `ADDED_AFTER_GOLDEN`에 올린다.

## R11. 설정의 알림 꺼짐 줄

- **소스**: `SettingsScreen`의 권한 행은 `["notifications", SETTINGS_TEXT.permNotif]`를 튜플로 그린다. 사진 행에만 `photoSkipText`(빨간 `hint`, `hintTone: "danger"`)가 붙는다. `App.tsx` 2505–2508의 넘김은 SL3이 정규식으로 잠근다.
- **Decision**:
  - 순수 함수 `notificationOffLine(enabled, tag)`(`src/app/notification-off-line.ts`)가 `enabled && tag === "denied"`면 문구를, 아니면 `undefined`를 돌려준다. `unread`·`allowed`·`partial`이면 없다.
  - `SettingsScreen`에 `notificationOffText?` prop을 더하고 알림 행에 같은 꼴로 붙인다.
  - SL3·`photoSkipText`의 「한 번만」 계약은 그대로다.

## R12. 개발자 화면의 예약 줄

- **소스**: 078 `AttemptsGroup`·081 `FailuresGroup`은 `DeveloperScreen` 맨 아래에 있다. 데이터는 `AppFrame`의 `route === "developer"` effect(690–702)가 읽는다.
- **Decision**:
  - `ReminderPort.scheduled()`가 우리 접두사의 예약 `{ id, day, at, title }[]`를 준다(`at`은 `data.at` — R16. 읽지 못한 항목은 `at: null`).
  - 순수 함수 `reminderSummaryLine(list)`(`src/app/reminder-summary.ts`)가 문구를 만든다. 빈 목록이면 「예약 없음」, 아니면 개수와 가장 이른 `at`의 `M월 d일 H시`(24시간)다.
  - 읽기 실패는 `null`이고, 그러면 줄을 그리지 않는다.
  - `DeveloperScreen`의 `reminderLine?: string`은 `FailuresGroup` 아래 한 행으로 그린다. 위 행의 자리는 바뀌지 않는다.
  - 진단 화면에는 두지 않는다(spec FR-022는 개발자 화면).

## R13. 가드 표

- 새 `*_FILE` 상수가 없으므로 B6 목록은 그대로일 것이다(FR-018).
- `src/app/`·`src/ui/`의 새 파일이 `.reason`·`.detail`을 읽지 않으므로 B3도 그대로일 것이다.
- 069 G-1(층 1 기준 표)은 설정 파일을 늘리지 않으니 그대로다.
- **층 1 실행이 기기에 쓸 차례 예약을 남길 수 있다.** 기준 상태는 자동 쓰기 꺼짐이므로 맞추기가 취소한다.
- 바뀌면 그때 등록한다. 새 파일을 만든 뒤에는 `npm test` 전체를 돈다(AGENTS 078).

## R14. 쓸 차례 알림을 누르면 「한 번」이 다시 열린다 (FR-023, analyze 1회차 소유자 결정)

- **소스**: `src/app/use-auto-write-claim.ts`의 `claimed`는 프로세스가 사는 동안 한 번만 참이 된다. 배터리 예외가 없는 기기는 프로세스를 죽이지 않고 얼린다(079). 그래서 같은 실행으로 풀린 뒤 알림을 눌렀을 때, 그 실행에서 이미 한 번 시작했다면 저절로 쓰지 않는다.
- **Decision**:
  - 훅에 `rearmAutoWrite()`를 더한다. `claimed`를 거짓으로 되돌리고 `claimAutoWrite`의 의존성이 되는 state 번호를 올린다. 콜백의 정체가 바뀌어야 홈의 057 effect가 다시 돈다(`DiaryHomeScreen` 1089–1125의 deps에 `claimAutoWrite`가 있다).
  - `AppFrame`의 웜 응답 처리(`onResponse`)가 응답이 쓸 차례 알림일 때(`isWriteReminderResponse` — `data.kind === "write-reminder"`) 부른다. 콜드 스타트는 새 실행이라 「한 번」이 남아 있다.
  - 040 `firstRunTried`와 064 `writeBlocked`는 다시 여는 것보다 앞선다. 판정(`useAutoWriteHandoff`)은 `AppState` → `active`에 다시 돈다(082).
- **Alternatives**: 받아들인 한계로 두는 안 — 대상 사용자에게서 바로 일어나는 경로라 「열면 바로 써요」가 거짓이 된다. 소유자가 기각했다.

## R15. DB11 — `getHours()`

- **소스**: `__tests__/config/day-boundary-source.test.ts` DB11은 ALLOWED 목록 밖의 `getHours()` 호출을 막는다.
- **Decision**:
  - `reminder-plan.ts`는 `getHours()`를 쓰지 않는다. 발화 시각은 `new Date(y, m, d, targetHour)`로 만들고 비교는 `getTime()`으로 한다.
  - `reminder-summary.ts`가 보여 줄 「{H}시」는 `data.at`에서 얻은 표시용 시다. 하루를 계산하는 데 쓰는 값이 아니므로 DB11 ALLOWED에 이유와 함께 올린다(060 `manual.ts` 선례).

## R16. 맞추기는 차이만 고친다 — 울릴 시각을 `data.at`에 싣는다

- 「모두 취소 → 다시 걸기」는 15분마다 도는 태스크에서 알람을 매번 다시 걸고, 정각 근처에서 발화를 놓칠 틈을 만든다.
- **Decision**:
  - 예약 하나의 정체는 `id` + `data.at`(울릴 시각, ms) + `title`이다.
  - 걸린 것 중 계획에 같은 셋이 없는 것은 취소하고, 계획 중 걸리지 않은 것만 건다.
  - 걸린 것을 읽지 못하면(`scheduled()`가 던짐) 취소 없이 계획 전부를 건다. 같은 id면 expo가 바꿔 끼우므로 무해하다.
- `data.at`은 개발자 줄의 「다음 … 시」도 플랫폼과 무관하게 준다(R2 — iOS는 예약표에서 시각을 되읽지 못한다).

## R17. 채널을 먼저 보장한다 (FR-007)

- **소스**: `ensureChannel`은 `AppFrame` 마운트와 온보딩에서만 불린다. 안드로이드 expo는 없는 채널로 온 알림을 기본 채널(「Miscellaneous」)로 보낸다. 업데이트 뒤 앱을 열기 전에 헤드리스 태스크가 예약하거나 게시하면 채널이 없다.
- **Decision**:
  - 맞추기는 예약 전에 `prepare()`(= `ensureChannel`)를 부른다. 완성 알림도 게시 전에 부른다. 실패는 삼킨다.
  - 같은 id로 채널을 다시 만들어도 무해하다(이름만 갱신된다).

## R18. 실패와 「없음」을 가른다 (RC6)

- **소스**: `loadAutoDiarySettings`는 읽기에 실패해도 기본값(`enabled: false`)을 준다. 그대로 쓰면 일시적인 실패 한 번에 모든 예약을 취소하고 트레이를 비운다.
- **Decision**:
  - 맞추기의 기본 조립(`src/schedule/reminder-deps.ts`)은 설정 통로의 `read()`를 직접 부른다. 던지거나 **해석에 실패하면**(깨진 JSON) 「읽지 못함」으로 넘기고, 파일이 없으면(`null`) 기본값(꺼짐)으로 둔다. 쓰기 찰나의 `null`은 받아들인 한계다.
  - 일기 목록도 같다. 둘 중 하나라도 읽지 못하면 아무것도 바꾸지 않는다.
  - 고른 캐릭터(`loadSelection`)는 실패와 없음을 가르지 않으므로 없음으로 다룬다(받아들인 한계, spec Edge Cases).

## R19. 이름은 화면이 넘긴다

- **소스**: `onRenameCharacter`(App.tsx 1299–1317)는 `saveCustomNames`를 기다리지 않는다. 이름 파일은 지우고 옮기는 방식으로 쓰인다.
- **Decision**: 앱 훅은 `AppFrame`이 들고 있는 `customNames`를 맞추기 deps(`names`)로 넘기고, `loadName`이 그 값을 쓴다. 다만 `AppFrame`이 이름 파일을 아직 읽지 않았으면(초기값) `undefined`를 넘겨 파일을 읽게 한다 — 기본 이름으로 걸었다가 곧 다시 거는 일을 피한다. 태스크는 종전대로 파일을 읽는다.

## R20. 온보딩 문구 (FR-024)

- **소스**: `src/i18n/catalogs/ko/onboarding.ts`의 `permissions.notifications`와 `permissions["battery-exception"]`의 `rationale`·`ifDenied`. 062 골든 G1(리터럴)과 G2(`PERMISSION_REQUIREMENTS` 순회 — `ko-golden.test.ts` 230 부근)에 잡혀 있다.
- **Decision**:
  - 값만 바꾸고 R9의 `CHANGED_AFTER_GOLDEN`에 넷을 더한다.
  - 알림·배터리의 `ifDenied`가 보이는 곳은 온보딩 화면(`OnboardingScreen.tsx` 437·472)뿐이다. 홈 캡션은 사진의 것만 모으고, 설정은 `ifDenied`를 그리지 않는다. 옛 문구를 단언하는 테스트는 `__tests__/onboarding/requirements.test.ts` 83–86이다.
  - Maestro 흐름 둘(`.maestro/settings-time-place.yml`·`.maestro/scheduled-diary-notification.yml`, FLOWS 등록)이 옛 설정 문구를 단언한다 — 함께 고친다.

## R21. 082 계약 CL6과 「누르면 한 번 더」

- **소스**: `__tests__/app/use-auto-write-claim.test.tsx` 128–133(082 CL6)은 훅이 돌려주는 키를 정확히 `claimAutoWrite,spendAutoWrite`로 단언한다. `src/app/use-auto-write-claim.ts` 머리 주석과 AGENTS 082 절은 「소모는 되살아나지 않는다」고 적는다.
- **Decision**: FR-023이 그 계약의 유일한 예외다.
  - CL6을 「키는 `claimAutoWrite,rearmAutoWrite,spendAutoWrite`, 소모를 되돌리는 길은 쓸 차례 알림 응답의 `rearmAutoWrite`뿐」으로 고친다.
  - 082 계약 문서·머리 주석·AGENTS에 「→ 085 FR-023」을 단다.
  - `rearmAutoWrite`는 정체가 바뀌지 않는다(`useCallback(…, [])`, state는 updater로 올린다). 마운트 effect(`lastResponse`·`onResponse`)의 deps에 넣어도 그 effect가 다시 돌지 않는다.
