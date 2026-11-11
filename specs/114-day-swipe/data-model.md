# Data Model

저장하는 데이터가 없다. 고른 날은 홈의 상태(`chosenDay`, `DayDate` 문자열)이며 이 기능은 그 값을 바꾸는 입력 하나를 더한다.

## 값

| 이름 | 모양 | 규칙 |
|---|---|---|
| `SwipeDirection` | `"previous" \| "next"` | 스트립과 같은 타입을 쓴다(`state.ts`) |
| `swipeDay(selected, direction, now)` | `DayDate \| null` | `previous`는 `shiftDay(selected, -1)`. `next`는 `selected ≥ dayOf(now)`면 `null`, 아니면 `shiftDay(selected, 1)` |
| `daySwipeDirectionOf(translationX, velocityX)` | `SwipeDirection \| null` | `|translationX| ≥ 60` 또는 `|velocityX| ≥ 600`이면 부호로 방향(0이면 속도 부호), 아니면 `null`. 양수는 `previous` |

상태 전이: `chosenDay` → `swipeDay(...)`가 `null`이 아니면 `setChosenDay(그 날)`.
