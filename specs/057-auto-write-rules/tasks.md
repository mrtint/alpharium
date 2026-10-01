# Tasks: 자동 쓰기 규칙 — 재료 없는 날·사진 권한 없는 날 건너뜀, 앱을 열면 쓰는 중, 완성 알림 문구

**Input**: Design documents from `/specs/057-auto-write-rules/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auto-write.md, quickstart.md

**Tests**: 헌법 「개발 방식」 — 계약을 먼저 정하고 테스트를 먼저 쓴다(MUST). 각 이야기의 테스트 태스크를 구현보다 먼저 하고 **실패를 확인한 뒤** 구현한다.
계약 번호(AW·SK·BG·NT·SL·OP)는 [contracts/auto-write.md](contracts/auto-write.md)의 것이다.

**Organization**: 이야기별로 묶었다. US1(건너뜀)·US2(설정 표시)는 P1, US3(앱 열기)는 P2, US4(알림 문구)는 P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일, 앞 태스크에 의존하지 않음

---

## Phase 1: Setup

- [ ] T001 브랜치가 `057-auto-write-rules`인지 `git branch --show-current`로 확인하고, `npm run test:logic`이 지금 초록인지 기준선을 본다(저장소 루트)

---

## Phase 2: Foundational (US1·US2·US3의 전제 — 판정과 기록)

- [ ] T002 [P] SK1~SK4 계약 테스트를 `__tests__/schedule/skip-store.test.ts`에 쓴다 — 메모리 통로로 저장 모양이 `{"day":"YYYY-MM-DD"}` 하나(「필드 하나. 시각·횟수·이유를 담지 않는다」), 파일 없음·깨진 JSON·`day`가 `YYYY-MM-DD`가 아님 → `null`(던지지 않음), 덮어쓰기(가장 최근 한 번), 지운 뒤 `null`, 소스(주석 걷은 뒤)에 `Date`·`timestamp`·`count`·`history`·`reason` 어휘 없음, 파일 이름 `auto-write-skipped.json`·디렉터리 `preferences`이고 `auto-diary.json`을 쓰지 않음
- [ ] T003 [P] AW1~AW7 계약 테스트를 `__tests__/schedule/auto-write.test.ts`에 쓴다 — `decideAutoWrite`: 020 `act:false` → `idle`(이유 보존), `photoAccess` `denied`·`blocked` → `skip/no-photo-access`(사진이 많아도), `ok` + 사진 `known ≥1` → `write`, `ok` + 사진 `known 0`·장소 `unknown` → `skip/no-material`, `ok` + 사진 `unknown`·장소 `unknown` → `skip/no-material`, `ok` + 사진 `known ≥1`·장소 `unknown` → `write`, `ok` + 사진 `none`·장소 `known ≥1` → `write`; `resolveAutoWrite`: `idle`이면 `previewDay` 0회 호출, `no-photo-access`면 `saveSkippedDay(day)` 정확히 1회, `no-material`·`write`면 0회, 저장이 던져도 결정이 같음; 소스 계약: `decideMaterial`·`fromCountHint`를 import하고 `count >=`·`AppState`·`new Date(`가 없음. FR-005(사진 관측 0이면 장소도 0)는 053 `toDayPreview`가 이미 하고 `__tests__/app/day-preview.test.ts`가 잠근다 — 여기서는 승격된 미리보기(사진 `none`·장소 `none`)가 `no-material`임을 단언한다
- [ ] T004 `src/schedule/skip-store.ts`를 만든다 — `SkipStorePort { read(): Promise<string|null>; write(s: string): Promise<void>; remove(): Promise<void> }`, `loadSkippedDay(port): Promise<DayDate|null>`, `saveSkippedDay(port, day)`, `clearSkippedDay(port)`, `expoSkipStorePort()`(`notified-store.ts`와 같은 모양 — `expo-file-system` 지연 import, `preferences/auto-write-skipped.json`, 임시 파일 `.writing`에 쓰고 옮김, 없으면 `remove`는 조용히). 머리 주석에 D3·020 S7·원칙 IV 근거. T002 초록
- [ ] T005 `src/schedule/auto-write.ts`를 만든다 — `AutoWriteDecision = { kind: "idle"; reason: ScheduleDecision 이유 } | { kind: "write"; day } | { kind: "skip"; day; because: "no-photo-access" | "no-material" }`, 순수 `decideAutoWrite({ schedule, preview })`(판정 순서 고정: idle → `photoAccess` `denied`/`blocked` → `decideMaterial(fromCountHint(photos), fromCountHint(places))` write → no-material), 조합 `resolveAutoWrite({ settings, now, listDiaryDays, previewDay, skipPort })`(`decideSchedule`에 `selectableDays(now)` → act면 `previewDay(day)` → `decideAutoWrite` → no-photo-access면 `saveSkippedDay` 삼킴). `src/app/material.ts`·`src/app/state.ts`(타입) import, 머리 주석에 research R1 계층 근거. T003 초록

**Checkpoint**: 판정·기록이 있다. 두 경로가 그것을 부른다.

---

## Phase 3: User Story 1 — 자동 쓰기가 지어 쓰지 않는다 (Priority: P1) 🎯 MVP

**Goal**: 백그라운드 자동 쓰기가 재료 없는 날·사진 권한 없는 날을 쓰지 않는다. 사진 권한 건너뜀은 기록된다.

**Independent Test**: 메모리 대역으로 `runAutoDiaryTask`를 돌려 사진 0장 날·권한 없음 날에 `pipeline.run`·알림이 0회이고 권한 없음만 기록되는지 본다(spec US1).

- [ ] T006 [US1] BG1·BG2 테스트를 `__tests__/schedule/background-generation.test.ts`에 더한다 — 가짜 `makePipeline`이 `previewDay`를 주고, 사진 `known 0` 미리보기면 결과 `"skipped"`·`pipeline.run` 0회·알림 0회·기록 0회, `photoAccess: "denied"`면 `"skipped"`·`run` 0회·알림 0회·기록 1회(그 날), 사진 `known 3`이면 지금처럼 `"ran"`. 기존 테스트의 가짜 `makePipeline`에 사진 있는 `previewDay`를 더해 회귀가 없게 한다. 새 의존 `skipPort?`를 주입한다
- [ ] T007 [US1] `src/schedule/task.ts`를 고친다 — `decideSchedule` 직접 호출을 `resolveAutoWrite({ settings, now, listDiaryDays: () => existingDiaryDays, previewDay: app.previewDay, skipPort: deps.skipPort ?? expoSkipStorePort() })`로 바꾸고 `idle`·`skip`이면 `"skipped"`(파이프라인·알림 없음), `write`면 그 날로 지금처럼. `AutoDiaryTaskDeps`에 `skipPort?: SkipStorePort`. 머리 주석에 057 FR-007~FR-009. T006 초록

**Checkpoint**: 백그라운드가 지어 쓰지 않는다.

---

## Phase 4: User Story 2 — 사진 권한 때문에 건너뛴 것을 설정에서 안다 (Priority: P1)

**Goal**: 기록이 있고 사진 꼬리표가 「허용 안 함」이면 사진 행 아래 빨간 보조 줄(보드 `6g`). 권한이 허용된 것을 읽으면 기록을 지운다.

**Independent Test**: 기록 파일을 심은 기기에서 설정 → 보조 줄 → 사진 허용 후 복귀 → 줄 없음(spec US2).

- [ ] T008 [P] [US2] SL1 테스트를 `__tests__/app/skipped-line.test.ts`에 쓴다 — `now` 2026-09-14 10:00에서 `"2026-09-13"` → 「어제 자동 쓰기를 건너뛰었어요」, `"2026-09-11"` → 「9월 11일 자동 쓰기를 건너뛰었어요」, `"2026-09-14"`(오늘) → 「9월 14일 자동 쓰기를 건너뛰었어요」, `"2026-10-02"` 기준 앞 0 없음(「10월 2일」), 자정 직후(`00:05`) 어제 판정; 소스에 `getHours`가 없음(DB11)
- [ ] T009 [P] [US2] SL2·SL4 테스트를 `__tests__/ui/settings-screen.test.tsx`에 더한다 — 문구 원문 `SETTINGS_TEXT.photoSkippedYesterday`「어제 자동 쓰기를 건너뛰었어요」·`photoSkippedOn`「{M}월 {d}일 자동 쓰기를 건너뛰었어요」 글자 단위, `photoSkipText`를 주면 `settings-perm-photos` 행 안에 그 글자가 `COLORS.danger` 색으로 있고 행 최소 높이가 `row.minHeightWithHint`(56)이고 글자 크기 12·줄높이 12×1.35(FR-011), 안 주면 보조 줄이 없음(055 그대로)
- [ ] T010 [US2] `src/app/skipped-line.ts`를 만든다 — `skippedLineText(day: DayDate, now: Date): string`(`day === latestClosedDay(now)`면 어제 문구, 아니면 날짜 문자열을 나눠 `{M}월 {d}일 …`). 문장 틀은 이 파일에 두고(`src/app/`이 `src/ui/`를 import하지 않는다, 056 관례) `settings-text.ts`의 두 키와 같은 원문. T008 초록
- [ ] T011 [US2] `src/ui/settings-text.ts`에 `photoSkippedYesterday`·`photoSkippedOn`(보드 `perm.photos.skippedYesterday`·`perm.photos.skippedOn` 원문)을 더하고, `src/ui/SettingsScreen.tsx`에 `photoSkipText?: string` prop과 `Row`의 `hintTone?: "muted" | "danger"`(danger = `COLORS.danger`, 낱말 단위 줄바꿈)를 더해 사진 행에 그린다. T009 초록
- [ ] T012 [US2] `App.tsx` `AppFrame`에 건너뜀 상태를 둔다 — `skipPort = useMemo(expoSkipStorePort)`, `skippedDay: DayDate | null` 상태, 마운트와 `AppState → active`에서 `onboardingPorts.photo.photoPermission()`이 `granted`·`limited`면 `clearSkippedDay` + `null`, 아니면(읽기 실패 포함) `loadSkippedDay`로 상태 갱신(읽기 실패면 지우지 않는다, FR-012). `SettingsSection`에 `skippedDay`를 넘기고 거기서 `permissionTags.photos === "denied"`일 때만 `photoSkipText={skippedLineText(skippedDay, new Date())}`(SL3). 앱 열기 경로가 건너뛰었을 때 상태를 갱신할 `onSkipped(day)` 콜백도 만든다
- [ ] T013 [US2] SL3 소스 계약을 `__tests__/app/app-auto-write-source.test.ts`(logic `.ts`, 소스 읽기)에 쓴다 — `App.tsx`(주석 걷은 뒤)가 `photoSkipText`를 `permissionTags.photos === "denied"` 조건 아래에서만 넘기고, `clearSkippedDay`가 `granted`·`limited` 판정 뒤에만 불린다

**Checkpoint**: 건너뜀을 사용자가 안다.

---

## Phase 5: User Story 3 — 목표 시각이 지난 뒤 앱을 열면 쓰는 중으로 시작한다 (Priority: P2)

**Goal**: 시도 창 안에서 앱을 열면 홈이 쓸 날을 고른 채 054 쓰는 중으로 시작한다(한 실행에 한 번, 첫 실행과 겹치면 안 함, 백그라운드가 쥐고 있으면 조용히).

**Independent Test**: 목표 시각 = 지금 시, 사진 있는 오늘, 앱을 다시 열면 쓰는 중(spec US3).

- [ ] T014 [US3] OP2~OP6 테스트를 `__tests__/ui/home-auto-write.test.tsx`에 쓴다 — `DiaryHomeScreen`에 `autoWriteDay`·`claimAutoWrite`를 주면 목록이 읽힌 뒤 `claimAutoWrite` 1회 → 그 날이 고른 날(`onChooseDay`)·쓰는 중(`writing-paper`와 `stop-button`이 있다)·053 확인 대화상자 없음·`pipeline.run`이 그 날로 불림; `covered`면 `claimAutoWrite` 0회·쓰는 중 아님; `claimAutoWrite`가 `false`면 쓰는 중 아님; `resolve`가 `no-ready-character`면 `claimAutoWrite` 0회·쓰는 중 아님; `pipeline.run`이 `{ ok:false, stage:"already-running" }`이면 `failure-toast`가 없음, `stage:"generation"`이면 `failure-toast`가 있음
- [ ] T015 [US3] `src/ui/DiaryHomeScreen.tsx`를 고친다 — props `autoWriteDay?: DayDate | null`, `claimAutoWrite?: () => boolean`; effect가 `screen.kind === "list"`·`!covered`·`!materialConfirm`·`!calendarOpen`·`!settingsPromptOpen`·`!deciding.current`일 때 `resolve(day)`가 `resolved`이면 그때만 `claimAutoWrite()`를 부르고, 참이면 `setChosenDay(day)` → `generate({ ...params, day }, screen.items, { auto: true })`(`no-ready-character`면 claim하지 않는다 — FR-018 「시작하지 않은 판정은 세지 않는다」). `generate`의 셋째 인자 `{ auto?: boolean }` — `auto`이고 결과 `stage === "already-running"`이면 토스트를 세우지 않는다. `AppScreen`·`toWriting()`은 건드리지 않는다(054). T014 초록
- [ ] T016 [US3] `App.tsx`를 고친다 — `AppFrame`: `autoWriteClaimed = useRef(false)`, `claimAutoWrite = useCallback(() => { if (autoGenerateTried.current || autoWriteClaimed.current) return false; autoWriteClaimed.current = true; return true; }, [])` — 첫 실행 확인(FR-020)은 렌더가 아니라 이 콜백 안에서 ref를 읽는다(React Compiler는 렌더 중 ref 읽기를 막고 콜백 안 읽기는 허용한다). `DiarySection`은 `firstRunStage`가 `"done"`일 때만 그려지므로(그 전 단계는 `AppFrame`이 다른 화면을 돌려준다) 「첫 실행 흐름이 아직 끝나지 않음」은 저절로 성립한다. 040 effect(부모)는 같은 커밋에서 자식 effect보다 늦게 돌지만 `resolveAutoWrite`가 비동기라 홈이 `claimAutoWrite`를 부를 때는 이미 `autoGenerateTried`가 서 있다(research R5). `DiarySection`에 `autoDiarySettings={settingsValues?.autoDiary ?? null}`·`claimAutoWrite`·`onSkipped`를 넘긴다. `DiarySection`: 마운트·`AppState → active`(판정 입력이 아니라 다시 볼 때의 신호, FR-022)에서 설정이 있고 `wiring.ok`이면 `resolveAutoWrite({ settings, now: new Date(), listDiaryDays: () => store.listDays(), previewDay: wiring.previewDay, skipPort })` → `write`면 `autoWriteDay` 상태, `skip`+`no-photo-access`면 `onSkipped(day)`; `DiaryHomeScreen`에 `autoWriteDay`·`claimAutoWrite`를 넘긴다
- [ ] T017 [US3] OP1·OP7 소스 계약을 `__tests__/app/app-auto-write-source.test.ts`에 더한다 — `App.tsx`의 `claimAutoWrite`가 `autoGenerateTried`와 `autoWriteClaimed`를 읽고, `resolveAutoWrite`를 부르는 자리가 `DiarySection`(`firstRunStage`가 `"done"`일 때만 그려지는 마지막 `return`)에 있다; `src/schedule/` 전체 소스(주석 걷은 뒤)에 `AppState`가 없다; `DiarySection`이 `runAutoDiaryTask`를 부르지 않는다(R2); `DiaryHomeScreen.tsx`·`DiarySection`이 알림 통로(`present(`·`expoNotificationPort`)를 부르지 않는다(OP6, FR-015)

**Checkpoint**: 앱을 열면 쓴다.

---

## Phase 6: User Story 4 — 완성 알림이 누가 어느 날을 썼는지 말한다 (Priority: P3)

**Goal**: 백그라운드 완성 알림이 「{이름}{이|가} {M}월 {d}일 일기를 다 썼어요」 한 줄(본문 없음).

**Independent Test**: 가짜 알림 통로로 `runAutoDiaryTask` 성공 시 제목 문자열을 본다(spec US4).

- [ ] T018 [P] [US4] NT1·NT2 테스트를 `__tests__/schedule/notification-text.test.ts`에 쓴다 — 「금동이가 9월 14일 일기를 다 썼어요」, 「별님이 …」, 「Bot가 …」, 「10월 2일」(앞 0 없음), 문장 틀에 일기 본문·요약·감상·모델 이름 없음
- [ ] T019 [P] [US4] NT3 테스트로 `__tests__/schedule/notification-port.test.ts`의 N2를 갱신한다 — `NOTIFICATION_TITLE`·`NOTIFICATION_BODY` 상수 단언을 「`present(day, title)`가 받은 제목을 쓰고 `body`를 싣지 않는다, 문구 상수에 본문 참조·감상·모델 이름이 없다」로 바꾸고(020 N2 갱신 이유를 주석에), `trigger: null`·`data: { day }` 단언은 그대로
- [ ] T020 [US4] `src/schedule/notification-text.ts`(`autoWriteDoneText(name, day)` — `particleFor`(017)·날짜 문자열 분해)를 만들고 `src/schedule/notification-port.ts`의 `present(day, title)`로 바꿔 고정 제목·본문 상수를 걷는다. 머리 주석의 「고정 문구 2개」를 057로 고친다. T018·T019 초록
- [ ] T021 [US4] BG3 테스트(`__tests__/schedule/background-generation.test.ts`)를 더한 뒤 `src/schedule/task.ts`의 `sendCompletionNotification`이 이름을 구해 제목을 넘기게 한다 — 새 의존 `loadNames?: () => Promise<CustomNames>`(기본 `loadCustomNames(expoCharacterNamesPort())`, 실패면 `{}`), `displayNameOf(character, names)` → `notificationPort.present(day, autoWriteDoneText(name, day))`. 사용자 이름 「별님」이면 「별님이 …」

**Checkpoint**: 알림이 사실대로 말한다.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T022 `npm run test:logic`·`npm run test:ui`·`npm test`·`npm run lint`(eslint + tsc + 헌법 검사 + prettier)가 초록인지 본다. 020 `__tests__/schedule/settings.test.ts`(S7 — 설정 파일 필드 둘)가 그대로 초록이고 새 코드가 `saveAutoDiarySettings`를 부르지 않음을 확인한다(FR-029). 헌법 검사에 새 위반이 없는지(특히 `SCHEDULE_TOUCHES_PRODUCT_LAYER`) 확인하고, AW5·SK1에 위반을 주입해(예: `auto-write.ts`에 `count >= 1` 직접 판정, `skip-store.ts`에 `at: Date` 필드) 테스트가 잡는지 본 뒤 되돌린다
- [ ] T023 `.maestro/`에서 알림 문구 「오늘의 일기가 준비됐어요」를 단언하는 흐름이 있는지 찾아 새 문구로 고친다(없으면 그대로 — FLOWS 등록 변경 없음, research R8)
- [ ] T024 dev 실기기에서 quickstart 1~4를 돈다(재료 0 하루 헤드리스, 사진 권한 회수 하루 헤드리스 + 설정 보조 줄과 허용 후 사라짐, 앱 열기 쓰는 중, 완성 알림 문구). 결과·미확인을 spec 「미확인 잔여」(새 절)와 quickstart 아래에 적는다
- [ ] T025 `AGENTS.md`에 「057 — 자동 쓰기 규칙」 절을 더하고(판정 하나·두 경로, 건너뜀 기록 파일, 앱 열기 문, 알림 문구, 실기기 관측), 「저장소의 현재 상태」의 설정·개발자 줄에서 자동 쓰기 규칙을 「아직」 목록에서 뺀다

---

## Dependencies & Execution Order

- Phase 1 → Phase 2(T002·T003 병렬 → T004·T005) → US1(T006 → T007) → US2(T008·T009 병렬 → T010·T011 → T012 → T013) → US3(T014 → T015 → T016 → T017) → US4(T018·T019 병렬 → T020 → T021) → Polish.
- US2의 T012와 US3의 T016은 둘 다 `App.tsx`라 순서대로. US4의 T021과 US1의 T007은 둘 다 `task.ts`라 T007 뒤.
- US1·US2·US4는 Phase 2 뒤 서로 독립(파일이 겹치는 곳만 순서대로). US3은 T012의 `onSkipped`를 쓴다.

## Parallel Example

```text
T002 skip-store.test.ts   T003 auto-write.test.ts        (병렬)
T008 skipped-line.test.ts T009 settings-screen.test.tsx  (병렬)
T018 notification-text.test.ts  T019 notification-port.test.ts  (병렬)
```

## Implementation Strategy

- **MVP**: Phase 1·2 + US1 — 백그라운드가 지어 쓰지 않는다(S13의 본 목적).
- 다음 US2(설정 표시)로 건너뜀을 사용자에게 알리고, US3(앱 열기)로 늦은 백그라운드를 메우고, US4로 알림 문구를 사실대로 한다.
- 마지막에 전체 테스트·위반 주입·실기기·AGENTS.
