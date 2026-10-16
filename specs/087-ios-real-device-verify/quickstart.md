# 087 — iOS 실기기 검증 (빌드 12)

**기기**: 「Hansan의 iPhone」 iPhone14,7(iPhone 14, 메모리 5.58GB), iOS 27.0.1 (24A446), devicectl 식별자 `4EE24F59-A58C-5C8D-A002-141CEE07AE19`.
**앱**: TestFlight Pocketlog 1.0.0 (12) — 배포 빌드. 개발 빌드·Metro·진단 화면은 쓸 수 없다(개발용 인증서·프로파일 없음).
**원칙 IV**: 재는 코드를 넣지 않는다. 시간은 이미 저장되는 값(일기의 `timing`, 기록 파일의 시각)과 사람의 관찰을 이 문서로 옮긴다.

## 0. 이어서 하기 (2026-10-16 18:55 기준 — 다른 맥에서 이어받는 사람용)

**지금 상태**
- iPhone에는 TestFlight 빌드가 아니라 **개발 환경 Release 빌드**(빌드 12와 같은 커밋, 환경 `dev`, 개발 인증서 서명)가 깔려 있다. 설정 → 「개발자」·「진단」이 처음부터 보인다.
- **일기 폴더를 비워 둔 실험이 걸려 있다**: 10-16 일기를 기기에서 뺐고(사진 2장 있는 안 쓴 날), 자동 쓰기 켬·목표 17시. 18:44 앱을 뒤로 보낸 뒤 소유자가 기기를 가져갔다(앱 끄지 않음, 집 Wi-Fi·충전). OS가 깨우면 백그라운드가 10-16을 쓴다 — 20시 전이면 창 안, 그 뒤면 창 밖 따라잡기(078).
- 10-16 일기 원본과 컨테이너 전체 백업(모델 포함 1.9GB)은 **회사 맥** `~/.pocketlog-signing/ios/device-backup/2026-10-16-testflight12/`에만 있다.

**다음에 할 일 (순서)**
1. 기기를 맥에 꽂고 **먼저 읽는다** — 앱을 열기 전에. `auto-write-attempts.json`의 `백그라운드` 줄, `diary/2026-10-16.json`이 생겼는지(`createdAt`·`timing.visionMs`·`writingMs`), `write-failures.json`, `systemCrashLogs`의 `Pocketlog-*.ips`·`JetsamEvent-*`(Pocketlog 포함 여부). 결과를 아래 「실측」에 적는다.
   - 백그라운드가 썼다 → 로드맵 할 일 1의 첫 iOS 완주 기록. 시각·시간·메모리를 적는다.
   - 줄이 없다 → OS가 안 깨운 것(앱을 밀어서 껐는지, Wi-Fi·충전·저전력을 소유자에게 묻는다).
   - `시작한 뒤 끝나지 않음`·밤 시각 `실패` → 078 읽는 법대로 「최근 실패」 같은 시각 줄과 짝지어 읽는다.
2. 10-17 17시 「쓸 차례」 알림을 소유자가 봤는지 묻는다(B13).
3. lldb 강제 깨우기를 다시 본다(1절 표, 실패 기록 참고) — 되면 하루를 기다리지 않고 백그라운드 완주를 잰다.
4. 2절 A 항목 화면 점검(사람 손 필요 — Maestro가 이 iPhone을 못 잡는다).

**다른 맥(집 맥북)에서 이어받을 때 필요한 것**
- **읽기만**(1단계): Xcode(26.x)만 있으면 된다. iPhone을 그 맥에 꽂고 「이 컴퓨터를 신뢰」를 누르면 페어링되고, 개발자 모드는 이미 켜져 있다. `xcrun devicectl list devices`에 `available (paired)`로 나와야 한다. 기기 식별자는 그대로다.
- **개발 빌드를 다시 만들거나 깔려면**: 개발 인증서의 **개인 키**가 필요하다 — 회사 맥 `~/.pocketlog-signing/ios/dev/development.key` + `recv2/development.cer`(지문 `FE9ACD…`) + `recv2/Pocketlog_Development.mobileprovision`(UUID `e8812a21-…`). 저장소에 없다(비밀). 옮기려면 `openssl pkcs12 -export -inkey development.key -in <(openssl x509 -inform der -in recv2/development.cer) -out development.p12` 로 묶어 직접 옮기고, 받는 맥에서 키체인에 넣고 Apple WWDR G3 중간 인증서(https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer)도 넣는다. 프로파일은 `~/Library/Developer/Xcode/UserData/Provisioning Profiles/<UUID>.mobileprovision`.
- 빌드 명령(개발 환경 Release — Metro 불필요): `npx expo prebuild --platform ios --clean`(`~/.netrc`가 644면 `NETRC=<빈 디렉터리>`) → `printf 'EXPO_PUBLIC_APP_ENV=dev\n' > .env.production.local` → `xcodebuild -workspace ios/Pocketlog.xcworkspace -scheme Pocketlog -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath build/devenv-release CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM=PGNGG84B39 PROVISIONING_PROFILE_SPECIFIER=e8812a21-c2ed-46fb-bb01-030d70968758 CODE_SIGN_IDENTITY=<개발 인증서 SHA1> build` → **`.env.production.local` 삭제** → `xcrun devicectl device install app --device <id> build/devenv-release/Build/Products/Release-iphoneos/Pocketlog.app`. 같은 팀·번들 ID라 덮어 설치되며 데이터가 남는다(17:34 확인).

**컨테이너 파일을 다루는 도우미**(이 세션에서 쓴 것 — 저장소 밖 임시 스크립트였다):

```bash
#!/bin/bash
# dc.sh from|to <src> <dst> [extra...]  — 포켓로그 앱 컨테이너 복사
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
d=$1; shift; s=$1; shift; t=$1; shift
xcrun devicectl device copy $d --device 4EE24F59-A58C-5C8D-A002-141CEE07AE19 \
  --domain-type appDataContainer --domain-identifier com.a810labs.pocketlog \
  --source "$s" --destination "$t" "$@"
```

예: `dc.sh from Documents/preferences ./prefs` · `dc.sh from Documents/diary ./diary`. **`--remove-existing-content`는 절대 쓰지 않는다**(컨테이너 전체를 지운다 — 실측의 사고). `to`로 덮어쓸 때는 원본을 `touch`하고 되읽어 확인한다. zsh에서 옵션을 변수 하나에 담아 넘기면 쪼개지지 않으니 스크립트로 쓴다.

## 1. 맥에서 보는 통로 — 2026-10-16 실제로 돌려 본 것

모든 명령 앞에 `export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`, `D=4EE24F59-A58C-5C8D-A002-141CEE07AE19`. 허브를 거치지 않고 맥 본체 포트에 꽂는다.

| 통로 | 명령 | 결과 |
| --- | --- | --- |
| 기기·잠금 | `xcrun devicectl list devices` / `device info lockState --device $D` | 됨 |
| 앱 실행 중인가 | `xcrun devicectl device info processes --device $D \| grep Pocketlog` | 됨 (pid·경로) |
| **앱 데이터 컨테이너 읽기** | `xcrun devicectl device info files --device $D --domain-type appDataContainer --domain-identifier com.a810labs.pocketlog` → `device copy from … --source Documents/preferences --destination <dir>` | **됨 — TestFlight 배포 빌드인데도**. `Documents/`(일기·`preferences/*.json`·`models/state.json`)를 그대로 꺼낸다. 안드로이드의 `run-as`에 해당한다 |
| 크래시·자원 보고서 | `device info files --device $D --domain-type systemCrashLogs` → `device copy from --domain-type systemCrashLogs --source <파일> --destination <경로>` | 됨. `Pocketlog-*.ips`(크래시)·`Pocketlog.*_resource-*.ips`·`JetsamEvent-*.ips`(메모리로 죽은 프로세스 목록 — `"name":"Pocketlog"`로 찾는다) |
| 시스템 로그 | `log collect --device-udid $D --last 30m --output x.logarchive` | **에이전트 셸에서는 안 됨** — `Must be root to collect logs from attached device`. 사람이 터미널에서 `sudo`로 돌리면 될 것으로 보인다(미확인). 읽기는 `log show --archive x.logarchive --predicate 'process == "Pocketlog"'` |
| 컨테이너에 쓰기 | `device copy to … --domain-type appDataContainer` | **됨**(소유자 허락 뒤, 개발 서명 빌드에서). 함정 둘: `--remove-existing-content true`는 **컨테이너 전체를 지운다**, 기기 파일이 원본보다 새로우면 **조용히 덮어쓰지 않는다**(원본을 `touch`) |
| 앱 띄우기·뒤로 보내기 | `device process launch --device $D com.a810labs.pocketlog` / 다른 앱(`com.apple.Preferences`)을 띄워 뒤로 보냄 / `device process terminate --pid` | 됨 (잠겨 있으면 `Locked`로 거부) |
| BGTask 강제 깨우기 | lldb `device select` → `device process attach --pid` → `expr -l objc -- (void)[[BGTaskScheduler sharedScheduler] _simulateLaunchForTaskWithIdentifier:@"com.expo.modules.backgroundtask.processing"]` | **안 됨(미해결)** — attach 뒤 `process status`에서 5분 넘게 멈춤. 배치 모드 lldb가 끝나며 앱을 죽임 |

없는 것: `idevicesyslog`·`pymobiledevice3`(설치 안 됨), 앱 화면 캡처(사람이 찍는다).

## 2. 점검 후보 — 갈래

후보 목록(소유자 제시 18개)을 AGENTS.md·`specs/*/quickstart.md`의 「미확인」과 대조해 더하고 뺐다. **★ = 이번에 더한 것**, ~~취소선~~ = 이미 닫힌 것.

### A — 빌드 12로 지금 손으로

| # | 항목 | 근거 | 상태(2026-10-16 15:35 컨테이너 읽기 기준) |
| --- | --- | --- | --- |
| A0 ★ | 배포 빌드의 개발자 화면 — 7번 탭으로 켜짐, 맨 아래 「최근 자동 쓰기 시도」·「최근 실패」·「쓸 차례 알림」 줄 | 081·078·085 미확인 | 미확인. 관찰 통로라 맨 먼저 |
| A1 | 첫 실행 전 과정 | 066·040·045 | **오늘 10:00~10:08 이미 한 번 지났다**(아래 「실측」). 작명 키보드·liveness 화면은 사람 기억으로만 남는다 |
| A2 | 2GB 적재 메모리·생성 중 종료 | 066 | 첫 일기 저장됨, Jetsam·크래시 보고서에 Pocketlog 없음. 8장 날에서 다시 본다 |
| A3 | 사진 읽기(CPU mmproj) 시간·8장 날 | 066·023 | 2장 14.8초. 8장 미측정 |
| A4 | 본문 시간 vs 180초 | 068 | 26.0초(2장 날). 시뮬레이터의 「180초 초과」는 실기기에서 재현되지 않았다 |
| A5 | 모바일 데이터 동의 `CELLULAR` | 074 | **재설치 회차(R)로 옮김** — 동의 화면은 모듈이 없을 때만 서고, 059 「모듈 다시 받기」의 용량 문구도 빠진 모듈이 있을 때만 나온다 |
| A6 | 설정 권한·배터리 행 탭 종료(빌드 2) | 066·068 | 미확인 |
| A7 | 위치 권한 문구·장소 이름·방침 링크 | 086 | 장소 이름 「삼평동」이 저장됐다(지오코딩 됨). 문구·「켬」·링크 미확인 |
| A8 | 달력 날짜 밀림(Hermes `formatToParts`) | 066 | 미확인 |
| A9 | Pretendard·큰 글꼴·한글 줄바꿈(`hangul-word`) | 083·066 | 미확인 |
| A10 | 제스처: 핀치·두 번 탭·끌어 닫기, 주간 넘김, 쓴 날 스크롤·접힘 | 067·049·051·052 | 미확인 |
| A11 | 쓰기·그만두기 반복, 쓰는 중 앱 내림 → 「도중에 끊김」 | 071·054·081 | 미확인 |
| A12 ★ | 겹 화면(설정·개발자·이름 바꾸기·서체 라이선스) 닫기 — iOS엔 뒤로 버튼이 없다 | 055·083 | 미확인 |
| A13 ★ | 「배터리」 행 보조 줄이 iOS 문구(「저전력 모드가 꺼져 있으면 먼저 써 둘 때가 있어요」) | 068·085 | 미확인 |

### B — 시간이 지나야 (A와 나란히, 첫날 걸어 둔다)

| # | 항목 | 근거 |
| --- | --- | --- |
| B12 | BGTask: OS가 깨우는가·언제·완주(`timing`)·멈췄다 이어짐 | 078·079·로드맵 할 일 1 |
| B13 | 쓸 차례 알림: 예약 7개·발화 시각·앞에 있으면 숨김·누르면 그 날로 열려 쓰기·완성 알림 뒤 거둠 | 085 |
| B14 | 런타임 하나 전제·합류·보이지 않는 홈의 경합(`앱 열기 · 홈에 넘김`과 `백그라운드 · 다른 쓰기가 진행 중`이 같은 시각대) | 080·078 |
| B15 | 지운 직후 다시 쓰지 않음·오래 사는 프로세스 | 082 |
| B16 | 저전력 모드·백그라운드 앱 새로 고침 꺼짐 | 068 |
| B17 ★ | 앱 열기 자동 쓰기(057)가 차례 지난 날을 쓰는가 | 057·078 |

### C — 새 빌드 필요

| # | 항목 | 근거 |
| --- | --- | --- |
| C17 | 업데이트 뒤 컨테이너 UUID 변경 → 사진 경로 rehome. **코드 변경 없이 다음 TestFlight 빌드가 오면 곧바로 본다** — 오늘 일기의 `resizedPath`가 `…/Application/293CEF85-…/Documents/vision-cache/…`로 저장돼 있다 | 066 |
| C18 | mmproj GPU(`use_gpu: true`) 캡션 성공·시간 | 066 |

### R ★ — 재설치 회차 (앱 삭제 → TestFlight 재설치, 모델 2GB·일기 사라짐 — 소유자 결정)

| # | 항목 | 근거 |
| --- | --- | --- |
| ~~R1~~ | ~~A5 모바일 데이터 동의~~ — **이 기기로는 볼 수 없다**: SIM이 없고 Wi-Fi만 된다(소유자, 2026-10-16). 074의 `CELLULAR` 갈래는 안드로이드 SM-G986N(SIM 무서비스)에 이어 여기서도 미확인으로 남는다 | 074 |
| R2 | 받는 중 앱을 내렸다 올리면 이어지는가 | 041·045 |
| R3 | 내려받기 실패 화면(받는 중 비행기 모드) | 066 미확인 |
| R4 | 첫 실행을 처음부터 녹화(작명 키보드·리턴 키·liveness·자동 첫 일기) | 066·047·040 |

## 3. 첫 회차 점검표 (안)

「사람」= iPhone에서 할 일, 「맥」= 내가 볼 것. 실패하면 남길 증거는 공통으로 **화면 캡처 + 시각(분까지)**, 그리고 맥이 그 직후 컨테이너 `preferences/`·`diary/`와 `systemCrashLogs`를 꺼낸다.

| 순서 | 사람 | 기대 | 맥 |
| --- | --- | --- | --- |
| 1 (A0) | 설정 → 「버전」 1초 안 7번 → 「개발자」 → 맨 아래까지 캡처 | 4번째부터 「N번 남았어요」, 개발자 행이 생기고 시도 2줄(`앱 열기 · 재료 없음` 15:33, `자동 쓰기 꺼짐` 10:06)·실패 없음·쓸 차례 알림 N개 | `auto-write-attempts.json`과 화면 줄 대조 |
| 2 (A6·A13·A7) | 설정의 사진·위치·알림·배터리 행을 하나씩 눌러 iOS 설정 앱 → 돌아오기. 배터리 행 보조 줄 캡처. 「정보」의 개인정보처리방침·도움말 열기 | 앱이 죽지 않고 설정 화면 그대로 | `systemCrashLogs`에 `Pocketlog-*.ips` 없음 |
| 3 (A8) | 큰 날짜를 눌러 달력 → 이번 달 5일·지난달 하루 누르기 | 누른 날이 홈에 그대로(하루 밀리지 않음) | — |
| 4 (A10·A12) | 쓴 날(오늘) 사진 핀치·두 번 탭·아래로 끌어 닫기, 주간 스트립 좌우 넘김, 지면 스크롤로 접힘/펼침, 겹 화면 닫기 | 확대·닫힘, 접힘 되풀이 없음 | — |
| 5 (A3·A4·A2) | 오늘 **사진 8장 이상** 찍고 「다시 쓰기」 → 끝까지 기다림 | 저장, 앱 생존 | 일기의 `timing.visionMs`·`writingMs`, Jetsam 보고서 |
| 6 (A11) | 쓰기 → 곧바로 그만두기 → 다시 쓰기 3번, 그 뒤 쓰는 중 홈 버튼으로 앱 내리고 10초 뒤 복귀 | 토스트·기록에 그만두기는 없음, 내린 건 `interrupted` | `write-failures.json` |
| 7 (A9) | 설정 → 손쉬운 사용 → 더 큰 텍스트를 한 단계·최대로 바꿔 홈·설정·대화상자 캡처 | 겹침·잘림 없음, 낱말 단위 줄바꿈 | — |
| 8 (B 걸기) | 아래 「B 설정」 | — | 다음 날 아침 기록 꺼내기 |

### B 설정 (오늘 저녁 걸고 내일 읽기)

- 자동 쓰기 켬(이미 켜져 있음, 목표 17시), 알림 허용, 백그라운드 앱 새로 고침 켬, 저전력 모드 끔, **앱을 밀어서 끄지 않는다**, 밤에 Wi-Fi + 충전.
- **써 볼 날이 있어야 백그라운드가 실제로 쓴다.** 오늘(10-16)은 이미 써 있고 어제는 사진이 없다 → 안 1: 오늘 저녁 개발자 화면이나 설정의 「일기 모두 지우기」로 오늘 일기를 지운 뒤 앱을 열지 않고 둔다(B15 「지운 직후 다시 쓰지 않음」도 같이 본다; 오후 목표라 자정 뒤 어제가 된 10-16을 백그라운드가 새벽에도 쓸 수 있다 — 078). 안 2: 지우지 않고 내일 사진을 찍은 뒤 17시 전후 앱을 열지 않는다(17:00 쓸 차례 알림 + 17~20시 창).
- **이 기기는 Wi-Fi뿐이다** — iOS 요청이 `requiresNetworkConnectivity = true`라(078) Wi-Fi가 없는 시간에는 BGTask가 깨지 않는다. 기록에 백그라운드 줄이 없으면 그 시간대에 Wi-Fi에 붙어 있었는지부터 묻는다.
- **소유자 결정(2026-10-16): 안 2** — 오늘 일기를 지우지 않는다. 10-17에 사진을 찍고 17시 전후 앱을 열지 않는다. 17:00 쓸 차례 알림(B13)과 17~20시 창의 BGTask(B12)를 보고, 놓치면 10-18 새벽의 따라잡기를 본다. 알림은 처음 뜬 것을 누르지 않고 두었다가, 창이 지난 뒤(20시 이후) 눌러 「그 날로 열려 쓰기」를 본다.
- 내일 아침: 맥이 `auto-write-attempts.json`·`write-failures.json`·`diary/`(`createdAt`·`timing`)를 꺼내고, 사람은 알림 센터 캡처.

## 4. 개발 빌드 경로 (소유자 결정 2026-10-16 — 안드로이드 debug처럼)

- **나눠 쓴다**: 원인을 가르는 일(BGTask 강제 실행 `_simulateLaunchForTaskWithIdentifier:`, 진단 화면, Metro로 고쳐 올리기)은 개발 빌드, 사용자가 겪는 그대로(OS가 스스로 깨우는가·실제 시간·쓸 차례 알림)는 TestFlight. 개발 빌드의 시간은 JS dev 모드라 사용자 시간이 아니다.
- **같은 기기에 둘을 함께 두지 못한다** — 같은 번들 ID, 다른 서명. 바꾸면 지우고 깔아야 할 가능성이 크다(모델 2GB·일기 사라짐, 미확인). 10-17 B 관찰을 끝낸 뒤 바꾼다.
- **소유주(Hyunmin Lee) 발급이 필요하다** — 개인 계정이라 Admin은 인증서·기기 화면에 못 들어간다(066). 요청: 기기 UDID `00008110-00010D890C81401E` 등록, Apple Development 인증서(CSR `~/.pocketlog-signing/ios/dev/development.csr`, 키는 같은 폴더 `development.key` 600), iOS App Development 프로파일 「Pocketlog Development」(App ID `com.a810labs.pocketlog`, 그 기기, 위 인증서).
- **2026-10-16 받음·빌드 성공**: 첫 프로파일(`b9b03d46…`)은 소유주의 예전 개발 인증서(`ehyunmin@gmail.com`, `EE:61:A6…`)만 허용해 `doesn't include signing certificate`로 실패했다. 다시 받은 프로파일 `e8812a21-c2ed-46fb-bb01-030d70968758`(17:22)이 우리 CSR의 인증서 `FE9ACD0626E0179571E92D9EFB2DF0D1C28E4498`을 허용한다. 키체인에 같은 이름의 개발 인증서가 둘(`603B30…` 첫 발급분, 미사용)이라 **이름이 아니라 지문으로 지정한다**: `CODE_SIGN_IDENTITY=FE9ACD0626E0179571E92D9EFB2DF0D1C28E4498 PROVISIONING_PROFILE_SPECIFIER=e8812a21-c2ed-46fb-bb01-030d70968758`. 산출물 `build/dev-device/Build/Products/Debug-iphoneos/Pocketlog.app` — `codesign`이 `Authority=Apple Development: Hyunmin Lee`, 권한 `increased-memory-limit`·`get-task-allow`, `CFBundleVersion` 12. 설치는 10-17 B 관찰 뒤.
- 받은 뒤: `security import` 두 개(키·인증서, WWDR G3는 이미 있다) → 프로파일을 `~/Library/Developer/Xcode/UserData/Provisioning Profiles/<UUID>.mobileprovision` → `xcodebuild -configuration Debug -sdk iphoneos` 수동 서명 → `devicectl device install app`. `development.key`를 잃으면 인증서도 못 쓴다 — 배포 키와 같이 백업한다.

## 실측

### 2026-10-16 — 첫 실행 (소유자, 회차 시작 전) — 컨테이너에서 읽은 것

- 10:00 무렵 받기 시작 → `v1`·`v2` 10:00, `a1` 10:06 검증 통과(`models/state.json` md5 셋 모두 `passed`). 받는 동안 `Pocketlog.diskwrites_resource` 보고서(1,073.91MB / 166초, **Action taken: none** — 하루 쓰기 한도 1GB 초과 알림일 뿐 앱을 막지 않았다).
- 10:06:43 `앱 열기 · 자동 쓰기 꺼짐`. 그 뒤 자동 쓰기를 켜고 목표 17시(`auto-diary.json`).
- 10:07:42·47에 찍은 사진 2장으로 10:07:58 오늘 일기 저장 — 캐릭터 `quiet`, 이름 「동동이」, **사진 읽기 14.8초 · 본문 26.0초**, 장소 이름 「삼평동」(사진 좌표 지오코딩). 실패 기록 파일 없음.
- 15:33:25 `앱 열기 · 재료 없음`(차례 지난 어제 10-15에 사진 없음 — 기대대로).
- `systemCrashLogs`에 `Pocketlog-*.ips` 없음, 10-15 Jetsam 보고서에 Pocketlog 없음.
- **★ 실제 iPhone에서 OS가 BGTask로 앱을 깨웠다** — 17:3x 백업의 `auto-write-attempts.json`: `백그라운드` 줄 15:38:34 `재료 없음`(창 밖 따라잡기 — 어제 사진 없음, `auto-write-catch-up.json` 15:38), 16:08:53·16:39:12 `오늘 창 밖에서 이미 한 번 시도함`, 17:09:35 `재료 없음`(목표 17시 창 안). **약 30분 간격**, 그동안 기기는 맥에 USB로 꽂혀(충전) 있었고 Wi-Fi였다. 078의 「하루 한 번 안팎」 짐작보다 훨씬 잦다 — 충전·연결 조건에서의 값이다(배터리만일 때는 미확인). 쓸 날이 없어 생성·완주 시간은 아직 못 봤다.
- 17:34 개발 빌드를 `devicectl device install app`으로 TestFlight 앱 위에 깔았다 — **지우지 않고 덮어 설치됐고 `Documents/`(모델·일기·기록)가 그대로 남았다**(같은 팀·같은 번들 ID). 깔기 전 컨테이너 전체를 `~/.pocketlog-signing/ios/device-backup/2026-10-16-testflight12/`에 백업(1.9GB, 49초, `a1.bin` md5가 `state.json`과 같음).
- **Metro에 붙지 못했다** — 맥(유선 `10.10.81.20`, Wi-Fi `10.16.72.11`) 어느 주소로 띄워도 번들 요청이 오지 않았고 맥에서 iPhone의 mDNS 이름도 응답하지 않았다(회사망 격리로 짐작, 로컬 네트워크 권한은 확인 못 함). 17:40의 `Pocketlog-2026-10-16-174002.ips`는 Debug 빌드가 Metro를 찾다 워치독에 죽은 것이다(`RCTBundleURLProvider isPackagerRunning` 대기 중 SIGKILL) — 제품 결함 아님.
- **대신 「개발 환경 Release」 빌드를 깔았다**: `.env.production.local`에 `EXPO_PUBLIC_APP_ENV=dev`를 잠깐 두고 Release를 개발 인증서·프로파일로 빌드(빌드 로그 `env: load .env.production.local .env.production`, 빌드 뒤 파일 삭제). JS가 앱에 들어 있어 Metro가 필요 없고, 최적화 빌드라 시간이 사용자 쪽에 가깝고, `get-task-allow`가 있다.
- **★ 사고: `devicectl device copy to … --remove-existing-content true`는 지정한 폴더가 아니라 앱 컨테이너 전체를 비운다** — 일기 폴더만 비우려다 모델·기록·이름·`Library`까지 지웠다(18:21, 앱이 첫 실행 상태로 떴다). 17:3x 백업에서 모델·설정·사진 사본을 되올렸다(모델 53초, `state.json` md5 일치). **이 옵션은 쓰지 않는다.** 또 **`copy to`는 기기 파일이 원본보다 새로우면 조용히 덮어쓰지 않는다** — 원본을 `touch`한 뒤 보내고, 되읽어 확인한다.
- **lldb 강제 깨우기는 실패했다** — `device select` → `device process attach --pid` 뒤 `process status`에서 5분 넘게 멈췄다(CPU 0%). 배치 모드 lldb가 끝나며 앱을 죽이기도 했다(크래시 보고서 없음). 미해결.
- **18:44 앱을 뒤로 보낸 채 자연 깨움을 기다렸다** — 조건: 일기 폴더 비움(10-16 안 쓴 날, 사진 2장), 목표 17시(창 17~20시), USB 충전·Wi-Fi. 18:55 기기를 뽑을 때(소유자 퇴근)까지 `백그라운드` 줄이 새로 생기지 않았다(맨 위는 18:44:18 `앱 열기 · 재료 없음` — 목표를 21시로 둔 채 띄운 것). 11분은 앞서 본 30분 간격보다 짧다 — 판정 아님. **기기는 그대로 가져갔다(앱 끄지 않음, 집 Wi-Fi·충전)** — 다음에 꽂으면 컨테이너의 시도 기록·일기(`createdAt`·`timing`)·크래시 보고서로 밤사이를 읽는다. 오늘 일기 원본은 `~/.pocketlog-signing/ios/device-backup/2026-10-16-testflight12/Documents/diary/`.
- 기기에는 지금 TestFlight 빌드가 아니라 **개발 환경 Release 빌드**가 깔려 있다(B 관찰이 그 빌드 위에서 돈다 — JS·네이티브는 빌드 12와 같은 커밋, 환경만 `dev`).
- ★ 곁에서 본 것: 저장된 `signalsUsed.steps.reason`이 iOS에서도 「안드로이드가 기간 걸음 수를 제공하지 않는다」다(`src/signals/collect.ts:29` 상수 하나). 077 뒤로 까닭은 프롬프트에 실리지 않고 화면엔 진단(개발 환경)에서만 보이므로 사용자 영향은 없다 — 고칠지는 소유자 판단.
