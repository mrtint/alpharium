# Tasks: 상태 흉내 — 개발 환경에서 홈의 상태를 데이터 없이 띄워 본다

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/simulation.md](contracts/simulation.md), [quickstart.md](quickstart.md)

**Tests**: 이 저장소는 「계약을 먼저 정하고 테스트를 먼저 쓴다」(헌법 「개발 방식」) — 각 단계의 테스트 태스크를 구현 태스크보다 먼저 하고 실패를 확인한다. 테스트 ID는 contracts의 계약 ID다.

## Phase 1: Setup

- [x] T001 [P] 카탈로그 새 영역 `simulation`을 `src/i18n/catalogs/ko/`에 더하고(`groupSim` 「상태 흉내」·`date` 「오늘 날짜」·`fail` 「실패 토스트 보기」·`empty` 「쓸 재료 0으로 보기」·`noPhoto` 「사진 권한 없음으로 보기」·`blockedToast` 「상태 흉내가 켜져 있어서 일기를 쓰지 않아요. 개발자 화면에서 끌 수 있어요.」·`badge` 「DEV」·`dateOff` 「끄기」·`dateCancel` 「취소」·`badgeLabel` 「개발자」) `src/i18n/catalogs/ko/index.ts`에 등록한다. 「개발 빌드만」은 새로 만들지 않고 기존 `developer.devOnly`를 쓴다(FR-017). 062 골든(G1·G2)이 새 영역을 받아들이는지 `__tests__/i18n/ko-golden.test.ts`를 돌려 확인한다(R11)
- [x] T002 [P] `src/ui/theme/tokens.ts`에 `SIMULATION = { barFill: "#d7d3d3", barText: "#444141", badgeBorder: COLORS.text }`를 더하고 `__tests__/theme-tokens.test.ts`에 barText/barFill 대비 ≥ 4.5:1을 잠근다(R7 — 보드 neutral-700 `#605d5d`는 4.39:1, neutral-800 `#444141`은 6.81:1)

## Phase 2: Foundational (모든 이야기의 전제)

- [x] T003 [P] `__tests__/app/simulation.test.ts`에 SM1~SM6를 쓴다(실패 확인). SM1은 data-model §1 규칙 「토글은 `=== true`만 켬, `date`는 `YYYY-MM-DD` 형식이고 실제 달력 날일 때만」, SM6은 「시각·횟수 필드가 없다」를 그대로 단언한다
- [x] T004 [P] `__tests__/app/simulation-store.test.ts`에 SS1~SS3를 쓴다(실패 확인)
- [x] T005 `src/app/simulation.ts`를 만든다 — `SimulationState`·`OFF`·`parseSimulation`·`serializeSimulation`·`effectiveSimulation`·`simulationBlocksWriting`·`simulatedNow`(`day-boundary.ts`의 `dayBounds`로 계산, `getHours() ±` 금지 — DB11)·`simulatedPreviewDay`(권한 없음이 재료 0을 이긴다). `diary/pipeline`·`schedule/`·`signals/`를 import하지 않는다(T003 통과)
- [x] T006 `src/app/simulation-store.ts`를 만든다 — `SimulationStorePort`·`loadSimulation`(던지지 않음, 실패는 `OFF`)·`saveSimulation`(`OFF`면 지움)·`clearSimulation`·`expoSimulationStorePort`(`preferences/simulation.json`, 059 `developer-menu-store.ts`와 같은 임시 파일 → 옮김)(T004 통과)
- [x] T007 `src/ui/use-simulation.ts`를 만든다 — `useSimulation({ devEnvironment, port })`: 개발 환경에서만 마운트 때 한 번 읽고, `set(next)`는 상태를 즉시 바꾸고 저장(실패는 삼킴), `clear()`. 배포 환경은 늘 `OFF`이고 읽지도 쓰지도 않는다(AF5). `__tests__/ui/use-simulation.test.tsx`로 잠근다(테스트 먼저)
- [x] T008 `scripts/constitution-rules.ts`에 `SIMULATION_LEAKS`(LK1~LK3)를 더하고 `scripts/check-constitution.mts`가 훑게 한다. `__tests__/scripts/check-constitution.test.ts`(기존 규칙 테스트 파일)에 LK1~LK3 위반·통과 사례를 더한다(테스트 먼저). 위반 주입 셋을 실제 파일에 넣어 `npm run lint`가 잡는지 확인하고 되돌린다

**Checkpoint**: 순수 판정·저장·경계 검사가 기기 없이 초록

## Phase 3: User Story 1 — 홈의 여러 상태를 띄워 본다 (P1) 🎯 MVP

**Goal**: 개발자 화면의 네 흉내가 홈 표시를 바꾼다. **Independent Test**: 「쓸 재료 0으로 보기」를 켜고 안 쓴 날이 0 장·0 곳으로 보인다.

- [x] T009 [P] [US1] `__tests__/ui/developer-screen.test.tsx`에 DV1·DV2를 더한다(보드 원문 글자, 개발 환경만, `sim-date` 값 형식)(실패 확인)
- [x] T010 [P] [US1] `__tests__/ui/simulation-date-dialog.test.tsx`에 DV3를 쓴다(날 누름 → 적용·닫힘, 「끄기」는 켜졌을 때만, 미래 날 고를 수 있음)(실패 확인)
- [x] T011 [P] [US1] `__tests__/ui/home-simulation.test.tsx`에 HM5·HM6·HM7을 쓴다(실패 토스트가 마운트·`covered` 참→거짓 때 한 번, 주입 `now`가 흉내 날이면 큰 숫자·오늘 칸·「N시간 M분 전에 작성」, 쓴 날 지면은 미리보기 흉내와 무관하게 제목·본문 그대로)(실패 확인)
- [x] T012 [US1] `src/ui/DeveloperScreen.tsx`에 「상태 흉내」 묶음을 더한다 — props `simulation?: { state, onPressDate, onToggle(key) }`(개발 환경일 때만 조립부가 넘긴다), 진단 묶음 다음·「다시 보기」 앞(보드 `6e` 순서), 머리 오른쪽 「개발 빌드만」, 날짜 행 값(`YYYY-MM-DD` 또는 빈 값) + ›, 토글 셋은 설정의 `Toggle`(056)을 쓴다. testID `developer-group-sim`·`sim-date`·`sim-fail`·`sim-empty`·`sim-nophoto`(T009 통과)
- [x] T013 [US1] `src/ui/SimulationDateDialog.tsx`를 만든다 — `DismissibleDialog` + `react-native-ui-datepicker` 격자(최소·최대 없음), 날 누름 = 적용·닫힘, 「끄기」(켜졌을 때만)·「취소」, dayjs 변환은 `app/calendar.ts`의 `dayDateFromPicker()`만(T010 통과)
- [x] T014 [US1] `src/ui/DiaryHomeScreen.tsx`에 `simulatedFailToast?: boolean`을 더한다 — 마운트·`covered` 참→거짓 때 `setToast({ kind: "plain" })`(effect 본문 `setState`는 `Promise.resolve().then`으로, React Compiler)(T011 HM5 통과)
- [x] T015 [US1] `App.tsx` 조립 — `AppFrame`이 `useSimulation`(+`expoSimulationStorePort`를 `useMemo`)을 들고: (a) `homeNow = useCallback(() => simulatedNow(sim.date, new Date()), [sim.date])`를 `DiarySection` → `DiaryHomeScreen` `now`로, (b) 날짜 흉내를 바꾸면 `setChosenDay(date ?? dayOf(new Date()))`(AF1), (c) `DiarySection`이 `previewDay={simulatedPreviewDay(sim) ?? wiring.previewDay}`로 **홈에만** 넘기고 `resolveAutoWrite`는 `wiring.previewDay` 그대로(AF4), (d) `simulatedFailToast`, (e) 개발자 화면에 `simulation` props와 `SimulationDateDialog`. `__tests__/app/simulation-wiring.test.ts`(소스 계약)로 AF1·AF4를 잠근다(테스트 먼저)

**Checkpoint**: 네 흉내가 홈 표시를 바꾼다(쓰기 차단은 아직)

## Phase 4: User Story 2 — 흉내가 켜진 동안 일기가 써지지 않는다 (P1)

**Goal**: 다섯 쓰기 진입점이 막히고 홈이 알린다. **Independent Test**: 흉내 하나를 켠 채 쓰기 바를 눌러 토스트만 뜨고 일기 파일이 생기지 않는다.

- [x] T016 [P] [US2] `__tests__/ui/home-simulation.test.tsx`에 HM1~HM4·HM8을 더한다(안 쓴 날·쓴 날 각각 `pipeline.run`·`resolve` 미호출·확인 대화상자 없음, `autoWriteDay`·`writeRequest` 무시, DEV 꼬리표 누름 → `onOpenDeveloper`, `write-button` 면 색과 `write-button-dev`, HM8 쓰는 중에 `writeBlocked`가 참이 되어도 그 쓰기는 끝까지 가서 저장된다)(실패 확인)
- [x] T017 [P] [US2] `__tests__/schedule/task-simulation.test.ts`에 BG1~BG3를 쓴다(`deps.simulationPort`·`deps.resolution` 주입, `makePipeline` 미호출, 알림·실패 기록 없음)(실패 확인)
- [x] T018 [P] [US2] `__tests__/ui/diagnostics-screen.test.tsx`에 DG1을 더한다(실패 확인)
- [x] T019 [P] [US2] `__tests__/app/simulation-wiring.test.ts`에 AF3과 「다섯 진입점이 차단을 본다」 소스 계약을 더한다(`write()` 맨 앞·057 effect·060 effect·`claimAutoWrite`·`task.ts`)(실패 확인)
- [x] T020 [US2] `src/ui/DiaryHomeScreen.tsx` — `writeBlocked?`·`onWriteBlocked?` props: `write()` 맨 앞에서 막혀 있으면 `onWriteBlocked()`만, 057 effect는 시작 안 함, 060 effect는 요청만 비움(HM1·HM2)
- [x] T021 [P] [US2] `src/ui/DiaryListScreen.tsx` — `simulation?: { onOpenDeveloper }` prop: 월 라벨 옆 DEV 꼬리표(`home-dev-badge`, 1px 글자색 테두리, 고정폭 10/700, 접근성 라벨 「개발자」), `WriteBar`·`RewriteBar` 면 `SIMULATION.barFill`·글자 `SIMULATION.barText` + DEV 꼬리표(`write-button-dev`). testID `write-button` 그대로(HM3·HM4)
- [x] T022 [P] [US2] `src/schedule/task.ts` — `resolution` 판정 직후·파이프라인 생성 전, `simulationBlocksWriting(effectiveSimulation(await loadSimulation(deps.simulationPort ?? expoSimulationStorePort()), showsOnScreen(resolution)))`이면 `"skipped"`(BG1~BG3). `simulatedNow`·`simulatedPreviewDay`를 쓰지 않는다(LK3)
- [x] T023 [P] [US2] `src/ui/DiagnosticsScreen.tsx` — `writeBlocked?: boolean`: 참이면 두 쓰기 행에 `onPress`를 넘기지 않고 `hint`로 차단 문구(DG1)
- [x] T024 [US2] `App.tsx` — `blocked = simulationBlocksWriting(sim)`: 홈에 `writeBlocked`·`onWriteBlocked`(059 `toastLine.show(차단 문구)`)·`simulation={blocked ? { onOpenDeveloper } : undefined}`(설정 + 개발자 겹 열기), `claimAutoWrite`는 막혀 있으면 한 번을 소모하고 거짓(AF3), `DiagnosticsLayer`에 `writeBlocked`(T016~T019 통과)

**Checkpoint**: 흉내 중 다섯 진입점이 모두 쓰지 않는다

## Phase 5: User Story 3 — 개발 환경에만, 끄면 남지 않는다 (P2)

**Goal**: 배포 환경에는 흉내가 없고 개발자 메뉴 끄기가 흉내를 지운다. **Independent Test**: 흉내를 켠 뒤 메뉴를 끄고 다시 열어 DEV가 없다.

- [x] T025 [P] [US3] `__tests__/app/simulation-wiring.test.ts`에 AF2·AF5를 더한다(메뉴 끄기 → `clear()`, 배포 환경은 `useSimulation`이 읽지 않음·개발자 화면에 `simulation` 미전달)(실패 확인)
- [x] T026 [US3] `App.tsx` — `onDisableDeveloper`에서 `simulation.clear()`, 개발자 화면의 `simulation` props와 날짜 대화상자는 `showsDiagnostics`일 때만(S7)(T025 통과)

## Phase 6: Polish & Cross-Cutting

- [x] T027 [P] `.maestro/state-simulation.yml`을 쓰고 `scripts/run-device-tests.mjs`의 `FLOWS`에 등록한다(R12 — 흉내를 끈 채로 끝낸다)
- [X] T028 [P] AGENTS.md 「저장소의 현재 상태」의 「상태 흉내는 아직이다」를 고치고 「기능별 핵심 결론」에 064 항목을 더한다(실기기 결과 포함)
- [X] T029 `npm test`·`npm run lint`를 실제로 돌려 통과를 확인한다
- [X] T030 quickstart.md 「실기기」 1~10을 dev 빌드로 확인하고 결과를 quickstart.md 끝에 적는다(일기 폴더 백업·md5 대조)

## Dependencies & Execution Order

- Phase 1·2 → US1 → US2 → US3 → Polish. US2는 US1의 조립(`useSimulation`·`DeveloperScreen` 묶음)에 기댄다 — 흉내를 켤 길이 있어야 차단을 확인할 수 있다. US3는 US1의 조립에 기댄다.
- 같은 파일(`App.tsx`·`DiaryHomeScreen.tsx`)을 고치는 T014·T015·T020·T024·T026은 순서대로 한다.

## Parallel Example

- Phase 2: T003·T004 동시, T005·T006 동시(서로 다른 파일).
- US1: T009·T010·T011 동시(테스트 셋).
- US2: T016·T017·T018·T019 동시(테스트 넷), 구현 T021·T022·T023 동시.

## Implementation Strategy

MVP는 Phase 1~3(US1) — 흉내가 홈을 바꾸는 것까지. 단 **US2(쓰기 차단) 없이 머지하지 않는다**(원칙 I) — 실제 완료 조건은 US1+US2+US3이다.
