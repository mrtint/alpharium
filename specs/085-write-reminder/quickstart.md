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

(구현 뒤 채운다 — 알림이 뜬 시각과 목표 시각의 차이, 화면 끔·얼림 상태에서 뜬 여부, 거둠 여부)
