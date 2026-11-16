# Tasks: 홈 날 스트립을 오늘에서 끝나는 이어 스크롤로 (119)

**Input**: `specs/119-strip-continuous-scroll/` (spec·plan·research·data-model·contracts/strip-scroll.md·quickstart)

**Tests**: 헌법 「개발 방식」·AGENTS 「계약을 먼저 정하고 테스트를 먼저 쓴다」에 따라 테스트를 먼저 쓴다.

## Phase 1: Setup

- [x] T001 `src/`·`__tests__/`·`.maestro/`·`docs/e2e/`에서 `weekOf`·`shiftWeek`·`weekCellsFor`·`swipeWeek`·`canSwipeNext`·`swipeDirectionOf`·`day-strip-pan`·`onSwipe=` 쓰는 곳을 세어 `specs/119-strip-continuous-scroll/research.md` R7에 목록으로 적는다

## Phase 2: Foundational (범위·칸 목록 — 모든 이야기가 쓴다)

- [x] T002 [P] 테스트 먼저: `__tests__/config/day-boundary.test.ts`에 CS-DB1~CS-DB4를 쓰고 049 DB8(`weekOf`) 테스트를 지운다(빨강 확인)
- [x] T003 [P] 테스트 먼저: `__tests__/app/state.test.ts`에 CS-SC1~~CS-SC6, CS-ST1~~CS-ST4를 쓰고 049 SW1·SW3~SW6(`weekCellsFor`·`swipeWeek`·`canSwipeNext`) 테스트를 지운다(빨강 확인)
- [x] T004 `src/config/day-boundary.ts`에 `STRIP_PAST_DAYS = 365`(사람이 정한 값이라고 주석)와 `stripStartDay(selected, now)` = `min(shiftDay(dayOf(now), −365), selected)`를 더하고, `weekOf`·`shiftWeek`를 지운다(쓰는 곳은 `state.ts`의 지울 함수들뿐이다 — 2026-11-16 grep)
- [x] T005 `src/app/state.ts`에 `stripCellsFor(items, selected, now)`(첫 칸 `stripStartDay`, 끝 칸 `dayOf(now)`, 칸 판정 `cellFor`, `hasDiary`는 일기 날짜 `Set` 한 번)와 `stripScrollTarget({ index, offset, cellWidth })`(data-model 「스크롤 목표」 그대로: `first = round(offset / w)`, 안이면 `null`, 왼쪽 밖 `index × w`, 오른쪽 밖 `(index − 6) × w`, `w ≤ 0`이면 `null`)를 더하고 `weekCellsFor`·`swipeWeek`·`canSwipeNext`를 지운다. T002·T003 초록 확인

## Phase 3: User Story 1 — 하루씩 이어 흘려 지난날을 훑는다 (P1)

**Independent Test**: 스트립이 오늘에서 끝나는 하루 단위 칸 줄을 그리고, 붙기 설정을 갖는다.

- [x] T006 [US1] 테스트 먼저: `__tests__/ui/day-picker.test.tsx`를 새 계약으로 고친다 — CS-S1(testID 유지), CS-S4(소스: 팬·`day-strip-pan`·`swipeDirectionOf`·`RUBBER_BAND`·`onSwipe` 없음, `FlatList`·`getItemLayout`·`snapToInterval` 있음), CS-S5, CS-S8, 마지막 칸이 오늘이고 오른쪽 끝에서 시작(`initialScrollIndex`), 고른 날이 그 화면 밖이면 고른 날이 보이는 위치에서 시작(FR-008). 049 S4·S6 테스트를 지운다
- [x] T007 [US1] `src/ui/DayPicker.tsx`를 가로 `FlatList`로 바꾼다: 칸 폭 = `onLayout` 폭 ÷ 7(재기 전에는 창 폭으로 어림, 잰 폭이 다르면 `key={width}`로 다시 세워 보던 첫 칸 유지 — research R2), `getItemLayout`, `snapToInterval`=칸 폭, `decelerationRate="fast"`, `showsHorizontalScrollIndicator={false}`, `initialScrollIndex`로 오른쪽 끝(고른 날이 그 화면 밖이면 고른 날이 보이게), 칸 모양·스타일·testID는 그대로. 팬·고무줄·교체 대기·`swipeDirectionOf`·관련 상수를 지우고 머리 주석을 119 기준으로 다시 쓴다(옛 서술을 주석으로 남기지 않는다)

## Phase 4: User Story 2 — 스크롤해도 고른 날은 그대로 (P1)

**Independent Test**: 스크롤 이벤트 뒤 `onSelect`가 불리지 않고, 칸 누름에서만 불린다.

- [x] T008 [US2] 테스트 먼저: `__tests__/ui/day-picker.test.tsx`에 CS-S2·CS-S3을 쓴다(`fireEvent.scroll`·`momentumScrollEnd` 뒤 `onSelect` 0회, 칸 누름 1회)
- [x] T009 [US2] `src/ui/DiaryListScreen.tsx`·`src/ui/DiaryHomeScreen.tsx`에서 `onSwipe`·`canSwipeNext` prop과 배선을 지우고 `cells={stripCellsFor(items, prompt.day, now())}`로 바꾼다. 쓰는 중 스트립 잠금(054)은 그대로 둔다. 주석의 `weekCellsFor`·`swipeWeek` 서술을 고친다
- [x] T010 [US2] 테스트: CS-HS1(소스)·CS-HS2를 `__tests__/ui/diary-home-week.test.tsx`에 반영하고, 049 HS1(스와이프 결과 `null`) 테스트를 지운다. 049 HS2(자정에 고른 날 그대로·밑줄만 새 오늘, 새 오늘 칸이 끝에 붙는다)가 계속 통과하는지 확인한다

## Phase 5: User Story 3 — 다른 길로 날이 바뀌어도 잃지 않는다 (P2)

**Independent Test**: 고른 날을 화면 밖 날로 바꾸면 `scrollToOffset`이 목표값으로 불리고, 화면 안이면 불리지 않는다.

- [x] T011 [US3] 테스트 먼저: `__tests__/ui/day-picker.test.tsx`에 CS-S6·CS-S7을 쓴다(목록 ref의 `scrollToOffset` 스파이, `rerender`로 고른 날 변경, 동작 줄이기 모의). 홈 조립에서 본문 밀기(`onSwipeDay`)로 고른 날이 바뀐 뒤에도 같은 스크롤이 일어나는지 `__tests__/ui/day-swipe-screen.test.tsx`에 하나 둔다(FR-011)
- [x] T012 [US3] `src/ui/DayPicker.tsx`: 오프셋을 `onScroll`에서 ref에 두고, 고른 칸 인덱스가 바뀔 때만 `stripScrollTarget`을 불러 값이 있으면 `scrollToOffset({ offset, animated: !reduceMotion })`(`useReduceMotion()`, 값을 모르면 움직이지 않는다 — 즉시 옮긴다)

## Phase 6: Polish

- [x] T013 [P] 스트립에 닿는 ui 테스트(`day-swipe-screen`·`day-swipe-material`·`reading-scroll`·`written-day-reach`·`diary-list`·`settings-entry`·`failure-toast`·`bottom-bar-fill`·`writing-in-place`)에서 `onSwipe`·`canSwipeNext`·`day-strip-pan`·화면 밖 `day-<date>`를 쓰는 곳을 고친다
- [x] T014 [P] `.maestro/past-day-diary.yml` M5: 스트립 오른쪽 밀기 네 번 뒤 고른 칸 단언을 「보이는 칸 하나를 눌러 고른다 → 선택 단언」으로 바꾸고 주석을 119 기준으로 고친다. `.maestro/today-diary.yml` 주석의 「일~토 주간 스트립」을 고친다
- [x] T015 [P] `specs/049-home-day-picker/contracts/day-picking.md`의 S4·S6·SW1·SW3~SW6·HS1·DB8 행을 「119 `contracts/strip-scroll.md`로 옮겼다」로 고친다
- [x] T016 [P] `design/DESIGN.md`·`AGENTS.md` 홈 항목의 스트립 서술(일~토 7칸·주 넘김)과 `src/ui/DaySwipe.tsx` 주석의 `swipeDirectionOf` 언급을 119 기준으로 고친다
- [x] T017 `npm test`·`npm run lint` 통과, 헌법 검사 통과
- [ ] T018 iOS 시뮬레이터에서 quickstart 「iOS 시뮬레이터」 1~6을 보고, iPhone 14 개발 서명 Release로 소유자 확인을 받아 `quickstart.md`에 관측/못 본 것을 적는다

## Dependencies

- T001 → T002·T003 → T004 → T005 → (US1 T006→T007) → (US2 T008→T009→T010) → (US3 T011→T012) → Polish
- US2·US3는 T007의 새 `DayPicker`에 기댄다.

## Parallel

- T002 ∥ T003 (다른 파일). Polish T013~T016은 서로 다른 파일.

## Implementation Strategy

MVP는 US1+US2(소유자가 짚은 현상 해소). US3는 같은 PR에서 마친다.

## Phase 7: Convergence

- [x] T019 본문 밀기(`onSwipeDay`)로 고른 날이 화면 밖 날이 되면 스트립이 그 칸으로 스크롤하는 조립 시험을 `__tests__/ui/day-swipe-screen.test.tsx`에 둔다 per FR-011 (partial)

## Phase 8: 코드 리뷰 반영

- [x] T020 갈래 전환 재마운트에도 스트립 위치 유지(`StripMemory`·`memoryRef`) in src/ui/DayPicker.tsx, src/ui/DiaryListScreen.tsx — 리뷰 Important 1, CS-S9
- [x] T021 먼 칸·범위 앞쪽 변경 직후 이동은 움직임 없이 in src/ui/DayPicker.tsx — 리뷰 Important 2, CS-S10
- [x] T022 고른 날 변화를 날짜로 비교, `Cell` memo·`renderItem` useCallback, Maestro 칸 정규식을 `day-[0-9]{4}-[0-9]{2}-[0-9]{2}`로 좁힘 — 리뷰 Minor
