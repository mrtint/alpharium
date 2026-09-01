# Feature Specification: 024 잔여 실측 마무리

**Feature Branch**: `027-024-residual-verification`

**Created**: 2026-09-01

**Status**: Draft

**Input**: User description: "로드맵 15번 — 024 잔여 실측 마무리(새 기능 아님, 024의 미완 검증). SC-003·SC-004 미판정: 배터리 예외/무예외 소크 테스트 — 예외 적용 시 실제 라운드 실행 간격, 무예외 시 억제율. 배터리 최적화 예외 인텐트의 삼성 One UI 실제 도착 화면 확인(adb whitelist 동등 재현만 했음). release APK로 findings.md §9 헤드리스 생성 1회 확인(R8 side-effect 트리셰이킹 잔여 위험). 14번 재검토 실기기 세션과 함께 돌리는 것을 전제로 한다."

## 이 스펙의 성격

이것은 기능 스펙이 아니라 **024의 완료되지 않은 검증을 마무리하는 스펙**이다.
019 스파이크와 같은 계열 — 목표는 새로운 무언가를 만드는 것이 아니라, 024가
2·3차 실기기 세션에서 사용자 결정으로 매번 건너뛴 세 가지 미판정 항목을
실기기 실측으로 판정하고 `findings.md`에 수치로 남기는 것이다.

- **산출물은 동작하는 코드가 아니라 실측 수치와 판정**이다: SC-003(배터리
  예외 소크)·SC-004(무예외 24시간 소크)의 MUST 충족 여부, 배터리 인텐트가
  실제 도착한 삼성 One UI 설정 화면 경로, release APK에서 헤드리스 등록·완주
  확인.
- **코드 변경 0줄이 기본 기대다.** 024 SC-007이 세운 경계(새 사용자 기능·새
  저장 계층·새 네이티브 모듈·검증 전용 로그 모듈·새 진단 패널을 하나도
  만들지 않는다)를 계승한다.
- 단, 024가 §9 CRITICAL 버그를 실측 중 발견해 그 자리에서 고쳤듯, **소크·
  release 확인을 진행하려면 반드시 고쳐야 하는 검증 차단 결함**이 드러나면
  이 스펙에서 고친다. 그 외(품질 결함·기능 결함)는 별도 스펙으로 분리한다.
- **narrative(exaone) 헤드리스 완주 불가와 EXAONE mojibake는 이 스펙의 범위
  밖이다** — 로드맵 14번의 몫이다. 이 스펙은 `quiet`(kanana)만 다룬다. 다만
  14번 재검토를 위한 실기기 세션을 어차피 돌려야 하므로 **그 세션에서 함께
  소화하는 것을 전제**한다(024 findings "미확인 잔여"에 명시).
- 헌법 원칙 IV와 충돌하지 않는다 — 이 검증은 모델 출력을 채점하거나 비교하지
  않는다. "배터리 최적화 조건에서 백그라운드 실행이 목표 시각 안에 시도되는가",
  "release 빌드가 헤드리스 태스크를 등록하는가"라는 운영체제 수준의 사실을
  재는 것이지 일기 품질을 재는 것이 아니다.

## Clarifications

### Session 2026-09-01

- Q: release APK 헤드리스 확인(D 항목)의 산출물을 어디까지로 볼까? → A: release
  APK 빌드 + 화면 끈 잠긴 상태 헤드리스 강제 실행 1회 + `No task registered`
  에러 부재 확인까지. AGENTS.md "release 빌드와 서명" 절차 전체를 밟는다. 024
  findings §11이 "다음 release 세션 1회로 닫힌다"고 명시한 그 세션이 이것이다.
- Q: 무예외 24시간 소크(SC-004)를 어떻게 다룰까? → A: 소크를 이 스펙의 정식
  태스크로 넣되, 실기기 세션과 분리된 비동기 실측으로 취급한다. 세션에서
  소크를 "시작"만 하고(기기 방치 시작), 세션 종료 후에도 24시간+ 계속 방치해
  다음 접속 때 로그 덤프를 확인한다. 24시간 창을 못 채우면 `findings.md`에
  "best-effort, N시간 관측 후 M회"로 원시값을 남기고 SC-004를 "부분 판정"으로
  표기한다(019가 표본 부족을 그렇게 처리한 선례, 024 Clarifications Q가 허용).
- Q: 이 스펙에서 코드 변경이 나올 수 있는 경우를 어떻게 규정할까? → A: 코드
  변경 0줄이 기본이나, "검증을 진행하려면 반드시 고쳐야 하는" 결함(024 §9
  계열 — 안 고치면 소크나 release 확인 자체가 불가능한 것)은 이 스펙에서
  고친다. 그 외는 별도 스펙. `findings.md`에 근거를 명시한다.
- Q: 이 스펙의 실기기 실측이 나오는 실기기·OS·빌드 조건은? → A: 024를
  계승한다 — SM-S901N(Galaxy S22), Android 16(SDK 36), 삼성 One UI. 모든
  실측값은 이 기기·이 OS 버전·이 제조사 조건에 한정된다(019·020·024
  Assumptions 계승). release 확인만 release 빌드, 나머지는 debug 빌드.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 배터리 예외 상태에서 자동 생성이 목표 시각 안에 시도된다 (Priority: P1)

주인이 자동 일기 생성을 켜고, 앱에 배터리 최적화 예외를 준(설정 → 앱 →
배터리 → 제한 없음) 상태에서 기기를 화면 끈 채로 둔다. 목표 시각이 지나면
자동 생성이 스스로 시도되어야 하며, 그 지연이 항상 1시간을 넘지 않아야 한다.

**Why this priority**: 024 SC-003은 spec의 MUST인데 미판정으로 남았다. 이것이
검증되지 않으면 "예외를 주면 자동 생성이 실용적으로 동작한다"는 020·024의
전제가 근거 없이 서 있는 것이다. 019는 예외 부여 후 약 32분 단기 대조만 했다.

**Independent Test**: `adb shell dumpsys deviceidle whitelist +<패키지>`로
예외를 부여(설정 화면 조작의 동등물) → `am get-standby-bucket`이 `5`(EXEMPTED)인지
확인 → 자동 생성 ON, 목표 시각을 현재+5분 이내로 → 화면 끄고 잠금 →
`adb logcat`의 `task-entered` 시각을 자연 15분+ 주기로 수집. 목표 시각으로부터의
지연을 라운드마다 기록. 단독으로 판정 가능 — 다른 스토리에 의존하지 않는다.

**Acceptance Scenarios**:

1. **Given** 배터리 예외 부여 + standby bucket `5` + 자동 생성 ON + 목표 시각
   설정, **When** 화면을 끄고 잠근 뒤 조작하지 않고 대기한다, **Then** 목표
   시각으로부터 첫 자동 생성 시도까지의 지연이 관측된 모든 라운드에서 60분
   이내다(MUST).
2. **Given** 위 조건에서 3회 이상의 시도 표본을 모을 수 있었다, **When**
   표본을 집계한다, **Then** 그 과반이 40분 이내인지 여부가 `findings.md`에
   기록돼 있다(SHOULD — 하한 보장이 아니라 관측 지향값).
3. **Given** 위 조건에서 3회 미만의 표본만 모였다, **When** 세션을 종료한다,
   **Then** 모은 원시값(각 시도의 목표 대비 지연)이 "best-effort"로
   `findings.md`에 기록되고 019의 표본 2회(10분·32분)와 대조된다.

---

### User Story 2 - 배터리 예외가 없으면 억제되지만 24시간 안에는 시도된다 (Priority: P1)

주인이 자동 일기 생성을 켜되 배터리 최적화 예외를 주지 않은 채 기기를
24시간 이상 방치한다. OS의 Doze·앱 대기 버킷이 실행을 강하게 억제하지만,
목표 시각이 지난 뒤 24시간 안에는 자동 생성이 최소 한 번은 시도되어야 한다.

**Why this priority**: 024 SC-004는 spec의 MUST인데 미판정으로 남았다. 019의
최악값(19시간 33분)이 이 한계 안이라는 것이 근거였으나 이 기기·이 OS에서
직접 재지 않았다. 억제의 원인이 앱이 아니라 OS라는 것도(요청 간격은 정확히
15분으로 전달됨) 함께 확인해야 한다.

**Independent Test**: `adb shell dumpsys deviceidle whitelist -<패키지>`로
예외를 제거 → `am get-standby-bucket`이 `10` 이상(억제됨)인지 확인 → 자동
생성 ON, 목표 시각 설정 → 화면 끄고 잠근 뒤 24시간+ 조작 금지(화면을 켜면
Doze가 깨져 라운드 무효) → 2~4시간마다 `adb logcat -d -b all`을 덤프로 보존
→ 24시간+ 뒤 덤프에서 `task-entered` 흔적을 찾는다. **이 실측은 비동기다**
— 세션 안에서 "시작"만 하고 세션 종료 후에도 방치가 계속된다.

**Acceptance Scenarios**:

1. **Given** 배터리 예외 없음 + standby bucket `10` 이상 + 자동 생성 ON +
   목표 시각 설정, **When** 24시간 이상 화면을 조작하지 않고 방치한다,
   **Then** 목표 시각이 지난 뒤 24시간 안에 `task-entered`가 최소 1회
   덤프에서 확인된다(MUST).
2. **Given** 위 방치 중, **When** `dumpsys jobscheduler`를 조회한다, **Then**
   `Minimum latency`가 15분(`+14m59s...`)으로 정확히 전달돼 있다 — 억제의
   원인이 앱의 요청이 아니라 OS의 스케줄링임이 확인된다.
3. **Given** 24시간 창 안에 세션을 다시 이어받지 못해 방치 시간이 24시간에
   못 미쳤다, **When** 그때까지의 덤프를 집계한다, **Then** "N시간 관측 후
   M회 시도"라는 원시값이 `findings.md`에 기록되고 SC-004는 "부분 판정"으로
   표기된다.

---

### User Story 3 - 배터리 최적화 예외 인텐트가 삼성 One UI의 어느 화면에 도착하는지 안다 (Priority: P2)

주인이 온보딩이나 설정 "권한" 섹션에서 "배터리 설정 열기" 버튼을 누르면,
삼성 One UI의 배터리 최적화 예외를 부여할 수 있는 실제 화면으로 이동해야
한다. 지금까지는 `adb shell dumpsys deviceidle whitelist +`로 동등 재현만
했을 뿐, 버튼이 실제로 어느 화면에 떨어지는지 기록되지 않았다.

**Why this priority**: 021 T030 관행("인텐트가 실제 도착한 삼성 One UI 설정
화면 경로를 기록한다")이 배터리 예외 항목에 대해서는 채워지지 않았다. 이
버튼이 엉뚱한 화면(예: 앱 정보 최상단, 또는 존재하지 않는 액티비티로 인한
오류)에 떨어지면 주인이 예외를 부여할 방법이 없어 US1의 전제가 무너진다.
P1이 아닌 이유는 `adb whitelist` 동등 재현으로 US1·US2를 판정할 수 있어
실측 자체는 막히지 않기 때문이다.

**Independent Test**: 설정 탭 "권한" 섹션(또는 온보딩 배터리 단계)에서
"배터리 설정 열기"에 해당하는 버튼을 실기기에서 실제로 누른다 → 도착한
화면의 제목·경로(예: "설정 > 앱 > 알파리움 > 배터리", 또는 시스템 배터리
최적화 목록)를 기록 → 그 화면에서 "제한 없음"을 실제로 선택했을 때
`am get-standby-bucket`이 `5`로 바뀌는지 확인.

**Acceptance Scenarios**:

1. **Given** debug 빌드가 설치된 실기기, **When** 설정 "권한" 섹션(또는
   온보딩)의 배터리 관련 버튼을 누른다, **Then** 삼성 One UI의 배터리
   최적화 예외를 부여할 수 있는 화면으로 이동하고 그 화면의 제목·도달
   경로가 `findings.md`에 기록된다.
2. **Given** 도착한 화면, **When** 예외("제한 없음" 또는 동등 항목)를 실제로
   선택하고 앱으로 복귀한다, **Then** `am get-standby-bucket`이 `5`(EXEMPTED)로
   바뀌고, 설정 "권한" 섹션의 배터리 행이 (조회 통로가 없으므로 라이브
   상태는 아니더라도) 021이 정한 대로 렌더된다.
3. **Given** 버튼이 도달하는 액티비티가 이 기기에서 열리지 않거나 오류를
   낸다, **When** 그것이 관측된다, **Then** 그 실패 양상이 `findings.md`에
   기록되고 이것이 검증 차단 결함인지(US1을 실기기에서 재현하려면 예외
   부여가 필요) 판단해 이 스펙에서 고칠지 별도 스펙으로 분리할지 결정한다.

---

### User Story 4 - release APK가 헤드리스 자동 생성을 등록하고 완주시킨다 (Priority: P1)

주인이 개발 PC 연결 없이 쓰는 release 빌드에서도, 024 §9가 고친 헤드리스
태스크 등록이 성립해야 한다. release는 debug와 (1) Hermes 바이트코드 사전
컴파일, (2) `NODE_ENV=production` + `.env.production` 로딩, (3) Metro 없이
번들 내장이 다르므로, `task.ts`가 모듈 최상단에서 부르는
`require("expo-task-manager")` 부수 효과가 이 경로에서도 헤드리스 등록을
성립시키는지는 release에서만 확인된다. 성립하지 않으면 `No task registered
for key expo-task-manager`가 다시 나고 자동 생성이 죽는다.

**이 스펙 실행 시점의 빌드 구성 사실**: 이 프로젝트는 release에서 R8/minify가
**꺼져 있다** — `android/app/build.gradle`이 `android.enableMinifyInReleaseBuilds`를
기본 `false`로 두고 `android/gradle.properties`에 이 속성이 설정돼 있지 않다.
따라서 024 §11이 말한 "R8 side-effect 트리셰이킹"은 **현재 위험이 아니라
minify가 나중에 켜질 때(로드맵 4번 "단독 구동용 Release 빌드 배포")의 잠재
위험**이다. 이 스토리가 확인하는 것은 "현재 release 빌드 구성으로 §9 헤드리스
등록이 성립하는가"이다.

**Why this priority**: 024 §11이 "debug 1회로 충분, 다만 R8 side-effect
트리셰이킹 잔여 위험은 다음 release 세션 1회 확인으로 닫힌다"고 판단해
뒀다. 그 "1회"가 이 스토리다 — 확인 대상은 현재 빌드 구성이며, minify OFF
사실이 위험을 한 단계 낮춘다. release에서 헤드리스가 안 되면 배포 빌드로는
자동 생성이 아예 동작하지 않는 것이므로 P1이다.

**Independent Test**: AGENTS.md "release 빌드와 서명" 절차로 release APK 빌드
(`prebuild --platform android --clean` → 서명 키 복원 → `NODE_ENV=production
assembleRelease`) → `apksigner verify`로 서명 확인(`CN=Android Debug` 아님)
→ Metro 끄고 USB 뽑고 설치 → 앱 열어 "이 빌드는 잘못 만들어졌다" 아님 확인
→ 설정 탭 진입으로 WorkManager 잡 등록 확인 → 화면 끄고 잠근 뒤
`cmd jobscheduler run -f`(삼성 절전이 거부하면 배터리 예외 부여 후 재시도)로
헤드리스 강제 실행 → logcat에 `No task registered` 부재 + `Registered task
with name 'alpharium-auto-diary'` 존재 + `quiet` 생성 완주(`Worker result
SUCCESS`) 확인.

**Acceptance Scenarios**:

1. **Given** AGENTS.md 절차로 빌드된 release APK가 Metro 없이 설치돼 정상
   실행된다, **When** 설정 탭에 진입한다, **Then** `dumpsys jobscheduler`에
   `JOB #<uid>/<id> com.anonymous.alpharium/androidx.work.impl.background.systemjob.SystemJobService`가
   등록되고 `Minimum latency`가 15분으로 전달된다.
2. **Given** release APK + 배터리 예외 부여(standby bucket `5`) + 화면 끔·잠금,
   **When** `cmd jobscheduler run -f`로 헤드리스 태스크를 강제 실행한다,
   **Then** logcat에 `No task registered for key expo-task-manager` 및
   `Unregistering task` 가 **없고**, `Registered task with name
   'alpharium-auto-diary'`가 있으며, `quiet` 일기가 그 날짜로 정확히 하나
   저장되고 판정 4갈래를 통과하며 `WM-WorkerWrapper: Worker result SUCCESS`가
   나온다.
3. **Given** release에서 `No task registered`가 재현된다(minify OFF에서도
   Hermes DCE 또는 Metro `@__PURE__` 주입이 모듈 최상단 부수 효과를 제거하는
   경우), **When** 그것이 관측된다, **Then** 이것은 검증 차단 결함이므로 이
   스펙에서 고친다 — `task.ts`의 등록 구문이 DCE에 살아남도록 최소 수정
   (`AUTO_DIARY_TASK_REGISTERED` 상수의 명시적 참조 유지가 우선, `research.md`
   §4 옵션 A)하고 계약 테스트로 잠근 뒤 release로 재확인한다. `proguard-rules.pro`
   `-keep` 규칙은 minify가 켜질 때만 효과가 있으므로 현재는 넣지 않는다(로드맵
   4번의 몫). `findings.md` §11 갱신.

---

### Edge Cases

- **소크 도중 로그 버퍼가 넘친다**: `adb logcat`의 링 버퍼가 24시간을 못
  담을 수 있다 → 2~4시간마다 `-d -b all`로 덤프를 파일로 쌓는다. 덤프
  파일들은 스크래치 디렉터리에 두고 `findings.md`에는 수치만 옮긴다.
- **소크 도중 화면이 켜진다**(`adb dumpsys` 조회가 화면을 깨우는 순간 —
  019 §6a): 그 라운드는 `screenTouchedDuringRound: true`로 무효 처리하고
  다시 시작한다. 조회는 화면을 안 깨우는 명령(`logcat -d`)만 쓴다.
- **`cmd jobscheduler run -f`가 삼성 절전으로 거부된다**(도즈 중): US1·US2의
  자연 주기 대기는 강제 실행 없이 진행된다. release 확인(US4)에서는 배터리
  예외를 부여해 강제 실행이 통하게 한다.
- **24시간 창을 놓친다**(세션 재개 지연): SC-004를 "부분 판정"으로 표기하고
  원시값을 남긴다(US2 Scenario 3). 스펙 실패가 아니다.
- **검증용 모델·합성 하루가 없다**: 024 T037처럼 `pm clear` 계열 Maestro
  흐름이 `files/models/`를 날렸을 수 있다 → 개발 기계에서 `a1`(kanana)을
  받아 `run-as`로 배치 + `state.json` verdict 수동 작성, `npm run seed:day`로
  사진 없는 하루 준비. `quiet`만 필요하므로 `a2`(exaone)·VLM은 이 스펙에는
  불필요(14번 세션이 함께 돌리면 그쪽에서 배치).
- **release 빌드 서명 키가 없다**: AGENTS.md대로 `~/.alpharium-signing/alpharium.jks`가
  원본이다. 없으면 US4를 수행할 수 없으므로 사용자에게 알린다 — 새 키를
  만들면 기존 설치를 덮어쓸 수 없다(일기 손실).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 검증은 배터리 최적화 예외를 부여한 상태에서, 목표 시각으로부터
  자동 생성 첫 시도까지의 지연을 최소 1회(SHOULD 3회) 자연 주기 대기로
  수집하고, 각 라운드의 `batteryException`·`targetHour`·`triggerEnteredAt`·
  `delayFromTargetMin`·`standbyBucket`·`minLatencyReported`·
  `screenTouchedDuringRound`를 `findings.md` §2 표에 기록해야 한다(MUST).
- **FR-002**: 검증은 배터리 최적화 예외가 없는 상태로 기기를 24시간 이상
  방치하고(비동기 — 세션 종료 후에도 계속), 목표 시각이 지난 뒤 24시간 안에
  `task-entered`가 최소 1회 있는지를 덤프로 확인해 `findings.md` §2 표에
  기록해야 한다(MUST). 24시간을 못 채우면 관측 시간·시도 횟수를 원시값으로
  남기고 "부분 판정"으로 표기한다.
- **FR-003**: 무예외 소크에서 `dumpsys jobscheduler`의 `Minimum latency`가
  15분으로 정확히 전달됐음을 확인해, 억제의 원인이 앱의 요청이 아니라 OS의
  스케줄링임을 `findings.md`에 기록해야 한다.
- **FR-004**: 검증은 설정 "권한" 섹션(또는 온보딩 배터리 단계)의 배터리 관련
  버튼을 실기기에서 실제로 눌러, 도착한 삼성 One UI 화면의 제목·도달 경로와,
  그 화면에서 예외를 부여했을 때 `am get-standby-bucket`이 `5`로 바뀌는지를
  `findings.md`에 기록해야 한다(021 T030 관행).
- **FR-005**: 검증은 AGENTS.md "release 빌드와 서명" 절차로 release APK를
  빌드하고, Metro 없이 설치해 정상 실행됨을 확인한 뒤, 설정 탭 진입으로
  WorkManager 잡 등록을 확인하고, 화면 끈 잠긴 상태에서 헤드리스 태스크를
  강제 실행해 `No task registered for key expo-task-manager` 부재와
  `quiet` 생성 완주(`Worker result SUCCESS`)를 확인해야 한다(MUST).
- **FR-006**: 검증은 release 헤드리스 확인 결과로 024 findings §11의 판단
  ("debug 1회로 충분, R8 잔여 위험은 다음 release 세션 1회로 닫힘")을
  갱신해야 한다 — 통과했으면 "잔여 위험 닫힘"으로, `No task registered`가
  재현됐으면 수정 내역과 함께 기록한다.
- **FR-007**: 이 스펙은 코드 변경 0줄을 기본으로 한다. 실측 중 **검증을
  진행하려면 반드시 고쳐야 하는 결함**(024 §9 계열 — 안 고치면 소크나
  release 확인 자체가 불가능한 것)만 이 스펙에서 고치고, `findings.md`에
  근거를 명시한다. 품질·기능 결함은 별도 스펙으로 분리한다(MUST NOT: 이
  스펙에서 기능 확장).
- **FR-008**: 이 스펙은 새 사용자 기능·새 영속 저장 계층·새 네이티브 모듈·
  검증 전용 로그 모듈·새 진단 패널을 하나도 추가하지 않는다(024 SC-007
  계승). FR-007의 검증 차단 결함 수정도 `src/schedule/task.ts` 1~3줄
  (`AUTO_DIARY_TASK_REGISTERED` 명시적 참조 유지, `research.md` §4 옵션 A)에
  한하며 새 파일을 만들지 않는다. 빌드 설정(`android/gradle.properties`의
  minify 토글, `metro.config.js`, `proguard-rules.pro`)은 건드리지 않는다 —
  release minify를 켜는 것은 로드맵 4번의 몫이고, `proguard-rules.pro`
  `-keep` 규칙은 minify가 꺼진 현재 아무 효과가 없다.
- **FR-009**: `narrative`(exaone) 헤드리스 완주 불가와 EXAONE mojibake는 이
  스펙의 범위 밖이다 — 로드맵 14번. 이 스펙의 모든 실측은 `quiet`(kanana)로
  수행한다. 14번 세션과 같은 실기기 세션에서 함께 돌릴 때 14번 쪽 관측이
  나오면 그것은 14번의 `findings.md`에 기록한다.
- **FR-010**: 이 스펙의 모든 실측(배터리 예외/무예외 라운드, 삼성 One UI
  화면 경로, release 헤드리스 확인)은 기기(SM-S901N)·OS(Android 16/SDK 36)·
  제조사(삼성 One UI)·빌드(debug/release) 조건과 함께 `findings.md`에 수치로
  기록돼야 하고, 024 `findings.md` §2·§11의 미판정·부분 항목이 갱신돼야
  한다(FR-011). AGENTS.md의 024 절 또는 새 027 절에 결론 한 문단을 추가한다.
- **FR-011**: 검증은 024 `findings.md`의 다음 표·절을 갱신해야 한다 — §2
  배터리 라운드 표(`batteryException: true`/`false` 행, 삼성 One UI 화면
  경로), §11 release 재확인 판단, "미확인 잔여" 목록에서 해소된 항목 제거.
  024 `findings.md`를 직접 갱신하거나 027 `findings.md`에 쓰고 024에서
  링크하는 방식 중 하나를 택하되 한쪽에만 둔다(중복 금지).
- **FR-012**: 검증은 기기 없는 게이트를 통과 상태로 유지해야 한다 —
  `npm run test:logic`·`npm run lint`(헌법 검사 포함)·prettier 전부 통과,
  `src/schedule/` 경계 위반 0건. FR-007로 코드를 고쳤다면 그 변경에 대한
  계약 테스트(소스 검사 계열)를 추가하고 위반 주입으로 방어를 확인한다.

### Key Entities *(검증 로그 데이터)*

- **배터리 라운드 관측(battery round observation)**: 한 번의 자동 생성 시도에
  대한 실측. `batteryException`(부여 여부), `targetHour`(0–23), `roundStartedAt`,
  `triggerEnteredAt`(실제 `task-entered` 시각), `delayFromTargetMin`(목표
  대비 지연), `standbyBucket`(`5`/`10`+), `minLatencyReported`(`+14m59s...`),
  `screenTouchedDuringRound`(참이면 무효), `notes`. 024 `data-model.md` §2 표
  구조를 그대로 쓴다.
- **삼성 One UI 화면 경로 관측(intent destination observation)**: "배터리
  설정 열기" 버튼이 도달한 화면의 제목, 도달 경로(설정 계층), 예외 부여
  가능 여부, 부여 후 `standbyBucket` 변화, 실패 시 오류 양상.
- **release 헤드리스 확인 관측(release headless observation)**: release APK의
  서명 확인 결과, Metro 없이 실행 여부, 설정 탭 진입 시 잡 등록 여부,
  헤드리스 강제 실행 시 `No task registered` 부재 여부, `quiet` 완주 여부
  (`Worker result`), DCE로 등록 부수 효과가 제거됐는지(minify OFF 기준 —
  Hermes DCE/Metro `@__PURE__`) 재현 여부와 수정 내역.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 배터리 최적화 예외를 부여한 상태에서 목표 시각으로부터 자동
  생성이 처음 시도되기까지의 지연이, 관측된 모든 라운드에서 60분 이내다
  (MUST). 최소 3회 표본을 모을 수 있었다면 그 과반이 40분 이내인지도
  `findings.md`에 기록돼 있다. (024 SC-003 계승 — 이 스펙이 실제로 판정한다.)
- **SC-002**: 배터리 최적화 예외가 없는 상태로 기기를 24시간 이상 실제로
  방치했을 때, 목표 시각이 지난 뒤 24시간 안에 자동 생성이 최소 1회 시도된
  것이 검증 로그로 확인된다(MUST). 24시간 창을 채우지 못했다면 "N시간 관측
  후 M회"라는 원시값과 함께 "부분 판정"으로 `findings.md`에 표기돼 있고,
  `Minimum latency`가 15분으로 정확히 전달됐다는 확인이 포함돼 있다. (024
  SC-004 계승.)
- **SC-003**: 온보딩 또는 설정 "권한" 섹션의 배터리 관련 버튼이 삼성 One UI의
  어느 화면에 도달하는지(제목·경로), 그리고 그 화면에서 예외를 부여했을 때
  `am get-standby-bucket`이 `5`로 바뀌는지가 `findings.md`에 기록돼 있다.
  버튼이 이 기기에서 열리지 않거나 오류를 냈다면 그 양상과, 그것을 이
  스펙에서 고쳤는지 별도 스펙으로 분리했는지가 명시돼 있다.
- **SC-004**: AGENTS.md 절차로 빌드된 release APK에서, 설정 탭 진입 시
  WorkManager 잡이 등록되고, 화면 끈 잠긴 상태 헤드리스 강제 실행에서
  `No task registered for key expo-task-manager`가 나오지 않으며 `quiet`
  일기가 그 날짜로 정확히 하나 저장되고 `Worker result SUCCESS`가 나오는
  것이 logcat으로 확인된다. 024 `findings.md` §11이 이 결과로 갱신돼 있고,
  "R8 트리셰이킹 잔여 위험"이 minify OFF 사실과 함께 "현재 빌드 구성에서는
  성립하지 않으며 minify를 켜면(로드맵 4번) 재검토"로 정정돼 있다.
- **SC-005**: 이 스펙의 코드 변경은 FR-007이 규정한 "검증 차단 결함"에
  한하며, 그런 결함이 없었다면 `git diff src/`가 0줄이다. 결함이 있어
  고쳤다면 그 변경에 대한 계약 테스트가 추가돼 있고 위반 주입으로 방어가
  확인됐으며, `src/schedule/` 경계 위반이 0건이고 새 파일·새 네이티브
  모듈·새 진단 패널이 하나도 추가되지 않았다.
- **SC-006**: `npm run test:logic`·`npm run lint`(헌법 검사 포함)·prettier가
  전부 통과한다. (024 SC-007의 기기 없는 게이트 계승.)
- **SC-007**: 이 스펙의 모든 실측이 `findings.md`에 기기·OS·조건과 함께
  수치로 기록돼 있고, 024 `findings.md`의 "미확인 잔여" 목록에서 배터리
  소크·삼성 One UI 화면·release 헤드리스 확인 항목이 해소된 것으로 갱신돼
  있으며, AGENTS.md에 이 스펙의 결론 한 문단이 추가돼 있다.

## Assumptions

- 이 스펙은 019·020·024가 명시한 "이 기기(SM-S901N)·이 OS 버전(Android 16)·
  이 제조사(삼성 One UI) 기준" 한계를 계승한다 — 모든 안드로이드 기기에서
  같은 백그라운드 동작·시각 정확도가 나온다고 가정하지 않는다.
- 자동 생성의 트리거 경로는 020이 쓰는 OS 표준 주기적 작업 예약
  (`expo-background-task`/WorkManager)을 그대로 쓴다 — 정확 시각 alarm
  계열로 바꾸지 않는다(019·020·024 결정 계승).
- `adb shell dumpsys deviceidle whitelist +/-<패키지>`는 삼성 One UI 설정
  화면에서 "제한 없음"/"최적화"를 고르는 것과 standby bucket 관점에서
  동등하다(024 §9·§2에서 이미 그렇게 썼다). US3만은 실제 버튼을 눌러 화면
  경로를 확인하는 것이 목적이므로 동등물로 갈음하지 않는다.
- `narrative` 헤드리스 완주 불가는 024 T034에서 이미 판정됐다("이 기기
  헤드리스 자동 생성에서 사실상 불가"). 이 스펙은 그 결론을 재확인하지
  않으며 `quiet`만 다룬다.
- release 빌드 서명 키(`~/.alpharium-signing/alpharium.jks`)가 존재하고
  `~/.gradle/gradle.properties`에 비밀번호가 있다(AGENTS.md "서명 키"). 없으면
  US4를 수행할 수 없다.
- 검증용 `quiet` 모델(`a1.bin`, kanana)과 사진 없는 합성 하루를 개발 기계에서
  기기에 배치할 수 있다(024 T037 방식, `run-as` + `state.json` verdict 수동
  + `npm run seed:day`). release 빌드는 `run-as`가 안 되므로(`package not
  debuggable`) release APK 설치 전에 debug로 배치해 두거나, release 확인은
  이미 생성된 일기 없이 "새 날짜 1건 생성 완주"만 본다.
- 무예외 24시간 소크는 사용자가 기기를 그만큼 방치할 수 있을 때만 완료된다.
  이 스펙은 소크를 "시작"하는 것까지를 세션 안의 작업으로, 24시간 경과
  확인을 세션 밖의 후속 작업으로 나눈다(비동기).
- 이 스펙은 로드맵 14번(자동 생성용 서술형 모델 재검토)의 실기기 세션과
  같은 세션에서 실행되는 것을 전제한다 — 두 스펙이 요구하는 실기기 준비
  (모델 배치·합성 하루·배터리 예외 토글)가 겹치므로 함께 소화하는 것이
  효율적이다. 다만 두 스펙의 `findings.md`는 분리한다.
