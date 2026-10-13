# Tasks: 쓰기 실패 기록의 갈래 나누기와 개발자 화면의 「최근 실패」

**Input**: `/specs/081-write-failure-reasons/` — [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/write-failure-reasons.md](./contracts/write-failure-reasons.md), [quickstart.md](./quickstart.md)

**Tests**: 필수다(헌법 「개발 방식」 — 계약을 먼저 쓰고 테스트를 먼저 쓴다). 각 구현 태스크 앞에 실패하는 테스트가 있다.

**Organization**: 스펙의 User Story 순. jest는 `npx jest <경로> --selectProjects logic|ui` 순서로 부른다.

## Phase 1: Setup

- [ ] T001 `git branch --show-current`가 `081-write-failure-reasons`인지 확인하고, `npm test`를 한 번 돌려 시작점이 초록인지 기록한다(실패가 있으면 이 기능의 것이 아님을 적어 둔다)

## Phase 2: Foundational — 판정 거부의 까닭이 파이프라인을 지난다 (US1의 전제)

- [ ] T002 `__tests__/diary/pipeline.test.ts`의 「실패하면 저장이 일어나지 않는다」 describe에 계약 P1~P3 테스트를 더한다: `{ kind: "rejected", why }` 넷 → `result.reason === "rejected: <why>"`; `timed-out`·`interrupted` → kind 한 낱말; `model-load-failed` → `"model-load-failed: not-found"`; 실패 결과의 키가 `ok`·`stage`·`reason`뿐. 실행해 `rejected` 넷이 **실패하는 것을 본다**
- [ ] T003 `src/diary/pipeline.ts`의 이유 문자열 조립(약 380행)에서 `"reason" in generated`가 아니면 `"why" in generated`일 때 `: ${generated.why}`를 detail로 싣는다. 주석에 까닭(081 — 060의 `empty`가 닿지 않았다)을 한두 줄 적는다. T002 통과 확인

**Checkpoint**: `"rejected: echo"`가 실제 파이프라인에서 나온다.

## Phase 3: User Story 1 — 실패가 났을 때 어떤 실패였는지 남는다 (P1) 🎯 MVP

**Goal**: 실패 모양 열 가지가 기록에서 서로 다른 갈래로 남는다(SC-001·SC-005).

**Independent Test**: `npx jest __tests__/app/write-failures.test.ts __tests__/app/write-failures.pipeline.test.ts --selectProjects logic`

### Tests (먼저 — 실패를 본다)

- [ ] T004 [US1] `__tests__/app/write-failures.test.ts`의 갈래 표를 data-model §2의 모든 줄로 다시 쓴다(계약 F1~F4·F6): 갈래 이름 열하나를 센다 · `rejected: echo|language|unfinished` → 각자의 갈래 · `rejected`(detail 없음)·`rejected: 모르는값` → `unwritten` · `timed-out` → `timed-out` · `interrupted`·`interrupted: 시작 전에 그만두었다` → `interrupted` · `generation-failed: rejected: echo`·`generation-failed: a: b` → `error` · `vision` 단계 `vision-failed: cancelled` → `interrupted`, `failed` → `photos`, `not-ready` → `module` · `not-implemented`·`backend-unavailable: …`·모르는 단계 → `unwritten`
- [ ] T005 [US1] 같은 파일에 계약 F5·F7·S1~S5를 더한다: 거부 갈래 집합 == `REJECT_REASONS`(`src/diary/acceptance.ts`를 테스트가 import해 대조) · `write-failures.ts` 소스가 `acceptance`를 import하지 않는다 · `writeFailureReasonFor` 함수 본문(주석 걷은 뒤)에 한글·`includes(`·`startsWith(`·정규식 리터럴이 없다 · 새 갈래 여섯의 기록·재독 왕복 · 직렬화 항목의 키가 `reason`·`at`뿐 · 옛 기록(`unwritten`·`photos`)이 그대로 읽힌다 · 모르는 갈래 항목만 버린다 · `cancelled: true`·`already-running`·성공은 기록하지 않는다(기존 단언 유지)
- [ ] T006 [P] [US1] 새 파일 `__tests__/app/write-failures.pipeline.test.ts`(계약 F8): `__tests__/diary/pipeline.test.ts`의 `makePipeline`·`backendReturning`·`inputFor` 대역을 쓰거나(export가 없으면 같은 꼴을 이 파일에 둔다) 진짜 `createPipeline()`에 실패 백엔드를 물려 `pipeline.run()`의 **결과 그대로**를 `writeFailureReasonFor()`에 넣는다 — `rejected` 넷, `timed-out`, `interrupted`, `generation-failed`(문구에 쌍점 포함), `vision-failed` 셋, `model-load-failed`. 테스트 안에 이유 문자열 리터럴을 쓰지 않는다
- [ ] T007 [US1] T004~T006을 실행해 새 갈래들이 **실패하는 것을 본다**(`unwritten`·`photos`가 나온다)

### Implementation

- [ ] T008 [US1] `src/app/write-failures.ts`: `WriteFailureReason`을 `"module" | "photos" | "empty" | "save" | "echo" | "language" | "unfinished" | "timed-out" | "interrupted" | "error" | "unwritten"`으로, `REASONS`를 같은 순서 열하나로, `writeFailureReasonFor()`를 data-model §2 표대로 고친다(`vision`: `not-ready`→`module`, `cancelled`→`interrupted`, 그 밖→`photos`; `generation`: kind별 switch, `rejected`는 detail 넷만 각자, 그 밖 `unwritten`). 머리 주석의 「다섯째」·갈래 설명을 열하나로 고치고 081을 적는다. `acceptance.ts`를 import하지 않는다
- [ ] T009 [US1] T004~T006 통과 확인. `npx tsc --noEmit`이 `src/app/diagnostics-view.ts`의 `reasonText()`에서 빠진 갈래 여섯을 짚는 것을 확인한다(다음 단계의 입구 — 여기서는 고치지 않는다)

### 문구 (US1 — 기록이 읽힐 수 있어야 갈래가 쓸모 있다)

- [ ] T010 [P] [US1] `__tests__/app/diagnostics-text.test.ts`에 계약 T1·T4·T5·T6: `FAILURE_TEXT`의 여섯 문구가 글자 단위로 「지시문을 되뱉음」·「다른 언어로 씀」·「글을 끝맺지 못함」·「시간 초과」·「도중에 끊김」·「생성 중 오류」 · 카탈로그 `diagnostics` 영역에서 `fail`로 시작하는 키는 정확히 여덟이다(`failures`·`failModule`·`failPhotos`·`failEmpty`·`failSave`·`failUnwritten`·`failuresEmpty`·`failureTime`) · 문구에 숫자·모델 이름이 없다 · T5: `src/app/diagnostics-view.ts` 소스(주석 걷은 뒤)에서 `FAILURE_TEXT.`를 읽는 자리가 모두 `reasonText` 함수 본문 안이다(최상단 평가 금지) · T6(FR-009·SC-006): `src/` 전체에서 `FAILURE_TEXT`를 참조하는 파일은 `diagnostics-text.ts`·`diagnostics-view.ts` 둘뿐이고, `src/app/failure-toast.ts`·`src/schedule/notification-text.ts`·`src/ui/DiaryHomeScreen.tsx` 소스(주석을 걷은 뒤)에 새 여섯 문구의 글자가 없다
- [ ] T011 [P] [US1] `__tests__/app/diagnostics-view.test.ts`에 계약 T3: 열하나 갈래 모두 `failureLines()`가 빈 문자열이 아닌 `reasonText`를 주고 열하나가 서로 다르다; 옛 다섯의 문구는 기존 단언 그대로
- [ ] T012 [US1] 새 파일 `src/i18n/catalogs/ko/failures.ts`(`export const failures = { echo, language, unfinished, timedOut, interrupted, error }` — data-model §5의 문구, 머리 주석에 「보드에 없다 — 소유자 승인 2026-10-14, 062 규칙으로 새 영역」) → `src/i18n/catalogs/ko/diagnostics.ts`의 `failUnwritten` 위 주석을 「열한째 갈래 — 위 열에 안 맞는 실패(조립 문제·모르는 단계)」로 고친다(키·값은 그대로) → `src/i18n/catalogs/ko/index.ts`의 `ko`에 `failures` 등록 → `src/app/diagnostics-text.ts`에 `export const FAILURE_TEXT = lazyText((c) => c.failures)`
- [ ] T013 [US1] `src/app/diagnostics-view.ts`의 `reasonText()`를 열하나로 채운다(옛 다섯은 `T.fail*`, 새 여섯은 `FAILURE_TEXT`; 함수 안에서 읽는다 — 최상단 평가 금지). `__tests__/i18n/ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`에 새 여섯 문구를 더한다(골든 json은 다시 쓰지 않는다). T010·T011·골든·`tsc` 통과 확인

**Checkpoint**: US1 완료 — 기록에 열하나 갈래가 남고 진단 화면(기존 인라인 묶음)이 새 문구를 그린다.

## Phase 4: User Story 2 — 배포 빌드에서도 「최근 실패」를 볼 수 있다 (P1)

**Goal**: 개발자 화면 맨 아래에 「최근 실패」 묶음(SC-002).

**Independent Test**: `npx jest __tests__/ui/failures-group.test.tsx __tests__/ui/developer-screen.test.tsx __tests__/ui/diagnostics-screen.test.tsx --selectProjects ui`

### Tests (먼저)

- [ ] T014 [P] [US2] 새 파일 `__tests__/ui/failures-group.test.tsx`(계약 G1~G4): 빈 목록 → `${idPrefix}-failures-empty` 「아직 실패가 없어요」 · 두 줄 → `-failure-0`·`-failure-1`에 까닭·시각이 넘긴 순서로 · 묶음 testID·머리 「최근 실패」 · 두 `idPrefix` 모두 · 소스가 `write-failures`를 import하지 않는다. RNTL 14 — `render`를 `await`한다
- [ ] T015 [P] [US2] `__tests__/ui/developer-screen.test.tsx`에 계약 D2~D4: 기본 props에 `failures: []` · 빈 줄·줄 그리기 · 트리 순서 `developer-group-off` < `developer-group-attempts` < `developer-group-failures`(기존 `at()` 도우미) · `showsDiagnostics: false`에서도 묶음이 있다 · `DeveloperScreen.tsx` 소스가 `write-failures`를 import하지 않는다
- [ ] T016 [P] [US2] `__tests__/app/auto-write-attempts-wiring.test.ts`에 계약 A1·A2 describe를 더한다(소스 계약, 주석 걷은 뒤): AppFrame의 개발자 겹 effect에 `loadWriteFailures(`와 `loadAutoWriteAttempts(`가 함께 있고 `failureLines(`로 옮기며 `failures={developerFailures}`를 넘긴다; setter 앞에 `alive` 검사
- [ ] T017 [US2] T014~T016을 실행해 **실패하는 것을 본다**

### Implementation

- [ ] T018 [US2] 새 파일 `src/ui/FailuresGroup.tsx` — `src/ui/AttemptsGroup.tsx`와 같은 꼴(`failures: readonly FailureLine[]`, `idPrefix: "diagnostics" | "developer"`), `DiagnosticsScreen.tsx` 260~273행의 JSX를 그대로 옮기고 testID 머리만 매개변수로. 머리·빈 줄은 `DIAGNOSTICS_TEXT.failures`·`failuresEmpty`. 머리 주석에 왜 두 화면인가(진단은 배포 빌드에 없다)
- [ ] T019 [US2] `src/ui/DiagnosticsScreen.tsx`의 인라인 「최근 실패」 묶음을 `<FailuresGroup failures={failures} idPrefix="diagnostics" />`로 바꾼다(자리 그대로 — 시도 묶음 앞). `__tests__/ui/diagnostics-screen.test.tsx`가 **수정 없이** 통과하는지 확인(계약 D1)
- [ ] T020 [US2] `src/ui/DeveloperScreen.tsx`: `DeveloperScreenProps`에 `failures: readonly FailureLine[]`(주석: 081, 배포 빌드에서도 그린다, 보드 밖), `<AttemptsGroup … />` 바로 아래에 `<FailuresGroup failures={failures} idPrefix="developer" />`
- [ ] T021 [US2] `App.tsx` AppFrame: `failurePort = useMemo(() => expoWriteFailurePort(), [])`와 `developerFailures` state를 더하고, `route === "developer"` effect에서 `loadAutoWriteAttempts`와 `loadWriteFailures`를 함께 읽어 `alive`일 때만 `setDeveloperFailures(failureLines(items))`; `DeveloperScreen`에 `failures={developerFailures}`. 진단 겹(`readFailures`)은 건드리지 않는다. `tsc` 0 — `DeveloperScreen`을 렌더하는 다른 테스트·자리가 빠진 prop으로 짚이면 채운다
- [ ] T022 [US2] T014~T016 통과 확인

### 실기기 흐름

- [ ] T023 [US2] `.maestro/settings-developer-sweep.yml`: `developer-group-attempts` 단언 뒤에 `developer-group-failures`까지 `scrollUntilVisible` + `assertVisible`(주석: 081 — 새 맨 아래). 「진단」 행을 `direction: UP`으로 찾는 블록은 그대로. `docs/e2e/feature-flow-map.md`의 그 흐름 설명에 「최근 실패」를 더하고 `npx jest __tests__/e2e --selectProjects logic` 통과 확인(계약 M1·M2)

**Checkpoint**: US2 완료 — 두 화면이 같은 부품으로 같은 줄을 그린다.

## Phase 5: User Story 3 — 옛 기록과 다른 버전이 깨지지 않는다 (P2)

**Goal**: 옛 줄이 그대로 읽힌다(SC-004).

**Independent Test**: T005의 S3·S4 단언 + T011의 옛 문구 단언.

- [ ] T024 [US3] `__tests__/app/write-failures.test.ts`에 옛·새가 섞인 파일 한 건을 통째로 읽는 테스트를 더한다: `{"items":[{"reason":"interrupted",…},{"reason":"unwritten",…},{"reason":"photos",…},{"reason":"made-up",…}]}` → 앞 셋이 순서 그대로, 넷째만 빠진다; 그 결과를 `failureLines()`에 넣으면 「도중에 끊김」·「일기를 쓰지 못함」·「사진을 읽지 못함」. (T008·T013 뒤라 바로 통과해야 한다 — 통과하지 않으면 구현을 고친다)

## Phase 6: Polish & 검증

- [ ] T025 [P] `specs/060-diagnostics-screen/contracts/diagnostics.md`의 WF1 머리에 「081로 대체됨 — `specs/081-write-failure-reasons/contracts/write-failure-reasons.md` F절」 한 줄을 더한다(본문은 지우지 않는다 — 080이 020·079 계약에 한 방식)
- [ ] T026 `npm test` 전체와 `npm run lint`를 돌려 통과를 확인한다(062 B3·B6, 069 G-1, 골든, flow-map, 헌법 검사 포함). 계약 X1·X2: `git diff --stat`에 `src/diary/acceptance.ts`·`src/app/failure-toast.ts`·`src/app/auto-write-attempts.ts`·`src/i18n/catalogs/ko/attempts.ts`·`package.json`이 없고, `src/i18n/catalogs/ko/diagnostics.ts`의 diff는 주석뿐이다
- [ ] T027 위반 주입 — 계약 문서 끝의 표 일곱 줄을 하나씩 넣어(치환이 적용됐는지 grep으로 먼저 확인) 적힌 테스트가 실패하는지 보고 되돌린다. 되돌린 뒤 `git diff`로 원래대로인지 확인한다. 못 잡는 주입이 있으면 테스트를 고친다
- [ ] T028 dev 실기기(SM-S901N) — quickstart §2의 준비·백업 → D1(끊김 → 「도중에 끊김」, 사진 읽는 도중·본문 도중 한 번씩) → D2(두 화면, 글꼴 2.0배) → D3(옛 줄) → D4(Maestro 흐름의 개발자·진단 구간) → 되돌리기. 본 것·못 본 것을 `specs/081-write-failure-reasons/quickstart.md` 「실측」에 적는다. 임시 로그를 넣었으면 걷는다
- [ ] T029 `AGENTS.md`: 「기능별 핵심 결론」에 081 절(갈래 열하나·읽는 곳·두 화면·미확인) · 060 절의 「이유 갈래(다섯 …)」를 열하나로 고치고 「060의 `empty`는 081 전까지 닿지 않았다 — 손으로 쓴 이유 문자열로만 테스트했다」 한 줄 · 「조용히 실패하는 결함의 계열」 목록에 같은 항목 · 078 「읽는 법」의 `백그라운드 · 실패` 자리에 「그 아래 『최근 실패』의 같은 시각 줄과 짝지어 읽는다」. 앞의 서술을 주석으로 덧대지 않고 고친다
- [ ] T030 `docs/roadmap/README.md`: 백그라운드 자동 쓰기 과제의 그 줄을 「081로 닫음」으로 고치고 「완료 이력」 표에 081 한 줄을 더한다(과제 자체는 닫지 않는다 — 2·3·6번과 4번의 나머지가 남는다). **별도 커밋(3/3)**

## Dependencies

- T002 → T003 → (T004·T005·T006) → T007 → T008 → T009 → (T010·T011) → T012 → T013
- US2는 US1의 T013 뒤(새 문구가 있어야 줄이 의미 있다 — 묶음 부품 자체는 문구와 무관해 T014·T018은 먼저 써도 된다): (T014·T015·T016) → T017 → T018 → T019 → T020 → T021 → T022 → T023
- T024는 T008·T013 뒤. T025는 언제든. T026 → T027 → T028 → T029 → T030

## Parallel 예

- T006은 T004·T005와 다른 파일이다. T010·T011은 서로 다른 파일이다. T014·T015·T016은 서로 다른 파일이다.

## Implementation Strategy

MVP는 Phase 2 + US1(갈래가 기록에 남는다 — 개발 환경의 진단 화면에서 이미 보인다). US2가 배포 빌드의 창을 연다. US3은 이미 있는 호환 동작을 잠그는 테스트 하나다. 커밋은 kickoff 규칙대로 셋: 스펙 산출물(1/3) → 구현(2/3, T001~T029) → 로드맵(3/3, T030).
