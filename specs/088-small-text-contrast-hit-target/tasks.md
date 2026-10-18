# Tasks: 작은 글자 대비와 누름 영역 — accent 글자·선택 칸 요일·설정 토글

**Input**: Design documents from `/specs/088-small-text-contrast-hit-target/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/contrast-and-hit-target.md](./contracts/contrast-and-hit-target.md), [quickstart.md](./quickstart.md)

**Tests**: 헌법(「계약을 먼저 정하고 테스트를 먼저 쓴다(MUST)」)에 따라 각 사용자 스토리에서 실패하는 단위·계약 테스트를 먼저 작성한 뒤 구현한다.

**Organization**: User Story 1(작은 강조 글자 5곳 대비), User Story 2(주간 스트립 요일 약자 대비), User Story 3(설정 토글 누름 영역) 순으로 독립 구현·검증할 수 있게 구성한다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 서로 다른 파일을 다루어 병렬 실행 가능
- **[Story]**: 해당 태스크가 속한 사용자 스토리 (`[US1]`, `[US2]`, `[US3]`)
- 모든 태스크는 정확한 파일 경로와 데이터 모델 제약 조건을 포함한다

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 새 패키지나 디렉터리 생성이 없으므로 기존 테스트 기준선(baseline)이 통과하는지 확인한다.

- [x] T001 Run baseline test suite for target token and UI test files in `__tests__/theme-tokens.test.ts`, `__tests__/ui/settings-screen.test.tsx`, `__tests__/ui/writing-in-place.test.tsx`, `__tests__/ui/diary-list.test.tsx`, `__tests__/ui/welcome-screen.test.tsx`, and `__tests__/ui/day-picker.test.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: US1·US2·US3가 공통으로 참조하는 디자인 토큰(`src/ui/theme/tokens.ts`)과 토큰 대비 불변식 테스트(`__tests__/theme-tokens.test.ts`)를 먼저 확립한다 (FR-003, FR-006, FR-008, SC-001, SC-002, SC-003, C3, C5, C6).

- [x] T002 Write failing token contract tests for `contrastRatio(COLORS.danger, COLORS.bg) >= 4.5` (DT4), `DAY_STRIP.dowMuted` (`"#5f5e5d"`, `contrastRatio(DAY_STRIP.dowMuted, COLORS.bg) >= 4.5`, excluded from `Object.values(COLORS)` while keeping 9 `COLORS` keys), and `SETTINGS.toggle.hitSlop === 9` (`height + hitSlop * 2 === SETTINGS.row.minHeight`) in `__tests__/theme-tokens.test.ts`
- [x] T003 Add `DAY_STRIP = { dowMuted: "#5f5e5d" } as const` and `hitSlop: 9` on `SETTINGS.toggle` (`{ width: 44, height: 26, padding: 3, knob: 20, knobOff: COLORS.textMuted, hitSlop: 9 }`) in `src/ui/theme/tokens.ts` and verify `__tests__/theme-tokens.test.ts` passes

**Checkpoint**: `src/ui/theme/tokens.ts`의 새 상수와 `__tests__/theme-tokens.test.ts` 통과 완료 — US1, US2, US3 시작 가능.

---

## Phase 3: User Story 1 - 밝은 배경 위 작은 강조 라벨이 또렷하게 읽힌다 (Priority: P1) 🎯 MVP

**Goal**: 밝은 배경 위 11~~13pt·600 강조 글자 다섯 자리(홈 월 라벨·홈 쓰는 중 상태 줄·쓰는 중 머리말·작명 표지·설정/개발자/진단 묶음 머리)를 `COLORS.danger`(`#ae1800`, 대비 6.41~~6.56:1)로 바꾸고, `src/ui/` 안에서 `COLORS.accent`를 글자 스타일 `color`로 쓰는 일이 0건임을 잠근다 (FR-001, FR-002, FR-003, SC-001, C1, C2).

**Independent Test**: `npx jest __tests__/ui/diary-list.test.tsx __tests__/ui/writing-in-place.test.tsx __tests__/ui/welcome-screen.test.tsx __tests__/ui/settings-screen.test.tsx` 실행 시 다섯 자리의 `color: COLORS.danger` 단언과 `src/ui/` 내 `color:\s*COLORS\.accent\b` 0건 소스 계약이 통과한다.

### Tests for User Story 1 ⚠️

> **NOTE: 먼저 테스트를 작성·수정한 뒤 실행하여 구현 전 실패(RED)를 확인한다**

- [x] T004 [P] [US1] Add failing test asserting `home-month` text style `color` is `COLORS.danger` (`"#ae1800"`) in `__tests__/ui/diary-list.test.tsx`
- [x] T005 [P] [US1] Update W3 test (`home-day-state` `color: COLORS.danger`) and add W2 assertion that `writing-kicker` text style `color` is `COLORS.danger` (`"#ae1800"`) in `__tests__/ui/writing-in-place.test.tsx`
- [x] T006 [P] [US1] Add failing test asserting `welcome-kicker` text style `color` is `COLORS.danger` (`"#ae1800"`) in `__tests__/ui/welcome-screen.test.tsx`
- [x] T007 [P] [US1] Update F3 test (`settings-group-*-label` `color: COLORS.danger`) and add C2 source contract test scanning all `.ts`/`.tsx` files under `src/ui/` (with comments stripped) for 0 occurrences of `color:\s*COLORS\.accent\b` in `__tests__/ui/settings-screen.test.tsx`

### Implementation for User Story 1

- [x] T008 [P] [US1] Change `home-month` label color and `WRITING_STATE` text color from `COLORS.accent` to `COLORS.danger` in `src/ui/DiaryListScreen.tsx`
- [x] T009 [P] [US1] Change `writing-kicker` text color from `COLORS.accent` to `COLORS.danger` in `src/ui/WritingPaper.tsx`
- [x] T010 [P] [US1] Change `KICKER` (`welcome-kicker`) text color from `COLORS.accent` to `COLORS.danger` in `src/ui/WelcomeScreen.tsx`
- [x] T011 [P] [US1] Change `Group` header label (`${testID}-label`) text color from `COLORS.accent` to `COLORS.danger` (keeping `Tag` denied `borderColor: COLORS.accent` unchanged) in `src/ui/SettingsScreen.tsx`

**Checkpoint**: User Story 1의 모든 컴포넌트·소스 계약 테스트가 통과한다 (GREEN).

---

## Phase 4: User Story 2 - 주간 스트립의 선택된 날과 선택되지 않은 날 요일이 모두 기준 대비를 지킨다 (Priority: P1)

**Goal**: `src/ui/DayPicker.tsx`의 요일 약자(`DOW`)에서 `opacity: 0.7`을 제거하고, 선택 칸 요일은 `COLORS.accentForeground`(`#f3f2f2`, 3.76:1), 비선택 칸 요일은 `DAY_STRIP.dowMuted`(`#5f5e5d`, 5.79:1)로 그리며 글자 크기(10pt)·자간(0.6)과 미래 칸 `opacity: 0.3`은 유지한다 (FR-004, FR-005, FR-006, FR-007, SC-002, C4, C5).

**Independent Test**: `npx jest __tests__/ui/day-picker.test.tsx` 실행 시 선택/비선택 칸의 요일 약자 색상, `fontSize: 10, letterSpacing: 0.6`, 요일 스타일 `opacity` 미사용 및 소스 내 `DOW` 불투명도 0건 계약이 통과한다.

### Tests for User Story 2 ⚠️

> **NOTE: 먼저 테스트를 작성한 뒤 실행하여 구현 전 실패(RED)를 확인한다**

- [x] T012 [US2] Add failing contract tests in `__tests__/ui/day-picker.test.tsx` asserting: (1) selected cell weekday text has `color: COLORS.accentForeground` (`"#f3f2f2"`), `fontSize: 10`, `letterSpacing: 0.6`, and `opacity: undefined`, (2) unselected cell weekday text has `color: DAY_STRIP.dowMuted` (`"#5f5e5d"`), `fontSize: 10`, `letterSpacing: 0.6`, and `opacity: undefined`, and (3) comment-stripped `src/ui/DayPicker.tsx` source contains `opacity` only once (`CELL_DIMMED = { opacity: 0.3 }`) and never in `DOW`

### Implementation for User Story 2

- [x] T013 [US2] Remove `opacity: 0.7` from `DOW` (`{ fontSize: 10, letterSpacing: 0.6 } as const`) and set weekday `AppText` color to `selected ? COLORS.accentForeground : DAY_STRIP.dowMuted` in `src/ui/DayPicker.tsx`

**Checkpoint**: User Story 2(`__tests__/ui/day-picker.test.tsx`)가 통과한다 (GREEN).

---

## Phase 5: User Story 3 - 설정 토글의 위아래 가장자리를 눌러도 켜고 끌 수 있다 (Priority: P2)

**Goal**: 설정·개발자 화면이 공유하는 `Toggle`(`src/ui/SettingsScreen.tsx`)의 시각 크기(44×26dp)를 유지하면서 `hitSlop={{ top: 9, bottom: 9 }}`를 부여해 세로 누름 높이를 44dp로 넓힌다 (FR-008, SC-003, C6).

**Independent Test**: `npx jest __tests__/ui/settings-screen.test.tsx` 실행 시 `auto-diary-toggle`의 `hitSlop`이 `{ top: 9, bottom: 9 }`이고 스타일 크기가 `width: 44, height: 26`임을 확인한다.

### Tests for User Story 3 ⚠️

> **NOTE: 먼저 테스트를 작성한 뒤 실행하여 구현 전 실패(RED)를 확인한다**

- [x] T014 [US3] Add failing test in `__tests__/ui/settings-screen.test.tsx` (under C2 toggle section) asserting `auto-diary-toggle` has `hitSlop: { top: 9, bottom: 9 }` and preserves `width: 44, height: 26`

### Implementation for User Story 3

- [x] T015 [US3] Add `hitSlop={{ top: toggle.hitSlop, bottom: toggle.hitSlop }}` to `Toggle` `Pressable` in `src/ui/SettingsScreen.tsx`

**Checkpoint**: User Story 3(`__tests__/ui/settings-screen.test.tsx`)가 통과한다 (GREEN).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 위반 주입(C7), 전체 테스트·린트·헌법 검사, 실기기(`SM-S901N` dev) 검증(SC-004).

- [x] T016 Execute fault injection C7-1 (temporarily revert `home-month` in `src/ui/DiaryListScreen.tsx` to `COLORS.accent`, confirm C2 source contract and `diary-list.test.tsx` fail, then restore) and C7-2 (temporarily add `opacity: 0.7` to `DOW` in `src/ui/DayPicker.tsx`, confirm `day-picker.test.tsx` fails, then restore)
- [x] T017 Run full test suite (`npm test`), linter (`npm run lint`), and constitution check (`npm run check:constitution`) across repository root
- [x] T018 Execute device/simulator verification D1, D2, and D3 per `specs/088-small-text-contrast-hit-target/quickstart.md` (verified on physical `iPhone 14` iOS 27.0.1 + iOS Simulator `iPhone 17 Pro Max` iOS 26.5, with `SM-S901N` noted as unverified due to home Mac environment; includes font scale 1.0/`accessibility-large` captures, toggle hitSlop positive/negative tap coordinates, and Maestro week-strip-swipe + settings-time-place flows) and record results in `specs/088-small-text-contrast-hit-target/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 즉시 시작 가능
- **Foundational (Phase 2)**: Phase 1 이후 실행 — `DAY_STRIP.dowMuted`와 `SETTINGS.toggle.hitSlop` 토큰을 정의하므로 Phase 3~5 전에 완료
- **User Stories (Phase 3~5)**:
  - **US1 (Phase 3)**, **US2 (Phase 4)**: 둘 다 P1이며 서로 다른 컴포넌트(`DiaryListScreen`/`WritingPaper`/`WelcomeScreen`/`SettingsScreen` vs `DayPicker`)를 수정하므로 병렬 또는 순차 진행 가능
  - **US3 (Phase 5)**: `SettingsScreen.tsx`와 `__tests__/ui/settings-screen.test.tsx`를 US1(T007, T011)과 공유하므로 US1 완료 후 순차 실행
- **Polish (Phase 6)**: Phase 3~5 완료 후 실행

### Within Each User Story

- 각 스토리의 테스트 태스크(T004~~T007, T012, T014)를 먼저 작성하고 실패(RED)를 확인한 뒤 구현 태스크(T008~~T011, T013, T015)를 수행한다.

### Parallel Opportunities

- US1 내부 테스트 T004, T005, T006, T007은 서로 다른 테스트 파일이므로 병렬 작성 가능(`[P]`)
- US1 내부 구현 T008, T009, T010, T011은 서로 다른 소스 파일이므로 병렬 수정 가능(`[P]`)
- US2(T012~T013)는 US1·US3와 파일이 겹치지 않아 독립 실행 가능

---

## Parallel Example: User Story 1

```bash
# US1 실패 테스트 병렬 작성:
Task: "T004 [P] [US1] Add failing test for home-month in __tests__/ui/diary-list.test.tsx"
Task: "T005 [P] [US1] Update W3 and add W2 test in __tests__/ui/writing-in-place.test.tsx"
Task: "T006 [P] [US1] Add failing test for welcome-kicker in __tests__/ui/welcome-screen.test.tsx"
Task: "T007 [P] [US1] Update F3 and add C2 source contract test in __tests__/ui/settings-screen.test.tsx"

# US1 구현 병렬 적용:
Task: "T008 [P] [US1] Update DiaryListScreen.tsx"
Task: "T009 [P] [US1] Update WritingPaper.tsx"
Task: "T010 [P] [US1] Update WelcomeScreen.tsx"
Task: "T011 [P] [US1] Update SettingsScreen.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1(Setup) 및 Phase 2(Foundational) 완료
2. Phase 3(User Story 1) 테스트 작성(RED) → 구현(GREEN)
3. 다섯 자리 강조 글자 AA 대비 및 소스 계약 독립 검증

### Incremental Delivery

1. Foundation(`tokens.ts` + `theme-tokens.test.ts`) → 토큰 대비 불변식 확보
2. US1(작은 강조 글자 5곳) → AA 4.5:1 미달 해소
3. US2(`DayPicker` 요일 약자) → 선택 칸 2.44:1 미달 해소
4. US3(`Toggle` `hitSlop`) → 44dp 터치 영역 확보
5. Polish(위반 주입 + 전체 테스트 + `SM-S901N` 실기기 검증)
