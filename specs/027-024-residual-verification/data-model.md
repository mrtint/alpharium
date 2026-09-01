# Data Model: 024 잔여 실측 마무리

**대상 스펙**: [spec.md](./spec.md) · [plan.md](./plan.md) · **작성일**: 2026-09-01

이 스펙은 검증 마무리 성격이라 "데이터 모델"은 **문서에 남기는 관측 레코드
구조**다. 헌법 원칙 IV — 이 레코드들은 제품 코드에 타입·수집 함수로 들어가지
않는다(019 `verification-log.ts` 제거 전례, 024가 계승). `findings.md`의 표
행 구조일 뿐이다.

코드에 반영되는 규칙은 하나뿐이며 조건부다(§4 — FR-007 결함이 있을 때만).

---

## §1 배터리 라운드 관측 (findings.md 표 행 — 문서 전용)

024 `data-model.md` §2 표 구조를 그대로 이어받는다. 024 `findings.md` §2 표의
빈 두 행(`batteryException: true`/`false`)을 이 스펙이 채운다.

| 필드 | 타입 | 의미 |
|---|---|---|
| `batteryException` | boolean | `deviceidle whitelist +`(true) / `-`(false) |
| `targetHour` | 0..23 | 자동 생성 목표 시각(시 단위, 020은 분 없음) |
| `roundStartedAt` | 시각 문자열 | 화면을 끄고 관측을 시작한 벽시계 |
| `triggerEnteredAt` | 시각 문자열 \| null | `D/BackgroundTaskConsumer: Executing task 'alpharium-auto-diary'`가 logcat에 찍힌 시각(research §1 — `task-entered` 대용 신호). 없으면 null |
| `delayFromTargetMin` | number \| null | `triggerEnteredAt - (targetHour:00)` 분. 목표 시각이 아직 안 지났으면 음수 아님(다음 시로) |
| `standbyBucket` | `5` \| `10`+ | `am get-standby-bucket` 결과. true 라운드는 `5`, false 라운드는 `10` 이상이어야 유효 |
| `minLatencyReported` | 문자열 | `dumpsys jobscheduler`의 `Minimum latency: +14m59s***ms` 꼴. 15분 전달 확인 |
| `screenTouchedDuringRound` | boolean | 관측 중 화면이 켜졌는가(`dumpsys` 조회가 깨울 수 있음 — 019 §6a). true면 그 라운드 **무효**, 다시 |
| `observedHours` | number | (false 라운드만) 방치 시작부터 마지막 덤프까지 시간 |
| `attemptCount` | number | (false 라운드만) `observedHours` 동안 관측된 `triggerEnteredAt` 수 |
| `notes` | 문자열 | 콜드/웜, 예외 실패, 표본 부족 라벨 등 |

### 판정 규칙 (contracts/battery-soak-observation.md가 잠금)

- **US1(true, SC-001)**: 모든 유효 라운드에서 `delayFromTargetMin <= 60`
  (MUST). 유효 라운드 `>= 3`이면 과반이 `<= 40`인지 별도 기록(SHOULD).
  `< 3`이면 원시값 나열 + "best-effort" 라벨.
- **US2(false, SC-002)**: 목표 시각 이후 24시간(`observedHours >= 24`) 안에
  `attemptCount >= 1`(MUST). `observedHours < 24`면 `{ observedHours,
  attemptCount }` 원시값 + "부분 판정" 라벨. `minLatencyReported`가 15분으로
  전달됐음을 별도 확인(억제 원인이 OS).

---

## §2 삼성 One UI 화면 경로 관측 (findings.md — 문서 전용)

021 T030 관행("인텐트가 실제 도착한 삼성 One UI 설정 화면 경로")을 배터리
예외 항목에 대해 채운다. 024 `findings.md` §2 하단 "_(미기록)_" 자리.

| 필드 | 타입 | 의미 |
|---|---|---|
| `trigger` | `"onboarding"` \| `"settings-permissions"` | 어느 화면의 버튼을 눌렀는가 |
| `intentAction` | 문자열 | 소스에서 특정한 `expo-intent-launcher` 액션(예: `android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`) |
| `landedActivity` | 문자열 | `dumpsys activity activities`의 최상위 액티비티(예: `com.android.settings/.Settings$HighPowerApplicationsActivity`) |
| `screenTitle` | 문자열 | 도착한 화면의 눈에 보이는 제목 |
| `reachPath` | 문자열 | 삼성 One UI 설정 계층 경로(예: "설정 > 앱 > 알파리움 > 배터리 > 제한 없음") |
| `exceptionGrantable` | boolean | 그 화면에서 실제로 예외를 부여할 수 있었는가 |
| `standbyBucketAfterGrant` | `5` \| `"unchanged"` | 부여 후 `am get-standby-bucket` |
| `onboardingProceededWithoutGrant` | boolean | 버튼을 안 눌러도/실패해도 온보딩이 다음 단계로 갔는가(021 `batteryNoticeShown` 판정) |
| `failureMode` | 문자열 \| null | 액티비티 없음/오류 시 양상 |

---

## §3 release 헤드리스 확인 관측 (findings.md — 문서 전용)

024 `findings.md` §11(release 재확인 판단)을 이 결과로 갱신.

| 필드 | 타입 | 의미 |
|---|---|---|
| `signatureOk` | boolean | `apksigner verify --print-certs`가 `CN=Android Debug` 아님 |
| `keysNotCommitted` | boolean | `git ls-files \| grep -i jks` 빈 결과 |
| `runsWithoutMetro` | boolean | Metro 끄고 USB 뽑고 앱 열어 `Unable to load script` 없음 |
| `envOk` | boolean | 앱 화면이 "이 빌드는 잘못 만들어졌다" 아님(`.env.production` 로드됨) |
| `jobRegisteredOnSettingsTab` | boolean | 설정 탭 진입 시 `JOB #<uid>/... SystemJobService` 등록 |
| `noTaskRegisteredErrorAbsent` | boolean | 헤드리스 강제 실행 logcat에 `No task registered for key expo-task-manager` **없음** |
| `registeredTaskLogPresent` | boolean | `Registered task with name 'alpharium-auto-diary'` 있음 |
| `quietCompleted` | boolean | `quiet` 일기 1건 저장 + 판정 통과 |
| `workerResult` | `"SUCCESS"` \| 기타 | `WM-WorkerWrapper: Worker result ...` |
| `dceTrimReproduced` | boolean | 등록 부수 효과가 DCE로 제거됐는가(RH3 실패). minify OFF 기준 |
| `fixApplied` | 문자열 \| null | `dceTrimReproduced`가 true면 적용한 최소 수정(research §4 옵션 A) |

---

## §4 코드에 반영되는 유일한 규칙 (조건부 — FR-007)

**기본값: 규칙 없음, 코드 변경 0줄.**

release 헤드리스 확인(RH3)이 통과하면 이 스펙은 순수 검증으로 끝난다.
`git diff src/`가 0줄이고 계약 테스트도 추가되지 않는다.

**RH3가 실패할 때만**(release에서 `No task registered` 재현 — minify OFF에서도
Hermes DCE 또는 Metro `@__PURE__` 주입이 `task.ts` 모듈 최상단
`registerAutoDiaryTask()` 부수 효과를 제거하는 경우):

### 규칙 R-DCE

- `src/schedule/task.ts`가 `AUTO_DIARY_TASK_REGISTERED`(모듈 최상단
  `registerAutoDiaryTask()` 결과 상수)를 **DCE가 "결과 미사용"으로 볼 수 없는
  방식으로** 참조해야 한다.
- 현재도 `ensureAutoDiaryTaskDefined()`가 이 상수를 읽어 export하므로, 대개
  이미 살아 있다 — 규칙은 그 참조가 **의도적이고 제거 불가**임을 소스에
  명시(주석 + 명시적 참조)하는 것이다.
- 변경 규모: `task.ts` 1~3줄. 새 파일 없음. `proguard-rules.pro`·
  `gradle.properties`·`metro.config.js`는 건드리지 않는다(minify OFF에서
  proguard 규칙은 무효, 빌드 설정 변경은 로드맵 4번 몫 — FR-008).

### 제약 (contracts/release-headless-check.md RH4·RH5가 잠금)

- `STALE_LOCK_MS` 등 다른 상수·임계값을 코드가 정하지 않는다(원칙 IV).
- `src/schedule/` → `diary/prompt`·`models/roster` 경계 유지
  (`checkScheduleFile`).
- 계약 테스트(RH5): `__tests__/schedule/background-generation.test.ts` B1a를
  확장해 R-DCE 방어 구문이 소스에 있는지 `readFileSync` 검사. 위반 주입 —
  그 구문을 지우면 테스트 실패.

### 관계

- 024 §9가 만든 `task.ts` 모듈 최상단 `defineTask` 부수 효과 위에 얹는다.
- 024 §11의 "R8 side-effect 트리셰이킹" 우려의 실측 답 — minify OFF라 R8은
  안 돌지만, DCE 계열이 같은 일을 하면 R-DCE로 막는다.
