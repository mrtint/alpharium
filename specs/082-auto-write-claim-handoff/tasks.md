# Tasks: 앱 열기 자동 쓰기의 「한 번」과 넘겨 둔 날 바로잡기

**Input**: `/specs/082-auto-write-claim-handoff/` — [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/auto-write-open.md](./contracts/auto-write-open.md), [quickstart.md](./quickstart.md)

**Tests**: 필수다(헌법 「개발 방식」 — 계약을 먼저 쓰고 테스트를 먼저 쓴다). 각 구현 태스크 앞에 실패하는 테스트가 있다.

**Organization**: 스펙의 User Story 순. jest는 `npx jest <경로> --selectProjects logic|ui` 순서로 부른다. RNTL 14의 `render`·`renderHook`·`rerender`·`fireEvent`는 Promise다 — `await`한다.

## Phase 1: Setup

- [ ] T001 `git branch --show-current`가 `082-auto-write-claim-handoff`인지 확인하고, `npm test`를 한 번 돌려 시작점이 초록인지 기록한다(실패가 있으면 이 기능의 것이 아님을 적어 둔다)
- [ ] T002 기존 계약을 읽고 `specs/082-auto-write-claim-handoff/research.md`에 「R8 — 기존 계약이 잠그는 자리」 표를 덧붙인다: `__tests__/app/app-auto-write-source.test.ts`·`__tests__/app/simulation-wiring.test.ts`·`__tests__/app/auto-write-attempts-wiring.test.ts`·`__tests__/ui/home-auto-write.test.tsx`·`__tests__/ui/home-simulation.test.tsx`·`__tests__/ui/home-join.test.tsx`·`__tests__/ui/home-wipe.test.tsx`와, `App.tsx`를 읽는 다른 테스트 중 `autoWriteDay`·`autoWriteClaimed`·`claimAutoWrite`·`resolveAutoWrite`·`recordAttemptEnd`·`previewForAuto`를 단언하는 것(`grep -rln` 으로 찾는다). 줄마다 「파일 · 단언 · 옮긴 뒤 읽을 파일」. 같은 자리에서 `settingsValues.autoDiary`의 참조가 언제 새 객체가 되는지 `App.tsx`에서 읽어 research R3의 「확인할 것」에 답을 적는다

## Phase 2: Foundational — 동작을 그대로 둔 채 두 훅으로 옮긴다

**목적**: 조립 테스트가 설 자리를 만든다. 이 Phase가 끝난 시점의 동작은 `main`과 같다(두 결함이 그대로 있다).

### Tests (먼저)

- [ ] T003 [P] 새 파일 `__tests__/app/use-auto-write-claim.test.tsx` — 계약 CL1~CL4·CL6·CL7: 흉내 기록을 읽기 전에는 거짓이고 소모하지 않는다(읽은 뒤 `rerender`하면 참) · `firstRunTried.current`가 참이면 거짓 · 두 번째 호출은 거짓 · `writeBlocked`면 소모하고 거짓, 그 뒤 `writeBlocked`를 풀어도 거짓 · `writeBlocked`가 참이 되는 것만으로 소모된다(호출 없이) · 훅이 돌려주는 객체의 키에 되살리는 함수가 없다 · CL7은 소스 계약(주석 걷은 뒤 `firstRunTried.current`를 읽는 자리가 `useCallback` 본문 안뿐). 실행해 모듈이 없어 **실패하는 것을 본다**
- [ ] T004 [P] 새 파일 `__tests__/app/use-auto-write-handoff.test.tsx` — 바뀌지 않는 계약 HO1~HO3·HO6·HO8~HO12: 설정·미리보기 통로·건너뜀 통로 중 하나가 없으면 판정하지 않고 `null` · 판정이 `write`면 그 날을 준다(진짜 `resolveAutoWrite` — 메모리 일기 목록·가짜 미리보기·메모리 건너뜀 통로·주입한 `now`) · `AppState` `active`에 다시 판정한다(`jest.spyOn(AppState, "addEventListener")`로 받은 콜백을 부른다, 복원하지 않는다) · 언마운트 뒤 끝난 판정과 설정이 바뀐 뒤 늦게 끝난 옛 설정의 판정은 반영하지 않는다(HO6 — 옛 동작에서도 통과한다) · 시도 기록 대역이 판정마다 `("app-open", now, 결과)`로 불리고 언마운트 뒤 끝난 판정도 기록한다 · 사진 권한 없음 건너뜀에 `onSkipped(day)` · 판정이 던져도 던지지 않는다 · 판정과 시도 기록의 `now`가 같은 값 · 넘긴 `previewDay`가 그대로 불린다. HO2는 소스 계약(주석 걷은 뒤 `decideSchedule`·`selectableDays`·`decideAutoWrite`가 없고 `resolveAutoWrite(`가 한 번). 실행해 모듈이 없어 **실패하는 것을 본다**

### Implementation

- [ ] T005 `src/app/use-auto-write-claim.ts`를 만든다: `useAutoWriteClaim({ simulationLoaded, writeBlocked, firstRunTried })` → `{ claimAutoWrite }`. `App.tsx` `AppFrame`의 `autoWriteClaimed` ref·064 소모 effect·`claimAutoWrite` 콜백을 **글자 그대로** 옮긴다(머리 주석에 057·064·080과 계약 경로). `spendAutoWrite`는 아직 없다. T003 통과
- [ ] T006 `src/app/use-auto-write-handoff.ts`를 만든다: `useAutoWriteHandoff({ settings, previewDay, skipPort, listDiaryDays, attemptPort?, onSkipped?, now? })` → `DayDate | null`. `App.tsx` `DiarySection`의 판정 effect를 **지금 동작 그대로** 옮긴다(`write`일 때만 세우고 비우지 않는다). `now`만 주입 가능하게 한다(HO11). T004 통과
- [ ] T007 `App.tsx`: `AppFrame`이 `useAutoWriteClaim`을, `DiarySection`이 `useAutoWriteHandoff`를 쓰게 바꾼다. `autoWriteClaimed`·`setAutoWriteDay`·옮겨 간 effect·더는 안 쓰는 import를 지운다. 훅에 넘기는 미리보기는 종전의 `previewForAuto`(실제 `wiring.previewDay`), 목록 통로는 `() => store.listDays()`. `npx tsc --noEmit` 0
- [ ] T008 T002의 표대로 소스 계약을 새 파일로 다시 겨눈다(단언을 줄이지 않는다 — 옮기기 전후 `expect` 수를 센다): `__tests__/app/app-auto-write-source.test.ts` OP1(claim의 정규식은 `src/app/use-auto-write-claim.ts`를, 「판정은 `resolveAutoWrite`로 한다」는 `src/app/use-auto-write-handoff.ts`를 읽고 `App.tsx`에는 `resolveAutoWrite(`가 0번임을 더한다 — WP6) · 「`DiarySection`은 `runAutoDiaryTask`를 부르지 않는다」·OP6은 `App.tsx`와 두 훅 모두에 건다 · `__tests__/app/simulation-wiring.test.ts` AF3(훅 파일)·AF4(`App.tsx`가 훅에 `previewForAuto`를 넘긴다 + 훅 파일에 `simulat`이 없다 — WP5·HO12) · 그 밖에 T002가 찾은 것. WP4(`App.tsx`에 `setAutoWriteDay`·`autoWriteClaimed`가 없고 `autoWriteDay={`에 훅의 값이 간다)를 더한다
- [ ] T009 `npx jest __tests__/app --selectProjects logic`·`npx jest __tests__/app __tests__/ui/home-auto-write.test.tsx __tests__/ui/home-simulation.test.tsx __tests__/ui/home-join.test.tsx __tests__/ui/home-wipe.test.tsx --selectProjects ui` 통과, `npm run lint` 통과(헌법 검사가 새 파일에 예외를 요구하면 그 사실을 plan의 Post-design re-check에 적는다)

**Checkpoint**: 동작은 `main`과 같고, 두 상태가 테스트에서 돌릴 수 있는 자리에 있다.

## Phase 3: User Story 1 — 끈 것은 쓰지 않는다 (P1) 🎯 MVP

**Goal**: 넘겨 둔 날이 지금 설정의 가장 최근 판정을 따른다(FR-001~FR-004; FR-005의 확인은 Phase 5의 AS10).

**Independent Test**: `npx jest __tests__/app/use-auto-write-handoff.test.tsx __tests__/ui/auto-write-open-assembly.test.tsx --selectProjects ui`

### Tests (먼저 — 실패를 본다)

- [ ] T010 [US1] `__tests__/app/use-auto-write-handoff.test.tsx`에 HO4·HO5·HO7을 더한다: `write` 뒤 같은 설정에서 다시 판정해 `idle`(그 날의 일기가 생김)이면 `null` · `write` 뒤 `skip`(재료 없음)이면 `null` · 켜진 설정에서 날이 선 뒤 꺼진 설정 객체로 `rerender`하면 **그 렌더의 결과가 곧바로** `null`(꺼짐 판정이 끝나기 전 — 목록 통로를 손으로 여는 문으로 막아 둔다) · 그 뒤 꺼짐 판정이 끝나도 `null` · 시각을 바꾼 새 설정(차례가 아님)으로 `rerender`하면 `null`(US1-3) · 같은 설정에서 판정 둘을 겹치게 한다(HO7): 첫째는 그 날이 안 쓴 날일 때 시작해 문에 막혀 있고(결과 `write`), 그 사이 그 날의 일기를 넣은 뒤 `AppState` `active`로 둘째를 시작·완료한다(결과 `idle`) → 첫째의 문을 열어도 결과는 `null`이다(옛 동작에서는 첫째가 그 날을 세운다)
- [ ] T011 [US1] 새 파일 `__tests__/ui/auto-write-open-assembly.test.tsx` — 하니스와 AS1·AS2·AS3·AS11: 바깥 컴포넌트가 `useAutoWriteClaim`을, `key`로 다시 마운트되는 안쪽 컴포넌트가 `useAutoWriteHandoff`와 진짜 `DiaryHomeScreen`을 갖는다(`AppFrame`·`DiarySection`의 배치). 파이프라인은 `createPipeline()` + 가짜 백엔드(`generate` 호출을 센다) + `beginWrite`가 `createLiveWrites()`의 칸을 차지한다(`home-join.test.tsx` 「FR-013」의 `shipped()` 꼴). 판정은 진짜 `resolveAutoWrite`(훅 안), 「지금」은 목표 22시·오전으로 주입해 어제가 차례가 지난 날이게 한다. 쓰기가 시작된 횟수는 등록부 `beginWrite`의 호출 횟수(spy)와 백엔드 `generate`의 호출 횟수 둘로 센다(마지막 화면만 보지 않는다 — FR-014). 판정이 끝났음은 시도 기록 대역의 호출로 기다린다(시간을 기다리지 않는다). AS1: 꺼짐 → 켬(홈 `covered`) → 판정 완료 → 끔 → 판정 완료 → `covered` 해제 → `generate` 0회. AS2: 켬 → 판정 완료 → 끔(꺼짐 판정은 문에 막아 둔다) → `covered` 해제 → 0회 → 문을 연다 → 0회. AS3: 켠 채 `covered` 해제 → 그 날 1회. AS11: 켜진 채 마운트(`covered`) → 판정 완료 → 미리보기 대역을 사진 0장으로 바꾸고 `AppState` `active` → 판정 완료(`no-material`) → `covered` 해제 → 0회
- [ ] T012 [US1] T010·T011을 실행해 HO4·HO5·HO7·AS1·AS2·AS11이 **실패하는 것을 본다**(결함 A의 기기 없는 재현 — AS1·AS2·AS11에서 `generate`가 1회 불린다: 옛 동작은 넘겨 둔 날을 비우지 않는다). AS3은 통과한다. 실패 출력을 quickstart 「실측」에 한 줄로 적는다

### Implementation

- [ ] T013 [US1] `src/app/use-auto-write-handoff.ts`를 계약대로 고친다: state를 `{ day: DayDate | null; settings: AutoDiarySettings } | null`로(data-model §1) · 판정이 `write`가 아니면 `day: null`을 반영(HO4) · 돌려줄 때 `handed.settings === settings`일 때만 `handed.day`(HO5 — effect에서 비우지 않는다) · effect 인스턴스 안의 번호로 가장 늦게 시작한 판정만 반영(HO7) · 시도 기록은 번호·`alive`와 무관(HO8) · `onSkipped`는 `alive`일 때(HO9). 머리 주석에 결함 A와 「렌더에서 가르는 까닭」을 적는다
- [ ] T014 [US1] T010·T011 통과, `__tests__/ui/home-join.test.tsx`·`__tests__/ui/home-auto-write.test.tsx` 수정 없이 통과 확인

**Checkpoint**: 켰다 끄면 쓰지 않고, 켠 채 닫으면 쓴다.

## Phase 4: User Story 2 — 지운 직후에 다시 쓰지 않는다 (P1)

**Goal**: 「일기 모두 지우기」가 그 실행의 「한 번」을 소모한다(FR-006~FR-009).

**Independent Test**: `npx jest __tests__/app/use-auto-write-claim.test.tsx __tests__/ui/auto-write-open-assembly.test.tsx --selectProjects ui` + `npx jest __tests__/app/app-auto-write-source.test.ts --selectProjects logic`

### Tests (먼저 — 실패를 본다)

- [ ] T015 [P] [US2] `__tests__/app/use-auto-write-claim.test.tsx`에 CL5: `spendAutoWrite()` 뒤 `claimAutoWrite()`가 거짓 · 흉내 기록을 읽기 전(`simulationLoaded` 거짓)에 불러도 소모되어, 읽은 뒤에도 거짓 · 돌려주는 값이 없다 · 두 번 불러도 같다
- [ ] T016 [P] [US2] `__tests__/app/app-auto-write-source.test.ts`에 WP1~WP3: `App.tsx`의 `requestWipe` 본문(주석 걷은 뒤)에서 `spendAutoWrite()`가 `outcome.kind !== "busy"` 분기 **안**에 있고 `setDiaryKey(`보다 앞이다 · 그 분기 밖에는 없다 · `App.tsx` 전체에서 `spendAutoWrite(` 호출은 한 번이다
- [ ] T017 [US2] `__tests__/ui/auto-write-open-assembly.test.tsx`에 AS4·AS5·AS6·AS8·AS9: 하니스에 「지우기」(`store.removeAll()` → 소모 → 안쪽 `key` 올림 — `requestWipe`의 순서)를 둔다. AS4: 자동 쓰기 켜짐·어제가 써 있는 채 마운트(0회) → 지우기 → 판정 완료(`write`) → `generate` 0회. AS5: 그 뒤 `AppState` `active` → 판정 완료 → 0회. AS6: 소모 뒤 꺼짐 → 켬 → `covered` 해제 → 0회. AS8: AS4 뒤 하니스 전체를 `unmount`하고 새로 `render`(새 「한 번」) → 그 날 1회. AS9: AS4 뒤 홈의 `write-button`을 누른다 → 쓴다
- [ ] T018 [US2] T015~T017을 실행해 **실패하는 것을 본다**: CL5·WP1~WP3은 `spendAutoWrite`가 없어서, AS4·AS5·AS6은 하니스의 소모 자리를 비워 둔 채(소모 없이 key만 올림) 돌려 `generate`가 1회 불리는 것으로(결함 B의 기기 없는 재현). 실패 출력을 quickstart 「실측」에 한 줄로 적는다

### Implementation

- [ ] T019 [US2] `src/app/use-auto-write-claim.ts`에 `spendAutoWrite`를 더한다(CL5 — 조건 없이 소모, 참조가 안정된 콜백). 머리 주석의 「소모하는 자리」 목록에 지우기를 더한다(data-model §2 표)
- [ ] T020 [US2] `App.tsx` `requestWipe`: `outcome.kind !== "busy"` 분기 맨 앞에서 `spendAutoWrite()`를 부른다(`goHome()`·`setChosenDay`·`setDiaryKey`보다 앞). 058 주석의 3번 항목에 한 줄(지운 직후 다시 쓰지 않게 — 082)을 더하고 `useCallback` 의존성을 맞춘다. 하니스의 소모 자리를 채운다
- [ ] T021 [US2] T015~T017 통과, `__tests__/ui/home-wipe.test.tsx` 수정 없이 통과, `npx tsc --noEmit` 0

**Checkpoint**: 지운 직후 쓰지 않고, 새 실행은 종전대로 쓴다.

## Phase 5: User Story 3 — 평소의 앱 열기 자동 쓰기는 그대로다 (P2)

**Goal**: 057·064·040·080의 기존 동작이 그대로이고, 이미 시작한 쓰기는 멈추지 않는다(FR-005·FR-010~FR-012).

**Independent Test**: `npx jest __tests__/ui/auto-write-open-assembly.test.tsx __tests__/ui/home-auto-write.test.tsx __tests__/ui/home-join.test.tsx __tests__/ui/home-simulation.test.tsx --selectProjects ui`

- [ ] T022 [US3] `__tests__/ui/auto-write-open-assembly.test.tsx`에 AS10(FR-005): 켜진 채 마운트해 홈이 쓰기 시작한 뒤(백엔드를 문으로 막는다) 꺼진 설정으로 `rerender` → 등록부의 칸이 그대로이고 끊김이 없다 → 문을 열면 그 날이 저장된다. 그리고 AS7: 자동 쓰기 켜짐·어제 안 쓴 날로 마운트 → 그 날을 1회 쓰고 저장된다 → `AppState` `active` → 판정 완료(`모두 써 있음`) → 2회째가 없다. 그리고 쓰는 도중 「그만두기」를 누른 경우에도 `AppState` `active` 뒤 다시 시작하지 않는다(US3-2)
- [ ] T023 [US3] 계약 X4를 소스 계약으로 잠근다(`__tests__/app/app-auto-write-source.test.ts`): 두 훅 파일(주석 걷은 뒤)이 `src/ui/`·`diary/pipeline`·`inference/`를 import하지 않는다. X3은 T026에서, X1·X2는 `git diff --stat main -- src/schedule src/ui/DiaryHomeScreen.tsx`가 비어 있음을 T029에서 확인한다(테스트로 만들지 않는다 — git 상태에 기대는 테스트를 두지 않는다)
- [ ] T024 [US3] 기존 홈 테스트 넷(`home-auto-write`·`home-join`·`home-simulation`·`home-wipe`)과 `diary-home-write-request.test.tsx`가 **수정 없이** 통과함을 확인한다(`git diff --stat`에 그 파일들이 없다)

## Phase 6: Polish — 방어 확인·실기기·문서

- [ ] T025 위반 주입: `contracts/auto-write-open.md` 끝의 표를 한 줄씩 넣어 「실패해야 하는 것」이 실패하는지 본다. 치환이 실제로 들어갔는지 먼저 확인하고(grep), 되돌린 뒤 원래 문자열을 grep으로 다시 확인한다. 결과(주입 → 실패한 테스트)를 quickstart 「실측」에 표로 적는다
- [ ] T026 `npm test` 전체와 `npm run lint` 통과(가드 표 — `jest-projects`·062 B3·B6·069 G-1 — 가 새 파일을 요구하면 등록한다). 계약 X3(FR-012): 062 골든(`ko-golden.test.ts`)과 069 기준 표(`baseline.test.ts`)가 수정 없이 통과하고 `git diff main -- package.json src/i18n`이 비어 있음을 확인한다
- [ ] T027 dev 실기기(SM-S901N) — `quickstart.md` §2 그대로: 백업(내용을 `tar -tvf`로 확인) → 어제에 사진 심기 → D1(켰다 끄면 쓰지 않는다) → D2(켠 채 닫으면 쓴다) → D3(지운 직후 쓰지 않는다 · 내렸다 올려도 · 새로 열면 쓴다) → D4(회귀) → 되돌리기(md5 대조)·심은 사진 걷기. 본 것(시도 기록·`files/diary/`·`stop-button`)을 quickstart 「실측」에 적는다. 임시 로그를 넣었으면 걷는다
- [ ] T028 `AGENTS.md`: 「### 082」 절을 더한다(두 규칙·훅 둘·「한 번」을 소모하는 자리 넷·실기기 재현과 확인·남은 한계: 백그라운드가 지운 날을 다시 쓸 수 있다, 지운 실행에서는 이어 쓰지 않는다, iOS 미확인). 뒤집힌 서술을 고친다 — 078 「남은 위험」의 「`autoWriteDay`는 한 번 서면 비워지지 않는다 — 켰다 끄고 닫아도 쓴다」와 080 「곁에서 본 것」의 「지운 직후 어제를 다시 쓰기 시작할 것이다」를 지금 결론으로 바꾸고, 057 절의 claim 서술(「`AppFrame`의 ref」)과 「저장소의 현재 상태」에 필요한 만큼 반영한다. 「코드를 어디에 두는가」는 바꿀 것이 없으면 두지 않는다
- [ ] T029 마무리 확인: `git diff --stat main -- src/schedule src/ui/DiaryHomeScreen.tsx`가 비어 있다(X1·X2) · `git status`에 임시 파일·Maestro 흐름 초안이 없다 · `git diff main -- src App.tsx`에 `console.`·임시 로그·재는 코드가 더해지지 않았다(FR-015) · spec의 SC-001~SC-005를 실측과 한 줄씩 대조해 quickstart 「실측」 끝에 적는다(iOS·release는 미확인으로)

## Dependencies

- Phase 1 → Phase 2 → (Phase 3, Phase 4) → Phase 5 → Phase 6.
- Phase 3과 Phase 4는 서로 다른 훅을 고치지만 조립 테스트 파일(`auto-write-open-assembly.test.tsx`)을 함께 쓴다 — T011이 하니스를 만들고 T017이 거기에 더한다. 순서대로 한다.
- T003·T004는 서로 다른 파일이라 함께 쓸 수 있다. T015·T016도 그렇다.

## Implementation Strategy

- **MVP**: Phase 1~3(US1) — 켰다 끈 것을 쓰지 않는다. 이것만으로도 따로 내보낼 수 있다.
- US2는 한 줄의 소모와 그 순서가 전부다 — 방어는 조립 테스트(AS4)와 소스 계약(WP1)의 두 겹이다.
- 로드맵의 완료 처리(두 항목을 닫고 이력에 082)는 구현 커밋과 분리한 마지막 커밋이다(kickoff).
