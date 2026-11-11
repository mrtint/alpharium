# Contract: 날 밀기

## DaySwipe (src/ui/DaySwipe.tsx)

```ts
type DaySwipeProps = { onSwipeDay: (direction: SwipeDirection) => void; children: ReactNode; style?: ViewStyle };
daySwipeDirectionOf(translationX: number, velocityX: number): SwipeDirection | null
```

- 가로 팬이 활성이 되려면 가로 16pt 이상 움직여야 하고, 세로로 12pt 먼저 움직이면 포기한다.
- 손을 뗀 순간 `daySwipeDirectionOf`가 방향을 주면 `onSwipeDay`를 **한 번** 부른다. 끌림 중에는 아무것도 움직이지 않는다.
- 제스처 testID: `day-swipe-pan`.

## DiaryListScreen props

- `onSwipeDay?: (direction: SwipeDirection) => void` — 쓴 날의 본문과 안 쓴 날의 재료 지면에서만 받는다. 쓰는 중(`writing`)에는 넘겨도 쓰지 않는다. 옵셔널(없으면 제스처를 걸지 않는다).
- 큰 날짜 `Pressable`: 접근성 동작 `previousDay`(「전날」)·`nextDay`(「다음 날」), 실행하면 `onSwipeDay("previous" | "next")`.

## 홈 (DiaryHomeScreen)

- `onSwipeDay(direction)`: 현재 `writePromptFor(...).day`에서 `swipeDay(current, direction, now())`를 구해 `null`이 아니면 `setChosenDay`.
