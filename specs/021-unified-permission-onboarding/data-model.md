# Data Model: 앱 요구 권한 실측 및 통합 신청 절차

Phase 1 — 엔티티, 필드, 검증 규칙, 상태 전이. 구현은 `tasks.md`와 구현 단계에서.

## §1 — `PermissionRequirement` (필수 권한 목록 항목)

`src/onboarding/requirements.ts`의 상수. **사람이 못 박는다**(FR-001·002·004, 원칙 V).

```ts
export type PermissionKey =
  | "photos"          // READ_MEDIA_IMAGES (+ VISUAL_USER_SELECTED)
  | "photo-location"  // ACCESS_MEDIA_LOCATION
  | "location"        // ACCESS_FINE_LOCATION — 장소명 (§2 실측으로 platforms 확정)
  | "notifications"   // POST_NOTIFICATIONS
  | "battery-exception"; // REQUEST_IGNORE_BATTERY_OPTIMIZATIONS (권한 아님, 시스템 설정)

export type PermissionRequirement = {
  key: PermissionKey;
  /** 온보딩 고정 순서상의 위치. 낮을수록 먼저. photos=1 … battery-exception=4 */
  order: number;
  /** 이 권한을 요구하는 기능 (근거, 원칙 V — 문서화). */
  neededBy: string;
  /** 이 항목이 의미 있는 플랫폼. 현재 플랫폼이 없으면 온보딩에서 제시하지 않는다 (FR-003). */
  platforms: readonly ("android" | "ios")[];
  /**
   * 온보딩·설정에 보일 "왜 필요한지" 문안.
   * 원칙 II·III: 모델 정보 없음, 관측 못 하는 것 단언 없음 (SC-008).
   */
  rationale: string;
  /**
   * 이 권한이 거부됐을 때 어떤 기능이 어떻게 제한되는지 (FR-014).
   * 020 N8("알림 권한 없어 완성 알릴 수 없다")의 일반화.
   */
  ifDenied: string;
};

/** 사람이 정한 목록. 코드가 항목을 더하거나 빼지 않는다 (FR-002·004, 원칙 V). */
export const PERMISSION_REQUIREMENTS: readonly PermissionRequirement[];
```

### 검증 규칙 (계약 테스트 `onboarding-requirements.test.ts`)

- `order`는 1..N 연속, 중복 없음.
- `battery-exception`의 `order`가 가장 큼(마지막 단계).
- 모든 `rationale`·`ifDenied`에 금지 토큰 없음: 모델 식별자 패턴(`kanana|exaone|
  hyperclovax|qwen|gemma|gguf|\dB\b|Q4|Q8`), "안다/압니다/기록합니다" 같은 단언 동사는
  리뷰로(자동 검사는 토큰만).
- `platforms`가 빈 배열이 아님.
- **소스 선언을 `readFileSync`로 직접 읽어 검사한다**(007·009·012·020 관례 — jest는
  타입을 지우므로).

### §2 실측 반영 지점

- 위치 항목의 `platforms`: `["android","ios"]`(안드로이드 장소명에 영향 있음) 또는
  `["ios"]`(영향 없음 → 안드로이드 온보딩에서 빠짐). research.md §2.

## §2 — `PermissionState` (권한 하나의 현재 상태)

**기존 타입 재사용** — `src/signals/port.ts`:

```ts
export type PermissionState =
  | "granted" | "limited" | "denied" | "blocked" | "undetermined";
```

- `onboarding/`에서 재export하거나 직접 import. 새 타입을 만들지 않는다.
- `battery-exception`은 권한이 아니므로 상태 갈래가 다르다 — 아래 §3.

### `battery-exception`의 상태

배터리 최적화 예외는 조회 API가 불확실하다(`expo-battery`를 안 들이기로 함, plan). 따라서:

```ts
export type BatteryExceptionState =
  | "unknown"    // 조회 불가 — 안내는 하되 상태를 단언하지 않는다 (원칙 V)
  | "prompted";  // 온보딩/설정에서 1회 인텐트를 띄웠다 (flag.batteryNoticeShown)
```

- `"granted"`/`"exempted"` 같은 값을 두지 않는다 — 실제로 예외가 걸렸는지 확인할 통로가
  없으므로 아는 척하지 않는다(원칙 V). 온보딩은 "안내를 했는가"만 안다.

### 부분 허용 안내 판정 (`describePhotoAccessLimit`, research.md §3 대비책)

research.md §3의 실측(T031)에서 안드로이드가 `accessPrivileges: "limited"`를 **주지
않으면**, "그날의 사진 전부를 보지 못할 수 있다" 안내를 `PermissionState`로 트리거할 수
없다. 그때의 대비책은 **첫 사진 조회 결과**로 갈음한다 — 순수 함수로 `decision.ts`에 둔다:

```ts
export function describePhotoAccessLimit(input: {
  state: PermissionState;
  /** 온보딩/설정이 조회한 "볼 수 있는 사진 수". 조회 안 했으면 null. */
  visiblePhotoCount: number | null;
}): "full" | "partial" | "unknown";
//  state === "limited"                     → "partial"  (limited가 오는 기기)
//  state === "granted" && visiblePhotoCount === 0 → "partial"  (선택한 사진 0장)
//  state === "granted"                     → "full"
//  그 외                                   → "unknown"
```

- **순수** — `new Date()`·`expo-*` 없음. 화면이 조회 결과를 넘긴다.
- `limited`가 오는 기기에서는 `visiblePhotoCount`가 불필요(첫 분기가 잡음). 안 오는
  기기에서는 조회 수로 "선택한 사진만" 상태를 근사한다 — **추정하지 않고 사실만**
  ("선택한 사진만 보입니다"는 조회 수가 0이거나 전체보다 현저히 적을 때만).
- T031이 실측 후 이 함수의 두 번째 분기(`visiblePhotoCount === 0`)를 유지할지, 더
  정교하게 할지 확정한다. **`limited`가 오면 이 함수는 첫 분기만 쓰이고 나머지는 dead
  path로 남겨도 된다**(원칙 V — 통로가 생기면 그때 정리).

## §3 — `OnboardingFlag` (완료 플래그)

`src/onboarding/flag.ts` + `flag-port.ts`. `files/preferences/onboarding.json`.

```ts
export type OnboardingFlag = {
  /** 사용자가 온보딩을 끝냈거나 건너뛰었다. true면 자동 재노출 안 함 (FR-011). */
  completed: boolean;
  /** 배터리 예외 안내를 1회 제시했다. true면 다시 자동 요청 안 함 (FR-009). */
  batteryNoticeShown: boolean;
};

export const DEFAULT_ONBOARDING_FLAG: OnboardingFlag = {
  completed: false,
  batteryNoticeShown: false,
};
```

### 검증 규칙 (`onboarding-flag.test.ts`)

- **필드는 둘뿐**(원칙 IV) — 타임스탬프·시도 횟수·마지막 실행·단계별 완료를 두지
  않는다. `checkOnboardingFile`이 `flag.ts`에 `Date|timestamp|history|count` 토큰이
  들어오면 위반(plan Constitution Check).
- `loadOnboardingFlag`: 파일 없음·JSON 깨짐·통로 예외 전부 `DEFAULT_ONBOARDING_FLAG`.
  부분 손상 관대 — `completed`/`batteryNoticeShown`이 boolean이 아니면 그 필드만 false
  (020 `settings.ts` 방식).
- `saveOnboardingFlag`: 원자적 쓰기(`.writing` 임시 파일 → move, `notified-store.ts` 복제).

### 시드 (FR-010a) — 상태 전이

```
최초 loadOnboardingFlag() 호출 시:
  onboarding.json 있음?
    ├─ 예 → 그대로 파싱해서 반환
    └─ 아니오 → auto-diary.json 읽기 시도
                  ├─ batteryExceptionPrompted === true
                  │     → { completed: false, batteryNoticeShown: true } 반환
                  │       (파일에 쓰지는 않음 — 다음 save 때 기록)
                  └─ 그 외 (파일 없음/false/깨짐)
                        → DEFAULT_ONBOARDING_FLAG
```

- 시드 읽기는 `flag-port.ts`가 `auto-diary.json`을 **직접** 읽는다(경로 하드코딩,
  `schedule/settings.ts` import 금지 — `onboarding/`이 `schedule/`에 의존하지 않게).
- 1회성 — `onboarding.json`이 한 번 생기면 다시는 `auto-diary.json`을 안 본다.
- `auto-diary.json` 읽기 실패는 조용히 기본값(시드는 편의이지 필수 아님).

## §4 — `OnboardingDecision` (순수 판정 결과)

`src/onboarding/decision.ts`. **`new Date()`를 부르지 않고** 필요한 것을 인자로 받는다
(`day-boundary.ts`·`schedule/decision.ts` 규칙).

```ts
export type StepStatus = "satisfied" | "actionable" | "blocked" | "skipped-eligible";
//  satisfied         — granted 또는 limited (통과, FR-015)
//  actionable        — undetermined 또는 denied (인앱 "허용" 버튼이 유효)
//  blocked           — blocked (OS 설정으로만, 인앱 버튼 무효, FR-016)
//  skipped-eligible  — 사용자가 이 세션에서 "건너뛰기"를 눌렀다 (재조회 전까지)

export type OnboardingStep = {
  requirement: PermissionRequirement;
  status: StepStatus;
};

export function shouldShowOnboarding(flag: OnboardingFlag): boolean;
//  flag.completed !== true → true

export function planOnboardingSteps(input: {
  platform: "android" | "ios";
  requirements: readonly PermissionRequirement[];
  states: Partial<Record<PermissionKey, PermissionState>>;   // 실시간 조회 결과
  batteryNoticeShown: boolean;
  skippedThisSession: readonly PermissionKey[];
}): OnboardingStep[];
//  - platforms에 현재 platform이 없는 항목 제외 (FR-003)
//  - order 오름차순 정렬
//  - 각 항목의 status를 states/skipped로 판정
//  - battery-exception: batteryNoticeShown이면 "satisfied", 아니면 "actionable"

export function nextStep(steps: readonly OnboardingStep[]): OnboardingStep | null;
//  status가 "actionable" | "blocked"인 첫 항목 (order 순).
//  전부 satisfied/skipped-eligible이면 null → "시작하기" 활성화.
```

### 상태 전이 (온보딩 화면)

```
[플래그 로드] → shouldShowOnboarding?
   ├─ false → 탭 UI (온보딩 안 뜸)
   └─ true  → [권한 상태 조회] → planOnboardingSteps → nextStep
                 │
                 ├─ nextStep != null:
                 │     화면에 그 단계의 rationale + [허용] / [건너뛰기]
                 │       [허용]     → port.request*() → 응답 후 상태 재조회 → 재판정
                 │       [건너뛰기] → skippedThisSession에 추가 → 재판정
                 │
                 └─ nextStep == null:
                       [시작하기] 버튼 → saveOnboardingFlag({ completed: true,
                                          batteryNoticeShown: <현재값> }) → 탭 UI
```

- **뒤로 가기 없음**(spec Clarifications). `skippedThisSession`은 메모리에만 — 재조회
  전까지 그 단계를 건너뛴 것으로 표시하되, 앱을 다시 열면(온보딩 재노출은 안 되지만
  설정에서 재실행하면) 초기화된다.
- 단계 완료는 저장하지 않는다 — `planOnboardingSteps`가 매번 실시간 권한 상태로
  재판정(spec Clarifications, "별도 추적 없이").

## §5 — 설정 "권한" 섹션 상태 (`PermissionsSection.tsx`)

`src/ui/PermissionsSection.tsx` — `AutoDiarySettingsScreen`이 마운트. FR-017~020.

```ts
export type PermissionRow = {
  requirement: PermissionRequirement;
  state: PermissionState | BatteryExceptionState;
  /** 인앱 재요청이 유효한가 (actionable) vs. OS 설정으로만 (blocked) */
  canRequestInApp: boolean;
};
```

- 각 행: `requirement.rationale` 축약 + 현재 상태 + 동작
  - `canRequestInApp` → [허용] 버튼 (`port.request*`)
  - 아니면 → [설정 열기] (`osSettingsPort.openAppSettings()` 또는 배터리는
    `batteryPort.openSettingsList()`)
- `limited` 행: "그날 사진 전부를 보지 못할 수 있다" + [전체 허용] → 설정 열기 (FR-015).
- 배터리 행: 상태가 `unknown`이어도 항상 설명 + [배터리 예외 설정] 링크 상시 표시
  (FR-018).
- 섹션 하단: [온보딩 다시 하기] → App.tsx에 콜백 → `completed`를 false로 되돌리지 않고
  (플래그는 그대로), 온보딩 화면을 강제로 다시 마운트하는 별도 상태
  (`forceOnboarding: boolean`). 온보딩을 마치면 다시 탭 UI로.
- **포그라운드 복귀 재조회**(FR-020, SC-006): `AppState` `change` → `"active"`이면 모든
  권한 상태 재조회. `PermissionPanel`이 useEffect로 1회 조회하는 것을 `AppState`
  구독으로 확장.

## §6 — 020 `AutoDiarySettings` 변경

`src/schedule/settings.ts`:

```ts
// 제거 전
export type AutoDiarySettings = {
  enabled: boolean;
  targetHour: number;
  batteryExceptionPrompted: boolean;   // ← 삭제
};

// 제거 후
export type AutoDiarySettings = {
  enabled: boolean;
  targetHour: number;
};
```

- `DEFAULT_AUTO_DIARY_SETTINGS`에서 `batteryExceptionPrompted: false` 제거.
- `loadAutoDiarySettings`에서 그 필드 파싱 제거 — 알 수 없는 필드는 이미 무시됨(관대).
- `saveAutoDiarySettings`의 직렬화에서 제거.
- `settings-effects.ts` `applyToggleOn`: `batteryPort` 관련 3줄 제거,
  `SettingsEffectDeps`에서 `batteryPort` 필드 제거, `applyTargetHour`/`applyToggleOff`는
  변경 없음.
- 020 계약 테스트 중 `batteryExceptionPrompted`를 검사하던 부분 삭제/수정.

## §7 — 파일·디렉터리 요약

| 파일 | 용도 | 원자적 쓰기 | 새 저장 계층? |
|---|---|---|---|
| `files/preferences/onboarding.json` | `OnboardingFlag` (완료·배터리 안내) | 예 | 아니오 (기존 `preferences/`) |
| `files/preferences/auto-diary.json` | 020, `batteryExceptionPrompted` 필드만 제거 | 변경 없음 | — |

새 디렉터리 없음. `onboarding.json`은 `auto-diary.json`·`notified.json`과 같은
`preferences/` 아래.
