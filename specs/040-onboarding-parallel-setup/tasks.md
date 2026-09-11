---

description: "Task list for 040 - 초기 권한 획득과 첫 실행 흐름 재설계"

---

# Tasks: 초기 권한 획득과 첫 실행 흐름 재설계

**Input**: Design documents from `/specs/040-onboarding-parallel-setup/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/first-run-gate.md, quickstart.md

**Tests**: 이 저장소의 개발 방식(AGENTS.md "계약을 먼저 정하고 테스트를
먼저 쓴다")에 따라 포함한다.

**Organization**: 사용자 스토리별로 그룹화(US1=권한 자동 순차, US2=작명·
다운로드 병렬, US3=자동 첫 일기 생성).

## Path Conventions

단일 Expo/React Native 프로젝트. `src/`(제품 코드) · `__tests__/`(기기 불필요
테스트, `.ts`=순수 로직/node, `.tsx`=화면/jest-expo) · `.maestro/`(실기기).

---

## Phase 1: Setup

**Purpose**: 새 모듈 골격과 헌법 검사 확장

- [X] T001 `src/firstrun/` 디렉터리 생성, 빈 배럴 없이 개별 파일로 시작
      (진행 시 T010~T014가 채움)
- [X] T002 [P] `scripts/constitution-rules.ts`에 `checkFirstRunFile` 규칙
      추가 — `src/firstrun/**`에서 `models/roster`·`ModelAsset`·
      `assetFor`·`diary/prompt`·`buildPrompt`·`diary/acceptance` import,
      `backend.generate()`류 직접 호출, `elapsed*`·`durationMs`·`timings`·
      `tokens_*`·`Date.now`·`performance.now` 토큰을 차단(021
      `checkOnboardingFile`/035 `checkWelcomeFile`과 동일 패턴 재사용,
      contracts/first-run-gate.md G7·G8)
- [X] T003 [P] `checkFirstRunFile`이 실제로 위반 3종(제품 계층 직접 import
      / 시간 측정 토큰 / `diary/pipeline.run()` 직접 호출)을 잡는지 위반
      주입으로 확인하는 계약 테스트를
      `__tests__/constitution/first-run-boundary.test.ts`에 작성

**Checkpoint**: 새 모듈 자리와 경계 방어가 준비됨

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 사용자 스토리가 공유하는 `FirstRunStage` 판정과 게이트
배선 — 이것 없이는 어떤 스토리도 화면에 연결할 수 없다

**⚠️ CRITICAL**: 이 phase 완료 전까지 Phase 3+ 화면 작업을 시작하지 않는다

- [X] T004 [P] `resolveFirstRunStage` 계약 테스트를
      `__tests__/firstrun/progress.test.ts`에 작성(data-model.md
      `FirstRunStage`, contracts/first-run-gate.md G1·G2·G4·G5 — 우선순위
      6가지 케이스 + 되돌아가지 않음 불변식 + 작명이 다운로드 완료를
      기다리지 않는 케이스)
- [X] T005 `resolveFirstRunStage`를 `src/firstrun/progress.ts`에 구현
      (data-model.md 명세, 순수 함수 — `now`/`Date`/파일 접근 없음, T004
      통과)
- [X] T006 [P] `shouldShowLogo` 계약 테스트를
      `__tests__/firstrun/logo.test.ts`에 작성(contracts/first-run-gate.md
      G3 — `onboardingNeeded: false`면 항상 false)
- [X] T007 `shouldShowLogo`를 `src/firstrun/logo.ts`에 구현(research.md #6,
      T006 통과)
- [X] T008 [P] `shouldAutoGenerate` 계약 테스트를
      `__tests__/firstrun/auto-diary.test.ts`에 작성(data-model.md
      `AutoDiaryAttempt`, `livenessOutcome==="ok" && dayWritable`일 때만
      true, 그 외 4가지 조합에서 false)
- [X] T009 `shouldAutoGenerate`를 `src/firstrun/auto-diary.ts`에 구현
      (research.md #4, T008 통과)
- [X] T010 035 `src/welcome/decision.ts`의 `shouldShowWelcome`을 확장 —
      `essentialAssetsReady` 인자 없이도(다운로드 미완료 상태에서도)
      `onboardingNeeded===false && welcomeShown===false`면 true를 내도록
      조건 완화(research.md #3). 기존 035 계약 테스트(W1~W20)가 깨지지
      않는지 `npm run test:logic`으로 확인 — 깨지면 어떤 W번호가 이
      완화와 충돌하는지 먼저 분석 후 해당 계약 문서에 040 예외를 명시하고
      진행. **완료**: W3 둘째 행("에셋 미준비 → false")이 충돌해
      `specs/035-model-ready-welcome-naming/contracts/welcome-gate.md`에
      040 예외 명시, `__tests__/welcome/decision.test.ts` 해당 행 갱신.
      나머지 W1~W20은 무변경으로 통과.

**Checkpoint**: `FirstRunStage` 판정 전체가 순수 로직으로 완성되고 테스트로
방어됨 — 이제 화면 배선(US1~US3)을 시작할 수 있다

---

## Phase 3: User Story 1 - 로고에서 권한까지 손 대는 횟수가 줄어든다 (Priority: P1) 🎯 MVP

**Goal**: 전체화면 로고 → 권한 항목별 목적 설명(자동 타이머 전환) → 시스템
팝업이 순차로 뜨고, 배터리 예외만 전용 안내+설정 경로로 처리된다. 커스텀
[허용]/[건너뛰기] 두 버튼 조작이 사라진다.

**Independent Test**: 새 설치 첫 실행에서 로고부터 마지막 권한 결정까지
누른 커스텀 화면 버튼 수와 시스템 팝업 결정 수를 세어 비교(spec.md US1
Independent Test).

### Tests for User Story 1

- [X] T011 [P] [US1] `LogoScreen` 렌더 계약 테스트를
      `__tests__/ui/LogoScreen.test.tsx`에 작성 — `onboardingNeeded: true`
      일 때만 렌더, 일정 시간 후 또는 확인 콜백으로 다음 단계 진입
- [X] T012 [P] [US1] `OnboardingScreen`의 스텝 자동 전환 계약 테스트를
      `__tests__/ui/OnboardingScreen.test.tsx`에 추가 — 스텝 진입 시 목적
      설명이 렌더되고, 타이머 경과 후 시스템 요청 함수가 자동 호출되는지
      (`jest.useFakeTimers()`로 검증), 언마운트 시 타이머가 정리되는지,
      배터리 예외 스텝은 자동 타이머가 없고 사용자 탭으로만 진행되는지
      (research.md #1·#2). **추가로 FR-003/Acceptance Scenario 2 검증**:
      시스템 팝업에서 거부(허용 콜백이 `granted:false`를 반환)해도 다음
      스텝으로 자동 진행되는지(건너뛰기 버튼을 누르지 않고도) 확인 — 거부
      직후 흐름이 멈추지 않음을 명시적으로 단언한다. **추가로
      FR-013 회귀 검증**: 스텝 순서·문구가 021의 `PERMISSION_REQUIREMENTS`
      고정 배열에서만 오고, 실행 중 조건(예: 이미 허용된 권한 스킵)으로
      배열 자체가 동적으로 늘거나 줄지 않는지(자동 전환 로직 추가가
      스텝 목록 생성 방식 자체를 건드리지 않았는지) 소스 검사로 확인한다

### Implementation for User Story 1

- [X] T013 [US1] `src/ui/LogoScreen.tsx` 신규 작성 — 전체화면 로고,
      `testID="first-run-logo"`, T011 통과
- [X] T014 [US1] `src/ui/OnboardingScreen.tsx` 수정 — 스텝 컴포넌트 진입
      시 목적 설명 렌더 직후 고정 지연(`setTimeout`, 화면 계층 상수)으로
      시스템 권한 요청 자동 호출, 언마운트 시 clean-up, 배터리 예외
      스텝(`battery-exception`)은 이 자동 타이머 대상에서 제외하고 기존
      [설정 열기]/[건너뛰기] 버튼 유지(research.md #1·#2, T012 통과)
- [X] T015 [US1] `App.tsx`의 게이트 로직에 `shouldShowLogo` 연결 —
      `onboardingNeeded && !onboardingStarted`일 때 `LogoScreen` 렌더,
      확인/타임아웃 후 `onboardingStarted`(세션 로컬 상태, 비영구)를 true로
      설정하고 `OnboardingScreen`으로 전환(research.md #6, contracts G3)
- [ ] T016 [US1] 기존 021 `.maestro/unified-permission-onboarding.yml`이
      이번 변경(스텝 자동 전환)으로 깨지는지 실기기에서 확인하고, 깨졌다면
      흐름을 새 자동 전환 타이밍에 맞게 수정(고정 지연만큼
      `waitForAnimationToEnd` 또는 대기 시간 조정) (실기기 검증 필요 — 별도
      세션. 2026-09-11 세션에서는 040 흐름 자체가 Maestro 기기 서버 사망으로
      완주하지 못해 021 회귀까지 가지 못했다)

**Checkpoint**: 로고→권한 자동 순차 흐름이 단독으로 동작·검증 가능

---

## Phase 4: User Story 2 - 기다리는 동안 이름을 짓는다 (Priority: P1)

**Goal**: 권한 결정 직후 작명 화면이 다운로드 완료를 기다리지 않고 뜨고,
작명이 다운로드보다 먼저 끝나면 대기 화면으로, 다운로드가 먼저 끝나도
작명은 재촉되지 않는다.

**Independent Test**: 권한 결정 직후부터 작명 화면이 뜨는 시간을 재고
(다운로드 완료를 기다리지 않는지), 작명 완료 시점에 다운로드가 병행되고
있었는지 확인(spec.md US2 Independent Test).

### Tests for User Story 2

- [X] T017 [P] [US2] `App.tsx`의 게이트 배선이 `resolveFirstRunStage`를
      호출해 `"naming"`/`"waiting-for-download"`/`"liveness"` 단계에 맞는
      화면을 렌더하는지 `__tests__/ui/AppFrame.firstrun.test.tsx`(또는
      기존 App 테스트 파일 확장)에 작성 — namingDone=false·
      downloadReady=true 조합에서 여전히 작명 화면이 뜨는지(G4), 작명 완료
      후 다운로드 미완료면 대기 화면으로 전환되는지(FR-006) 검증
- [X] T018 [P] [US2] 대기 화면(다운로드 진행 중, 그만두기 없음) 렌더
      계약 테스트를 `__tests__/ui/WaitingForDownloadScreen.test.tsx`에
      작성 — 그만두기/취소 버튼이 없음을 확인(clarify 답변, FR-006)

### Implementation for User Story 2

- [X] T019 [US2] `src/ui/WaitingForDownloadScreen.tsx` 신규 작성 — 진행률
      표시(029 `essentialDownloadFraction` 재사용), 그만두기 경로 없음,
      T018 통과
- [X] T020 [US2] `App.tsx` 게이트에 `resolveFirstRunStage` 연결 — 권한
      결정 완료 직후 `"naming"`이면 `WelcomeScreen`(035, T010에서 조건
      완화됨)을, `"waiting-for-download"`면 `WaitingForDownloadScreen`을,
      `"liveness"`면 기존 035 liveness 흐름을 렌더(T017 통과)
- [X] T021 [US2] 권한 결정 완료 시점에 `essential-assets-port.ts`의
      `downloadEssentials()`를 화면 조작과 별도로(사용자가 작명 화면에
      머물든 나가든) 시작하도록 `App.tsx`/`src/app/wiring.ts` 배선 확인·
      수정 — 029가 이미 갖고 있을 가능성이 높으므로 우선 현재 트리거
      시점을 실기기로 확인 후 필요한 경우만 수정(FR-004). **완료**: 029의
      다운로드 시작은 `OnboardingScreen` 안 [내려받기] 버튼(사용자 조작)에
      묶여 있었다 — 040은 `permissionStepsDecided`가 true가 되는 순간
      `App.tsx`의 새 effect가 `onboardingPorts.essentialAssets.
      downloadEssentials()`를 직접, 자동으로 시작한다(세션 ref로 중복
      방지). `OnboardingScreen`의 "필수 에셋 다운로드" 단계 UI는 이제
      이 배선상 도달하지 않는다(021 단독 사용 시에는 여전히 유효, 하위
      호환).
- [X] T022 [US2] 실기기에서 US2 Independent Test 수행 — 권한 결정 직후
      작명 화면이 수 초 이내에 뜨는지, 이름을 천천히 입력하는 동안
      다운로드가 계속 진행되는지, 다운로드가 먼저 끝나도 작명 화면이
      바뀌지 않는지 관찰(quickstart.md 5~7번). **완료**(2026-09-11,
      SM-S901N): FR-004·FR-005·FR-007 확인 — 모델 0인 상태에서 작명 화면이
      먼저 뜨고, 작명 중 v1·v2 완료 + a1 0→1.33GB 진행을 연속 관측.
      **FR-006(대기 화면 전환)은 미확인** — 이름 확정 시점에 a1 다운로드가
      OOM으로 크래시(026 경로의 기존 결함, quickstart.md 실기기 결과 절 참조).

**Checkpoint**: 권한→(작명 ∥ 다운로드)→대기 흐름이 US1과 결합해 동작

---

## Phase 5: User Story 3 - 처음 앱을 열면 이미 일기 하나가 있다 (Priority: P2)

**Goal**: 작명+다운로드 완료 후 liveness 통과 시 사용자 조작 없이 그날 첫
일기가 자동 생성되어 홈 화면에 있다. 실패해도 평소 재시도 경로가 살아있다.

**Independent Test**: 새 설치를 처음부터 끝까지 밟은 뒤, "일기 쓰기"를
누르지 않은 상태에서 홈 화면에 그날 일기가 이미 존재하는지 확인(spec.md
US3 Independent Test).

### Tests for User Story 3

- [X] T023 [P] [US3] `app/wiring.ts`의 자동 생성 트리거가 liveness 통과
      직후 정확히 1회만 `pipeline.run()`을 호출하는지(리렌더로 중복 호출
      안 됨, contracts G6), liveness 실패 시 호출하지 않는지(FR-008a),
      `dayWritable=false`(정오 이전)면 호출하지 않는지(FR-008 단서) —
      `__tests__/app/auto-diary-trigger.test.ts`에 mock pipeline으로 작성.
      **완료**: `triggerFirstRunAutoDiary()` 자체의 mock pipeline 호출·예외
      삼킴은 이 파일이, 게이팅(done+ok일 때만/dayWritable)은
      `AppFrame.firstrun.test.tsx`(소스 검사)가 검증한다.

### Implementation for User Story 3

- [X] T024 [US3] `src/app/wiring.ts`에 자동 생성 트리거 추가 —
      `shouldAutoGenerate` 결과가 true면 세션 스코프 중복 방지 플래그
      확인 후 `createAppPipeline(environment).pipeline.run({ day: today,
      now, character: ONBOARDING_DEFAULT_CHARACTER, vision })` 1회 호출
      (research.md #4, T023 통과) — `schedule/task.ts`의
      `runAutoDiaryTask`는 재사용하지 않는다(research.md #4 근거). **이
      세션 스코프 플래그는 자동 트리거의 중복 호출만 막아야 하며, 기존
      "일기 쓰기" 버튼이 부르는 수동 `pipeline.run()` 경로에는 전혀
      영향을 주지 않는다**(FR-009 — 자동 생성이 실패하거나 스킵돼도 수동
      경로는 이 플래그와 무관하게 항상 동작해야 한다, T027a에서 검증).
      **완료**: `triggerFirstRunAutoDiary(resolution, input, deps?)`를
      `src/app/wiring.ts`에 추가(테스트용 `deps.pipeline` 주입 지점 포함).
      세션 스코프 dedup ref(`autoGenerateTried`)는 `App.tsx`에 있다(T025).
- [X] T025 [US3] `App.tsx`가 liveness 통과(`"done"` 단계 진입) 직후
      T024의 트리거를 부수 효과로 호출하도록 연결 — 트리거 결과를 화면에
      노출하지 않는다(새 배너·실패 안내 UI를 만들지 않음, research.md #5,
      FR-009는 기존 "일기 쓰기" 경로로 충족)
- [X] T026 [US3] 실기기에서 US3 Independent Test 수행 — liveness 통과 후
      자동으로 그날 일기가 생성/저장되어 홈 화면에 보이는지, "일기
      쓰기"를 누르지 않았는지 확인(quickstart.md 8번). **완료**(2026-09-11,
      SM-S901N): liveness 화면을 거쳐 `2026-09-11.json` 저장(캡션 25.8초 +
      작성 35.0초), 사진 1장을 실제로 읽어 본문에 반영, 짐작 말투 유지.
      ⚠️ 이 과정에서 **홈 화면이 목록을 다시 읽지 않는 결함**을 발견해
      고쳤다(SC-003, `autoGeneratedToken` 재마운트) — 수정 후 재시작 없이
      홈 화면에 반영되는 것을 재확인했다.
- [ ] T027 [US3] 실기기에서 liveness 실패 케이스(모델 파일 일부만 배치 등
      가능한 방법으로 유도) 확인 — 035 기존 실패 안내가 뜨고 자동 생성이
      시도되지 않는지(quickstart.md 9번, FR-008a) (실기기 검증 필요 — 별도
      세션)
- [X] T027a [US3] FR-009/SC-004 회귀 확인 — 자동 생성이 거부 판정(4갈래
      중 하나, 합성 하루 등으로 유도 가능하면) 또는 liveness 실패로
      시도되지 않은 뒤, 홈 화면의 기존 "일기 쓰기" 버튼이 평소와 동일하게
      눌려서 수동 생성이 되는지 실기기 또는 계약 테스트(수동 트리거 경로가
      T024의 세션 스코프 중복 방지 플래그에 막히지 않는지 mock으로 확인)로
      검증한다 — 자동 생성 실패가 이후의 정상적인 수동 재시도를 막지
      않아야 한다(막다른 화면이 없다는 것의 핵심 근거). **완료**(계약
      테스트로): `AppFrame.firstrun.test.tsx`가 `autoGenerateTried`가
      `DiaryHomeScreen.tsx`(수동 경로)에 전혀 없음을 소스 검사로 확인.
      실기기 확인은 별도 세션.
- [X] T028 [US3] 정오 이전 시각 재현이 가능하면(기기 시각 변경 등) US3
      시나리오 3(자동 생성 미시도 + 기존 정오 게이트 안내) 확인 — 재현
      불가하면 기기 없는 계약 테스트(T023의 `dayWritable=false` 케이스)로
      갈음하고 quickstart.md에 미확인으로 기록(quickstart.md 10번).
      **완료**: 기기 시각 변경 불가(원칙, 016/025의 선례) — `T008`
      `__tests__/firstrun/auto-diary.test.ts`의 `dayWritable: false` 케이스로
      갈음. 실기기 재현은 하지 않음(기록됨).

**Checkpoint**: 전체 흐름(로고→권한→작명∥다운로드→liveness→자동 생성)이
완결된 최초 실행 경험으로 동작

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 재시작 이어가기, 기존 사용자 비노출, 회귀 확인, 실기기 전체
흐름 검증

- [X] T029 [P] 앱 종료 후 재실행 시 이미 결정된 권한을 다시 묻지 않고
      아직 끝나지 않은 단계(작명 또는 다운로드 대기)부터 이어가는지 확인
      하는 계약 테스트를 `__tests__/firstrun/progress.test.ts`에 추가
      (FR-011 — `resolveFirstRunStage`가 매번 실시간 입력으로 재판정하는
      성질로 이미 충족되는지 검증)
- [X] T030 [P] 이미 온보딩을 마친 기존 사용자(`onboardingFlag.completed
      === true`)에게 로고·자동 흐름이 재노출되지 않는지 계약 테스트로
      확인(FR-010, SC-005, contracts G2·G3). **실기기 확인도 완료**
      (2026-09-11): ⚠️ 여기서 **`completed`가 아예 저장되지 않는 결함**을
      발견해 고쳤다 — 021의 [시작하기] 버튼에 040이 도달하지 않아 매
      실행마다 권한 온보딩이 재노출됐다. 수정 후 재시작해도 작명 화면부터
      이어가고 지은 이름이 보존되는 것을 확인했다.
- [X] T031 `.maestro/first-run-flow.yml` 작성 — 로고 → 권한 스텝(허용/
      건너뛰기 섞어서) → 작명 입력 → 대기 → liveness → 홈 화면 일기 존재
      확인까지 1개 흐름(quickstart.md Maestro 절). **완료(코드만)**:
      YAML 작성 — 로고→권한 자동 전환→작명 화면 도달까지만 자동화(F1~F5).
      실제 다운로드 완주→liveness→자동 생성은 실기기 없이 실행 불가라
      YAML 안에 주석으로 명시(실기기 검증 필요 — 별도 세션).
- [X] T032 `scripts/run-device-tests.mjs`의 `FLOWS`에
      `first-run-flow.yml` 등록(등록 안 하면 초록불이어도 실행 안 됨 —
      AGENTS.md 경고)
- [ ] T033 기존 회귀 흐름 재확인 — `.maestro/unified-permission-
      onboarding.yml`(021)과 `.maestro/photo-vision.yml` 등 035/029 관련
      기존 흐름이 이번 변경 후에도 PASS하는지 실기기에서 1회 확인 (실기기
      검증 필요 — 별도 세션)
- [X] T034 `npm run lint`(eslint + tsc + 헌법 검사 + prettier) 전체 클린
      확인, `npm test` 전체 통과 확인. **완료**: lint 클린(위반 0), 152
      스위트 2734 passed(실기기 결함 둘을 고치며 계약 테스트 6개 추가).
- [X] T035 quickstart.md의 실기기 검증 12개 항목을 실제로 수행하고 결과를
      AGENTS.md 040 절(신규)에 실측 기록으로 남김(원칙 V). **완료**
      (2026-09-11, SM-S901N/Galaxy S22, Android 16, dev debug): 로고 자동
      전환·배터리 예외 전용 안내·다운로드 병렬·작명 우선·재촉 없음·
      liveness·자동 첫 일기·재시작 이어가기·홈 화면 반영을 확인했고,
      그 과정에서 발견한 결함 둘을 고쳐 재확인했다. AGENTS.md에 040 절을
      추가했다(실측 결론 + a1 OOM 위험 기록). 미확인 잔여는 quickstart.md
      「미확인으로 남은 것」 절에 있다.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음 — 즉시 시작
- **Foundational (Phase 2)**: Setup 완료 후 — 모든 사용자 스토리를 막는다
- **User Stories (Phase 3~5)**: Foundational 완료 후 시작 가능
  - US1(P1)·US2(P1)는 우선순위가 같지만 US2가 US1이 만드는 게이트 순서
    (권한 완료 시점)에 의존하므로 **US1 → US2** 순서를 권장(완전 병렬
    불가 — App.tsx 게이트 배선이 공유 파일이기 때문)
  - US3(P2)는 US2의 liveness 진입(035 재사용)에 의존 — **US2 완료 후** 시작
- **Polish (Phase 6)**: 원하는 사용자 스토리가 모두 완료된 후

### User Story Dependencies

- **US1 (P1)**: Foundational 이후 독립 시작 가능. 다른 스토리에 의존 없음
- **US2 (P1)**: Foundational 이후 시작 가능하나, `App.tsx` 게이트를 US1과
  함께 수정하므로 US1 이후 진행 권장(파일 충돌 최소화)
- **US3 (P2)**: US2가 만드는 `"liveness"`→`"done"` 전환에 의존 — US2 완료 후

### Within Each User Story

- 계약 테스트 먼저 작성 후 FAIL 확인 → 구현 → 실기기 검증
- 순수 로직(progress.ts 등) → 화면 배선(App.tsx) → 실기기 확인 순서

### Parallel Opportunities

- Phase 1의 T002·T003은 [P] — 서로 다른 파일
- Phase 2의 T004·T006·T008(계약 테스트 3종)은 [P] — 서로 다른 파일,
  서로 다른 함수
- Phase 3의 T011·T012는 [P]
- Phase 4의 T017·T018은 [P]
- Phase 6의 T029·T030은 [P]
- US1과 US2의 화면 구현 태스크(T014·T020)는 같은 `App.tsx`를 만지므로
  병렬 진행 시 충돌 위험 — 순차 권장

---

## Parallel Example: Phase 2 (Foundational)

```bash
# 세 계약 테스트를 동시에 작성:
Task: "resolveFirstRunStage 계약 테스트 in __tests__/firstrun/progress.test.ts"
Task: "shouldShowLogo 계약 테스트 in __tests__/firstrun/logo.test.ts"
Task: "shouldAutoGenerate 계약 테스트 in __tests__/firstrun/auto-diary.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1만)

1. Phase 1: Setup 완료
2. Phase 2: Foundational 완료(CRITICAL — 모든 스토리를 막는다)
3. Phase 3: User Story 1 완료
4. **정지 후 검증**: 로고→권한 자동 순차 흐름을 실기기에서 독립적으로 확인
5. 이 상태로도 SC-001(커스텀 버튼 수 감소)은 이미 충족된다

### Incremental Delivery

1. Setup + Foundational → 기반 완성
2. US1 추가 → 독립 검증 → (MVP)
3. US2 추가 → 독립 검증(SC-002 확인)
4. US3 추가 → 독립 검증(SC-003·SC-004 확인)
5. Polish → 전체 회귀 + 실기기 12항목 확인 + 로드맵 문서 갱신

---

## Notes

- [P] 태스크 = 서로 다른 파일, 의존성 없음
- [Story] 라벨은 태스크를 사용자 스토리에 매핑한다
- 계약 테스트가 FAIL하는 것을 먼저 확인한 뒤 구현한다
- 논리적 단위마다 커밋한다
- 각 체크포인트에서 정지해 스토리 단독 동작을 검증한다
- App.tsx·decision.ts처럼 여러 스토리가 공유하는 파일은 충돌을 피하기
  위해 순서대로(US1 → US2 → US3) 진행한다
