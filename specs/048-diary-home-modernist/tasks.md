---

description: "048 일기 홈 1d — 작업 목록"
---

# Tasks: 일기 홈을 디자인 보드 1d로 — 날짜 중심 홈과 화면 이동 구조

**Input**: `specs/048-diary-home-modernist/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)

**Tests**: 헌법 「개발 방식」이 계약·테스트 먼저를 MUST로 둔다 — 모든 이야기에 테스트 작업이 있고 구현보다 앞선다.
각 테스트 작업은 **먼저 실패를 확인**한 뒤 구현한다.

**형식**: `- [ ] [ID] [P?] [Story] 설명(파일 경로)`. `[P]` = 다른 파일이고 앞 작업에 의존하지 않음.

**관례**(AGENTS.md): 계약 테스트가 소스를 읽을 때는 주석을 먼저 걷어낸다
(`.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")`). RNTL 14의 `render`·`fireEvent`는 `await`.
`.ts` = `logic` 프로젝트, `.tsx` = `ui` 프로젝트.

---

## Phase 1: Setup

- [X] T001 `git branch --show-current`가 `048-diary-home-modernist`인지 확인하고, `npm test`·`npm run lint`를 한 번 돌려 시작 전 기준선(통과 스위트 수)을 기록한다

---

## Phase 2: Foundational (모든 이야기의 전제)

**목적**: 판정 계층 — 쓸 수 있게 되는 시각, 스트립 날짜, `writable`이 실린 `WritePrompt`, 날짜 조각, 문구 조립.
이것 없이는 어느 화면도 그릴 수 없다.

- [X] T002 [P] `__tests__/config/day-boundary.test.ts`에 contracts/write-prompt.md DB1~DB10을 추가한다 — `writableAt(day, now)`(10:00→그날 12:00, 다음날 01:00→다음 달력일 04:00, 13:00·닫힌 날→`null`, 03:59:59의 어제→04:00), `stripDays(now)`(`dayOf(now)`로 끝나는 7일 오름차순, 04:00·월 경계), `STRIP_DAY_COUNT === 7`, 소스 검사로 `WRITABLE_FROM_HOUR`·`DAY_STARTS_AT_HOUR`가 export되지 않음, `writableAt(d) !== null ⇔ !isDayWritable(d)`
- [X] T003 `src/config/day-boundary.ts`에 `export const STRIP_DAY_COUNT = 7`, `stripDays(now)`, `writableAt(day, now)`를 구현한다 — `writableAt`은 `isDayWritable()`이 참이면 `null`, 오늘이고 달력 시각이 04:00 전이면 `new Date(dayBounds(day).endMs)`, 04:00~12:00이면 그 하루의 `WRITABLE_FROM_HOUR`시, 그 밖은 `null`. `stripDays`는 `selectableDays`처럼 04:00을 뺀 원본에서 매번 `setDate(-back)`(누적 금지). 두 상수는 export하지 않는다. T002 통과
- [X] T004 [P] `__tests__/app/state.test.ts`에 WP1~WP11, SC1~SC4, DP7(`dayParts("2026-09-13")` → `{year:2026, month:9, date:13, weekday:0}`), DP8(소스 검사: `src/app/state.ts`가 `signals/`를 import하지 않음)을 추가한다. 기존 009·012 테스트의 `SelectableDay` 기대값에 `writable: true`를 더하고, **012의 「정오 전 `selectable`은 오늘 없이 셋」을 단언하는 테스트는 새 동작(정오 전에는 오늘이 `writable: false`로 맨 앞에 붙어 넷)으로 기대값을 바꾼다** — 정오 이후 「셋, 그그제 대신 오늘」은 그대로
- [X] T005 `src/app/state.ts`를 확장한다 — `SelectableDay.writable: boolean`, `WritePrompt.writable: boolean`·`writableAt?: Date`(**`writable === false`일 때만** 존재, I3), `CountHint`(`{kind:"known";count:number} | {kind:"none"} | {kind:"unknown"}`), `DayPreview`(`{ day: DayDate; photos: CountHint; places: CountHint }`), `dayParts(day)`, `StripCell`(`day`·`hasDiary`·`selectable`·`selected`), `stripCellsFor(items, prompt, now)`. `writePromptFor`: `selectableDays(now)`(전부 `writable: true`) 앞에, `!isDayWritable(dayOf(now), now)`일 때만 오늘을 `writable: false`로 붙인다. 기본 선택은 `selectableDays(now)[0]`(D9), 되돌림 규칙은 009 그대로. T004 통과
- [X] T006 `npx tsc --noEmit`으로 `SelectableDay`·`WritePrompt` 확장에 걸리는 기존 테스트 픽스처(`__tests__/ui/diary-list.test.tsx`의 `prompt()`, `__tests__/ui/day-picker.test.tsx`, `__tests__/ui/denied-guidance.test.tsx`, `__tests__/ui/diary-reveal.test.tsx` 등)를 찾아 `writable: true`를 채운다(재작성 대상 파일은 US1에서 통째로 바뀌므로 최소 수정)
- [X] T007 [P] `__tests__/ui/home-text.test.ts`(logic)를 만든다 — `monthText("2026-08-31")` = 「2026년 8월」, `weekdayLong(0)` = 「일요일」, `weekdayShort(4)` = 「목」, `dayOfMonthText("2026-09-13")` = 「13일」, `cardDateText("2026-09-12")` = 「2026 · 09 · 12 · 토」, `hourText(new Date(2026,8,24,12))` = 「오후 12시」, `hourText(new Date(2026,8,25,4))` = 「오전 4시」, `hourText(new Date(2026,8,25,0))` = 「오전 12시」, `revertedText("2026-09-10","2026-09-13")` = 「9월 10일은 이제 쓸 수 없어 9월 13일로 바꿨어요」. 그리고 G10 소스 검사: `src/ui/home-text.ts`·`src/ui/DiaryListScreen.tsx`·`src/ui/DayPicker.tsx`·`src/ui/HomeMenu.tsx`(존재하는 것만)의 주석 제거 소스에 `/[0-9]+\s*시/`, `정오`, `WRITABLE_FROM_HOUR`, `DAY_STARTS_AT_HOUR`가 없고, G9: 같은 파일들이 `signals/`를 import하지 않는다
- [X] T008 `src/ui/home-text.ts`를 만든다 — `dayParts()`(state.ts)만 써서 날짜 문구를 조립하고, 시각 말은 `Date.getHours()`에서 오전/오후를 가른다(시각 숫자를 문구 리터럴로 적지 않는다). 요일 이름 표는 이 파일에만 둔다. T007 통과

**Checkpoint**: 판정·문구 계층 완성 — `npm run test:logic` 초록.

---

## Phase 3: User Story 1 — 고른 하루가 화면을 채우고, 한 번에 쓴다 (P1) 🎯 MVP

**Goal**: 홈 화면을 1d 구조(헤더·7칸 스트립·신호 줄 자리·최근 목록·하단 고정 바)로 다시 그리고, 쓸 수 있는 날의
쓰기가 그대로 동작한다.

**Independent Test**: `DiaryListScreen`·`DayPicker`를 대역 prop으로 렌더해 구조 순서, 스트립 선택, 헤더·하단
날짜 동기, [일기 쓰기] 1회 호출, 카드 → `onOpen`을 확인한다(contracts/home-screen.md H·S·B1~B3).

### Tests for User Story 1

- [X] T009 [P] [US1] `__tests__/ui/day-picker.test.tsx`를 스트립 계약으로 재작성한다 — S1~S6: 7칸 `testID="day-<YYYY-MM-DD>"`, 요일 머리·날짜 숫자, `selectable` 칸만 `onSelect`, 흐린 칸은 `accessibilityState.disabled: true`이고 눌러도 0회, `hasDiary` 칸에 `day-dot-<day>`(흐린 칸 포함), `selected` 칸 `accessibilityState.selected: true`, 소스에 `new Date(`·`now(` 없음
- [X] T010 [P] [US1] `__tests__/ui/diary-list.test.tsx`를 재작성한다 — H1(`home-month`·`home-kicker`·`home-day-number`·`home-weekday`·`home-day-state`·`day-strip`·`signal-row`·`home-recent`·`home-count`·`home-bottom-bar` 존재, `home-bottom-bar`가 `ScrollView` 자손이 아님), H2(09-13 → 「13」「일요일」「아직 쓰지 않았어요」), H3(「이미 썼어요 · 다시 쓰면 덮어써요」), H4(08-31 → 「2026년 8월」), H5(되돌림 해요체), H6(`denied-notices`), B1~B3(`write-button` 안 「일기 쓰기」, 그 형제로 `write-day-label` 「13일」, `write-button` 누르면 `onWrite()` 인자 없이 1회, `write-day-label`을 누르면 `onWrite` 0회이고 `write-button`의 자손이 아님·「▾」「›」「→」 같은 표식 없음), 카드 누름 → `onOpen(item)`, 「n편」이 `items.length`, 모든 일기가 카드로 나옴(7일 밖 포함). 옛 문구(「언제를 쓸까」「…를 쓴다」「아직 일기가 없다」)가 없음
- [X] T011 [P] [US1] `__tests__/ui/denied-guidance.test.tsx`와 021 권한 문안 계약 테스트(`grep -rln "ifDenied\|일기는 사진 없이" __tests__`로 찾는다)를 해요체 `ifDenied`에 맞게 고친다 — 기대: 「사진을 볼 수 없어서 일기는 사진 없이 써요.」, 「지명을 옮기지 못해서 장소는 비워 둬요.」, 「일기가 완성돼도 바로 알려 드리지 못해요.」, 「자동으로 쓰는 시간이 정한 때보다 많이 늦어질 수 있어요.」

### Implementation for User Story 1

- [X] T012 [US1] `src/onboarding/requirements.ts`의 `ifDenied` 네 문장을 T011의 해요체로 바꾼다(유일한 출처 — 복제하지 않는다). T011 통과
- [X] T013 [US1] `src/ui/DayPicker.tsx`를 7칸 가로 스트립으로 재작성한다 — props: `cells: readonly StripCell[]`, `onSelect(day)`. 위 2px `COLORS.text`·아래 1px `COLORS.border` 선, 칸마다 요일(`weekdayShort`, 10px)·날짜 숫자(15px 700)·5×5 점(`hasDiary`면 `COLORS.accent`), 선택 칸 배경 `COLORS.accent` + 글자 `COLORS.accentForeground`, `selectable: false` 칸은 `disabled` + 흐림(불투명도). 컨테이너 `testID="day-strip"`. 판정하지 않는다(`now` 없음). 옛 `revertedFrom`·`todayNotYetWritable` 안내는 여기서 빠진다(캡션은 헤더로). T009 통과
- [X] T014 [US1] `src/ui/DiaryListScreen.tsx`를 1d로 재작성한다 — 루트 `View`(flex 1, `COLORS.bg`) 안에 `ScrollView`(헤더+목록) + 형제 `home-bottom-bar`. 헤더: 월(`monthText(write.day)`, 11px 대문자 간격, `COLORS.accent`)·우상단 「일기」(`COLORS.textMuted`), 큰 날짜(`dayParts(write.day).date`, 124px 800, 좁은 행간)·요일(`weekdayLong`, 16px 700)·상태 줄(`overwrites`로 H2/H3), `DayPicker`(`stripCellsFor` 결과를 prop으로 받음), 안내 캡션(`revertedText`·`movedNotice`·`deniedNotices`), 신호 줄 자리(`signal-row` — 이 단계에서는 사진·다닌 자리 「…」, 쓸 수 있는 때 「지금」; US2·US3가 채운다), 「최근」+「n편」, 카드들. 카드: 44×44 사진 더미(`COLORS.surface`·`COLORS.border` 겹, `known`이면 앞장 채움 + `COLORS.accent` 배경·`COLORS.accentForeground` 글자 배지 장수), 날짜 줄 `cardDateText`, 제목(17px 700) 또는 생략, `testID="diary-card-<day>"`. 하단 바: `WriteBar`(`writable`이 참일 때 강조색 블록 하나 — 그 안에 `Pressable testID="write-button"`(「일기 쓰기」)과 **형제** `View`(1px 구분선 + `Text testID="write-day-label"` `dayOfMonthText(write.day)`, 누름 핸들러 없음 — research R8); 배경 `COLORS.accent`, 글자 `COLORS.accentForeground`, 최소 높이 50) + 왼쪽 자리(US4의 `HomeMenu`가 들어올 `menu` slot — `menuItems` prop이 없으면 비움). props: `items`, `onOpen`, `onWrite`, `write`, `cells`, `onSelectDay`, `movedNotice`, `deniedNotices`, 그리고 US2·US3·US4가 쓸 옵셔널 `preview?`·`menuItems?`. 색은 `COLORS.*`만, 시각 숫자 문구 없음. T010·T007(G9·G10) 통과
- [X] T015 [US1] `src/ui/DiaryHomeScreen.tsx`의 `list` 갈래를 새 props에 맞춘다 — `stripCellsFor(screen.items, prompt, now())`를 계산해 넘기고, 옛 `todayNotYetWritable` prop 계산을 걷어낸다. 캐릭터 옮김 문장을 「…을(를) 쓸 수 없어 …(으)로 바꿨어요」로 바꾼다(해요체). 기존 생성·덮어쓰기(012)·018 흐름 무변경
- [X] T016 [US1] `npm run test:ui`로 US1 전체와 기존 화면 테스트(`diary-reveal`, `photo-gallery` 등)가 초록인지 확인하고, 깨진 것이 문구 변경 때문이면 새 문구로 갱신한다

**Checkpoint**: 홈 화면이 1d로 그려지고 쓸 수 있는 날의 쓰기·상세 열기가 동작한다(탭 줄 제거는 US4).

---

## Phase 4: User Story 2 — 아직 쓸 수 없는 오늘을 보고, 언제 쓸 수 있는지 안다 (P1)

**Goal**: 00:00~12:00에 오늘을 고를 수 있고, 쓰기 버튼 대신 「오늘 일기는 오후 12시부터(오전 4시부터) 쓸 수
있어요」가 보이며, 그 시각이 되면 저절로 [일기 쓰기]가 나타난다. 쓸 수 없는 날은 어떤 경로로도 쓰이지 않는다.

**Independent Test**: 주입 `now` + jest 가짜 타이머로 `DiaryHomeScreen`을 렌더해 T1~T5·B4~B6을 확인한다.

### Tests for User Story 2

- [X] T017 [P] [US2] `__tests__/ui/diary-list.test.tsx`에 B4(`writable:false`·`writableAt` 12:00 → `write-button` 없음, `write-unavailable` = 「오늘 일기는 오후 12시부터 쓸 수 있어요」), 04:00 갈래(「오늘 일기는 오전 4시부터 쓸 수 있어요」), B5(`writable:false`로 렌더하고 `UNSAFE_root`에서 `onPress`를 가진 모든 노드를 눌러도 `onWrite` 0회), G4·G5·G6(`signal-window` 「지금」/「오후 12시부터」/「오전 4시부터」)를 추가한다
- [X] T018 [P] [US2] `__tests__/ui/diary-home-writable.test.tsx`(T1~T5)와 `__tests__/ui/diary-home-write-gate.test.tsx`(B6)를 만든다 — `jest.useFakeTimers()` + 가변 `now` 주입 + 대역 `store`·`pipeline`·`resolve`: T1(09-24 11:59:00, `day-2026-09-24` 누름 → `write-unavailable`), T2(시계 12:00:01로 옮기고 `jest.advanceTimersByTime(61_000)` → 조작 없이 `write-button`, `signal-window` 「지금」), T3(오늘 선택 후 다른 날 선택 → `jest.getTimerCount()`가 줄어듦), T4(`AppState` `change`→`active` 모의 발생, 시계는 이미 12:00 이후 → 즉시 `write-button`), T5(`writable:false`인 날 선택 중 `prepare`·`captionDay` 0회, 쓸 수 있는 날로 바꾸면 기존대로 호출), B6(`diary-home-write-gate.test.tsx`에서 `jest.mock("../../src/ui/DiaryListScreen")`로 대역을 두어 받은 props를 기록하고, 대역의 `onSelectDay(오늘)`로 쓸 수 없는 날을 고른 뒤 기록된 `onWrite()`를 직접 호출 → `pipeline.run` 0회, 대역이 다시 렌더된다(화면이 `writing`·`confirm-overwrite`로 가지 않음))

### Implementation for User Story 2

- [X] T019 [US2] `src/ui/DiaryListScreen.tsx`의 `WriteBar`에 `write.writable === false` 갈래를 더한다 — `Pressable`을 그리지 않고 `Text testID="write-unavailable"` 「오늘 일기는 {hourText(write.writableAt)}부터 쓸 수 있어요」만(글꼴 확대 시 줄바꿈되도록 `numberOfLines` 없이, 감싸는 `View`에 `flex: 1`·`flexShrink: 1`). 신호 줄 셋째 칸 `signal-window`: 쓸 수 있으면 「지금」, 아니면 「{hourText(writableAt)}부터」(`COLORS.danger` 글자 — 보드의 accent-700). T017 통과
- [X] T020 [US2] `src/ui/DiaryHomeScreen.tsx`에 전환 갱신을 더한다 — `tick` 상태, `list`이고 `prompt.writable === false`일 때만 `setTimeout(writableAt − now() + 1000)` 한 번(울리면 `tick+1`), 의존성 변경·언마운트 시 `clearTimeout`. 기존 `AppState` 구독에 `active`면 `tick+1`을 더한다(생성 중 끊기·준비 해제 로직은 그대로). `writePromptFor` 호출은 `tick`을 의존으로 다시 돈다
- [X] T021 [US2] `src/ui/DiaryHomeScreen.tsx`의 쓰기 게이트 — `write()` 첫머리에서 `prompt.writable`이 거짓이면 아무것도 하지 않고 반환한다. 018 미리 준비 두 `useEffect`(사진 없는 날 `prepare`, 사진 있는 날 `captionDay`) 첫머리에 `if (!prompt.writable) return;`을 두고 `tick`을 의존에 넣는다. T018 통과

**Checkpoint**: 정오 전 오늘 선택·전환·쓰기 방어가 기기 없이 검증된다.

---

## Phase 5: User Story 3 — 쓰기 전에 휴대폰이 볼 것을 안다 (P2)

**Goal**: 고른 날의 사진 전체 장수와 다닌 자리 수가 신호 줄에 나온다(읽는 중 「…」, 없음 「없음」, 모름 「모름」).

**Independent Test**: `toDayPreview`·`previewDay`를 대역 신호로, 화면은 대역 `previewDay`로 G1~G3·G7·G8을 확인한다.

### Tests for User Story 3

- [X] T022 [P] [US3] `__tests__/app/day-preview.test.ts`를 만든다 — DP1~DP6: known 3장/visitCount 2 → `{known,3}`/`{known,2}`, none/none, unknown/unknown, 섞임, `null` → 둘 다 `unknown`, 결과 키가 `day`·`photos`·`places`뿐
- [X] T023 [P] [US3] `__tests__/app/wiring.test.ts`에 PV1~PV5를 추가한다 — 주입 `loadSignals`로 `previewDay(day)`가 `photos.count`를 옮김, `null`·던짐 → 둘 다 `unknown`(예외 없음), 파이프라인 생성과 `previewDay`가 **같은 `loadSignals` 함수**를 부름(`jest.fn` 호출 기록), `local` 해석에서도 `previewDay`가 있음
- [X] T024 [P] [US3] `__tests__/ui/diary-list.test.tsx`에 G1~G3을 추가한다 — `preview` `loading` → `signal-photos`·`signal-places` 「…」, known 3/2 → 「3」「2」, none → 「없음」, unknown → 「모름」(서로 다름)
- [X] T025 [P] [US3] `__tests__/ui/diary-home-writable.test.tsx`에 G7(A 요청 후 B 선택, A의 `previewDay` 프라미스를 B 뒤에 해결 → B 값 유지)·G8(`previewDay` 거부 → 둘 다 「모름」)을 추가한다

### Implementation for User Story 3

- [X] T026 [US3] `src/app/day-preview.ts`를 만든다 — `toDayPreview(day, signals: DaySignals | null): DayPreview`. photos `known` → `{known, count: value.photos.length}`(Clarification Q3: 캡션 선별 전 전체 장수, `vision/select`를 부르지 않는다), places `known` → `{known, count: value.trace.visitCount}`, `none`/`unknown`은 같은 이름, `null` → 둘 다 `unknown`. 0을 기본값으로 채우지 않는다. T022 통과
- [X] T027 [US3] `src/app/wiring.ts`의 `AppPipelineResult` 성공 갈래에 `previewDay: (day: DayDate) => Promise<DayPreview>`를 더한다(실패 갈래는 `previewDay?: undefined`). `const loadSignals = deps.loadSignals ?? deviceSignals`를 한 번 만들어 `selectBackend`·`createPipeline`·`previewDay`가 공유한다. 던지면 `toDayPreview(day, null)`. T023 통과
- [X] T028 [US3] `src/ui/DiaryListScreen.tsx`의 신호 줄 첫째·둘째 칸(`signal-photos`·`signal-places`)이 `preview` prop(`{kind:"loading"} | DayPreview`)을 그린다 — `loading` 「…」, `known` 숫자, `none` 「없음」, `unknown` 「모름」. T024 통과
- [X] T029 [US3] `src/ui/DiaryHomeScreen.tsx`에 옵셔널 prop `previewDay?`를 더하고, `list`에서 고른 날(`prompt.day`)이 바뀔 때마다 `{kind:"loading", day}`로 두고 부른다. 도착한 결과의 `day`가 지금 고른 날과 같을 때만 반영, 거부되면 `toDayPreview`를 import하지 않고 `{ day, photos:{kind:"unknown"}, places:{kind:"unknown"} }`. `previewDay`가 없으면(대역·빌드 오류) 두 칸 「모름」. `App.tsx` `DiarySection`이 `wiring.ok ? wiring.previewDay : undefined`를 넘긴다. T025 통과

**Checkpoint**: 신호 줄이 날마다 실제 값을 보인다.

---

## Phase 6: User Story 4 — `⋯` 메뉴로 설정·개발자 화면에 들어가고 돌아온다 (P2)

**Goal**: 전역 탭 줄을 없애고, 하단 바의 `⋯` 메뉴로 설정·(local·dev에서만) 개발자에 들어가 「← 일기」·뒤로 가기로
돌아온다. 돌아와도 고른 날이 남는다.

**Independent Test**: `HomeMenu`·`SubScreenFrame` 렌더 테스트와 `App.tsx` 소스 검사(M·N)로 확인한다.

### Tests for User Story 4

- [X] T030 [P] [US4] `__tests__/ui/home-menu.test.tsx`를 만든다 — M1~M5: `home-menu-button` 누름 → `home-menu-settings` 보임, developer 항목이 있으면 `home-menu-developer` 보임·없으면 노드 자체가 없음, 항목 누름 → 닫히고 그 `onPress` 1회, `home-menu-backdrop` 누름·`Modal`의 `onRequestClose` → 닫힘·`onPress` 0회. B7: 버튼 스타일이 정사각(너비=높이=50)이고 테두리색 `COLORS.text`
- [X] T031 [P] [US4] `__tests__/ui/home-navigation.test.tsx`를 만든다 — N2(`SubScreenFrame`의 `back-to-home` 「← 일기」 누름 → `onBack` 1회), N3(`BackHandler.addEventListener` 모의로 `hardwareBackPress` 구독·핸들러가 `true`를 돌리고 `onBack` 호출·언마운트 시 해제), 그리고 `App.tsx` 주석 제거 소스 검사: N1(`useState<"home" | "settings" | "developer">`가 있고 `"characters"`·`setTab`·`styles.tabs`가 없음), M6(`key: "developer"` 항목이 `showsDiagnostics` 조건식 안에서만 만들어짐), N4(`onGoToSettings`가 `setRoute("settings")`, 알림 `onResponse` 안에 `setRoute("home")`), N5(`AppFrame`에 `chosenDay` 상태가 있고 `DiarySection`에 넘김). N6: `DiaryHomeScreen`에 `chosenDay`·`onChooseDay` 제어 prop을 주고 언마운트·재마운트해도 고른 날(`home-day-number`)이 유지

### Implementation for User Story 4

- [X] T032 [P] [US4] `src/ui/HomeMenu.tsx`를 만든다 — props `items: readonly { key: string; label: string; onPress: () => void }[]`. 50×50 정사각 `Pressable`(`testID="home-menu-button"`, 「⋯」, 테두리 1px `COLORS.text`, 배경 `COLORS.bg`). 열리면 RN 코어 `Modal`(`transparent`, `onRequestClose` 닫힘) 안에 전면 `Pressable testID="home-menu-backdrop"`과 화면 아래 왼쪽, 하단 바 위에 붙는 목록(`COLORS.bg` 배경, `COLORS.text` 테두리) — 항목마다 `testID="home-menu-<key>"`, 누르면 닫고 `onPress`. 새 의존성 없음. T030 통과
- [X] T033 [P] [US4] `src/ui/SubScreenFrame.tsx`를 만든다 — props `onBack`, `children`. 상단 `Pressable testID="back-to-home"` 「← 일기」, 마운트 동안 `BackHandler` `hardwareBackPress`에서 `onBack()` 후 `true`. T031의 N2·N3 통과
- [X] T034 [US4] `src/ui/DiaryListScreen.tsx` 하단 바 왼쪽에 `menuItems`가 있으면 `<HomeMenu items={menuItems} />`를 그린다(쓰기 바는 오른쪽 가장자리, 둘은 같은 높이). `DiaryHomeScreen`에 `menuItems?`·`chosenDay?`·`onChooseDay?` prop을 더한다 — `chosenDay`가 주어지면 그것을 쓰고 `onChooseDay`로 바꾸며, 없으면 지금처럼 로컬 `useState`(기존 테스트·호출자 무변경)
- [X] T035 [US4] `App.tsx`를 고친다 — `tab` → `const [route, setRoute] = useState<"home" | "settings" | "developer">("home")`, 탭 줄 JSX와 `styles.tabs/tab/tabOn/tabOff` 삭제, `const [chosenDay, setChosenDay] = useState<DayDate | null>(null)`를 `AppFrame`에 두고 `DiarySection` → `DiaryHomeScreen`으로 흘림, `menuItems`를 `[{key:"settings",label:"설정",onPress:()=>setRoute("settings")}, ...(showsDiagnostics ? [{key:"developer",label:"개발자",onPress:()=>setRoute("developer")}] : [])]`로 만들어 넘김, 설정·개발자 갈래를 `<SubScreenFrame onBack={() => setRoute("home")}>`로 감쌈(개발자 갈래는 여전히 `showsDiagnostics &&`), `onGoToSettings={() => setRoute("settings")}`, 알림 웜 라우팅의 `setTab("diary")` → `setRoute("home")`. 040 `autoGeneratedToken` 재마운트·020 `pendingRoute`는 그대로. T031 통과
- [X] T036 [US4] `npm run test:ui`·`npx tsc --noEmit`으로 `App.tsx`를 렌더하거나 소스를 읽는 기존 테스트(`grep -rln "App.tsx\|setTab\|\"개발자\"" __tests__`)가 초록인지 확인하고, 탭 전제를 가진 기대를 메뉴·`route`로 갱신한다

**Checkpoint**: 탭 줄 없이 홈 ↔ 설정 ↔ 개발자 왕복이 된다. **US1과 US4는 함께 배포한다** — US4 없이 탭 줄만
지우면 설정에 갈 수 없다.

---

## Phase 7: User Story 5 — 목록이 「없음」과 「모름」을 잃지 않는다 (P3)

**Goal**: 카드가 사진 없음·모름을 구분하고, 제목 없음·읽을 수 없음·빈 목록을 정직하게 보인다.

**Independent Test**: 네 종류 일기가 섞인 대역 목록으로 `DiaryListScreen`을 렌더한다.

### Tests for User Story 5

- [X] T037 [P] [US5] `__tests__/ui/diary-list.test.tsx`에 카드 계약을 추가한다 — `known` 3 → 배지 「3」, `none` → 배지 없음 + 「사진 없음」, `unknown` → 배지 없음 + 「사진 모름」(서로 다른 문구), 제목 없음 → 날짜 줄만, `readable:false` → 「읽을 수 없어요」, 빈 목록 → 「아직 일기가 없어요」 + 「위에서 하루를 고르고 「일기 쓰기」를 누르면 휴대폰이 그 하루를 일기로 써요」, 카드에 `Image` 노드 없음(실제 썸네일 금지)

### Implementation for User Story 5

- [X] T038 [US5] `src/ui/DiaryListScreen.tsx`의 카드·빈 목록을 T037에 맞춘다 — `none`/`unknown`은 빈 테두리 사각형(`COLORS.border` 1px)에 배지 없이 날짜 줄 끝 「사진 없음」/「사진 모름」, 읽을 수 없으면 제목 자리 「읽을 수 없어요」, 빈 목록 문구 해요체. T037 통과

**Checkpoint**: 모든 이야기가 기기 없이 검증된다.

---

## Phase 8: Polish & Cross-Cutting

- [X] T039 [P] 위반 주입을 하나씩 넣었다 되돌리며 잡히는지 확인하고 결과를 기록한다 — V-P1(오늘을 `writable:true`로), V-P2(`writableAt`이 새벽에도 정오), V-P3(`none` → `{known,0}`), V-P4(`state.ts`가 `signals/types` import), V-H1(`WriteBar` 조건 제거), V-H2(`DiaryListScreen`이 `signals/types` import), V-H3(`home-text.ts`에 「오후 12시부터」 리터럴), V-H4(developer 무조건 포함), V-H5(`write-day-label`을 `write-button` 안으로 옮김). 결과는 `specs/048-diary-home-modernist/quickstart.md` 끝 「위반 주입 기록」 절에 적는다
- [X] T040 [P] `.maestro/diary-home-1d.yml`을 만든다 — 단계: (1) `launchApp`(clearState 없음) → `assertVisible: {id: home-month}`·`{id: day-strip}`·`{id: signal-row}`·`{id: home-bottom-bar}`·`{id: home-menu-button}`, (2) `tapOn: {id: home-menu-button}` → `assertVisible: {id: home-menu-settings}` → `tapOn: {id: home-menu-settings}` → `assertVisible: {id: back-to-home}` → `tapOn: {id: back-to-home}` → `assertVisible: {id: home-day-number}`, (3) 다시 메뉴 → 설정 → `back`(안드로이드 뒤로) → `assertVisible: {id: home-day-number}`, (4) 메뉴 열고 `tapOn: {id: home-menu-backdrop}` → `assertNotVisible: {id: home-menu-settings}`, (5) `runFlow when visible {id: write-day-label}`: `tapOn: {id: write-day-label}` 후 `assertVisible: {id: home-day-number}`·`assertVisible: {id: write-button}`(쓰기가 시작되지 않고 홈에 그대로). `scripts/run-device-tests.mjs`의 `FLOWS`에 주석과 함께 등록한다
- [X] T041 기존 Maestro 흐름을 새 이동 구조로 고친다 — 「설정」 탭(`tapOn: "설정"`)은 `tapOn: {id: "home-menu-button"}` + `tapOn: {id: "home-menu-settings"}`로, 「개발자」 탭은 `home-menu-developer`로, 「일기」 탭 복귀(`tapOn: "일기"`)는 `tapOn: {id: "back-to-home"}`으로: `.maestro/diary-body-screen.yml`, `diary-character-select.yml`, `diary-user-path.yml`, `download-conflict.yml`, `model-acquisition.yml`, `parallel-model-download.yml`, `photo-selection-over-limit.yml`, `photo-vision.yml`, `prompt-preview.yml`, `scheduled-diary-notification.yml`, `skeleton.yml`, `welcome-naming.yml`(`grep -rn 'tapOn: "설정"\|tapOn: "개발자"\|tapOn: "일기"' .maestro`로 누락 확인)
- [X] T042 문구가 바뀐 Maestro 흐름을 고친다 — `.maestro/past-day-diary.yml`(「언제를 쓸까」「…를 쓴다」「선택」 → `day-strip`·`write-day-label`·`day-<date>`의 `selected`), `.maestro/today-diary.yml`(정오 안내 → `write-unavailable`), `.maestro/generate-diary.yml`·`diary-user-path.yml`의 「아직 일기가 없다」·「일기 쓰기」 버튼 → `write-button`, 「사진 없음」으로 카드 열기는 그대로 동작하는지 확인(`grep -rn "아직 일기가 없다\|를 쓴다\|언제를 쓸까\|정오" .maestro`)
- [X] T043 [P] `docs/roadmap/README.md` 31번에 048 진행 기록을 적고, 35번 설명의 「전역 하단 탭 바」 전제가 048로 사라졌음을 고친다(번호·차수·선후를 새로 적지 않는다 — 사용자 규칙)
- [X] T044 `grep -n "day-not-closed\|isDayWritable" __tests__/diary/pipeline*.test.ts`로 012의 파이프라인 게이트 테스트(쓸 수 없는 날을 `pipeline.run`에 직접 넣으면 저장 없이 거부)가 있는지 확인한다 — 없으면 `__tests__/diary/pipeline.test.ts`에 추가한다(SC-003의 둘째 겹)
- [X] T045 `npm test`·`npm run lint`(eslint + tsc + 헌법 검사 + prettier) 전체 초록을 확인한다. 실패하면 고치고 다시 돈다
- [ ] T046 ⚠️ **미수행(2026-09-24 00:59, 기기 SM-S901N이 PIN으로 잠겨 있어 사람이 풀어야 한다 — 건너뛴 것은 통과가 아니다)** 실기기 dev 검증 — quickstart.md §2 준비(AGENTS.md 「도구 사용법」 4가지, `pm clear` 후 모델 재배치, `seed:day`) 후 D1~D13을 수행하고, `node scripts/run-device-tests.mjs`로 Maestro를 돌린다. 오전 세션이 아니라 D6·D7을 못 하면 미확인 잔여로 남긴다(건너뛴 것은 통과가 아니다)
- [X] T047 `AGENTS.md`의 기능별 결론 끝에 「048 — 일기 홈 1d와 화면 이동 구조」 절을 더한다 — 탭 줄 제거·`⋯` 메뉴, 쓸 수 있음/고를 수 있음 분리와 00:00~04:00 갈래, `DayPreview` 경계, 전환 타이머, 실기기에서 관측한 것과 미확인 잔여

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup(T001) → Foundational(T002~T008) → 이야기들 → Polish.
- Foundational이 끝나기 전에는 어느 이야기도 시작하지 않는다(`WritePrompt.writable`·`stripCellsFor`·`home-text`가 모든 화면의 입력).

### User Story Dependencies

- **US1 (P1)**: Foundational 뒤. `DiaryListScreen` 재작성이 US2·US3·US4·US5의 공통 바탕이다.
- **US2 (P1)**: US1 뒤(`WriteBar`·`signal-window`가 US1의 하단 바·신호 줄 자리에 들어간다).
- **US3 (P2)**: US1 뒤. US2와 독립(다른 칸·다른 상태) — 단 둘 다 `DiaryHomeScreen.tsx`·`DiaryListScreen.tsx`를 고치므로 같은 파일 작업은 순서대로.
- **US4 (P2)**: US1 뒤(`DiaryListScreen` 하단 바에 메뉴 자리). **US1과 함께 배포** — 탭 줄 제거가 여기 있다.
- **US5 (P3)**: US1 뒤. 카드만 다룬다.

### Within Each User Story

- 테스트 작성 → 실패 확인 → 구현 → 통과. 같은 파일(`DiaryListScreen.tsx`, `DiaryHomeScreen.tsx`, `diary-list.test.tsx`)을 고치는 작업은 [P]가 아니다.

### Parallel Opportunities

- Foundational: T002·T004·T007(서로 다른 테스트 파일) 병렬, 이어서 T003·T005·T008.
- US1: T009·T010·T011 병렬.
- US3: T022·T023·T024·T025 병렬, T026·T027 병렬 가능(다른 파일).
- US4: T030·T031 병렬, T032·T033 병렬.
- Polish: T039·T040·T043 병렬.

---

## Parallel Example: User Story 4

```text
T030 home-menu.test.tsx 작성      ║  T031 home-navigation.test.tsx 작성
T032 HomeMenu.tsx 구현           ║  T033 SubScreenFrame.tsx 구현
→ T034 DiaryListScreen/DiaryHomeScreen 배선 → T035 App.tsx → T036 회귀
```

---

## Implementation Strategy

### MVP

Foundational → US1 → US4(함께 배포해야 설정에 갈 수 있다) → 멈추고 기기 없는 테스트 + 실기기 D1·D2·D8·D12 확인.

### Incremental Delivery

1. MVP(US1+US4): 1d 홈 + 메뉴 이동.
2. US2: 아직 쓸 수 없는 오늘과 전환 — 012 미확인 갈래를 닫는다.
3. US3: 신호 미리보기.
4. US5: 카드 구분 회귀 방지.
5. Polish: 위반 주입, Maestro, 문서, 실기기 전체.

---

## Notes

- 같은 파일을 여러 이야기가 고친다 — 이야기 순서대로 진행하면 충돌이 없다.
- 실기기는 dev(debug)만. release 빌드를 만들지 않는다(AGENTS.md 「테스트」).
- 커밋 메시지는 한국어.
