# Tasks: 자동 쓰기 빠른 주기(개발 빌드 전용)와 080 잔여 결함 (106)

**Input**: [spec.md](spec.md) · [plan.md](plan.md) · [data-model.md](data-model.md) · [contracts/](contracts/) · [research.md](research.md) · [quickstart.md](quickstart.md)

테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다(TDD, AGENTS). 경로는 저장소 루트 기준. 개별 테스트는 `npx jest <경로> --selectProjects logic`(`.ts`) / `--selectProjects ui`(`.tsx`)로 돌린다. 한 사용자 이야기 안에서 같은 파일을 만지는 작업은 순서대로, `[P]`는 파일이 달라 병렬로 가능한 것이다.

## Phase 1: Setup

- [ ] T001 `git branch --show-current`가 `106-auto-write-fast-cycle`인지 확인하고, 기준선으로 `npm test`와 `npm run lint`가 통과하는지 돌려 결과(통과/실패 건수)를 `specs/106-auto-write-fast-cycle/device-check.md` 맨 위 「기준선」 절에 적는다(새로 만드는 파일, 기기 확인 기록은 T058에서 이어 쓴다)

## Phase 2: Foundational (시간 규칙 해석기 — 모든 빠른 주기 이야기의 선행)

**Goal**: 시간 상수를 `ScheduleTiming` 한 곳으로 모으고 배포 판정을 한 줄도 바꾸지 않는다(SC-002).

- [ ] T002 [P] `__tests__/schedule/timing.test.ts` 새로 작성 — 배포 동치: `productionTiming`의 `inWindow`가 목표 시 22일 때 22:00·23:59·00:59·01:00(자정 wrap)·02:59에서 참이고 03:00·21:59에서 거짓 / `targetAhead`가 `getHours() < 목표 시` / `targetDay`가 `includesTodayAtHour`와 같음 / `candidateDays`가 입력 그대로 / `reminderDelayCap` 30. 주기 수학(contracts/fast-cycle.md FC4, research R2): `cycleOf(N=30, now)`의 `id`·`startMs`·`endMs`·`windowEndMs`, 자정 직전 마지막 주기 잘림, 날짜가 바뀌면 순번 0부터, DST 23·25시간 날 ms 산술, N=5의 창 2분, 창 끝 ≤ 주기 끝. `fastCycleTiming`: `inWindow`는 `[startMs, windowEndMs)`에서만 참, `targetAhead` 항상 거짓, `targetDay` "today", `candidateDays`는 `[today]`(선택 가능한 날에 오늘이 없어도 오늘 하나), `reminderDelayCap`=min(30, ⌊N/2⌋), `nextCycleStart`=현재 `endMs`. 주기 값 검증 `parsePeriodMinutes("30")` 성공 / `"4"`·`"181"`·`"30.5"`·`"3e1"`·`""`·`" 30 "`(공백 자름 후 성공) — 실패 확인
- [ ] T003 `src/schedule/timing.ts` 새로 작성(순수): `ScheduleTiming` 인터페이스(data-model「ScheduleTiming」표), `productionTiming(settings)`(지금 `decision.ts`의 `isNearTarget`·`yesterdayStillAhead` 논리와 `includesTodayAtHour`를 **그대로 옮김** — 새로 짜지 않는다), `fastCycleTiming(periodMinutes, now)`, `cycleOf(periodMinutes, now)`(자정은 `dayBounds(dayOf(now)).startMs`), `parsePeriodMinutes(text)`(5 ≤ N ≤ 180 정수). `getHours()`를 쓰는 배포 구현을 위해 `scripts/constitution-rules.ts`의 DB11 허용 목록에 `src/schedule/timing.ts`를 `manual.ts`와 같은 방식으로 이유와 함께 올린다
- [ ] T004 [P] `__tests__/schedule/fast-cycle-store.test.ts` 새로 작성 — 파싱: 유효 `{periodMinutes:30,resetCycle:"2026-10-26#4"}` 성공 / 문자열 아님·배열·JSON 깨짐·`periodMinutes` 4·181·30.5·문자열·`resetCycle` 숫자 → 전부 `null`(꺼짐) / 알 수 없는 필드 무시. 직렬화 왕복. 통로 대역으로 `loadFastCycle`이 읽기 예외를 `null`로 삼킴, `saveFastCycle`/`clearFastCycle` — 실패 확인
- [ ] T005 `src/schedule/fast-cycle-store.ts` 새로 작성(`src/app/simulation-store.ts`와 같은 모양): `FastCyclePort { read; write; remove }`, `parseFastCycle`, `serializeFastCycle`, `loadFastCycle`(던지지 않음, 모르면 `null`), `saveFastCycle`, `clearFastCycle`, 기기 통로 `expoFastCyclePort()`(`preferences/dev-fast-cycle.json`, 임시 파일에 쓰고 `moveSync`, `File`에는 `*Sync()`만 — AGENTS)
- [ ] T006 [P] `__tests__/schedule/timing-source.test.ts` 새로 작성 — `loadScheduleTiming({ settings, now, devEnvironment:false, port })`는 `port.read`를 **부르지 않고** `kind:"production"`(FC2, 기록이 켜짐이어도) / `devEnvironment:true`+유효 기록 → `fast-cycle` / 기록 없음·읽기 예외·깨짐 → `production`(FC3) — 실패 확인
- [ ] T007 `src/schedule/timing-source.ts` 새로 작성: `loadScheduleTiming`이 `devEnvironment` 가드 뒤에서만 `loadFastCycle(port)`를 부른다. `process.env`를 읽지 않는다. 반환에 `fastCycle`(읽은 기록 또는 `null`)을 함께 싣는다. 같은 가드를 쓰는 `loadFastCycleRecord({ devEnvironment, port })`도 함께 export한다 — `devEnvironment`가 거짓이면 통로를 부르지 않고 `null`, 참이면 `loadFastCycle(port)`. 리셋과 화면이 이 함수를 쓴다(`loadScheduleTiming`은 설정이 필요한 배포 timing 때문에 리셋에는 맞지 않는다)
- [ ] T008 [P] `__tests__/diary/store-remove-day.test.ts` 새로 작성 — 메모리 저장소와 파일 저장소(`FileSystemPort` 대역) 모두: `removeDay(d)`가 그 날만 지우고 다른 날·`removeAll`과 독립 / 없는 날은 조용히 넘어감 / 파일 구현은 `<day>.json`과 `<day>.json.writing` 둘 다 지움 — 실패 확인
- [ ] T009 `src/diary/store.ts`: `DiaryStore.removeDay(day)`를 인터페이스·메모리 구현·파일 구현에 추가(`isDiaryFileName` 규칙 재사용). 다른 구현체(대역)가 인터페이스를 만족하도록 `tsc`가 지적하는 곳을 고친다
- [ ] T010 [P] `__tests__/schedule/catch-up-store.test.ts`(있으면 확장, 없으면 새로 작성): `clearCatchUpDay`가 기록을 지우고 이후 `loadCatchUpDay`가 `null` / 기록이 없어도 던지지 않음 — 실패 확인
- [ ] T011 `src/schedule/catch-up-store.ts`: `CatchUpStorePort`에 `remove()`를 더하고 `clearCatchUpDay`와 기기 통로 구현을 추가(`skip-store.ts`의 `clearSkippedDay` 모양)
- [ ] T012 `__tests__/schedule/decision.test.ts`·`auto-write.test.ts`에 빠른 주기 케이스 추가(FC4·FC5) — 판정이 아직 `timing`을 받지 않으므로 먼저 실패한다: 창 안=오늘을 쓰기로 정함 / 창 밖=`not-near-target` / 지난 날이 안 쓴 상태여도 후보는 오늘 하나 / 오늘이 이미 있으면 `all-written` / `resolveAutoWrite`가 빠른 주기 `timing`으로 오늘 미리보기만 부름
- [ ] T013 `src/schedule/decision.ts`·`src/schedule/auto-write.ts`·`src/schedule/task.ts`가 `ScheduleTiming`을 받게 한다: `decideSchedule` 입력에 `timing`을 더해 `isNearTarget`·`yesterdayStillAhead`·`targetDay`를 `timing`으로 대체하고 `candidateDays`로 후보를 거른다(`waiting` 계산도 같은 후보, FC4). `isInTargetWindow(settings, now)`는 `timing.inWindow(now)`로 대체하고 옛 export를 남기지 않는다. `resolveAutoWrite` deps에 `timing?`(기본 `productionTiming(settings)`)를 더한다. `task.ts`의 `catchingUp = settings.enabled && !timing.inWindow(now)`(`timing` 출처는 T017 전까지 `productionTiming(settings)`). **기존 `__tests__/schedule/{decision,auto-write,task,*}.test.ts`는 기대값을 바꾸지 않고** 호출 모양(`timing` 인자)만 맞춰 통과시키며, 위 T012의 빠른 주기 케이스도 통과시킨다 — 기대값을 바꿔야 하면 배포 동치가 깨진 것이니 멈추고 고친다

## Phase 3: User Story 1 — 폰을 두면 주기마다 자동 쓰기가 반복된다 (P1)

**Goal**: 주기 리셋 절차와 두 호출 자리를 세워 「리셋 → 쓰기 → 저장 → 다음 주기 리셋」이 한 바퀴 돈다.

**Independent Test**: 조립 테스트(T020)가 한 바퀴를 돌고, 기기에서 30분 주기로 몇 주기 지난 뒤 시도 기록에 주기별 결과가 남는다.

- [ ] T014 [P] [US1] `__tests__/app/fast-cycle-reset.test.ts` 새로 작성(contracts/cycle-reset.md CR1~CR7) — 배포 timing이면 아무것도 읽지 않고 `{reset:false}`(CR1) / 같은 주기 id면 `{reset:false}`(CR2) / 다른 주기면 오늘 일기·완성 알림 기록의 오늘 항목·건너뜀(오늘이면)·따라잡기(오늘이면)가 지워지고 트레이 알림 `dismiss`, 다른 날 일기는 남음(CR5), `vision-cache` 미접촉 / `liveWrites`에 쓰기가 살아 있으면 지우지 않고 쓰기를 끊지 않음(CR3) / 칸이 `finally`에서 비워짐(CR4) / 일기 삭제가 던지면 나머지 단계는 시도하되 `resetCycle` 미갱신·`{reset:false}`(CR6) / 던지지 않음(CR7) / 재호출해도 한 주기에 한 번 — 실패 확인
- [ ] T015 [US1] `src/app/fast-cycle-reset.ts` 새로 작성: `resetFastCycleIfDue({ devEnvironment, fastCyclePort, now, store, notifiedPort, skipPort, catchUpPort, dismiss, liveWrites })` → `Promise<{ reset: boolean }>`(안에서 `loadFastCycleRecord`로 기록을 읽고 없으면 `{reset:false}`, 있으면 `fastCycleTiming`으로 현재 주기를 구함)와, 같은 의존을 묶어 `(now) => Promise<{reset:boolean}>` 클로저를 돌려주는 `createFastCycleResetter(deps)`(훅에 주는 것, CR8). 순서는 research R4(칸 차지 → 일기 삭제 → 기록 비우기 → 알림 거두기 → `resetCycle` 갱신(삭제 성공 시) → 칸 비우기). `wipe-diaries.ts`의 `attempt` 패턴을 따르되 쓰기를 끊지 않는다
- [ ] T016 [P] [US1] `__tests__/schedule/task-fast-cycle.test.ts` 새로 작성 — `runAutoDiaryTask`가 빠른 주기에서 `existingDiaryDays`를 읽기 **전에** 리셋을 부른다(순서 기록) / 배포 환경(`resolution`이 prod)에서는 리셋도 기록 읽기도 없다 / 리셋한 주기에 `reconcileReminders`가 끝에서 불린다 / **수동 실행(`manual:true`)은 빠른 주기 기록이 켜져 있어도 `loadScheduleTiming`·리셋을 부르지 않고 `manualSettings`의 배포 timing으로 판정한다**(FR-009d, CR12) — 실패 확인
- [ ] T017 [US1] `src/schedule/task.ts`의 `runBody`: 상태 흉내 확인 뒤 `existingDiaryDays` 읽기 전에 `resetFastCycleIfDue({ devEnvironment: showsOnScreen(resolution), … })`를 부르고, 이어 `loadScheduleTiming({ devEnvironment: showsOnScreen(resolution), … })`로 timing을 얻는다. 이후 `resolveAutoWrite`에 `timing`을 넘긴다. 리셋에 쓰는 `store`는 `makePipeline`이 `app.ok`인 뒤의 `app.store`다(그 앞에서는 없다). **`deps.manual === true`이면 `loadScheduleTiming`·리셋을 건너뛰고 `productionTiming(manualSettings…)`를 쓴다**(research R14). 의존은 기존 `deps` 패턴대로 옵셔널 주입(`fastCyclePort`, `liveWrites`, `store` 등), 기본은 기기 통로
- [ ] T018 [P] [US1] `__tests__/app/use-auto-write-handoff-fast-cycle.test.tsx` 새로 작성 — 훅이 빠른 주기에서 `resolveAutoWrite` 호출 전에 리셋을 부른다 / 리셋했으면(`resetFastCycle`이 `{reset:true}`) `onCycleReset`이 한 번 불린다 / `{reset:false}`면(배포의 클로저가 그렇게 돌려준다) 불리지 않는다 / 리셋을 못 해도(칸 점유) 판정은 이어진다 / 주입이 없으면(기존 호출) 종전과 같다 — 실패 확인
- [ ] T019 [US1] `src/app/use-auto-write-handoff.ts`: 훅 deps에 옵셔널 의존 셋 — `loadTiming(settings, now): Promise<ScheduleTiming>`, `resetFastCycle(now): Promise<{reset:boolean}>`, `onCycleReset()` — 만 더한다(훅은 저장소·포트·`devEnvironment`를 모른다). `check()`가 `resolveAutoWrite` 앞에서 `resetFastCycle`을, 이어 `loadTiming`을 부르고 `timing`을 `resolveAutoWrite`에 넘긴다. 리셋이 `reset:true`면 `onCycleReset()`을 부른다. `App.tsx`는 T043에서 연결한다(이 시점에는 옵셔널이라 기존 호출이 깨지지 않는다)
- [ ] T020 [US1] 조립 테스트 `__tests__/schedule/fast-cycle-assembly.test.ts`: 메모리 저장소·실제 `decideSchedule`·`resolveAutoWrite`·`resetFastCycleIfDue`·`liveWrites`·시도 기록(통로 대역)을 묶어 — 주기 k 창 안에 판정 → 쓰기로 정함 → 저장 → 같은 주기 재판정은 `all-written` → 주기 k+1 시작 뒤 판정 직전 리셋 → 다시 쓰기로 정함. 창 밖 판정은 `not-near-target`. 이 한 바퀴를 `task.ts`와 훅 두 자리에서 각각 한 번씩 돈다
- [ ] T021 [US1] 위반 주입: `task.ts`의 리셋 호출을 임시로 지우고 T016·T020이 실패함을 확인(치환 적용 먼저 단언) 후 원복. 같은 방식으로 `use-auto-write-handoff.ts`도
- [ ] T022 [US1] `__tests__/ui/fast-cycle-home-refresh.test.tsx` 새로 작성(FR-009b, CR13): 실제 `DiaryHomeScreen`+실제 `createLiveWrites`+메모리 저장소에서, 앞 상태 홈이 오늘을 쓴 날로 보여 주는 중 `resetFastCycleIfDue`가 칸을 차지해 오늘 일기를 지우면 홈 목록이 다시 읽혀 오늘이 「안 쓴 날」이 되고, `onCycleReset`→`rearmAutoWrite` 뒤 057 효과가 오늘을 이어 쓴다. 080 H12 장치(`liveWrites.onChange`→낡음→재읽기)로 이미 통과하면 구현을 더하지 않고 이 테스트가 그 연쇄를 잠근다는 주석을 남기며, 실패하면 홈의 낡음 판정을 고친다

## Phase 4: User Story 2 — 배포 빌드에는 아무 영향이 없다 (P1)

**Goal**: 배포 환경은 기록이 있어도 읽지 않고, 일기를 지우지 않는다(SC-002·SC-003).

**Independent Test**: 배포 환경 판정 + 켜진 기록 조합에서 시간 규칙·일기 목록이 종전과 같고 리셋이 없다. 소스 계약과 헌법 검사가 가드를 잠근다.

- [ ] T023 [P] [US2] `__tests__/schedule/fast-cycle-prod-guard.test.ts` 새로 작성 — `resolution`이 `prod`이고 기록 통로가 켜짐을 돌려주는 상태에서 (a) `loadScheduleTiming`이 통로를 부르지 않음, (b) `runAutoDiaryTask`가 일기 하나를 지우지 않고 `resolveAutoWrite`가 평소 후보(사흘)를 씀, (c) 앱 열기 경로의 리셋 클로저(`createFastCycleResetter({ devEnvironment:false, … })`)가 기록 통로를 부르지 않고 일기를 지우지 않으며 `{reset:false}`를 돌려줌, (d) 기록이 깨진 경우는 개발 환경에서도 꺼짐 — 실패 확인(가드가 없는 상태로)·구현 뒤 통과
- [ ] T024 [P] [US2] `__tests__/schedule/fast-cycle-source-contract.test.ts` 새로 작성(주석을 먼저 걷어내고 소스를 읽는다 — AGENTS): (FL1) `loadFastCycle`(가드 없는 읽기) import는 `timing-source.ts` 하나뿐이고 다른 곳은 가드가 있는 `loadFastCycleRecord`만 쓴다, (FL2) `timing-source.ts`에 `devEnvironment` 가드 없이 `.read(`가 없고 `process.env`가 없음, (FL3) `resetFastCycleIfDue(` 호출은 `task.ts`·`fast-cycle-reset.ts`뿐이고 `createFastCycleResetter`는 `App.tsx`에서만 부르며, `use-auto-write-handoff.ts`는 저장소·포트를 import하지 않음
- [ ] T025 [US2] `scripts/constitution-rules.ts`에 `FAST_CYCLE_LEAKS`(FL1~FL3)를 064 `SIMULATION_LEAKS` 모양으로 추가하고 `scripts/check-constitution.mts`에 연결한다. 규칙 문구는 research R13
- [ ] T026 [US2] 위반 주입(AGENTS: 치환 적용 먼저 단언): (1) `timing-source.ts`의 `devEnvironment` 가드를 임시로 제거 → T023와 헌법 검사 FL2가 실패, (2) `src/ui/`에 `loadFastCycle` import 추가(또는 `use-fast-cycle.ts`에 직접 import) → FL1, (3) 임의 파일에 `resetFastCycleIfDue(` 호출을 추가하거나 `src/ui/`에서 `createFastCycleResetter`를 부름 → FL3. 각각 확인 후 원복하고 `npm run check:constitution`이 0으로 돌아옴을 확인

## Phase 5: User Story 3 — 리셋은 오늘만 지우고 쓰기를 방해하지 않는다 (P1)

**Goal**: 켜는 흐름의 확인과 초기값, 끄는 흐름의 정리가 스펙 US3대로 동작한다.

**Independent Test**: `use-fast-cycle` 훅 테스트가 확인·거절·초기 주기 번호·끄기를 본다. US3 인수 시나리오 매핑: AS1·AS2·AS3·AS5는 Phase 3의 리셋 테스트(T014·조립 테스트)가, AS4는 T027이 맡는다.

- [ ] T027 [P] [US3] `__tests__/app/use-fast-cycle.test.tsx` 새로 작성 — 켜기: 오늘 일기가 없으면 확인 없이 `{periodMinutes, resetCycle: 켠 순간의 주기 id}`를 저장(FR-009a: 직후 같은 주기에서 다시 지우지 않음) / 오늘 일기가 있으면 `needsConfirm`이 참이고 확인 전에는 아무것도 저장·삭제하지 않음 / 확인하면 `removeDay(오늘)`+기록 정리(CR5)+저장 / 거절하면 켜지지 않음(US3 AS4) / 주기 값 변경은 `resetCycle`을 유지하고 `periodMinutes`만 바꿈 / 끄기는 파일 삭제 / 개발 환경이 아니면 항상 꺼짐·변경 무시 / 읽기 전 `loaded=false` — 실패 확인
- [ ] T028 [US3] `src/app/use-fast-cycle.ts` 새로 작성(`use-simulation.ts` 모양): 마운트 때 `loadFastCycleRecord({ devEnvironment, port })`로 한 번 읽고, `enable(minutes)`/`setPeriod(minutes)`/`disable()`/`confirmEnable()`/`cancelEnable()`을 제공. 켜기·끄기·주기 변경 뒤 `onChanged`(조립부가 `reschedule()`·알림 맞추기·`rearm`을 연결, FR-014)를 부른다. 저장 실패는 삼키되 그 실행의 상태는 사용자가 한 대로 둔다(064 FR-009와 같음)

## Phase 6: User Story 6 — 모델 적재가 동시에 불려도 모델이 둘 열리지 않는다 (P1)

**Goal**: `load()` 직렬화(contracts/engine-load.md LD1~LD6).

**Independent Test**: 대역 `loader`로 두 호출을 겹쳐 호출 횟수와 동시 열림 수를 센다 — 수정 전 실패.

- [ ] T029 [US6] `__tests__/inference/llama-port-load-race.test.ts` 새로 작성(기존 `llama-port` 테스트의 대역 `loader` 방식을 따른다): 같은 캐릭터 `load()` 두 번 동시 → `loader` 1회, 둘 다 `ok`, 둘째는 `warm:true`(LD2) / 다른 캐릭터가 뒤따르면 앞 적재가 끝난 뒤 `release`가 불리고 열린 컨텍스트가 어느 순간에도 최대 1개(LD3) / 앞 호출 실패(`load-failed`) 뒤 뒤 호출은 새로 `loader`를 부름(LD4) / `unload()`는 대기열을 거치지 않고 진행 중 적재가 있어도 기존 U6 동작 유지(LD5) / 대기 중 `load()`가 앞 쓰기의 `stopRequested`를 지우지 않음(LD6) — **수정 전에 먼저 실패하는지 확인**하고 기록한다
- [ ] T030 [US6] `src/inference/llama-port.ts`: `load()`를 도착 순서로 직렬화한다(research R8) — `loadChain`에 본문을 이어 붙이고 본문은 지금의 `load()` 본문 전체. 기존 `__tests__/inference/llama-port*.test.ts`가 수정 없이 통과해야 한다
- [ ] T031 [US6] 위반 주입: 직렬화를 임시로 지워 T029가 실패하는지 확인(치환 적용 먼저 단언) 후 원복

## Phase 7: User Story 4 — 쓸 차례 알림이 주기 시작에 걸리고 쓴 뒤 거둬진다 (P2)

**Goal**: 빠른 주기 알림 계획과 지연 상한(FC6, FR-010·011).

**Independent Test**: 알림 계획 순수 함수와 맞추기 테스트.

- [ ] T032 [P] [US4] `__tests__/schedule/reminder-plan.test.ts`에 추가(기존 기대값은 건드리지 않는다): 빠른 주기 `planReminders`가 `enabled`+이름 있음에서 정확히 1개 — `at`=다음 주기 시작+`delayMinutes`, `id`=`diary-reminder-<다음 주기 시작의 날>`, `written`을 무시 / `enabled` 거짓이면 빈 목록 / 이름 없음이면 빈 목록 / 배포 7일치 불변 — 실패 확인
- [ ] T033 [US4] `src/schedule/reminder-plan.ts`: 입력에 `timing`을 더하고 `timing.kind === "fast-cycle"`이면 위 한 개를, 아니면 기존 경로를 그대로 쓴다. `reminderDelayFor`의 결과에 `Math.min(·, timing.reminderDelayCap)`을 적용하는 자리는 `reminders.ts`(T035)다
- [ ] T034 [P] [US4] `__tests__/schedule/reminders.test.ts`에 추가: `ReminderDeps.loadTiming`이 빠른 주기를 주면 한 개 예약 / 배터리 예외 `exempt`일 때 지연이 min(30, 창 분) / `loadTiming`이 던지거나 없으면 배포 계획 / 저장된 쓸 차례가 거둬지는 기존 동작(written→presented 거둠, RC8, 104 keepDelayed)이 그대로 — 실패 확인
- [ ] T035 [US4] `src/schedule/reminders.ts`: `ReminderDeps`에 `loadTiming?` 추가, `reconcileOnce`가 timing을 받아 `planReminders`·`delayedPlan`에 넘기고 지연에 `reminderDelayCap`을 적용한다. `src/schedule/reminder-deps.ts`의 `expoReminderDeps`가 `loadScheduleTiming`을 연결한다(`currentEnvironment()`로 `devEnvironment` 판정 — `showsOnScreen`)
- [ ] T036 [US4] 위 두 파일의 조립 테스트를 `__tests__/schedule/fast-cycle-assembly.test.ts`에 추가: 주기 시작 알림 예약 → 일기 저장 → 맞추기가 트레이 알림을 거두고 완성 알림만 남음(`presented` 정리, SC-005의 코드 쪽)

## Phase 8: User Story 5 — 개발자 메뉴·진단 화면 (P2)

**Goal**: 켜고 읽는 길(스펙 US5, FR-012·013·013a·014).

**Independent Test**: 화면 테스트가 구역·프리셋·입력 검증·확인창·진단 줄·배포 미노출을 본다.

- [ ] T037 [P] [US5] `src/i18n/catalogs/ko/fast-cycle.ts` 새 영역을 만들고 `index.ts`에 연결 — 구역 제목, 켬/끔 라벨, 프리셋 「10분」「30분」「60분」, 「직접 입력」, 범위 안내(5~180분), 지금 주기·다음 주기 시작 값 줄, 자동 쓰기 꺼짐 안내, 한계 안내(안드로이드 잡 간격 하한 15분·iOS 깨움은 OS 몫, 사람이 정한 값이라는 표시), 켜기 확인창 제목·본문(오늘 일기를 지운다고 말함)·확인·취소, 진단 한 줄 「빠른 주기 켜짐 · 주기 {N}분」. 문구는 이 파일에만 둔다(062). 새 문구 초안은 계획 단계의 초안이며 소유자가 확정한다 — 모든 문구를 PR 설명/최종 보고에 모아 보여 준다
- [ ] T038 [US5] `__tests__/i18n/ko-golden.test.ts`: 새 영역 키를 `ADDED_AFTER_GOLDEN`에 올린다(골든을 다시 쓰지 않는다)
- [ ] T039 [P] [US5] `__tests__/ui/developer-fast-cycle.test.tsx` 새로 작성 — `DeveloperScreen`의 `fastCycle` prop이 있을 때 구역(켬/끔·프리셋 셋·직접 입력·지금 주기 번호·다음 주기 시작·한계 안내)이 그려지고 없으면 구역이 없음(배포 미노출, US5 AS5) / 직접 입력 `"4"`·`"181"`·`"30.5"`는 거부하고 이전 값 유지(AS2) / 자동 쓰기 꺼짐이면 안내가 보이고 설정 토글은 안 바뀜(AS4) / 켜기 확인창이 오늘 일기가 있을 때만 뜸 — 실패 확인
- [ ] T040 [US5] `src/ui/DeveloperScreen.tsx`에 옵션 prop `fastCycle`과 묶음을 추가(`simulation` 묶음의 `Group`·`Row`·`Toggle` 부품 재사용, `DevOnlyAside`), `src/ui/developer-text.ts`에서 카탈로그를 연결한다. 판정하지 않고 상태를 그리고 누름을 알릴 뿐이다(059)
- [ ] T041 [P] [US5] `__tests__/ui/diagnostics-fast-cycle.test.tsx` 새로 작성 — `DiagnosticsScreen`이 `fastCycleLine`이 있을 때만 머리에 한 줄을 그림(FR-013, AS3)
- [ ] T042 [US5] `src/ui/DiagnosticsScreen.tsx`에 `fastCycleLine?: string` prop과 한 줄 추가
- [ ] T043 [US5] `App.tsx` 조립: `useFastCycle`(개발 환경 `showsDiagnostics`, 기록 통로 `expoFastCyclePort`) → `DeveloperScreen`·`DiagnosticsScreen`에 상태 전달, 켜기 확인창을 `ConfirmDialog`로(오늘 일기 유무는 `store.has(오늘)`), `onChanged`에서 `background-port`의 `reschedule()`·`useReminderSync` 맞추기·`rearmAutoWrite`를 부름(FR-014), `createFastCycleResetter`로 만든 `resetFastCycle`과 `devEnvironment`를 묶은 `loadTiming` 클로저를 `useAutoWriteHandoff`에 연결하고 `onCycleReset`을 `rearmAutoWrite`에 잇는다(CR9), 개발자 메뉴를 끌 때(`onDisable`) `clearFastCycle`을 흉내 지우기와 같은 자리에서 부름(FR-013a). 이 파일에서 `process.env`를 읽지 않는다
- [ ] T044 [US5] `__tests__/app/fast-cycle-wiring-contract.test.ts` 새로 작성(소스 계약, 주석을 걷고 읽음): `App.tsx`가 `useFastCycle(`·`createFastCycleResetter(`를 쓰고 `onCycleReset`을 `rearmAutoWrite`에, `onJoinedWriteFailed`를 `rearmAutoWrite`에 연결하며 `process.env`를 읽지 않음 / 개발자 메뉴 끄기(`onDisable`)가 `use-fast-cycle`의 `disable`을 부름. 동작은 `use-fast-cycle` 훅 테스트(T027)가 맡는다: 켜기·끄기·주기 변경이 `onChanged`(reschedule·맞추기·rearm 묶음)를 부르고 개발자 메뉴 끄기에 해당하는 `disable()`이 기록을 지움(FR-013a·FR-014·CR9)

## Phase 9: User Story 7 — 합류한 쓰기가 실패하면 이어서 쓴다 (P2)

**Goal**: contracts/joined-retry.md JR1~JR6.

**Independent Test**: 홈 단위 테스트(콜백 호출 조건)와 「한 번」 소모 실행의 조립 테스트.

- [ ] T045 [P] [US7] `__tests__/ui/diary-home-joined-retry.test.tsx` 새로 작성(기존 `home-join.test.tsx`의 등록부 대역·합류 설정을 재사용) — 합류한 쓰기가 `ok:false,cancelled:false`로 끝나면 `onJoinedWriteFailed`가 한 번 불림(JR1) / `cancelled:true`면 안 불림(JR2) / `ok:true`면 안 불림(JR3) / 화면이 사라진 뒤 끝나면 안 불림 — 실패 확인
- [ ] T046 [US7] `src/ui/DiaryHomeScreen.tsx`: `onJoinedWriteFailed?: () => void` prop을 더하고 합류 끝 처리(`void live.done.then(async (end) => …)`)에서 `!end.ok && !end.cancelled`일 때, 목록 상태로 돌아가기 전에 부른다. 합류 끝 처리의 주석(H4·H7 소모 설명)에 이 호출을 한 줄 적는다
- [ ] T047 [P] [US7] `__tests__/app/joined-retry-assembly.test.tsx` 새로 작성 — 실제 `useAutoWriteClaim`·`liveWrites`·홈(합류)을 묶어: 「한 번」을 소모한 실행에서 남의 쓰기가 실패 → 홈이 합류 → 실패 → `rearmAutoWrite` → 이어 쓰기 시작 1회(JR4) → 그 쓰기도 실패 → 더 시작 없음(JR6) / 합류한 쓰기를 사용자가 그만두면 이어 쓰기 없음 — 실패 확인(콜백 연결 전)
- [ ] T048 [US7] `App.tsx`에서 `DiaryHomeScreen`의 `onJoinedWriteFailed`를 `rearmAutoWrite`에 연결하고, `src/app/use-auto-write-claim.ts` 머리 주석의 「소모를 되돌리는 길은 … 하나다」를 「알림 누름·합류 쓰기 실패·빠른 주기 리셋 — 각각 한 번씩만」으로 고친다(앞 서술을 덧대지 않고 고친다 — AGENTS)

## Phase 10: User Story 8 — 죽은 배선 걷기와 문구 (P3)

**Goal**: ②·⑤와 ③ 기록(스펙 US8, FR-018·020·021).

**Independent Test**: 소스 계약과 문구 골든, `tsc` 0.

- [ ] T049 [P] [US8] `__tests__/ui/home-no-prewarm-props.test.ts` 새로 작성(소스 계약, 주석을 걷고 읽음): `DiaryHomeScreen.tsx`에 `prepare`·`release`·`captionDay`·`preparedFor`가 없음, `App.tsx`가 그것을 넘기지 않음 — 걷기 전에 실패 확인
- [ ] T050 [US8] `src/ui/DiaryHomeScreen.tsx`에서 죽은 018 입력과 그 effect(`prepare`·`release`·`captionDay`, `preparedFor`·`captionRef` 및 미리 준비/캡션 미리 읽기 effect)를 걷는다. 그 props를 넘기는 기존 테스트(`__tests__/ui/diary-home.test.tsx`·`diary-home-writable.test.tsx`·`home-join.test.tsx` 등 `grep -rn "captionDay\|prepare=" __tests__`로 찾음)는 지우거나 남은 동작 테스트로 바꾼다. 엔진 쪽 `prewarm`·`promptPrefix`는 건드리지 않는다. `tsc` 0이 완료 조건이다
- [ ] T051 [US8] 문구: `grep -rn "wipeBlocked\|지우지 못했어요" src __tests__`로 단언 자리를 찾아 먼저 새 문구로 바꿔 실패를 확인한 뒤 `src/i18n/catalogs/ko/settings.ts`의 `wipeBlocked`를 「지금 다른 작업이 끝나는 중이라 지우지 못했어요. 잠시 뒤에 다시 해 주세요.」로 바꾼다. `__tests__/i18n/ko-golden.test.ts`는 다시 쓰지 않고 `CHANGED_AFTER_GOLDEN`에 올린다. 지우기가 살아 있는 쓰기를 끊고 지우는 기존 동작(US8 AS3)은 `__tests__/app/wipe-diaries*.test.ts`가 수정 없이 통과하는 것으로 확인한다
- [ ] T052 [US8] ③ 기록: `AGENTS.md`의 「살아 있는 쓰기 등록부」·「자동 쓰기」 서술 중 지운 날 재작성 관련 줄에 「지운 날을 백그라운드가 다시 쓰는 것은 의도된 동작(자동 쓰기를 켠 사용자의 약속, 082는 눈앞 재작성만 막음, 106)」 한 줄을 반영하고(덧대지 않고 고친다), 같은 사실을 로드맵 완료 이력에 옮길 때(T063) 쓴다

## Phase 11: Polish & Cross-Cutting

- [ ] T053 전체 검사: `npm test`, `npm run lint`(eslint + tsc + 헌법 검사 + prettier)를 실제로 돌려 통과를 확인하고 결과를 `device-check.md`에 적는다. prettier는 `npm run format`으로 정리한 뒤 `format:check`를 확인
- [ ] T054 [P] 같은 규칙의 복제를 센다(AGENTS): `grep -rn "targetHour" src`로 `ScheduleTiming` 밖에서 시간 규칙을 읽는 곳이 설정·UI·`manual.ts`·`settings-effects.ts`·`target-hour.ts` 외에 없는지, `isInTargetWindow` 옛 export가 남지 않았는지, `getHours()`가 `timing.ts`·`manual.ts` 외에 하루 기준으로 쓰이지 않는지 확인. 또한 시도 기록 결과 갈래(`AttemptOutcome`)의 수가 106 전후로 같은지 확인한다(FR-015)
- [ ] T055 `AGENTS.md` 「저장소의 현재 상태」에 빠른 주기 한 항목(개발 빌드 전용, `timing.ts`·`dev-fast-cycle.json`·리셋 절차·한계·`showsOnScreen` 가드)과 ①④⑤ 결론을 짧게 반영한다. 앞의 서술(예: 080 「합류 쓰기 실패 시 …」 위험 문장)이 뒤집혔으면 덧대지 않고 고치거나 지운다
- [ ] T056 [P] `docs/e2e/layer2-release-checklist.md`·`docs/e2e/feature-flow-map.md`에 빠른 주기가 e2e 흐름에 영향을 주는지 확인하고, 영향 없으면 변경하지 않는다(개발 빌드 전용, 기존 흐름은 꺼짐 상태) — 확인 결과를 `device-check.md`에 한 줄 적는다
- [ ] T057 사용자 확인 대상 문구 모음: T037의 새 문구 전체와 T051 문구를 최종 보고에 표로 모은다(소유자 확정)

## Phase 12: 실기기 확인 (SM-S901N, dev 빌드 — 원칙 V)

- [ ] T058 quickstart.md의 사전 조건을 맞추고(Metro 번들만 올림, `pm clear`·재설치 금지) 개발자 메뉴에서 30분 주기를 켜 세 주기 이상 두고 시도 기록·예약 알림·트레이를 읽는다. 결과를 `specs/106-auto-write-fast-cycle/device-check.md`에 쓴다(본 것/못 본 것 구분 — 못 깬 주기도 그대로 기록)
- [ ] T059 10분 주기: 앱 열기와 강제 잡(`cmd jobscheduler run -f`)으로 한 바퀴, 쓸 차례 알림이 주기 시작에 뜨는지, 저장 뒤 완성 알림만 남는지 확인해 기록한다
- [ ] T060 ① 경합: 홈 쓰기 도중 진단 「지금 실행」으로 겹쳐 모델이 둘 열리지 않는지 logcat으로 본다. ④는 기기에서 재현하기 어려우면 조립 테스트가 근거라고 적는다(못 본 것은 못 봤다고 적는다)
- [ ] T061 끄기: 모드 끄기와 개발자 메뉴 끄기 뒤 평소 규칙으로 돌아오는지(`run-as com.a810labs.pocketlog`로 `preferences/dev-fast-cycle.json` 없음 확인, 평소 판정 `not-near-target`) 확인해 기록한다

## 완료 처리 (kickoff 8단계 — 구현·코드 리뷰가 끝난 뒤, 별도 커밋)

- [ ] T062 `npm test`·`npm run lint`를 다시 돌려 통과를 확인한다
- [ ] T063 로드맵 `docs/roadmap/README.md`: 「백그라운드 자동 쓰기」 과제의 할 일 5번 중 ①②④⑤와 ③ 결정을 닫고(완료 이력에 106 한 줄 추가: 빠른 주기 + 080 잔여), 「진행 중」 줄을 걷고, 3번(OS가 깨운 잡)에 「106의 빠른 주기가 수단」을 반영한다. 소크 결과가 아직이면 과제는 남긴다

## Dependencies & Execution Order

- Phase 1 → Phase 2(선행) → Phase 3(US1) → Phase 4(US2)·Phase 5(US3)는 US1 뒤. Phase 6(US6)·Phase 9(US7)·Phase 10(US8)은 Phase 2와 무관해 Phase 2와 병렬로 시작할 수 있다. Phase 7(US4)은 Phase 2 뒤. Phase 8(US5)은 Phase 3(훅 연결 deps)·Phase 5(`use-fast-cycle`) 뒤.
- 같은 파일을 만지는 작업은 직렬이다: `App.tsx`(T043·T048), `DiaryHomeScreen.tsx`(T046·T050), `task.ts`(T013·T017), `decision.ts`(T013), `reminders.ts`(T035), `__tests__/i18n/ko-golden.test.ts`(T038·T051).
- 테스트 작업(T002·T004·T006·T008·T010·T012·T014·T016·T018·T022·T023·T024·T027·T029·T032·T034·T039·T041·T044·T045·T047·T049)은 대응 구현 작업 앞에서 실패를 확인한다.

## Parallel Execution Examples

- Phase 2: T002/T004/T006/T008/T010을 함께 쓰고(서로 다른 파일), 구현 T003→T005→T007·T009·T011을 이어서.
- 스토리 간: US6(T029~T031)와 US7(T045~T048)와 US8(T049~T052)은 Phase 2와 병렬로 진행 가능.

## Implementation Strategy

1. **MVP = Phase 2 + US1 + US2 + US3**(빠른 주기가 돌고 prod에서 안전함). 켜는 화면(US5) 전에는 기록 파일을 `adb`로 직접 써서 기기 검증이 가능하다.
2. 그다음 US6(경합 수정, 독립), US4(알림), US5(화면), US7·US8.
3. 매 단계 `npm run test:logic`/`test:ui`로 확인하고, 구현 구간이 끝나면 converge → 코드 리뷰 → 기기 확인(Phase 12)으로 간다.
