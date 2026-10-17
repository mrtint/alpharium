# Research: 작은 글자 대비와 누름 영역 (088)

## R1 — 작은 강조 글자 다섯 자리(UX-07)의 색상과 소스 계약

- **Decision**: 다섯 자리(홈 월 라벨 `DiaryListScreen.tsx:449`, 홈 쓰는 중 상태 줄 `DiaryListScreen.tsx:1015`, 쓰는 중 머리말 `WritingPaper.tsx:60`, 첫 만남 작명 표지 `WelcomeScreen.tsx:326`, 설정·개발자·진단 묶음 머리 `SettingsScreen.tsx:288`)의 글자색을 `COLORS.danger`(`#ae1800`)로 바꾸고, `src/ui/` 전체 파일(주석 제거 후)에서 스타일 속성 `color:\s*COLORS\.accent`가 0건임을 계약 테스트로 잠근다.
- **Rationale**:
  - 다섯 자리 모두 11~13pt·600으로 WCAG 큰 글자(18pt 이상 또는 14pt·700 이상)에 해당하지 않는다.
  - `COLORS.accent`(`#ec3013`)는 `COLORS.bg`(`#f3f2f2`) 위 3.76:1, `WRITTEN_DAY.paper`(`#f8f4f4`) 위 3.85:1로 일반 글자 AA 기준(4.5:1) 미달이다.
  - `COLORS.danger`(`#ae1800`, 디자인 보드 `accent-700`과 같은 값, 043 FR-012 선례)는 `COLORS.bg` 위 **6.41:1**, `WRITTEN_DAY.paper` 위 **6.56:1**로 AA 기준을 넉넉히 넘기면서 `COLORS` 9개 역할(`DT1`)을 그대로 유지한다.
  - `DT4`(토큰 쌍 검사)만으로는 누군가 화면에서 다시 `color: COLORS.accent`를 쓰는 되돌림을 잡지 못하므로, `src/ui/` 소스를 읽는 계약(`color:\s*COLORS\.accent` 0건)과 다섯 화면 테스트의 컴포넌트 스타일 단언을 함께 둔다. `WelcomeScreen.tsx:120`의 `<ActivityIndicator color={COLORS.accent} size="large" />`는 JSX prop(`color={...}`)이라 스타일 속성(`color: COLORS.accent`) 정규식과 겹치지 않는다.
- **Alternatives considered**:
  - `COLORS`에 새 역할(`accentText`) 추가: `DT1`(9개 역할 고정)과 기존 토큰 분리 관례를 깨므로 기각.
  - `COLORS.textMuted`로 변경: 월 라벨·묶음 머리의 붉은 강세가 사라져 모더니스트 인상이 약해지므로 기각.
  - 보드 원문(`COLORS.accent`) 유지 + 3.0:1 잠금: 소유자가 대비 충족(`COLORS.danger`)을 선택함(Clarifications).

## R2 — 주간 스트립(`DayPicker`) 요일 약자 불투명도 제거와 합성 색상 토큰화 (UX-08)

- **Decision**: `src/ui/theme/tokens.ts`에 `DAY_STRIP = { dowMuted: "#5f5e5d" } as const`를 추가하고, `src/ui/DayPicker.tsx`의 `DOW`에서 `opacity: 0.7`을 제거한 뒤 요일 `AppText` 색상을 `selected ? COLORS.accentForeground : DAY_STRIP.dowMuted`로 지정한다. 글자 크기(10pt)와 자간(0.6)은 그대로 둔다.
- **Rationale**:
  - 기존 `DOW`의 `opacity: 0.7`이 선택 칸(`backgroundColor: COLORS.accent` `#ec3013`, 글자 `COLORS.accentForeground` `#f3f2f2`) 위에도 걸려 합성 색 `#f1b8af` → 대비 **2.44:1**로 043의 3.0:1 하한 아래로 내려갔다.
  - 불투명도 합성은 런타임 렌더링에서 일어나므로 hex 쌍만 검사하는 `theme-tokens.test.ts`가 잡지 못한다.
  - 선택 칸 요일에서 불투명도를 걷으면 `#f3f2f2` vs `#ec3013` = **3.76:1**(043 소유자 결정 하한 3.0:1 충족)이 된다.
  - 비선택 칸 요일은 `COLORS.text`(`#201e1d`)를 `COLORS.bg`(`#f3f2f2`) 위에 0.7 불투명도로 알파 합성한 값(`round(0x20 * 0.7 + 0xf3 * 0.3) = 0x5f`, `round(0x1e * 0.7 + 0xf2 * 0.3) = 0x5e`, `round(0x1d * 0.7 + 0xf2 * 0.3) = 0x5d` → `#5f5e5d`)을 불투명 상수로 두면 기존 화면과 픽셀 단위로 같으면서 `contrastRatio("#5f5e5d", "#f3f2f2") = 5.79:1`(AA 4.5:1 이상)을 `theme-tokens.test.ts`에서 직접 잠글 수 있다.
  - 051(`WRITTEN_DAY`)·055(`SETTINGS`)·064(`SIMULATION`) 선례대로 `COLORS` 9역할 밖의 부품 전용 토큰 객체(`DAY_STRIP`)에 둔다.
- **Alternatives considered**:
  - `DayPicker.tsx` 파일 내부 상수로 `#5f5e5d` 선언: 단일 출처(`tokens.ts`) 원칙을 어기고 `theme-tokens.test.ts`에서 검증할 수 없어 기각.
  - 비선택 칸 요일에 `COLORS.textMuted`(`#6b6767`, 5.00:1) 사용: 기존 합성값(`#5f5e5d`)보다 흐려져 비선택 칸 인상이 달라지므로 기각.

## R3 — 설정 토글(`Toggle`) 세로 확장 누름 영역 (UX-10)

- **Decision**: `SETTINGS.toggle`에 `hitSlop: 9`를 추가하고, `src/ui/SettingsScreen.tsx`의 `Toggle` `Pressable`에 `hitSlop={{ top: toggle.hitSlop, bottom: toggle.hitSlop }}`를 전달한다.
- **Rationale**:
  - `Toggle`의 시각 크기는 44×26dp(055 FR-018)이고, 설정의 「자동으로 쓰기」 행과 개발자 화면의 상태 흉내 행은 행 전체 `onPress` 없이 오른쪽 `Toggle`만 눌린다.
  - 위·아래 각 9dp의 `hitSlop`을 더하면 세로 터치 반응 높이가 `26 + 9 × 2 = 44dp`가 되어 부모 `Row`의 최소 높이(`44dp`)와 정확히 일치하며 이웃 행을 침범하지 않는다.
- **Alternatives considered**:
  - 토글의 시각 높이를 44dp로 확대: 보드 `6c` 및 055 FR-018(44×26)을 깨뜨리므로 기각.
  - 달력 `‹ ›` 버튼(40×40dp)도 함께 `hitSlop` 추가: RN의 `hitSlop`은 부모 뷰(`HEADER`, 높이 40dp) 바깥으로 확장되지 않아 레이아웃 높이를 바꾸지 않고는 세로 확장이 동작하지 않으므로 범위에서 제외.
