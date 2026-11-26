# Research — 135

## R1 자리↔사진 연결은 어디에서 오는가

- **Decision**: `tracePlaces`의 입력 `TimedCoordinate`에 `photoId`를 싣고, 묶는 김에 `PlaceVisit.photoIds: string[]`를 남긴다. 파이프라인이 저장 직전 `entry.photos[j].photoId`로 자리 순번을 찾는다.
- **Rationale**: 묶기 규칙(100m 순차)을 그대로 두고 결과만 더 낸다(121이 시각·사진 수를 더한 방식과 같다). 저장된 `places`의 순번 = `visits` 순번(`savedPlacesOf`가 같은 순서로 만든다).
- **Alternatives**: 시각 창으로 짐작(원칙 V 위반 — 좌표 없는 사진 오배정), 자리 쪽에 사진 목록 저장(사진 사본 정리와 두 곳이 어긋남).

## R2 옛 일기와 「자리 없음」 가르기

- **Decision**: `placeIndex?: number | null`. 숫자=자리 순번, `null`=좌표가 없어 어느 자리에도 들지 않음(135 이후), 필드 없음=옛 일기. 한 일기의 사진이 모두 `undefined`이면 연결이 없는 옛 일기다.
- **Rationale**: 새 일기에서 우연히 남은 사진이 전부 좌표 없는 날을 「옛 일기」로 잘못 읽지 않는다.

## R3 지도 면의 크기와 투영

- **Decision**: 면은 캐러셀 사진과 같은 폭·높이(`WRITTEN_DAY.photoHeight` 210) + 인디케이터 줄 높이만큼 빈 자리. 안의 지도 상자는 `ROUTE_ASPECT`(0.62)를 지키며 가운데 맞춤(contain)하고 남는 띠는 `COLORS.surface`.
- **Rationale**: 투영을 다시 계산하지 않고(`day-route.ts` 불변) 아래 글 위치가 움직이지 않는다. 폭 320에서 상자 높이 198 ≈ 210이라 띠가 얇다.

## R4 그리기 재사용

- **Decision**: `DayRouteSection`의 `Diagram` 그리기(지도층·선·점 합치기·라벨)를 `RouteCanvas`로 떼어 둘 다 쓴다. `RouteCanvas`는 선택 사항으로 `selected`(점 번호 목록)·`onPressMarker`를 받는다.
- **Rationale**: 점 합치기(DU8)·라벨 배치 규칙을 복제하지 않는다(작업 습관 「같은 규칙의 복제를 센다」).

## R5 전환 움직임

- **Decision**: `FadeLayer`(049)로 두 면 크로스페이드, `useReduceMotion()`이 참이면 즉시. 3D 뒤집기 없음.

## R6 카드 배치

- **Decision**: 카드 크기 고정(폭 132·높이 116, 사람이 정한 값). 누른 점의 위·아래·좌·우 중 지도 상자 안에 들어가고 점을 가리지 않는 첫 자리(오른쪽 위 → 왼쪽 위 → 오른쪽 아래 → 왼쪽 아래), 아무 데도 안 맞으면 상자 안으로 밀어 넣는다(clamp). 순수 함수 `cardPlacement`로 `src/ui/label-placement.ts` 옆에 둔다.

## R7 점 누르기 크기

- **Decision**: 점은 보이는 크기 그대로, 누르는 자리는 `hitSlop`으로 44pt 이상.
