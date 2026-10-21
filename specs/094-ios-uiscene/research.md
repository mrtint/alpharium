# Research: Xcode 27 UIScene 대응

## 결정 1 — `expo-build-properties`의 `ios.enableSceneSupport`를 쓴다
- 근거: `expo-build-properties@57.0.x`(`build/iosSceneSupport.js`)가 SDK 57 표준 Swift AppDelegate를 `ExpoReactNativeFactoryProvider` 채택 형태로 고치고 Info.plist에 `UIApplicationSceneManifest`(`EXExpoAppSceneDelegate`)를 넣는다. 최소 요구는 `expo@57.0.23`이며 미만이면 prebuild가 예외를 던진다.
- 대안: AppDelegate를 직접 고치는 config plugin(유지 부담) — 기각. SDK 58로 올라가면 이 속성은 불필요(경고만)이고 삭제하면 된다.

## 결정 2 — 버전
- `expo`: `~57.0.30`(npm 최신 57.0.x). `expo-build-properties`: `~57.0.22`(최신 57.x). 정확한 값은 `npx expo install expo expo-build-properties` 후 `npx expo install --check`로 확정한다.
- `expo-background-task`는 `patches/expo-background-task+57.0.14.patch`에 묶여(package.json에 `57.0.14` 고정) 올리지 않는다. `expo install --check`가 이를 지적하면 패치 이름·내용을 함께 갱신하지 않고 고정 사유를 유지한다(지적 시 재평가).

## 결정 3 — 충돌 지점
- 앱의 plugins(`with-battery-bg-task`, `with-no-push-entitlement`, `with-force-light-theme`, `with-release-signing`)는 `UIApplicationSceneManifest`·AppDelegate 본문을 건드리지 않는다. 확인은 `npx expo prebuild --platform ios --clean` 결과의 Info.plist·AppDelegate.swift로 한다.
- `patches/…`의 `BackgroundTaskAppDelegateSubscriber`는 `ExpoAppDelegateSubscriber`다. 장면 도입 뒤에도 `application(_:didFinishLaunchingWithOptions:)`는 불린다 — 실기기 로그로 확인한다.
- 로컬 모듈 `pocketlog-continued-write`는 AppDelegate/Scene을 쓰지 않는다(Swift 파일 하나, BGTaskScheduler 직접 호출).

## 결정 4 — 딥링크
- 앱에 `scheme`이 없고 들어오는 딥링크가 없다. 확인 대상은 나가는 `Linking.openURL`과 알림 누름이다.

## 결정 5 — Xcode 고정
- 고정하지 않는다. 사전 점검 「26 이상」을 유지.

## 미지수 (실측으로 닫는다)
- 알림 응답이 scene 도입 뒤 콜드 스타트에서 `expo-notifications` 응답 리스너로 전달되는지.
- `BGContinuedProcessingTask` 처리기 등록 시점이 scene 도입으로 바뀌는지.
