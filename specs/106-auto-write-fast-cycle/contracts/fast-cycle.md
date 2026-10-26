# Contract: 빠른 주기 해석 (FC)

- **FC1** 배포 동치: `productionTiming(settings)`로 낸 `decideSchedule`·`resolveAutoWrite`·`planReminders` 결과는 이 기능 이전과 같다. 기존 테스트는 입력 모양(`timing` 인자)만 맞추고 기대값은 바꾸지 않는다.
- **FC2** `loadScheduleTiming({ devEnvironment: false })`는 기록 통로를 부르지 않고 배포 timing을 돌려준다. 환경을 판정하지 못한 경우(`resolution.ok === false`)는 `showsOnScreen`이 참이므로 개발 환경으로 본다 — 기존 규칙을 따르며 이 모듈이 따로 정하지 않는다.
- **FC2a** `loadFastCycleRecord({ devEnvironment, port })`도 같은 가드다: `devEnvironment`가 거짓이면 통로를 부르지 않고 `null`, 참이면 유효한 기록 또는 `null`.
- **FC3** `devEnvironment: true`이고 기록이 유효하면 빠른 주기 timing, 기록이 없거나 읽기가 던지거나 모양이 틀리면 배포 timing(꺼짐).
- **FC4** 빠른 주기 `inWindow(now)`는 `[startMs, windowEndMs)`에서만 참이다. 창 밖은 `decideSchedule`이 `not-near-target`(오늘이 안 쓴 날이고 후보에 들었을 때) 또는 `all-written`을 낸다 — 창 밖 후보는 오늘 하나라 `dueOutsideWindow`가 오늘을 뺀 빈 목록을 만들고 `waiting`은 `pickRetryDays(selectableDays, …)`로 가른다. 계획 단계에서 `waiting` 계산이 `timing.candidateDays`를 쓰도록 맞춘다.
- **FC5** 빠른 주기 후보 날은 오늘 하나다. 지난 날이 안 쓴 상태여도 후보에 들지 않는다.
- **FC6** `planReminders` 빠른 주기: `enabled`이고 이름이 있으면 정확히 한 개 — 다음 주기 시작 + `delayMinutes`. `written`을 보지 않는다. `enabled`가 아니면 빈 목록.
- **FC7** 주기 값 검증: 5 ≤ N ≤ 180 정수만. 직접 입력 문자열은 공백을 자르고 십진 정수 문자열만 받는다(`"30"` 가, `"30.5"`·`"3e1"`·`""` 불가).
- **FC8** 가드·읽기 위치는 소스 계약으로 잠근다(헌법 검사 `FAST_CYCLE_LEAKS` FL1~FL3 — research R13).
