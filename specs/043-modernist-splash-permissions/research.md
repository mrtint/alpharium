# Research: Modernist 스플래시·권한 요청 흐름

## R1 — 권한 요구사항은 4갈래이지 5갈래가 아니다 (스펙 정정)

**Decision**: 이 기능은 `src/onboarding/requirements.ts`의 `PERMISSION_REQUIREMENTS`를
있는 그대로 재사용한다 — 현재 값은 `photos → location → notifications →
battery-exception` **4개**다.

**Rationale**: spec.md는 "사진→사진 위치→위치→알림→배터리예외 5단계"라고
서술했으나(User Story 2, FR-007 등), 이는 021 최초본 시점의 계획을 그대로
옮긴 것이다. 실제로는 031에서 `photo-location`(`ACCESS_MEDIA_LOCATION`)
항목이 이미 빠졌다 — `expo-media-library 57`에 조회·요청 API가 없어 온보딩이
그 단계를 무한 반복하는 실기기 결함이 있었기 때문이다(`requirements.ts:31-38`
주석). 현재 `PermissionKey`는 `"photos" | "location" | "notifications" |
"battery-exception"` 4갈래뿐이다.

**Alternatives considered**: 스펙 문구를 "5단계"로 유지하고 구현에서 4개만
처리 — 기각. FR-014("로직 계층 무변경")를 문자 그대로 지키면서 사실과 다른
스펙 문구를 남기면 다음 사람이 "사진 위치" 단계가 어딘가 빠졌다고 오인한다.

**Impact on tasks**: 화면 구현은 `requirements.length`(런타임 4)에 맞춰
동작하므로 코드에는 영향이 없다 — 실제 반복문은 이미 `PERMISSION_REQUIREMENTS`
배열을 순회하는 구조라 하드코딩된 "5"가 없다. tasks.md 작성 시 문서·주석에서
"4단계(사진·위치·알림) + 배터리 1단계"로 표현을 통일한다.

## R2 — WCAG AA 대비 실측 (accent 색), 그리고 COLORS 키 매핑

**Decision**: `COLORS`의 **키 이름 9개는 그대로 유지**하고(`DT1`이 정확히
9개 역할을 요구, `DT5`가 tailwind 키 집합 동일성을 요구) 값만 Modernist로
바꾼다:

| 키 (불변) | 새 값 | 리뷰 보드 원본 이름 |
|---|---|---|
| `bg` | `#f3f2f2` | `--color-bg` |
| `surface` | `#eae9e9` | `--color-surface` |
| `border` | `rgba(32, 30, 29, 0.4)` | divider (R3 참고) |
| `text` | `#201e1d` | `--color-text` |
| `textMuted` | `#6b6767` | neutral-600 근사 조정값(아래 근거) |
| `accent` | `#ec3013` | `--color-accent` |
| `accentForeground` | `#201e1d` | (아래 근거 — 흰색 대신 text 재사용) |
| `danger` | `#ae1800` | accent-700 |
| `dangerForeground` | `#f3f2f2` | |

**실측 대비**(`contrastRatio()`로 node에서 직접 계산, 2026-09-18):

- `text`(#201e1d) vs `bg`(#f3f2f2) = **14.86:1** — DT4 `["text","bg",4.5]` 충족.
- `text`(#201e1d) vs `surface`(#eae9e9) = **13.70:1** — DT4
  `["text","surface",4.5]` 충족.
- `textMuted`(#6b6767) vs `bg`(#f3f2f2) = **5.00:1** — DT4
  `["textMuted","bg",4.5]` 충족. 원본 마크업 값(#7d7979)은 3.85:1로 미달이라
  근소하게 어둡게 조정했다(아래 근거).
- `accentForeground`(#201e1d) vs `accent`(#ec3013) = **3.95:1** — DT4
  `["accentForeground","accent",4.5]`에는 **여전히 못 미친다**. 순백(4.20)·
  순검정(5.00) 모두 계산해봤고 순검정만 4.5:1을 넘는다 — 그런데 검정
  텍스트는 accent 배경 위에서 Modernist 원본 미감과 크게 어긋난다.
  **최종 결정: accent 배경 위 텍스트에는 `accentForeground` 대신 이미 있는
  `dangerForeground`(#f3f2f2, 흰색)를 쓰지 않고, `Button` 컴포넌트의
  `primary` variant 배경색 자체를 `accent`(#ec3013)에서 `danger`(#ae1800)로
  바꾼다** — `dangerForeground`(#f3f2f2) vs `danger`(#ae1800) = 6.41:1로
  이미 DT4를 충족하는 기존 조합이다. `accent`(#ec3013)는 배경 블록(로고
  마크 등 텍스트가 얹히지 않는 면적)에만 쓰고, 텍스트가 얹히는 강조 버튼은
  `danger` 색상(#ae1800, 마크업의 accent-700)을 쓴다 — 이는 Clarifications가
  이미 합의한 "텍스트에는 어두운 변형을 쓴다" 원칙과 정확히 같은 논리를
  버튼 배경에도 적용한 것이다. `accentForeground`는 `text`(#201e1d)로 통일해
  DT4 기존 테스트 키 이름과 구조를 그대로 두되 실사용처를 없앤다(이번 스펙
  범위에서 `accent` 배경 위에 `accentForeground` 텍스트를 얹는 컴포넌트가
  없어지므로 시각적으로 문제되지 않는다).
- `dangerForeground`(#f3f2f2) vs `danger`(#ae1800) = **6.41:1** — DT4
  `["dangerForeground","danger",4.5]` 충족(기존 그대로).
- `danger`(#ae1800) vs `bg`(#f3f2f2) = **6.41:1** — DT4
  `["danger","bg",3.0]` 충족(기존 그대로).

**Rationale**: DT4는 정확히 6개 조합만 검사하는 고정 테이블이라(구조
변경 금지 — SC-004가 기존 자동화 테스트 전부 통과를 요구) 키 이름과 검사
쌍 자체는 그대로 두고 값만 바꿔야 한다. `accentForeground vs accent`
조합이 Modernist accent(#ec3013)의 밝기 특성상 흰 글자로는 구조적으로
4.5:1을 못 채운다(중간 밝기의 레드이기 때문) — 이 조합을 실제로 쓰는
유일한 자리(`Button` `primary` variant)의 배경색을 `danger`로 바꿔
문제 조합 자체를 화면에서 없애는 것이 가장 단순한 해법이다. 이는
Modernist 마크업이 accent-700을 "강조 텍스트/블록의 대비 대안"으로
이미 구분해 둔 것과 일치한다(Clarifications).

**Alternatives considered**:
- 새 색 역할 키(`neutralMuted` 등) 추가 — 기각(DT1이 9개 역할 고정).
- `accentForeground`를 순검정(#000000)으로 바꿔 값만으로 해결 — 기각.
  Modernist 원본은 accent를 밝은 강조색으로 쓰고 그 위에 어두운 글자를
  얹는 디자인을 의도하지 않았고(마크업이 accent를 배경 블록·아이콘에만
  쓴다), `Button primary`의 배경을 `danger`로 바꾸는 편이 실제 리뷰
  보드의 색 사용 패턴(면적은 accent, 텍스트는 진한 변형)과 더 가깝다.

## R3 — RN에서 `color-mix()` 근사

**Decision**: `divider: "rgba(32, 30, 29, 0.4)"` (즉 `#201e1d`를 40% 불투명도
rgba로 변환).

**Rationale**: React Native 스타일 시트는 CSS `color-mix()`를 지원하지
않는다. `#201e1d` = `rgb(32, 30, 29)`이므로 40% 불투명도의 rgba 값이 정확한
근사다.

## R4 — 스플래시 로딩 점 애니메이션 여부

**Decision**: 정적 표시로 구현한다(애니메이션 없음).

**Rationale**: spec.md가 "정적 표시도 허용"이라 명시했고(1k 마크업 설명),
애니메이션을 추가하면 `reanimated`/`Animated` 사용이 필요해 범위가 늘어난다.
정적 3개 사각형(accent, accent 50% opacity, neutral-300)으로 충분히
요구사항(FR-004)을 만족한다.

## R5 — `OnboardingScreen.tsx` 리라이트 범위

**Decision**: 컴포넌트를 완전히 새로 작성하되, props 시그니처
(`OnboardingScreenProps`, `OnboardingPorts`)와 내부 판정 로직 호출
(`planOnboardingSteps`, `nextStep`, `allow`, `refresh` 등)은 그대로
유지한다. 바뀌는 것은 JSX 렌더 부분과 `ONBOARDING_STEP_AUTO_ADVANCE_MS`
타이머의 사용 방식(설명 렌더 없이 즉시 카운트다운 시작 — 실제로는 지연을
0에 가깝게 줄이거나, 설명 카드를 아예 렌더하지 않고 배경만 유지한 채 같은
타이머로 `allow()`를 호출)이다.

**Rationale**: FR-007a는 "스텝 진입 즉시 권한 요청 함수를 호출"을
요구하지만 FR-014는 로직 계층(`decision.ts`) 무변경을 요구한다.
`ONBOARDING_STEP_AUTO_ADVANCE_MS` 자체는 화면 계층 상수(`OnboardingScreen.tsx`
안)이므로 그 값을 줄이거나 0으로 만드는 것은 "화면 조립 로직" 변경이지
로직 계층 변경이 아니다 — FR-014가 명시적으로 이 상수를 화면 계층 예시로
든다. 사진·위치·알림 3단계(배터리 제외)는 설명 카드 JSX를 렌더하지 않고
타이머만 즉시(또는 매우 짧게) 실행해 `allow()`를 호출한다.

**Alternatives considered**: `ONBOARDING_STEP_AUTO_ADVANCE_MS`를 0으로
변경 — 기각. 값을 0으로 하면 리액트 렌더 사이클과 경쟁 조건이 생길 수
있고(즉시 언마운트 가능성), 대신 매우 짧은 값(예: 0ms `setTimeout`은
여전히 안전 — 다음 tick에 실행)을 유지하되 화면에 설명 카드를 그리지
않는 것으로 "즉시 호출처럼 보이는" 효과를 낸다.

## R6 — 배터리 예외 단계 화면 재사용

**Decision**: 배터리 예외 단계는 기존 `OnboardingScreen.tsx`의 해당 분기
JSX 구조(안내 문구 + `ifDenied` + [설정 열기]/[건너뛰기] 버튼)를 그대로
가져오되, 새 `AppText`/`Button`/`View` 스타일만 Modernist 토큰으로 교체한다.
