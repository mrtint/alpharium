# Contract: 장소 데이터 파일과 이름 고르기

## 파일 형식 `assets/places/kr-places.bin` (리틀 엔디언)

| 구역 | 내용 |
|---|---|
| 머리 16바이트 | 매직 `PLC1`(4) · 판 `u32`=1 · 장소 수 `u32` · 이름 구역 바이트 수 `u32` |
| 장소 표 (장소 수 × 24바이트) | `lat i32` · `lon i32` (1e-5도) · `category u8` · `flags u8`(bit0 경계 상자, bit1 다각형) · `nameLen u16` · `nameOffset u32` · `geomOffset u32` · `pad u32` |
| 이름 구역 | UTF-8 이름들을 이어 붙인 것 |
| 도형 구역 | 장소마다(플래그가 있을 때): 경계 상자 `i32×4`(minLat,minLon,maxLat,maxLon) · 꼭짓점 수 `u16` · 꼭짓점 `(i16 dLat, i16 dLon)×n`(첫 점 = `lat`,`lon`에서의 차이) |

`category` 코드: 0 station · 1 landmark · 2 park · 3 mall · 4 institution · 5 building · 6 residential · 7 locality.

IX1. 머리 매직·판이 다르거나 길이가 맞지 않으면 파서는 던진다(포트가 잡아 `unknown`으로 접는다).
IX2. 이름은 모두 한글을 하나 이상 품는다.
IX3. 가게·음식점 범주가 없다(코드 8 이상 없음).
IX4. 파일 크기 ≤ 10MB(SC-006).
IX5. `kr-places.meta.json`의 sha256이 파일과 같다(테스트가 대조).

## 이름 고르기 `choosePlaceName(index, coordinate): PlaceName`

순서(먼저 맞는 것을 고른다):

| 순 | 조건 | 같은 순위 안에서 |
|---|---|---|
| 1 | 다각형 안에 있는 landmark·park·mall | 경계 상자 넓이가 가장 큰 것 |
| 2 | 다각형 안에 있는 building·institution·residential | 경계 상자 넓이가 가장 큰 것 |
| 3 | 250m 안의 station | 가장 가까운 것 — 이름이 「역」으로 끝나지 않으면 「역」을 붙인다 |
| 4 | 300m 안의 landmark·park·mall(점 또는 대표 좌표) | 가장 가까운 것 |
| 5 | 100m 안의 building·institution | 가장 가까운 것 |
| 6 | 1.5km 안의 locality | 가장 가까운 것 |
| — | 없음 | `{ kind: "none" }` |

PN1. 거리 상수(250·300·100·1500m)는 `src/signals/place-names.ts` 한 곳에 있고 「사람이 정한 값, 실측 아님」 주석이 붙는다.
PN2. 순위 2가 순위 3보다 먼저다(스파이크: 코엑스 건물 안인데 역을 고른 오류).
PN3. 대조표 `__tests__/signals/place-names.golden.test.ts` — 20곳 기대 이름(실제 번들 파일로 돈다). 16곳 이상 일치(SC-001), 불일치는 표에 까닭과 함께 `expectedMiss`로 적는다.
PN4. 조회는 결정적이다(같은 입력 → 같은 출력).

## 포트 `PlaceIndexPort`

```ts
interface PlaceIndexPort { load(): Uint8Array }   // 동기. 실패는 던진다
```

- `expoPlaceIndexPort()` — `expo-asset`으로 번들 자산 로컬 경로 → `File(...).bytesSync()`. 이 파일만 `expo-asset`·번들 자산을 안다.
- 상위의 `placeNamer(port)`는 처음 부를 때 한 번 읽어 색인을 만들고 기억한다. 읽기·파싱이 던지면 기억하지 않고 그 호출의 모든 자리를 `unknown`으로 돌려준다(R10).

PP1. `File`의 비동기 메서드를 쓰지 않는다(`expo-file-sync` 계약).
PP2. `src/ui/`는 이 포트·`place-names`를 import하지 않는다.
