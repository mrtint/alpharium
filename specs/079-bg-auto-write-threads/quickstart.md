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

구현 구간의 실기기 확인이 끝나면 날짜·기기·시각표를 여기에 적는다(078 `quickstart.md`와 같은 꼴).
