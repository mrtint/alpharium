# Tasks: 매일 쓰는 시각과 장소 이름 — 설정의 두 행과 두 대화상자

**Input**: Design documents from `/specs/056-settings-time-place/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/settings-time-place.md, quickstart.md

**Tests**: 헌법 「개발 방식」 — 계약을 먼저 정하고 테스트를 먼저 쓴다(MUST). 각 이야기의 테스트 태스크를 구현보다 먼저 하고 **실패를 확인한 뒤** 구현한다.
계약 번호(TH·DC·SE·SR·TD·PD·AS·TX)는 [contracts/settings-time-place.md](contracts/settings-time-place.md)의 것이다.

**Organization**: 이야기별로 묶었다. US1(시각)·US2(장소)는 P1, US3(055 잔여)는 P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일, 앞 태스크에 의존하지 않음

---

## Phase 1: Setup

- [ ] T001 브랜치가 `056-settings-time-place`인지 `git branch --show-current`로 확인하고, `npm run test:logic`이 지금 초록인지 기준선을 본다(저장소 루트)

---

## Phase 2: Foundational (모든 이야기의 전제)

- [ ] T002 [P] 새 문구 키를 보드 원문 그대로 `src/ui/settings-text.ts`의 `SETTINGS_TEXT`에 더한다 — `autoWriteTime`「매일 쓰는 시각」, `placeNames`「장소 이름으로 보기」, `timeTitle`「매일 쓰는 시각」, `timeAm`「오전」, `timePm`「오후」, `timeCancel`「취소」, `placeTitle`「장소 이름으로 보기」, `placeAuto`「자동」, `placeAutoDesc`「위치 권한이 있으면 이름으로, 없으면 비워 둬요」, `placeOn`「켬」, `placeOnDesc`「다닌 자리를 숫자 대신 이름으로 보여줘요」, `placeOff`「끔」, `placeOffDesc`「장소 이름을 옮기지 않아요」, `placeCancel`「취소」, `placeNotice`「좌표를 기기의 지도 서비스에 물어봐요.」(FR-034·FR-026). 머리 주석에 `time.save`를 쓰지 않는 이유(Clarification Q4)를 적는다
- [ ] T003 [P] TX1 문구 원문 테스트를 `__tests__/ui/settings-screen.test.tsx`의 문구 블록에 더한다(T002 키 15개를 글자 단위로)
- [ ] T004 [P] `src/ui/theme/tokens.ts`의 `SETTINGS`에 대화상자 치수를 더한다 — `toggle.knobOff: COLORS.textMuted`, `timeDialog: { tzSize: 13, titleGap: 6, meridiemHeight: 40, meridiemSize: 15, cellHeight: 52, cellSize: 18, previewSize: 13, previewLineHeightRatio: 1.5, columns12: 4, columns24: 6 }`, `placeDialog: { optionGap: 8, optionPaddingV: 12, optionPaddingH: 14, markSize: 12, markGap: 12, nameSize: 16, descSize: 13, descLineHeightRatio: 1.45, descGap: 3 }`, `expandMs: 200`, `titleSize: 20`(보드 `6f`·`6l` 마크업 값)
- [ ] T005 [P] `__tests__/theme-tokens.test.ts`에 `SETTINGS.toggle.knobOff`가 토글 꺼짐 면(`SETTINGS.tagFill`) 대비 3:1 이상임을 단언한다(R11 — 실제 4.54:1)

**Checkpoint**: 문구·토큰이 있다. 이후 이야기들이 그것을 쓴다.

---

## Phase 3: User Story 1 — 자동으로 쓰는 시각을 시 단위로 고른다 (Priority: P1) 🎯 MVP

**Goal**: 토글이 켜지면 「매일 쓰는 시각」 행이 펼쳐지고, 누르면 `6f` 격자 대화상자에서 칸 한 번에 저장·다시 예약·닫힌다.

**Independent Test**: 설정에서 토글을 켜고 시각 행 → 다른 칸 → 행 값이 바뀌고 다시 열면 그 칸이 선택돼 있다(spec US1).

### Tests for User Story 1 (먼저 쓰고 실패를 본다)

- [ ] T006 [P] [US1] TH1~TH10 테스트를 `__tests__/app/target-hour.test.ts`에 쓴다 — 표기(「오후 10시쯤」·「오전 12시쯤」·「오후 12시쯤」·「22시쯤」·「0시쯤」), 칸 순서 `[12,1,…,11]`/`[0,…,23]`, `hourOfCell`·`meridiemOf` 왕복(0–23 전부), 오전/오후 전환 시 칸 유지, 미리보기(12–23 「그날」·0–11 「어제」, 경계 11·12·0), `formatGmt`(540→「GMT+9」, 0→「GMT」, -210→「GMT-3:30」, 345→「GMT+5:45」), `timeZoneLine`(서울·New York·`null`), `hourFormatFrom`, 소스 계약(주석 걷고 `new Date(`·`Intl.`·`getTimezoneOffset`·「정각」 없음), 모든 표기 출력이 「쯤」 포함
- [ ] T007 [P] [US1] DC1·DC2 테스트를 `__tests__/app/device-clock.test.ts`에 쓴다 — `Intl.DateTimeFormat`을 `jest.spyOn`으로 던지게 해도 `{ format: "h12", timeZoneId: null }`, `offsetMinutes === -now.getTimezoneOffset()`
- [ ] T008 [P] [US1] SE2·SE3 테스트를 쓴다 — `__tests__/schedule/settings-effects.test.ts`에 「저장 실패면 `current`를 돌려주고 `reschedule`을 부르지 않는다」, `__tests__/schedule/settings.test.ts`의 기본값 단언을 7 → 22로 바꾸고(82·126·132행 부근) 「저장된 7은 7로 읽는다」를 더한다
- [ ] T009 [P] [US1] TD1~TD6 테스트를 `__tests__/ui/target-hour-dialog.test.tsx`에 쓴다(`render-with-portal.tsx` 사용) — 12시간: 오전/오후 칸 둘·칸 12개·저장된 시 선택(`accessibilityState.selected`)·「저장」 없음·시간대 줄은 주어졌을 때만, 24시간: 오전/오후 없음·칸 24개, 「오전」 누름 → 미리보기 갱신·`onSelect` 안 불림, 다른 칸 → `onSelect(시)` 1회, 같은 칸 → `onClose`만, 취소·`target-hour-dialog-overlay` → `onClose`만, 연타 → `onSelect` 1회
- [ ] T010 [P] [US1] SR1·SR2·SR4(시각 쪽)·SR5 테스트를 `__tests__/ui/settings-screen.test.tsx`에 쓴다 — 꺼짐이면 `settings-target-hour`가 기본 쿼리에 없고 `includeHiddenElements: true`로 찾으면 감쌈이 `pointerEvents="none"`, 켜짐이면 값 `targetHourText`, 끄고 켜도 값 같음, 누르면 `onOpenTargetHour`, 묶음 순서, `diaryExtras` prop 제거(202행 테스트를 새 계약으로 바꾼다 — 소스에 `diaryExtras` 없음)

### Implementation for User Story 1

- [ ] T011 [P] [US1] `src/app/target-hour.ts`를 만든다 — `HourFormat = "h12" | "h24"`, `Meridiem = "am" | "pm"`, `formatTargetHour`, `hourCells`, `hourOfCell`, `cellOf`, `meridiemOf`, `previewSentence`(날 낱말: 시 12–23 「그날」, 0–11 「어제」), `formatGmt`, `timeZoneLine`(`CITY_NAMES` 사람이 못 박은 표: `Asia/Seoul`→「서울」 외 몇 개, 없으면 식별자 마지막 `/` 뒤·밑줄→띄어쓰기, `null`이면 `null`), `hourFormatFrom`(`hourCycle` h11/h12→h12, h23/h24→h24, 없으면 `hour12`, 그것도 없으면 h12). 문장 틀(「{오전|오후} {h}시쯤」·「{h}시쯤」·「매일 … 일기를 써요. 이미 쓴 날은 건너뛰어요.」·「이 휴대폰의 시간대 · {city} ({gmt})」·「오전」·「오후」)은 이 파일 상수로 둔다(`src/ui/` import 금지, R8). 인자만 받는다(T006 통과)
- [ ] T012 [P] [US1] `src/app/device-clock.ts`를 만든다 — `readDeviceClock(now: Date): { format: HourFormat; timeZoneId: string | null; offsetMinutes: number }`. `new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions()`를 `hourFormatFrom`에, `new Intl.DateTimeFormat().resolvedOptions().timeZone`(빈 값이면 `null`), `-now.getTimezoneOffset()`. 각 읽기를 try/catch로 감싸 던지지 않는다(T007 통과)
- [ ] T013 [US1] `src/schedule/settings.ts`의 `DEFAULT_AUTO_DIARY_SETTINGS.targetHour`를 22로 바꾸고 주석(「기본값 7 (FR-001)」 등)을 056 FR-005로 고친다 — 이미 저장된 값은 그대로 읽는다. `src/schedule/settings-effects.ts`의 `applyTargetHour`는 `saveAutoDiarySettings`가 실패하면 `current`를 돌려주고 `reschedule`을 부르지 않게 한다(S6 순서 유지, T008 통과). `__tests__/onboarding/flag.test.ts`·`decision.test.ts`·`background-generation.test.ts`가 기본값 7에 기대는지 확인하고 기대면 고친다
- [ ] T014 [US1] `src/ui/TargetHourDialog.tsx`를 만든다(`6f`) — props `{ open, hour, format, timeZoneLine: string | null, onSelect(hour), onClose }`. `DismissibleDialog`(050) 틀, 제목 `SETTINGS_TEXT.timeTitle` 20/700 + 시간대 줄(13, `COLORS.textMuted`, 간격 6), 12시간이면 2px `COLORS.text` 테두리 안 오전/오후 두 칸(높이 40, 15/600, 선택 = `COLORS.text` 면 + `COLORS.bg` 글자 15/800), 격자(`hourCells`, 열 4/6, 칸 높이 52, 1px `COLORS.border` 칸막이, 18/600 고정폭 숫자, 선택 = `COLORS.accent` 면 + `COLORS.accentForeground` 18/800, `accessibilityRole="button"`·`accessibilityState.selected`, testID `target-hour-cell-{시}` — 12시간에서는 칸+지금 오전/오후의 시), 미리보기(13, 줄높이 1.5, `textMuted`, `previewSentence`), `DialogCancelButton` 전체 폭. 오전/오후는 로컬 state `useState(() => meridiemOf(hour))`(조립부가 열려 있을 때만 렌더하므로 열 때마다 새로 마운트되어 저장된 시로 시작한다 — T016), 다른 칸 → 로컬 잠금 ref로 1회만 `onSelect`, 같은 칸 → `onClose`. testID `target-hour-dialog`·`target-hour-am`·`target-hour-pm`·`target-hour-preview`·`target-hour-cancel` (T009 통과)
- [ ] T015 [US1] `src/ui/SettingsScreen.tsx` — `diaryExtras`를 지우고 props `targetHourText: string`·`onOpenTargetHour`를 더한다. 토글 행 아래 `ExpandingRow`(파일 안 로컬 부품): 감쌈 `overflow: "hidden"` + reanimated `height` 0 ↔ H(`withTiming`, `SETTINGS.expandMs`), 안쪽 행은 절대 배치(top 0·좌우 0)이고 `onLayout`으로 H를 잰다(기본 `row.minHeight`), 시작값 `useSharedValue(open ? H : 0)`(effect로 되돌리지 않는다 — 049·052 교훈), 접힌 동안 `pointerEvents="none"`·`importantForAccessibility="no-hide-descendants"`·`accessibilityElementsHidden`. 행은 라벨 `SETTINGS_TEXT.autoWriteTime` + `Value chevron`, testID `settings-target-hour` (T010 통과)
- [ ] T016 [US1] `App.tsx`의 `SettingsSection`에 시각 대화상자를 배선한다 — 로컬 `openDialog: "time" | "place" | null`(열린 대화상자만 렌더한다 — `openDialog === "time" && <TargetHourDialog open … />`), 행 값 `formatTargetHour(settings.targetHour, clock.format)`, `SettingsSection` 마운트 때 `useState(() => readDeviceClock(new Date()))`로 한 번 읽어 행 값의 형식과 대화상자의 형식·시간대 줄(`timeZoneLine(clock.timeZoneId, clock.offsetMinutes)`)에 같이 쓴다(설정 겹은 닫히면 언마운트되므로 열 때마다 새로 읽힌다), `onSelect` → 대화상자 닫기 → `applyTargetHour` → 반환값으로 값 갱신(실패면 그대로, AS1). 옛 `AutoDiarySettingsScreen` 사용과 `notificationDenied` state·`setNotificationDenied`를 지운다(FR-033 — `applyToggleOn`의 `notificationDenied` 반환은 무시)

**Checkpoint**: US1 단독으로 시각을 고를 수 있다.

---

## Phase 4: User Story 2 — 장소 이름으로 볼지 고른다 (Priority: P1)

**Goal**: 「장소 이름으로 보기」 행(늘)과 `6l` 대화상자 — 칸 한 번에 저장·닫힘, 「켬」이면 닫힌 직후 위치 권한 요청.

**Independent Test**: 장소 행 → 「끔」 → 닫히고 값 「끔」, 설정을 다시 열어도 「끔」(spec US2).

### Tests for User Story 2

- [ ] T017 [P] [US2] PD1~PD3 테스트를 `__tests__/ui/place-name-dialog.test.tsx`에 쓴다 — 칸 셋(이름·설명 원문), 지도 고지 원문, 「취소」, 지금 값 선택(`accessibilityState.selected`), 다른 칸 → `onSelect(mode)` 1회, 같은 칸 → `onClose`만, 취소·`place-name-dialog-overlay` → `onClose`만
- [ ] T018 [P] [US2] SR3·SR4(장소 쪽) 테스트를 `__tests__/ui/settings-screen.test.tsx`에 쓴다 — 토글 켜짐·꺼짐 모두 `settings-place-names` 행이 있고 값이 「자동」/「켬」/「끔」 + ›, 누르면 `onOpenPlaceNames`

### Implementation for User Story 2

- [ ] T019 [US2] `src/ui/PlaceNameDialog.tsx`를 만든다(`6l`) — props `{ open, value: GeocodingPreference, onSelect(mode), onClose }`. `DismissibleDialog` 틀, 제목 `SETTINGS_TEXT.placeTitle` 20/700, 칸 셋(간격 8, 안쪽 12·14, 왼쪽 12×12 표식 간격 12, 이름 16 + 설명 13·줄높이 1.45·`textMuted`·간격 3; 선택 = 2px `COLORS.text` 테두리 + `COLORS.accent` 채운 표식 + 이름 16/800, 아님 = 1px `COLORS.border` 테두리(바깥 1 여백으로 크기 맞춤) + 1px `SETTINGS.chevron` 테두리 표식 + 이름 16/600), `accessibilityRole="button"`·`accessibilityState.selected`, testID `place-name-{auto|on|off}`, 지도 고지(13, `textMuted`, testID `place-name-notice`), `DialogCancelButton` 전체 폭 testID `place-name-cancel`, 대화상자 testID `place-name-dialog`(바깥은 `place-name-dialog-overlay`) (T017 통과)
- [ ] T020 [US2] `src/ui/SettingsScreen.tsx`에 props `placeNamesText: string`·`onOpenPlaceNames`를 더하고 「일기」 묶음 맨 아래(시각 행 감쌈 아래)에 `settings-place-names` 행을 늘 둔다 (T018 통과)
- [ ] T021 [US2] `App.tsx`의 `SettingsSection`에 장소 대화상자를 배선한다 — 행 값은 `SETTINGS_TEXT.placeAuto|placeOn|placeOff`, `onSelect(g)` → 대화상자 닫기 → `saveGeocodingSetting` 성공 뒤에만 값 갱신 → 새 값이 「on」이고 이전과 달랐을 때만 `expo-location`의 `requestForegroundPermissionsAsync`(실패 무시, 거부돼도 값 유지 — FR-025·AS2). 옛 `GeocodingSettingToggle` 사용을 지운다

**Checkpoint**: US1·US2로 보드 `6c` 「일기」 묶음이 완성된다.

---

## Phase 5: User Story 3 — 설정이 바로 보이고 토글이 꺼진 것도 보인다 (Priority: P2)

**Goal**: 두 번째 설정 열기부터 「설정을 읽는 중…」이 없다(T3). 꺼진 토글의 손잡이가 보인다(T2).

**Independent Test**: 설정을 열고 닫고 다시 열어 읽는 중이 안 보이고, 끈 토글 손잡이가 진하다(spec US3).

### Tests for User Story 3

- [ ] T022 [P] [US3] SR6 테스트를 `__tests__/ui/settings-screen.test.tsx`에 쓴다 — 꺼짐이면 `auto-diary-toggle-knob`의 `backgroundColor === SETTINGS.toggle.knobOff`, 켜짐이면 `COLORS.bg`
- [ ] T023 [P] [US3] AS3~AS5 소스 계약을 `__tests__/ui/settings-time-place-wiring.test.ts`에 쓴다(주석 걷고 `App.tsx`를 읽는다) — `function SettingsSection` 본문에 `loadAutoDiarySettings(`·`loadGeocodingSetting(`·`.register()`가 없고 `AppFrame` 본문에 있다, `AutoDiarySettingsScreen`·`GeocodingSettingToggle` import가 없다, `src/ui/AutoDiarySettingsScreen.tsx`·`src/ui/GeocodingSettingToggle.tsx` 파일이 없다, `src/app/target-hour.ts`·`device-clock.ts`가 `../ui`를 import하지 않는다

### Implementation for User Story 3

- [ ] T024 [US3] `src/ui/SettingsScreen.tsx`의 `Toggle` 꺼짐 손잡이 색을 `SETTINGS.toggle.knobOff`로 바꾸고 주석의 055 Clarification을 056 FR-029로 고친다 (T022 통과)
- [ ] T025 [US3] `App.tsx` — `AppFrame`이 마운트 때 `loadAutoDiarySettings`·`loadGeocodingSetting`(실패 → `"auto"`)을 한 번 읽어 `settingsValues: { autoDiary, geocoding } | null`로 들고, `enabled: true`면 `backgroundPort.register()` effect(020 B5)를 `AppFrame`으로 옮긴다. `SettingsSection`은 `values`·`onAutoDiaryChange`·`onGeocodingChange` props를 받아 쓰고 자체 로드·state를 지운다. `values === null`일 때만 「설정을 읽는 중…」(FR-031). 토글 켬/끔(`applyToggleOn/Off`) 결과도 같은 콜백으로 올린다 (T023 통과)

**Checkpoint**: 세 이야기가 모두 선다.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T026 옛 화면을 지운다 — `src/ui/AutoDiarySettingsScreen.tsx`, `src/ui/GeocodingSettingToggle.tsx`, `__tests__/ui/auto-diary-settings-screen.test.tsx`, `__tests__/ui/geocoding-setting-toggle.test.tsx`, `__tests__/ui/denied-guidance.test.tsx`의 `AutoDiarySettingsScreen` 블록(파일에 다른 블록이 없으면 파일째). `__tests__/ui/enduser-screen-migration.test.tsx`의 목록에서 두 파일을 뺀다. `src/schedule/settings.ts` 머리 주석의 `AutoDiarySettingsScreen` 언급을 고친다. `grep -rn "AutoDiarySettingsScreen\|GeocodingSettingToggle" src __tests__ App.tsx scripts`가 0건
- [ ] T027 [P] Maestro 흐름 `.maestro/settings-time-place.yml`을 새로 쓴다 — `home-settings` → (토글 꺼져 있으면) `auto-diary-toggle` 켬 → `settings-target-hour` → `target-hour-dialog` 보임 → 다른 칸 `target-hour-cell-*` → 대화상자 사라짐(`extendedWaitUntil notVisible`) → 행 값 정규식 `.*시쯤` → `settings-place-names` → `place-name-off` → 행 값 「끔」 → 다시 열어 `place-name-auto`로 되돌리고 시각도 원래 칸으로 되돌린다. `scripts/run-device-tests.mjs`의 `FLOWS`에 등록한다(C8)
- [ ] T028 [P] FLOWS 밖 흐름의 해당 단계만 새 testID로 고친다 — `.maestro/scheduled-diary-notification.yml`의 시각 고르기·「매일 (오전 )?7시」 단언(행 → 대화상자 칸, 정밀도 문구 단언은 「정각」 없음으로), `.maestro/diary-body-screen.yml`의 `geocoding-*` 블록(장소 행 → 대화상자 칸, 고지 문구 「물어봐요.」). 두 흐름은 FLOWS 밖에 그대로 둔다(진입 경로 등 다른 stale 단계는 범위 밖)
- [ ] T029 `npm test`·`npm run lint`(eslint·tsc·헌법 검사·prettier)를 돌려 전부 통과시킨다
- [ ] T030 실기기 dev 1회 — [quickstart.md](quickstart.md) Q0~Q10. Q0의 `Intl` 실측값을 research R1에 「실측」으로 옮기고 로그 줄은 지운다. 결과를 quickstart 「결과」에, 못 본 것은 spec 「미확인 잔여」 절(새로 만든다)에 적는다
- [ ] T031 `AGENTS.md`에 056 절(유효한 결론·남은 위험만)을 더하고 「저장소의 현재 상태」의 설정 개편 줄을 갱신한다(시각 격자 완료). 055 절의 「옛 0–23 시각 목록과 장소명 3상태」·「토글 꺼짐」 서술을 고친다

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1·US2·US3. US1과 US2는 서로 독립(파일이 겹치는 `SettingsScreen.tsx`·`App.tsx`·`settings-screen.test.tsx`는 순서대로).
- US3의 T025(값 보관)는 T016·T021이 만든 `SettingsSection` 배선 위에서 한다 — US1·US2 뒤.
- T026(지우기)은 T016·T021 뒤. T027·T028은 testID가 정해진 T014·T015·T019·T020 뒤. T029 → T030 → T031.
- 각 이야기 안: 테스트(실패 확인) → 순수 모듈 → 화면 → 조립.

## Parallel Example: User Story 1

```text
T006 target-hour.test.ts   T007 device-clock.test.ts   T008 settings*.test.ts   T009 target-hour-dialog.test.tsx
→ T011 target-hour.ts   T012 device-clock.ts   (병렬)
→ T013 → T014 → T015 → T016
```

## Implementation Strategy

- **MVP**: Phase 1·2 + US1(시각). 그것만으로 055의 임시 24칸 목록이 대화상자로 바뀐다.
- 다음 US2(장소)로 「일기」 묶음을 보드대로 완성하고, US3로 055 잔여를 닫는다.
- 마지막에 지우기·Maestro·전체 테스트·실기기·AGENTS.
