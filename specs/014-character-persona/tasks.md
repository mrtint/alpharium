# Tasks: 캐릭터 페르소나

**Input**: Design documents from `/specs/014-character-persona/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/persona.md, contracts/title.md, quickstart.md

**Tests**: 이 저장소의 헌법(「개발 방식」)이 "계약을 먼저 정하고 테스트를 먼저 쓴다"를
못 박고 있으므로 포함한다. 새 순수 함수(`persona.ts`·`title.ts`)는
`npm run test:logic`(node 환경)로, 화면 렌더링 검사는 `npm run test:ui`
(jest-expo 환경)로 돈다(AGENTS.md 「테스트가 두 갈래로 나뉜다」 — `.ts`는 logic,
`.tsx`는 ui).

**Organization**: Tasks are grouped by user story to enable independent implementation
and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)

## Path Conventions

이 저장소는 단일 프로젝트다. `src/`, `__tests__/`가 리포지토리 루트에 있다
(plan.md「Project Structure」).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 새 의존이 없으므로(plan.md, 신규 의존 0개) 설치할 것이 없다. 이 단계는
헌법 검사가 이미 새 파일 두 곳(`src/diary/persona.ts`, `src/diary/title.ts`)을
자동으로 검사 대상에 넣는지만 확인한다.

- [X] T001 `scripts/constitution-rules.ts`를 읽어 `src/diary/` 디렉터리 전체가
      이미 검사 대상인지 확인한다(013 T002의 선례 — 디렉터리 단위 검사면 새 규칙이
      필요 없을 수 있다). `src/ui/`의 `roster.ts`·`ModelAsset` 접근 금지 규칙
      (`UI_TOUCHES_MODEL`·`UI_TOUCHES_ASSET`)이 `persona.ts`에는 적용되지 않아도
      됨을 확인한다 — 이 파일은 애초에 `src/ui/`가 아니라 `src/diary/`에 있다
- [X] T002 `npm run lint`로 현재 상태(구현 전)가 헌법 검사를 통과하는 것을 확인한다
      (베이스라인)

**Checkpoint**: 헌법 검사 대상 범위 확인 완료 — 새 규칙 추가는 필요 없는 것으로
판명(설계상 `persona.ts`·`title.ts`가 위반 가능한 import를 하지 않으므로)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `persona.ts`의 이름·소개 매핑 — US1(화면 표시)·US2(프롬프트 이름)·
US3(프롬프트 개정과 같은 파일)이 전부 이것을 필요로 하거나 같은 파일
(`prompt.ts`)을 연다. **이 단계 없이는 US1이 시작될 수 없다.**

**⚠️ CRITICAL**: US1은 이 단계 없이 시작할 수 없다. US2·US3·US4는 이 단계와 독립적으로
병행 가능하다(US2는 `title.ts`가 별도 기반, US3은 `prompt.ts`만 열지만 US2도 같은
파일을 열므로 실제로는 US2/US3을 순차로 하는 편이 충돌이 적다 — 아래 Dependencies
참조).

- [X] T003 [P] `src/diary/persona.ts`를 만든다 — `Persona` 타입
      (data-model.md 「Persona」)과 다섯 캐릭터의 `PERSONAS` 상수(로드맵 문서
      `docs/roadmap/README.md`의 확정 값: 금동이/루이/오드/샤오바이/모카와 각각의
      한 줄 소개)를 채운다. 각 항목에 실측 근거(005~012 관측)를 주석으로 남긴다
      (contracts/persona.md P3)
- [X] T004 [P] `src/diary/persona.ts`에 `personaOf(character)` 함수를 만든다
      (contracts/persona.md 「함수」)
- [X] T005 `__tests__/diary/persona.test.ts`를 만든다 — P1(다섯 값 전부 정의됨,
      `CHARACTERS.every`), P2(소스가 `roster`·`ModelAsset`을 import하지 않음을
      직접 읽어 확인 — 007·009의 교훈대로 타입이 아니라 소스 문자열을 본다),
      이름·소개가 빈 문자열이 아님을 확인
- [X] T006 `npm run test:logic`으로 T005가 통과하는지 확인한다

**Checkpoint**: `persona.ts`가 서고 테스트로 지켜짐 — US1 구현이 이제 시작 가능

---

## Phase 3: User Story 1 - 이름과 소개로 캐릭터를 고른다 (Priority: P1) 🎯 MVP

**Goal**: 캐릭터 목록·선택 화면 두 곳이 내부 식별자 대신 이름·소개를 보인다.

**Independent Test**: 캐릭터 탭과 일기 탭의 「누가 쓸까」를 열어 다섯 줄 모두 이름과
소개가 보이고 `quiet` 등 내부 식별자가 어디에도 없는 것을 확인한다
(quickstart.md D2·D3).

### Tests for User Story 1

- [X] T007 [P] [US1] `__tests__/ui/character-list.test.tsx`에 케이스를 추가한다 —
      다섯 줄에 `personaOf()`의 이름·소개가 렌더링되고, 내부 식별자 문자열
      (`"quiet"` 등)이 화면 텍스트로 렌더링되지 않는 것을 검사한다(FR-001·004)
- [X] T008 [P] [US1] `__tests__/ui/`에 `CharacterPicker`용 테스트를 추가/보강한다
      (기존 파일이 있으면 케이스 추가, 없으면 `character-picker.test.tsx` 신설) —
      같은 검사(이름·소개 렌더링, 내부 식별자 미노출)와 함께, 오드(imaginative)의
      고지("상상을 섞어 씁니다")가 여전히 보이는 것을 확인한다(헌법 로스터 MUST)

### Implementation for User Story 1

- [X] T009 [US1] `src/ui/CharacterListScreen.tsx`를 수정한다 — `<Text
      style={styles.name}>{character}</Text>`를 `personaOf(character)`의
      `name`·`tagline`을 쓰는 두 줄로 바꾼다(007 주석 "자리표시 식별자를 그대로
      보인다 — 이름은 사람이 짓는다"가 가리키던 빈자리)
- [X] T010 [US1] `src/ui/CharacterPicker.tsx`를 수정한다 — 같은 방식으로
      `{character}`를 이름·소개로 바꾼다. `IMAGINATIVE_NOTICE` 상수는 그대로 두되
      오드의 소개 아래 별도 줄로 유지한다(소개 문구와 필수 고지는 다른 것 —
      research.md에서 다루지 않은 결정이므로 여기서 명시: 고지는 헌법이 MUST로
      요구한 별개 문장이지 소개의 일부가 아니다)
- [X] T011 [US1] `src/ui/DiaryListScreen.tsx`의 옮김 안내
      (`{selection.movedFrom}을(를) 쓸 수 없어 {selection.character}(으)로
      바꿨다`)를 `personaOf()`의 이름을 쓰도록 고친다(FR-005)
- [X] T012 [US1] `npm run test:ui`로 T007·T008이 통과하는지 확인한다
- [X] T013 [US1] `npm run lint`로 헌법 검사가 여전히 통과하는지 확인한다 —
      `CharacterListScreen.tsx`·`CharacterPicker.tsx`가 `persona.ts`만 import하고
      `roster.ts`를 여전히 import하지 않는 것을 검사가 확인한다

**Checkpoint**: User Story 1 완결 — 캐릭터 화면 두 곳이 이름·소개로 보이고
독립적으로 시연 가능

---

## Phase 4: User Story 2 - 일기에 제목이 붙는다 (Priority: P2)

**Goal**: 판정을 통과한 텍스트에서 제목을 사후 분리해 `DiaryEntry.title`에 담고
목록·상세 화면이 표시한다.

**Independent Test**: 신호가 있는 하루로 일기를 생성하고 목록·상세에 제목이 보이는
것을, 제목을 못 뗀 경우에도 거부되지 않고 저장되는 것을 확인한다(quickstart.md D5).

### Tests for User Story 2

- [X] T014 [P] [US2] `__tests__/diary/title.test.ts`를 만든다 —
      contracts/title.md P1~P4를 각각 검증: 정상 형식(첫 줄+빈 줄+본문)에서 제목이
      분리됨, 빈 줄이 없으면 전체가 body, 첫 줄이 40자 초과면 전체가 body, 예외를
      던지지 않음(빈 문자열 등 경계 입력), 반환 타입에 `title`·`body` 외 필드가
      없음을 소스를 직접 읽어 확인(007·009의 교훈)
- [X] T015 [P] [US2] `__tests__/diary/pipeline.test.ts`에 케이스를 추가한다 —
      `judge()`가 통과시킨 텍스트에서 `extractTitle()`이 호출되어
      `DiaryEntry.title`이 채워짐을 확인하고, **`judge()`에는 원본 전체 텍스트가
      그대로 전달됨**(제목이 미리 잘려 판정에 들어가지 않음)을 확인한다(FR-007·009)
- [X] T016 [US2] `npm run test:logic`으로 T014·T015가 실패하는 것을 확인한다
      (구현 전이므로 실패해야 정상)

### Implementation for User Story 2

- [X] T017 [P] [US2] `src/diary/title.ts`를 만든다 — `TitleExtraction` 타입과
      `extractTitle(text)` 함수(data-model.md 「Title」, contracts/title.md
      「판정 순서」)
- [X] T018 [US2] `src/diary/types.ts`의 `DiaryEntry`에 `title?: string`을
      추가한다(data-model.md, FR-010 — 옵셔널이어야 기존 파일과 호환)
- [X] T019 [US2] `src/diary/pipeline.ts`를 수정한다 — `judge()` 통과 후(기존
      `generated.text`를 그대로 쓰던 자리), `extractTitle(generated.text)`를
      호출해 `entry.text = extraction.body`, `entry.title = extraction.title`로
      채운다. **`judge()` 호출부는 건드리지 않는다**(원본 텍스트를 그대로 넘긴다,
      research.md R5)
- [X] T020 [US2] `src/diary/store.ts`의 `DiaryListItem`에 `title?: string`을
      추가하고 `listDiaries()`에 인라인으로 채운다(data-model.md 「DiaryListItem」,
      추가 읽기 없음). **★ 구현 중 발견**: `src/app/state.ts`에 같은 이름의
      독립된 `DiaryListItem` 타입이 006부터 따로 있었다(`DiaryListScreen`이 이쪽을
      쓴다) — plan.md가 이것을 놓쳤다. 그쪽에도 `title?: string`을 추가해야
      `DiaryListScreen.tsx`가 `item.title`을 읽을 수 있다(data-model.md 갱신함)
- [X] T021 [US2] `src/ui/DiaryListScreen.tsx`의 목록 줄에 `item.title`이 있으면
      표시하는 텍스트를 추가한다(FR-011)
- [X] T022 [US2] `src/ui/DiaryDetailScreen.tsx`에 `entry.title`이 있으면
      표시하는 텍스트를 추가한다(FR-011)
- [X] T023 [US2] `src/diary/prompt.ts`의 `buildPrompt()`에 제목 지시문을 추가한다
      (research.md R2 — "첫 줄에 제목만, 빈 줄, 그다음 본문"을 요구하는 한 줄).
      **`instructionLines()`에도 이 줄이 들어가야** 되뱉기 판정 대상이 된다
      (기존 메커니즘, `SPEAKER_RULES` 확장과 동일한 자리)
- [X] T024 [US2] `npm run test:logic`으로 T014·T015가 이제 통과하는지 확인한다
- [X] T025 [US2] `npm run test:ui`로 T021·T022 관련 화면 테스트(있다면 새로
      추가)가 통과하는지 확인한다
- [X] T026 [US2] `npm run lint`로 헌법 검사 및 `acceptance.test.ts`의 A-7
      (판정 갈래가 넷임을 세는 테스트)이 그대로 통과하는지 확인한다 — `judge()`를
      건드리지 않았다는 증거

**Checkpoint**: User Story 1+2 완결 — 제목이 생성·저장·표시되고, 기존 판정 로직은
무손상. 독립적으로 시연 가능(US1 없이도 제목 기능만 검증 가능)

---

## Phase 5: User Story 3 - 일기가 기록에 없는 것을 덜 단언한다 (Priority: P2)

**Goal**: `SPEAKER_RULES`에 짐작 어미 지시를 추가해 원칙 II 위반을 줄인다.

**Independent Test**: 신호가 `unknown`/`none` 위주인 하루로 여러 캐릭터에서 생성한
일기를 사람이 읽어 기록에 없는 것을 확정형으로 서술하는 문장이 줄었는지, 캐릭터별
차이가 유지되는지 확인한다(quickstart.md D6) — 자동 채점 없음(원칙 IV).

### Tests for User Story 3

- [X] T027 [P] [US3] `__tests__/diary/prompt.test.ts`에 케이스를 추가한다 — 새
      짐작 어미 지시 문장이 `SPEAKER_RULES`(→ `instructionLines()`의 반환값)에
      포함되는지, 그 문장에 특정 캐릭터 이름이나 "상상력이 풍부하다" 류의 성격
      서술이 섞여 있지 않은지(FR-013·015 — 모든 캐릭터에 공통으로 적용되는 문장인지)
      확인한다
- [X] T028 [P] [US3] `__tests__/diary/prompt.test.ts`에 케이스를 추가한다 —
      `buildPrompt()`가 캐릭터 이름(`personaOf().name`)을 프롬프트에 포함하되,
      `tagline`(소개 문구)은 포함하지 않는 것을 확인한다(contracts/persona.md P4,
      FR-015·016)

### Implementation for User Story 3

- [X] T029 [US3] `src/diary/prompt.ts`의 `SPEAKER_RULES`에 짐작 어미 지시 한 줄을
      추가한다(research.md R3 — "확실하지 않은 것은 '~인 것 같다'처럼 짐작의
      말투로 써라" 류)
- [X] T030 [US3] `src/diary/prompt.ts`의 `buildPrompt()`가 `personaOf(character).name`을
      읽어 이름 한 줄을 프롬프트에 추가한다(FR-015 — 이름만, 성격 지시 없음).
      `persona.ts`를 import하되 `roster.ts`는 여전히 import하지 않는다
- [X] T031 [US3] `npm run test:logic`으로 T027·T028이 통과하는지 확인한다
- [X] T032 [US3] `npm run lint`로 헌법 검사(특히 `src/diary/`가 `models/roster`에
      닿지 않는 기존 규칙이 있다면) 통과를 확인한다

**Checkpoint**: User Story 1+2+3 완결. 프롬프트 개정은 quickstart.md D6에서
실기기로 효과를 관측해야 완결로 간주된다(자동 테스트만으로는 "지어내기가
줄었다"를 증명할 수 없음 — 원칙 IV).

---

## Phase 6: User Story 4 - 개발자가 진단 화면에서 어느 모델이 도는지 본다 (Priority: P3)

**Goal**: local·dev 환경의 진단 화면에 캐릭터별 모델 표시 이름이 보인다.

**Independent Test**: local/dev에서 진단 화면을 열어 다섯 모델 이름을 확인하고,
release 빌드에서는 여전히 진단 화면에 닿는 경로가 없는 것을 확인한다
(quickstart.md D7).

### Tests for User Story 4

- [X] T033 [P] [US4] `__tests__/models/roster.test.ts`에 케이스를 추가한다 —
      `displayName(character)`가 다섯 값 모두에 대해 빈 문자열이 아닌 값을
      반환하는 것을 확인한다
- [X] T034 [P] [US4] `__tests__/diagnostics/report.test.ts`에 케이스를 추가한다 —
      `collectReport()`의 결과에 `characterModels` 필드가 다섯 캐릭터 전부를
      담고 있는 것을 확인한다

### Implementation for User Story 4

- [X] T035 [US4] `src/models/roster.ts`에 `displayName(character)` 함수를
      추가한다(data-model.md 「roster.ts 추가」) — 기존 실측 주석의 모델명
      문자열을 그대로 옮긴다
- [X] T036 [US4] `src/diagnostics/types.ts`의 `DiagnosticReport`에
      `characterModels: Readonly<Record<Character, string>>`을 추가한다
- [X] T037 [US4] `src/diagnostics/report.ts`의 `collectReport()`가
      `CHARACTERS.map(displayName)`으로 `characterModels`를 채운다
- [X] T038 [US4] `src/ui/DiagnosticsScreen.tsx`에 `characterModels`를 렌더링하는
      부분을 추가한다(문자열만 받아 그리기만 함 — `roster.ts`를 import하지 않음)
- [X] T039 [US4] `npm run test:logic`으로 T033·T034가 통과하는지 확인한다.
      **★ 구현 중 발견**: `DiagnosticsScreen` 전체를 `render()`하는 UI 테스트는
      만들지 않았다 — `PermissionPanel`이 `expo-media-library`를 동적 import
      하며 jest 환경(node/jsdom)에서 `TypeError: A dynamic import callback was
      invoked without --experimental-vm-modules`로 죽는다. 001~004도 이 화면을
      UI 테스트 대상으로 삼은 적이 없다(진단 화면 자체가 기기 없이 렌더링
      검증하기 어려운 구조). `report.test.ts`(로직 레벨)가 `characterModels`
      데이터가 옳음을 검증하고, 화면 쪽은 기존 `Row` 컴포넌트를 그대로 재사용해
      새 렌더링 로직이 없으므로 이걸로 충분하다고 판단했다 — 실기기 확인은
      quickstart D7의 몫이다
- [X] T040 [US4] `npm run lint`로 `src/ui/DiagnosticsScreen.tsx`가 `roster.ts`를
      직접 import하지 않는 것(헌법 검사 통과)을 확인한다

**Checkpoint**: 네 User Story 전부 완결

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 전체 통합 확인과 실기기 검증

- [X] T041 `npm test`(전체) + `npm run lint`로 최종 기기 없는 검증을 통과시킨다
- [X] T042 AGENTS.md에 014 섹션을 추가한다 — 무엇이 바뀌었는지, 지어내기 교정의
      실기기 관측 결과, 제목 40자 상한의 실측 여부(D5)를 기록한다(원칙 V)
- [ ] T043 quickstart.md D1~D8을 실기기(debug 빌드)에서 실행하고 결과를 AGENTS.md에
      기록한다 — 새 네이티브 모듈이 없으므로 debug 1회로 충분(AGENTS.md 「테스트」
      "최소 한 번" 기준)
- [ ] T044 D6(지어내기 교정 효과)의 실기기 관측을 AGENTS.md에 "합성/실사 하루에서의
      관측"으로 남긴다 — 효과가 불충분하면 후속 개선 후보로 로드맵에 기록한다

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존 없음 — 즉시 시작 가능
- **Foundational (Phase 2)**: Setup 완료에 의존 — US1을 막는다
- **User Story 1 (Phase 3)**: Foundational 완료에 의존
- **User Story 2 (Phase 4)**: Foundational과 독립(자체적으로 `title.ts` 기반을 그
  안에 만든다) — 다만 T023이 `prompt.ts`를 열므로 US3과 같은 파일을 건드린다
- **User Story 3 (Phase 5)**: Foundational(`persona.ts`)에 의존(T030이
  `personaOf()`를 쓴다). `prompt.ts` 파일을 US2(T023)와 공유하므로 **US2 → US3
  순서로 진행하는 것을 권장**(같은 파일의 연속 수정, 병렬 시 충돌 위험)
- **User Story 4 (Phase 6)**: Foundational과 독립 — `roster.ts`·`diagnostics/`만
  건드리고 `persona.ts`를 쓰지 않는다
- **Polish (Phase 7)**: 모든 User Story 완료에 의존

### User Story Dependencies

- **US1 (P1)**: Foundational(`persona.ts`) 필요. 다른 스토리와 독립
- **US2 (P2)**: 독립적으로 시작 가능(자체 `title.ts` 보유). US1 없이도 완결 가능하나
  실사용 시나리오는 US1과 함께일 때 자연스럽다
- **US3 (P2)**: Foundational(`persona.ts`) 필요, `prompt.ts` 파일을 US2와 공유 —
  순차 권장
- **US4 (P3)**: 완전히 독립. 다른 어느 스토리에도 의존하지 않는다

### Parallel Opportunities

- Phase 2의 T003·T004는 [P] — 같은 파일이지만 타입 정의와 함수 정의로 순차 작성이
  자연스러워 실제로는 한 사람이 이어서 작업(표기는 병렬 가능성 표시)
- US1(Phase 3)과 US4(Phase 6)는 서로 다른 파일만 건드리므로 완전 병렬 가능
- US2(Phase 4)와 US4(Phase 6)도 완전 병렬 가능
- US2와 US3은 `prompt.ts`를 공유하므로 병렬보다 순차 권장(위 Dependencies 참조)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart.md D2·D3로 독립 검증
5. 이 시점에서 이미 헌법 원칙 III 위반(내부 식별자 노출)이 해소된 상태 — 배포 가치 있음

### Incremental Delivery

1. Setup + Foundational → 기반 완성
2. US1 → 이름·소개 화면 → 검증 → (배포 가능 지점)
3. US2 → 제목 → 검증 → (배포 가능 지점)
4. US3 → 지어내기 교정 → 실기기 관측(D6) → (배포 가능 지점, 관측 결과에 따라
   후속 조정 가능)
5. US4 → 진단 화면 → 검증 → 전체 완결

### 특별히 주의할 점

- **US2·US3의 실측 확인은 자동 테스트로 완결되지 않는다.** T024·T031(logic 테스트
  통과)은 "코드가 의도대로 동작한다"만 증명하고, "제목이 실제로 유용한가"(D5의
  40자 상한 적절성)와 "지어내기가 실제로 줄었는가"(D6)는 quickstart.md의 실기기
  절차로만 확인된다(헌법 원칙 IV·V) — Phase 7의 T043·T044가 이것을 명시적으로
  다룬다.
