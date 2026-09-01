# Research: 024 잔여 실측 마무리

**대상 스펙**: [spec.md](./spec.md) · [plan.md](./plan.md) · **작성일**: 2026-09-01

이 스펙은 검증 마무리 성격이라 research가 곧 "어떻게 잴 것인가"의 방법론이다.
제품 코드 조사는 US4의 R8 관련 한 곳뿐이며 나머지는 실기기 절차다.

---

## §1 배터리 최적화 예외 소크 방법론 (US1·US2, SC-001·SC-002)

### Decision

- **패키지명**: `com.anonymous.alpharium`(024 research §3 확정, app.json
  `android.package`).
- **예외 부여**: `adb shell dumpsys deviceidle whitelist +com.anonymous.alpharium`
  = 설정 앱 "앱 → 배터리 → 제한 없음"과 동등한 시스템 상태(019 §8이 동등성
  확인). 해제는 `... whitelist -com.anonymous.alpharium`.
- **예외가 걸렸는지 확인 신호**:
  - `adb shell am get-standby-bucket com.anonymous.alpharium` → `5`(EXEMPTED,
    예외) / `10` 이상(RARE 등, 억제).
  - `adb shell dumpsys jobscheduler | grep -A30 alpharium`의 해당 Job이 요청한
    `Minimum latency: +14m59s***ms`(15분 요청이 OS에 정확히 전달 — 억제
    원인이 앱이 아니라 OS 절전 정책).
- **US1(예외) 절차**:
  1. `deviceidle whitelist +` → `am get-standby-bucket` `5` 확인.
  2. 자동 생성 ON(설정 탭), 목표 시각 = 현재+5분 이내의 시(020은 시 단위).
  3. `adb shell input keyevent KEYCODE_POWER` → `dumpsys trust`
     `deviceLocked=1` 확인. **이후 화면 조작 금지.**
  4. `adb logcat -v time -b all`을 주기적으로 `-d`로 덤프하며 `task-entered`에
     해당하는 로그 시각을 모은다(무엇을 grep하는지는 아래 "미해결" 참조).
  5. 최소 1회, SHOULD 3회 — 각 시도 후 목표 시각을 다음 시로 옮기거나 그대로
     두고 다음 15분+ 콜백 대기.
- **US2(무예외) 절차**: **비동기.**
  1. `deviceidle whitelist -` → `am get-standby-bucket` `10` 이상 확인.
  2. 자동 생성 ON, 목표 시각 설정.
  3. 화면 끄고 잠근 뒤 **24시간+ 조작 금지**(화면을 켜면 Doze가 깨진다 —
     019 research §7). 무선 디버깅 `adb`만 유지.
  4. 2~4시간마다 `adb logcat -d -b all > dump_<ts>.txt`(링 버퍼가 24시간을
     못 담으므로 덤프를 쌓는다).
  5. 24시간+ 뒤 덤프에서 `task-entered` 흔적을 찾는다.
- **판정·표본 부족 처리**:
  - US1 MUST: 관측된 모든 라운드에서 목표 시각→첫 시도 ≤ 60분. SHOULD:
    표본 ≥ 3이면 과반 ≤ 40분. 표본 < 3이면 원시값 나열 + "best-effort"
    라벨(019의 2회 표본 10·32분과 대조).
  - US2 MUST: 목표 시각 이후 24시간 안에 ≥ 1회. 관측 시간이 24시간 미만이면
    `{ observedHours, attemptCount }` 원시값 + "부분 판정" 라벨(024
    Clarifications Q가 허용, 019가 표본 부족을 그렇게 처리한 선례).

### Rationale

- 019가 `deviceidle whitelist` = 설정 앱 토글의 동등성을 이미 확인했고
  (findings.md §8), standby bucket이 즉시 `5`로 바뀌는 것도 관측했다.
- 배터리 예외 24시간 풀 라운드는 019가 명시적으로 "안 했다"(약 32분 단기
  대조만). 020 SC-003·024 SC-003이 이 공백을 겨냥하며 024 §2 표에 빈 행으로
  남아 있다.
- 무예외 24시간 소크는 019가 무예외에서 이미 했으나(19시간 33분 관측), 020
  SC-002·024 SC-004가 "제품 경로로 재확인"을 요구하며 비어 있다. 이 스펙이
  자리를 채운다.
- 비동기 처리: 24시간 소크는 세션 시간을 통째로 잡아먹어 024가 매번
  건너뛰었다. "시작"과 "24시간 후 확인"을 나누면 세션을 막지 않는다.

### Alternatives considered

- **`adb shell cmd jobscheduler run -f <pkg> <jobid>`로 강제 실행** — 기각
  (지연 측정 용도로). "OS가 스스로 언제 도는가"를 재는 것이 SC-001·SC-002의
  본질이므로 강제 실행은 지연을 못 잰다. 게다가 삼성 절전이 도즈 중 거부한다
  (024 §9). 강제 실행은 US4(release 헤드리스 등록 확인)에서만 쓴다 — 거기선
  "등록됐는가"만 보고 지연은 안 본다.
- **화면 켜 둔 채 무예외 관측** — 기각. Doze가 안 걸려 무예외 억제가 재현
  안 됨(019 research §7).
- **소크 없이 019 최악값(19h33m)에 의존한 추정** — 기각. 024 SC-004가 "이
  기기·이 OS에서 직접" 검증을 요구하고, 019는 다른 세션·다른 앱 상태였다.

### 미해결(실기기에서 확정) — `task-entered`에 해당하는 로그 문자열

`src/schedule/task.ts`·`src/schedule/`에 `console.log`/네이티브 `Log.` 호출이
없다(grep 0건). 020이 파이프라인 진입/완주를 찍는 로그는 `src/inference/`·
`src/diary/pipeline.ts` 계열의 기존 로그거나 `expo-task-manager`·WorkManager의
네이티브 로그(`D/BackgroundTaskConsumer: Executing task 'alpharium-auto-diary'`,
`I/TaskService: Started headless task`, `WM-WorkerWrapper: Worker result ...`)다.
024 §9가 실제로 인용한 라인이 후자이므로, **`task-entered`의 대용 신호는
`BackgroundTaskConsumer: Executing task 'alpharium-auto-diary'`**(태스크가 실제
진입한 시각)로 삼는다. quickstart §1·§2가 이 문자열을 grep 대상으로 못 박고,
실기기 첫 라운드에서 다른 더 이른 신호(`RunResult` 저장 시각 등)가 보이면
findings에 병기한다.

---

## §2 배터리 예외 인텐트가 도착하는 삼성 One UI 설정 화면 (US3, SC-003)

### Decision

- **버튼의 인텐트를 소스에서 특정**: 021의 설정 "권한" 섹션·온보딩 배터리
  단계에서 "배터리 설정 열기"에 해당하는 버튼이 `expo-intent-launcher`로 던지는
  액션을 찾는다. 후보:
  - `android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`(앱별 예외 요청
    다이얼로그 — `package:` data URI 필요).
  - `android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS`(시스템 배터리
    최적화 목록).
  - `android.settings.APPLICATION_DETAILS_SETTINGS`(앱 상세 — 021 T030에서
    사진·위치가 이 경로로 도착했다).
- **실기기 관측**: 버튼을 실제로 누른 뒤 `adb shell dumpsys activity activities
  | head -40`으로 최상위(`ResumedActivity` / `topResumedActivity`) 액티비티
  이름을 읽는다. 화면 제목·도달 경로(삼성 One UI 설정 계층: 예 "설정 > 앱 >
  알파리움 > 배터리")를 기록.
- **예외 부여 확인**: 그 화면에서 "제한 없음"(또는 동등 항목)을 선택 → 앱
  복귀 → `am get-standby-bucket`이 `5`로 바뀌는지.
- **온보딩 satisfied 판정**: 021의 `flag.ts`는 배터리 예외 조회 통로가 없어
  `batteryNoticeShown`(1회 제시)으로만 판정한다 — 버튼이 안 열려도 온보딩은
  다음 단계로 넘어간다(`skipped-eligible`). 이걸 실기기에서 확인.

### Rationale

- 021 T030 관행("인텐트가 실제 도착한 삼성 One UI 설정 화면 경로를 기록한다")이
  사진·위치·알림에 대해서는 채워졌으나 **배터리 예외 항목은 비어 있다**(024
  findings §2 하단 "_(미기록)_").
- 024는 `adb shell dumpsys deviceidle whitelist +`로 **동등 재현만** 했다 —
  standby bucket 관점에서는 동등하지만, 실제 사용자가 버튼을 눌러 예외를 줄
  수 있는지는 별개다. 이 버튼이 삼성 One UI에서 엉뚱한 화면에 떨어지거나
  오류를 내면 제품 결함이다.

### Alternatives considered

- **`adb whitelist` 동등물로 계속 갈음** — 기각. 그게 정확히 024가 남긴
  구멍이다. US3의 목적은 동등물이 아니라 실제 버튼 경로 확인.
- **소스만 읽고 인텐트 액션으로 결론** — 부분 채택(사전 특정). 하지만 삼성
  One UI가 표준 인텐트를 자체 화면으로 가로채는 일이 흔하므로(021 T030이
  그래서 실측을 요구) 실기기 클릭이 필수.

### 미해결(실기기) — 버튼이 없으면?

021 설정 "권한" 섹션에 배터리 행은 있으나 그 행의 액션 버튼이
`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`를 던지는지 `APPLICATION_DETAILS_SETTINGS`만
던지는지 소스에서 먼저 확인한다. 후자뿐이면 "사용자가 배터리 최적화 예외를
주려면 앱 상세에서 몇 단계를 더 눌러야 하는가"까지 경로를 기록한다.

---

## §3 release APK로 §9 헤드리스 확인 절차 (US4, SC-004)

### Decision

- **빌드**: AGENTS.md "release 빌드와 서명" 절차 그대로 —
  1. `npx expo prebuild --platform android --clean`
  2. `cp ~/.alpharium-signing/alpharium.jks android/app/`  ← prebuild가 지움
  3. `cd android && NODE_ENV=production ./gradlew assembleRelease`
  - 산출물 `android/app/build/outputs/apk/release/app-release.apk`.
  - `--clean` 생략 금지(004에서 권한 빠진 APK), 키 복원 생략 금지,
    `NODE_ENV=production` 필수(없으면 `.env.production` 미로드 → "이 빌드는
    잘못 만들어졌다").
- **서명 키 전제 확인**: `~/.alpharium-signing/alpharium.jks` 존재 +
  `~/.gradle/gradle.properties`의 `ALPHARIUM_STORE_PASSWORD`·
  `ALPHARIUM_KEY_PASSWORD`. 없으면 US4 수행 불가 → 사용자에게 알린다(새 키를
  만들면 기존 설치를 못 덮어써 일기 손실).
- **확인 게이트**(AGENTS.md 표):
  - `apksigner verify --print-certs <apk>` → `CN=Android Debug`가 **아니다**.
  - `git ls-files | grep -i jks` → 빈 결과.
  - Metro 끄고 USB 뽑고 앱 열기 → `Unable to load script` 없음.
  - 앱 화면 → "이 빌드는 잘못 만들어졌다" 아님.
- **검증용 모델 배치**: release는 `run-as`가 안 됨(`package not debuggable`).
  옵션:
  - (a) release APK **설치 전에** debug 빌드로 `a1.bin`(kanana) +
    `state.json` verdict 배치 → release로 덮어 설치(서명 같으면 데이터
    유지). ← 권장.
  - (b) US4를 "새 날짜 1건 생성 완주"만 보고 진행 — 모델이 없으면 생성 자체가
    안 되므로 (a)가 사실상 필수. `quiet` 모델만 있으면 된다(`narrative`·VLM은
    14번 세션).
- **헤드리스 강제 실행**:
  1. 설정 탭 진입 → `dumpsys jobscheduler | grep -A30 alpharium`에
     `JOB #<uid>/<id> com.anonymous.alpharium/androidx.work.impl.background.systemjob.SystemJobService`
     등록 + `Minimum latency: +14m59s...` 확인.
  2. `dumpsys deviceidle whitelist +com.anonymous.alpharium`(삼성 절전이
     `run -f`를 도즈 중 거부하므로 예외 부여).
  3. `adb shell input keyevent KEYCODE_POWER` → `deviceLocked=1`.
  4. `adb shell cmd jobscheduler run -f com.anonymous.alpharium <id>`.
  5. `adb logcat -d`에서:
     - `No task registered for key expo-task-manager` **부재**
     - `Unregistering task 'alpharium-auto-diary'` **부재**
     - `Registered task with name 'alpharium-auto-diary'` 존재
     - `quiet` 일기가 그 날짜로 정확히 1개 저장(`run-as`가 안 되므로
       `adb logcat`의 저장 완료 로그 + 완료 알림으로 확인) + 판정 통과
     - `WM-WorkerWrapper: Worker result SUCCESS`
- **결과 반영**: 024 findings §11의 "남긴 잔여 위험(작음)" 문단을 갱신 —
  통과 시 "release 세션에서 확인 완료, R8 잔여 위험 닫힘".

### Rationale

- **★ 이 프로젝트는 release에서 R8/minify가 꺼져 있다.**
  `android/app/build.gradle:69`가 `android.enableMinifyInReleaseBuilds`를
  기본 `false`로 두고, `android/gradle.properties`에 이 속성이 **설정돼
  있지 않다**. 따라서 `minifyEnabled false`, `proguard-rules.pro`는 적용은
  되나 minify 자체가 안 돌아 **R8 side-effect 트리셰이킹이 현재 빌드
  구성에서는 일어나지 않는다.** 024 §11의 "R8이 부수 효과를 제거할 이론적
  가능성"은 **minify가 나중에 켜질 때의 위험**이지 현재 위험이 아니다 —
  024 §11도 이를 알고 "작은 잔여 위험"이라 했다.
- 그래도 US4는 유효하다: release는 (1) Hermes 바이트코드 사전 컴파일,
  (2) `NODE_ENV=production` + `.env.production`, (3) Metro 없이 번들 내장이
  debug와 다르다. `task.ts` 모듈 최상단 `require("expo-task-manager")`가
  Hermes 바이트코드 경로에서도 헤드리스 등록을 성립시키는지는 release에서만
  확인된다. 024 §9·§11이 "다음 release 세션 1회로 닫힌다"고 명시한 그 세션.

### Alternatives considered

- **minify를 일부러 켜서 R8 최악을 재현** — 기각. 그건 이 스펙 범위 밖의
  빌드 설정 변경이고(로드맵 4번 "단독 구동용 Release 빌드 배포"의 몫),
  024가 요구한 것은 "현재 release 빌드로 §9가 성립하는가"다.
- **debug 확인으로 갈음**(024 §11 판단대로) — 부분 채택했으나 사용자가 15번
  스펙 입력에서 "release APK로 §9 헤드리스 생성 1회 확인"을 명시했으므로
  실제 수행한다.

### 미해결(실기기) — RH3가 실패하면

release에서 `No task registered`가 재현되면(Hermes 바이트코드 경로 또는
`.env.production` 로딩 순서 문제로 모듈 최상단 `require`가 다르게 동작) —
이건 검증 차단 결함(FR-007). 최소 수정 옵션은 §4.

---

## §4 R8 / 트리셰이킹 대응 (US4 Scenario 3, FR-007 조건부)

### Decision

- **현재 빌드 구성에서는 발동하지 않을 가능성이 높다**(§3 Rationale — minify
  OFF). 하지만 RH3가 어떤 이유로든 실패하면(minify OFF에서도 Hermes DCE 또는
  Metro `@__PURE__` 주입이 모듈 최상단 부수 효과를 제거하는 경우), 최소 수정:
  - **옵션 A** (권장): `src/schedule/task.ts`에서
    `AUTO_DIARY_TASK_REGISTERED`(모듈 최상단 `registerAutoDiaryTask()` 결과
    상수)를 **부수 효과가 관측 가능한 방식으로** 참조한다 — 이미
    `ensureAutoDiaryTaskDefined()`가 이 상수를 읽어 export하므로, DCE가
    "결과 미사용"으로 볼 수 없게 하는 한 줄(예: `if (!AUTO_DIARY_TASK_REGISTERED)
    { /* no-op, keeps registration reachable */ }` 또는 모듈 export에 포함).
    변경 규모: `task.ts` 1~3줄.
  - **옵션 B**: `metro.config.js`에서 `transformer.unstable_disableModuleWrapping`
    또는 `@__PURE__` 주입 비활성 — 기각 후보(전역 영향, 범위 밖).
  - **옵션 C**: minify가 켜졌을 때만 문제라면 `proguard-rules.pro`에
    `-keep class expo.modules.taskManager.** { *; }` 1줄 — minify OFF인 현재는
    불필요하나, 로드맵 4번을 대비한 방어로 정당.
- **어느 옵션이든 계약 테스트(RH5)로 잠근다**: `background-generation.test.ts`
  B1a 확장 — 방어 구문(옵션 A의 명시적 참조 또는 옵션 C의 proguard 규칙)이
  소스에 있는지 `readFileSync` 검사. 위반 주입: 그 구문을 지우면 실패.

### Rationale

- 024 §9가 이미 `defineTask`를 `App.tsx` `useEffect` → 모듈 최상단으로
  되돌리며 `require`를 try/catch로 감쌌다. `AUTO_DIARY_TASK_REGISTERED`
  상수가 export 체인에 있어 R8·DCE가 보수적으로 유지할 것이라는 게 024의
  판단이고, §3 Rationale이 "minify OFF"를 더해 위험을 한 단계 더 낮춘다.
- 그래도 실측이 우선(원칙 V) — RH3를 실제로 돌려 보고 통과하면 코드 0줄,
  실패하면 옵션 A로 최소 수정.

### Alternatives considered

- **선제적으로 옵션 C를 넣고 시작** — 기각. 코드 변경 0줄이 기본(FR-007)이고,
  minify OFF에서 proguard 규칙은 아무 효과가 없어 "안 쓰는 방어"를 추가하는
  꼴이다. 로드맵 4번이 minify를 켤 때 그 스펙에서 넣는 게 맞다.

---

## §5 회귀 대상 목록

### Decision

- `run-device-tests.mjs`의 `FLOWS`에 등록된 흐름 중 020·021·023 관련:
  - `.maestro/scheduled-diary-notification.yml`(020)
  - `.maestro/unified-permission-onboarding.yml`(021) — ⚠️ `clearState`
  - `.maestro/photo-selection-over-limit.yml`(023)
- **코드 변경이 없으면(기본 경로)** 회귀는 형식적 — 024 §7이 이 셋을 이미
  돌렸고 027이 소스를 안 건드리므로 새 실패가 날 이유가 없다. quickstart §5는
  "코드 변경 시에만 필수"로 표기.
- **FR-007로 코드를 고치면** `npm run test:device`로 셋 다 반드시 재실행.

### Rationale

- 024 §7·§9·§22·§23이 반복 관측한 "개발자 탭 stale 버그"류는 흐름 파일이
  옛 UI를 가리켜 생긴 것 — 027은 UI를 안 건드리므로 그 계열 위험 없음.

### Alternatives considered

- **회귀를 아예 생략** — 기각. FR-007 조건부 수정이 `task.ts`에 닿으면 020
  자동 생성 흐름에 영향 가능. "코드 변경 시 필수"가 최소선.

### ⚠️ 실행 순서

`unified-permission-onboarding.yml`은 `Launch app ... with clear state`
(=`pm clear`)로 앱 데이터를 전부 날린다(024 §7 교훈 — 검증용 모델·일기·설정
삭제). §1~§4(소크·삼성 화면·release)를 먼저, 이 흐름을 §5에서 마지막에 —
또는 14번 세션이 이 흐름을 돌린 뒤 모델을 재배치하고 027 소크를 시작한다.

---

## §6 14번 세션과의 공유 실기기 준비

### Decision

- 이 스펙은 로드맵 14번(narrative 재검토) 실기기 세션과 **같은 세션에서
  실행되는 것을 전제**(spec Assumptions). 겹치는 준비:
  - 검증용 모델 배치 — `quiet`(`a1.bin`)는 027, `narrative`(`a2.bin`)·VLM
    (`v1.bin`·`v2.bin`)은 14번. `run-as` + `state.json` verdict 수동(021 D2).
  - 배터리 예외 토글(`deviceidle whitelist +/-`) — 둘 다 씀.
  - 합성 하루(`npm run seed:day`) — 027은 사진 없는 하루면 충분(`quiet`),
    14번은 사진 있는 하루도.
- **`findings.md`는 분리**(FR-009): 027의 실측은 `specs/027-*/findings.md`
  또는 024 `findings.md`에 직접(한쪽에만, FR-011). 14번 관측(narrative
  헤드리스·mojibake)은 14번 스펙 `findings.md`.
- quickstart는 "공통 실기기 준비" 절을 두고, 그 안에서 027이 필요한 것만
  명시(모델 `a1`, 사진 없는 하루). 14번 준비는 14번 quickstart가 담당.

### Rationale

- 사용자가 15번 입력에서 "14번 재검토 실기기 세션과 함께 돌리는 것을
  전제"라고 명시. 실기기 세션 자체가 비싸므로(빌드·연결·잠금 해제) 겹치는
  준비를 한 번만 하는 게 효율적이다.

### Alternatives considered

- **027을 완전 독립 세션으로** — 기각. 사용자 지시에 반하고, 실기기 세션
  준비 비용이 중복된다.
- **두 스펙 findings를 하나로 합침** — 기각. 024가 §10에서 mojibake를 "범위
  밖, 별도 스펙"으로 명시적으로 갈랐고, 스펙 경계를 흐리면 다음 세션이
  027의 결론과 14번의 결론을 구분 못 한다.

---

## 종합 — 이 스펙이 코드에 반영하는 것

- **기본**: 0줄. 실기기 4라운드 + `findings.md`·AGENTS.md 문서 갱신.
- **조건부(FR-007, RH3 실패 시만)**: `src/schedule/task.ts` 1~3줄(옵션 A) +
  `__tests__/schedule/background-generation.test.ts` B1a 확장(RH5).
- **스펙 정정 필요**: spec.md의 US4 Scenario 3·FR-007이 "R8 side-effect
  트리셰이킹"을 현재 위험처럼 서술하나, **minify가 현재 release 빌드에서
  꺼져 있으므로**(§3·§4) "minify가 켜지면(로드맵 4번) 재검토가 필요한 잠재
  위험이며, 이 스펙은 현재 release 빌드로 §9가 성립하는지를 확인한다"로
  범위를 좁혀야 한다. → data-model.md·quickstart 작성과 함께 spec.md를
  정정한다(이 research가 발견한 결함).
