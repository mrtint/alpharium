# Quickstart — 085 쓸 차례 알림 확인

계약은 [contracts/write-reminder.md](./contracts/write-reminder.md)에 있다.

## 1. 기기 없이

```bash
npx jest __tests__/schedule/reminder-plan.test.ts __tests__/schedule/reminders.test.ts __tests__/schedule/reminder-port.test.ts __tests__/schedule/reminder-deps.test.ts __tests__/schedule/task-reminder.test.ts --selectProjects logic
npm test          # 전체 — 새 파일을 만든 뒤에는 반드시 (가드 표 B3·B6·069 G-1)
npm run lint      # eslint + tsc + 헌법 검사 + prettier
```

위반 주입 V1~V12는 하나씩 주입한다. 치환이 실제로 들어갔는지 먼저 grep으로 확인한다(AGENTS). 그다음 해당 테스트가 실패하는지 보고 되돌린다.

## 2. 실기기 준비 (SM-S901N, dev — 맥)

- adb: `~/Library/Android/sdk/platform-tools/adb`. Metro는 `.env.development.local`(`EXPO_PUBLIC_APP_ENV=dev`)로 띄우고 `adb reverse tcp:8081 tcp:8081`을 건다.
- **네이티브 변경은 없다** — 기기의 debug APK에 맥의 Metro 번들을 올린다. 083에서 맥으로 재설치한 APK다. 서체 변경이 이미 들어가 있는지 확인하고, 없으면 083 §2a대로 한다.
- **백업**(시작 전 — `adb shell … >`은 바이너리를 망가뜨릴 수 있어 `exec-out`을 쓴다):
  ```bash
  adb exec-out run-as com.a810labs.pocketlog tar cf - files/diary files/preferences files/vision-cache > .cache/085-backup.tar
  tar tf .cache/085-backup.tar | head   # 지우기 전에 백업이 읽히는지 확인한다(일기 파일이 보여야 한다)
  ```
- 자동 쓰기를 켜고, 목표 시각을 「지금 시 + 1」로 둔다. 시각 대화상자는 시 단위다. 정각을 기다리기 어렵다면 확인 절차는 지금 시가 바뀌는 정각에 맞춘다.
- 예약 확인:
  - `adb shell dumpsys alarm | grep -A3 com.a810labs.pocketlog`(알람)
  - 개발자 화면 맨 아래 「쓸 차례 알림 · …」 줄(DV)
- 게시 확인:
  - `adb shell dumpsys notification --noredact | grep -B2 -A12 com.a810labs.pocketlog`
  - 채널은 `channel=diary-reminder` / `diary-completed`로 본다.

## 3. 시나리오

| # | 상태 | 절차 | 기대 |
| --- | --- | --- | --- |
| A | 배터리 예외 **끔** (`dumpsys deviceidle whitelist -com.a810labs.pocketlog`), 오늘 사진 있음, 오늘 안 씀 | 목표 시각 전에 홈 버튼 → `svc power stayon false` → `KEYCODE_SLEEP`(화면 끔) → 목표 시각을 기다린다 | 화면이 꺼진 채 알림이 뜬다(채널 「일기 쓸 시각 알림」). 뜬 시각을 `dumpsys notification`의 `when`으로 남긴다. 누르면 앱이 그 날로 열리고 「쓰는 중」 → 저장. 저장 뒤 트레이에 그 알림이 없다 |
| B | 배터리 예외 **있음**, 오늘 안 씀 | 목표 시각에 쓸 차례 알림이 뜬 뒤 홈 버튼 상태에서 `cmd jobscheduler run -f com.a810labs.pocketlog <잡 번호>` | 백그라운드 저장 뒤 쓸 차례 알림이 트레이에서 사라지고, 완성 알림이 「일기 완성 알림」 채널로 뜬다(SC-002·SC-004) |
| C | 목표 시각 전 | 홈에서 오늘을 직접 쓴다 | 개발자 줄의 다음 예약이 내일로 바뀐다. 목표 시각에 알림이 없다(SC-003) |
| D | 설정 | 자동 쓰기 끔 | 개발자 줄 「예약 없음」, `dumpsys alarm`에 우리 알람 없음(SC-006) |
| E | 설정 | 알림 권한을 OS에서 끄고 돌아옴 | 알림 행 아래 빨간 줄. 다시 허용하면 사라진다 |
| F | 앱이 앞에 있음 | 목표 시각을 앱 안에서 맞는다 | 배너도 트레이도 없다(FR-021) |
| A′ | 배터리 예외 끔, 오늘 사진 있음, 같은 실행에서 앱 열기 자동 쓰기가 이미 한 번 시작함 | 어제를 비우고 재료를 둔 채 앱을 열어 자동 쓰기가 시작·저장되게 한 뒤(「한 번」 소모), 오늘을 안 쓴 채 홈 버튼 → 화면 끔 → 목표 시각 → 알림을 누른다(같은 pid인지 `pidof`로 확인) | 앱이 그 날로 열리고 「쓰는 중」 → 저장(FR-023) |
| G | 설정·온보딩 | 시각 대화상자 미리보기·배터리 행 문구, 개발자 메뉴 「온보딩부터 다시」의 배터리 단계 카드 | ST3·ST4·ST5 문구 그대로 |
| H | 켜짐 | 개발자 화면의 예약 줄과 `dumpsys alarm`·`dumpsys notification`의 예약 수·다음 시각 대조 | 같다(SC-007) |
| I | 켜짐 | 휴대폰 설정 → 앱 → 알림에서 「일기 쓸 시각 알림」만 끈 뒤 목표 시각과 백그라운드 완성을 맞는다 | 쓸 차례 알림은 안 보이고 완성 알림은 보인다(US3 AS3) |

- 배터리 예외는 끝나면 되돌린다(`+com.a810labs.pocketlog`). `dumpsys battery reset`, `svc power stayon usb`도 되돌린다.
- **복원**(끝나면):
  ```bash
  tar tf .cache/085-backup.tar > /dev/null && \
  adb shell "run-as com.a810labs.pocketlog sh -c 'rm -rf files/diary files/preferences files/vision-cache'"
  adb push .cache/085-backup.tar /data/local/tmp/
  adb shell "cat /data/local/tmp/085-backup.tar | run-as com.a810labs.pocketlog tar xf -"
  ```
  복원 뒤 앱을 한 번 열어 맞추기가 돌게 한다(백업 시점 설정으로 예약이 다시 맞춰진다).

## 4. iOS 시뮬레이터 (가능하면)

- 시뮬레이터는 BGTask를 돌리지 않는다. 확인할 것은 예약이 걸리는지, 정각에 뜨는지, 누르면 그 날로 열리는지, 앞에 있을 때 숨는지다.
- 실제 iPhone은 없다 — 미확인으로 남긴다.

## 실측

### 위반 주입 (T043, 2026-10-15) — 12개 모두 실패로 뒤집혔고 되돌린 뒤 원문 확인

| # | 실패한 테스트 |
| --- | --- |
| V1 쓴 날 빼지 않음 | reminder-plan 2건 |
| V2 오전 목표의 그 날 몫 = 발화일 | reminder-plan 3건 |
| V3 같은 예약도 다시 걸기 | reminders 2건 |
| V4 완성 알림 뒤에 맞추기 | task-reminder 2건 |
| V5 칸이 찰 때도 맞추기 | use-reminder-sync 2건 |
| V6 `present`를 `trigger: null`로 | notification-port 1건 |
| V7 앞에서도 보임 | notification-behavior 1건 |
| V8 `unread`에서도 꺼짐 줄 | notification-off-line 2건 |
| V9 설정 못 읽으면 꺼짐으로 | reminders 2건 |
| V10 골든 `from` 틀림 | ko-golden 1건 |
| V11 웜 응답에서 rearm 빼기 | app-auto-write-source 1건 |
| V12 완성 알림 전 채널 보장 빼기 | task-reminder 2건 |

### 실기기 (SM-S901N Android 16, dev — 기기 debug APK + 맥 Metro, 2026-10-15)

준비: 백업(`exec-out` tar, `tar tf`로 확인), 오늘 사진 4장 `seed:day one-place`, 자동 쓰기 켬·목표 14시(파일로). 배터리 예외 **없음**(`deviceidle whitelist`에 없음).

- **예약**: 앱을 연 직후 선택 파일이 없어 예약 0건 → 원인은 캐릭터 규칙(research R8, 구현 중 고침). 홈이 어제를 써 선택 파일이 생기자 7건(`RTC_WAKEUP … NOTIFICATION_EVENT`, 오늘 14:00 ~ 10-21 14:00). 오늘 14:00 알람은 `window=+42m`(부정확 — 14:00~14:42에 울릴 수 있다), 다음 날부터는 `window=+1h`.
- **★ A — 얼어 있는 동안에는 뜨지 않았다.** 13:04 홈 → `KEYCODE_SLEEP`. 13:05 `FreecessController: FZ : com.a810labs.pocketlog … reason: LEV`, 그 뒤 계속 `freezer:/frozen`(pid 21544 그대로). 14:00 알람은 **14:30:46 `AlarmManager: Deferring alarm … com.a810labs.pocketlog due to freecess`**로 미뤄졌고 14:45까지 알림이 없었다. 화면을 켜도(잠금 화면) 풀리지 않았다.
- **프로세스가 죽으면 곧바로 떴다.** 14:46 `am kill`(캐시 프로세스 정리 — OS가 메모리 부족으로 하는 일과 같다) → 새 프로세스가 미뤄진 알람을 받아 **14:46:14 「금동이가 10월 15일 일기를 쓸 차례예요」**(`channel=diary-reminder`, 본문 없음)를 게시했다.
- **B(예외 없이 일어남) — 백그라운드가 쓰고, 쓸 차례 알림을 거두고, 완성 알림.** 같은 새 프로세스에서 잡이 돌아(14:46:20 시작, 화면 끔) 14:49:45에 오늘 일기를 저장. 로그 순서: `14:49:45.644 notification_cancel … diary-reminder-2026-10-15`(사유 8 = 앱이 취소) → `14:49:45.762 notification_enqueue … channel=diary-completed`(완성 알림). 그 직후 다시 `freezer:/frozen`. 시도 기록 `백그라운드 · 썼음`.
- **C·H — 쓴 날은 예약하지 않는다, 개발자 줄 = 예약표.** 오늘을 쓴 뒤 예약은 10-16~10-22 14:00 일곱. 개발자 화면 맨 아래 「쓸 차례 알림 · 7개 예약 · 다음 10월 16일 14시」.
- **D — 끄면 0, 켜면 7**(`dumpsys alarm`의 우리 알람 수).
- **E — 알림 권한을 끄면 빨간 줄**(「알림이 꺼져 있어 쓸 차례를 알리지 못해요」, 꼬리표 「허용 안 함」), 허용하고 돌아오면 사라진다. ⚠️ Maestro `launchApp`은 권한을 자동으로 허용한다 — 권한을 회수한 실험은 `am start`로 띄운다.
- **G — 문구**: 배터리 행 「제한 없음이면 열지 않아도 먼저 써 둘 때가 있어요」, 시각 대화상자 「매일 오후 2시쯤 그날 일기를 쓸 차례라고 알려요. 열면 바로 써요. 이미 쓴 날은 건너뛰어요.」
- **관찰 함정**: `dumpsys notification`의 `grep pkg=`는 지난 알림 기록(`mArchive`)까지 센다 — 처음에 「거둬지지 않았다」로 잘못 읽었다. 트레이(활성)는 맨 앞 「Notification List」 구간만 보거나 `notification_cancel`·`notification_enqueue` 이벤트 로그로 본다.

- **★ RC8 결함 — 지난 시각의 예약을 맞추기가 취소했다.** 17시로 F를 다시 세웠을 때 17:00 예약은 전달되지 않고 **17:01:54에 취소됐다**(`App Alarm history … Reason=alarm_cancelled`, 우리 PendingIntent). 원인: 17:01:53 백그라운드 잡(`BackgroundTaskConsumer: Executing task 'pocketlog-auto-diary'`)이 끝나며 맞추기를 불렀고, 계획은 `at <= now`인 오늘 17:00 발화를 빼므로 차이 맞추기가 「계획에 없음」으로 취소했다. 부정확 창·얼림 동안 맞추기가 한 번만 돌아도 그날 알림이 사라진다. 고침: 지난 예약은 켜져 있고 그 날을 안 썼고 사흘 안이면 둔다(RC8, 테스트 4건, 위반 주입 V13). 앞의 16:00 시도가 16:29까지 전달되지 않은 것도 같은 원인일 수 있다(16:30 복원 전 기록은 남기지 못했다 — 짐작).
- **F — 앞에서 발화하면 숨긴다(확인).** RC8을 고친 번들로 목표 18시를 걸고(오늘 안 씀) 앱을 앞에 둔 채 화면을 켜 두었다. 18:00 예약은 **18:08:49.521에 전달**됐고(`App Alarm history`에 취소 사유 없음 — 8분 49초 지연), 18:08:49.551 expo가 받았으며(`Notification request "diary-reminder-2026-10-15" will not trigger in the future, removing`), 그 뒤 `notification_enqueue`가 **없었다** — 그 순간 앱은 `ResumedActivity`였고 활성 알림 목록에 우리 알림 0건. 그 사이 맞추기가 지난 예약을 지우지도 않았다(RC8).
- **정리**: 심은 오늘 사진 4장 삭제 + `scan_volume`, 백업 복원(일기 10-07 한 편·preferences 둘 — 자동 쓰기 꺼짐), 앱을 한 번 열어 쓸 차례 예약 0건 확인, `svc power stayon false`, 배터리 예외는 처음부터 없었고 그대로.

**미확인**: A′(얼었다 풀린 같은 실행에서 누름 → 한 번 더) — 얼어 있는 동안은 알람이 미뤄지므로 같은 실행에서 알림이 뜨는 경우가 드물다(배터리 예외·iOS). 기기 없는 조립 테스트(RA7)로만 본다. I(쓸 차례 채널만 끔), iOS 시뮬레이터, 다른 기기, release.
