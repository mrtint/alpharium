# Contract: 예외 읽기 통로 · 지연 규칙 · 맞추기

테스트 위치: `__tests__/schedule/battery-exception-port.test.ts`, `reminder-plan.test.ts`, `reminders.test.ts`, `reminder-deps.test.ts`.

## BE — 읽기 통로 (`src/schedule/battery-exception-port.ts`)

- **BE1**: `BatteryExceptionPort`에 `readStatus(): Promise<BatteryExceptionStatus>`가 있다. 던지지 않는다.
- **BE2**: 안드로이드에서 `isBatteryOptimizationEnabledAsync()`가 `true`→`restricted`, `false`→`exempt`.
- **BE3**: 호출이 던지거나 모듈을 못 불러오면 `unknown`.
- **BE4**: iOS이면 `expo-battery`를 부르지 않고 `unknown`(플랫폼은 `appPlatform(Platform.OS)`, `Platform`은 호출 시점 `require("react-native")`로 읽는다 — `await import("react-native")` 금지, 066).
- **BE5**: `expo-battery`를 부르는 곳은 이 파일 하나뿐이다(소스 계약). 반환값 외에 아무것도 남기지 않는다(원칙 IV).
- **BE6**: 기존 `openSettingsList()`는 그대로다.
- 통로는 덮을 수 있다(`platform`·`loadBattery` 주입) — 테스트가 기기 없이 돈다.

## RD — 지연 규칙 (`src/schedule/reminder-plan.ts`)

- **RD1**: `reminderDelayFor("exempt") === 30`, 그 밖 `0`. `REMINDER_DELAY_MINUTES`는 30.
- **RD2**: `planReminders`는 `delayMinutes`(정수, 0~59)를 받아 모든 항목의 `at`에 더한다. 범위 밖(음수·60 이상·소수·NaN)은 `RangeError`.
- **RD3**: `id`·`day`·`title`은 `delayMinutes`와 무관하다 — 같은 입력에서 `delayMinutes`만 달라도 `id`·`day`·`title`이 같다.
- **RD4**: `delayMinutes = 0`의 결과는 이 변경 전 계획과 완전히 같다(기존 RP1~RP8 테스트가 0으로 그대로 통과).
- **RD5**: 정각이 `now` 이전이고 `정각+delay`가 `now` 이후이면 그날 발화가 계획에 든다(`delay > 0`일 때). 오전 목표(0~11시)의 「그날/어제」 매핑은 정각 기준이다.

## RC — 맞추기 (`src/schedule/reminders.ts`, `reminder-deps.ts`)

- **RC9**: `ReminderDeps.loadBatteryStatus(): Promise<BatteryExceptionStatus>`가 있다. 던지면 맞추기는 `unknown`으로 본다(맞추기를 멈추지 않는다 — RC6의 「설정·목록을 못 읽으면 멈춘다」와 다르다: 상태는 정보이지 판단 근거가 아니다).
- **RC10**: 맞추기는 `reminderDelayFor(status)`를 계획에 넘긴다. 설정이 꺼졌으면 읽지 않는다(불필요한 호출 없음).
- **RC11**: 걸린 예약의 `at`이 새 계획과 다르면(예: 정각으로 걸려 있다가 `exempt`가 되어 +30분) 새 시각으로 바뀐다. 취소와 재예약이 같은 `id`로 이뤄져도 최종 상태는 새 `at` 하나다.
- **RC12 (안전장치 불변)**: 어떤 상태·지연에서도 맞추기는 `writtenDays`에 든 날의 예약만 거둔다. 일기 파일이 없는 날의 예약은 취소되지 않는다. 쓰기 시작·진행 중 신호는 맞추기의 입력이 아니다.
- **RC12a (코드 리뷰 회귀)**: 정각은 지났고 정각+30분 전일 때(예: 22:10, 목표 22시) 상태가 `exempt`가 아니게 읽혀도(`unknown`·`restricted`·읽기 실패) `exempt` 계획의 같은 `id`·같은 시각(+30분)으로 걸린 예약은, 그 날 일기 파일이 없고 계획에 같은 `id`가 없으면 취소하지 않는다(`keepDelayed`). 목표 시각을 바꿔 시각이 맞지 않는 옛 예약은 종전대로 거둔다.
- **RC13**: 조립 테스트 — `exempt`로 걸어 둔 예약이 쓰기 저장(목록에 날이 생김) 뒤 맞추기에서 거둬지고, 저장 전에는 남는다.
- **RD6 (기본 조립)**: `expoReminderDeps()`의 `loadBatteryStatus`는 `expoBatteryExceptionPort().readStatus()`를 부른다(덮을 수 있다).

## 위반 주입

- 계획에서 `delayMinutes`를 `restricted`에도 적용하게 바꾸면 RD1/RC10 테스트가 실패해야 한다.
- 맞추기의 취소 조건을 「쓰는 중」으로 바꾸면 RC12가 실패해야 한다.
