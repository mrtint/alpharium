# Research: iOS 설정·개발자·진단 화면 재검증과 고장 수정

모든 항목이 이 저장소의 코드·2026-10-09 시뮬레이터 관측으로 정해졌다. 「NEEDS CLARIFICATION」 없음.

## R1 — 권한 행 튕김의 원인과 현재 상태

- **Decision**: 이미 고쳐졌다(`a994379`). 이번 과제는 그 수정을 **계약 테스트로 잠그는 것**만 더한다.
- **근거(관측)**: 수정 이전 코드로 iOS 시뮬레이터에서 권한 행을 누르면 Metro에 `WARN PushNotificationIOS has been extracted…`에 이어
  `ERROR [Invariant Violation: new NativeEventEmitter() requires a non-null argument.]`가 찍힌다(dev 빌드라 앱은 살아 있고 오류 알림). 수정 이후 코드는 오류 없이 iOS 설정 앱이 열린다.
  배포 빌드에서는 같은 예외가 앱 종료다(066) — **시뮬레이터에서 직접 보지 못했다.**
- **Alternatives**: 호출 시점 `require`(채택) vs `Linking`을 모듈 최상단에서 import(RN index를 훑지 않는 장점은 같지만 jest `logic`에서 불러오는 순간 RN 런타임이 필요해 기각 — 기존 통로가 호출 시점에 읽는 이유).

## R2 — 동적 import의 남은 위험

- **Decision**: `react-native`를 `await import`하는 곳은 현재 0건이다(grep). 같은 모양이 다시 들어오지 않도록 소스 계약 테스트로 `await import("react-native")`를 금지한다.
- `expo-*`·`llama.rn`의 `await import`는 066 원인(RN index의 getter 훑기)과 모양이 달라 금지하지 않는다. 훑기에서 iOS가 던지는 경우에만 같은 방식으로 바꾼다.

## R3 — 온보딩 배터리 단계는 iOS에 이미 없다

- **Decision**: 온보딩은 건드리지 않는다. 설정의 「배터리」 행만 바꾼다.
- **근거**: `PERMISSION_REQUIREMENTS`의 `battery-exception`이 `platforms: ["android"]`(043 FR-017)이고 `decision.ts`가 `platforms.includes(platform)`로 거른다. clarify Q1의
  「온보딩 단계도 같은 문구」는 이 사실로 정정했다(spec Clarifications).

## R4 — 플랫폼 값과 문구 선택의 자리

- **Decision**: `App.tsx`가 이미 `Platform.OS`로 만든 `platform: "android" | "ios"`(777행)를 쓴다. 문구 선택은 `src/app/battery-row.ts`의 순수 함수
  `batteryRowHint(platform)`이 하고 SettingsScreen은 문자열 prop(`batteryHint`)만 받는다.
- **Alternatives**: `SettingsScreen`이 `Platform.select`를 직접 호출 — 화면에 플랫폼 분기가 늘고 jest에서 `Platform.OS`를 흉내 내야 해 기각(FR-007). `SETTINGS_TEXT`에서 키 하나를 플랫폼별로 — 카탈로그 안에 분기가 생겨 062의 「문구는 값」 원칙과 어긋나 기각.
- 문구: 안드로이드 `permBatteryHint`는 그대로, iOS 값은 신규 `permBatteryHintIos: "저전력 모드를 끄면 제때 써요"`. 062 골든 테스트(G1/G2)가 카탈로그 리터럴 집합을 잠그므로
  신규 키는 골든의 「새 영역」 규칙(옛 상수와 같은 키만)과 충돌한다 — **별도 영역 `settingsPlatform`**(새 모듈 `settings-platform.ts`)으로 둔다(062 관행: 새 문구는 별도 영역).

## R5 — 훑기 방식

- **Decision**: Maestro(2.11, openjdk 필요)로 iOS 시뮬레이터를 조작한다. 합성 마우스 이벤트(`CGEvent`)는 시뮬레이터가 무시해 쓸 수 없었다(2026-10-09 실측).
- 오류는 Metro 로그(`ERROR`)와 `xcrun simctl spawn booted log show`로 읽는다. 앱이 죽었는지는 `launchApp`의 `stopApp: false`로 상태가 유지되는지로 가른다
  (`launchApp` 기본값은 앱을 종료했다 다시 띄워 상태를 지운다 — 크래시로 오인하기 쉽다).
- 흐름 파일은 `.maestro/ios/`에 둔다. `FLOWS` 등록 여부는 spec FR-009가 정본이다(이번에는 등록하지 않는다).

## R6 — 시뮬레이터 빌드

- **Decision**: 훑기 전에 `npx expo prebuild --platform ios --clean`으로 현재 `app.json`(`com.a810labs.pocketlog`)에서 프로젝트를 다시 만들어 빌드한다(Clarifications Q2).
  `~/.netrc`가 644면 `NETRC=<빈 디렉터리>`(AGENTS 066). 모델은 새 앱이 다시 받는다(약 2GB, 이 맥에서 약 3분).
- **미해결이지만 이 과제 범위 밖**: 시뮬레이터에서 liveness가 실패하는 원인(로드맵 별도 과제). 훑기는 「그냥 시작하기」로 홈에 간다.

## R7 — iOS에서 `BackHandler` 없이 겹을 닫는 수단

- **Decision**: 훑기에서 닫을 수 없는 겹이 발견되면 그때 판정한다. 코드로 확인된 것: 설정 틀은 「‹ 일기」, 사진 확대는 닫기 버튼, 대화상자는 버튼이 있다. 개발자·진단 겹과 상태 흉내 대화상자는 훑기로 확인한다.

## R8 — 플랫폼 타입 좁히기 (`appPlatform`)

- **Decision**: `Platform.OS`는 `string`이므로 순수 함수 `appPlatform(os: string): "android" | "ios"`(`src/app/platform.ts`)를 만들어 안전하게 좁힌다. 조립부(`App.tsx`)가 이를 통해 `platform`을 만들어 화면에 전달한다.

## R9 — 진단 환경 기기 줄의 크로스 플랫폼 지원

- **Decision**: 진단 화면의 「기기」 줄이 기존에는 안드로이드 릴리스(`androidRelease`)만 읽어 iOS에서 비어 있었다. `os: { platform: "android" | "ios"; version: string } | null` 구조로 바꾸어 iOS에서도 「iOS 26.5」가 표시되도록 확장했다.

## R10 — iOS 개발 클라이언트 「열겠습니까?」 대응

- **Decision**: Expo dev-client가 로컬 주소를 열 때 iOS 시스템이 「'포켓로그'에서 열겠습니까?」 확인창을 띄운다. Maestro 조작 시 타이밍 이슈를 방지하기 위해 공용 서브플로우 `.maestro/ios/_dismiss-open-prompt.yml`로 자동 닫기를 구현했다.

