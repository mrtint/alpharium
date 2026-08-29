# Research: 앱 요구 권한 실측 및 통합 신청 절차

Phase 0 — Technical Context의 미결 사항을 해소한다. 이 저장소는 "값을 다시 재지 않는다"
(원칙 V)를 지키므로, 여기 적힌 것 중 **실측이 필요한 항목은 FR-001의 구현 단계 태스크로
넘긴다** — 이 문서는 "무엇을 어떻게 확인할지"와 "이미 확정된 것"을 가른다.

## §1 — 필수 권한 목록의 초안 (FR-001, 실측 전 후보)

각 기능이 코드상 실제로 부르는 권한 API를 저장소에서 추적한 결과. **이것은 초안이며,
FR-001 태스크가 실기기에서 확정한다.**

| 권한 항목 | 안드로이드 매니페스트 권한 | 부르는 코드 | 온보딩 단계? |
|---|---|---|---|
| 사진 접근 | `READ_MEDIA_IMAGES`, `READ_MEDIA_VISUAL_USER_SELECTED` | `expo-media-library` `getPermissionsAsync`/`requestPermissionsAsync` (`src/signals/expo-port.ts`, `PHOTO_ONLY = ["photo"]`) | 예 (1번) |
| 사진 좌표 접근 | `ACCESS_MEDIA_LOCATION` | 조회 API 없음 — `getLocation()`을 실제로 불러 예외로 판정 (`src/signals/expo-port.ts` 주석) | 예 (2번) |
| 위치 (장소명) | `ACCESS_FINE_LOCATION` (+`COARSE`) | `expo-location` `requestForegroundPermissionsAsync` (App.tsx `onToggleGeocoding`) | **실측 후 결정** |
| 알림 | `POST_NOTIFICATIONS` (Android 13+) | `expo-notifications` `getPermissionsAsync`/`requestPermissionsAsync` (`src/schedule/notification-port.ts`) | 예 (3번) |
| 배터리 최적화 예외 | `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | `expo-intent-launcher` `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` 인텐트 (`src/schedule/battery-exception-port.ts`) | 예 (4번) |

**Decision**: 온보딩 고정 순서는 **사진 → 사진 좌표 → 알림 → 배터리 예외**(spec
Clarifications). 위치(장소명)는 아래 §2의 실측 결과에 따라 목록에 포함하되 안드로이드
온보딩 단계로 넣을지를 정한다.

**Rationale**: 이 순서는 일상 사용에서 각 권한이 필요해지는 시점 순서다 — 새 사용자가
가장 먼저 부딪히는 것이 사진 수집(`has_media=0` 버그의 원인), 마지막이 자동 생성 관련
(알림·배터리)이다.

**Alternatives considered**: 위험도 순(배터리 예외 먼저), 알파벳 순 — 둘 다 사용자
맥락과 무관해 기각.

## §2 — 위치 권한을 안드로이드 온보딩에 넣을 것인가 (실측 필요)

**미결 → FR-001 태스크로**. App.tsx 주석은 "위치 권한이 iOS 위주로 동작한다"고 적고,
`geocoding-port.ts`는 권한이 없으면 이미 `unknown`으로 접는다. AGENTS.md의 017 관련
기록은 안드로이드 `Geocoder`도 쓴다고 한다.

**확인 방법** (T0xx, FR-001):

1. 안드로이드 실기기에서 위치 권한 없이 지오코딩 토글을 켜고, `expo-location`
   `reverseGeocodeAsync`가 (a) 빈 결과를 주는지 (b) 예외를 던지는지 (c) 권한 프롬프트를
   띄우는지 관측.
2. `ACCESS_FINE_LOCATION`을 `pm grant`로 준 뒤 같은 호출이 장소명을 반환하는지 확인.

**판정 기준**:

- 안드로이드에서 위치 권한이 **장소명 품질에 실제로 영향을 준다** → 온보딩 단계로 넣되
  순서는 사진 좌표 다음(장소명도 사진 기반이므로). 목록 메타데이터
  `platforms: ["android", "ios"]`.
- 영향이 없다(권한 없이도 동작하거나, 안드로이드에서 지오코딩이 무의미) → 목록
  메타데이터 `platforms: ["ios"]`, **안드로이드 온보딩 흐름에서 이 단계를 제시하지
  않는다**(FR-003, 원칙 V — 언제나 unknown인 축은 화면에서 뺀다). 진단 경로에는 남긴다.

**Decision (조건부)**: 목록 상수 `requirements.ts`에 위치 항목을 두되 `platforms` 필드로
게이트. `decision.ts`의 "다음 단계" 판정이 현재 플랫폼에 맞는 항목만 순회한다. 실측
결과가 어느 쪽이든 코드 구조는 동일 — 데이터만 바뀐다.

## §3 — 부분 허용(`limited`)이 안드로이드에서 오는가 (실측 필요, 004 유산)

**미결 → FR-001 태스크로**. `src/signals/port.ts`·`src/signals/expo-port.ts`의 주석이
004 시점부터 "`accessPrivileges === "limited"`가 안드로이드에서 오는지 확인되지 않았다"고
못 박고 있다. `toPermissionState()`는 이미 `limited`를 처리할 준비가 돼 있다.

**확인 방법** (T0xx, FR-001):

1. Android 14 실기기에서 사진 권한 요청 시 "선택한 사진만 허용"을 고르고,
   `getPermissionsAsync(false, ["photo"])`의 응답에 `accessPrivileges: "limited"`가 오는지
   `adb logcat`으로 관측.

**판정 기준**:

- `limited`가 온다 → FR-015의 "그날 사진 전부를 보지 못할 수 있다" 안내를
  `PermissionState === "limited"`로 트리거. 전체 허용 설정 링크 제공.
- `limited`가 안 온다(부분 허용도 `granted`로 보임) → 안내를 **사진 조회 결과**로 갈음:
  온보딩 완료 후 첫 사진 조회에서 "볼 수 있는 사진 수"가 기기 전체 사진 수보다 현저히
  적으면 그 사실만 표시(추정하지 않고 "선택한 사진만 보입니다" 같은 사실 문구). spec
  Assumptions에 이미 이 대비책이 적혀 있다.

**Decision (조건부)**: `decision.ts`는 `limited`를 "온보딩 통과 상태"로 다룬다(FR-015).
안내 트리거가 `limited` 상태냐 조회 결과냐는 실측이 정하고, 둘 다 순수 함수로 판정
가능하게 인터페이스를 잡는다.

## §4 — 진입 게이트를 App.tsx 어디에 두는가

**Decision**: `AppFrame` 함수 최상단에서 온보딩 플래그를 `useState`+`useEffect`로 읽어,
`completed !== true`이면 `<OnboardingScreen .../>`만 반환하고 탭 UI를 그리지 않는다.
플래그를 읽기 전(`null`)에는 아무것도 그리지 않거나 최소 로딩 표시.

**Rationale**: 006이 세운 "화면이 둘뿐이므로 상태 하나로 가른다"(App.tsx 주석)와 같은
패턴. 온보딩은 세 번째 최상위 상태다. `AppFrame`은 탭이 바뀌어도 언마운트되지 않으므로
(008의 `Acquisition` 인스턴스가 여기 사는 이유), 온보딩 완료 후 상태 전이도 안전하다.

**Alternatives considered**:

- `App` 컴포넌트(`SafeAreaProvider` 래퍼)에서 분기 — `SafeAreaProvider`는 온보딩
  화면에도 필요하므로 안쪽이 맞다.
- 별도 라우터 도입 — 이 앱은 라우터가 없다(상태 기반 화면 전환). 도입은 과함.

## §5 — 온보딩 완료 후 즉시 권한이 붙었는지 어떻게 확인하나 (SC-002)

**Decision**: 온보딩은 권한 상태만 바꾸고, 실제 사진 반영 확인은 **다음 일기 생성**에서
일어난다. 온보딩 화면이 "권한이 붙었다"를 스스로 검증하지 않는다 — 실시간 권한 상태를
읽어 각 단계의 완료 표시만 갱신한다(`decision.ts`).

**Rationale**: 온보딩이 생성을 트리거하면 원칙 I의 경계(생성은 `pipeline.run()`에서만)와
E1(한 번에 엔진 하나)이 얽힌다. SC-002의 `has_media > 0` 확인은 quickstart의 실기기
시나리오(010 합성 하루)에서 별도로 한다.

## §6 — `os-settings-port.ts`가 여는 화면

**Decision**: 두 종류.

- **앱 상세 설정**: `react-native`의 `Linking.openSettings()` — 사진·위치·알림 권한을
  거기서 켠다. `battery-exception-port.ts`의 `openAppSettingsFallback()`이 이미 이걸
  쓴다(재사용).
- **배터리 예외 목록**: `battery-exception-port.ts`의 `openSettingsList()`
  (`IGNORE_BATTERY_OPTIMIZATION_SETTINGS` 인텐트) — 이미 존재. 설정 "권한" 섹션의 배터리
  상시 링크가 이걸 부른다.

**Rationale**: 안드로이드는 권한별 딥링크를 표준으로 주지 않는다 — 앱 상세 화면이
현실적 최선. 배터리만 전용 인텐트가 있다. 새 통로 `os-settings-port.ts`는 앱 상세
열기만 담당하고, 배터리는 기존 `BatteryExceptionPort`를 그대로 쓴다.

## §7 — 020의 `batteryExceptionPrompted` 제거 영향 범위

저장소 추적 결과, `batteryExceptionPrompted`를 읽거나 쓰는 곳:

- `src/schedule/settings.ts` — 타입 필드, `DEFAULT_AUTO_DIARY_SETTINGS`, `loadAutoDiarySettings`
  (부분 손상 관대성), `saveAutoDiarySettings`(직렬화).
- `src/schedule/settings-effects.ts` — `applyToggleOn`에서 `!current.batteryExceptionPrompted`
  판정 후 `requestException()` 호출 + 플래그 세팅.
- 020의 계약 테스트(`__tests__/`) — 이 필드를 검사하는 테스트들.

**Decision**: 필드를 완전히 제거. `settings.ts`의 `loadAutoDiarySettings`는 알 수 없는
필드에 이미 관대하므로(020 주석 "부분 손상에 관대") 옛 파일의 `batteryExceptionPrompted`
값은 로드 시 자연히 무시된다. `applyToggleOn`은 배터리 관련 3줄을 제거하고
`SettingsEffectDeps`에서 `batteryPort`를 뺀다(더 이상 안 씀). 020 계약 테스트에서 이
필드 검사 부분을 이 기능의 태스크가 함께 수정한다(FR-010).

**Rationale**: 배터리 예외 안내의 유일한 주체를 온보딩 + 설정 "권한" 섹션으로 단일화
(FR-010). 자동 생성 토글이 배터리 인텐트를 띄우는 것은 020의 임시 조치였고, 통합
온보딩이 그 자리를 대신한다.

**시드**(FR-010a): `flag.ts`의 최초 초기화에서 `auto-diary.json`을 1회 읽어
`batteryExceptionPrompted === true`이면 `onboarding.json`의 `batteryNoticeShown`을 `true`로
세운다. 이는 `flag.ts` → `auto-diary.json` 방향의 읽기 1회뿐이며, `settings.ts`를 import
하지 않고 `flag-port.ts`가 파일을 직접 읽는다(경계 유지 — `onboarding/`이 `schedule/`에
의존하지 않게).

## §8 — 헌법 검사 규칙 `checkOnboardingFile`

**Decision**: `scripts/constitution-rules.ts`에 `checkScheduleFile`과 동형의 규칙 추가.

- 대상: `src/onboarding/` 아래 `.ts`.
- 막는 것: `from "...diary/prompt"`, `from "...diary/acceptance"`, `from "...models/roster"`,
  `backend.generate(` — 스케줄 규칙과 동일(권한 온보딩이 프롬프트·판정·로스터를 알 이유
  없음).
- 추가로 `flag.ts`에 대해: `\b(Date|timestamp|history|attemptCount|lastRun)\b` 토큰이
  코드(주석 제외)에 있으면 위반 — 플래그가 이력 로그로 자라는 것을 막는다(원칙 IV,
  020의 `AutoDiarySettings` "필드는 셋뿐" 규칙의 계승).

**Rationale**: 020이 `checkSpikeFile` → `checkScheduleFile`로 경계를 지킨 선례. 새
디렉터리에는 새 규칙(AGENTS.md — "새 규칙을 세울 때마다 실제로 어겨 보고 검사가 잡는지
확인").

**계약 테스트**: `__tests__/constitution-onboarding.test.ts`가 위반 주입(플래그에 `Date`
넣기, `onboarding/`에서 `diary/prompt` import) → 규칙이 잡는지 확인(007~020 관례).

## 미결 사항 요약 (FR-001 구현 태스크로 이월)

| # | 항목 | 판정 기준 | 코드 영향 |
|---|---|---|---|
| §2 | 안드로이드에서 위치 권한이 장소명에 실제 영향? | 실기기에서 권한 유무별 `reverseGeocodeAsync` 결과 대조 | `requirements.ts`의 위치 항목 `platforms` 값만 (구조 불변) |
| §3 | 안드로이드에서 `limited`가 오는가? | Android 14에서 "선택한 사진만" 후 `accessPrivileges` 관측 | FR-015 안내 트리거가 `limited` 상태냐 조회 결과냐 (둘 다 순수 함수) |

두 항목 모두 **코드 구조가 아니라 데이터/트리거 조건만** 바꾸므로, Phase 1 설계는 두
결과를 모두 수용하는 인터페이스로 진행한다.
