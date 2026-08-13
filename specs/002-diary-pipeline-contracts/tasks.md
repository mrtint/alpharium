# Tasks: 일기 파이프라인의 축 사이 계약

**Input**: Design documents from `/specs/002-diary-pipeline-contracts/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: 테스트 작업을 **포함한다**. 헌법 「개발 방식」이 "계약을 먼저 정하고 테스트를 먼저
쓴다"를 MUST로 요구하고, 계약 4개가 검증 표를 이미 갖고 있다.

**Organization**: 작업은 사용자 스토리별로 묶여 독립적으로 구현·검증된다.

**이 기능은 실기기가 필요 없다.** 실제 추론도 실제 수집도 하지 않으므로 전부 기기 없이
검증된다(SC-003). 001과 다른 점이다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 미완료 의존 없음)
- **[Story]**: 해당 사용자 스토리 (US1~US5)
- 모든 작업에 정확한 파일 경로를 적는다

## Path Conventions

001의 구조를 그대로 쓰고 두 자리를 새로 연다. 저장소 루트 기준:

- 기존: `src/config/`, `src/inference/`, `src/diagnostics/`, `src/ui/`
- 신규: `src/signals/`, `src/diary/` — 001의 AGENTS.md가 예약해 둔 자리
- 테스트: `__tests__/`

---

## Phase 1: Setup (공유 기반)

**Purpose**: 새 자리를 열고 하루 경계를 정의한다. 04:00은 모든 축이 의존하는 값이다.

- [X] T001 `src/signals/`, `src/diary/`, `__tests__/signals/`, `__tests__/diary/` 디렉터리 생성 (plan.md 「Source Code」 구조대로)
- [X] T002 `__tests__/config/day-boundary.test.ts` 작성 — contracts/signals.md 「dayOf 검증 표」 6행과 「isDayClosed 검증 표」 4행. **00:30→전날, 03:59→전날, 04:00→당일 세 행이 FR-021의 방어선이다**
- [X] T003 `src/config/day-boundary.ts` 구현 — `dayOf(instant)`, `isDayClosed(day, now)`. **04:00이라는 값은 이 파일에만 존재한다**(FR-021a). `new Date()`를 함수 안에서 부르지 않는다 — 인자로 받아야 경계값을 테스트할 수 있다

**Checkpoint**: 하루의 경계가 한 곳에 정해졌고 테스트가 지킨다

---

## Phase 2: Foundational (차단 전제)

**Purpose**: 모든 스토리가 의존하는 타입. **이 단계 없이는 어떤 스토리도 시작할 수 없다.**

**⚠️ CRITICAL**: US1~US5 전부가 이 단계를 기다린다

- [X] T004 `src/signals/types.ts`에 `SignalValue<T>` 정의 — `known`/`none`/`unknown` 합 타입 (contracts/signals.md). **`unknown`은 값을 갖지 않고 `reason`을 담는다**
- [X] T005 [P] `src/diary/types.ts`에 `Character`, `VisionSetting` 정의 (contracts/diary.md). 캐릭터는 성질로만 두고 모델 식별자와 잇지 않는다(FR-008)
- [X] T006 [P] `src/diary/types.ts`에 `DiaryRequest`, `DiaryEntry` 정의. **모델 식별자·속도·점수 필드를 넣지 않는다**(FR-008, FR-013, 원칙 III·IV)

**Checkpoint**: 타입 계약이 정해졌다 — 스토리 작업 시작 가능

---

## Phase 3: User Story 1 - 하루치 신호가 하나의 모양으로 모인다 (Priority: P1) 🎯 MVP

**Goal**: "없음"과 "알 수 없음"을 타입으로 가른다. **이 기능에서 헌법 원칙 V가 걸리는
지점이다.**

**Independent Test**: 기기 없이 `npm test -- signals`로 전부 검증된다. 걸음 수 `unknown`이
0이 되지 않는지가 핵심.

**MVP인 이유**: 다른 모든 축이 `DaySignals`를 입력으로 받는다. 이것이 정해지지 않으면
요청도 일기도 만들 수 없다. 순수 타입이라 가장 빨리 끝난다.

### Tests for User Story 1 ⚠️ 먼저 쓰고, 실패를 확인한 뒤 구현한다

- [X] T007 [P] [US1] `__tests__/signals/signal-value.test.ts` — contracts/signals.md 「SignalValue 검증 표」 4행. `none`과 `unknown`이 다른 값임을 명시적으로 검증한다(FR-002)
- [X] T008 [P] [US1] `__tests__/signals/day-signals.test.ts` — 「DaySignals 검증 표」 4행. **모든 신호가 `unknown`이거나 `none`인 하루도 유효하다**(FR-005b)

### Implementation for User Story 1

- [X] T009 [US1] `src/signals/types.ts`에 `DaySignals` 정의 — photos/places/steps/battery/connectivity 각각 `SignalValue<T>`, 그리고 `date: DayDate` (FR-001, FR-004)
- [X] T010 [US1] `src/signals/fake.ts` 작성 — 풍성한 하루·빈 하루·일부만 `unknown`인 하루 세 가지 이상. **제품 경로가 아니라는 경계를 파일 주석에 남긴다**(contracts/signals.md). 헌법 원칙 I의 "미리 만들어 둔 응답"으로 자라지 않게 한다
- [X] T011 [US1] 기본값 대체 함수가 없는지 확인 — `valueOr(signal, 0)` 같은 편의 함수를 만들지 않는다(FR-003). 만드는 순간 걸음 수가 0이 되어 "걷지 않았다"는 거짓이 된다

**Checkpoint**: 모르는 것을 0으로 채우지 않는다는 것이 타입으로 강제된다

---

## Phase 4: User Story 2 - 일기 생성 요청의 모양이 정해진다 (Priority: P1)

**Goal**: 신호 + 캐릭터 + 시각 설정이 하나의 요청이 된다. 추론 어댑터가 받는 입력이다.

**Independent Test**: 요청을 만들어 필요한 것이 담겼는지, 모델 식별자가 없는지 확인한다.

### Tests for User Story 2 ⚠️ 먼저 쓴다

- [X] T012 [P] [US2] `__tests__/diary/request.test.ts` — contracts/diary.md 「DiaryRequest 검증 표」 4행. 캐릭터 없으면 `no-character`로 거부되고, **신호가 비어도 요청이 만들어진다**(FR-005b, FR-007)
- [X] T013 [P] [US2] 같은 파일에 모델 식별자 부재 검증 추가 — 요청 객체를 문자열로 만들어 모델 이름이 나오지 않는지 본다(FR-008, SC-005)

### Implementation for User Story 2

- [X] T014 [US2] `src/diary/request.ts`에 `buildRequest(signals, character, vision)` 구현 — `RequestResult` 합 타입 반환 (contracts/diary.md). 신호의 양으로 거부하지 않는다(FR-005a)

**Checkpoint**: 추론 어댑터가 받을 입력의 모양이 정해졌다

---

## Phase 5: User Story 3 - 생성된 일기의 모양이 정해진다 (Priority: P1)

**Goal**: 추론 어댑터에 `generate()` 계약을 더한다. **구현은 "아직 없음"을 반환한다** —
가짜 일기를 만들지 않는다.

**Independent Test**: `generate()`가 `not-implemented`를 반환하고, **실패 결과에 텍스트가
없는지** 확인한다. 이 기능에서 가장 중요한 검증이다.

### Tests for User Story 3 ⚠️ 먼저 쓴다

- [X] T015 [P] [US3] `__tests__/inference/generate.test.ts` — 온디바이스·데스크톱 모두 `{ kind: 'not-implemented' }` 반환 (contracts/diary.md 「추론 어댑터 검증 표」)
- [X] T016 [P] [US3] 같은 파일에 **실패 결과에 텍스트가 없음**을 검증 — `GenerationFailure`의 어느 갈래에도 `text` 필드가 없어야 한다(FR-016, SC-004). **이것이 헌법 원칙 I의 방어선이다**
- [X] T017 [P] [US3] `__tests__/diary/entry.test.ts` — `DiaryEntry`에 모델 식별자·속도·점수 필드가 없음을 검증 (FR-013, 원칙 III·IV)

### Implementation for User Story 3

- [X] T018 [US3] `src/inference/types.ts`에 `DiaryDraft`, `GenerationFailure` 정의하고 `InferenceBackend`에 `generate()` 추가 (FR-014). **`isAvailable()`은 001 그대로 둔다**
- [X] T019 [P] [US3] `src/inference/on-device.ts`에 `generate()` 구현 — `not-implemented` 반환 (FR-015). 예외를 던지지 않고 텍스트도 만들지 않는다
- [X] T020 [P] [US3] `src/inference/desktop-server.ts`에 `generate()` 구현 — `not-implemented` 반환 (FR-015)
- [X] T021 [US3] 001의 기존 테스트가 여전히 통과하는지 확인 — `InferenceBackend`를 확장했으므로 회귀가 없어야 한다

**Checkpoint**: 추론 경계가 정해졌고, 가짜 일기가 나오지 않는다

---

## Phase 6: User Story 5 - 생성된 일기가 남고 다시 보인다 (Priority: P3, 앞당김)

**Goal**: 저장·조회·존재 확인. 파이프라인이 마지막 단계에서 이것을 부른다.

**Independent Test**: 저장하고 꺼내 같은 값인지, **`unknown`이 왕복 후에도 살아 있는지**
확인한다.

**P3인데 앞당기는 이유**: 파이프라인(US4)의 마지막 단계가 저장이다. 저장 계약이 없으면
파이프라인을 완성할 수 없다. 명세의 우선순위는 사용자 가치 기준이고, 여기서는 의존 순서를
따른다.

### Tests for User Story 5 ⚠️ 먼저 쓴다

- [X] T022 [P] [US5] `__tests__/diary/store.test.ts` — contracts/storage.md 「검증 표」 8행. 메모리 대역으로 돈다
- [X] T023 [P] [US5] 같은 파일에 **직렬화 왕복 테스트** 추가 — 저장 후 꺼냈을 때 `SignalValue`의 `unknown`이 `null`로 뭉개지지 않는지 검증 (SC-007, 원칙 V). **놓치기 쉬운 지점이며, 뭉개지면 "모름"이 "없음"이 된다**

### Implementation for User Story 5

- [X] T024 [US5] `src/diary/store.ts`에 `DiaryStore` 인터페이스 정의 — `save`/`load`/`has`/`listDays` (contracts/storage.md). `SaveResult`에 `overwrote`를 담아 덮어쓴 사실이 드러나게 한다(FR-023a)
- [X] T025 [P] [US5] 같은 파일에 메모리 구현 추가 — 테스트와 파이프라인 검증용
- [X] T026 [US5] `src/diary/store.ts`에 파일 구현 추가 — `expo-file-system`의 `File`/`Paths`로 `Paths.document` 아래 날짜별 JSON (research.md §3). **임시 파일에 쓰고 옮겨** 새 저장이 실패해도 기존 일기가 남게 한다(FR-023b)

**Checkpoint**: 일기가 남고 다시 나온다. `unknown`이 왕복에서 살아남는다

---

## Phase 7: User Story 4 - 파이프라인이 끝에서 끝까지 이어진다 (Priority: P2)

**Goal**: 신호 → 요청 → 생성 → 저장이 하나의 진입점으로 이어진다. 어느 단계에서 멈췄는지
드러난다.

**Independent Test**: 가짜 신호로 파이프라인을 돌려 `generation` 단계에서 멈추는지 확인한다.
그것이 이 기능에서의 정상 동작이다.

### Tests for User Story 4 ⚠️ 먼저 쓴다

- [X] T027 [P] [US4] `__tests__/diary/pipeline.test.ts` — contracts/pipeline.md 「검증 표」 6행. 각 단계의 실패가 해당 `stage`로 보고되는지 확인한다(FR-019, SC-006)
- [X] T028 [P] [US4] 같은 파일에 하루 경계 검증 추가 — 닫히지 않은 하루는 `day-not-closed`로 거부된다(FR-018c, SC-010)
- [X] T029 [P] [US4] 같은 파일에 중복 실행 검증 추가 — 같은 하루가 진행 중이면 `already-running`(FR-018d). 끝나면 진행 중에서 빠지는지도 확인한다

### Implementation for User Story 4

- [X] T030 [US4] `src/diary/pipeline.ts`에 `runPipeline(input)` 구현 — `day`/`now`/`character`/`vision`을 인자로 받는다. **`now`를 인자로 받아 실행 시점을 모른 채 동작한다**(FR-018a). 스스로 현재 시각을 읽지 않는다
- [X] T031 [US4] 단계 순서와 중단 구현 — 앞 단계가 실패하면 뒤를 시도하지 않는다. **생성 실패 시 저장을 부르지 않아야 기존 일기가 보존된다**(FR-023b)
- [X] T032 [US4] 신호 공급·추론 어댑터·저장을 주입받게 한다 (FR-020). **추론 어댑터를 파이프라인이 직접 고르지 않는다** — 001의 `select.ts`가 고른 결과를 받는다(FR-017)
- [X] T033 [US4] 진행 중 상태 관리 구현 — 성공·실패와 무관하게 끝나면 빠진다. **저장소에 남기지 않는다** — 남기면 앱이 죽었을 때 "영원히 생성 중"인 하루가 생긴다(contracts/pipeline.md)

**Checkpoint**: 길이 끝에서 끝까지 이어진다. `generation`에서 멈추는 것이 정상이다

---

## Phase 8: Polish & 헌법 검증

**Purpose**: 헌법 준수를 grep으로 확인하고 문서를 갱신한다

- [X] T034 [P] quickstart.md D단계 실행 — `src/diary/`, `src/signals/`에 모델 식별자가 0건인지 grep으로 확인 (FR-008, FR-013, SC-005)
- [X] T035 [P] quickstart.md E단계 실행 — `src/diary/`에 `score`/`benchmark`/`elapsed` 등 측정 코드가 0건인지 확인 (FR-027, 원칙 IV)
- [X] T036 [P] quickstart.md C단계 실행 — `src/signals/`에 기본값 대체 함수가 없는지 확인 (FR-003, SC-002)
- [X] T037 `AGENTS.md`의 「코드를 어디에 두는가」 갱신 — `src/signals/`와 `src/diary/`가 이제 존재하므로 "앞으로 생길 자리"에서 옮긴다. 각 자리의 역할과 경계를 적는다
- [X] T038 `AGENTS.md`에 하루 경계 규칙 추가 — 04:00 경계와 그 정의처가 `src/config/day-boundary.ts` 한 곳이라는 것(FR-021a)
- [X] T039 `npm run lint`와 `npm test` 통과 확인. **001의 테스트 69개가 여전히 통과하는지 포함**
- [X] T040 quickstart.md A~F 전체 실행 — 실기기 없이 완료된다

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 의존 없음
- **Phase 2 (Foundational)**: Phase 1 후. **모든 스토리를 차단한다**
- **Phase 3 (US1 신호)**: Phase 2 후. 순수 타입 — MVP
- **Phase 4 (US2 요청)**: Phase 3 후 (`DaySignals`를 입력으로 받는다)
- **Phase 5 (US3 추론 경계)**: Phase 4 후 (`DiaryRequest`를 받는다)
- **Phase 6 (US5 저장)**: Phase 2 후 언제든. `DiaryEntry` 타입만 있으면 된다 — **Phase 3~5와 병렬 가능**
- **Phase 7 (US4 파이프라인)**: Phase 3·4·5·6 전부 후 (모든 단계를 잇는다)
- **Phase 8 (Polish)**: 전부 후

### User Story Dependencies

- **US1 (P1)**: 독립. 다른 모든 것의 입력
- **US2 (P1)**: US1 이후
- **US3 (P1)**: US2 이후
- **US5 (P3)**: US1·US2·US3와 **병렬 가능** (타입만 의존)
- **US4 (P2)**: 나머지 전부 이후

### Parallel Opportunities

- T005·T006 (타입 정의, 같은 파일이지만 다른 타입 — 순차 권장)
- T007·T008 (US1 테스트, 다른 파일)
- T012·T013 (US2 테스트, 같은 파일 — 순차)
- T015·T016·T017 (US3 테스트, 다른 파일)
- T019·T020 (어댑터 구현, 다른 파일)
- T027·T028·T029 (US4 테스트, 같은 파일 — 순차)
- T034·T035·T036 (grep 검사, 서로 독립)
- **Phase 6(저장)은 Phase 3~5와 통째로 병렬 가능** — 타입만 의존한다

---

## Parallel Example: User Story 3 테스트

```bash
# US3 테스트 3개를 함께 작성 (전부 다른 파일):
Task: "__tests__/inference/generate.test.ts — not-implemented 반환 검증"
Task: "__tests__/inference/generate.test.ts — 실패에 텍스트 없음 검증"
Task: "__tests__/diary/entry.test.ts — DiaryEntry에 모델 식별자 없음"
```

---

## Implementation Strategy

### MVP 우선 (Phase 1~3)

1. Phase 1 Setup — 하루 경계
2. Phase 2 Foundational (**전부를 차단하므로 먼저**)
3. Phase 3 US1 — `SignalValue`가 "없음"과 "알 수 없음"을 가른다
4. **멈추고 검증**: `npm test -- signals`로 원칙 V가 타입으로 지켜지는지 확인

**왜 US1이 MVP인가**: 다른 모든 축이 `DaySignals`를 입력으로 받는다. 그리고 헌법 원칙 V가
이 기능에 걸리는 지점이 여기다 — 걸음 수를 0으로 채우지 않는 것.

### 증분 전달

1. Phase 1~2 → 바닥
2. Phase 3 → 신호의 모양 (MVP)
3. Phase 4~5 → 요청과 추론 경계
4. Phase 6 → 저장 (3~5와 병렬 가능)
5. Phase 7 → 길이 이어진다
6. Phase 8 → 헌법 검증과 문서

### 완료 판정

**이 기능은 실기기 없이 완료된다.** 001과 달리 기기 검증이 완료 조건이 아니다(SC-003).

다만 **저장 구현(T026)이 `expo-file-system` 57 API를 이 저장소에서 처음 쓰는 것**이다
(research.md §3). 기기 없이 메모리 대역으로 검증되지만, 파일 구현의 실제 동작은 다음 기능이
실기기를 쓸 때 확인해야 한다. 이 사실을 완료 보고에 남긴다.

---

## Notes

- `[P]` = 다른 파일, 의존 없음
- 테스트를 먼저 쓰고 **실패를 확인한 뒤** 구현한다 (헌법 「개발 방식」)
- 계약의 검증 표 각 행이 테스트 케이스다 — 표를 옮겨 적는 것으로 시작한다
- 커밋 메시지는 한국어로 쓴다 (헌법 「개발 방식」)
- **001의 코드를 손대지 않는다**: `select.ts`, `policy.ts`, `environment.ts`. 특히 `policy.ts`는
  헌법 원칙 I의 방어선이므로 이 기능에서 건드릴 이유가 없다
- 한 축을 깊게 파고들고 싶어지면 멈춘다. 프롬프트·모델 파일·실제 수집·화면은 범위 밖이다
