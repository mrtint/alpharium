# Implementation Plan: 024 잔여 실측 마무리

**Branch**: `027-024-residual-verification` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/027-024-residual-verification/spec.md`

## Summary

024가 2·3차 실기기 세션에서 사용자 결정으로 매번 건너뛴 세 가지 미판정 항목을
실기기로 판정하고 `findings.md`에 수치로 남긴다: (1) 배터리 최적화 예외/무예외
소크(024 SC-003·SC-004), (2) 배터리 예외 인텐트가 실제 도착한 삼성 One UI 설정
화면 경로(021 T030 관행이 배터리 항목에 대해 비어 있음), (3) release APK에서
024 §9 헤드리스 태스크 등록·완주 1회 확인(R8 side-effect 트리셰이킹 잔여 위험,
024 §11). 019 스파이크와 같은 계열 — 산출물은 실측 수치와 판정이지 새 기능이
아니다.

**기술 접근**:

1. **코드 변경 0줄이 기본.** 024 SC-007 경계(새 사용자 기능·새 저장 계층·새
   네이티브 모듈·검증 전용 로그 모듈·새 진단 패널 금지)를 계승한다. 실측 중
   **검증을 진행하려면 반드시 고쳐야 하는 결함**(024 §9 계열)만 이 스펙에서
   고친다 — 그 경우 `src/schedule/task.ts` 1~3줄
   (`AUTO_DIARY_TASK_REGISTERED` 명시적 참조)에 한하고 계약 테스트로 잠근다.
   빌드 설정(`proguard-rules.pro`·`gradle.properties`·`metro.config.js`)은
   건드리지 않는다. 품질·기능 결함은 별도 스펙.
2. **실기기 검증 3라운드** — SM-S901N(무선 디버깅, debug 빌드)에서 (a) 배터리
   예외 소크(자연 15분+ 주기, `deviceidle whitelist +`, `am get-standby-bucket`
   `5`), (b) 무예외 24시간 소크(**비동기** — 세션 안에서 "시작"만, 세션 밖에서
   24시간+ 방치 후 덤프 확인), (c) 삼성 One UI 배터리 화면 실제 버튼 누르기.
3. **release APK 1라운드** — AGENTS.md "release 빌드와 서명" 절차로 빌드 →
   `apksigner verify`(`CN=Android Debug` 아님) → Metro 없이 설치 → 설정 탭 진입
   잡 등록 확인 → 화면 끈 잠긴 상태 헤드리스 강제 실행 → `No task registered`
   부재 + `quiet` 완주 확인.
4. **024 findings·AGENTS 갱신** — 024 `findings.md` §2 배터리 라운드 표, §11
   release 재확인 판단, "미확인 잔여" 목록에서 해소된 항목 제거. AGENTS.md에
   027 결론 한 문단.
5. **기기 없는 게이트 유지** — `npm run test:logic`·`npm run lint`·prettier
   전부 통과, `src/schedule/` 경계 위반 0. FR-007로 코드를 고쳤다면 그 변경의
   계약 테스트 추가 + 위반 주입.

## Technical Context

**Language/Version**: TypeScript 5.x (React Native 0.86 / Expo SDK 57, 기존 기준선). 코드 변경은 조건부(FR-007) — 없을 수도 있다.

**Primary Dependencies**: 신규 없음. 재사용만 — `expo-background-task`·`expo-task-manager`(020), `expo-notifications`(020), `llama.rn`(005). `expo install --check`의 기존 패치 버전 어긋남은 이 스펙이 만든 것이 아니다.

**Storage**: 신규 없음. 재사용만 — `preferences/auto-diary.json`(020 설정), `locks/diary-generation.lock`(020 경합 잠금), `diary/*.json`(일기). 새 파일 종류를 만들지 않는다.

**Testing**: `npm run test:logic`(순수 로직, node 환경), `npm run lint`(eslint + tsc + 헌법 검사 + prettier), `npm run test:device`(Maestro, 실기기 — 회귀 확인용). FR-007로 코드를 고칠 때만 계약 테스트 추가(소스 선언을 `readFileSync`로 읽는 007·009·012 관례).

**Target Platform**: Android(실기기 SM-S901N/Galaxy S22, Android 16 / SDK 36, 삼성 One UI). debug 빌드가 대부분, US4만 release 빌드. 019·020·024의 "이 기기·이 OS·이 제조사 기준" 한계를 계승한다.

**Project Type**: 단일 프로젝트(모바일 앱). 스케줄 순수 판정·통로는 `src/schedule/`(020), 화면은 `src/ui/`. 이 스펙은 새 디렉터리를 만들지 않는다.

**Performance Goals** (측정 대상이지 목표가 아니다):
- 배터리 예외 적용 시 목표 시각으로부터 자동 생성 첫 시도까지 **1시간 이내**(MUST, SC-001). 3회 이상 표본이면 과반 40분 이내(SHOULD, 관측 지향값).
- 배터리 예외 없이 **24시간 안 최소 1회 시도**(MUST, SC-002). 24시간 창을 못 채우면 "부분 판정" + 원시값.
- release APK 헤드리스 강제 실행에서 `quiet` 일기 1건 생성 완주(`Worker result SUCCESS`, SC-004). 완주 시간 자체는 §1(024)에서 이미 실측 — 재측정 대상 아님.

**Constraints**:
- 코드 변경 0줄이 기본. FR-007 "검증 차단 결함"만 예외이며 `src/schedule/`·`android/` 최소 변경 + 새 파일 금지(FR-008).
- `src/schedule/` 파일이 `diary/prompt`·`diary/acceptance`·`models/roster`·`backend.generate()`에 직접 닿지 않는다(020 `checkScheduleFile` 유지).
- `narrative`(exaone)·EXAONE mojibake는 범위 밖(FR-009) — `quiet`만.
- 무예외 24시간 소크 중 화면을 켜면 Doze가 깨진다(019 research §7) → 무선 디버깅 `adb`만 붙여 두고 화면 조작 금지, 조회는 `logcat -d`만(019 §6a — `dumpsys`가 화면을 깨울 수 있음).
- `cmd jobscheduler run -f`는 삼성 절전이 도즈 중 거부 → 소크의 지연 측정은 자연 주기 대기만 유효. release 헤드리스 확인(US4)에서는 배터리 예외를 부여해 강제 실행이 통하게 한다.
- release는 `run-as`가 안 된다(`package not debuggable`) → 검증용 `quiet` 모델은 release APK 설치 전 debug로 배치하거나, US4는 "새 날짜 1건 생성 완주"만 본다.

**Scale/Scope**: 코드 변경 예상 규모 — **0줄**(FR-007 결함이 없으면). 결함이 있으면 `src/schedule/task.ts` 1~3줄(`AUTO_DIARY_TASK_REGISTERED` 명시적 참조) + 계약 테스트 1스위트. 실기기 라운드 4종(배터리 예외 소크·무예외 24h 소크·삼성 One UI 화면·release 헤드리스). 새 화면·새 파일 0개.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### 원칙 I — 온디바이스가 제품이다 (NON-NEGOTIABLE)

- **영향**: 이 스펙은 추론 위치를 바꾸지 않는다. 자동 생성은 020이 이미
  온디바이스로 돈다. US4는 **release 빌드에서도** 온디바이스 헤드리스 생성이
  성립함을 확인한다 — 원칙 I의 "엔드유저가 읽는 일기는 그 기기에서 생성된
  것"을 배포 빌드에서 재확인하는 것이다.
- **미리 만든 응답 저장 경로를 만들지 않는다** — US4는 `quiet` 모델로 실제
  기기 추론을 돌려 완주를 본다.
- **판정**: 통과. 방어를 검증할 뿐 완화하지 않는다.

### 원칙 II — 화자는 휴대폰이고, 시야는 좁다

- **영향**: 없음. 이 스펙은 프롬프트·판정 갈래·화자 규칙을 건드리지 않는다.
  `checkScheduleFile`이 `src/schedule/` → `diary/prompt` import를 막고, 이
  스펙은 그 경계를 유지한다.
- **판정**: 통과.

### 원칙 III — 모델은 캐릭터다

- **영향**: 이 스펙은 `quiet`(금동이) 캐릭터만 쓴다 — 씨앗·페르소나·로스터를
  건드리지 않는다. `narrative` 재검토는 명시적으로 범위 밖(FR-009, 로드맵
  14번).
- 자동 생성은 007이 저장한 캐릭터 선택을 **읽기만** 한다. `src/schedule/`가
  `models/roster`를 import하지 않는다(`checkScheduleFile` 유지).
- 실기기 실측을 제품 코드에 점수·비교로 넣지 않는다 — `findings.md`·AGENTS.md
  문서에만.
- **판정**: 통과.

### 원칙 IV — 측정 장치를 제품에 들이지 않는다

- **영향**: 이 스펙은 측정이 핵심이지만 측정 **장치**를 제품에 넣지 않는다.
  - 검증 전용 로그 모듈(019의 `verification-log.ts`)을 되살리지 않는다(FR-008,
    020이 제거한 전례).
  - 개발자 탭에 "마지막 자동 생성 소요 시간" 패널 등을 추가하지 않는다.
  - 측정은 `adb logcat`의 기존 파이프라인 로그(020이 이미 찍는 것)와 OS 조회
    (`dumpsys jobscheduler`·`deviceidle`·`am get-standby-bucket`)를 사람이
    읽어 `findings.md`에 옮긴다.
  - `llama-port.ts`의 `timings` 폐기 경계, `GENERATION_TIMEOUT_MS`의
    `engine.run()` 구간만 재는 방식을 그대로 둔다.
- **FR-007로 코드를 고치는 경우**(DCE가 등록 부수 효과를 제거하면 — minify는
  OFF이므로 R8이 아니라 Hermes DCE 또는 Metro `@__PURE__`): `task.ts`의 등록
  구문이 DCE에 살아남게 하는 것(`AUTO_DIARY_TASK_REGISTERED` 명시적 참조
  유지)은 **채점 코드가 아니다** — 태스크 핸들러 등록이 트리셰이킹되지 않게
  지키는 것이다. 값·임계값을 코드가 정하지 않는다. `proguard-rules.pro`는
  minify OFF에서 무효라 넣지 않는다.
- **판정**: 통과.

### 원칙 V — 관측된 사실과 추측을 구분해 기록한다

- **영향**: 이 스펙의 전부가 이 원칙의 실행이다.
  - 배터리 예외/무예외 라운드 간격을 **실측**하고 언제·어디서 쟀는지 근거를
    `findings.md`에 남긴다(FR-001·FR-010).
  - 무예외 소크 표본이 24시간에 못 미치면 "N시간 관측 후 M회, 부분 판정"으로
    정직하게 남긴다(SC-002, Clarifications).
  - 삼성 One UI 화면 경로는 `adb whitelist` 동등물로 갈음하지 않고 **실제
    버튼을 눌러** 관측한다(FR-004) — 019 §8의 "동등성 확인"과 다른 목적.
  - `AppState.currentState`를 "화면이 꺼져 있음"의 증거로 해석하지 않는다
    (024 §6 계승).
- **판정**: 통과.

### 개발 방식 — 계약 먼저, 테스트 먼저

- FR-007로 코드를 고치는 경우에만 계약 테스트가 생긴다 — 그때는 구현·검증
  전에 쓰고(예: `task.ts`의 R-DCE 방어 구문 = `AUTO_DIARY_TASK_REGISTERED`
  명시적 참조가 소스에 있는지 검사), 위반 주입으로 방어를 확인한다(007~026
  공통).
- 코드 변경이 없으면(기본 경로) 계약 테스트도 없다 — 이 스펙은 검증 마무리다.
- **판정**: 통과.

### 종합

**위반 없음.** Complexity Tracking 비움. 이 스펙은 020·024의 경계를 유지·검증하며
새 구조를 만들지 않는다. 코드 변경은 조건부(FR-007)이며 그 경우도 최소 변경에
한한다.

## Project Structure

### Documentation (this feature)

```text
specs/027-024-residual-verification/
├── plan.md              # 이 파일
├── research.md          # Phase 0 — 소크 방법론, 삼성 One UI 인텐트 경로 분석, release 헤드리스 확인 절차, R8 트리셰이킹 대응
├── data-model.md        # Phase 1 — 관측 레코드(문서 전용), findings.md 갱신 규칙
├── quickstart.md        # Phase 1 — 실기기 검증 4라운드 절차(배터리 예외 소크·무예외 24h 소크·삼성 One UI 화면·release 헤드리스)
├── contracts/           # Phase 1
│   ├── battery-soak-observation.md    # 배터리 라운드 관측 레코드·판정 규칙(US1·US2) — 문서 전용 계약
│   └── release-headless-check.md      # release 헤드리스 확인 절차·판정, R8 방어 계약(US4, 조건부 코드)
├── checklists/
│   └── requirements.md  # 이미 생성됨(specify 단계)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

이 스펙이 **읽거나(대부분) 조건부로 건드리는** 자리(전부 기존):

```text
src/
└── schedule/
    └── task.ts                  # 읽기만(§9 수정 확인). FR-007 결함(DCE가 등록 부수 효과 제거) 시에만 최소 변경 1~3줄 — AUTO_DIARY_TASK_REGISTERED 명시적 참조(research §4 옵션 A)

__tests__/
└── schedule/
    └── background-generation.test.ts  # FR-007로 task.ts를 고치면 B1a 확장(R-DCE 방어 구문 소스 검사) — US4. 기본은 무변경

.maestro/
├── scheduled-diary-notification.yml   # 회귀 확인만(020). 무변경 예상
├── unified-permission-onboarding.yml  # 회귀 확인만(021). ⚠️ clearState로 앱 데이터 삭제 — §7 순서 주의
└── photo-selection-over-limit.yml     # 회귀 확인만(023). 무변경 예상

specs/024-background-stability-exceptions/findings.md  # §2 표·§11 판단·"미확인 잔여" 갱신 (FR-011)
AGENTS.md                                              # 027 절 또는 024 절에 결론 한 문단 (FR-010)
```

이 스펙이 **명시적으로 만들지 않거나 건드리지 않는** 것: 새 `src/` 파일, 새
화면, 새 `*-port.ts`, 새 `preferences/*.json`, 새 네이티브 모듈, 새 진단
패널, 검증 전용 로그 모듈, **빌드 설정 파일**(`android/gradle.properties`의
minify 토글, `metro.config.js`, `android/app/proguard-rules.pro`). `android/`는
`.gitignore`가 무시하는 prebuild 생성물이라 그 안의 편집은 `prebuild --clean`에
사라진다 — release 관련 영속 변경은 config plugin으로만 하는 것이 레포 관례이며,
minify를 켜고 proguard 규칙을 넣는 것은 로드맵 4번의 몫이다(research §4 옵션 C
기각, FR-008).

**Structure Decision**: 단일 프로젝트. 020이 만든 `src/schedule/` 경계와 024가
고친 `task.ts` 모듈 최상단 `defineTask` 부수 효과를 그대로 쓴다. 코드 변경은
FR-007 조건부이며, 그 경우도 `src/schedule/task.ts` 1~3줄 + 계약 테스트로
한정한다(`proguard-rules.pro`는 minify OFF인 현재 무효라 넣지 않는다). 새
디렉터리 없음.

## Phase 0 — Research (research.md)

해소할 미지수와 조사 항목:

1. **배터리 최적화 예외 소크 방법론** (US1·US2, SC-001·SC-002)
   - 패키지명 `com.anonymous.alpharium`(024 research §3 확정). 예외 부여
     `adb shell dumpsys deviceidle whitelist +com.anonymous.alpharium` = 설정
     앱 "앱 → 배터리 → 제한 없음" 동등(019 §8). 해제는 `-`.
   - 예외가 걸렸는지 확인 신호: `am get-standby-bucket` → `5`(EXEMPTED) /
     `10`+(억제). `dumpsys jobscheduler | grep -A30 alpharium`의 `Minimum
     latency: +14m59s***ms`(15분 요청이 OS에 정확히 전달 — 억제 원인이 앱이
     아님).
   - **US1(예외) 절차**: 목표 시각 = 현재+5분 이내의 시(020은 시 단위) →
     화면 끔(`KEYCODE_POWER`) + `deviceLocked=1` → `logcat -d`로 주기적 덤프,
     `task-entered` 시각 수집 → `delayFromTargetMin`. 최소 1회, SHOULD 3회
     (각 시도 후 목표 시각을 다음 시로 옮기거나 그대로 두고 다음 콜백 대기).
   - **US2(무예외) 절차**: `whitelist -` → `am get-standby-bucket` `10`+ 확인
     → 목표 시각 설정 → 화면 끄고 잠근 뒤 **24시간+ 조작 금지** → 2~4시간마다
     `adb logcat -d -b all > dump_<ts>.txt`(버퍼 넘침 대비) → 24시간+ 뒤
     `task-entered` 흔적. **이 소크는 비동기** — 세션에서 "시작"만, 세션 밖
     방치 후 다음 접속 때 덤프 확인.
   - MUST/SHOULD 판정과 표본·시간 부족 시 처리(019 표본 2회 10·32분과 대조,
     "부분 판정" 표기).
   - 조사: 020이 `task-entered`에 해당하는 로그를 실제로 어떤 태그·문자열로
     찍는가(`adb logcat`에서 무엇을 grep해야 하는가). 024 findings §2가 남긴
     빈 표의 컬럼(`triggerEnteredAt`·`delayFromTargetMin`·`standbyBucket`·
     `minLatencyReported`·`screenTouchedDuringRound`).

2. **배터리 예외 인텐트가 도착하는 삼성 One UI 설정 화면** (US3, SC-003)
   - 021이 만든 설정 "권한" 섹션(`PermissionsSection`)과 온보딩 배터리 단계에서
     "배터리 설정 열기"에 해당하는 버튼이 어떤 인텐트를 던지는가 — 소스에서
     `expo-intent-launcher`(021 research가 언급) 호출을 찾아 액션·데이터 URI를
     특정한다(`ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`인지,
     `ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS`인지, 앱 상세로 가는
     `ACTION_APPLICATION_DETAILS_SETTINGS`인지).
   - 그 인텐트가 삼성 One UI(Android 16)에서 실제로 어느 액티비티·화면에
     떨어지는가 — 이건 실기기에서 버튼을 눌러야만 안다. `adb shell dumpsys
     activity activities | head`로 최상위 액티비티 확인, 화면 제목·경로 기록.
   - 그 화면에서 "제한 없음"(또는 동등 항목) 선택 → 앱 복귀 →
     `am get-standby-bucket`이 `5`로 바뀌는지.
   - 조사: 021의 `flag.ts`가 `batteryNoticeShown`을 어떻게 판정하는지(조회
     통로가 없어 1회 제시로만) — 버튼이 안 열려도 온보딩이 satisfied로 넘어가는지.
   - 실패 양상(액티비티 없음/오류) 시 이것이 검증 차단 결함인지 판단(US1을
     실기기에서 재현하려면 예외 부여가 필요하지만 `adb whitelist` 동등물로
     갈음 가능하므로 대개 차단 아님 — 하지만 실제 사용자가 예외를 못 주면
     제품 결함).

3. **release APK로 §9 헤드리스 확인 절차** (US4, SC-004)
   - AGENTS.md "release 빌드와 서명": `npx expo prebuild --platform android
     --clean` → `cp ~/.alpharium-signing/alpharium.jks android/app/` →
     `cd android && NODE_ENV=production ./gradlew assembleRelease`. 산출물
     `android/app/build/outputs/apk/release/app-release.apk`.
   - 서명 키 존재 확인(`~/.alpharium-signing/alpharium.jks`,
     `~/.gradle/gradle.properties`의 비밀번호). 없으면 US4 수행 불가 —
     사용자에게 알린다.
   - 확인 4단계(AGENTS.md 표): `apksigner verify --print-certs`가
     `CN=Android Debug` 아님 / `git status`에 jks 없음 / Metro 끄고 USB 뽑고
     앱 열어 `Unable to load script` 없음 / 앱 화면이 "이 빌드는 잘못
     만들어졌다" 아님.
   - **검증용 모델 배치**: release는 `run-as`가 안 됨 → release APK 설치
     **전에** debug 빌드로 `a1.bin`(kanana) + `state.json` verdict 배치 후
     release로 덮어 설치(서명 같으면 데이터 유지) — 또는 US4를 "새 날짜 1건
     생성 완주"만 보고 기존 일기 없이 진행. 어느 쪽이 가능한지 확인.
   - **헤드리스 강제 실행**: 설정 탭 진입으로 잡 등록(`dumpsys jobscheduler`의
     `JOB #<uid>/<id> .../SystemJobService`) → 배터리 예외 부여(`deviceidle
     whitelist +`) → 화면 끔·잠금 → `cmd jobscheduler run -f
     com.anonymous.alpharium <id>` → `logcat`에서 `No task registered for key
     expo-task-manager` **부재** + `Registered task with name
     'alpharium-auto-diary'` 존재 + `quiet` 완주(`WM-WorkerWrapper: Worker
     result SUCCESS`).
   - 조사: 024 §11이 "debug 1회로 충분, R8 잔여 위험은 다음 release 세션 1회로
     닫힘"이라 했다 — 이 세션이 그것. 통과 시 §11을 "닫힘"으로 갱신하는 문안.

4. **DCE / 트리셰이킹 대응** (US4 Scenario 3, FR-007 조건부) — **research §4에서
   해소됨.**
   - **★ 발견**: `android/app/build.gradle`(69행)이
     `android.enableMinifyInReleaseBuilds`를 기본 `false`로 두고
     `android/gradle.properties`에 이 속성이 미설정 → **release에서 R8/minify가
     꺼져 있다.** 024 §11의 "R8 side-effect 트리셰이킹"은 현재 위험이 아니라
     minify가 켜질 때(로드맵 4번)의 잠재 위험이다.
   - **그래도 RH3가 실패하면**(minify OFF에서도 Hermes DCE 또는 Metro
     `@__PURE__`가 `task.ts` 모듈 최상단 `registerAutoDiaryTask()` 부수 효과를
     제거) — 검증 차단 결함(FR-007). 최소 수정: `src/schedule/task.ts`에서
     `AUTO_DIARY_TASK_REGISTERED`를 DCE 제거 불가한 방식으로 명시적 참조
     1~3줄(research §4 옵션 A). `proguard-rules.pro` `-keep`은 minify OFF에서
     무효라 넣지 않고, `gradle.properties`·`metro.config.js`도 건드리지 않는다
     (FR-008, 로드맵 4번 몫).
   - 계약 테스트: 소스 검사(R-DCE 방어 구문이 `src/schedule/task.ts`에 있는지)
     — `__tests__/schedule/background-generation.test.ts` B1a 확장(RH5).

5. **회귀 대상 목록**
   - `.maestro/scheduled-diary-notification.yml`(020),
     `unified-permission-onboarding.yml`(021),
     `photo-selection-over-limit.yml`(023) — `run-device-tests.mjs`의 `FLOWS`
     확인. 024 §7이 이 셋을 이미 돌렸으므로 027이 코드를 안 고치면(기본 경로)
     회귀는 형식적. 코드를 고치면(FR-007) 반드시 다시 돌린다.
   - ⚠️ `unified-permission-onboarding.yml`은 `clearState`(=`pm clear`)로 앱
     데이터를 전부 날린다(024 §7 교훈) → 검증용 모델·일기·설정이 삭제되므로
     소크·release 확인보다 **먼저** 돌리거나, 이 흐름은 마지막에.

6. **14번 세션과의 공유 실기기 준비**
   - 이 스펙은 로드맵 14번(narrative 재검토) 실기기 세션과 같은 세션에서
     실행되는 것을 전제(spec Assumptions). 겹치는 준비: 검증용 모델 배치
     (`quiet`는 이 스펙, `narrative`+VLM은 14번), 배터리 예외 토글, 합성 하루.
   - 조사: 두 스펙의 `findings.md`를 분리하되(FR-009), 실기기 준비 절차는
     quickstart에서 어디까지 공유로 명시할지.

**Output**: research.md — 위 6항목의 Decision/Rationale/Alternatives.

## Phase 1 — Design & Contracts

### data-model.md

문서 전용 관측 레코드(제품 코드 아님 — 헌법 원칙 IV):

- **배터리 라운드 관측**: `{ batteryException: boolean, targetHour: 0..23,
  roundStartedAt, triggerEnteredAt, delayFromTargetMin, standbyBucket: 5 |
  "10+", minLatencyReported: string, screenTouchedDuringRound: boolean, notes }`.
  024 `data-model.md` §2 표 구조를 그대로 이어받는다(같은 컬럼).
  `screenTouchedDuringRound: true`면 그 라운드 무효.
- **삼성 One UI 화면 경로 관측**: `{ trigger: "onboarding" | "settings-permissions",
  intentAction: string, landedActivity: string, screenTitle: string,
  reachPath: string, exceptionGrantable: boolean, standbyBucketAfterGrant: 5 |
  unchanged, failureMode?: string }`.
- **release 헤드리스 확인 관측**: `{ signatureOk: boolean, runsWithoutMetro:
  boolean, jobRegisteredOnSettingsTab: boolean, noTaskRegisteredErrorAbsent:
  boolean, quietCompleted: boolean, workerResult: "SUCCESS" | other,
  r8TrimReproduced: boolean, fixApplied?: string }`.

**findings.md 갱신 규칙**(FR-011 — 문서에 반영되는 유일한 데이터 규칙):
- 024 `findings.md` §2 표: `batteryException: true` 행(US1)·`false` 행(US2)을
  실측으로 채운다. 삼성 One UI 화면 경로를 §2 하단 "배터리 인텐트가 실제
  도착한 삼성 One UI 설정 화면 경로" 자리에 기록.
- 024 `findings.md` §11: release 헤드리스 확인 결과로 "남긴 잔여 위험(작음)"
  문단을 갱신 — 통과했으면 "release 세션에서 확인 완료, 잔여 위험 닫힘",
  재현됐으면 수정 내역.
- 024 `findings.md` "미확인 잔여" 목록: "§2 배터리 예외/무예외 소크",
  "배터리 인텐트가 도착한 삼성 One UI 설정 화면 경로", "release APK로 §9
  헤드리스 1회 확인" 세 줄을 해소 표기 또는 제거.
- 갱신은 024 `findings.md`를 직접 고치거나 027 `findings.md`에 쓰고 024에서
  링크하는 방식 중 하나 — 한쪽에만(중복 금지).

### contracts/

**`battery-soak-observation.md`** (US1·US2, 문서 전용 관측 계약):
- **BS1**: US1(예외) 라운드는 `batteryException: true`, `standbyBucket: 5`,
  `minLatencyReported`가 `+14m59s...` 꼴이어야 유효하다. `delayFromTargetMin`은
  `triggerEnteredAt - (targetHour 정각)`으로 계산.
- **BS2**: US1 판정 — 관측된 모든 라운드에서 `delayFromTargetMin <= 60`(MUST,
  SC-001). 표본 `>= 3`이면 과반이 `<= 40`인지 별도 기록(SHOULD).
  표본 `< 3`이면 원시값 나열 + "best-effort" 라벨.
- **BS3**: US2(무예외) 라운드는 `batteryException: false`,
  `standbyBucket >= 10`, `screenTouchedDuringRound: false`여야 유효하다.
- **BS4**: US2 판정 — 목표 시각 이후 24시간 안에 `triggerEnteredAt`이 최소 1건
  (MUST, SC-002). 관측 시간이 24시간 미만이면 `{ observedHours, attemptCount }`를
  원시값으로 기록 + "부분 판정" 라벨. `minLatencyReported`가 15분으로 전달됐음을
  별도 확인(억제 원인이 OS).
- **BS5**: 삼성 One UI 화면 경로는 `adb whitelist` 동등물이 아니라 **실제
  버튼 클릭**으로 관측한다 — `intentAction`·`landedActivity`·`screenTitle`·
  `reachPath`가 전부 채워져야 한다. 실패 시 `failureMode` 기록.
- **BS6 (경계)**: 이 관측들은 전부 `findings.md` 문서 행이다 — 제품 코드에
  레코드 타입·수집 함수를 만들지 않는다(원칙 IV, 019 `verification-log.ts`
  제거 전례).

**`release-headless-check.md`** (US4, 절차 + 조건부 코드 계약):
- **RH1**: release APK는 AGENTS.md "release 빌드와 서명" 절차로 빌드한다 —
  `prebuild --platform android --clean` → 서명 키 복원 → `NODE_ENV=production
  assembleRelease`. `--clean` 생략·키 복원 생략 금지(AGENTS.md 경고).
- **RH2**: 확인 게이트 — `apksigner verify --print-certs`가 `CN=Android
  Debug` 아님 / `git ls-files | grep -i jks` 빈 결과 / Metro 없이 실행 시
  `Unable to load script` 없음 / 앱 화면 "이 빌드는 잘못 만들어졌다" 아님.
- **RH3**: 헤드리스 강제 실행 판정 — logcat에 `No task registered for key
  expo-task-manager` 및 `Unregistering task` **부재**, `Registered task with
  name 'alpharium-auto-diary'` 존재, `quiet` 일기가 그 날짜로 정확히 1개
  저장 + 판정 4갈래 통과 + `WM-WorkerWrapper: Worker result SUCCESS`.
- **RH4 (조건부, FR-007)**: RH3가 실패하면(minify OFF이므로 R8이 아니라
  Hermes DCE 또는 Metro `@__PURE__`가 등록 부수 효과 제거) — 이것은 검증
  차단 결함이므로 이 스펙에서 고친다. 수정은 `src/schedule/task.ts` 1~3줄
  (`AUTO_DIARY_TASK_REGISTERED` 명시적 참조 유지, research §4 옵션 A).
  `proguard-rules.pro`·`gradle.properties`·`metro.config.js`는 건드리지
  않는다(FR-008). `findings.md` §11 갱신.
- **RH5 (조건부 계약 테스트, FR-012)**: RH4로 코드를 고쳤다면
  `__tests__/schedule/background-generation.test.ts`의 B1a를 확장 — R-DCE
  방어 구문(`AUTO_DIARY_TASK_REGISTERED` 명시적 참조 + "제거 불가" 주석)이
  소스에 있는지 `readFileSync` 검사. 위반 주입: 그 구문을 지우면 테스트가
  실패한다.
- **RH6 (기본 경로)**: RH3가 통과하면 코드 변경 0줄 — RH4·RH5는 발동하지
  않는다. `git diff src/`가 0줄이고 이 스펙은 순수 검증으로 끝난다(SC-005).

### quickstart.md

실기기 검증 4라운드 + 회귀. 각 라운드: 전제(Metro·잠금 해제·UTF-8 —
AGENTS.md "도구 사용법"), 절차(`adb` 명령), 기대 결과, `findings.md` 기록 형식.

1. **§1 배터리 예외 라운드 소크** (US1, SC-001) — `deviceidle whitelist +`,
   `am get-standby-bucket` `5` 확인, 목표 시각 현재+몇 분, 화면 끈 채 자연
   15분+ 주기로 `logcat -d` 덤프 → `task-entered` 지연 수집. MUST ≤ 60분,
   SHOULD 과반 ≤ 40분(표본 < 3이면 원시값). 024 `findings.md` §2 표
   `batteryException: true` 행.
2. **§2 무예외 24시간 소크** (US2, SC-002) — **비동기.** `deviceidle
   whitelist -`, `am get-standby-bucket` `10`+ 확인, 목표 시각 설정, 화면
   끄고 잠근 뒤 24시간+ 조작 금지, 2~4시간마다 `logcat -d -b all` 덤프 →
   24시간+ 뒤 `task-entered` 흔적. MUST 24시간 안 1회, `Minimum latency`
   15분 전달 확인. 못 채우면 "부분 판정" + `{ observedHours, attemptCount }`.
   024 `findings.md` §2 표 `batteryException: false` 행.
3. **§3 삼성 One UI 배터리 화면** (US3, SC-003) — 설정 "권한" 섹션(또는
   온보딩 배터리 단계)의 "배터리 설정 열기" 버튼을 실제로 누름 →
   `dumpsys activity activities`로 최상위 액티비티·화면 제목·도달 경로 기록
   → "제한 없음" 선택 → 앱 복귀 → `am get-standby-bucket` `5` 확인. 실패
   양상 있으면 검증 차단 여부 판단. 024 `findings.md` §2 하단.
4. **§4 release 헤드리스 확인** (US4, SC-004) — AGENTS.md "release 빌드와
   서명" 절차 → `apksigner verify` → Metro 없이 설치 → 검증용 `quiet` 모델
   배치(release 설치 전 debug로, 또는 새 날짜 1건만) → 설정 탭 진입 잡 등록
   확인 → 배터리 예외 부여 → 화면 끔·잠금 → `cmd jobscheduler run -f` →
   `No task registered` 부재 + `quiet` 완주. RH3 실패 시 RH4(코드 수정) +
   RH5(계약 테스트) + `npm run test:device` 재회귀. 024 `findings.md` §11.
5. **§5 회귀** (코드 변경 시에만 필수) — `npm run test:device`로 020·021·023
   `FLOWS` 통과. ⚠️ `unified-permission-onboarding.yml`의 `clearState`가 앱
   데이터를 날리므로 §1~§4 뒤에 돌리거나 마지막에.
6. **§6 기기 없는 게이트** (SC-006) — `npm run test:logic`·`npm run lint`
   (헌법 검사)·prettier 전부 통과, `checkScheduleFile` 위반 0. 코드 변경이
   없으면 `git diff src/` 0줄 확인(SC-005). 있으면 계약 테스트 추가분 통과.
7. **§7 findings·AGENTS 갱신** (FR-010·FR-011) — 024 `findings.md` §2·§11·
   "미확인 잔여" 갱신(한쪽에만), AGENTS.md에 027 결론 한 문단.

**Output**: data-model.md, contracts/battery-soak-observation.md,
contracts/release-headless-check.md, quickstart.md.

## Post-Design Constitution Re-Check

Phase 1 설계가 새 위반을 만들지 않는다:

- **원칙 IV**: 계약은 문서 전용 관측(BS1~BS6)과 절차·조건부 코드 방어
  (RH1~RH6)만 잠근다 — 채점·비교 코드 없음. 측정 레코드는 `findings.md` 문서
  전용(BS6이 명시). FR-007 코드 수정은 태스크 등록이 트리셰이킹되지 않게
  지키는 것이지 값·임계값을 코드가 정하는 것이 아니다.
- **원칙 V**: 모든 실측에 기기·OS·조건·측정 방법을 붙이고(FR-010), 무예외
  소크 표본이 24시간에 못 미치면 "부분 판정" + 원시값으로 정직하게 표기하는
  규칙을 quickstart §2·BS4에 명시.
- **경계**: `src/schedule/` → 제품 계층 차단(`checkScheduleFile`) 유지. 새
  디렉터리·새 port·새 파일 없음. FR-007 수정도 기존 파일 1곳 최소 변경.
- **개발 방식**: FR-007로 코드를 고칠 때만 계약 테스트(RH5)가 생기며, 그때는
  구현 전에 쓰고 위반 주입으로 확인. 코드 변경이 없으면 계약 테스트도 없다
  (이 스펙은 검증 마무리).

**재검토 결과**: 통과. Complexity Tracking 비움.

## Complexity Tracking

*위반 없음 — 비움.*
