# 계약 — 126 지도 파일 `assets/map/kr-map.bin` (`__tests__/map/`·`__tests__/config/day-map-rules.test.ts`가 잠근다)

## 파일 형식 (`src/map/map-file.ts`가 상수·파서의 정본, `scripts/map/pack.ts`가 같은 상수를 쓴다)

- MP1: 헤더 32바이트 — 매직 `MAP1`(4), 버전 u16(=1), 층 수 u16(=7), `cellE5` u32(=10000), 범위 `minLonE5`·`minLatE5`·`maxLonE5`·`maxLatE5` i32×4, `cols`·`rows` u16×2. 모든 정수는 리틀엔디안.
- MP2: 헤더 뒤에 **칸 표** — `cols × rows`개 항목, 항목마다 `offset` u32(파일 처음 기준, 0이면 빈 칸). 칸 번호는 `row × cols + col`, `col`은 서에서 동으로, `row`는 남에서 북으로.
- MP3: 칸 블록 — 층 7개의 `length` u32 목록(L0~L6, 0이면 그 층 없음) 뒤에 층 블록들이 순서대로 이어진다.
- MP4: 층 블록 — 도형 개수(가변 정수) 뒤에 도형들. 도형 하나는 점 수(가변 정수), 첫 점의 칸 안 상대 좌표 `x`·`y`(u16, 1e-5도, 0~10000), 이어서 이전 점과의 차 `dx`·`dy`(zigzag 가변 정수). **면(L0·L1)은 처음과 끝이 같은 닫힌 고리다**(끝점을 적는다). 구멍도 같은 층의 별도 고리로 담는다. **바깥 고리는 반시계, 구멍은 시계로 맞춰 담고(빌드가 `orientRing`으로 정한다) 화면이 비영(nonzero) 채우기로 그린다** — 짝홀(evenodd)은 겹친 바깥 고리(공원 안의 숲 등)를 구멍으로 만든다(코드 리뷰). 칸 자르기는 방향을 보존한다.
- MP5: 층 의미 — L0 물(면), L1 공원·숲(면), L2 철도(선), L3 강(선), L4 주요 도로, L5 2·3차 도로, L6 골목·생활도로(선). 층 배열의 자리가 층 코드다.
- MP6: 칸 경계에서 도형을 자른다. 선은 칸 사각형에 맞춰 조각으로 나누고 면은 칸 사각형과 겹치는 고리로 자른다(변이 칸 경계를 따를 수 있다). 칸 사이 틈 없이 같은 좌표계(전체 1e-5도 → 칸 상대)로 이어진다.
- MP7: 형식·파서는 **import가 없는 순수 파일**이다(Node 스크립트가 타입 제거만으로 읽는다, `place-index.ts`와 같은 방식).

## 파서 `parseMapFile(bytes)`·`readCellLayers(index, cell, layers)` (`src/map/map-file.ts`)

- MP8: 매직·버전이 다르거나 칸 표·블록이 파일 밖이면 던진다(받는 쪽이 「지도 없음」으로 접는다).
- MP9: `readCellLayers`는 칸의 요청한 층만 해석해 칸 상대 좌표 도형 목록을 돌려준다. 빈 칸·없는 층은 빈 목록이다. 파일 밖 칸 번호는 빈 목록이다(던지지 않는다).
- MP10: 왕복 — `pack`으로 만든 바이트를 `parse`·`read`하면 입력 도형(좌표 1e-5도 정수)과 같다.

## 번들 자산 계약 (`__tests__/map/kr-map-file.test.ts`, 장소 파일 `kr-places-file.test.ts`와 같은 방식)

- MP11: 크기가 `MAP_MAX_BYTES` 이하(목표 약 9MB). 상수는 `src/map/map-file.ts`에 **사람이 정한 값**으로 한 곳에 두고 빌드(BM4)와 테스트가 같이 읽는다. 처음 값은 10,000,000(장소 파일과 같은 상한)이고 T012의 실측 뒤 소유자와 정한 값으로 줄인다.
- MP12: `kr-map.meta.json`의 sha256·bytes가 파일과 같다. 원본 url에 `geofabrik.de`, 라이선스에 `ODbL`·`OpenStreetMap`이 있다.
- MP13: 서울 도심 한 점(37.5547, 126.8977)을 덮는 칸이 L0~L6에 도형이 있다(빈 파일을 막는다). 한강 위 점은 L0 면 안이다.
- MP14: 앱 번들에서 `assets/map/kr-map.bin`이 자산으로 들어가고(`metro.config.js`의 `bin` 확장자는 기존) 새 권한이 없다.

## 빌드 `scripts/map/build-map.mts` (유일한 만드는 길)

- BM1: 입력은 `scripts/places/.cache/south-korea-latest.osm.pbf`(장소 파일과 같은 원본), 도구는 `osmium`(`tags-filter`·`export`). 층별 태그는 research R2 표다.
- BM2: 층별 단순화 허용 오차는 빌드 상수 한 곳(사람이 정한 값)이다. Douglas-Peucker는 `scripts/map/simplify.ts`(순수)가 한다.
- BM3: 출력 `assets/map/kr-map.bin`·`kr-map.meta.json`. 같은 입력이면 같은 바이트(결정적).
- BM4: 상한(`MAP_MAX_BYTES`)을 넘으면 실패한다 — 값을 자동으로 올리지 않는다(사람이 값을 고친다).
- BM5: 빌드 순수 부분(단순화·칸 자르기·가변 정수·팩)은 `__tests__/map/`가 잠근다. osmium 실행은 기기 불필요 테스트에서 하지 않는다(작은 표본 geojson으로 순수 부분을 시험).
