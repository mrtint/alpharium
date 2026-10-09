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

2026-10-09~10 · iPhone 17 Pro Max 시뮬레이터(iOS 26.5) · 현재 `app.json`으로 `prebuild --clean` 한 dev 빌드(`com.a810labs.pocketlog`, 1.0.0 (3)) · Metro `ERROR` 로그와 화면으로 확인.

| 화면 · 행/버튼 | iOS 관측 | 조치 | 확인 환경 |
|---|---|---|---|
| 설정 › 사진·위치·알림 행 (수정 이전 코드) | Metro `ERROR [Invariant Violation: new NativeEventEmitter() requires a non-null argument.]` (직전 `WARN PushNotificationIOS…`). dev라 앱은 살아 있고 알림만 뜸 | `a994379`가 이미 고침 — 소스 계약 테스트로 잠금 | 시뮬레이터 |
| 설정 › 사진·위치·알림 행 (수정 코드) | 오류 로그 없음, iOS 설정 앱(포켓로그) 열림, `stopApp: false`로 돌아오면 설정 화면 유지 | 없음 | 시뮬레이터 |
| 설정 › 권한 꼬리표 | 사진·위치를 `simctl privacy revoke`하니 「허용 안 함」(빨간 테두리), 알림 「허용됨」. **「일부 허용」(limited)은 시뮬레이터에서 만들 수 없어 못 봄** | 없음 | 시뮬레이터 |
| 설정 › 배터리 | 보조 줄 「저전력 모드를 끄면 제때 써요」, 누르면 iOS 설정 앱 열림 | FR-003 구현 | 시뮬레이터 |
| 설정 › 이름 바꾸기·자동으로 쓰기·매일 쓰는 시각·장소 이름·버전·개발자 | 오류 없음 | 없음 | 시뮬레이터 |
| 설정 › 일기 모두 지우기 | 일기 0편이라 비활성(회색) — 대화상자 못 엶 | 없음(정상) | 시뮬레이터 |
| 개발자 › 모듈 다시 받기·상태 흉내 날짜 대화상자 | 오류 없음(「이미 모두 준비돼 있어요」 토스트) | 없음 | 시뮬레이터 |
| 진단 › 일곱 묶음·자동 쓰기 지금 실행·닫기(`back-to-*`) | 오류 없음. 겹 닫기는 화면의 「‹」로 된다(`BackHandler` 불필요) | 없음 | 시뮬레이터 |
| 진단 › 환경 › 기기 | **값이 비어 있었다**(안드로이드 릴리스만 읽음) | `os: { platform, version }` → 「iOS 26.5」 | 시뮬레이터 |
| 진단 › 사진 권한 › 사진 위치 정보 | 값이 비어 있다 — 최근 30일 사진이 없는 `no-photo` 정상 상태(안드로이드와 같다) | 없음 | 시뮬레이터 |
| 진단 › 최근 실패 | 첫 실행의 자동 첫 일기가 「일기를 쓰지 못함」 1건(10-09 23:52) 남김 — 세 화면 밖 | 로드맵 「iOS 시뮬레이터 liveness」 과제에 한 줄 | 시뮬레이터 |
| 개발자 › 개발자 메뉴 끄기(`developer-off`) | 오류 로그 없음. 누르면 개발자 겹이 닫히고 설정으로 복귀하며 `settings-developer` 행 사라짐. dev 환경에서 앱 재실행 시 다시 나타남 | 없음(정상) | 시뮬레이터 |
| 개발자 › 온보딩부터 다시(`developer-replay-onboarding`) | 오류 로그 없음. 누르면 온보딩 게이트가 열려 권한 스텝을 거치고 모델은 지우지 않은 채 홈으로 복귀 | 없음(정상) | 시뮬레이터 |
| 진단 › 저장 점검(`diagnostics-storage`)·다시 읽기(`diagnostics-probe-refresh`)·프리셋 둘 | 오류 로그 없음. 저장 크기(`2.0GB`) 갱신, 신호 셀 갱신, 프리셋 탭 전환 정상 | 없음 | 시뮬레이터 |
| 진단 › 지금 한 번 써 보기(`diagnostics-try-once`) | 오류 로그 없음. 설정·개발자·진단 세 겹이 닫히고 홈으로 복귀하여 오늘 일기 쓰기 시작(토스트+제자리 쓰기) | 없음 | 시뮬레이터 |
| 상태 흉내 › `sim-fail`·`sim-empty`·`sim-nophoto` 토글 | 오류 로그 없음. 켜면 홈에 `home-dev-badge` 출현, 누르면 개발자 겹 복귀, 끄면 DEV 배지 사라짐 | 없음 | 시뮬레이터 |

**시뮬레이터 전용 표시**: 화면 아래 노란 `!` 알림 = `WARN Background tasks are not supported on iOS simulators`(시뮬레이터는 BGTask를 스케줄하지 않는다 — 066).

## 한계 (원칙 V)

- **실제 iPhone(TestFlight 빌드 3 이상, iOS 27.0.1)은 미확인이다** — 시뮬레이터 통과는 실기기 통과가 아니다. 배포 빌드에서 같은 예외는 앱 종료로 나타난다.
- **안드로이드 dev 실기기는 이 세션에서 확인하지 못했다**(이 맥에 `adb`가 없다). 안드로이드 배터리 행 문구 무변경은 `batteryRowHint("android")`가 옛 문구와 바이트 동일함을 단위 테스트가 잠글 뿐이고 **실기기 확인은 남아 있다**(SC-003).
- iOS BGTask의 실제 시각·자동 쓰기 동작은 이 과제가 재지 않았다(FR-004, 미확인).
- 「일부 허용」 꼬리표와 위치 꼬리표의 사진 있는 경우는 시뮬레이터에서 만들 수 없어 못 봤다.
