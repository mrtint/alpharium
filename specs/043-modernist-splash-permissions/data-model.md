# Data Model: Modernist 스플래시·권한 요청 흐름

이 스펙은 새로운 영속 데이터 타입을 만들지 않는다(spec.md Key Entities).
아래는 화면이 읽기 전용으로 소비하는 기존 타입과, 이번 스펙에서 값만
바뀌는 디자인 토큰 타입을 정리한다.

## 기존 타입 (읽기 전용 소비, 무변경)

### `OnboardingFlag` (`src/onboarding/flag.ts`)

```ts
type OnboardingFlag = {
  completed: boolean;
  batteryNoticeShown: boolean;
  welcomeShown: boolean;
};
```

`App.tsx`가 읽어 `OnboardingScreen`에 prop으로 넘긴다. 이 스펙은 필드를
추가·제거하지 않는다.

### `PermissionRequirement` / `PermissionKey` (`src/onboarding/requirements.ts`)

```ts
type PermissionKey = "photos" | "location" | "notifications" | "battery-exception";

type PermissionRequirement = {
  key: PermissionKey;
  order: number;
  neededBy: string;
  platforms: readonly ("android" | "ios")[];
  rationale: string;
  ifDenied: string;
};
```

**이번 스펙의 유일한 로직 계층 변경(FR-017)**: `battery-exception` 항목의
`platforms` 필드를 `["android", "ios"]` → `["android"]`로 수정한다. 다른
필드·다른 항목은 무변경.

### `OnboardingStep` / `StepStatus` (`src/onboarding/decision.ts`)

```ts
type StepStatus = "satisfied" | "actionable" | "blocked" | "skipped-eligible";

type OnboardingStep = {
  requirement: PermissionRequirement;
  status: StepStatus;
};
```

`planOnboardingSteps()`/`nextStep()` 순수 함수 무변경 — 화면은 이 함수의
반환값을 그대로 쓴다.

## 디자인 토큰 (값 변경, 타입 구조 무변경)

### `COLORS` (`src/ui/theme/tokens.ts`)

타입 구조(9개 키의 `Record<string, string>`)는 그대로다 — `DT1`(정확히
9개 역할), `DT5`(tailwind 키 집합 동일성) 계약 테스트가 이를 강제한다.
바뀌는 것은 각 키의 **값**뿐이다.

| 키 | 이전 값 (032, 따뜻한 미니멀) | 새 값 (043, Modernist) |
|---|---|---|
| `bg` | `#FBF7F1` | `#f3f2f2` |
| `surface` | `#FFFFFF` | `#eae9e9` |
| `border` | `#E7DFD3` | `#9f9d9d` (divider 40% 불투명도를 bg 위에 합성한 불투명 근사, research R3 — DT1이 hex만 허용) |
| `text` | `#2A2521` | `#201e1d` |
| `textMuted` | `#6E6459` | `#6b6767` (research R2 — 원본 #7d7979에서 대비 조정) |
| `accent` | `#A8552F` | `#ec3013` |
| `accentForeground` | `#FFF8F2` | `#000000` (research R2 — accent 배경 위 4.5:1을 충족하는 값은 순검정뿐, 실사용처 없음) |
| `danger` | `#8F3A2C` | `#ae1800` |
| `dangerForeground` | `#FFF6F3` | `#f3f2f2` |

### `RADIUS` (`src/ui/theme/tokens.ts`)

| 키 | 이전 값 | 새 값 |
|---|---|---|
| `card` | `12` | `0` |
| `pill` | `999` | `0` |

### `Button` `primary` variant 배경 (`src/ui/components/Button.tsx`)

**변경 없음** — `BG.primary`는 그대로 `COLORS.accent`다(research R2 최종
결정). `accentForeground`를 순검정(`#000000`)으로 확정한 순간 `accent`
배경 + `accentForeground` 글자 조합 자체가 이미 5.00:1로 DT4를 통과하므로
배경색을 바꿀 필요가 없다. 구현 단계에서 한 차례 `danger`로 바꿨다가
`primary`·`danger` variant의 배경이 같아져 `button.test.tsx`의 "variant별로
다른 배경색" 계약이 깨지는 것을 발견해 원래 설계로 되돌렸다.

### `AuthorPicker`·`AutoDiarySettingsScreen`·`SelectRow`의 accent-as-text 교체

`Button` 밖에서 `accent`를 텍스트 색으로 직접 쓰는 세 자리
(`AuthorPicker.tsx`의 "작성자"·"이름 바꾸기"·"저장" 라벨,
`AutoDiarySettingsScreen.tsx`의 캡션 라벨, `SelectRow.tsx`의 선택 라벨)는
`color: COLORS.accent`를 `color: COLORS.danger`로 바꿨다 — 이 텍스트들은
`bg`(#f3f2f2) 위에 얹히므로 새 `accent` 값에서 대비 3.76:1로 미달이고,
`Button`과 달리 검정 글자로 바꾸기엔 캡션류 텍스트라 부자연스럽다. `danger`
(#ae1800) vs `bg` = 6.41:1로 충분하다.

## 상태 다이어그램 — 스플래시·권한 화면 전환 (변경 없음, 참고용)

```
[LogoScreen] --LOGO_DISPLAY_MS 경과--> [OnboardingScreen: 사진 단계]
  --즉시 자동 요청, 허용/거부--> [위치 단계]
  --즉시 자동 요청, 허용/거부--> [알림 단계]
  --즉시 자동 요청, 허용/거부--> [배터리 예외 단계: 기존 안내+버튼]
  --[설정 열기] 또는 [건너뛰기]--> [모든 단계 결정됨] --> (범위 밖: 작명/다운로드)
```

이 전환 자체(`shouldShowLogo`, `planOnboardingSteps`, `nextStep`,
`onAllStepsDecided`)는 021/040이 이미 구현했고 이번 스펙은 건드리지 않는다
— 바뀌는 것은 "사진/위치/알림 단계에서 설명 카드를 렌더하는가"라는 화면
조립(JSX) 층위뿐이다.
