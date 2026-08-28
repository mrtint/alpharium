# Contract: 배터리 최적화 예외 안내·요청 (`src/schedule/battery-exception-port.ts`, `AutoDiarySettingsScreen`)

관련: FR-002, FR-010, spec Clarifications(최초 1회 + 상시 링크), SC-001,
019 findings.md "다음 스펙에서 고려할 사항". `expo-intent-launcher` 신규
의존.

## E1 — `BatteryExceptionPort`

```ts
export interface BatteryExceptionPort {
  /**
   * ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS 인텐트를 띄운다.
   * 앱을 나가지 않고 시스템 다이얼로그로 예외를 요청한다.
   * 매니페스트에 REQUEST_IGNORE_BATTERY_OPTIMIZATIONS 권한이 선언돼야
   * 이 다이얼로그가 뜬다(없으면 openSettingsList로 폴백).
   * 사용자가 수락/거부/취소 무엇을 했는지 이 호출로는 알 수 없다 —
   * 반환값 없음(원칙 IV — 결과를 측정하지 않는다).
   */
  requestException(): Promise<void>;
  /**
   * 배터리 최적화 예외 설정 "목록" 화면을 연다
   * (ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).
   * 거부 후 설정 화면의 상시 링크가 이걸 부른다.
   */
  openSettingsList(): Promise<void>;
}
```

- `requestException()`: `IntentLauncher.startActivityAsync(
  "android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS_SETTINGS", {
  data: "package:<packageName>" })` 또는 동등한 액션. 정확한 액션
  문자열·data 형식은 tasks 단계에서 실기기로 확정(제조사 차이 —
  research.md §5 남는 위험).
- `openSettingsList()`: `IntentLauncher.startActivityAsync(
  "android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS")`.
- 인텐트가 실패(액티비티 없음 등)해도 **예외를 밖으로 던지지 않는다** —
  `catch`로 삼키고, 최선으로 `Linking.openSettings()` 폴백. 자동 생성
  자체는 이것과 무관하게 동작한다(느릴 뿐).
- 지연 import `expo-intent-launcher`.

## E2 — 매니페스트 권한 (config plugin)

`plugins/with-battery-exception.js`(신규) — `with-release-signing.js`가
쓰는 것과 같은 선언적 config plugin 패턴:

```text
AndroidManifest.xml에 추가:
  <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

- `android/`를 직접 고치지 않는다 — `prebuild --clean`에 지워진다
  (AGENTS.md). config plugin으로 선언.
- `POST_NOTIFICATIONS`도 여기서 함께 선언(notification.md N3의 런타임
  요청이 먹으려면 매니페스트 선언이 선행돼야 한다).
- prebuild 후 `adb shell dumpsys package <패키지>`의 `requested
  permissions`로 확인(AGENTS.md의 매니페스트 검증 관례).

## E3 — 최초 1회 요청 (FR-010 MUST / MUST NOT)

`AutoDiarySettingsScreen`에서 자동 생성을 **처음 켤 때**만:

```text
if (settings.batteryExceptionPrompted === false):
    <설명 화면/모달 표시>  ← "왜 이 예외가 필요한지"
    batteryExceptionPort.requestException()
    saveAutoDiarySettings(port, { ...next, batteryExceptionPrompted: true })
```

- `batteryExceptionPrompted`가 `true`가 되면 **다시는 자동으로
  `requestException()`을 부르지 않는다**(FR-010 MUST NOT) — 이후 실행이
  크게 지연되어도.
- "설명 화면"은 인텐트를 띄우기 **전에** 보여준다 — 안드로이드 정책상
  맥락 없는 요청은 남용으로 본다(research.md §5).

## E4 — 상시 링크 (거부 후에도)

`AutoDiarySettingsScreen`에 항상 표시(자동 생성 on/off와 무관):

```text
"일기가 제때 안 써지나요? 배터리 설정에서 이 앱을 '제한 없음'으로
바꾸면 더 자주 시도합니다."
[배터리 설정 열기]  → batteryExceptionPort.openSettingsList()
```

- 이 링크는 `batteryExceptionPrompted` 값과 무관하게 **항상** 있다
  (FR-010 "거부 후에도 ... 상시 링크").
- 문구는 정밀도를 암시하지 않는다(FR-002) — "정각에", "매일 7시에"
  같은 표현 금지. "더 자주 시도합니다" 수준.

## E5 — 근사치 안내 (FR-002, SC-001)

`AutoDiarySettingsScreen`의 목표 시각 선택 UI 옆에 고정 문구:

```text
"고른 시각 정각이 아니라 그 무렵에 씁니다. 기기 상태에 따라 더
늦어질 수 있어요."
```

- SC-001: 이 문구만 보고 "딱 맞춰지는 게 아니라 근방"임을 이해할 수
  있어야 한다.
- "오전 7시 정각에", "매일 7시" 같은 정밀도 암시 문구를 코드 어디에도
  두지 않는다 — 계약 테스트가 소스에서 그런 문자열을 찾아 없음을
  확인(원칙 II).

## E6 — `expo-battery`는 선택 (채택 안 함, 기본)

research.md §5 결론: `isBatteryOptimizationEnabledAsync()`로 링크 문구를
"현재 예외 적용됨/안 됨"에 맞춰 바꾸면 UX가 낫지만, FR-010은 "항상
링크를 보이면" 충족된다. **이 스펙은 `expo-battery`를 추가하지 않는다.**
tasks 단계에서 UX 비용 대비 재판단 가능(그때 추가하면 의존 1개 + 상태
1개).

## E7 — 위반 주입 (계약 테스트)

| 주입 | 기대 |
|---|---|
| `requestException()`이 결과(수락/거부)를 반환한다 | E1 위반 (원칙 IV) — 반환값 void |
| `batteryExceptionPrompted: true`인데 `requestException()` 호출 | E3 위반 (FR-010 MUST NOT) |
| 설명 화면 없이 인텐트를 바로 띄운다 | E3 위반 — 인텐트 전에 설명 |
| 소스에 "정각" / "매일 7시" / "7:00" 문자열 | E5 위반 (FR-002) |
| `android/app/build.gradle`을 직접 수정해 권한 추가 | E2 위반 — config plugin으로만 |
| 상시 링크가 `batteryExceptionPrompted === false`일 때만 보인다 | E4 위반 — 항상 보인다 |
