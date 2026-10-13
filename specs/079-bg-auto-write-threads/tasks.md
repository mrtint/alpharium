# Tasks: 백그라운드 자동 쓰기 완주 — 스레드 수와 생성 중 해제 경합

**Input**: `specs/079-bg-auto-write-threads/` — [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/assembly.md](contracts/assembly.md), [quickstart.md](quickstart.md)

**Tests**: TDD 필수(CLAUDE.md `test-driven-development`) — 각 구현 태스크 앞에 실패하는 테스트 태스크가 있다. 소스를 읽는 테스트는 주석을 먼저 걷는다(`.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")`).

**규칙**: 측정 코드를 제품에 넣지 않는다(FR-013). `src/schedule/task.ts`·`src/vision/`·`src/ui/`는 바꾸지 않는다. release 빌드·`npm run test:layer1`·기기의 앱 삭제는 하지 않는다.

## Phase 1: Setup

- [X] T001 `git branch --show-current`가 `079-bg-auto-write-threads`인지 확인하고 `npm run test:logic`이 초록인 것을 기준으로 남긴다(변경 전 통과 수를 `specs/079-bg-auto-write-threads/quickstart.md` 「실측」 절에 한 줄로 적는다)

## Phase 2: Foundational (계약 먼저 — 모든 스토리가 기댄다)

- [X] T002 `specs/005-diary-generation/contracts/engine.md`를 `contracts/assembly.md` 「005 `engine.md`에 옮길 것」대로 고친다: 「모델을 여는 값」 표의 `n_threads` 줄(화면 조립은 주지 않음, 안드로이드 백그라운드 조립은 2 — 실측 079), E2에 「도는 생성이 끝난 뒤에 컨텍스트를 놓는다(079 U2)」, 「시간 한도」에 주체별 값(화면 180초·백그라운드 600초), 검증 표에 E-11·E-12. 옛 문장(「정하면 그것이 성능 튜닝이다」)은 덧대지 않고 고친다
- [X] T003 `__tests__/inference/assembly.test.ts`(새 파일)를 쓴다(실패 확인 — 모듈이 없다): A1 `inferenceThreadsFor`의 네 조합(`("background","android")`만 `2`, 나머지 셋은 `undefined`), `BACKGROUND_THREADS === 2`, A3 `generationTimeoutFor("screen") === GENERATION_TIMEOUT_MS`(180_000)·`generationTimeoutFor("background") === BACKGROUND_GENERATION_TIMEOUT_MS`(600_000)·`generationTimeoutFor.length === 1`, A2 `src/inference/assembly.ts` 소스(주석 걷은 뒤)에 `hardwareConcurrency`·`Platform`·`AppState`·`require(`·`process.env`가 없다
- [X] T004 `src/inference/sampling.ts`의 `GENERATION_TIMEOUT_MS` 아래에 `BACKGROUND_GENERATION_TIMEOUT_MS = 600_000`을 더하고(주석: 2026-10-13 SM-S901N `dumpsys jobscheduler`의 `runtime_min_guarantee_ms=600000`, 한 기기 값, iOS에도 같은 값을 쓰는 것은 소유자 결정), `src/inference/assembly.ts`(새 파일, 순수)에 `AssemblyOwner = "screen" | "background"`·`BACKGROUND_THREADS = 2`(주석: 실측 — 4스레드 26분 7초, 3스레드 2분 36초·3분 33초, 2스레드 3분 42초, 전경 4스레드 23.8초 대 2스레드 43.6초; 조건당 1~2회·한 기기)·`inferenceThreadsFor(owner, platform: "android" | "ios"): number | undefined`·`generationTimeoutFor(owner): number`를 쓴다 → T003 통과

## Phase 3: User Story 1 — 화면이 꺼진 휴대폰이 스스로 끝까지 쓴다 (P1) 🎯 MVP

**Goal**: 백그라운드가 조립한 쓰기가 안드로이드에서 두 모델을 스레드 2로 열고 600초 한도를 탄다. **Independent Test**: 인자를 만드는 순수 함수와 전달 사슬의 소스 계약이 통과하고, dev 실기기에서 화면을 끈 강제 잡이 10분 안에 `백그라운드 · 썼음`으로 끝난다(T021).

- [X] T005 [US1] `__tests__/inference/llama-port.test.ts`에 `describe("079 — 모델을 여는 값 (assembly.md A4·A5)")`를 더한다(실패 확인): `contextParams("/m.bin", 2)`가 `{ model: "/m.bin", n_ctx: 2048, n_gpu_layers: 0, n_threads: 2 }`와 깊은 비교로 같다, `src/inference/llama-port.ts` 소스에서 `llamaEngine(`이 `threads`를 받아 `contextParams(`에 넘긴다
- [X] T006 [US1] `src/inference/llama-port.ts`에 `export function contextParams(modelPath: string, threads?: number)`(`threads === undefined`이면 `n_threads` 키를 만들지 않는다)를 쓰고 `llamaEngine(threads?: number)`가 `initLlama(contextParams(modelPath, threads))`를 부르게 한다. 「`n_threads`를 주지 않는다 — 정하면 그것이 성능 튜닝이고 원칙 IV의 언저리다」 주석을 새 결론(화면 조립은 주지 않는다, 백그라운드 조립은 `assembly.ts`가 정한다 — 079 실측)으로 고친다 → T005 통과
- [X] T007 [US1] `__tests__/inference/on-device.test.ts`에 `describe("079 — 조립 주체가 스레드 수와 시간 한도를 정한다 (assembly.md A4~A6)")`를 더한다(실패 확인): `visionContextParams("/v.bin", 2)`가 `{ model: "/v.bin", n_ctx: 4096, n_gpu_layers: 0, n_threads: 2 }`와 같다(`n_ctx`는 소스의 `VISION_CONTEXT_SIZE` 값으로 단언), `on-device.ts` 소스에서 `onDeviceBackend`가 셋째 인자 `owner`(기본 `"screen"`)를 받고 `inferenceThreadsFor(owner, isIOS() ? "ios" : "android")`를 **한 번** 불러 그 값을 `llamaEngine(`과 `visionSupport(` **둘 다**에 넘기며 `createOnDeviceBackend(`의 셋째 인자가 `generationTimeoutFor(owner)`다
- [X] T008 [US1] `src/inference/on-device.ts`에 `export function visionContextParams(modelPath: string, threads?: number)`를 쓰고 `visionSupport(threads?: number)`가 그것으로 `initLlama`를 부르게 하며, `onDeviceBackend(loadSignals?, loadCustomNames?, owner: AssemblyOwner = "screen")`가 T007의 모양으로 조립하게 한다(`GENERATION_TIMEOUT_MS` 직접 전달을 `generationTimeoutFor(owner)`로 바꾼다) → T007 통과
- [X] T009 [US1] `__tests__/inference/engine.test.ts`의 「E-3 시간 한도」에 가짜 타이머 테스트를 더한다(US1 시나리오 3·Edge 「제목 질문」): (본문) `run()`이 300초 뒤에 끝나는 대역 엔진으로 `createOnDeviceBackend(probe, engine, generationTimeoutFor("background"))`는 `timed-out`이 **아니고**, 같은 엔진에 `generationTimeoutFor("screen")`을 주면 `timed-out`이다, (제목) `run()`은 바로 끝나고 `ask()`가 300초 뒤에 끝나는 대역 엔진으로 백그라운드 한도면 제목이 붙은 글이 나오고 화면 한도면 제목 없이 본문만 나온다(061 — 제목 때문에 일기를 버리지 않는다). T004 뒤에는 처음부터 초록일 수 있다 — 값이 뒤바뀌면 실패하는 것을 T013의 주입으로 확인한다
- [X] T010 [P] [US1] `__tests__/inference/select.test.ts`에 소스 계약을 더한다(실패 확인, A7): `src/inference/select.ts`의 `selectBackend`가 `owner` 인자를 받고 `onDeviceBackend(loadSignals, loadCustomNames, owner)`로 넘기며 `createDesktopServerBackend(` 호출에는 `owner`가 없다
- [X] T011 [US1] `src/inference/select.ts`의 `selectBackend`에 마지막 인자 `owner?: AssemblyOwner`를 더해 `onDeviceBackend`에 넘긴다 → T010 통과
- [X] T012 [P] [US1] `__tests__/app/wiring.test.ts`에 소스 계약을 더한다(실패 확인, A8·FR-006): `src/app/wiring.ts`에서 `deps.lockOwner ?? "screen"`이 **한 번만** 나오고, 그 변수(`owner`)가 `selectBackend(` 호출의 인자와 `acquireLockRecord(lockPort, owner,` 양쪽에 쓰인다
- [X] T013 [US1] `src/app/wiring.ts`에서 `const owner = deps.lockOwner ?? "screen"`을 `selectBackend()` 호출 앞으로 올리고 `selectBackend(resolution, undefined, desktopInferenceUrl(), loadSignals, deps.loadCustomNames ?? deviceCustomNames, owner)`로 넘긴다 → T012 통과. 이어서 위반 주입 둘을 해 보고 되돌린다(치환이 적용됐는지 먼저 단언, 되돌린 뒤 `git diff --stat`로 확인): (a) `inferenceThreadsFor`가 `"screen"`에도 2를 주게 → T003 실패, (b) `generationTimeoutFor("screen")`이 600_000을 주게 → T003·T009 실패

## Phase 4: User Story 2 — 멈췄다 이어진 쓰기가 앱을 죽이지 않는다 (P1)

**Goal**: 도는 생성이 끝나기 전에 컨텍스트를 놓지 않는다. **Independent Test**: 대역 컨텍스트에서 `release`가 생성 종료 전에 불리지 않고, iOS 시뮬레이터에서 한도보다 오래 멈췄다 돌아와도 앱이 살아 있다(T022).

- [X] T014 [US2] `__tests__/inference/llama-port.test.ts`에 `describe("079 — 도는 생성이 끝나기 전에 놓지 않는다 (assembly.md U1~U7)")`를 더한다(실패 확인). 대역 컨텍스트는 호출 순서를 배열에 적고 `completion()`이 테스트가 쥔 Promise로 끝난다: (U2·U3) `run()` 도중 `unload()`를 부르면 `stopCompletion`이 불리고, `completion`을 끝내기 전에는 `release`가 불리지 않으며(마이크로태스크를 여러 번 비운 뒤에도), 끝내면 `release`가 불린다 — 순서가 `["completion","stopCompletion","release"]`, (U4) 도는 생성이 없으면 `stopCompletion` 없이 `release`만, (U5) `completion`이 거부로 끝나도 `release`가 불리고 `stopCompletion`이 던져도 `release`까지 간다, (U1) `ask()`·`prewarm()` 도중의 `unload()`도 같다, (U6) `unload()`가 기다리는 동안 부른 `run()`은 `{ text: "", ending: { kind: "length" } }`이고 그 사이 `load()`는 로더를 다시 불러 새 컨텍스트를 연다, (U7) `release`가 던져도 `unload()`는 던지지 않는다
- [X] T015 [US2] `src/inference/llama-port.ts`의 `createLlamaEngine()`에 도는 호출을 드는 변수와 그것을 세우고 비우는 도우미를 더해 `run`·`ask`·`prewarm`이 지나게 하고, `unload()`를 「`context`·`openFor` 비움 → 도는 생성이 있으면 `stopCompletion()`(실패 무시) 뒤 그 종료를 기다림(거부 무시) → `release()`(실패 무시)」 순서로 고친다. 기다림에 타이머를 두지 않는다. 주석에 까닭(2026-10-13 iOS 시뮬레이터 SIGSEGV — `llama_decode` 중인 스레드와 해제 중인 스레드)을 적는다 → T014 통과
- [X] T016 [US2] 위반 주입: `unload()`에서 「종료를 기다림」 한 줄을 빼면 T014의 U2·U3가 실패하는 것을 확인하고 되돌린다. 기존 `E-3 시간 한도`(engine.test.ts)·`018 — prewarm()`·`061 — ask()`·`적재와 정리 (E1·E2)` 묶음이 고치지 않고 통과하는 것을 확인한다(U8) — `npx jest __tests__/inference --selectProjects logic`

## Phase 5: User Story 3 — 앱을 열어 쓰는 길은 지금 속도 그대로다 (P2)

**Goal**: 화면 조립의 모델을 여는 값과 시간 한도가 이 기능 이전과 같다. **Independent Test**: 화면 조립의 인자에 `n_threads` 키가 없고 한도가 180초다. 실기기에서 앱을 열 때 쓰기가 이전과 같은 스레드 수로 열리고 수정 전 값(전체 약 50초)과 같은 수준이다 — 90초를 넘으면 회귀로 본다(SC-003, T021).

- [X] T017 [US3] `__tests__/inference/llama-port.test.ts`·`__tests__/inference/on-device.test.ts`의 079 묶음에 화면 조립 단언을 더한다: `contextParams("/m.bin")`이 `{ model: "/m.bin", n_ctx: 2048, n_gpu_layers: 0 }`와 깊은 비교로 같고 `"n_threads" in` 결과가 거짓이다(값이 `undefined`인 키도 안 된다 — `Object.keys`로 단언), `visionContextParams("/v.bin")`도 같다, `createOnDeviceBackend`의 `timeoutMs` 기본값이 여전히 `GENERATION_TIMEOUT_MS`다(소스), `src/` 전체에서 `onDeviceBackend(`·`selectBackend(`를 부르는 자리 가운데 `owner`를 `"background"`로 고정해 넘기는 곳이 없다(주체는 `wiring.ts`의 변수에서만 온다)
- [X] T018 [US3] 위반 주입: `contextParams`가 `n_threads: threads`를 조건 없이 싣게(`undefined` 값의 키) 바꾸면 T017이 실패하는 것을 확인하고 되돌린다

## Phase 6: User Story 4 — 진단의 수동 실행이 백그라운드와 같은 조건으로 돈다 (P3)

**Goal**: 수동 실행만을 위한 조립 갈래가 없다. **Independent Test**: `task.ts` 소스에 조립이 한 곳이고 `manual`과 무관하다.

- [X] T019 [US4] `__tests__/schedule/task-assembly-source.test.ts`(새 파일)를 쓴다(A9·FR-004 — 지금 코드가 이미 만족하므로 처음부터 초록이다; 위반 주입으로 확인한다): `src/schedule/task.ts` 소스(주석 걷은 뒤)에 `makePipeline(`이 정확히 한 번 나오고 그 인자가 `{ lockOwner: "background" }`이며, `lockOwner`를 `manual`로 가르는 식(`manual ?`·`manual &&`가 같은 줄에)이 없다. 주입: `lockOwner: deps.manual ? "screen" : "background"`로 바꾸면 실패 → 되돌린다

## Phase 7: Polish & 검증

- [X] T020 `npm test`와 `npm run lint`를 돌려 통과를 확인한다(FR-011 — 샘플링·프롬프트·판정·자동 쓰기 판정·시도 기록의 기존 테스트가 고치지 않고 통과한다). `git diff main --stat -- src`가 `src/inference/assembly.ts`·`sampling.ts`·`llama-port.ts`·`on-device.ts`·`select.ts`·`src/app/wiring.ts`뿐이고, 더한 줄에 `console.`·`performance.`·새 `Date.now()`가 없는 것을 확인한다(FR-013)
- [X] T021 안드로이드 dev 실기기(SM-S901N) 확인 — `quickstart.md` §2 그대로: 일기·설정 백업 → 어제에 진짜 사진 4장 → 맥 Metro(번들에 `assembly` 모듈·`dev` 환경 확인) → 2-1 앱을 열 때 쓰기(시간, 로그 `n_threads=4` 두 번 — SC-002·SC-003) → 2-2 화면 끔 + 강제 deep idle + 배터리 예외에서 강제 잡(10분 안 일기·`백그라운드 · 썼음`·완성 알림, 로그 `n_threads=2` 두 번 — SC-001·SC-002) → 되돌리기(md5 대조, `seed:clear`). 기기가 잠겨 있으면 소유자에게 PIN을 요청한다
- [X] T022 iOS 시뮬레이터(iPhone 17, Debug) 확인 — `quickstart.md` §3: 3-1 수동 실행 도중 약 210초 멈췄다 복귀 → `지금 실행 · 썼음`, 3-2 약 630초 멈췄다 복귀 → 앱 살아 있음(새 `.ips` 0)·잠금 풀림 (SC-004). 일기·설정을 백업으로 되돌린다
- [X] T023 `specs/079-bg-auto-write-threads/quickstart.md` 「실측 (구현 뒤)」에 T021·T022의 날짜·기기·시각표·미확인을 적는다(본 것만 적는다 — 보지 못한 것은 미확인으로; 안드로이드 실기기에서 「생성이 도는 중의 정리」 경로는 밟지 못한다는 것을 §4 그대로 남긴다)
- [X] T024 `AGENTS.md`를 새 결론으로 고친다(덧대지 않는다): 「저장소의 현재 상태」의 백그라운드 줄, 「추론·프롬프트」의 180초 한도 줄(주체별 값), 「024·027」의 헤드리스 배수 서술(스레드 넘침이 원인이었음), 078 절의 「30분 안에 끝나지 못했다」·「멈췄던 실행이 이어져 끝난다」 줄, 그리고 「079」 절(원인·값·해제 순서·삼성 얼림·iOS 시뮬레이터에서 본 것·미확인). 실기기에서 확인하지 않은 것을 「된다」고 쓰지 않는다
- [X] T025 `docs/roadmap/README.md`의 과제 「백그라운드 자동 쓰기가 완주하지 못한다」를 남은 일만으로 고친다(안드로이드 원인·대응은 스펙 079로 끝남; 남는 것 — iOS 테스터 기록, 배터리 예외 없는 사용자의 얼림·문구, OS가 스스로 깨운 잡·다른 기기, 078에서 미룬 항목). 과제는 닫지 않으므로 「완료 이력」 표에는 079를 「안드로이드 대응」 한 줄로 더한다 — **구현 커밋과 분리한 커밋**으로 낸다

## Dependencies

- T002 → 나머지 전부(계약 먼저). T003 → T004 → US1·US3.
- US1: T005 → T006, T007 → T008(T006·T004 필요), T009(T004 필요), T010 → T011(T008 필요), T012 → T013(T011 필요).
- US2: T014 → T015 → T016. US1과 파일이 겹친다(`llama-port.ts`·`llama-port.test.ts`) — T006 뒤에 한다.
- US3: T017은 T006·T008 뒤, T018은 T017 뒤. US4: T019는 독립이다.
- T020은 T001~T019 뒤. T021·T022는 T020 뒤. T023은 T021·T022 뒤. T024·T025는 T023 뒤.

## Parallel

- T010과 T012는 서로 다른 테스트 파일이다(각자의 구현 T011·T013은 순서가 있다).
- T019는 다른 스토리와 파일이 겹치지 않아 언제든 할 수 있다.
- T021(안드로이드)과 T022(iOS 시뮬레이터)는 같은 Metro 번들을 본다 — 소스를 바꾸지 않는 동안이면 겹쳐 돌려도 된다.

## Implementation Strategy

MVP는 US1(스레드 2·600초)이다 — T001~T013 뒤에 안드로이드에서 완주가 보인다. US2(해제 순서)는 TestFlight에 올리기 전에 반드시 들어가야 하므로 같은 브랜치에서 잇는다. US3·US4는 회귀 방어다.

## Phase 8: Convergence

- [X] T026 `docs/roadmap/README.md`의 과제 「백그라운드 자동 쓰기가 완주하지 못한다」를 남은 일만으로 고쳐 쓰고 「완료 이력」 표에 079 한 줄을 더한다 per T025 (missing)

## Phase 9: 코드 리뷰 반영 (2026-10-13)

- [X] T027 [US2] `__tests__/inference/llama-port.test.ts`에 겹친 호출 테스트를 쓰고(실패 확인 — 미리 준비가 도는 중에 온 본문 호출이 곧바로 거부되면 기다리지 않고 놓았다) `src/inference/llama-port.ts`의 「도는 생성」을 한 칸에서 집합으로 바꾼다 per FR-007 (리뷰 Important 1)
- [X] T028 [US2] 정리가 끝나기 전의 `load()`·`unload()`가 그 정리를 기다리게 한다 — `llama-port.test.ts` U6을 「앞 컨텍스트가 놓인 뒤에 새로 연다」로 고쳐 실패를 확인한 뒤 구현 per 005 E1 (리뷰 Minor — 두 컨텍스트가 함께 열릴 수 있었다)
- [X] T029 [US2] `__tests__/inference/engine.test.ts`에 진짜 엔진을 어댑터에 이어 붙인 테스트(멈춤 → 생성 종료 → 놓기 → `timed-out` 반환)를 더하고, 「한도에 걸려도 사용자를 붙잡지 않는다」고 적은 주석 셋(`on-device.ts` `runWithTimeout`, `liveness.ts`, `llama-port.ts`)과 계약 U8·스펙 예외 상황·005 `engine.md`를 사실대로 고친다 per FR-008 (리뷰 Important 3)
- [X] T030 `__tests__/schedule/lock.test.ts`에 L1·L2를 쓰고(실패 확인) `src/schedule/lock.ts`의 `STALE_LOCK_MS`를 10분으로 올린다. 옛 값을 박아 둔 `wipe-diaries.test.ts`를 상수로 고친다 per FR-014 (리뷰 Important 2 — 소유자 결정)
- [X] T031 측정값 표기 오류(「스레드 2 본문 98~151초」→ 2스레드 151.0초·174.2초, 3스레드 98.2초·136.1초)를 `sampling.ts`·`engine.test.ts`·설계 문서에서 고치고, 네이티브 해제의 5초 대기(`TASK_WAIT_TIMEOUT`)를 `llama-port.ts`·계약·research R5에 적고, 소스 계약 둘을 강화한다(`generationTimeoutFor` 선언 직접 읽기, `task.ts`에서 `createAppPipeline(` 직접 호출 금지) (리뷰 Minor)
- [X] T032 리뷰 반영 뒤의 최종 코드로 실기기·시뮬레이터 확인을 한 번씩 더 돌리고(`quickstart.md` §2·§3) 결과를 「코드 리뷰 반영 뒤 다시 확인」에 적는다 per SC-001~SC-004 (리뷰 Minor — 앞의 실측은 반영 전 코드였다)
