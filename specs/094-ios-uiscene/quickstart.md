# Quickstart: 검증

1. `npx expo install --check` → 통과.
2. `npm test && npm run lint && npx tsc --noEmit`.
3. prebuild 점검: `npx expo prebuild --platform ios --clean` 뒤 `ios/Pocketlog/Info.plist`에 `UIApplicationSceneManifest`, `AppDelegate.swift`에 `ExpoReactNativeFactoryProvider`, `BGTaskSchedulerPermittedIdentifiers`에 090~092 식별자.
4. 실기기(iPhone 14, UDID 00008110-00010D890C81401E): Xcode 27 Release, `EXPO_PUBLIC_APP_ENV=dev`, 수동 서명(`CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM=PGNGG84B39 PROVISIONING_PROFILE_SPECIFIER="Pocketlog Development" CODE_SIGN_IDENTITY="Apple Development: Hyunmin Lee (8G2BJ83L43)"`) → `devicectl device install app` / `process launch --console`.
   - 첫 실행: 크래시 없이 홈. 스크린샷 `devicectl device capture screenshot`.
   - 앞·뒤: `devicectl … launch com.apple.Preferences` 후 다시 앱.
   - 이어 하기: 사람이 「쓰기」 누르고 앱 나감 → `[continued-write]` submitted·report·close, 완성 알림.
   - 알림 누름(085): 사람이 알림을 누른다.
5. CI: PR의 iOS 빌드(Xcode 26.6) 통과.
