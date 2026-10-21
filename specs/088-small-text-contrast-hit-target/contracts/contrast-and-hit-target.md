# Contract: 작은 글자 대비·주간 스트립 요일·설정 토글 (088)

이 계약은 `spec.md`의 FR-001~FR-008 및 SC-001~SC-004를 코드·테스트 수준에서 검증하는 규칙(C1~C7)을 정의한다.

## C1 — 작은 강조 글자 다섯 자리의 색상 (FR-001)

다음 다섯 자리의 렌더링된 글자 스타일 `color`는 모두 `COLORS.danger`(`#ae1800`)여야 한다:

1. **홈 월 라벨** (`src/ui/DiaryListScreen.tsx`, `testID="home-month"`)
2. **홈 쓰는 중 상태 줄** (`src/ui/DiaryListScreen.tsx`, `testID="home-day-state"`, `writing` 활성 시)
3. **쓰는 중 지면 머리말** (`src/ui/WritingPaper.tsx`, `testID="writing-kicker"`)
4. **첫 만남 작명 표지** (`src/ui/WelcomeScreen.tsx`, `testID="welcome-kicker"`, `phase="welcome"`)
5. **설정·개발자·진단 묶음 머리** (`src/ui/SettingsScreen.tsx`의 `Group`, `testID="${testID}-label"`)

## C2 — `src/ui/` 내 글자색 `COLORS.accent` 금지 소스 계약 (FR-002)

- `src/ui/` 아래의 모든 `.ts`·`.tsx` 파일에서 블록 주석(`/* ... */`)과 줄 주석(`// ...`)을 제거한 뒤, 스타일 객체 프로퍼티로서 `color:\s*COLORS\.accent\b`가 **0건**이어야 한다.
- 예외:
  - 배경색(`backgroundColor: COLORS.accent`)
  - 테두리색(`borderColor: ... COLORS.accent`)
  - React Native `<ActivityIndicator color={COLORS.accent} />` JSX prop

## C3 — `COLORS.danger` 명암비 하한 (FR-003)

- `contrastRatio(COLORS.danger, COLORS.bg) >= 4.5` (`__tests__/theme-tokens.test.ts` DT4)
- `contrastRatio(COLORS.danger, WRITTEN_DAY.paper) >= 4.5` (`__tests__/theme-tokens.test.ts` 055 묶음)

## C4 — `DayPicker` 요일 약자 불투명도 제거 및 색상 분리 (FR-004, FR-005, FR-006, FR-007)

- `src/ui/DayPicker.tsx`에서:
  - `DOW` 스타일은 `{ fontSize: 10, letterSpacing: 0.6 }`이며 `opacity` 프로퍼티를 가지지 않는다.
  - 주석을 제거한 `src/ui/DayPicker.tsx` 소스에서 `opacity`는 미래 칸 비활성 스타일(`CELL_DIMMED = { opacity: 0.3 }`) 한 곳에만 존재하고 `DOW` 또는 `<AppText>`에는 존재하지 않는다.
  - 선택된 칸(`selected: true`)의 요일 약자 `color`는 `COLORS.accentForeground`(`#f3f2f2`)이고, 날짜 숫자 `color`도 `COLORS.accentForeground`다.
  - 선택되지 않은 칸(`selected: false`)의 요일 약자 `color`는 `DAY_STRIP.dowMuted`(`#5f5e5d`)이고, 날짜 숫자 `color`는 `COLORS.text`(`#201e1d`)다.

## C5 — `DAY_STRIP.dowMuted` 토큰 및 대비 하한 (FR-006)

- `src/ui/theme/tokens.ts`가 `DAY_STRIP = { dowMuted: "#5f5e5d" } as const`를 export한다.
- `Object.keys(COLORS)`는 9개 역할을 유지하며 `Object.values(COLORS)`는 `DAY_STRIP.dowMuted`를 포함하지 않는다.
- `contrastRatio(DAY_STRIP.dowMuted, COLORS.bg) >= 4.5` (실제 5.79:1).

## C6 — `Toggle` 세로 `hitSlop` 및 시각 크기 유지 (FR-008)

- `SETTINGS.toggle`은 `width: 44, height: 26, hitSlop: 9`를 가지며 `height + hitSlop * 2 === SETTINGS.row.minHeight`(44)를 만족한다.
- `src/ui/SettingsScreen.tsx`의 `Toggle` `Pressable`은:
  - 스타일에 `width: 44, height: 26`을 유지한다.
  - `hitSlop={{ top: 9, bottom: 9 }}`를 가진다.

## C7 — 위반 주입 검증 (SC-004)

1. 다섯 자리 중 한 자리(예: `DiaryListScreen.tsx`의 `home-month`)를 `color: COLORS.accent`로 되돌렸을 때 C2 소스 계약 테스트와 해당 화면 테스트가 실패함을 확인하고 복원한다.
2. `DayPicker.tsx`의 `DOW`에 `opacity: 0.7`을 넣었을 때 C4 테스트가 실패함을 확인하고 복원한다.
