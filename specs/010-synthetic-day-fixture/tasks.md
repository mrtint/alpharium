---
description: "Task list for 010 — 가상의 하루를 기기에 심는 도구"
---

# Tasks: 가상의 하루를 기기에 심는 도구

**Input**: Design documents from `/specs/010-synthetic-day-fixture/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: **포함한다.** 헌법 「개발 방식」이 「계약을 먼저 정하고 테스트를 먼저 쓴다」를
MUST로 정한다.

**Organization**: 사용자 스토리별로 묶어 각각 독립적으로 구현·검증된다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능 (다른 파일, 미완 의존 없음)
- **[Story]**: US1·US2·US3
- 파일 경로를 반드시 적는다

## Path Conventions

**이 기능은 앱 코드를 바꾸지 않는다**(FR-004a, SC-009). 모든 산출물이 `scripts/`와
`__tests__/`에 있다.

```
scripts/seed-day.mts, scripts/seed/*.mts, scripts/seed-template*.jpg
__tests__/seed/*.test.ts
```

---

## Phase 1: Setup

**Purpose**: 자리를 만들고 명령을 잇는다

- [X] T001 `scripts/seed/` 디렉터리를 만들고 `scripts/seed/README.md`에 「이 도구는 앱의 일부가 아니다(FR-001)·일기를 읽지 않는다(FR-022)」를 적는다
- [X] T002 `package.json`에 `seed:day`·`seed:list`·`seed:clear` 세 스크립트를 더한다 — `check:constitution`과 같이 `node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON`으로 `.mts`를 돌린다
- [X] T003 [P] `.gitignore`에 심은 기록 파일(`.seed-ledger.json`)을 더한다 — 개발 기계마다 다르므로 커밋하지 않는다

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 스토리가 딛는 바닥. **여기가 끝나기 전에는 어떤 스토리도 시작할 수 없다**

**⚠️ T004~T006이 이 기능 전체의 기반이다** — 템플릿이 없으면 사진을 만들 수 없고,
EXIF 패치가 없으면 날짜를 심을 수 없다.

### 템플릿 (research.md §4 — 손으로 만든 EXIF는 무시된다)

- [X] T004 실기기에서 사진 하나를 꺼내 `scripts/seed-template.jpg`를 만든다 — **좌표·기기 모델·소프트웨어 버전 등 개인정보를 덮어쓰고**, 저장소에 커밋된다는 것을 인지한다. 크기를 줄여도 되지만 **EXIF 구조는 손대지 않는다**
- [X] T005 GPS IFD가 **없는** 템플릿 `scripts/seed-template-nogps.jpg`를 만든다 — 좌표를 안 박는 사진용. **태그를 지우면 오프셋이 움직이므로 템플릿을 따로 둔다**(data-model.md)
- [X] T006 [P] `__tests__/seed/template.test.ts` — 두 템플릿이 저장소에 있고, EXIF에서 `DateTimeOriginal`·`DateTimeDigitized`를 찾을 수 있으며, 하나에는 GPS IFD가 있고 다른 하나에는 없다는 것을 검사한다

### EXIF 패치 (순수 — 기기 없이 검증된다)

- [X] T007 `__tests__/seed/exif.test.ts` — **먼저 쓴다.** 패치한 날짜·좌표가 다시 읽히는가, **파일 길이가 변하지 않는가**, 좌표가 `(0,0)`이면 거부하는가(004의 `isUsableCoordinate`가 버린다)
- [X] T008 `scripts/seed/exif.mts` — `patchDate(buf, takenAt)`·`patchLocation(buf, lat, lon)`. **길이가 고정된 자리 교체만 한다**(20바이트 날짜, 24바이트 rational). 오프셋을 다시 계산하지 않는다
- [X] T009 [P] `__tests__/seed/exif.test.ts`에 **위반 주입 검사**를 더한다 — 패치가 길이를 바꾸면 실패해야 한다

### 하루 경계를 앱에서 가져온다 (FR-005b)

- [X] T010 `__tests__/seed/day-range.test.ts` — `scripts/seed/`가 **`selectableDays`를 직접 부르는지** 선언을 `readFileSync`로 읽어 검사한다. 도구가 「셋」이나 `04`를 직접 적으면 실패한다 (009의 `Function.length` 교훈 — 「검사가 있다」와 「무엇을 잡는가」는 다르다)
- [X] T011 `scripts/seed/plan.mts`가 `src/config/day-boundary.ts`의 `selectableDays`·`dayBounds`를 import 하도록 잇는다 — **앱 코드를 읽기만 하고 바꾸지 않는다**

**Checkpoint**: 템플릿이 있고 EXIF를 패치할 수 있고 하루 범위를 앱에서 가져온다

---

## Phase 3: User Story 1 — 신호가 있는 하루를 만들어 일기를 생성한다 (P1) 🎯 MVP

**Goal**: 「사진 3장이 서로 다른 두 자리에서 찍힌 하루」를 기기에 심고, 앱이 그것을 본다

**Independent Test**: `npm run seed:day -- rich <하루>` 뒤 앱 상세에 「사진: 3장」과 자리 2곳이 보인다 (quickstart B1)

### 판정 — 순수 (기기 없이)

- [X] T012 [P] [US1] `__tests__/seed/shapes.test.ts` — `rich`가 사진 3장을 만들고 좌표가 **100m 넘게 떨어진 2곳**인가(`SAME_PLACE_METERS`), 모든 `takenAtMs`가 `dayBounds(day)` 안인가
- [X] T013 [P] [US1] `__tests__/seed/plan.test.ts` — 범위 밖 하루를 **심기 전에 거부**하는가(FR-005a). 미래와 과거 양쪽
- [X] T014 [P] [US1] `__tests__/seed/result.test.ts` — `RunResult` **선언을 `readFileSync`로 직접 읽어** `elapsedMs`·`durationMs`·`speed` 같은 지표 자리가 없는지 검사한다(원칙 IV). 007이 `npm test`로 놓쳤던 타입 위반을 여기서는 `npm test`가 잡는다
- [X] T015 [US1] `scripts/seed/shapes.mts` — `rich` 모양. `DayShape` 타입과 `shapeNamed(name)`
- [X] T016 [US1] `scripts/seed/plan.mts` — `planSeeding(shape, day, now)` → `SyntheticDay | Failure`. 하루 검증·모양 검증·사진 목록 생성

### 기기에 닿는 자리 (contracts/seeding.md)

- [X] T017 [US1] `scripts/seed/device.mts` — **adb에 닿는 유일한 자리.** `devices()`·`push()`·`scanFile()`·`queryFolder()`·`removeFolder()`·`scanVolume()`. **각 함수가 실패를 값으로 돌려주고 던지지 않는다**(004의 `locationOf` 교훈)
- [X] T018 [US1] `scripts/seed/device.mts`의 색인에 **`content call --method scan_file`을 쓴다** — `am broadcast`(no-op)도 `content update`(조용히 실패)도 쓰지 않는다(research.md §3)
- [X] T019 [P] [US1] `__tests__/seed/verify.test.ts` — **되읽은 `datetaken`이 없으면 `index-failed`, 그 하루의 구간 밖이면 `verify-mismatch`**로 판정하는가(FR-018d). 이것이 이 기능의 핵심 방어다
- [X] T020 [US1] `scripts/seed/verify.mts` — `verifySeeded(rows, day, expectedCount)`. 순수 함수로 떼어 기기 없이 검증한다

### 진입점

- [X] T021 [US1] `scripts/seed-day.mts` — 0단계(기기·하루·모양) → 1단계(existing 세기) → 2단계(EXIF 패치) → 3단계(push) → 4단계(scan) → 5단계(확인) → 6단계(기록). contracts/seeding.md의 순서 그대로
- [X] T022 [US1] `scripts/seed-day.mts`가 **실패하면 이번에 넣은 것을 치우고 끝낸다**(FR-019). 치우다 실패하면 종료 코드 `2`
- [X] T023 [US1] `scripts/seed/output.mts` — **사람이 읽는 줄들 + 마지막에 JSON 한 줄**(FR-018b, contracts/cli.md). 종료 코드 `0`/`1`/`2`를 가른다
- [X] T024 [P] [US1] `__tests__/seed/output.test.ts` — **마지막 줄이 항상 유효한 JSON 한 줄인가**(성공·실패 양쪽), **부분 성공을 `ok: true`로 만들 수 없는가**(FR-018c)
- [X] T025 [US1] `scripts/seed/ledger.mts` — 심은 기록을 개발 기계에 남긴다. **기기에 쓰지 않는다**(FR-017)

### 실기기 확인 (★ 건너뛴 것은 통과가 아니다 — 원칙 V)

- [X] T026 [US1] quickstart A1~A3을 실기기에서 돌린다 — 심고, **`datetaken`이 NULL이 아니고 그 하루의 구간 안인지 확인**하고, 파일의 EXIF 좌표를 되읽는다
- [X] T027 [US1] quickstart A5 — 범위 밖 하루가 거부되고 **기기에 사진이 하나도 안 들어간 것**을 확인한다(SC-013a)
- [X] T028 [US1] **★ quickstart B1 — SC-002.** 앱에서 그 하루의 일기를 생성해 **「사진: 3장」과 자리 2곳**이 보이는지 확인한다. **005 이후 처음 보는 화면이다**
- [X] T029 [US1] quickstart B6 — 같은 하루로 두 번 생성해 **매번 실제로 생성되는지** 확인한다(SC-010, 원칙 I). **두 글이 비슷한 것은 위반이 아니다**(006 FR-037a)
- [X] T030 [US1] 색인이 끝나기까지의 시간을 재서 [research.md](research.md)의 짐작 표에 채운다(원칙 V)

**Checkpoint**: US1만으로 이 기능의 목적이 달성된다 — 신호가 있는 하루를 실기기에서 처음 본다

---

## Phase 4: User Story 2 — 손으로 못 만드는 갈래를 만든다 (P2)

**Goal**: 004가 가른 갈래 중 실기기에서 손으로 만들 수 없는 것들을 만든다

**Independent Test**: `partial-location`을 심고 자리 값이 좌표를 본 사진 수에 근거하는지 본다 (quickstart B3)

- [X] T031 [P] [US2] `__tests__/seed/shapes.test.ts`에 `empty`·`partial-location`·`one-place`·`over-limit` 검사를 더한다 — 각 모양이 **004의 어느 갈래에 대응하는지**를 단언으로 못 박는다(FR-008a)
- [X] T032 [US2] `scripts/seed/shapes.mts`에 `empty` — 사진 0장. **빈 배열이 정상이다**(data-model.md)
- [X] T033 [US2] `scripts/seed/shapes.mts`에 `partial-location` — 5장 중 2장에만 좌표
- [X] T034 [US2] `scripts/seed/shapes.mts`에 `one-place` — 4장의 좌표가 전부 100m 안 (`visitCount: 1`)
- [X] T035 [US2] `scripts/seed/shapes.mts`에 `over-limit` — 201장. **`DEFAULT_PHOTO_LIMIT`(200)를 이 기능이 다시 정하지 않는다** — 004의 값을 읽거나, 읽을 수 없으면 왜 201인지 주석으로 근거를 남긴다
- [X] T036 [P] [US2] `__tests__/seed/shapes.test.ts` — **모양 이름이 계약이라는 것**을 검사한다(FR-008). 이름 목록이 테스트에 박혀 있어 말없이 바뀌면 실패한다
- [X] T037 [US2] quickstart B2 — **★ SC-003.** `empty`를 심고 **「사진 없음」**이 보이는지 확인한다. **「사진 모름」이 아니다** — 007이 미확인으로 남긴 갈래를 의도적으로 만든다
- [X] T038 [US2] quickstart B3 — **SC-004.** `partial-location`에서 자리 값이 **좌표를 본 2장에 근거**하고 5장 전부를 본 것처럼 말하지 않는지 확인한다
- [ ] T039 [US2] quickstart B4 — **SC-005.** `over-limit`에서 잘린 것으로 판정되고 일기가 사진 수를 단언하지 않는지 확인한다. **201장을 심는 시간을 재서 research.md에 채운다**
  - **⚠️ 막혔다** — 201장이 322초 걸리고 색인이 150장에서 밀린다(research.md §9).
    도구가 `index-failed`로 잡고 치웠다. **폴더째 한 번 스캔하는 쪽을 재 봐야 한다.**
- [X] T040 [US2] quickstart B5 — 권한을 거두어 **「사진 모름」**이 되는지 확인한다. **도구가 권한을 건드리지 않는다는 것**도 함께 확인한다(FR-014)

**Checkpoint**: 값에서만 초록불이던 갈래들이 실기기로 옮겨졌다

---

## Phase 5: User Story 3 — 심은 것을 되돌린다 (P2)

**Goal**: 사람이 지시하면 심은 것만 치운다. 진짜 사진은 건드리지 않는다

**Independent Test**: 심기 전 사진 수를 세고, 심고, 치우고, 다시 세어 같은지 본다 (quickstart A6)

- [X] T041 [P] [US3] `__tests__/seed/clear.test.ts` — **전용 폴더 밖의 경로를 절대 지우지 않는가**(FR-016a). 어떤 인자를 줘도 폴더 밖으로 나가지 못하는 것을 검사한다
- [X] T042 [US3] `scripts/seed-clear.mts` — 폴더의 파일을 세고 → 지우고 → **볼륨 스캔** → 유령 행 확인 → 기록 비우기 (contracts/seeding.md)
- [X] T043 [US3] `scripts/seed-clear.mts`가 **볼륨 스캔을 반드시 돈다** — 빠뜨리면 MediaStore에 유령 행이 남아 앱이 계속 그 사진을 본다(research.md §5 실측)
- [X] T044 [US3] `scripts/seed-clear.mts`가 지울 것이 없으면 **그 사실을 알린다** — 오류가 아니다
- [X] T045 [US3] `scripts/seed-clear.mts`가 지우지 못한 것을 **조용히 넘기지 않는다**(FR-012b)
- [X] T046 [P] [US3] `__tests__/seed/list.test.ts` — `seed:list`가 **기록이 아니라 기기의 폴더를 세어 답하는가**(data-model.md — 폴더가 경계이고 기록은 편의)
- [X] T047 [US3] `scripts/seed-list.mts` — 지금 뭐가 심겨 있나(FR-011c)
- [X] T048 [US3] `scripts/seed-day.mts`가 **심기 전 `existing`을 세어 결과에 담는다**(FR-011b) — 자동으로 치우지 않는 대신 남은 것이 안 보이는 일이 없어야 한다
- [X] T049 [US3] quickstart A6 — **SC-006·007.** 치운 뒤 전체 사진 수가 심기 전과 같고, **진짜 사진이 하나도 안 지워진 것**을 확인한다
- [X] T050 [US3] quickstart A7 — **★ SC-006a.** 지시하지 않으면 **치우지 않는 것**을 확인한다(FR-011a, 명확화 Q4)
- [X] T051 [US3] quickstart A4·A8 — `seed:list`가 답하고, 남은 것이 있으면 `existing`이 0이 아닌 것을 확인한다

**Checkpoint**: 개발자가 자기 개인 기기에서도 쓸 수 있다

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: 원칙 IV 방어와 「앱을 안 바꿨다」의 증명

### ★ 헌법 검사 확장 (원칙 IV — plan.md 「헌법 검사 확장」)

- [X] T052 `__tests__/constitution-rules.test.ts`에 검사를 더한다 — **`scripts/seed*`가 `diary/store`·`files/diary`·`generate(`에 닿으면 위반**으로 잡히는가
- [X] T053 `scripts/constitution-rules.ts`에 `checkSeedFile()`을 더한다. **주석을 걷어내고 검사한다** — 008의 교훈(「설명이 위반으로 잡히면 아무도 설명을 쓰지 않는다」)
- [X] T054 `scripts/check-constitution.mts`가 `scripts/seed*`를 훑도록 잇는다 — **등록하지 않으면 규칙이 있어도 돌지 않는다**(`FLOWS` 미등록과 같은 함정)

### 앱을 안 바꿨다는 증명 (SC-008·009)

- [X] T055 [P] `git diff --stat src/ App.tsx`가 **0줄**인지 확인한다 — 이 기능의 가장 강한 주장
- [X] T056 [P] release APK에 도구의 흔적이 없는지 확인한다(quickstart D) — `scripts/`는 번들에 들어갈 길이 없다

### 위반 주입 (초록불을 믿기 전에 — quickstart C1)

- [X] T057 `scripts/seed/`가 `src/diary/store`를 import 하도록 넣어 보고 **헌법 검사가 잡는지** 확인한다. 되돌린다
- [X] T058 `RunResult`에 `elapsedMs`를 넣어 보고 **T014가 잡는지** 확인한다(원칙 IV). 되돌린다
- [X] T059 부분 성공을 `ok: true`로 반환하도록 고쳐 보고 **T024가 잡는지** 확인한다(FR-018c). 되돌린다
- [X] T060 확인 단계(5단계)를 건너뛰도록 고쳐 보고 **T019가 잡는지** 확인한다(FR-018d). 되돌린다

### 기록 (원칙 V)

- [X] T061 `npm run lint`와 `npm test`가 초록불인지 확인한다
- [X] T062 [AGENTS.md](../../AGENTS.md)에 010 절을 더한다 — **「합성 하루에서의 관측」임을 명시한다**(FR-020). 진짜 하루의 관측과 같은 자리에 적지 않는다
- [X] T063 research.md의 짐작 표에서 실측으로 바뀐 것을 채운다(색인 시간·201장 시간)

---

## Dependencies

```
Phase 1 (Setup)
   ↓
Phase 2 (Foundational) ← ⚠️ 여기가 끝나야 스토리를 시작할 수 있다
   ↓
   ├─→ Phase 3 (US1) 🎯 MVP ─────┐
   │                              │
   ├─→ Phase 4 (US2) ← US1의 진입점을 쓴다
   │                              │
   └─→ Phase 5 (US3) ← 독립적 ────┤
                                  ↓
                          Phase 6 (Polish)
```

### 스토리 사이

- **US1**이 진입점(`seed-day.mts`)과 device 계층을 만든다 → **US2가 그것을 쓴다**
- **US3**는 별도 명령(`seed-clear.mts`·`seed-list.mts`)이라 **US1과 병렬 가능하다** —
  다만 T048(`existing` 세기)만 `seed-day.mts`를 건드리므로 US1 뒤다
- **US2는 US1 없이 못 돈다** — 모양만 늘리는 것이라 진입점이 필요하다

### Phase 2 안에서

```
T004 (템플릿) ─→ T006 (템플릿 검사)
     ↓
T007 (EXIF 테스트) ─→ T008 (EXIF 구현) ─→ T009 (위반 주입)
T010 (범위 테스트) ─→ T011 (범위 잇기)
```

**T007이 T008보다 먼저다** — 헌법 「테스트를 먼저 쓴다」.

---

## Parallel Opportunities

### Phase 2

```
T005, T006 을 T004 뒤에 병렬
T007과 T010 을 병렬 (다른 파일, 다른 관심사)
```

### Phase 3 (US1) — 테스트를 먼저 병렬로

```
T012, T013, T014 를 동시에  (shapes / plan / result — 서로 다른 파일)
     ↓
T015, T016 (구현)
     ↓
T017, T018 (device)  ←→  T019 (verify 테스트) 병렬
     ↓
T020~T025
```

### Phase 4·5 병렬

```
US2 (T031~T040)  ←→  US3의 T041~T047  을 병렬로 진행 가능
                       (T048만 US1 뒤)
```

### Phase 6

```
T055, T056 병렬
T057~T060 (위반 주입)은 순차 — 하나씩 넣고 되돌린다
```

---

## Implementation Strategy

### MVP = Phase 1 + 2 + 3 (US1)

**T001~T030.** 이것만으로 이 기능의 목적이 달성된다:

> **005 이후 아직 한 번도 못 본 「사진 3장 + 자리 2곳」인 하루의 일기를 실기기에서
> 처음 본다**(SC-002, T028).

US2·US3 없이도 값어치가 있다 — 다만 **US3 없이 쓰면 심은 사진이 기기에 쌓인다.**
개인 기기에서 돌린다면 US3를 함께 하는 편이 낫다.

### 증분 순서

1. **Phase 1+2** → 템플릿과 EXIF 패치가 선다
2. **Phase 3 (US1)** → 🎯 **여기서 멈춰도 된다.** SC-002가 달성된다
3. **Phase 5 (US3)** → 개인 기기에서 쓸 수 있게 된다
4. **Phase 4 (US2)** → 나머지 갈래를 실기기로 옮긴다
5. **Phase 6** → 원칙 IV 방어를 코드로 굳힌다

**US3를 US2보다 먼저 하는 것을 권한다** — 되돌릴 수 없는 도구는 쓰기 무섭고, US2가
201장을 심으므로 그 전에 치울 수단이 있는 편이 낫다.

### ⚠️ 이 기능에서 특히 조심할 것

| 함정 | 어디서 | 방어 |
| --- | --- | --- |
| **push 성공을 심김으로 오독** | T021·T026 | T019·T020의 확인. research.md §1이 실측으로 잡았다 |
| **손으로 EXIF 만들기** | T008 | 템플릿 패치만 한다(T004·T005). §4의 실측 |
| **볼륨 스캔 빠뜨리기** | T042 | T043. 유령 행이 남는다 |
| **「일기가 좋아졌다」 결론** | T028·T062 | FR-021·FR-020. quickstart 머리말이 경고한다 |
| **모양 이름을 말없이 바꾸기** | T036 | 이름이 계약이다(FR-008) |
| **검사를 등록 안 하기** | T054 | `FLOWS` 미등록과 같은 함정 |

---

## Task Count

| Phase | Tasks | 비고 |
| --- | --- | --- |
| 1 — Setup | 3 | T001~T003 |
| 2 — Foundational | 8 | T004~T011 ⚠️ 블로킹 |
| 3 — US1 (P1) 🎯 | 19 | T012~T030 (실기기 5) |
| 4 — US2 (P2) | 10 | T031~T040 (실기기 4) |
| 5 — US3 (P2) | 11 | T041~T051 (실기기 3) |
| 6 — Polish | 12 | T052~T063 |
| **합계** | **63** | 실기기 확인 **12개** |
