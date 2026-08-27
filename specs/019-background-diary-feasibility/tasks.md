# Tasks: 백그라운드 자동 일기 생성 기술 검증

**Input**: Design documents from `/specs/019-background-diary-feasibility/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/,
quickstart.md — 모두 존재함

**Tests**: 포함하되 범위가 좁다 — 이 기능은 기술 검증(스파이크)이며
plan.md Technical Context가 이미 명시했듯 "검증의 본체는 테스트가 아니라
실기기 관측"이다. 계약 테스트는 로그 기록기의 입출력 계약(H1~H5,
data-model.md)만 다루고, User Story 1·2가 요구하는 실제 판정(OS가
실행했는가, 추론이 완주했는가)은 자동 테스트로 증명할 수 없는 실측
항목이므로 quickstart.md 수행으로 대체한다.

**Organization**: spec.md의 User Story 1(P1, 실행 기회 자체가 있는가) →
User Story 2(P2, 추론이 완주하는가) → User Story 3(P3, 결과가 기록되는가)
순서. plan.md·research.md가 이미 이 순서를 전제한다 — US2는 US1이 만드는
하네스(등록·로그) 위에서만 의미가 있고, US3는 US1·US2의 실측 로그를
근거로 문서를 쓰는 마지막 단계다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능(다른 파일, 완료되지 않은 작업에 의존하지 않음)
- **[Story]**: 어느 사용자 스토리에 속하는가(US1, US2, US3)
- 파일 경로를 정확히 포함한다

## Path Conventions

단일 프로젝트(plan.md 「Structure Decision」). 검증 하네스는 신규
디렉터리 `src/spike/`에 격리하고, 기존 제품 계층(`src/app/`, `src/diary/`,
`src/inference/` 등)은 수정하지 않는다. 유일한 예외는 진입점을 추가하는
`src/ui/DiagnosticsScreen.tsx` 한 파일이다.

---

## Phase 1: Setup

**Purpose**: 신규 의존성 설치와 하네스 디렉터리 준비.

- [X] T001 `npx expo install expo-background-task expo-task-manager`를
  실행해 package.json·package-lock에 반영한다(research.md §1 — Expo
  관리 패키지이므로 `npm view`로 버전을 추측하지 않는다).
- [X] T002 `npx expo prebuild --platform android --clean`으로 새
  네이티브 모듈(WorkManager 연동)이 매니페스트에 반영되게 한다
  (AGENTS.md 「Expo 작업 시」 — `expo run:android`만으로는 매니페스트가
  갱신되지 않는다는 기존 실측 재적용). **서명 키를 되돌리는 것을
  잊지 않는다**(`cp ~/.alpharium-signing/alpharium.jks android/app/`)
  — 이번 검증은 debug 빌드로 충분하므로 release 서명은 필수는 아니지만
  이후 다른 작업과 섞이지 않도록 절차를 그대로 지킨다.
- [X] T003 [P] `src/spike/` 디렉터리를 만든다(빈 디렉터리 대신 첫
  파일 T005~T007에서 실질적으로 생성됨 — 이 작업은 디렉터리 존재
  확인용 자리표시자).

**Checkpoint**: `npx expo run:android`로 dev 빌드가 정상 설치·실행된다
(새 네이티브 모듈 추가 후 최소 1회 재설치 필요 — AGENTS.md 기준).
**미확인**: `expo prebuild --clean` 후 실기기(`npx expo run:android`)
재설치·실행은 실기기가 필요한 절차이므로 사용자가 직접 수행해야 한다.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 두 사용자 스토리 모두가 딛고 서는 로그 계약과 헌법 경계
방어. 이 단계 없이는 어느 스토리도 시작할 수 없다.

**⚠️ CRITICAL**: 이 단계가 끝나야 User Story 1을 시작할 수 있다.

### 계약 테스트 먼저 (실패를 확인한 뒤 구현)

- [X] T004 [P] `VerificationEvent` 로그 기록·읽기 계약 테스트를
  `__tests__/spike/verification-log.test.ts`에 추가한다 —
  data-model.md의 5가지 이벤트 종류(`task-entered`,
  `permission-checked`, `pipeline-stage`, `task-completed`,
  `task-result`)를 각각 기록한 뒤 `readVerificationLog()`로 순서대로
  다시 읽히는지, `task-entered`의 `appState` 필드가 네 값
  (`"active"`/`"background"`/`"inactive"`/`"unknown"`) 중 하나로
  왕복되는지, 파일이 없을 때 `readVerificationLog()`가 예외 없이
  빈 배열을 돌려주는지(계약 「읽기 계약」), 한 줄이 깨져도
  (`appendVerificationEvent`가 실패해도) 예외가 상위로 전파되지
  않는지(contracts/background-harness.md H3). **아직
  `src/spike/verification-log.ts`가 없으므로 이 시점에는 반드시
  실패한다.**
- [X] T005 [P] 하네스가 제품 계층을 수정하지 않는다는 것(H1)과
  `pipeline.run()`을 우회하지 않는다는 것(H2)을 확인하는 소스 검사
  테스트를 `__tests__/spike/harness-boundary.test.ts`에 추가한다 —
  007·009 관례(jest가 아니라 소스 파일을 `readFileSync`로 직접 읽어
  검사)를 따라, `src/spike/background-diary-task.ts`의 소스 문자열이
  `backend.generate(`나 `acceptance`를 직접 참조하지 않고
  `pipeline.run(`과 `createAppPipeline(`만 참조하는지 확인한다. **아직
  `background-diary-task.ts`가 없으므로 이 시점에는 실패한다.**

### 구현 (T004·T005를 통과시킨다)

- [X] T006 `src/spike/verification-log.ts`를 만든다 — data-model.md의
  `VerificationEvent` 유니온 타입을 정의하고,
  `appendVerificationEvent(event): Promise<void>`(JSON Lines로 파일에
  추가, 실패 시 `console.error`만 하고 예외를 던지지 않음 — H3)와
  `readVerificationLog(): Promise<VerificationEvent[]>`(파일 없으면
  빈 배열)를 구현한다. 저장 경로는 `expo-file-system`의 문서
  디렉터리 아래 `verification-log.jsonl`로 고정하고, 제품
  `DiaryStore`가 쓰는 경로와 겹치지 않는지 확인한다. (T004 통과)
- [X] T007 `scripts/check-constitution.mts`에 `src/spike/`가
  `src/diary/store`·`src/models/roster`·`src/diary/prompt`·
  `src/diary/acceptance`를 import하지 않는지 감시하는 규칙을
  추가한다(plan.md 「Structure Decision」이 tasks 단계로 미룬 결정 —
  003·010·011이 신규 디렉터리를 만들 때마다 헌법 검사에 경계를
  추가해 온 패턴을 그대로 따른다). 위반 주입(임시로 `src/spike/`
  파일에 `import { fileStore } from "../diary/store"`를 추가)으로
  검사가 실제로 잡는지 확인한 뒤 되돌린다.

**Checkpoint**: T004·T005의 계약 테스트가 통과한다. `npm run
test:logic`이 초록불이다. `npm run check:constitution`이 통과한다.

---

## Phase 3: User Story 1 - 잠긴 상태에서 밤새 자동 완주하는가 (Priority: P1) 🎯 MVP

**Goal**: OS 표준 주기적 작업 예약(`expo-background-task`)으로 기존
파이프라인을 화면 없이 트리거하고, 실행 시도·완주·중단 지점·권한
유효성을 로그로 구분해 남긴다.

**Independent Test**: quickstart.md 1단계 — 태스크를 등록하고 24시간
이상 화면을 열지 않은 뒤, 로그의 `task-entered`/`task-completed` 유무
조합만으로 "시도 없음/시도했으나 중단/완주" 셋 중 하나를 판정할 수
있는가.

### Implementation for User Story 1

이 스토리는 실기기 관측이 핵심이므로 구현 작업 위주다(위 Tests 절
참고 — 로그 계약은 이미 Foundational에서 검증됨).

- [X] T008 [US1] `src/spike/background-diary-task.ts`를 만든다 — 모듈
  전역 스코프에서 `TaskManager.defineTask(BACKGROUND_TASK_IDENTIFIER,
  callback)`을 호출한다(research.md §1 — 전역 스코프 요건). 콜백은:
  1. `appendVerificationEvent({ kind: "task-entered", at, day })`
     (day는 `latestClosedDay(new Date())`, `../config/day-boundary`에서
     import)
  2. 사진·위치 권한 확인 — 004의 기존 방식(`getLocation()` 실제
     호출)을 재사용해 성공/예외를 `permission-checked` 이벤트로
     기록(research.md §3)
  3. `currentEnvironment()`(`../config/environment`)로 환경을 얻고
     `createAppPipeline(resolution)`(`../app/wiring`)을 호출
  4. 성공하면 `pipeline.run({ day, now: new Date(), character:
     선택된 캐릭터, vision: 선택된 설정 }, onProgress)`을 호출하되,
     `onProgress`에서 `pipeline-stage` 이벤트를 기록
  5. `PipelineResult`에 따라 `task-completed`(`outcome: "ok"` 또는
     `"pipeline-failed"`, `reason`)를 기록
  6. 최상위 `try/catch`로 전체를 감싸 예외 시
     `task-completed`(`outcome: "threw"`)를 기록(H4)
  7. 마지막으로 `appendVerificationEvent({ kind: "task-result",
     result: ... })`을 기록하고 `BackgroundTask.BackgroundTaskResult
     .Success`/`Failed`를 반환. (T005 통과, contracts/background-
     harness.md H1~H4 준수)
- [X] T008a [US1] T008의 1번 단계(`task-entered` 기록)에
  `AppState.currentState`(`react-native`, 콜백 진입 시점에 읽음)를
  `appState` 필드로 함께 기록한다(research.md §6a, data-model.md
  `task-entered` 타입 — FR-003 "화면이 꺼지고 잠긴 상태"를 완벽히
  판정할 API가 없으므로, 최소한 "앱 UI가 그 순간 전면에 있었는가"만
  근사해 기록한다). `AppState`를 가져오는 시점에 예외가 나면
  `"unknown"`으로 기록한다.
- [X] T008b [US1] `registerBackgroundDiaryTask()`가
  `BackgroundTask.registerTaskAsync()`를 호출할 때 `minimumInterval`을
  API 허용 최솟값인 **15분**으로 명시한다(research.md §7 — 사용자
  요청으로 추가됨). 기본값(12시간)을 그대로 두면 FR-008의 24시간
  방치 구간 안에서 시도 표본이 1~2회뿐이라 우연과 패턴을 가르기
  어렵다. **방치 시간(FR-008의 24시간)은 이 변경으로 줄어들지
  않는다** — 간격을 좁혀 같은 24시간 안에서 시도 횟수만 늘린다.
- [X] T009 [US1] 캐릭터·설정 선택 방식을 정한다 — 이 스파이크는 새
  사용자 설정 화면을 만들지 않으므로(plan.md Project Type), 기존
  `selection-store.ts`·`vision-setting-store.ts`가 이미 영속화한
  마지막 사용자 선택을 그대로 읽어 쓴다(제품 상태를 읽기만 하고
  쓰지 않음 — H1이 금지하는 "제품 계층 수정"에 해당하지 않는 읽기
  전용 참조임을 확인).
- [X] T010 [US1] `src/spike/DiagnosticsBackgroundPanel.tsx`를 만든다
  — `BackgroundTask.getStatusAsync()`로 사용 가능 여부를 표시하고,
  `registerTaskAsync`/`unregisterTaskAsync` 토글 버튼, 그리고
  `readVerificationLog()` 결과를 목록으로 보여주는 "로그 보기" 버튼을
  둔다(research.md의 Expo 공식 예제 패턴을 그대로 따름). 이 화면은
  모델 식별자·프롬프트 내용을 노출하지 않는다(H5).
- [X] T011 [US1] `src/ui/DiagnosticsScreen.tsx`에
  `DiagnosticsBackgroundPanel`을 조건부로 삽입한다 — 기존
  `showsOnScreen()` 게이트(local·dev 전용) 안에서만 렌더링해, 배포
  빌드에서는 이 패널 자체가 번들에 남더라도 화면에 닿지 않는 것을
  보장한다(007·014가 확립한 진단 경로 경계 재사용).
- [X] T012 [US1] 진단 패널에 "지금 즉시 태스크 트리거" 디버그
  버튼을 추가한다(quickstart.md 2·4단계가 요구 — 자연 발생 실행을
  기다리지 않고 확인하기 위한 보조 수단). `TaskManager`가 공식으로
  제공하는 즉시 실행 트리거가 없으므로, `background-diary-task.ts`가
  export하는 콜백 로직을 별도 함수로 뽑아 이 버튼이 직접 호출하되
  **같은 로그 기록 경로를 100% 재사용**한다(로직 중복 없음 — T008의
  콜백 본체를 export된 순수 함수로 만들고 `TaskManager.defineTask`는
  그 함수를 감싸는 얇은 어댑터가 되게 한다).

**Checkpoint**: User Story 1의 하네스가 완성됐다. `npm test`가
초록불이다(1584개 통과, 확인 완료). quickstart.md 1단계를 실기기(dev
빌드, 최소 1회, 24시간 이상 대기 포함)에서 수행해 원시 관측값을
기록하는 것은 **미완료** — 실기기·시간이 필요한 절차이므로 사용자가
직접 수행해야 한다.

---

## Phase 4: User Story 2 - 백그라운드 온디바이스 추론이 완주하는가 (Priority: P2)

**Goal**: US1이 만든 하네스로, 실행 기회가 있다는 전제 아래 실제
무거운 추론(가장 느린 캐릭터, 사진 있는 날의 캡션 포함)이 완주하는지
확인한다.

**Independent Test**: quickstart.md 2·3단계 — 디버그 트리거로 강제
실행한 뒤 `pipeline-stage` 이벤트의 시간순 진행을 읽어 완주 여부와
중단 지점을 판정, 포그라운드 실행과 대조.

### Implementation for User Story 2

이 스토리는 US1의 하네스를 그대로 쓰고 새 코드를 거의 추가하지
않는다 — "완주하는가"는 실측 항목이지 새 계측 코드가 필요한 것이
아니기 때문이다(US1의 `pipeline-stage` 이벤트가 이미 필요한 신호를
전부 제공한다).

- [X] T013 [US2] `src/spike/DiagnosticsBackgroundPanel.tsx`에 대상
  캐릭터를 고를 수 있는 선택지를 추가한다(기본은 T009의 마지막 선택,
  디버그 트리거 시에만 헌법 로스터의 가장 느린 캐릭터(exaone 계열)로
  강제 지정하는 옵션 — spec.md User Story 2 Acceptance Scenario 1이
  요구). 사용자 화면이 아닌 진단 경로이므로 캐릭터 식별자를 노출해도
  원칙 III 위반이 아니다(007이 이미 확립한 경계).
- [X] T014 [US2] quickstart.md 4단계(E1 경합 관측)를 위한 트리거를
  진단 패널에 추가한다 — "쓰기 화면 열기"와 "백그라운드 트리거"를
  거의 동시에 누를 수 있도록 두 버튼을 나란히 둔다(선택 사항,
  plan.md Constraints — 필수 범위 아님). **구현 시 결정**: 별도
  네비게이션 버튼을 추가하지 않는다 — 기존 "지금 즉시 트리거" 버튼
  (T012)과 실제 일기 쓰기 화면(별도 탭)을 수동으로 함께 조작하는
  것으로 충분하다(quickstart.md 4단계가 이미 "거의 동시에 누른다"는
  수동 절차로 기술함 — 새 UI 요소가 필수는 아니었다).
- [ ] T014a [US2] FR-009(배터리 최적화 예외 대조)를 실제로 수행한다
  — quickstart.md 1~3단계를 배터리 최적화 기본값에서 이미 1회
  수행했다면(User Story 1 체크포인트), 설정에서 이 앱에 배터리
  최적화 예외를 부여한 뒤 **같은 quickstart.md 1~3단계를 다시
  수행**하고 그 결과를 별도로 기록한다(quickstart.md 「배터리
  최적화 예외를 줬을 때의 대조」 절). 이 대조 없이는 SC-002가 요구하는
  "조건부 결론의 재현 가능한 구체적 조건"을 findings.md에 쓸 수 없다.

**Checkpoint**: User Story 1과 2 모두 하네스 차원에서 완성됐다(코드
구현 완료, `npm test`·`npm run lint` 전부 초록불). quickstart.md
2·3·4단계와 배터리 예외 대조(T014a)를 실기기에서 수행하고 결과를
기록하는 것은 **미완료** — US1 검증과 같은 세션에서 이어서 수행
가능하다(AGENTS.md 「최소 한 번」 기준).

---

## Phase 5: User Story 3 - 검증 결과가 다음 결정에 쓸 수 있게 기록되는가 (Priority: P3)

**Goal**: US1·US2의 실측 로그를 근거로, 제3자가 재현 없이 이해할 수
있는 결론 문서를 작성한다.

**Independent Test**: spec.md User Story 3 Independent Test — 결과
문서만 읽고 "이 기기·이 OS 버전에서 되는지 안 되는지, 되면 어떤
조건에서인지"를 이해할 수 있는가.

### Implementation for User Story 3

- [ ] T015 [US3] `specs/019-background-diary-feasibility/findings.md`를
  작성한다 — quickstart.md의 "기대 결과 기록란"에 채운 원시 관측값을
  근거로, SC-001(YES/NO/조건부 결론)·SC-002(조건부라면 재현 가능한
  구체적 조건 — T014a의 배터리 예외 대조 결과를 반드시 포함)·
  SC-003(24시간 실측에서 시도 여부 100% 확인)·SC-004(제3자가 읽고
  다음 결정을 내릴 수 있음)·SC-005(권한 유효성 별도 기록)를 각각
  명시적인 절로 나눠 적는다. 기기 모델·안드로이드 버전·배터리 최적화
  설정을 모든 실측값에 함께 적는다(헌법 원칙 V). FR-003 판정에는
  T008a가 기록한 `appState` 값을 근거로 쓰되, 이것이 정확한
  화면-꺼짐·잠금 감지가 아니라 근사치라는 한계를 명시한다
  (research.md §6a).
- [ ] T016 [US3] findings.md에 "다음 스펙에서 고려할 사항" 절을
  추가한다(spec.md Assumptions 마지막 항목) — 실제 기능화 여부는 이
  스펙이 결정하지 않으므로, 020+ 스펙을 쓸 때 참고할 조건(예: E1 잠금
  설계 필요 여부, 배터리 최적화 예외 요청 UI 필요 여부)만 나열하고
  결정하지 않는다.

**Checkpoint**: findings.md가 완성됐다. 이 검증에 참여하지 않은
사람에게 findings.md만 보여주고 "다음에 뭘 해야 할지 알겠는가"를
확인한다(사람에 의한 검토 — 자동화된 체크 없음, 이 스토리의 본질이
사람이 읽을 문서이기 때문).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 세 스토리 모두에 걸친 마감 작업과 하네스의 운명 결정.

- [X] T017 `npm run lint`(eslint + tsc + 헌법 검사 + prettier)를
  실행해 전부 통과하는지 확인한다. **확인 완료** — eslint(경고 2건,
  이 기능과 무관한 기존 파일), tsc, 헌법 검사, prettier 전부 클린.
- [X] T018 위반 주입 확인 — contracts/background-harness.md의 H1~H5를
  실제로 어겨 보고 T005·T007의 방어가 잡는지 확인한다: (a)
  `background-diary-task.ts`에 `import { fileStore } from
  "../diary/store"`를 임시로 추가해 T007의 헌법 검사가 잡는지, (b)
  콜백이 `pipeline.run()` 대신 `backend.generate()`를 직접 부르도록
  임시로 고쳐 T005가 잡는지, (c) `appendVerificationEvent`가 의도적으로
  예외를 던지도록 고쳐 콜백 전체가 깨지는지(H3 위반이 실제로 무엇을
  망가뜨리는지 확인) — 확인 후 전부 되돌린다. **셋 다 실제로 잡히는
  것을 확인**했다(a: 헌법 검사 1건 위반 보고, b: harness-boundary
  테스트 2건 실패, c: verification-log 테스트 2건 실패로 즉시 전파).
- [X] T019 [P] FR-011급 확인(원칙 III·IV) — 진단 패널
  (`DiagnosticsBackgroundPanel.tsx`)이 모델 식별자·소요 시간 비교·
  네이티브 지표를 노출하지 않는지 다시 훑는다(H5 재확인, 사람에 의한
  리뷰). **확인 완료** — 화면에 렌더링되는 텍스트 어디에도 모델
  식별자가 없다(`"narrative"`는 `Character` 값이지 모델 파일명이
  아니며, 코드 주석에만 `exaone` 언급이 있고 화면 텍스트는 "가장
  느린 캐릭터"로만 표시한다).
- [ ] T020 하네스의 운명을 결정한다(plan.md 「검증 종료 후 하네스의
  운명」) — findings.md의 결론에 따라 사용자와 상의해 `src/spike/`와
  `DiagnosticsScreen.tsx`의 진입점 한 줄을 별도 커밋으로 제거하거나,
  020+ 스펙의 출발점으로 남길지 정한다. **이 작업은 이 tasks.md의
  범위 밖 결정을 실행하는 자리일 뿐, 결정 자체는 findings.md 완성 후
  사람이 내린다.**
- [ ] T021 [P] AGENTS.md의 「007~014 기능별 핵심 결론」과 같은 형식으로
  이번 검증(019)의 핵심 결론(YES/NO/조건부, 근거 요약)을 AGENTS.md에
  짧게 추가한다(저장소 관례) — T020에서 하네스를 제거하기로 했어도 이
  기록은 남긴다.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존 없음
- **Foundational (Phase 2)**: Setup 이후. **모든 사용자 스토리를
  막는다** — 로그 계약(T006)과 헌법 경계 방어(T007) 없이는 어느
  스토리도 안전하게 시작할 수 없다.
- **User Story 1 (Phase 3)**: Foundational 완료 후 시작. 이 검증
  전체의 필수 하네스이며 다른 스토리에 의존하지 않는다.
- **User Story 2 (Phase 4)**: User Story 1의 하네스(T008 콜백,
  T010~T012 진단 패널)를 그대로 재사용한다 — 완전히 독립적이지 않고
  US1의 산출물 위에서 관측 범위만 넓힌다.
- **User Story 3 (Phase 5)**: User Story 1·2의 **실기기 관측 결과**에
  의존한다 — 로그가 실제로 쌓이기 전에는 findings.md를 쓸 수 없다.
- **Polish (Phase 6)**: 세 스토리 모두 완료 후.

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 이후 시작. 이 검증의 핵심이며
  독립적으로 의미 있는 산출물(하네스 + 1단계 실측)을 낸다.
- **User Story 2 (P2)**: US1의 하네스에 의존. US1 없이는 트리거할
  대상이 없다.
- **User Story 3 (P3)**: US1·US2의 실측 로그에 의존. 코드 의존은
  없지만(문서 작성뿐) 관측 데이터 의존이 있다.

### Within Each Phase

- 계약 테스트를 먼저 쓰고 실패를 확인한다 → 구현 → 테스트 통과 확인
  (Foundational)
- 하네스 코드(T008) → 진단 UI(T010~T012) → 실기기 관측 → 문서화(US3)
  순서가 자연스럽다

### Parallel Opportunities

- T004·T005(Foundational 계약 테스트, 서로 다른 파일) 병렬 가능
- T003은 다른 Setup 작업과 병렬 가능(디렉터리 준비뿐)
- T019·T021은 다른 마감 작업과 병렬 가능(리뷰·문서 전용)

### 분석에서 추가된 작업 (T008a, T014a)

`/speckit-analyze`가 발견한 커버리지 공백 두 가지를 메운다:

- **T008a**(US1)는 FR-003("화면이 꺼지고 잠긴 상태"만 백그라운드로
  인정)을 위해 `task-entered` 이벤트에 `AppState.currentState` 근사값을
  함께 기록한다 — T008과 같은 파일(`background-diary-task.ts`)이므로
  T008 직후 이어서 작업한다(병렬 불가).
- **T014a**(US2)는 FR-009(배터리 최적화 예외 대조)를 위해 quickstart.md
  1~3단계를 예외 부여 후 재수행한다 — 코드 작업이 아니라 실기기 절차이므로
  User Story 1의 첫 24시간 관측이 끝난 뒤(배터리 최적화 기본값 결과가
  이미 있어야 대조가 의미 있음) 수행한다.

---

## Parallel Example: Foundational

```
Task: "VerificationEvent 로그 계약 테스트를 __tests__/spike/verification-log.test.ts에 추가"
Task: "하네스 경계(H1·H2) 소스 검사 테스트를 __tests__/spike/harness-boundary.test.ts에 추가"
```

---

## Implementation Strategy

### MVP First (User Story 1만)

1. Phase 1: Setup 완료
2. Phase 2: Foundational 완료(로그 계약 + 헌법 경계 — CRITICAL)
3. Phase 3: User Story 1 완료
4. **멈추고 검증**: quickstart.md 1단계를 실기기에서 24시간 이상
   수행. "실행 기회 자체가 있는가"라는 이 검증의 핵심 질문에 이미
   답할 수 있다 — 이것만으로도 SC-001의 결론 초안이 나온다.
5. 결과가 이미 "NO"로 명확하면(OS가 실행 자체를 안 함) User Story
   2는 생략하고 바로 User Story 3(findings.md 작성)로 건너뛸 수
   있다(spec.md quickstart.md 2단계 도입부가 이미 이 조건을 명시).

### Incremental Delivery

1. Setup + Foundational → 로그 계약·경계 방어 완료
2. User Story 1 추가 → 실기기 24시간 관측 → 1단계 결론 확보
3. (실행 기회가 있는 경우만) User Story 2 추가 → 완주 여부 관측
4. User Story 3 추가 → findings.md 작성 → 결론 공유
5. Polish → 하네스 운명 결정, AGENTS.md 기록

---

## Notes

- [P] 작업 = 다른 파일, 완료되지 않은 작업에 의존하지 않음
- [Story] 라벨이 작업을 스토리에 연결한다(추적성)
- 이 검증은 "테스트가 초록불"이 완료 신호가 아니다 — 완료 신호는
  findings.md에 명시적 YES/NO/조건부 결론이 실측 근거와 함께 있는
  것이다(SC-001).
- 커밋은 한국어로(AGENTS.md), 논리적 단위마다
- 각 체크포인트에서 멈춰 스토리를 독립적으로 검증할 수 있다
- 피할 것: 하네스 코드가 제품 계층에 스며드는 것(H1), 실측 없이
  "될 것 같다"로 findings.md를 채우는 것(원칙 V 위반)
- **가장 위험한 실패 지점은 24시간 관측 도중 기기를 건드리는
  것이다** — 확인하고 싶은 마음에 중간에 화면을 켜면 "화면 없이
  방치"라는 전제 자체가 깨진다. 등록 후에는 정말로 손대지 않는다.
