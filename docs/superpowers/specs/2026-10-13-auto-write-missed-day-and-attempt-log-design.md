# 자동 쓰기: 놓친 날 다시 쓰기와 시도 기록 — 설계 (078)

날짜: 2026-10-13. 브랜치 `078-auto-write-retry-and-attempt-log`.

## 왜

iPhone(TestFlight)에서 자동 일기 쓰기가 동작하지 않는다. 조사 결과(2026-10-13, 코드·`expo-background-task`·`expo-task-manager` iOS 네이티브 소스 읽기) 배선은 정상이고, 원인은 **자동 쓰기 판정이 안드로이드 WorkManager의 「15분마다 깨운다」를 전제로 한 것**이다:

- `decideSchedule`(020 D2)은 콜백이 `[목표 시각, +3시간)` 창 안에 와야만 쓴다. iOS는 `BGProcessingTaskRequest` 하나를 `earliestBeginDate = 지금 + 15분`으로 제출하고 실제 실행은 OS가 유휴·충전·네트워크(`requiresNetworkConnectivity = true` 고정) 조건에서 하루 한 번 안팎으로 고른다. 창 밖에서 깨면 `skipped`이고 다음 기회도 OS 재량이라 **창 안 시도가 0회인 날이 대부분**이다.
- 앱을 열면 쓰기(057)도 같은 판정을 쓰므로 iOS에서는 「목표 시각 3시간 안에 앱을 연 날」에만 작동한다.
- 스와이프 종료·백그라운드 앱 새로 고침 꺼짐·저전력 모드면 iOS가 깨우지 않는다. 깨워도 시간 예산 만료·메모리로 프로세스가 정지되면 **일기도 알림도 실패 기록도 없다** — 지금은 「한 번도 안 깼다」와 「깼는데 창 밖이었다」와 「완주하다 끊겼다」를 가릴 증거가 없다.

실제 iPhone이 없다. 그래서 **기기 없이 할 수 있는 둘**을 한다: (1) 창 밖에서 깨도 놓친 날을 쓰게 판정을 바꾼다, (2) 자동 쓰기가 판정에 들어갈 때마다 기록을 남겨 진단 화면에 보인다. 백그라운드 완주의 시간·메모리(4번 원인)는 이 조각이 다루지 않는다 — 실기기 없이는 어느 설계도 통과를 말할 수 없다(원칙 V).

## 조각 1 — 놓친 날은 창과 무관하게 쓴다 (`decideSchedule`)

**규칙**: 오늘은 지금처럼 시도 창 안에서만 쓰고, **지난 날(`selectableDays` 중 오늘이 아닌 날) 가운데 안 쓴 날은 언제 깨든 쓴다.** 「매일 쓰는 시각」의 뜻(오늘 일기를 쓰기 시작하는 시각)은 그대로이고 「놓친 날은 다음 기회에 쓴다」가 더해진다. 플랫폼 분기는 없다(안드로이드도 같은 규칙 — 어제 시도가 전부 실패했으면 오전 콜백이 어제를 쓴다).

**새 D2 (판정 순서, 고정)**:

1. `settings.enabled === false` → `{ act: false, reason: "disabled" }`.
2. `near` = `now`의 현지 시가 `[targetHour, targetHour + WINDOW_HOURS)` 안인가(자정 wrap은 그대로).
   후보 = `near`면 `selectableDays` 전부, 아니면 `selectableDays`에서 `today`를 뺀 것.
3. `pickRetryDay(후보, existingDiaryDays)`가 날을 주면 → `{ act: true, day }`.
4. `null`이면: `near`가 아니고 `today`가 `selectableDays`에 있으며 안 쓴 날이면 `not-near-target`, 그 밖은 `all-written`.

**시그니처**: 입력에 `today: DayDate`를 더한다(`dayOf(now)` — `resolveAutoWrite`가 `selectableDays(now)`와 함께 넘긴다). `decision.ts`는 하루 경계를 계산하지 않는다는 020의 원칙(FR-021a)을 지키려고 `dayOf`를 import하지 않고 주입받는다. `WINDOW_HOURS`는 여전히 export하지 않는다(D3). `pickRetryDay`는 바꾸지 않는다(D5).

**바뀌지 않는 것**: 정오 규칙(`selectableDays`가 오늘을 정오 이후에만 넣는다 — 049)·사흘·재료 판정(057 `resolveAutoWrite`)·사진 권한 건너뜀 기록·060 `manual`(목표 시각을 지금 시로 덮으므로 늘 `near`)·056 미리보기 문장(「0–11시면 어제」는 여전히 사실). 049가 남긴 원칙 II 관찰(오전에 오늘을 지어내기)은 커지지 않는다 — 오늘은 창 밖에서 쓰지 않는다.

**iOS에서 기대하는 동작**: 밤에 OS가 창 밖에서 깨워도 어제가 비어 있으면 쓴다. 깨우지 않아도 다음 날 앱을 열면 어제를 쓴다(057 경로). 일기가 하루 늦게 생긴다.

**영향 범위**: `src/schedule/decision.ts`, `src/schedule/auto-write.ts`(입력 전달), `specs/020-scheduled-diary-notification/contracts/schedule-decision.md` D1·D2 개정, `__tests__/schedule/decision.test.ts`(창 밖 지난 날 케이스 추가, 기존 「창 끝 10시면 근방 아님」류는 「오늘은 안 쓴다, 지난 날은 쓴다」로 다시 쓴다), `auto-write.test.ts`.

### 리뷰 뒤 고친 것 (2026-10-13, 브랜치 전체 리뷰)

위 규칙을 그대로 두면 안드로이드에서 두 가지가 달라진다는 것이 리뷰에서 드러나 같은 브랜치에서 고쳤다. 위 「바뀌지 않는 것」의 「056 미리보기 문장은 여전히 사실」은 아래 첫 줄을 넣은 뒤에야 참이다.

- **오전 목표의 어제는 오늘 목표 시각에 차례가 온다.** 오전 목표(0–11시)의 창은 어제를 겨냥한다 — 「지난 날은 언제든」을 그대로 적용하면 자정 직후 첫 콜백이 어제를 써서 고른 시각이 무의미해진다. 창 밖 후보는 **차례가 이미 지난 날**로 좁힌다: 오늘은 빼고, 창이 어제를 겨냥하는데 오늘 목표 시각이 아직 안 왔으면 어제도 뺀다. 입력에 `targetDay: "today" | "yesterday"`를 더한다(`day-boundary.ts`의 `includesTodayAtHour(목표 시)` — 정오 상수는 밖으로 나가지 않는다). 오후 목표의 어제는 새벽에도 쓴다.
- **창 밖 따라잡기는 백그라운드에서 하루에 한 번만 판정한다.** 시도 창은 재시도의 유일한 상한이었다 — 창 밖 쓰기를 허용하면 계속 실패하는 지난 날을 15분마다 온종일 다시 돌린다. `task.ts`가 `preferences/auto-write-catch-up.json`(`{"on"}` 날짜 하나)을 보고, 오늘 몫을 썼으면 신호도 읽지 않고 `catch-up-spent`로 끝낸다. 창 안·수동 실행·앱 열기 경로는 이 상한을 타지 않는다. 결과 갈래가 열셋이 된다.

## 조각 2 — 자동 쓰기 시도 기록

**무엇을**: 자동 쓰기가 **판정에 들어갈 때마다** 한 줄. 060 쓰기 실패 기록(`src/app/write-failures.ts`)과 같은 꼴·같은 통로 패턴이다.

```ts
type AttemptPath = "background" | "app-open" | "manual";
type AttemptOutcome =
  | "started"            // 시작만 기록되고 끝이 없다 = 프로세스가 도중에 정지됐다(iOS 만료·메모리, 안드로이드 kill)
  | "simulation"         // 064 상태 흉내가 막음
  | "disabled" | "not-near-target" | "all-written"      // 020 판정
  | "catch-up-spent"     // 창 밖 따라잡기의 오늘 몫을 이미 썼다(리뷰 뒤 더함)
  | "no-photo-access" | "no-material"                   // 057 판정
  | "no-character"       // 고른 캐릭터 없음
  | "write"              // app-open 전용: 쓸 날을 홈에 넘겼다(결과는 홈이 쓰고 실패는 060 기록이 받는다)
  | "already-running" | "ran" | "failed";               // 파이프라인 결과
type Attempt = { at: Date; path: AttemptPath; outcome: AttemptOutcome };
```

- **갈래는 사람이 못 박은 상수**이고 코드가 늘리지 않는다. 시간·바이트·토큰·단계별 소요는 기록하지 않는다(원칙 IV). 판정 이유 문자열(`reason`)도 싣지 않는다 — 갈래만.
- **저장**: `preferences/auto-write-attempts.json` `{ items: [{ at, path, outcome }] }`, 최신이 앞, **최근 20건**(`MAX_AUTO_WRITE_ATTEMPTS`). 같은 프로세스의 기록은 한 줄로 세워 쓴다(겹치면 뒤에 쓴 쪽이 앞 줄을 덮는다 — 구현 중 더함). 못 읽거나 깨졌으면 빈 목록. 깨진 항목은 건너뛴다(060과 같다). 쓰기 실패는 삼킨다 — 기록이 자동 쓰기를 막지 않는다.
- **시작과 끝을 따로 쓴다**: `recordAttemptStart(port, path, at)`가 `outcome: "started"` 줄을 맨 앞에 넣고, `recordAttemptEnd(port, path, at, outcome)`가 **같은 `at`·`path`의 줄을 찾아** 결과로 바꾼다(없으면 맨 앞에 넣는다 — 잃지 않는다). 끝이 영영 안 오면 `started`가 남는다 — 그것이 「끊겼다」의 증거다.
- **어디서 부르는가**:
  - `runAutoDiaryTask`(백그라운드·`manual`): 들어가자마자 `start`(`path`는 `deps.manual`이면 `manual`), 모든 반환·예외 경로에서 `end`. 결과 대응: 흉내 → `simulation`, `!app.ok` → `failed`, `resolveAutoWrite` `idle` → 그 `reason`, `skip` → 그 `because`, 캐릭터 없음 → `no-character`, 파이프라인 `ok` → `ran`, `already-running` → `already-running`, 그 밖 실패·예외 → `failed`. 통로는 `deps.attemptPort?`로 주입(기본 `expoAutoWriteAttemptPort()`), 테스트는 대역.
  - 앱 열기(`App.tsx` `DiarySection`의 `resolveAutoWrite` 호출): 판정 결과를 한 줄로 **바로 끝까지** 쓴다(`start` 없이 `end` 한 번 — 판정 자체는 끊길 일이 없다). `write`면 `write`. 홈의 실제 쓰기 결과는 기록하지 않는다 — 화면이 보이고 실패는 060이 받는다. 전경 복귀마다 판정하므로 줄이 쌓인다 — 바로 앞 줄과 경로·결과가 같으면 새 줄 대신 시각만 갱신해 백그라운드 줄이 상한 밖으로 밀리지 않게 한다.
  - 040 첫 실행 자동 첫 일기·홈의 수동 쓰기·진단 「한 번 써 보기」는 자동 쓰기가 아니다 — 기록하지 않는다.
- **보이는 자리 둘** (구현 중 고침, 2026-10-13): 처음에는 진단 화면만 적었는데 **진단 화면은 개발 환경 전용**이라(060) TestFlight(배포) 빌드의 테스터가 볼 수 없다. 그래서 같은 묶음(공용 부품 `AttemptsGroup`)을 **개발자 화면 맨 아래**(「끄기」 아래, 배포 빌드에서도 설정 → 「버전」을 1초 안에 7번 탭 → 「개발자」 맨 아래로 열림 — 보드 `6e`·`6j` 밖, 소유자 확인 대상)에도 둔다. `AppFrame`이 개발자 겹이 열릴 때 읽는다.
- **진단 화면**: 「최근 실패」 묶음 아래 「최근 자동 쓰기 시도」 묶음. 줄마다 라벨 「{경로} · M월 d일 HH:mm」, 값 「{결과}」. 경로 문구 셋(백그라운드·앱 열기·지금 실행)과 결과 문구 열둘은 카탈로그(`src/i18n/catalogs/ko/`)의 **새 영역**에 둔다(062 — 옛 골든 영역에 키를 더하지 않는다). 줄 조립은 `src/app/diagnostics-view.ts`의 순수 함수 `attemptLines()`(`failureLines`와 같은 모양, 시각 형식도 같은 `failureTime`). 읽기는 `DiagnosticsLayer`가 실패 기록과 같은 시점(마운트·「자동 쓰기 지금 실행」 뒤)에 한다. 빈 목록은 「아직 시도가 없어요」.
- **지우지 않는다**: 058 일기 모두 지우기·059 개발자 끄기·온보딩 다시는 이 파일을 건드리지 않는다(060 실패 기록과 같다).
- **iOS에서 읽는 법**: 테스터가 개발자 화면(설정 → 「버전」을 1초 안에 7번 탭 → 「개발자」 맨 아래) 스크린샷을 보낸다. **`background` 줄이 없으면** OS가 깨우지 않았다(스와이프 종료·앱 새로 고침·저전력을 묻는다 — 앱을 여는 순간 `app-open` 줄은 늘 생기므로 「줄이 아예 없다」는 일어나지 않는다). `background · started`가 남아 있으면 도는 중이거나 프로세스가 죽었다. iOS는 예산이 끝나면 죽이지 않고 멈추므로, 앱을 열 때 이어져 끝난 `background · failed`(밤 시각)도 같은 원인일 수 있다. 정본은 AGENTS 078의 읽는 법이다. 앱을 백그라운드로 다시 띄운 실행에서는 `App.tsx`도 그려지므로 `app-open` 줄이 같이 남을 수 있다 — 정상이다.

**영향 범위**: 새 `src/app/auto-write-attempts.ts`(순수 + 기기 통로), `src/schedule/task.ts`, `App.tsx`(`DiarySection` 한 곳 + `DiagnosticsLayer` 읽기·전달), `src/app/diagnostics-view.ts`, `src/ui/DiagnosticsScreen.tsx`(묶음 하나), `src/i18n/catalogs/ko/`(새 영역 + `index.ts` 등록), `scripts/constitution-rules.ts`(새 파일이 `src/app/`이라 `checkScheduleFile`에 걸리지 않는다 — `task.ts`가 `app/write-failures`를 이미 import하는 것과 같은 방향; 검사가 걸리면 그 자리에 이유를 적는다).

## 검증

- 기기 없는 테스트(TDD): `decision.test.ts`(새 D2 — 창 밖 어제 안 씀→씀, 창 밖 오늘만 안 씀→`not-near-target`, 창 안은 종전과 같음, 전부 씀→`all-written`), `auto-write.test.ts`(`today` 전달), 새 `__tests__/app/auto-write-attempts.test.ts`(갈래 상수·시작/끝 짝·상한 20·깨진 파일·쓰기 실패 삼킴·`end`가 짝을 못 찾으면 앞에 넣음), `background-generation.test.ts`·`task-manual.test.ts`·`task-simulation.test.ts`(결과마다 기록 대역이 받는 갈래), `diagnostics-view.test.ts`(`attemptLines`), `DiagnosticsScreen` 화면 테스트(묶음·빈 줄), i18n 골든·카탈로그 타입, 헌법 검사·`tsc` 0.
- 위반 주입: 판정에서 오늘을 거르는 필터를 빼면 창 밖 오늘 케이스가 실패하는지, `recordAttemptEnd`를 한 경로에서 빼면 그 경로 테스트가 `started`로 남아 실패하는지.
- 안드로이드 dev 실기기(SM-G986N): 진단 「자동 쓰기 지금 실행」 → 「지금 실행 · 시각」 줄과 결과(`ran` 또는 건너뜀 갈래), 창 밖에서 어제 일기를 지우고 앱을 열면 어제를 쓰는지(조각 1 + `app-open · write`), 헤드리스 잡 한 번(`background` 줄). 파일은 `run-as`로 본다.
- **미확인으로 남기는 것**: iOS 전부(시뮬레이터는 BGTask를 스케줄하지 않는다 — 068). TestFlight 빌드(`buildNumber` 올림)는 소유자가 올리고 테스터 스크린샷을 받는다.

## 문서

- `AGENTS.md`: 020 「시도 창」 서술을 새 규칙으로 고치고(이력을 덧대지 않는다), 「078」 항목에 iOS 원인 조사 결론·기록 읽는 법·미확인을 적는다. 068의 「iOS BGTask 실제 동작 미확인」은 그대로다.
- `docs/roadmap/README.md`: iOS 백그라운드 완주 실측(4번 원인) 과제를 남긴다 — 실제 iPhone이 전제다.
