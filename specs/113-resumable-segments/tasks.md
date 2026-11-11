# Tasks: 받다가 끊기거나 죽어도 끝난 구간은 다시 받지 않는다

**Input**: `specs/113-resumable-segments/` (spec·plan·research·data-model·contracts·quickstart)
**Tests**: 헌법 「개발 방식」에 따라 테스트를 먼저 쓴다(TDD). 모든 테스트는 `__tests__/models/`, 기기 불필요.

## Phase 1: Setup

- [x] T001 baseline 확인 — `npx jest __tests__/models --selectProjects logic`가 지금 통과하는지 확인하고 숫자를 적어 둔다(`specs/113-resumable-segments/tasks.md` 맨 아래 메모)

## Phase 2: Foundational (모든 스토리가 기댄다)

- [x] T002 [P] 테스트 먼저: `__tests__/models/segmented-plan.test.ts`를 새 형식으로 고친다 — `SEGMENT_COUNT === 16`, `SEGMENT_CONCURRENCY === 4`, `remainingSegments`가 `doneIndices`로 끝난 구간을 제외하고 남은 구간의 start는 구간 시작 그대로(밀지 않는다), `isComplete(done, plan)`, `remainingSegmentBytes`가 끝난 구간 크기를 뺀다, `mergeProgress`가 끝난 구간 바이트를 합산(`doneBytes`)
- [x] T003 [P] 테스트 먼저: `__tests__/models/storage.test.ts`에 추가 — `readState`가 `doneIndices` 형식만 남기고 옛 `receivedBytes` 형식·범위 밖 번호·중복·내림차순이 아닌 항목을 버린다(data-model: "오름차순, 중복 없음, 각 0 ≤ i < segmentCount", `totalBytes`·`segmentCount`는 양의 정수 — 형태 검사만, 계획 일치는 보지 않는다), `mutateState`가 동시에 호출돼도 서로 덮어쓰지 않고(구간 둘 동시 추가 → 둘 다 남음) 앞 호출이 던져도 사슬이 이어진다
- [x] T004 [P] 테스트 먼저: `__tests__/models/resume.test.ts`(신규) — `isResumeConsistent(resume, file, expectedBytes)`: 파일 없음 → false, 크기 < 가장 뒤 끝난 구간 end+1 → false, 크기 > totalBytes → false, 기준 크기가 있는데 totalBytes와 다름 → false, segmentCount 불일치 → false, 정상 → true, 모든 구간 끝남 + 크기=total → true
- [x] T005 `src/models/segmented/types.ts`의 `SegmentedResume`을 `{ assetKey, totalBytes, segmentCount, doneIndices: number[] }`로 바꾸고(주석에 data-model 규칙 인용), `src/models/segmented/plan.ts`에 `SEGMENT_COUNT = 16`·`SEGMENT_CONCURRENCY = 4`(사람이 정한 값이라는 주석, 원칙 V)와 `doneIndices` 기반 `remainingSegments`·`isComplete`·완료 구간 바이트 합산 도우미·`remainingSegmentBytes`(끝난 구간 크기를 뺀 남은 양)를 구현해 T002를 통과시킨다
- [x] T006 `src/models/storage.ts`에 `mutateState(metadata, fn)`(MetadataPort별 프로미스 사슬)과 `readState`의 `segmented` 항목 검증·버리기를 구현해 T003을 통과시킨다. `withSegmentedResume` 등은 새 타입을 쓴다
- [x] T007 `src/models/resume.ts`(신규, 순수)에 `isResumeConsistent`를 구현해 T004를 통과시킨다(규칙은 plan.md 결정 4)
- [x] T008 `src/models/port.ts`의 `DownloadPort.start/resume`에 선택 인자 `checkpoint?: SegmentCheckpoint`를 더하고 계약(`contracts/checkpoint.md`)을 주석으로 옮긴다. `src/models/readiness.ts`가 새 타입으로 컴파일되게 맞춘다

**Checkpoint**: T002~T004 통과. (`expo-port.ts`·`acquisition.ts`·`transfer.ts`의 타입 오류는 T011~T013에서 풀린다 — `tsc` 0은 Phase 3 끝의 조건이다.)

## Phase 3: User Story 1 — 앱이 죽어도 끝난 구간은 다시 받지 않는다 (P1) 🎯 MVP

**Independent Test**: 구간 일부가 끝났다는 기록과 맞는 파일을 두고 받기를 시작하면 끝난 구간 요청 없이 남은 구간만 요청된다.

- [x] T009 [P] [US1] 테스트 먼저: `__tests__/models/segmented-transfer.test.ts` — ① 동시에 받는 구간이 4를 넘지 않는다(대역이 동시 실행 수를 센다) ② 구간이 끝날 때마다 `onCheckpoint`가 누적 `doneIndices`(오름차순)로 순서대로 불린다 ③ `resume.doneIndices`가 있으면 그 구간은 요청되지 않고 진행률 합산에 이미 받은 것으로 들어간다 ④ 모든 구간이 끝났다는 기록이면 요청 없이 `completed` ⑤ `onCheckpoint`가 던져도 받기가 끝까지 간다 ⑥ 파일이 작거나(구간 1) 서버가 구간 요청을 지원하지 않으면 폴백이고 `onCheckpoint`를 부르지 않는다 ⑦ `checkSegmentedFile`(속도 어휘 금지·`Character` import 금지)이 새 코드에서도 빈 결과
- [x] T010 [P] [US1] 테스트 먼저: `__tests__/models/acquisition.test.ts`·`concurrent-acquisition.test.ts` — 구간 체크포인트가 불리면 `state.json`(`readState`)에 `doneIndices`가 즉시 남고, 정합한 기록이 있으면 `download.resume`이 그 기록으로 불리며, 모든 구간이 끝난 기록이면 곧바로 검증으로 간다, 받기가 성공하면 `segmented` 기록이 지워진다(FR-008), 정합한 기록이 있으면 공간 판정이 남은 양만 요구하고(FR-011: 남은 공간이 전체 × 1.15보다 작고 남은 양 × 1.15보다 크면 거부되지 않음) 기록이 없으면 전체를 요구한다
- [x] T011 [US1] `src/models/segmented/transfer.ts`를 구현한다 — 동시 `SEGMENT_CONCURRENCY` 풀(남은 구간 큐, 실패·멈춤이면 새 구간을 꺼내지 않고 진행 중 구간 취소), 구간 완료마다 `await onCheckpoint`(예외는 삼킴), 재개 때 진행 합산에 끝난 구간 채움. T009 통과
- [x] T012 [US1] `src/models/expo-port.ts` — `segmentedOrFallback`이 `checkpoint`를 `runSegmented`의 `onCheckpoint`로 전달, `isSegmentedResume`을 `doneIndices` 형식으로, `MAX_TRACKED_SEGMENTS = 32`, `start/resume` 시그니처 갱신. `__tests__/models/boundaries.test.ts`·소스 계약 테스트가 통과하는지 확인
- [x] T013 [US1] `src/models/acquisition.ts` — `prepare`가 `checkpoint`를 `mutateState(…withSegmentedResume)`로 연결, 멈춤(4-a)의 기록 형식을 새 형식으로, 최종 상태 쓰기(5)를 `mutateState`로. `src/models/verification.ts`와 `src/vision/acquisition.ts`의 state 쓰기도 `mutateState`로(같은 `state.json`을 쓰는 자리 전부 — `grep writeState src`로 빠진 곳이 없는지 확인). T010 통과(공간 판정은 `remainingSegmentBytes`(plan.ts 순수 함수, 끝난 구간 크기 합 제외)로 계산)

**Checkpoint**: US1 단독으로 테스트 통과(앱이 죽은 뒤의 이어받기 흐름이 대역 수준에서 성립). `npx tsc --noEmit` 0, `npx jest __tests__/models --selectProjects logic` 통과.

## Phase 4: User Story 2 — 네트워크가 끊겨도 끝난 구간은 남는다 (P1)

**Independent Test**: 구간 하나가 실패하는 대역으로 돌리면 실패 전에 끝난 구간이 기록에 남고 다음 받기가 건너뛴다.

- [x] T014 [P] [US2] 테스트 먼저: `segmented-transfer.test.ts` — 구간 하나가 실패하면 나머지 진행 중 구간을 취소하고 `failed`, 새 구간을 더 꺼내지 않고, 이미 끝난 구간은 `onCheckpoint`로 나갔다. 멈춤 신호면 `paused`이고 `resume.doneIndices`에 받던 구간이 없다(FR-004)
- [x] T015 [P] [US2] 테스트 먼저: `acquisition.test.ts` — 실패한 받기 뒤 `state.json`에 기록이 남고, 다시 `prepare`하면 `download.resume`에 그 기록이 간다. 실패해도 `segmented` 기록이 지워지지 않는다
- [x] T016 [US2] T011·T013의 실패·멈춤 경로가 T014·T015를 통과하는지 확인하고 모자라면 `transfer.ts`·`acquisition.ts`를 고친다

## Phase 5: User Story 3 — 어긋난 기록은 믿지 않는다 (P1)

**Independent Test**: 기록은 있고 최종 파일이 없는 상태로 받기를 시작하면 기록이 버려지고 처음부터 받는다.

- [x] T017 [P] [US3] 테스트 먼저: `acquisition.test.ts` — 기록은 있고 파일 없음/크기 부족/기록 totalBytes가 기준 크기와 다름/옛 형식 기록이면 기록과 부분 파일을 지우고 `download.start`(처음부터)가 불린다(FR-006). 이어 받아 끝난 파일의 지문이 기준과 다르면 지금처럼 `verification-failed`다(FR-007)
- [x] T018 [US3] `src/models/acquisition.ts` — `settleExistingFile` 뒤 `isResumeConsistent`로 기록을 검증하고 어긋나면 `mutateState(withoutSegmented)` + `files.remove`로 지운 뒤 처음부터. T017 통과
- [x] T019 [P] [US3] 테스트: `readiness.test.ts`·`download-view.test.ts`·`essential-assets.test.ts`가 새 `SegmentedResume` 형식으로 통과하게 고친다. 지우기(FR-010)가 기록과 구간 임시 파일(`.seg0`~`.seg15`)을 함께 지우는지, `MAX_TRACKED_SEGMENTS`(32) ≥ `SEGMENT_COUNT`(16)인지를 `expo-port.ts` 소스 계약 테스트(`leftoverNamesFor`·주석 걷은 소스 읽기)로 잠근다

## Phase 6: Polish & 확인

- [x] T020 `npm test`와 `npm run lint`(eslint·tsc·헌법 검사·prettier)를 실행해 통과를 확인한다
- [x] T021 위반 주입 — (a) `mutateState`를 `readState`+`writeState`로 되돌리면 T003의 동시성 테스트가 실패하는지, (b) `isResumeConsistent`의 크기 조건을 빼면 T004·T017이 실패하는지, (c) 풀 크기를 8로 바꾸면 T009①이 실패하는지 본다. 치환이 적용됐는지 먼저 단언하고 확인 뒤 되돌린다
- [x] T022 독립 코드 리뷰(`requesting-code-review`) — Critical·Important 수정, 테스트·린트 재확인
- [x] T023 iPhone 실기기 확인(`quickstart.md`): 개발 빌드에서 받는 도중 앱을 죽이고 다시 열어 끝난 구간을 건너뛰는지, 지문 검증이 통과하는지(비행기 모드는 가능한 만큼). 처음부터 받는 데 걸린 대략의 시간을 개발용으로 적어 둔다(SC-005 — 제품 코드에는 재지 않는다, 원칙 IV). 결과와 못 본 것을 `specs/113-resumable-segments/quickstart.md` 아래 「실측」에 적는다
- [x] T024 `docs/roadmap/README.md`에서 이 과제를 「진행 예정 과제」에서 빼고 「완료 이력」에 113으로 옮긴다. `AGENTS.md`의 「첫 실행」 줄 중 「받는 도중에 끊기거나 죽으면 아직 처음부터다」를 사실대로 고친다(앞 서술을 덧대지 않고 고친다)

## Dependencies

- Phase 2(T002~T008) → Phase 3(US1) → Phase 4(US2)·Phase 5(US3, 서로 독립이나 같은 파일을 만져 순서대로) → Phase 6.
- T002·T003·T004는 서로 다른 파일이라 병렬. T009·T010·T014·T015·T017·T019 테스트도 파일이 다르면 병렬.
- T011(transfer) → T012(expo-port) → T013(acquisition) 순서.

## MVP

US1(T001~T013)이 이어받기의 본체다. US2·US3은 같은 코어 위의 실패·어긋남 경로 보강이다.

## 메모

- T001 baseline(2026-11-11, 구현 전): `__tests__/models` 187 passed · 4 skipped. 구현 뒤: 232 passed · 4 skipped, 전체 `npm test` 8367 passed, `npm run lint` 통과.
- T021 위반 주입 결과: (a) `mutateState`의 줄 세우기를 빼면 storage 동시성 테스트 실패 (b) 크기 하한 조건을 빼면 resume·acquisition 테스트 실패 (c) 동시 수를 8로 바꾸면 plan 리터럴·transfer 동시성 테스트 실패 — 모두 되돌렸다.

## Phase 7: Convergence

- [x] T025 `src/app/essential-assets-port.ts`의 `readQuietKind`가 `readinessOf`에 `segmentedResume: segmentedFor(state, asset.key)`를 넘겨, 받다 만 필수 모듈이 이어받을 수 있는 「받다 말았음」으로 읽히게 하고 `__tests__/app/essential-assets-port.test.ts`에 테스트(재개 기록이 있으면 `partial`, 없으면 기존 갈래)를 더한다 per US1/AC1 (partial)
