---

description: "050 대화상자 기반 — 태스크"
---

# Tasks: 대화상자 기반 — 덮어쓰기 확인과 날짜로 이동

**Input**: `specs/050-dialog-foundation/` — plan.md, spec.md, research.md, data-model.md, contracts/dialogs.md, quickstart.md

**Tests**: 헌법 「개발 방식」 — 계약을 먼저 정하고 테스트를 먼저 쓴다(MUST). 각 스토리의 테스트 태스크는 구현 전에 **빨간불을 확인**한다.
계약 ID(DLG·OW·CAL·TXT·MIG·DEP)는 [contracts/dialogs.md](contracts/dialogs.md).

**Organization**: 스토리별 단계. US1(`2d`)·US2(`2j` 이동)·US3(`2j` 닫기) + 이관(Q4) + 마무리.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (의존성·토큰·목)

- [ ] T001 `npx expo install @rn-primitives/alert-dialog @rn-primitives/dialog @rn-primitives/dropdown-menu @rn-primitives/portal @rn-primitives/slot class-variance-authority clsx tailwind-merge react-native-ui-datepicker dayjs`로 설치하고 `package.json` 판을 research R1 표와 대조한다(`tailwindcss-animate`·`react-native-screens`·`lucide-react-native`는 설치하지 않는다 — R2·R6). 설치 뒤 `node_modules`의 새 패키지에 `android/`·`*.podspec`·`expo-module.config.json`이 없는지 다시 확인한다
- [ ] T002 [P] `src/ui/theme/tokens.ts`에 `RADIUS.control = 6`, `RNR_COLOR_ALIASES`(값은 `COLORS.*` 참조만: `background→bg`, `foreground→text`, `muted-foreground→textMuted`, `primary→accent`, `primary-foreground→accentForeground`, `input→text`, `popover→bg`, `popover-foreground→text`), `OVERLAY`(scrim `rgba(0,0,0,0.5)`, shadow `#000000`·opacity 0.18·radius 30·offsetY 10), `DIALOG`(padding 24, gap 16, inset 20, borderWidth 2, buttonHeight 48, buttonGap 8), `CALENDAR`(navSize 40, cellHeight 40, dot 4, underlineOffset 3, disabledOpacity 0.3)을 더한다(data-model §7). 주석에 「사람이 정한 값(보드 §3.1)」
- [ ] T003 [P] `tailwind.config.js`의 `colors`를 `{ ...COLORS, ...RNR_COLOR_ALIASES }`로, `borderRadius`에 `control`을 더한다. `global.css`는 건드리지 않는다(DEP3)
- [ ] T004 [P] `jest/setup-ui.ts`의 reanimated 목에 `FadeIn`·`FadeOut`·`ReduceMotion` 스텁을 더한다 — `.duration()`·`.delay()`·`.reduceMotion()`이 자기 자신을 돌려주는 체이닝 객체, `ReduceMotion.System`(research R8). 주석: 움직임은 jest로 검증하지 않는다(C9)
- [ ] T005 [P] `__tests__/ui/render-with-portal.tsx`(테스트 도우미, `.test` 아님)를 만든다 — `render(<>{ui}<PortalHost /></>)`를 await해 돌려준다. `__tests__/jest-projects.test.ts`가 도우미 파일을 스위트로 세지 않는지 확인한다

---

## Phase 2: Foundational (대화상자 기반·칸 판정·문구)

**⚠️ 이 단계가 끝나야 스토리를 시작한다.**

### 테스트 먼저

- [ ] T006 [P] `__tests__/ui/dialog-foundation-deps.test.ts`에 DEP1~DEP5를 쓴다 — `src/`·`App.tsx` 소스를 읽어(주석 걷어냄: `.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")`) `react-native-screens`·`lucide-react-native`·`react-native-svg` import 0건(DEP1), `src/ui/rnr/button`·`text` import 파일 = `src/ui/rnr/*` + `src/ui/components/Dialog.tsx` + `src/ui/HomeMenu.tsx`(DEP2), `global.css` = `@tailwind` 세 줄(DEP3), `RNR_COLOR_ALIASES` 값 ⊂ `Object.values(COLORS)`(DEP4), `App.tsx`의 `<PortalHost` 1회(DEP5). 빨간불 확인
- [ ] T007 [P] `__tests__/app/state.test.ts`에 `cellFor` 테스트를 더한다 — 미래 `selectable:false`, 오늘 `isToday`, 읽을 수 없는 일기도 `hasDiary:true`, CAL6(같은 주의 `weekCellsFor` 7칸 = 같은 날 `cellFor`). 049 기존 `weekCellsFor` 테스트는 그대로 통과해야 한다
- [ ] T008 [P] `__tests__/ui/home-text.test.ts`에 TXT1·TXT2를 더한다 — `OVERWRITE_CONFIRM`(「일기를 다시 쓸까요?」·「다 쓰면 지금 일기가 새 글로 바뀌어요.」·「지금까지의 하루로 써요.」·「다시 쓰기」·「취소」), `DATE_JUMP`(「날짜로 이동」·「취소」), `CALENDAR_WEEKDAYS`(일~토), `calendarMonthText({year:2026, month:9})`=「9월」, `calendarYearText(2026)`=「2026년」
- [ ] T009 [P] `__tests__/ui/dialog.test.tsx`에 DLG1~DLG7을 쓴다 — `renderWithPortal` 사용, 뒤로 가기는 `jest.spyOn(BackHandler, "addEventListener")`로 등록 핸들러를 모아 직접 호출(diary-home.test 관용구, `mockRestore` 하지 않음), 모양은 인라인 `style`로 검사(`RADIUS.control`, `DIALOG.*`, `COLORS.accent`/`accentForeground`/`text`), DLG7은 `Dialog.tsx` 소스에서 hex·`rgba(` 0건. 빨간불 확인

### 구현

- [ ] T010 `src/app/state.ts`에서 `cellFor(day, items, selectedDay, now): StripCell`을 떼고 `weekCellsFor`가 `weekOf(prompt.day).map(d => cellFor(d, items, prompt.day, now))`를 부르게 한다(data-model §1). 주석: 「달력(050)과 스트립이 같은 판정 하나를 쓴다 — 복제하지 않는다」
- [ ] T011 [P] `src/ui/home-text.ts`에 `OVERWRITE_CONFIRM`·`DATE_JUMP`·`CALENDAR_WEEKDAYS`·`calendarMonthText`·`calendarYearText`를 더한다(data-model §6). `todayNote` 옆 주석: 「Q5 — 보드 문구표에 없는 사람이 정한 문장(보드 `2g` 메모에서)」
- [ ] T012 [P] `src/ui/rnr/`에 RNR 레지스트리 복사본을 만든다 — `utils.ts`(`cn` = `twMerge(clsx(...))`), `text.tsx`, `button.tsx`, `native-only-animated-view.tsx`, `alert-dialog.tsx`, `dialog.tsx`, `dropdown-menu.tsx`. 출처는 GitHub `founded-labs/react-native-reusables` `packages/registry/src/nativewind/components/ui/*`(main). **고칠 것**: `@/registry/...` → 상대 경로, `react-native-screens` `FullWindowOverlay` 제거(Fragment로), `lucide-react-native`·`Icon` 제거(Dialog 닫기 X·드롭다운 하위 메뉴·체크 표시 제거), RNR식 `accent`(눌림 배경) 클래스 → `bg-surface`/`active:bg-surface`. 각 파일 머리 주석에 원본 경로·커밋 날짜(2026-09-28)·걷어낸 것을 적는다(research R2)
- [ ] T013 `src/ui/components/Dialog.tsx`에 `ConfirmDialog`(RNR AlertDialog 기반: `open`, `onCancel?`, `title`, `description?`, `children?`, `actions`)와 `DismissibleDialog`(RNR Dialog 기반: `open`, `onClose`, `title`, `children`), 버튼 `DialogActionButton`·`DialogCancelButton`을 만든다(data-model §4). 면: 반경 0, 테두리 `DIALOG.borderWidth` `COLORS.text`, 그림자 `OVERLAY`, 안쪽 여백 24, 간격 16, 좌우 20, 덮개 `OVERLAY.scrim`. 버튼: 높이 48, 반경 `RADIUS.control`, 16/600, 동작 = accent 배경 + `accentForeground` 글자, 취소 = 1px text 테두리, `Footer`는 세로 쌓기(동작 위, 간격 8). `onCancel`/`onClose`는 ref로 최신 값을 읽는다(research R3 — 프리미티브 BackHandler가 마운트 시점에 붙잡음). `className`과 인라인 `style`을 함께 준다(jest에 NativeWind 변환 없음). T009 초록불
- [ ] T014 `App.tsx`의 `SafeAreaProvider` 안 마지막 자식으로 `<PortalHost />`(`@rn-primitives/portal`)를 둔다(research R4). T006 초록불

**Checkpoint**: `npm run test:logic`·`npm run test:ui` 초록, `npx tsc --noEmit` 0.

---

## Phase 3: User Story 1 — 이미 쓴 날을 다시 쓰기 전에 홈 위에서 확인한다 (P1) 🎯 MVP

**Goal**: 전체 화면 덮어쓰기 확인을 홈 위의 `2d` 대화상자로. 오늘이면 안내 한 줄.

**Independent Test**: 일기가 있는 날에서 「일기 쓰기」 → 홈 위 대화상자, 덮개 무반응, 뒤로 가기·취소 = 홈 그대로, 다시 쓰기 = 생성 시작(quickstart D1~D6).

### 테스트 먼저

- [ ] T015 [P] [US1] `__tests__/app/state.test.ts`에 `startWriting(prompt, items)`가 `overwrites`일 때 `{ kind: "confirm-overwrite", day, items }`를 돌려주고, `cancelOverwrite(items)`는 `toList(items)`, `confirmOverwrite()`는 인자 없이 `writing`인 것을 더한다(data-model §3). 012 기존 테스트의 `startWriting` 호출을 새 인자로 고친다
- [ ] T016 [P] [US1] `__tests__/ui/overwrite-confirm.test.tsx`를 OW1~OW7·OW9·OW10으로 다시 쓴다 — `DiaryHomeScreen`을 `renderWithPortal`로 그려 OW1(대화상자 + `home-day-number` 공존), OW2(취소 → 생성 0회, 고른 날 그대로), OW3(뒤로 가기), OW4(덮개 무반응 — 덮개 노드 누름 후 `overwrite-dialog` 남음), OW5(다시 쓰기 → 생성 1회), OW6(오늘만 `overwrite-today-note`), OW7(`OverwriteConfirmDialog.tsx` 소스에 `entry`·`DiaryEntry`·`%` 없음, 주석 걷어냄), OW9(`src/ui/OverwriteConfirmScreen.tsx` 없음), OW10(`AppState` 구독 핸들러를 스파이로 모아 `background`→`active`를 쏜 뒤 `overwrite-dialog`·고른 날 유지). 빨간불 확인
- [ ] T017 [P] [US1] OW8 — `__tests__/diary/pipeline-overwrite.test.ts`(새)에 「기존 일기가 있는 날을 다시 쓰다가 판정 거부(`echo` 등)·중단(`interrupted`)이면 `store.save` 0회이고 기존 일기가 그대로 읽힌다」를 더한다. 기존 `pipeline.test.ts:370`(「생성이 실패하면 저장을 부르지 않는다」)은 백엔드 실패만 덮는다(analyze 1회차 확인). 제품 코드 변경 없음 — 기존 동작 잠금

### 구현

- [ ] T018 [US1] `src/app/state.ts`: `AppScreen`의 `confirm-overwrite`에 `items: DiaryListItem[]`, `startWriting(prompt, items)`. 주석에 「012 X1이 막은 것은 본문·미리보기 — `DiaryListItem`은 목록 요약이라 그 방어를 깨지 않는다」(data-model §3)
- [ ] T019 [US1] `src/ui/OverwriteConfirmDialog.tsx`를 만든다 — props `day`, `isToday`, `onCancel`, `onConfirm`. `ConfirmDialog` + `OVERWRITE_CONFIRM` 문구, testID `overwrite-dialog`·`overwrite-confirm`·`overwrite-cancel`·`overwrite-today-note`. 설명: 제목 20/700 줄높이 1.3(`lineHeight: 26`), 설명 16 줄높이 1.5(`lineHeight: 24`) `textMuted`. `entry`·진행률·모델 정보 없음(FR-011)
- [ ] T020 [US1] `src/ui/DiaryHomeScreen.tsx`: `startWriting(prompt, screen.items)`로 부르고, `confirm-overwrite`일 때 `DiaryListScreen`을 `screen.items`로 그린 위에 `OverwriteConfirmDialog`를 그린다(`isToday = cellFor(screen.day, screen.items, screen.day, now()).isToday`). 취소 → `setScreen(cancelOverwrite(screen.items))`(목록 재읽기 없음), 확인 → 기존 `confirmOverwrite()` + `generate(pendingParams)`. 쓰는 중·그만두기·실패 화면은 바꾸지 않는다(Q1)
- [ ] T021 [US1] `src/ui/OverwriteConfirmScreen.tsx`를 지우고 그것을 가리키던 `__tests__/ui/enduser-screen-migration.test.tsx`의 ES11·목록 항목을 `OverwriteConfirmDialog.tsx`로 옮긴다(같은 방어: 공용 부품 사용, `entry` 없음). T016·T015 초록불
- [ ] T022 [P] [US1] Maestro 덮어쓰기 흐름 다섯을 고친다 — `.maestro/diary-user-path.yml`·`generate-diary.yml`·`photo-selection-over-limit.yml`·`writing-flow-simplified.yml`의 `visible: ".*덮어쓸지 확인.*"` → `visible: { id: "overwrite-dialog" }`, `tapOn: "확인"` → `tapOn: { id: "overwrite-confirm" }`, 「취소」 → `id: "overwrite-cancel"`. `today-diary.yml` M3의 `assertVisible: "확인"` → `id: "overwrite-dialog"`·「다시 쓰기」. 주석의 「확인 화면」·「OverwriteConfirmScreen」 서술을 050으로 갱신

**Checkpoint**: US1만으로 덮어쓰기가 대화상자로 동작(MVP).

---

## Phase 4: User Story 2 — 달력으로 멀리 떨어진 날로 바로 뛴다 (P1)

**Goal**: 헤더 날짜 탭 → `2j` 달력 → 날 고르면 즉시 닫히고 스트립·헤더가 그 날.

**Independent Test**: quickstart D7~D9·D11.

### 테스트 먼저

- [ ] T023 [P] [US2] `__tests__/app/calendar.test.ts`에 CAL12를 쓴다 — `monthOf`, `shiftMonth`(12월+1 → 다음 해 1월, 1월−1 → 전 해 12월), `isLatestMonth`·`isFutureMonth`(가짜 시계 `2026-09-30T23:59` / `2026-10-01T00:00`), `yearPageOf`(오늘이 든 해로 끝나는 12년), `isLatestYearPage`, `dayDateFromPicker("2026-09-28 00:00")` = `"2026-09-28"`, `dayDateFromPicker(new Date(2026, 8, 28))` = `"2026-09-28"`, `latestPickableDay`(자정 직전·직후). 빨간불 확인
- [ ] T024 [P] [US2] `__tests__/ui/date-jump-dialog.test.tsx`에 CAL1~CAL7·CAL10·CAL11을 쓴다 — `DateJumpDialog`를 `renderWithPortal`로 그려(실제 datepicker) CAL2(`calendar-month` 「9월」, `calendar-year` 「2026년」, 요일 머리 순서), CAL3(`calendar-next` `disabled`·누름 무반응 / 8월에서는 눌림), CAL4(미래 `calendar-day-*` 누름 → `onPick` 0회, 불투명도 0.3), CAL5(소스에 `dayOf(`·`isDayWritable(`·`.some(` 0건, 주석 걷어냄), CAL7(과거 칸 → `onPick(day)` 1회 + `onClose`), CAL10(월·연 목록과 미래 비활성), CAL11(선택 accent 배경, 점 4×4, 오늘 밑줄 색). `DiaryHomeScreen` 수준 CAL1·CAL7 홈 반영(`home-date-button` → 대화상자 → 과거 날 → `day-YYYY-MM-DD` 선택·`home-day-number`)은 `__tests__/ui/diary-home.test.tsx`에 더한다. 빨간불 확인

### 구현

- [ ] T025 [US2] `src/app/calendar.ts`를 만든다 — data-model §2의 함수 전부, 「오늘」은 `dayOf(now)`에서만. `getHours()` 사용 없음(049 DB11). T023 초록불
- [ ] T026 [US2] `src/ui/DateJumpDialog.tsx`를 만든다 — props `open`, `items`, `selectedDay`, `now`, `onPick(day)`, `onClose`. `DismissibleDialog` 안에: 직접 그린 머리(‹ `calendar-prev` / `calendar-month` / `calendar-year` / › `calendar-next`, 버튼 40×40 1px `border` 테두리, 비활성 불투명도 0.3, 월·연 16/700), `view === "day"`면 datepicker(`mode="single"`, `hideHeader`, `firstDayOfWeek={0}`, `locale="ko"`, `showOutsideDays={false}`, `date={selectedDay}`, `month`/`year` + `key`, `maxDate={latestPickableDay(now)}`, `disabledDates={(d) => !cellFor(dayDateFromPicker(dayjs(d).toDate()), …).selectable}`, `components.Day`가 `cellFor` 결과로 칸을 그림 — 높이 40, 숫자 14/700, 선택 accent 배경 + `accentForeground`, 점 4×4, 오늘 밑줄 오프셋 3, 미래 불투명도 0.3, testID `calendar-day-YYYY-MM-DD`, `components.Weekday`가 `CALENDAR_WEEKDAYS`), `onChange={({date}) => { onPick(dayDateFromPicker(date)); }}`, `view === "month"`면 12칸 월 목록(`calendar-month-N`, `isFutureMonth`면 disabled), `view === "year"`면 `yearPageOf` 12칸(`calendar-year-YYYY`, 미래 해는 없음)과 연 쪽 ‹ ›. 아래 「취소」 전폭 48 1px text 테두리 반경 6(`calendar-cancel`). `shown`·`view`·`yearPage`는 로컬 상태로, 열릴 때 `monthOf(selectedDay)`로 시작(FR-020). 문구는 `home-text.ts`에서만. T024 초록불
- [ ] T027 [US2] 먼저 `__tests__/ui/diary-list.test.tsx`의 049 H7(「헤더의 날짜 묶음에는 누름 처리가 없다」)을 050 CAL1로 바꾼다 — 큰 숫자·요일 영역만 `home-date-button`(누르면 `onPressDate` 1회), 월 라벨(`home-month`)·상태 줄(`home-day-state`)에는 누름 처리가 없다. 빨간불 확인 뒤 `src/ui/DiaryListScreen.tsx`: `onPressDate?: () => void` prop을 받고 헤더의 큰 숫자·요일 영역만 `Pressable`(testID `home-date-button`, `accessibilityRole="button"`, `accessibilityLabel` = 「날짜로 이동」)로 감싼다. 월 라벨·상태 줄은 감싸지 않는다(FR-012). 049 크로스페이드(`FadeLayer`) 구조를 바꾸지 않는다
- [ ] T028 [US2] `src/ui/DiaryHomeScreen.tsx`: `calendarOpen` 로컬 상태, `list` 화면에서만 `onPressDate`로 연다. `DateJumpDialog`의 `onPick(day)` → `setCalendarOpen(false)` + 기존 `onSelectDay(day)`(049 `setChosenDay`) — 새 주 계산 없음(FR-018). `items`는 `screen.items`, `now()`는 기존 시계 함수
- [ ] T029 [P] [US2] `.maestro/dialog-foundation.yml`(새)을 만든다 — ① 일기 있는 날에서 `write-button` → `overwrite-dialog` → 뒤로 가기(`back`) → `day-strip` 보임 → 다시 `write-button` → `overwrite-cancel` ② `home-date-button` → `calendar-dialog` → `calendar-prev` 3회 → 그 달의 1일 칸(`calendar-day-.*-01`, 정규식) 탭 → `calendar-dialog` 사라짐(`extendedWaitUntil notVisible`) → 스트립에 그 날 선택(`day-...` 확인은 `home-day-number` 「1」) ③ `home-date-button` → `calendar-cancel` → 고른 날 그대로. `scripts/run-device-tests.mjs` `FLOWS`에 등록(주석: 050 — 대화상자 기반, 덮어쓰기는 일기가 있는 날이 필요하다·없으면 ① 블록이 `runFlow when`으로 건너뜀 — 건너뛴 것은 통과가 아니다)

**Checkpoint**: US1 + US2 — 두 대화상자가 동작.

---

## Phase 5: User Story 3 — 달력을 열었다가 아무것도 바꾸지 않고 닫는다 (P2)

**Goal**: 취소·덮개·뒤로 가기 셋 다 아무것도 안 바꾸고, 다시 열면 선택한 날의 달.

**Independent Test**: quickstart D10.

- [ ] T030 [P] [US3] `__tests__/ui/date-jump-dialog.test.tsx`에 CAL8(취소·덮개·뒤로 가기 각각 → `onClose` 1회, `onPick` 0회)과 CAL9(5월로 넘긴 뒤 닫고 다시 열면 `calendar-month` = 선택한 날의 달)를 더한다. 빨간불(또는 T026이 이미 만족하면 위반 주입 「보이는 달을 부모 상태로 올리기」로 빨간불) 확인
- [ ] T031 [US3] `src/ui/DateJumpDialog.tsx`: 닫을 때 `shown`·`view`·`yearPage`를 버린다(열릴 때마다 초기화 — `open`이 거짓→참으로 바뀔 때 `key`로 재마운트하거나 초기값 재설정). 덮개·뒤로 가기는 `DismissibleDialog`가 처리. T030 초록불

**Checkpoint**: 세 스토리 완결.

---

## Phase 6: 기존 겹침 화면 이관 (Clarifications Q4 — FR-029~FR-031)

- [ ] T032 [P] `__tests__/ui/download-consent-dialog.test.tsx`를 MIG1로 고친다 — `renderWithPortal`, 문구·testID 그대로, 덮개 누름·뒤로 가기(스파이 핸들러 호출)로 닫히지 않음(핸들러는 `true`), 「받을게요」 → `onConfirm`. `Modal`·`requestClose`에 묶인 단언을 뺀다. 빨간불 확인
- [ ] T033 [P] `__tests__/ui/home-menu.test.tsx`를 MIG2로 고친다 — `home-menu-button` 누름 → `home-menu-list`, `home-menu-<key>` → `onPress` + 목록 사라짐, 바깥(덮개) 누름·뒤로 가기 → 닫힘, 개발자 항목은 `showsDiagnostics`일 때만. `home-menu-backdrop`·`requestClose` 단언은 새 부품의 덮개로 바꾼다. 빨간불 확인
- [ ] T034 [P] `__tests__/ui/dialog-foundation-deps.test.ts`에 MIG3를 더한다 — `HomeMenu.tsx`·`DownloadConsentDialog.tsx`·`OverwriteConfirmDialog.tsx`·`DateJumpDialog.tsx`가 `react-native`에서 `Modal`을 import하지 않는다(`DiaryDetailScreen`의 갤러리 `Modal`은 범위 밖)
- [ ] T035 `src/ui/DownloadConsentDialog.tsx`를 `ConfirmDialog`(`onCancel` 없음, `open={visible}`)로 다시 쓴다 — 문구 상수·testID 그대로, 「받을게요」 하나. 머리 주석의 「RN 코어 `Modal`만 쓴다 — 새 Dialog 라이브러리를 추가하지 않는다」를 050 결정으로 고친다. `scripts/constitution-rules.ts`·`__tests__/scripts/check-constitution.test.ts`의 동의 대화상자 검사(C9)가 계속 통과하는지 본다. T032 초록불
- [ ] T036 `src/ui/HomeMenu.tsx`를 RNR `DropdownMenu`(`src/ui/rnr/dropdown-menu.tsx`)로 다시 쓴다 — `HomeMenuItem`·`BAR_HEIGHT` export와 testID(`home-menu-button`·`home-menu-list`·`home-menu-<key>`) 그대로, `side="top"`·`align="end"`·`sideOffset`으로 하단 바 윗선 위에 뜨게(048 실기기 수정 유지), 항목 누름 → 닫힘 + 이동. 048 머리 주석(「RN 코어 Modal만 쓴다(FR-008)」)을 050으로 고친다. T033·T034 초록불

---

## Phase 7: Polish & 검증

- [ ] T037 위반 주입 — contracts/dialogs.md의 「위반 주입」 열을 하나씩 넣어 해당 테스트(또는 `tsc`)가 빨간불이 되는 것을 확인하고 되돌린다. 최소: DLG1·DLG3·DLG7·OW6·OW9·CAL3·CAL4·CAL5·CAL9·MIG1·MIG3·DEP1·DEP2·DEP4. 결과(잡혔다/새었다)를 `quickstart.md` 끝 「위반 주입 결과」 절에 적는다. 새면 테스트를 고친다
- [ ] T038 `npm test` + `npm run lint`(eslint·tsc·헌법 검사·prettier) 실제 실행, 전부 통과 확인
- [ ] T039 실기기 dev 1회(SM-S901N, **`pm clear` 없이** — quickstart §2): D1~D12를 눈으로 본다. 대화상자 페이드·메뉴 위치가 의심스러우면 `adb shell screenrecord`로 본다. 결과를 `quickstart.md` 「실기기 결과」 절에 적는다
- [ ] T040 실기기 Maestro — `maestro test`로 `dialog-foundation.yml` + 고친 다섯(`diary-user-path`·`generate-diary`·`photo-selection-over-limit`·`writing-flow-simplified`·`today-diary`) + `past-day-diary` + 메뉴를 지나는 흐름(`skeleton`·`prompt-preview`·`scheduled-diary-notification`·`diary-home-1d`)을 직접 돌린다(`run-device-tests.mjs`는 `pm clear`를 하므로 쓰지 않는다). 동의 흐름은 돌리지 않는다(FR-031). 결과를 quickstart에 적는다
- [ ] T041 `spec.md`에 「미확인 잔여」 절을 더한다 — 최소: 다운로드 동의 이관의 실기기·Maestro(D13, 모델 삭제가 필요해 계약 테스트로 갈음), 그 밖에 T039·T040에서 못 본 것. release는 하지 않았다(C2, 새 네이티브 모듈 없음)
- [ ] T042 `AGENTS.md`에 「### 050 — 대화상자 기반」 절을 더한다 — 실측으로 얻은 것만(예: RNR 레지스트리가 `react-native-screens`·`lucide`를 끌고 옴, 프리미티브 BackHandler가 마운트 시점 콜백을 붙잡음, datepicker `›`가 `maxDate`를 모름, 실기기에서 새로 드러난 것). 049 절의 「헤더 탭 동작 없음」이 050으로 바뀌었음을 적는다

---

## Dependencies & Execution Order

- **Phase 1** → **Phase 2**(T006~T014) → 스토리.
- **US1**(T015~T022)과 **US2**(T023~T029)는 Phase 2 뒤 서로 독립(둘 다 `DiaryHomeScreen.tsx`를 고치므로 T020과 T028은 순서대로).
- **US3**(T030~T031)은 US2의 `DateJumpDialog` 위에 선다.
- **Phase 6**(이관)은 Phase 2의 `Dialog.tsx`·`rnr/` 뒤 어느 때나. 스토리와 독립.
- **Phase 7**은 전부 뒤. T039·T040은 T038 통과 뒤.

### Parallel Opportunities

- Phase 1: T002·T003·T004·T005 동시.
- Phase 2 테스트: T006·T007·T008·T009 동시. 구현: T011·T012 동시, T010은 `state.ts` 단독.
- US1 테스트 T015·T016·T017 동시. US2 테스트 T023·T024 동시. Phase 6 테스트 T032·T033·T034 동시.

## Implementation Strategy

1. Phase 1·2 → 대화상자 기반이 초록.
2. **MVP = US1** — 덮어쓰기 대화상자. 여기서 멈춰도 제품이 온전하다(전체 화면 확인을 대체).
3. US2 → US3 → 이관 → 검증. 커밋은 kickoff 규칙대로 구현 구간 끝에 한 번.
