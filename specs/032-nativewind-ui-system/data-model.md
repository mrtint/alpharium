# Data Model: NativeWind + React Native Reusables 기반 미니멀 UI 시스템

**Feature**: 032-nativewind-ui-system
**Date**: 2026-09-03
**Phase**: 1 (Design & Contracts)

이 스펙은 **새 런타임 데이터 모델(엔티티·저장 필드·신호)을 도입하지 않는다**
(spec FR-022, Key Entities "해당 없음"). 여기서 "모델"은 **디자인 시스템의
정적 구조** — 토큰과 재사용 컴포넌트의 형태 — 를 뜻한다.

---

## 1. 디자인 토큰 (`src/ui/theme/tokens.ts`)

**성격**: 사람이 정한 `readonly` 상수. 코드가 값을 계산하지 않는다(헌법 원칙 V,
012 `USER_VISIBLE_SIGNAL_AXES`·021 `PERMISSION_REQUIREMENTS` 선례). 통로가 생기면
(= 디자인 방향이 바뀌면) 사람이 이 파일을 고친다.

### 1.1 색 역할 토큰 (`COLORS`)

| 역할 키 | 의미 | 라이트 값(방향 — 최종은 실기기 육안) | 대비 제약 |
|---|---|---|---|
| `bg` | 화면 배경 | 따뜻한 오프화이트 (예 `#FBF8F3`) | — |
| `surface` | 카드·행 배경 | 배경과 같거나 살짝 밝음 (예 `#FFFFFF` 또는 `#FDFBF7`) | — |
| `border` | 구분선·경계 (hairline) | 저채도 웜 그레이 (예 `#E4DdD2`) | — |
| `text` | 본문 글자 | 브라운블랙 (예 `#2A2621`) | **vs `bg` ≥ 4.5:1**, vs `surface` ≥ 4.5:1 |
| `textMuted` | 보조·캡션 | 웜 그레이 (예 `#6B6459`) | vs `bg` ≥ 4.5:1 (본문 크기 캡션이므로) |
| `accent` | 주요 버튼·강조 배경 | 절제된 테라코타 (예 `#B5623C`) | — |
| `accentForeground` | `accent` 위 글자 | 오프화이트 (예 `#FFF8F2`) | **vs `accent` ≥ 4.5:1** |
| `danger` | 삭제·되돌릴 수 없는 동작 | 차분한 벽돌색 (예 `#9E3B2E`) | vs `bg` ≥ 3:1 (버튼 배경/테두리) |
| `dangerForeground` | `danger` 위 글자 | 오프화이트 | **vs `danger` ≥ 4.5:1** |

> 위 hex는 **방향 예시**다. 실제 값은 R4/quickstart의 대비 계산 + SM-S928N 육안
> 1패스로 확정한다. "한 축을 깊게 파지 않는다"(헌법 개발 방식) — 반복 미세조정
> 금지.

### 1.2 간격·크기 상수

| 키 | 값 | 용도 |
|---|---|---|
| `space` | tailwind 기본 4px 그리드 (`1`=4 … `6`=24) | padding·gap. 별도 재정의 안 함 |
| `radius.card` | 12 | 카드·행·버튼 모서리 |
| `radius.pill` | 999 | 알약형 |
| `hairline` | `StyleSheet.hairlineWidth` | 경계선 두께 (기존 코드가 이미 씀) |
| `elevation.flat` | 0 | 그림자 없음 (기본) |
| `elevation.raised` | 1~2 | 살짝 뜬 카드 (안드로이드에서 과하지 않게) |

### 1.3 타이포그래피 상수 (`TYPE`)

서체는 **시스템 기본**(spec Clarifications, FR-019a). 크기·굵기·행간·자간만.

| 키 | fontSize | fontWeight | lineHeight | 용도 |
|---|---|---|---|---|
| `title` | 20 | "600" | 28 | 화면 제목 |
| `sectionTitle` | 16 | "600" | 22 | 섹션 헤더 |
| `body` | 15 | "400" | 22 | 본문·행 라벨 |
| `bodyStrong` | 15 | "600" | 22 | 강조 본문 |
| `caption` | 13 | "400" | 19 | 보조 설명 (`textMuted`와 짝) |
| `button` | 15 | "600" | 20 | 버튼 라벨 |

### 1.4 WCAG 대비 계산 헬퍼

`contrastRatio(hexA: string, hexB: string): number` — 순수 함수. sRGB →
상대 휘도 → (L1+0.05)/(L2+0.05). `theme-tokens.test.ts`가 1.1의 "대비 제약"
열을 이 함수로 검증한다(빌드 시 검사, 모델 출력 채점 아님 — 원칙 IV 무관).

### 1.5 `tailwind.config.js`와의 관계

`tailwind.config.js`는 `tokens.ts`를 `require`해 `theme.extend.colors` /
`borderRadius` / `fontSize`를 구성한다. **값을 두 번 쓰지 않는다** — `tokens.ts`가
단일 출처(018 `promptPrefix()` 바이트 동일성 교훈). `theme-tokens.test.ts`가
`tailwind.config.js`의 색 키 집합 == `tokens.ts`의 `COLORS` 키 집합을 잠근다.

### 1.6 다크 모드

`tokens.ts`는 **라이트 값만** 정의한다(spec FR-003·FR-019). 구조는 다크 값을
나중에 `COLORS_DARK` 같은 형제로 얹을 수 있게 역할 키를 씀. `tailwind.config.js`
`darkMode: "class"` + `dark:` variant 미사용(research R3).

---

## 2. 재사용 컴포넌트 (`src/ui/components/*.tsx`)

**성격**: 저장소 소유(shadcn 스타일 — RN Reusables를 통째로 설치하지 않음,
research R5). 각 컴포넌트는 `className`(NativeWind) + `tokens.ts` 참조로만 스타일.
네이티브 링크 없음(FR-005). 각각 `.tsx` 계약 테스트(FR-006).

| 컴포넌트 | 핵심 prop | 변형 | 상호작용 구현 | testID |
|---|---|---|---|---|
| `Button` | `variant`, `onPress`, `disabled`, `children` | `primary` / `secondary` / `danger` | RN `Pressable` | prop으로 받음 |
| `Card` | `children`, `style?` | — (`Section`은 `title?` 추가) | 없음 (`View`) | prop |
| `ListRow` | `label`, `value?` / `right?`, `onPress?`, `chevron?` | 눌림 가능/불가 | `Pressable` 또는 `View` | prop (필수 — Maestro) |
| `SectionHeader` | `children` | — | 없음 (`Text`) | prop |
| `Text` 세트 | `variant`, `children` | `Title` / `Body` / `Caption` (또는 단일 `Text`에 `variant`) | 없음 | prop |
| `Toggle` | `value`, `onValueChange`, `disabled?` | on/off | RN 코어 `Switch` 래퍼 | prop |
| `SelectRow` | `label`, `options`, `selectedIndex`, `onSelect`, `disabledIndices?` | 선택/미선택/비활성 | `Pressable` per option | prop (`${testID}-option-${i}`) |

### 2.1 공통 계약

- **토큰만 참조**: 원시 hex·매직 px 금지(SC-001). `className`에 `bg-bg`,
  `text-text`, `p-4`, `rounded-card` 등 토큰 유래 클래스만.
- **색 스킴 미감지**: `useColorScheme`·`Appearance` import 금지(031 계약 테스트가
  `src/ui/components/`까지 확장 검사 — R7).
- **`testID` 통과**: 모든 컴포넌트가 `testID` prop을 받아 루트 요소에 전달
  (Maestro·기존 `.tsx` 테스트 호환 — FR-018, research R11).
- **접근성**: `Button`/`ListRow`(누름 가능)/`SelectRow`는 `accessibilityRole`,
  `accessibilityState`(selected/disabled) 유지. 025 교훈 — 위치/상태 텍스트가
  여러 조각이면 `accessibilityLabel` 병행.
- **모델·프롬프트·지표 무관**: 컴포넌트는 순수 표현. `diary/*`·`models/*`·
  `inference/*` import 안 함.

### 2.2 상태 전이

없음 — 컴포넌트는 controlled(부모가 상태 소유). `Toggle`/`SelectRow`는 `value`/
`selectedIndex`를 prop으로 받고 콜백만 호출(009 "고른 하루를 파일에 안 남긴다",
025 갤러리 상태와 같은 성격 — 표현 계층은 상태를 소유하지 않는다).

---

## 3. 화면 이관 시 불변식 (엔티티가 아니라 제약)

이관되는 5개 화면군(`contracts/screen-migration.md` 상세):

| 화면 | 불변식 (표현만 바뀜) |
|---|---|
| `DiaryListScreen` | `onWrite`는 인자 없음(원칙 I), 사진 갈래 `known`/`none`/`unknown` 3문구 유지(원칙 V), 모델·지표 미노출, 기존 `testID`(`day-<date>`, `denied-notices`) 유지 |
| `DiaryDetailScreen` | 025 슬라이더·갤러리(`photo-slider-*`, `photo-gallery-*`, `N / M`) 동작 유지, 017 사진 0장("사진: 없었다")·사본 실패("이 사진은 이제 없다", `diary-photo-missing`) 유지, 사후 소요시간 1회성 표기 규칙(원칙 IV 1.2.0) 유지 |
| `DiaryHomeScreen` 생성 중 뷰 | 회전 표시 + "그만두기"만, 진행률 숫자·경과 시간·생성 중인 글 미표시(005 FR-028b, 015·016) |
| `OnboardingScreen` + 에셋 단계 | 권한 단계 순서·문안·건너뛰기 가능성(021·031) 유지, 에셋 다운로드 합산 진행률·항목별 나열 없음·완료 전 "시작하기" 비활성(029) 유지 |
| 설정 탭 조립 | "일기 작성자"는 persona 이름·소개만(원칙 III, `author-picker`/`author-option-<i>` 유지), 자동 생성 시각 시 단위(0–23)·정밀도 암시 문구 없음(020), 권한 5행 라이브 상태·OS 링크·복귀 갱신(021 SC-006) 유지 |

---

## 4. 파일·테스트 편입 (jest 두 프로젝트)

| 새 파일 | 확장자 | jest 프로젝트 | 근거 |
|---|---|---|---|
| `src/ui/theme/tokens.ts` | `.ts` | (소스, 테스트 아님) | 순수 값 |
| `__tests__/theme-tokens.test.ts` | `.ts` | `logic` | RN 런타임 불필요, 대비 계산 |
| `src/ui/components/*.tsx` | `.tsx` | (소스) | RN 컴포넌트 |
| `__tests__/ui/*.test.tsx` (7개) | `.tsx` | `ui` | `render()` 필요 |
| `__tests__/nativewind-transform.test.tsx` | `.tsx` | `ui` | `className` 렌더 확인 (R8) |

`jest-projects.test.ts` 파일 수 가드가 위 편입을 자동 확인. 새 하위 폴더
(`__tests__/components/`)를 만들지 않고 기존 `__tests__/ui/` 평면 구조를 따른다
(`testMatch` `<rootDir>/__tests__/**/*.test.tsx`가 이미 커버).
