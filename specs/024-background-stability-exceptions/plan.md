# Implementation Plan: 백그라운드 안정성 및 예외 대응

**Branch**: `024-background-stability-exceptions` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/024-background-stability-exceptions/spec.md`

## Summary

020이 배포한 시간대 지정 자동 일기 작성을, 019·020·021·023이 미확인으로 남긴
위험 조건(가장 느린 `narrative` 캐릭터, 배터리 예외 24시간 소크, 실행 중 권한
회수, 재부팅 복구)에서 실기기로 검증하고, 그 결과가 요구하는 **최소한의 코드
보강만** 한다. 새 사용자 기능·새 저장 계층·새 네이티브 모듈·검증 전용 로그
모듈·새 진단 패널을 만들지 않는다.

**기술 접근**:

1. **순수 판정 계약 테스트 보강** — `src/signals/collect.ts`가 이미 담고 있는
   "권한 실패 → `unknown`, 절대 `none` 아님"을 `granted` 아닌 **모든** 권한
   상태(그리고 실행 중 회수 타이밍)에서 잠그는 테스트를 추가한다(US3). 소스는
   대개 이미 옳으므로 테스트가 방어를 명시화하는 것이 주다.
2. **경합 잠금 만료 상수를 실측 종속으로 만든다** — `STALE_LOCK_MS`(현재 5분)의
   근거 주석을 "`quiet` 2분 27초 × 2"에서 "`narrative` 실측 최댓값 × 2 + 여유"로
   바꾸고, 실측이 5분을 넘으면 값을 올린다(US1). 값은 여전히 `src/schedule/lock.ts`
   한 곳에만 있고 다른 파일이 하드코딩하지 않는다(020 L8 유지).
3. **실기기 검증** — SM-S901N(무선 디버깅)에서 `narrative` 백그라운드/포그라운드
   완주 시간, 배터리 예외/무예외 라운드, 권한 회수 재현, 재부팅 복구를
   `adb logcat`(020이 이미 찍는 파이프라인 로그)과 OS 조회(`dumpsys jobscheduler`·
   `deviceidle`)로 재고 `findings.md`·AGENTS.md에 옮긴다(US1·US2·US3·US4).
4. **회귀 확인** — 020의 `.maestro/scheduled-diary-notification.yml`, 021·023의
   흐름이 여전히 통과하는지. 020이 비워 둔 tasks.md T053~T055의 실측 자리를
   024가 채운다.

## Technical Context

**Language/Version**: TypeScript 5.x (React Native 0.86 / Expo SDK 57, 기존 기준선)

**Primary Dependencies**: 신규 없음. 재사용만 — `expo-background-task`·
`expo-task-manager`(020), `expo-notifications`(020), `expo-media-library`·
`expo-location`(004·021), `llama.rn`(005). `expo install --check`로 버전
어긋남 0 유지.

**Storage**: 신규 없음. 재사용만 — `preferences/auto-diary.json`(020 설정),
`preferences/notified.json`(020 알림 상태), `locks/diary-generation.lock`(020
경합 잠금), `diary/*.json`(일기). 이 스펙은 새 파일 종류를 만들지 않는다.

**Testing**: `npm run test:logic`(순수 로직, node 환경), `npm run test:ui`(화면,
jest-expo), `npm test`(전체), `npm run lint`(eslint + tsc + 헌법 검사 +
prettier), `npm run test:device`(Maestro, 실기기). 기기 없는 계약 테스트는
소스 선언을 `readFileSync`로 직접 읽는 007·009·012 관례를 따른다.

**Target Platform**: Android(실기기 SM-S901N/Galaxy S22, Android 16 / SDK 36,
삼성 One UI). 019·020의 "이 기기·이 OS·이 제조사 기준" 한계를 계승한다.

**Project Type**: 단일 프로젝트(모바일 앱). `src/` 아래 계층 구조, 화면은
`src/ui/`, 스케줄 순수 판정·통로는 `src/schedule/`(020이 만듦), 신호는
`src/signals/`.

**Performance Goals**:
- `narrative` 백그라운드 완주 시간을 **실측**한다(현재 미지 — 019는 `quiet`만,
  콜드 최대 242초는 포그라운드 관측). 목표가 아니라 측정 대상이다.
- 배터리 예외 적용 시 목표 시각으로부터 자동 생성 첫 시도까지 **1시간 이내**
  (MUST), 과반이 40분 이내(SHOULD, 관측 지향값).
- 배터리 예외 없이 24시간 안 최소 1회 시도(MUST).
- 생성 시간 한도 `GENERATION_TIMEOUT_MS = 180_000`(`src/inference/sampling.ts`)은
  이 스펙에서 **바꾸지 않는다**. 초과 시 `failed` → FR-013 재시도(자가 치유).

**Constraints**:
- 새 영속 저장 계층·새 네이티브 모듈·검증 전용 로그 모듈·새 진단 패널 금지
  (FR-012, SC-007).
- 코드 변경은 `src/schedule/`·`pipeline.run()`의 옵셔널 `acquireLock`·`task.ts`·
  `src/signals/`의 재사용·보강에 한정(FR-012).
- `src/schedule/` 파일이 `diary/prompt`·`diary/acceptance`·`models/roster`·
  `backend.generate()`에 직접 닿지 않는다(020 `checkScheduleFile` 유지).
- 순수 판정 함수는 `now`/`nowMs`를 인자로 받고 `new Date()`를 안 부른다
  (020 관례).
- 실기기에서 시각을 사람이 자유롭게 못 바꾼다(root 필요) → 목표 시각 "현재+몇
  분" + 개발자 탭 "지금 자동 생성 트리거" 버튼으로 재현(020 관행).

**Scale/Scope**: 코드 변경 예상 규모 — 계약 테스트 1~3개 스위트 추가/보강,
`src/schedule/lock.ts` 주석·(조건부)상수 1곳, `.maestro/` 흐름 회귀 확인.
실기기 검증 라운드 4종(narrative 완주, 배터리 예외, 무예외 24h, 권한 회수 +
재부팅). 새 화면 0개.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### 원칙 I — 온디바이스가 제품이다 (NON-NEGOTIABLE)

- **영향**: 이 스펙은 추론 위치를 바꾸지 않는다. 자동 생성은 020이 이미
  `wiring.ts` → `selectBackend()`를 거쳐 온디바이스로 돈다.
- **US3가 원칙 I의 방어선을 검증한다** — "신호가 빈약해 거부되면 파일을
  건드리지 않는다(실패가 텍스트를 반환하지 않는다)"가 백그라운드·권한 회수
  경로에서도 성립함을 확인한다. `GenerationFailure`에 `text` 자리를 새로
  만들지 않는다(FR-008).
- **판정**: 통과. 방어를 검증할 뿐 완화하지 않는다.

### 원칙 II — 화자는 휴대폰이고, 시야는 좁다

- **영향**: US3 — 권한 회수로 신호가 `unknown`이면 일기는 "사진을 안 찍었다"
  같은 단정을 하지 않는다(FR-006). 이는 헌법 원칙 II가 이미 요구하는 것이며
  `src/diary/prompt.ts`가 `unknown`/`none`을 다른 문장으로 옮긴다.
- **판정**: 통과. 프롬프트·판정 갈래를 건드리지 않는다(`checkScheduleFile`이
  `src/schedule/` → `diary/prompt` import를 막고, 이 스펙은 그 경계를 유지).

### 원칙 III — 모델은 캐릭터다

- **영향**: US1이 `narrative`(오드) 캐릭터를 실측 대상으로 특정한다. 이는
  **씨앗의 관측**(exaone은 가장 느리다)을 실기기로 재확인하는 것이며, 헌법
  로스터의 "exaone은 가장 느리다"에 실측 근거를 더한다(원칙 V).
- 자동 생성은 007이 저장한 캐릭터 선택을 **읽기만** 한다. `src/schedule/`가
  `models/roster`를 import하지 않는다(`checkScheduleFile` 유지).
- **완주 시간 실측을 제품 코드에 점수·비교로 넣지 않는다**(원칙 IV) —
  `findings.md`·AGENTS.md 문서에만 남긴다.
- **판정**: 통과.

### 원칙 IV — 측정 장치를 제품에 들이지 않는다

- **영향**: 이 스펙은 측정이 핵심이지만, 측정 **장치**를 제품에 넣지 않는다.
  - 검증 전용 로그 모듈(019의 `verification-log.ts`)을 되살리지 않는다
    (FR-013 MUST NOT, 020이 제거한 전례).
  - 개발자 탭에 "마지막 자동 생성 소요 시간" 패널을 추가하지 않는다(원칙 IV
    1.2.0의 사후 1회성 조항이 허용은 하나, 이 스펙은 그 화면 노출을 새로
    만들지 않는다 — 검증 로그에만).
  - 측정은 `adb logcat`의 기존 파이프라인 로그와 OS 조회를 사람이 읽어 옮긴다.
  - `llama-port.ts`의 `timings` 폐기 경계, `GENERATION_TIMEOUT_MS`의 `engine.run()`
    구간만 재는 방식(모델 적재 시간 제외)을 그대로 둔다.
- **`STALE_LOCK_MS`를 실측 종속으로 만드는 것이 채점 코드인가?** 아니다 —
  잠금 만료 기준이지 모델 출력 평가가 아니다. 값은 사람이 실측을 보고
  상수로 못 박으며(원칙 V의 "사람이 정해 상수로"), 코드가 시간을 재서
  자동으로 정하지 않는다.
- **판정**: 통과.

### 원칙 V — 관측된 사실과 추측을 구분해 기록한다

- **영향**: 이 스펙의 전부가 이 원칙의 실행이다.
  - `narrative` 완주 시간·배터리 라운드 간격을 **실측**하고 언제·어디서
    쟀는지 근거를 `findings.md`에 남긴다(FR-002·FR-013).
  - 표본이 SHOULD 목표에 못 미치면 "관측 원시값만, best-effort"로 정직하게
    남긴다(Clarifications).
  - US3 — 권한 회수 시 `unknown`을 그대로 유지한다(기본값으로 안 채운다).
  - `AppState.currentState`를 "화면이 꺼져 있음"의 증거로 해석하지 않는다
    (FR-011) — 관측의 한계를 값에 붙여 다닌다.
- **판정**: 통과.

### 개발 방식 — 계약 먼저, 테스트 먼저

- US3의 계약 테스트(신호 계층 권한 회수 방어)를 구현·검증 전에 쓴다.
- 위반 주입으로 방어를 확인한다(007~023 공통) — 예: `collect.ts`를 임시로
  `denied`에서 `none`을 돌려주게 고쳐 테스트가 잡는지.
- **판정**: 통과.

### 종합

**위반 없음.** Complexity Tracking 비움. 이 스펙은 020의 경계를 유지·검증하며
새 구조를 만들지 않는다.

## Project Structure

### Documentation (this feature)

```text
specs/024-background-stability-exceptions/
├── plan.md              # 이 파일
├── research.md          # Phase 0 — 측정 방법론, narrative 실측 계획, 재부팅 복구 경로 분석
├── data-model.md        # Phase 1 — 관측 레코드(문서 전용), STALE_LOCK_MS 갱신 규칙
├── quickstart.md        # Phase 1 — 실기기 검증 4라운드 절차(narrative·배터리·권한 회수·재부팅)
├── contracts/           # Phase 1
│   ├── signal-revocation.md      # 권한 회수 시 신호 계층 방어(US3) — 순수 판정 계약
│   └── stale-lock-basis.md       # STALE_LOCK_MS 실측 종속 규칙(US1) — 상수·근거 계약
├── checklists/
│   └── requirements.md  # 이미 생성됨(specify 단계)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

이 스펙이 **건드리는** 자리(전부 기존):

```text
src/
├── schedule/
│   └── lock.ts                  # STALE_LOCK_MS 근거 주석 교체, (조건부) 값 상향 — US1
├── signals/
│   └── collect.ts               # (필요 시만) 권한 회수 경로 보강 — US3. 대개 무변경, 테스트가 방어 명시
├── ui/
│   └── AutoDiaryTriggerButton.tsx  # 회귀 확인만(실측 재현 진입점). 무변경 예상
└── inference/
    └── on-device.ts             # 읽기만(runWithTimeout·GENERATION_TIMEOUT_MS 확인). 무변경

__tests__/
├── schedule/
│   └── lock.test.ts             # STALE_LOCK_MS 근거·미노출 재검사(020 T038 확장) — US1
└── signals/
    └── collect.test.ts (or new revocation suite)  # granted 아닌 모든 권한 상태 → unknown, never none — US3

.maestro/
└── scheduled-diary-notification.yml  # 회귀 확인만(020). 무변경 예상

scripts/
└── constitution-rules.ts        # checkScheduleFile 유지 확인. 무변경 예상

AGENTS.md                        # 024 절 추가 — 실측 결과(FR-013)
```

이 스펙이 **명시적으로 만들지 않는** 것: 새 `src/` 파일, 새 화면, 새
`*-port.ts`, 새 `preferences/*.json`, 새 네이티브 모듈, 새 진단 패널,
검증 전용 로그 모듈.

**Structure Decision**: 단일 프로젝트. 020이 만든 `src/schedule/` 경계를
그대로 쓰고, US3의 방어는 004가 만든 `src/signals/collect.ts` 경계에 이미
있으므로 그것을 검증·(필요 시)보강한다. 새 디렉터리 없음.

## Phase 0 — Research (research.md)

해소할 미지수와 조사 항목:

1. **`narrative`(exaone) 백그라운드 완주 시간 측정 방법론**
   - 자동 생성 캐릭터를 `narrative`로 세팅하는 경로(007 `saveSelection` — 개발자
     탭 캐릭터 선택 또는 `adb`로 `preferences/selection.json` 주입).
   - 사진 있는 날(캡션 포함, 010 도구로 합성 하루 심기 — "경로가 도는가"만
     확인, 품질 결론 금지)과 없는 날 각각.
   - `adb logcat`에서 어떤 태그·라인이 `pipeline-stage` 진입/완주와 벽시계
     시간을 주는지(020이 이미 찍는 것). 콜드/웜 구분(`engine.load()` 포함 여부).
   - 019 findings.md의 실측 표 형식 재사용.

2. **`STALE_LOCK_MS` 갱신 규칙**
   - 019가 5분을 도출한 계산("`quiet` 최장 완주 2분 27초 × 2 + 여유").
   - `narrative` 실측 최댓값이 X초면 새 값 = `ceil(X × 2 + 여유)`. 여유의
     구체 값(019는 명시 안 함 — 5분 = 147초 × 2 = 294초에서 306초로 올림 →
     여유 ≈ 12초, 또는 단순히 "분 단위 올림"). 규칙을 한 문장으로 못 박는다.
   - 값이 커질 때의 트레이드오프(진짜 죽은 잠금이 오래 살아 다음 실행을
     막는다 — `lock.ts` 주석에 이미 있음). `narrative`가
     `GENERATION_TIMEOUT_MS`(180초)에서 끊기므로 완주 상한도 사실상 ~180초 +
     적재 시간이라는 점.

3. **배터리 최적화 예외 소크 방법론**
   - 019 §8: `adb shell dumpsys deviceidle whitelist +<패키지>` = 설정 앱
     "제한 없음"과 동등. 패키지명 확인(`com.anonymous.alpharium` — 019는
     `com.anonymous.alpharium` 표기, 020 tasks는 `com.anonymous.alpharium`).
   - `am get-standby-bucket`, `dumpsys jobscheduler`의 `Minimum latency`로
     "억제 원인이 OS"임을 뒷받침하는 신호.
   - 24시간 소크 중 화면을 켜면 Doze가 깨진다(019 research §7) — 무선
     디버깅으로 `adb`만 붙여 두고 화면 조작 없이 관측하는 절차.
   - MUST/SHOULD 판정과 표본 부족 시 처리.

4. **기기 재부팅 후 WorkManager 재등록 경로**
   - 020 T024가 배선한 것: `App.tsx` 마운트 시 `enabled === true`면
     `backgroundPort.register()` idempotent 호출(B5). 이 경로가 재부팅
     복구를 겸한다는 것을 소스에서 확인.
   - `dumpsys jobscheduler`로 재부팅 전/후(앱 열기 전)/앱 연 후의 등록
     상태를 어떻게 조회하는지.
   - Direct Boot(재부팅 직후 저장소 미복호화)에서 자동 생성이 트리거되면
     조용히 실패 후 재시도되는 것을 정상으로 보는 근거(019 관측).
   - `BOOT_COMPLETED` 브로드캐스트 수신을 안 만드는 이유(FR-010 — 범위 밖,
     새 네이티브 경로).

5. **실행 중 권한 회수 재현 방법**
   - 사진 권한을 부여한 상태로 자동 생성 트리거 → 실행 창 안에서
     `adb shell pm revoke <패키지> android.permission.READ_MEDIA_IMAGES`(및
     `READ_MEDIA_VISUAL_USER_SELECTED`) → 저장된 일기 신호가 `unknown`인지.
   - `narrative`는 느리므로 실행 창이 넓어 회수 타이밍을 맞추기 쉽다 —
     US1과 같은 라운드에서 겸할 수 있는지.
   - 위치 권한도 마찬가지(`ACCESS_FINE_LOCATION`·`ACCESS_COARSE_LOCATION`).
   - `src/signals/collect.ts`의 어느 분기가 이 경우를 받는지 정확히(권한
     조회가 `granted`를 주고 나서 `photosBetween`이 던지는가, 아니면 권한
     조회 자체가 회수를 반영하는가 — 타이밍에 따라 다름). 보강이 필요한
     지점이 있으면 여기서 특정.

6. **`AppState.currentState` 한계 대응**
   - 019 §6a의 관측(반복된 `dumpsys`가 화면을 깨움). 이 스펙이 이 값을
     판정에 안 쓴다는 것을 확인(자동 생성은 화면 상태 무관). 문서에 남길
     문장.

7. **회귀 대상 목록**
   - `.maestro/scheduled-diary-notification.yml`(020), `unified-permission-
     onboarding.yml`(021), `photo-selection-over-limit.yml`(023) 등 `FLOWS`
     등록 흐름. `run-device-tests.mjs`에서 확인.

**Output**: research.md — 위 7항목의 Decision/Rationale/Alternatives.

## Phase 1 — Design & Contracts

### data-model.md

문서 전용 관측 레코드(제품 코드 아님):

- **캐릭터 완주 실측 레코드**: `{ character, dayShape: "photos" | "empty",
  photoCount?, coldOrWarm, wallClockMs, result: "success" | "failed" |
  "timeout", triggeredAt, notes }`. `findings.md`의 표 행. 헌법 원칙 IV —
  제품 코드에 안 들어감.
- **배터리 라운드 관측**: `{ batteryException: boolean, targetHour,
  triggerEnteredAt, delayFromTargetMin, standbyBucket, minLatencyReported }`.
- **재부팅 복구 관측**: `{ phase: "before-reboot" | "after-reboot-app-closed"
  | "after-reboot-app-opened", jobSchedulerRegistered: boolean }`.
- **권한 회수 재현 관측**: `{ axis: "photos" | "location", revokedDuringRun:
  boolean, storedSignalKind: "unknown" | "none" | "known", bodyHasAssertion:
  boolean }`.

**STALE_LOCK_MS 갱신 규칙**(코드에 반영되는 유일한 데이터 규칙):
- 근거 문자열: "`narrative` 백그라운드 완주 실측 최댓값 M초 × 2, 분 단위
  올림" (M은 research.md의 측정에서 온다).
- 현재 값 5분(300초)이 `M × 2` 이상이면 무변경, 미만이면 상향.
- 값은 `src/schedule/lock.ts`의 `STALE_LOCK_MS` 한 곳에만. `pipeline.ts`·
  `task.ts`는 import만(020 L8, `lock.test.ts`가 소스 검사).

### contracts/

**`signal-revocation.md`** (US3, 순수 판정 계약):
- **SR1**: `collectDaySignals(port, day)`에서 `port.photoPermission()`이
  `"granted"`가 아닌 모든 값(`"limited"`·`"denied"`·`"blocked"`·
  `"undetermined"`)에 대해 `result.photos.kind === "unknown"`이고
  **`"none"`이 아니다**. `reason` 문자열이 비어 있지 않다.
- **SR2**: `port.photoPermission()`이 `"granted"`를 주고 나서
  `port.photosBetween()`가 던지면(실행 중 회수 시뮬레이션) `photos.kind ===
  "unknown"`, `"none"` 아님.
- **SR3**: `photos.kind !== "known"`이면 `places.kind === "unknown"`(사진을
  못 봐 좌표를 물을 수 없다). 사진이 `known`인데 `port.locationOf()`가 전부
  던지면 `places.kind === "unknown"`, 사진 신호는 그대로 살아 있다.
- **SR4**: `collectDaySignals`는 어떤 경우에도 던지지 않는다(004 FR-012
  재확인). 포트가 계약을 어겨도 `unknown`이 나간다.
- **SR5 (위반 주입)**: `collect.ts`를 임시로 `denied`에서 `{ kind: "none" }`을
  돌려주게 고치면 SR1이 실패한다. `places`가 사진 실패 시 `{ kind: "none" }`을
  돌려주게 고치면 SR3이 실패한다.
- **SR6 (경계 유지)**: `src/signals/collect.ts`는 `src/schedule/`·
  `diary/prompt`를 import하지 않는다(004 경계). 이 스펙이 새 경계를 만들지
  않는다.

**`stale-lock-basis.md`** (US1, 상수·근거 계약):
- **SL1**: `STALE_LOCK_MS`는 `src/schedule/lock.ts`에 정확히 한 번 정의된다.
  `pipeline.ts`·`task.ts`에 `5 * 60 * 1000`이나 `300000` 같은 리터럴이
  없다(020 L8, `lock.test.ts` 소스 검사 확장).
- **SL2**: `lock.ts`의 `STALE_LOCK_MS` 근거 주석이 `narrative` 실측을
  참조한다("`narrative` 백그라운드 완주 실측 최댓값 × 2" 류 문구). "`quiet`
  2분 27초"만 근거로 남아 있으면 위반(주석 문자열 검사).
- **SL3**: `decideAcquire`는 여전히 순수 함수 — `nowMs`를 인자로 받고
  `Date.now()`를 안 부른다. `existing === null` 또는 stale이면 granted,
  fresh면 deny. 100회 무작위 순서 시뮬레이션에서 두 `granted`가 동시 유효
  0건(020 SC-005 재확인).
- **SL4**: 값이 상향됐다면(실측이 5분 초과), 새 값이 `M × 2` 이상이고 분
  단위다. 상향 안 됐다면(실측이 5분 이하) 값·구조 무변경, 주석만 갱신.
- **SL5 (위반 주입)**: `pipeline.ts`에 `STALE_LOCK_MS` 대신 리터럴을 넣으면
  SL1이 잡는다. 근거 주석을 안 고치고 값만 바꾸면 SL2가 잡는다.

### quickstart.md

실기기 검증 4라운드 + 회귀. 각 라운드: 전제(Metro·잠금 해제·UTF-8 —
AGENTS.md "도구 사용법"), 절차(`adb` 명령), 기대 결과, `findings.md` 기록 형식.

1. **§1 narrative 백그라운드 완주** (US1) — 캐릭터를 `narrative`로 세팅,
   합성 하루 심기(사진 있는 날/없는 날), 개발자 탭 "지금 자동 생성 트리거",
   화면 끄고 잠근 뒤 `adb logcat`으로 완주 시간·`Success`·최종 일기 1개·판정
   통과 확인. 콜드/웜 각 1회 이상. `STALE_LOCK_MS` 게이트(L7): 4분 초과면
   상수 재검토.
2. **§2 배터리 예외 라운드** (US2, SC-003) — `deviceidle whitelist +`,
   `standby-bucket` `5`(EXEMPTED) 확인, 목표 시각 현재+몇 분, 화면 끈 채
   관측. 목표 시각으로부터 첫 시도 지연 여러 번. MUST 1시간 이내, SHOULD
   과반 40분 이내(표본 3회 미만이면 원시값만).
3. **§3 무예외 24시간 소크** (US2, SC-002) — `deviceidle whitelist -`,
   화면 조작 없이 24시간+ 방치, `verification` 대신 `adb logcat` 버퍼·
   `dumpsys jobscheduler`로 `task-entered` 흔적. MUST 24시간 안 1회,
   `Minimum latency` 정확 전달 확인.
4. **§4 권한 회수 재현** (US3, SC-005) — 사진 권한 부여 → 트리거 →
   `narrative`의 넓은 실행 창 안에서 `pm revoke` → 저장된 일기 신호
   `unknown`·본문 단정 없음. 위치 권한도. §1과 겸할 수 있으면 겸한다.
5. **§5 재부팅 복구** (US4, SC-006) — 자동 생성 켜고 `dumpsys jobscheduler`로
   등록 확인 → 재부팅 → 앱 열기 전 조회 → 앱 한 번 열고 조회 → 재등록 확인.
   꺼진 상태로도 1회(재부팅이 안 되살림).
6. **§6 회귀** — `npm run test:device`로 020·021·023 `FLOWS` 통과.
7. **§7 기기 없는 게이트** — `npm test`·`npm run lint`(헌법 검사)·prettier,
   `checkScheduleFile` 위반 0, 새 파일/모듈/패널 0(SC-007).

**Output**: data-model.md, contracts/signal-revocation.md,
contracts/stale-lock-basis.md, quickstart.md.

## Post-Design Constitution Re-Check

Phase 1 설계가 새 위반을 만들지 않는다:

- **원칙 IV**: 계약은 순수 판정(SR1~SR6)과 상수 근거(SL1~SL5)만 잠근다 —
  채점·비교 코드 없음. 측정 레코드는 `findings.md` 문서 전용.
- **원칙 V**: 모든 실측에 기기·OS·조건·측정 방법을 붙이고, 표본 부족을
  정직하게 표기하는 규칙을 quickstart에 명시.
- **경계**: `src/schedule/` → 제품 계층 차단(`checkScheduleFile`) 유지.
  `src/signals/collect.ts`의 004 경계 유지(SR6). 새 디렉터리·새 port 없음.
- **개발 방식**: 계약 테스트(SR·SL)를 구현·검증 전에 쓰고 위반 주입으로
  확인.

**재검토 결과**: 통과. Complexity Tracking 비움.

## Complexity Tracking

*위반 없음 — 비움.*
