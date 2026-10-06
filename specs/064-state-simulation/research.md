# Research: 상태 흉내

## R1 — 흉내 값을 어디에 담는가

- **Decision**: `preferences/simulation.json` 한 파일, `{ "date"?: "YYYY-MM-DD", "failToast": bool, "noMaterial": bool, "noPhoto": bool }`. 모두 꺼지면 파일을 지운다(「파일 없음 = 꺼짐」).
  통로 모양은 059 `developer-menu-store.ts`를 따른다(임시 파일에 쓰고 옮김, 읽기는 던지지 않음).
- **Rationale**: 보드 「앱을 껐다 켜도 유지」, D3(설정 파일에 필드를 더하지 않는다, 실행 이력 없음), 헤드리스 태스크가 같은 파일을 읽어야 한다(분해 설계 §3.7).
- **Alternatives**: 메모리만(유지 요건 위반) · `developer-menu.json`에 필드 추가(059 DS1 「켜짐 하나뿐」 위반) · `auto-diary.json`(020 S7 위반).

## R2 — 효력과 상태를 누가 드는가

- **Decision**: 순수 `effectiveSimulation(state, devEnvironment)` — 배포 환경이면 언제나 꺼짐. `AppFrame`이 `useSimulation({ devEnvironment, port })`로 마운트 때 한 번 읽어
  들고(배포 환경은 읽지 않는다), 바꾸면 즉시 상태를 바꾸고 파일에 쓴다(쓰기 실패는 삼킨다 — 059 FR-009와 같다). 개발자 메뉴를 끄면 `clear()`.
- **Rationale**: 개발자 겹은 닫히면 언마운트되므로 상태는 `AppFrame`이 든다(056·059). 환경 판정은 `showsOnScreen`(D2), `process.env`를 읽지 않는다(FR-009a).
- **Alternatives**: 겹이 열릴 때마다 읽기(056에서 「읽는 중」 깜빡임이 문제였다).

## R3 — 날짜 흉내는 어디에 꽂는가

- **Decision**: `DiaryHomeScreen`은 이미 `now?: () => Date` prop을 받는다(기본 `new Date()`). `AppFrame`이 `simulatedNow(date, real)` — 흉내 날의 **실제 시각**(시·분·초) — 을 돌려주는
  함수를 만들어 `DiarySection` → `DiaryHomeScreen`으로 넘긴다. 날짜 흉내를 켜거나 바꾸면 `AppFrame`의 `chosenDay`를 그 날로, 끄면 `dayOf(new Date())`로 둔다(Clarification Q1).
- **Rationale**: 큰 숫자·스트립·미래 칸·`writtenAtText`·`DateJumpDialog`가 모두 `now()`를 거친다. 자정 타이머는 `nextDayStartAt(now()) - now()`라 실제 자정에 울리지만 그때도 `now()`가 흉내 날이라
  날이 넘어가지 않는다(FR-006). `simulatedNow`는 `day-boundary.ts`의 `dayBounds(day).startMs`에 실제 시각의 「자정 이후 경과」를 더해 만든다 — `getHours() ±`로 하루 기준을 옮기지 않는다(DB11).
- **건드리지 않는 곳**: `DiarySection`의 `canPrepare`(`selectableDays(new Date())`)·`resolveAutoWrite`(`now: new Date()`)·`photoDays` 탐색은 실제 시각 그대로다(FR-015, 백그라운드 `decideSchedule`과 같은 쪽).

## R4 — 재료 0·권한 없음 흉내는 어디에 꽂는가

- **Decision**: 순수 `simulatedPreviewDay(state)` — 흉내가 없으면 `undefined`, 있으면 `(day) => Promise<DayPreview>`를 돌려준다. 권한 없음 = `{ photos: unknown, places: unknown, photoAccess: "denied" }`,
  재료 0 = `{ photos: none, places: none, photoAccess: "ok" }`. 둘 다면 권한 없음(B7). `DiarySection`이 `previewDay={override ?? wiring.previewDay}`로 **홈에 넘기는 것만** 바꾼다.
- **Rationale**: 053의 신호 줄·`2e`·`2l` 모양은 `DayPreview`만 보고 그려진다(`decideMaterial`·`MaterialGrid`). 신호를 지어내 파이프라인에 넣지 않는다(§3.7 원칙 I 경계). `resolveAutoWrite`는
  `wiring.previewDay`(실제)를 그대로 쓴다.
- **Alternatives**: `signals/fake.ts` 사용(원칙 I — `src/ui/`가 import하지 못한다, AGENTS).

## R5 — 실패 토스트 흉내

- **Decision**: `DiaryHomeScreen`에 `simulatedFailToast?: boolean`. 켜져 있고 홈이 **덮이지 않은 상태가 될 때**(마운트·`covered`가 참 → 거짓) 054 토스트 `{ kind: "plain" }`을 한 번 올린다.
  날을 바꾸면 054 FR-018대로 사라진다.
- **Rationale**: Clarification(B1) 「홈이 다시 보일 때마다」. 054의 토스트 모양·위치·쓸기를 그대로 확인하는 것이 목적이다. 문구는 다섯 갈래가 같다(054 소유자 결정).

## R6 — 홈 쓰기 차단과 토스트

- **Decision**: `DiaryHomeScreen`에 `writeBlocked?: boolean`·`onWriteBlocked?: () => void`. `write()`의 **맨 앞**에서 막혀 있으면 `onWriteBlocked()`만 부르고 돌아간다(재료 확인·덮어쓰기 확인·
  `resolve`를 거치지 않는다). 057 자동 시작 effect와 060 쓰기 요청 effect도 막혀 있으면 시작하지 않는다(쓰기 요청은 비운다). `AppFrame`은 `onWriteBlocked`에서 059 토스트 줄
  (`useToastLine`, 2초, `DeveloperToast`)에 `sim.blockedToast`를 올린다.
- **057 claim**: `claimAutoWrite`가 막혀 있으면 **한 번을 소모하고** 거짓 — 흉내가 켜진 실행에서는 앱 열면 쓰는 중이 없고, 흉내를 끈 뒤 같은 실행에서 저절로 시작하지 않는다.
- **쓰는 중**: 흉내를 켜는 순간 이미 쓰는 중이면 그대로 끝까지 간다(spec Assumptions) — 차단은 시작만 본다.
- **Rationale**: 054 실패 토스트(`FailureToast`)는 실패 갈래 표의 것이고 쓸기로 닫힌다. 보드 `6i` ②는 「2초」 — 059 토스트 줄이 이미 2초 한 줄이다(새 부품 없음).

## R7 — 회색 쓰기 바·DEV 표시

- **Decision**: `DiaryListScreen`에 `simulation?: { onOpenDeveloper: () => void }`. 있으면 (1) 월 라벨 오른쪽에 DEV 꼬리표(1px 글자색 테두리, 고정폭 10/700, 누르면 `onOpenDeveloper`, 접근성 라벨
  「개발자」), (2) `WriteBar`·`RewriteBar`의 면을 `SIMULATION.barFill`(보드 neutral-300 `#d7d3d3`), 글자를 `SIMULATION.barText`, 오른쪽에 DEV 꼬리표. testID는 그대로 `write-button`.
- **글자 색**: 보드 neutral-700 `#605d5d`는 `#d7d3d3` 위 4.39:1로 AA(4.5:1) 미달 — 043 관례대로 한 칸 진한 neutral-800 `#444141`(6.81:1)을 쓰고 `__tests__/theme-tokens.test.ts`에 4.5:1 하한으로 잠근다.
- **개발자 바로 열기**: `AppFrame`의 `setRoute("developer")` — 설정 겹이 아래에 함께 열린다(059 R8, `open = settings||developer`).

## R8 — 백그라운드·진단

- **Decision**: `runAutoDiaryTask` 시작에서 `resolution` 판정 직후, 파이프라인을 만들기 전에 `simulationBlocksWriting(effectiveSimulation(await loadSimulation(port), showsOnScreen(resolution)))`이면
  `"skipped"`. 알림·실패 기록 없음(FR-013 — `"skipped"`는 060이 기록하지 않는 갈래). 수동 실행(진단)도 같은 길이다. 통로는 `deps.simulationPort`로 갈아 끼운다.
  진단: `DiagnosticsScreen`에 `writeBlocked?: boolean` — 참이면 두 행에 `onPress`를 넘기지 않고(058 관례) `hint`로 `sim.blockedToast`.
- **Rationale**: 헤드리스에는 `AppFrame`이 없다 — 파일을 읽는 수밖에 없다(§3.7). 판정 함수는 하나다(FR-012).

## R9 — 날짜 대화상자

- **Decision**: `SimulationDateDialog` — `DismissibleDialog`(050) + `react-native-ui-datepicker` 날짜 격자(최소·최대 없음), 머리는 고른 달 표시, 아래 행동 둘 「끄기」·「취소」. 날을 누르면 바로 적용·닫힘
  (056 대화상자 관례 — 칸을 누르면 바로 적용). 「끄기」는 날짜 흉내가 켜져 있을 때만 누를 수 있다. `day.date`의 dayjs 변환은 `app/calendar.ts`의 `dayDateFromPicker()` 한 곳(AGENTS).
- **Alternatives**: `DateJumpDialog` 재사용 — 미래 칸 방어(`maxDate`·`disabledDates`)와 「쓴 날 점」이 들어 있어 미래를 고를 수 없다(B2와 충돌).

## R10 — 경계 검사

- **Decision**: 헌법 검사 `SIMULATION_LEAKS` 두 방향.
  1. `src/app/simulation*.ts`는 `diary/pipeline`·`schedule/decision`·`schedule/auto-write`·`signals/`(타입 제외 없이 전부)를 import하지 않는다.
  2. `src/diary/`·`src/signals/`·`src/inference/`·`src/vision/`·`src/schedule/`(단 `task.ts`는 예외)는 `app/simulation`을 import하지 않는다. `task.ts`는 `simulationBlocksWriting`·`effectiveSimulation`·
     `loadSimulation`·store 통로 외의 이름을 쓰지 않는다(`simulatedNow`·`simulatedPreviewDay` 금지).
  위반 주입으로 둘 다 확인한다. 소스 계약 테스트: 다섯 진입점이 차단을 본다(`write()` 맨 앞·057 effect·060 effect·claim·`task.ts`).
- **Rationale**: SC-005, §3.7 「흉내 값이 파이프라인·`src/schedule/`에 닿지 못하게 헌법 검사를 하나 더한다」.

## R11 — 문구

- **Decision**: 새 카탈로그 영역 `simulation`(`catalogs/ko/simulation.ts`)에 `groupSim`(상태 흉내)·`simDate`(오늘 날짜)·`simFail`(실패 토스트 보기)·`simEmpty`(쓸 재료 0으로 보기)·`simNoPhoto`(사진 권한 없음으로 보기)·
  `simBlockedToast`·`devBadge`(DEV)·`simDateOff`(끄기, **보드 밖**)·`simDateCancel`(취소)을 더한다. 062 골든(G1·G2)은 「이관 전 문구 = 카탈로그」이므로 새 항목은 골든 기준선 밖의 새 영역이거나
  골든이 새 영역을 받아들이는지 구현에서 확인한다(062 「카탈로그 영역은 옛 상수와 같은 키만 갖는다(새 문구는 별도 영역)」). 「개발 빌드만」은 기존 `developer.devOnly`를 쓴다.

## R12 — Maestro

- **Decision**: `.maestro/state-simulation.yml` — 설정 → 개발자 → 「쓸 재료 0으로 보기」 켬 → 홈: DEV 꼬리표·`write-button` 누름 → 차단 토스트 문구 → 일기 화면으로 안 넘어감(`stop-button` 없음) →
  다시 개발자에서 끔 → DEV 없음. `scripts/run-device-tests.mjs`의 `FLOWS`에 등록(AGENTS ⚠️). 흉내를 끈 채로 끝낸다(기기 상태를 바꾸지 않는다).
