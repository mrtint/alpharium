---
description: "Task list for 009 — 지난 하루를 골라 쓴다"
---

# Tasks: 지난 하루를 골라 쓴다

**Input**: Design documents from `/specs/009-past-day-diary/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: **필수다.** 헌법 「개발 방식」이 "계약을 먼저 정하고 테스트를 먼저 쓴다"를
MUST로 정했다. 각 스토리의 테스트를 **먼저 쓰고 실패를 확인한 뒤** 구현한다.

**Organization**: 스토리별로 묶어 각각 독립적으로 구현·검증·중단할 수 있게 한다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능 (서로 다른 파일, 미완 작업에 의존하지 않음)
- **[Story]**: US1~US3 — spec.md의 사용자 스토리
- 파일 경로를 반드시 적는다

## Path Conventions

이 저장소는 **단일 Expo 프로젝트**다. 소스는 `src/`, 테스트는 `__tests__/`,
실기기 흐름은 `.maestro/`에 둔다(plan.md의 구조 결정).

## ⚠️ 이 기능이 손대지 않는 것

**아래는 이미 하루를 인자로 받는다. 넓힐 것이 없다**([data-model.md](data-model.md) §7):

- **[src/diary/pipeline.ts](../../src/diary/pipeline.ts)** — `PipelineInput.day`가 이미
  임의의 하루를 받는다. **`day-too-old` 갈래를 더하지 않는다**(research §5) — 「사흘」은
  009의 값이고 파이프라인은 002의 계약이라, 거기 넣으면 범위 크기가 두 곳에 생긴다
- **[src/signals/collect.ts](../../src/signals/collect.ts)** — `collectDaySignals(port, day)`가
  이미 하루를 받는다
- **[src/diary/store.ts](../../src/diary/store.ts)** — 파일명이 곧 날짜다
- **[src/diary/prompt.ts](../../src/diary/prompt.ts)** — 007이 남긴 원칙 II 위반은
  **프롬프트의 자리이며 이 기능의 범위 밖이다**(spec Out of Scope). 여기서 함께 고치려
  들면 「한 축을 깊게 파는」 실패다
- **[src/app/selection.ts](../../src/app/selection.ts)** — 캐릭터 선택은 무관하다
- **`AppScreen`** — 「어디에 있는가」는 하루가 셋이 되어도 같다

## ★ 이 기능의 가장 위험한 한 줄

[DiaryHomeScreen.tsx:179](../../src/ui/DiaryHomeScreen.tsx#L179)의
**`day: latestClosedDay(at)`**.

**고치지 않으면 화면에서 하루를 골라도 언제나 어제가 쓰이고 오류는 나지 않는다.**
006의 `GenerationProbe`, 007의 끊긴 `stop` 배선, 008의 버려진 반환값과 **같은 종류**다 —
전부 「아무 일도 일어나지 않을 뿐」이었다. **T021이 그 자리다.**

---

## Phase 1: Setup

**Purpose**: 009는 새 의존도 새 폴더도 만들지 않는다. 시작 전에 기준선만 확인한다.

- [X] T001 현재 기준선을 확인한다 — `npm test`(008 기준 **729개**)와 `npm run lint`가 통과하는 것을 보고 시작한다. **실패가 있으면 009가 만든 것이 아니므로 먼저 가른다**
- [X] T002 [P] [DiaryHomeScreen.tsx:249](../../src/ui/DiaryHomeScreen.tsx#L249)의 `write={writePromptFor(screen.items, now())}`가 **렌더 안에서 매번 새 `Date`로 불리는 것**을 눈으로 확인한다 — [research.md](research.md) §2의 근거이며, 이것이 참이어야 FR-009a가 **새 기계장치 없이** 성립한다

**⚠️ 새 패키지를 설치하지 않는다**(plan.md Technical Context). 달력 선택기가 필요해지면
그 시점에 설계가 틀린 것이다(research §4).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 하루 경계와 타입. **세 스토리가 전부 여기에 막힌다.**

**⚠️ CRITICAL**: 이 단계가 끝나기 전에는 어떤 스토리도 화면에 닿지 않는다.

### 하루 경계 — 먼저 테스트 ⚠️ 쓰고 실패를 확인한다

- [X] T003 [P] [__tests__/config/day-boundary.test.ts](../../__tests__/config/day-boundary.test.ts)에 `selectableDays()`의 **검증 표 6행**을 더한다([contracts/write-prompt.md](contracts/write-prompt.md) §1) — **2번과 3번(04:00 전후로 셋이 통째로 밀린다)이 핵심이다**
- [X] T004 [P] [__tests__/config/day-boundary.test.ts](../../__tests__/config/day-boundary.test.ts)에 **불변식 D1~D5**를 더한다 — 특히 **D1**(`selectableDays(now)[0] === latestClosedDay(now)`)과 **D3**(모든 원소가 닫힌 하루 — 오늘이 섞이지 않는다)

### 하루 경계 — 구현

- [X] T005 [src/config/day-boundary.ts](../../src/config/day-boundary.ts)에 `SELECTABLE_DAY_COUNT = 3` 상수를 더한다 — **`DAY_STARTS_AT_HOUR`와 나란히 두고 export 하지 않는다**(FR-003, [data-model.md](data-model.md) §6)
- [X] T006 [src/config/day-boundary.ts](../../src/config/day-boundary.ts)에 `selectableDays(now: Date): readonly DayDate[]`를 더한다 — `latestClosedDay()`에서 시작해 하루씩 거슬러 셋. **개수를 인자로 받지 않는다**(받으면 값이 두 곳에 생긴다)
- [X] T007 [src/config/day-boundary.ts](../../src/config/day-boundary.ts)의 `latestClosedDay()`를 **지우지 않는다** — 006·007이 쓰고 있고 D1이 둘을 묶는다. 지우고 싶어지면 D1이 왜 있는지 다시 읽는다

### 타입 — 먼저 테스트 ⚠️ 쓰고 실패를 확인한다

- [X] T008 [P] [__tests__/app/state.test.ts](../../__tests__/app/state.test.ts)에 **I6**을 더한다 — `readFileSync`로 [src/app/state.ts](../../src/app/state.ts)의 `WritePrompt` 선언을 **직접 읽어** 필드가 정확히 넷인지 센다. **이 파일에 그 패턴이 이미 있다**([state.test.ts:455](../../__tests__/app/state.test.ts#L455))
- [X] T009 [P] [__tests__/app/state.test.ts](../../__tests__/app/state.test.ts)에 **I7**을 더한다(또는 기존 것을 확인한다) — `toWriting.length === 0`. **007이 세운 원칙 I의 방어이며 이 기능이 약화시키지 않는 것을 못 박는다**

### 타입 — 구현

- [X] T010 [src/app/state.ts](../../src/app/state.ts)에 `SelectableDay` 타입을 더한다 — **`day`와 `hasDiary` 둘뿐이다.** 사진 갈래·라벨·크기를 담지 않는다([data-model.md](data-model.md) §1)
- [X] T011 [src/app/state.ts](../../src/app/state.ts)의 `WritePrompt`에 `selectable`과 `revertedFrom?`을 더한다 — **필드는 정확히 넷이다**([data-model.md](data-model.md) §2). 진행률·시간·캐릭터·본문을 담지 않는다

**⚠️ T008을 T011보다 먼저 한다.** 007에서 `AppScreen`에 `stage: string`을 주입했더니
**jest 38개가 전부 통과했다** — 타입은 지워지므로. **잡은 것은 `tsc`뿐이었다.**
선언을 직접 읽는 테스트가 있어야 `npm test`만 돌리는 사람에게도 방어가 참이 된다.

**Checkpoint**: 하루 셋을 구할 수 있고 그것을 담을 자리가 있다. **아직 화면에 닿지
않았다.**

---

## Phase 3: User Story 1 - 놓친 하루를 쓴다 (Priority: P1)

**Goal**: 어제가 아닌 하루를 골라 **그 하루의 일기가 그 날짜로 저장된다.**
**이것이 기능의 전부다** — 나머지는 안전장치다.

**Independent Test**: 어제가 아닌 하루를 골라 일기를 만들고, 저장된 일기의 날짜가
고른 하루와 같은지 확인한다([quickstart.md](quickstart.md) D3·D5).

### Tests for User Story 1 ⚠️ 먼저 쓰고 실패를 확인한다

- [X] T012 [P] [US1] [__tests__/app/state.test.ts](../../__tests__/app/state.test.ts)에 `writePromptFor()`의 **검증 표 1·3·5번 행**을 더한다([contracts/write-prompt.md](contracts/write-prompt.md) §2) — 기본값·고른 하루·**덮어쓰기가 고른 하루를 따르는 것**
- [X] T013 [P] [US1] [__tests__/app/state.test.ts](../../__tests__/app/state.test.ts)에 **불변식 I1**(`prompt.day`는 언제나 `selectable`의 원소)과 **I2**(셋)를 더한다 — **I1이 FR-017의 방어다**
- [X] T014 [P] [US1] `__tests__/ui/diary-list.test.tsx`에 **V1·V2**를 더한다 — 하루 셋이 보이고 **하나가 골라진 것으로 표시된다**(FR-007·008). **`await render(...)`를 쓴다**
- [X] T015 [P] [US1] `__tests__/ui/diary-home.test.tsx`에 **W-T1·W-T2**를 더한다 — 대역 `pipeline`을 주입해 **`run()`이 받은 `day`를 직접 본다**. 고른 하루가 가는가, 기본값이 마지막으로 닫힌 하루인가

**★ T015가 이 기능에서 가장 중요한 테스트다.** 화면이 하루를 그려도 파이프라인까지
가지 않으면 **아무 일도 일어나지 않고 오류도 안 난다.**

### Implementation for User Story 1

- [X] T016 [US1] [src/app/state.ts](../../src/app/state.ts)의 `writePromptFor()`에 세 번째 인자 `chosenDay?: DayDate | null`을 더한다 — **옵셔널이라 기존 호출이 그대로 통과한다**([contracts/write-prompt.md](contracts/write-prompt.md) §2)
- [X] T017 [US1] [src/app/state.ts](../../src/app/state.ts)의 `writePromptFor()`가 `selectableDays(now)`로 `selectable`을 만든다 — 각 하루의 `hasDiary`는 **인자로 받은 `items`에서 나온다**(FR-011b — 추가 읽기 0)
- [X] T018 [US1] [src/app/state.ts](../../src/app/state.ts)의 `writePromptFor()`가 `day`를 정한다 — `chosenDay`가 `selectable`에 있으면 그것, 아니면 `selectable[0]`(FR-007)
- [X] T019 [US1] [src/app/state.ts](../../src/app/state.ts)의 `writePromptFor()`가 `overwrites`를 **고른 하루 기준으로** 정한다(I5) — 다른 하루에 일기가 있는 것은 무관하다(검증 표 5번)
- [X] T020 [US1] [src/ui/DiaryHomeScreen.tsx](../../src/ui/DiaryHomeScreen.tsx)에 `const [chosenDay, setChosenDay] = useState<DayDate | null>(null)`을 더한다 — **파일에 남기지 않는다**(FR-010, W3). 007의 캐릭터 선택과 **의도적으로 다르다**
- [X] T021 [US1] ★ [DiaryHomeScreen.tsx:179](../../src/ui/DiaryHomeScreen.tsx#L179)의 `day: latestClosedDay(at)`를 **`writePromptFor()`가 돌려준 `prompt.day`**로 바꾼다(W1·W2) — **이 한 줄이 이 기능의 전부이며, 안 고치면 화면이 거짓말을 한다**
- [X] T022 [US1] [src/ui/DiaryHomeScreen.tsx](../../src/ui/DiaryHomeScreen.tsx)의 `write()`에서 `latestClosedDay()`를 **직접 부르지 않게** 한다(W2) — import가 남아 있으면 다시 쓰기 쉬우므로 쓰이지 않는 import를 지운다
- [X] T023 [US1] [src/ui/DiaryListScreen.tsx](../../src/ui/DiaryListScreen.tsx)의 쓰기 자리에 하루 셋을 그린다 — **가로로 놓인 `Pressable` 셋**(research §4). 007의 `CharacterPicker` 바로 아래이며 **새 의존 0개**
- [X] T024 [US1] [src/ui/DiaryListScreen.tsx](../../src/ui/DiaryListScreen.tsx)의 하루마다 `testID`를 준다(`day-2026-08-19` 꼴) — **Maestro의 `childOf`가 이 화면에서 통하지 않는다**(008 실측: RN은 접근성 트리가 평탄화된다). `testID`는 release에서 살아남는 것이 008에서 확인됐다
- [X] T025 [US1] [src/ui/DiaryListScreen.tsx](../../src/ui/DiaryListScreen.tsx)에 `onSelectDay` prop을 더하고 [src/ui/DiaryHomeScreen.tsx](../../src/ui/DiaryHomeScreen.tsx)가 `setChosenDay`를 넘긴다 — **`onWrite`는 하루를 받지 않는다**(계약 §3 금지)
- [X] T026 [US1] [src/ui/DiaryListScreen.tsx](../../src/ui/DiaryListScreen.tsx)에서 날짜를 **`YYYY-MM-DD` 그대로** 적는다 — 「어제·그저께」로 옮기지 않는다(research §4). **04:00 경계 때문에 달력의 어제와 어긋나는 순간이 있다**

**Checkpoint**: **놓친 하루를 쓸 수 있다. 이것만으로 배포 가능한 MVP다.**

---

## Phase 4: User Story 2 - 어느 하루에 무엇이 있는지 보고 고른다 (Priority: P2)

**Goal**: **덮어쓴다는 것을 누르기 전에 안다.** 007이 하루 하나에 대해 세운 규칙을
셋으로 넓힌다 — **사라진 일기는 되돌릴 수 없다.**

**Independent Test**: 한 하루에만 일기가 있는 상태에서 그 하루를 골랐을 때만 덮어쓰기
예고가 뜨는지 확인한다([quickstart.md](quickstart.md) D6·D7).

### Tests for User Story 2 ⚠️ 먼저 쓰고 실패를 확인한다

- [X] T027 [P] [US2] [__tests__/app/state.test.ts](../../__tests__/app/state.test.ts)에 `selectable` 검증 표 **10~14번 행**을 더한다([contracts/write-prompt.md](contracts/write-prompt.md) §2) — **12번(셋 다 있어도 자리가 사라지지 않는다)**과 **14번(깨진 파일도 `hasDiary: true`)**
- [X] T028 [P] [US2] `__tests__/ui/diary-list.test.tsx`에 **V3·V4**를 더한다 — 「일기가 이미 있다」가 `hasDiary`인 자리에만, 덮어쓰기 예고가 `overwrites`일 때만(FR-011·012)
- [X] T029 [P] [US2] `__tests__/ui/diary-list.test.tsx`에 **X1**을 더한다 — **고르는 자리에 사진 갈래가 없다**(FR-011a). 목록의 줄에는 **계속 보이는 것**과 구분한다(007 FR-018)
- [X] T030 [P] [US2] `__tests__/ui/diary-home.test.tsx`에 **W-T4**를 더한다 — **이미 일기가 있는 하루를 골라도 `run()`이 불린다.** 007이 하루 하나에 세운 원칙 I 검증을 셋으로 넓힌 것이다

### Implementation for User Story 2

- [X] T031 [US2] [src/ui/DiaryListScreen.tsx](../../src/ui/DiaryListScreen.tsx)의 하루 자리에 `hasDiary` 표시를 그린다(V3) — **모델 정보·크기·사진 갈래가 아니다**(X1·X2)
- [X] T032 [US2] [src/ui/DiaryListScreen.tsx](../../src/ui/DiaryListScreen.tsx)의 덮어쓰기 예고(「이 날의 일기가 이미 있다. 다시 쓰면 덮어쓴다」)가 **고른 하루를 따르는 것**을 확인한다 — `write.overwrites`를 그대로 쓰므로 T019가 끝나면 저절로 맞다
- [X] T033 [US2] [src/app/state.ts](../../src/app/state.ts)의 `toWriting()`이 **여전히 인자를 받지 않는 것**을 확인한다(I7, FR-013) — 「이미 있으면 그것을 보여주자」로 갈릴 수 없어야 한다. **고를 하루가 셋이 되면 이 유혹도 셋이 된다**

**★ US2에 새 구현이 거의 없었다.** `overwrites`와 `hasDiary`를 **하나의 판정에**
모아 둔 덕에(I5) US1의 T017·T019가 이미 답을 만들고 있었고, `DayPicker`가 `hasDiary`를
그리는 것도 US1에서 함께 들어갔다. **T031·T032는 「그렇게 되어 있는지 확인」이었고
T027~T030이 그것을 못 박았다** — 나누지 않은 설계의 값어치가 여기서 드러났다.

**Checkpoint**: 잘못 고를 여지가 셋이 되었지만 **셋 다 누르기 전에 알린다.**

---

## Phase 5: User Story 3 - 고를 수 없는 하루는 고를 수 없다 (Priority: P3)

**Goal**: 오늘과 범위 밖은 나타나지 않고, **범위 밖으로 밀려나면 되돌리고 알린다.**

**Independent Test**: 고를 수 있는 자리의 개수와 날짜를 세고, 범위 밖을 골라 둔
상태에서 되돌림 알림이 뜨는지 확인한다([contracts/write-prompt.md](contracts/write-prompt.md)
§2 6~9번 행).

### ⚠️ 이 스토리는 실기기에서 확인하기 어렵다

**04:00을 기다려야 하고 기기 날짜를 못 바꾼다**(root 필요, `adb shell date`가 조용히
실패한다 — 007 실측). **그래서 기기 없는 테스트가 이 갈래의 주된 검증이다**
([quickstart.md](quickstart.md) B3).

### Tests for User Story 3 ⚠️ 먼저 쓰고 실패를 확인한다

- [X] T034 [P] [US3] [__tests__/app/state.test.ts](../../__tests__/app/state.test.ts)에 검증 표 **6·7·8번 행**을 더한다 — 범위 밖·오늘을 골라 두면 **되돌리고 `revertedFrom`을 싣는다**(FR-009)
- [X] T035 [P] [US3] [__tests__/app/state.test.ts](../../__tests__/app/state.test.ts)에 **9번 행**을 더한다 — 고른 것이 마침 기본값과 같으면 **`revertedFrom`이 붙지 않는다**. 007의 `movedFrom`이 같은 함정을 가졌다(바뀌지 않았는데 「바뀌었다」)
- [X] T036 [P] [US3] [__tests__/app/state.test.ts](../../__tests__/app/state.test.ts)에 **불변식 I4**를 더한다 — `revertedFrom`이 있으면 `!== day`이고 `selectable`에 **없다**
- [X] T037 [P] [US3] `__tests__/ui/diary-list.test.tsx`에 **V5**를 더한다 — 되돌림 알림에 **원래 고른 하루와 지금 쓸 하루가 함께** 보인다(FR-009)
- [X] T038 [P] [US3] `__tests__/ui/diary-home.test.tsx`에 **W-T3**를 더한다 — `now`를 옮겨 범위를 민 뒤 **기본값이 파이프라인에 간다**(FR-017)

### Implementation for User Story 3

- [X] T039 [US3] [src/app/state.ts](../../src/app/state.ts)의 `writePromptFor()`가 `revertedFrom`을 정한다 — `chosenDay`가 있고 `selectable`에 **없을 때만** 싣는다(FR-009d). **9번 행이 이것을 못 박는다**
- [X] T040 [US3] [src/ui/DiaryListScreen.tsx](../../src/ui/DiaryListScreen.tsx)에 되돌림 알림을 그린다 — **화면이 스스로 판단하지 않고 `revertedFrom`을 받아 그린다**(FR-009d, 계약 §3 금지)
- [X] T041 [US3] [src/ui/DiaryListScreen.tsx](../../src/ui/DiaryListScreen.tsx)의 알림이 **다시 고르면 저절로 사라지는 것**을 확인한다(FR-009c, W4) — **지우는 코드가 없어야 한다.** 판정이 매번 다시 돌므로(FR-009a) `setChosenDay`가 유효한 값을 넣으면 다음 렌더에서 사라진다
- [X] T042 [US3] [src/ui/DiaryHomeScreen.tsx](../../src/ui/DiaryHomeScreen.tsx)에서 **`useEffect`로 되돌림을 감시하지 않는다**(research §2) — 렌더→effect→setState 왕복이 생기고 **그 사이 한 프레임이 범위 밖 값으로 그려진다.** 기기에서만 보이는 결함이다

**★ T041·T042가 008의 교훈을 옮긴 것이다.** 「거부 안내가 아직 참인가」를 매번 다시
물어 타이밍 버그를 없앤 것과 같다 — **저장할 것이 없으면 지울 것도 없다.**

**★ US3의 구현도 US1에 이미 들어가 있었다.** `revertedFrom` 판정(T039)과 `DayPicker`의
알림(T040)이 하나의 판정·하나의 화면 조각에 모여 있었기 때문이다. **T041·T042는
「그렇게 되어 있는지」의 확인이며, 구조로 확인했다**: `setChosenDay`를 부르는 곳이
**사용자의 누름 하나뿐**이고, `revertedFrom`을 지우는 코드가 **저장소에 없다.**

**Checkpoint**: 범위 밖이 조용히 쓰이지 않는다.

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: 방어를 굳히고 실기기에서 확인한다. **여기를 건너뛰면 초록불인데 아무것도
검증되지 않은 상태가 된다**(원칙 V).

### 방어 굳히기

- [X] T043 [P] [__tests__/app/state.test.ts](../../__tests__/app/state.test.ts)에 **I3**을 더한다 — `selectable`의 모든 하루가 닫혀 있다(FR-002). 오늘이 섞이면 파이프라인이 `day-not-closed`로 멈추고 사용자는 막다른 길에 선다
- [X] T044 [P] `__tests__/ui/diary-list.test.tsx`에 **X2·X3·X4**를 더한다 — 고르는 자리에 모델 정보·진행률·저장된 본문이 없다(원칙 III·IV·I)
- [X] T045 [P] [quickstart.md](quickstart.md) A1의 **위반 주입 6가지**를 실제로 해 본다 — 특히 **2번(`write()`가 `latestClosedDay(at)`를 다시 부르게)**이 W-T1·W-T3에 걸려야 한다. **주입한 것은 반드시 되돌린다**
- [X] T046 [P] `npm run lint`로 **`tsc`와 헌법 검사가 도는 것**을 확인한다 — 007에서 `npm test`만으로는 타입 위반이 잡히지 않았다

### 실기기 흐름

- [X] T047 `.maestro/past-day-diary.yml`을 만든다 — **M1~M5**([contracts/write-prompt.md](contracts/write-prompt.md) §5). **`scrollUntilVisible`이 필요하다**(007에서 캐릭터 다섯만으로도 화면을 넘겼고 하루 셋이 더해진다)
- [X] T048 ⚠️ [scripts/run-device-tests.mjs](../../scripts/run-device-tests.mjs)의 **`FLOWS`에 등록한다** — 등록하지 않으면 파일이 있어도 실행기가 돌리지 않고 **초록불인데 아무것도 검증되지 않는다**(원칙 V가 막으려는 바로 그 상황)
- [X] T049 `.maestro/past-day-diary.yml`에서 **부분 문자열을 정규식으로 준다**(`.*2026-08-19.*`) — `assertVisible`의 기본 매칭이 텍스트 노드 **전체**와 맞춰 본다(007 실측)

### ★ 위반 주입 결과 (T045, 2026-08-21)

**여섯 중 다섯은 처음부터 걸렸고, 하나는 그물을 뚫었다.**

| 주입 | 결과 |
| --- | --- |
| 1. `WritePrompt`에 `elapsedMs` | ✅ 2개 실패 (I6) |
| 2. `write()`가 `latestClosedDay(at)`를 다시 부른다 | ✅ **3개 실패** (W-T1·W-T4) |
| 3. 유효할 때도 `revertedFrom`이 붙는다 | ✅ 5개 실패 |
| 4. `selectableDays(now, count = 3)` | ❌ **통과했다 → 그물을 고쳤다** |
| 5. 고르는 자리에 사진 갈래 | ✅ 1개 실패 (X1) |
| 6. `toWriting()`이 인자를 받는다 | ✅ 3개 실패 (I7) |

**⚠️ 4번이 007의 교훈과 같은 종류의 구멍이었다.** `expect(selectableDays.length).toBe(1)`은
**기본값이 있는 인자를 세지 않으므로** `selectableDays(now, count = 3)`으로 고쳐도
그대로 통과했다 — 그러면 부르는 쪽이 `selectableDays(now, 7)`로 **범위를 마음대로
늘릴 수 있고** 값이 두 곳에 생긴다(FR-003).

**「검사가 있다」와 「그것이 무엇을 잡는가」는 다르다.** 007이 타입 위반에서 겪은 것을
여기서는 런타임 검사에서 겪었다. `day-boundary.test.ts`에 **선언을 직접 읽는 검사
둘**을 더해 막았고(둘째 인자 금지 + 상수 export 금지), 재주입에서 양쪽 다 걸렸다.

### 실기기 검증 (건너뛴 것은 통과가 아니다)

> **✅ release 실기기에서 확인했다** (2026-08-21, SM-G986N, Android 13, **무선 adb**,
> versionCode=6, `CN=alpharium`).
>
> **★ T051(SC-013) 통과 — 어제가 아닌 2026-08-18의 일기가 실제로 만들어져 그 날짜로
> 저장됐다.** 목록에 뜨고 눌러서 전문까지 읽힌다.
>
> **T050(Maestro 자동 흐름)은 돌리지 않았다** — 손으로 D1~D11을 확인했고, 자동 흐름은
> debug 빌드와 Metro가 필요하다(release에는 진단 화면이 없어 일부 흐름이 실패한다).
> **건너뛴 것은 통과가 아니므로 미완으로 남긴다.**

- [ ] T050 debug 빌드로 [quickstart.md](quickstart.md) **B0**(Metro·`adb reverse`·잠금 해제)를 갖추고 `npm run test:device`를 돌린다
- [X] T051 ★ [quickstart.md](quickstart.md) **D3**을 손으로 확인한다 — **어제가 아닌 하루의 일기가 실제로 만들어져 그 날짜로 저장된다**(SC-013). **이것이 완료 조건이다**
- [X] T052 [P] [quickstart.md](quickstart.md) **D4**(일기가 하나만 는다, SC-002a)와 **D5**(그 하루의 신호다)를 확인한다
- [X] T053 [P] [quickstart.md](quickstart.md) **D6·D7**을 확인한다 — 덮어쓰기 예고가 뜨고 **그래도 생성이 돈다**(SC-007, 원칙 I)
- [X] T054 [P] [quickstart.md](quickstart.md) **D9·D10·D11**을 확인한다 — 생성 중 화면에 수치 0건, 모델 정보 0건, 시스템 막대와 안 겹침
- [X] T055 [quickstart.md](quickstart.md) **B4**로 release 빌드를 만들어 확인한다 — **`versionCode`를 6으로 올린다**(008이 5였다). 서명이 `CN=alpharium`이고 덮어 설치로 **일기가 살아남아야 한다**
- [X] T056 release APK에서 [src/ui/DiaryListScreen.tsx](../../src/ui/DiaryListScreen.tsx)의 **고르는 자리가 R8·ProGuard를 넘어 살아남는지** 확인한다 — 007의 화면이 살아남았으므로 같을 것이나 **짐작이다**(research 「남은 미확인」)

### 관측을 남긴다 (원칙 V)

- [X] T057 [P] **확인하지 못한 것을 미확인으로 적는다**([quickstart.md](quickstart.md) C5) — 특히 **사흘 전 사진이 실제로 조회되는가**(SC-014). 그 하루에 사진이 있는지는 **기기가 정하므로** 못 볼 수 있다. **못 본 것을 본 것처럼 적지 않는다**
- [X] T058 [P] [AGENTS.md](../../AGENTS.md)에 009 절을 더한다([quickstart.md](quickstart.md) D) — 실측값과 짐작을 **구분해서** 적는다. 생성된 일기가 원칙 II를 지켰는지도 **관측만 남긴다**(고치는 것은 이 기능이 아니다)

---

## Dependencies & Execution Order

```
Phase 1 (Setup)
   ↓
Phase 2 (Foundational) ← 세 스토리가 전부 여기 막힌다
   ↓
Phase 3 (US1, P1) ──────→ MVP. 여기서 멈춰도 배포 가능
   ↓
Phase 4 (US2, P2) ← US1의 writePromptFor 확장에 의존
   ↓
Phase 5 (US3, P3) ← US1의 selectable에 의존
   ↓
Phase 6 (Polish + 실기기)
```

**스토리 간 의존**: US2·US3은 **US1이 만든 `selectable`과 화면 자리**에 얹힌다.
008과 달리 완전히 독립적이지 않다 — **하나의 판정 함수를 셋이 나눠 채우기 때문**이며,
나누면 같은 규칙이 여러 곳에 생긴다(research §3).

### 병렬 기회

| 단계 | 병렬 가능 |
| --- | --- |
| Phase 2 | T003·T004 (경계 테스트) / T008·T009 (타입 테스트) |
| Phase 3 | T012·T013·T014·T015 (서로 다른 파일) |
| Phase 4 | T027·T028·T029·T030 |
| Phase 5 | T034·T035·T036·T037·T038 |
| Phase 6 | T043·T044·T045·T046 / T052·T053·T054 / T057·T058 |

**구현 작업은 대체로 병렬이 아니다** — T016~T019가 **같은 함수**를 채우고
T020~T026이 **같은 두 화면 파일**을 고친다.

---

## MVP 범위

**Phase 1 + 2 + 3 (T001~T026)이 최소 배포 단위다.**

그것만으로 **「놓치면 영영 못 쓴다」가 해소된다** — spec이 이 기능을 만든 이유
그 자체다. US2(덮어쓰기 예고)와 US3(되돌림)은 안전장치이며, **없어도 기능은 성립하되
잘못 고를 여지가 남는다.**

**⚠️ 다만 US2 없이 오래 두지 않는다.** 고를 수 있는 하루가 셋이 되면 **잘못 덮어쓸
여지도 셋이 되고**, 온디바이스 생성은 비싸서 **사라진 일기를 되돌릴 수 없다.**

---

## ⚠️ 실패 신호

**아래를 하고 싶어지면 멈추고 spec을 다시 읽는다**(헌법 「개발 방식」 — 한 축을 깊게
파고들고 싶어지면 그것이 실패 신호다):

- **프롬프트를 고치고 싶다** — 007이 남긴 원칙 II 위반은 **005의 자리**이며 범위 밖이다
- **고르는 자리에 사진 갈래를 보이고 싶다** — 알 수 없다(FR-011a). 보이려면 기록 계층을
  열어야 하고 그것은 범위 밖이다
- **달력을 넣고 싶다** — 셋을 고르는 데 과하다(research §4). 새 네이티브 의존이 붙고
  release 검증 표면이 넓어진다
- **범위를 넷·일곱으로 늘리고 싶다** — 값이 한 자리에 있으므로 쉽지만 **이 기능은 셋을
  확정한다**(spec Assumptions)
- **파이프라인에 `day-too-old`를 더하고 싶다** — 값이 두 곳에 생긴다(research §5)
- **`useEffect`로 되돌림을 감시하고 싶다** — 기기에서만 보이는 타이밍 버그가 들어온다
  (T042)
