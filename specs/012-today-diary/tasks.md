---
description: "Task list for 012-today-diary"
---

# Tasks: 오늘의 일기

**Input**: Design documents from `/specs/012-today-diary/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: **필수다.** 헌법 「개발 방식」이 「계약을 먼저 정하고 테스트를 먼저 쓴다(MUST)」를
못 박았다. 각 이야기에서 **테스트를 먼저 쓰고 빨간불을 본 뒤** 구현한다.

**Organization**: 이야기별로 묶어 각각을 독립적으로 구현·검증할 수 있게 한다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능 (다른 파일, 끝나지 않은 작업에 기대지 않음)
- **[Story]**: 어느 사용자 이야기인가 (US1~US4)

---

## ⚠️ 이 기능에서 가장 조심할 것

이 저장소에서 반복된 실패는 **오류 없이 아무 일도 일어나지 않는 것**이었다:
006의 `GenerationProbe`(파이프라인 건너뜀), 007의 끊긴 `stop` 배선, 008의 버려진
반환값, 009의 `latestClosedDay(at)` 한 줄, 011의 `resolvePath` 기본 구현.

**이 기능의 같은 실패는 「화면에서 오늘을 골라도 파이프라인이 조용히
`day-not-closed`로 막는 것」이다.** `src/diary/pipeline.ts`의 1단계 게이트
(`isDayClosed(input.day, input.now)`)가 지금 **오늘을 언제나 거부하도록** 짜여
있다(research.md §9) — 오늘은 정의상 이 조건이 `false`이기 때문이다.

그래서 **T007이 이 기능의 배선 검증**이고, **T041(D2)이 실기기에서 그것을
확인한다.** 「일기가 생성됐다」로 통과시키지 않고, 「정오 이후 오늘이 실제로
`day-not-closed`를 지나 다음 단계로 진행하는가」를 직접 본다.

---

## Phase 1: Setup

**Purpose**: 이 기능에서는 새 폴더가 없다 — 기존 자리를 넓히는 것뿐이므로 이
단계는 최소한이다

- [X] T001 `specs/012-today-diary/checklists/requirements.md`가 이미 있는지 확인(있음 — `/speckit-specify`+`/speckit-clarify` 산출). 새로 만들 것 없음

**Checkpoint**: 설계 문서(plan·research·data-model·contracts·quickstart)가 모두 갖춰져 있다

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: 이 단계가 끝나기 전에는 어느 이야기도 시작할 수 없다

**Purpose**: 정오 판정과 파이프라인 게이트 — US1·US3이 전부 여기 기댄다

- [ ] T002 `__tests__/config/day-boundary.test.ts`에 contracts/day-boundary.md §1(정오 판정)·§2(셋 구성)의 검증 표를 **먼저** 검사로 쓴다 (빨간불 확인). **특히 3번 행(정오 정각 경계값)과 1·2번 행(셋 구성이 정오 전후로 갈리는 것)**
- [ ] T003 `src/config/day-boundary.ts`에 `WRITABLE_FROM_HOUR = 12` 상수를 `DAY_STARTS_AT_HOUR`·`SELECTABLE_DAY_COUNT` 옆에 추가 (research.md §1)
- [ ] T004 `src/config/day-boundary.ts`에 `isDayWritable(day, now)` 구현 — `isDayClosed(day, now) || (day === dayOf(now) && now.getHours() >= WRITABLE_FROM_HOUR)` (contracts/day-boundary.md §1)
- [ ] T005 `src/config/day-boundary.ts`의 `selectableDays(now)`를 넓혀 정오 이후 오늘이 그그제를 대신하게 한다 (contracts/day-boundary.md §2, data-model.md §1). **`SELECTABLE_DAY_COUNT`는 3 그대로 — 오늘이 넷째로 더해지지 않는다**
- [ ] T006 [P] `__tests__/config/day-boundary.test.ts`에 data-model.md §6의 불변식 I1~I5를 검사로 추가
- [ ] T007 ★ `__tests__/diary/pipeline.test.ts`에 contracts/day-boundary.md §3의 검증 표를 **먼저** 검사로 쓴다 (빨간불 확인) — **이 기능의 배선 검증이며 최우선순위다**. 특히 2번 행(정오 이후 오늘이 `day-not-closed`를 지나 다음 단계로 진행하는지)이 핵심
- [ ] T008 `src/diary/pipeline.ts`의 1단계 게이트를 `isDayClosed(input.day, input.now)`에서 `isDayWritable(input.day, input.now)`로 교체 (research.md §9, contracts/day-boundary.md §3). **이 기능에서 가장 위험한 한 줄**
- [ ] T009 [P] `__tests__/diary/pipeline.test.ts`에 지난 하루(닫힌 하루)가 지금과 동일하게 통과하는 회귀 검사 추가 (contracts/day-boundary.md §3의 3번 행)

**Checkpoint**: 정오 이후 오늘이 「고를 수 있는 하루」에 들어가고, 파이프라인이 더 이상 오늘을 거부하지 않는다 — 이제 이야기들을 시작할 수 있다

---

## Phase 3: User Story 1 — 오늘을 쓴다 (P1) 🎯 MVP

**Goal**: 정오 이후 오늘을 골라 쓸 수 있고, 그 일기는 「아직 끝나지 않았다」는
사실을 스스로 밝힌다

**Independent Test**: 정오 이후 시각에 오늘을 고르고 생성하면, 저장된 일기의
날짜가 오늘이고 본문에 하루가 끝나지 않았다는 내용이 있는지 확인한다

### "하루가 열려 있는가"를 요청에 싣는다

- [ ] T010 [P] [US1] `__tests__/diary/request.test.ts`에 `buildRequest()`가 `dayStillOpen`을 채우는 것을 **먼저** 검사로 쓴다 — `isDayClosed()`의 결과를 그대로 반영하는지 (research.md §8)
- [ ] T011 [US1] `src/diary/types.ts`의 `DiaryRequest`에 `dayStillOpen: boolean` 필드 추가 (data-model.md §3)
- [ ] T012 [US1] `src/diary/request.ts`의 `buildRequest()`가 `now`를 받아 `isDayClosed(day, now)`로 `dayStillOpen`을 채우도록 시그니처 확장 — **기존 호출자가 깨지지 않도록 옵셔널 확장 방식을 검토한다**(003의 `isModelReady?` 선례)
- [ ] T013 [US1] `src/diary/pipeline.ts`의 `runStages()`가 `buildRequest()`에 `input.now`를 넘기도록 배선

### "하루의 끝" 문장

- [ ] T014 [P] [US1] `__tests__/diary/prompt.test.ts`에 contracts/signal-visibility.md §2의 검증 표(1~3번 행)를 **먼저** 검사로 쓴다. **특히 2번 행(사진 권한이 없어도 문장이 붙는 것)이 FR-004의 핵심**
- [ ] T015 [US1] `src/diary/prompt.ts`에 `DAY_STILL_OPEN` 상수 추가 — 신호 값을 담지 않는 고정 문구 (data-model.md §4)
- [ ] T016 [US1] `src/diary/prompt.ts`의 `buildPrompt(request, vision?)`이 `request.dayStillOpen`이 `true`이면 `DAY_STILL_OPEN`을 신호 목록과 독립된 자리(사진 축과 무관)에 삽입 (contracts/signal-visibility.md §2). **`dayStillOpen: false`이면 011까지의 프롬프트와 바이트 단위로 같아야 한다**(P1 불변식)
- [ ] T017 [US1] `src/diary/prompt.ts`의 `instructionLines()`가 `DAY_STILL_OPEN`을 되뱉기 판정 비교 대상에 포함하도록 반영 (contracts/signal-visibility.md §2의 P2)

### ★ 화면 안내 — 헌법 원칙 II MUST ("일기와 화면 양쪽에 드러난다")

**`/speckit-analyze`가 잡은 갭**: 헌법이 "아직 쓸 수 없는 하루는 왜 아직인지와
언제부터 쓸 수 있는지를 함께 알린다(MUST)"고 명시하는데, 이 절이 없으면 FR-002가
프롬프트(T015~T017)만 만족하고 화면에는 반영되지 않는다.

- [ ] T017a [P] [US1] `__tests__/ui/day-picker.test.tsx`에 contracts/day-boundary.md §4의 검증 표(1~2번 행)를 **먼저** 검사로 쓴다 (빨간불 확인)
- [ ] T017b [US1] `src/ui/DayPicker.tsx`의 `DayPickerProps`에 `todayNotYetWritable?: boolean` 추가하고, 참이면 "몇 시부터 쓸 수 있는지"를 포함한 안내를 그린다 (data-model.md §1a). **`WRITABLE_FROM_HOUR` 외의 곳에서 시각을 얻지 않는다**(A2)
- [ ] T017c [US1] `src/ui/DiaryHomeScreen.tsx`가 `!isDayWritable(dayOf(now()), now())`를 계산해 `DayPicker`에 `todayNotYetWritable`로 넘기도록 배선 (contracts/day-boundary.md §4 「계산 위치」). **새 판정을 만들지 않고 `isDayWritable()`을 재사용한다**

**Checkpoint**: 오늘 쓴 일기가 「아직 끝나지 않았다」를 기기 없이 검증된 프롬프트로 말하고, 아직 못 쓰는 하루는 화면에서도 이유와 시각을 안내한다 — **MVP가 서고 헌법 원칙 II의 두 MUST가 모두 커버된다**

---

## Phase 4: User Story 4 — 사진을 아무리 많이 찍어도 잃지 않는다 (P2)

**Goal**: 사진 200장 상한을 없애 그날 찍힌 사진 전부가 수집 대상이 된다

**Independent Test**: 하루에 사진을 아주 많이 심고 일기를 생성했을 때, 가장 이른
사진과 가장 늦은 사진이 모두 수집 대상에 포함되는지 확인한다

**⚠️ US1보다 먼저 두는 이유**: 신호 수집 계층(`signals/`)을 여는 김에 US1과
독립적으로 처리할 수 있고, US1의 "하루의 끝" 문장과 파일이 겹치지 않는다. US1
없이도 검증 가능하다(사진 상한은 지난 하루에도 적용된다)

- [ ] T018 [P] [US4] `__tests__/signals/collect.test.ts`에 contracts/signal-visibility.md §3의 검증 표를 **먼저** 검사로 쓴다 (빨간불 확인). 특히 2번 행(300장이 전부 수집되는 것)과 3번 행(조회 실패 시 `unknown`)
- [ ] T019 [US4] `src/signals/port.ts`의 `PhotoPort.photosBetween()` 시그니처에서 `limit` 파라미터 제거
- [ ] T020 [US4] `src/signals/expo-port.ts`의 `photosBetween()` 구현에서 `Query`의 `.limit()` 호출 제거
- [ ] T021 [US4] `src/signals/collect.ts`에서 `DEFAULT_PHOTO_LIMIT` 상수, `limit + 1` 조회, `usable.slice(0, limit)` 잘림 로직을 제거 — 조회 성공 시 `complete`는 항상 `true`
- [ ] T022 [P] [US4] `__tests__/signals/collect.test.ts`에 `DEFAULT_PHOTO_LIMIT`이 소스에 더 남아 있지 않음을 확인하는 검사 추가 (contracts/signal-visibility.md L1, 소스를 직접 읽는 방식)
- [ ] T023 [US4] `src/diary/prompt.ts`의 `signalLines()`·`instructionLines()`에서 `!complete`로 촉발되던 `TRUNCATED_WARNING` 분기가 여전히 유효한지 확인 — **완전히 못 붙는 조건이 되었는지 테스트로 확인**(L3)

**Checkpoint**: 사진이 아무리 많아도 전부 수집 대상이 되고, 조회 실패만 `unknown`이 된다 — US1과 독립적으로 검증 완료

---

## Phase 5: User Story 2 — 관측할 수 없는 것은 조용히 뺀다 (P2)

**Goal**: 걸음·배터리·연결이 일기 본문·상세 화면에서 사라지고, 진단 화면에는
그대로 남는다

**Independent Test**: 걸음·배터리·연결이 전부 `unknown`인 하루의 일기를 생성하고,
본문·상세 화면 어디에도 세 축 언급이 없는지, 진단 화면엔 여전히 보이는지 확인한다

- [ ] T024 [P] [US2] `__tests__/signals/types.test.ts`(신설 또는 기존 파일)에 `USER_VISIBLE_SIGNAL_AXES` 상수가 사람이 적은 리터럴 값(steps·battery·connectivity가 false)임을 **먼저** 검사로 쓴다 (contracts/signal-visibility.md §1, S1·S2)
- [ ] T025 [US2] `src/signals/types.ts`에 `USER_VISIBLE_SIGNAL_AXES` 상수 추가 — 왜 각 축을 뺐는지, 되살릴 조건을 주석으로 남긴다 (data-model.md §2, 헌법 원칙 V MUST NOT)
- [ ] T026 [P] [US2] `__tests__/diary/prompt.test.ts`에 걸음·배터리·연결이 프롬프트에 실리지 않는 것을 검사로 추가 (contracts/signal-visibility.md §1의 1번 행)
- [ ] T027 [US2] `src/diary/prompt.ts`의 `signalLines()`가 `USER_VISIBLE_SIGNAL_AXES`를 보고 걸음·배터리·연결 줄을 건너뛰도록 수정
- [ ] T028 [P] [US2] `__tests__/ui/diary-detail.test.tsx`에 걸음·배터리·연결 줄이 상세 화면에 없는 것을 **먼저** 검사로 쓴다 (contracts/signal-visibility.md §1의 3번 행)
- [ ] T029 [US2] `src/ui/DiaryDetailScreen.tsx`의 `signalLines()`에서 걸음 수 줄 제거 — `USER_VISIBLE_SIGNAL_AXES`를 참조하거나 사진·자리만 남기도록 수정 (배터리·연결은 애초에 없었다)
- [ ] T030 [P] [US2] `__tests__/ui/signal-probe.test.tsx`(또는 기존 진단 테스트)에 `SignalProbe.tsx`가 `USER_VISIBLE_SIGNAL_AXES`를 import하지 않고 다섯 축을 전부 그리는 것을 검사 (contracts/signal-visibility.md S4)
- [ ] T031 [P] `scripts/constitution-rules.ts`에 규칙 추가 검토: 진단 경로(`SignalProbe.tsx`)가 `USER_VISIBLE_SIGNAL_AXES`를 import하지 않는다 — 소스 문자열 검사로 T030을 이중 방어(008의 "주석을 걷어내고 검사한다" 방식)

**Checkpoint**: 걸음·배터리·연결이 사용자에게 보이는 곳에서 전부 사라지고, 값 자체와 진단 경로는 그대로다

---

## Phase 6: User Story 3 — 이미 있는 일기를 실수로 덮어쓰지 않는다 (P3)

**Goal**: 이미 일기가 있는 하루에 다시 「일기 쓰기」를 누르면 확인을 한 번 더
거친다

**Independent Test**: 이미 일기가 있는 하루를 골라 쓰기를 누르면 확인 화면이
뜨고, 취소하면 기존 일기가 그대로인지, 확인하면 새로 생성되는지 확인한다

**⚠️ 마지막인 까닭**: spec이 "US1·US2 없이는 무의미하다"고 이미 명시했다. 다만
US4와는 독립적이다

### 상태 기계

- [ ] T032 [P] [US3] `__tests__/app/state.test.ts`에 contracts/overwrite-confirm.md §1의 검증 표(1~4번 행)를 **먼저** 검사로 쓴다 (빨간불 확인)
- [ ] T033 [P] [US3] `__tests__/app/state.test.ts`에 data-model.md §6의 불변식 C1~C4(선언을 `readFileSync`로 직접 읽는 방식, 007이 배운 것)를 검사로 추가
- [ ] T034 [US3] `src/app/state.ts`의 `AppScreen`에 `{ kind: "confirm-overwrite"; day: DayDate }` 갈래 추가 (data-model.md §5). **필드는 `day` 하나뿐**
- [ ] T035 [US3] `src/app/state.ts`에 「일기 쓰기」를 눌렀을 때 `WritePrompt.overwrites`를 보고 `confirm-overwrite` 또는 곧바로 `writing`으로 가는 전이 함수 추가 (contracts/overwrite-confirm.md §1, C4 — 새 판정을 만들지 않고 `overwrites`를 재사용)
- [ ] T036 [US3] `src/app/state.ts`에 `confirm-overwrite`에서 취소 시 `list`로, 확인 시 `writing`으로 가는 전이 추가 — **`toWriting()`은 여전히 인자를 받지 않는다**(C3)

### 화면

- [ ] T037 [P] [US3] `__tests__/ui/diary-list.test.tsx`(또는 새 확인 화면 테스트)에 contracts/overwrite-confirm.md §2의 검증 표(V1~V3, X1~X3)를 **먼저** 검사로 쓴다
- [ ] T038 [US3] `src/ui/DiaryListScreen.tsx`에 확인 화면 조각 추가(또는 별도 컴포넌트로 분리) — 날짜·확인·취소만 표시, 기존 일기 본문·진행률 없음 (contracts/overwrite-confirm.md §2)
- [ ] T039 [US3] `src/ui/DiaryHomeScreen.tsx`의 `switch (screen.kind)`에 `confirm-overwrite` 케이스 추가 — 확인 시 기존 `write()` 로직을, 취소 시 `toList()`를 호출하도록 배선

**Checkpoint**: 이미 있는 하루를 다시 쓰려 하면 누른 뒤 확인을 거치고, 확인 화면은 날짜 외의 정보를 담지 않는다

---

## Phase 7: Polish & 실기기 검증

**⚠️ 건너뛴 실기기 테스트는 통과가 아니다**(헌법 원칙 V). 기기 없이 전부 초록불이어도
온디바이스는 검증되지 않은 상태다

### 자동 흐름

- [ ] T040 [P] `.maestro/today-diary.yml` 작성 — 정오 이후 오늘 고르기·생성·"하루의 끝" 문구·걸음 수 미노출·덮어쓰기 확인. **부분 문자열은 정규식으로 준다**(007이 배운 것). **`childOf`를 쓰지 않는다**(008 — RN은 접근성 트리가 평탄하다)
- [ ] T040a `scripts/run-device-tests.mjs`의 `FLOWS`에 `.maestro/today-diary.yml` 등록. **⚠️ 등록하지 않으면 파일이 있어도 돌지 않고, 초록불인데 아무것도 검증되지 않는다**

### 실기기 (quickstart.md B)

**⚠️ 아래는 기기가 있어야 돈다.** 기기 없는 검증이 전부 초록불이어도 **온디바이스는
검증되지 않은 상태다**(헌법 원칙 V).

- [ ] T041 D2: ★ **정오 이후 오늘을 실제로 골라 생성한다** — `day-not-closed`로 막히지 않고 실제로 생성이 도는지 확인 (quickstart.md D2, 이 기능의 핵심 검증)
- [ ] T042 D3·D4: 저장된 일기의 날짜가 오늘이고, 본문에 "아직 안 끝났다" 취지의 문장이 있는지 확인. **FR-005 관찰도 함께**: 그 문장 뒤로 아직 일어나지 않은 일을 단언하는지 실제로 읽어본다(research.md §8 "FR-005는 새 판정을 만들지 않는다" — 새 위반 갈래를 코드로 안 만들되 관찰은 AGENTS.md에 남긴다)
- [ ] T043 D5: 사진 권한을 끈 상태에서도 "아직 안 끝났다" 문장이 여전히 붙는지 확인 (FR-004)
- [ ] T044 [P] D6·D7: 걸음·배터리·연결이 본문·상세 화면엔 없고 진단 화면엔 그대로인지 확인
- [ ] T045 D8: 정오 이전에 오늘이 선택지에 없고 안내가 뜨는지, 그그제가 대신 보이는지 확인 (T017a~c로 구현된 헌법 원칙 II MUST 화면 안내)
- [ ] T046 [P] D9~D11: 덮어쓰기 확인 화면이 뜨고, 취소·확인 각각의 결과를 확인
- [ ] T047 D12: 010의 seed 도구로 가능한 한도까지 사진을 많이 심어 상한 경고가 안 뜨는지 확인 — **한도에 부딪히면 미확인으로 남긴다**(원칙 V)
- [ ] T048 release 빌드 검증 — D2·D9를 release에서 재확인. 서명 `CN=alpharium`, Metro 없이 뜨는가

### 기록

- [ ] T049 `AGENTS.md`에 012 절 추가 — 실측과 짐작을 구분해 적는다(원칙 V). quickstart.md 「완료 선언에 필요한 것」의 표를 채운다. 정오 경계를 실기기에서 못 넘나든 경우 미확인으로 남긴다(quickstart C7)
- [ ] T050 [P] 위반 주입 검증 — quickstart.md A1의 9가지를 전부 해 보고 전부 걸리는지 확인 (008·009·011이 같은 절차를 밟았다)

---

## Dependencies

```
Phase 1 (Setup)
   ↓
Phase 2 (Foundational) ← ⚠️ 여기가 끝나야 어느 이야기도 시작된다
   ↓
Phase 3 (US1) 🎯 MVP ─────┐
   ↓                      │
Phase 4 (US4) ← US1과 독립적, 신호 수집 계층을 공유
   ↓                      │
Phase 5 (US2) ← US1·US4 이후, 같은 신호 표시 계층을 정리
   ↓                      │
Phase 6 (US3) ←───────────┘ US1·US2 없이는 무의미(spec 명시)
   ↓
Phase 7 (Polish + 실기기)
```

**이야기 사이의 실제 의존**:

| 이야기 | 무엇에 기대는가 | 왜 |
| --- | --- | --- |
| US1 | Phase 2 | 정오 판정·파이프라인 게이트가 있어야 오늘을 쓸 수 있다 |
| US4 | Phase 2(신호 계층) | US1과 독립적으로 `signals/`를 연다 — 파일이 겹치지 않는다 |
| US2 | Phase 2, US1의 프롬프트 자리 | `prompt.ts`를 같이 여는 김에 축 제외도 반영한다 |
| US3 | US1·US2 (spec이 명시) | 오늘 쓰기가 열려야 "하루에 여러 번 누르는" 상황이 흔해진다는 것이 US3의 존재 근거다 |

**⚠️ US4를 US1 다음(Phase 4)에 두는 이유**: spec 우선순위상 US4는 P2, US2도 P2로
같지만, US4(`signals/collect.ts`·`port.ts`)와 US2(`signals/types.ts`·`prompt.ts`·
`DiaryDetailScreen.tsx`)가 서로 다른 파일을 열어 순서를 바꿔도 무방하다. **US4를
먼저 둔 것은 US2가 손대는 `prompt.ts`의 `signalLines()`가 US4의 상한 제거로 인한
`TRUNCATED_WARNING` 분기 변화(T023)를 먼저 마친 상태에서 축 제외(T027)를 얹는 것이
더 안전하기 때문이다** — 같은 함수를 두 이야기가 각각 건드리므로 순서를 두어
충돌을 피한다.

---

## Parallel Execution Examples

### Phase 2 — 정오 판정과 파이프라인 게이트는 각각 독립적으로 시작 가능

```
T002 (day-boundary 테스트) ‖ T007 (pipeline 테스트)
     ↓                           ↓
T003 → T004 → T005 → T006   T008 → T009
```

### Phase 3 (US1) — 요청 확장·프롬프트 확장·화면 안내는 서로 독립

```
T010 (request 테스트) ‖ T014 (prompt 테스트) ‖ T017a (day-picker 테스트)
     ↓                      ↓                      ↓
T011 → T012 → T013     T015 → T016 → T017     T017b → T017c
```

### Phase 4 (US4) — 계약 계층 셋이 순차적(같은 흐름을 이어 고친다)

```
T018 (테스트) → T019 (port.ts) → T020 (expo-port.ts) → T021 (collect.ts) → T022 ‖ T023
```

### Phase 6 (US3) — 상태 기계와 화면 테스트는 병렬로 시작 가능

```
T032 ‖ T033 ‖ T037
   ↓      ↓      ↓
T034 → T035 → T036   T038 → T039
```

### Phase 7 — 실기기는 대체로 순차 (같은 기기를 쓴다)

```
T040 ‖ T040a 는 병렬
T041 ★ → T042 → T043 → T045   (같은 기기, 순차 — 정오 전후를 모두 봐야 한다)
T044 ‖ T046 ‖ T047 은 서로 독립
```

---

## Implementation Strategy

### MVP = Phase 1 + 2 + 3 (US1)

**T017c까지 가면 「오늘을 쓸 수 있고 그 일기가 아직 안 끝났다고 스스로 말하며,
아직 못 쓰는 하루는 화면도 이유와 시각을 안내한다」가 기기 없이 검증된다.**
T041(D2)·T045(D8)에서 실기기로 확인하면 이 기능의 핵심(헌법 원칙 II의 두 MUST
모두)이 끝난다.

### 점진적 전달

| 단계 | 무엇이 되는가 |
| --- | --- |
| Phase 2 끝 | 정오 이후 오늘이 선택지에 들어가고, 파이프라인이 더 이상 거부하지 않는다 (기기 없이) |
| Phase 3 끝 | **오늘의 일기가 "아직 안 끝났다"를 말하고, 화면도 정오 이전엔 안내한다** ← 여기서 T041(D2)·T045(D8)를 돌린다 |
| Phase 4 끝 | 사진이 아무리 많아도 전부 수집된다 |
| Phase 5 끝 | 걸음·배터리·연결이 사용자 화면에서 사라진다 |
| Phase 6 끝 | 덮어쓰기가 누른 뒤 확인을 거친다 |

### ⚠️ 먼저 하고 싶어지지만 미뤄야 하는 것

- **덮어쓰기 확인(US3)을 US1 전에** — spec이 "US1·US2 없이는 무의미하다"고
  이미 판단했다
- **사진 상한 제거(US4)에서 값을 큰 수로 바꾸는 것** — "왜 그 수인가"라는 새
  짐작값이 헌법 원칙 V를 다시 건드린다(research.md §3)
- **정오 경계를 코드가 스스로 판정하게 하는 것** — 헌법 원칙 V MUST NOT, 반드시
  사람이 적은 상수(`WRITABLE_FROM_HOUR`)를 거친다

---

## Task Summary

| Phase | 이야기 | 작업 수 |
| --- | --- | ---: |
| 1. Setup | — | 1 |
| 2. Foundational | — | 8 |
| 3. US1 (P1) 🎯 | 오늘을 쓴다 | 11 |
| 4. US4 (P2) | 사진 상한 제거 | 6 |
| 5. US2 (P2) | 관측 불가 축 제외 | 8 |
| 6. US3 (P3) | 덮어쓰기 확인 | 8 |
| 7. Polish + 실기기 | — | 12 |
| **합계** | | **54** |
