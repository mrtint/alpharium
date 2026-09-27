---
description: "Task list for 049 날 고르기"
---

# Tasks: 날 고르기 — 홈 헤더와 주간 스트립

**Input**: `specs/049-home-day-picker/`의 spec.md, plan.md, research.md, data-model.md, contracts/day-picking.md, quickstart.md

**Tests**: 헌법 「개발 방식」이 계약·테스트 먼저를 요구한다 — 각 스토리는 실패하는 테스트부터 쓴다(red → green).
계약 ID(DB·WP·SW·H·S·HS·AF)를 테스트 이름에 그대로 넣는다. 소스 검사는 주석을 걷어낸 뒤 한다
(`.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")`).

**Organization**: 스토리별 phase. US4(하루 경계)가 US1·US2의 판정 기반이라 먼저 온다(셋 다 P1).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [ ] T001 `git branch --show-current`가 `049-home-day-picker`인지 눈으로 확인하고, `npm test`로 기준선(전부 통과)을 기록한다
- [ ] T002 [P] jest ui 프로젝트에 RNGH jest 설정을 더한다 — `package.json`의 ui 프로젝트 `setupFiles`에 `<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js`(없으면 `setupFiles` 키 신설). `npm run test:ui`가 그대로 통과하는지 확인
- [ ] T003 [P] `__tests__/jest-projects.test.ts`가 T002 이후에도 두 프로젝트의 파일 수를 맞게 세는지 `npm test`로 확인한다(설정 변경이 스위트를 조용히 빼지 않았는지)

---

## Phase 2: Foundational

없음 — 공유 기반(하루 경계)은 US4 phase가 담당하며 US1·US2가 그 뒤에 온다(Dependencies 참조).

---

## Phase 3: User Story 4 — 오늘은 자정부터 오늘이고, 언제든 쓸 수 있다 (Priority: P1)

**Goal**: 하루 경계를 기기 로컬 자정으로, 정오 제한 폐지. 백그라운드·알림·미리 준비의 사흘은 뜻 보존.

**Independent Test**: 가짜 시계 00:30·09:00·23:59에서 `dayOf`·`dayBounds`·`isDayWritable`·`selectableDays`가 DB1~DB9를 만족. 실기기 D8.

### Tests (먼저, 실패 확인)

- [ ] T004 [P] [US4] `__tests__/config/day-boundary.test.ts`를 새 계약으로 고쳐 쓴다 — DB1(`dayOf` 자정 경계), DB2(03:59도 당일), DB3(`dayBounds` = `[day 00:00, day+1 00:00)`), DB4(오늘은 00:00·09:00·11:59·12:00·23:59 모두 쓸 수 있음), DB5(내일 거짓·1년 전 참), DB6(`selectableDays(09-26 09:00)` = `[09-25, 09-24, 09-23]`, `12:00` = `[09-26, 09-25, 09-24]`), DB7(`00:30` = `[09-25, 09-24, 09-23]`), DB8(`weekOf` W1~W4, 2026-12-31 → 2026-12-27~2027-01-02), DB9(`nextDayStartAt(09-26 23:59:30)` = 09-27 00:00). 04:00 기대값 테스트와 `writableAt`·`stripDays` 테스트는 지운다
- [ ] T005 [P] [US4] `__tests__/config/day-boundary-source.test.ts`(신규, logic) — DB10(소스에 `writableAt`·`stripDays`·`STRIP_DAY_COUNT`·`DAY_STARTS_AT_HOUR` 선언 없음), DB11(`src/`·`App.tsx` 전 파일에서 `getHours() -`·`getHours() +` 패턴 0곳, `getHours()`는 `diary/prompt.ts`·`schedule/decision.ts`·`vision/select.ts`·`config/day-boundary.ts`에서만), DB13(FR-021 — 사흘 범위 소비처가 여전히 `selectableDays`를 부른다: `src/schedule/task.ts`, `App.tsx`의 `photoDays` 탐색과 `canPrepare`; `src/app/state.ts`는 부르지 않는다)
- [ ] T006 [P] [US4] `__tests__/vision/select.test.ts`에 DB12(00:30 사진은 첫 칸, 23:30 사진은 마지막 칸)를 더하고 04:00 기준 시간 칸 기대값을 자정 기준으로 고친다

### Implementation

- [ ] T007 [US4] `src/config/day-boundary.ts` — `DAY_STARTS_AT_HOUR` 삭제, `dayOf`=달력 날짜, `dayBounds`=자정~자정, `latestClosedDay`=`dayOf(now)` −1일, `isDayWritable(day, now) = day <= dayOf(now)`, `writableAt`·`stripDays`·`STRIP_DAY_COUNT` 삭제, `weekOf(day)`(일요일 시작 7일, 「원본에서 매번 더한다」)·`shiftWeek(day, n)`·`nextDayStartAt(now)` 신규. **`selectableDays`의 오늘 포함 조건은 `isDayWritable`을 부르지 말고 `now.getHours() >= WRITABLE_FROM_HOUR`를 함수 안에서 직접 본다**(research R4 — 새 `isDayWritable`을 타면 정오 전에 오늘이 들어와 백그라운드가 아침에 쓴다). 파일 머리·각 함수 주석을 자정 경계와 「정오는 이제 사흘 범위의 구성 규칙에서만」으로 고친다
- [ ] T008 [US4] `src/vision/select.ts` `bucketIndexOf` — `getHours() - 4` 제거, 자정 기준 분(`getHours() * 60 + getMinutes()`), 주석 교체(research R1)
- [ ] T009 [P] [US4] 04:00 설명 주석을 자정으로 고친다 — `src/diary/pipeline.ts`, `src/schedule/decision.ts`, `src/schedule/retry.ts`, `src/schedule/notified-store.ts`, `src/signals/collect.ts`, `src/signals/types.ts`(코드 변경 없음, 주석만)
- [ ] T010 [P] [US4] `scripts/seed/shapes.ts`의 모양별 사진 시각 표와 「자정 전에 들도록」 주석(204~211행)을 자정 경계 기준으로 다시 맞추고, `scripts/seed/plan.ts` 주석을 고친다. `__tests__/seed/day-range.test.ts`·`__tests__/seed/exif.test.ts`의 04:00 기대값 갱신
- [ ] T011 [US4] 04:00·정오 기대값이 박힌 나머지 logic 테스트를 새 규칙으로 고친다 — `__tests__/diary/pipeline.test.ts`(오늘은 정오 전에도 통과, 미래 날은 거부), `__tests__/schedule/decision.test.ts`·`__tests__/schedule/retry.test.ts`(사흘 뜻 보존 — 기대값의 시각만), `__tests__/signals/collect.test.ts`(구간 자정). 지키던 성질이 남으면 성질은 남긴다(plan 「원칙」)
- [ ] T012 [US4] `npm run test:logic` 통과 확인, 위반 주입 V1(`selectableDays` 조건을 `isDayWritable(today, now) && !isDayClosed(today, now)`로 되돌리기 → DB6 FAIL)·V2(`select.ts`에 `getHours() - 4` → DB11·DB12 FAIL) 수행 후 되돌림

**Checkpoint**: 하루 경계가 자정, 오늘은 언제든 쓸 수 있음, 백그라운드 사흘 보존 — logic 테스트로 확인.

---

## Phase 4: User Story 1 — 주간 스트립으로 날을 고른다 (Priority: P1)

**Goal**: 일~토 고정 7칸, 좌우 스와이프로 주 이동(요일 유지·오늘 주 너머 튕김·clamp), 미래 흐림, 지난 날 전부 선택 가능.

**Independent Test**: SW1~SW6, S1~S6, HS1·HS3, WP1~WP5 통과 + 실기기 D4~D7·D9.

### Tests (먼저)

- [ ] T013 [P] [US1] `__tests__/app/state.test.ts` — WP1(`chosenDay` 없음 → `dayOf(now)`, 09:00에도), WP2(30일 전 `chosenDay` 그대로), WP3(미래 → 오늘), WP5(`overwrites`는 고른 날만), SW1(`weekCellsFor` 7칸 일~토·`selected` 정확히 1·오늘만 `isToday`), SW2(미래 `selectable: false`, 몇 주 전 `true`), SW3(`swipeWeek(09-26, "previous")` = 09-19), SW4(오늘 09-24일 때 `swipeWeek(09-19, "next")` = 09-24), SW5(오늘 주에서 `"next"` = `null`, `canSwipeNext` 거짓), SW6(8/31 선택 시 8/30~9/5). 사흘·되돌림·`writableAt` 기대 테스트는 지운다
- [ ] T014 [P] [US1] `__tests__/app/state-source.test.ts`(신규, logic) — WP4(`WritePrompt` 타입 소스에 `selectable`·`revertedFrom`·`writableAt` 키 없음, `SelectableDay` 선언 없음)
- [ ] T015 [P] [US1] `__tests__/ui/day-picker.test.tsx` — S1(`day-YYYY-MM-DD`·`day-dot-YYYY-MM-DD` 유지), S2(오늘 밑줄 `day-today-YYYY-MM-DD`, 선택 여부에 따른 색), S3(흐린 칸 `disabled`·불투명도 0.3·누르면 `onSelect` 안 불림), S4(`fireGestureHandler(getByGestureTestId("day-strip-pan"), …)` — `translationX: 80` 끝 → `onSwipe("previous")`, `-80` → `onSwipe("next")`, `20`·`velocityX: 0` → 호출 없음, `velocityX: 800`·`translationX: 15` → 방향대로 호출), S5(소스에 `new Date(`·`dayOf` 없음), S6(소스에 `ScrollView`·`FlatList` 없음)
- [ ] T016 [P] [US1] `__tests__/ui/diary-home-week.test.tsx`(신규) — HS1(`swipeWeek`가 `null`이면 `onChooseDay` 안 불림), HS3(`canPrepare`가 거짓인 날을 고르면 `prepare`·`captionDay` 미호출, `release` 호출), HS4(소스에 `writableAt`·`WRITABLE_TIMER_SLACK_MS`·`write-unavailable` 없음)

### Implementation

- [ ] T017 [US1] `src/app/state.ts` — `WritePrompt`를 `{ day, overwrites, writable }`로 축소(data-model §3), `SelectableDay` 삭제, `writePromptFor`: `chosenDay`가 미래가 아니면 그대로 아니면 `dayOf(now)`(되돌림 없음), `writable = isDayWritable(day, now)`. `StripCell`에 `isToday` 추가. `stripCellsFor` → `weekCellsFor(items, prompt, now)`(`weekOf(prompt.day)` 7칸), `swipeWeek(selected, direction, now)`(data-model §5 표 그대로: previous는 `shiftWeek(-1)`, next는 오늘 주면 `null` 아니면 `min(shiftWeek(+1), dayOf(now))`), `canSwipeNext`. 주석의 04:00·사흘·D9 설명을 고친다
- [ ] T018 [US1] `src/ui/DayPicker.tsx` — props `{ cells, onSelect, onSwipe, canSwipeNext }`. 보드 수치(칸 세로 여백 10·간격 6, 요일 10/자간 .06em/불투명도 .7, 숫자 15/700, 밑줄 2px 오프셋 4, 점 5×5, 흐림 .3, 선택 칸 accent 배경 + `accentForeground` 글자). 오늘 밑줄(선택 안 됨 `COLORS.accent`, 선택됨 선택 글자색). `GestureDetector` + `Gesture.Pan().runOnJS(true).activeOffsetX([-10, 10]).failOffsetY([-10, 10]).withTestId("day-strip-pan")`, `onUpdate`: `translateX = canSwipeNext || tx > 0 ? tx : tx * RUBBER_BAND`, `onEnd`: `|tx| >= SWIPE_DISTANCE || |vx| >= SWIPE_VELOCITY`면 `onSwipe(tx > 0 ? "previous" : "next")`, 언제나 `translateX = withSpring(0)`. 상수 `SWIPE_DISTANCE = 40`·`SWIPE_VELOCITY = 500`·`RUBBER_BAND = 0.25`에 「사람이 정한 값(보드에 수치 없음), 실기기 D4에서 조정」 주석. 판정·`Date` 없음(S5)
- [ ] T019 [US1] `src/ui/DiaryHomeScreen.tsx` — `stripCellsFor` → `weekCellsFor`, `onSwipe`를 `swipeWeek(prompt.day, dir, now())`로 받아 `null`이 아니면 `setChosenDay`. 048 전환 타이머(`opensAtMs`·`WRITABLE_TIMER_SLACK_MS`) 삭제. 새 prop `canPrepare?: (day: DayDate) => boolean` — 1·2단계 미리 준비 effect 맨 앞에서 거짓이면 `void release?.().catch(() => {})` 후 return(`preparedFor`·`captionRef` 초기화 포함, research R5)
- [ ] T020 [US1] `App.tsx` — `DiarySection`이 `canPrepare={(day) => selectableDays(new Date()).includes(day)}`를 `DiaryHomeScreen`에 넘긴다(주석: `photoDays`가 훑은 범위와 같은 함수, R5·FR-020a). `photoDays` 주석을 「사흘 — 049 이후 화면 범위와 분리」로 고친다
- [ ] T021 [US1] `src/ui/DiaryListScreen.tsx` — `DayPicker`에 `onSwipe`·`canSwipeNext` 배선(props 추가, `DiaryHomeScreen`이 넘김)
- [ ] T022 [US1] `npm run test:ui`·`test:logic` 통과, 위반 주입 V4(`swipeWeek` clamp 제거 → SW4 FAIL)·V5(`canPrepare` 검사 제거 → HS3 FAIL)·V8(`DayPicker`에 `new Date()` → S5 FAIL) 후 되돌림

**Checkpoint**: 스와이프로 사흘 밖의 날까지 고를 수 있고, 미리 준비가 그 날에서 멈춘다.

---

## Phase 5: User Story 2 — 헤더가 고른 날을 보여 준다 (Priority: P1)

**Goal**: 월 라벨·큰 숫자·요일·상태 줄(보드 원문), 150ms 크로스페이드, 헤더 탭 동작 없음, 되돌림 캡션·쓸 수 없는 갈래 삭제.

**Independent Test**: H1~H8, HS5 통과 + 실기기 D1~D3·D8.

### Tests (먼저)

- [ ] T023 [P] [US2] `__tests__/ui/home-text.test.ts` — `dayStateText` 다섯 갈래(research R9: 「오늘 일기를 쓸 수 있어요」, 「이 날 일기를 쓸 수 있어요」, 제목, 「이 날 일기를 썼어요」, 「읽을 수 없어요」) 원문 잠금(H4·H5), `monthText` 「2026년 9월」·「2026년 8월」(H1·H2), `weekdayLong(6)` 「토요일」. 소스에 `hourText`·`revertedText`·`HALF_DAY_HOURS` 없음. 048 G10(시각 숫자 문구·「정오」 금지)은 유지
- [ ] T024 [P] [US2] `__tests__/ui/diary-home.test.tsx`(헤더 블록) — H1(`home-month`·`home-kicker` 「일기」, 누름 처리 없음), H3(`home-day-number`·`home-weekday`), H4(상태 줄 `home-day-state` 갈래를 목록 상태별로), H6(날짜 표시 노드에 「오늘」 없음), H7(헤더 소스의 숫자·요일 묶음에 `Pressable`·`onPress` 없음), H8(날 바꾸면 `home-day-fade-out`과 새 숫자가 함께 렌더), HS5(`revertedText` 없음, 캐릭터 옮김·`denied-notices`는 렌더됨)
- [ ] T025 [P] [US2] `__tests__/ui/diary-home-write-gate.test.tsx` — 048 B4~B6을 「미래 날」 입력으로 유지(쓸 수 없는 날에 쓰기 버튼 없음·`write()` 멈춤), 정오 전 오늘은 쓰기 버튼이 있다(신규), `write-unavailable` 기대 테스트 삭제

### Implementation

- [ ] T026 [US2] `src/ui/home-text.ts` — `dayStateText(prompt, item, now)` 추가(`item`은 고른 날의 `DiaryListItem | undefined`, 오늘 판정은 `dayOf(now)` 비교 — `day-boundary`에서 import, 숫자·정오 없음), `hourText`·`HALF_DAY_HOURS`·`revertedText`·`shortDate`(쓰는 곳이 없어지면) 삭제
- [ ] T027 [US2] `src/ui/DiaryListScreen.tsx` 헤더 — 보드 수치(월 라벨 11/600 자간 .1em accent, 「일기」 같은 크기 `textMuted`, 큰 숫자 62/800 줄높이 .85 자간 -.05em `tabular-nums`, 요일 16/700, 상태 줄 13 `textMuted`, 좌우 20·위 safe area는 기존 프레임 유지), 상태 줄 = `dayStateText`, 숫자·요일 묶음 크로스페이드(research R8: 이전 날 `absolute` 레이어 `testID="home-day-fade-out"` 불투명도 1→0, 새 날 0→1, `withTiming(…, { duration: 150 })`, 이전 날은 `useRef`). 헤더에 누름 처리 없음. `Notices`에서 되돌림 줄 삭제. `WriteBar`의 쓸 수 없음 갈래(`write-unavailable`)는 `write.writable === false`(미래 방어)일 때 버튼을 안 그리는 것만 남기고 시각 문구 삭제. `SignalRow` 「쓸 수 있는 때」 값은 「지금」 고정(칸은 「쓸 재료」 조각까지 유지, C7)
- [ ] T028 [US2] `App.tsx` `AppFrame` — 고른 날 초기값을 `useState<DayDate>(() => dayOf(new Date()))`로(AF1, FR-010a). 주석의 「쓸 수 있는 첫 날에서 시작한다」를 「앱을 새로 열면 오늘」로. `__tests__/ui/AppFrame.firstrun.test.tsx`의 정오 관련 기대(040 `dayWritable`)를 새 규칙으로 고치고 AF1·AF2 소스 계약 추가
- [ ] T029 [US2] `__tests__/ui/generation-probe.test.tsx`가 `latestClosedDay` 경계 변경으로 깨지면 기대 날짜만 고친다(`GenerationProbe.tsx` 동작은 그대로)
- [ ] T030 [US2] `npm run test:ui` 통과, 위반 주입 V3(`writePromptFor` 기본값을 `selectableDays(now)[0]` → WP1 FAIL)·V6(헤더 숫자에 `Pressable` → H7 FAIL)·V7(`AppFrame` 초기값 `null` → AF1 FAIL) 후 되돌림

**Checkpoint**: 홈 위쪽이 보드 `1d` ①②③과 같다.

---

## Phase 6: User Story 3 — 켜 둔 채 자정이 지나도 보던 날을 잃지 않는다 (Priority: P2)

**Goal**: 자정 타이머로 오늘 밑줄·흐림만 옮기고 선택은 유지.

**Independent Test**: HS2 가짜 시계 통과.

- [ ] T031 [US3] `__tests__/ui/diary-home-week.test.tsx`에 HS2 — `jest.useFakeTimers` + 주입 시계로 09-25 23:59:30 → 09-26 00:00:01을 넘기면 선택(09-25) 유지, `day-today-2026-09-26` 존재·`day-today-2026-09-25` 없음. 토요일 밤 → 일요일이면 `canSwipeNext`가 참이 된다
- [ ] T032 [US3] `src/ui/DiaryHomeScreen.tsx` — 목록 화면에 있는 동안 `nextDayStartAt(now()) + 1초`에 `tick`을 올리는 타이머(정리 함수로 해제, `AppState active`의 `tick` 유지). 주석: 048 전환 타이머를 대체
- [ ] T033 [US3] `npm run test:ui` 통과, HS2가 타이머 제거 시 FAIL하는지 주입 확인 후 되돌림

---

## Phase 7: Polish & Cross-Cutting

- [ ] T034 [P] Maestro — `.maestro/today-diary.yml` 60~63행 「이미 썼어요 · 다시 쓰면 덮어써요」 대기를 제목/「이 날 일기를 썼어요」로, `.maestro/past-day-diary.yml`에 이전 주로 `swipe`(RIGHT) 후 사흘 밖의 날 선택 단계 추가·「셋으로 늘었는가」 주석 교체, `.maestro/diary-home-1d.yml` 주 스트립 가정 재확인, `.maestro/photo-selection-over-limit.yml`에 심은 날이 지난 주면 `swipe`로 넘어가는 단계, `.maestro/writing-flow-simplified.yml`은 `write-day-label`·`day-*` 사용이 그대로 통하는지 확인(FR-023)
- [ ] T035 [P] `.maestro/week-strip-swipe.yml` 신규 — 오늘 칸 선택 확인 → 스트립 오른쪽 스와이프 → 같은 요일 7일 전 `day-*` 선택 확인 → 왼쪽 스와이프 복귀 → 오늘 주에서 왼쪽 스와이프 시 선택 불변(튕김). `scripts/run-device-tests.mjs` `FLOWS`에 등록하고 009 주석(「셋으로 늘었는가」·04:00 대기) 갱신
- [ ] T036 `AGENTS.md` — 「지켜야 할 경계」의 「하루는 04:00에 닫히고 정오부터 오늘도 쓸 수 있다」를 「하루는 기기 로컬 자정에 바뀌고 오늘은 언제든 쓸 수 있다(049)」로 교체, 「실측 규칙」·009·012·048 절에서 04:00·정오를 현재 규칙처럼 말하는 문장에 「049에서 바뀜」 표기, 049 절 신설(결론·R4 함정·R5 위험·select.ts 복제 발견·실기기 관측은 T039 후 채움)
- [ ] T037 `npm test`·`npm run lint`(eslint·tsc·헌법 검사·prettier) 전부 통과 확인. `tsc` 0이 곧 `WritePrompt` 축소의 완료 조건(037 방식)
- [ ] T038 quickstart §1 위반 주입 표 V1~V8 전부 다시 한 번 확인(각 phase에서 한 것 포함)하고 결과를 `specs/049-home-day-picker/quickstart.md` 끝에 기록
- [ ] T039 실기기 dev(debug) 1회 — quickstart §2 준비(설치 대치 + `pm clear` + 재시작, `adb reverse`, Metro dev), D1~D10 수행. D9는 `npm run seed:day -- many-camera <4주 전>` + 모델 배치 후 `adb logcat`으로 `has_media=1`·크래시 없음 확인. 자정 전환은 기기 앞에 있을 때만, 아니면 「미확인 잔여」에 기록. 스와이프 수치가 어색하면 T018 상수 조정 후 재확인
- [ ] T040 T039 관측값을 AGENTS.md 049 절과 spec.md 「미확인 잔여」(필요 시 절 신설)에 옮긴다. release 검증은 하지 않는다(C2)

---

## Dependencies & Execution Order

- Phase 1 → Phase 3(US4) → Phase 4(US1) → Phase 5(US2) → Phase 6(US3) → Phase 7
- **US4가 먼저인 이유**: US1의 `weekOf`·`isDayWritable`·US2의 `dayStateText`가 새 경계 함수를 쓴다.
- US1 T017(`state.ts`)은 US2 T026·T027보다 먼저(`WritePrompt` 모양 변경).
- US2 T027과 US1 T021은 같은 파일(`DiaryListScreen.tsx`) — 순서대로.
- US3은 US1 T019(`DiaryHomeScreen.tsx`) 이후.

### Parallel Opportunities

- US4: T004·T005·T006 동시(각기 다른 테스트 파일), T009·T010 동시.
- US1: T013·T014·T015·T016 동시.
- US2: T023·T024·T025 동시.
- Polish: T034·T035 동시.

## Implementation Strategy

1. **MVP = US4 + US1**: 경계·정오 폐지 + 주 스트립 스와이프. 이 둘로 「지난 날 전부에 닿는다」가 성립한다(§2 성립 조건).
2. US2로 헤더를 보드와 맞춘다.
3. US3 자정 타이머.
4. Polish에서 Maestro·AGENTS·실기기 1회.
