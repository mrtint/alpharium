# Tasks: 024 잔여 실측 마무리

> **진행 상태(2026-09-01, `/speckit-implement`)**: 기기 없는 부분 완료.
> **끝난 것** — Setup 5개(T001~T005), Foundational 중 T009(배터리 인텐트
> 액션 소스 특정), Polish 중 T028(기기 없는 게이트 — `test:logic` 87스위트/
> 1749테스트 통과, lint 0 error, 헌법 검사 위반 0, prettier 클린). `findings.md`
> 뼈대 + §0(코드/설정 사전 확인) 작성.
> **남은 것(전부 실기기·사람 수행)** — T006~T008(모델·합성 하루·캐릭터 배치),
> US1(T010~T013 배터리 예외 소크), US2(T014~T018 무예외 24h 소크 — **비동기,
> 24h+ 방치 필요**), US3(T019~T021 삼성 One UI 화면), US4(T022~T027 release
> 헤드리스 — **서명 키 전제**), T029~T033(대조·회귀·findings/AGENTS·커밋).
> SM-S901N 무선, 14번 세션과 함께. quickstart.md 절차대로 수행 후 findings.md
> 표를 채운다. **코드 변경은 US4 RH3 실패 시에만**(T025~T027).

**Input**: Design documents from `/specs/027-024-residual-verification/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/(×2), quickstart.md — 모두 존재함

**Tests**: **조건부 포함.** 이 스펙은 코드 변경 0줄이 기본이라 계약 테스트도
기본적으로 없다. **US4의 RH3(release 헤드리스)가 실패해 FR-007 수정을 하는
경우에만** `__tests__/schedule/background-generation.test.ts` B1a 확장(소스
검사, 007·009·012 관례)을 추가한다. 실기기로만 증명되는 항목(배터리 소크,
삼성 One UI 화면, release 헤드리스)은 quickstart.md 수행으로 대체한다.

**Organization**: spec.md의 User Story 1(P1, 배터리 예외 소크) → User Story 2
(P1, 무예외 24h 소크 — 비동기) → User Story 3(P2, 삼성 One UI 화면) →
User Story 4(P1, release 헤드리스). US1·US2·US4는 spec에서 **모두 P1**,
US3만 P2.

## 이 스펙의 성격 — 024의 미완 검증 마무리

새 사용자 기능·새 저장 계층·새 네이티브 모듈·검증 전용 로그 모듈·새 진단
패널을 만들지 않는다(FR-008, 024 SC-007 계승). **코드 변경은 조건부이며
많아야 한 곳**:

- `src/schedule/task.ts` — **US4 RH3가 release에서 `No task registered`를
  재현할 때만** `AUTO_DIARY_TASK_REGISTERED` 명시적 참조 1~3줄(research §4
  옵션 A). RH3 통과 시 무변경(기본).

나머지는 실기기 검증 4라운드, `findings.md`(024 §2·§11)·AGENTS.md 기록,
조건부 회귀다.

**14번 세션과 함께 돈다**(spec Assumptions) — 공통 실기기 준비(모델 배치·
배터리 예외 토글·합성 하루)를 겹쳐 수행하되 `findings.md`는 분리한다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능(다른 파일/독립 관측, 미완료 작업 의존 없음)
- **[Story]**: 어느 사용자 스토리(US1~US4). Setup·Polish는 라벨 없음
- 파일 경로를 정확히 포함한다

## Path Conventions

단일 프로젝트(plan.md 「Structure Decision」). 020이 만든 `src/schedule/`
경계와 024가 고친 `task.ts` 모듈 최상단 `defineTask` 부수 효과를 그대로
쓴다. 새 디렉터리·새 파일 없음(조건부 계약 테스트 확장 제외).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 검증 준비 — 공통 실기기 준비, 회귀 베이스라인, findings 뼈대.
새 의존성 없음.

- [X] T001 `npx expo install --check`로 신규 의존성이 없는지 확인한다(FR-008
  — 이 스펙은 패키지를 추가하지 않는다). 기존 패치 버전 어긋남은 이 스펙이
  만든 것이 아니므로 무시.
- [X] T002 [P] 현재 `npm run test:logic`·`npm run lint`가 초록불인지
  베이스라인을 기록한다(회귀 판정 기준, SC-005·SC-006). `git rev-parse HEAD`도
  기록 — 기본 경로에서 `git diff src/`가 0줄임을 마지막에 대조하기 위해.
- [X] T003 [P] `android/app/build.gradle`(69행)과 `android/gradle.properties`를
  읽어 `android.enableMinifyInReleaseBuilds`가 **미설정 → 기본 `false`**임을
  재확인하고 `findings.md`에 옮긴다(research §3 — US4의 R8 관련 전제).
- [X] T004 [P] `scripts/run-device-tests.mjs`의 `FLOWS`에서 회귀 대상을
  확인한다 — `scheduled-diary-notification.yml`(020)·
  `unified-permission-onboarding.yml`(021)·`photo-selection-over-limit.yml`
  (023). 새 흐름은 추가하지 않는다(이 스펙의 라운드는 실기기 수동 절차).
- [X] T005 [P] `findings.md` 뼈대를 만든다 — 024 `findings.md` §2 표에 채울
  두 행(`batteryException: true`/`false`) + 삼성 One UI 화면 경로 자리 +
  §11 갱신 자리. 헤더에 기기(SM-S901N), Android 16/SDK 36, 삼성 One UI,
  세션 날짜. 갱신은 024 `findings.md` 직접 또는 027 `findings.md` + 024에서
  링크 중 하나로 못 박는다(FR-011, 한쪽에만).

**Checkpoint**: 베이스라인 초록불, minify OFF 재확인, 회귀 대상 파악,
findings 뼈대 준비.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 실기기 라운드가 공통으로 의존하는 준비. **코드 작업 없음** —
전부 기기 준비.

- [ ] T006 공통 실기기 준비 — 검증용 `quiet` 모델을 배치한다(quickstart
  "공통 실기기 준비", **FR-009 — quiet만, narrative 제외**): 개발 기계에서
  `a1.bin`(kanana) 받아 `run-as com.anonymous.alpharium`로 `files/models/`에
  배치 + `state.json`에 `passed:true` verdict(021 D2 방식). `narrative`·VLM은
  14번 세션이 배치.
- [ ] T007 [P] 사진 없는 합성 하루를 준비한다 — `npm run seed:day -- empty
  <날짜>`(사진 0장이면 `quiet`로 충분, 사진 있는 하루는 027에 불필요).
- [ ] T008 [P] 자동 생성 캐릭터를 `quiet`(금동이)로 세팅한다 — 007 캐릭터
  선택(개발자 탭 또는 `adb`로 `preferences/selection.json` 주입).
  **FR-009 — `narrative`는 선택하지 않는다**(로드맵 14번 몫).
- [X] T009 [P] 소스에서 배터리 버튼의 인텐트 액션을 특정한다(US3 사전
  작업, research §2) — `AutoDiarySettingsScreen`의 `onOpenBatterySettings`
  (testID `open-battery-settings`) 구현부와 021의 `PermissionsSection` /
  온보딩 배터리 단계를 본다. ⚠️ `src/onboarding/os-settings-port.ts` 주석은
  `IGNORE_BATTERY_OPTIMIZATION_SETTINGS`, `requirements.ts`·
  `plugins/with-battery-exception.js`는 `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`로
  **주석이 서로 다르므로**, 실제 호출부(`expo-intent-launcher` 인자)를 봐서
  확정하고 `findings.md` §3 레코드의 `intentAction` 칸에 미리 적는다(실기기
  클릭 전).

**Checkpoint**: `quiet` 모델·합성 하루·캐릭터 세팅 완료, 배터리 인텐트
액션 파악. 실기기 라운드 진입 가능.

**⚠️ 순서 주의**: `unified-permission-onboarding.yml` 회귀(T024)는
`pm clear`로 T006~T008을 전부 날린다 — US1~US4 뒤에 돌리거나 이후 재배치.

---

## Phase 3: User Story 1 — 배터리 예외 상태 소크 (Priority: P1)

**Goal**: 배터리 예외를 준 상태에서 목표 시각→자동 생성 첫 시도 지연이
모든 라운드에서 ≤ 60분인지 판정한다(SC-001).

**Independent Test**: `deviceidle whitelist +` → `am get-standby-bucket` `5`
→ 목표 시각 현재+5분 → 화면 끄고 잠금 → 자연 15분+ 주기로 `logcat -d` 덤프,
`BackgroundTaskConsumer: Executing task 'alpharium-auto-diary'` 시각 수집 →
`delayFromTargetMin` 기록. 다른 US에 의존하지 않는다.

- [ ] T010 [US1] quickstart §1 절차 1~4를 수행한다 — `deviceidle whitelist
  +com.anonymous.alpharium`, `am get-standby-bucket` → `5` 확인,
  `dumpsys jobscheduler | grep -A30 alpharium` → `Minimum latency:
  +14m59s...` 확인, 자동 생성 ON + 목표 시각, `KEYCODE_POWER` →
  `deviceLocked=1`. (contracts BS1) **첫 덤프에서 `task-entered` 대용
  logcat 문자열을 확정한다** — research §1은 `BackgroundTaskConsumer:
  Executing task 'alpharium-auto-diary'`를 제안하나 더 이른 신호가 보이면
  그것으로 정하고 `findings.md`에 grep 문자열을 못박는다(이후 T011·T015·T016이
  같은 문자열을 쓴다).
- [ ] T011 [US1] quickstart §1 절차 5~6을 수행한다 — 15분+ 주기로
  `adb logcat -d -v time -b all`을 스크래치에 덤프하며 `task-entered` 대용
  신호 시각을 모은다. 최소 1회, SHOULD 3회(각 시도 후 목표 시각을 다음 시로
  옮기거나 다음 콜백 대기).
- [ ] T012 [US1] contracts BS2로 판정한다 — 유효한 모든 라운드에서
  `delayFromTargetMin <= 60`(MUST). 라운드 `>= 3`이면 과반 `<= 40` 여부,
  `< 3`이면 원시값 + "best-effort, 표본 N회" 라벨(019 표본 2회 10·32분과
  대조). `screenTouchedDuringRound: true`인 라운드는 무효 처리하고 다시.
- [ ] T013 [US1] 024 `findings.md` §2 표 `batteryException: true` 행을
  채운다 — `targetHour`·`triggerEnteredAt`·`delayFromTargetMin`·
  `standbyBucket: 5`·`minLatencyReported`·`screenTouchedDuringRound`·`notes`
  (data-model §1). SC-001 판정(충족/실패)을 명시.

**Checkpoint**: US1 독립 판정 완료 — SC-001 충족 여부가 findings에 수치로.

---

## Phase 4: User Story 2 — 무예외 24시간 소크 (Priority: P1) — 비동기

**Goal**: 배터리 예외 없이 24시간 안에 자동 생성이 ≥ 1회 시도되는지 판정한다
(SC-002). 억제 원인이 OS임을 `Minimum latency` 15분 전달로 확인한다.

**Independent Test**: `deviceidle whitelist -` → `am get-standby-bucket` `10`+
→ 목표 시각 설정 → 화면 끄고 잠근 뒤 24시간+ 조작 금지 → 2~4시간마다
`logcat -d -b all` 덤프 → 24시간+ 뒤 `task-entered` 흔적. **비동기** — 세션
안에서 "시작"만.

- [ ] T014 [US2] quickstart §2 "시작 절차"를 수행한다 — `deviceidle
  whitelist -com.anonymous.alpharium`, `am get-standby-bucket` → `10` 이상
  확인, 자동 생성 ON + 목표 시각, `roundStartedAt` 기록, `KEYCODE_POWER` →
  `deviceLocked=1`. **이후 24시간+ 화면 조작 금지, 조회는 `logcat -d`만**
  (contracts BS3, 019 §6a·§7).
- [ ] T015 [US2] 방치 중 2~4시간마다 `adb logcat -d -b all > dump_<ts>.txt`로
  버퍼를 스크래치에 보존한다(링 버퍼 넘침 대비). **세션이 끝나도 기기는
  방치 상태 유지** — 다음 접속 때 이어받는다.
- [ ] T016 [US2] (24시간+ 뒤, 세션 밖 후속 — **`/speckit-implement`는 이
  태스크를 "차단됨: 24h 경과 대기"로 두고 다음 세션에서 이어받는다**)
  quickstart §2 "확인 절차"를 수행한다 — 쌓인 덤프에서 `task-entered` 대용
  신호 흔적을 찾아 `observedHours`·`attemptCount` 계산. `dumpsys jobscheduler`의
  `Minimum latency`가 15분 전달됐는지(억제 원인이 OS). 세션이 24시간 창을
  못 채우면 T017의 "부분 판정" 경로로 간다.
- [ ] T017 [US2] contracts BS4로 판정한다 — `observedHours >= 24` 안에
  `attemptCount >= 1`이면 SC-002 충족. `< 24`면 `{ observedHours,
  attemptCount }` 원시값 + "부분 판정 — N시간 관측 후 M회" 라벨(024
  Clarifications 허용). `Minimum latency` 15분 확인은 `observedHours`와
  무관하게 항상 기록.
- [ ] T018 [US2] 024 `findings.md` §2 표 `batteryException: false` 행을
  채운다 — `standbyBucket`(10+)·`observedHours`·`attemptCount`·
  `minLatencyReported`·`screenTouchedDuringRound: false`·`notes`
  (data-model §1). SC-002 판정(충족/부분 판정)을 명시.

**Checkpoint**: US2 판정 완료(또는 "부분 판정"으로 정직하게 표기) —
findings에 원시값과 라벨.

---

## Phase 5: User Story 3 — 삼성 One UI 배터리 화면 (Priority: P2)

**Goal**: "배터리 설정 열기" 버튼이 삼성 One UI의 어느 화면에 도달하는지
(제목·경로), 예외 부여 시 `standbyBucket`이 `5`로 바뀌는지 기록한다(SC-003).

**Independent Test**: 앱을 열어 설정 "권한" 섹션(또는 온보딩 배터리 단계)의
배터리 버튼을 실제로 누름 → `dumpsys activity activities`로 최상위 액티비티·
제목·경로 기록 → "제한 없음" 선택 → 복귀 → `am get-standby-bucket` `5` 확인.

- [ ] T019 [US3] quickstart §3 절차 2~4를 수행한다 — 앱을 열어 배터리 버튼을
  **실제로 누르고**(`adb whitelist` 동등물로 갈음 안 함, contracts BS5),
  `adb shell dumpsys activity activities | head -40`에서 `landedActivity`,
  화면 제목(`screenTitle`), 삼성 One UI 설정 계층 경로(`reachPath`) 기록.
  그 화면에서 "제한 없음" 선택 → 앱 복귀 → `am get-standby-bucket` → `5`인지
  (`exceptionGrantable`·`standbyBucketAfterGrant`).
- [ ] T020 [US3] quickstart §3 절차 5를 수행한다 — 버튼을 안 눌러도/실패해도
  온보딩이 다음 단계로 가는지(`onboardingProceededWithoutGrant` — 021
  `batteryNoticeShown` 판정).
- [ ] T021 [US3] `findings.md` §3 레코드(data-model §2)를 채운다 —
  `trigger`·`intentAction`(T009에서 미리)·`landedActivity`·`screenTitle`·
  `reachPath`·`exceptionGrantable`·`standbyBucketAfterGrant`·
  `onboardingProceededWithoutGrant`·`failureMode`. `failureMode !== null`
  이면 검증 차단 여부 판단 — US1을 `adb whitelist`로 재현 가능하므로 대개
  차단 아님(실사용자 영향이면 별도 스펙 후보로 명시). SC-003 판정.

**Checkpoint**: 삼성 One UI 배터리 화면 경로가 findings에 021 T030 형식으로.

---

## Phase 6: User Story 4 — release APK 헤드리스 확인 (Priority: P1)

**Goal**: 현재 release 빌드 구성(minify OFF)으로 024 §9 헤드리스 등록·완주가
성립하는지 1회 확인한다(SC-004). 실패 시 최소 수정(FR-007).

**Independent Test**: AGENTS.md "release 빌드와 서명" 절차 → `apksigner
verify` → Metro 없이 설치 → 설정 탭 진입 잡 등록 확인 → 배터리 예외 부여 →
화면 끔·잠금 → `cmd jobscheduler run -f` → `No task registered` 부재 +
`quiet` 완주.

- [ ] T022 [US4] quickstart §4 절차 1~4를 수행한다(contracts RH1·RH2) —
  서명 키 전제 확인(`~/.alpharium-signing/alpharium.jks` +
  `~/.gradle/gradle.properties` 비밀번호; 없으면 US4 중단, 사용자에게 알림),
  release APK 배치 전 debug로 `quiet` 모델 배치(T006 재사용), `prebuild
  --platform android --clean` → 키 복원 → `NODE_ENV=production
  assembleRelease`, `apksigner verify --print-certs`(`CN=Android Debug`
  아님) / `git ls-files | grep -i jks`(빈 결과) / Metro 없이 설치 후 앱
  열기(`Unable to load script`·"이 빌드는 잘못 만들어졌다" 없음).
- [ ] T023 [US4] quickstart §4 절차 5를 수행한다(contracts RH3) — 설정 탭
  진입 잡 등록 확인 → `deviceidle whitelist +com.anonymous.alpharium` →
  `KEYCODE_POWER` → `deviceLocked=1` → `cmd jobscheduler run -f
  com.anonymous.alpharium <id>` → `adb logcat -d`에서 `No task registered
  for key expo-task-manager` **부재**, `Registered task with name
  'alpharium-auto-diary'` 존재, `quiet` 완주 알림, `WM-WorkerWrapper: Worker
  result SUCCESS`.
- [ ] T024 [US4] **RH3 통과 시(기본 경로, RH6)**: 코드 변경 없음. `git diff
  src/`가 0줄임을 확인하고(SC-005), `findings.md` §11을 "현재 release 빌드
  (minify OFF)에서 §9 헤드리스 등록·완주 확인 완료. R8 트리셰이킹은 minify가
  켜질 때(로드맵 4번) 재검토"로 갱신(data-model §3, `dceTrimReproduced:
  false`).
- [ ] T025 [US4] **RH3 실패 시에만(FR-007, RH4)**: `src/schedule/task.ts`에
  `AUTO_DIARY_TASK_REGISTERED` 명시적 참조 1~3줄 + "제거 불가" 주석을
  추가한다(research §4 옵션 A). `proguard-rules.pro`·`gradle.properties`·
  `metro.config.js`는 건드리지 않는다(FR-008).
- [ ] T026 [US4] **T025 수행 시에만(RH5)**: `__tests__/schedule/background-generation.test.ts`
  B1a를 확장한다 — R-DCE 방어 구문이 `src/schedule/task.ts` 소스에 있는지
  `readFileSync` 검사(007·009·012 관례). **위반 주입**: 그 참조 구문을
  지우면 테스트가 실패함을 실제로 확인 후 되돌린다. `npm run test:logic`·
  `npm run lint` 통과.
- [ ] T027 [US4] **T025 수행 시에만**: release를 재빌드하고 T022~T023을
  재실행해 `No task registered` 부재를 확인한다. `findings.md` §11에
  `fixApplied` 기록(data-model §3).

**Checkpoint**: release 헤드리스 등록·완주 확인 — 기본 경로면 코드 0줄,
실패 경로면 최소 수정 + 계약 테스트 + release 재확인.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 회귀, 기기 없는 게이트, 문서 마무리.

- [X] T028 [P] 기기 없는 게이트를 확인한다(quickstart §6, SC-005·SC-006) —
  `npm run test:logic` 전부 통과(`jest-projects.test.ts` 파일 수 검사 유지;
  T026 수행 시 그 스위트 포함), `npm run lint` eslint 0 error·tsc 클린·
  헌법 검사 위반 0(`checkScheduleFile` 포함)·prettier 클린.
- [ ] T029 `git diff --stat`으로 코드 변경 범위를 대조한다(SC-005) — 기본
  경로면 `src/` 0줄(변경은 `specs/027-*`·`specs/024-*/findings.md`·
  `AGENTS.md`뿐). T025 수행 시 `src/schedule/task.ts` 1~3줄 +
  `__tests__/schedule/background-generation.test.ts`만. 새 `src/` 파일 0·
  새 화면 0·새 `*-port.ts` 0·새 `preferences/*.json` 0·새 네이티브 모듈 0·
  새 진단 패널 0·빌드 설정 파일 0.
- [ ] T030 회귀를 확인한다(quickstart §5) — **코드 변경이 없으면 형식적**
  (024 §7이 이미 돌림). **T025로 `task.ts`를 고쳤으면 필수**:
  `npm run test:device`로 020·021·023 흐름 PASS.
  ⚠️ `unified-permission-onboarding.yml`은 `pm clear`로 앱 데이터를 날리므로
  **맨 마지막에**, 또는 이후 T006~T008 재배치.
- [ ] T031 024 `findings.md`를 갱신한다(FR-011, quickstart §7) — §2 표
  두 행(T013·T018) + 삼성 One UI 화면 경로(T021) + §11(T024 또는 T027).
  "미확인 잔여" 목록에서 "§2 배터리 예외/무예외 소크", "배터리 인텐트가
  도착한 삼성 One UI 설정 화면 경로", "release APK로 §9 헤드리스 1회 확인"
  세 줄을 해소 표기 또는 제거. 한쪽에만(중복 금지).
- [ ] T032 AGENTS.md에 결론 한 문단을 추가한다(FR-010, quickstart §7) —
  "024 —" 절 또는 새 "027 —" 절에 배터리 소크 판정(SC-001·SC-002),
  삼성 One UI 배터리 화면 경로, release 헤드리스 확인 결과, minify OFF 사실.
- [ ] T033 `git branch --show-current`로 `027-024-residual-verification`
  브랜치임을 확인한 뒤 커밋한다 — 한국어 메시지(헌법 「개발 방식」),
  `main` 직접 커밋 금지(`.githooks/pre-commit`이 막음). 기본 경로면
  "027: 실측 마무리 — 배터리 소크·삼성 One UI 화면·release 헤드리스 확인
  (코드 무변경)". T025 수행 시 그 수정을 메시지에 명시.

---

## Dependencies & Execution Order

### Phase 순서

1. **Setup (Phase 1)** — T001~T005. 먼저. T002~T005는 [P].
2. **Foundational (Phase 2)** — T006~T009. Setup 후. T007·T008·T009는 [P],
   T006(모델 배치)이 US4 T022의 전제이기도 함.
3. **User Stories** — US1(P3)·US2(P4)·US3(P5)·US4(P6). **US1·US2·US3는
   서로 독립**(다른 배터리 상태·다른 관측). US4는 T006에 의존.
   - **US2는 비동기** — T014~T015(시작)를 US1·US3 사이에 끼워 넣고, 24시간
     경과 후 T016~T018(확인)을 세션 밖에서.
   - 실기기 라운드 순서 권장: US1(T010~T013) → **US2 시작(T014~T015)** →
     US3(T019~T021) → US4(T022~T027) → (24h 뒤) US2 확인(T016~T018).
4. **Polish (Phase 7)** — T028~T033. 모든 US 후. T028은 [P].
   T030 회귀는 T025 수행 시에만 필수.

### 핵심 의존

- T006(quiet 모델) → T022(release 전 debug 배치), T011(US1 생성이 돌려면
  모델 필요 — 단 배터리 예외 소크는 "언제 트리거되나"만 보므로 생성 완주는
  부수적).
- T023(RH3 결과) → T024(통과) XOR T025~T027(실패 → 수정 → 재확인).
- T025 → T026(계약 테스트) → T027(release 재확인) → T030(회귀 필수화).
- T013·T018·T021·(T024|T027) → T031(findings 종합) → T032(AGENTS) → T033(커밋).

### ⚠️ 앱 데이터 삭제 순서

`unified-permission-onboarding.yml`(T030)이 `pm clear`로 T006~T008을 날린다.
US1~US4를 먼저 완료하고 T030을 마지막에. 14번 세션이 이 흐름을 먼저 돌리면
그 뒤 T006~T008을 재수행.

---

## Parallel Execution Examples

### Setup 병렬 (T002~T005)

```
T002 베이스라인 기록  ─┐
T003 minify OFF 재확인 ─┼─ 병렬 (서로 다른 파일 읽기/기록)
T004 FLOWS 확인       ─┤
T005 findings 뼈대    ─┘
```

### Foundational 병렬 (T007~T009)

```
T007 합성 하루 seed        ─┐
T008 캐릭터 quiet 세팅     ─┼─ 병렬 (T006 모델 배치와 독립)
T009 배터리 인텐트 액션 특정 ─┘
```

### User Story 병렬성

- **US1·US3는 병렬 가능** — 다른 배터리 상태를 안 겹치게 순차로 하되,
  US3(화면 클릭)는 US1 소크 대기 중 짬에 수행 가능.
- **US2는 시작만 하면 24시간 백그라운드** — US1·US3·US4를 그 사이에.
- **US4(release 빌드)는 별도 빌드 사이클** — 소크 대기 중 병렬 진행 가능
  (빌드는 기기 상태와 무관).

---

## Implementation Strategy

### 이 스펙은 "구현"이 거의 없다

코드 변경 0줄이 기본이다. "MVP"는 **US1 + US2 + US4**(전부 P1) —
- **US1**: 배터리 예외 소크로 SC-001 판정.
- **US2**: 무예외 소크 시작(비동기, 부분 판정 허용).
- **US4**: release 헤드리스 확인 — 024 §11의 마지막 잔여 위험 닫기.
- **US3**(P2): 삼성 One UI 화면 경로 — 있으면 좋지만 US1을 `adb whitelist`로
  재현할 수 있어 판정을 막지 않는다.

### 증분 전달

1. **US4 먼저 가능** — release 빌드는 소크 대기와 병렬. RH3 통과면 여기서
   코드 0줄 확정.
2. **US1 + US2 시작** — 배터리 예외 소크(US1) 후 예외 해제하고 무예외
   소크(US2) 시작.
3. **US3** — 소크 대기 중 짬에.
4. **24시간 뒤 US2 확인** — 세션 밖 후속.
5. **Polish** — findings·AGENTS 종합, 회귀(코드 고쳤을 때만), 커밋.

### 조건부 코드 경로 (US4 RH3 실패 시)

T025~T027·T030이 발동한다 — `task.ts` 1~3줄 + 계약 테스트 + release 재확인 +
Maestro 회귀. 이때만 이 스펙이 "구현"을 포함한다.
