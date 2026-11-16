# Contract: 스트립 이어 스크롤 (119)

049 `contracts/day-picking.md`의 S4·S6·SW1·SW3~SW6·HS1·DB8을 대신한다. 계약 ID는 테스트 이름에 쓴다.

## DB — 범위 (`src/config/day-boundary.ts`)

| ID     | 계약                                                                                        | 검증  |
| ------ | ------------------------------------------------------------------------------------------- | ----- |
| CS-DB1 | `stripStartDay("2026-11-16", 2026-11-16 09:00)` = `2025-11-16`                              | logic |
| CS-DB2 | `stripStartDay("2024-03-01", 2026-11-16 09:00)` = `2024-03-01`(고른 날이 더 이르면 고른 날) | logic |
| CS-DB3 | 윤년을 건너도 365일이다: `stripStartDay("2028-03-01", 2028-03-01 09:00)` = `2027-03-02`     | logic |
| CS-DB4 | 소스에 `weekOf`·`shiftWeek` export가 없다                                                   | 소스  |

## SC — 칸 목록 (`src/app/state.ts`)

| ID     | 계약                                                           |
| ------ | -------------------------------------------------------------- |
| CS-SC1 | `stripCellsFor` 마지막 칸 = 오늘, `isToday`는 그 칸만          |
| CS-SC2 | 이웃 칸은 언제나 하루 차이(월·연 경계 포함)                    |
| CS-SC3 | 기본 길이 366(오늘 포함), 고른 날이 1년보다 이르면 고른 날부터 |
| CS-SC4 | `selected`는 정확히 한 칸, 모든 칸 `selectable: true`          |
| CS-SC5 | `hasDiary`는 일기 목록에 있는 날만                             |
| CS-SC6 | 소스에 `weekCellsFor`·`swipeWeek`·`canSwipeNext` 선언이 없다   |

## ST — 스크롤 목표 (`src/app/state.ts` `stripScrollTarget`)

| ID     | 계약                               |
| ------ | ---------------------------------- |
| CS-ST1 | 화면 안(첫 칸·끝 칸 포함) → `null` |
| CS-ST2 | 왼쪽 밖 → `index × w`              |
| CS-ST3 | 오른쪽 밖 → `(index − 6) × w`      |
| CS-ST4 | `w ≤ 0` → `null`                   |

## S — 스트립 (`DayPicker`)

| ID    | 계약                                                                                                                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| CS-S1 | 049 S1·S2 유지(`day-YYYY-MM-DD`·`day-dot-*`·`day-today-*`)                                                                                 |
| CS-S2 | 칸을 누르면 `onSelect(day)`                                                                                                                |
| CS-S3 | 스크롤 이벤트(`scroll`·`momentumScrollEnd`)만으로는 `onSelect`가 불리지 않는다                                                             |
| CS-S4 | 소스에 `Gesture.Pan`·`day-strip-pan`·`swipeDirectionOf`·`RUBBER_BAND`·`onSwipe`가 없다. `FlatList`·`getItemLayout`·`snapToInterval`이 있다 |
| CS-S5 | 049 S5 유지 — `Date`·`dayOf`·`new Date(`를 쓰지 않는다                                                                                     |
| CS-S6 | 고른 날이 화면 밖의 날로 바뀌면 `scrollToOffset`이 `stripScrollTarget`의 값으로 불린다. 화면 안이면 불리지 않는다                          |
| CS-S7 | 동작 줄이기가 켜져 있으면 `scrollToOffset`의 `animated`가 거짓                                                                             |
| CS-S8 | 스트립 testID `day-strip` 유지                                                                                                             |

## HS — 홈 조립

| ID     | 계약                                                                                                                 |
| ------ | -------------------------------------------------------------------------------------------------------------------- |
| CS-HS1 | `DiaryHomeScreen`·`DiaryListScreen` 소스에 `onSwipe=`·`canSwipeNext`·`swipeWeek`가 없다(`onSwipeDay`는 114로 남는다) |
| CS-HS2 | 쓰는 중에는 칸을 눌러도 고른 날이 바뀌지 않는다(054 기존 잠금 유지)                                                  |
