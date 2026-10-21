# 작은 글자 대비와 누름 영역 — accent 글자·선택 칸 요일·설정 토글

로드맵 과제 「작은 글자 대비와 누름 영역 — accent 글자·선택 칸 요일·설정 토글」(2026-10-17 brainstorming, 소유자 승인 — 방식 A).
출처: `docs/pocketlog-usability-review/ux-task-candidates.md` UX-07 · UX-08 · UX-10.

## 배경과 코드 사실

테스트가 잠그지 않던 접근성 사각지대 셋을 고치고 계약 테스트로 잠근다(대비 수치는 WCAG 2.1 상대 명암비 공식 계산값이며 실기기 측정이 아니다 — 원칙 V).

1. **UX-07 — 밝은 배경 위 작은 `COLORS.accent` 글자 다섯 자리**:
   - 홈 월 라벨(`src/ui/DiaryListScreen.tsx:449`, 11pt·600, `COLORS.bg` 위 **3.76:1**)
   - 홈 「쓰는 중」 상태 줄(`src/ui/DiaryListScreen.tsx:1015`, 13pt·600, `COLORS.bg` 위 **3.76:1**)
   - 쓰는 중 머리말(`src/ui/WritingPaper.tsx:60`, 11pt·600, `COLORS.bg` 위 **3.76:1**)
   - 첫 만남 작명 표지(`src/ui/WelcomeScreen.tsx:326`, 11pt·600, `COLORS.bg` 위 **3.76:1**)
   - 설정·개발자·진단 묶음 머리 `Group`(`src/ui/SettingsScreen.tsx:288`, 11pt·600, `WRITTEN_DAY.paper` 위 **3.85:1**)
   - 다섯 자리 모두 WCAG 큰 글자(18pt 이상 또는 14pt·700 이상)에 해당하지 않아 일반 글자 AA 기준(4.5:1) 미달이다. `__tests__/theme-tokens.test.ts` DT4는 `accentForeground` vs `accent`(3.0:1, 043 소유자 결정)만 잠그고 `accent`를 글자색으로 쓰는 반대 방향 쌍은 잠그지 않았다.

2. **UX-08 — 주간 스트립 선택 칸 요일 약자의 실효 대비 2.44:1**:
   - `src/ui/DayPicker.tsx:208`의 `DOW = { fontSize: 10, letterSpacing: 0.6, opacity: 0.7 }`이 선택 칸(`COLORS.accent` 면, 글자 `COLORS.accentForeground`)에도 걸려 합성 실효색 `#f1b8af` → `COLORS.accent` 대비 **2.44:1**로 떨어진다.
   - 043이 세운 모든 대비 하한(3.0:1, DT4) 아래이며, 불투명도 합성이라 hex 쌍만 보는 DT4가 잡지 못한다.
   - 선택 안 된 칸은 `COLORS.bg`(`#f3f2f2`) 위 `COLORS.text`(`#201e1d`)의 0.7 합성값 `#5f5e5d`로 **5.79:1**(AA 충족)이다.

3. **UX-10 — 설정 토글(44×26)에 세로 `hitSlop` 없음**:
   - `src/ui/SettingsScreen.tsx:517-542`의 `Toggle`은 44×26(`SETTINGS.toggle`)이고 `hitSlop`이 없다. 「자동으로 쓰기」 행은 `onPress`가 없어 26dp 높이의 토글만 눌린다(부모 `Row` 최소 높이는 44dp).

## 목표와 범위

1. **UX-07**: 다섯 자리의 글자색을 `COLORS.danger`(`#ae1800` — 보드 `accent-700`, `COLORS.bg` 위 **6.41:1**, `WRITTEN_DAY.paper` 위 **6.56:1**, 043 FR-012 선례)로 바꾸고(소유자 보드 이탈 승인), `src/ui/` 안에서 `COLORS.accent`를 글자 스타일 `color`로 쓰는 일이 0건임을 소스 계약으로 잠근다.
2. **UX-08**: `DayPicker.tsx`에서 `DOW`의 `opacity: 0.7`을 걷고(소유자 보드 `1d` 이탈 승인) 색으로 바꾼다 — 선택 칸은 `COLORS.accentForeground`(**3.76:1**, 043 결정값), 선택 안 된 칸은 0.7 합성값 불투명 hex `DAY_STRIP.dowMuted`(`#5f5e5d`, 픽셀 동일, **5.79:1**). 글자 크기(10pt)는 바꾸지 않는다.
3. **UX-10**: `Toggle`의 `Pressable`에 `hitSlop={{ top: 9, bottom: 9 }}`(`SETTINGS.toggle.hitSlop = 9` → 세로 누름 영역 26 + 18 = 44dp)를 더한다. 시각 크기는 44×26 그대로 둔다(055 FR-018 유지). `Toggle`을 공유하는 개발자 화면 상태 흉내 토글도 함께 적용된다.

**범위 밖**:
- `COLORS` 아홉 역할 키(`DT1`) 변경·추가 없음.
- 설정 「허용 안 함」 꼬리표의 `borderColor: COLORS.accent`(`SettingsScreen.tsx:448`), `WelcomeScreen.tsx:120`의 `<ActivityIndicator color={COLORS.accent} />`, `backgroundColor: COLORS.accent` 면은 바꾸지 않는다.
- 주간 스트립·달력·상태 흉내 달력의 요일 글자 크기(10pt) 변경 없음.
- 달력 `‹ ›` 버튼(부모 `HEADER` 높이 40dp 한계), 온보딩 「건너뛰기」, 홈 실패 화면 뒤로 버튼은 건드리지 않는다.

## 설계

### 1. 토큰 (`src/ui/theme/tokens.ts`)

- `COLORS` 아홉 역할은 그대로 둔다(DT1).
- 주간 스트립 전용 토큰 객체를 더한다(051 `WRITTEN_DAY`·055 `SETTINGS`·064 `SIMULATION`과 같은 방식):
  ```ts
  export const DAY_STRIP = {
    /** 비선택 칸 요일 약자 — 보드 1d의 text(#201e1d) opacity 0.7을 bg(#f3f2f2) 위에 합성한 불투명 hex (vs bg 5.79:1) */
    dowMuted: "#5f5e5d",
  } as const;
  ```
- `SETTINGS.toggle`에 세로 확장 폭 `hitSlop: 9`를 더한다(`26 + 9 * 2 = 44`, 부모 `Row` 최소 높이 `44`와 일치):
  ```ts
  toggle: { width: 44, height: 26, padding: 3, knob: 20, knobOff: COLORS.textMuted, hitSlop: 9 },
  ```

### 2. UX-07 — 다섯 자리 글자색 교체

- `src/ui/DiaryListScreen.tsx:449` (`testID="home-month"`): `color: COLORS.accent` → `color: COLORS.danger`
- `src/ui/DiaryListScreen.tsx:1015` (`WRITING_STATE`, `testID="home-day-state"` 쓰는 중): `color: COLORS.accent` → `color: COLORS.danger`
- `src/ui/WritingPaper.tsx:60` (`testID="writing-kicker"`): `color: COLORS.accent` → `color: COLORS.danger`
- `src/ui/WelcomeScreen.tsx:326` (`KICKER`, `testID="welcome-kicker"`): `color: COLORS.accent` → `color: COLORS.danger`
- `src/ui/SettingsScreen.tsx:288` (`Group` 묶음 머리, `testID="${testID}-label"`): `color: COLORS.accent` → `color: COLORS.danger`

### 3. UX-08 — `DayPicker` 요일 약자 불투명도 제거 및 색상 분리 (`src/ui/DayPicker.tsx`)

- `DOW`에서 `opacity: 0.7`을 뺀다:
  ```ts
  const DOW = { fontSize: 10, letterSpacing: 0.6 } as const;
  ```
- 칸 렌더링에서 요일 글자 색을 `dowFg`로 분리한다:
  ```ts
  const fg = selected ? COLORS.accentForeground : COLORS.text;
  const dowFg = selected ? COLORS.accentForeground : DAY_STRIP.dowMuted;
  ```
  - 요일 `AppText`: `style={[DOW, { color: dowFg }]}`
  - 날짜 숫자 `AppText`: `style={[NUM, { color: fg }]}` (기존 그대로)
- 부수 효과: 미래 칸(`selectable === false`, 칸 `CELL_DIMMED` `opacity: 0.3`)의 요일 실효 불투명도가 `0.3 × 0.7 = 0.21`에서 `0.3`(날짜 숫자와 동일)이 된다. 칸 자체의 `opacity: 0.3`(049 S3 계약)은 그대로다.

### 4. UX-10 — `Toggle` 세로 `hitSlop` (`src/ui/SettingsScreen.tsx`)

- `Toggle`의 `Pressable`에 `hitSlop={{ top: toggle.hitSlop, bottom: toggle.hitSlop }}`를 준다.
- 시각 스타일(`width: 44, height: 26, padding: 3`)과 `testID`는 그대로 둔다.

### 5. 테스트 (기기 없음)

1. **`__tests__/theme-tokens.test.ts`**:
   - DT4: `["danger", "bg", 4.5]`로 하한을 3.0 → 4.5로 높인다(실제 6.41:1).
   - 055 설정 면 대비: 묶음 머리·「허용 안 함」 글자 `COLORS.danger` vs `WRITTEN_DAY.paper` ≥ 4.5(이미 220행에 있으며 주석·설명 보강).
   - 주간 스트립 대비: `DAY_STRIP.dowMuted` vs `COLORS.bg` ≥ 4.5, `Object.values(COLORS)`에 `DAY_STRIP.dowMuted`가 들어가지 않음(9역할 유지).
   - `SETTINGS.toggle`: `toggle.height + toggle.hitSlop * 2 === SETTINGS.row.minHeight`(44).
2. **소스·렌더 계약 테스트**:
   - `src/ui/` 전체 `.ts`·`.tsx` 소스(주석 제거 후)에서 스타일 속성 `color:\s*COLORS\.accent`가 **0건**임을 잠근다(`ActivityIndicator`의 JSX prop `color={COLORS.accent}`와 구분).
   - `__tests__/ui/settings-screen.test.tsx`:
     - F3(153행): 묶음 머리 `style.color` 단언을 `COLORS.accent` → `COLORS.danger`로 갱신.
     - 토글 테스트: `auto-diary-toggle`의 `hitSlop`이 `{ top: 9, bottom: 9 }`이고 스타일 크기가 `width: 44, height: 26`임을 단언.
   - `__tests__/ui/writing-in-place.test.tsx`:
     - W2/W3(106행 등): `home-day-state`(쓰는 중)와 `writing-kicker`의 `color`가 `COLORS.danger`임을 단언.
   - `__tests__/ui/diary-list.test.tsx`:
     - `home-month`의 `color`가 `COLORS.danger`임을 단언.
   - `__tests__/ui/welcome-screen.test.tsx`:
     - `welcome-kicker`의 `color`가 `COLORS.danger`임을 단언.
   - `__tests__/ui/day-picker.test.tsx`:
     - 선택 칸 요일 색이 `COLORS.accentForeground`, 비선택 칸 요일 색이 `DAY_STRIP.dowMuted`이고 요일 노드에 `opacity`가 없음을 단언.
     - `DayPicker.tsx` 소스(주석 제거 후)에서 `DOW` 정의에 `opacity`가 없음을 단언(글자 불투명도 합성 금지).
3. **위반 주입**:
   - 다섯 자리 중 한 자리를 `COLORS.accent`로 되돌렸을 때 소스 계약 및 화면 테스트가 실패하는지 확인.
   - `DayPicker.tsx`의 `DOW`에 `opacity: 0.7`을 되살렸을 때 테스트가 실패하는지 확인.

### 6. 실기기 완료 확인 (`SM-S901N` dev)

- 홈(안 쓴 날·쓴 날·쓰는 중), 작명 화면, 설정·개발자·진단 묶음 머리, 주간 스트립 선택 칸·비선택 칸·미래 칸 요일을 **화면 밝기 최저**에서 소유자가 읽고 확인(11pt 자리 글자 크기도 함께 점검).
- 글꼴 1.0배 / 2.0배 캡처.
- 설정 토글 위·아래 가장자리 2dp 안쪽(슬롭 영역) 탭 동작과 바깥 2dp 음성 대조 확인.
- Maestro 층 1: `npm run test:layer1 -- .maestro/settings-time-place.yml` 및 `week-strip-swipe` 통과.

## 기각한 안

- **`COLORS`에 새 역할 키 추가**: `DT1`(9개 역할 고정)과 기존 화면별 토큰 객체 분리 관례(051·055·064)를 깬다.
- **장식 라벨을 `COLORS.textMuted`로 변경**: 월 라벨·묶음 머리의 빨간 강세가 사라져 모더니스트 인상이 약해진다.
- **`DayPicker.tsx` 로컬 상수로 `#5f5e5d` 정의**: `tokens.ts` 단일 출처 원칙에 어긋나고 `theme-tokens.test.ts`에서 대비 공식을 검증할 수 없다.

## 남는 위험

- `COLORS.danger`(`#ae1800`)를 강조 라벨에도 쓰게 되어 「위험 색과 강조 색의 분리」와는 반대 방향이나, 두 빨강(`#ec3013` vs `#ae1800`)의 상호 대비가 1.71:1이라 사용자가 색만으로 두 역할을 구분하지 못해 실질 피해는 작다.
- 미래 칸 요일의 실효 불투명도가 0.21 → 0.3으로 조금 진해진다(실기기에서 육안 확인).
