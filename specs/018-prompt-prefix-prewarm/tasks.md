# Tasks: 일기 대기 시간 단축 (고정 서두 미리 준비)

**Input**: Design documents from `/specs/018-prompt-prefix-prewarm/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/,
quickstart.md — 모두 존재함

**Tests**: 포함한다 — AGENTS.md 「개발 방식」이 "계약을 먼저 정하고 테스트를
먼저 쓴다"를 이 저장소의 고정 관례로 못 박고 있고, 007·009·012가 반복해서
같은 순서(계약 → 테스트 → 구현)를 따랐다.

**Organization**: User Story 1(사진 없는 날, P1)과 User Story 2(사진 있는
날, P2) 순서로 묶는다. spec.md·plan.md가 이미 이 순서를 "1단계/2단계"로
확정했다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능(다른 파일, 완료되지 않은 작업에 의존하지 않음)
- **[Story]**: 어느 사용자 스토리에 속하는가(US1, US2)
- 파일 경로를 정확히 포함한다

## Path Conventions

단일 프로젝트(plan.md 「Structure Decision」). `src/`, `__tests__/`가
저장소 루트에 있다. 신규 디렉터리 없음 — 기존 다섯 파일만 수정한다.

---

## Phase 1: Setup

**Purpose**: 신규 설정 없음 — 기존 프로젝트 구조와 도구(jest, tsc, eslint)를
그대로 쓴다.

- [X] T001 `git checkout -b 018-prompt-prefix-prewarm` (main에서 아직
  분기하지 않았다면) 또는 현재 브랜치가 `018-prompt-prefix-prewarm`인지
  확인

**Checkpoint**: 기존 `npm test`가 초록불인 상태에서 시작한다 — 이것이 이
기능의 진짜 "설정"이다.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 두 사용자 스토리 모두가 딛고 서는 계약 확장과 접두사 분리.
이 단계 없이는 어느 스토리도 시작할 수 없다.

**⚠️ CRITICAL**: 이 단계가 끝나야 User Story 1을 시작할 수 있다.

### 계약 테스트 먼저 (실패를 확인한 뒤 구현)

- [X] T002 [P] `promptPrefix()`/`fixedHead()` 계약 테스트를
  `__tests__/diary/prompt.test.ts`에 추가한다 — contracts/prompt-prefix.md의
  P8(모든 캐릭터·요청 조합에서 `buildPrompt()`가 `promptPrefix()`로
  시작함), P10(접두사에 날짜·"에 네가 본 것"·"사진"·"다닌 자리"가 없음),
  P11(다섯 캐릭터의 접두사가 서로 다름) 세 가지. **아직 `promptPrefix`가
  export되지 않았으므로 이 시점에는 반드시 실패한다.**
- [X] T003 [P] `GenerationEngine.prewarm()` 계약 테스트를
  `__tests__/inference/llama-port.test.ts`에 추가한다 —
  contracts/prewarm-engine.md의 E7(`messages`+`jinja`+`n_predict: 1`로
  보냄), E9(load 없이 부르면 네이티브를 안 건드리고 조용히 끝남),
  E10(completion 실패해도 안 던짐), E11(반환값 없음) 네 가지. **아직
  `prewarm`이 계약에 없으므로 타입 에러 또는 실패로 확인된다.**

### 구현 (T002·T003을 통과시킨다)

- [X] T004 `src/diary/prompt.ts`에 `fixedHead(character): string[]`(비공개)과
  `export function promptPrefix(character): string`을 추가한다.
  `buildPrompt()`의 기존 배열 리터럴 앞부분(`SPEAKER_RULES`, `nameLine()`,
  `TITLE_INSTRUCTION`, `""`, `` `${language}로 써라.` ``, `""`)을
  `fixedHead()`로 옮기고 `buildPrompt()`가 `...fixedHead(request.character)`를
  쓰도록 고친다. **기존 `prompt.test.ts`의 P-1~P-7이 이 변경 후에도
  바이트 단위로 그대로 통과해야 한다** — 통과하지 않으면 옮기는 과정에서
  무언가 바뀐 것이다(contracts/prompt-prefix.md P9).
- [X] T005 `src/inference/engine-port.ts`의 `GenerationEngine` 인터페이스에
  `prewarm(character: Character): Promise<void>;`를 추가하고, 타입 바로
  위 JSDoc에 이 메서드의 계약(반환값 없음, `promptPrefix()`를 프리필하는
  용도, 부르는 쪽이 그 뒤에 VLM을 열면 안 됨)을 적는다. 파일 상단
  불변식 목록에 4번째 불변식(E6 — "글을 남기지 않는다")을 추가한다.
- [X] T006 `src/inference/llama-port.ts`의 `createLlamaEngine()`이 반환하는
  객체에 `prewarm(character)`를 구현한다(`run()` 바로 위). `context ===
  null || openFor !== character`면 즉시 반환(E9). 아니면
  `context.completion({ messages: [{ role: "user", content:
  promptPrefix(character) }], jinja: true, temperature: SAMPLING.temperature,
  top_p: SAMPLING.top_p, top_k: SAMPLING.top_k, n_predict: 1 })`을
  `try/catch`로 감싸 호출하고(E7·E8·E10), 결과를 어디에도 담지 않는다(E11).
  `promptPrefix`를 `../diary/prompt`에서 import한다.

**Checkpoint**: T002·T003의 계약 테스트가 통과한다. `npm run test:logic`이
초록불이다. `tsc`가 통과한다(engine-port.ts 계약 확장이 다른 구현체—있다면
데스크톱 어댑터—의 타입 에러를 유발하지 않는지 확인).

---

## Phase 3: User Story 1 - 사진 없는 날, 대기가 짧아진다 (Priority: P1) 🎯 MVP

**Goal**: 읽을 사진이 없는 날에, 캐릭터·날짜를 고르고 화면에 머무르는 대기
동안 고정 접두사를 미리 프리필해 "쓰기"를 누른 뒤 완성까지의 시간을
뚜렷하게 줄인다. 내용·분량·말투는 바뀌지 않는다.

**Independent Test**: quickstart.md 검증 1·2 — 사진 없는 날에서 즉시
누름(대기 없음) 대 몇 초 대기 후 누름을 비교, 화면 이탈 후 정상 동작 확인.

### Tests for User Story 1 ⚠️

- [X] T007 [P] [US1] `on-device.ts`가 노출할 `prepare()`/`release()` 계약
  테스트를 `__tests__/inference/on-device.test.ts`에 추가한다 —
  contracts/prewarm-engine.md의 E12(`prepare()` 후 `engine.unload()`가
  안 불림), E13(`prepare()`의 `load()` 실패가 예외를 안 던짐),
  E14(`release()`가 열린 것을 닫고 안 열려 있으면 아무 일도 안 함), 그리고
  "`prepare()` 뒤의 `generate()`는 네이티브 로더를 다시 안 부른다"(재사용
  확인) 테스트. **아직 `prepare`/`release`가 export되지 않았으므로 이
  시점에는 실패한다.**
- [X] T008 [P] [US1] `DiaryHomeScreen.tsx`가 사진 없는 날에서 캐릭터·날짜가
  정해지면 준비를 트리거하고, 화면을 벗어나면 해제를 부르는 테스트를
  `__tests__/ui/DiaryHomeScreen.test.tsx`에 추가한다 — FR-005(사진 없는
  날 즉시 트리거), FR-008(화면 이탈 시 해제), Edge case("방금 캐릭터·날짜를
  바꿔 아직 준비가 안 된 상태에서 곧바로 쓰기를 눌러도 정상 완성").

### Implementation for User Story 1

- [X] T009 [US1] `src/inference/on-device.ts`의 `createOnDeviceBackend()`가
  반환하는 객체에 `prepare(character: Character): Promise<void>`를
  메서드로 추가한다(`StoppableBackend`를 `prepare`·`release`까지 포함하는
  형태로 확장 — 새 타입 이름을 만들지 않고 기존 반환 객체 리터럴에 두
  메서드를 더하는 것으로 확정한다, `/speckit-analyze` F5 수정). `engine`이
  `undefined`면 즉시 반환. `engine.load(character)` → 실패 시 조용히
  반환(E13) → 성공 시 `engine.prewarm(character)` → **`unload()`를
  부르지 않는다**(E12). (T007 통과)
- [X] T010 [US1] 같은 객체에 `release(): Promise<void>`를 메서드로
  추가한다 — `engine?.unload()`를 위임한다(E14). (T007 통과)
- [X] T011 [US1] `src/ui/DiaryHomeScreen.tsx`에 "사진을 읽지 않는 날인가"를
  판정하는 로직을 추가한다 — `generate()`가 이미 쓰는 조건
  (`request.vision !== "none" && vision !== undefined` 계열, 파이프라인이
  `signals.photos`로 판단하는 것)과 **반드시 같은 판단**을 쓴다(FR-005의
  Assumptions — 새 판단 기준을 만들지 않는다). 판정 결과를 재사용할 수 있게
  얇은 헬퍼로 뽑아도 좋다.
- [X] T012 [US1] `DiaryHomeScreen.tsx`에 `useEffect`를 추가한다 —
  `screen.kind === "list"`이고 `selection.kind !== "none"`이고
  T011의 판정이 "사진 없음"인 경우에만 `pipeline`(또는 새로 전달받는
  `inference.prepare`)의 `prepare(selection.character)`를 부른다.
  `chosenDay`·`selection`이 바뀔 때마다 재평가된다(009가 `chosenDay`를
  다루는 것과 같은 훅 의존성 패턴). (T008 통과)
- [X] T013 [US1] `DiaryHomeScreen.tsx`의 기존 `AppState` 구독
  (`useEffect`, [DiaryHomeScreen.tsx:171-178])을 확장하거나 새 구독을
  추가해, `state !== "active"`일 때 `release()`도 함께 부른다(FR-008). 화면이
  `list` 상태를 벗어나는 경우(다른 화면으로 전환)도 함께 처리해야 하면
  화면 전이 지점(`openItem`, `write` 등)에서 `release()`를 부르는 것도
  검토한다 — 다만 **생성이 막 시작된 경우(`write()` → `generate()`)에는
  `release()`를 부르면 안 된다**(방금 `prepare()`가 연 컨텍스트를
  `generate()`의 `load()`가 재사용해야 하므로). (T008 통과)
- [X] T014 [US1] `DiaryHomeScreenProps`에 `prepare?: (character: Character)
  => Promise<void>`와 `release?: () => Promise<void>` (또는 하나의
  `inference` 객체)를 추가하고, 이를 실제로 배선하는 조립 지점(App.tsx 또는
  해당 조립 파일)에서 `onDeviceBackend()`가 노출하는 T009·T010의 함수를
  전달한다. **옵셔널이다** — 006·007이 확립한 관례(`onSelectVision?` 등)와
  같은 방식으로, 배선이 끊겨도 앱이 죽지 않고 "느릴 뿐" 정상 동작해야
  한다(FR-007).

**Checkpoint**: User Story 1이 독립적으로 완전히 동작한다.
`npm run test:logic && npm run test:ui`가 초록불이다. quickstart.md 검증
1·2를 실기기(debug)에서 1회 수행해 시간이 뚜렷하게 줄었는지, 화면 이탈 후
정상 동작하는지 확인한다.

---

## Phase 4: User Story 2 - 사진 있는 날에도 대기가 짧아진다 (Priority: P2)

**Goal**: 사진이 있는 날에도, 사진을 먼저 다 읽은 뒤에만 준비를 시작해 E1을
지키면서 전체 대기(사진 읽기 + 글쓰기)를 뚜렷하게 줄인다.

**Independent Test**: quickstart.md 검증 3·4·5 — 사진이 있는 날에서 자연스러운
대기 후 전체 시간 비교, 사진 읽기 도중 "쓰기"를 눌러도 정상 완성, 날짜를
바꾸면 이전 날짜의 캡션이 섞이지 않음.

### Tests for User Story 2 ⚠️

- [X] T015 [P] [US2] `on-device.ts`의 `generate()`가 `seen?: PhotoVision`을
  선택적으로 받아 이미 읽어 둔 결과를 재사용하는 테스트를
  `__tests__/inference/on-device.test.ts`에 추가한다 — `seen`이 주어지면
  `readPhotos()`(및 그 내부의 vision engine load)를 다시 부르지 않는지,
  `seen`이 없으면 기존과 동일하게 스스로 읽는지(회귀 없음), `seen`을 쓴
  경로에서는 `timing.visionMs`가 없는지(FR-010, 기존 T4 불변식 재사용).
- [X] T016 [P] [US2] 사진 읽기와 준비가 겹치지 않는 순서(E1·E15)를
  검증하는 테스트를 `__tests__/inference/on-device.test.ts` 또는
  `__tests__/ui/DiaryHomeScreen.test.tsx`에 추가한다 — 사진이 있는 날에는
  vision 엔진이 완전히 닫힌(unload) 뒤에만 `engine.prewarm()`이 호출되는지,
  두 엔진이 동시에 열려 있는 시점이 코드 경로상 존재하지 않는지(mock
  호출 순서로 확인).
- [X] T017 [US2] "사진 읽기 도중 쓰기를 누름" 시나리오 테스트를
  `__tests__/ui/DiaryHomeScreen.test.tsx`에 추가한다(FR-006a, E16) — 진행
  중이던 캡션 `Promise`가 새로 시작되지 않고(캡션 함수 호출 횟수 1회),
  그 `Promise`가 resolve된 뒤에 `generate()`가 그 결과를 받아 불리는지.
- [X] T018 [US2] "날짜를 바꾸면 이전 캡션이 폐기된다" 테스트를
  `__tests__/ui/DiaryHomeScreen.test.tsx`에 추가한다(FR-009) — 날짜 A에서
  캡션을 받은 뒤 날짜 B로 바꾸고 "쓰기"를 누르면, `generate()`에 넘겨지는
  `seen`이 A의 것이 아니거나(`undefined`라 다시 읽음) B의 것이어야 하며,
  A의 캡션이 섞이지 않는지.
- [X] T018a [P] [US2] `seen`이 `pipeline.run()` → `deps.backend.generate()`까지
  실제로 전달되는 테스트를 `__tests__/diary/pipeline.test.ts`에 추가한다
  (`/speckit-analyze` F1 수정) — `PipelineInput.seen`을 채워 `run()`을
  부르면 가짜(mock) `backend.generate()`가 세 번째 인자로 그 값을 받는지,
  `seen`을 안 주면 `undefined`(또는 인자 자체를 생략)로 불리는지(회귀
  없음). **아직 `PipelineInput`에 `seen` 필드가 없으므로 이 시점에는
  타입 에러 또는 실패로 확인된다.**

### Implementation for User Story 2

- [X] T019 [US2] `src/inference/types.ts`의 `InferenceBackend.generate()`
  계약에 **기존 `onStage?` 뒤에** 세 번째 옵셔널 인자
  `seen?: PhotoVision`을 추가한다(data-model.md §4 — 위치가 바뀌면
  두 인자로 부르는 기존 호출부가 깨진다). `PhotoVision`을
  `../vision/types`에서 import한다.
- [X] T019a [US2] `src/diary/pipeline.ts`의 `PipelineInput`에
  `seen?: PhotoVision`을 추가하고, `runStages()`의
  `deps.backend.generate(request.request, onProgress)` 호출을
  `deps.backend.generate(request.request, onProgress, input.seen)`으로
  고친다(data-model.md §5, `/speckit-analyze` F1 수정). 파이프라인은
  `seen`의 내용을 해석하지 않고 그대로 통과시킨다. (T018a 통과)
- [X] T020 [US2] `src/inference/on-device.ts`의 `generate()` 시그니처를
  `generate(request: DiaryRequest, onStage?, seen?: PhotoVision)`으로
  넓힌다(T019와 같은 인자 순서). `seen`이 주어지면 기존 "0b. 사진을
  읽는다" 블록([on-device.ts:293-333])을 건너뛰고 그 값을 그대로 쓴다
  (`visionMs`를 대입하지 않음 — T015가 확인). `seen`이 없으면 기존 로직
  그대로(회귀 없음). (T015 통과)
- [X] T021 [US2] `on-device.ts`에 사진 캡션만 수행하는 헬퍼를 화면이 부를 수
  있게 노출한다 — 기존 `readPhotos()`(현재 모듈 비공개 함수)를
  `captionPhotosFor(request): Promise<VisionOutcome>` 같은 이름으로
  export하거나, `VisionSupport`를 어댑터가 캡슐화한 것을 그대로 재사용하는
  방식으로 화면이 "사진 읽기"만 독립적으로 트리거할 수 있게 한다. 기존
  E2 불변식(연 것을 반드시 닫는다)을 그대로 유지한다.
- [X] T022 [US2] `DiaryHomeScreen.tsx`에 "사진이 있는 날"에 대한
  준비 흐름을 추가한다 — 캐릭터·날짜가 정해지고 T011의 판정이 "사진 있음"이면
  T021의 캡션 함수를 호출해 그 `Promise`를 컴포넌트 상태(`useRef` 또는
  `useState`)에 보관한다. 완료되면 그 결과(`seen`)를 보관하고, **그 뒤에만**
  `prepare(selection.character)`를 부른다(E1·E15 순서, FR-006). (T016 통과)
- [X] T023 [US2] `write()`/`generate()` 핸들러(`DiaryHomeScreen.tsx`)를
  수정해, 보관 중인 캡션 `Promise`가 아직 안 끝났으면 `await`한 뒤 그
  결과를 `pipeline.run({ ...prompt, seen }, onProgress)`에 실어 넘기도록
  한다(FR-006a, E16) — 새 취소 로직을 추가하지 않고 기존 `Promise`를
  그대로 기다린다. `PipelineInput`이 T019a에서 `seen`을 받도록 넓어진
  것을 전제로 한다. (T017·T018a 통과)
- [X] T024 [US2] `chosenDay`(또는 상응하는 날짜 상태)가 바뀌면 보관 중인
  캡션 상태를 무효화하는 로직을 추가한다(FR-009) — 진행 중이던 캡션 결과가
  나중에 도착해도 그것이 "지금 선택된 날짜"에 대한 것인지 확인해 아니면
  버린다(요청 시점의 날짜를 클로저에 담아 비교하는 방식으로 충분하다,
  data-model.md §2 「생명주기 4」). (T018 통과)

**Checkpoint**: User Story 1과 2 모두 독립적으로 동작한다.
`npm run test:logic && npm run test:ui`가 초록불이다. quickstart.md 검증
3·4·5를 실기기(debug)에서 1회 수행한다(User Story 1의 검증과 같은 세션에서
이어서 수행 가능 — AGENTS.md 「최소 한 번」 기준).

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 두 스토리 모두에 걸친 마감 작업.

- [X] T025 `npm run lint`(eslint + tsc + 헌법 검사 + prettier)를 실행해
  전부 통과하는지 확인한다.
- [X] T026 위반 주입 확인 — contracts/prewarm-engine.md와
  contracts/prompt-prefix.md의 "테스트로 확인해야 하는 것 → 위반 주입"
  항목을 실제로 수행한다: `prewarm()`이 실수로 값을 반환하도록 임시로
  고쳐 `tsc`가 잡는지, `fixedHead()`에 날짜를 임시로 섞어 P10 테스트가
  잡는지, 두 캐릭터 이름을 임시로 같게 만들어 P11 테스트가 잡는지 확인한 뒤
  되돌린다.
- [X] T027 [P] FR-011(모델 식별자·성능 수치를 사용자 화면에 노출 금지)·
  FR-012(비교·평균·순위·자동 채점 금지) 확인 — 이번 기능이 손댄 화면
  코드(`DiaryHomeScreen.tsx`)와 새 계약(`prewarm()`, E11)을 다시 훑어
  캐릭터 식별자·모델 이름·소요 시간·단계 이름을 사용자에게 새로 노출하는
  텍스트나 UI가 없는지 확인한다(`/speckit-analyze` F4 수정 — `prewarm()`이
  반환값이 없다는 구조적 방어와 별개로, 화면 쪽에 새 노출이 없는지 사람이
  직접 확인한다).
- [X] T028 quickstart.md 전체(검증 1~5)를 실기기(debug, 1회)에서 순서대로
  수행하고 결과를 기록한다 — AGENTS.md 「건너뛴 실기기 테스트는 통과가
  아니다」 기준. **2026-08-27 SM-S901N(Galaxy S22)에서 확인**:
  검증1(즉시 36초 vs 40초 대기 27초, 방향은 맞으나 절감폭은 my-ollama
  원 실측보다 작음 — 아래 「018 실기기 확인」 참고), 검증2(화면 이탈 후
  복귀, 41초로 정상 완성, 이상 없음), 검증3(사진 3장, 캡션 18초+작성
  59초, 사진 내용 정확히 반영), 검증4(캡션 도중 쓰기, 20초+59초, 재로드
  흔적 없음), 검증5(날짜 A→B 전환, B의 사진만 반영되고 A 내용 섞임
  없음) 전부 통과.
- [X] T029 [P] AGENTS.md의 「007~014 기능별 핵심 결론」 절과 같은 형식으로
  이번 기능(018)의 핵심 결론(실측 절감치, E1 준수 방식, 실기기 확인 결과)을
  AGENTS.md에 짧게 추가한다(저장소 관례 — 매 기능이 결론을 압축해 남김).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존 없음
- **Foundational (Phase 2)**: Setup 이후. **모든 사용자 스토리를 막는다** —
  `promptPrefix()`와 `prewarm()` 계약 없이는 어느 스토리도 시작할 수 없다.
- **User Story 1 (Phase 3)**: Foundational 완료 후 시작 가능. 다른
  스토리에 의존하지 않는다.
- **User Story 2 (Phase 4)**: Foundational 완료 후 시작 가능하나, **T009·
  T010(User Story 1이 만드는 `prepare()`/`release()`)을 재사용한다** — 완전히
  독립적이지 않고 US1의 산출물 위에 얹는다(원 문서의 "1단계가 2단계의
  발판" 관계를 그대로 반영). US1을 먼저 완료하는 것을 권장한다.
- **Polish (Phase 5)**: 원하는 모든 사용자 스토리 완료 후.

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 이후 시작. 독립적으로 완결된다(MVP).
- **User Story 2 (P2)**: Foundational 이후 시작 가능하나, T009·T010(US1의
  `prepare()`/`release()`)에 의존한다. US1 완료를 전제로 순서대로 진행하는
  것을 권장(병렬 개발 시에는 US1의 T009·T010만 먼저 합의된 시그니처로
  고정해 두면 병행 가능).

### Within Each User Story

- 테스트를 먼저 쓰고 실패를 확인한다 → 구현 → 테스트 통과 확인
- 계약(engine-port.ts, prompt.ts) 확장이 구현보다 먼저다(Foundational에서
  이미 완료)
- 화면 배선(props 확장)이 화면 로직(useEffect)보다 먼저이거나 함께

### Parallel Opportunities

- T002·T003 (계약 테스트, 서로 다른 파일) 병렬 가능
- T007·T008 (US1 테스트, 서로 다른 파일) 병렬 가능
- T015·T016·T018a (US2 테스트, 서로 다른 파일 — `on-device.test.ts` 대
  `pipeline.test.ts`) 병렬 가능
- T019·T019a (계약 확장, 서로 다른 파일 — `types.ts` 대 `pipeline.ts`)
  병렬 가능하나, 둘 다 T020보다 먼저 끝나야 한다
- T027·T029은 다른 마감 작업과 병렬 가능(리뷰·문서 전용, 코드 변경 없음)

---

## Parallel Example: Foundational

```
Task: "prompt.ts 접두사 계약 테스트를 __tests__/diary/prompt.test.ts에 추가"
Task: "engine-port.ts prewarm 계약 테스트를 __tests__/inference/llama-port.test.ts에 추가"
```

## Parallel Example: User Story 1

```
Task: "on-device.ts prepare/release 계약 테스트를 __tests__/inference/on-device.test.ts에 추가"
Task: "DiaryHomeScreen.tsx 준비 트리거·해제 테스트를 __tests__/ui/DiaryHomeScreen.test.tsx에 추가"
```

---

## Implementation Strategy

### MVP First (User Story 1만)

1. Phase 1: Setup 완료
2. Phase 2: Foundational 완료(계약 확장 — CRITICAL, 모든 스토리를 막음)
3. Phase 3: User Story 1 완료
4. **멈추고 검증**: quickstart.md 검증 1·2를 실기기에서 수행. 사진 없는
   날에서 대기 시간이 뚜렷하게 줄었는지 확인
5. 이 시점에서 이미 사용자가 체감하는 개선이 나온다(원 제안 문서의
   "1단계는 발판이며 단독으로도 회귀가 없다"를 그대로 만족)

### Incremental Delivery

1. Setup + Foundational → 계약 확장 완료
2. User Story 1 추가 → 독립 검증 → (원하면 여기서 배포/시연 — MVP)
3. User Story 2 추가 → 독립 검증 → 전체 배포
4. 두 스토리 모두 서로를 깨지 않는다 — US2는 US1의 산출물(`prepare`/
   `release`)을 재사용할 뿐 US1의 동작을 바꾸지 않는다

---

## Notes

- [P] 작업 = 다른 파일, 완료되지 않은 작업에 의존하지 않음
- [Story] 라벨이 작업을 스토리에 연결한다(추적성)
- 각 계약 테스트는 구현 전에 실패해야 한다 — 실패를 확인하지 않고 구현부터
  하면 "테스트가 실제로 그 방어를 검증하는가"를 확인할 길이 없다
- 커밋은 한국어로(AGENTS.md), 논리적 단위마다
- 각 체크포인트에서 멈춰 스토리를 독립적으로 검증할 수 있다
- 피할 것: 모호한 작업, 같은 파일 충돌, 스토리 간 독립성을 깨는 교차 의존
- **바이트 동일성이 이 기능의 가장 조용한 실패 지점이다**(T004) — 접두사가
  `buildPrompt()`와 한 글자라도 어긋나면 기능 전체가 "느려질 뿐 오류
  없이" 무의미해진다. T004 직후 반드시 기존 `prompt.test.ts` 전체를
  재실행해 회귀가 없는지 확인한다.
