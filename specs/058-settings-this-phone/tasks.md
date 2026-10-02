# Tasks: 이 휴대폰 — 받은 모듈 용량과 일기 모두 지우기

**Input**: Design documents from `/specs/058-settings-this-phone/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/this-phone.md, quickstart.md

**Tests**: 헌법 「개발 방식」 — 계약을 먼저 정하고 테스트를 먼저 쓴다(MUST). 각 이야기의 테스트 태스크를 구현보다 먼저 하고 **실패를 확인한 뒤** 구현한다.
계약 번호(ST·WP·MS·HS·AF·UI·TX)는 [contracts/this-phone.md](contracts/this-phone.md)의 것이다.

**Organization**: 이야기별로 묶었다. US1(일기 모두 지우기)·US2(쓰는 중이면 먼저 멈춤)는 P1, US3(모듈 용량)는 P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일, 앞 태스크에 의존하지 않음

---

## Phase 1: Setup

- [ ] T001 브랜치가 `058-settings-this-phone`인지 `git branch --show-current`로 확인하고, `npm run test:logic`이 지금 초록인지 기준선을 본다(저장소 루트)

---

## Phase 2: Foundational (US1·US2·US3의 전제 — 문구와 묶음 자리)

- [ ] T002 TX1~TX3 계약 테스트를 `__tests__/ui/settings-this-phone.test.tsx`에 쓴다 — `SETTINGS_TEXT`의 `groupDevice` 「이 휴대폰」, `deviceModules` 「쓰는 모듈」, `deviceWipe` 「일기 모두 지우기」, `wipeBody` 「되돌릴 수 없어요. 이름과 설정은 남아요.」, `wipeConfirm` 「지우기」, `wipeCancel` 「취소」, `wipeBlocked` 「지금 자동으로 쓰는 중이라 지우지 못했어요.」 글자 단위, `wipeTitle(41)` = 「일기 41편을 모두 지울까요?」, `wipeTitle(1200)` = 「일기 1200편을 모두 지울까요?」(천 단위 구분 없음)
- [ ] T003 `src/ui/settings-text.ts`에 문구 일곱(보드 키 `settings.group.device`·`device.modules`·`device.wipe`·`wipe.title`·`wipe.body`·`wipe.confirm`·`wipe.cancel`)과 보드 밖 `wipeBlocked`(research R10, 「보드 밖」 주석), 함수 `wipeTitle(n: number): string`(`` `일기 ${n}편을 모두 지울까요?` `` — `toLocaleString` 금지)을 더하고 머리 주석에 058 줄을 단다. T002의 TX 단언 초록
- [ ] T004 `__tests__/ui/settings-screen.test.tsx`의 055 단언을 058에 맞게 고친다 — 「S1·SC-006」의 부재 목록에서 `/이 휴대폰/`·`/일기 모두 지우기/`를 빼고(말투·온보딩·권한 안내·받기는 그대로), 묶음 순서 단언을 `character`·`diary`·`perm`·`device`·`about`으로 바꾼다(UI1). 이 시점에는 실패해야 한다(T015가 초록으로 만든다)

**Checkpoint**: 문구가 있다. 화면·조합이 그것을 쓴다.

---

## Phase 3: User Story 1 — 일기를 모두 지운다 (Priority: P1) 🎯 MVP

**Goal**: 설정 → 「일기 모두 지우기」 → 확인 → 일기·사진 사본·알림 확인 기록을 지우고(잠금을 쥔 채) 설정을 닫아 홈의 오늘을 보인다. 이름·설정·모듈·건너뜀 기록은 남는다.

**Independent Test**: 메모리 대역으로 `wipeDiaries`를 돌려 일기 0편·사본 비움·알림 기록 `{}`·건너뜀 기록 그대로를 보고, 화면 테스트로 대화상자 문구·버튼·취소를 본다(spec US1).

### Tests (먼저 쓰고 실패를 확인한다)

- [ ] T005 [P] [US1] ST1~ST6 계약 테스트를 `__tests__/diary/store-remove-all.test.ts`에 쓴다 — 메모리 `FileSystemPort` 대역(이름 → 내용 맵 + `remove` 호출 기록)으로 `fileStore(fs).removeAll()` 뒤 `listDays()`가 `[]`; `2026-10-01.json`·`2026-10-01.json.writing`·`2026-09-30.json`(깨진 내용 `"{"`)은 지우고 `notes.txt`·`2026-10-01.bak`·`2026-10-01.json.tmp`는 `remove`를 부르지 않음; 한 이름의 `remove`가 던져도 나머지를 부르고 끝나서 첫 오류를 던짐; `memoryStore().removeAll()` 뒤 `listDays()` `[]`·`has()` 거짓; 소스 계약(주석 걷은 뒤): `expoFileSystemPort`의 `remove`가 `.exists` 확인 뒤 `.delete()`를 부른다
- [ ] T006 [P] [US1] WP1~WP8 계약 테스트를 `__tests__/app/wipe-diaries.test.ts`에 쓴다 — 호출 순서를 배열에 기록하는 대역들(`store.removeAll`·`clearPhotoCopies`·`notifiedPort.read/write`·`dismiss`·`LockPort.read/write/clear`)로: 잠금 파일에 지금 시각의 `{owner:"background"}`가 있으면 `{kind:"busy"}`이고 나머지 호출 0회(WP1); 잠금이 비었으면 순서가 `lock.read → lock.write → notified.read → removeAll → clearPhotoCopies → notified.write("{}" 상당) → dismiss(id1) → dismiss(id2) → lock.read → lock.clear`(WP2·WP3, `notified.json`에 두 날 `{notificationId:"id1",acknowledged:true}`·`{"id2",false}`); `removeAll`이 던지면 뒤 단계와 잠금 놓기를 하고 `{kind:"failed"}`(WP4); `dismiss`가 던져도 `wiped`(WP5); 잠금 owner가 `"screen"`이고 7분 전 `background` 잠금은 얻는다(WP6); 소스 계약(주석 걷은 뒤): `STALE_LOCK_MS`·`360000`·`6 * 60` 숫자가 없고 `acquireLock`·`releaseLock`을 `schedule/lock`에서 import(WP6), `skip-store`·`auto-diary`·`settings`·`geocoding`·`onboarding`·`character-names`·`custom-names` import가 없고 `Date.now`·`new Date`가 없다(WP7·WP8 — `nowMs`는 인자로)
- [ ] T007 [P] [US1] UI5·UI6 계약 테스트를 `__tests__/ui/dialog.test.tsx`(UI6)와 `__tests__/ui/settings-this-phone.test.tsx`(UI5)에 더한다 — `DialogActionButton`을 `tone` 없이 그리면 면 색이 `COLORS.accent`(기존 그대로), `tone="danger"`면 면 `COLORS.danger`·글자 `COLORS.dangerForeground`; `WipeConfirmDialog count={41}`의 제목·설명·버튼 글자(T003 문구), `wipe-confirm` 면 색 `COLORS.danger`, `wipe-cancel`·뒤로 가기가 `onCancel`, 덮개(`wipe-dialog-overlay`)를 눌러도 `onCancel`·`onConfirm`이 불리지 않음(`render-with-portal.tsx` 사용)
- [ ] T008 [P] [US1] UI1·UI3·UI4 화면 테스트를 `__tests__/ui/settings-this-phone.test.tsx`에 더한다 — 「이 휴대폰」 묶음(`settings-group-device`)이 `perm` 다음·`about` 앞; 행 순서 `settings-device-modules`·`settings-wipe`; `wipeEnabled` 참이면 `settings-wipe` 라벨 색 `COLORS.danger`이고 누르면 `onOpenWipe` 1회; 거짓이면 라벨 색 `COLORS.textMuted`, `accessibilityState.disabled === true`, `button` 역할이 없고 눌러도 `onOpenWipe` 0회; `wipeBlockedText`가 있으면 그 글자가 `COLORS.danger`로 지우기 행 안에 있다
- [ ] T009 [P] [US1] AF1·AF2·AF3 소스 계약 테스트를 `__tests__/app/app-wipe-source.test.ts`(logic)에 쓴다 — `App.tsx`를 주석 걷고 읽어: `requestWipe` 본문에서 토큰을 올리는 `setWipeRequest`와 `onWipeReady`를 기다리는 자리가 `wipeDiaries(` 호출보다 앞(AF1); `wipeDiaries(` 결과가 `"busy"`가 아닐 때만 `goHome(`·`setChosenDay(dayOf(`·`setDiaryKey(`(또는 key를 올리는 setter)를 부른다(AF2); `SettingsSection`이 `listDays()`와 `readModuleBytes(`를 마운트 effect에서 부르고 `onOpenWipe`에서 `listDays()`를 다시 부른다(AF3); `DiarySection`의 `key`에 058 키가 들어간다

### Implementation

- [ ] T010 [US1] `src/diary/store.ts`를 고친다 — `DiaryStore`에 `removeAll(): Promise<void>`(불변식 주석: 일기 파일만, 이름 판정은 `dayFromFileName`과 같은 규칙 + `.writing`), `FileSystemPort`에 `remove(name): Promise<void>`(없으면 조용히); `fileStore.removeAll`(T005 규칙 — `fs.list()` → `/^\d{4}-\d{2}-\d{2}\.json(\.writing)?$/` → 하나씩 `remove`, 오류를 모아 끝에 첫 오류를 던짐), `memoryStore.removeAll`(`Map.clear`), `expoFileSystemPort.remove`(`new File(dir, name)` → `exists`면 `delete()`). `tsc`가 짚는 테스트 대역을 고친다. T005 초록
- [ ] T011 [US1] `src/inference/on-device.ts`의 `VISION_CACHE_DIRECTORY`를 export하고(값 그대로, 주석에 058 사용처), `src/app/wipe-port.ts`를 만든다 — `clearPhotoCopies(): Promise<void>`(`expo-file-system` 지연 import, `new Directory(Paths.document, VISION_CACHE_DIRECTORY)`가 있으면 `list()`의 파일마다 `delete()`, 디렉터리는 남긴다, 없으면 조용히; 하나가 실패해도 나머지를 지우고 끝에 첫 오류를 던짐). 머리 주석에 research R5(미리 캡션 잔여 위험)
- [ ] T012 [US1] `src/app/wipe-diaries.ts`를 만든다 — `WipeOutcome = { kind: "wiped" } | { kind: "busy" } | { kind: "failed"; reason: string }`, `WipeDeps = { store: Pick<DiaryStore, "removeAll">; clearPhotoCopies(): Promise<void>; notifiedPort: NotifiedStorePort; dismiss(id: string): Promise<void>; lockPort: LockPort; nowMs: number }`, `wipeDiaries(deps)`(research R2 순서: `acquireLock(lockPort, "screen", nowMs)` → null이면 busy / `loadNotifiedState` → `removeAll` → `clearPhotoCopies` → `saveNotifiedState(port, {})` → 각 `notificationId` `dismiss`(삼킴) → `finally releaseLock`; 3~5단계 오류는 모아 `failed`, 나머지 단계는 계속). 시각·편수를 쓰지 않는다(FR-017). T006 초록
- [ ] T013 [US1] `src/ui/components/Dialog.tsx`의 `DialogActionButton`에 `tone?: "accent" | "danger"`(기본 `accent`)를 더한다 — `danger`면 면 `COLORS.danger`, 글자 `COLORS.dangerForeground`. 머리 주석에 research R8(저장소 소유자 확인 대상). T007 UI6 초록
- [ ] T014 [US1] `src/ui/WipeConfirmDialog.tsx`를 만든다 — `OverwriteConfirmDialog`와 같은 모양: `ConfirmDialog`(testID `wipe-dialog`), 제목 `wipeTitle(count)`, 설명 `wipeBody`, 동작 `DialogActionButton tone="danger" testID="wipe-confirm"` 「지우기」, 취소 `DialogCancelButton testID="wipe-cancel"` 「취소」, `onCancel`이 뒤로 가기. props에 일기·모델 정보가 없다. T007 UI5 초록
- [ ] T015 [US1] `src/ui/SettingsScreen.tsx`를 고친다 — `Row`에 `labelTone?: "default" | "danger" | "muted"`·`disabled?: boolean`(비활성이면 `Pressable`이 아니라 `View` + `accessibilityState={{ disabled: true }}`, 라벨 `textMuted`; research R9 — `Pressable` `disabled={false}` 함정 회피), props `wipeEnabled: boolean`·`onOpenWipe: () => void`·`wipeBlockedText?: string`·`moduleSizeText: string | null`(US3에서 값이 들어온다 — 여기서는 행만), 「권한」 다음·「정보」 앞에 `Group label={groupDevice} testID="settings-group-device"` — `Row testID="settings-device-modules"`(누를 수 없음, `Value text={moduleSizeText ?? ""}`, › 없음), `Row testID="settings-wipe"`(`labelTone` `danger`/`muted`, `disabled={!wipeEnabled}`, `onPress={onOpenWipe}`, `wipeBlockedText`가 있으면 `hint` + `hintTone="danger"`). 머리 주석의 「「이 휴대폰」(§3.4)·말투(S1)는 없다」를 058로 고친다. T004·T008 초록
- [ ] T016 [US1] `App.tsx`를 고친다(US1 부분) — `AppFrame`: `wipeRequest` state(0)·`diaryKey` state(0, `DiarySection` `key`를 `` `diary-${autoGeneratedToken}-${diaryKey}` ``로)·`wipeReady` 대기(`useRef<{ token: number; resolve: () => void } | null>`)·`onWipeReady(token)`(대기 중인 같은 토큰이면 resolve)·`requestWipe(): Promise<WipeOutcome>`(토큰을 올리고 대기 → `wipeDiaries({ store: fileStore(expoFileSystemPort("diary")), clearPhotoCopies, notifiedPort: expoNotifiedStorePort(), dismiss: (id) => expoNotificationPort().dismiss(id), lockPort: expoLockPort(), nowMs: Date.now() })` → `busy`가 아니면 `goHome()`·`setChosenDay(dayOf(new Date()))`·`setDiaryKey((k) => k + 1)` → 결과를 돌려줌); `DiarySection`에 `wipeRequest`·`onWipeReady` 전달; `SettingsSection`에 `requestWipe` 전달 + 마운트 때 `store.listDays()`로 편수(`count: number | null`, 실패 `null`) + 로컬 `wiping`·`wipeBlocked`·`wipeCount`(열린 대화상자의 편수) + `onOpenWipe`(다시 세어 0이면 `count`를 0으로 두고 열지 않음, 아니면 대화상자) + `WipeConfirmDialog` 렌더(확정 → 대화상자 닫기 → `wiping=true` → `await requestWipe()` → 살아 있으면(언마운트 가드 `alive` ref — 지우는 동안 설정을 닫을 수 있다, spec Edge Case) `wiping=false`, `busy`면 `wipeBlocked=true`) + `SettingsScreen`에 `wipeEnabled={count !== null && count > 0 && !wiping}`·`wipeBlockedText`. T009 AF1~AF3 초록(용량 부분은 US3의 T024와 함께)

**Checkpoint**: US1이 기기 없이 돈다 — 홈이 쓰는 중이 아닐 때의 지우기.

---

## Phase 4: User Story 2 — 쓰는 중에 지우면 먼저 멈춘다 (Priority: P1)

**Goal**: 홈이 쓰는 중이면 054 그만두기로 멈추고 생성 `Promise`가 끝난 뒤에 지운다. 토스트 없음.

**Independent Test**: 화면 테스트로 `pipeline.run`을 붙잡은 채 `wipeRequest`를 올려 `stop()` 호출 → run resolve 뒤에만 `onWipeReady`가 불리는지 본다(spec US2).

### Tests

- [ ] T017 [P] [US2] HS1~HS5 화면 테스트를 `__tests__/ui/home-wipe.test.tsx`에 쓴다 — `home-auto-write.test.tsx`의 대역 조립을 따라: (HS1) 쓰기를 시작해 `pipeline.run`을 손으로 resolve하는 Promise로 붙잡고 `rerender`로 `wipeRequest`를 1로 올리면 `stop` 1회, 그때까지 `onWipeReady` 0회, run을 `interrupted` 실패로 resolve한 뒤 `onWipeReady(1)` 1회; (HS2) 그 뒤 토스트(`failure-toast`)가 없다; (HS3) 쓰는 중이 아닐 때 `wipeRequest` 2 → `onWipeReady(2)` 곧바로; (HS4) 같은 값으로 다시 그려도 두 번 부르지 않고, 마운트 때 `wipeRequest={3}`으로 처음 그리면 부르지 않는다; (HS5) `covered` 참에서도 응답한다
- [ ] T018 [P] [US2] HS6 소스 계약을 `__tests__/app/app-wipe-source.test.ts`에 더한다 — `DiarySection` 본문(주석 걷은 뒤)에 홈을 그리지 않는 갈래(`DiaryHomeScreen`이 없는 `return`)가 있으면 그 전에 `wipeRequest` 변화에 `onWipeReady`를 곧바로 부르는 effect가 있다

### Implementation

- [ ] T019 [US2] `src/ui/DiaryHomeScreen.tsx`를 고친다 — props `wipeRequest?: number`·`onWipeReady?: (token: number) => void`; `inFlight = useRef<Promise<void> | null>(null)`을 `generate`가 자기 본문 Promise로 채우고 `finally`에서 비운다; 마운트 때의 `wipeRequest`를 `answeredWipe` ref에 담아 응답하지 않고, 값이 바뀌면(effect — `covered`와 무관) `answeredWipe`를 갱신한 뒤 `running.current`면 `cancelled.current = true` → `await stop?.().catch(() => {})` → `await inFlight.current?.catch(() => {})` → `onWipeReady(token)`, 아니면 곧바로 `onWipeReady(token)`. `setScreen`은 하지 않는다(곧 다시 마운트된다). `react-hooks/set-state-in-effect`·immutability 규칙을 지킨다(공유값 수정 함수 선언 순서). T017 초록
- [ ] T020 [US2] `App.tsx`의 `DiarySection`을 고친다 — `wipeRequest`·`onWipeReady`를 받아 `DiaryHomeScreen`에 넘기고, 홈을 그리지 않는 갈래(조립 실패 등)에서는 `wipeRequest`가 바뀌면 곧바로 `onWipeReady`를 부르는 effect를 둔다(마운트 값에는 응답하지 않음). T018 초록

**Checkpoint**: 쓰는 중에도 지우기가 올바른 순서로 돈다.

---

## Phase 5: User Story 3 — 받은 모듈이 차지하는 용량을 본다 (Priority: P2)

**Goal**: 「쓰는 모듈」 값이 필수 모듈 파일 바이트 합을 1000 기준으로 옮긴 문자열이다. 못 읽으면 비운다.

**Independent Test**: `formatModuleBytes` 경계값과 `readModuleBytes`의 키별 호출을 보고, 화면 테스트로 값이 그려지는지 본다(spec US3).

### Tests

- [ ] T021 [P] [US3] MS1·MS2 계약 테스트를 `__tests__/app/module-size.test.ts`에 쓴다 — `formatModuleBytes`: `2_004_831_040`→「2.0GB」, `1_000_000_000`→「1.0GB」, `999_499_999`→「999MB」, `999_500_000`→「1.0GB」, `480_000_000`→「480MB」, `0`→「0MB」, `1_950_000_000`→「2.0GB」, `12_345_678_901`→「12.3GB」; `readModuleBytes`: 대역 `bytesUsed`가 `v1`·`v2`·`a1`로 한 번씩 불리고 합을 주며(키 목록은 `ESSENTIAL_ASSET_KEYS`와 같다), 하나가 던지면 던진다
- [ ] T022 [P] [US3] UI2·MS3 테스트를 `__tests__/ui/settings-this-phone.test.tsx`에 더한다 — `moduleSizeText="2.0GB"`면 `settings-device-modules` 안에 「2.0GB」, `null`이면 값 글자가 비어 있다(「0」·「GB」 없음), 행에 `button` 역할·`settings-chevron`이 없다; 소스 계약: `src/ui/` 아래 어느 파일도 `app/module-size`를 import하지 않는다

### Implementation

- [ ] T023 [US3] `src/app/module-size.ts`를 만든다 — `formatModuleBytes(bytes: number): string`(FR-004: 1000 기준, `bytes >= 1e9`면 `(bytes / 1e9).toFixed(1)` + 「GB」, 아니면 `Math.round(bytes / 1e6)`이 1000이면 「1.0GB」, 아니면 그 값 + 「MB」; 띄어쓰기·천 단위 구분 없음), `readModuleBytes(files: Pick<ModelFilePort, "bytesUsed">): Promise<number>`(`ESSENTIAL_ASSET_KEYS`를 `src/onboarding/essential-assets`에서 import해 각 `bytesUsed` 합). 머리 주석에 research R7·`UI_TOUCHES_ASSET`. T021 초록
- [ ] T024 [US3] `App.tsx`의 `SettingsSection`에서 마운트 때 한 번 `readModuleBytes(expoModelPorts().files)` → `formatModuleBytes` → `moduleSizeText`(던지면 `null`, 언마운트 뒤 setState 금지)를 `SettingsScreen`에 넘긴다. T009 AF3·T022 초록

**Checkpoint**: 세 이야기가 기기 없이 모두 돈다.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T025 `npm test`와 `npm run lint`(eslint + tsc + 헌법 검사 + prettier)를 돌려 초록을 확인한다. `UI_TOUCHES_ASSET`이 `src/ui/`에서 잡히지 않는지 본다
- [ ] T026 위반 주입 넷을 돌려 잡히는지 확인하고 되돌린다(quickstart 「기기 없이」) — (1) `wipe-diaries.ts`의 잠금 확인 제거 → WP1 실패 (2) `DiaryHomeScreen`에서 `await inFlight.current` 제거 → HS1 실패 (3) `removeAll`의 이름 정규식을 `.json`으로 끝나는 모든 이름으로 넓힘 → ST2 실패 (4) `DialogActionButton` 기본 `tone`을 `danger`로 → UI6 실패. 각 주입은 치환이 실제로 적용됐는지 먼저 단언한다(AGENTS)
- [ ] T027 Maestro 영향 확인 — `.maestro/settings-time-place.yml`이 「정보」 묶음·버전 행에 스크롤로 기대는 단계가 있으면 새 묶음 때문에 깨지지 않는지 소스를 읽어 보고, 필요하면 대상을 고친다. 지우기 흐름은 `FLOWS`에 넣지 않는다(research R12)
- [ ] T028 dev 실기기 확인(quickstart 0~4) — **0. 백업을 먼저 하고 내용을 확인한 뒤에만** 진행, 1 용량·편수, 2 쓰는 중에 지우기(180초 대기 뒤 파일 0개), 3 남는 것·흐린 행, 4 복원 후 편수 대조. 결과(시각·값)를 `specs/058-settings-this-phone/quickstart.md` 끝 「실기기 결과」에 적는다. `pm clear` 금지
- [ ] T029 `AGENTS.md`에 「058 — 이 휴대폰」 절을 더하고(지우기 순서·잠금·홈 멈춤 응답·용량 1000 기준·빨간 버튼 결정·실기기에서 드러난 것), 「저장소의 현재 상태」의 설정 개편 줄에서 「이 휴대폰」을 완료 쪽으로 옮긴다

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1(Phase 3) → US2(Phase 4) → US3(Phase 5) → Polish.
- US2는 US1의 `requestWipe`(T016)에 기댄다(요청 토큰을 내려보내는 자리). US3는 US1의 행(T015)에 값만 넣는다.
- 각 이야기 안에서 테스트([P]) → 구현 순서. `App.tsx`를 고치는 T016·T020·T024는 같은 파일이라 차례대로.

## Parallel Example

```text
# US1 테스트 중 서로 다른 파일인 셋(T007·T008은 settings-this-phone.test.tsx·dialog.test.tsx에 더하므로 차례대로):
T005 __tests__/diary/store-remove-all.test.ts
T006 __tests__/app/wipe-diaries.test.ts
T009 __tests__/app/app-wipe-source.test.ts
# US3 테스트:
T021 __tests__/app/module-size.test.ts
```

## Implementation Strategy

- MVP는 US1(쓰는 중이 아닐 때의 지우기)이다 — 그것만으로 「일기 모두 지우기」가 성립한다. 다만 US2 없이 배포하면 쓰는 중에 지운 뒤 일기가 저장될 수 있으므로 **US1·US2를 함께 마친 뒤에만 완료로 본다.**
- US3는 독립적이다(값 하나).
- 실기기 확인(T028)은 셋을 마친 뒤 한 번에 한다.
