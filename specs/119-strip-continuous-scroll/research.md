# Research: 119 스트립 이어 스크롤

## R1 목록 부품

- Decision: 가로 `FlatList` + `getItemLayout`(고정 폭) + `snapToInterval`(칸 폭) + `decelerationRate="fast"` + `initialScrollIndex`(마지막 칸 기준 오른쪽 끝).
- Rationale: 가상화·관성·붙기가 기본 기능. 고정 폭이라 `getItemLayout`으로 임의 칸으로 바로 스크롤할 수 있다.
- Alternatives: `ScrollView` 전부 그리기(366 `Pressable` 첫 그리기 부담), 지금 같은 팬 + reanimated 직접 이동(관성·붙기 재구현), `inverted` 가로 목록(RTL·스크롤 방향 계산이 헷갈려 버렸다 — 데이터를 과거→오늘로 두고 끝에서 시작하면 된다).

## R2 칸 폭

- Decision: 스트립 `onLayout` 폭 ÷ 7. 재기 전 첫 프레임은 창 폭(`useWindowDimensions`)으로 어림해 그리고, 잰 폭이 다르면 목록을 `key={width}`로 다시 세워 보던 첫 칸을 `initialScrollIndex`로 유지한다.
- 처음 계획(폭을 알 때까지 보이지 않는 칸만 그린다)은 구현 중 바꿨다: jest에는 레이아웃이 없어 스트립에 닿는 화면 테스트 수십 곳이 칸을 못 찾았고, 실기기에서도 첫 프레임에 빈 줄이 보일 수 있다(추정 — 관측하지 않았다).
- Rationale: 칸 폭이 바뀐 목록의 처음 위치는 `initialScrollIndex`로만 정확히 맞는다.
- 높이: 칸 높이는 폭과 무관하므로 어림 폭으로 그려도 스트립 높이는 같다(052 접힘 유지).

## R3 바깥 변경 시 스크롤

- Decision: 순수 함수 `stripScrollTarget({ index, offset, cellWidth, visible: 7 })` → 고른 칸이 화면 안이면 `null`, 왼쪽 밖이면 `index × w`, 오른쪽 밖이면 `(index − 6) × w`. `DayPicker`는 고른 날(`selected` 칸)이 바뀔 때만 부르고 `scrollToOffset({ animated: !reduceMotion })`.
- Rationale: 최소 거리. 사용자가 스크롤만 한 경우에는 고른 날이 바뀌지 않으니 스크롤도 끼어들지 않는다.
- 현재 오프셋은 `onScroll`/`onMomentumScrollEnd`에서 ref에 둔다(상태 아님 — 다시 그리지 않는다).

## R4 범위 시작

- Decision: `stripStartDay(selected, now) = min(shiftDay(dayOf(now), −365), selected)`. 문자열 `YYYY-MM-DD` 비교로 min.
- Rationale: 소유자 결정 365일 + 고른 칸 보존.

## R5 자정·범위 앞쪽 변화

- Decision: 오늘이 바뀌면 칸 목록 끝에 새 칸이 붙고 시작도 하루 밀린다(365일 창). 같은 오프셋이 다른 날을 가리키게 되므로, `DayPicker`가 앞 칸 목록과 비교해 앞쪽에서 늘거나 준 칸 수만큼 오프셋을 고치고 움직임 없이 그 위치로 옮긴다(보던 날이 그대로 보인다). 1년보다 먼 날을 골라 범위가 늘었다 줄어들 때도 같다.
- Alternatives: 오프셋을 그대로 두기(보이는 칸이 하루 밀린다 — 구현하며 보정이 짧아 버렸다).

## R6 jest

- `FlatList`는 jest에서 `initialNumToRender`(기본 10)·창 크기만큼 그린다. `initialScrollIndex`가 있으면 그 근처를 그린다. 테스트에서 화면 밖 칸을 누르던 곳은 오늘 근처 칸으로 바꾸거나 칸 목록 순수 함수로 잠근다.
- `scrollToOffset`은 ref 스파이로 확인한다.

## R7 지울 것

- `weekOf`·`shiftWeek`: `src/`·`App.tsx`·`scripts/`에서 쓰는 곳은 `state.ts`의 `weekCellsFor`·`swipeWeek`뿐이다(2026-11-16 grep) — 지운다.
- `src/ui/DaySwipe.tsx` 주석이 `swipeDirectionOf`를 가리킨다 — 고친다.
- `home-text.ts`가 주 관련 문구를 갖고 있으면 쓰는 곳을 확인한다.

## R8 코드 리뷰 반영 (2026-11-16)

- 갈래(쓴 날·안 쓴 날·쓰는 중)마다 스트립이 트리의 다른 자리에 놓여 새로 마운트돼, 칸을 누를 때마다 처음 자리로 튀었다(리뷰 Important 1, 관측 아님 — 코드 읽기). `DiaryListScreen`이 기억(`StripMemory` — 보던 첫 칸의 날·잰 폭)을 `useRef`로 하나 들고 `DayPicker`에 넘긴다. 스트립은 마운트할 때 한 번만 읽는다(`react-hooks/refs` 규칙은 지연 초기화도 막아 그 두 줄만 끈다).
- 먼 날로 옮길 때 거리와 상관없이 미끄러졌다(리뷰 Important 2). 한 화면(7칸, 사람이 정한 값)보다 멀거나 범위 앞쪽이 바뀐 직후면 움직임 없이 옮긴다.
- 고른 날이 바뀌었는지는 인덱스가 아니라 날짜로 비교한다. 칸 그리기는 `memo`·`useCallback`으로 다시 그리기를 줄였다.
- `stripCellsFor`가 `cellFor`와 같은 판정을 다시 쓰는 것은 일기 날짜 집합으로 366칸을 한 번에 보려는 것이다 — 두 결과가 같다는 것은 CAL6 테스트가 잠근다.
