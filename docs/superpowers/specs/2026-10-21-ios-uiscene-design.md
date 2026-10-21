# Xcode 27 UIScene 대응 — 설계

로드맵 「Xcode 27 UIScene 대응 — iOS 27 SDK로 빌드한 앱이 실행 즉시 죽는다」의 설계다. 소유자 결정은 요청에서 이미 났다(묻지 않고 끝까지 간다).

## 이해한 내용 (사용자가 말한 것)

- 목적: iOS 27 SDK(Xcode 27)로 빌드한 앱이 `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption` SIGTRAP으로 죽지 않게 한다. CI(Xcode 26.6)도 계속 통과해야 한다.
- 방법: `expo`를 57.0.23 이상(SDK 57 유지)으로, `expo-build-properties`를 정식 의존성으로 올리고 `app.json`에 `["expo-build-properties", {"ios": {"enableSceneSupport": true}}]`를 넣는다.
- 성공: 생명 주기가 UIScene으로 바뀐 뒤에도 AppState·알림 응답(085)·딥링크·BGTask 처리기(090·091)·이어 하기(092)가 그대로 돈다. 로컬 모듈과 `plugins/`가 깨지지 않는다.
- 제약: 빌드 번호는 올리지 않는다. `ios-release.yml`은 요청받았을 때만 돌린다.

## 가정 (사용자가 말하지 않은 것)

- 버전은 `npx expo install --check`가 SDK 57 호환으로 보증하는 범위(`~57.0.x`)로 맞춘다. `expo-background-task`는 `patches/`가 `57.0.14`에 묶여 있으므로 올리지 않는다(올리면 패치 이름과 내용이 어긋난다).
- `expo-build-properties`의 `enableSceneSupport`는 AppDelegate 템플릿과 Info.plist(`UIApplicationSceneManifest`)를 만든다. 우리 `plugins/`는 Info.plist를 `withInfoPlist`로 다루므로 키 충돌이 없는지 prebuild 결과로 확인한다.

## 접근

1. **의존성**: `expo` → `~57.0.<최신 확인값>`, `expo-build-properties` 추가. `npx expo install --check`로 SDK 호환을 검증한다.
2. **`app.json`**: `plugins`에 `expo-build-properties`와 `ios.enableSceneSupport: true`를 넣는다.
3. **계약 테스트**(`__tests__/config/`): `app.json`에 위 항목이 있고, `package.json`의 expo가 57.0.23 이상이며 `expo-build-properties`가 의존성에 있음을 잠근다. 위반 주입으로 잡히는지 본다.
4. **prebuild 점검**: `npx expo prebuild --platform ios --clean` 뒤 Info.plist의 `UIApplicationSceneManifest`·AppDelegate가 scene 방식인지, `BGTaskSchedulerPermittedIdentifiers`(090~092 플러그인)가 그대로인지, `with-no-push-entitlement`·`expo-background-task` 패치가 적용되는지 본다.
5. **실기기 확인**(iPhone 14, Xcode 27 Release, `EXPO_PUBLIC_APP_ENV=dev`): 첫 실행, AppState 전환, 알림 누름(085), 이어 하기(092) 완성 알림까지. 사람이 눌러야 하는 것만 구체적으로 요청한다.
6. **CI**: Xcode 26.6 빌드가 통과하는지 PR의 CI로 본다. `ios-release.yml`의 Xcode 고정 여부는 아래 결정을 따른다.
7. **문서**: AGENTS.md의 Xcode 27 경고와 `specs/092-.../quickstart.md` 「빌드 함정」, 로드맵 절을 고친다. 임시 우회 설명은 지우고 완료 이력으로 옮긴다.

## 결정

- `ios-release.yml`의 Xcode 버전은 고정하지 않는다. scene 대응으로 26.6과 27 모두에서 도는 것이 목표이며, 고정은 러너 이미지 교체 때마다 손봐야 하는 비용이 된다. 기존 「Xcode 26 이상」 사전 점검을 유지한다.

## 범위 밖

- 빌드 번호 올림, 릴리스 워크플로 실행, 안드로이드 변경, 새 기능.

## 위험

- scene 도입으로 알림 응답·딥링크 전달 경로가 바뀔 수 있다 — 실기기로 확인한다. 기기 화면 조작은 못 하므로 사람이 눌러야 하는 항목은 요청한다.
- `patches/expo-background-task+57.0.14.patch`가 AppDelegate subscriber를 건드린다 — scene 템플릿에서도 호출되는지 `--console` 로그로 확인한다.
