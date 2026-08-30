# Tasks: 백그라운드 안정성 및 예외 대응

> **진행 상태(2026-08-30, `/speckit-implement`)**: 코드측 12/31 완료.
> **끝난 것** — Setup 4개(T001~T004), US1 계약 테스트(T005·T006), US3
> 계약 테스트 + 위반 주입(T016·T017·T018), 소스 확인(T022 재부팅 배선·T026
> AppState 부재), 기기 없는 게이트(T028), 문서(T029 findings.md·T030
> AGENTS.md). `npm test` 1984개 통과, lint 0 error, 헌법 검사 위반 0.
> **부분(`[~]`)** — T009·T010(`lock.ts` 근거 주석은 교체, **값은 5분 유지**
> — `narrative` M 실측 후 확정), T020(`collect.ts` 무변경 — 004 설계상 이미
> `unknown`으로 감쌈, 실기기 §4에서 예외 갈래 나오면 그때 보강).
> **남은 것(사람 수행)** — 실기기 5라운드(T007·T008 §1 narrative 완주 /
> T012·T013·T014 §2·§3 배터리 소크 / T019·T021 §4 권한 회수 / T023·T024·T025
> §5 재부팅 / T027 §6 Maestro 회귀 / T011 180초 대비 / T015 020 FR-010 회귀),
> T031 커밋. SM-S901N 무선. quickstart.md 절차대로 수행 후 findings.md 표를
> 채운다.

**Input**: Design documents from `/specs/024-background-stability-exceptions/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/(×2), quickstart.md — 모두 존재함

**Tests**: **포함한다.** 헌법 「개발 방식」이 "계약을 먼저 정하고 테스트를
먼저 쓴다"를 MUST로 요구하고, 이 저장소는 007·009·012 이래 **소스 선언을
`readFileSync`로 직접 읽는 계약 테스트**를 관례로 굳혔다. 이 스펙의 계약
(SR1~SR6, SL1~SL5)은 전부 순수 판정·소스 검사라 기기 없이 검증 가능하다.
실기기로만 증명되는 항목(narrative 완주 시간, 배터리 소크, 권한 회수 재현,
재부팅 복구)은 quickstart.md 수행으로 대체한다.

**Organization**: spec.md의 User Story 1(P1, narrative 완주 + `STALE_LOCK_MS`)
→ User Story 2(P1, 배터리 예외/무예외 소크) → User Story 3(P1, 권한 회수 시
신호 정직성) → User Story 4(P2, 재부팅 복구) 순서. US1·US2·US3는 spec에서
**모두 P1**이다.

## 이 스펙의 성격 — 검증과 보강

새 사용자 기능·새 저장 계층·새 네이티브 모듈·검증 전용 로그 모듈·새 진단
패널을 만들지 않는다(FR-012, SC-007). 코드 변경은 **두 곳뿐**:

1. `src/schedule/lock.ts` — `STALE_LOCK_MS` 근거 주석 교체, (실측이 5분
   초과 시만) 값 상향. (US1)
2. `src/signals/collect.ts` — **실기기 재현에서 `unknown`이 아닌 갈래가
   발견될 때만** 그 한 분기 보강. 대개 무변경. (US3)

나머지는 계약 테스트 추가/보강, 실기기 검증 4라운드, `findings.md`·AGENTS.md
기록, 회귀 확인이다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능(다른 파일, 미완료 작업 의존 없음)
- **[Story]**: 어느 사용자 스토리(US1~US4). Setup·Polish는 라벨 없음
- 파일 경로를 정확히 포함한다

## Path Conventions

단일 프로젝트(plan.md 「Structure Decision」). 이 스펙은 020이 만든
`src/schedule/` 경계와 004가 만든 `src/signals/collect.ts` 경계를 **재사용·
보강만** 한다. 새 디렉터리·새 파일을 만들지 않는다(계약 테스트 스위트
1~2개 제외).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 검증 준비 — 합성 하루, 캐릭터 세팅, 회귀 베이스라인 확인.
새 의존성 없음.

- [X] T001 `npx expo install --check`로 신규 의존성이 없고 버전 어긋남이
  0인지 확인한다(FR-012 — 이 스펙은 패키지를 추가하지 않는다).
- [X] T002 [P] 현재 `npm test`·`npm run lint`가 초록불인지 베이스라인을
  기록한다(회귀 판정 기준). `jest-projects.test.ts`의 파일 수 검사가
  `> 40`인지도 확인.
- [X] T003 [P] `scripts/run-device-tests.mjs`의 `FLOWS` 배열에서 회귀
  대상을 확인한다 — `scheduled-diary-notification.yml`(020)·
  `unified-permission-onboarding.yml`(021)·`photo-selection-over-limit.yml`
  (023)이 등록돼 있는지(research.md §7). 새 흐름은 추가하지 않는다
  (권한 회수·재부팅은 실기기 수동 절차 — quickstart §4·§5).
- [X] T004 [P] `specs/024-background-stability-exceptions/findings.md`
  뼈대를 만든다 — data-model.md §1~§4의 빈 표 4개 + 헤더(기기 SM-S901N,
  Android 16/SDK 36, 삼성 One UI). 실측 후 채운다.

**Checkpoint**: 베이스라인 초록불 확인, 회귀 대상 파악, findings.md 뼈대
준비.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 US의 계약 테스트가 의존하는 것 — 없음. 이 스펙의 계약은
전부 기존 파일(`lock.ts`·`collect.ts`)을 대상으로 하므로 별도 기반 작업이
없다.

**⚠️ CRITICAL**: 이 스펙에는 차단 기반 작업이 없다. Phase 1 완료 후 각
US를 바로 시작할 수 있다. (US1의 `STALE_LOCK_MS` 값 확정만 실기기 §1
실측에 의존 — 아래 Phase 3에서 순서로 처리.)

---

## Phase 3: User Story 1 - 느리게 쓰는 캐릭터로도 자동 생성이 조용히 완주한다 (Priority: P1) 🎯 MVP

**Goal**: 오드(narrative)로 사진 있는 날·없는 날 백그라운드 자동 생성이
중단 없이 완주하고, 그 실측 완주 시간이 `STALE_LOCK_MS`(경합 잠금 만료
기준)의 근거가 된다.

**Independent Test**: quickstart.md §1 — 캐릭터를 `narrative`로 세팅,
개발자 탭 "지금 자동 생성 트리거"로 화면 끈 상태 백그라운드 실행, cold/warm
× 사진 유무. `adb logcat`으로 완주 시간·`Success`·일기 1개·판정 통과.

### 계약 테스트 먼저 (헌법 「개발 방식」 MUST)

- [X] T005 [P] [US1] `__tests__/schedule/lock.test.ts`에 SL1~SL5 케이스를
  추가한다(020 T038 스위트 확장) — contracts/stale-lock-basis.md:
  - **SL1**: **기존 검사를 재사용·확장한다** — `__tests__/diary/pipeline.lock.test.ts:118`이
    이미 `pipeline.ts`의 `STALE_LOCK_MS`/`5 * 60 * 1000` 하드코딩 부재를,
    `lock.test.ts:217`이 `lock.ts` 단일 정의(`export const STALE_LOCK_MS`)를
    검사한다. **새로 추가할 것은 `src/schedule/task.ts` 검사뿐** —
    `readFileSync`로 읽어 잠금 만료 시간 리터럴(`300000`, `5 * 60 * 1000`,
    `4 * 60 * 1000` 등)이 **없는지**. `STALE_LOCK_MS` import만 허용.
  - **SL2**: `src/schedule/lock.ts`를 읽어 `STALE_LOCK_MS` 위 주석이
    `narrative` 실측을 참조하는지(정규식 — "`narrative`.*완주.*최댓값" 또는
    "024 실측.*narrative"). "`quiet`.*2분 27초"만 있고 `narrative` 참조가
    없으면 **실패해야 한다**(이 시점엔 아직 주석 미교체 → 빨간불이 정상).
  - **SL3**: `decideAcquire` 소스에 `Date.now()`/`new Date()` 없음(소스
    검사). 100회 무작위 순서 시뮬레이션에서 두 `granted` 동시 유효 0건
    (기존 스위트에 있으면 재확인, 없으면 추가).
  - **SL4**: `STALE_LOCK_MS`가 `5 * 60 * 1000`이거나(무변경), 상향됐다면
    `% 60000 === 0`(분 단위). 이 케이스는 §1 실측 후 T009에서 값이 정해진
    뒤 최종 판정.
- [X] T006 [P] [US1] T005가 SL2에서 **실패하는 것을 확인**한다(주석이 아직
  `narrative`를 참조 안 함). `npm run test:logic`.

### 실기기 실측 (quickstart.md §1 — 사람 수행, SM-S901N 무선)

- [ ] T007 [US1] quickstart.md §1을 수행한다 — 개발자 탭에서 오드(narrative)
  선택, `npm run seed:day -- rich 2026-08-27`(사진 3장) + 빈 하루, 자동
  생성 ON·목표 시각 현재 시. **cold 라운드**: `am force-stop` 후 재실행 →
  개발자 탭 "지금 자동 생성 트리거" → 즉시 화면 끄고 잠금 확인 →
  `adb logcat -v time | grep -E "pipeline-stage|task-|Success|Failed"`로
  진입~완주 벽시계(`wallClockMs`), `engine.run()` 구간(`engineRunMs`).
  **warm 라운드**: 연속 2번째 트리거. 사진 있는 날/없는 날 각각.
- [ ] T008 [US1] 각 실행 후 저장된 일기를 확인한다 —
  `adb shell run-as com.anonymous.alpharium ls files/diary/` → 그 날짜
  파일 1개(`finalDiaryCount: 1`), 열어서 판정 통과·본문 정상
  (`verdictPassed: true`). data-model.md §1 표 각 행을 `findings.md`에
  기록(character·dayShape·coldOrWarm·wallClockMs·engineRunMs·visionMs·
  result·finalDiaryCount·verdictPassed·notes).

### `STALE_LOCK_MS` 확정 (contracts/stale-lock-basis.md SL4)

- [~] T009 [US1] `findings.md` §1의 cold `wallClockMs` 최댓값 `M`으로
  규칙(data-model.md §5)을 적용한다 —
  `새값 = ceil(M × 2 / 60000) × 60000`:
  - `새값 <= 300000`: `src/schedule/lock.ts`의 `STALE_LOCK_MS` **값
    무변경**. 근거 주석만 교체 — "019 실측 ... `quiet` 2분 27초의 2배 +
    여유(L7). narrative ... 4분을 넘으면 재검토" → "024 실측:
    `narrative` 백그라운드 완주 최댓값 M초(콜드, SM-S901N/Android 16) × 2,
    분 단위 올림 = N분. (측정: specs/024-.../findings.md §1)".
  - `새값 > 300000`: `STALE_LOCK_MS`를 `새값`으로 상향 + 주석 교체.
    `pipeline.ts`·`task.ts`는 여전히 import만(SL1).
- [~] T010 [US1] T005의 SL1~SL5가 이제 **통과하는지** 확인한다
  (`npm run test:logic`). SL2가 초록불(주석이 `narrative` 참조), SL4가
  값 규칙 충족. `npm run lint`(헌법 검사 — `checkScheduleFile` 위반 0).
- [ ] T011 [US1] `M`이 `GENERATION_TIMEOUT_MS`(180초, `src/inference/sampling.ts`)
  + 적재 시간에 근접/초과하는지 판정한다 — 초과 시 `result: "timeout"`
  빈도(트리거 대비 몇 회)와 실측값을 `findings.md`에 기록(FR-014).
  **180초 한도·`VISION_PHOTO_LIMIT`은 바꾸지 않는다**(FR-014 MUST NOT) —
  기록만 남기고 상한 조정은 별도 스펙으로 넘긴다.

**Checkpoint**: `lock.test.ts`(SL1~SL5) 통과. `narrative` 백그라운드
완주가 사진 유무·cold/warm 전부 `Success`·일기 1개·판정 통과(SC-001).
`STALE_LOCK_MS`가 `narrative` 실측 종속으로 확정(SC-002).

---

## Phase 4: User Story 2 - 배터리 예외를 주면 목표 시각 근방에 실제로 쓰인다 (Priority: P1)

**Goal**: 배터리 최적화 예외 부여 시 목표 시각으로부터 1시간 이내 최소
1회 시도(MUST), 예외 없이도 24시간 안 1회(MUST). 020 SC-002·SC-003의
빈 실측 자리를 채운다.

**Independent Test**: quickstart.md §2·§3 — `deviceidle whitelist` +/−,
`standby-bucket`·`jobscheduler Minimum latency` 확인, 화면 끈 채 관측,
목표 시각으로부터 첫 `task-entered` 지연 수집.

### 실기기 실측 (사람 수행, SM-S901N 무선)

- [ ] T012 [US2] quickstart.md §2를 수행한다(배터리 예외 라운드, SC-003) —
  `adb shell dumpsys deviceidle whitelist +com.anonymous.alpharium`,
  `am get-standby-bucket` → `5` 확인,
  `dumpsys jobscheduler | grep -A30 alpharium` → `Minimum latency:
  +14m59s...` 확인. 목표 시각 현재+5분 이내 시, 화면 끄고 잠금 확인,
  **이후 화면 조작 금지**. `adb logcat -d -b all`을 주기적으로 덤프해
  `task-entered` 시각과 목표 시각으로부터의 분(`delayFromTargetMin`)을
  최소 3회 모은다.
- [ ] T013 [US2] quickstart.md §3을 수행한다(무예외 24시간 소크,
  SC-002·SC-004) — `deviceidle whitelist -com.anonymous.alpharium`,
  `am get-standby-bucket` → `10` 이상, 목표 시각 설정, 화면 끄고 잠금
  확인, **24시간+ 화면 조작 금지**(Doze — 019 research §7). 2~4시간마다
  `adb logcat -d -b all > dump_<ts>.txt`로 버퍼 보존. 24시간+ 뒤
  `task-entered`/`pipeline-stage` 흔적 확인.
- [ ] T014 [US2] data-model.md §2 표를 `findings.md`에 기록한다 —
  배터리 예외 라운드(batteryException·targetHour·triggerEnteredAt[]·
  delayFromTargetMin[]·standbyBucket·minLatencyReported)와 무예외 소크
  (screenTouchedDuringRound: false 확인). **MUST 판정**: 예외 시 첫 시도
  ≤ 60분(SC-003), 무예외 24시간 안 ≥ 1회(SC-002·SC-004). **SHOULD**:
  예외 시 3회 이상 표본의 과반 ≤ 40분 — 3회 미만이면 "원시값만,
  best-effort"로 표기(Clarifications).
- [ ] T015 [P] [US2] 020 FR-010 회귀 확인 — 자동 생성 설정 화면(설정 탭)에
  배터리 예외 안내 상시 링크가 여전히 있고, 예외를 안 준 채로도 기능이
  "고장이 아니라 지연이 크다"는 상태로 동작하는지(US2 Scenario 4).
  코드 변경 없음(회귀만).

**Checkpoint**: 020이 비워 둔 SC-002·SC-003 실측이 `findings.md`에 수치로
기록됨. 배터리 인텐트가 실제 도착한 삼성 One UI 설정 화면 경로 포함.

---

## Phase 5: User Story 3 - 자동 생성 중 권한이 사라져도 일기가 정직하다 (Priority: P1)

**Goal**: 백그라운드 생성 중 사진/위치 권한이 회수돼도 저장된 일기 신호가
`unknown`이고 본문에 단정이 없다. `src/signals/collect.ts`의 004 방어를
백그라운드·실행 중 회수 타이밍에서 잠근다.

**Independent Test**: (a) 순수 판정 — `granted`가 아닌 모든 권한 상태 +
조회 후 접근 실패에서 `unknown`, never `none`(SR1~SR4). (b) 실기기 —
quickstart.md §4, `narrative` 실행 창 안에서 `pm revoke`.

### 계약 테스트 먼저 (헌법 「개발 방식」 MUST)

- [X] T016 [P] [US3] `__tests__/signals/signal-revocation.test.ts`를
  만든다(신규 스위트, `.ts` — 순수 로직, node 환경) —
  contracts/signal-revocation.md SR1~SR6. fake `PhotoPort`로
  `collectDaySignals(port, day)`를 돌린다:
  - **SR1**: `photoPermission()`이 `"limited"`·`"denied"`·`"blocked"`·
    `"undetermined"` 각각일 때 `photos.kind === "unknown"`, **`"none"`
    아님**, `reason` 비어 있지 않음.
  - **SR2**: `photoPermission()` → `"granted"`, `photosBetween()`가
    던짐 → `photos.kind === "unknown"`, `"none"` 아님, `reason`에 조회
    실패 맥락.
  - **SR3**: `photos.kind !== "known"` → `places.kind === "unknown"`,
    이유가 "사진을 보지 못해..." 계열. `photos` `known`인데 `locationOf()`
    전부 던짐 → `places.kind === "unknown"`, `photos`는 `known` 유지.
  - **SR4**: 포트가 던져도 `collectDaySignals`가 던지지 않고 `DaySignals`
    반환.
  - **SR6**: `readFileSync`로 `src/signals/collect.ts`를 읽어
    `src/schedule/`·`diary/prompt`·`diary/store` import가 없는지, 새
    `SignalValue` 갈래(`known`/`none`/`unknown` 외)가 없는지.
  - `jest-projects.test.ts`의 파일 수 검사가 `> 40`을 유지하는지 함께
    확인(스위트 추가).
- [X] T017 [P] [US3] T016이 통과하는지 확인한다(`npm run test:logic`) —
  `collect.ts`가 이미 004 설계상 SR1~SR4를 담고 있으므로 **초록불이
  정상**. 만약 빨간불이면 그 갈래가 이 스펙의 보강 대상(T020).
- [X] T018 [P] [US3] 위반 주입으로 방어를 확인한다(SR5) —
  `collect.ts`를 임시로 (a) `denied`에서 `{ kind: "none" }` 반환,
  (b) `photosBetween` catch가 `{ kind: "none" }` 반환, (c) `places`
  `failures === considered.length`에서 `{ kind: "none" }` 반환,
  (d) `collectDaySignals`의 `try/catch` 제거 — 각각 SR1·SR2·SR3·SR4가
  잡는지 확인하고 **되돌린다**(007~023 관례).

### 실기기 재현 (quickstart.md §4 — 사람 수행)

- [ ] T019 [US3] quickstart.md §4를 수행한다 — 사진·위치 권한 부여 상태로
  §1의 `narrative` 사진 있는 날 cold 트리거 → `adb logcat`으로 신호 수집
  단계 진입 직후
  `adb shell pm revoke com.anonymous.alpharium android.permission.READ_MEDIA_IMAGES`
  (+ `READ_MEDIA_VISUAL_USER_SELECTED`). 완주 후 저장된 일기의 사진
  신호가 `unknown`인지, 본문에 사진 단정("사진을 안 찍었다" 류)이 없는지.
  별도로 위치만 회수(`ACCESS_FINE_LOCATION`·`ACCESS_COARSE_LOCATION`) →
  자리 신호 `unknown`, 사진 신호 생존(FR-007). 신호 빈약으로 거부되면
  기존 파일 보존 확인(원칙 I).
- [~] T020 [US3] **T019에서 `unknown`이 아닌 값(특히 `none`)이 나오는
  갈래가 발견될 때만** `src/signals/collect.ts`의 그 한 분기를 기존
  `unknown` 반환으로 유도한다 — **새 `SignalValue` 갈래를 만들지 않는다**
  (SR6, 헌법 원칙 V). 보강했으면 T016의 SR1~SR4에 그 케이스를 추가해
  회귀를 잠근다. 발견 없으면 이 태스크는 "무변경 — collect.ts는 004
  설계대로 모든 갈래를 unknown으로 감쌌다"로 findings.md에 기록.
- [ ] T021 [US3] data-model.md §4 표를 `findings.md`에 기록한다 —
  저장된 일기는 `adb shell run-as com.anonymous.alpharium cat
  files/diary/<날짜>.json`으로 읽고 `signalsUsed.photos.kind`·
  `signalsUsed.places.kind`(`DiaryEntry.signalsUsed: DaySignals` —
  `src/diary/types.ts`)를 확인한다. 필드: axis·revokedDuringRun·
  permissionQueryResult(회수 후 `photoPermission()` 반환값 — research.md §5의
  두 분기 중 실제로 도는 쪽)·storedSignalKind·otherAxisSurvived·
  bodyHasAssertion·verdictOrRejected·fileUntouchedOnReject.
  **기대**: `storedSignalKind: "unknown"` 100%, `bodyHasAssertion: false`
  100%(SC-005).

**Checkpoint**: SR1~SR6 통과. 실기기 권한 회수 재현에서 신호 `unknown`·
본문 단정 없음 확인. `collect.ts` 무변경(또는 한 분기 보강 + 회귀 잠금).

---

## Phase 6: User Story 4 - 기기를 껐다 켜도 자동 생성이 되살아난다 (Priority: P2)

**Goal**: 자동 생성을 켠 채 재부팅하면 앱을 한 번 연 시점에 예약이
되살아난다. 앱을 열기 전 구간의 한계를 문서화한다.

**Independent Test**: quickstart.md §5 — `dumpsys jobscheduler`로 재부팅
전/후(앱 열기 전)/앱 연 후 등록 상태 조회.

### 소스 확인 + 실기기 (사람 수행)

- [X] T022 [P] [US4] `App.tsx`에서 020 T024가 배선한 재부팅 복구 경로를
  소스로 확인한다 — 마운트 시 자동 생성 설정을 읽어 `enabled === true`면
  `backgroundPort.register()`를 idempotent 호출하는 자리(020
  contracts/background-generation.md B5). 이 스펙은 **이 코드를 바꾸지
  않는다** — 경로가 존재함을 확인만.
- [ ] T023 [US4] quickstart.md §5를 수행한다 — 자동 생성 ON,
  `adb shell dumpsys jobscheduler | grep alpharium`로 등록 확인
  (`phase: "before-reboot"`) → `adb reboot` → 재연결 후 앱 열기 전 조회
  (`phase: "after-reboot-app-closed"` — 사라져 있어도 정상) → 기기 잠금
  해제(사람 PIN) + 앱 한 번 열기 → 몇 초 뒤 조회
  (`phase: "after-reboot-app-opened"` — `registered: true` 기대). §5 후
  `adb reverse tcp:8081 tcp:8081` 다시 건다.
- [ ] T024 [US4] 꺼진 상태 대조 — 자동 생성 OFF → 재부팅 → 앱 열기 →
  어느 phase에서도 `registered: false`(US4 Scenario 3).
- [ ] T025 [US4] data-model.md §3 표를 `findings.md`에 기록하고, **한계를
  문서화한다**(FR-010, US4 Scenario 2) — "재부팅 후 앱을 한 번도 열지
  않은 구간에는 재등록이 보장되지 않는다. `BOOT_COMPLETED` 브로드캐스트
  수신 같은 새 네이티브 경로는 만들지 않는다(범위 밖)." Direct Boot
  관측(첫 잠금 해제 전 `run-as`/저장소 실패 — 데이터 손실 아님)도 있으면
  기록.

**Checkpoint**: enabled=true면 재부팅 후 앱 열기 시 재등록(SC-006).
한계가 `findings.md`에 명시.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 회귀 확인, 문서 마감, 기기 없는 게이트.

- [X] T026 [P] `AppState.currentState`를 판정에 쓰지 않는다는 것을 확인하고
  문서화한다(FR-011, 019 §6a 계승) — `src/schedule/`·`src/signals/`
  소스에 `AppState` 참조가 없는지 확인, `findings.md`와 AGENTS.md 024
  절에 "이 값은 '앱 UI가 전경에 없음'의 근사치이지 '화면이 꺼져 있음'의
  증거가 아니다" 문장 추가.
- [ ] T027 [P] quickstart.md §6 회귀 — `npm run test:device`로 020·021·023
  `FLOWS` 흐름이 통과하는지. 실패 시 024 회귀인지 기존 stale인지 분리
  (020·022·023이 반복 관측한 "개발자 탭 stale 버그" 패턴 주의).
- [X] T028 quickstart.md §7 기기 없는 게이트(SC-007) — `npm run test:logic`
  (SR1~SR6·SL1~SL5), `npm test`(전체, `jest-projects.test.ts` `> 40`),
  `npm run lint`(eslint + tsc + 헌법 검사 + prettier, `checkScheduleFile`
  위반 0). `git diff --stat`으로 변경 파일이 `src/schedule/lock.ts`·
  `__tests__/schedule/lock.test.ts`·`__tests__/signals/signal-revocation.test.ts`·
  (조건부)`src/signals/collect.ts`·`AGENTS.md`·`specs/024-*`에 한정되는지
  — 새 `src/` 파일·새 화면·새 `*-port.ts`·새 `preferences/*.json`·새
  네이티브 모듈·새 진단 패널·검증 전용 로그 모듈이 0인지.
- [X] T029 `specs/024-background-stability-exceptions/findings.md`를
  완성한다(FR-013, SC-008) — quickstart.md §8의 항목 전부: 기기·OS·조건,
  narrative 완주 표(§1), 배터리 라운드 표(§2), 재부팅 복구 표(§3), 권한
  회수 표(§4), `STALE_LOCK_MS` 결정과 `M`, narrative 완주 vs 180초 한도
  위치 + `VISION_PHOTO_LIMIT` 판단 근거(FR-014), 배터리 인텐트가 도착한
  삼성 One UI 설정 화면 경로, `AppState` 한계 문장, 미확인 잔여.
- [X] T030 `AGENTS.md`에 `### 024 — 백그라운드 안정성 및 예외 대응
  (2026-08-XX)` 절을 추가한다(저장소 관례, 019·020·023이 남긴 자리) —
  "020이 비워 둔 실기기 검증(narrative 완주·배터리 예외/무예외 소크)을
  채웠다", `STALE_LOCK_MS` 최종값과 근거, "권한 회수 시 `collect.ts`가
  이미 `unknown`으로 감싸는 것을 백그라운드 타이밍에서 확인(무변경/한
  분기 보강)", 재부팅 복구 관측과 한계, `AppState` 한계, `narrative`가
  180초 한도에 대해 어디에 위치하는지(FR-014 근거).
- [ ] T031 커밋을 논리 묶음으로 나눈다(헌법 「개발 방식」 — 한국어 메시지):
  (1) 계약 테스트 추가(T005·T016), (2) `lock.ts` `STALE_LOCK_MS` 근거·값
  (T009), (3) (있으면) `collect.ts` 보강(T020), (4) `findings.md`·AGENTS.md
  (T029·T030). `main` 직접 커밋 금지(`.githooks/pre-commit` — 브랜치
  `024-background-stability-exceptions`에서 작업).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존 없음. 즉시 시작. T002·T003·T004는 병렬.
- **Foundational (Phase 2)**: 이 스펙에는 차단 기반 작업이 없다.
- **User Story 1 (Phase 3)**: Setup 후. 계약 테스트(T005·T006)는 즉시,
  값 확정(T009·T010)은 실기기 §1 실측(T007·T008)에 의존.
- **User Story 2 (Phase 4)**: Setup 후. US1과 독립 — 별도 실기기
  라운드(배터리 소크). **T013(24시간 소크)은 시작하면 24시간+ 걸린다** —
  다른 작업과 병행해 백그라운드로 돌린다.
- **User Story 3 (Phase 5)**: Setup 후. 계약 테스트(T016~T018)는 US1·US2와
  독립·병렬. 실기기 재현(T019)은 US1의 §1 라운드에 겸하면 효율적.
- **User Story 4 (Phase 6)**: Setup 후. 재부팅은 다른 실기기 라운드와
  겹치면 안 되므로(재부팅이 진행 중 관측을 깬다) US1~US3 실기기 라운드
  이후에 배치.
- **Polish (Phase 7)**: 원하는 US가 끝난 뒤. T028(기기 없는 게이트)은
  코드 변경(T009·T020) 후 언제든.

### User Story Dependencies

- **US1 (P1)**: Setup 후. 다른 스토리 의존 없음. `STALE_LOCK_MS` 값이
  실기기 실측에 의존(순서 내부 처리).
- **US2 (P1)**: Setup 후. 완전 독립(코드 변경 없음, 실측만).
- **US3 (P1)**: Setup 후. 계약 테스트 완전 독립. 실기기는 US1 라운드에
  겸함.
- **US4 (P2)**: Setup 후. 소스 확인 독립, 실기기는 US1~US3 라운드 이후.

### Within Each User Story

- 계약 테스트를 먼저 쓰고 실패(또는 004 설계상 통과)를 확인한 뒤 진행
  (헌법 「개발 방식」 MUST).
- US1: 계약 테스트 → 실기기 §1 → `M` 확정 → `lock.ts` 주석/값 → 테스트
  통과 확인.
- US3: 계약 테스트(SR) → 위반 주입 → 실기기 재현 → (있으면) 보강 → 회귀
  잠금.

### Parallel Opportunities

- Setup: T002·T003·T004 병렬.
- US1 계약 테스트(T005·T006)와 US3 계약 테스트(T016·T017·T018)는 서로
  다른 파일 — 병렬.
- T015(US2 FR-010 회귀 확인)는 코드 변경 없어 언제든.
- T013(무예외 24시간 소크)은 시작 후 24시간 대기 — 그 사이 US1·US3 계약
  테스트, US1 §1 라운드, US4 소스 확인을 진행.
- T026·T027(Polish 회귀·문서)은 병렬.

---

## Parallel Example: 계약 테스트 (US1 + US3)

```bash
# 서로 다른 파일 — 함께 진행:
Task: "lock.test.ts에 SL1~SL5 추가 (T005)"
Task: "signal-revocation.test.ts 신규 SR1~SR6 (T016)"

# 각각 실패/통과 확인:
Task: "T005 SL2 실패 확인 — 주석 미교체 (T006)"
Task: "T016 SR1~SR4 통과 확인 — collect.ts 004 설계 (T017)"
```

---

## Implementation Strategy

### MVP = User Story 1 + User Story 2 + User Story 3 (셋 다 P1)

spec.md가 셋을 P1로 뒀다 — narrative 완주(US1), 배터리 소크(US2), 권한
회수 정직성(US3)이 각각 020·019가 남긴 핵심 부채다.

1. Phase 1: Setup (베이스라인·회귀 대상·findings.md 뼈대).
2. Phase 3: US1 — 계약 테스트 → 실기기 §1(narrative 완주) → `STALE_LOCK_MS`
   확정.
3. Phase 5: US3 — 계약 테스트(SR) + 위반 주입 → 실기기 §4(US1 라운드에
   겸함).
4. Phase 4: US2 — 실기기 §2(배터리 예외) + §3(무예외 24h 소크, 백그라운드).
5. **STOP and VALIDATE**: `findings.md`에 세 부채의 실측이 수치로 채워짐.
6. Phase 6: US4 — 재부팅 복구(P2).
7. Phase 7: Polish — 회귀·문서·기기 없는 게이트.

### Incremental Delivery

1. Setup → 준비 완료.
2. US1 → `STALE_LOCK_MS`가 실측 종속으로 확정 → "가장 느린 캐릭터도
   안전" 근거.
3. US3 → 권한 회수 정직성 계약이 잠김 → 실기기로 재확인.
4. US2 → 020 SC-002·SC-003 실측 자리가 채워짐.
5. US4 → 재부팅 복구 확인 + 한계 문서화.
6. Polish → 회귀·AGENTS.md 024 절.

---

## Notes

- **이 스펙은 코드 변경이 최소다** — `src/schedule/lock.ts`(주석 + 조건부
  값), (조건부)`src/signals/collect.ts` 한 분기. 나머지는 계약 테스트·
  실기기 실측·문서.
- **계약 테스트는 소스 선언을 직접 읽는다**(007·009·012 관례) — SL1(리터럴
  부재)·SL2(주석 문구)·SL3(`Date.now()` 부재)·SR6(import 경계)가 전부
  소스 검사.
- **위반 주입으로 방어를 검증한다**(007~023 공통) — SL5·SR5.
- **`STALE_LOCK_MS` 값은 사람이 실측을 보고 상수로 못 박는다**(헌법 원칙 V) —
  코드가 시간을 재서 자동으로 정하지 않는다.
- **180초 한도·`VISION_PHOTO_LIMIT`은 이 스펙에서 바꾸지 않는다**(FR-014) —
  `narrative`가 그 한도에 대해 어디 있는지 기록만.
- 커밋 메시지는 한국어. `main` 직접 커밋 금지(`.githooks/`).
- 피할 것: 검증 전용 로그 모듈 되살리기, 개발자 탭 소요 시간 패널 추가,
  `src/schedule/`가 신호를 알게 하기, 새 `SignalValue` 갈래, `AppState`를
  판정에 쓰기, `BOOT_COMPLETED` 리시버 추가.

---

## Phase 8: Convergence

> **근거**: `/speckit-converge`(2026-08-30, 실기기 2차 세션 이후). §9 헤드리스
> 수정 재확인·§3 재부팅 복구·§4 권한 회수·§7 Maestro 회귀는 완료(findings.md
> §3·§4·§7·§9, 커밋 `99d6df1`). 아래는 spec의 MUST 요구사항 중 아직 실측이
> 비어 있거나 부분만 확인된 것. **§2 배터리 소크(T032·T033)는 사용자가 이번
> 회차에 건너뛰기로 명시**했으므로 `/speckit-implement`가 이를 자동 수행하지
> 않는다 — 스펙 완전 충족을 위해 남겨 둔 추적 항목이다.

- [ ] T032 [US2] 배터리 예외 라운드 소크를 수행한다 per FR-004 / SC-003 (missing)
  — quickstart.md §2. `adb shell dumpsys deviceidle whitelist
  +com.anonymous.alpharium` → `am get-standby-bucket` `5` 확인 → 목표 시각
  현재+몇 분 → 화면 끄고 잠금 → **자연 15분+ 주기로** `task-entered` 시각을
  최소 1회(SHOULD 3회) 수집. `cmd jobscheduler run -f`는 삼성 절전이 도즈 시
  거부하므로 강제 실행 불가 — 자연 대기만 유효. **MUST**: 목표 시각으로부터
  첫 시도 ≤ 60분. findings.md §2 표(`batteryException: true` 행) 기록.
- [ ] T033 [US2] 무예외 24시간 소크를 수행한다 per FR-005 / SC-004 (missing) —
  quickstart.md §3. `deviceidle whitelist -com.anonymous.alpharium` →
  `am get-standby-bucket` `10` 이상 → 목표 시각 설정 → 화면 끄고 **24시간+
  조작 금지** → 2~4시간마다 `adb logcat -d -b all > dump_<ts>.txt` → 24시간+
  뒤 `task-entered` 흔적 확인. **MUST**: 목표 시각 지난 뒤 24시간 안 ≥ 1회.
  `Minimum latency`가 15분으로 정확히 전달됐는지도 확인(억제 원인이 OS임).
  findings.md §2 표(`batteryException: false` 행) 기록.
- [ ] T034 [US1] `narrative` 헤드리스 완주를 실측한다 per FR-001 / SC-001 /
  US1/AC2 (partial) — 지금까지 §1은 포그라운드만, §9 헤드리스는 `quiet`만
  완주 확인(158초, 포그라운드의 ~3배). 배터리 예외 부여 상태에서 캐릭터를
  `narrative`로, 사진 있는 날(시드 8장)을 대상으로 화면 끈 잠긴 상태
  `cmd jobscheduler run -f` → `writingMs`·`visionMs`·완주 벽시계 실측 →
  `GENERATION_TIMEOUT_MS`(180초, `writingMs` 구간) 초과 여부와 `result:
  "timeout"` 빈도 기록(FR-014). **180초 한도·`VISION_PHOTO_LIMIT`은 바꾸지
  않는다**. findings.md §1·§9 갱신. EXAONE mojibake(§10)가 재현되면 함께
  기록하되 이 스펙 범위 밖으로 유지.
- [ ] T035 [US4] `enabled:false` 재부팅 대조군을 수행한다 per US4/AC3 / SC-006
  (missing) — quickstart.md §5 절차 6. `auto-diary.json`을 `enabled:false`로
  → `adb reboot` → 재연결 후 앱 열기 → 어느 phase에서도 `dumpsys jobscheduler`에
  `JOB #u0a569 …/androidx.work…SystemJobService`가 **없는지** 확인(꺼진 상태를
  재부팅이 되살리지 않는다). findings.md §3 표의 `false / after-reboot-app-opened`
  행을 채운다.
- [ ] T036 release 빌드로 §9 헤드리스 경로를 재확인한다 per plan: 코드 변경 범위
  / SC-007 (partial) — `task.ts`가 `require("expo-task-manager")`를 **모듈
  최상단 동기 호출**로 바꿨다(§9 수정). debug 헤드리스 등록·완주는 확인됐으나
  R8·ProGuard가 이 `require` 경로를 어떻게 다루는지 미확인. AGENTS.md "release
  빌드와 서명" 절차로 release APK 빌드 → Metro 없이 설치 → 설정 탭 진입으로
  잡 등록 확인 → 화면 끈 잠긴 상태 강제 실행 → `No task registered` 에러
  부재·완주 확인. 012 기준("새 네이티브 모듈이나 빌드 설정을 건드릴 때만
  release 재확인")에 이 `require` 변경이 해당하는지 판단해 findings.md에 근거와
  함께 기록. **해당 안 하면 "debug 1회로 충분" 근거를 명시**하고 이 태스크를
  그대로 종료 처리.
- [ ] T037 검증용 모델·합성 하루를 기기에 재배치한다 per quickstart §1 전제
  (missing) — 2차 세션 Maestro `unified-permission-onboarding.yml`의
  `clearState`(=`pm clear`)가 `files/models/`의 `a1.bin`(kanana)·`a2.bin`
  (exaone)·`v1.bin`+`v2.bin`(VLM)·`state.json`과 일기·`preferences/*`를 전부
  삭제했다. 개발 기계에서 모델을 받아 `run-as com.anonymous.alpharium`로
  `files/models/`에 배치 + `state.json`에 `passed:true` verdict 추가(021 D2
  방식). `npm run seed:day`로 사진 있는/없는 하루 준비. **이후 T032·T034·T035가
  이 환경에 의존**한다. (환경 복구 태스크 — 스펙 요구사항이 아니라 후속 실측의
  전제.)
