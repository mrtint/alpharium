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

---

## 3. 실측 결과 (2026-10-18)

### 3.1 기기 없는 검증 및 위반 주입 (C7)

- **단위·계약 테스트**: 6개 대상 스위트 213 passed, 전체 테스트 **316 suites · 6,728 passed**, `npm run lint` 0 errors, `npm run check:constitution` 0 violations.
- **위반 주입 C7-1**: `src/ui/DiaryListScreen.tsx`의 `home-month` 색상을 `COLORS.accent`로 임시 복원 → `__tests__/ui/diary-list.test.tsx`(`Expected: "#ae1800", Received: "#ec3013"`)와 `__tests__/ui/settings-screen.test.tsx` C2 소스 계약(`Expected: [], Received: ["DiaryListScreen.tsx"]`)이 즉시 실패함을 확인 후 원복.
- **위반 주입 C7-2**: `src/ui/DayPicker.tsx`의 `DOW`에 `opacity: 0.7`을 임시 추가 → `__tests__/ui/day-picker.test.tsx`의 선택/비선택 칸 `opacity: undefined` 단언과 소스 계약이 즉시 실패함을 확인 후 원복.

### 3.2 디바이스·시뮬레이터 검증 (D1 · D2 · D3)

- **검증 환경 (원칙 V — 환경 한계 정직 기록)**:
  - 작업 환경(집 맥)에는 Android SDK(`adb`) 및 `SM-S901N`이 연결되어 있지 않아 안드로이드 실기기는 미검증으로 남긴다.
  - **iOS 시뮬레이터(`iPhone 17 Pro Max`, iOS 26.5, UDID `AD022FA9-EA15-4C5E-8E80-F9D224FE7609`)**에서 dev 번들(`EXPO_PUBLIC_APP_ENV=dev`)을 띄워 D1·D2·D3 전 항목을 실측했고, 이어서 **실기기 `iPhone 14`(`Hansan의 iPhone`, iOS 27.0.1, `4EE24F59-A58C-5C8D-A002-141CEE07AE19`)**에도 `088` 개발 환경 Release 번들을 덮어 설치(`Documents/` 모델·일기·설정 보존)해 실행·뷰 계층·화면 렌더링을 확인했다.
- **실기기 `iPhone 14`(iOS 27.0.1) 확인**:
  - `npx expo export:embed`(`EXPO_PUBLIC_APP_ENV=dev`) → `hermesc -emit-binary -O` → 개발 인증서(`FE9ACD06…`) 재서명 → `xcrun devicectl device install app` 및 `device process launch`로 기기 데이터를 유지한 채 설치·기동(PID 1585).
  - `lldb`로 실기기 `UIWindow` 뷰 트리(`recursiveDescription`) 및 레이어 PNG(`088-iphone14-home.png`)를 추출해 확인:
    - 홈 월 라벨(`2026년 10월`): `NSColor = "UIExtendedSRGBColorSpace 0.682353 0.0941176 0 1"` (`#ae1800`, `COLORS.danger`).
    - 주간 스트립 선택 칸(`18`, 배경 `0.92549 0.188235 0.0745098 1` = `#ec3013`) 요일 약자(`일`): `NSColor = "UIExtendedSRGBColorSpace 0.952941 0.94902 0.94902 1"` (`#f3f2f2`, `COLORS.accentForeground`), 텍스트 뷰 `alpha` 감쇠 없음(불투명도 1.0).
    - 주간 스트립 비선택 칸 요일 약자(`월~토`): `NSColor = "UIExtendedSRGBColorSpace 0.372549 0.368627 0.364706 1"` (`#5f5e5d`, `DAY_STRIP.dowMuted`), 텍스트 뷰 `alpha` 감쇠 없음(미래 칸 컨테이너만 `alpha = 0.3`).
- **D1 — 작은 강조 글자 5곳(`#ae1800`) · 주간 스트립 요일 약자 · 글자 크기 1.0배(`medium`) 및 ~1.94배(`accessibility-large`) 캡처**:
  - **홈(쓴 날 · 안 쓴 날 · 지난주)**: 상단 월 라벨(`2026년 10월`, `#ae1800`), 선택 칸 요일(`일`, `#f3f2f2`, 불투명도 없음), 비선택 칸 요일(`월~토`, `#5f5e5d`), 미래 칸(`19~24`, `opacity: 0.3`) 확인 (`088-01-home-written.png`, `088-02-home-unwritten-prev-week.png`).
  - **홈(제자리 쓰는 중)**: `write-button` → `overwrite-confirm`으로 진입해 상단 상태 줄(`WRITING_STATE`, `쓰는 중`, `#ae1800`)과 종이 카드 머리말(`writing-kicker`, `쓰는 중`, `#ae1800`) 확인 후 `stop-button`으로 중단 (`088-03-home-writing-in-place.png`).
  - **첫 만남 작명 화면(`WelcomeScreen`)**: 상단 표지 `KICKER`(`POCKETLOG`, `#ae1800`) 확인 (`088-09-welcome-naming.png`).
  - **설정 · 개발자 · 진단 화면**: 묶음 머리(`캐릭터`, `일기`, `권한 · 휴대폰 설정으로 이동`, `이 휴대폰`, `정보`, `모듈`, `진단`, `상태 흉내`, `다시 보기`, `최근 자동 쓰기 시도`, `환경`, `저장 점검`, `사진 권한`, `신호 프로브 · 오늘`, `입력 프롬프트 미리보기`) 모두 `#ae1800`로 또렷하게 표시됨을 확인 (`088-04-settings-top.png` ~ `088-08-diagnostics-bottom.png`).
  - **글자 크기 확대(`xcrun simctl ui ... content_size accessibility-large`, 약 1.94배)**: 홈 쓴 날(`088-10-scale2-home-written.png`)과 설정 상단(`088-11-scale2-settings-top.png`)에서 11~13pt 강조 라벨과 행 레이아웃이 잘림·겹침 없이 표시됨을 확인 후 `medium`으로 복원.
- **D2 — 설정 토글(`auto-diary-toggle`) 세로 `hitSlop: 9` 경계 탭 대조**:
  - `iPhone 17 Pro Max` 논리 그리드(`440×956`)에서 `auto-diary-toggle`의 시각 bounds는 `[376,318][420,344]`(높이 26pt), `hitSlop: 9`가 더해진 확장 터치 영역은 `[376,309][420,353]`(높이 44pt).
  - **음성(확장 영역 바깥쪽)**: `(398, 291)`(시각 상단 318보다 27pt 위, 확장 상단 309보다 18pt 위) 탭 → 토글이 꺼진 채로 유지되고 `settings-target-hour`가 나타나지 않음(`notVisible` 통과).
  - **양성 1(위쪽 슬롭 안쪽)**: `(398, 312)`(시각 상단 318보다 6pt 위, 확장 상단 309 안쪽) 탭 → 토글이 켜지며 `settings-target-hour` 행이 펼쳐짐(`visible` 통과).
  - **양성 2(아래쪽 슬롭 안쪽)**: `(398, 350)`(시각 하단 344보다 6pt 아래, 확장 하단 353 안쪽) 탭 → 토글이 꺼지며 `settings-target-hour` 행이 접힘(`notVisible` 통과).
- **D3 — Maestro 주간 스트립 가로 스와이프 및 설정 시간·장소·토글 회귀 확인**:
  - 주간 스트립 가로 스와이프(`W1~W4`: 오른쪽 스와이프로 지난주 이동 → 같은 요일 유지 및 `day-today-.*` 비노출 → 왼쪽 스와이프로 이번 주 복귀 → 오늘 주에서 왼쪽 스와이프 바운스) 통과 (`2026-10-18_010052`).
  - 설정 화면 매일 쓰는 시각 대화상자(`오후 10시` 선택·반영), 장소 이름 대화상자(`꺼짐` 선택·반영), 자동 쓰기 토글 접기·펼치기 통과 (`2026-10-18_010904`).
  - 검증 종료 후 시뮬레이터 `Documents/diary`·`Documents/preferences` 백업 및 `content_size medium`을 원상 복구하고 시뮬레이터와 Metro를 종료함.
