# Contract: iOS 설정 화면의 플랫폼 차이

## C1 — `batteryRowHint(platform)` (`src/app/battery-row.ts`)

- `platform === "ios"` → `"저전력 모드를 끄면 제때 써요"` (카탈로그 `settingsPlatform` 영역에서 읽는다).
- `platform === "android"` → 기존 `SETTINGS_TEXT.permBatteryHint` 문자열과 **바이트 동일**.
- 입력은 platform 하나, 부수 효과 없음, 던지지 않는다.

## C2 — `SettingsScreen`

- 배터리 행의 보조 줄은 `batteryHint: string` prop이다. 화면 파일은 `Platform`으로 이 값을 고르지 않는다(`Platform`은 글꼴 선택에만 쓰는 기존 사용만 남는다).
- 배터리 행의 `testID`(`settings-perm-battery`)·`onPress`(`onOpenAppSettings`)는 두 플랫폼에서 같다.

## C3 — 동적 import 금지 (소스 계약)

- `src/` 어디에도 `await import("react-native")`가 없다(주석을 걷어낸 소스 기준). 위반 주입: 한 줄을 되살리면 테스트가 실패한다.
- `os-settings-port.ts`·`battery-exception-port.ts`는 호출 시점 `require("react-native")`로 `Linking`을 읽는다(066 유지).

## C4 — 온보딩

- `PERMISSION_REQUIREMENTS`의 `battery-exception`은 `platforms: ["android"]`를 유지한다(043). `planOnboardingSteps({ platform: "ios" })`에 `battery-exception`이 없다.

## C5 — 훑기 흐름 (`.maestro/ios/settings-sweep.yml`)

- `appId: com.a810labs.pocketlog`. 앱 상태가 유지되는지는 `launchApp: { stopApp: false }` 뒤 `settings-screen` 가시성으로 가른다.
- `scripts/run-device-tests.mjs`의 `FLOWS`에 **등록하지 않는다** — 파일 머리 주석에 「등록하지 않은 흐름은 아무것도 검증하지 않는다」를 적는다.
