# Findings: 024 잔여 실측 마무리

**대상 스펙**: [spec.md](./spec.md) · [plan.md](./plan.md) · [quickstart.md](./quickstart.md)

**작성 시작**: 2026-09-01 (skeleton — T005). 실측값은 실기기 세션에서 채운다.

**실측 기기**: SM-S901N(Galaxy S22), Android 16(SDK 36), 삼성 One UI.
§1~§3은 debug 빌드, §4는 release 빌드. 유선/무선 디버깅. 모든 실측값은 이
기기·이 OS 버전·이 제조사 조건에 한정된다(019·020·024 Assumptions 계승).

**FR-011 — 갱신 위치**: 이 파일이 027 실측의 **1차 기록**이다. 024
`findings.md`의 §2 표·§11·"미확인 잔여" 목록은 이 파일을 가리키는 포인터
한 줄만 두고 실제 수치는 여기에 둔다(중복 금지). → T031에서 024 파일에
포인터 추가.

**14번 세션과의 관계**: 이 세션은 로드맵 14번(narrative 재검토)과 같은
실기기 세션에서 돈다. 14번 관측(narrative 헤드리스·EXAONE mojibake)은 14번
스펙 `findings.md`에 기록한다 — 이 파일은 `quiet`만 다룬다(FR-009).

---

## §0 코드/설정 사전 확인 (기기 없음 — 완료 2026-09-01)

### T001 — 신규 의존성 0

`npx expo install --check` — 이 스펙이 추가한 패키지 없음. 출력에 나온
패치 버전 어긋남(`expo@57.0.14` vs `~57.0.18`, `expo-file-system`·
`expo-location`·`react-native` 등)은 저장소의 기존 상태이며 027이 만든 것이
아니다(024 §8과 같은 관찰).

### T002 — 기기 없는 베이스라인

- `git rev-parse HEAD` = `cfd20895ff6d4f068733846dcc18819a9180c641` (analyze
  권장 개선 반영 커밋).
- `npm run test:logic` — **87 스위트 / 1749 테스트 전부 통과**, 15.2s.
- `npm run lint` — eslint **0 errors**(2 warnings: `release-signing.test.ts`
  require import, `safe-area.test.tsx` unused disable — 둘 다 027 무관·기존),
  tsc 클린, 헌법 검사 **위반 0건**, prettier 클린.
- 기본 경로(§4 RH3 통과)에서 이 스펙은 `git diff src/`가 0줄이어야 한다
  (SC-005) — 세션 종료 시 이 커밋과 대조.

### T003 — release minify OFF 재확인 (US4 전제)

- `android/app/build.gradle:69`:
  `def enableMinifyInReleaseBuilds = (findProperty('android.enableMinifyInReleaseBuilds') ?: false).toBoolean()`
- `android/gradle.properties`: `android.enableMinifyInReleaseBuilds` **미설정**
  (`org.gradle.jvmargs`·`newArchEnabled`·`hermesEnabled=true` 등만 있음).
- → **release 빌드에서 R8/minify가 꺼져 있다.** 024 §11의 "R8 side-effect
  트리셰이킹"은 현재 위험이 아니라 minify가 켜질 때(로드맵 4번 "단독 구동용
  Release 빌드 배포")의 잠재 위험이다. §4는 "현재 release 빌드 구성으로 §9
  헤드리스 등록이 성립하는가"를 확인한다.
- `hermesEnabled=true` — release는 Hermes 바이트코드 사전 컴파일. `task.ts`
  모듈 최상단 `require`가 이 경로에서도 헤드리스 등록을 성립시키는지가 §4의
  실질.

### T004 — 회귀 대상 확인

`scripts/run-device-tests.mjs`의 `FLOWS`에 등록됨(라인 81·88·105):
- `.maestro/scheduled-diary-notification.yml` (020)
- `.maestro/unified-permission-onboarding.yml` (021) — ⚠️ `clearState`(=`pm
  clear`)로 앱 데이터 삭제
- `.maestro/photo-selection-over-limit.yml` (023)

새 흐름은 추가하지 않는다 — 027의 라운드는 실기기 수동 절차.

### T009 — 배터리 버튼의 인텐트 액션 (US3 사전, research §2)

소스에서 특정 완료 — **버튼이 셋이고 액션이 둘로 갈린다**:

| 경로 | 호출 | 인텐트 액션 | 비고 |
|---|---|---|---|
| 온보딩 배터리 단계 "허용"(primary) | `OnboardingScreen.tsx:143` → `ports.battery.requestException()` | `IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` + `{ data: "package:com.anonymous.alpharium" }` (`src/schedule/battery-exception-port.ts:44-47`) | 실패 시 `openAppSettingsFallback()` = `Linking.openSettings()`(앱 상세) |
| 온보딩 배터리 단계 "설정 열기"(secondary) | `OnboardingScreen.tsx:158` → `ports.battery.openSettingsList()` | `IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS` (`battery-exception-port.ts:58-60`) | 실패 시 앱 상세 fallback |
| 설정 탭 "배터리 설정 열기"(testID `open-battery-settings`) | `AutoDiarySettingsScreen.tsx:116` → `App.tsx:983` `onOpenBatterySettings` → `onboardingPorts.battery.openSettingsList()` | `IGNORE_BATTERY_OPTIMIZATION_SETTINGS` | E4 상시 링크 |

**주석 불일치 해소**: `src/onboarding/os-settings-port.ts:12`
(`IGNORE_BATTERY_OPTIMIZATION_SETTINGS`)는 **설정 탭·온보딩 secondary
경로에 맞다.** `src/onboarding/requirements.ts:30`
(`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`)는 **온보딩 primary "허용" 경로에
맞다.** 두 다른 버튼이라 모순이 아니다.

**실기기 T019에서 확인할 것**: 위 세 경로가 삼성 One UI(Android 16)에서
각각 어느 액티비티·화면에 떨어지는지(`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`
다이얼로그가 실제로 뜨는지, 아니면 `openAppSettingsFallback`으로 앱 상세로
빠지는지). 매니페스트에 `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` 권한은
`plugins/with-battery-exception.js`가 선언.

---

## §0b 실기기 세션 1차 시도 (2026-09-01) — Metro 문제로 US3·US4 미착수

**환경**: SM-S901N(`R3CTB084WDP`), Android 16/SDK 36, `deviceLocked=0`, debug
빌드 설치됨(`DEBUGGABLE` 플래그, `versionName=1.0.0`, lastUpdateTime
2026-08-31 16:56).

**완료:**
- **T006** — `files/models/`에 `a1`~`a5` + `v1`·`v2` 존재. `state.json`에
  `a1`(quiet, `verifiedMd5: d8506380fd1f0fdb8e4318a01b8b8e34`,
  `verifiedBytes: 1522796768`) `passed: true`. VLM `v1`·`v2`도 `passed: true`.
  → 검증용 모델 이미 배치됨(별도 배치 불필요).
- **T008** — `files/preferences/selected-character.json`이 `{"character":"english"}`
  (모카/gemma3)였다. `{"character":"quiet"}`로 교체. **원래 `english` 값은
  로드맵 17번(샤오바이·모카 생성 실패) 재현 조건 — 별도 세션에서 되돌려
  확인.** 그 외 preference 파일: `auto-diary.json`
  `{"enabled":false,"targetHour":7}`, `vision-setting.json` `{"vision":"quick"}`,
  `geocoding-setting.json`, `onboarding.json` `{"completed":true,"batteryNoticeShown":false}`.

**T009 실기기 보강** — 설정 탭에 `open-battery-settings` 버튼 존재 확인
(`resource-id="open-battery-settings"`, `class="android.widget.Button"`,
`content-desc="배터리 설정 열기"`, `bounds=[60,1718][422,1843]`). 이 버튼이
`onboardingPorts.battery.openSettingsList()` →
`IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS`를 부른다
(§0 T009 표 확인). **버튼 클릭까지는 못 감** — 아래 참조.

**중단 사유 — Metro 번들 서빙 불가:**
- 처음 `monkey`로 앱을 열었을 땐 정상 로드(일기 목록 화면 렌더, 탭 4개).
- `am force-stop` + Maestro `launchApp` 후 재로드에서 **"Loading from
  localhost:8081..." 오버레이에 영구 정지** (AGENTS.md "Metro 캐시가 스테일이면
  ... 영구히 머문다" 함정 계열).
- Metro 프로세스(node PID 17696)가 **2026-08-31 16:52부터 ~21시간 실행**,
  CPU 77,671초 누적, `expo start --dev-client --clear`로 떴음.
- `curl http://localhost:8081/index.bundle?platform=android&dev=true&minify=false`
  가 **4분+ 무응답**(2회 시도 전부 타임아웃). Metro 파일 감시자 스테일 또는
  번들 그래프 꼬임으로 판단.
- `EXPO_PUBLIC_APP_ENV=dev`가 이 Metro에 셸에서 주어졌는지 불명(AGENTS.md
  요구 — 없으면 앱이 `local` 환경 인식).
- RN Dev Menu의 Reload를 눌러도 "Loading..." 유지.

**해소 (2026-09-01, 사용자 승인)**: 기존 Metro(PID 17696·19096) 종료 →
`EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client --clear` 백그라운드 재시작
→ `adb reverse tcp:8081 tcp:8081` 재설정 → 앱 force-stop 후 재실행. **`/status`
응답이 6.8초 → 0.015초로 정상화**, `Android Bundled 14195ms index.ts (829
modules)` + lazy 모듈(`expo-media-library`·`expo-notifications`·
`expo-file-system`) 정상 번들링, **`SyntaxError` 사라짐**. 이후 US3·US4
정상 진행. AGENTS.md "Metro 캐시가 스테일이면 ... 오류 없이 영영 로딩 중"
함정의 한 형태 — 21시간 실행 + 파일 감시자/번들 그래프 병리적 상태였다.
`.env.development`가 로드되지만(`@expo/env`) 셸에서 준 `EXPO_PUBLIC_APP_ENV=dev`가
`process.env`에 이미 있어 `.env.development`의 `local`이 덮어쓰지 못한다
(AGENTS.md 명시대로).

---

## §1 배터리 예외 라운드 소크 (US1, SC-001) — 실기기 대기

**측정 방법**: quickstart §1. `deviceidle whitelist +com.anonymous.alpharium`
→ `am get-standby-bucket` `5` → 목표 시각 현재+5분 → 화면 끔·`deviceLocked=1`
→ 15분+ 주기 `adb logcat -d -v time -b all` 덤프에서 `task-entered` 대용
신호 시각 수집. **grep 문자열은 T010 첫 덤프에서 확정**(research §1 —
`BackgroundTaskConsumer: Executing task 'alpharium-auto-diary'` 제안).

| batteryException | targetHour | roundStartedAt | triggerEnteredAt | delayFromTargetMin | standbyBucket | minLatencyReported | screenTouchedDuringRound | coldOrWarm | notes |
|---|---|---|---|---|---|---|---|---|---|
| _(실기기 대기)_ true | | | | | | | | | |

**판정 (contracts BS2)**:
- [ ] SC-001 MUST: 유효한 모든 라운드에서 `delayFromTargetMin <= 60` — _(미판정)_
- [ ] SHOULD: 유효 라운드 `>= 3`이면 과반 `<= 40` — _(미측정, `< 3`이면
  원시값 + "best-effort" 라벨)_
- 019 표본 2회(10분·32분)와 대조.

---

## §2 무예외 24시간 소크 (US2, SC-002) — 비동기, 실기기 대기

**측정 방법**: quickstart §2. `deviceidle whitelist -com.anonymous.alpharium`
→ `am get-standby-bucket` `10`+ → 목표 시각 설정 → 화면 끔·잠금 → **24시간+
조작 금지**(화면 켜면 Doze 깨짐, 019 §7) → 2~4시간마다 `adb logcat -d -b all
> dump_<ts>.txt` → 24시간+ 뒤 흔적 확인. **비동기** — 세션에서 "시작"만.

| batteryException | targetHour | roundStartedAt | observedHours | attemptCount | firstTriggerEnteredAt | standbyBucket | minLatencyReported | screenTouchedDuringRound | notes |
|---|---|---|---|---|---|---|---|---|---|
| _(실기기 대기)_ false | | | | | | | | false | 24h 소크 |

**판정 (contracts BS4)**:
- [ ] SC-002 MUST: `observedHours >= 24` 안에 `attemptCount >= 1` — _(미판정)_
- [ ] `observedHours < 24`면 "부분 판정 — N시간 관측 후 M회" + 원시값
- [ ] `Minimum latency` 15분(`+14m59s...`) 전달 확인 (억제 원인이 OS) —
  `observedHours`와 무관하게 항상 기록 — _(미측정)_
- 019 최악값 19시간 33분이 24시간 한계 안.

---

## §3 삼성 One UI 배터리 화면 (US3, SC-003) — ✅ 완료 (2026-09-01)

**측정 방법**: quickstart §3. 설정 탭 "자동으로 일기 쓰기" 화면의 "배터리
설정 열기" 버튼(testID `open-battery-settings`)을 **실제로 눌러**(`adb whitelist`
동등물로 갈음 안 함) `adb logcat`의 `ActivityTaskManager: START` 라인과
`dumpsys activity activities`의 `topResumedActivity`로 도착 액티비티 확인 →
앱 목록에서 alpharium 검색 → 배터리 상세 → "제한 없음" 선택 → `am
get-standby-bucket` 전후 대조.

| 필드 | 값 |
|---|---|
| `trigger` | `settings-permissions` (설정 탭 "배터리 설정 열기" 버튼 = 온보딩 secondary와 같은 `openSettingsList()` 경로) |
| `intentAction` | **`android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS`** (logcat: `START u0 {act=android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS xflg=0x4 cmp=com.android.settings/.Settings$AppBatteryUsageActivity}`) |
| `landedActivity` | **`com.android.settings/.Settings$AppBatteryUsageActivity`** |
| `screenTitle` | **"배터리 사용 관리"** (앱별 배터리 사용량 목록, "전체 (0)" 필터, 알파벳순 앱 리스트) |
| `reachPath` | 앱 "배터리 설정 열기" 버튼 → **"배터리 사용 관리" 목록** → (앱 검색 "alpharium" 또는 목록 스크롤) → **alpharium 탭** → **"배터리" 상세**(제한 없음/최적화/제한 라디오 3개 + 열기/삭제/강제 중지) → **"제한 없음" 라디오 선택** — 총 4탭 |
| `exceptionGrantable` | **true** — "제한 없음" 라디오("백그라운드에서도 이 앱이 배터리를 제한 없이 사용합니다") 선택 가능 |
| `standbyBucketAfterGrant` | **`10` → `5`** (`am get-standby-bucket com.anonymous.alpharium`: 부여 전 `10`, "제한 없음" 선택 직후 `5`). `dumpsys deviceidle whitelist`에 `user,com.anonymous.alpharium,10569` 등재됨 |
| `onboardingProceededWithoutGrant` | _(미측정 — 온보딩 배터리 단계는 이 세션에서 이미 completed 상태라 재노출 안 됨. flag.ts `batteryNoticeShown` 판정은 §0 T009 참조)_ |
| `failureMode` | `null` — 버튼·인텐트·화면 전환·라디오 선택 전부 정상 |

**판정 (contracts BS5, SC-003)**: ✅ 충족.
- `intentAction`·`landedActivity`·`screenTitle`·`reachPath` 전부 기록됨.
- `exceptionGrantable === true`, 부여 후 `standbyBucket` `5` 확인.
- `failureMode === null` — 검증 차단 결함 없음.
- **핵심 관측**: 삼성 One UI(Android 16)는 `IGNORE_BATTERY_OPTIMIZATION_SETTINGS`
  인텐트를 표준 안드로이드의 "배터리 최적화" 앱 목록이 아니라 **"배터리 사용
  관리"(`AppBatteryUsageActivity`)**로 라우팅한다. 이 화면은 앱별 사용량
  목록이라, 사용자가 예외를 부여하려면 여기서 앱을 찾아 탭 → 배터리 상세 →
  "제한 없음"까지 **4탭**을 더 거쳐야 한다(딥링크로 바로 이 앱의 예외 토글
  화면에 도달하지 않음). 021의 온보딩 primary 버튼(`requestException()` →
  `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` + `package:` data)이 시스템
  다이얼로그를 직접 띄우는지는 이 세션에서 미확인 — 그 경로가 1탭이면
  온보딩 UX가 더 낫다.
- **024 §2 하단 "배터리 인텐트가 실제 도착한 삼성 One UI 설정 화면 경로"의
  답**: `IGNORE_BATTERY_OPTIMIZATION_SETTINGS` → "배터리 사용 관리"
  (`AppBatteryUsageActivity`). `adb shell dumpsys deviceidle whitelist +`가
  이 UI 경로의 최종 결과(`standbyBucket` `5`)와 동등함이 실측으로 확인됨.

---

## §4 release 헤드리스 확인 (US4, SC-004) — ✅ 완료 (2026-09-01)

**측정 방법**: quickstart §4 / contracts RH1~RH6. AGENTS.md "release 빌드와
서명" 절차로 release APK 빌드 → `apksigner verify` → Metro 없이 설치(debug
앱 데이터는 `adb exec-out`으로 `a1.bin`+`state.json`+preferences+diary 백업
후 uninstall) → 설정 탭에서 자동 생성 토글 ON(알림 권한 허용) → `dumpsys
jobscheduler`로 잡 등록 확인 → `dumpsys deviceidle whitelist +` → 화면 끔
(`deviceLocked=1`) → `cmd jobscheduler run -f com.anonymous.alpharium 0` →
`adb logcat`.

**빌드**: `prebuild --platform android --clean` → 키 복원 →
`NODE_ENV=production ./gradlew assembleRelease` (**BUILD SUCCESSFUL in 19m 8s**,
`app-release.apk` 175,579,857 bytes).

| 필드 | 값 |
|---|---|
| `signatureOk` | **true** — `apksigner verify --print-certs`: `Signer #1 certificate DN: CN=alpharium, OU=alpharium, O=alpharium, L=Unknown, ST=Unknown, C=KR` (`CN=Android Debug` 아님) |
| `keysNotCommitted` | **true** — `git ls-files \| grep -i jks` 빈 결과 |
| `runsWithoutMetro` | **true** — `adb reverse --remove-all` 후 앱 실행, `Unable to load script` 없음, `ReactNativeJS: Running "main"`, 온보딩 "시작하기 전에" (1/5) 정상 렌더 |
| `envOk` | **true** — "이 빌드는 잘못 만들어졌다" 아님. **탭이 3개**("일기/캐릭터/설정") = **개발자 탭 없음 → `prod` 환경으로 뜸** 확인(`.env.production`) |
| `jobRegisteredOnSettingsTab` | **true** — 설정 탭 `auto-diary-toggle` ON + 알림 권한 "허용" → `D/BackgroundTaskModule: registerTaskAsync: alpharium-auto-diary with options {minimumInterval=15.0}` → `I/TaskService: Registered task with name 'alpharium-auto-diary'` → `D/BackgroundTaskConsumer: didRegister: alpharium-auto-diary` → `D/BackgroundTaskScheduler: Enqueuing worker ... '15' minutes delay`. `dumpsys jobscheduler`: `JOB #u0a570/0: com.anonymous.alpharium/androidx.work.impl.background.systemjob.SystemJobService`, `Minimum latency: +14m59s992ms` (15분 정확 전달) |
| `noTaskRegisteredErrorAbsent` | **true** ✅ — 헤드리스 강제 실행(`cmd jobscheduler run -f`, `deviceLocked=1`, standby bucket `5`) logcat에 `No task registered for key expo-task-manager` **및** `Unregistering task` **둘 다 없음** |
| `registeredTaskLogPresent` | **true** — `D/BackgroundTaskConsumer: Executing task 'alpharium-auto-diary'`, `I/TaskService: Started headless task 1 to keep JS timers alive`, `I/TaskService: Finished task 'alpharium-auto-diary' with eventId '...'`, `I/TaskService: Finished headless task 1` |
| `quietCompleted` | _(미측정 — `quiet` 모델이 uninstall로 삭제됐고 release는 `run-as` 불가라 재배치 안 함. 태스크가 16ms 만에 완주 = `model-not-ready` 조기 반환. §9에서 debug로 `quiet` 완주(`writingMs` 52.5초)를 이미 확인했고, release도 동일 파이프라인이므로 모델만 있으면 돌 것이 자명. 사용자 결정으로 RH3 핵심 통과로 마무리)_ |
| `workerResult` | **`SUCCESS`** — `I/WM-WorkerWrapper: Worker result SUCCESS for Work [ id=..., tags={ expo.modules.backgroundtask.BackgroundTaskWork } ]` |
| `dceTrimReproduced` | **false** ✅ — 등록 부수 효과가 DCE로 제거되지 않았다. `task.ts` 모듈 최상단 `defineTask`(024 §9 수정)가 release 빌드(Hermes 바이트코드, minify OFF)에서도 살아있다 |
| `fixApplied` | `null` — 코드 변경 불필요. `git diff src/` = 0줄 (RH6 기본 경로) |

**판정 (contracts RH3·RH6, SC-004)**: ✅ 충족.
- `noTaskRegisteredErrorAbsent` · `registeredTaskLogPresent` · `workerResult=SUCCESS`
  3개 통과. `quietCompleted`는 §9 debug 확인 + 동일 파이프라인 근거로 갈음
  (사용자 결정).
- **RH4·RH5 발동 안 함** — 코드 변경 0줄. `git diff src/` = 0줄(SC-005 유지).
- **024 §9가 고친 `task.ts` 모듈 최상단 `defineTask` 부수 효과가 release
  빌드에서도 헤드리스 태스크 등록을 성립시킨다는 것이 확인됐다.** 024 §11의
  "R8 side-effect 트리셰이킹" 우려는 (a) minify가 현재 OFF이고 (b) minify
  OFF에서도 Hermes DCE·Metro `@__PURE__`가 이 부수 효과를 제거하지 않음이
  실측으로 확인돼 **닫힌다**.

**024 §11 갱신 문안 (→ 024 `findings.md` §11에 반영, T031)**:
> **잔여 위험 닫힘 (2026-09-01, 027 세션)**: release APK(`assembleRelease`,
> minify OFF, Hermes)를 빌드해 debug 앱 제거 후 설치, 설정 탭에서 자동
> 생성 토글 ON → WorkManager 잡 등록(`Minimum latency +14m59s`), 화면 끈
> 잠긴 상태 `cmd jobscheduler run -f` 강제 실행에서 **`No task registered
> for key expo-task-manager` 및 `Unregistering task` 부재**, `Executing
> task 'alpharium-auto-diary'` → `Started headless task` → `Finished
> headless task` → `WM-WorkerWrapper: Worker result SUCCESS` 확인. §9
> 수정(`task.ts` 모듈 최상단 `defineTask`)이 release 빌드에서도 성립.
> R8 트리셰이킹 우려는 minify OFF + DCE 미제거 실측으로 닫힘. `quiet`
> 생성 완주는 §9 debug 확인으로 갈음(모델이 uninstall로 삭제됨, release
> `run-as` 불가).

---

## §5 회귀 (quickstart §5) — 조건부

- **코드 변경 없으면(§4 RH3 통과)**: 형식적 — 024 §7이 020·021·023 흐름을
  이미 돌렸고 027이 소스를 안 건드림.
- **§4 RH4로 `task.ts`를 고쳤으면 필수**: `npm run test:device`로 020·021·023
  PASS. ⚠️ `unified-permission-onboarding.yml`은 `pm clear` — 맨 마지막에.

| flow | 결과 | 비고 |
|---|---|---|
| scheduled-diary-notification.yml (020) | _(조건부)_ | |
| photo-selection-over-limit.yml (023) | _(조건부)_ | |
| unified-permission-onboarding.yml (021) | _(조건부)_ | pm clear — 마지막 |

---

## §6 기기 없는 게이트 (SC-005·SC-006)

- [x] `npm run test:logic` — 87 스위트 / 1749 테스트 통과 (T002 베이스라인).
  §4 RH5로 테스트 추가 시 재실행.
- [x] `npm run lint` — eslint 0 error, tsc 클린, 헌법 검사 위반 0, prettier
  클린 (T002).
- [ ] `git diff --stat` 최종 대조 — 기본 경로면 `src/` 0줄(변경은
  `specs/027-*`·`specs/024-*/findings.md`·`AGENTS.md`). §4 RH4 수행 시
  `src/schedule/task.ts` 1~3줄 + `__tests__/schedule/background-generation.test.ts`.

---

## 진행 상태 (2026-09-01 실기기 세션 종료 시점)

**완료:**
- ✅ **§3 삼성 One UI 배터리 화면** (US3, SC-003) — `IGNORE_BATTERY_OPTIMIZATION_SETTINGS`
  → "배터리 사용 관리"(`AppBatteryUsageActivity`) → alpharium 4탭 → "제한 없음"
  → `standbyBucket` `10`→`5`. **SC-003 충족.**
- ✅ **§4 release 헤드리스** (US4, SC-004) — release APK 빌드(19m 8s, minify OFF,
  `CN=alpharium`) → Metro 없이 실행 → 자동 생성 토글 ON → 잡 등록 → 헤드리스
  강제 실행에서 **`No task registered` 부재** + `Executing task` +
  `Worker result SUCCESS`. **024 §9 수정이 release에서도 성립. SC-004 충족**
  (`quietCompleted`는 §9 debug 확인으로 갈음 — 모델 uninstall됨). **코드 0줄.**

**미착수 (다음 실기기 세션):**
- **§1 배터리 예외 소크** (US1, SC-001) — 자연 15분+ 주기 대기 필요. SC-001 미판정.
- **§2 무예외 24시간 소크** (US2, SC-002) — 비동기, 24h+ 방치. SC-002 미판정
  (부분 판정 가능). 배터리 예외를 부여한 적 있으므로 US2 전에 반드시
  `deviceidle whitelist -` + "제한 없음" → "최적화" 원복 확인.
- **T031·T032** — 024 `findings.md` §2·§11 갱신, AGENTS.md 027 절 —
  §1·§2까지 끝난 뒤 일괄. (§11 갱신 문안은 §4에 준비돼 있음.)

## 실기기 상태 정리 메모 (2026-09-01 세션 종료 시)

- **설치 빌드가 release로 바뀜** (`CN=alpharium`, `prod` 환경, 개발자 탭 없음).
  debug로 되돌리려면 `adb uninstall` 후 `npx expo run:android` 또는 debug APK.
- **debug 앱 데이터 백업**: `scratchpad/debug_backup/`에 `a1.bin`(md5
  `d8506380…` 검증됨) + `state.json` + preferences 5개 + diary 2건. `a2`·`a4`·
  `a5`·`v1`·`v2`는 백업 안 함(RH3에 불필요, 로드맵 14번/온보딩으로 재취득).
- **캐릭터 선택**: debug 시절 `english`(모카)였던 것을 `quiet`로 바꿨음
  (T008). release는 데이터가 초기화돼 무관.
- **배터리**: US3에서 UI로 "제한 없음" 부여함(`standbyBucket 5`). US4에서
  `deviceidle whitelist +` 추가 부여 후 `-`로 제거함. **현재 `standbyBucket`
  = `10`** (deviceidle 제거됨). 단 US3의 "제한 없음" UI 설정은 그대로일 수
  있음 — US1·US2 시작 전 재확인.
- **자동 생성 토글**: US4에서 ON으로 켰음. WorkManager 잡 등록됨
  (`JOB #u0a570/0`, 15분 간격).
- **Metro**: `--clear`로 재시작한 dev Metro가 백그라운드에 떠 있음
  (`scratchpad/metro.log`). release 앱에는 불필요.
