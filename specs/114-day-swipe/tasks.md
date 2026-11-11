# Tasks: 일기 글에서 좌우로 밀어 전날·다음 날로 이동한다

**Input**: `specs/114-day-swipe/` (spec·plan·research·data-model·contracts·quickstart)
**Tests**: 헌법 「개발 방식」에 따라 테스트를 먼저 쓴다(TDD). 기준선은 구현 전에 잰다.

## Phase 1: Setup

- [x] T001 기준선 확인 — `npx jest __tests__/config/day-boundary.test.ts __tests__/app/state.test.ts __tests__/ui/day-picker.test.tsx __tests__/ui/written-day-home.test.tsx __tests__/ui/diary-list.test.tsx --selectProjects logic ui`가 지금 통과하는지 확인하고 숫자를 이 파일 맨 아래 메모에 적는다

## Phase 2: Foundational (순수 판정 — 모든 스토리가 기댄다)

- [x] T002 [P] 테스트 먼저: `__tests__/config/day-boundary.test.ts`에 `shiftDay(day, days)` — 하루 뒤·앞, 월·연 경계, 서머타임 전환일(`2026-03-08`·`2026-11-01`처럼 기기 시간대에서 하루가 23·25시간인 날)에서도 정확히 하루, `shiftWeek`와 같은 계산(`shiftDay(d, 7) === shiftWeek(d, 1)`)
- [x] T003 [P] 테스트 먼저: `__tests__/app/state.test.ts`에 `swipeDay(selected, direction, now)` — `previous`는 하루 앞, `next`는 하루 뒤, `selected`가 오늘이면 `next`는 `null`, 오늘이 아니면 `next`가 오늘까지 간다, 아주 오래된 날에서 `previous`가 제한 없이 간다, 자정 직전·직후 `now`
- [x] T004 [P] 테스트 먼저: `__tests__/ui/day-swipe.test.tsx`(신규) — `daySwipeDirectionOf`: `translationX` 양수 60 이상이면 `previous`, 음수 −60 이하이면 `next`, 59면 `null`, 속도 600 이상이면 거리가 짧아도 넘김, 둘 다 못 미치면 `null`, `translationX`가 0이면 속도 부호
- [x] T005 `src/config/day-boundary.ts`에 `shiftDay(day, days)`를 내보내고(`shiftWeek`는 `shiftDay(day, weeks * 7)`로 바꾸지 않고 그대로 두어 기존 동작을 건드리지 않는다) T002를 통과시킨다. 하루 계산은 `addDays`로만 한다(`DB11`)
- [x] T006 `src/app/state.ts`에 `swipeDay`를 구현해 T003을 통과시킨다. `SwipeDirection`을 재사용하고 날짜 계산은 `shiftDay`만 쓴다

**Checkpoint**: T002·T003 통과.

## Phase 3: User Story 1 — 밀어서 이웃한 날로 간다 (P1) 🎯 MVP

**Independent Test**: 고른 날이 오늘이 아닐 때 지면을 왼쪽으로 밀면 다음 날, 오른쪽이면 전날이 된다.

- [x] T007 [P] [US1] 테스트 먼저: `__tests__/ui/day-swipe.test.tsx` — `DaySwipe`를 `fireGestureHandler(getByGestureTestId("day-swipe-pan"), [...])`로 쏴서: 오른쪽으로 길게 끌면 `onSwipeDay("previous")` 한 번, 왼쪽이면 `"next"`, 끌림 중에는 호출 없음, 짧게 끌면 호출 없음, 취소되면 호출 없음
- [x] T008 [P] [US1] 테스트 먼저: `__tests__/ui/written-day-home.test.tsx`(또는 `diary-list.test.tsx`) — 쓴 날 `DiaryListScreen`의 본문(`written-body`)에 `DaySwipe`가 걸려 있고 밀면 `onSwipeDay`가 불린다. 안 쓴 날의 재료 지면(`material-paper`)도 같다. `onSwipeDay`를 안 넘기면 제스처를 걸지 않는다
- [x] T009 [P] [US1] 테스트 먼저: `__tests__/ui/diary-home-week.test.tsx`에 홈 배선 — `DiaryListScreen` 대역이 받은 `onSwipeDay("previous")`를 부르면 `chosenDay`가 전날이 되고 `weekCellsFor` 칸이 그 날이 든 주로 바뀐다(주 경계 포함), `"next"`는 다음 날, 스트립의 `onSwipe`와 같은 상태를 쓴다, 밀기 직후 스트립 칸을 누르면 마지막 입력(칸)이 이긴다
- [x] T010 [US1] `src/ui/DaySwipe.tsx`(신규)를 구현한다 — `Gesture.Pan().runOnJS(true).activeOffsetX([-16, 16]).failOffsetY([-12, 12])`, `daySwipeDirectionOf`(거리 60·속도 600을 사람이 정한 값이라는 주석과 함께 상수로, 원칙 V), 끝에서 한 번만 `onSwipeDay`, `.withTestId("day-swipe-pan")`. T004·T007 통과
- [x] T011 [US1] `src/ui/WrittenDayPaper.tsx` — 새 prop `onSwipeDay?`가 있으면 `written-body` View를 `DaySwipe`로 감싸고 `flexGrow: 1`로 남은 높이를 채운다(캐러셀 프레임은 감싸지 않는다). 읽을 수 없는 지면(`written-unreadable`)도 같은 자리로 감싼다. T008 일부 통과
- [x] T012 [US1] `src/ui/DiaryListScreen.tsx` — props에 `onSwipeDay?`를 더하고 쓴 날 분기는 `WrittenDayPaper`로 넘기며, 안 쓴 날 분기는 `material-paper` View를 `DaySwipe`로 감싼다. T008 통과
- [x] T013 [US1] `src/ui/DiaryHomeScreen.tsx` — `onSwipeDay`를 `swipeDay(writePromptFor(listItems ?? [], now(), chosenDay).day, direction, now())`로 정하고 `null`이 아니면 `setChosenDay`. `DiaryListScreen`에 넘긴다. T009 통과

**Checkpoint**: US1 단독으로 테스트 통과, `npx tsc --noEmit` 0.

## Phase 4: User Story 2 — 끝에서는 가지 않는다 (P1)

**Independent Test**: 고른 날이 오늘일 때 왼쪽으로 밀어도 그대로다.

- [x] T014 [P] [US2] 테스트 먼저: `diary-home-week.test.tsx` — 고른 날이 오늘일 때 `onSwipeDay("next")`는 `chosenDay`를 바꾸지 않고 리렌더도 일으키지 않는다. 어제에서 `"next"`는 오늘이 된다. 아주 오래된 날에서 `"previous"`는 그 전날이 된다
- [x] T015 [US2] T013의 `null` 처리가 T014를 통과하는지 확인하고 모자라면 고친다

## Phase 5: User Story 3 — 다른 동작과 겹치지 않는다 (P1)

**Independent Test**: 캐러셀 위 가로 밀기는 사진만, 세로 끌기는 스크롤만, 쓰는 중에는 날이 그대로다.

- [x] T016 [P] [US3] 테스트 먼저: `diary-list.test.tsx`·`day-swipe.test.tsx` — 쓰는 중(`writing`)에는 `onSwipeDay`를 넘겨도 `DaySwipe`가 걸리지 않는다. 캐러셀(`PhotoCarousel`)은 `DaySwipe` 안에 있지 않다(렌더 트리로 확인). `DaySwipe`의 팬이 `activeOffsetX`·`failOffsetY`를 가진다(소스 계약 — 주석을 걷어낸 소스), `DaySwipe.tsx`에 `useAnimatedStyle`·`withTiming`·`translateX`가 없다(FR-009 — 새 전환 움직임 없음, 동작 줄이기·큰 글꼴에서도 같은 동작), 읽을 수 없는 지면과 읽는 중(빈 지면)에도 걸린다
- [x] T017 [US3] T011·T012가 쓰는 중 분기와 캐러셀을 감싸지 않는지 확인하고 모자라면 고친다

## Phase 6: User Story 4 — 스와이프 없이도 쓸 수 있다 (P2)

**Independent Test**: 큰 날짜 요소에 「전날」·「다음 날」 접근성 동작이 있고 실행하면 밀기와 같은 결과다.

- [x] T018 [P] [US4] 테스트 먼저: `diary-list.test.tsx` — `home-date-button`의 `accessibilityActions`가 `previousDay`(「전날」)·`nextDay`(「다음 날」)이고, `onAccessibilityAction`이 각각 `onSwipeDay("previous")`·`("next")`를 부른다. 쓰는 중(`onPressDate` 없음)에는 날짜 요소가 없어 동작도 없다. `onSwipeDay`가 없으면 동작이 없다. 문구는 `src/i18n/catalogs/ko/home.ts`에서만 온다(소스에 한글 리터럴 없음 — 헌법 검사)
- [x] T019 [US4] `src/i18n/catalogs/ko/home.ts`에 `daySwipeActions: { previous: "전날", next: "다음 날" }`, `src/ui/DiaryListScreen.tsx`의 `DateJump`(primary)에 `accessibilityActions`·`onAccessibilityAction`. T018 통과. 문구 골든(`__tests__/i18n/ko-golden.test.ts`)은 다시 쓰지 않고 `ADDED_AFTER_GOLDEN`에 올린다

## Phase 7: Polish & 확인

- [x] T020 `design/DESIGN.md`에 홈의 날 이동 입력이 둘(스트립·본문 밀기)이며 보드 밖 초안·사람이 정한 수치임을 적는다
- [ ] T021 `npm test`와 `npm run lint`(eslint·tsc·헌법 검사·prettier)를 실행해 통과를 확인한다
- [ ] T022 위반 주입 — (a) `swipeDay`의 오늘 제한을 빼면 T003·T014가 실패하는지, (b) `DaySwipe`를 `PhotoCarousel` 안으로 옮기면 T016이 실패하는지, (c) 쓰는 중 분기에도 `DaySwipe`를 걸면 T016이 실패하는지 본다. 치환이 적용됐는지 먼저 단언하고 확인 뒤 되돌린다
- [ ] T023 독립 코드 리뷰(`requesting-code-review`) — Critical·Important 수정, 테스트·린트 재확인
- [ ] T024 iOS 시뮬레이터 확인(`quickstart.md`): 쓴 날·안 쓴 날 모두 밀기로 이동, 주 경계에서 스트립이 따라감, 오늘에서 다음 없음, 캐러셀·세로 스크롤 경합 없음. 결과를 `quickstart.md` 아래 「실측」에 적는다
- [ ] T025 iPhone 14 개발 서명 Release 빌드를 설치하고(`quickstart.md`) 사람이 한 번 밀어 손에 맞는 정도와 세로 스크롤 경합을 확인한다 — 사람의 손이 필요하므로 결과를 받기 전에는 「확인했다」고 쓰지 않는다
- [ ] T026 `docs/roadmap/README.md`에서 이 과제를 「진행 예정 과제」에서 빼고 「완료 이력」에 114로 옮긴다(실기기 확인을 못 했으면 못 본 것으로 적는다)

## Dependencies

- Phase 2(T002~T006) → Phase 3(US1) → Phase 4·5·6(같은 파일을 만져 순서대로) → Phase 7.
- T002·T003·T004는 파일이 달라 병렬. T007·T008·T009·T014·T016·T018은 파일이 다르면 병렬.
- T010(DaySwipe) → T011·T012(화면) → T013(홈).

## MVP

US1(T001~T013)이 본체다. US2·US3·US4는 같은 코어 위의 한계·경합·접근성 보강이다.

## 메모

- T001 baseline(2026-11-11, 구현 전): 6 suites · 201 passed (day-boundary·state·day-picker·written-day-home·diary-list·diary-home-week). 구현 뒤 전체 `npm test` 8428 passed, `npm run lint` 통과.
- 테스트가 잡은 실제 버그: `DaySwipe`의 `onEnd`가 취소(`success === false`)에서도 불려 날이 넘어갔다 — `success` 확인을 더했다(스트립 `DayPicker`는 같은 자리에 `onFinalize`로 되돌리는 처리가 따로 있다).
