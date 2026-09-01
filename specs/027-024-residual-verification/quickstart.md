# Quickstart: 024 잔여 실측 마무리 검증

**대상 스펙**: [spec.md](./spec.md) · [plan.md](./plan.md)

이 스펙은 검증 마무리라 quickstart가 곧 핵심 산출물이다. 실기기 4라운드
(배터리 예외 소크·무예외 24h 소크·삼성 One UI 화면·release 헤드리스) + 조건부
회귀 + 기기 없는 게이트. 실측값은 전부 `findings.md`에 옮겨 적는다
(data-model.md의 표 구조, contracts로 검산).

**14번 세션과 함께 돈다** — spec Assumptions. 아래 "공통 실기기 준비"에서 027이
필요한 것만 명시하고, `narrative`·VLM 배치는 14번 quickstart가 담당한다.

## 공통 전제 (AGENTS.md "도구 사용법")

- **Metro가 dev 환경으로**(§1~§3·회귀): `EXPO_PUBLIC_APP_ENV=dev npx expo start
  --dev-client`. gradle 빌드가 끝난 뒤 Metro를 띄운다. §4(release)는 Metro
  없이.
- **기기 잠금 해제·화면 켜짐**: `adb shell dumpsys trust`의 `deviceLocked=0`.
  소크 라운드는 반대로 `deviceLocked=1`을 만들고 유지.
- **`adb reverse tcp:8081 tcp:8081`**: dev 빌드는 USB·무선 관계없이 필요.
  재부팅으로 사라지므로 다시 건다.
- **한글 검증 문구**: `-Dfile.encoding=UTF-8`. `adb logcat` 한글은 CP949로
  뭉개지므로 UTF-8로 직접 읽는다.
- **기기 둘 붙으면 `-s <시리얼>`**. `adb pull` 목적지는 `C:/…` 꼴.
- **무선 디버깅**: `adb connect <IP>:<PORT>`. 재부팅 후 재연결.
- **패키지명**: `com.anonymous.alpharium`.
- **스크래치**: 덤프 파일(`dump_<ts>.txt`)은
  `C:\Users\mrtin\AppData\Local\Temp\claude\...\scratchpad`에. `findings.md`에는
  수치만 옮긴다.

## 공통 실기기 준비 (027 몫)

- **검증용 `quiet` 모델**: 개발 기계에서 `a1.bin`(kanana) 받아 `run-as
  com.anonymous.alpharium`로 `files/models/`에 배치 + `state.json`에
  `passed:true` verdict(021 D2 방식). §4(release) 전에 debug로 배치해 둔다.
- **사진 없는 합성 하루**: `npm run seed:day -- empty <날짜>`(사진 0장이면
  `quiet`로 충분). 사진 있는 하루는 027에 불필요.
- **자동 생성 캐릭터 = `quiet`**: 007 캐릭터 선택을 `quiet`(금동이)로. 개발자
  탭 또는 `adb`로 `preferences/selection.json` 주입.
- ⚠️ 회귀(§5)의 `unified-permission-onboarding.yml`이 `pm clear`로 이 준비를
  전부 날린다 — §1~§4 뒤에, 또는 14번 세션이 그 흐름을 돌린 뒤 재배치.

---

## §1 배터리 예외 라운드 소크 (US1, SC-001, contracts BS1·BS2)

**목표**: 배터리 예외를 준 상태에서 목표 시각으로부터 자동 생성 첫 시도까지의
지연을 여러 번 모은다.

### 절차

1. `adb shell dumpsys deviceidle whitelist +com.anonymous.alpharium`.
2. 확인: `adb shell am get-standby-bucket com.anonymous.alpharium` → `5`.
   `adb shell dumpsys jobscheduler | grep -A30 alpharium` → `Minimum latency:
   +14m59s...`.
3. 자동 생성 ON(설정 탭), 목표 시각 = 현재+5분 이내의 시(시 단위).
4. `adb shell input keyevent KEYCODE_POWER` → `dumpsys trust` `deviceLocked=1`
   확인. **이후 화면 조작 금지.**
5. `adb logcat -d -v time -b all`을 15분+ 주기로 덤프하며
   `BackgroundTaskConsumer: Executing task 'alpharium-auto-diary'` 시각을
   모은다(research §1 — `task-entered` 대용). 목표 시각으로부터의 분 =
   `delayFromTargetMin`.
6. 최소 1회(SHOULD 3회) 모일 때까지 반복 — 각 시도 후 목표 시각을 다음 시로
   옮기거나 그대로 두고 다음 콜백 대기.

### 기대 결과 (`findings.md` §2 표, `batteryException: true` 행)

- **MUST**: 관측된 모든 유효 라운드에서 `delayFromTargetMin <= 60`(SC-001).
- **SHOULD**: 유효 라운드 `>= 3`이면 과반이 `<= 40`. `< 3`이면 원시값 나열 +
  "best-effort, 표본 N회"(019 표본 2회 10·32분과 대조).
- `standbyBucket: 5`, `minLatencyReported: +14m59s...` 확인.
- `screenTouchedDuringRound: false` — 참이면 그 라운드 무효, 다시.

---

## §2 무예외 24시간 소크 (US2, SC-002, contracts BS3·BS4) — 비동기

**목표**: 배터리 예외 없이 24시간 안에 최소 1회 시도되는지.

**★ 이 라운드는 비동기다** — 세션 안에서 "시작"만 하고, 세션 종료 후에도
24시간+ 방치가 계속된다. 다음 접속 때 덤프를 확인한다.

### 시작 절차 (세션 안)

1. `adb shell dumpsys deviceidle whitelist -com.anonymous.alpharium`.
2. 확인: `adb shell am get-standby-bucket com.anonymous.alpharium` → `10`
   이상(억제됨).
3. 자동 생성 ON, 목표 시각 설정. `roundStartedAt` 기록.
4. `adb shell input keyevent KEYCODE_POWER` → `deviceLocked=1` 확인.
   **24시간 이상 화면을 조작하지 않는다**(Doze 조건 — 화면을 켜면 깨진다,
   019 research §7). 무선 디버깅 `adb`만 유지. **조회는 `adb logcat -d`만**
   (`dumpsys`는 화면을 깨울 수 있다, 019 §6a).
5. 2~4시간마다 `adb logcat -d -b all > dump_<ts>.txt`로 버퍼를 보존(링 버퍼가
   넘칠 수 있음).

### 확인 절차 (24시간+ 뒤, 세션 밖 후속)

6. 쌓인 덤프에서 `BackgroundTaskConsumer: Executing task 'alpharium-auto-diary'`
   또는 `WM-WorkerWrapper` 흔적을 찾는다. `observedHours`·`attemptCount` 계산.
7. `adb shell dumpsys jobscheduler | grep -A30 alpharium`의 `Minimum latency`가
   15분으로 전달됐는지(억제 원인이 앱이 아니라 OS).

### 기대 결과 (`findings.md` §2 표, `batteryException: false` 행)

- **MUST**: `observedHours >= 24` 안에 `attemptCount >= 1`(019 최악 19시간
  33분이 이 한계 안).
- **부분 판정**: `observedHours < 24`면 `{ observedHours, attemptCount }`
  원시값 + "부분 판정 — N시간 관측 후 M회" 라벨(024 Clarifications가 허용).
- `minLatencyReported`가 15분 — `observedHours`와 무관하게 항상 기록.
- `screenTouchedDuringRound: false` 확인(참이면 소크 무효).

---

## §3 삼성 One UI 배터리 화면 (US3, SC-003, contracts BS5)

**목표**: "배터리 설정 열기" 버튼이 삼성 One UI의 어느 화면에 도달하는지.
`adb whitelist` 동등물로 **갈음하지 않는다**.

### 절차

1. 소스 확인: 021의 설정 "권한" 섹션(`PermissionsSection`) 또는 온보딩 배터리
   단계에서 배터리 버튼이 `expo-intent-launcher`로 던지는 액션을 특정
   (`intentAction` — `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` /
   `IGNORE_BATTERY_OPTIMIZATION_SETTINGS` / `APPLICATION_DETAILS_SETTINGS`
   중 무엇인지).
2. 앱을 열어 그 버튼을 **실제로 누른다**.
3. `adb shell dumpsys activity activities | head -40`에서 최상위
   (`ResumedActivity`/`topResumedActivity`) 액티비티 이름 = `landedActivity`.
   화면 제목(`screenTitle`), 삼성 One UI 설정 계층 경로(`reachPath`) 기록.
4. 그 화면에서 "제한 없음"(또는 동등) 선택 → 앱 복귀 →
   `adb shell am get-standby-bucket com.anonymous.alpharium` → `5`인지
   (`exceptionGrantable`·`standbyBucketAfterGrant`).
5. 버튼을 안 눌러도/실패해도 온보딩이 다음 단계로 가는지
   (`onboardingProceededWithoutGrant` — 021 `batteryNoticeShown` 판정).

### 기대 결과 (`findings.md` §2 하단)

- `intentAction`·`landedActivity`·`screenTitle`·`reachPath`가 전부 채워짐.
- `exceptionGrantable === true`이고 부여 후 `standbyBucket` `5`.
- `failureMode !== null`(버튼이 안 열림/오류)이면 그 양상 + 검증 차단 여부
  판단(US1은 `adb whitelist`로 재현 가능하므로 대개 차단 아님, 하지만
  실사용자 영향이면 별도 스펙 후보로 명시).

---

## §4 release 헤드리스 확인 (US4, SC-004, contracts RH1~RH6)

**목표**: 현재 release 빌드 구성(minify OFF)으로 024 §9 헤드리스 등록·완주가
성립하는지 1회.

### 절차

1. **전제 확인**: `~/.alpharium-signing/alpharium.jks` + `~/.gradle/gradle.properties`
   비밀번호. 없으면 US4 중단, 사용자에게 알림.
2. **검증용 모델**: debug 빌드로 `quiet` 모델 배치(공통 준비) — release로
   덮기 전에.
3. **빌드** (RH1):
   ```
   npx expo prebuild --platform android --clean
   cp ~/.alpharium-signing/alpharium.jks android/app/
   cd android && NODE_ENV=production ./gradlew assembleRelease
   ```
4. **확인 게이트** (RH2): `apksigner verify --print-certs`(`CN=Android Debug`
   아님) / `git ls-files | grep -i jks`(빈 결과) / Metro 끄고 USB 뽑고 설치
   후 앱 열기(`Unable to load script` 없음) / 앱 화면("이 빌드는 잘못
   만들어졌다" 아님).
5. **헤드리스 강제 실행** (RH3):
   - 설정 탭 진입 → `dumpsys jobscheduler | grep -A30 alpharium` 잡 등록
     확인.
   - `dumpsys deviceidle whitelist +com.anonymous.alpharium`.
   - `input keyevent KEYCODE_POWER` → `deviceLocked=1`.
   - `cmd jobscheduler run -f com.anonymous.alpharium <id>`.
   - `adb logcat -d` — `No task registered for key expo-task-manager` **부재**,
     `Registered task with name 'alpharium-auto-diary'` 존재, `quiet` 완주
     알림, `WM-WorkerWrapper: Worker result SUCCESS`.
6. **RH3 실패 시** (RH4·RH5, FR-007): `src/schedule/task.ts`에
   `AUTO_DIARY_TASK_REGISTERED` 명시적 참조 1~3줄(research §4 옵션 A) →
   `background-generation.test.ts` B1a 확장(소스 검사) → 위반 주입 확인 →
   release 재빌드 → RH1~RH3 재실행. `proguard-rules.pro`·`gradle.properties`·
   `metro.config.js`는 **건드리지 않는다**.

### 기대 결과 (`findings.md` §11)

- RH3 4개 필드 전부 통과 → "현재 release 빌드(minify OFF)에서 §9 헤드리스
  등록·완주 확인 완료. R8 트리셰이킹은 minify가 켜질 때(로드맵 4번) 재검토".
- RH3 실패 → `dceTrimReproduced: true` + `fixApplied` 기록.

---

## §5 회귀 (코드 변경 시에만 필수)

**코드 변경이 없으면**(§4 RH3 통과) 이 절은 형식적 — 024 §7이 020·021·023
흐름을 이미 돌렸고 027이 소스를 안 건드리므로 새 실패 없음.

**§4 RH4로 `task.ts`를 고쳤으면** 필수:

```
JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8" MSYS_NO_PATHCONV=1 \
  npm run test:device
```

또는 개별:
- `.maestro/scheduled-diary-notification.yml`(020)
- `.maestro/photo-selection-over-limit.yml`(023)
- `.maestro/unified-permission-onboarding.yml`(021) — ⚠️ `pm clear`로 앱
  데이터 삭제. **맨 마지막에**, 또는 이후 모델 재배치.

전부 PASS면 회귀 없음.

---

## §6 기기 없는 게이트 (SC-005·SC-006)

- `npm run test:logic` — 전부 통과(`jest-projects.test.ts` 파일 수 검사
  유지). §4 RH5로 테스트를 추가했으면 그 스위트 포함.
- `npm run lint` — eslint 0 error, tsc 클린, 헌법 검사 **위반 0건**
  (`checkScheduleFile` 포함), prettier 클린.
- `git diff --stat`:
  - **기본 경로**(RH3 통과): `src/` 변경 **0줄**(SC-005). 변경은
    `specs/027-*`·`specs/024-*/findings.md`·`AGENTS.md`뿐.
  - **조건부**(RH4 수행): `src/schedule/task.ts` 1~3줄 +
    `__tests__/schedule/background-generation.test.ts`. 새 `src/` 파일 0 ·
    새 화면 0 · 새 `*-port.ts` 0 · 새 `preferences/*.json` 0 · 새 네이티브
    모듈 0 · 새 진단 패널 0 · 빌드 설정 파일 0.

---

## §7 findings·AGENTS 갱신 (FR-010·FR-011)

- **024 `findings.md`**:
  - §2 표: `batteryException: true`/`false` 행을 §1·§2 실측으로 채움. 삼성
    One UI 화면 경로를 §2 하단 "_(미기록)_" 자리에.
  - §11: release 헤드리스 확인 결과. "남긴 잔여 위험(작음)" 문단을 minify
    OFF 사실 + 확인 결과로 정정.
  - "미확인 잔여" 목록: "§2 배터리 예외/무예외 소크", "배터리 인텐트가
    도착한 삼성 One UI 설정 화면 경로", "release APK로 §9 헤드리스 1회 확인"
    세 줄을 해소 표기 또는 제거.
  - 갱신은 024 `findings.md` 직접 또는 027 `findings.md` + 024에서 링크 —
    **한쪽에만**(중복 금지).
- **AGENTS.md**: "024 —" 절 또는 새 "027 —" 절에 결론 한 문단(배터리 소크
  판정, 삼성 One UI 배터리 화면 경로, release 헤드리스 확인 결과, minify OFF
  사실).
