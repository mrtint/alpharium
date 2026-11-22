# 데이터 모델 — 126

## 번들 파일 `assets/map/kr-map.bin` (읽기 전용)

형식은 [contracts/map-file.md](contracts/map-file.md). 앱 안에서는 `parseMapFile(bytes)`가 만드는 **`MapIndex`**(순수, 기기 모름)로만 다룬다.

| 필드 | 뜻 |
|---|---|
| `bounds` | 파일이 덮는 위경도 범위(1e-5도). 밖이면 「지도 없음」 |
| `cellE5` | 칸 한 변(10,000 = 0.1도) |
| `cols`·`rows` | 칸 격자 크기 |
| `cellBlocks(cell)` | 그 칸의 층 L0~L6 블록 위치(없는 칸·없는 층은 길이 0) |

기록 `kr-map.meta.json`: 원본(url·lastModified·bytes·license), 출력(bytes·sha256·칸 수·층별 bytes), 단순화 값(층별 허용 오차), 만든 날.

## `RouteMap` (화면이 받는 지도 — 좌표 없음)

`app/day-route.ts`가 `src/map/render.ts`에 상자를 넘겨 받은 **상대 경로**다(타입은 `src/map/render.ts`가 정의한다). 위경도가 없다.

| 필드 | 뜻 |
|---|---|
| `box` | `{ w: 1000, h: 620 }` — 경로 좌표의 상자(`ROUTE_ASPECT`에서 나온다) |
| `water` · `park` | 면 경로 문자열(`M x y L …`, 정수) |
| `rail` · `river` | 선 경로 문자열 |
| `roadMajor` · `roadMid` · `roadMinor` | 도로 경로 문자열(상세 정도에 안 든 층은 빈 문자열) |
| `roadWidth` | 상자 단위의 큰 길 굵기(상자 폭이 좁을수록 굵다 — 사람이 정한 값, 구간표 3개) |

빈 지도(모든 문자열이 빈)이면 `RouteMap`을 만들지 않는다(`DayRoute.map` 없음, FR-007).

## `DayRoute` 확장 (125에 더하는 것)

- `map?: RouteMap` — 있으면 화면이 도식 뒤에 깐다. `diagram: false`면 없다.
- 도식의 자리 좌표는 **저장된 `latE5`·`lonE5`가 모든 자리에 있으면 그것**, 아니면 다시 읽은 `visits`(일치할 때만)에서 온다.
- `items[i].label: string | null` — 125와 같다. 화면은 `null`이면 이름 칸을 비운다(FR-015).
- `diagram`의 뜻이 바뀐다: 「저장된 좌표가 모든 자리에 있거나, (없으면) visits를 읽었고 저장된 자리와 일치하고, 자리가 1곳 이상」.

## `SavedPlace` 확장 (일기 파일 — 스냅샷)

`entry.places[i]`에 두 필드를 더한다(옵셔널 — **옛 일기에는 없다**).

| 필드 | 뜻 |
|---|---|
| `latE5` | 그 자리 첫 사진 좌표의 위도 × 100,000을 반올림한 정수(약 1m). 범위 −9,000,000~9,000,000 |
| `lonE5` | 같은 방식의 경도. 범위 −18,000,000~18,000,000 |

- 두 필드는 **함께 있거나 함께 없다**(한쪽만 있는 자리는 읽을 때 좌표 없음으로 본다).
- 일기를 쓸 때(`savedPlacesOf`, 파이프라인 저장 시점)만 채운다. 열어 보는 동작은 쓰지 않는다. 좌표를 못 읽은 날은 `places` 자체가 없다(121).
- 옛 일기는 그대로 읽는다(필드 없음 → 사진 좌표 다시 읽기 폴백, DM1).

## 새 값이 없는 것

설정·장부: 변화 없음. 지도 결과(경로)는 저장하지 않는다(FR-008).
