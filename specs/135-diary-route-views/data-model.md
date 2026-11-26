# Data Model — 135

## DiaryEntry.photos[] (저장, 변경)

| 필드 | 타입 | 뜻 |
|---|---|---|
| photoId · takenAt · resizedPath · ownsResizedPath | 기존 | 그대로 |
| **placeIndex** | `number \| null`, 선택 | `entry.places`의 0부터 순번. `null` = 좌표가 없어 어느 자리에도 들지 않음. 없음 = 135 이전 일기 |

- DM1: 135 이후 저장되는 일기의 모든 `photos[]` 항목은 `placeIndex` 키를 가진다(숫자 또는 `null`).
- DM2: 숫자는 `0 ≤ placeIndex < places.length`.
- DM3: 옛 일기는 열 때 고쳐 쓰지 않는다.

## PlaceVisit (신호, 변경 — 저장 안 함)

- `photoIds: string[]` — 그 자리에 묶인 좌표 있는 사진 식별자, 시각순. `photoIds.length === photoCount`.

## TimedCoordinate (신호, 변경)

- `photoId: string` 추가.

## RouteCard (화면 상태, 저장 안 함)

`routeCardFor(photos, numbers)` 결과 — `numbers`는 누른 점의 자리 번호들(1부터):

- `{ kind: "photos", photos: CarouselPhoto[] }` — 그 자리들 사진, 시각순(1장 이상)
- `{ kind: "empty" }` — 그 자리에 남은 사진 없음. **일기 사진이 0장이면 언제나 이것이다**(옛·새 일기 모두 「남은 사진이 없다」가 사실)
- `{ kind: "unlinked" }` — 일기 사진이 1장 이상이고 그 모두에 `placeIndex` 키가 없음(옛 일기)

## 면 상태 (화면, 저장 안 함)

`"photos" | "map"`, 날짜(`entry.date`)가 바뀌면 `"photos"`로. 사진 0장·지도 가능이면 늘 `"map"`이고 전환 버튼이 없다.
