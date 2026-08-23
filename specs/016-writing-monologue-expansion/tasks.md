# Tasks: 쓰는 중 독백 확장 — 콜드/핫 스타트·데일리 로그·문구 폭

**Input**: Design documents from `/specs/016-writing-monologue-expansion/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: 이 프로젝트의 「개발 방식」(AGENTS.md)이 "계약을 먼저 정하고
테스트를 먼저 쓴다"를 관례로 못박았으므로 테스트 태스크를 포함한다 — 각
구현 태스크 앞에 대응하는 실패하는 테스트를 먼저 쓴다.

**Organization**: Foundational(콜드/핫 판정·2단계 로드 신호·branch 타입·
조사 선택·문구 풀 10개 이상 배선, 네 User Story가 공유)이 먼저, 그다음
User Story별로 화면 동작을 완성한다. US1·US2는 둘 다 P1이지만 US1(모델
로드 독백)이 US2(사진 문구 정직성)보다 먼저다 — US2는 검증 대상이 이미
015가 배선한 vision 신호 위에 문구 내용만 바뀌는 것이라 Foundational에서
문구 풀만 채우면 사실상 끝나고, US1은 새 배선(2단계 로드 신호)이 필요해
더 크다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일, 의존성 없음 — 병렬 가능
- **[Story]**: US1(P1)/US2(P1)/US3(P2)/US4(P2)/F(Foundational, 모든
  스토리가 의존)

## Path Conventions

Single project — `src/`, `__tests__/`, `.maestro/`가 저장소 루트에 있다
(plan.md Project Structure 참조).

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: 콜드/핫 판정을 담는 `LoadResult` 확장, 2단계 로드 신호
배선, `branch` 타입과 `ProgressStage`의 `"load"` 값, 조사 선택 함수,
문구 풀을 10개 이상으로 채우는 `monologue.ts` 확장. 네 User Story
전부 이것 없이는 검증 불가능하다.

**⚠️ CRITICAL**: 이 phase 완료 전에는 어느 User Story도 화면에서 확인할
수 없다.

### 타입 (data-model.md, contracts/load-signal.md, contracts/monologue-branch.md)

- [ ] T001 [F] `src/inference/types.ts`의 `ProgressStage`에 `"load"`
  값을 추가하고(`"signals" | "vision" | "generation" | "load"`),
  `MonologueBranch = "cold" | "hot" | "normal" | "many"` 타입을 새로
  선언한다. `InferenceBackend.generate()` 시그니처를 `onStage?: (stage:
  ProgressStage, branch?: MonologueBranch) => void`로 넓힌다
  (data-model.md 「ProgressStage (확장)」「MonologueBranch (신설)」).
- [ ] T002 [P] [F] `__tests__/inference/types.test.ts`에 `ProgressStage`가
  네 값(signals/vision/generation/load)의 문자열 리터럴 유니온뿐인지,
  `MonologueBranch`가 네 값의 문자열 리터럴 유니온뿐인지(숫자·객체 필드
  없음) 소스 선언을 직접 읽어 검사하는 계약 테스트를 추가한다. **먼저
  실패를 확인한 뒤** T001을 완성해 통과시킨다.
- [ ] T003 [F] `src/inference/engine-port.ts`의 `LoadResult`를 `{ ok:
  true; warm: boolean } | { ok: false; reason: "not-found" |
  "load-failed" }`로 확장한다(data-model.md 「LoadResult (확장)」).
  `{ ok: false }` 갈래는 변경하지 않는다.
- [ ] T004 [P] [F] `__tests__/inference/engine-port.test.ts`에
  `LoadResult`의 `{ ok: true }` 갈래가 `warm: boolean` 필드를 갖는지,
  `{ ok: false }` 갈래는 여전히 `reason`만 갖는지(시간·모델명 등 다른
  필드 없음, 원칙 III·IV 방어) 소스 선언을 직접 읽어 검사하는 계약
  테스트를 추가한다. **먼저 실패를 확인한 뒤** T003을 완성해 통과시킨다.

### llama-port.ts 콜드/핫 판정 (research.md §1, contracts/load-signal.md)

- [ ] T005 [F] `__tests__/inference/llama-port.test.ts`에 다음 테스트를
  추가한다(**먼저 작성해 실패를 확인**):
  - 캐릭터 A로 처음 `load()`를 부르면 `{ ok: true, warm: false }`를
    돌려준다.
  - 같은 캐릭터 A로 연속 `load()`를 다시 부르면 `{ ok: true, warm: true
    }`를 돌려주고, 이때 `loader()`(네이티브 적재 함수, 대역으로 호출
    횟수 확인 가능)가 **두 번째 호출에서는 불리지 않는다**(진짜 재사용
    검증, research.md §1의 실측 근거를 테스트로 고정).
  - 캐릭터 A 로드 후 캐릭터 B로 `load()`를 부르면 `{ ok: true, warm:
    false }`를 돌려준다(E1 — 다른 캐릭터면 콜드).
  - 로드 실패 시(`{ ok: false }`) `warm` 필드가 없다(타입 검사 겸 런타임
    검사).
- [ ] T006 [F] `src/inference/llama-port.ts`의 `load()`를 고쳐, 121행의
  재사용 분기(`context !== null && openFor === character`)에서
  `{ ok: true, warm: true }`를 돌려주고, 137행의 새 로드 성공 분기에서
  `{ ok: true, warm: false }`를 돌려준다(contracts/load-signal.md
  「LoadResult — warm 판정의 근거」). T005의 테스트가 통과해야 한다.

### 조사 선택 (contracts/particle.md, research.md §5)

- [ ] T007 [P] [F] `__tests__/diary/particle.test.ts`를 작성한다(**먼저
  작성해 실패를 확인**) — contracts/particle.md 검증 표 그대로:
  - 로스터 5인(금동이·루이·오드·샤오바이·모카) 전부 `"가"`를 돌려준다.
  - 받침 있는 가상 이름(예: `"테스트인"`)은 `"이"`를 돌려준다(받침 있음
    분기가 죽은 코드로 남지 않게 하는 케이스).
  - 빈 문자열·비한글 문자에서도 예외를 던지지 않고 `"가"`를 돌려준다.
- [ ] T008 [F] `src/diary/particle.ts`를 새로 만든다:
  `particleFor(name: string): "이" | "가"`를 유니코드 코드포인트 받침
  판정 공식(`(codePoint - 0xAC00) % 28`)으로 구현한다(contracts/
  particle.md 「판정 규칙」). `Character`·`../models/roster`·`./persona`를
  import하지 않는다. T007의 테스트가 통과해야 한다.

### 독백 문구 확장 — branch·이름·10개 이상 (contracts/monologue-branch.md)

- [ ] T009 [F] `__tests__/diary/monologue.test.ts`를 확장한다(**먼저
  작성해 실패를 확인**, 015의 기존 테스트는 유지하며 아래를 추가) —
  SC-003·SC-006·SC-007·SC-008·SC-002a 근거:
  - `(stage, branch)` 조합 중 신설·수정 대상 다섯(vision+normal,
    vision+many, load+cold, load+hot, generation)이 각각 10개 이상의
    서로 다른 문구 후보를 갖는다(소스 선언 직접 검사 — 타입이 10개
    미만을 허용하지 않는지 컴파일 타임 방어도 확인).
  - `signals` 단계는 015의 3개 문구를 그대로 유지한다(축소·변경 없음).
  - `vision`+`normal`·`vision`+`many` 풀의 문구 전체에 "누구"·"인물"·
    "언제"·"어디"·"찍힌"·"다녀온" 등 정직성 경계를 넘는 낱말이 없다
    (FR-005, contracts/monologue-branch.md 「사진 보기 문구 — 정직성
    경계」).
  - `vision`+`many` 풀의 문구에 숫자·정확한 장수가 없다(FR-007).
  - `load`+`cold`·`load`+`hot` 풀의 템플릿에 이름 자리(`{name}`)가
    있고, `pickMonologue("load", "cold", undefined, "루이")`를 부르면
    "루이" + 올바른 조사가 포함된 완성된 문구를 돌려준다(FR-003,
    FR-003a).
  - 같은 `(stage, branch)`로 연속 호출 시 `previous`와 같은 문구가
    나오지 않는다(FR-010, 015 FR-014 확장).
  - 반환된 모든 문구(이름 치환 전 템플릿 기준)에 숫자가 없다(FR-004).
  - `monologue.ts`의 소스가 `roster.ts`·`persona.ts`·`Character`를
    import하지 않는다(소스 텍스트 직접 검사).
- [ ] T010 [F] `src/diary/monologue.ts`를 확장한다: `pickMonologue(stage,
  branch, previous, characterName?, random?): string`으로 시그니처를
  넓히고, `(stage, branch)` 조합별 최소 10개 원소 튜플 문구 테이블을
  구성한다(data-model.md 「MonologueLine (문구 후보와 선택 — 확장)」).
  로드 단계 문구는 이름 자리를 비운 템플릿으로 쓰고 `particleFor()`
  (T008)를 import해 이름+조사를 완성한다. 사진 보기 문구는 011의
  `CAPTION_PROMPT` 실측 범위 안에서만 작성한다(contracts/
  monologue-branch.md 「사진 보기 문구 — 정직성 경계」 표 참조).
  `generation` 문구 10개로 015의 3개를 대체한다(spec Assumptions).
  T009의 테스트가 통과해야 한다.
- [ ] T011 [F] `npm run lint`(헌법 검사 포함)를 돌려 `monologue.ts`·
  `particle.ts`가 새 위반을 만들지 않는지 확인한다. quickstart.md의
  위반 주입 절차(일부러 `persona.ts`를 import했다 되돌리기, 두 파일
  모두)로 검사가 실제로 잡는지 1회 확인한다(research.md §4).

**Checkpoint**: 콜드/핫 판정이 `llama-port.ts`에서 정확히 나오고,
`monologue.ts`가 `(stage, branch)` 조합별 10개 이상 문구와 이름+조사
완성 기능을 갖췄다. 아직 배선(on-device.ts·화면)은 안 됐고 화면에는
아무것도 안 보인다 — User Story들이 그것을 한다.

---

## Phase 2: User Story 1 - 모델을 준비하는 동안에도 지금 뭘 하는지 안다 (Priority: P1) 🎯 MVP

**Goal**: `on-device.ts`가 `engine.load()` 전후로 2단계 로드 신호를
보내고, 화면이 그 신호를 받아 콜드/핫 스타트 문구(캐릭터 이름 포함)를
보여준다.

**Independent Test**: 모델이 아직 로드되지 않은 상태에서 일기 쓰기를
시작해 콜드 스타트 문구가 보이는지 확인한다. 이어서 같은 캐릭터로 다시
일기 쓰기를 시작해(모델이 이미 로드된 상태) 핫 스타트 문구가 보이는지
확인한다(spec Independent Test 그대로).

### Tests for User Story 1

- [ ] T012 [P] [US1] `__tests__/inference/on-device.test.ts`에 다음
  테스트를 추가한다(**먼저 작성해 실패를 확인**) — contracts/
  load-signal.md 검증 표 근거:
  - `engine.load()` 호출 직전에 `onStage`가 `("load")`(branch 없음)로
    불린다.
  - `engine.load()`가 성공(`{ ok: true, warm: false }`)하면 그 직후
    `onStage`가 `("load", "cold")`로 불린다.
  - `engine.load()`가 성공(`{ ok: true, warm: true }`)하면 그 직후
    `onStage`가 `("load", "hot")`로 불린다.
  - `engine.load()`가 실패하면 `("load", "cold")`/`("load", "hot")`
    어느 것도 불리지 않고 `model-load-failed`를 반환한다(FR-011).
  - `onStage`를 안 넘겨도 기존 성공/실패 경로가 그대로 동작한다(옵셔널
    확장).
- [ ] T013 [US1] `src/inference/on-device.ts`의 `generate()`를 고친다:
  `engine.load(request.character)` 호출 직전에 `onStage?.("load")`를,
  성공 시(`loaded.ok === true`) 그 직후에 `onStage?.("load", loaded.warm
  ? "hot" : "cold")`를 추가한다(contracts/load-signal.md 「신호 흐름」).
  T012의 테스트가 통과해야 한다.
- [ ] T014 [P] [US1] `__tests__/app/state.test.ts`에 `"writing"` 화면
  상태가 `branch?: MonologueBranch` 필드를 가질 수 있는지 검사하는
  테스트를 추가한다(**먼저 작성해 실패를 확인**, 015가 이미 둔
  `stage`·`line`은 유지).
- [ ] T015 [P] [US1] `__tests__/ui/diary-home.test.tsx`에 다음을 검사하는
  테스트를 추가한다(**먼저 작성해 실패를 확인**):
  - `onProgress("load")`(branch 없음)를 받아도 화면 상태(`stage`·
    `branch`·`line`)가 갱신되지 않는다(research.md §2 결정 — 이전 단계
    문구 유지).
  - `onProgress("load", "cold")`를 받으면 화면에 콜드 스타트 문구
    (캐릭터 이름 포함)가 보인다.
  - `onProgress("load", "hot")`를 받으면 화면에 핫 스타트 문구(콜드
    스타트 문구와 다른 풀에서, 캐릭터 이름 포함)가 보인다.
  - `onProgress("generation")`을 받으면(로드 단계 다음) 화면이 글쓰기
    문구로 전환된다.

### Implementation for User Story 1

- [ ] T016 [US1] `src/app/state.ts`의 `AppScreen`에서 `"writing"` 갈래를
  `{ kind: "writing"; stage?: ProgressStage; branch?: MonologueBranch;
  line?: string }`로 확장한다(data-model.md 「AppScreen 확장」). T014의
  테스트가 통과해야 한다.
- [ ] T017 [US1] `src/ui/DiaryHomeScreen.tsx`의 `generate()` 콜백에서
  `onProgress(stage, branch)` 처리 로직을 확장한다: `stage === "load"`
  이고 `branch`가 `undefined`이면 상태를 갱신하지 않는다(research.md
  §2). 그 외에는 `pickMonologue(stage, branch, s.line, stage === "load"
  ? characterName : undefined)`를 불러 `{ ...s, stage, branch, line }`
  으로 갱신한다. `characterName`은 이미 화면이 알고 있는 선택된 캐릭터의
  `persona.ts` `displayName`을 그대로 문자열로 전달한다(원칙 III 경계는
  화면 쪽에서 지킨다 — `DiaryHomeScreen.tsx`는 이미 `persona.ts`를 import
  할 수 있는 자리다). `stage`가 `"generation"`으로 바뀌면 `branch`를
  `undefined`로 지운다(data-model.md 「AppScreen 확장」 갱신 규칙).
  T015의 테스트가 통과해야 한다.

**Checkpoint**: User Story 1이 독립적으로 완전히 동작한다 — 모델 로드
구간에서 캐릭터 이름이 포함된 콜드/핫 스타트 문구가 실제로 보인다.
여기서 멈춰도 배포 가능한 증분이다(로드맵이 지목한 015의 가장 큰
공백이 메워진다).

---

## Phase 3: User Story 2 - 사진을 보는 문구가 실제로 보는 것만 말한다 (Priority: P1)

**Goal**: 사진 보기 단계의 문구 후보 전체가 011의 캡션 엔진 실측 범위
안에서만 작성된다(정직성 경계 준수).

**Independent Test**: 사진 보기 단계의 전체 문구 후보 목록을 검토해,
인물 식별·촬영 시각/장소 판별·장소에 대한 주관적 감상을 단정하는 표현이
없는지 확인한다(spec Independent Test 그대로).

**참고**: 이 스토리가 요구하는 문구 내용 자체는 이미 Foundational의
T009·T010에서 작성·검증됐다(정직성 경계 검사가 T009에 포함되어 있다).
이 phase는 그 결과를 화면에서 실제로 확인하는 통합 테스트와 실기기
확인만 남는다 — 새 배선이 필요 없다(015가 이미 사진 보기 신호 배선을
완성했고, 016은 그 위에 문구 내용·branch만 얹는다).

### Tests for User Story 2

- [ ] T018 [US2] `__tests__/ui/diary-home.test.tsx`에 다음을 검사하는
  테스트를 추가한다(**먼저 작성해 실패를 확인**):
  - `onProgress("vision", "normal")`을 받으면 화면에 "보통" 갈래 사진
    보기 문구가 보인다.
  - `onProgress("vision", "many")`를 받으면 화면에 "많음" 갈래 사진
    보기 문구가 보인다.
  - 렌더된 사진 보기 문구 어디에도 정확한 장수(숫자)가 없다(FR-007).

### Implementation for User Story 2

- [ ] T019 [US2] T017에서 이미 구현한 `onProgress` 처리가
  `stage === "vision"`이고 `branch`가 실린 신호에서 `branch`를 상태에
  저장하고, 이후 `branch` 없는 `"vision"` 신호(사진 전환, 015의
  `onPhotoStart`발)에서는 저장된 `branch`를 계속 사용해
  `pickMonologue("vision", storedBranch, s.line)`을 부르는지 확인한다
  (data-model.md 「AppScreen 확장」 갱신 규칙 — 대부분 T017의 일반화된
  구현이 이미 처리했을 가능성이 높다, 확인 후 필요하면만 수정). T018의
  테스트가 통과해야 한다.

**Checkpoint**: User Story 1·2 모두 독립적으로 동작한다.

---

## Phase 4: User Story 3 - 사진이 많은 하루라면 그 사실이 문구에서도 느껴진다 (Priority: P2)

**Goal**: `on-device.ts`의 `readPhotos()`가 `selectForVision()`이 고른
장수로 many/normal 갈래를 판정해 `"vision"` 신호에 실어 보낸다.

**Independent Test**: 사진이 5장(캡션 상한)에 닿는 하루와 그보다 적은
하루 각각으로 일기 쓰기를 실행해, 전자에서만 "많다" 계열 문구가 나올
수 있는지 확인한다(spec Independent Test 그대로).

### Tests for User Story 3

- [ ] T020 [P] [US3] `__tests__/inference/on-device.test.ts`에 다음
  테스트를 추가한다(**먼저 작성해 실패를 확인**) — research.md §3,
  contracts/load-signal.md 근거:
  - 사진이 `VISION_PHOTO_LIMIT`(5)에 닿는 하루로 생성하면,
    `captionAll()` 호출(`onPhotoStart` 최초 호출) 전에 `onStage`가
    `("vision", "many")`로 불린다.
  - 사진이 5장 미만인 하루로 생성하면 `onStage`가 `("vision", "normal")`
    로 불린다.
  - 사진이 0장이거나 vision이 꺼져 있으면 `("vision", ...)` 신호 자체가
    한 번도 안 온다(015 기존 계약 유지).
- [ ] T021 [US3] `src/inference/on-device.ts`의 `readPhotos()`를 고쳐,
  `selectForVision(photos.value.photos)` 직후·`captionAll()` 호출 전에
  `onStage?.("vision", selected.length >= VISION_PHOTO_LIMIT ? "many" :
  "normal")`를 한 번 보낸다(research.md §3 「채택」). `VISION_PHOTO_LIMIT`
  은 `src/vision/select.ts`에서 import한다(새 상수를 만들지 않는다 —
  한 자리에만 있어야 한다는 011 원칙 유지). T020의 테스트가 통과해야
  한다.

### Implementation for User Story 3

Phase 2(T017)에서 이미 구현한 화면 쪽 `branch` 저장·재사용 로직이 이
스토리의 신호도 그대로 처리한다 — 추가 화면 구현 태스크는 없다. T021이
신호를 보내는 쪽의 전부다.

**Checkpoint**: User Story 1·2·3 모두 독립적으로 동작한다.

---

## Phase 5: User Story 4 - 각 단계의 문구가 사람이 검수할 만큼 넉넉하다 (Priority: P2)

**Goal**: 신설·확장된 다섯 갈래(load-cold, load-hot, vision-normal,
vision-many, generation)가 각각 10개 이상의 문구를 갖췄음을 최종
확인한다.

**Independent Test**: 각 진행 갈래의 문구 후보 배열 길이를 코드로 세어
10개 이상인지 확인한다(spec Independent Test 그대로).

**참고**: 문구 10개 이상 작성과 개수 강제는 이미 Foundational의
T009·T010에서 완료됐다(FR-009는 태스크 생성 원칙상 문구가 실제로
필요해지는 시점인 Foundational에서 함께 처리하는 것이 자연스럽다 —
갈래별 신호 배선이 끝나기 전에는 문구 내용만 따로 검수할 화면이 없기
때문이다). 이 phase는 사람이 실제로 문구 10개씩을 눈으로 검수하는
절차만 남는다.

### Tasks for User Story 4

- [ ] T022 [US4] 사용자(저장소 소유자)에게 `src/diary/monologue.ts`의
  다섯 신설·수정 갈래(load-cold, load-hot, vision-normal, vision-many,
  generation) 문구 각 10개 이상을 검수받는다 — spec Assumptions
  「문구 작성 주체」("에이전트가 초안을 쓰고 사용자가 검수")에 따라,
  T010에서 작성한 초안을 사용자에게 제시하고 피드백을 반영한다. 이
  태스크는 코드 변경이 아니라 검수 절차이며, 필요한 수정은 T010의
  결과물(`monologue.ts`)에 직접 반영한다.

**Checkpoint**: 네 User Story 모두 독립적으로 동작하고, 문구 폭이 사람의
검수를 거쳤다.

---

## Phase 6: Polish & 실기기 검증

**Purpose**: 계약 문서가 요구한 마지막 확인들.

- [ ] T023 [P] `.maestro/writing-monologue-expansion.yml`을 새로
  작성하거나 015의 `.maestro/writing-monologue.yml`을 확장하고
  `scripts/run-device-tests.mjs`의 `FLOWS`에 등록한다(등록하지 않으면
  파일이 있어도 실행기가 돌리지 않는다 — AGENTS.md 경고). 루이
  (narrative)로 quickstart.md B1~B5를 흐름으로 옮긴다.
- [ ] T024 quickstart.md B1~B5를 실기기(debug 빌드, SM-G986N)에서 최소
  1회 수행한다: 콜드 스타트 문구(B1), 핫 스타트 문구(B2), 많음 갈래
  문구(B3), 사진 보기 정직성 경계(B4, 코드 검사 위주), 로드 실패 시
  독백 미잔존(B5). 결과를 커밋 메시지 또는 AGENTS.md 「016 핵심 결론」
  절(기능 완료 후 추가)에 남긴다.
- [ ] T025 [P] `npm test` 전체(기기 불필요 스위트)와 `npm run lint`를
  돌려 기존 002/003/005/006/007/011/012/013/015 계약 테스트가 전부
  그대로 통과하는지 최종 확인한다(옵셔널 확장이 기존 계약을 깨지
  않았는지의 최종 게이트).
- [ ] T026 [P] `npm run test:logic -- particle.test.ts`로 조사 선택
  함수가 로스터 5인 전부에서 문법적으로 자연스러운 결과를 내는지 사람이
  직접 출력을 읽어 확인한다(quickstart.md A3 — 자동 테스트를 통과해도
  "문법적으로 자연스러운가"는 사람 판단이 최종 확인이다).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: 의존성 없음 — 즉시 시작. 네 User Story
  전부 이 phase를 막는다(BLOCKS). 내부 순서: 타입(T001~T004) →
  llama-port.ts 콜드/핫(T005~T006, LoadResult 타입에 의존) → 조사
  선택(T007~T008, 독립적으로 병행 가능) → monologue.ts 확장
  (T009~T011, 조사 선택 함수(T008)와 branch 타입(T001)에 의존).
- **User Story 1 (Phase 2)**: Foundational 완료 후 시작. 다른 스토리에
  의존하지 않는다. 🎯 MVP.
- **User Story 2 (Phase 3)**: Foundational 완료 후 시작 가능하지만,
  구현 대상(T019)이 User Story 1이 만든 `onProgress` 처리 로직(T017)을
  검토·보강하는 성격이라 **User Story 1 완료 후 진행을 권장**한다.
- **User Story 3 (Phase 4)**: Foundational 완료 후 시작 가능. 신호를
  보내는 쪽(T021)은 완전히 독립적이지만, 화면 쪽 재사용 로직은 User
  Story 1(T017)이 이미 만들어 둔 것에 의존하므로 **User Story 1 완료
  후 진행을 권장**한다.
- **User Story 4 (Phase 5)**: Foundational(특히 T010)이 만든 문구
  초안이 있어야 검수할 대상이 있다 — Foundational 완료 후 아무 때나
  가능하지만 다른 세 스토리와 병행해도 무방하다(검수는 코드 배선과
  무관한 사람의 확인 절차).
- **Polish (Phase 6)**: 네 User Story 완료 후.

### Within Each Phase

- 테스트를 먼저 작성해 실패를 확인한 뒤 구현 태스크를 완성한다
  (AGENTS.md 「개발 방식」).
- `[P]` 표시가 없는 태스크는 같은 파일을 건드리거나 앞 태스크의
  산출물에 의존하므로 순서대로 진행한다.

### Parallel Opportunities

- Phase 1에서 T002·T004·T007은 서로 다른 테스트 파일이므로 병렬 작성
  가능. T007~T008(particle.ts)은 T001~T006(types.ts·engine-port.ts·
  llama-port.ts)과 파일이 겹치지 않으므로 완전히 독립적으로 병행
  가능하다.
- Phase 2의 T012·T014·T015는 서로 다른 파일이므로 병렬 작성 가능(단,
  각각이 대응하는 구현 태스크보다 먼저 끝나야 함).
- Phase 4의 T020은 Phase 2·3과 파일(on-device.ts)이 겹치므로 순서
  주의 — 같은 파일의 다른 함수(`readPhotos()` vs `generate()`)를
  건드리므로 병합 충돌에 유의한다.
- Phase 6의 T023·T025·T026은 서로 다른 관심사이므로 병렬 가능.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1(Foundational) 완료 — 콜드/핫 판정, 2단계 로드 신호 타입,
   조사 선택, 갈래별 10개 이상 문구가 준비된다.
2. Phase 2(User Story 1) 완료 — 화면에서 실제로 캐릭터 이름이 포함된
   콜드/핫 스타트 문구가 보인다.
3. **여기서 멈추고 검증**: quickstart B1·B2를 실기기에서 수행한다.
4. 이 시점에 이미 로드맵이 지목한 015의 가장 큰 공백(모델 로드 단계
   부재)이 메워진 배포 가능한 증분이다.

### Incremental Delivery

1. Foundational → User Story 1 → 실기기 확인(B1·B2) → 배포 가능한 MVP.
2. User Story 2 → 실기기/코드 확인(B4) → 완료.
3. User Story 3 → 실기기 확인(B3) → 완료.
4. User Story 4 → 사람 검수(T022) → 완료.
5. Polish(Maestro 등록, 최종 회귀 테스트, 조사 출력 육안 확인).

---

## Notes

- `[P]` 태스크 = 다른 파일, 의존성 없음.
- `[Story]` 라벨이 태스크를 User Story에 연결한다(추적성).
- 각 구현 태스크 앞의 테스트 태스크는 반드시 먼저 실패를 확인한다
  (AGENTS.md 「개발 방식」).
- 한 축(예: on-device.ts 배선)에 머물지 않고 화면 문구까지 끝까지
  배선한다(AGENTS.md 「한 축을 깊게 파고들고 싶어지면 그것이 실패
  신호다」).
- **`warm`은 새로 재는 값이 아니다** — `llama-port.ts`가 E1을 위해
  이미 하던 판정을 반환값에 실을 뿐이다(T006). 시간을 재서 콜드/핫을
  가르는 코드를 어느 태스크에서도 추가하지 않는다(원칙 IV).
- **로드 시작 신호(`onStage("load")`, branch 없음)에서 화면 상태를
  갱신하지 않는다**(T017) — 별도의 "확인 중" 문구 풀을 만들지 않는다
  (research.md §2).
- **`branch`는 `stage`와 별개 매개변수다** — `ProgressStage`에 `"cold"`·
  `"hot"`·`"normal"`·`"many"` 같은 값을 추가하지 않는다(T001에서 이
  판단을 뒤집지 않는다).
- **015의 `PhotoAdvanceSignal`(`() => void`) 계약을 깨지 않는다** —
  T021이 `branch`를 싣는 자리는 `captionAll()` 호출 전의 별도
  `onStage` 호출이지, `onPhotoStart` 시그니처 변경이 아니다.
- **`monologue.ts`·`particle.ts` 어느 쪽도 `roster.ts`·`persona.ts`·
  `Character`를 import하지 않는다** — 캐릭터 이름은 어느 태스크에서도
  `string` 매개변수로만 흐른다(T010·T017).
