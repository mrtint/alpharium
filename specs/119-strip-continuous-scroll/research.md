# Research: 119 스트립 이어 스크롤

## R1 목록 부품

- Decision: 가로 `FlatList` + `getItemLayout`(고정 폭) + `snapToInterval`(칸 폭) + `decelerationRate="fast"` + `initialScrollIndex`(마지막 칸 기준 오른쪽 끝).
- Rationale: 가상화·관성·붙기가 기본 기능. 고정 폭이라 `getItemLayout`으로 임의 칸으로 바로 스크롤할 수 있다.
- Alternatives: `ScrollView` 전부 그리기(366 `Pressable` 첫 그리기 부담), 지금 같은 팬 + reanimated 직접 이동(관성·붙기 재구현), `inverted` 가로 목록(RTL·스크롤 방향 계산이 헷갈려 버렸다 — 데이터를 과거→오늘로 두고 끝에서 시작하면 된다).

## R2 칸 폭

- Decision: 스트립 `onLayout` 폭 ÷ 7. 폭을 모르는 첫 프레임에는 `Dimensions` 창 폭에서 홈 좌우 여백을 뺀 값을 쓰지 않고, 폭을 알 때까지 목록을 그리지 않는다(빈 높이 자리만 둔다).
- Rationale: 첫 그리기에 칸 폭이 바뀌면 오프셋이 어긋난다. 높이는 칸 높이 고정이라 052 접힘이 흔들리지 않게 자리는 같은 높이로 둔다.
- 자리: 폭을 알기 전에는 칸 하나를 `opacity: 0`으로 그린 같은 높이의 줄을 둔다(높이가 칸에서 나오므로 글꼴 배율을 따라간다).

## R3 바깥 변경 시 스크롤

- Decision: 순수 함수 `stripScrollTarget({ index, offset, cellWidth, visible: 7 })` → 고른 칸이 화면 안이면 `null`, 왼쪽 밖이면 `index × w`, 오른쪽 밖이면 `(index − 6) × w`. `DayPicker`는 고른 날(`selected` 칸)이 바뀔 때만 부르고 `scrollToOffset({ animated: !reduceMotion })`.
- Rationale: 최소 거리. 사용자가 스크롤만 한 경우에는 고른 날이 바뀌지 않으니 스크롤도 끼어들지 않는다.
- 현재 오프셋은 `onScroll`/`onMomentumScrollEnd`에서 ref에 둔다(상태 아님 — 다시 그리지 않는다).

## R4 범위 시작

- Decision: `stripStartDay(selected, now) = min(shiftDay(dayOf(now), −365), selected)`. 문자열 `YYYY-MM-DD` 비교로 min.
- Rationale: 소유자 결정 365일 + 고른 칸 보존.

## R5 자정

- Decision: 오늘이 바뀌면 칸 목록 끝에 새 칸이 붙는다. 시작도 하루 밀린다(365일 창) — 첫 칸이 빠지고 끝 칸이 붙어 칸 수는 같다. 스크롤 오프셋을 유지하면 보이는 칸이 하루 밀리지만, 고른 날이 화면 안이면 끼어들지 않는다(사용자는 자정을 넘겨 스트립을 보는 일이 드물다 — 받아들인다).
- Alternatives: 오프셋 보정(복잡도 대비 이득 작음). 기록만 남긴다.

## R6 jest

- `FlatList`는 jest에서 `initialNumToRender`(기본 10)·창 크기만큼 그린다. `initialScrollIndex`가 있으면 그 근처를 그린다. 테스트에서 화면 밖 칸을 누르던 곳은 오늘 근처 칸으로 바꾸거나 칸 목록 순수 함수로 잠근다.
- `scrollToOffset`은 ref 스파이로 확인한다.

## R7 지울 것

- `weekOf`·`shiftWeek`: `src/`·`App.tsx`·`scripts/`에서 쓰는 곳은 `state.ts`의 `weekCellsFor`·`swipeWeek`뿐이다(2026-11-16 grep) — 지운다.
- `src/ui/DaySwipe.tsx` 주석이 `swipeDirectionOf`를 가리킨다 — 고친다.
- `home-text.ts`가 주 관련 문구를 갖고 있으면 쓰는 곳을 확인한다.
