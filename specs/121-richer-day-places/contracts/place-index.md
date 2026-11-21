# Contract: 장소 데이터 파일과 이름 고르기

## 파일 형식 `assets/places/kr-places.bin` (리틀 엔디언)

| 구역 | 내용 |
|---|---|
| 머리 16바이트 | 매직 `PLC1`(4) · 판 `u32`=1 · 장소 수 `u32` · 이름 구역 바이트 수 `u32` |
| 장소 표 (장소 수 × 20바이트) | `lat i32` · `lon i32` (1e-5도) · `nameOffset u32` · `geomOffset u32` · `nameLen u8`(이름은 UTF-8 255바이트까지, 글자 경계에서 자름) · `category u8` · `flags u8`(bit0 경계 상자, bit1 다각형) · `pad u8` |
| 이름 구역 | UTF-8 이름들을 이어 붙인 것 |
| 도형 구역 | 장소마다(플래그가 있을 때): 경계 상자 `i32×4`(minLat,minLon,maxLat,maxLon) · (다각형이면) 고리 수 `u16` · 고리마다 꼭짓점 수 `u16` + 꼭짓점 `(i16 dLat, i16 dLon)×n`(장소 좌표 `lat`,`lon`에서의 차이). 고리는 바깥 고리·구멍·여러 조각을 모두 담고, 안·밖은 모든 고리에 대한 짝홀 판정이다(구멍 안은 밖) |

구현 중 바뀐 것(2026-11-21, 10MB 상한 SC-006을 지키려고): 첫 빌드 14.9MB → 「101동」류 아파트 동·호 번호 이름을 거르고(이름 뒤에 띄어 붙은 번호는 걷는다), 표를 24→20바이트로, 경계 단순화 허용 오차를 1e-4→2e-4도(약 20m)로, 건물·기관은 꼭짓점 없이 경계 상자만 담는다(상자로 안·밖을 가른다) → 9.98MB. 바깥 고리만 담던 첫 판은 섬을 비운 여의도한강공원 안으로 섬 전체를 넣어 여의도 IFC를 틀렸다 → 모든 고리를 담는다.

`category` 코드: 0 station · 1 landmark · 2 park · 3 mall · 4 institution · 5 building · 6 residential · 7 locality.

IX0. 건물·기관은 경계 상자만 남고 상자로 안·밖을 가른다. int16 범위(±0.327도)를 넘어 꼭짓점을 담을 수 없는 그 밖의 면은 상자도 두지 않고 점(대표 좌표)으로만 남는다 — 상자로 가르면 해상 국립공원 셋(한려·다도해·변산반도)이 목포·여수·통영·거제를 통째로 품었다(코드 리뷰, 2026-11-21).
IX6. 역(`station`)은 철도역뿐이다 — `railway=station|halt`, 또는 `public_transport=station`에 `train|subway|light_rail|monorail|tram=yes`. 버스·여객선 터미널과 탈것 태그 없는 정류장은 명소(이름 그대로, 「역」을 붙이지 않는다). `office`는 공공·행정·외교·공단(`government`·`administrative`·`diplomatic`·`quango`)만 건물로 받고 민간 회사·학원·대리점·중개·법무·세무·`yes`는 뺀다. 동네 의원(`○○의원`·진료과목·비만/피부숍 등, 병원·의료원·보건소 제외)·학원·교습소·법인 표지(`(주)` 등)와 가게·숙박·유흥 상호명도 `categorize.ts`에서 거른다.
IX1. 머리 매직·판이 다르거나 길이가 맞지 않으면 파서는 던진다(포트가 잡아 `unknown`으로 접는다).
IX2. 이름은 모두 한글을 하나 이상 품는다.
IX3. 가게·음식점 범주가 없다(코드 8 이상 없음).
IX4. 파일 크기 ≤ 10MB(SC-006). 2026-11-21 데이터 9.05MB(161,204곳) — 다음 OSM 갱신에서 넘으면 형식(칸 색인 미리 계산 등)을 다시 본다.
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
PN3. 대조표 `__tests__/signals/place-names.golden.test.ts` — 20곳 기대 이름(실제 번들 파일로 돈다). 16곳 이상 일치(SC-001), 불일치는 표에 까닭과 함께 `expectedMiss`로 적는다. 결과(2026-11-21 데이터): 18곳 일치, 두물머리·전주 한옥마을은 OSM에 이름이 없어 맞힐 수 없다. 코드 리뷰 회귀 다섯 곳(목포역·여수엑스포역·거제시청·완도읍·울릉 도동항)은 모두 맞아야 한다.
PN4. 조회는 결정적이다(같은 입력 → 같은 출력).

## 포트 `PlaceIndexPort`

```ts
interface PlaceIndexPort { load(): Uint8Array }   // 동기. 실패는 던진다
```

- `expoPlaceIndexPort()` — `prepare()`(비동기, `expo-asset`으로 번들 자산 로컬 경로를 얻는다) 뒤 `load()`가 `File(...).bytesSync()`로 읽는다. 이 파일만 `expo-asset`·번들 자산을 안다. 조립부(`wiring.ts` `devicePlaceNames`)가 `prepare()`를 기다린 뒤 `placeNamer`를 부르고, `prepare()`가 실패하면 이름은 모두 `unknown`이다.
- 상위의 `placeNamer(port)`는 처음 부를 때 한 번 읽어 색인을 만들고 기억한다. 읽기·파싱이 던지면 기억하지 않고 그 호출의 모든 자리를 `unknown`으로 돌려준다(R10).

PP1. `File`의 비동기 메서드를 쓰지 않는다(`expo-file-sync` 계약).
PP2. `src/ui/`는 이 포트·`place-names`를 import하지 않는다.
