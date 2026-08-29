# Contract: 권한 통로 (`src/onboarding/*-port.ts` + 재사용)

기기의 권한 조회·요청·OS 설정 이동에 닿는 유일한 자리. 판정은 `decision.ts`에 순수
함수로 있고, 여기는 기기 통로. 관련: FR-004·008·017·020.

## P1 — 재사용하는 기존 통로 (변경 없음)

| 통로 | 파일 | 온보딩에서 쓰는 메서드 |
|---|---|---|
| `PhotoPort` | `src/signals/port.ts` / `expo-port.ts` | `photoPermission()`, `requestPhotoPermission()`, `locationPermission()`, `requestLocationPermission()` (사진 좌표) |
| `NotificationPort` | `src/schedule/notification-port.ts` | `requestPermission()` → `"granted" \| "denied"`, `ensureChannel()` |
| `BatteryExceptionPort` | `src/schedule/battery-exception-port.ts` | `requestException()`, `openSettingsList()` |

- `PhotoPort.locationPermission()`은 004의 제약대로 "실제로 읽어 봐야 안다" — 온보딩의
  "사진 좌표" 단계는 이 조회 결과를 그대로 쓴다. 조회가 예외를 던지면 `denied`로 간주.
- `NotificationPort.requestPermission()`은 `granted`/`denied`만 준다 —
  `PermissionState`로 올릴 때 `denied`가 `blocked`인지 구분 못 함. 온보딩은 이걸
  `denied`(actionable)로 다루고, 반복 거부 시 OS가 창을 안 띄우면 사용자가 설정
  링크를 쓰게 안내(설정 "권한" 섹션).

## P2 — 신규: `LocationPermissionPort` (장소명, `src/onboarding/location-permission-port.ts`)

```ts
export interface LocationPermissionPort {
  /** 현재 foreground 위치 권한 상태. 요청하지 않는다 (004 FR-011 규칙 계승). */
  status(): Promise<PermissionState>;
  /** 사용자가 버튼을 눌렀을 때만. 결과 상태를 돌려준다. */
  request(): Promise<PermissionState>;
}

export function expoLocationPermissionPort(): LocationPermissionPort;
```

- 구현: `expo-location`의 `getForegroundPermissionsAsync` / `requestForegroundPermissionsAsync`
  를 **지연 import**. 응답을 `PermissionState`로 옮긴다:
  - `status === "granted"` → `granted`
  - `status === "undetermined"` → `undetermined`
  - `canAskAgain === false` → `blocked`, 그 외 → `denied`
  - (`limited`는 위치에 해당 없음)
- App.tsx의 `onToggleGeocoding`이 지금 인라인으로 부르는 `requestForegroundPermissionsAsync`
  를 이 통로로 대체할 수 있으나 **이 스펙 범위 밖**(017 동작 유지). 온보딩만 이 통로를
  쓴다.
- research.md §2 실측 결과가 `platforms: ["ios"]`면, 안드로이드에서는 이 통로가 온보딩
  단계에서 호출되지 않는다(그래도 설정 "권한" 섹션에서 iOS용으로 존재하거나, android
  에서는 행 자체가 안 뜸).

## P3 — 신규: `OsSettingsPort` (`src/onboarding/os-settings-port.ts`)

```ts
export interface OsSettingsPort {
  /** OS의 이 앱 상세 설정 화면을 연다 (사진·위치·알림 권한을 거기서 켠다). */
  openAppSettings(): Promise<void>;
}

export function expoOsSettingsPort(): OsSettingsPort;
```

- 구현: `react-native`의 `Linking.openSettings()`를 지연 import. 실패해도 예외를 밖으로
  던지지 않는다(`battery-exception-port.ts`의 `openAppSettingsFallback` 패턴).
- 배터리 예외 목록은 이 통로가 아니라 기존 `BatteryExceptionPort.openSettingsList()`.

## P4 — 통로 조합은 화면이 받는다

- `OnboardingScreen`은 위 통로들을 props로 받는다(주입). 직접 `expo-*`를 import하지
  않는다 — 007~020 관례, 기기 없이 화면 테스트가 돌게.
- `App.tsx`가 `expo*Port()` 팩토리로 실제 통로를 만들어 주입. `PermissionPanel`이
  `PhotoPort`를 주입받는 것과 같은 방식.

## P5 — 계약 테스트

- `location-permission-port.ts`: `expo-location` 응답 4갈래(`granted`/`undetermined`/
  `denied`+canAskAgain false/true)가 올바른 `PermissionState`로 매핑(mock).
- `os-settings-port.ts`: `Linking.openSettings` 실패 시 예외를 던지지 않음.
- 두 파일 모두 `diary/`·`models/`·`schedule/decision` 등 순수 판정 계층을 import하지
  않음(통로는 통로만).
- `OnboardingScreen`/`PermissionsSection`이 `expo-*`를 직접 import하지 않음(소스 검사) —
  통로 주입만.
