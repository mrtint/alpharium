# Contract — 090

## CU 따라잡기 몫 (`src/schedule/task.ts`)
- **CU1** 창 밖, 판정 `write` → 몫을 오늘로 쓰고 파이프라인을 부른다.
- **CU2** 창 밖, 판정 `skip`(재료 없음·사진 권한 없음)·`idle`(모두 써 있음 등) → 몫을 쓰지 않는다. 같은 날 다음 판정이 다시 신호를 읽는다.
- **CU3** 몫이 오늘이면 신호를 읽지 않고 `catch-up-spent`(078 그대로).
- **CU4** 판정 `write`라도 캐릭터 없음으로 끝나면 몫을 쓰지 않는다 — 몫은 캐릭터를 읽은 뒤, 파이프라인을 부르기 직전에 쓴다(spec FR-001).
- **CU5** 창 안·수동은 몫과 무관(078 그대로).

## HO 보이지 않는 홈 (`src/app/use-auto-write-handoff.ts`)
- **HO13** `platform === "ios"`이고 마운트 때 앱 상태가 `background` → 첫 판정 없음, 시도 기록 없음. 이후 `active` 변화 → 판정 1회.
- **HO14** `platform === "android"`(상태 무관) 또는 iOS `active` 마운트 → 종전대로 마운트 즉시 판정.
- **HO15** 플랫폼은 조립부(`App.tsx`)가 `appPlatform(Platform.OS)`로 넘긴다 — 훅이 `Platform`을 읽지 않는다.

## AT 시도 기록 (`src/app/auto-write-attempts.ts`)
- **AT11** `expired` 갈래가 `ATTEMPT_OUTCOMES`에 있고 화면 문구 「시간 예산이 끝남」.
- **AT12** `recordAttemptStart(port, path, at, launch?)`가 `launch`를 싣고, `recordAttemptEnd`가 줄을 바꿀 때 `launch`를 보존한다.
- **AT13** 읽기는 `launch`가 두 값 밖이면 필드 없이 읽는다. 옛 줄(필드 없음) 그대로.
- **AT14** `recordAttemptExpired(port, at)`는 `background` 경로의 새 줄을 맨 앞에(합치기 규칙 적용). 실패는 삼킨다.

## EX 만료 (`src/schedule/task.ts` + `src/app/bg-expiry-port.ts` + `modules/pocketlog-bg-expiry`)
- **EX1** 백그라운드 실행 동안만 구독한다 — 시작 전·끝난 뒤의 만료는 줄 없음. 수동 실행은 구독하지 않는다.
- **EX2** 구독 중 만료 → `recordAttemptExpired` 1회(같은 실행에서 여러 번 와도 1회).
- **EX3** 네이티브 모듈이 없으면(안드로이드·jest) 구독은 no-op이고 던지지 않는다.
- **EX4** Swift 모듈은 `Notification.Name("onTasksExpired")`를 관찰해 이벤트 `onExpired`를 보낸다 — 이름 문자열은 expo 소스와 같다(소스 계약이 `node_modules/expo-background-task/ios/BackgroundTaskModule.swift`의 이름과 대조).

## LS 깨운 상태 (`src/app/launch-state-port.ts`)
- **LS1** 호출 시점 `require("react-native")`(동적 import 금지 — 066 계약 테스트 범위에 넣는다). `active`/`background`만 돌려주고 그 밖·예외는 `undefined`.
- **LS2** `src/schedule/`의 소스에 `AppState` 낱말이 없다(024 그대로 — task.ts는 주입 통로 이름만 본다).

## TX 문구
- **TX1** `permBatteryHintIos` = 「충전 중이고 저전력 모드가 꺼져 있으면 먼저 써 둘 때가 있어요」, 안드로이드 `permBatteryHint`·`targetHour.preview` 불변.
- **TX2** 시도 줄에 `launch`가 있으면 결과 뒤 「· 앞에서」/「· 뒤에서」 꼬리.
