# Data Model: 119

## StripCell (기존, 변경 없음)

`{ day, hasDiary, isToday, selectable, selected }` — `cellFor()`가 만든다.

## 스트립 칸 목록 (새 파생값, 저장 없음)

- `stripCellsFor(items, selected, now): StripCell[]`
- 첫 칸 = `stripStartDay(selected, now)`, 마지막 칸 = `dayOf(now)`, 이웃 칸은 `shiftDay(·, 1)`.
- 미래 칸 없음 → 모든 칸 `selectable: true`.
- `selected`가 미래면(있을 수 없지만) `writePromptFor`가 이미 오늘로 떨어뜨린다(049 WP3).

## 스크롤 목표 (순수)

- 입력: 고른 칸 인덱스 `index`, 현재 오프셋 `offset`, 칸 폭 `w`, 보이는 칸 수 7
- 첫 보이는 인덱스 `first = round(offset / w)`
- `first ≤ index ≤ first + 6` → `null`
- `index < first` → `index × w`
- `index > first + 6` → `(index − 6) × w`
- `w ≤ 0` → `null`
