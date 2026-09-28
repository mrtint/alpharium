# Contract: 대화상자 기반 (050)

기기 없는 테스트가 잠그는 계약이다. 각 항목에 **위반 주입**(실제로 어겨 보고 잡히는지 확인할 변경)을 붙였다.
jest는 배선만 본다 — 움직임(페이드)·실제 겹침·손맛은 실기기에서 본다(C9).

## DLG — 대화상자 기반 (`src/ui/components/Dialog.tsx`)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| DLG1 | `ConfirmDialog`: 덮개를 눌러도 `onCancel`이 불리지 않고 내용이 남는다 | 덮개를 `Pressable` + `onCancel`로 |
| DLG2 | `ConfirmDialog`: 뒤로 가기(등록된 `hardwareBackPress` 핸들러 호출) → `onCancel` 1회, 핸들러는 `true`를 돌려준다 | `onOpenChange` 무시 |
| DLG3 | `ConfirmDialog`에 `onCancel`이 없으면 뒤로 가기가 아무것도 바꾸지 않되 `true`를 돌려준다(앱이 닫히지 않는다) | 핸들러가 `false` |
| DLG4 | `DismissibleDialog`: 덮개 누름·뒤로 가기 → `onClose` 1회씩 | `closeOnPress={false}` |
| DLG5 | 덮개 배경 = `OVERLAY.scrim`. 면: 반경 0, 테두리 2(`COLORS.text`), 안쪽 여백 24, 간격 16, 좌우 20 — 인라인 `style`로 검사(jest에 NativeWind 변환 없음) | 여백 16 |
| DLG6 | 버튼: 높이 48, 반경 `RADIUS.control`(6), 동작 = `COLORS.accent` 배경 + `COLORS.accentForeground` 글자, 취소 = 1px `COLORS.text` 테두리, 세로 쌓기(동작이 위) | 동작 글자 `bg` |
| DLG7 | 대화상자 파일에 hex·`rgba(` 리터럴이 없다 — 색은 `tokens.ts`에서만(소스 검사, 주석 걷어냄) | `#fff` 추가 |

## OW — 덮어쓰기 확인 (`2d`)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| OW1 | 일기가 있는 날에서 「일기 쓰기」 → 홈(`home-day-number`)이 남은 채 `overwrite-dialog`가 보인다 | 대화상자 대신 전체 화면 |
| OW2 | 「취소」 → 대화상자가 사라지고 홈의 고른 날이 그대로, 생성 호출 0회 | 취소가 `generate` 호출 |
| OW3 | 뒤로 가기 → OW2와 같다 | — (DLG2) |
| OW4 | 덮개 누름 → 대화상자가 남는다 | — (DLG1) |
| OW5 | 「다시 쓰기」 → 생성 1회, 쓰는 중 화면 | 생성 전 대화상자 유지 |
| OW6 | 오늘을 다시 쓸 때만 `overwrite-today-note`(「지금까지의 하루로 써요.」)가 보이고, 지난 날에는 없다 | 조건 제거 |
| OW7 | props·상태에 `DiaryEntry`·본문·진행률이 없다(012 X1~X3 계승 — 소스 검사) | props에 `entry` |
| OW8 | 저장은 판정 통과 뒤에만 — 생성이 실패·중단되면 기존 일기 파일이 바뀌지 않는다(`pipeline` 계약 테스트, 기존 동작 잠금) | `store.save`를 판정 전으로 |
| OW9 | `OverwriteConfirmScreen.tsx`가 없다(전체 화면 확인 제거) | 파일 되살리기 |
| OW10 | 대화상자가 뜬 채 `AppState`가 `background` → `active`로 바뀌어도 대화상자와 고른 날이 그대로다 | 복귀 시 `toList` |

## CAL — 날짜로 이동 (`2j`)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| CAL1 | `home-date-button`(큰 숫자·요일) 누름 → `calendar-dialog`. 월 라벨·상태 줄은 누를 수 없다 | 월 라벨까지 감싸기 |
| CAL2 | 열 때 선택한 날의 달(`calendar-month` = 「9월」, `calendar-year` = 「2026년」), 요일 머리 「일 월 화 수 목 금 토」 | `firstDayOfWeek` 1 |
| CAL3 | 오늘이 든 달에서 `calendar-next`는 `disabled`, 누르면 달이 그대로. 그 전 달에서는 눌린다 | `isLatestMonth` 무시 |
| CAL4 | 미래 칸은 눌러도 `onPick` 0회, 불투명도 0.3 | `disabledDates` 제거 |
| CAL5 | 달력 칸의 `hasDiary`·`isToday`·`selectable`·`selected`는 `cellFor()`에서만 온다 — `DateJumpDialog.tsx`에 `dayOf(`·`isDayWritable(`·`.some(` 호출이 없다(소스 검사) | 달력이 `isToday`를 직접 계산 |
| CAL6 | 같은 날의 달력 칸과 스트립 칸 판정이 같다(`weekCellsFor` 7칸 = 같은 날 `cellFor`) | — |
| CAL7 | 과거 날 누름 → `onPick(day)` 1회, 대화상자 닫힘. 이미 선택된 날을 눌러도 같다(닫힘, 고른 날 그대로). 몇 년 전 날(`2016-03-15`, 달력을 그 달로 열어)도 고를 수 있다(과거 한계 없음 — SC-004a). 홈에서는 스트립이 그 날이 든 일~토 주, 그 날 선택, 헤더가 그 날 | `onPick` 뒤 닫지 않음 |
| CAL8 | 「취소」·덮개·뒤로 가기 → 고른 날 그대로, `onPick` 0회 | 취소가 `onPick(shown)` |
| CAL9 | 다시 열면 직전에 넘겨 보던 달이 아니라 선택한 날의 달 | 보이는 달을 부모 상태로 |
| CAL10 | 월 표시 → 월 목록(12칸, 오늘 이후 달 `disabled`) → 고르면 날짜 보기로 그 달. 연 표시 → 연 목록(12년, 오늘 이후 해는 목록에 없다 — `yearPageOf`가 오늘 해로 끝난다) → 고르면 날짜 보기 | 미래 달 누름 허용 |
| CAL11 | 칸 모양: 선택 = accent 배경, 점 4×4(일기 있음), 오늘 = 밑줄(선택 아니면 accent, 선택이면 선택 칸 글자색) | 점 5×5 |
| CAL12 | `calendar.ts` 순수 함수: 연 경계(`shiftMonth` 12월→1월), `isLatestMonth`, `yearPageOf`, `dayDateFromPicker`('2026-09-28 00:00' → '2026-09-28') — 가짜 시계(자정 직전·직후) | 연 경계 누락 |

## TXT — 문구 (C4)

| ID | 계약 |
| --- | --- |
| TXT1 | `OVERWRITE_CONFIRM`·`DATE_JUMP`·`CALENDAR_WEEKDAYS` 값이 보드 KO 원문(+ Q5 문장)과 글자 단위로 같다 |
| TXT2 | `calendarMonthText({2026, 9})` = 「9월」, `calendarYearText(2026)` = 「2026년」 |
| TXT3 | 대화상자 화면 소스에 문구 리터럴이 없다 — `home-text.ts`에서만 온다 |

## MIG — 기존 겹침 화면 이관 (Q4)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| MIG1 | `DownloadConsentDialog`: 문구·`download-consent-dialog`·`download-consent-confirm` 그대로, 덮개·뒤로 가기로 닫히지 않음, 「받을게요」 → `onConfirm` | 뒤로 가기가 닫음 |
| MIG2 | `HomeMenu`: `home-menu-button` → 목록, `home-menu-<key>` 누름 → 그 항목 `onPress` + 닫힘, 바깥 누름·뒤로 가기 → 닫힘, dev·local에서만 개발자 | 항목 누름 후 열림 유지 |
| MIG3 | `src/ui/` 어디에도 `from "react-native"`의 `Modal` import가 이 세 화면(홈 메뉴·동의·덮어쓰기)에 남지 않는다. `DiaryDetailScreen`의 사진 갤러리 `Modal`(025)은 범위 밖이라 그대로다 | 메뉴에 `Modal` 되살리기 |

## DEP — 의존성 (C1·C2, research R1·R2)

| ID | 계약 | 위반 주입 |
| --- | --- | --- |
| DEP1 | `src/`·`App.tsx`에 `react-native-screens`·`lucide-react-native`·`react-native-svg` import가 없다(소스 검사) | 복사본에 `FullWindowOverlay` 되살리기 |
| DEP2 | RNR `button`·`text`(`src/ui/rnr/`)를 import하는 파일은 `src/ui/rnr/*`와 `src/ui/components/Dialog.tsx`·`src/ui/HomeMenu.tsx`뿐 | 다른 화면이 RNR `Button` import |
| DEP3 | `global.css`는 `@tailwind` 세 줄 그대로 — CSS 변수 없음(Q3) | `:root { --background … }` 추가 |
| DEP4 | `RNR_COLOR_ALIASES`의 값은 전부 `COLORS`의 값 중 하나다(새 색 없음) | 별칭에 새 hex |
| DEP5 | `App.tsx`에 `PortalHost`가 정확히 하나, `SafeAreaProvider` 안 | 두 개 |
