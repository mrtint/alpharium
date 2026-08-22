# Tasks: 사진을 보기 전에 줄인다

**Input**: Design documents from `/specs/013-photo-resize-caption/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/resize.md, quickstart.md

**Tests**: 이 저장소의 헌법(「개발 방식」)이 "계약을 먼저 정하고 테스트를 먼저 쓴다"를
못 박고 있으므로 포함한다. `npm run test:logic`(순수 함수, node 환경)로 돈다 —
`__tests__/vision/`은 `.tsx`가 아니므로 자동으로 `logic` 프로젝트에 잡힌다
(AGENTS.md 「테스트가 두 갈래로 나뉜다」).

**Organization**: Tasks are grouped by user story to enable independent implementation
and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Path Conventions

이 저장소는 단일 프로젝트다. `src/`, `__tests__/`가 리포지토리 루트에 있다
(plan.md「Project Structure」).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 새 의존을 설치하고 헌법 검사 규칙을 먼저 세운다 — 규칙이 먼저 있어야
이후 구현이 그것을 어기는 순간 잡힌다(010·011의 선례).

- [X] T001 `npx expo install expo-image-manipulator`로 새 의존을 추가한다.
      `package.json`의 버전 선언이 실제 설치본과 맞는지 확인한다
      (AGENTS.md 「Expo 작업 시」 — `npm view`가 아니라 `expo install`이 버전을 고른다)
- [X] T002 ~~새 규칙 추가~~ → **불필요로 판명.** `scripts/constitution-rules.ts`의
      `checkVisionFile()`이 이미 `src/vision/` **디렉터리 전체**를 대상으로 하고
      (`normalized.startsWith("src/vision/")`), `__tests__/scripts/check-constitution.test.ts`의
      "실제 src/vision/ 파일이 규칙을 지킨다" 테스트가 `readdirSync(dir)`로 폴더를
      매번 다시 읽으므로 `resize.ts`가 생기자마자 자동으로 검사 대상이 됐다.
      plan.md의 서술("규칙을 추가한다")이 부정확했다 — 실제로는 011이 이미 세운
      경계가 파일명이 아니라 디렉터리 단위였다
- [X] T003 `npm run lint`로 확인 — **통과**(헌법 검사 위반 0건). `resize.ts`가
      `diary/store`·`inference/sampling`에 닿지 않음이 기존 규칙으로 실증됐다

**Checkpoint**: 새 의존이 설치되고 헌법 검사 규칙이 준비됨

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `resize.ts` 계약과 그 순수 판정 로직 — 모든 User Story가 이것을 통해
캡션 경로에 리사이즈를 끼워 넣는다. **이 단계 없이는 어느 User Story도 시작할 수
없다.**

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] `src/vision/resize.ts`에 `ResizeTarget` 상수와 타입을 만든다
      (data-model.md 「ResizeTarget」) — `maxLongEdge: 1024`, export하지 않음
      (FR-002, FR-020: 실측 근거를 주석에 남긴다)
- [X] T005 [P] `src/vision/resize.ts`에 `ResizeResult` 타입을 만든다
      (data-model.md 「ResizeResult」) — `{ ok: true; path: string } | { ok: false }`뿐,
      다른 필드 없음(FR-015)
- [X] T006 `src/vision/resize.ts`에 `resizePhoto(sourcePath, execute?)` 함수를 만든다
      (contracts/resize.md 「함수」·「규칙 C1~C4」) — `execute`를 주입받는 순수 함수,
      예외를 잡아 `{ ok: false }`로 바꾼다(C2)
- [X] T007 `__tests__/vision/resize.test.ts`를 만든다 — C1(이미 작으면 그대로),
      C2(예외를 던지지 않음, throw하는 대역을 주입해 확인), C3(반환 타입에
      지표 필드가 없음을 선언을 직접 읽어 확인 — 007·009의 교훈), C4는 이
      계약 자체가 방향을 모르므로 여기서 검증하지 않음(quickstart D6의 몫)을
      주석으로 남긴다
- [X] T008 `npm run test:logic`으로 T007이 통과하는지 확인한다

**Checkpoint**: `resize.ts` 계약이 서고 순수 로직이 테스트로 지켜짐 — User Story
구현이 이제 시작 가능

---

## Phase 3: User Story 1 - 사진이 있는 하루를 훨씬 빨리 쓴다 (Priority: P1) 🎯 MVP

**Goal**: 사진을 보는 모델에 넘기기 전에 실제로 리사이즈해, 캡션 시간을 절반 이하로
줄인다. 캡션 내용은 이전 수준을 유지한다.

**Independent Test**: 사진 5장이 있는 실사 하루로 일기를 생성하고, 로그의 IMAGE
청크 수와 총 캡션 시간을 013 이전 기록(장당 7~9청크, 129초)과 비교한다
(quickstart.md D2).

### Implementation for User Story 1

- [ ] T009 [US1] `src/inference/on-device.ts`에 `resizePhoto`의 실제 구현
      (`ResizeExecutor`)을 추가한다 — `expo-image-manipulator`의
      `manipulate()`/`resize()`/`renderAsync()`/`saveAsync()`로 리사이즈하고,
      `expo-file-system`의 `File.move()`로 결과를 앱 문서 디렉터리
      (`vision-cache/`)로 옮긴다(research.md R1·R2)
- [ ] T010 [US1] T009의 구현에서 파일명을 `photo.id` 기반으로 결정론적으로
      만든다 — `content://` URI의 `/`·`:` 등을 치환하는 헬퍼를 같은 파일에 둔다
      (research.md R3, data-model.md 「이름 규칙」)
- [ ] T011 [US1] T009의 구현에서 원본이 이미 목표 크기 이하면 리사이즈를
      건너뛰고 `{ ok: true, path: sourcePath }`를 돌려준다(contracts/resize.md C1)
- [ ] T012 [US1] `src/vision/caption.ts`의 `captionAll()`을 수정한다 —
      `resolvePath(photo)` 성공 후, `engine.caption(path)`를 부르기 전에
      `resizePhoto(path)`를 거친다. `ok: false`면 011의 기존 "경로를 못 얻음"
      분기(E4)에 합류시켜 그 장을 건너뛴다(contracts/resize.md 「호출자 쪽 계약」)
- [ ] T013 [US1] `src/inference/on-device.ts`에서 `resizePhoto`의 기본 실행자를
      T009 구현으로 주입하는 배선을 완성한다 — 005·011의 포트 주입 패턴을 따른다
      (기존 `visionSupport()` 함수 확장)
- [ ] T014 [US1] `npm run lint`로 헌법 검사(T002 규칙 포함)를 통과하는지 확인한다

**Checkpoint**: 리사이즈가 캡션 경로에 실제로 들어갔다 — quickstart D1(빌드)·
D2(시간 실측)·D3(품질 확인)을 실기기에서 돌릴 준비가 됨

---

## Phase 4: User Story 2 - 줄이지 못한 사진이 하루를 무너뜨리지 않는다 (Priority: P2)

**Goal**: 리사이즈에 실패하는 사진이 섞여도 나머지 사진은 정상적으로 캡션되고
일기가 나온다.

**Independent Test**: 손상되었거나 극단적인 이미지를 하루에 섞어(010의
`seed:day` 도구로), 나머지 사진의 캡션이 살아 있는지 확인한다(quickstart.md D4).

### Tests for User Story 2

- [ ] T015 [P] [US2] `__tests__/vision/resize.test.ts`에 케이스를 더한다 —
      `execute`가 실패(`{ ok: false }` 또는 throw)하는 사진 하나가 섞인 목록을
      `captionAll()`에 넘겼을 때, 나머지 사진의 캡션은 그대로 담기고 실패한
      장만 `captions`에서 빠지는지 확인한다(011 E4가 리사이즈 실패에도 적용됨을
      검증 — `__tests__/vision/caption.test.ts`가 있다면 거기에 추가, 없다면
      새로 만든다)

### Implementation for User Story 2

- [ ] T016 [US2] T012에서 만든 분기(리사이즈 실패 시 건너뜀)가 T015의 테스트를
      통과시키는지 확인한다 — 별도 구현이 필요하면 `caption.ts`를 보강한다
      (대개는 US1의 T012가 이미 이 요구를 만족시킨다 — 실패 시 확인만 하는
      태스크일 가능성이 높다)

**Checkpoint**: 리사이즈 실패가 하루 전체를 무너뜨리지 않음이 기기 없는 테스트로
확인됨 — quickstart D4(실기기, 합성 하루)로 재확인 가능

---

## Phase 5: User Story 3 - 줄인 사진이 기기에 쌓이지 않는다 (Priority: P2)

**Goal**: 리사이즈 사본이 캡션이 끝나면 치워지고, 여러 번 생성해도 누적되지 않으며,
원본 사진은 어떤 경우에도 바뀌지 않는다.

**Independent Test**: 같은 하루로 일기를 세 번 생성한 뒤 `vision-cache/`의 파일
수와 원본 사진의 상태를 확인한다(quickstart.md D5).

### Tests for User Story 3

- [ ] T017 [P] [US3] `__tests__/vision/caption.test.ts`(또는 관련 스위트)에 케이스를
      더한다 — 캡션이 끝난(성공/실패 무관) 각 장마다 "지우기" 신호가 호출되는지
      확인한다. 지우기 자체는 대역 함수로 주입해 몇 번 불렸는지 센다
      (data-model.md 「생애」 2번 — 장별 정리)
- [ ] T018 [P] [US3] `__tests__/vision/resize.test.ts`에 케이스를 더한다 — T010의
      파일명 함수가 같은 `photo.id`에 대해 항상 같은 이름을 돌려주는지
      (결정론) 확인한다(research.md R3)

### Implementation for User Story 3

- [ ] T019 [US3] `src/vision/caption.ts`의 `captionAll()`에 "그 장의 리사이즈
      사본을 지운다" 단계를 추가한다 — 캡션 성공/실패/그만둠과 무관하게 각 장
      처리가 끝나면(finally 성격) 호출되도록 한다. 지우는 함수도 주입 가능하게
      만들어 T017이 대역으로 검증할 수 있게 한다
- [ ] T020 [US3] `src/inference/on-device.ts`에서 T019가 요구하는 "지우기" 함수의
      실제 구현(`expo-file-system`의 파일 삭제)을 배선한다
- [ ] T021 [US3] T011(C1 — 원본과 같은 경로를 그대로 쓴 경우)에서는 지우기 단계가
      원본을 삭제하지 않는지 확인한다 — `path === sourcePath`일 때 지우기를
      건너뛰는 분기를 T019에 추가한다(FR-006 보호)

**Checkpoint**: 정리·원본 보호가 기기 없는 테스트로 확인됨 — quickstart D5
(실기기, 세 번 생성 후 파일 수 확인)로 재확인 가능

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 실기기 검증과 기록. 013의 완료 기준(AGENTS.md 「테스트」 — "최소
한 번은 실기기에서 돌아야 한다")을 만족시킨다.

- [ ] T022 quickstart.md D1을 실행한다 — `expo prebuild --clean` 후 새 권한이
      필요 없음을 `adb shell dumpsys package`로 확인한다
- [ ] T023 quickstart.md D2를 실행한다 — 실사 사진이 있는 하루로 캡션 시간을
      재고, IMAGE 청크가 7~9개에서 1개로 줄었는지, 총 시간이 129초의 절반
      이하인지 확인한다. **결과를 AGENTS.md에 실측으로 기록한다**(FR-021)
- [ ] T024 quickstart.md D3을 실행한다 — 같은 실행에서 나온 일기와 원본 사진을
      대조해 새로 지어낸 내용이 없는지 확인한다(SC-002)
- [ ] T025 quickstart.md D4를 실행한다 — 010의 `seed:day`로 손상된 이미지를
      섞은 하루에서 나머지 사진의 캡션이 살아있는지 확인한다(SC-005)
- [ ] T026 quickstart.md D5를 실행한다 — 세 번 생성 후 `vision-cache/` 파일 수,
      갤러리 미노출, 원본 사진 무결성을 확인한다(SC-003·004·007)
- [ ] T027 quickstart.md D6을 실행한다 — 방향 정보가 있는 세로 사진으로 캡션을
      돌려 방향이 뒤집히지 않는지 확인한다. **뒤집힌다면** research.md R4의
      fallback(`context.rotate()`를 EXIF 방향값에 따라 적용)을 `on-device.ts`에
      추가하고 D2·D6을 다시 돈다
- [ ] T028 `npm test`(전체)와 `npm run lint`가 모두 통과하는지 최종 확인한다
- [ ] T029 AGENTS.md에 013의 결과를 정리해 기록한다 — 실측 시간, 실기기 확인
      완료 여부, 남은 미확인 사항(있다면)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존 없음 — 바로 시작
- **Foundational (Phase 2)**: Setup 완료 후. **모든 User Story를 막는다**
- **User Story 1 (Phase 3)**: Foundational 완료 후. 다른 스토리 의존 없음 — **MVP**
- **User Story 2 (Phase 4)**: Foundational 완료 후. US1의 `caption.ts` 수정(T012) 위에
  얹히므로 **US1 이후 진행을 권장** — 단, US1의 분기 구조를 검증하는 테스트이므로
  US1과 병행 개발도 가능하다(대상 코드가 겹친다)
- **User Story 3 (Phase 5)**: Foundational 완료 후. US1의 T011(C1 분기)과 함께
  T021을 검증하므로 **US1 이후 진행을 권장**
- **Polish (Phase 6)**: US1~US3 모두 완료 후 — 실기기 검증은 전체 기능이 갖춰진
  뒤에 의미가 있다

### User Story Dependencies

- US2·US3는 기능적으로 US1에 의존한다(US1이 캡션 경로에 리사이즈를 실제로
  끼워 넣어야 US2·US3가 검증할 대상이 생긴다) — spec.md의 "독립 테스트 가능"
  원칙은 지키되, **구현 순서는 P1 → P2 순서를 따른다**

### Within Each User Story

- 계약(Foundational)이 테스트보다 먼저다 — 이미 Phase 2에서 확정됨
- 대역을 주입하는 순수 함수(caption.ts 분기)가 실제 구현(on-device.ts)보다 먼저
  테스트 가능해야 한다 — T012가 T009보다 먼저 오는 것도 이 때문
  (실제로는 병렬 가능: T009는 [P], T012는 T006에만 의존)

### Parallel Opportunities

- T004·T005는 다른 타입 선언이라 병렬 가능
- T009(on-device.ts 구현)와 T012(caption.ts 배선)는 서로 다른 파일이며 T006
  (계약)에만 의존하므로 병렬 가능
- T015·T017·T018은 서로 다른 테스트 케이스이므로 병렬 가능

---

## Parallel Example: Foundational

```
Task: "src/vision/resize.ts에 ResizeTarget 상수를 만든다"
Task: "src/vision/resize.ts에 ResizeResult 타입을 만든다"
```

(같은 파일이므로 실제로는 한 번에 작성하는 것이 더 간단할 수 있다 — [P]는
개념적 독립성을 표시하는 것이지 반드시 다른 에이전트가 동시에 써야 한다는
뜻은 아니다)

## Parallel Example: User Story 1

```
Task: "on-device.ts에 resizePhoto의 실제 구현을 추가한다"
Task: "caption.ts의 captionAll()에 resizePhoto 호출을 끼워 넣는다"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) 완료
2. Phase 2 (Foundational) 완료 — 계약과 순수 테스트
3. Phase 3 (US1) 완료
4. **STOP and VALIDATE**: quickstart D1~D3으로 US1을 실기기에서 확인한다 —
   이것만으로 SC-001(속도)·SC-002(품질)가 증명된다
5. 여기서 멈춰도 배포 가능한 증분이다 — US2·US3는 안전성 보강이다

### Incremental Delivery

1. Setup + Foundational → 계약이 섬
2. US1 추가 → 실기기 확인(D1~D3) → **속도 개선이 실제로 동작함을 증명**
3. US2 추가 → 실기기 확인(D4) → 손상된 사진에도 안전함을 증명
4. US3 추가 → 실기기 확인(D5·D6) → 저장공간·원본 보호까지 증명
5. Polish(T028·T029) → 전체 검증 완료 기록

---

## Notes

- [P] tasks = 다른 파일이거나 개념적으로 독립적인 작업
- [Story] 라벨이 태스크를 spec.md의 User Story로 추적 가능하게 한다
- 이 저장소의 실기기 검증 규칙(AGENTS.md)을 따른다 — 새 의존이 표준 Expo
  autolinking 모듈이므로 **debug 1회로 충분**, release 재확인 불필요
- 각 태스크 완료 후 커밋한다(사용자 요청 시)
- Phase 2(Foundational)가 끝나기 전에는 어느 User Story도 시작하지 않는다
