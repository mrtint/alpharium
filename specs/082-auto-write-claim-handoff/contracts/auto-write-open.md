# Contract: 앱 열기 자동 쓰기의 넘겨 둔 날과 「한 번」 (082)

057 `contracts/auto-write.md` OP1(문)과 064 AF3·AF4, 080 `contracts/live-write.md` H4·H6·H7·H8·H12는 그대로 유효하다. 이 문서는 그 위에 둘을 더한다 — 넘겨 둔 날이 비워지는 규칙(HO)과 지우기의 소모(CL·WP).

## HO — 넘겨 둔 날 (`src/app/use-auto-write-handoff.ts`)

- **HO1** 훅은 설정·미리보기 통로·건너뜀 통로가 모두 있을 때만 판정한다. 하나라도 없으면 판정하지 않고 `null`을 준다(057 그대로).
- **HO2** 판정은 `resolveAutoWrite` 하나다(백그라운드와 같은 판정). 훅은 판정 규칙을 갖지 않는다 — `decideSchedule`·`selectableDays`·`decideAutoWrite`를 직접 부르지 않는다.
- **HO3** 판정은 마운트 때, 설정·통로의 참조가 바뀔 때, `AppState`가 `active`로 바뀔 때 다시 한다. `AppState.currentState`를 읽지 않는다.
- **HO4** 판정이 `write`면 그 날을, 그 밖(`idle`·`skip`)이면 「없음」을 반영한다. ★ 결함 A — 「쓰지 않는다」가 앞의 「쓴다」를 지운다.
- **HO5** 돌려주는 값은 반영된 판정의 설정이 **지금 설정과 같은 참조**일 때만 그 날이다. 설정이 바뀐 렌더부터 새 판정이 반영될 때까지 `null`이다. ★ effect에서 비우지 않는다(렌더에서 가른다).
- **HO6** 살아 있지 않은 effect의 판정(설정이 바뀌었거나 언마운트됨)은 반영하지 않는다.
- **HO7** 같은 effect 안에서 겹친 판정은 가장 늦게 시작한 것만 반영한다.
- **HO8** 시도 기록(`recordAttemptEnd(port, "app-open", now, attemptOutcomeOf(decision))`)은 HO6·HO7과 무관하게 판정마다 남긴다(078). 통로가 없으면 남기지 않는다.
- **HO9** 사진 권한 건너뜀(`skip` + `no-photo-access`)은 effect가 살아 있을 때 `onSkipped(day)`를 부른다(057 FR-021 그대로).
- **HO10** 판정이 던지면 삼킨다 — 반영하지 않고 화면에 드러내지 않는다.
- **HO11** 「지금」은 주입받는다(`now?: () => Date`, 기본 `() => new Date()`). 판정 한 번에 한 번 읽어 판정과 시도 기록에 같은 값을 쓴다.
- **HO12** 훅은 흉내 미리보기를 모른다 — 받은 `previewDay`를 그대로 판정에 넘긴다(064 AF4: 조립부가 실제 `wiring.previewDay`를 넘긴다).

## CL — 한 번 (`src/app/use-auto-write-claim.ts`)

- **CL1** `claimAutoWrite()`는 흉내 기록을 읽기 전(`simulationLoaded`가 거짓)에는 소모하지 않고 거짓이다(064).
- **CL2** 첫 실행 자동 첫 일기를 시도한 실행(`firstRunTried.current`)이거나 이미 소모됐으면 거짓이다(057·040).
- **CL3** 그 밖에는 소모하고, 흉내로 막혀 있지 않을 때만 참이다(064 AF3).
- **CL4** `writeBlocked`가 참이 되면 소모한다 — 흉내를 꺼도 같은 실행에서 저절로 시작하지 않는다(064 AF3).
- **CL5** `spendAutoWrite()`는 조건 없이 소모한다. 돌려주는 값이 없다. ★ 결함 B의 통로.
- **CL6** 소모는 되돌릴 수 없다 — 훅에 되살리는 함수가 없다(spec Clarifications: 설정을 켜는 것이 「한 번」을 되살리지 않는다).
- **CL7** `firstRunTried`는 렌더가 아니라 콜백 안에서 읽는다(React Compiler).

## WP — 조립 (`App.tsx`)

- **WP1** `requestWipe`는 지우기 결과가 `busy`가 아닐 때 `spendAutoWrite()`를 부르고, 그 호출은 `setDiaryKey(` 보다 앞이다.
- **WP2** `busy`면 `spendAutoWrite()`를 부르지 않는다(같은 분기 안에만 있다).
- **WP3** `spendAutoWrite(`를 부르는 곳은 `App.tsx`에서 한 곳이다(「온보딩부터 다시」·「모듈 다시 받기」는 부르지 않는다).
- **WP4** `DiarySection`은 훅이 돌려준 값을 그대로 홈의 `autoWriteDay`에 넘긴다. `App.tsx`에 `setAutoWriteDay`·`autoWriteClaimed`가 남아 있지 않다.
- **WP5** 훅에 넘기는 미리보기 통로는 실제 `wiring.previewDay`다(064 AF4 — 흉내 미리보기가 아니다).
- **WP6** `resolveAutoWrite(`를 부르는 화면 쪽 코드는 훅 한 곳이다 — `App.tsx`는 직접 부르지 않는다.

## AS — 조립 테스트 (진짜 판정 + 진짜 홈 + 진짜 파이프라인·등록부)

하니스: 바깥이 `useAutoWriteClaim`을, key로 다시 마운트되는 안쪽이 `useAutoWriteHandoff`와 `DiaryHomeScreen`을 갖는다(`AppFrame`·`DiarySection`의 배치 그대로). 파이프라인은 `createPipeline()` + 가짜 백엔드, 등록부는 `createLiveWrites()`.

- **AS1** (US1-1) 꺼짐 → 켬(판정이 날을 넘김, 홈은 덮여 있음) → 끔 → 덮임을 푼다 → 등록부 `beginWrite` 0회·백엔드 `generate` 0회(쓰기가 시작된 횟수로 센다 — FR-014; 아래 「0회」·「1회」도 같다).
- **AS2** (US1-2) 켬 → 판정 완료(날이 넘어감, 홈은 덮여 있음) → 끔, **꺼짐 판정을 끝내지 않은 채** 덮임을 푼다 → 0회. 그 뒤 꺼짐 판정을 끝내도 0회. (HO5가 막는 틈이다 — 늦게 끝난 켬 판정은 HO6이 막고 훅 단위에서 본다.)
- **AS3** (US1-4) 켠 채 덮임을 푼다 → 그 날을 1회 쓴다.
- **AS4** (US2-1) 모두 써 있는 채 마운트(시작하지 않음) → 일기를 비우고 `spendAutoWrite()` → key를 올린다 → 0회.
- **AS5** (US2-2) AS4 뒤 `AppState` `active` → 0회.
- **AS6** (US1-5) `spendAutoWrite()` 뒤 꺼짐 → 켬 → 덮임을 푼다 → 0회.
- **AS7** (US3-1·US3-2) 켜진 채 마운트 → 1회 쓰고, 그 뒤 `AppState` `active`에도 2회째가 없다.
- **AS8** (US2-3) AS4 뒤 하니스 전체를 새로 마운트한다(새 실행 — 「한 번」이 새것이다) → 그 날을 1회 쓴다.
- **AS9** (US2-5) AS4 뒤 홈의 쓰기 버튼을 누른다 → 쓴다(소모는 저절로 시작만 막는다).
- **AS11** (FR-001, 같은 설정에서 바뀜) 켜진 채 마운트(홈은 덮여 있음) → 판정 완료(날이 넘어감) → 그 날의 재료가 사라진 뒤(미리보기 대역을 사진 0장으로 바꾼다) `AppState` `active` → 판정 완료(`재료 없음`) → 덮임을 푼다 → 0회. (HO4가 홀로 막는다 — 설정은 그대로다.)
- **AS10** (FR-005) 켜진 채 마운트해 홈이 쓰기 시작한 뒤(백엔드를 문으로 막아 둔다) 꺼진 설정으로 바꾼다(넘겨 둔 날이 없어진다) → 그 쓰기는 끊기지 않고, 문을 열면 저장된다.

스펙의 나머지 시나리오가 닿는 곳: US1-3(시각을 바꿔 차례가 아니게 됨)은 훅 단위 HO4·HO5, US2-4(`busy`)는 소스 계약 WP2, US3-3(합류 실패 뒤 이어 쓰기)은 080 `home-join.test.tsx`(수정 없이 통과), US3-4(흉내)는 훅 단위 CL4와 064 `home-simulation.test.tsx`, US3-5(첫 실행)는 훅 단위 CL2. Edge Cases의 「살아 있는 쓰기를 끊은 지우기 뒤에도 다시 쓰지 않는다」는 CL5(조건 없는 소모)·WP1이, 「지운 실행에서는 합류한 쓰기가 실패해도 이어 쓰지 않는다」는 CL6(되살리지 않는다)이 받는다 — 080의 이어 쓰기 자체는 `home-join.test.tsx`가 잠근다.

## X — 바꾸지 않는 것

- **X1** `src/schedule/`의 어떤 파일도 바뀌지 않는다.
- **X2** `src/ui/DiaryHomeScreen.tsx`의 제품 코드가 바뀌지 않는다.
- **X3** 새 저장 파일·새 문구·새 의존성이 없다(062 골든·069 기준 표가 그대로다).
- **X4** 두 훅은 `src/ui/`·`diary/pipeline`·`inference/`를 import하지 않는다.

## 위반 주입 (되돌린 뒤 원래 문자열을 grep으로 확인한다)

| 넣는 것 | 실패해야 하는 것 |
| --- | --- |
| HO4 — `write`가 아닐 때 반영을 건너뛴다(옛 동작) | AS11, 훅 단위 HO4 (AS1은 HO5가 있으면 통과한다 — HO4·HO5를 함께 빼야 실패한다) |
| HO4·HO5를 함께 뺀다(옮겨 온 옛 동작) | AS1·AS2·AS11 |
| HO5 — 돌려줄 때 설정 비교를 뺀다 | AS2, 훅 단위 HO5 |
| HO6 — effect 정리의 `alive` 확인을 뺀다 | 훅 단위 HO6 |
| HO7 — 번호 확인을 뺀다 | 훅 단위 HO7 |
| CL5 — `spendAutoWrite`가 아무것도 하지 않는다 | AS4·AS6, 훅 단위 CL5 |
| WP1 — `requestWipe`에서 `spendAutoWrite()`를 뺀다 / `setDiaryKey` 뒤로 옮긴다 | 소스 계약 WP1 |
| CL4 — 흉내 소모 effect를 뺀다 | 훅 단위 CL4 |
