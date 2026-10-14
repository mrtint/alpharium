# Tasks: 살아 있는 쓰기를 등록부 하나로 — 잠금 파일·낡음 시간 걷기와 홈의 합류

**Input**: `specs/080-live-write-registry/` — [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/live-write.md](contracts/live-write.md), [quickstart.md](quickstart.md)

**Tests**: TDD 필수(CLAUDE.md `test-driven-development`) — 구현보다 실패하는 테스트가 먼저다. 대부분 테스트 태스크와 구현 태스크가 따로이고, 한 항목에 둘이 함께 있는 것(T024·T027·T028)은 그 안에서 「테스트를 쓰고 실패를 본 뒤 구현」 순서다. 소스를 읽는 테스트는 주석을 먼저 걷는다(`.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")`). RNTL 14는 `render`·`fireEvent`·`rerender`를 `await`한다.

**규칙**: 측정 코드를 제품에 넣지 않는다(FR-020). `PipelineStage`·`AppScreen`을 넓히지 않는다. 홈이 시작한 쓰기의 동작을 바꾸지 않는다(FR-013). 「lock」을 일괄 치환하지 않는다(바 잠금 `lockBar`·`barLockMs`는 다른 뜻이다) — `tsc`가 짚는 자리만 고친다. release 빌드·`npm run test:layer1`·기기의 앱 삭제는 하지 않는다.

## Phase 1: Setup

- [X] T001 `git branch --show-current`가 `080-live-write-registry`인지 확인하고 `npm test`가 초록인 것을 기준으로 남긴다(변경 전 스위트·통과 수를 `specs/080-live-write-registry/quickstart.md` 「실측」 절에 한 줄로 적는다)

## Phase 2: Foundational (등록부·파이프라인·배선 — 모든 스토리가 기댄다)

- [X] T002 `__tests__/diary/live-write.test.ts`(새 파일)를 쓴다(실패 확인 — 모듈이 없다). `createLiveWrites()`로 새 등록부를 만들어: (R1) 빈 칸에서 `beginWrite({ day, owner: "background" })`가 손잡이를 주고 `current()`가 `kind: "write"`·그 `day`·`owner`를 보인다, 찬 칸에서 `beginWrite`·`beginWipe`가 `null`이다, 지우기 칸에서도 `beginWrite`가 `null`이다 · (R3) `end({ ok: true })` 뒤 `current()`가 `null`이고 `done`이 `{ ok: true, cancelled: false }`로 풀리며, `done`의 `then` 안에서 본 `current()`가 그 쓰기가 아니다, 그리고 `onChange` 구독자는 그 뒤에 불린다 · (R4) `end()`를 두 번 불러도 그 사이 새로 차지한 쓰기가 비워지지 않는다 · (R5) `cancel()`이 `isCancelled()`를 참으로 만들고 `stop`을 정확히 한 번 부른다(두 번 `cancel()`해도 한 번), `stop`이 던지거나 거부하는 Promise를 줘도 `cancel()`이 던지지 않는다, `end()` 뒤의 `cancel()`은 `stop`을 부르지 않는다, `stop`을 주지 않아도 된다 · (R6) 그만둔 뒤 `end({ ok: false })`면 `done`이 `{ ok: false, cancelled: true }`, 그만둔 뒤 `end({ ok: true })`면 `{ ok: true, cancelled: true }` · (R7) `progress()`가 처음엔 `null`, `publish("vision", "seen")` 뒤 `{ stage: "vision", branch: "seen" }`, 구독자가 그 값을 받고 끊은 뒤에는 받지 않으며, 던지는 구독자가 있어도 `publish`가 던지지 않는다(단계·갈래 값은 `src/inference/types`의 실제 유니온에서 고른다) · (R8) `onChange`가 차지·비움마다 한 번씩 불리고 끊으면 안 불리며 던지는 구독자가 차지·비움을 막지 않는다 · (FR-002) 가짜 타이머로 11분을 보낸 뒤에도 찬 칸의 `beginWrite`가 `null`이다 · (020 L9 대체) 시드 고정 무작위 순서로 두 「호출자」가 `beginWrite`/`end`를 100회 섞어 불러 어느 시점에도 살아 있는 손잡이가 둘이 아니다
- [X] T003 `src/diary/live-write.ts`를 `contracts/live-write.md` R절의 타입·규칙대로 쓴다(`createLiveWrites()`·`liveWrites`·`LiveWrite`·`LiveSlot`·`LiveWriteEnd`·`LiveProgress`·`WriteHandle`·`WipeHandle`·`LiveWrites`). `owner` 타입은 `src/inference/assembly.ts`의 `AssemblyOwner`, 단계 타입은 `src/inference/types`에서 `import type`으로만. 머리 주석에 「왜 파일·나이가 없는가」(research R1의 전제와 한계 — 소스 읽기, 실측 아님)를 적는다 → T002 통과
- [X] T004 `__tests__/diary/live-write.test.ts`에 소스 계약을 더한다(R2·R9·R10, 실패하지 않으면 주입으로 확인 — `await` 0건이 R2 「차지는 동기다」의 증거다): `src/diary/live-write.ts`에서 주석을 걷은 소스에 `Date`·`setTimeout`·`setInterval`·`expo-`·`react-native`·`require(`·`await`가 없다 · `src/` 전체(재귀)와 `App.tsx`에서 `createLiveWrites(`를 부르는 파일이 `src/diary/live-write.ts`뿐이다 · (FR-019) 같은 소스에 시각·소요 시간·모델·토큰을 싣는 낱말(`acquiredAt`·`startedAt`·`elapsed`·`durationMs`·`model`·`token`)이 없다
- [X] T005 `__tests__/diary/pipeline.live-write.test.ts`(새 파일 — `__tests__/diary/pipeline.lock.test.ts`의 조립 대역을 옮겨 쓴다)를 쓴다(실패 확인): (P1) `beginWrite`를 주지 않으면 종전대로 돈다 · (P2) `beginWrite`가 `null`이면 `{ ok: false, stage: "already-running" }`이고 `loadSignals`·`backend.generate`가 불리지 않는다, 판정 순서가 `day-not-closed` → 인스턴스 `running` → `beginWrite`다(미래 날에는 `beginWrite`가 불리지 않는다) · (P3) 성공·`generation` 실패·`storage` 실패·`backend.generate`가 던진 경우 모두 `end`가 정확히 한 번 불리고 그 시점은 `generate`가 돌아온 뒤다, 성공이면 `end({ ok: true })` 실패면 `end({ ok: false })` · (P4) `onProgress`를 주지 않아도 손잡이의 `publish`가 `signals`를 포함한 진행 신호를 받는다, 준 경우 둘 다 받는다 · (P5) 손잡이의 `isCancelled()`가 참이면 저장하지 않고(`store.save` 미호출) 사진 사본을 정리한다, `input.isCancelled`만 참이어도 같다 · (P6) 손잡이의 `isCancelled()`가 참이고 결과가 실패이면 `cancelled === true`가 실린다(엔진이 `interrupted`로 돌아온 길과 저장 직전 확인에 걸린 길 둘 다), 그만두지 않은 실패에는 `cancelled` 키가 없다, 성공 결과에는 없다 · 진짜 등록부(`createLiveWrites()`)를 묶은 두 파이프라인 인스턴스에서 첫 `run()`이 도는 동안 둘째 `run()`이 `already-running`이고 첫째가 끝난 뒤에는 돈다
- [X] T006 `src/diary/pipeline.ts`를 고친다: `PipelineDeps.acquireLock?`·`LockHandle`을 지우고 `beginWrite?: (day: DayDate) => WriteHandle | null`을 둔다(주석을 080 계약 P1~P6으로 다시 쓴다) · `PipelineResult`의 실패 두 갈래에 `cancelled?: true` · `run()`이 P2~P6대로 차지·`publish`·그만둠 확인·`end`를 한다(`runStages`에 넘기는 `input.isCancelled`와 `onProgress`를 손잡이와 합친 것으로 바꾼다). `__tests__/diary/pipeline.lock.test.ts`를 지운다 → T005 통과, `npx jest __tests__/diary --selectProjects logic` 초록
- [X] T007 [P] `__tests__/app/wiring.test.ts`의 잠금 소스 계약(`acquireLockRecord(lockPort, owner,`)을 080 P7로 바꾼다(실패 확인): `src/app/wiring.ts`에서 `deps.lockOwner ?? "screen"`이 한 번만 나오고 그 변수 `owner`가 `selectBackend(` 호출과 `beginWrite(` 호출의 인자 양쪽에 쓰인다 · 등록부는 `deps.liveWrites ?? liveWrites`다 · `stop`으로 `selection.backend.stop`이 묶인다 · 주석을 걷은 소스에 `lockPort`·`expoLockPort`·`Date.now()`가 없다. 동작 테스트도 하나: `createAppPipeline(resolution, { liveWrites: registry, … })`로 만든 두 파이프라인(주체 `screen`·`background`)이 같은 등록부를 나눠 쓰고, 한쪽이 도는 동안 `registry.current()`의 `owner`가 그 주체다
- [X] T008 `src/app/wiring.ts`를 고친다: `WiringDeps.lockPort`를 `liveWrites?: LiveWrites`로 바꾸고, `acquireLock` 클로저를 `beginWrite: (day) => registry.beginWrite({ day, owner, ...(stop !== undefined ? { stop } : {}) })`로 바꾼다(`stop`은 `selection.backend.stop?.bind(selection.backend)` — 아래에서 이미 만드는 값을 위로 올려 한 번만 만든다). `schedule/lock`·`schedule/lock-port` import를 지운다. 주석의 「잠금」을 「등록부」로 고친다 → T007 통과
- [X] T009 [P] `__tests__/app/write-failures.test.ts`에 P9를 더한다(실패 확인): `recordWriteFailure(port, { ok: false, stage: "generation", reason: "interrupted: …", cancelled: true }, at)`가 `port.write`를 부르지 않는다, `cancelled`가 없는 같은 결과는 `unwritten`으로 기록한다 · (FR-016 첫 실행) `src/app/wiring.ts`의 `triggerFirstRunAutoDiary`가 결과를 `recordWriteFailure(`에 그대로 넘긴다는 소스 계약 — 그만둔 첫 실행 자동 첫 일기도 이 한 곳에서 걸러진다
- [X] T010 `src/app/write-failures.ts`의 `WriteResult`에 `cancelled?: boolean`을 더하고 `isRecordable()`이 `result.cancelled === true`를 거르게 한다(주석: 080 — 사용자가 그만둔 쓰기는 실패가 아니다) → T009 통과
- [X] T011 `__tests__/app/wipe-diaries.test.ts`를 080 W1·W3·W4로 옮긴다(실패 확인): 대역 `lockPort`·`nowMs`를 `liveWrites: createLiveWrites()`로 바꾼다 · 빈 칸이면 종전 순서(일기 → 사진 사본 → 알림 확인 기록 → 트레이 알림)로 지우고 도는 동안 `current()`가 `{ kind: "wipe" }`이며 끝나면(성공·일부 실패 모두) 칸이 빈다 · 지우기 칸이 이미 차 있으면 아무 통로도 부르지 않고 `{ kind: "busy" }`다
- [X] T012 `src/app/wipe-diaries.ts`를 고친다: `WipeDeps`에서 `lockPort`·`nowMs`를 지우고 `liveWrites: LiveWrites`를 둔다, `beginWipe()`가 `null`이면 `busy`, `finally`에서 `end()`. 머리 주석의 순서 1·7을 등록부로 다시 쓴다. `App.tsx`의 `requestWipe`가 `liveWrites`(모듈의 그 하나)를 넘기게 고친다 → T011 통과

## Phase 3: User Story 2 — 죽은 쓰기가 다음 쓰기를 막지 않는다 (P1) 🎯 MVP

**Goal**: 잠금 파일·낡음 시간·시작 시 청소가 제품에서 사라진다 — 프로세스가 죽으면 쓰기를 막는 것이 남지 않는다. **Independent Test**: 소스 계약이 0건을 잠그고, dev 실기기에서 백그라운드 쓰기 도중 프로세스를 죽인 뒤 곧바로 열면 쓰기가 시작된다(T038 D3).

- [X] T013 [US2] `__tests__/diary/live-write.test.ts`에 P8 소스 계약을 더한다(실패 확인): `src/`(재귀)와 `App.tsx`의 주석을 걷은 소스에 `STALE_LOCK_MS`·`diary-generation.lock`·`clearStaleLocksOnStart`·`lock-port`·`schedule/lock`·`acquireLock`·`LockPort`가 0건이다 · `src/schedule/lock.ts`와 `src/schedule/lock-port.ts`가 없다(`existsSync`)
- [X] T014 [US2] `src/schedule/lock.ts`·`src/schedule/lock-port.ts`·`__tests__/schedule/lock.test.ts`를 지우고, `App.tsx`에서 `clearStaleLocksOnStart` 호출·그 주석 묶음·`./src/schedule/lock`·`./src/schedule/lock-port` import를 지운다. `npx tsc --noEmit`이 짚는 남은 참조를 전부 고친다 → T013 통과, `tsc` 0
- [X] T015 [P] [US2] `__tests__/schedule/decision.test.ts`의 소스 금지어 정규식에서 `acquireLock`을 `beginWrite`로 바꾼다(판정 파일이 쓰기를 시작하지 않는다는 뜻은 그대로) — 바꾼 뒤 위반 주입(`decision.ts`에 `beginWrite` 낱말을 넣어 실패 확인)으로 살아 있는지 본다
- [X] T016 [P] [US2] `src/schedule/task.ts`·`src/inference/assembly.ts`·`src/inference/on-device.ts`·`src/ui/DiaryHomeScreen.tsx`·`src/ui/SettingsScreen.tsx`의 주석 중 「잠금 파일」·「잠금 주체」·「stale」을 가리키는 것을 등록부·조립 주체의 말로 고친다(코드 무변경 — `git diff`에 주석 줄만). `__tests__/inference/assembly.test.ts` 등 소스를 읽는 테스트가 그대로 통과하는지 `npm run test:logic`으로 본다

## Phase 4: User Story 1 — 휴대폰이 쓰고 있는 일기를 앱을 열어 그대로 본다 (P1)

**Goal**: 남의 쓰기가 살아 있으면 홈이 그 날의 「쓰는 중」으로 합류하고, 그동안 모델을 미리 열지 않는다. **Independent Test**: `home-join.test.tsx`가 통과하고, dev 실기기에서 백그라운드 쓰기 도중 앱을 열면 홈이 합류하며 모델 적재 로그가 겹치지 않는다(T038 D1).

- [X] T017 [US1] `__tests__/ui/home-join.test.tsx`(새 파일 — `__tests__/ui/home-auto-write.test.tsx`의 렌더 도우미와 대역을 본떠 쓴다, 등록부는 `createLiveWrites()`)에 합류의 테스트를 쓴다(실패 확인): (H1·H2) 등록부에 `owner: "background"`·어제의 쓰기를 넣고 홈을 그리면 목록을 읽은 뒤 화면이 「쓰는 중」이고(`stop-button` 보임) `setChosenDay`가 어제로 불린다 · `publish("vision", …)`이 이미 있었으면 혼잣말 줄(`writing-monologue-text`)이 그 단계의 풀에서 나온 줄이고, 그 뒤 `publish`로 단계를 바꾸면 줄이 바뀐다 · `owner: "screen"`인 남의 쓰기(첫 실행 자동 첫 일기 흉내)에도 합류한다 · 지우기 칸(`beginWipe`)에는 합류하지 않는다 · (H1 미룸) `covered`로 그린 동안에는 합류하지 않고 `rerender`로 덮개를 걷으면 합류한다 · 홈이 그려진 뒤에 칸이 차도(`onChange`) 합류한다 · (H5) 손잡이 `end({ ok: true })` 뒤 목록을 다시 읽어(`store.list` 재호출) 목록 상태로 돌아오고 토스트가 없다 · (H8) 남의 쓰기가 있는 동안 `claimAutoWrite`·`prepare`·`captionDay`가 한 번도 불리지 않는다(`autoWriteDay`를 준 채로) · (H10) 합류한 채 `unmount()`한 뒤 `end()`가 와도 경고·오류가 없고 구독이 끊겨 있다(`publish`가 구독자를 부르지 않는다) · (H11) `liveWrites`를 주지 않으면 종전과 같다(자동 시작이 `claimAutoWrite`를 부른다)
- [X] T018 [US1] `src/ui/DiaryHomeScreen.tsx`에 합류를 넣는다: prop `liveWrites?: Pick<LiveWrites, "current" | "onChange">`(타입만 import) · `onChange` 구독이 상태 번호를 올린다 · 「남의 쓰기」 판정 도우미(칸에 `kind: "write"`가 있고 `running.current`가 거짓) · `generate()` 안의 「단계 → 화면 줄」 갱신을 함수로 뽑아 합류도 쓴다 · 합류 effect(H1 조건, 상태 바꿈은 `Promise.resolve().then` — `react-hooks/set-state-in-effect`) — `joined` ref에 쓰기를 두고 `setChosenDay`·`setWritingItems`·`setWritingName`·`setScreen({ kind: "writing" })`·`lockBar()`, `progress()`로 첫 줄, `onProgress` 구독, `done`에서 구독을 끊고 `joined`를 비우고 목록을 다시 읽어 목록 상태로(H5; 실패·그만둠 갈래는 T023·T028) · `running.current`는 세우지 않는다 · 057 자동 시작 effect와 018 미리 준비 effect 둘(`prepare`·`captionDay`)의 맨 앞에 「남의 쓰기가 있으면 돌아간다」(H8) · 언마운트 때 구독을 끊고 늦은 `done`을 버린다(H10) → T017 통과
- [X] T019 [US1] `__tests__/ui/home-join.test.tsx`에 H3·H9를 더한다(실패 확인): (H3) 합류한 동안 `AppState`가 `background`로 바뀌어도 홈의 `stop` prop이 불리지 않고 쓰기의 `cancel`(등록부 `stop`)도 불리지 않는다 — 홈이 시작한 쓰기에서는 종전대로 `stop`이 불린다(같은 파일에서 대조) · (H9) 칸이 찬 상태에서 「쓰기」를 눌러 `pipeline.run`이 `{ ok: false, stage: "already-running" }`을 돌려주면 토스트(`toast`)가 없고 화면이 그 쓰기의 「쓰는 중」이 된다 · 칸에 쓰기가 없는데 `already-running`이면 종전대로 토스트가 뜬다
- [X] T020 [US1] `src/ui/DiaryHomeScreen.tsx`의 `generate()` 끝 처리에서 `already-running`이고 칸에 쓰기가 있으면 토스트를 띄우지 않게 한다(H9 — 목록 상태로 돌아가면 합류 effect가 이어받는다. 057의 `busyElsewhere` 갈래와 합친다). `AppState` 구독은 `running.current`만 보므로 H3은 T018의 「`running`을 세우지 않는다」로 성립한다 — 그 사실을 구독 옆 주석에 적는다 → T019 통과
- [X] T021 [US1] `App.tsx`가 `DiarySection` → `DiaryHomeScreen`으로 `liveWrites`(모듈의 그 하나)를 넘긴다. `__tests__/app/` 또는 `__tests__/ui/`의 조립 소스 계약 중 `DiaryHomeScreen`에 넘기는 prop을 세는 테스트가 있으면 함께 고친다(`grep -rn "claimAutoWrite=" __tests__`로 찾는다). `npm run test:ui` 초록

## Phase 5: User Story 3 — 오래 도는 쓰기·멈췄다 돌아온 쓰기 위에 두 번째 쓰기가 서지 않는다 (P1)

**Goal**: 살아 있는 쓰기는 나이와 무관하게 칸을 쥐고, 실패로 끝나면 그 뒤에 홈이 이어서 쓴다. **Independent Test**: 등록부의 11분 테스트(T002)와 `home-join.test.tsx`의 실패 갈래가 통과하고, iOS 시뮬레이터에서 660초 멈췄다 돌아오면 앞 쓰기가 끝난 뒤 홈이 새로 써서 저장한다(T039 S1).

- [X] T022 [US3] `__tests__/ui/home-join.test.tsx`에 H6을 더한다(실패 확인): 합류한 쓰기가 `end({ ok: false })`로 끝나면 토스트가 없고 `recordFailure` prop이 불리지 않으며 화면이 목록 상태다 · `autoWriteDay`가 그 날(아직 안 쓴 날)이고 `claimAutoWrite`가 한 번만 참인 대역이면, 끝난 뒤 `claimAutoWrite`가 불리고 `pipeline.run`이 그 날로 한 번 불린다 — **`end()` 전에는 불리지 않는다**(호출 순서를 배열로 적어 단언) · `autoWriteDay`가 없으면 `pipeline.run`이 불리지 않는다 · `writeBlocked`(064)이면 합류는 하되 끝난 뒤 이어 쓰지 않는다 · `claimAutoWrite`가 거짓인 대역(그 실행의 「한 번」이 이미 쓰였다)이면 `pipeline.run`이 불리지 않고 토스트 없이 목록 상태다(FR-012)
- [X] T023 [US3] `src/ui/DiaryHomeScreen.tsx`의 합류 끝 처리에 실패 갈래를 넣는다(H6): 토스트·`recordFailure` 없이 목록을 다시 읽어 목록 상태로 — 그 뒤의 이어 쓰기는 057 effect가 한다(새 코드를 넣지 않는다, research R4). 057 effect의 의존성이 합류 종료로 다시 도는지(화면 상태·등록부 변화 번호) 확인한다 → T022 통과
- [X] T024 [US3] `__tests__/ui/home-join.test.tsx`에 H12를 더하고(실패 확인) `src/ui/DiaryHomeScreen.tsx`에 넣는다(FR-014a): 홈을 `covered`로 그려 합류하지 못하게 한 채 남의 쓰기(어제)를 `end({ ok: true })`로 끝내고, `store.list`가 테스트가 쥔 Promise로 늦게 풀리게 한 뒤 덮개를 걷는다 — 목록 읽기가 풀리기 **전에는** `claimAutoWrite`가 불리지 않고(`autoWriteDay`는 어제), 어제가 든 목록으로 풀린 뒤에는 어제가 쓴 날이라 `claimAutoWrite`·`pipeline.run`이 끝내 불리지 않는다 · 같은 준비에서 목록이 어제 없이 풀리면(그 쓰기가 실패했다) 그 뒤에 `claimAutoWrite`가 불린다 · 덮이지 않았지만 합류 직전에 칸이 빈 경우도 같다. 구현: 남의 쓰기를 본 순간 세우는 ref(「목록이 낡았다」)를 057 effect가 맨 앞에서 보고, 칸이 비는 변화에서 목록 상태면 목록을 다시 읽어 반영한 뒤 ref를 내리고 상태 번호를 올린다. 합류 끝 처리(T018·T023·T028)의 목록 다시 읽기도 같은 ref를 내린다

## Phase 6: User Story 4 — 합류한 쓰기를 그만둘 수 있다 (P2)

**Goal**: 합류한 「쓰는 중」의 그만두기가 그 쓰기를 끊고, 시작한 쪽은 그것을 실패로 치지 않는다. **Independent Test**: 태스크·홈 테스트가 통과하고, dev 실기기에서 합류 뒤 그만두면 일기·실패 기록·알림이 없고 시도 기록에 「사용자가 그만둠」이 남는다(T038 D2).

- [X] T025 [P] [US4] `__tests__/app/auto-write-attempts.test.ts`·`__tests__/app/diagnostics-view.test.ts`에 T4를 더한다(실패 확인): `ATTEMPT_OUTCOMES`의 길이가 14이고 `cancelled`가 `already-running` 뒤·`ran` 앞이다 · `cancelled` 갈래의 줄이 저장·다시 읽기를 거쳐 남는다 · 진단·개발자 화면의 줄 문구가 「사용자가 그만둠」이다(`text().attempts.cancelled`)
- [X] T026 [US4] `src/app/auto-write-attempts.ts`의 `AttemptOutcome`·`ATTEMPT_OUTCOMES`에 `"cancelled"`를 더하고, `src/i18n/catalogs/ko/attempts.ts`에 `cancelled: "사용자가 그만둠"`(주석의 「결과 열셋」을 열넷으로), `src/app/diagnostics-view.ts`의 갈래 → 문구 연결에 더한다. `__tests__/i18n/ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`에 「사용자가 그만둠」을 올린다(골든 json은 다시 쓰지 않는다) → T025 통과, `npx jest __tests__/i18n --selectProjects logic` 초록
- [X] T027 [US4] `__tests__/schedule/background-generation.test.ts`에 T2를 더하고(실패 확인) `src/schedule/task.ts`를 고친다: 파이프라인이 `{ ok: false, stage: "generation", reason: "interrupted: …", cancelled: true }`를 돌려주면 `runAutoDiaryTask()`가 `"skipped"`이고 알림 통로(`present`)가 불리지 않고 쓰기 실패 통로에 쓰지 않으며 시도 기록의 끝이 `cancelled`다(시작 `started`와 같은 `now`로 짝) · `manual: true`에서도 같다 · `cancelled` 없는 같은 실패는 종전대로 `"failed"`·실패 기록 · `already-running`은 종전대로(T3). T1(조립은 그대로 한 곳, `{ lockOwner: "background" }`)은 079의 `__tests__/schedule/task-assembly-source.test.ts`가 고치지 않고 통과하는 것으로 본다. 구현은 `result.ok` 갈래 바로 아래 `if (result.cancelled === true) return skipped("cancelled");` 한 갈래와 주석이다(B2-7·B2-9 주석의 「잠금」도 등록부로)
- [X] T028 [US4] `__tests__/ui/home-join.test.tsx`에 H4·H7을 더하고(실패 확인) `src/ui/DiaryHomeScreen.tsx`의 `cancel()`에 합류 갈래를 넣는다: (H4) 합류한 「쓰는 중」에서 `stop-button`을 누르면 그 쓰기의 `cancel`(등록부에 준 `stop`)이 한 번 불리고 홈의 `stop` prop은 불리지 않으며, `end()`가 오기 **전에는** 화면이 「쓰는 중」이고 온 뒤에 목록 상태다 · `claimAutoWrite`가 한 번 불려 소모되고(`autoWriteDay`가 있어도) 그 뒤 `pipeline.run`이 불리지 않는다 · 안드로이드 뒤로 가기(`hardwareBackPress`)도 같다 · 그만둔 뒤 `end({ ok: true })`로 끝나면(저장이 이미 시작됐다) 목록을 다시 읽어 그 날이 쓴 날로 보인다 · (H7) 홈이 그만두지 않았는데 `done`이 `{ ok: false, cancelled: true }`면 토스트 없이 목록 상태이고 `claimAutoWrite`가 소모돼 이어 쓰지 않는다. 구현: `cancel()`이 `joined.current`가 있으면 `lockBar()` → `joined.current.cancel()` → `await done` → `claimAutoWrite?.()` → 목록 다시 읽기 → `lockBar()`, 없으면 종전 그대로

## Phase 7: User Story 5 — 평소 쓰기와 지우기는 그대로다 (P2)

**Goal**: 지우기가 남의 쓰기를 끊고 끝난 뒤에 지우며, 홈이 시작한 쓰기의 길은 한 줄도 바뀌지 않는다. **Independent Test**: `wipe-diaries.test.ts`와 기존 홈 테스트 전체가 통과하고, dev 실기기에서 평소 쓰기·빠른 반복·지우기가 종전과 같다(T038 D4·D5).

- [X] T029 [US5] `__tests__/app/wipe-diaries.test.ts`에 W2를 더한다(실패 확인): 칸에 쓰기가 있으면 `cancel`(그 쓰기의 `stop`)이 불리고, 손잡이 `end({ ok: false })`가 오기 전에는 `store.removeAll`이 불리지 않으며 온 뒤에 종전 순서로 지운다(호출 순서 배열) · 끊은 쓰기가 끝난 직후 다른 쓰기가 칸을 차지하면(끝의 `then`에서 `beginWrite`) 아무것도 지우지 않고 `busy`다(W3) · 칸에 지우기가 있으면 기다리지 않고 `busy`
- [X] T030 [US5] `src/app/wipe-diaries.ts`에 W2를 넣는다: `beginWipe()` 앞에서 `const live = deps.liveWrites.current(); if (live?.kind === "write") { live.cancel(); await live.done; }`. 머리 주석에 「홈이 시작한 쓰기는 `requestWipe`의 `stopHome()`이 먼저 멈춘다 — 여기 닿는 것은 남의 쓰기다」를 적는다. `App.tsx`의 `requestWipe` 주석(058 순서 2의 「잠금을 못 얻으면(백그라운드가 쓰는 중)」)을 고친다 → T029 통과
- [X] T031 [P] [US5] `__tests__/app/app-wipe-source.test.ts`에 소스 계약을 더한다: `App.tsx`의 `requestWipe`가 `stopHome()`을 `wipeDiaries(` 앞에서 기다리고(종전), `wipeDiaries(`의 인자에 `liveWrites`가 있고 `lockPort`·`nowMs`가 없다
- [X] T032 [US5] FR-013 회귀를 확인한다: `git diff main -- __tests__/ui/home-auto-write.test.tsx __tests__/ui/home-rapid-cancel.test.tsx __tests__/ui/home-wipe.test.tsx __tests__/ui/writing-in-place-stop.test.tsx __tests__/ui/writing-in-place-toast.test.tsx __tests__/ui/writing-in-place.test.tsx __tests__/ui/diary-home.test.tsx __tests__/ui/diary-home-write-request.test.tsx`가 비어 있고(고치지 않았다) `npm run test:ui`가 초록이다. 비어 있지 않으면 그 변경이 H11을 깨지 않는지 한 줄씩 적는다

## Phase 8: Polish & 검증

- [X] T033 위반 주입 아홉(quickstart §1 표)을 하나씩 한다 — 주입 뒤 치환이 실제로 적용됐는지 grep으로 먼저 확인하고, 해당 테스트가 실패하는 것을 본 뒤 되돌리고, 원래 문자열이 돌아왔는지 다시 grep한다. 잡지 못한 주입이 있으면 테스트를 고친다. 결과를 quickstart 「실측」에 적는다
- [X] T034 [P] 대체 표기: `specs/020-scheduled-diary-notification/contracts/generation-lock.md` 맨 위와 `specs/079-bg-auto-write-threads/contracts/assembly.md`의 「L. 잠금이 낡았다고 보는 시간」 절 맨 위에 「**080으로 대체됨** — `specs/080-live-write-registry/contracts/live-write.md`. 아래는 이력이다」를 적는다(본문은 그대로)
- [X] T035 `AGENTS.md`를 고친다(앞 서술을 주석으로 덧대지 않고 고치거나 지운다): 「019·020」의 `STALE_LOCK_MS` 문단과 「경합은 … 파일 잠금 + stale」을 등록부로 · 「071」의 「쓰는 중인지는 잠금 파일의 존재가 가장 믿을 만한 신호다」를 걷고 대신 볼 것(logcat의 모델 적재 줄·시도 기록) · 「058」의 「잠금을 못 얻으면」 · 「078」 읽는 법에 `사용자가 그만둠` 갈래 · 「079」의 「잠금의 남은 틈」과 `STALE_LOCK_MS` 10분 서술 · 「저장소의 현재 상태」에 한 줄 · 새 절 「080」(결론·전제의 근거 수준·남은 위험 — 실기기 결과는 T040에서 채운다) · 「코드를 어디에 두는가」의 `src/diary/`에 `live-write.ts` 한 줄
- [X] T036 `npm test`와 `npm run lint`를 돌려 전부 초록인지 본다(스위트·통과 수를 quickstart 「실측」에 적는다). `__tests__/jest-projects.test.ts`가 파일 수를 세면 새 테스트 파일 셋(`live-write`·`pipeline.live-write`·`home-join`)·지운 테스트 파일 둘(`lock`·`pipeline.lock`)을 반영한다
- [X] T037 실기기 준비: SM-S901N의 일기·설정을 백업하고(quickstart §2 「백업」), 맥의 Metro로 이 브랜치 번들을 올리고 번들에 `createLiveWrites`가 있고 `STALE_LOCK_MS`가 없는 것을 확인한다. 어제에 진짜 사진을 심는다
- [X] T038 안드로이드 dev 실기기에서 quickstart §2의 D1(합류 — SC-001, 전제 확인)·D2(그만두기 — SC-003)·D3(죽은 쓰기 — SC-002)·D4(지우기)·D5(회귀 — SC-005)을 돌리고 본 것을 시각과 함께 quickstart 「실측」에 적는다. **D1에서 모델 적재 로그가 겹치면(전제가 틀렸다) 여기서 멈추고 소유자에게 알린다.** 끝나면 백업으로 되돌리고 md5를 대조한다
- [X] T039 iOS 시뮬레이터에서 quickstart §3의 S1(660초 멈췄다 돌아와 실패 → 이어 쓰기 — SC-004)·S2(합류)를 돌리고 「실측」에 적는다. 끝나면 백업으로 되돌린다(`diff -r`)
- [X] T040 `AGENTS.md` 「080」과 설계 문서(`docs/superpowers/specs/2026-10-13-live-write-registry-design.md`)에 실기기에서 본 것과 미확인(quickstart §4)을 적고, 구현하며 설계와 달라진 곳이 있으면 설계 문서를 고친다. SC-006을 마지막으로 다시 센다(`grep -rn "STALE_LOCK_MS\|diary-generation.lock" src App.tsx` → 0). `docs/roadmap/README.md`의 그 과제 3·4·5·6번에 적어 둔 080의 영향이 구현된 것과 맞는지 읽고 어긋난 곳을 고친다(FR-021 — 5번을 이력으로 옮기는 것은 kickoff 완료 처리에서 한다)

## 요구 → 태스크

| 요구 | 태스크 |
| --- | --- |
| FR-001 한 번에 하나(지우기 포함) | T002·T003, T007·T008(모든 파이프라인이 같은 등록부를 쓴다), T011·T012 |
| FR-002 나이로 죽었다고 보지 않는다 | T002(11분) |
| FR-003 죽은 프로세스의 쓰기가 막지 않는다 | T013·T014, T038(D3) |
| FR-004 파일·시각·갱신으로 판정하지 않는다 | T004, T013·T014, T015·T016(남은 참조·주석) |
| FR-005 살아 있으면 시작하지 않는다 · 틈 없음 | T002, T004(R2), T005·T006 |
| FR-006 합류 조건 · FR-007 그 날의 쓰는 중과 혼잣말 · FR-011 성공 뒤 쓴 날 홈 | T017·T018, T021 |
| FR-008 앞을 벗어나도 끊지 않는다 · FR-009 「쓰기」가 막히면 합류 | T019·T020 |
| FR-010 그만두기 | T028 |
| FR-012 실패 뒤 이어 쓰기 | T022·T023 |
| FR-013 홈이 시작한 쓰기는 그대로 | T032 |
| FR-014 미리 준비하지 않는다 | T017·T018 |
| FR-014a 낡은 목록으로 다시 쓰지 않는다 | T024 |
| FR-015 그만둠은 값으로 | T005·T006 |
| FR-016 그만둔 쓰기의 기록·알림 | T009·T010, T025·T026, T027 |
| FR-017 살아 있으면 건너뛴다 | T027 |
| FR-018 지우기는 멈추고 지운다 | T029·T030, T031 |
| FR-019 화면이 받는 것 | T004 |
| FR-020 재는 코드 없음 | 머리말 규칙, T038·T039(로그·기록으로만 본다) |
| FR-021 문서 | T034, T035, T040 |
| SC-001 · SC-002 · SC-003 | T038(D1 · D3 · D2) |
| SC-004 | T039(S1) |
| SC-005 | T036, T038(D5) |
| SC-006 | T013, T040 |

요구에 매이지 않는 지원 태스크: T001(기준선), T033(위반 주입 — 헌법 「개발 방식」과 AGENTS 「작업 습관」), T037(실기기 준비).

## Dependencies

- Phase 2(T002~T012)가 모든 스토리의 토대다. T003 → T006 → T008 순서(등록부 → 파이프라인 → 배선). T010은 T006의 `cancelled`에 기대지 않는다(모양만 본다). T012는 T003 뒤.
- US2(T013~T016)는 T008·T012가 끝나야 한다(둘이 `lock.ts`의 마지막 사용자다).
- US1(T017~T021)은 Phase 2 뒤. US3(T022~T024)·US4의 T028은 US1의 T018 뒤(합류 effect 위에 얹는다). T024는 T023 뒤, T028은 T024 뒤(끝 처리의 ref를 같이 쓴다).
- US4의 T025~T027은 Phase 2 뒤면 된다(US1과 독립).
- US5의 T029~T030은 T012 뒤. T032는 US1·US3·US4의 홈 변경이 모두 끝난 뒤.
- Polish: T033은 모든 구현 뒤, T036은 T033~T035 뒤, T037 → T038 → T039 → T040.

## Parallel

- Phase 2: T007·T009는 T006과 다른 파일이라 테스트 작성은 나란히 할 수 있다.
- US2: T015·T016은 T014와 다른 파일.
- US4: T025~T027(기록·태스크)은 US1의 홈 작업과 나란히.
- US5: T031은 T029·T030과 다른 파일.
- 같은 파일(`DiaryHomeScreen.tsx`·`home-join.test.tsx`)을 고치는 T017~T020·T022·T023·T024·T028은 차례로 한다.

## Implementation Strategy

MVP는 Phase 2 + US2다 — 등록부로 옮기고 잠금 파일을 걷는 것만으로 (a)(c)가 닫히고 화면은 종전과 같다(남의 쓰기가 있으면 `already-running`). 그 위에 US1(합류) → US3(실패 뒤 이어 쓰기) → US4(그만두기) → US5(지우기) 순서로 얹는다. 각 단계 끝에서 `npm run test:logic` 또는 `npm run test:ui`가 초록이어야 다음으로 간다. 실기기는 전부 얹은 뒤 한 번에 본다(T037~T039).

## Phase 9: Convergence

- [X] T041 `spec.md` FR-019의 「날·단계·끝·끊기뿐」과 홈이 받는 `LiveWrite`의 조립 주체(`owner`)를 맞춘다 — 주체는 모델 식별자·시간·토큰이 아니고(원칙 III·IV와 무관) 같은 스펙의 Key Entities·계약 R절이 이미 포함하므로 FR-019의 목록에 「누가 조립했는가」를 더하고, 금지되는 것(모델 식별자·소요 시간·토큰 수)은 그대로 둔다. `__tests__/diary/live-write.test.ts`의 FR-019 소스 계약이 그 금지어를 계속 잠그는지 확인한다 per FR-019 (contradicts)

## Phase 10: Convergence

- [X] T042 `plan.md` Constitution Check의 원칙 III 줄(「등록부가 화면에 주는 것은 날·단계·끝·끊기뿐」)을 spec FR-019와 같게 고친다 — 조립 주체(화면/백그라운드)도 준다, 모델 식별자는 실리지 않는다 per plan: Constitution Check III (contradicts)

## Phase 11: 코드 리뷰 반영 (2026-10-13)

독립 리뷰(Critical 0 · Important 3 · Minor 6)의 Important 전부와 Minor 일부를 반영했다. 남긴 것은 아래에 이유와 함께 적는다.

- [X] T043 (Important 1) `__tests__/diary/pipeline.live-write.test.ts`에 「생성에 들어서기 전에 끊겼으면 생성을 시작하지 않는다」(칸의 그만둠 · 호출자의 `isCancelled`)를 쓰고(실패 확인) `src/diary/pipeline.ts`의 `runStages`가 `backend.generate()` 직전에 `isCancelled`를 한 번 더 보게 한다 — 어댑터가 `generate()`에 들어설 때 그만두기 신호를 비워, 신호 읽기 도중의 끊기가 사라지고 쓰기가 끝까지 돌았다(합류한 홈의 「그만두기」와 지우기가 그 끝을 기다린다). 071 `pipeline-cancel-on-save.test.ts`의 「저장 직전」 셋은 처음부터 참인 `isCancelled`로 썼던 것을 「생성 도중에 참이 되는」 모양으로 고친다(그 테스트가 보려던 길이 그것이다). 계약 P5a, spec FR-014b
- [X] T044 (Important 2) `__tests__/ui/home-join.test.tsx`에 「FR-013 — 진짜 파이프라인 + 같은 등록부」 묶음을 더한다: 그만둔 자기 쓰기가 칸을 쥔 동안 합류하지 않고 쓰기 바가 곧바로 돌아온다 · 자기 쓰기의 끝이 목록을 낡게 하지 않는다. 변이(`foreignWrite()`의 `running` 확인 제거, `onChange`의 `running` 확인 제거)로 각각 실패하는 것을 확인했다
- [X] T045 (Important 3) 「홈의 미리 준비가 모델을 하나 더 연다」는 서술을 고친다 — `App.tsx`는 `prepare`·`release`·`captionDay`를 홈에 넘기지 않는다. `AGENTS.md` 「080」, spec(US1의 Why·Clarifications), 설계 문서, 계약 H8a. 확인 자체는 방어로 남기고, 테스트되지 않던 사진 없는 날의 `prepare` 확인에 테스트를 더한다(변이로 실패 확인)
- [X] T046 (Minor 4) 남의 쓰기가 사는 동안 온 060 쓰기 요청은 시작하지 않고 비운다(`DiaryHomeScreen.tsx` — 064 소스 계약이 잠근 기존 확인 줄은 그대로 두고 그 뒤에 더했다). 테스트 먼저(실패 확인)
- [X] T047 (Minor 9) `AGENTS.md` 디렉터리 표의 `schedule/ … 잠금`을 지운다. 로드맵 5번의 「진행 중」은 완료 처리(kickoff 8단계)에서 이력으로 옮긴다

**반영하지 않은 것**

- Minor 5(자기 시도가 칸 없이 `running`인 좁은 창에서 `listStale`을 놓칠 수 있다): 그 창에서 홈은 덮여 있을 수 없어(「쓰기」를 눌렀다) 곧바로 합류하고, 합류의 끝 처리가 목록을 다시 읽는다 — 실제로 닿는 길을 찾지 못했다.
- Minor 6(끊기가 저장 직전 확인 뒤에 와 성공으로 끝난 쓰기의 완성 알림이 지우기 뒤에 남는다): 몇 밀리초의 창이고, 071이 「저장이 시작된 뒤의 그만두기는 일기를 남긴다」로 받아들인 것의 연장이다.
- Minor 7(`load` 단계의 갈래가 정해지기 전에 합류하면 다음 신호까지 혼잣말 줄이 비어 있다): 홈이 시작한 쓰기도 그 구간에는 줄을 바꾸지 않는다 — 꾸밈.
- Minor 8(「11분」 테스트는 실패할 수 없다 — 등록부가 시계를 읽지 않는다): 사실이다. 방어는 R9 소스 계약이고 그 테스트는 뜻을 적는 자리로 둔다(주석을 더했다).
- Minor 9의 `settings.wipeBlocked` 문구(「지금 자동으로 쓰는 중이라 지우지 못했어요.」): `busy`는 이제 다른 지우기가 돌거나 끊은 틈에 다른 쓰기가 섰을 때만 난다. 화면 문구라 소유자 결정으로 남긴다.

