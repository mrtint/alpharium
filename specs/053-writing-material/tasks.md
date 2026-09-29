# Tasks: 쓸 재료 — 쓰기 전에 그날의 재료를 보이고, 없으면 한 번 더 묻는다

**Input**: `specs/053-writing-material/` — [plan.md](plan.md), [spec.md](spec.md), [data-model.md](data-model.md), [contracts/material.md](contracts/material.md), [research.md](research.md), [quickstart.md](quickstart.md)

**Tests**: 이 저장소는 「계약 → 테스트 먼저」다(헌법 「개발 방식」). 각 스토리의 계약 테스트를 구현보다 먼저 쓰고 **실패하는 것을 확인**한다. 위반 주입은 구현 뒤 Polish에서 한다.

**Format**: `- [ ] T### [P?] [US?] 설명 (파일 경로)` — `[P]`는 다른 파일이고 미완료 태스크에 의존하지 않는다.

## Phase 1: Setup

- [ ] T001 [P] `src/ui/home-text.ts`에 `MATERIAL_TEXT`를 더한다. 키·값은 data-model.md §6을 글자 그대로(`photos`·`places`·`unitPhoto`·`unitPlace`·`noPermission`·`emptyNote`·`confirmTitleZero`·`confirmTitleUnseen`·`confirmBody`·`confirmYes`·`confirmNo`·`settingsTitle`·`settingsOpen`·`settingsCancel`·`madeUpDay`). 문구 조립은 이 파일에만 둔다(C4)
- [ ] T002 [P] `src/ui/theme/tokens.ts`에 `MATERIAL_GRID` 상수를 더한다: `paperPadding: { top: 20, horizontal: 20, bottom: 120 }`, `columnGap: 6`, `noteMarginTop: 8`, `cellPaddingVertical: 16`, `secondCellPaddingLeft: 16`, `permissionMinHeight: 44`, `numberSize: 48`, `unitSize: 15`, `labelSize: 13`, `noteSize: 14`. 색은 새로 만들지 않고 기존 `COLORS.danger`·`COLORS.textMuted`·`COLORS.divider`와 지면 배경 토큰(`WRITTEN_DAY`가 쓰는 `neutral-100` 값)을 쓴다(C5, hex 리터럴 없음). 이미 같은 값이 있는 상수가 있으면 그것을 가리키게 하고 복제하지 않는다

## Phase 2: Foundational (모든 스토리가 기대는 판정과 미리보기 모양)

**⚠️ 이 단계가 끝나야 스토리 작업을 시작한다.**

- [ ] T003 [P] `__tests__/app/material.test.ts`(logic)를 쓴다 — 계약 MAT1~MAT3, DEC1~DEC12, SRC5. `decideMaterial`·`fromCountHint`·`fromSignalValue`·`allZero`가 아직 없어 실패해야 한다
- [ ] T004 `src/app/material.ts`를 만든다(순수 — `Date`·`setTimeout` 없음). `MaterialState = "some" | "zero" | "unseen"`, `fromCountHint(hint: CountHint)`, `fromSignalValue`(사진·장소 각각 `DaySignals`의 값을 옮김 — 사진 `known`은 사진 1장 이상이면 `some`, 장소 `known`은 `visitCount ≥ 1`이면 `some`, 그 아래는 `zero`), `decideMaterial(photos, places)`(순서: `some` → `zero` → `unseen`, data-model §2), `allZero(photos, places)`. `unknown`을 `zero`로 바꾸는 기본 분기를 두지 않는다(MAT3, 원칙 V)
- [ ] T005 `src/app/state.ts`의 `DayPreview`에 `photoAccess: PhotoAccess`를 더하고 `type PhotoAccess = "ok" | "denied" | "blocked"`를 export한다. `CountHint`는 세 갈래 그대로. 이 파일에 `signals` import를 만들지 않는다(DP8, SRC2). `DayPreview`를 만드는 모든 자리(테스트 포함)를 `tsc`가 짚는다
- [ ] T006 `src/app/day-preview.ts`의 `toDayPreview(day, signals, photoAccess)`가 세 번째 인자를 받아 싣게 한다(신호가 `null`이어도 `photoAccess`를 그대로). `__tests__/app/day-preview.test.ts`의 PRM1을 갱신·추가한다
- [ ] T007 `src/app/wiring.ts`의 `previewDay`가 `expoPhotoPort().photoPermission()`도 읽어 `granted`·`limited` → `ok`, `denied`·`undetermined` → `denied`, `blocked` → `blocked`로 옮긴다(조회가 던지면 `ok`). 옮김은 `src/app/day-preview.ts`의 순수 함수 `photoAccessOf(state)`로 뗀다. `__tests__/app/wiring.test.ts`·`day-preview.test.ts`에 PRM2·PRM4를 추가한다

**Checkpoint**: `npm run test:logic -- material day-preview wiring state`가 초록이고 `tsc`가 0이다.

## Phase 3: User Story 1 — 쓰기 전에 그날 셀 수 있는 재료를 본다 (P1) 🎯 MVP

**Goal**: 안 쓴 날의 지면이 사진·장소 두 칸이고, 관측된 0은 숫자만 회색이며, 0/0이면 안내 한 줄이 붙는다. 「쓸 수 있는 때」 칸이 없다.

**Independent Test**: 사진이 있는 날과 0장인 날을 골라 두 칸의 숫자·단위·회색·안내 한 줄을 본다(spec US1, quickstart D1·D2).

- [ ] T008 [P] [US1] `__tests__/ui/material-grid.test.tsx`(ui, 새 파일)에 GRID1~GRID3·GRID6~GRID8·SRC1·SRC3·SRC4를 쓴다. 실패해야 한다(`MaterialGrid`가 아직 없다). 소스 검사는 주석을 걷어내고 읽는다
- [ ] T009 [US1] `src/ui/MaterialGrid.tsx`를 만든다 — 보드 `1d` ④ 마크업 그대로: 두 칸 격자(`grid 1fr 1fr`, 아래 1px 구분선만·세로선 없음), 칸 안쪽 여백 세로 16, 둘째 칸 왼쪽 16, 라벨 13/600 보조색, 숫자 48/800(줄높이 .85, 자간 −.04em)·단위 15/700(밑선 맞춤), 관측된 0은 숫자만 `textMuted`. 「0 안내 한 줄」은 `allZero`일 때만(14, 줄높이 1.5, 위 간격 gap 6 + 8). 미리보기 전 「…」, 통로 없음 「모름」. props는 `preview: PreviewState | undefined`(권한 없음 갈래는 US2). testID: `signal-row`·`signal-photos`·`signal-places`·`material-empty-note`. 화면은 `DaySignals`·`expo-*`를 모른다(SRC1)
- [ ] T010 [US1] `src/ui/DiaryListScreen.tsx`에서 `SignalRow`·`SignalCell`·`windowText`·`signal-window`·`SIGNAL_ROW`류 스타일을 걷어내고 `MaterialGrid`로 바꾼다. 안 쓴 날 지면을 보드대로 맞춘다: 스트립 아래 간격 20, 배경 `neutral-100`, 안쪽 여백 20 20 120, 컬럼 `gap 6`, `flex:1`로 화면 바닥까지, 스크롤 없음(R7). 쓴 날 지면·하단 바는 건드리지 않는다. 048~051의 기존 테스트가 「쓸 수 있는 때」·세 칸을 검사하면 이 스토리의 새 계약으로 고친다(`signal-window` 삭제, 「다닌 자리」→「장소」)
- [ ] T011 [US1] `npm run test:ui -- material-grid diary-list diary-home`와 `npm run test:logic`가 초록인지 확인한다. 초록이 아니면 원인을 고친다(테스트를 약화하지 않는다)

**Checkpoint**: US1만으로 두 칸 화면이 완성되고 독립 검증된다.

## Phase 4: User Story 2 — 권한이 없어 셀 수 없는 것을 0과 다르게 보고, 눌러서 요청한다 (P1)

**Goal**: 사진 권한이 없으면 두 칸 모두 빨간 「권한이 없어요 ›」이고 누르면 사진 권한을 요청한다. 다시 물을 수 없으면 설정 안내 대화상자가 뜬다. 허용·복귀하면 다시 센다.

**Independent Test**: 권한을 회수한 상태에서 「권한이 없어요 ›」를 눌러 허용하면 숫자로 바뀌고, 「다시 묻지 않음」에서는 설정 안내가 뜬다(spec US2, quickstart D3~D6).

- [ ] T012 [P] [US2] `__tests__/ui/material-request.test.tsx`(새 파일)에 GRID4·GRID5와 REQ1~REQ6·DLG5(설정 안내가 `ConfirmDialog`를 쓴다는 소스 검사)를 쓴다. `DiaryHomeScreen`을 조립해 요청 통로·설정 통로의 호출 횟수와 `previewDay` 재호출을 본다(RNTL 14 — `render`·`fireEvent` 모두 `await`, jest-expo의 `AppState` 스파이는 복원하지 않는다). 실패해야 한다
- [ ] T013 [US2] `src/ui/MaterialGrid.tsx`를 확장한다 — `photoAccess !== "ok"`이면 두 칸 모두 「권한이 없어요」 16/700 + `›` 18/700(`COLORS.danger`, 가운데 정렬, 간격 6, 최소 높이 44, `accessibilityRole="button"`)이고 어느 칸을 눌러도 `onRequestPhoto` 하나를 부른다(FR-011). `photoAccess === "ok"`인데 장소가 `unknown`이면 「모름」이고 누를 수 없다(GRID5). testID: `material-photos-permission`·`material-places-permission`. 권한 여부를 `reason` 문자열로 가르지 않는다(PRM4)
- [ ] T014 [US2] `src/ui/MaterialDialogs.tsx`를 만들고 설정 안내 대화상자(`SettingsPromptDialog`)를 둔다 — 050 `ConfirmDialog`+`DialogActionButton`(「설정 열기」)+`DialogCancelButton`(「취소」), 제목 `MATERIAL_TEXT.settingsTitle`. 덮개를 눌러도 닫히지 않는다(부품이 준다). 새 모달을 만들지 않는다(DLG5). testID: `settings-prompt`·`settings-prompt-open`·`settings-prompt-cancel`
- [ ] T015 [US2] `src/ui/DiaryHomeScreen.tsx`에 새 prop `photoAccessPort?: { request(): Promise<unknown>; openSettings(): Promise<void> }`를 더하고 `previewTick` 화면 로컬 상태를 둔다. 「권한이 없어요 ›」 누름: `preview.photoAccess === "blocked"`면 `settingsPromptOpen`을 켜고, 아니면 `request()` 뒤 `previewTick`을 올려 미리보기를 다시 읽는다. 「설정 열기」는 `openSettings()`. 기존 `AppState` `change → active` 리스너(316행 근처)에서도 `previewTick`을 올려 다시 센다(REQ4, FR-006 — 오늘의 수는 열 때만 갱신). 미리보기 effect의 의존성에 `previewTick`을 넣는다
- [ ] T016 [US2] `App.tsx`에서 `photoAccessPort`를 조립해 `DiaryHomeScreen`에 넘긴다 — `onboardingPorts.photo.requestPhotoPermission`과 `onboardingPorts.osSettings.openAppSettings`를 감싼다(`expo-*`는 여기서만, 새 통로 없음)
- [ ] T017 [US2] `npm run test:ui -- material-grid material-request diary-home`이 초록인지 확인한다

**Checkpoint**: US1+US2로 권한 없음·요청·설정 안내·복귀 재조회가 독립 동작한다.

## Phase 5: User Story 3 — 재료가 없으면 「상상해서 적어요」를 한 번 더 확인한다 (P1)

**Goal**: 셀 수 있는 재료가 없는 날(관측된 0뿐이거나 전부 권한 없음)에 「일기 쓰기」를 누르면 확인 대화상자가 먼저 뜬다. 하나라도 있으면 바로 쓴다.

**Independent Test**: 재료 있음·0·권한 없음 세 날에서 확인 대화상자가 조건표대로 뜨고 확인·취소가 맞게 동작한다(spec US3, quickstart D7~D9).

- [ ] T018 [P] [US3] `__tests__/ui/material-write.test.tsx`(새 파일)에 DLG1~DLG4·DLG6~DLG9와 FR-012(권한 없음에서도 「확인」이면 권한 요청 통로 0회로 `pipeline.run` 1회)를 쓴다. `pipeline.run`을 대역으로 호출 횟수를 세고, `previewDay` 대역으로 조건표(재료 있음·0·권한 없음·미리보기 지연·`previewDay` 없음)를 만든다. 실패해야 한다
- [ ] T019 [US3] `src/ui/MaterialDialogs.tsx`에 재료 없음 확인 대화상자(`MaterialConfirmDialog`)를 더한다 — 050 `ConfirmDialog`, 제목은 `because === "zero"`면 `confirmTitleZero`, `"unseen"`이면 `confirmTitleUnseen`, 설명 `confirmBody`, 동작 「확인」(위)·「취소」(아래). 뒤로 가기는 「취소」와 같다(`onCancel`). testID: `material-confirm`·`material-confirm-yes`·`material-confirm-no`
- [ ] T020 [US3] `src/ui/DiaryHomeScreen.tsx`의 `write()`를 고친다 — 안 쓴 날(`!prompt.overwrites`)에서만: 화면이 든 미리보기가 고른 날의 것이면 그것으로, 아니면 `previewDay(day)`를 한 번 기다려 `decideMaterial(fromCountHint(photos), fromCountHint(places))`를 부른다(R3). `previewDay`가 없으면 판정 없이 진행(DLG7). `confirm`이면 `resolve(day)`가 정한 인자를 `pendingParams`처럼 들고 `materialConfirm`을 켠다(DLG9). 「확인」→ 대화상자를 닫고 `generate(params)`, 「취소」→ 닫기만. 다시 쓰기(`overwrites`)는 기존 050 덮어쓰기 확인만 거치고 재료 판정은 건너뛴다(DLG8). `toWriting()`은 여전히 인자를 받지 않는다(007 — 「이미 있으면 보여준다」로 갈릴 수 없다)
- [ ] T021 [US3] `npm run test:ui -- material-grid material-request material-write diary-home overwrite`가 초록인지 확인한다. 기존 `diary-home`의 「일기 쓰기」 흐름 테스트가 재료 있음 대역을 쓰도록 필요한 곳만 고친다(테스트를 약화하지 않는다)

**Checkpoint**: US1~US3으로 쓰기 전 확인이 독립 동작한다.

## Phase 6: User Story 4 — 재료 없이 쓴 하루는 지어낸 하루로 남는다 (P2)

**Goal**: 쓰인 때 셀 수 있는 재료가 없었던 일기(확인을 거친 것·백그라운드·옛 일기)를 읽을 때 본문 위에 「지어낸 하루」 한 줄이 보인다. 저장 필드는 없다.

**Independent Test**: 재료 없이 쓴 일기와 있던 일기를 나란히 열어 앞의 것에만 한 줄이 있다(spec US4, quickstart D10).

- [ ] T022 [P] [US4] `__tests__/app/material.test.ts`에 MADE1을, `__tests__/app/written-day.test.ts`에 MADE2·MADE4를 쓴다. `__tests__/ui/`의 지면 테스트(`written-day-home` 등)에 MADE5를, 소스 검사 MADE3(`DiaryEntry`·저장 통로에 새 필드 없음)를 더한다. 실패해야 한다
- [ ] T023 [US4] `src/app/material.ts`에 `madeUpDay(signals: DaySignals): boolean`을 더한다 — `decideMaterial(fromSignalValue(photos), fromSignalValue(places)).kind === "confirm"`(규칙 복제 없이 같은 함수를 부른다, MADE1)
- [ ] T024 [US4] `src/app/written-day.ts`의 `PaperState`의 `readable` 갈래에 `madeUp: boolean`을 더하고 `paperFor()`가 `madeUpDay(entry.signalsUsed)`로 채운다. 다른 갈래는 그대로(MADE4). `tsc`가 짚는 사용처를 고친다
- [ ] T025 [US4] `src/ui/WrittenDayPaper.tsx`가 `paper.madeUp`이면 본문 문단 앞(캐러셀 뒤)에 `MATERIAL_TEXT.madeUpDay` 한 줄(보조색, 조용한 글자 — 14 보조색, testID `made-up-day`)을 그린다. 헤더·읽기 스크롤(052)·하단 바는 건드리지 않는다
- [ ] T026 [US4] `npm run test:logic`·`npm run test:ui`가 초록인지 확인한다

**Checkpoint**: 네 스토리 모두 기기 없는 테스트로 독립 검증된다.

## Phase 7: Polish & 실기기

- [ ] T027 [P] `.maestro/writing-material.yml`을 만든다 — 사진 있는 날 두 칸 확인, 권한 없음 표시·요청, 재료 0 확인 대화상자(취소·확인), 「지어낸 하루」 한 줄. 마크업의 좌표 대신 `id:`(`signal-photos`·`material-photos-permission`·`material-confirm-yes`·`made-up-day` 등)로 찾는다. 권한 제어는 `permissions: {all: deny}`. `scripts/run-device-tests.mjs`의 `FLOWS`에 등록한다(등록하지 않으면 돌지 않는다)
- [ ] T028 위반 주입: contracts/material.md의 각 「위반 주입」을 실제로 어겨 보고 테스트·`tsc`·헌법 검사가 잡는지 확인한다(특히 MAT1 `unknown→zero`, DEC11, PRM2, GRID4 색·높이, DLG1·DLG2, MADE1, MADE3). 결과를 quickstart.md §5에 적는다
- [ ] T029 `npm test`와 `npm run lint`(eslint·`tsc`·헌법 검사·prettier)를 실제로 돌려 통과를 확인한다. 실패하면 원인을 고친다
- [ ] T030 실기기(SM-S901N, dev, **`pm clear` 없음**)에서 quickstart D1~D11을 한 번 본다: `npx expo run:android` → Metro(`EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`, gradle 뒤에) → `adb reverse`. 권한은 `pm revoke`/`grant`로 바꾼다. 한 번에 보지 못한 것은 「미확인 잔여」로 적는다(원칙 V)
- [ ] T031 `maestro test`로 `.maestro/writing-material.yml`과 신호 줄을 지나는 기존 흐름(048 `diary-home-1d` 등)을 직접 돌린다. 「설정」·「개발자」 탭 글자를 누르는 흐름이 새로 깨졌는지 확인한다(051 이후 메뉴가 없어 이미 깨진 흐름은 회귀로 세지 않는다)
- [ ] T032 quickstart.md §5·§6에 위반 주입 결과와 실기기 관측을, `AGENTS.md`에 053 절(핵심 결론·실측 함정·미확인 잔여)을 적는다

## Dependencies & Execution Order

- **Phase 1** — 시작 즉시. T001·T002는 서로 다른 파일이라 병렬.
- **Phase 2** — Phase 1 뒤, **모든 스토리를 막는다**. T003(테스트)→T004(구현), T005→T006→T007은 같은 계보라 순서대로. T003은 T005~T007과 병렬 가능.
- **US1**(Phase 3) — Phase 2 뒤 시작. MVP.
- **US2**(Phase 4) — US1의 `MaterialGrid`·`DiaryListScreen` 뒤(같은 파일을 확장한다).
- **US3**(Phase 5) — Phase 2 뒤 독립 가능하나 `DiaryHomeScreen`을 US2와 같이 고치므로 US2 뒤에 순서대로 한다.
- **US4**(Phase 6) — Phase 2(`material.ts`) 뒤 독립. US1~US3과 다른 파일(`written-day.ts`·`WrittenDayPaper.tsx`)이라 병렬 가능.
- **Polish**(Phase 7) — 전 스토리 뒤.

### 병렬 기회

- T001 ∥ T002. T003 ∥ T005. T008(US1)·T012(US2)·T018(US3)·T022(US4)의 테스트는 각각 다른 파일(`material-grid`·`material-request`·`material-write`·`material`/`written-day`)이라 함께 쓸 수 있다.
- US4(T022~T026)는 US1~US3과 병렬로 진행할 수 있다.

## Implementation Strategy

1. **MVP = Phase 1~3(US1)**: 두 칸 화면. 이것만으로 「쓰기 전 재료가 보인다」가 성립하고 독립 검증된다.
2. **증분**: US2(권한) → US3(확인) → US4(표식) 순으로 각각 독립 검증하고 다음으로 간다.
3. **막힘 신호**: 한 축을 깊게 파고들고 싶어지면 실패 신호다(AGENTS). 확인 조건표(DEC)와 권한 갈래(PRM)는 표로 잠그고 넘어간다.

## Notes

- 새 의존성·네이티브 모듈·저장 필드가 없다. release 빌드·`pm clear`는 하지 않는다(AGENTS 「테스트」).
- 커밋은 kickoff 규칙대로 3번(스펙 산출물 / 구현 / 로드맵 갱신), 각각 실행 전에 확인을 받는다.
