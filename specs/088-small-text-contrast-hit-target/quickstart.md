# Quickstart: 작은 글자 대비와 누름 영역 검증 (088)

## 1. 기기 없는 검증 (단위·계약·린트)

```bash
npm test -- --runTestsByPath \
  __tests__/theme-tokens.test.ts \
  __tests__/ui/settings-screen.test.tsx \
  __tests__/ui/writing-in-place.test.tsx \
  __tests__/ui/diary-list.test.tsx \
  __tests__/ui/welcome-screen.test.tsx \
  __tests__/ui/day-picker.test.tsx
npm test
npm run lint
```

- 모든 테스트와 린트가 통과해야 한다.
- 위반 주입([contracts/contrast-and-hit-target.md](./contracts/contrast-and-hit-target.md) C7):
  1. `src/ui/DiaryListScreen.tsx`의 `home-month` 색상을 `COLORS.accent`로 임시 변경 → 테스트 실패 확인 → 복원.
  2. `src/ui/DayPicker.tsx`의 `DOW`에 `opacity: 0.7`을 임시 추가 → 테스트 실패 확인 → 복원.

## 2. 안드로이드 실기기 검증 (`SM-S901N` dev)

네이티브 의존성·매니페스트 변경이 없으므로 JS 번들 갱신만으로 확인한다. **기기 데이터(`files/models`·`files/diary`)를 보존하기 위해 `pm clear`는 쓰지 않는다.**

### 사전 준비

1. `.env.development.local`에 `EXPO_PUBLIC_APP_ENV=dev`가 있는지 확인하고 Metro가 떠 있는지 확인한다(`adb reverse tcp:8081 tcp:8081`).
2. 기기 잠금 해제(`adb shell dumpsys trust`의 `deviceLocked=0`).
3. 작업 전 기기 `files/diary`·`files/preferences`를 `/data/local/tmp/088-backup.tar`로 백업한다.

### D1 — 화면 밝기 최저 육안 확인 및 글꼴 1.0배 / 2.0배 캡처 (UX-07 · UX-08)

1. 기기 화면 밝기를 최저로 낮춘다.
2. 다음 다섯 자리(`#ae1800`)와 주간 스트립 요일 약자(선택 칸 `#f3f2f2` · 비선택 칸 `#5f5e5d` · 미래 칸 `opacity: 0.3`)를 확인하고 글꼴 1.0배(`adb shell settings put system font_scale 1.0`)와 2.0배(`font_scale 2.0`)에서 각각 캡처한다(11pt 자리 글자 크기도 함께 점검):
   - 홈(안 쓴 날 · 쓴 날 · 쓰는 중 — 상태 흉내 활용 가능): 상단 월 라벨, 쓰는 중 상태 줄, 쓰는 중 머리말, 주간 스트립 선택 칸·비선택 칸·미래 칸 요일.
   - 첫 만남 작명 화면(`preferences/onboarding.json`의 `welcomeShown`을 잠시 `false`로 두거나 개발자 메뉴 활용 후 백업 복원): 상단 표지 `KICKER`.
   - 설정 · 개발자 · 진단 화면: 묶음 머리(`캐릭터`, `일기`, `권한`, `이 휴대폰`, `정보`, 개발자·진단 묶음 머리).
3. 확인 후 `font_scale 1.0`으로 되돌린다.

### D2 — 설정 토글 세로 확장 영역(`hitSlop`) 탭 대조 (UX-10)

1. 설정 화면을 열고 `uiautomator dump`로 `auto-diary-toggle`의 보이는 bounds `[left,top][right,bottom]`(높이 26dp相当)을 읽는다.
2. **양성(확장 영역 안쪽)**: `top - 2dp`(또는 `bottom + 2dp`, 슬롭 9dp 안쪽) 좌표를 `adb shell input tap <x> <y>`로 탭 → 토글 상태가 바뀌고 「매일 쓰는 시각」 행이 펼쳐지거나 접히는지 확인.
3. **음성(확장 영역 바깥쪽)**: `top - 11dp`(또는 `bottom + 11dp`, 슬롭 9dp보다 2dp 바깥) 좌표를 탭 → 토글 상태가 바뀌지 않는지 확인.

### D3 — Maestro 층 1 회귀 확인

```bash
npm run test:layer1 -- .maestro/settings-time-place.yml
npm run test:layer1 -- .maestro/week-strip-swipe.yml
```

- 두 흐름 모두 통과해야 한다.
- 작업 전 백업(`/data/local/tmp/088-backup.tar`)을 복원해 기기 상태를 원상 복구한다.
