# Quickstart: iOS 설정·개발자·진단 화면 재검증

검증 방법 안내다. 구현 코드는 담지 않는다.

## 준비 (한 번)

1. `brew install openjdk mobile-dev-inc/tap/maestro`, `export JAVA_HOME=/opt/homebrew/opt/openjdk PATH=$JAVA_HOME/bin:$PATH`.
2. 현재 `app.json`으로 iOS 프로젝트를 다시 만든다: `NETRC=<빈 디렉터리> npx expo prebuild --platform ios --clean`(AGENTS 066).
3. 시뮬레이터 dev 빌드: `EXPO_PUBLIC_APP_ENV=dev npx expo run:ios --device <UDID> --no-bundler`, 그 뒤 Metro `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`
   (`.env.development.local`에 `EXPO_PUBLIC_APP_ENV=dev`가 있는지, 번들이 `dev`로 떴는지 `curl`로 확인 — AGENTS 066).
4. 첫 실행 흐름을 지나 홈에 간다(시뮬레이터 liveness 실패 화면은 「그냥 시작하기」).

## 훑기

`maestro --device <UDID> test .maestro/ios/settings-sweep.yml` — 설정의 각 행을 누르고, 앱이 살아 있는지(`stopApp: false` 뒤 `settings-screen`)를 본다.
오류는 `tail metro.log`의 `ERROR`와 `xcrun simctl spawn booted log show --last 3m --predicate 'process == "Pocketlog"'`에서 읽는다.

## 기대 결과

| 확인 | 기대 |
|---|---|
| 사진·위치·알림 행 | iOS 설정 앱의 포켓로그 화면이 열리고 Metro에 `ERROR`가 없다 |
| 돌아온 뒤 | 설정 화면 그대로, 꼬리표 갱신 |
| 배터리 행(iOS) | 보조 줄 「저전력 모드를 끄면 제때 써요」, 누르면 앱 설정 |
| 배터리 행(안드로이드 dev 실기기) | 「배터리 사용 · 제한 없음으로 두면 제때 써요」(무변경) |
| 이름 바꾸기·자동으로 쓰기·시각·장소 이름·지우기·버전 | 오류 없음 |
| 개발자·진단 | 모든 버튼이 오류 없이 동작하거나 iOS에서 보이지 않음 |

## 기록 칸 (훑기 결과, 구현 중 채운다)

(미실시)

## 한계 (원칙 V)

- 시뮬레이터(iOS 26.5, dev 빌드)는 피드백 환경(iOS 27.0.1 실기기, 배포 빌드)이 아니다 — **실제 iPhone은 TestFlight 빌드 3 이상에서 소유자가 확인한다.**
- iOS BGTask의 실제 시각·자동 쓰기는 이 과제가 재지 않는다(미확인).
