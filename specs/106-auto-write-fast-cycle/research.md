# Research: 106 빠른 주기와 080 잔여

각 결정은 설계문서·스펙 Clarifications를 코드 읽기로 확인한 것이다(관측이 아니라 소스 읽기).

## R1 — 시간 규칙을 `ScheduleTiming`으로 모은다

- **Decision**: `src/schedule/timing.ts`(순수)에 인터페이스를 둔다.
  - `inWindow(now)`: 지금이 시도 창 안인가.
  - `targetAhead(now)`: 목표 시각이 아직 안 온 오전 목표인가(`yesterdayStillAhead`의 조건 절반).
  - `targetDay`: `"today" | "yesterday"`(창이 겨냥하는 날).
  - `candidateDays(selectable, today)`: 후보 날. 배포는 입력 그대로, 빠른 주기는 `[today]`.
  - `reminderDelayCap`: 배터리 예외 알림 지연 상한(배포 30 = `REMINDER_DELAY_MINUTES`, 빠른 주기 min(30, 창 분)).
  - `kind`: `"production" | "fast-cycle"`(알림 계획과 진단이 갈래를 본다).
- **배포 동치**: `productionTiming(settings)`는 지금의 `isNearTarget`(시 단위, 3시간, 자정 wrap)·`yesterdayStillAhead`(`getHours() < targetHour`)·`includesTodayAtHour(targetHour)`를 **그대로 옮긴** 구현이다. 로직을 새로 짜지 않으므로 기존 `decision`·`auto-write`·`reminder-plan` 테스트가 수정 없이 통과해야 한다(SC-002). `isInTargetWindow(settings, now)`(task.ts가 부름)는 `timing.inWindow(now)`로 대체하고 옛 export는 얇게 남기지 않고 호출부를 고친다(AGENTS: 복제를 남기지 않는다).
- **Rationale**: `targetHour`를 읽는 곳은 decision.ts(3곳)·reminder-plan.ts(2곳)·auto-write.ts(1곳)·manual.ts(1곳)·settings-effects.ts·UI 문구뿐이다. 한 인터페이스 뒤로 넣으면 변경이 판정 입력에 한정된다.
- **Alternatives**: (a) 가상 시계 오프셋 — 미래 날짜 일기가 실제 데이터를 오염시켜 기각(소유자 결정). (b) `settings.targetHour`를 분 단위로 확장 — 설정 모양·화면·마이그레이션이 번져 기각. (c) `decideSchedule`에 `devOverride` 불리언 추가 — 분기가 판정 안으로 들어가 기각.

## R2 — 주기 수학 (`cycleOf`)

- 자정(`dayBounds(day).startMs`)부터의 경과 ms를 `N × 60_000`으로 나눈 몫이 순번이다. 주기 id = `"<day>#<순번>"`. 시작 = 자정 + 순번 × N분. 끝 = min(시작 + N분, 다음 자정). 창 끝 = 시작 + min(⌊N/2⌋분, 끝 − 시작).
- DST로 하루가 23·25시간이어도 ms 산술이라 격자가 어긋나지 않는다(자정이 기준이고 마지막 주기가 잘릴 수 있다는 스펙 Edge Case와 같다).
- `getHours()`/`getMinutes()`로 하루 기준을 옮기지 않는다 — `dayOf`·`dayBounds`만 쓴다(DB11). 배포 `inWindow`는 기존 `getHours()` 사용을 그대로 옮긴 것이라 `timing.ts`를 DB11 허용 목록에 이유와 함께 올린다(`manual.ts`가 올라 있는 방식, `scripts/constitution-rules.ts`).
- 다음 주기 시작(`nextCycleStart(now)`)은 현재 끝 시각이다.

## R3 — 기록 모양과 가드

- `preferences/dev-fast-cycle.json` = `{ "periodMinutes": 30, "resetCycle": "2026-10-26#14" }`. 켜짐일 때만 파일이 있다(064 `simulation.json`·`developer-menu.json`과 같은 방식 — 새 필드를 `auto-diary.json`에 더하지 않는다, S7).
- 파싱: JSON 객체가 아니거나 `periodMinutes`가 5~180 정수가 아니거나 `resetCycle`이 문자열이 아니면 **꺼짐**(`null`). 부분 손상을 켜짐으로 채우지 않는다(원칙 V).
- 가드: `loadScheduleTiming({ devEnvironment })`는 `devEnvironment`가 거짓이면 파일을 **읽지도 않고** 배포 timing을 준다. 설정 없이 기록만 필요한 리셋·화면은 같은 가드를 쓰는 `loadFastCycleRecord({ devEnvironment, port })`를 쓴다(거짓이면 통로를 부르지 않고 `null`). 가드 없는 읽기 `loadFastCycle`은 `timing-source.ts` 안에서만 부른다. `devEnvironment`는 호출부가 `showsOnScreen(resolution)`으로 구해 넘긴다(064 `useSimulation`·`task.ts`가 하는 방식). `process.env`는 이 모듈에서 읽지 않는다.
- 헤드리스(`task.ts`)는 `deps.resolution ?? currentEnvironment()`를 이미 쓴다 → 같은 값을 넘긴다. 앱 열기 훅은 `AppFrame`이 쥔 `showsDiagnostics`를 `devEnvironment`로 받는다.

## R4 — 주기 리셋 절차 (`resetFastCycleIfDue`)

- 위치: `src/app/fast-cycle-reset.ts` (`wipe-diaries.ts`와 같은 층·같은 의존 모양: store, notifiedPort, dismiss, liveWrites).
- 순서(`wipeDiaries`에서 가져온 것과 다른 것):
  1. 개발 환경이 아니거나(`devEnvironment` 거짓) `loadFastCycleRecord`가 `null`(기록 없음·깨짐)이면 즉시 `{ reset: false }`. 켜져 있으면 `fastCycleTiming(periodMinutes, now)`로 현재 주기를 구한다.
  2. 현재 주기 id가 기록의 `resetCycle`과 같으면 `{ reset: false }`.
  3. `liveWrites.beginWipe()`로 칸을 차지한다. `null`이면(쓰기·지우기가 살아 있다) 아무것도 건드리지 않고 `{ reset: false }` — 다음 판정이 다시 시도한다. **쓰기를 끊지 않는다**(`wipeDiaries`와 다른 점 — 그것은 사용자 명령이라 끊는다).
  4. 오늘(`dayOf(now)`)의 일기를 `store.removeDay`로 지운다. 완성 알림 확인 기록의 오늘 항목을 비운다(`loadNotifiedState`→항목 삭제→`saveNotifiedState`). 건너뜀 기록이 오늘이면 `clearSkippedDay`. 따라잡기 기록이 오늘이면 `clearCatchUpDay`. 트레이의 그 알림을 `dismiss`한다. 사진 사본(`vision-cache`)은 지우지 않는다(Clarifications).
  5. `resetCycle`을 현재 주기 id로 쓴다. **일기를 지운 뒤에** 쓴다 — 중간에 죽으면 다음 판정이 다시 지워 같은 결과로 수렴한다(Edge Case).
  6. 칸을 비운다(`finally`).
- 어느 단계가 던져도 나머지를 시도하고 `resetCycle`은 일기 삭제가 성공했을 때만 갱신한다. 던지지 않고 `{ reset: boolean }`을 돌려준다.
- **판정 자리 둘**: `task.ts` `runBody`(`makePipeline`이 `app.ok`인 뒤 `app.store`로, `existingDiaryDays`를 읽기 **전**, 상태 흉내 확인 뒤)가 `resetFastCycleIfDue`를 직접 부르고, `use-auto-write-handoff.ts`의 `check()`(`resolveAutoWrite` 호출 **전**)는 조립부가 `createFastCycleResetter`로 만든 `resetFastCycle(now)` 클로저를 부른다(훅은 포트를 모른다). 알림 누름은 판정하지 않고 `rearmAutoWrite`로 훅을 다시 열 뿐이라 훅의 `check()`를 거친다. 호출부가 `listDiaryDays`를 주입하므로 리셋은 반드시 그 호출 전에 끝나야 한다.
- **홈 목록**: 리셋의 `beginWipe`/`end`가 `liveWrites.onChange`를 울리고 홈의 080 H12 장치가 목록을 낡음으로 표시했다가 칸이 빈 뒤 다시 읽는다 — 새 신호를 만들지 않는다. 연쇄는 홈 조립 테스트로 잠근다(CR13).
- 리셋했으면 호출부가 알림을 다시 맞춘다: `task.ts`는 끝에서 이미 `reconcileReminders`를 부르고, 앱 열기 훅은 `onCycleReset()`(조립부가 `rearmAutoWrite`와 알림 맞추기를 이어 부름).

## R5 — 「한 번」 다시 열기 (FR-009c)

- 리셋이 일어난 앱 열기 훅 판정에서 `onCycleReset?.()`를 부르고, `App.tsx`가 `rearmAutoWrite`를 연결한다. `rearmAutoWrite`는 세대를 올릴 뿐이라(`use-auto-write-claim.ts`) 부담이 없다. 이 용도를 `use-auto-write-claim.ts` 머리말의 「유일한 예외」 서술에 반영한다(알림 누름·합류 쓰기 실패·빠른 주기 리셋 — 모두 한 번씩만 다시 연다).
- 배포 환경은 리셋이 일어나지 않으므로 `onCycleReset`이 불리지 않는다 — 「한 번」 규칙 불변.

## R6 — 알림 계획 (FR-010·011)

- `planReminders`에 `timing`을 받는다. `timing.kind === "production"`이면 기존 경로(코드 이동 없음). 빠른 주기면 `[ { id: "diary-reminder-<day>", day: dayOf(다음 주기 시작), at: 다음 주기 시작 + delay, title } ]` 하나. **`written` 검사는 건너뛴다** — 오늘 일기는 주기가 바뀔 때 리셋으로 지워질 것이므로 다음 주기 시작 알림을 미리 걸어 둬야 한다.
- 지연: `reminderDelayFor(status)`가 `exempt`면 `min(REMINDER_DELAY_MINUTES, timing.reminderDelayCap)`. `planReminders`의 `delayMinutes` 검증([0,60) 정수)은 그대로 통과한다(창 분이 60 미만이어도 `Math.min`으로 결과가 [0,30]).
- `reconcileOnce`는 `loadTiming`을 추가로 받는다(기본 production, 던지면 production). RC8(지난 시각이어도 아직 전달 전일 수 있는 예약 유지)·`keepDelayed`는 변경하지 않는다 — 빠른 주기에서 같은 `id`(날 기준)로 `at`이 다른 새 예약이 오면 기존 `cancel` 후 `schedule`이 바꿔 낀다.
- `presented` 정리(`written.has(day)`면 거둠)는 그대로라 저장 직후 쓸 차례 알림이 거둬진다(SC-005).

## R7 — 잡 재등록·타이머

- 켜기·끄기·주기 변경 시 `background-port`의 `reschedule()`을 부른다(FR-014). 잡 간격 15분은 건드리지 않는다. 안드로이드 한계는 화면·문서에 적는다.

## R8 — ① `load()` 직렬화

- **Decision**: `llama-port.ts`에 `loadChain: Promise<unknown>`을 둔다. `load(character)`는 `loadChain`에 자기 본문을 이어 붙이고(앞 호출이 어떻게 끝나든 이어 실행), 본문은 지금의 `load()` 본문 전체다(같은 캐릭터 재사용·다른 캐릭터 닫기·`releasing` 기다림·적재). 앞 호출이 실패해도 뒤 호출은 새로 시도한다.
- **Rationale**: 지금은 두 호출이 `context === null`을 동시에 보고 둘 다 `loader()`를 부른다(E1 위반). 도착 순서 직렬화는 합류·다른 캐릭터·실패를 하나의 규칙으로 덮는다. `unload()`는 대기열에 넣지 않는다(U6의 `releasing`과 얽히지 않게 — 변경 최소).
- **Alternatives**: 진행 중 적재 약속에 합류 — 다른 캐릭터·실패 분기가 늘어 기각.
- 관찰: 이 결함은 소스 읽기이며 실기기 재현은 없다(080 로드맵의 서술). 테스트는 대역 `loader`로 두 호출을 겹쳐 호출 횟수와 동시 열림 수를 센다.

## R9 — ② 죽은 018 배선

- `App.tsx`에는 `prepare`·`captionDay`·`release`가 전혀 없다(소스 읽기 — `grep` 0건). `DiaryHomeScreen`의 props `prepare`·`release`·`captionDay`와 그 effect(미리 준비·캡션 미리 읽기)는 호출될 수 없다. 걷는다. 관련 테스트(`__tests__/ui/…`에서 이 props를 넘기는 것)는 지우거나 남은 동작 테스트로 바꾼다. 걷은 뒤 `tsc` 0이 완료 조건이다(AGENTS: 유니온을 좁힐 때).
- 018의 엔진 쪽 `prewarm`·`promptPrefix`는 파이프라인이 쓰므로 그대로 둔다.

## R10 — ④ 합류 쓰기 실패 뒤 이어 쓰기

- 현재: 합류한 쓰기가 `end.ok === false && !end.cancelled`로 끝나면 `DiaryHomeScreen`은 아무것도 소모하지 않고 목록으로 돌아가며, 057 effect가 `claimAutoWrite()`로 이어 쓴다. 그런데 **이 실행에서 「한 번」을 이미 소모했으면(`spentIn === generation`) claim이 거짓**이라 이어 쓰지 않는다(프로세스가 오래 사는 iOS).
- **Decision**: 홈에 `onJoinedWriteFailed?: () => void` prop을 두고 합류 끝 처리에서 `!end.ok && !end.cancelled`일 때 부른다. `App.tsx`는 `rearmAutoWrite`를 연결한다. 세대가 올라 057 effect가 다시 돌고 claim이 한 번 성공한다. 이어 쓴 쓰기가 실패해도 그 claim이 세대를 소모하므로 더 이어 쓰지 않는다(FR-019).
- 소모 시점은 바꾸지 않는다(설계문서의 「저장될 때 소비」 문구는 이 구현으로 대체 — 스펙 FR-019와 같다).
- `LiveWriteEnd.ok`는 칸을 차지해 돈 쓰기가 끝난 결과다(`live-write.ts` `end(result)`). 칸을 못 차지한 `already-running`은 칸에 들지 않으므로 `done`이 생기지 않는다 — 합류 대상이 아니다(소스 읽기). 따라서 `!ok && !cancelled`가 곧 「쓰기가 실패로 끝남」이다.

## R14 — 수동 실행과 빠른 주기

- 진단 「자동 쓰기 지금 실행」(`manual.ts`)은 설정 입력만 덮어 창을 통과하는 도구다. 빠른 주기 timing은 설정의 목표 시각을 무시하므로 그대로 두면 수동 실행이 창 밖에서 `not-near-target`로 끝난다. **결정**: `deps.manual === true`이면 `task.ts`가 `loadScheduleTiming`을 부르지 않고 `productionTiming(manualSettings)`를 쓰며 리셋도 하지 않는다(스펙 FR-009d, CR12).

## R11 — ⑤ 문구와 ③ 기록

- `src/i18n/catalogs/ko/settings.ts`의 `wipeBlocked`를 「지금 다른 작업이 끝나는 중이라 지우지 못했어요. 잠시 뒤에 다시 해 주세요.」로 바꾼다. `__tests__/i18n/ko-golden.test.ts`는 다시 쓰지 않고 `CHANGED_AFTER_GOLDEN`에 올린다. 이 문구를 단언하는 기존 테스트는 새 문구로 고친다.
- ③: AGENTS와 로드맵 완료 이력에 「지운 날을 백그라운드가 다시 쓰는 것은 의도된 동작(자동 쓰기를 켠 사용자의 약속, 082는 눈앞 재작성만 막음)」 한 줄. 완료 처리 단계에서 한다.

## R12 — 화면

- 개발자 화면(`DeveloperScreen`)은 판정하지 않고 상태를 그리는 화면이다(059). `fastCycle?: { periodMinutes: number | null; currentCycle: string | null; nextStartText: string | null; autoWriteEnabled: boolean; onToggle; onSelect(minutes); onSubmitCustom(text) }`를 옵션 prop으로 받아 개발 환경에서만 그린다(`simulation`과 같은 방식).
- 켜기 확인창: 오늘 일기가 있으면 `ConfirmDialog`(056/`Dialog.tsx`) — 조립부(`App.tsx`)가 일기 유무를 읽어 보인다.
- 진단 머리 한 줄은 `DiagnosticsScreen`에 `fastCycleLine?: string`을 넘겨 그린다. 문구는 `catalogs/ko/fast-cycle.ts`에 새 영역으로 둔다(062 규칙: 옛 영역에 키를 더하지 않는다). 골든은 `ADDED_AFTER_GOLDEN`.
- 개발자 메뉴 끄기(`onDisable`)에서 기록을 지운다(FR-013a) — 흉내 지우기와 같은 자리에서 부른다.

## R13 — 헌법 검사

- `scripts/constitution-rules.ts`에 `FAST_CYCLE_LEAKS`(064 LK1~3과 같은 모양):
  - **FL1**: `fast-cycle-store`의 가드 없는 읽기 `loadFastCycle`을 `src/schedule/timing-source.ts` 밖에서 import하면 위반(다른 곳은 가드가 있는 `loadFastCycleRecord`만 쓴다).
  - **FL2**: `timing-source.ts`가 `devEnvironment` 가드 없이 `port.read()`를 부르거나 `process.env`를 읽으면 위반(소스 패턴).
  - **FL3**: `resetFastCycleIfDue(` 호출은 `task.ts`와 `fast-cycle-reset.ts`(클로저 공장) 안뿐이고, `createFastCycleResetter`를 부르는 곳은 `App.tsx` 하나(셋째 경로가 따로 지우지 않게).
- 위반 주입: 가드 제거·import 추가·셋째 호출을 각각 넣어 검사가 잡는지 확인하고 되돌린다.

## 테스트 목록 (TDD, 구현 전에 쓴다)

| 영역 | 파일 | 내용 |
|---|---|---|
| 해석기 | `__tests__/schedule/timing.test.ts` | 배포 동치(시 경계·wrap·오전 목표), 주기 id·시작·창 끝·마지막 주기 잘림·DST, 프리셋·검증 범위 |
| 기록 | `__tests__/schedule/fast-cycle-store.test.ts` | 파싱(깨짐·범위 밖=꺼짐), 직렬화, 통로 대역 |
| 가드 | `__tests__/schedule/timing-source.test.ts` | prod/판정 실패 환경은 읽지 않고 배포 값, 개발+켜짐=빠른 주기 |
| 판정 | `__tests__/schedule/decision.test.ts` 등 기존 + 빠른 주기 케이스 | 창 안=오늘, 창 밖=not-near-target, 후보 오늘 한정, 지난 날 미작성이어도 안 씀 |
| 알림 | `__tests__/schedule/reminder-plan.test.ts` + `reminders.test.ts` | 빠른 주기 한 개·지연 상한·written 무시, 배포 7일치 불변 |
| 리셋 | `__tests__/app/fast-cycle-reset.test.ts` | 오늘만 지움·타 날 보존·칸 못 차지하면 안 지움·같은 주기 중복 없음·알림 기록·건너뜀·따라잡기·중간 실패 수렴 |
| 호출 자리 | `__tests__/schedule/task-fast-cycle.test.ts`, `__tests__/app/use-auto-write-handoff-fast-cycle.test.tsx` | 두 자리가 판정 전에 부름, 리셋 시 onCycleReset |
| 조립 | `__tests__/schedule/fast-cycle-assembly.test.ts` | 실제 판정·리셋·기록·메모리 저장소로 「리셋→쓰기→저장→다음 주기 리셋」 |
| 소스 계약 | `__tests__/schedule/fast-cycle-source-contract.test.ts` | FL1~FL3, `process.env` 없음, 주석 제거 후 읽기 |
| 저장소 | `__tests__/diary/store-remove-day.test.ts` | removeDay 메모리·파일, 없는 날 무시 |
| 엔진 | `__tests__/inference/llama-port-load-race.test.ts` | 동시 두 load: 적재 1회/열림 ≤1, 다른 캐릭터, 앞 실패 뒤 재시도 (수정 전 실패 확인) |
| 홈 | `__tests__/ui/diary-home-joined-retry.test.tsx` | 합류 실패→콜백, 취소→콜백 없음 |
| 조립(④) | `__tests__/app/joined-retry-assembly.test.tsx` | 한 번 소모 실행·합류 실패→이어 쓰기 한 번→실패 시 중단 |
| 화면 | `__tests__/ui/developer-fast-cycle.test.tsx`, `diagnostics-fast-cycle.test.tsx` | 구역·프리셋·입력 검증·확인창·진단 줄·배포 미노출 |
| 문구 | `__tests__/i18n/ko-golden.test.ts`(갱신), `settings-screen`의 wipeBlocked 단언 | 새 문구 |
| ② | `__tests__/ui/home-no-prewarm-props.test.ts`(소스 계약) | 홈이 `prepare`·`release`·`captionDay`를 받지 않음 |
