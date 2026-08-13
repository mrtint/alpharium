# Tasks: 캐릭터별 모델 파일 확보

**Input**: Design documents from `/specs/003-character-model-files/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: 테스트 작업을 **포함한다**. 헌법 「개발 방식」이 "계약을 먼저 정하고 테스트를 먼저
쓴다"를 MUST로 요구하고, 계약 4개가 검증 표 57행을 이미 갖고 있다.

**Organization**: 작업은 사용자 스토리별로 묶여 독립적으로 구현·검증된다.

**이 기능은 실기기 검증이 완료 조건이다**(FR-036, FR-037). 002와 다른 점이며, 기기 없이
전부 초록불이어도 끝난 것이 아니다. Phase 9가 그 자리다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 미완료 의존 없음)
- **[Story]**: 해당 사용자 스토리 (US1~US5)
- 모든 작업에 정확한 파일 경로를 적는다

## Path Conventions

001·002의 구조를 그대로 쓰고 한 자리를 새로 연다. 저장소 루트 기준:

- 기존: `src/config/`, `src/inference/`, `src/signals/`, `src/diary/`, `src/diagnostics/`, `src/ui/`
- 신규: `src/models/` — AGENTS.md가 "모델 파일을 다루는 기능의 몫"으로 예약한 자리
- 테스트: `__tests__/models/`, 실기기: `.maestro/`

**손대지 않는 것**: `src/inference/select.ts`, `src/config/policy.ts`,
`src/config/environment.ts`, `src/config/day-boundary.ts`, `src/signals/*`,
`src/diary/store.ts`, `src/diary/types.ts`, `src/diary/request.ts` (FR-031).

---

## Phase 1: Setup (공유 기반)

**Purpose**: 새 자리를 열고, 002가 이미 쓰고 있는데 선언되지 않은 의존을 바로잡는다.

- [ ] T001 `src/models/`, `__tests__/models/` 디렉터리 생성 (plan.md 「Source Code」 구조대로)
- [ ] T002 `package.json`의 `dependencies`에 `expo-file-system` 추가 — **설치본(57.0.2)에 선언을 맞춘다**(research.md §7). 002가 `src/diary/store.ts:246`에서 이미 쓰는데 선언이 없어 다음 설치에서 사라질 수 있다. 버전을 추측하지 않고 설치본을 그대로 적는다
- [ ] T003 `package.json`/`package-lock.json` 검증 — `npx expo install --check`와 `npm run lint` 통과 확인. T002가 기준선을 깨지 않았는지

**Checkpoint**: 새 자리가 열렸고 의존 선언이 설치본과 맞는다

---

## Phase 2: Foundational (차단 전제)

**Purpose**: 모든 스토리가 의존하는 **타입과 경계**. 특히 `roster.ts`가 원칙 III의 유일한
통과 지점이므로 여기서 정해진다.

**⚠️ CRITICAL**: US1~US5 전부가 이 단계를 기다린다

- [ ] T004 `src/models/types.ts`에 **바깥쪽 타입** 정의 — `ModelReadiness`(넷), `DownloadProgress`, `DownloadFailure`, `StorageUsage` (data-model.md). **`DownloadProgress`에 바이트·시간 필드를 넣지 않는다**(FR-013a, FR-034) — `totalBytes`가 곧 모델 크기다
- [ ] T005 [P] `src/models/types.ts`에 **안쪽 타입** 정의 — `ModelAsset`(key·url·expectedBytes·md5), `AssetKey`, `VerificationVerdict`(assetKey 포함), `PausedDownload`. **`VerificationVerdict`에 시각을 담지 않는다**(원칙 IV)
- [ ] T006 [P] `src/models/port.ts`에 통로 정의 — 파일(존재·크기·삭제·md5), 네트워크(내려받기 작업), 공간(남은 바이트). **`expo-file-system`을 직접 부르지 않고 주입받는다** — 002의 `FileSystemPort`와 같은 방식이라 기기 없이 대역으로 갈아끼운다
- [ ] T007 `__tests__/models/roster.test.ts` 작성 — contracts/roster.md 「검증 표」 R1~R8. **R6(역방향 함수 없음)·R7(process.env 없음)이 원칙 III의 방어선이다**
- [ ] T008 `src/models/roster.ts` 구현 — `assetFor(character)`와 `CHARACTERS` 재수출만. **`allAssets()`도 `characterFor()`도 만들지 않는다**(FR-003, FR-010). 실제 url·크기·md5는 자리만 두고 저장소 소유자가 채운다(research.md 「미해결」)

**Checkpoint**: 타입과 매핑 경계가 정해졌다 — 스토리 작업 시작 가능

---

## Phase 3: User Story 1 - 어느 캐릭터를 지금 쓸 수 있는지 알 수 있다 (Priority: P1) 🎯 MVP

**Goal**: 준비 상태를 넷으로 가른다. **이 기능에서 헌법 원칙 V가 걸리는 지점이며, 다른 축이
묻는 값이다.**

**Independent Test**: `npm test -- readiness`로 전부 기기 없이 검증된다 — 판정이 순수
함수이기 때문이다. 파일이 있는·없는·잘린·깨진 상태를 입력으로 만들어 넷이 갈리는지 본다.

**MVP인 이유**: 무엇을 받아야 하는지 알려면 지금 무엇이 있는지부터 판정해야 한다. 002의
`generate()`가 "모델이 없다"를 말하려면 이것이 있어야 하고, 순수 함수라 가장 빨리 끝난다.

### Tests for User Story 1 ⚠️ 먼저 쓰고, 실패를 확인한 뒤 구현한다

- [ ] T009 [P] [US1] `__tests__/models/readiness.test.ts` — contracts/readiness.md 검증 표 D1~D6. **D5(넷이 서로 구분된다)가 원칙 V의 방어선이다**(SC-003)
- [ ] T010 [US1] `__tests__/models/readiness.test.ts`에 D7~D10 추가 — 검증 결과 없음/파일 사라짐/크기 다름/다른 자산의 결과. **D8이 명확화 세션의 결론이다**(FR-021e, SC-019)
- [ ] T011 [P] [US1] `__tests__/models/readiness.test.ts`에 D15 추가 — `reason`에 모델 정보가 없다(FR-004)

### Implementation for User Story 1

- [ ] T012 [US1] `src/models/readiness.ts` 구현 — `readinessOf(input)` 순수 함수. contracts/readiness.md 「넷을 가르는 규칙」 7행 순서대로. **안에서 파일 시스템을 부르지 않는다** — 002의 `day-boundary.ts`가 `now`를 인자로 받은 것과 같은 이유
- [ ] T013 [US1] `src/models/storage.ts`에 상태 조회 구현 — `state.json`을 읽어 검증 결과·중단 상태를 준다(contracts/storage.md 「메타데이터를 한 파일에 모으는 이유」). **파일 내용을 읽지 않는다**(SC-016)
- [ ] T014 [US1] `src/models/port.ts`의 `expo-file-system` 구현 — 존재·크기 확인. 지연 import(001·002와 같은 이유). `Paths.document/models/` 아래

**Checkpoint**: 준비 상태 넷이 갈리고 기기 없이 검증된다. **여기까지가 MVP다**

---

## Phase 4: User Story 4 - 받은 파일이 온전한지 확인된다 (Priority: P1)

**Goal**: 크기가 아니라 **내용**으로 검증한다. 검증을 통과해야 "쓸 수 있음"이 된다.

**Independent Test**: 온전한 파일과 **크기는 같지만 내용이 훼손된** 파일을 각각 두고 판정이
갈리는지. 크기만 보는 검증으로는 통과해 버리는 경우가 핵심 시험이다.

**US1 다음인 이유**: 판정 규칙(T012)이 검증 결과를 입력으로 받으므로 그 모양이 먼저 정해져야
한다. 스토리 번호는 US4지만 **의존 순서상 여기가 맞다.**

### Tests for User Story 4 ⚠️

- [ ] T015 [P] [US4] `__tests__/models/verification.test.ts` — contracts/readiness.md D11. **크기는 같고 md5가 다른 파일이 걸리는지**(SC-015). 이것이 이 스토리의 존재 이유다
- [ ] T016 [US4] `__tests__/models/verification.test.ts`에 검증 결과 보관·복원 검증 추가 — `assetKey`가 함께 남는지(설계 발견), 결과가 사라지면 `ready`가 아닌지(FR-021c)

### Implementation for User Story 4

- [ ] T017 [US4] `src/models/verification.ts` 구현 — 파일의 md5를 자산의 지문과 견준다. `File.info({ md5: true })`를 쓴다(research.md §2). **내려받기 직후 한 번만 부른다**(FR-021a)
- [ ] T018 [US4] `src/models/storage.ts`에 검증 결과 쓰기 구현 — 임시 파일에 쓰고 옮긴다(원자적, 002와 동형). 쓰다 죽으면 결과 전체를 잃으므로
- [ ] T019 [US4] `src/models/verification.ts`에 어긋난 결과 정리 추가 — 파일이 없거나 크기가 다르면 남은 결과를 지운다(FR-021e). **어긋난 채 방치하지 않는다**(SC-019)

**Checkpoint**: 훼손된 파일이 "쓸 수 있음"으로 통과하지 않는다

---

## Phase 5: User Story 2 - 고른 캐릭터의 모델만 내려받는다 (Priority: P1)

**Goal**: 헌법 로스터의 **"고른 캐릭터의 모델만 내려받는 구조"** 를 성립시킨다.

**Independent Test**: 한 캐릭터를 골라 시작한 뒤 대역의 요청 목록에 하나만 있는지, 다른
캐릭터의 파일이 생기지 않는지.

### Tests for User Story 2 ⚠️

- [ ] T020 [P] [US2] `__tests__/models/acquisition.test.ts` — contracts/acquisition.md A1~A3. **A1(고른 것만)·A2(다른 것 안 생김)가 헌법 로스터의 방어선이다**(SC-002)
- [ ] T021 [US2] `__tests__/models/acquisition.test.ts`에 A15~A17 추가 — 둘째 요청 거부, 앞의 것 유지, 멈추면 통함. **A17이 없으면 사용자가 갇힌다**(FR-020a)
- [ ] T022 [US2] `__tests__/models/acquisition.test.ts`에 A12~A14, A18 추가 — 공간 부족이 시작 전에 걸리는지, **딱 맞으면 시작 안 하는지**(FR-019b), 안내에 크기가 없는지, 덜 받은 것이 완료가 아닌지

### Implementation for User Story 2

- [ ] T023 [US2] `src/models/acquisition.ts`에 시작 전 확인 구현 — contracts/acquisition.md 「시작하기 전에 보는 것」 4행 순서대로. **공간은 예상 크기의 1.15배를 요구한다**(research.md §3, **잠정값 — T042에서 실측 확정**)
- [ ] T024 [US2] `src/models/acquisition.ts`에 한 번에 하나 강제 구현 — 진행 중인 작업을 **메모리에 하나** 들고 뒤의 요청은 `busy`로 거부. **저장소에 남기지 않는다** — 남기면 앱이 죽었을 때 영원히 진행 중인 캐릭터가 생긴다(002의 `running` Set과 같은 판단)
- [ ] T025 [US2] `src/models/port.ts`에 공간 조회 구현 — `Paths.availableDiskSpace`(research.md §1). 지연 import

**Checkpoint**: 고른 하나만 받아지고, 둘째 요청이 거부되며, 공간이 먼저 걸린다

---

## Phase 6: User Story 3 - 내려받는 동안 무슨 일이 일어나는지 보인다 (Priority: P1)

**Goal**: 진행률·중단·재개. **GB 파일이라 이것이 부가 기능이 아니라 본체다.**

**Independent Test**: 진행률이 갱신되는지, 중단이 멈추는지, 재개가 처음부터 받지 않는지.
대역으로 검증하되 **실제 중단·재개는 Phase 9에서 기기로 확인한다**(FR-037).

### Tests for User Story 3 ⚠️

- [ ] T026 [P] [US3] `__tests__/models/acquisition.test.ts`에 A4~A6 추가 — 진행률이 캐릭터 단위인지, **시간 정보가 없는지**(원칙 IV), `totalBytes: -1`이면 "모름"인지(원칙 V)
- [ ] T027 [US3] `__tests__/models/acquisition.test.ts`에 A7~A11 추가 — 중단·이어받기·앱 종료 후 재개·끊김 표현. **A11(실패가 "받았음"이 아니다)이 원칙 V다**
- [ ] T028 [US3] `__tests__/models/acquisition.test.ts`에 A19~A20 추가 — 완료 후 검증이 도는지, 실패에 "대신 쓸 자산"이 없는지(FR-035, 원칙 I)

### Implementation for User Story 3

- [ ] T029 [US3] `src/models/port.ts`에 내려받기 작업 구현 — `File.createDownloadTask`의 `pause`/`resumeAsync`/`savable`/`fromSavable`를 감싼다(research.md §1). **재개를 우리가 만들지 않고 보관한다**
- [ ] T030 [US3] `src/models/acquisition.ts`에 진행률 구현 — `bytesWritten`/`totalBytes`를 **`0~1` 또는 "모름"으로만** 밖에 내준다(FR-013a). `totalBytes`가 `-1`이면 자산의 예상 크기로 갈음하되 그것과도 어긋나면 "모름"
- [ ] T031 [US3] `src/models/acquisition.ts`에 중단·재개 구현 — 중단 시 `savable()`을 `state.json`에 저장, 재개 시 `fromSavable()`로 복원(FR-015, FR-016). **`paused` 상태에서만 `savable()`을 부를 수 있으므로**, 앱이 갑자기 죽어 저장하지 못한 경우도 `partial`로 다뤄야 한다
- [ ] T032 [US3] `src/models/acquisition.ts`에 완료 판정 구현 — 받은 양이 예상 크기에 이르러야 완료(FR-001b, SC-014). 완료 직후 검증(T017)을 부른다

**Checkpoint**: 진행률이 보이고, 멈췄다 이어받을 수 있다

---

## Phase 7: User Story 5 - 지우고 공간을 되찾을 수 있다 (Priority: P2)

**Goal**: 헌법 원칙 III의 **"로스터는 켜고 끌 수 있다"** 의 나머지 절반.

**Independent Test**: 지운 뒤 `not-downloaded`로 돌아가는지, 부분 파일도 사라지는지,
**일기는 남는지**.

### Tests for User Story 5 ⚠️

- [ ] T033 [P] [US5] `__tests__/models/storage.test.ts` — contracts/storage.md S1~S7. **S4(부분 파일도 지워짐)·S6(일기는 남음)이 빠뜨리기 쉬운 둘이다**
- [ ] T034 [US5] `__tests__/models/storage.test.ts`에 S8~S14 추가 — 공간 표시가 캐릭터 단위인지, 파일명이 모델명·캐릭터 식별자가 아닌지, 메타 쓰기가 원자적인지

### Implementation for User Story 5

- [ ] T035 [US5] `src/models/storage.ts`에 삭제 구현 — 모델 파일·검증 결과·중단 상태·**부분 파일**을 함께 지운다(FR-029). `src/diary/`는 건드리지 않는다(FR-030)
- [ ] T036 [US5] `src/models/storage.ts`에 공간 사용 조회 구현 — **캐릭터 단위로 합산**한다(FR-028a). 부분 파일도 합산 — 사용자가 보는 것은 "지금 차지하는 자리"다

**Checkpoint**: 지우면 공간이 실제로 비고, 일기는 남는다

---

## Phase 8: 화면과 002 잇기

**Purpose**: 엔드유저가 보는 **첫 화면**이 생긴다. 001·002는 진단 화면뿐이었다.

**⚠️ 원칙 III이 실제로 시험받는 자리다.**

- [ ] T037 `src/ui/CharacterListScreen.tsx` 구현 — 다섯 자리를 전부 "받아야 함"으로 보이고 각각 준비를 시작할 수 있다(FR-005a). **추천·기본 선택 없이 다섯이 같은 자격**(FR-005b), **설명 문안을 짓지 않는다**(FR-005c). 화면은 `Character`와 `ModelReadiness`만 받는다 — `ModelAsset`을 import 하지 않는다
- [ ] T038 `src/diary/pipeline.ts`에 준비 확인 단계 추가 — `PipelineStage`에 갈래 하나, `PipelineDeps`에 준비 상태를 묻는 함수 하나(research.md §6). **`request-build` 다음, `generation` 앞**. 002의 `store.ts`·`types.ts`·`request.ts`는 손대지 않는다
- [ ] T039 [P] `__tests__/diary/pipeline.test.ts`에 D13~D14 추가 — 준비 안 된 캐릭터면 생성 전에 멈추는지(FR-008), **대체 모델로 생성되지 않는지**(FR-008a, SC-005). 002의 기존 테스트는 그대로 통과해야 한다

**Checkpoint**: 첫 화면이 뜨고, 파이프라인이 준비되지 않은 캐릭터를 막는다

---

## Phase 9: 실기기 검증 — **완료 조건** (FR-036, FR-037)

**Purpose**: 실제로 내려받아지는지는 기기에서만 확인된다. **여기까지 와야 이 기능이 끝난다.**

**건너뛴 실기기 테스트는 통과가 아니다**(헌법 원칙 V).

- [ ] T040 `.maestro/model-acquisition.yml` 작성 — quickstart.md F절 「자동으로 확인되는 것」 5행: 다섯 자리가 보이는지, 전부 "받아야 함"인지, **화면에 모델 정보가 없는지**, 진행률이 캐릭터 단위인지, 다 받으면 "쓸 수 있음"이 되는지
- [ ] T041 `scripts/run-device-tests.mjs`에 새 흐름 등록 — 001의 실행기가 `skeleton.yml` 하나만 돌리고 있다. **건너뜀과 통과를 구분하는 성질을 유지한다**
- [ ] T042 실기기에서 손으로 확인 — quickstart.md F1~F7. **F1(앱 죽였다 이어받기)과 F6(여유 비율 실측)이 핵심이다**
- [ ] T043 **F6 실측값으로 T023의 1.15배를 확정한다** — research.md §3과 quickstart.md의 잠정값을 실측으로 고친다. 지금 값은 **추측이며**(원칙 V) 이 작업 전까지 확정된 사실로 적지 않는다

**Checkpoint**: 실기기에서 실제로 받아지고 검증을 통과한다 — **이 기능이 끝났다**

---

## Phase 10: 헌법 검증과 마무리

**Purpose**: 원칙 III·IV가 코드에 실제로 지켜지는지 기계로 확인한다.

- [ ] T044 [P] quickstart.md C절의 grep 4개 실행 — 자산이 `roster.ts` 밖에 없는지, **`src/ui/`가 자산을 만지지 않는지**, 진행률에 바이트가 없는지, `src/models/`에 `process.env`가 없는지(FR-002)
- [ ] T045 [P] quickstart.md B·D·E절의 grep 실행 — 실패에 대체 자산 없음(원칙 I), **속도 측정 없음**(원칙 IV), 진행률이 "모름"을 표현함(원칙 V)
- [ ] T046 [P] `AGENTS.md` 갱신 — `src/models/`가 열렸음, 캐릭터→모델 매핑이 `roster.ts`에만 있음, `generate()`는 여전히 `not-implemented`임을 적는다. **"아직 없고 앞으로 생길 자리"에서 매핑 항목을 옮긴다**
- [ ] T047 `npm test` + `npm run lint` + `npm run test:device` 전부 통과 확인. quickstart.md 「끝났다고 말할 수 있는 조건」 6행을 하나씩 짚는다

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 의존 없음
- **Phase 2 (Foundational)**: Phase 1 이후. **US1~US5 전부를 차단한다**
- **Phase 3 (US1)**: Phase 2 이후. 다른 스토리에 의존하지 않는다
- **Phase 4 (US4)**: Phase 3 이후 — 판정이 검증 결과를 입력으로 받으므로 모양이 먼저
- **Phase 5 (US2)**: Phase 2 이후. **Phase 3·4와 병렬 가능**
- **Phase 6 (US3)**: Phase 5 이후 — 내려받기 시작이 있어야 진행·중단이 의미를 갖는다
- **Phase 7 (US5)**: Phase 2 이후. **Phase 3~6과 병렬 가능** — 삭제는 받기와 독립이다
- **Phase 8 (화면·파이프라인)**: Phase 3~7 이후 — 보일 상태가 있어야 화면이 있다
- **Phase 9 (실기기)**: Phase 8 이후. **완료 조건**
- **Phase 10 (마무리)**: Phase 9 이후

### 스토리 의존

- **US1 (P1)**: Phase 2 이후 즉시. 독립
- **US4 (P1)**: US1의 판정 규칙과 짝이다 — 검증 결과의 모양을 공유한다
- **US2 (P1)**: 독립. US1과 병렬 가능
- **US3 (P1)**: US2 이후 (받기 시작이 있어야 진행·중단이 있다)
- **US5 (P2)**: 독립. 전부와 병렬 가능

### 병렬 기회

- T005·T006 (타입·통로, 다른 관심사)
- T009·T011 (US1 테스트, 서로 독립)
- **Phase 5(US2)는 Phase 3~4와 통째로 병렬 가능** — 타입만 의존한다
- **Phase 7(US5)은 Phase 3~6과 통째로 병렬 가능** — 삭제는 받기와 독립이다
- T044·T045·T046 (grep 검사와 문서, 서로 독립)

**주의**: 같은 파일을 만지는 작업에는 `[P]`를 붙이지 않았다. `acquisition.test.ts`는
T020~T022·T026~T028이 함께 쓰므로 순차이고, `storage.ts`는 T013·T018·T035·T036이 나눠
만지므로 순차다.

---

## Parallel Example: Phase 2 이후

```bash
# US1과 US2를 동시에 시작할 수 있다 (타입만 의존):
Task: "__tests__/models/readiness.test.ts — 넷이 갈리는지 (D1~D6)"
Task: "__tests__/models/acquisition.test.ts — 고른 것만 받는지 (A1~A3)"
Task: "__tests__/models/storage.test.ts — 지우면 일기가 남는지 (S1~S7)"
```

---

## Implementation Strategy

### MVP 우선 (Phase 1~3)

1. Phase 1 Setup — 자리 열고 의존 선언 바로잡기
2. Phase 2 Foundational (**전부를 차단하므로 먼저**)
3. Phase 3 US1 — 준비 상태 넷이 갈린다
4. **멈추고 검증**: `npm test -- readiness`로 원칙 V가 지켜지는지 확인

**왜 US1이 MVP인가**: 002의 파이프라인이 묻는 값이 이것이고, 순수 함수라 기기 없이 전부
검증된다. 무엇을 받을지 정하려면 지금 무엇이 있는지부터 알아야 한다.

### 증분 전달

1. Phase 1~2 → 바닥과 매핑 경계
2. Phase 3 → 준비 상태 판정 (MVP)
3. Phase 4 → 내용 검증
4. Phase 5~6 → 실제로 받기
5. Phase 7 → 지우기 (3~6과 병렬 가능)
6. Phase 8 → 첫 화면과 002 잇기
7. **Phase 9 → 실기기. 여기까지 와야 끝난다**
8. Phase 10 → 헌법 검증과 문서

### 완료 판정

**이 기능은 실기기 없이 완료되지 않는다.** 002와 다른 점이며 FR-036이 명시한다.

기기 없이 전부 초록불이어도 **T042·T043이 남아 있으면 끝난 것이 아니다.** GB 단위 쓰기,
저장 공간 판정, 앱 종료 후 이어받기는 모의로 검증되지 않는 성질이다.

**T043이 특히 중요하다** — 공간 여유 1.15배는 지금 **추측**이고, 실측으로 바꾸기 전까지
research.md와 quickstart.md에 그렇게 적혀 있어야 한다(헌법 원칙 V).

---

## Notes

- `[P]` = 다른 파일, 의존 없음
- 테스트를 먼저 쓰고 **실패를 확인한 뒤** 구현한다 (헌법 「개발 방식」)
- 계약의 검증 표 각 행이 테스트 케이스다 — 표를 옮겨 적는 것으로 시작한다 (R8+D15+A20+S14 = 57행)
- 커밋 메시지는 한국어로 쓴다 (헌법 「개발 방식」)
- **001·002의 코드를 손대지 않는다**: `select.ts`, `policy.ts`, `environment.ts`,
  `day-boundary.ts`, `signals/*`, `diary/store.ts`·`types.ts`·`request.ts`.
  `diary/pipeline.ts`만 T038에서 갈래 하나를 더한다
- **모델 정보가 화면으로 새는 것이 이 기능의 핵심 위험이다.** 코드를 쓰다 진행률에
  바이트를, 오류에 URL을, 파일명에 모델명을 넣고 싶어지면 멈춘다(원칙 III)
- 한 축을 깊게 파고들고 싶어지면 멈춘다. **"받았으니 돌려보자"가 정확히 그것이다** —
  추론 실행·프롬프트·시각 인코더는 범위 밖이고 `generate()`는 `not-implemented` 그대로다
