# Tasks: 진단 화면 개편 — 보드 6h의 일곱 묶음

**Input**: Design documents from `/specs/060-diagnostics-screen/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/diagnostics.md, quickstart.md

**Tests**: 헌법 「개발 방식」 — 계약을 먼저 정하고 테스트를 먼저 쓴다(MUST). 각 이야기의 테스트 태스크를 구현보다 먼저 하고 **실패를 확인한 뒤** 구현한다.
계약 번호(DT·WF·DI·DV·DS·HR·TO·AR·RP·CC)는 [contracts/diagnostics.md](contracts/diagnostics.md)의 것이다.

**Organization**: 이야기별로 묶었다. US1(환경·저장 점검)·US2(사진 권한·신호 프로브)·US3(지금 한 번 써 보기)는 P1, US4(자동 쓰기 지금 실행)·US5(프롬프트 미리보기)·US6(최근 실패)는 P2.
`DiagnosticsScreen.tsx`는 한 파일이라 같은 파일을 만지는 이야기 사이는 순서대로 한다(병렬 표시 없음).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일, 앞 태스크에 의존하지 않음

---

## Phase 1: Setup

- [ ] T001 `git branch --show-current`가 `060-diagnostics-screen`인지 확인하고 `npm run test:logic`·`npm run test:ui`가 지금 초록인지 기준선을 본다(저장소 루트)
- [ ] T002 삭제·변경 대상을 참조하는 곳을 센다 — `Grep`으로 `GenerationProbe|AutoDiaryTriggerButton|PermissionPanel|SignalProbe|PromptPreviewPanel|characterModels|storage-check|checkStorage`를 `src/ __tests__/ scripts/ .maestro/ App.tsx`에서 찾아 결과를 `specs/060-diagnostics-screen/research.md` 끝 「참조 목록」에 파일:줄로 붙인다(R10 — 계약을 잠그던 소스 검사가 삭제된 파일을 가리키는 곳을 먼저 안다)

---

## Phase 2: Foundational (모든 이야기의 전제 — 문구·순수 판정·기록·보고서)

- [ ] T003 DT1~DT4 테스트를 `__tests__/ui/diagnostics-text.test.ts`에 쓴다(`.ts` — 순수 문자열) — `src/ui/diagnostics-text.ts`의 `DIAGNOSTICS_TEXT`가 §3.6 KO 문구표와 글자 단위로 같다(contracts DT1에 적힌 키 전부: `title` 「진단」, `env` 「환경」, `build` 「빌드」, `device` 「기기」, `inference` 「추론 위치」, `inferenceCpu` 「기기 · CPU」, `storage` 「저장 점검」, `storageOk(n)` 「{n}편 · 정상」, `storageBad(n,k)` 「{n}편 · {k}편 읽기 실패」, `photoPerm` 「사진 권한」, `photoRead` 「사진 읽기」, `photoLocation` 「사진 위치 정보」, `photoScope` 「범위」, `scopeAll` 「전체」, `scopeSelected` 「선택한 사진만」, `probe` 「신호 프로브 · 오늘」, `probeRefresh` 「다시 읽기」, `probePhotos` 「사진」, `probePlaces` 「장소」, `probeSteps` 「걸음」, `probeBattery` 「배터리」, `probeNetwork` 「연결」, `probeUnknown` 「모름」, `prompt` 「입력 프롬프트 미리보기」, `preset1` 「프리셋 1 · 신호 없음」, `preset2` 「프리셋 2 · 사진 있음」, `gen` 「생성」, `tryOnce` 「지금 한 번 써 보기」, `runAuto` 「자동 쓰기 지금 실행」, `tryOnceToast` 「진단에서 쓰기를 시작했어요.」, `failures` 「최근 실패」, `failModule` 「모듈을 불러오지 못함」, `failPhotos` 「사진을 읽지 못함」, `failEmpty` 「글이 비어 있음」, `failSave` 「저장하지 못함」). 표 밖 문구(`failUnwritten` 「일기를 쓰지 못함」, `autoRan` 「썼음」, `autoSkipped` 「건너뜀」, `autoFailed` 「실패」, `failuresEmpty` 「아직 실패가 없어요」, `autoRunning` 「도는 중…」)는 글자 단위로 잠그되 소스 주석에 `// 보드 밖`이 있는지 소스 계약으로 본다(DT2) — 모델 이름·파라미터 정규식(DT4) — 실패 확인(파일 없음)
- [ ] T004 `src/ui/diagnostics-text.ts`를 새로 만든다(`DIAGNOSTICS_TEXT` 객체 + `storageOk(n: number)`·`storageBad(n: number, k: number)` — `toLocaleString` 금지; 머리 주석에 060·보드 `6h`·`6k`·`diag.*`·보드 밖 구분). T003 초록
- [ ] T005 [P] WF1~WF6·WF8 테스트를 `__tests__/app/write-failures.test.ts`에 쓴다 — `src/app/write-failures.ts`: `writeFailureReasonFor(result)` 갈래 판정 표 전부(contracts WF1: storage→save; request-build·model-not-ready→module; signals→photos; vision `vision-failed: not-ready`→module, 그 밖 vision→photos; generation `model-load-failed`→module, `rejected: empty`→empty, `rejected: echo|language|unfinished`·`timed-out`·`interrupted`·`generation-failed`·`backend-unavailable`·`not-implemented`→unwritten; `day-not-closed`·모르는 단계·모르는 reason→unwritten); `already-running`·성공은 기록하지 않음(WF2); `recordWriteFailure(port, result, at)`가 맨 앞에 더하고 10건 초과 시 가장 오래된 것부터 빠짐·같은 갈래 연속도 각각 한 줄(WF4); `loadWriteFailures`는 없음·깨진 JSON·`items`가 배열 아님·통로 예외는 빈 목록, 모르는 `reason`·해석 안 되는 `at`인 항목만 버림(WF5); 읽기·쓰기 통로가 던져도 `recordWriteFailure`가 던지지 않음(WF6); 소스 계약(주석 제외) — 직렬화 객체 키가 `reason`·`at`뿐이고 `duration|elapsed|timing|token|\bms\b` 어휘가 없음(WF3), 통로 파일 이름이 `write-failures.json` 하나이고 `auto-diary`·`auto-write-skipped`·`onboarding`·`notified` 문자열이 없음(WF8), 판정이 reason의 앞 토큰·`vision-failed`·`rejected` detail만 보고 문구 전체 비교(`===` 긴 문장)가 없음. 정규식이 든 테스트는 작성 뒤 파일을 다시 읽어 `\b`가 백스페이스로 박히지 않았는지 확인 — 실패 확인(파일 없음)
- [ ] T006 `src/app/write-failures.ts`를 새로 만든다 — 타입 `WriteFailureReason = "module"|"photos"|"empty"|"save"|"unwritten"`, `WriteFailure = { reason; at: Date }`(data-model §1: 최신이 앞·최대 10건·필드 `reason`·`at` 둘뿐), `WriteFailurePort { read(): Promise<string|null>; write(s: string): Promise<void> }`, `writeFailureReasonFor`, `loadWriteFailures`, `recordWriteFailure`(`already-running`·성공은 건너뜀, 임시 파일 → 이름 바꾸기는 `expoWriteFailurePort`에서), `expoWriteFailurePort()`(`preferences/write-failures.json`, `skip-store.ts`의 `openDirectory` 방식 — 지연 import). `src/ui/`·`diary/pipeline`을 import하지 않는다(CC4). T005 초록
- [ ] T007 [P] DI1~DI3 테스트를 `__tests__/app/diary-inspect.test.ts`에 쓴다 — `inspectDiaries(store)`: 일기 N편이 모두 읽히면 `{ kind: "done", total: N, unreadable: 0 }`; `load`가 던지거나 `null`인 날은 `unreadable`에 셈; `listDays()`가 던지면 `{ kind: "unavailable" }`(0편·정상으로 적지 않음); 인자 타입이 `Pick<DiaryStore, "listDays" | "load">`뿐이라 쓰기 메서드를 부를 수 없음(소스 계약 DI3) — 실패 확인
- [ ] T008 `src/app/diary-inspect.ts`를 새로 만든다(`DiaryStore`의 읽기 둘만 받는 순수 조합). T007 초록
- [ ] T009 [P] DV1~DV7 테스트를 `__tests__/app/diagnostics-view.test.ts`에 쓴다 — `src/app/diagnostics-view.ts`: `environmentLines({ buildLabel, androidRelease, inference })`(DV1: 기기 추론 → `DIAGNOSTICS_TEXT.inferenceCpu`, 로컬 서버 → 「로컬 서버」, 고르지 못함 → 「선택되지 않음」, 릴리스 `null`이면 기기 값 `null`); `probeCells(signals)`(DV2: 항상 다섯·순서 사진·장소·걸음·배터리·연결, 걸음·배터리·연결은 입력이 `known`/`none`이어도 `unknown`·「모름」; DV3: 사진 `known`→숫자 텍스트·`none`→「없음」·`unknown`→「모름」(0 아님), 사진 `none`이면 장소도 「없음」, 사진 `unknown`이면 장소를 「없음」으로 승격하지 않음); `photoPermissionLines({ permission, location })`(DV4: 읽기 허용됨/일부 허용/허용 안 함, 위치 정보 `ok`→허용됨·`denied`→허용 안 함·`unknown`/`no-photo`→`null`, 범위 `granted`→전체·`limited`→선택한 사진만·그 밖 `null`); `canRequestPhoto(state)`(DV5: `denied`·`undetermined`만 참); `failureLines(items, now)`(DV6: 최신이 위·갈래 → 문구 다섯·시각 `M월 d일 HH:mm` 한 가지, 항목에 다른 필드 없음); 소스 계약 — `new Date()`·`Date.now()`가 없음(DV7, 주석 제외); 소스 계약(DV8) — `src/inference/llama-port.ts`에 `GPU_LAYERS = 0`이 있고 `diagnostics-view.ts`가 「기기 · CPU」를 기기 추론 갈래에서만 씀(상수가 0이 아니게 바뀌면 이 테스트가 깨져 문구를 같이 고치게 한다). 정규식 테스트는 파일을 다시 읽어 확인 — 실패 확인
- [ ] T010 `src/app/diagnostics-view.ts`를 새로 만든다(순수 함수 — 설정의 `permissionTagFor` 어휘를 재사용하고, `SETTINGS_TEXT`가 아니라 진단 문구를 쓴다). T009 초록
- [ ] T011 [P] RP1~RP3 테스트를 `__tests__/diagnostics/report.test.ts`에서 고친다 — `DiagnosticReport`가 `environment`·`inferenceLocation`·`promptPreviews`만 갖는다(`characterModels`·`moduleStatus`·`storage`·`failures` 없음, RP1); 소스에 `checkStorage`·`isAvailable` 호출이 없고 파일을 쓰지 않음(RP2); 022 PP1·PP6은 그대로(`__tests__/diagnostics/prompt-preview.test.ts` 무변경으로 통과) — 실패 확인
- [ ] T012 `src/diagnostics/report.ts`·`src/diagnostics/types.ts`에서 `characterModels`·`moduleStatus`·`storage`·`failures`와 그 수집 코드(`collectCharacterModels`·`checkStorage` 호출·`selection.backend.isAvailable()`)를 걷고, 쓸 곳이 없어진 `src/diagnostics/storage-check.ts`를 삭제한다(전용 테스트 파일은 없다 — 참조는 `report.test.ts`와 `src/diary/store.ts`의 주석뿐이므로 그 주석의 옛 이름도 고친다). `npx tsc --noEmit`이 짚는 만큼만 따라 고친다(037·042 방식 — 손으로 찾지 않는다). T011 초록·`npm run test:logic` 초록

**Checkpoint**: 문구·판정·기록·보고서가 서 있다. 화면은 아직 옛 것.

---

## Phase 3: User Story 1 - 환경과 저장 상태를 한눈에 본다 (Priority: P1)

**Goal**: 새 `DiagnosticsScreen` 틀(제목·묶음)에 「환경」과 「저장 점검」이 보드대로 그려진다.

**Independent Test**: 개발 환경에서 진단을 열어 환경 묶음의 값 셋과 저장 점검 갱신을 본다.

- [ ] T013 [US1] DS2·DS8·DS9·DS10·DS11 테스트를 `__tests__/ui/diagnostics-screen.test.tsx`에 쓴다 — `DiagnosticsScreen`이 값·핸들러 props(`environment`, `storage`, `onInspectStorage`, …)를 받아 `diagnostics-group-env`·`diagnostics-group-storage`를 이 순서로 그린다(일곱 묶음 순서 전체 단언 DS1은 T031이 쓴다 — 이 시점엔 환경·저장 점검 둘의 순서와 testID만); 「저장 점검」 행을 누르면 `onInspectStorage`가 불리고 값(`diagnostics-storage-value`)이 보이며 점검 전엔 비어 있음(DS2); 기기 값이 `null`이면 행 값이 빔; 저장 점검 `unavailable`이면 값이 비고 「정상」 문구가 아님(FR-006); 소스 계약(주석 제외, DS8) — 두 파일(`DiagnosticsScreen.tsx`·`DiagnosticsParts.tsx`)에 `expo-`·`createAppPipeline`·`runAutoDiaryTask`·`schedule/`·`diary/pipeline`·`diary/prompt`·`signals/`·`models/`·`vision/` import가 없고 모델 이름 문자열이 없음; 소스 계약(FR-021) — `DiagnosticsScreen.tsx`·`DiagnosticsParts.tsx`·`diagnostics-view.ts`·`diary-inspect.ts`에 `duration|elapsed|timing|\btokens?\b` 어휘가 없음(주석 제외; 한글 라벨 「실측 토큰 아님」은 ASCII가 아니라 대상 밖); 소스 계약(DS9) — 행 스타일에 `flexWrap`; 저장 점검 중 화면이 언마운트되면 결과가 상태를 바꾸지 않음(언마운트 뒤 `onInspectStorage` Promise를 풀어도 경고·갱신 없음); RNTL 14는 `render`에 `await`, 쿼리는 `screen.*` — 실패 확인
- [ ] T014 [US1] `src/ui/DiagnosticsScreen.tsx`를 값·핸들러 props(`DiagnosticsScreenProps`)를 받는 형태로 다시 쓴다 — 최상단의 `createAppPipeline(currentEnvironment())`·`expoPhotoPort()`·`PROBE_CHARACTER` 모듈 상수와 `collectReport` 호출을 걷고, 055 `Group`·`Row`·`Value`(`SettingsScreen`에서 import)로 「환경」(빌드·기기·추론 위치)·「저장 점검」 묶음을 그린다. 나머지 묶음 자리는 이후 이야기가 채운다. 틀은 기존 `SettingsFrame`을 `App.tsx`가 감싼다(059 그대로). 필요하면 `src/ui/DiagnosticsParts.tsx`를 만든다. T013의 이 이야기 몫 초록
- [ ] T015 [US1] `App.tsx`의 진단 겹을 새 props로 잇는다(진단 겹의 값·핸들러는 `App.tsx` 안의 `DiagnosticsLayer` 컴포넌트가 만든다 — 059 DG2·DV5가 그대로 통과하는지 `npm run test:ui -- developer-screen`으로 확인: 진단 행은 개발 환경에서만 있고 배포에는 없다) — 환경 줄은 `environmentLines({ buildLabel: buildLabelFor(...), androidRelease: Platform.constants.Release, inference })`(추론 위치는 `collectReport`의 `inferenceLocation`에서 — `DiagnosticsLayer`가 마운트 때 한 번 읽는다), 저장 점검은 `inspectDiaries(wiring.store)`를 `onInspectStorage`에서 부르는 로컬 state(`idle`→`done`/`unavailable`; 언마운트 뒤 결과는 버린다). 환경은 `useState(() => currentEnvironment())` 한 번(055 결함). 059 DG2(개발자 화면이 `DiagnosticsScreen`을 import하지 않음)가 그대로 통과하는지 본다

**Checkpoint**: 진단이 새 틀로 열리고 US1이 기기 없이 초록.

---

## Phase 4: User Story 2 - 사진 권한과 신호를 따로 풀어 본다 (Priority: P1)

**Goal**: 「사진 권한」(읽기·위치 정보·범위)과 「신호 프로브 · 오늘」(다섯 칸) 묶음.

**Independent Test**: 부분 허용 기기에서 세 행의 값, 신호 다섯 칸과 「다시 읽기」.

- [ ] T016 [US2] DS3·DS4 테스트를 `__tests__/ui/diagnostics-screen.test.tsx`에 더한다 — 사진 읽기 행은 요청 가능 상태(`canRequestPhoto`)에서만 `onRequestPhoto`를 호출하고 그 밖에서는 `onPress`를 넘기지 않음(058 규칙 — `fireEvent.press`가 합성 부모까지 올라가므로 `accessibilityState.disabled`와 호출 0회 모두 단언); 위치 정보·범위 행은 값이 `null`이면 빔; 신호 프로브 다섯 칸이 `diagnostics-probe-photos|places|steps|battery|network`로 항상 렌더되고 「모름」 칸은 `textMuted` 글자·`neutral-200` 면 토큰을 쓰며 값 글꼴이 고정폭이 아님(스타일 단언); 「다시 읽기」 → `onRefreshProbe`; 소스 계약 — `DIAGNOSTICS_HIDES_AXES`가 요구하는 다섯 축 이름이 렌더 쪽에 모두 있음 — 실패 확인
- [ ] T017 [US2] `src/ui/DiagnosticsScreen.tsx`·`DiagnosticsParts.tsx`에 「사진 권한」(`diagnostics-group-photo`)과 「신호 프로브 · 오늘」(`diagnostics-group-probe`) 묶음을 그린다(`ProbeCell` 부품 — 숫자 칸/모름 칸). T016 초록
- [ ] T018 [US2] `App.tsx`에 사진 권한·신호 값을 잇는다 — `photoPort = expoPhotoPort()`(진단 겹 마운트 때 한 번), `photoPermission()`·`photoLocationProbe(photoPort, Date.now())`·`collectDaySignals(photoPort, dayOf(new Date()))`를 `photoPermissionLines`·`probeCells`로 옮겨 props로 준다. 마운트 때 한 번 읽고 `onRefreshProbe`에서만 다시 읽는다(`AppState`·타이머로 읽지 않는다 — DS4). 읽기 행 `onRequestPhoto`는 `requestPhotoPermission()` 뒤 값을 다시 읽는다

---

## Phase 5: User Story 3 - 지금 한 번 써 보기로 홈에서 일기를 쓴다 (Priority: P1)

**Goal**: 진단의 버튼이 홈의 오늘 쓰는 중으로 이어진다.

**Independent Test**: 개발 환경에서 「지금 한 번 써 보기」를 눌러 홈에서 쓰는 중이 시작되고 쓴 날로 끝난다.

- [ ] T019 [US3] HR1~HR8 테스트를 `__tests__/ui/diary-home-write-request.test.tsx`에 쓴다 — `DiaryHomeScreen`에 새 옵셔널 props `writeRequest?: { id: number } | null`·`onWriteRequestHandled?: (id: number) => void`: 목록을 읽은 뒤 `covered` 아님·대화상자 없음·판정 중 아님에서 `resolve`가 `resolved`면 `generate`(= 파이프라인 대역의 `run`)가 시작되고 `onWriteRequestHandled(id)` 한 번(HR1); 오늘 일기가 이미 있어도 `confirm-overwrite` 화면 없이 시작하고 재료 확인 대화상자도 안 뜸(HR2); 이미 쓰는 중이면 `run`을 더 부르지 않고 `onWriteRequestHandled`만 호출(HR3); `covered`이면 기다렸다가 풀리면 시작(HR4); 같은 `id`는 리렌더에도 한 번만(HR5); `no-ready-character`면 막힘 화면으로 가고 요청이 비워짐(HR6); 054 `AppScreen` 불변 계약(`Object.keys(toWriting())`이 `["kind"]`, 007 S1·009 I7·012 C3 테스트)이 그대로 통과(HR7); `claimAutoWrite`가 이미 거짓이어도 시작(HR8); 파이프라인 대역이 실패 결과를 돌려주면 주입한 `recordFailure`가 그 결과로 한 번 불리고, 쓰는 중 그만두기(`stop`)로 끝나면 0번 불림(HR9 — FR-016 그만두기는 기록하지 않는다). **테스트의 claim 대역은 한 번만 참이게, 파이프라인 대역은 즉시 끝나도 무한 재시작하지 않게 쓴다**(057 교훈). 새 쿼리는 기존 `diary-home.test.tsx`의 헬퍼를 읽고 따른다 — 실패 확인
- [ ] T020 [US3] `src/ui/DiaryHomeScreen.tsx`에 옵셔널 prop `recordFailure?: (result: PipelineFailure) => void`(HR9 — `generate`에서 `cancelled.current` 검사 뒤 실패 결과에 부른다; App 연결은 T029)와 쓰기 요청 effect를 더한다 — 쓰기 요청 effect는(057 자동 쓰기 effect 바로 아래 — 같은 조건 목록, `resolve(dayOf(now()))`, `setChosenDay(today)` 뒤 `generate(...)`, 상태 바꿈은 `Promise.resolve().then`으로 미룸 — `react-hooks/set-state-in-effect`, 이미 처리한 id는 ref로 기억, `running.current`면 건너뛰고 비움). `AppScreen` 타입을 넓히지 않는다. T019 초록
- [ ] T021 [US3] TO1~TO3 소스 계약 테스트를 `__tests__/app/app-diagnostics-source.test.ts`에 쓴다 — `App.tsx`(주석 제외): `onTryOnce`가 `setDiagnosing(false)`와 `setRoute("home")`을 부르고 `writeRequest`를 올리고 토스트 문구로 `DIAGNOSTICS_TEXT.tryOnceToast`를 씀; 토스트는 `DeveloperToast`이고 진단 `StackLayer` 안이 아니라 `AppFrame` 루트에 있음; 진단 부분에 `createAppPipeline`·`GenerationProbe` 호출이 없음; `writeRequest` id가 증가식 — 실패 확인
- [ ] T022 [US3] `App.tsx`에 `writeRequest` 상태(`useState<{ id: number } | null>`)와 `onTryOnce`·진단 토스트(`DeveloperToast`, `TOAST_SHOW_MS`, `AppFrame` 루트·홈 하단 바 위)를 더하고 `DiaryHomeScreen`에 `writeRequest`·`onWriteRequestHandled`를 넘긴다. 진단 화면 「생성」 묶음(`diagnostics-group-gen`)에 「지금 한 번 써 보기」(`diagnostics-try-once`)를 그린다(`DiagnosticsScreen.tsx`). DS6의 이 몫을 `diagnostics-screen.test.tsx`에 더해 초록. T021 초록. 설정·개발자·진단 세 겹이 닫히는 순서는 059 `layersMounted`/`covered`를 따르고 겹이 닫히는 동안 홈이 시작을 미루는지(HR4) 코드로 확인

---

## Phase 6: User Story 4 - 자동 쓰기를 지금 한 번 돌린다 (Priority: P2)

**Goal**: 「자동 쓰기 지금 실행」이 시도 창과 토글을 무시하고 규칙만 따른다.

**Independent Test**: 안 쓴 날이 있는 기기에서 누르고 결과 줄이 갱신된다.

- [ ] T023 [US4] AR1~AR4 테스트를 `__tests__/schedule/task-manual.test.ts`에 쓴다(기존 `__tests__/schedule/`의 `runAutoDiaryTask` 테스트의 의존 주입 방식을 읽고 따른다) — `runAutoDiaryTask({ manual: true, ... })`: 설정이 꺼져 있어도·`now`가 목표 시각 창 밖이어도 안 쓴 날이 있으면 `"ran"`(AR1); 안 쓴 날이 없으면 `"skipped"`; `manual`이어도 재료 없음·사진 권한 없음은 `"skipped"`이고 정오 전에는 오늘을 쓰지 않음(AR2); `manual`이 아닌 호출은 창 밖·꺼짐에서 기존대로 `"skipped"`(AR4); 소스 계약(AR3) — `git diff --stat main -- src/schedule/decision.ts src/schedule/auto-write.ts src/schedule/retry.ts`가 비어 있음(테스트 안에서 `child_process`로 읽지 말고, 세 파일 소스에 `manual` 문자열이 없음으로 갈음) — 실패 확인
- [ ] T024 [US4] `src/schedule/task.ts`의 `AutoDiaryTaskDeps`에 `manual?: boolean`을 더하고 설정을 읽은 직후 `manual`이면 `{ ...settings, enabled: true, targetHour: now.getHours() }`로 바꾼다(R5; 주석에 이유 — 판정 파일은 안 건드린다). T023 초록
- [ ] T025 [US4] DS6의 자동 쓰기 몫 테스트를 `diagnostics-screen.test.tsx`에 더한다 — 「자동 쓰기 지금 실행」(`diagnostics-run-auto`)이 `onRunAuto`를 부르고, 도는 동안 다시 눌러도 호출이 늘지 않으며(버튼 `disabled` 대신 `onPress` 미전달 — 058 규칙), 결과 줄 `diagnostics-auto-result`가 `ran`→「썼음」·`skipped`→「건너뜀」·`failed`→「실패」를 보임 — 실패 확인. 이어 `DiagnosticsScreen.tsx`에 그 행과 결과 줄을 그리고 `App.tsx`에서 `onRunAuto`를 `runAutoDiaryTask({ manual: true })`로 잇는다(진단 겹의 로컬 state `running`·`result`). 초록

---

## Phase 7: User Story 5 - 프롬프트 미리보기를 고정 프리셋 두 벌로 본다 (Priority: P2)

**Goal**: 프리셋 두 토글과 안에서 스크롤되는 선택 가능한 본문.

**Independent Test**: 프리셋을 바꿔 본문이 바뀌고 이튿날에도 같다.

- [ ] T026 [US5] DS5 테스트를 `diagnostics-screen.test.tsx`에 더한다 — `diagnostics-preset-empty`·`diagnostics-preset-photos` 토글로 `promptPreviews`의 해당 프리셋 문자열이 보이고(기본은 empty), 본문이 `selectable`이며 `nestedScrollEnabled`인 스크롤 뷰 안에 있음(스타일·props 단언), 크기 라벨이 「조립 시점 근사치, 실측 토큰 아님」을 포함하고 소스에 ASCII `token` 어휘가 없음(022 PP6 이월 — 한글 라벨은 대상 밖 — `__tests__/diagnostics/prompt-preview.test.ts` PP6이 소스를 읽는 파일 목록에 새 부품 파일이 필요한지 확인해 더함), 실패 미리보기(`{ ok: false, reason }`)는 reason을 보이고 본문 자리를 비움(원칙 I) — 실패 확인
- [ ] T027 [US5] `DiagnosticsParts.tsx`에 `PresetToggle`·`PromptBox`를, `DiagnosticsScreen.tsx`에 「입력 프롬프트 미리보기」(`diagnostics-group-prompt`)를 그린다. 미리보기 문자열은 `DiagnosticReport.promptPreviews[PREVIEW_CHARACTER]`를 `App.tsx`가 뽑아(`const PREVIEW_CHARACTER: Character = "quiet"` — 옛 `PROBE_CHARACTER`처럼 목록 순서에 기대지 않고 식별자를 직접 적는다, 037) `previews`(프리셋 id → 문자열/실패) 하나로 준다 — 화면은 캐릭터를 모른다. `PRESET_LABELS`는 쓰지 않고 `DIAGNOSTICS_TEXT.preset1/2`를 쓴다. `UI_TOUCHES_PROMPT`(화면이 `diary/prompt`·`signals`를 import하지 않음)를 지킨다. T026 초록

---

## Phase 8: User Story 6 - 최근 쓰기 실패를 본다 (Priority: P2)

**Goal**: 쓰기 실패가 기록되고 「최근 실패」에 보인다.

**Independent Test**: 저장 실패를 유도해 쓰기를 실패시킨 뒤 진단에 한 줄이 생긴다.

- [ ] T028 [US6] WF7 소스 계약 테스트를 `__tests__/app/write-failures-callers-source.test.ts`에 쓴다(주석 제외) — `DiaryHomeScreen.tsx`의 `generate`가 `cancelled.current` 검사 **뒤에** 주입받은 `recordFailure(`를 부름(문자열 위치 비교; 홈은 `write-failures`를 import하지 않음)이고 `App.tsx`가 그 prop에 `recordWriteFailure`를 연결함; `task.ts`가 `already-running` 분기 **앞에** 부르고 바깥 `catch`도 `unwritten`으로 기록; `wiring.ts`의 `triggerFirstRunAutoDiary`가 실패 결과에서 부름; `src/diary/pipeline.ts`와 `src/app/wipe-diaries.ts`는 `write-failures`를 import하지 않음(WF9) — 실패 확인
- [ ] T029 [US6] 기록 지점 셋을 잇는다 — `App.tsx`가 홈의 `recordFailure` prop(T020이 만든다)에 `(result) => recordWriteFailure(expoWriteFailurePort(), result, new Date())`를 연결한다(홈은 `write-failures`를 import하지 않는다 — UI는 통로를 모른다); `task.ts`: `deps.failurePort ?? expoWriteFailurePort()`로 `recordWriteFailure`를 `already-running` 분기 앞에·바깥 `catch`에서 `unwritten`으로; `wiring.ts`: `triggerFirstRunAutoDiary(…, deps)`에 `failurePort?`를 받아 실패 결과에 기록(기존 `.catch`로 예외를 삼키는 동작은 그대로). 기록 호출은 `await` 하되 던지지 않는다(WF6). `__tests__/app/auto-diary-trigger.test.ts`에 케이스를 더한다 — 실패 결과면 주입한 `failurePort`에 한 줄이 쓰이고, `run()`이 던져도 기록 통로가 던져도 함수는 던지지 않음. T028 초록, 기존 `__tests__/schedule/`·`__tests__/app/wiring.test.ts` 초록
- [ ] T030 [US6] DS7 테스트를 `diagnostics-screen.test.tsx`에 더한다 — 「최근 실패」(`diagnostics-group-failures`): 항목이 없으면 `diagnostics-failures-empty` 한 줄, 있으면 줄마다 갈래 문구와 시각이 있고 `onPress`가 없음(행을 눌러도 아무 호출이 없음) — 실패 확인. 이어 `DiagnosticsScreen.tsx`에 그리고 `App.tsx`가 진단 겹이 열릴 때 `loadWriteFailures(expoWriteFailurePort())`를 읽어 `failureLines(items, new Date())`를 준다(열 때마다 다시 읽는다). 초록
- [ ] T031 [US6] DS1 테스트를 `diagnostics-screen.test.tsx`에 더하고 전부 초록인지 확인한다 — 일곱 묶음 testID(`diagnostics-group-env|storage|photo|probe|prompt|gen|failures`)가 이 순서로 렌더됨(트리 순서 단언) 환경 → 저장 점검 → 사진 권한 → 신호 프로브 · 오늘 → 입력 프롬프트 미리보기 → 생성 → 최근 실패

---

## Phase 9: 정리 — 옛 부품·헌법 검사·Maestro

- [ ] T032 CC1~CC4 테스트를 `__tests__/scripts/check-constitution.test.ts`(기존 파일)에서 고친다 — `DIAGNOSTICS_HIDES_AXES` 위반 주입 대상 파일이 새 신호 칸 파일(`src/ui/DiagnosticsParts.tsx`)이 되고, `UI_TOUCHES_PROMPT`가 `DiagnosticsParts.tsx`·`DiagnosticsScreen.tsx`에 적용되며, `src/app/write-failures.ts`가 `src/ui/`·`diary/pipeline` import를 못 하는 새 규칙의 위반 주입 케이스를 더한다. 존재하지 않는 파일 이름을 가리키는 규칙이 0인지 확인하는 테스트를 더한다(CC3) — 실패 확인
- [ ] T033 `scripts/constitution-rules.ts`를 고친다 — `SignalProbe.tsx`를 가리키던 규칙(187·243행 근처)과 `UI_TOUCHES_PROMPT` 대상을 새 파일 이름으로 옮기고 `write-failures.ts` 경계 규칙(CC4)을 더한다. T032 초록. **옮긴 뒤 위반 주입으로 실제로 잡는지 본다**(치환 적용 단언 → 실행 → 원래 문자열 grep)
- [ ] T034 옛 부품 다섯(`src/ui/GenerationProbe.tsx`·`AutoDiaryTriggerButton.tsx`·`PermissionPanel.tsx`·`SignalProbe.tsx`·`PromptPreviewPanel.tsx`)과 자기 테스트(`__tests__/ui/{generation-probe,permission-panel,prompt-preview-panel,signal-probe}.test.tsx`)를 삭제한다. **`__tests__/app/auto-diary-trigger.test.ts`는 삭제하지 않는다** — 이름과 달리 옛 버튼이 아니라 040의 `triggerFirstRunAutoDiary`를 잠그는 테스트다(T029가 고친다). **삭제 전에 그 테스트가 잠그던 계약이 새 테스트에 있는지 대조한다** — 권한 요청 규칙(004 FR-023)→DS3, 다섯 축→DS4·CC1, PP1·PP6→`prompt-preview.test.ts`·DS5, 자동 쓰기 단추 규칙→DS6; 없는 것이 있으면 새 테스트에 옮긴 뒤 삭제. **T002 참조 목록 중 옛 파일의 소스를 읽는 테스트를 고친다** — 특히 `__tests__/vision/photo-vision-always.test.ts`(109행 근처가 `src/ui/GenerationProbe.tsx`의 `GenerationProbeProps`를 읽어 042의 「진단 생성도 vision `quick`」을 잠근다 — 진단이 파이프라인을 직접 돌리지 않게 됐으니 그 단언을 「진단 화면 소스에 `pipeline.run`·`createAppPipeline`이 없고 사진 보기는 홈 `generate`의 `vision: "quick"` 한 곳」으로 옮긴다)와 `__tests__/scripts/check-constitution.test.ts`(341~361행의 `src/ui/SignalProbe.tsx`·`PermissionPanel` 언급 — 새 파일 이름으로 옮기고 T032와 맞춘다); 주석에서 옛 이름을 역사로 언급하는 테스트 주석(`photo-path`·`verify`·`wiring`·`generate`·`select`·`diary-home`)은 그대로 둔다. 이어 `npx tsc --noEmit`이 짚는 import 남은 곳을 고치고 `__tests__/jest-projects.test.ts`(파일 수)·`src/app/README.md`·`src/ui` 주석의 옛 이름 언급을 갱신한다
- [ ] T035 `.maestro/prompt-preview.yml`을 고친다 — 캐릭터 칩 단계(`prompt-preview-character-quiet`)를 걷고 새 id·문구(`diagnostics-group-prompt`·`diagnostics-preset-photos`·「프리셋 2 · 사진 있음」 등)로 맞춘다. `scripts/run-device-tests.mjs`의 `FLOWS`에 `prompt-preview`가 등록돼 있는지 확인한다(059가 등록했다). 새 흐름을 추가하면 등록한다. **`maestro test .maestro/prompt-preview.yml`은 실기기 단계(T039)에서 직접 돌린다**(실행기는 `pm clear` 함)

---

## Phase 10: Polish & 검증

- [ ] T036 `npm test`와 `npm run lint`(eslint + tsc + 헌법 검사 + prettier)를 실제로 돌려 통과를 확인한다. 실패는 원인을 고친다(`--no-verify` 금지). prettier는 `npx prettier --write`로 정리
- [ ] T037 새 규칙마다 위반을 주입해 잡히는지 본다(quickstart 「위반 주입」 (1)~(10)). 치환이 실제로 적용됐는지 먼저 단언하고, 주입 뒤 원래 문자열이 돌아왔는지 다시 grep한다. 결과를 quickstart 끝에 적는다
- [ ] T038 quickstart 0~8을 dev 실기기에서 따라 한다 — **백업(0)을 눈으로 확인하기 전에는 시작하지 않는다.** `pm clear`·`am force-stop`·`am start -S` 금지, 모델을 자르거나 지우지 않는다(지우는 경로가 없는 조각이지만 확인), 좌표를 누르기 전 스크린샷, 057 시드 사진은 지우지 않는다, 설정 값(자동 쓰기·시각·글꼴 배율)은 바꾸기 전에 읽어 두고 끝나면 복원, Metro는 끝나면 8081을 쥔 node까지 끈다. 새 네이티브 모듈이 없으므로 빌드는 하지 않는다(확인: `git diff main -- package.json`이 비어 있음). 결과(성공·미확인)를 `quickstart.md` 끝에 날짜와 함께 적는다
- [ ] T039 `maestro test .maestro/prompt-preview.yml`을 실기기에서 직접 돌려 통과를 확인한다(T038과 같은 안전 규칙)
- [ ] T040 `AGENTS.md`에 060 기능별 핵심 결론을 지금도 유효한 것만 쓴다 — 앞 절을 뒤집은 것(055 「설정」의 진단 언급·059의 「진단 화면 내용 개편은 아직이다」·「저장소의 현재 상태」의 진단 문장·022의 `PromptPreviewPanel`/`SignalProbe` 언급·012의 `SignalProbe.tsx` 언급·「코드를 어디에 두는가」)은 덧대지 말고 고치거나 지운다. 기능별 상세 실측은 `specs/060-diagnostics-screen/`에 둔다
- [ ] T041 `git status`로 의도하지 않은 파일(`.specify/feature.json` 외 임시 파일)이 없는지 본다. 커밋은 하지 않는다 — 구현 커밋은 kickoff 파이프라인이 사용자 확인을 받고 한다

---

## Dependencies & Execution Order

- Phase 1 → Phase 2(T003~T012; 파일이 달라 T003/T005/T007/T009/T011은 서로 [P]) → Phase 3~8 → Phase 9 → Phase 10.
- US1(T013~T015) → US2(T016~T018) → US3(T019~T022) → US4(T023~T025) → US5(T026~T027) → US6(T028~T031): 모두 `DiagnosticsScreen.tsx`·`App.tsx`를 건드려 순서대로 한다. US3의 홈 쪽(T019~T020)과 US4의 `task.ts`(T023~T024)는 다른 파일이라 병렬 가능하나 같은 에이전트가 순서대로 한다.
- T029(기록 지점)는 T006에 의존하고 T020·T024와 같은 파일(`DiaryHomeScreen.tsx`·`task.ts`)을 만지므로 그 뒤에 한다.
- Phase 9(T034 삭제)는 US2·US5의 새 테스트가 옛 계약을 이어받은 뒤에만.

## Parallel Examples

- Phase 2: T003·T005·T007·T009·T011(테스트 파일 다섯, 서로 다른 파일)을 한꺼번에 쓰고 실패를 확인한 뒤 T004·T006·T008·T010·T012를 각각 구현한다.

## Implementation Strategy

- **MVP = Phase 2 + US1~US3** — 새 화면 틀·환경·저장 점검·사진/신호·한 번 써 보기. 여기서 한 번 실기기로 본다(진단이 열리고 홈 쓰는 중으로 이어지는가).
- 이후 US4(자동 쓰기 단추)·US5(프리셋)·US6(실패 기록)을 더한다. US6의 기록 지점은 홈·태스크·첫 실행 셋이고 헤드리스 기록은 계약 테스트로 갈음할 수 있다(미확인으로 보고).

## 요구사항 → 태스크 추적

| 요구 | 태스크 |
| --- | --- |
| FR-001 (일곱 묶음 순서·부품) | T013·T014·T017·T022·T027·T030·T031 |
| FR-002 (개발 환경만) | T015 (059 DG2·DV5 재확인) |
| FR-003 (문구 원문) | T003·T004 |
| FR-004 (모델 이름 없음) | T003 (DT4)·T013 |
| FR-005 (환경 줄·CPU 근거) | T009·T010·T015 |
| FR-006 (저장 점검) | T007·T008·T013·T015 |
| FR-007·FR-008·FR-009 (사진 권한·신호 프로브) | T009·T010·T016·T017·T018 |
| FR-010·FR-011 (프롬프트 미리보기) | T026·T027 |
| FR-012·FR-013 (지금 한 번 써 보기) | T019·T020·T021·T022 |
| FR-014 (자동 쓰기 지금 실행) | T023·T024·T025 |
| FR-015~FR-019 (실패 기록·표시) | T005·T006·T028·T029·T030 |
| FR-020 (경계) | T013·T015·T034 |
| FR-021 (측정 어휘 없음) | T005·T013 |
| FR-022 (새 네이티브 모듈 없음) | T038 |
| SC-001·SC-003·SC-004 | T038 |
| SC-002·SC-005·SC-006 | T003·T005·T009·T013 |
| SC-007·SC-008 | T036·T039 |
