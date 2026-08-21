---
description: "Task list for 007 — 최소버전 일기의 UI/UX 개선"
---

# Tasks: 최소버전 일기의 UI/UX 개선

**Input**: Design documents from `/specs/007-diary-ui-refinement/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: **필수다.** 헌법 「개발 방식」이 "계약을 먼저 정하고 테스트를 먼저 쓴다"를
MUST로 정했다. 각 스토리의 테스트를 **먼저 쓰고 실패를 확인한 뒤** 구현한다.

**Organization**: 스토리별로 묶어 각각 독립적으로 구현·검증·중단할 수 있게 한다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능 (서로 다른 파일, 미완 작업에 의존하지 않음)
- **[Story]**: US1~US4 — spec.md의 사용자 스토리
- 파일 경로를 반드시 적는다

## Path Conventions

이 저장소는 **단일 Expo 프로젝트**다. 소스는 `src/`, 테스트는 `__tests__/`,
실기기 흐름은 `.maestro/`에 둔다(plan.md의 구조 결정).

---

## Phase 1: Setup

**Purpose**: 007은 새 의존도 새 폴더도 만들지 않는다. 시작 전에 그것을 확인만 한다.

- [X] T001 현재 기준선을 확인한다 — `npm test`와 `npm run lint`가 통과하는 것을 보고 시작한다. **실패가 있으면 007이 만든 것이 아니므로 먼저 가른다**
- [X] T002 [P] `node_modules/react-native`에서 `ActivityIndicator` export와 **`progress` prop이 없는 것**을 확인한다 — research.md §1의 근거를 직접 본다(SC-015)

**⚠️ 새 패키지를 설치하지 않는다**(FR-028, SC-015). `npm install`이 필요하면 그 시점에
설계가 틀린 것이다.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 여러 스토리가 함께 쓰는 배선. **US1과 US2가 둘 다 여기에 막힌다.**

**⚠️ CRITICAL**: 이 단계가 끝나기 전에는 어떤 스토리도 실기기에서 검증되지 않는다.

### ★ 끊긴 배선 잇기 (research.md §3 — 005 FR-014b가 죽어 있다)

- [X] T003 `__tests__/inference/select.test.ts`에 **온디바이스 선택 결과에 `stop`이 있는지** 검사하는 테스트를 더한다 — [contracts/selection.md](contracts/selection.md) §3 표 1·2번. **실패를 확인한다**
- [X] T004 [src/inference/select.ts](../../src/inference/select.ts)가 `StoppableBackend`를 `InferenceBackend`로 **좁히지 않고** 돌려주도록 반환 타입을 넓힌다 (T003을 통과시킨다)
- [X] T005 `__tests__/app/wiring.test.ts`에 **`createAppPipeline()` 결과에 `stop`이 실리는지** 검사하는 테스트를 더한다 — 계약 §3 표 3번 포함. **실패를 확인한다**
- [X] T006 [src/app/wiring.ts](../../src/app/wiring.ts)의 `AppPipelineResult`에 `stop?`을 더하고 backend에서 실어 보낸다 (T005를 통과시킨다)

**Checkpoint A**: `stop`이 조립 결과까지 온다. **아직 화면에는 닿지 않았다** — 그것은
US2의 몫이다(T024).

### 선택의 영속화 (US1이 쓰고 US4가 읽는다)

- [X] T007 [P] `__tests__/app/selection.test.ts`에 [contracts/selection.md](contracts/selection.md) §1 **검증 표 7줄 전부**를 테스트로 옮긴다. **실패를 확인한다**
- [X] T008 [P] `__tests__/app/selection-store.test.ts`에 계약 §2 **검증 표 중 기기 불필요 6줄**(1~5·7)을 대역 통로로 옮긴다. **실패를 확인한다**
- [X] T009 [src/app/selection.ts](../../src/app/selection.ts)를 새로 만들어 `SelectionState`와 `resolveSelection()`을 구현한다 — [data-model.md](data-model.md) §2 전이표. **순수 함수만 둔다** (T007을 통과시킨다)
- [X] T010 [src/app/selection-store.ts](../../src/app/selection-store.ts)를 새로 만들어 `SelectionPort`·`loadSelection()`·`saveSelection()`을 구현한다. **기기에 닿는 유일한 자리이며 통로를 주입받는다** (T008을 통과시킨다)
- [X] T011 `selection-store.ts`에 `expo-file-system` 통로 구현을 더한다 — **임시 파일에 쓰고 옮기는** 003의 [expo-port.ts:115](../../src/models/expo-port.ts#L115) 패턴을 따르고, **일기 디렉터리 밖에 둔다**(data-model.md §1)

**Checkpoint B**: 선택 규칙과 저장이 기기 없이 전부 검증된다. 화면은 아직 없다.

---

## Phase 3: User Story 1 - 어느 캐릭터가 쓸지 고른다 (Priority: P1) 🎯 MVP

**Goal**: 사용자가 준비된 캐릭터 중 하나를 골라 그것으로 일기를 쓰고, 그 선택이
앱을 껐다 켜도 남는다. **헌법 원칙 III이 요구하는 「고르는 행위」를 화면에 되돌린다.**

**Independent Test**: 캐릭터 둘을 준비하고 하나를 고른 뒤, 일기를 쓰고, 앱을 완전히
종료했다 다시 열어 선택이 유지되는 것을 확인한다([quickstart.md](quickstart.md) §2).

### Tests for User Story 1 ⚠️ 먼저 쓰고 실패를 확인한다

- [X] T012 [P] [US1] `__tests__/ui/character-picker.test.tsx`에 [contracts/selection.md](contracts/selection.md) §4 **검증 표 7줄**을 옮긴다 — 특히 5번(모델 정보 0건)과 7번(`imaginative` 고지)
- [X] T013 [P] [US1] `__tests__/ui/character-picker.test.tsx`에 **이 파일이 `roster.ts`·`ModelAsset`을 import 하지 않는 것**을 검사하는 테스트를 더한다 — 계약 §4의 "모듈 그래프로도 검증한다"

### Implementation for User Story 1

- [X] T014 [US1] [src/ui/CharacterPicker.tsx](../../src/ui/CharacterPicker.tsx)를 새로 만든다. **받는 것은 `Character`와 준비 여부(불리언)뿐이며** 바이트·주소·지문을 받지 않는다 (T012·T013을 통과시킨다)
- [X] T015 [US1] `CharacterPicker`에 `imaginative`의 「상상을 섞는다」 고지를 더한다 — **헌법 로스터가 MUST로 요구한 것이며 FR-009의 유일한 예외다.** 나머지 넷에는 성격 문안을 붙이지 않는다
- [X] T016 [US1] [App.tsx](../../App.tsx)의 `readyCharacter()`를 **걷어내고** `resolveSelection()`으로 갈음한다 — **말없이 첫 준비된 것을 집던 자리가 이 결함의 근원이다**(FR-008)
- [X] T017 [US1] `App.tsx`에서 선택을 읽고 저장하는 배선을 잇는다 — 앱이 뜰 때 `loadSelection()`, 고를 때 `saveSelection()`
- [X] T018 [US1] 준비된 캐릭터가 하나도 없을 때 「캐릭터를 먼저 준비해야 한다」와 가는 길을 보인다 — **006 FR-028의 경로를 재사용하고 새로 만들지 않는다**(FR-006)
- [X] T019 [US1] `__tests__/app/state.test.ts`에 옮김 알림(`movedFrom`)이 화면까지 전해지는 것을 검사하는 테스트를 더하고 통과시킨다 (FR-005a, SC-003a)

**Checkpoint**: 캐릭터를 고를 수 있고 선택이 남는다. **US1만으로도 배포할 만하다** —
헌법 원칙 III의 가장 큰 구멍이 메워진다.

---

## Phase 4: User Story 2 - 기다리는 30초를 견딘다 (Priority: P1)

**Goal**: 생성 중 화면이 살아 있음을 보이고, 사용자가 그만둘 수 있다.
**005 FR-014b의 끊김이 처음으로 실제로 동작한다.**

**Independent Test**: 실기기에서 일기 쓰기를 누르고 화면이 정지하지 않는 것을 보고,
도중에 그만두어 목록으로 돌아오는 것을 확인한다([quickstart.md](quickstart.md) §3).

### Tests for User Story 2 ⚠️ 먼저 쓰고 실패를 확인한다

- [X] T020 [P] [US2] `__tests__/ui/diary-home.test.tsx`에 [contracts/screens.md](contracts/screens.md) §1 **검증 표 1~4번**을 옮긴다 — 회전 표시가 있고, 숫자·단계 이름이 0건이며, **`AppScreen`의 `writing`에 필드가 없는 것**(T023이 이것을 못 박는다)
- [X] T021 [P] [US2] `__tests__/ui/diary-home.test.tsx`에 계약 §2 **검증 표 1~6·8번**(그만두기)을 옮긴다 — 특히 3번(부분 결과가 화면에 0건)
- [X] T022 [P] [US2] `__tests__/ui/diary-home.test.tsx`에 계약 §3(하드웨어 뒤로 가기)을 검사하는 테스트를 더한다 (FR-016)

### Implementation for User Story 2

- [X] T023 [US2] `AppScreen`의 `writing`에 **필드를 더하지 않는 것**을 [src/app/state.ts](../../src/app/state.ts) 주석과 테스트로 못 박는다 — **이것이 원칙 IV의 방어이며 자리가 없으면 담을 수 없다**(FR-010a)
- [X] T024 [US2] [App.tsx](../../App.tsx)가 `createAppPipeline()`의 `stop`을 `DiaryHomeScreen`에 **넘긴다** — **T006이 실어 온 것을 여기서 화면에 닿게 한다.** 이 한 줄이 없어서 005 FR-014b가 죽어 있었다
- [X] T025 [US2] [src/ui/DiaryHomeScreen.tsx](../../src/ui/DiaryHomeScreen.tsx)의 `writing` 화면에 `ActivityIndicator`와 「쓰고 있다」를 그린다 — **진행률·경과 시간·단계 이름을 두지 않는다**(FR-011, FR-010b)
- [X] T026 [US2] `DiaryHomeScreen`에 「그만두기」를 더한다 — `stop()`을 부르고 **결과를 기다리지 않고** 목록으로 간다([contracts/screens.md](contracts/screens.md) §2)
- [X] T027 [US2] 그만둘 때 **`afterGeneration()`을 부르지 않는다**는 것을 코드와 주석으로 못 박는다 — `stopCompletion()`이 **부분 결과를 담아 정상 resolve하므로**(2026-08-17 실측) 명시적으로 버려야 한다(FR-014a·b)
- [X] T028 [US2] `stop`이 없거나(데스크톱) 예외를 던져도 목록으로 가는 것을 보장한다 — 계약 §2 표 5·6번
- [X] T029 [US2] 생성 중 하드웨어 뒤로 가기를 처리한다 — **말없이 빠져나가 생성이 유령으로 남지 않게 한다**(FR-016, 계약 §3)

**Checkpoint**: 30초를 견딜 수 있고 그만둘 수 있다. **US1과 함께면 손에 쥔 앱이
크게 달라진다.**

---

## Phase 5: User Story 3 - 목록에서 그날을 알아본다 (Priority: P2)

**Goal**: 목록의 각 줄이 사진 신호를 세 갈래로 보여, 열지 않고도 그날을 구분한다.

**Independent Test**: 사진이 있는 날·없는 날·모르는 날 셋을 만들어 목록에서 서로
다른 문구로 보이는 것을 확인한다([quickstart.md](quickstart.md) §4).

### Tests for User Story 3 ⚠️ 먼저 쓰고 실패를 확인한다

- [X] T030 [P] [US3] `__tests__/diary/store.test.ts`에 `listDiaries()`가 **`photos` 세 갈래를 실어 주는지** 검사하는 테스트를 더한다 — [data-model.md](data-model.md) §5
- [X] T031 [P] [US3] `__tests__/ui/diary-list.test.tsx`에 [contracts/screens.md](contracts/screens.md) §5 **검증 표 8줄 전부**를 옮긴다 — 특히 4번(「없음」과 「모름」이 서로 다름)과 5번(자리·걸음이 0건)

### Implementation for User Story 3

- [X] T032 [US3] [src/diary/store.ts](../../src/diary/store.ts)의 `DiaryListItem`에 `PhotoHint`를 더하고, `listDiaries()`가 **이미 읽고 있는 `entry`에서** `signalsUsed.photos`를 꺼내 싣는다 — **추가 읽기가 0이다**(research.md §5)
- [X] T033 [US3] 읽을 수 없는 일기(`readable: false`)의 `photos`를 **`unknown`으로** 둔다 — 「없었다」가 아니다(원칙 V, data-model.md §5)
- [X] T034 [US3] [src/ui/DiaryListScreen.tsx](../../src/ui/DiaryListScreen.tsx)가 사진을 세 갈래 문구로 그린다 — 「사진 N장」/「사진 없음」/「사진 모름」(FR-018·019)
- [X] T035 [US3] 목록 줄에 **자리·걸음·배터리·연결을 두지 않는다**(FR-018a). **상세 화면은 셋을 그대로 보인다** — 006 FR-032를 깨뜨리지 않는다
- [X] T036 [US3] `src/app/state.ts`의 `DiaryListItem` 타입을 맞춰 넓힌다 (T032와 짝)

**Checkpoint**: 목록이 훑을 수 있는 것이 된다.

---

## Phase 6: User Story 4 - 오늘 쓸 수 있는지 미리 안다 (Priority: P3)

**Goal**: 「일기 쓰기」 자리에 캐릭터·날짜·덮어쓰기 예고가 함께 보인다.

**Independent Test**: 하루 경계 전후로 시각을 바꿔 가리키는 날이 바뀌는지, 이미
일기가 있는 날에 덮어쓰기 예고가 뜨는지 확인한다([quickstart.md](quickstart.md) §5).

### Tests for User Story 4 ⚠️ 먼저 쓰고 실패를 확인한다

- [X] T037 [P] [US4] `__tests__/app/state.test.ts`에 [contracts/screens.md](contracts/screens.md) §4 **검증 표 1~6번**을 옮긴다 — 특히 4번(**`toWriting()`에 인자가 없다**)과 6번(03:59와 04:01이 다른 하루)
- [X] T038 [P] [US4] `__tests__/ui/diary-list.test.tsx`에 쓰기 자리가 셋을 함께 보이는 것을 검사하는 테스트를 더한다 (FR-002a)

### Implementation for User Story 4

- [X] T039 [US4] `src/app/state.ts`에 `WritePrompt`를 더하고 `list` 갈래에 싣는다 — [data-model.md](data-model.md) §4
- [X] T040 [US4] `WritePrompt.day`를 `latestClosedDay()`로 채운다 — **오늘이 아니라 마지막으로 닫힌 하루다**(006 FR-030). 「지금」을 인자로 받아 경계를 테스트할 수 있게 한다
- [X] T041 [US4] `WritePrompt.overwrites`를 목록에서 그 하루의 유무로 채운다 — **`onWrite`는 이 값을 보지 않는다**(FR-025)
- [X] T042 [US4] `DiaryListScreen`의 「일기 쓰기」 자리에 캐릭터·날짜·덮어쓰기 예고·옮김 알림을 그린다 (FR-002a, FR-023·024, FR-005a)
- [X] T043 [US4] **`toWriting()`이 인자를 받지 않는 것**과 **새 화면이 0개인 것**을 테스트로 못 박는다 (FR-002b, FR-025, SC-014)

**Checkpoint**: 누르기 전에 무슨 일이 일어날지 안다.

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: 방어를 굳히고 실기기에서 확인한다. **여기를 건너뛰면 초록불인데 아무것도
검증되지 않은 상태가 된다**(원칙 V).

### 방어 굳히기

- [X] T044 [P] [scripts/constitution-rules.ts](../../scripts/constitution-rules.ts)의 `checkSourceFile()`에 **`src/ui/`가 `roster.ts`·`ModelAsset`을 import 하는 것**을 금지하는 규칙을 더한다 — 006이 소스 검사를 이미 두었으므로 **새 기계를 만들지 않고 규칙만 는다**(원칙 IV 경계 유지)
- [X] T045 [P] `__tests__/scripts/`에 T044 규칙의 테스트를 더한다
- [X] T046 [P] [quickstart.md](quickstart.md) §7의 **위반 주입 넷**을 실제로 해 본다 — `writing`에 `stage` 필드를 넣으면 **테스트가 실패해야 한다**. 실패하지 않으면 방어가 없는 것이다

### 실기기 검증 (건너뛴 것은 통과가 아니다)

> **✅ T049·T050·T051 전부 완료** (2026-08-21).
>
> 어제 막았던 둘(기기 잠금·release APK)이 풀렸다. 잠금을 사람이 해제했고, debug 빌드를
> 새로 설치했다 — **서명이 달라 지우고 깔아야 했고 006의 일기가 그때 사라졌다**
> (사용자 승인). `npm run test:device` **PASSED**(흐름 5개)이며 손으로도 확인했다.
>
> **release도 확인했다**(versionCode=3, `CN=alpharium`). 빌드 약 15분, APK 173MB.
> Metro를 끄고 `adb reverse`를 지운 채 뜨고, **생성·회전 표시·그만두기·선택 유지가
> R8·ProGuard를 켠 채로 전부 돌았다.** 시스템 막대와도 겹치지 않는다.
>
> ⚠️ **생성이 2.4초라** Maestro의 그만두기 블록이 SKIPPED로 지나간다 — **손으로
> 350ms 안에 눌러 확인했다.** 건너뛴 것은 통과가 아니다(원칙 V).

- [X] T049 debug 빌드 실기기에서 [quickstart.md](quickstart.md) §2~§5를 **전부** 확인한다 — 특히 §3-3(**그만두기가 실제로 끊는가 — 005 FR-014b의 첫 검증**)
- [X] T050 release 빌드로 [quickstart.md](quickstart.md) §6을 확인한다 — 회전 표시·그만두기·선택 유지가 **R8·ProGuard에서 살아남는가**(SC-016). **`prebuild --clean` 뒤 키를 되돌리는 줄을 건너뛰지 않는다**
- [X] T051 시스템 막대와 겹치지 않는 것을 release에서 눈으로 확인한다 — 006이 고친 것이 유지되는가(FR-030, SC-017)

### 기록

- [X] T052 [AGENTS.md](../../AGENTS.md)에 실측 결과를 적는다 — **무엇을 언제 어디서 쟀는지**(원칙 V). 특히 **「끊김 배선이 006까지 없었고 007이 이었다」**는 사실과, 그 전까지 005 FR-014b가 실기기에서 한 번도 돈 적이 없다는 것
- [X] T053 `npm test`·`npm run lint`·`npm run test:device`가 전부 통과하는 것을 확인한다

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존 없음
- **Foundational (Phase 2)**: Setup 뒤. **US1·US2를 막는다**
  - T003→T004→T005→T006 (배선, 순차)
  - T007·T008 [P] → T009·T010 → T011 (선택, 일부 병렬)
- **US1 (Phase 3)**: Foundational의 **선택 갈래**(T007~T011)에 의존
- **US2 (Phase 4)**: Foundational의 **배선 갈래**(T003~T006)에 의존
- **US3 (Phase 5)**: **Foundational에 의존하지 않는다** — 목록만 건드린다
- **US4 (Phase 6)**: US1(캐릭터 표시)과 US3(목록 구조)에 **약하게** 의존
- **Polish (Phase 7)**: 원하는 스토리가 끝난 뒤

### User Story Dependencies

| 스토리 | 의존 | 독립 검증 가능한가 |
| --- | --- | --- |
| **US1** (P1) | Foundational 선택 갈래 | ✅ 캐릭터를 고르고 재시작 |
| **US2** (P1) | Foundational 배선 갈래 | ✅ 생성 중 화면과 그만두기 |
| **US3** (P2) | 없음 | ✅ 목록만으로 검증된다 |
| **US4** (P3) | US1·US3 (표시 자리) | ⚠️ 앞선 둘이 있어야 자연스럽다 |

**US1과 US2는 서로 독립이다** — 배선 갈래와 선택 갈래가 겹치지 않으므로 두 사람이
나눠 가질 수 있다. **US3은 Foundational조차 기다리지 않는다.**

### Within Each User Story

- 테스트를 **먼저 쓰고 실패를 확인한 뒤** 구현한다(헌법 「개발 방식」)
- 순수 함수 → 통로 → 화면 순서
- 기기 불필요 갈래를 먼저 세우고 실기기는 마지막

---

## Parallel Opportunities

```bash
# Phase 2 — 선택 갈래의 테스트 둘을 함께
T007: "__tests__/app/selection.test.ts — 계약 §1 검증 표 7줄"
T008: "__tests__/app/selection-store.test.ts — 계약 §2 기기 불필요 6줄"

# Phase 2 — 배선 갈래와 선택 갈래는 서로 다른 파일이므로 병렬
(T003~T006)  ∥  (T007~T011)

# Phase 3·4 — 두 스토리를 나눠 가질 수 있다
개발자 A: US1 (T012~T019)   # 선택
개발자 B: US2 (T020~T029)   # 대기·그만두기

# Phase 5 — US3은 아무것도 기다리지 않는다
개발자 C: US3 (T030~T036)   # 목록

# Phase 7 — 방어 굳히기 셋
T044·T045·T046
```

---

## Implementation Strategy

### MVP — US1만 (T001~T019)

1. Phase 1 Setup
2. Phase 2 중 **선택 갈래만**(T007~T011) — 배선 갈래는 US2의 것이므로 미룰 수 있다
3. Phase 3 US1
4. **멈추고 검증한다** — [quickstart.md](quickstart.md) §2
5. 여기까지만으로도 **헌법 원칙 III의 가장 큰 구멍이 메워진다**

### 권장 — US1 + US2 (T001~T029)

**둘 다 P1이고 이 기능의 값어치가 대부분 여기 있다.** 특히 US2는 **005 FR-014b가
죽어 있던 것을 되살리므로**, 미루면 그 결함이 계속 남는다.

### 전체 — US3·US4까지

목록과 쓰기 자리 안내. **미루어도 앱이 쓸 만하지만** 일기가 쌓일수록 US3의 값이 커진다.

### 어느 순서로든 지켜야 할 것

- **T048(FLOWS 등록)을 잊지 않는다** — 등록하지 않은 흐름은 돌지 않는다
- **실기기 확인 없이 「끝났다」고 말하지 않는다**(원칙 V)
- 커밋 메시지는 **한국어로 쓴다**(헌법 「개발 방식」)

---

## Notes

- **[P] = 서로 다른 파일이고 미완 작업에 의존하지 않는다**
- **새 패키지를 설치하지 않는다** — 필요해지면 설계가 틀린 것이다(SC-015)
- **`writing`에 필드를 더하고 싶어지면 멈춘다** — 그것이 원칙 IV가 무너지는 첫걸음이다
- **「이미 있으니 저장된 것을 보여주자」가 떠오르면 멈춘다** — 원칙 I 위반이다(FR-025)
- 각 Checkpoint에서 멈추고 검증할 수 있다
