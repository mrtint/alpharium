---
description: "Task list for 006-first-diary-app"
---

# Tasks: 손에 쥐는 첫 빌드

**Input**: Design documents from `/specs/006-first-diary-app/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: **필수다.** 헌법 「개발 방식」이 "계약을 먼저 정하고 테스트를 먼저 쓴다"를
MUST로 못 박았다. 각 스토리에서 테스트가 구현보다 앞에 온다.

**Organization**: 스토리별로 묶었다. 각 스토리는 독립적으로 구현·검증·전달된다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능 (다른 파일, 미완 작업에 의존하지 않음)
- **[Story]**: US1~US6 (spec.md의 스토리 번호)
- 파일 경로를 반드시 적는다

## Path Conventions

Expo 모바일 앱. 저장소 루트에 `src/`·`__tests__/`·`plugins/`·`.maestro/`.
`android/`는 **gitignore된 생성물이므로 직접 편집하지 않는다**(research.md §1).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 새로 여는 자리를 만들고 죽은 설정을 정리한다

- [ ] T001 [P] `src/app/` 디렉터리를 만들고 `src/app/README.md`에 "사용자 경로 조립의 유일한 자리"를 적는다 (plan.md Structure Decision)
- [ ] T002 [P] `plugins/` 디렉터리를 만들고 `plugins/README.md`에 "android/가 gitignore이므로 네이티브 설정은 여기에 선언으로 남긴다"를 적는다 (research.md §1)
- [ ] T003 `.env.dev`가 자동 로드되지 않는다는 사실을 `AGENTS.md`의 실기기 절차 항목에 적는다 — `EXPO_PUBLIC_APP_ENV=dev`를 직접 주는 것이 파일 때문이 아님을 밝힌다 (research.md §4)

**Checkpoint**: 새 자리가 열렸고 env 통로의 오해가 문서에서 제거됐다

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 스토리가 딛는 계약 확장. **여기가 끝나야 스토리 작업이 시작된다**

**⚠️ CRITICAL**: T004~T009 없이는 어떤 스토리도 저장까지 갈 수 없다

### 파이프라인 계약 확장 (contracts/persistence.md §4)

- [ ] T004 `__tests__/diary/pipeline.test.ts`에 실패 테스트를 더한다: 저장이 실패하면 결과가 `stage: 'storage'`이면서 **`entry`를 담고 있다**. 다른 실패 갈래(`generation`·`signals`·`model-not-ready`)에는 `entry`가 **없다**
- [ ] T005 `src/diary/pipeline.ts`의 `PipelineResult`에 `{ ok: false; stage: 'storage'; reason: string; entry: DiaryEntry }` 갈래를 더한다. 002의 기존 갈래는 그대로 둔다
- [ ] T006 `src/diary/pipeline.ts` `runStages()`의 저장 실패 지점에서 만들어 둔 `entry`를 버리지 않고 실어 보낸다 (지금 `stop("storage", saved.reason)`이 버린다)
- [ ] T007 `__tests__/diary/pipeline.test.ts`의 기존 테스트가 전부 그대로 통과하는지 확인한다 — 계약을 **넓히는 것이지 바꾸는 것이 아니다**

### 조립 지점 (contracts/persistence.md §3)

- [ ] T008 [P] `__tests__/app/wiring.test.ts`를 쓴다: `createAppPipeline()`이 `selectBackend()`를 거친다, 환경 판정 실패 시 파이프라인을 만들지 않고 실패를 값으로 돌려준다 (P3)
- [ ] T009 `src/app/wiring.ts`에 `createAppPipeline(resolution)`을 만든다 — `selectBackend` + `fileStore(expoFileSystemPort('diary'))` + `collectDaySignals` + `isModelReady`를 조립하고 실패를 값으로 반환한다

**Checkpoint**: 파이프라인이 저장 실패에도 글을 돌려주고, 조립 지점이 하나로 섰다

---

## Phase 3: User Story 2 - 일기가 내일도 있다 (Priority: P1) 🎯 MVP

**Goal**: 생성된 일기가 기기에 저장되어 앱 종료·재부팅을 넘어 남는다

**Why first**: 스펙의 US2지만 **구현 순서로는 첫 번째다.** 지금 저장이 끊겨 있어
어떤 화면을 붙여도 일기가 남지 않는다. 이것이 서면 US3(화면)이 보여줄 것이 생긴다.

**Independent Test**: 일기를 생성하고 앱을 완전히 종료한 뒤 다시 열어 그 일기가
있는지 확인한다. 기기 재부팅까지 거친다.

### Tests (구현 전)

- [ ] T010 [P] [US2] `__tests__/ui/generation-probe.test.tsx`를 고친다: `pipeline` prop을 받고 `backend.generate()`를 직접 부르지 않는다 (P1·P2)
- [ ] T011 [P] [US2] `__tests__/diary/store.test.ts`에 여러 날짜 저장 후 `listDays()`가 **전부** 주는지 검사를 더한다 (P8, SC-008a)
- [ ] T012 [US2] `__tests__/diary/store.test.ts`에 `memoryStore({serialized: true})` 왕복에서 `unknown`이 `unknown`으로 남는 검사가 있는지 확인하고 없으면 더한다 (P6, SC-008d)

### Implementation

- [ ] T013 [US2] `src/ui/GenerationProbe.tsx`의 props를 `backend`·`loadSignals`에서 `pipeline`·`now`로 바꾸고 `pipeline.run()`을 부른다. **005의 방어를 유지한다** — `busy` 불리언 하나, 토큰 콜백 없음, `describeFailure()` (contracts/persistence.md §5)
- [ ] T014 [US2] `src/ui/GenerationProbe.tsx`가 `PipelineResult`를 다루도록 고친다 — `storage` 실패는 글과 함께 「저장하지 못했다」를 보인다 (FR-012a·b)
- [ ] T015 [US2] `src/ui/DiagnosticsScreen.tsx`가 `createAppPipeline()`으로 만든 파이프라인을 `GenerationProbe`에 넘기도록 고친다. `onDeviceBackend()` 직접 생성을 없앤다 (FR-010a)

### 정적 방어 (P1 — 런타임 테스트로는 못 잡는다)

- [ ] T016 [US2] `scripts/constitution-rules.ts`에 소스 검사 규칙을 더한다: `src/ui/`와 `src/app/`에서 `backend.generate(` 직접 호출이 0건. **원칙 IV 경계 주석을 함께 갱신한다** — 이것은 설정·구조 검사이지 모델 출력 측정이 아니다
- [ ] T017 [US2] `scripts/check-constitution.mts`가 `src/` 소스도 훑도록 넓힌다 (지금은 `.env*`만 본다)
- [ ] T018 [P] [US2] `__tests__/scripts/check-constitution.test.ts`에 새 규칙의 검사를 더한다 — 위반을 일부러 넣으면 잡히는지 확인한다

**Checkpoint**: 일기가 실제로 저장된다. **아직 읽는 화면은 없다** — US3의 몫

---

## Phase 4: User Story 3 - 배포 빌드에서 일기를 만들고 읽는다 (Priority: P1)

**Goal**: 진단 화면 없이 목록·상세·쓰기로 일기에 닿는다

**Independent Test**: 진단 화면이 열리지 않는 환경에서 앱을 켜고 캐릭터를 고르고
일기를 만들고 목록에서 다시 열어 읽는다. 진단 화면을 한 번도 거치지 않는다.

### Tests (구현 전)

- [ ] T019 [P] [US3] `__tests__/app/state.test.ts`를 쓴다: `AppScreen` 전이 전 갈래 — `list`→`detail`, `list`→`unreadable`, `list`→`writing`→`written`/`failed`, 각각 뒤로 (data-model.md §3)
- [ ] T020 [US3] `__tests__/app/state.test.ts`에 S1 검사를 더한다: **저장된 일기가 있어도 「쓰기」가 `detail`로 새지 않는다** (원칙 I, contracts/screens.md S1)
- [ ] T021 [P] [US3] `__tests__/ui/diary-list.test.tsx`를 쓴다: 빈 목록에 안내가 보인다(S7), `readable: false` 항목이 「없음」과 다르게 보인다(S3), 날짜순 정렬
- [ ] T022 [P] [US3] `__tests__/ui/diary-detail.test.tsx`를 쓴다: 전문과 날짜가 보인다, 모델 정보·생성 시간이 없다 (S4·S5)

**⚠️ `@testing-library/react-native` 14의 `render`는 Promise를 반환한다 — `await`
없이 쓰면 `screen`이 비고 오류 문구가 원인을 가리지 않는다** (AGENTS.md)

### Implementation

- [ ] T023 [US3] `src/app/state.ts`에 `AppScreen` 타입과 전이 함수를 **순수 함수로** 만든다 (data-model.md §2·§3). 기기 없이 전 갈래가 검증되어야 한다 (SC-023)
- [ ] T024 [US3] `src/app/state.ts`에 `PipelineStage` → `AppScreen` 옮기기를 만든다. **`storage`는 `failed`가 아니라 `written{saved:false}`로 간다** (data-model.md §5)
- [ ] T025 [P] [US3] `src/ui/DiaryListScreen.tsx`를 만든다 — 날짜순 목록, `readable` 두 갈래, 빈 상태 안내, 「일기 쓰기」 동작 (contracts/screens.md §2)
- [ ] T026 [P] [US3] `src/ui/DiaryDetailScreen.tsx`를 만든다 — 전문(스크롤)과 날짜
- [ ] T027 [US3] `src/diary/store.ts`에 목록 항목을 읽는 경로를 더한다: `listDays()` + 각 날짜의 `load()` 성공 여부로 `DiaryListItem`을 만든다. **읽기 실패가 목록에서 날짜를 지우지 않는다** (FR-017a)
- [ ] T028 [US3] `src/ui/DiaryHomeScreen.tsx`를 만든다 — 목록·상세·쓰는 중을 `AppScreen` 상태로 가른다. **네비게이션 라이브러리를 들이지 않는다** (research.md §5)
- [ ] T029 [US3] `App.tsx`가 진단 화면 대신 `DiaryHomeScreen`을 사용자 경로로 띄우도록 고친다. 캐릭터 목록(003)은 그대로 잇는다
- [ ] T030 [US3] `App.tsx`에서 진단 화면이 `local`·`dev`에서만 열리는 것을 유지한다 (S9, SC-010) — 이 기능이 그 경계를 느슨하게 하지 않는다

**Checkpoint**: 진단 없이 일기를 만들고 읽는다. **US2 + US3 = 제품이 하는 일 전부**

---

## Phase 5: User Story 1 - 케이블을 뽑아도 도는 앱 (Priority: P1)

**Goal**: Metro 없이 혼자 도는 release APK

**Why here**: US2·US3이 서야 release에서 확인할 것이 생긴다. **다만 T031(release
빌드 한 번 뽑기)은 앞당길 수 있고 앞당기는 것이 좋다** — 깨지는 것이 있으면 일찍
알아야 되돌릴 것이 적다 (research.md §7)

**Independent Test**: release APK를 만들어 설치하고 **Metro를 끄고 USB를 뽑은 뒤**
앱을 열어 일기 생성까지 간다.

### 조기 확인 (앞당겨도 된다)

- [ ] T031 [US1] release 빌드를 한 번 뽑아 앱이 뜨는지만 확인한다 (서명 전, 최적화 켠 상태). **깨지면 research.md §7의 위험 표를 본다** — 동적 `import`와 `llama.rn` JNI 심볼이 후보이며 **둘 다 아직 관측되지 않은 짐작이다**
- [ ] T032 [US1] T031에서 관측한 것을 `research.md` §7의 「미확인」 표에 **사실로** 옮겨 적는다 — 도는 것도 안 도는 것도 관측이다 (원칙 V)

### 환경 주입 (contracts/release-build.md §3)

- [ ] T033 [P] [US1] release 빌드에서 `EXPO_PUBLIC_APP_ENV`가 `prod`로 박히는지 확인한다 — `NODE_ENV=production`일 때 `.env.production`이 로드되는 규칙이 실제로 도는지 (R5, FR-002)
- [ ] T034 [P] [US1] `__tests__/config/environment.test.ts`에 판정 실패가 기본값으로 떨어지지 않는 검사가 있는지 확인한다 (R6, SC-002a). 이미 001에서 다뤘다면 그대로 둔다

### 빌드 오류 화면 (FR-035)

- [ ] T035 [P] [US1] `__tests__/ui/build-error.test.tsx`를 쓴다: 「다시 시도」가 **없고**(S10), 환경 변수 이름·값이 **없다**(원칙 III)
- [ ] T036 [US1] `src/ui/BuildErrorScreen.tsx`를 만든다 — 「이 빌드가 잘못 만들어졌다」만 말한다
- [ ] T037 [US1] `App.tsx`가 환경 판정 실패 시 `BuildErrorScreen`을 띄우고 **일기 기능을 막되 앱은 뜨게** 한다 (FR-035a·c)

**Checkpoint**: release에서 앱이 뜨고 환경이 옳게 판정된다

---

## Phase 6: User Story 4 - 다음 빌드가 이 빌드를 덮어쓴다 (Priority: P1)

**Goal**: 제 서명 키로 빌드하고, 다음 빌드가 앞의 것을 덮어 설치한다

**⚠️ 미루면 되돌릴 수 없다.** debug 키로 배포물을 만들어 쓰다가 나중에 바꾸면
그 시점에 덮어 설치가 끊기고 **일기가 함께 사라진다**

**Independent Test**: 키로 서명한 APK를 설치하고 일기를 쓴 뒤, 같은 키로 서명한
다음 APK를 덮어 설치해 일기가 남는지 확인한다.

### 서명 (contracts/release-build.md §2)

- [ ] T038 [US4] 서명 키를 만든다 (`keytool -genkeypair`). **저장소 밖에 백업한다** — 잃으면 덮어 설치가 영영 끊긴다
- [ ] T039 [US4] 비밀번호를 gitignore된 자리에 둔다. `.gitignore`의 `*.jks`(24행)·`*.env.secret`(36행)가 이미 막는 것을 확인한다 (R2)
- [ ] T040 [US4] `plugins/with-release-signing.js`를 만든다 — `withAppBuildGradle`로 release `signingConfig`를 넣는다. **비밀번호를 plugin에 박지 않는다** (R2, SC-005)
- [ ] T041 [US4] `app.json`의 `expo.plugins`에 `./plugins/with-release-signing`을 등록한다
- [ ] T042 [US4] `npx expo prebuild --platform android --clean`으로 반영한다. **`--clean`을 건너뛰지 않는다** — 004에서 이것 때문에 권한이 빠진 APK가 설치됐다

### 확인 (빌드 성공을 믿지 않는다)

- [ ] T043 [US4] `apksigner verify --print-certs`로 debug 인증서(`CN=Android Debug`)가 **아닌지** 확인한다 (R1, SC-004)
- [ ] T044 [US4] `git status`와 `git ls-files | grep -i jks`로 키가 저장소에 없는지 확인한다 (R2, SC-005)
- [ ] T045 [US4] 빌드 절차와 키 두는 자리를 `AGENTS.md`에 적는다 — 다음 사람이 재현할 수 있어야 한다 (FR-006, SC-007)

**Checkpoint**: 제 키로 서명된 APK가 나온다. 덮어 설치 확인은 Phase 9에서

---

## Phase 7: User Story 5 - 준비되지 않았을 때 무엇을 할지 안다 (Priority: P2)

**Goal**: 모델 없음·권한 없음·하루 안 닫힘에서 사용자가 다음 행동을 안다

**Independent Test**: 각 미준비 상태를 만들어 놓고 화면을 보았을 때 다음에 할 행동을
알 수 있는지 확인한다.

### Tests (구현 전)

- [ ] T046 [P] [US5] `__tests__/app/state.test.ts`에 실패 갈래별 문구 검사를 더한다: 각 `PipelineStage`가 「할 수 있는 것」으로 옮겨진다 (S8, SC-015)
- [ ] T047 [US5] `__tests__/app/state.test.ts`에 S2 검사를 더한다: **거부된 글이 어떤 화면 상태에도 담기지 않는다** (SC-014)
- [ ] T048 [P] [US5] `__tests__/ui/diary-list.test.tsx`에 검사를 더한다: 사진을 **보지 못한** 하루와 사진이 **없었던** 하루가 다르게 보인다 (FR-032, SC-016)

### Implementation

- [ ] T049 [US5] `src/app/state.ts`의 실패 옮기기에 005의 `describeFailure()`를 재사용한다 — 새로 쓰지 않는다 (원칙 III 방어를 잃지 않기 위해)
- [ ] T050 [US5] `src/ui/DiaryHomeScreen.tsx`에 모델 미준비 안내와 캐릭터 목록으로 가는 길을 잇는다 (FR-028)
- [ ] T051 [US5] `src/ui/DiaryDetailScreen.tsx`에 `unknown`/`none` 구분 표시를 더한다 — 「사진을 보지 못했다」와 「사진이 없었다」가 다른 문장이다 (FR-032)
- [ ] T052 [US5] 하루가 닫히지 않았을 때의 안내를 잇는다 (FR-033)
- [ ] T053 [US5] 같은 하루에 다시 쓸 때 **덮어썼다는 사실**을 보인다 (FR-034)

**Checkpoint**: 벗어난 경로에서도 사용자가 길을 안다

---

## Phase 8: User Story 6 - 첫 일기가 헌법을 배반하지 않는다 (Priority: P2)

**Goal**: 생성된 일기가 기록에 없는 것을 단언하지 않는다

**Why P2**: 배포물을 만드는 일 자체를 막지 않는다. 다만 손에 쥐는 첫 빌드가 자기
설정을 배반하는 글을 보여주는 것은 아까우므로 함께 담는다.

**Independent Test**: 프롬프트 문자열을 기기 없이 검사하고, **실기기에서 생성된
일기를 사람이 읽어** 단언이 있는지 확인한다. 자동 판정을 만들지 않는다.

### Tests (구현 전)

- [ ] T054 [P] [US6] `__tests__/diary/prompt.test.ts`에 검사를 더한다: 단언 금지 지시가 있고 **짐작 허용도 함께** 있다 (FR-036·037)
- [ ] T055 [P] [US6] `__tests__/diary/acceptance.test.ts`의 「갈래가 넷」 검사가 그대로 통과하는지 확인한다 (FR-039, SC-021)

### Implementation

- [ ] T056 [US6] `src/diary/prompt.ts`의 `SPEAKER_RULES` 문안을 고친다 — 005에서 "날씨가 정말 좋았다"·"친구와 산책을 했다"가 새어 나온 자리. **`prompt.ts` 안에서만 고친다**(FR-038), **캐릭터별로 다르게 하지 않는다**(FR-040), **판정 갈래를 늘리지 않는다**(FR-039)
- [ ] T057 [US6] `instructionLines()`가 고친 문안과 **같은 상수에서** 나오는지 확인한다 — 어긋나면 되뱉기 판정이 조용히 무력해진다 (005 P-7)

**Checkpoint**: 프롬프트가 고쳐졌다. **실제로 지켜지는지는 Phase 9에서 사람이 읽는다**

---

## Phase 9: 실기기 검증 (Polish & Cross-Cutting)

**Purpose**: **건너뛴 실기기 검증은 통과가 아니다**(원칙 V). 여기를 통과하지 못하면
이 기능은 끝나지 않은 것이다

### Maestro 흐름

- [ ] T058 [P] `.maestro/diary-user-path.yml`을 만든다 — 진단 없이 목록 → 쓰기 → 읽기
- [ ] T059 **`scripts/run-device-tests.mjs`의 `FLOWS`에 `.maestro/diary-user-path.yml`을 등록한다.** ⚠️ 등록하지 않으면 파일이 있어도 안 돌고 **초록불인데 아무것도 검증되지 않는다** (AGENTS.md)

### release APK 검증 (quickstart.md D)

**⚠️ Metro를 끄고 USB를 뽑은 상태에서 한다**

- [ ] T060 D1: 앱이 뜬다 — `Unable to load script`가 없다 (SC-002)
- [ ] T061 D2·D3: 캐릭터를 고르고 모델을 받고 일기를 쓴다 (SC-001)
- [ ] T062 D4: 「쓰고 있다」뿐이고 진행률·시간·생성 중인 글이 없다 (SC-020)
- [ ] T063 D5·D6: 목록에 방금 쓴 일기가 있고 눌러서 읽는다 (SC-012)
- [ ] T064 **D7: 앱을 완전히 종료하고 다시 연다 — 일기가 그대로 있다** (SC-008)
- [ ] T065 **D8: 기기를 재부팅하고 앱을 연다 — 일기가 그대로 있다** (SC-008)
- [ ] T066 **D9: 다른 날짜로 하나 더 쓴다 — 둘 다 목록에 있다** (SC-008a)
- [ ] T067 D10: 진단 화면이 어디에도 없다 (SC-010)
- [ ] T068 D11: **사람이 일기를 읽는다** — 화자가 휴대폰이고 기록에 없는 것을 단언하지 않았다. 짐작은 위반이 아니다 (SC-017·018)

**⚠️ 원칙 IV**: release가 debug보다 빠른지 느린지 **재지 않는다.** 도는지만 본다

### 덮어 설치 (quickstart.md E)

- [ ] T069 `app.json`의 `versionCode`를 올리고 같은 키로 재빌드한다
- [ ] T070 `adb install -r`로 덮어 설치한다 — `INSTALL_FAILED_UPDATE_INCOMPATIBLE`이 아니고 **일기가 그대로 있다** (SC-006)

### 기록

- [ ] T071 실기기에서 관측한 것을 `AGENTS.md`의 「이전 작업에서 실측으로 확인된 것」에 적는다 — **날짜·기기·빌드 종류(release)를 함께** 남긴다 (원칙 V)
- [ ] T072 `research.md` §7의 「짐작으로 남는 것」 표를 관측 결과로 갱신한다 — 확인된 것은 사실로, 여전히 모르는 것은 미확인으로

**Checkpoint**: 케이블을 뽑아도 도는 앱이 손에 있고 일기가 내일도 남는다

---

## Dependencies

### 단계 의존

```
Phase 1 (Setup)
   ↓
Phase 2 (Foundational) ← 여기가 끝나야 스토리가 시작된다
   ↓
Phase 3 (US2 영속) ────┐
   ↓                   │  T031(release 조기 확인)은
Phase 4 (US3 화면)     │  Phase 2 이후 언제든 앞당길 수 있다
   ↓                   │
Phase 5 (US1 release) ←┘
   ↓
Phase 6 (US4 서명)
   ↓
Phase 7 (US5) ‖ Phase 8 (US6)   ← 서로 독립, 병렬 가능
   ↓
Phase 9 (실기기 검증)
```

### 왜 이 순서인가

| 순서 | 이유 |
| --- | --- |
| US2가 US3보다 먼저 | 저장이 끊긴 채로 화면을 붙이면 보여줄 것이 남지 않는다 |
| US3이 US1보다 먼저 | release에서 확인할 「하는 일」이 있어야 한다 |
| US4가 Phase 9보다 먼저 | 덮어 설치를 확인하려면 제 키로 서명된 빌드가 필요하다 |
| US5·US6이 뒤 | P2. 배포물을 만드는 일 자체를 막지 않는다 |
| Phase 9가 마지막 | 전부 서야 D 절차가 성립한다 |

### 스토리 안의 의존

- **US2**: T010~T012(테스트) → T013~T015(구현) → T016~T018(정적 검사)
- **US3**: T019~T022(테스트) → T023~T024(상태) → T025~T028(화면) → T029~T030(연결)
- **US1**: T031~T032(조기 확인) → T033~T034(환경) → T035~T037(빌드 오류 화면)
- **US4**: T038~T042(서명) → T043~T045(확인)
- **US5**: T046~T048(테스트) → T049~T053(구현)
- **US6**: T054~T055(테스트) → T056~T057(구현)

---

## Parallel Execution Examples

### Phase 2 안에서

```
T008 (wiring 테스트)  ‖  T004 (pipeline 테스트)
```
서로 다른 파일이고 T004~T007과 T008~T009는 독립적이다.

### Phase 3 (US2) 테스트

```
T010 (generation-probe.test.tsx)  ‖  T011 (store.test.ts)
```
**T012는 T011과 같은 파일이므로 `[P]`가 아니다** — 이어서 한다. T018도 T016·T017
(같은 규칙을 다루는 소스)이 끝난 뒤에 온다.

### Phase 4 (US3) 테스트 — 가장 넓은 병렬 구간

```
T019 (state.test.ts)  ‖  T021 (diary-list.test.tsx)  ‖  T022 (diary-detail.test.tsx)
```
**T020은 T019와 같은 파일이므로 `[P]`가 아니다** — T019 뒤에 이어서 한다.

### Phase 4 (US3) 화면

```
T025 (DiaryListScreen)  ‖  T026 (DiaryDetailScreen)
```
둘 다 T023(`state.ts`)에 의존하므로 그 뒤에 병렬.

### Phase 7 ‖ Phase 8

US5와 US6은 **완전히 독립적이다.** 서로 다른 파일을 건드린다
(`state.ts`·화면 vs `prompt.ts`).

다만 US5 안에서 **T046·T047은 같은 파일**(`state.test.ts`)이므로 이어서 한다.
T048만 `[P]`다.

---

## Implementation Strategy

### MVP 범위

**Phase 1 + 2 + 3 (US2) + 4 (US3)** — T001~T030.

여기까지가 **「제품이 하는 일」 전부**다. 일기를 만들고, 저장하고, 읽는다.
debug 빌드에서 돌지만 그것으로도 처음으로 앱이 쓸모를 갖는다.

### 그다음 증분

| 증분 | 무엇이 생기는가 |
| --- | --- |
| + Phase 5 (US1) | release에서 돈다 — **케이블을 뽑을 수 있다** |
| + Phase 6 (US4) | 다음 빌드가 앞의 것을 덮는다 — **일기를 잃지 않는다** |
| + Phase 7·8 | 벗어난 경로 안내, 화자 교정 |
| + Phase 9 | **검증됐다** — 여기 전까지는 도는지 모르는 상태다 |

### 이 기능이 실패하는 방식 (경계)

헌법 「개발 방식」이 경고한 것 — **한 축을 깊게 파고들고 싶어지면 그것이 실패
신호다.** 이 기능에서 그 유혹이 나올 자리:

| 유혹 | 막는 것 |
| --- | --- |
| 화면을 예쁘게 다듬는다 | FR-027 — 읽히고 눌리면 끝 |
| release가 느린지 잰다 | 원칙 IV — 도는지만 본다 |
| APK 크기를 줄인다 | research.md §7 — **크기가 문제인지 확인 안 됨.** 미리 줄이면 다른 기기에서 안 도는 APK가 된다 |
| 스토어에 올린다 | Out of Scope |
| 네비게이션 라이브러리를 들인다 | research.md §5 — release 검증 표면이 넓어진다 |
| 프롬프트를 캐릭터별로 튜닝한다 | FR-040, 원칙 III — 성격은 모델에서 온다 |

### 검증을 건너뛰지 않는다

**Phase 9를 통과하지 못하면 이 기능은 끝나지 않은 것이다.** 기기 없는 테스트가
전부 초록불이어도 마찬가지다 — **005까지의 모든 실기기 확인이 debug였고 release는
처음이다**(원칙 V).
