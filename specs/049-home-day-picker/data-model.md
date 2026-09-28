# Data Model: 049 날 고르기

새 저장 필드는 없다. 바뀌는 것은 **하루의 정의**와 **화면 상태의 모양**이다. 저장 형식(`DiaryEntry`, 파일명
`YYYY-MM-DD.json`)은 그대로다.

## 1. 하루 (`DayDate`) — `src/config/day-boundary.ts`

| 항목 | 048까지 | 049 |
| --- | --- | --- |
| 정의 | 04:00~익일 04:00 | **기기 로컬 00:00~익일 00:00** |
| 모양 | `YYYY-MM-DD` 문자열 | 그대로 |
| 오늘 | `dayOf(now)` = `now − 4h`의 달력 날짜 | `dayOf(now)` = `now`의 달력 날짜 |
| 쓸 수 있음 | 닫힘 ∨ (오늘 ∧ 12시 이후) | `day <= dayOf(now)`(미래가 아님) |
| 미래 | `day > dayOf(now)` | 그대로 |

**불변식**
- D1. 하루 경계를 아는 코드는 이 파일 하나다. 다른 파일에 `getHours()`로 하루를 가르는 코드가 없다.
- D2. `dayBounds(day).startMs`의 시각은 00:00:00.000, `endMs`는 다음 날 00:00:00.000(기기 시간대).
- D3. `dayOf(new Date(dayBounds(d).startMs)) === d`, `dayOf(new Date(dayBounds(d).endMs)) === d + 1일`.
- D4. 저장된 파일의 날짜를 다시 매기지 않는다(FR-018a).

## 2. 주 (`Week`)

`weekOf(day): readonly DayDate[]` — 길이 7, `[0]`은 일요일, `[6]`은 토요일, `day`를 포함한다. 오래된 것이 왼쪽.

`shiftWeek(day, n): DayDate` — `day`에서 `7n`일 이동(같은 요일).

**불변식**
- W1. `weekOf(d).length === 7`이고 `weekOf(d).includes(d)`.
- W2. `dayParts(weekOf(d)[i]).weekday === i`.
- W3. 연·월 경계를 넘어도 연속 7일(예: 2026-12-27 일 ~ 2027-01-02 토).
- W4. `weekOf(shiftWeek(d, n))`는 `weekOf(d)`의 모든 날에 `7n`일 더한 것.

## 3. 쓰기 예고 (`WritePrompt`) — `src/app/state.ts`

```text
WritePrompt = {
  day: DayDate            // 고른 날(미래가 아님). 고른 적 없거나 미래면 dayOf(now)
  overwrites: boolean     // 그 날에 일기가 있는가
}
```

**삭제되는 필드**: `selectable`(사흘 목록), `revertedFrom`(되돌림), `writableAt`(쓸 수 있게 되는 시각),
**`writable`**(구현 중 발견 — 미래 `chosenDay`는 오늘로 떨어지므로 언제나 참이 되어 도달 불가였다.
미래 날의 마지막 방어는 파이프라인의 `isDayWritable` 게이트 하나다).
**삭제되는 타입**: `SelectableDay`.

**불변식**
- P1. `day <= dayOf(now)`.
- P2. `chosenDay`가 미래가 아니면 `day === chosenDay`(되돌림 없음). 사흘 밖이어도 그대로다.
- P3. `chosenDay`가 없으면 `day === dayOf(now)`(FR-010a — 048 D9를 뒤집는다).

## 4. 스트립 칸 (`StripCell`)

```text
StripCell = {
  day: DayDate
  hasDiary: boolean     // 점
  isToday: boolean      // 밑줄 (신규)
  selectable: boolean   // isDayWritable — 거짓이면 흐림·탭 불가
  selected: boolean     // 반전
}
```

`weekCellsFor(items, prompt, now): StripCell[]`이 `weekOf(prompt.day)`로 만든다(`stripCellsFor` 대체).

**불변식**
- C1. 길이 7, 일~토.
- C2. `selectable === false`인 칸은 `hasDiary === false`다(미래 날에는 일기가 없다 — 정상 경로 기준).
- C3. `isToday`인 칸은 많아야 하나(오늘이 그 주에 있을 때만).
- C4. `selected`인 칸은 정확히 하나.

## 5. 스와이프 판정

`swipeWeek(selected, direction, now): DayDate | null`

| direction | 조건 | 결과 |
| --- | --- | --- |
| `"previous"` | 언제나 | `shiftWeek(selected, −1)` |
| `"next"` | `weekOf(selected)`에 오늘이 있다 | `null`(튕김) |
| `"next"` | 그 외 | `min(shiftWeek(selected, +1), dayOf(now))` |

`canSwipeNext(selected, now) = swipeWeek(selected, "next", now) !== null`.

**불변식**
- S1. 결과는 언제나 `<= dayOf(now)`.
- S2. 결과가 `shiftWeek(selected, ±1)`와 다른 경우는 clamp(오늘) 하나뿐이다.

## 6. 고른 날의 수명

| 사건 | 고른 날 |
| --- | --- |
| 앱 새로 열기(`AppFrame` 마운트) | `dayOf(now)` |
| 설정·개발자 왕복, 040 재마운트 | 유지(`AppFrame` 상태, 048 Q4) |
| 자정 경과(켜 둔 채) | 유지. 오늘 밑줄·흐림만 다시 판정(FR-019) |
| 스트립 탭 | 그 날(흐린 칸은 불가) |
| 스와이프 | `swipeWeek` 결과, `null`이면 유지 |
| 파일 | 남기지 않는다(009) |

## 7. 미리 준비 가능 여부 (R5)

`canPrepare(day): boolean` — App이 넘긴다. `photoDays`가 훑은 날(= `selectableDays(now)`에 있는 날)이면 참.
거짓이면 `DiaryHomeScreen`은 `prepare`·`captionDay`를 부르지 않고 `release()`를 부른다.

## 8. 상태 줄

`dayStateText(item | undefined, isToday: boolean): string` — `home-text.ts`. research R9 표.
오늘인가는 스트립 칸(`StripCell.isToday`)에서 받는다 — 화면이 지금 시각을 읽지 않는다(구현 때 확정).
