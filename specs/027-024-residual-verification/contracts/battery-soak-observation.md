# Contract: 배터리 라운드 관측 (US1·US2)

**대상**: [spec.md](../spec.md) US1·US2, SC-001·SC-002 · [data-model.md](../data-model.md) §1·§2

이 계약은 **문서 전용 관측 계약**이다 — 제품 코드에 레코드 타입·수집 함수를
만들지 않는다(헌법 원칙 IV, 019 `verification-log.ts` 제거 전례). "계약"은
`findings.md`에 무엇을 어떤 조건에서 기록해야 유효한 관측인가의 규칙이다.

기기 없는 테스트로 검증할 수 없다(실기기 실측). 대신 quickstart 절차가 이
규칙을 절차로 풀어 쓰고, `findings.md` 리뷰 시 이 계약으로 검산한다.

---

## BS1 — US1(예외) 라운드 유효 조건

한 US1 라운드가 유효하려면:

- `batteryException === true` (`deviceidle whitelist +com.anonymous.alpharium`
  선행).
- `standbyBucket === 5` (`am get-standby-bucket com.anonymous.alpharium` → `5`).
- `minLatencyReported`가 `+14m59s...` 꼴 (`dumpsys jobscheduler`의 해당 Job).
- `screenTouchedDuringRound === false`.
- `delayFromTargetMin`은 `triggerEnteredAt`과 `targetHour:00`의 차(분).
  `triggerEnteredAt === null`(관측 창 안에 안 옴)이면 그 라운드는 "미도달"로
  기록하되 MUST 판정(BS2)에는 60분 초과와 같게 취급.

## BS2 — US1 판정 (SC-001)

- **MUST**: 유효한 모든 US1 라운드에서 `delayFromTargetMin <= 60`. 하나라도
  60 초과 또는 미도달이면 SC-001 실패로 기록.
- **SHOULD**: 유효 라운드 수 `>= 3`이면 `delayFromTargetMin <= 40`인 라운드가
  과반인지 기록. `< 3`이면 원시값(각 라운드의 `delayFromTargetMin`)을 나열하고
  "best-effort, 표본 N회" 라벨. 019의 표본 2회(10분·32분)와 대조.

## BS3 — US2(무예외) 라운드 유효 조건

- `batteryException === false` (`deviceidle whitelist -com.anonymous.alpharium`).
- `standbyBucket >= 10` (`am get-standby-bucket` → `10` 이상 = 억제됨).
- `screenTouchedDuringRound === false` — **24시간 소크는 이것이 특히
  중요하다**. 화면을 한 번이라도 켜면 Doze가 깨져(019 research §7) 소크
  전체가 무효. 조회는 `adb logcat -d`만(화면 안 깨움), `dumpsys`는 피한다
  (019 §6a).
- `observedHours`는 방치 시작부터 마지막 덤프까지 실제 시간.

## BS4 — US2 판정 (SC-002)

- **MUST**: `observedHours >= 24`이고 그 안에 `attemptCount >= 1`이면
  SC-002 충족.
- **부분 판정**: `observedHours < 24`이면 `{ observedHours, attemptCount }`를
  원시값으로 기록 + "부분 판정 — N시간 관측 후 M회" 라벨. SC-002를 "부분
  판정"으로 표기(024 Clarifications가 허용, 019가 표본 부족을 그렇게 처리).
- **별도 확인**: `minLatencyReported`가 15분(`+14m59s...`)으로 전달됐음 —
  억제의 원인이 앱의 요청이 아니라 OS의 스케줄링임을 뒷받침. 이건
  `observedHours`와 무관하게 항상 기록.

## BS5 — 삼성 One UI 화면 경로 (US3, SC-003)

- `adb whitelist` 동등물로 **갈음하지 않는다**(024가 남긴 구멍). 설정 "권한"
  섹션 또는 온보딩 배터리 단계의 실제 버튼을 눌러 관측.
- 유효한 관측이려면 `intentAction`·`landedActivity`·`screenTitle`·`reachPath`가
  전부 채워져야 한다. `exceptionGrantable`·`standbyBucketAfterGrant`도.
- `failureMode !== null`(버튼이 안 열리거나 오류)이면 그 양상을 기록하고,
  이것이 검증 차단 결함인지 판단 — US1은 `adb whitelist` 동등물로 재현
  가능하므로 대개 차단 아님(하지만 실사용자가 예외를 못 주면 제품 결함이므로
  `findings.md`에 명시 + 별도 스펙 후보로).
- `onboardingProceededWithoutGrant` 기록 — 021의 `batteryNoticeShown` 판정이
  버튼 실패와 무관하게 온보딩을 진행시키는지.

## BS6 — 경계 유지

- 이 관측들은 전부 `findings.md`(024 §2 또는 027 findings) 문서 행이다.
- 제품 코드(`src/`)에 관측 레코드 타입, `collectBatteryRound()` 같은 수집
  함수, 개발자 탭 패널을 만들지 않는다.
- 측정은 `adb logcat`(020이 이미 찍는 로그) + OS 조회(`dumpsys`·
  `am get-standby-bucket`)를 사람이 읽어 옮긴다.
- 위반 주입(문서 리뷰): `findings.md`에 `standbyBucket` 없이 US1 라운드를
  기록하면 BS1 위반 — 예외가 실제로 걸렸는지 알 수 없다.
