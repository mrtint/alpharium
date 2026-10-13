# Quickstart: 백그라운드 자동 쓰기 완주 (079) — 확인 절차

계약은 [contracts/assembly.md](./contracts/assembly.md), 값의 표는 [data-model.md](./data-model.md), 수정 전 실측은 설계 문서
(`docs/superpowers/specs/2026-10-13-bg-auto-write-completion-design.md`)에 있다.

## 1. 기기 없이

```bash
npx jest __tests__/inference/assembly.test.ts --selectProjects logic
npx jest __tests__/inference/llama-port.test.ts --selectProjects logic
npm run test:logic     # 개발 중
npm test               # 커밋 전
npm run lint           # eslint + tsc + 헌법 검사 + prettier
```

기대: 전부 통과. 위반 주입 셋(contracts 검증 절)은 각각 실패로 뒤집힌다 — 주입 뒤 원래 문자열이 돌아왔는지 다시 grep한다.

## 2. 안드로이드 실기기 (SM-S901N, dev) — SC-001·SC-002·SC-003

**준비** (AGENTS 「078」의 맥 절차). 기기의 debug 앱은 지우지 않는다. `npm run test:layer1`은 돌리지 않는다.

```bash
export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"; P=com.a810labs.pocketlog
adb exec-out run-as $P tar cf - files/diary files/preferences files/locks > <백업>.tar     # 일기·설정 백업
npm run seed:day -- one-place <어제>                                                      # 진짜 사진 4장 (scripts/samples/with-gps를 sips로 확인)
adb reverse tcp:8081 tcp:8081
EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client                                       # .env.development.local에 dev 한 줄
```

`preferences/auto-diary.json`에 `{"enabled":true,"targetHour":22}`를 쓴다(로컬 파일을 `adb push` 한 뒤 `run-as … cat >`).

**2-1. 앱을 열 때 쓰기 (SC-002·SC-003)** — 어제 일기가 없는 채 앱을 다시 띄운다(`am force-stop` → `am start`).

- 기대: 홈이 어제를 고른 「쓰는 중」으로 시작해 수정 전 값(전체 약 50초 — 사진 읽기 13.3초 + 본문 23.8초, 표본 1)과 같은 수준으로 저장. 90초를 넘으면 회귀로 보고 원인을 본다(SC-003).
- `adb logcat | grep "Attached ggml threadpool"`에 `n_threads=4`가 두 번(사진·본문) 찍힌다.

**2-2. 백그라운드, 화면 꺼짐 (SC-001·SC-002)** — 2-1에서 쓴 어제 일기를 자리에 둔 채 앱을 다시 띄우고(앱을 열 때 전경에서 쓰지 않게 — 그 파일은 맥으로 꺼내 두었다가 자리표시자로 쓴다), 홈 버튼 → 어제 일기를 지운다.

```bash
adb shell dumpsys deviceidle whitelist +$P          # 배터리 예외
adb shell svc power stayon false; adb shell dumpsys battery unplug; adb shell input keyevent KEYCODE_SLEEP
adb shell dumpsys deviceidle force-idle deep
adb shell cmd jobscheduler run -f $P <잡 번호>        # dumpsys jobscheduler의 "JOB #u0a…/<번호>"
```

- 기대: 10분 안에 `files/diary/<어제>.json`, `preferences/auto-write-attempts.json`에 `{"path":"background","outcome":"ran"}`(화면 문구 `백그라운드 · 썼음`), 알림 「{이름}{이|가} {M}월 {d}일 일기를 다 썼어요」.
- 로그에 `n_threads=2`가 두 번 찍힌다.
- 수정 전 값: 같은 조건(스레드 3 실험)에서 3분 1초, 기본 4스레드는 화면 켜짐에서 26분 7초.
- ★ 화면을 끄면 기기가 잠긴다 — 다음 전경 확인 전에 사람이 PIN을 넣어야 한다.

**되돌리기**

```bash
adb shell dumpsys battery reset; adb shell dumpsys deviceidle unforce; adb shell dumpsys deviceidle whitelist -$P
adb shell am force-stop $P                          # 예약된 잡을 걷는다
# files/diary·preferences·locks를 비우고 백업 tar를 푼다 → md5 대조
npm run seed:clear
```

## 3. iOS 시뮬레이터 (iPhone 17, Debug) — SC-004

Debug 빌드가 깔려 있다(2026-10-13). 모델은 컨테이너의 `Documents/models`에 있다. 일기·설정을 복사해 백업한다. 어제 날짜로 EXIF를 고친 사진을
`xcrun simctl addmedia`로 넣고, `preferences/auto-diary.json`을 켜고, 오늘 일기를 자리표시자로 둔다(수동 실행은 늘 창 안이라 사진 없는 오늘을 먼저 고른다).

조작은 Maestro로 한다(`JAVA_HOME=/opt/homebrew/opt/openjdk@17`, `maestro --device <UDID> test <흐름>`). 흐름은 저장소에 두지 않는 일회용이다 — 모두 `launchApp: { stopApp: false }`로 시작하고
(AGENTS 068), 다음 순서의 `tapOn`·`scrollUntilVisible`만 쓴다: `home-settings` → `settings-developer` → (손가락을 아래로 두 번 쓸어 맨 위로) `developer-diagnostics` → `diagnostics-run-auto`.
★ `developer-diagnostics`는 화면 밖에 있어도 XCUITest가 「보인다」고 답해 엉뚱한 자리를 누른다 — 누르기 전에 `swipe`로 직접 올린다(2026-10-13).

진단 「자동 쓰기 지금 실행」을 누르고 약 20초 뒤(사진 읽기가 끝나고 본문 생성 중) 홈으로 내린다(`pressKey: Home`) — 0.4초 안에 `Suspended`가 된다(`xcrun simctl spawn <UDID> log show`의
`Setting process task state to: Suspended`). 다시 앞으로 올릴 때도 `launchApp: { stopApp: false }`다.

| 시나리오 | 멈춘 시간 | 기대 | 수정 전 |
| --- | --- | --- | --- |
| 3-1 | 180초 넘기고 600초 안(약 210초) | 생성이 이어져 일기 저장, 시도 기록 `지금 실행 · 썼음`, 앱 살아 있음 | 5초 만에 SIGSEGV |
| 3-2 | 600초 넘김(약 630초) | 앱 살아 있음(`~/Library/Logs/DiagnosticReports/Pocketlog-*.ips` 새 파일 0), 잠금 풀림, 시도 기록 `실패` 또는 `썼음` | (재지 않음) |

끝나면 일기·설정을 백업으로 되돌린다.

## 4. 보지 않는 것 (미확인으로 남긴다)

OS가 스스로 깨운 잡 · 죽은 프로세스의 콜드 스타트 · 배터리 예외 없는 상태(삼성 얼림) · 다른 안드로이드 기기 · 실제 iPhone · release 빌드 ·
**안드로이드 실기기에서 「생성이 도는 중의 정리」(assembly.md U2)** — 백그라운드 본문이 600초를 넘겨야 밟히는 경로라 일부러 만들 수단이 없다. 기기 없는 테스트와 iOS 시뮬레이터(§3-2)로만 본다.

## 실측 (구현 뒤)

- 변경 전 기준(2026-10-13, `npm run test:logic`): 207 스위트, 4,070 통과·7 건너뜀.
- 구현 뒤(같은 날): `npm test` 285 스위트·5,065 통과·7 건너뜀, `npm run lint` 오류 0(경고 둘은 이 기능 이전부터 있던 `release-signing.test.ts`·`safe-area.test.tsx`), 헌법 검사 위반 0건.
- 위반 주입 일곱이 각각 테스트에 잡혔다: 화면 조립에 스레드 2 · 화면 조립에 600초 · 백그라운드 조립에 180초 · 생성 종료 기다림 제거(여섯 테스트) · `n_threads`를 조건 없이 싣기(`Object.keys` 단언만 잡았다 — `toEqual`은 `undefined` 값의 키를 못 본다) · 수동 실행이면 화면 주체 · 호출부에 주체를 글자로 박기.

### 안드로이드 — 2026-10-13, SM-S901N (Android 16), dev

**준비**: 기기의 debug APK(10월 7일 설치)를 그대로 두고 맥의 Metro로 이 브랜치 번들을 올렸다(`adb reverse tcp:8081`; 번들에 `inferenceThreadsFor`·`inFlight`·`dev` 환경 확인). 일기·설정을 `run-as … tar`로 백업했고 끝에 되돌렸다(md5 동일). 어제(10월 12일)에 진짜 사진 4장(`seed:day one-place`, 4032×3024). `preferences/auto-diary.json`은 `{"enabled":true,"targetHour":22}`(실제 시각 14시대 = 시도 창 밖).

| 시각 | 한 일 | 본 것 |
| --- | --- | --- |
| 14:38:31 | 어제 일기 없이 앱 실행(§2-1) | 14:38:37 `앱 열기 · 홈에 넘김`, 로그 `Attached ggml threadpool (n_threads=4, n_threads_batch=4)` 두 번(14:38:39 사진, 14:38:59 본문) |
| 14:39:46 | 저장 | 사진 읽기 17.5초 + 본문 37.9초(349자 — 글자당 0.109초, 수정 전 0.110초). 앱 실행부터 약 75초. 수정 전 「전체 약 50초」보다 긴 것은 글이 길어서다(349자 대 217자) — 90초 기준 안(SC-003) |
| 14:40 | 그 일기를 자리에 두고 앱 재실행 → 홈 버튼 → 어제 일기 삭제 → 배터리 예외, 화면 끔, `dumpsys battery unplug`, `deviceidle force-idle deep` | `mWakefulness=Dozing`, deep `IDLE`, cpuset `/background`, 대기 버킷 5 |
| 14:40:41 | `cmd jobscheduler run -f … 19`(§2-2) | 로그 `executeRunCommand … f=true` → `doWork: Running worker`(14:40:41.756) |
| 14:40:46 · 14:41:29 | (헤드리스) 모델 적재 | 로그 `Attached ggml threadpool (n_threads=2, n_threads_batch=2)` 두 번 |
| 14:44:44 | `Worker result SUCCESS` | 사진 읽기 35.6초 + 본문 174.2초(358자). 잡 시작부터 4분 7초(SC-001 — 10분 안). 시도 기록 `백그라운드 · 썼음`. 알림 「금동이가 10월 12일 일기를 다 썼어요」(14:44:43). 끝까지 `Dozing`·deep `IDLE`·`/background` |

- **본문 174.2초는 화면 조립의 한도(180초)에 6초 못 미친다** — 백그라운드 조립의 한도를 600초로 둔 것이 필요한 값이었다. 이 실행에서는 헤드리스라 타이머가 억제돼 어느 한도도 걸리지 않았다.
- 수정 전 같은 기기·같은 절차: 기본 4스레드 화면 켜짐 26분 7초, 스레드 3 실험 화면 꺼짐 3분 1초(설계 문서 표).

### iOS 시뮬레이터 — 2026-10-13, iPhone 17 (iOS 26.5), Debug

**준비**: 같은 Metro. 일기·설정을 복사해 백업했고 끝에 되돌렸다(`diff -r` 동일). 어제·오늘 일기를 자리표시자로 두고 앱을 띄워 진단 화면까지 간 뒤 어제 일기를 지우고 「자동 쓰기 지금 실행」(수동 실행 — 백그라운드 조립, 한도 600초).

| 시나리오 | 한 일 | 본 것 | 수정 전 |
| --- | --- | --- | --- |
| 3-1 | 14:37:45 실행 → 14:38:18 홈(본문 생성 중) → **232초** 뒤 14:42:10 복귀 | 멈춘 동안 CPU 0%·잠금 유지. 복귀 24초 안에 저장, 시도 기록 `지금 실행 · 썼음`, 일기의 `writingMs` 270,289(멈춘 시간 포함 — 180초를 넘겼다). 앱 살아 있음, 새 `.ips` 0 | 210초 멈춤 뒤 복귀 5초 만에 SIGSEGV |
| 3-2 | 14:42:56 실행 → 14:43:26 홈 → **652초** 뒤 14:54:18 복귀 | 복귀 4초 안에 잠금 풀림, 시도 기록 `지금 실행 · 실패`(쓰기 실패 기록 `unwritten`), 일기 없음. 앱 살아 있음, 새 `.ips` 0 | (재지 않음) |

- 3-2는 「한도가 찬 생성에 멈춤을 보내고, 끝난 뒤에 놓는다」(assembly.md U2)가 실제 네이티브에서 밟힌 유일한 실행이다(표본 1).
- 3-2에서 복귀 직후 `앱 열기 · 홈에 넘김`이 한 줄 더 남았지만 홈은 쓰지 않았다(진단 겹이 덮고 있었다 — 078 「홈에 넘김 ≠ 시작」).

### 코드 리뷰 반영 뒤 다시 확인 — 같은 날 17시대

리뷰 반영으로 엔진이 바뀌었다(「도는 생성」 집합, 정리를 기다리는 `load()`, 잠금 낡음 시간 10분 — tasks T027~T031). 같은 절차를 최종 코드로 한 번씩 더 돌렸다(번들에 `inFlight = new Set`·`releasing`·`STALE_LOCK_MS = 10 * 60 * 1000` 확인). `npm test` 285 스위트·5,072 통과, lint 오류 0, 헌법 검사 위반 0건.

| 무엇 | 본 것 |
| --- | --- |
| 안드로이드 §2-1 (17:08) | 사진 읽기 24.1초 + 본문 37.4초(394자 — 글자당 0.095초). 로그 `n_threads=4` 두 번 |
| 안드로이드 §2-2 (17:11:23~17:15:22) | 화면 꺼짐(`Dozing`, deep `IDLE`)·배터리 예외·강제 잡 → **3분 58초**: 사진 읽기 44.4초 + 본문 160.2초(383자). `백그라운드 · 썼음`, 알림 「금동이가 10월 12일 일기를 다 썼어요」(17:15:21), 로그 `n_threads=2` 두 번, `Worker result SUCCESS` |
| iOS §3-1 | 242초 멈췄다 복귀 → 28초 안에 저장, `지금 실행 · 썼음`(`writingMs` 280,982), 앱 살아 있음, 새 `.ips` 0 |
| iOS §3-2 | 660초 멈췄다 복귀 → 4초 안에 잠금 풀림, `지금 실행 · 실패`(`unwritten`), 일기 없음, 앱 살아 있음, 새 `.ips` 0 |

- 기기·시뮬레이터 모두 일기·설정을 백업과 같게 되돌렸다(md5·`diff -r`).
- **곁에서 본 것**(이 기능 밖, 1회): 앱을 막 띄운 순간 백그라운드 워커가 함께 돌아 `백그라운드 · 캐릭터 없음`으로 끝나며 그날의 따라잡기 몫(`auto-write-catch-up.json`)을 썼다. 시험 기기의 되돌린 상태에 `selected-character.json`이
  없어서다(판정이 `write`로 난 뒤에 작성자를 읽는다 — 078의 「쓰거나 건너뛴 판정만 몫을 쓴다」 그대로). 강제 잡 직전에 그 기록을 다시 지우고 쟀다.

### 미확인 (§4 그대로)

OS가 스스로 깨운 잡 · 죽은 프로세스의 콜드 스타트 · 배터리 예외 없는 상태(수정 전 실험 D3·D4b에서 삼성이 얼리는 것만 봤다) · 다른 안드로이드 기기 · 실제 iPhone · release 빌드 · 안드로이드 실기기에서 「생성이 도는 중의 정리」 경로. 조건당 표본은 모두 1회다.
