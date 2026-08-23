# Tasks: 쓰는 중 독백

**Input**: Design documents from `/specs/015-writing-monologue/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: 이 프로젝트의 「개발 방식」(AGENTS.md)이 "계약을 먼저 정하고
테스트를 먼저 쓴다"를 관례로 못박았으므로 테스트 태스크를 포함한다 — 각
구현 태스크 앞에 대응하는 실패하는 테스트를 먼저 쓴다.

**Organization**: Foundational(콜백·타입·선택 로직 배선, 두 User Story가
공유)이 먼저, 그다음 User Story별로 화면 동작을 완성한다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일, 의존성 없음 — 병렬 가능
- **[Story]**: US1(P1) / US2(P2) / F(Foundational, 모든 스토리가 의존)

## Path Conventions

Single project — `src/`, `__tests__/`, `.maestro/`가 저장소 루트에 있다
(plan.md Project Structure 참조).

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: 진행 신호(단계 전환 + 사진 장 전환)를 만들고 나르는 타입·콜백
배선, 그리고 문구 후보를 순환 선택하는 로직. User Story 1·2 둘 다 이것 없이는
검증 불가능하다.

**⚠️ CRITICAL**: 이 phase 완료 전에는 어느 User Story도 화면에서 확인할 수
없다.

### 타입 (contracts/progress-signal.md, data-model.md)

- [X] T001 [F] `src/inference/types.ts`에 `ProgressStage = "signals" |
  "vision" | "generation"` 타입을 추가한다. `InferenceBackend.generate()`
  시그니처에 옵셔널 두 번째 인자 `onStage?: (stage: ProgressStage) => void`를
  더한다(data-model.md 「onStage 콜백」).
- [X] T002 [P] [F] `__tests__/inference/types.test.ts`에 `ProgressStage`가
  문자열 리터럴 유니온뿐인지(숫자·객체 필드 없음) 소스 선언을 직접 읽어
  검사하는 계약 테스트를 추가한다(jest가 타입을 지우므로 007 이후 관례를
  따른다). **먼저 실패를 확인한 뒤** T001을 완성해 통과시킨다.

### on-device.ts 배선 (contracts/progress-signal.md 「누가 언제 보내는가」)

**★ 2026-08-23 `/speckit-analyze` C1 정정**: `on-device.ts`의 `generate()`는
`"vision"`을 직접 보내지 않는다 — 보내면 아래 caption.ts 배선(T007)의
`onPhotoStart`와 이중 발화한다. `generate()`가 직접 보내는 신호는
`"generation"` 하나뿐이다.

- [X] T003 [F] `__tests__/inference/on-device.test.ts`에 다음 테스트를
  추가한다(**먼저 작성해 실패를 확인**):
  - `runWithTimeout()`(→`engine.run()`) 직전에 `onStage`가 `"generation"`으로
    불린다.
  - `generate()`가 `onStage`를 그대로 `readPhotos()`에 전달한다(대역
    `readPhotos`/`vision.engine`을 통해 간접 확인 — `"vision"` 자체의 발화
    검증은 T005가 `caption.test.ts`에서 더 정확히 한다).
  - `onStage`를 안 넘겨도 기존 성공/실패 경로가 그대로 동작한다(옵셔널 확장).
- [X] T004 [F] `src/inference/on-device.ts`의 `generate()`를 고친다:
  `runWithTimeout()` 호출 직전(304행 근방)에 `onStage?.("generation")`을
  추가한다. **`readPhotos()` 호출부에는 `onStage?.("vision")`을 추가하지
  않는다** — `readPhotos()`가 `onStage`를 그대로 전달받아 T007에서 사진
  전환 콜백으로 감싼다(**`readPhotos()`의 시그니처에 `onStage` 인자를
  추가하고 `generate()`의 호출부를 그에 맞춰 고치는 것은 T007의 몫이다**
  — T004는 `generate()` 안에 `"generation"` 신호를 추가하는 것만 한다).
  T003의 테스트가 통과해야 한다.

### caption.ts 사진 전환 배선 (contracts/photo-advance.md) — ★ 신규,
### `"vision"` 신호의 유일한 발생원

- [X] T005 [P] [F] `__tests__/vision/caption.test.ts`에 다음 테스트를
  추가한다(**먼저 작성해 실패를 확인**) — **SC-006 근거**:
  - 사진 N장으로 `captionAll()`을 호출하면 `onPhotoStart`가 정확히 N번
    불린다(N=1, N=3, **N=0**(호출 자체가 안 일어나는 경로) 세 경우).
  - `onPhotoStart`가 인자 없이(`() => void`) 호출된다.
  - 그만두기(`cancel.cancelled`)로 3장 중 2번째에서 중단되면
    `onPhotoStart`가 2번만 불린다.
  - `onPhotoStart`를 안 넘겨도 기존 `caption.test.ts` 테스트가 그대로
    통과한다(옵셔널 확장).
- [X] T006 [F] `src/vision/caption.ts`의 `captionAll()` 시그니처에 옵셔널
  마지막 인자 `onPhotoStart?: () => void`를 추가하고, `for` 루프의 취소
  검사(78행) 직후·경로 해석 이전에 `onPhotoStart?.()`를 호출한다
  (data-model.md 「사진 전환 신호」). T005의 테스트가 통과해야 한다.
- [X] T007 [F] `src/inference/on-device.ts`의 `readPhotos()`를 고쳐:
  (a) 시그니처에 `onStage?: (stage: ProgressStage) => void` 인자를 추가하고
  `generate()`가 자신이 받은 `onStage`를 그대로 넘기도록 호출부를 고친다,
  (b) 받은 `onStage`로부터 `captionAll()`에 넘길 `onPhotoStart`를 만든다
  (`onStage === undefined ? undefined : () => onStage("vision")`,
  contracts/photo-advance.md 「신호 흐름」). **이 함수가 `"vision"`을 보내는
  유일한 경로임을 테스트로 못박는다**: `__tests__/inference/on-device.test.ts`
  에 "vision='quick'·사진 1장 → `onStage`가 정확히 1번만 `'vision'`으로
  불린다(2번이 아니다)"를 추가해 T004와의 이중 발화가 없음을 확인한다.

### 독백 문구 선택 (contracts/monologue.md) — ★ 순환/무작위 로직으로 확장

- [X] T008 [P] [F] `__tests__/diary/monologue.test.ts`를 작성한다(**먼저
  작성해 실패를 확인**) — **SC-007 근거**:
  - `ProgressStage` 세 갈래 전부에 후보가 정확히 2개 이상 있는지.
  - 모든 후보 문구에 숫자(`/\d/`)가 없는지.
  - 같은 단계로 여러 번 연속 호출(매번 직전 결과를 `previous`로 넘김)했을
    때 연속된 두 결과가 절대 같지 않은지(결정론적 `random` 함수를 주입해
    검증) — SC-007 근거.
  - `monologue.ts`의 소스가 `roster.ts`·`persona.ts`·`Character`를
    import하지 않는지(소스 텍스트 직접 검사, 007 이후 관례).
  - **후보가 1개뿐인 케이스는 테스트하지 않는다** — 후보 테이블 타입이
    최소 2개 원소 튜플이므로 그런 입력 자체를 만들 수 없다(2026-08-23
    `/speckit-analyze` C3 정정, data-model.md 참조).
- [X] T009 [F] `src/diary/monologue.ts`를 새로 만든다:
  `pickMonologue(stage, previous, random?): string`을 `Record<ProgressStage,
  readonly [string, string, ...string[]]>`(최소 2개 원소 튜플) 후보 테이블
  기반으로 구현한다(data-model.md 「MonologueLine」, contracts/monologue.md
  「선택 규칙」). 각 단계 후보는 서로 다른 서술어로 2개 이상 준비한다
  (contracts/monologue.md 초안 표 참고). T008의 테스트가 통과해야 한다.
- [X] T010 [F] `npm run lint`(헌법 검사 포함)를 돌려 `monologue.ts`가
  새 위반을 만들지 않는지 확인한다. quickstart.md의 위반 주입 절차(일부러
  `persona.ts`를 import했다 되돌리기)로 검사가 실제로 잡는지 1회 확인한다.

### pipeline.ts 배선 (contracts/progress-signal.md)

- [X] T011 [P] [F] `__tests__/diary/pipeline.test.ts`에 다음 테스트를
  추가한다(**먼저 작성해 실패를 확인**):
  - `run(input, onProgress)`을 부르면 `loadSignals()` 호출 전에
    `onProgress`가 `"signals"`로 불린다.
  - `onProgress`가 백엔드까지 그대로 전달된다(대역 백엔드가 받은 콜백을
    직접 호출해 확인).
  - `onProgress`를 안 넘겨도 기존 모든 테스트가 그대로 통과한다(옵셔널
    확장, 003·012 선례).
- [X] T012 [F] `src/diary/pipeline.ts`를 고친다: `Pipeline.run()`에 옵셔널
  `onProgress?: (stage: ProgressStage) => void` 인자를 추가하고,
  `runStages()`가 `loadSignals()` 호출 직전에 `onProgress?.("signals")`를
  보낸 뒤 `deps.backend.generate(request.request, onProgress)`로 그대로
  전달한다. T011의 테스트가 통과해야 한다.

**Checkpoint**: 진행 신호(단계 전환 + 사진 장 전환)가 `caption.ts` →
`on-device.ts` → `pipeline.ts` → 콜백 인자까지 완전히 배선됐고, 서술어가
겹치지 않는 문구 후보를 순환 선택하는 함수가 존재한다. 아직 화면에는
아무것도 안 보인다 — User Story 1이 그것을 한다.

---

## Phase 2: User Story 1 - 생성 중 지금 무엇을 하는지 안다 (Priority: P1) 🎯 MVP

**Goal**: 화면이 파이프라인 진행 신호를 받아, 단계가 바뀔 때마다 그리고
사진이 여러 장일 때 장이 바뀔 때마다 서로 다른 서술어의 독백 문구를 보여준다.

**Independent Test**: 사진이 여러 장 있는 하루로 일기 쓰기를 시작해 생성이
끝날 때까지 화면을 지켜본다. 단계가 바뀔 때마다, 그리고 사진을 한 장씩
넘어갈 때마다 문구가 서로 다른 서술어로 바뀌는 것을 확인한다(spec
Independent Test 그대로).

### Tests for User Story 1

- [X] T013 [P] [US1] `__tests__/app/state.test.ts`에 `"writing"` 화면
  상태가 `stage?: ProgressStage`·`line?: string` 필드를 가질 수 있는지,
  초기값이 두 필드 없이 시작할 수 있는지 검사하는 테스트를 추가한다
  (**먼저 작성해 실패를 확인**).
- [X] T014 [P] [US1] `__tests__/ui/diary-home.test.tsx`(신규 또는 기존
  파일에 추가)에 다음을 검사하는 테스트를 추가한다(**먼저 작성해 실패를
  확인**):
  - `pipeline.run`이 `onProgress`와 함께 불린다.
  - `onProgress("vision")`이 호출되면 화면에 사진 관련 독백 문구가 보인다.
  - `onProgress("vision")`이 연달아 여러 번 호출되면(사진 여러 장 시뮬레이션)
    매번 렌더된 문구가 직전과 다르다(FR-014).
  - vision="none"으로 생성하면 사진 관련 문구가 한 번도 렌더되지 않는다
    (FR-003, SC-002).
  - 렌더된 문구 어디에도 숫자가 없다(FR-004, FR-013).

### Implementation for User Story 1

- [X] T015 [US1] `src/app/state.ts`의 `AppScreen`에서 `"writing"` 갈래를
  `{ kind: "writing"; stage?: ProgressStage; line?: string }`로 확장한다
  (data-model.md 「AppScreen 확장」). 기존 `{ kind: "writing" }` 생성자
  호출부가 깨지지 않는지 확인한다(옵셔널 필드). T013의 테스트가 통과해야
  한다.
- [X] T016 [US1] `src/ui/DiaryHomeScreen.tsx`의 `generate()` 콜백에서
  `pipeline.run(input, onProgress)`을 부르도록 고친다 — `onProgress(stage)`는
  `setScreen((s) => { if (s.kind !== "writing") return s; const line =
  pickMonologue(stage, s.line); return { ...s, stage, line }; })`로 화면
  상태를 갱신하는 동기 함수로 구현한다(data-model.md, contracts/
  progress-signal.md 불변식 3 — 예외를 던지지 않는 얇은 콜백). 이 한 곳이
  `pickMonologue()`를 부르는 유일한 자리다(선택 로직은 monologue.ts,
  호출은 화면 — plan.md Summary 4 「문구 선택 로직은 화면 레이어에만」).
- [X] T017 [US1] `src/ui/DiaryHomeScreen.tsx`의 `"writing"` 케이스 렌더에
  `screen.line`을 `ActivityIndicator` 옆에 추가한다. `screen.line`이
  `undefined`이면(첫 신호 도착 전) 기존 "쓰고 있다" 문구를 그대로 보인다.
  T014의 테스트가 통과해야 한다.

**Checkpoint**: User Story 1이 독립적으로 완전히 동작한다 — 생성 화면에서
단계별·사진 장별 독백이 서로 다른 표현으로 실제로 보인다. 여기서 멈춰도
배포 가능한 증분이다.

---

## Phase 3: User Story 2 - 금방 끝나는 생성에서도 화면이 어색하지 않다 (Priority: P2)

**Goal**: 단계가 스쳐 지나가거나 신호가 아예 안 와도 화면이 깨지지 않고
정상 완료로 이어진다.

**Independent Test**: 가장 빠른 캐릭터로 생성을 반복 실행해, 독백이 스치듯
지나가거나 생략되어도 최종적으로 정상 완료 화면으로 이어지는지 확인한다
(spec Independent Test 그대로).

### Tests for User Story 2

- [X] T018 [P] [US2] `__tests__/ui/diary-home.test.tsx`에 다음을 검사하는
  테스트를 추가한다(**먼저 작성해 실패를 확인**):
  - `onProgress`가 한 번도 안 불려도(즉시 완료) 화면이 오류 없이 완료
    상태로 전환된다.
  - 마지막으로 받은 `stage`·`line`이 실패 화면 전환 후에는 남아있지 않다
    (FR-009, FR-011).
- [X] T019 [P] [US2] `__tests__/app/state.test.ts`에 실패 전환
  (`afterGeneration` 등 기존 실패 처리 함수)이 `stage`·`line` 필드를 실패
  화면 타입으로 옮기지 않는지(즉 실패 화면 타입에 두 필드가 아예 없는지,
  소스 선언 검사) 확인하는 테스트를 추가한다.

### Implementation for User Story 2

- [X] T020 [US2] `src/app/state.ts`의 실패 화면 갈래(`toFailed` 등)와
  `afterGeneration()`을 검토해, `"writing"`의 `stage`·`line` 필드가 다른
  화면 타입으로 새지 않는지 확인한다(타입 설계상 이미 분리되어 있다면 이
  태스크는 검증만 하고 코드 변경이 없을 수 있다 — data-model.md의 타입
  분리 원칙대로라면 자연히 지켜진다).
- [X] T021 [US2] `src/ui/DiaryHomeScreen.tsx`에서 `generate()`가 결과를
  받은 뒤(`afterGeneration(result)` 호출 시점) 이전 `stage`·`line`이
  화면에 남지 않고 즉시 다음 화면으로 전환되는지 확인한다 — 이미 T016에서
  `setScreen(afterGeneration(result))`가 `"writing"` 상태 자체를 다른
  화면으로 교체하므로 별도 정리 코드가 필요 없을 가능성이 높다(확인 후
  필요하면만 수정).

**Checkpoint**: User Story 1과 2 모두 독립적으로 동작한다.

---

## Phase 4: Polish & 실기기 검증

**Purpose**: 계약 문서가 요구한 마지막 확인들.

- [X] T022 [P] `.maestro/writing-monologue.yml`을 새로 작성하고
  `scripts/run-device-tests.mjs`의 `FLOWS`에 등록한다(등록하지 않으면 파일이
  있어도 실행기가 돌리지 않는다 — AGENTS.md 경고). 루이(narrative)+사진
  3장 이상인 하루로 quickstart.md A1~A5를 흐름으로 옮긴다.
- [X] T023 quickstart.md A1~A5를 실기기(debug 빌드, SM-G986N)에서 최소
  1회 수행한다: 단계 순서(A1), vision 끈 상태(A2), 실패 화면 전환(A3),
  그만두기(A4), 사진 여러 장에서 문구 연속 갱신(A5). 결과를 커밋 메시지
  또는 AGENTS.md 「015 핵심 결론」 절(기능 완료 후 추가)에 남긴다.
- [X] T024 [P] `npm test` 전체(기기 불필요 스위트)와 `npm run lint`를 돌려
  기존 002/003/005/006/007/011/012/013 계약 테스트가 전부 그대로 통과하는지
  최종 확인한다(옵셔널 확장이 기존 계약을 깨지 않았는지의 최종 게이트).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: 의존성 없음 — 즉시 시작. User Story 1·2 둘 다
  이 phase를 막는다(BLOCKS). 내부 순서: 타입(T001~T002) →
  on-device.ts(T003~T004) → caption.ts 사진 전환(T005~T007, on-device.ts의
  onStage에 의존) → monologue.ts(T008~T010, 독립적으로 병행 가능) →
  pipeline.ts(T011~T012, ProgressStage 타입에만 의존).
- **User Story 1 (Phase 2)**: Foundational 완료 후 시작. 다른 스토리에
  의존하지 않는다.
- **User Story 2 (Phase 3)**: Foundational 완료 후 시작 가능하지만, 실질적
  구현 대상(T020·T021)이 User Story 1이 만든 화면 코드를 검토·보강하는
  성격이라 **User Story 1 완료 후 진행을 권장**한다(완전히 독립적이지는
  않다 — spec Assumptions가 "핵심 가치가 아니라 마무리 품질"이라고 명시한
  이유와 같다).
- **Polish (Phase 4)**: 두 User Story 완료 후.

### Within Each Phase

- 테스트를 먼저 작성해 실패를 확인한 뒤 구현 태스크를 완성한다(AGENTS.md
  「개발 방식」).
- `[P]` 표시가 없는 태스크는 같은 파일을 건드리거나 앞 태스크의 산출물에
  의존하므로 순서대로 진행한다.

### Parallel Opportunities

- Phase 1에서 T002·T005·T008·T011은 서로 다른 테스트 파일이므로 병렬 작성
  가능(단, 각각이 대응하는 구현 태스크보다 먼저 끝나야 함). T008·T009
  (monologue.ts)는 T003~T007(on-device.ts·caption.ts 배선)과 파일이 겹치지
  않으므로 완전히 독립적으로 병행 가능하다.
- Phase 2의 T013·T014는 서로 다른 파일(state.test.ts vs
  diary-home.test.tsx)이므로 병렬 가능.
- Phase 4의 T022·T024는 서로 다른 관심사이므로 병렬 가능.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1(Foundational) 완료 — 진행 신호(단계+사진 전환)가 배선되고 순환
   선택 함수가 존재한다.
2. Phase 2(User Story 1) 완료 — 화면에서 실제로 단계별·사진 장별 독백이
   보인다.
3. **여기서 멈추고 검증**: quickstart A1·A2·A5를 실기기에서 수행한다.
4. 이 시점에 이미 로드맵이 요구한 기능의 본체가 배포 가능하다.

### Incremental Delivery

1. Foundational → User Story 1 → 실기기 확인(A1·A2·A5) → 배포 가능한 MVP.
2. User Story 2 → 실기기 확인(A3·A4, 특히 빠른 캐릭터로 반복 실행) → 완료.
3. Polish(Maestro 등록, 최종 회귀 테스트).

---

## Notes

- `[P]` 태스크 = 다른 파일, 의존성 없음.
- `[Story]` 라벨이 태스크를 User Story에 연결한다(추적성).
- 각 구현 태스크 앞의 테스트 태스크는 반드시 먼저 실패를 확인한다(AGENTS.md
  「개발 방식」 — 계약을 먼저 정하고 테스트를 먼저 쓴다).
- 한 축(예: on-device.ts 배선)에 머물지 않고 사진 전환·화면 문구까지 끝까지
  배선한다(AGENTS.md 「한 축을 깊게 파고들고 싶어지면 그것이 실패 신호다」).
- `PipelineStage`(실패 갈래)와 `ProgressStage`(진행 신호)를 어느 태스크에서도
  같은 타입으로 합치지 않는다.
- 사진 전환 신호는 `ProgressStage`의 새 값이 아니라 `"vision"`을 재사용해
  여러 번 보내는 것이다 — T007에서 이 판단을 뒤집지 않는다.
- **`"vision"`을 보내는 코드는 저장소 전체에서 정확히 한 곳(T007이 만드는
  `readPhotos()`의 `onPhotoStart` 배선)이어야 한다.** T004에서 `generate()`가
  `readPhotos()` 호출 전에 별도로 `"vision"`을 보내는 코드를 추가하지 않는다
  — 추가하면 사진 1장에서 신호가 2번 나가는 회귀가 재발한다(2026-08-23
  `/speckit-analyze` C1, 정정 완료).
- **`monologue.ts`의 문구 후보 테이블은 각 단계 최소 2개 원소를 타입으로
  강제한다**(`readonly [string, string, ...string[]]`). "후보 1개짜리
  안전판" 코드·테스트를 다시 추가하지 않는다(C3, 정정 완료) — 추가하면
  도달 불가능한 코드가 된다.
