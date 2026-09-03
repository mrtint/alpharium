# Data Model: One UI 8.5+ fixes

Phase 1 — 이 기능은 **새 데이터 엔티티를 도입하지 않는다.**

## 변경되는 기존 구조

### `PermissionKey` (타입) — `src/onboarding/requirements.ts`

- **전**: `"photos" | "photo-location" | "location" | "notifications" | "battery-exception"` (5갈래)
- **후**: `"photos" | "location" | "notifications" | "battery-exception"` (4갈래)
- `photo-location` 제거. 나머지 순서·의미 무변경.

### `PERMISSION_REQUIREMENTS` (상수 배열) — `src/onboarding/requirements.ts`

- **전**: 5개 항목, `order` 1..5 (photos=1, photo-location=2, location=3, notifications=4, battery-exception=5)
- **후**: 4개 항목, `order` 1..4 (photos=1, location=2, notifications=3, battery-exception=4)
- `photo-location` 항목 통째로 제거. `location`·`notifications`·`battery-exception`의 `order`를 1씩 낮춘다. `key`·`neededBy`·`platforms`·`rationale`·`ifDenied` 문안은 그대로.
- `photos` 항목의 `rationale`/`ifDenied`에 사진 위치 관련 문구를 더할지는 **plan에서 열어 둠** → contracts/onboarding-steps.md에서 결정(현재 방향: 더하지 않는다 — 사진 위치는 사용자가 인지할 필요 없는 자동 처리).

### 저장 스키마 — 무변경

- `onboarding.json` (`{ completed, batteryNoticeShown }`) — 무변경. `photo-location` 관련 필드 없음(단계 완료를 저장하지 않는 021 설계).
- `preferences/*.json` — 무변경.
- `notified.json` 등 — 무관.

### 앱 외형 설정 — `app.json` / 네이티브

- `app.json`의 `userInterfaceStyle: "light"` — **이미 존재, 유지**. 이번에 `expo-system-ui` 설치로 이 값이 Android에서 실제로 적용됨.
- `app.json` `plugins` 배열 — 신규 `./plugins/with-force-light-theme` 항목 추가.
- Android 테마 `AppTheme` (`styles.xml`, prebuild 생성물) — plugin이 `<item name="android:forceDarkAllowed">false</item>` 주입.
- `package.json` `dependencies` — `expo-system-ui` 추가(`expo install`이 버전 결정).

### 매니페스트 권한 — 무변경

- `ACCESS_MEDIA_LOCATION` — `app.json` `android.permissions`에 유지. `expo-media-library` 플러그인의 `isAccessMediaLocationEnabled: true` 유지.
- 화면에서 단계를 빼는 것과 권한 선언은 별개(FR-011).

## 상태 전이 — `OnboardingStep.status` (무변경)

`StepStatus` = `"satisfied" | "actionable" | "blocked" | "skipped-eligible"` — **4갈래 그대로**. `photo-location` 제거로 갈래가 늘거나 줄지 않는다. `statusOf()`·`planOnboardingSteps()`·`nextStep()` 로직 무변경 — 단지 `photo-location` 항목이 `requirements`에 없으므로 `planOnboardingSteps`가 그 단계를 만들지 않을 뿐.
