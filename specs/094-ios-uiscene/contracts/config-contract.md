# 설정 계약 (`__tests__/config/ios-scene-support.test.ts`가 잠근다)

- C1: `package.json`의 `expo`는 `~57.0.x`이고 x ≥ 23. 메이저는 57(SDK 유지).
- C2: `package.json`의 `dependencies`에 `expo-build-properties`가 있다(`~57.0.x`).
- C3: `app.json` `expo.plugins`에 `["expo-build-properties", {"ios": {"enableSceneSupport": true}}]` 항목이 정확히 하나 있다. `android` 속성은 넣지 않는다.
- C4: `expo-background-task`는 패치와 같은 정확한 버전(`57.0.14`)으로 남는다(`patches/`와 일치).
- C5: `ios-release.yml`의 Xcode 점검은 「26 미만이면 실패」 그대로다(고정 안 함).
- C6: AGENTS.md에 「Xcode 27로 빌드하면 UIScene 미채택 앱이 죽는다」식 경고가 남지 않는다(우회 설명 제거).
- C7: `app.json`의 `ios.buildNumber`는 "13", `android.versionCode`는 13 그대로다(이 기능은 번호를 올리지 않는다 — FR-009. 다음 릴리스에서 소유자가 올리면 이 계약을 함께 고친다).

위반 주입: ① 속성을 false로, ② 플러그인 항목을 지움, ③ expo를 57.0.22로 → 테스트가 각각 실패해야 한다.
