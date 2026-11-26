# Contract — 쓴 날 지도 면 (135)

- **WR1** 지도 면이 있는 날 = `route !== undefined && route.diagram && route.items.length ≥ 1`. 아니면 지도 아이콘·지도 면이 없고 지면은 134 모양 그대로(`DayRouteSection` 포함).
- **WR2** 지도 면이 있고 사진 ≥1이면 캐러셀(`photo-carousel`) 안 우측 하단에 `testID="show-route-map"` 버튼, 라벨 `ROUTE_TEXT.showMapA11y`.
- **WR3** 누르면 `testID="route-face"`가 같은 자리에 보이고 `testID="show-photos"`(라벨 `showPhotosA11y`)가 우측 하단에 있다. 누르면 캐러셀로 돌아간다. 캐러셀은 마운트를 유지해 보던 장이 남는다.
- **WR4** 사진 0장 + 지도 면이면 `route-face`만, `show-photos` 없음.
- **WR5** 지도 면이 있는 날 `day-route-section`(아래 칸)은 그리지 않는다.
- **WR6** 날짜가 바뀌면 사진 면.
- **WR7** 점 `testID="route-marker-<첫 번호>"`는 버튼, 라벨 `ROUTE_TEXT.markerA11y(numbers, label, period)`. 누르면 `route-card` 표시·점 강조(`accent`). 같은 점·지도 빈 곳(`route-face-backdrop`) 누름이면 닫힘, 다른 점이면 옮김, 면 전환 시 닫힘.
- **WR8** 카드: `photos`면 최대 3장 겹침(`route-card-photo-<i>`), 넘으면 `route-card-more` 「+N」, 줄 「번호 · 이름 · 때」(이름 없으면 「번호 · 때」). 누르면 `PhotoViewer`가 그 사진들로 열린다(라벨 `cardA11y(n, count)`). `empty`면 `ROUTE_TEXT.cardEmpty`, `unlinked`면 `ROUTE_TEXT.cardUnlinked`, 둘 다 누를 수 없다.
- **WR9** 전환은 크로스페이드, `useReduceMotion()` 참이면 즉시.
- **WR10** 위경도는 화면으로 오지 않는다(`DayRoute` 그대로). 새 문구는 `src/i18n/catalogs/ko/`에만.
- **WR11** 저장: 새 일기의 `photos[]` 항목은 모두 `placeIndex`(숫자|null) 키를 가진다(DM1·DM2).
