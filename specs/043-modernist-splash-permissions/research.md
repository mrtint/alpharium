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
| `accentForeground` | `#000000` | (아래 근거 — DT4가 값 자체를 검사, 순검정만 4.5:1 충족) |
| `danger` | `#ae1800` | accent-700 |
| `dangerForeground` | `#f3f2f2` | |

**실측 대비**(`contrastRatio()`로 node에서 직접 계산, 2026-09-18):

- `text`(#201e1d) vs `bg`(#f3f2f2) = **14.86:1** — DT4 `["text","bg",4.5]` 충족.
- `text`(#201e1d) vs `surface`(#eae9e9) = **13.70:1** — DT4
  `["text","surface",4.5]` 충족.
- `textMuted`(#6b6767) vs `bg`(#f3f2f2) = **5.00:1** — DT4
  `["textMuted","bg",4.5]` 충족. 원본 마크업 값(#7d7979)은 3.85:1로 미달이라
  근소하게 어둡게 조정했다(아래 근거).
- `accentForeground` vs `accent`(#ec3013) — **DT4는 `COLORS.accentForeground`와
  `COLORS.accent`의 값을 직접 비교하는 값 레벨 테스트다**(실사용처
  유무와 무관하게 항상 실행된다) — 실사용처를 없애는 것만으로는 이
  테스트 자체가 통과하지 않는다(1차 재검토에서 "text(#201e1d)로 통일하면
  실사용처가 없어지니 문제없다"고 판단했던 것은 **오류**였다 — 재계산
  결과 `#201e1d` vs `#ec3013` = 3.95:1로 여전히 미달, 2차 analyze
  재검토에서 발견). 값 자체가 4.5:1을 충족해야 하며, 순백(4.20:1)·
  근사 어두운 값(#201e1d, 3.95:1) 모두 미달이고 **순검정(#000000,
  5.00:1)만 충족한다**. **최종 결정: `accentForeground = #000000`**.
  화면 렌더 측면에서는 `Button` `primary` variant 배경 자체를 `accent`
  에서 `danger`로 바꾸므로(아래) `accentForeground`를 실제로 accent
  배경 위에 렌더하는 컴포넌트가 이번 스펙 범위에는 없다 — 값은 DT4
  통과만을 위해 존재하는 상태가 되며, 이는 기존 032 팔레트에서도
  `accentForeground`가 정확히 이 역할(accent 배경 위 대비 보장용
  상수)이었던 것과 같은 성격이다.
  **구현 단계 재발견(T005 이후 실제 렌더 회귀에서 확인)**: `accentForeground`
  를 순검정으로 확정한 순간 `accent` 배경 + `accentForeground` 글자 조합
  자체가 이미 5.00:1로 DT4를 통과한다 — 즉 `Button` `primary` variant의
  배경을 `danger`로 바꿀 필요가 애초에 없었다. 처음 시도한 대로 `primary`
  배경을 `danger`로 바꿨더니 기존 계약 테스트(`button.test.tsx`의 "variant별로
  다른 배경색이 style에 실린다")가 실패했다 — `primary`와 `danger` variant가
  똑같은 배경색을 갖게 되어 두 variant를 구분할 시각적 차이가 사라졌기
  때문이다. **최종 결정: `Button` `primary`는 원래 설계(`accent` 배경 +
  `accentForeground` 글자)를 그대로 유지한다.** `accentForeground`를
  순검정으로 확정한 것만으로 이 조합이 이미 유효해졌으므로 별도 색 교체가
  불필요했다 — R2 앞부분의 "Button 배경을 danger로 바꾼다"는 결정은
  구현 단계에서 폐기됐다.
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

**Decision**: `border: "#9f9d9d"` (불투명 hex — 아래 근거로 rgba에서 변경).

**Rationale**: React Native 스타일 시트는 CSS `color-mix()`를 지원하지
않는다. 처음에는 `#201e1d`를 40% 불투명도로 표현한 `rgba(32, 30, 29, 0.4)`를
그대로 쓰려 했으나, **구현 착수 후(T005) `__tests__/theme-tokens.test.ts`의
DT1("각 값이 #rrggbb hex 문자열이다")이 이를 거부한다는 것을 발견했다** —
`COLORS`의 모든 값은 `/^#[0-9A-Fa-f]{6}$/` 형식이어야 한다(rgba 불허). 마크업의
divider(`#201e1d` 40% 불투명도)를 `bg`(#f3f2f2) 위에 알파 합성해 얻은 불투명
근사값이 `#9f9d9d`다(`fg*a + bg*(1-a)` 채널별 계산). 시각적으로 원본과
거의 동일하되 DT1 계약을 만족한다.

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
