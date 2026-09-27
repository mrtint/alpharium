# Contract: 날 고르기 (049)

계약 ID는 테스트 이름에 그대로 쓴다. 「소스」는 `readFileSync`로 주석을 걷어낸 뒤 검사한다(011·035 관용구).

## DB — 하루 경계 (`src/config/day-boundary.ts`)

| ID | 계약 | 검증 |
| --- | --- | --- |
| DB1 | `dayOf(2026-09-26 00:00)` = `2026-09-26`, `dayOf(2026-09-25 23:59:59.999)` = `2026-09-25` | logic |
| DB2 | `dayOf(2026-09-26 03:59)` = `2026-09-26`(04:00 경계가 없다) | logic |
| DB3 | `dayBounds("2026-09-26")` = `[09-26 00:00, 09-27 00:00)` 기기 시간대 | logic |
| DB4 | `isDayWritable(today, now)`는 00:00·09:00·11:59·12:00·23:59에서 모두 참 | logic |
| DB5 | `isDayWritable(내일, now)`은 거짓, `isDayWritable(1년 전, now)`은 참 | logic |
| DB6 | `selectableDays(09-26 09:00)` = `[09-25, 09-24, 09-23]`(오늘 없음), `selectableDays(09-26 12:00)` = `[09-26, 09-25, 09-24]` — **FR-020 보존** | logic |
| DB7 | `selectableDays(09-26 00:30)` = `[09-25, 09-24, 09-23]`(자정 경계) | logic |
| DB8 | `weekOf` W1~W4(data-model §2), 연말 2026-12-31 → 12-27~2027-01-02 | logic |
| DB9 | `nextDayStartAt(09-26 23:59:30)` = `09-27 00:00` | logic |
| DB10 | 소스에 `writableAt`·`stripDays`·`STRIP_DAY_COUNT`·`DAY_STARTS_AT_HOUR` 선언이 없다 | 소스 |
| DB11 | `src/`·`App.tsx`에서 `day-boundary.ts` 밖의 파일이 시(時)를 빼거나 더해 하루 기준을 옮기지 않는다 — `getHours() -`·`getHours() +` 패턴이 0곳. `getHours()` 자체는 허용 목록에서만: `diary/prompt.ts`(사진 시각 표시), `schedule/decision.ts`(목표 시각 창), `vision/select.ts`(자정 기준 하루 안의 분) | 소스 |
| DB12 | `vision/select.ts`의 시간 칸: 00:30 사진은 첫 칸, 23:30 사진은 마지막 칸 | logic |
| DB13 | FR-021 — `src/schedule/task.ts`, `App.tsx`(`photoDays` 탐색·`canPrepare`)가 `selectableDays`를 부르고, `src/app/state.ts`는 부르지 않는다 | 소스 |

## WP — 쓰기 예고 (`src/app/state.ts`)

| ID | 계약 |
| --- | --- |
| WP1 | `writePromptFor(items, now, null).day === dayOf(now)` — 09:00에도(048 D9 뒤집기) |
| WP2 | 사흘 밖의 `chosenDay`(예: 30일 전)는 그대로 `day`가 된다 |
| WP3 | 미래 `chosenDay`는 `dayOf(now)`로 떨어진다 |
| WP4 | `WritePrompt`에 `selectable`·`revertedFrom`·`writableAt` 키가 없다(소스) |
| WP5 | `overwrites`는 고른 날의 일기 유무만 본다 |

## SW — 주·스와이프 (`src/app/state.ts`)

| ID | 계약 |
| --- | --- |
| SW1 | `weekCellsFor` 7칸 일~토, `selected` 정확히 1, 오늘 칸만 `isToday` |
| SW2 | 미래 칸 `selectable: false`, 과거·오늘 칸 `selectable: true`(몇 주 전이어도) |
| SW3 | `swipeWeek(09-26 토, "previous")` = `09-19` |
| SW4 | 오늘 09-24(목)일 때 `swipeWeek(09-19 토, "next")` = `09-24`(clamp) |
| SW5 | 오늘이 든 주에서 `swipeWeek(…, "next")` = `null`, `canSwipeNext` = 거짓 |
| SW6 | 두 달에 걸친 주 — `weekCellsFor`는 8/30~9/5, 월 라벨은 고른 날 기준(H2) |

## H — 헤더 (`DiaryListScreen` 헤더, `home-text.ts`)

| ID | 계약 |
| --- | --- |
| H1 | 월 라벨 `home-month` = `monthText(고른 날)` = 「2026년 9월」, 오른쪽 `home-kicker` = 「일기」. 둘 다 누를 수 없다(`onPress` 없음) |
| H2 | 8/31 선택 시 월 라벨 「2026년 8월」 |
| H3 | 큰 숫자 `home-day-number` = 일(日), 요일 `home-weekday` = 「토요일」 형식 |
| H4 | 상태 줄 `home-day-state` = research R9 표의 다섯 갈래 |
| H5 | 문구 원문 잠금 — 「오늘 일기를 쓸 수 있어요」, 「이 날 일기를 쓸 수 있어요」, 「일기」, 「2026년 9월」 형식, 「토요일」(C4) |
| H6 | 헤더의 날짜 표시(월 라벨·숫자·요일)에 「오늘」 글자가 없다 |
| H7 | 헤더 숫자·요일 영역에 누름 처리가 없다(`Pressable`·`onPress` 없음, C7) |
| H8 | 날이 바뀌면 이전 날 노드(`home-day-fade-out`)와 새 날 노드가 함께 렌더되고 새 날의 숫자가 보인다(배선만, C9) |

## S — 스트립 (`DayPicker`)

| ID | 계약 |
| --- | --- |
| S1 | 칸 testID `day-YYYY-MM-DD`, 점 `day-dot-YYYY-MM-DD` 유지(FR-023) |
| S2 | 오늘 칸 밑줄 testID `day-today-YYYY-MM-DD`, 선택 여부에 따라 색이 `COLORS.accent` / 선택 글자색 |
| S3 | 흐린 칸: `disabled`, 불투명도 0.3, 누르면 `onSelect`가 안 불린다 |
| S4 | 팬 제스처 testID `day-strip-pan`. `fireGestureHandler`로 `translationX: +80` 끝 → `onSwipe("previous")`, `−80` → `onSwipe("next")`, `+20`·속도 0 → 호출 없음 |
| S5 | `DayPicker`는 `Date`·`dayOf`·`new Date(`를 쓰지 않는다(판정하지 않는다, 소스) |
| S6 | 스트립은 이어 스크롤하지 않는다 — `ScrollView`·`FlatList`를 쓰지 않는다(소스) |

## HS — 홈 화면 조립 (`DiaryHomeScreen`)

| ID | 계약 |
| --- | --- |
| HS1 | 스와이프 결과 `null`이면 `onChooseDay`가 불리지 않는다 |
| HS2 | 자정 타이머: 가짜 시계로 23:59:30 → 00:00:01을 넘기면 고른 날은 그대로, 밑줄(`day-today-*`)만 새 오늘로 |
| HS3 | `canPrepare(day) === false`인 날을 고르면 `prepare`·`captionDay`가 안 불리고 `release`가 불린다(R5) |
| HS4 | 소스에 `writableAt`·`WRITABLE_TIMER_SLACK_MS`·`write-unavailable`이 없다 |
| HS5 | 되돌림 캡션(`revertedText`)이 없다. 캐릭터 옮김·거부 권한 캡션은 그대로 렌더된다 |

## AF — 앱 프레임 (`App.tsx`)

| ID | 계약 |
| --- | --- |
| AF1 | `AppFrame`의 고른 날 초기값이 `dayOf(new Date())`다(소스 — `useState<DayDate | null>(null)`이 아니다) |
| AF2 | `canPrepare`가 `DiaryHomeScreen`에 넘어간다(소스) |
