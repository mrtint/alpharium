# Tasks: 읽기 스크롤 — 쓴 날을 읽는 동안 스트립을 접는다

**Input**: `specs/052-reading-scroll/` — plan.md, spec.md, research.md(R1~R7), data-model.md, contracts/reading-scroll.md, quickstart.md

**Tests**: 헌법 「계약을 먼저 정하고 테스트를 먼저 쓴다」(MUST)에 따라 각 이야기의 테스트를 구현보다 먼저 쓰고, 실패하는 것을 확인한다.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 `git branch --show-current`가 `052-reading-scroll`인지 확인하고, `npm run test:logic`과 `npm run test:ui -- written-day-home`이 수정 전 초록인지 확인한다(기준선).

---

## Phase 2: Foundational (모든 이야기의 전제)

- [X] T002 [P] 치수 토큰 `READING_SCROLL`을 `src/ui/theme/tokens.ts`에 더한다.
  - 값: `{ foldMs: 240, fadeMs: 180, caretMs: 240, caret: { width: 28, fontSize: 14, fontWeight: "700", paddingBottom: 2 } }`
  - 출처(보드 `5b`)를 주석으로 단다.
  - 이 값은 계약 SRC2다.
- [X] T003 [P] 문구 `READING_SCROLL`을 `src/ui/home-text.ts`에 더한다.
  - 값: `{ caret: "▾", expandLabel: "주간 날짜 펼치기" }`
  - 접근성 라벨은 화면에 보이지 않는 글자이며 보드에 새 문구가 없다(§3.6)는 것을 주석으로 적는다.
  - 이 값은 계약 SRC1이다.
- [X] T004 판정 테스트를 `__tests__/app/reading-scroll.test.ts`에 먼저 쓴다.
  - 대상: 계약 FOLD1~FOLD9. 경계값은 8·9, 2·3, 남는 거리 8·9. 방향은 위·아래·같음.
  - FOLD8·FOLD9는 소스 검사다. 주석을 걷어낸 `DiaryListScreen.tsx`·`WrittenDayPaper.tsx`에 `> 8`·`<= 2`가 없는지, `reading-scroll.ts`에 `new Date(`·`Date.now(`·`setTimeout`이 없는지 본다.
  - 실행해 실패(모듈 없음)를 확인한다.
- [X] T005 순수 판정 `src/app/reading-scroll.ts`를 만든다.
  - export: `FOLD_AFTER = 8`, `UNFOLD_AT = 2`, `type ScrollSample = { y; previousY; viewport; content; stripHeight }`, `foldAfterScroll(collapsed, sample): boolean`
  - 규칙은 data-model §2와 같다.
    - 펼침 → 접힘: `y > 8 && y >= previousY && content − viewport − stripHeight > 8`
    - 접힘 → 펼침: `y < previousY && y <= 2`
  - 머리 주석에 보드 `5b` 스크립트와의 대응, 디바운스를 두지 않는 까닭(FR-006), FR-005가 보드에 없는 규칙이라는 것을 적는다.
  - T004가 초록인지 확인한다.

**Checkpoint**: 판정이 잠겼다.

---

## Phase 3: User Story 1 — 읽는 동안 스트립이 비켜 준다 (P1) 🎯 MVP

**Goal**: 쓴 날의 지면을 아래로 8px 넘게 내리면 스트립과 안내 캡션이 접히고 ▾가 나타난다. 맨 위(위로, 2px 이하)에서 펼친다.

**Independent Test**: 긴 본문의 쓴 날에서 지면을 스크롤해 `day-strip`이 사라지고 `home-fold-caret`이 드러나는지 본다(RS1~RS7).

- [X] T006 [US1] `__tests__/ui/paper-end.ts`에 `scrollPaper(y, { viewport = 800, content = 2000 } = {})` 도우미를 더한다.
  - 하는 일: 첫 호출 때 `written-paper`에 레이아웃·내용 크기를 쏘고, `scroll` 사건을 `nativeEvent.contentOffset.y`와 함께 쏜다(`await fireEvent`).
  - 기존 `reachPaperEnd()`는 그대로 둔다.
- [X] T007 [US1] UI 테스트를 `__tests__/ui/reading-scroll.test.tsx`에 먼저 쓴다.
  - 대상: 계약 PAPER1·PAPER3, RS1~RS7.
  - 렌더: `DiaryListScreen`에 `write`·`cells`·`paper: readable`(긴 본문)·`deniedNotices`·`movedNotice`를 준다(RS4는 두 캡션 모두 접힘 감쌈 안에 있는지 본다).
  - 날 바꾸기(RS5)는 `rerender`로 흉내 낸다.
  - RS6은 안 쓴 날(`paper` 없음)이다.
  - RS7은 `home-day-number`·`home-weekday`·`home-day-title`의 인라인 `fontSize`를 접기 전과 후에 비교한다.
  - 실행해 실패를 확인한다.
- [X] T008 [US1] 스크롤 표본 알림을 `src/ui/WrittenDayPaper.tsx`에 더한다.
  - 새 prop: `onScrollSample?: (s: { y: number; previousY: number; viewport: number; content: number }) => void`
  - `onScroll`마다 `previousY`(ref, 처음 0)와 함께 부른다(PAPER1). 위치가 그대로인 사건은 부르지 않는다(PAPER4).
  - 머리 주석에 이 지면은 판정을 모르고 표본만 알린다는 것을 적는다.
- [X] T009 [US1] 접힘 감쌈 `StripFold`를 `src/ui/DiaryListScreen.tsx`에 만든다(research R1·R2·R6).
  - 구조: `Animated.View`(`overflow: hidden`, testID `home-strip-fold`)에 `height = 진행도 × 잰 높이`를 준다. 재기 전에는 높이를 주지 않고, 잰 뒤에는 안쪽을 절대 배치로 뺀다(research R1 — 되먹임 방지).
  - 움직임: 진행도는 `foldMs` `Easing.out(Easing.ease)`, 불투명도는 `fadeMs`로 옮긴다.
  - 안쪽 `View`의 `onLayout`으로 높이를 재서 `onMeasure(height)`로 알린다.
  - 공유값 시작값은 마운트 때의 `collapsed`에서 준다(`useSharedValue(collapsed ? 0 : 1)`). 상태가 바뀌면 현재 값에서 `withTiming`으로 간다. 시작값을 effect로 되돌리지 않는다(049 교훈).
  - 접히면 `pointerEvents="none"`, `accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`.
- [X] T010 [US1] `Header`에 `fold?: { collapsed: boolean; onExpand: () => void; onMeasure: (h: number) => void }` prop을 더한다(`src/ui/DiaryListScreen.tsx`).
  - `fold`가 있으면(쓴 날) `DayPicker` + `Notices`를 `StripFold`로 감싼다(FR-017).
  - 날짜 줄 오른쪽에 ▾ 칸을 둔다: 폭 28, `READING_SCROLL.caret` 14/700, `paddingBottom` 2, 불투명도 `caretMs`, testID `home-fold-caret`. 펼친 동안은 접근성에서 숨긴다.
  - `fold`가 없으면(안 쓴 날) 지금 그대로다(RS6·FR-016).
- [X] T011 [US1] 쓴 날 갈래에서 접힘 상태를 든다(`DiaryListScreen`, data-model §3, research R7).
  - 상태: `useState<{ day; collapsed }>`와 잰 스트립 높이 ref. `collapsed = fold?.day === write.day && fold.collapsed`.
  - 배선: `WrittenDayPaper`의 `onScrollSample`에서 `foldAfterScroll(collapsed, { ...s, stripHeight })`를 부르고, 바뀌었을 때만 `setFold({ day: write.day, collapsed })`.
  - `Header`에 `fold`를 넘긴다.
  - 파일 머리 주석에 052 절을 더한다.
  - T007의 RS·PAPER1이 초록인지 확인한다.

**Checkpoint**: US1이 기기 없이 잠겼다. 누름은 아직 없다.

---

## Phase 4: User Story 2 — 날짜 줄을 눌러 다시 펼친다 (P1)

**Goal**: 접힌 날짜 줄 전체를 누르면 펼치기만 하고 달력은 열지 않는다. 펼친 상태는 050 그대로 달력을 연다.

**Independent Test**: 계약 TAP1~TAP4.

- [X] T012 [US2] TAP1~TAP4 테스트를 `__tests__/ui/reading-scroll.test.tsx`에 더한다.
  - 접힌 뒤 `home-date-row` 누름: `onPressDate` 0회이고 `day-strip`이 보인다.
  - 접힌 동안 `home-date-button`·`home-date-weekday`는 없다.
  - 펼친 쓴 날과 안 쓴 날에서 `home-date-button` 누름: `onPressDate` 1회이고 `home-date-row`는 없다.
  - 라벨: `READING_SCROLL.expandLabel`, `DATE_JUMP.title`.
  - 실행해 실패를 확인한다.
- [X] T013 [US2] 날짜 줄 누름 두 갈래를 `src/ui/DiaryListScreen.tsx`에 만든다(research R5).
  - 접혔을 때: 날짜 줄(`DATE_ROW` + ▾) 전체를 `Pressable`(testID `home-date-row`, `accessibilityRole="button"`, 라벨 `READING_SCROLL.expandLabel`, `onPress = fold.onExpand`)로 감싼다. 안쪽 `DateJump`에는 `onPress`를 넘기지 않는다(TAP2).
  - 펼쳤을 때: 누름 없는 `View`로 감싸고 050 `DateJump`를 그대로 쓴다.
  - 주석에 050 CAL1이 펼친 상태로 한정된다는 것을 적는다.
  - `onExpand`는 `setFold({ day, collapsed: false })`다(스크롤 위치에 손대지 않는다, FR-009).
  - T012가 초록인지 확인한다.
- [X] T014 [US2] `__tests__/ui/date-jump-dialog.test.tsx`·`written-day-home.test.tsx`에서 050 CAL1·051 테스트가 그대로 초록인지 확인한다.
  - 이 테스트들은 펼친 상태만 전제하므로 고칠 것이 없어야 한다.
  - 깨지면 **구현을 고친다**(기존 테스트는 고치지 않는다). 기존 테스트가 접힘 전제를 필요로 하는 드문 경우에만 그 테스트를 고치고, 이유를 테스트 주석과 quickstart §5에 적는다.

**Checkpoint**: US1·US2가 함께 초록이다.

---

## Phase 5: User Story 3 — 끝에 닿으면 다시 쓸 수 있다, 접혀 있어도 (P2)

**Goal**: 접힘·펼침이 바 상태를 바꾸지 않는다. 바는 스크롤 사건·내용 크기 변화·첫 측정에서만 판정한다(research R4).

**Independent Test**: 계약 PAPER2·TAP5.

- [X] T015 [US3] PAPER2·TAP5 테스트를 `__tests__/ui/reading-scroll.test.tsx`에 더한다.
  - 흐름: 끝까지 스크롤해 `rewrite-bar`가 접근성에 드러난 뒤, `written-paper`에 더 작은 높이의 `layout` 사건을 쏜다. 바가 그대로인지 본다.
  - 접힌 채 끝에서 `home-date-row`를 눌러도 바가 그대로인지 본다.
  - 실행해 실패(PAPER2)를 확인한다.
- [X] T016 [US3] `src/ui/WrittenDayPaper.tsx`의 `onLayout`을 바꾼다.
  - 보이는 높이는 늘 기록하되, `reported.current === undefined`(아직 한 번도 알리지 않음)일 때만 `report()`한다.
  - `onScroll`은 위치가 바뀐 사건에서만, `onContentSizeChange`는 1px 이상 바뀐 사건에서만 `report()`한다(PAPER4·PAPER5).
  - 주석에 보드 `5b`의 `atEnd`는 스크롤 사건에서만 판정한다는 것과 `5a` ④를 적는다.
  - T015와 051 `written-day-home.test.tsx`(PAPER3 포함)가 초록인지 확인한다.

**Checkpoint**: 세 이야기가 모두 기기 없이 잠겼다.

---

## Phase 6: Polish & Cross-Cutting

- [X] T017 [P] Maestro 흐름 `.maestro/reading-scroll.yml`을 만든다(FR-020).
  - 선행: `-e WRITTEN_DAY=<긴 본문의 쓴 날>`. 비었으면 `assertTrue`로 실패한다(051 방식).
  - 순서:
    1. 스트립을 넘겨 그 날로 가서 누른다.
    2. `written-paper`와 `day-strip`이 보이는지 확인한다.
    3. 지면을 위로 끌어 아래로 스크롤한다.
    4. `day-strip`이 안 보이고 `home-fold-caret`이 보이는지 확인한다.
    5. `scrollUntilVisible`로 `write-button`「다시 쓰기」까지 내린다.
    6. `home-date-row`를 누른다.
    7. `day-strip`이 보이고 `calendar-dialog`가 안 보이며 `write-button`이 여전히 보이는지 확인한다(TAP5).
  - 머리 주석에 자동화하지 않는 것(움직임 D2, 되튐)을 적는다.
- [X] T018 [P] `scripts/run-device-tests.mjs`의 `FLOWS`에 `.maestro/reading-scroll.yml`을 052 주석과 함께 등록한다.
  - 051 `written-day-reading.yml`처럼 `-e WRITTEN_DAY`가 필요하다. 실행기는 이 값을 넘기지 않으므로 알려진 실패라는 것을 적는다.
- [X] T019 위반 주입을 한다.
  - 대상: 계약의 위반 주입 열 — FOLD1·FOLD3·FOLD4·FOLD6·FOLD7·FOLD9, PAPER2, RS4·RS5, TAP1·TAP2.
  - 방법: 하나씩 주입하고 해당 테스트가 실패하는지 확인한 뒤 되돌린다.
  - 결과를 `specs/052-reading-scroll/quickstart.md` §5에 적는다.
- [X] T020 `npm test`와 `npm run lint`(eslint·tsc·헌법 검사·prettier)를 실행해 전부 초록인지 확인한다.
- [X] T021 실기기 dev 검증을 한다(quickstart §2~§4, `pm clear` 없음).
  - D1~D14를 확인한다. 움직임은 `adb shell screenrecord` + 프레임 추출로 본다. D14는 날짜 줄 누름 영역이 44dp 이상인지(FR-011) uiautomator 경계로 잰다.
  - Maestro를 `maestro test`로 직접 돌린다(`JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8`).
    - `reading-scroll.yml`
    - `written-day-reading.yml` `-e WRITTEN_DAY=2026-09-22 -e WRITTEN_DAY_PHOTOS=8`
  - 관측·미확인·기기 상태 변화를 quickstart §5에 적는다.
- [X] T022 `AGENTS.md`에 052 절을 더한다.
  - 내용: 실측 결론, 함정, 미확인 잔여.
  - 051 절의 「스트립 접힘은 여전히 「읽기 스크롤」 몫」 같은 서술 가운데 이제 이력이 된 것을 표시한다.

---

## Dependencies & Execution Order

- Phase 1 → Phase 2(T002·T003 병렬, T004 → T005) → US1(T006 → T007 → T008 → T009 → T010 → T011) → US2(T012 → T013 → T014) → US3(T015 → T016) → Polish(T017·T018 병렬, T019 → T020 → T021 → T022).
- US2는 US1의 접힘 상태(T011)에 기댄다. US3은 US2의 `home-date-row`(TAP5)에 기댄다.
- `DiaryListScreen.tsx` 한 파일에 US1·US2가 몰려 있어 이야기끼리 병렬 작업은 하지 않는다.

## Parallel Example

```text
T002 tokens.ts  ∥  T003 home-text.ts
T017 reading-scroll.yml  ∥  T018 run-device-tests.mjs
```

## Implementation Strategy

- MVP = Phase 1~3(US1). 판정과 접힘만으로 「읽는 동안 넓어진다」가 성립한다.
- 이어서 US2(펼칠 길)와 US3(바 상태 유지)를 쌓는다. 셋 다 끝나야 보드 `5a` ①~④가 모두 선다.
- 실기기 검증(T021)은 한 번에 한다(dev 1회, C2).

## Phase 7: Convergence

- [X] T023 기기에서 접힌 날짜 줄 누름을 10회 반복해(접힘 → `home-date-row` 누름 → 다시 접힘) 달력(`calendar-dialog`)이 열린 횟수를 세고 결과를 `specs/052-reading-scroll/quickstart.md` §5에 적는다 per SC-004 (partial)
- [X] T024 기기에서 D8(접힌 채 달력으로 다른 쓴 날을 고르면 펼친 상태로 시작)과 D11(접힌 동안 스트립 자리를 좌우로 끌어도 주가 넘어가지 않음)을 확인하고 `specs/052-reading-scroll/quickstart.md` §5의 「D8·D11 따로 보지 않았다」를 관측 결과로 바꾼다 per FR-014·FR-015 (partial)
