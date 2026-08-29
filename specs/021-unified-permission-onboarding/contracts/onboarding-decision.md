# Contract: 온보딩 진행 판정 (`src/onboarding/decision.ts`)

온보딩을 띄울지, 다음에 어느 단계를 제시할지, 각 단계가 완료됐는지를 정하는 **순수
함수**. 기기에 닿지 않는다. 관련: FR-005·006·008·013·015·016, spec Clarifications(고정
순서·뒤로 가기 없음·실시간 재판정).

## D1 — `new Date()` 금지

`decision.ts`의 어떤 함수도 안에서 `new Date()`·`Date.now()`를 부르지 않는다
(`day-boundary.ts`·`schedule/decision.ts`와 같은 규칙). 온보딩 판정은 시각에 의존하지
않으므로 시각 인자도 필요 없다 — 순수하게 (플래그, 권한 상태, 플랫폼)의 함수.

## D2 — `shouldShowOnboarding`

```ts
export function shouldShowOnboarding(flag: OnboardingFlag): boolean;
```

- `flag.completed !== true` → `true`. 그 외 `false`.
- **`completed` 하나만 본다** — `batteryNoticeShown`은 온보딩 재노출과 무관.

## D3 — `StepStatus` 판정 규칙

| `PermissionState` | 세션에서 건너뜀? | `StepStatus` |
|---|---|---|
| `granted` | — | `satisfied` |
| `limited` | — | `satisfied` (FR-015 — 부분 허용도 통과) |
| `undetermined` | 아니오 | `actionable` |
| `denied` | 아니오 | `actionable` (다시 요청 가능) |
| `blocked` | — | `blocked` (OS 설정으로만, FR-016) |
| 임의 | 예 | `skipped-eligible` |

- `blocked`는 건너뜀 여부와 무관하게 `blocked` (인앱 버튼이 무효라는 사실이 우선).
- `battery-exception` 항목: `PermissionState` 대신 `batteryNoticeShown` 사용 —
  `true` → `satisfied`, `false` → `actionable`, 단 이 세션에서 건너뛰었으면
  `skipped-eligible`. `blocked` 상태 없음(배터리 예외는 인텐트이지 권한 창이 아님).

## D4 — `planOnboardingSteps`

```ts
export function planOnboardingSteps(input: {
  platform: "android" | "ios";
  requirements: readonly PermissionRequirement[];
  states: Partial<Record<PermissionKey, PermissionState>>;
  batteryNoticeShown: boolean;
  skippedThisSession: readonly PermissionKey[];
}): OnboardingStep[];
```

1. `requirements`에서 `platforms`에 `input.platform`이 없는 항목 제외 (FR-003).
2. `order` 오름차순 정렬.
3. 각 항목의 `status`를 D3으로 판정.
   - `states[key]`가 `undefined`(아직 조회 안 됨)면 `actionable`로 간주(안전한 기본 —
     사용자가 볼 수 있게).
4. 반환은 그 `OnboardingStep[]`.

- **순수** — 입력이 같으면 출력이 같다. 조회는 화면이 하고 결과만 넘긴다.

## D5 — `nextStep`

```ts
export function nextStep(steps: readonly OnboardingStep[]): OnboardingStep | null;
```

- `status`가 `"actionable"` 또는 `"blocked"`인 **첫**(order 순) 항목.
- 전부 `"satisfied"` 또는 `"skipped-eligible"`이면 `null` → 화면이 [시작하기] 활성화.
- `"blocked"`도 "다음 단계"로 제시된다 — 사용자가 그 화면에서 OS 설정 링크를 보고
  건너뛸 수 있어야 하므로(막다른 길 금지, 원칙 II).

## D6 — 계약 테스트 (`__tests__/onboarding-decision.test.ts`)

**조합 커버리지(SC-007)** — 5개 `PermissionState` × (건너뜀/아님) × 목록의 각 항목을
직접 센다. 최소:

1. `shouldShowOnboarding`: `completed` true/false/undefined 3갈래.
2. `planOnboardingSteps`:
   - `platform: "ios"`일 때 `platforms: ["android"]` 항목이 빠진다(그 반대도).
   - 5개 상태 각각이 올바른 `StepStatus`로 매핑된다(D3 표 전체).
   - `skippedThisSession`에 든 key가 `skipped-eligible`(단 `blocked`는 예외).
   - `battery-exception`이 `batteryNoticeShown`으로 판정된다(`states`에 그 key가 없어도).
   - 정렬이 `order` 순.
3. `nextStep`:
   - 첫 `actionable`을 고른다.
   - 첫 `blocked`도 고른다(actionable이 뒤에 있어도 order가 앞이면 blocked 먼저).
   - 전부 satisfied면 `null`.
4. **소스 읽기 계약**: `decision.ts`가 `expo-*`·`react-native`·`diary/`·`models/`·
   `schedule/`를 import하지 않음(순수 판정).
5. `decision.ts`에 `new Date(`·`Date.now(` 문자열이 없음(D1).
