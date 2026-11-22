# 계약 — 126 동선 지도 (`__tests__/app/day-route.test.ts`·`day-map.test.ts`·`__tests__/map/render.test.ts`·`__tests__/ui/day-route-section.test.tsx`·`route-map-layer.test.tsx`·`__tests__/config/day-map-rules.test.ts`가 잠근다)

125 계약(`specs/125-day-route-diagram/contracts/day-route.md`)은 아래에서 **바뀌는 줄만** 대체한다. 나머지(DR1·DR3·DR5·DR8·DR9, DU1·DU2·DU5·DU6·DU7·DU8, DF1·DF3~DF6, DB1~DB6)는 그대로다. 대체되는 줄: DR2·DR4·DR6·DR7(상자 폭)·DU3(이름 없음 문구)·DU4(설명 줄)·DF2(1곳도 부른다).

## 순수 변환 `buildDayRoute(visits, saved, map)` (`src/app/day-route.ts`)

- DM1: `saved`가 없거나 비면 `null`(125 DR1). **`saved.length >= 1`이고 (a) 모든 자리에 `latE5`·`lonE5`가 있거나 (b) `visits`가 읽혔고(`!== null`) `sameVisits`이면 `diagram: true`**이고 모든 항목에 `x`·`y ∈ [0,1]`이 있다(자리 1곳이어도). (a)이면 `visits`는 쓰지 않는다 — 사진·권한과 무관하다(FR-017). 한 자리라도 좌표가 없으면 (b)로 간다.
- DM2: 상자 프레임의 폭(경도×cos 환산, 미터)은 자리들이 여백 안에 들어가는 폭과 `MIN_FRAME_METERS`(600) 중 큰 값이다. 자리가 1곳이거나 모두 같은 곳이면 점은 프레임 중앙(0.5, 0.5)이다. `SAME_PLACE_METERS` 퇴화 판정은 없다.
- DM3: 600m보다 넓게 퍼진 자리는 125와 같은 프레임(여백 `ROUTE_MARGIN` 안)이다 — 최소 폭이 영향을 주지 않는다.
- DM4: `map` 인자는 `MapIndex | null`(지도 파일을 읽은 결과, 못 읽었으면 `null`). `null`이거나 프레임이 파일 범위 밖이거나 그릴 것이 없으면 `DayRoute.map`이 없다(125 모양 그대로, FR-007).
- DM5: (a)가 아니고 `visits`를 못 읽었거나 `sameVisits`가 아니면 `diagram: false`이고 `map`도 없다(원칙 V — 좌표를 모르면 지도 위치도 모른다).
- DM6: 반환 모양에 위도·경도·`Coordinate`가 없다. `RouteMap`에도 없다(문자열은 상자 안 정수 좌표만, 타입과 런타임 키 검사 — DR8 확장).
- DM7: 순수하다 — 시각·파일·기기·네트워크를 읽지 않는다(`MapIndex`는 이미 읽은 바이트의 해석 결과).

## 지도 렌더 `renderMap(index, frame)` (`src/map/render.ts`, 순수)

- DM8: 입력은 프레임의 **위경도 범위**(상자 네 모서리)와 폭(미터)과 투영 함수이고 출력은 `RouteMap | null`. **위경도를 받는 곳은 `src/app/`·`src/map/` 안뿐이고 반환에는 남지 않는다.** 상세 정도는 프레임 폭으로 정한다 — < 3km: L0~L6, 3~15km: L0~L5, ≥ 15km: L0~L4. 문턱·점 수 상한·굵기 구간표는 `app/day-map.ts`의 상수 하나(사람이 정한 값)이고 `renderMap`의 `options` 인자로 **넘겨진다**(`src/map/`은 `src/app/`을 import하지 않는다). `RouteMap` 타입은 `src/map/render.ts`가 정의한다.
- DM8a: 범위가 닿는 칸만 읽고(`readCellLayers`) 칸 상대 좌표를 프레임 상대 정수 좌표(0~1000 × 0~620)로 옮긴다. 프레임 밖으로 완전히 나간 도형은 버리고 걸친 도형은 그대로 둔다(화면 `Svg`가 자른다).
- DM8b: 파일 범위 밖이거나 도형이 하나도 없으면 `null`.
- DM8c: 한 경로 문자열이 터무니없이 커지지 않는다 — 점 수가 `MAX_PATH_POINTS`(사람이 정한 값, 처음 값 20,000점, T039 측정 뒤 손본다)를 넘으면 한 단계 낮은 상세 정도로 다시 만든다.

## 화면

- DM9: `DayRouteSection`은 `route.map`이 있으면 도식 상자 뒤에 `RouteMapLayer`를 깐다(`DayRoute`·`RouteMap`만 받고 신호·`Coordinate`·`MapIndex`를 import하지 않는다 — DU1·DB2 확장). 자리가 1곳이면 설명 줄(「사진이 찍힌 자리를 시간순으로 이은 거예요」)을 생략한다.
- DM10: `RouteMapLayer`는 `react-native-svg`의 `Svg`(viewBox = `RouteMap.box`)로 바탕·면·선을 그린다. 색은 토큰만(`mapLand`·`mapWater`·`mapPark`·`mapRoad`·`mapRoadMinor`), 모서리 반경·그림자·그라데이션 없음, 낭독에서 숨긴다(DU5).
- DM11: 라벨은 `labelPlacement`(순수)가 점·앞 라벨과 겹치지 않는 후보 자리를 정하고 못 찾으면 그 라벨만 생략한다. 이름이 `null`인 자리는 라벨이 없다. 라벨 글자 크기는 글꼴 배율에 변하지 않는다.
- DM12: 범례는 이름이 `null`이면 「번호 · 때」만 적는다(FR-015). 「이름을 모르는 곳」 문구는 코드·카탈로그에 남지 않는다. 낭독도 번호와 때만 읽는다.

## 흐름 (`wiring`·`DiaryHomeScreen`)

- DM13: `wiring.routeDay`는 저장된 자리에 좌표가 다 있으면 사진을 읽지 않고(`loadSignals` 호출 0건), 아니면 `loadSignals`로 사진 좌표를 읽은 뒤(125 그대로) 지도 포트를 준비·읽어 `MapIndex`를 `buildDayRoute`에 넘긴다. 포트가 던지면 `null`로 접는다 — 예외가 화면에 올라오지 않는다. 일기 저장소를 쓰지 않는다(DB3).
- DM14: `DiaryHomeScreen`은 쓴 날 `entry.places`가 **1곳 이상**일 때 `routeDay`를 부른다(125 DF2의 「2곳 이상」 폐기). 1곳이면 먼저 보일 저장 목록은 한 줄이고, 지도는 준비되면 더해진다.
- DM15: 지도가 늦게 더해져 지면 높이가 늘어도 `onReachEndChange`는 값이 바뀐 경우에만 한 번 불린다(DF6 그대로). 지도를 위한 자리 표시 높이를 미리 잡지 않는다.

## 경계·저장

- DM16: `src/ui/`는 `src/map/`을 import하지 못한다(헌법 검사 규칙). 화면이 쓰는 `RouteMap` 타입은 `src/app/day-route.ts`가 `export type { RouteMap }`으로 다시 내보내고 화면은 거기서만 가져온다(`DayRoute`와 같은 길). `src/map/`은 `src/ui/`·`react-native`·`expo-*`·`fetch`를 import하지 못하고 `map-port.ts`만 `expo-asset`·`expo-file-system`을 안다(지연 import).
- DM17: 도식 코드와 `src/map/`에 `fetch(`·`XMLHttpRequest`·지도 라이브러리(`react-native-maps`·`maplibre`·`mapbox`)가 없다(DB1 확장).
- DM18: 새 권한이 없다 — `app.json`의 권한·플러그인 목록이 이 기능으로 바뀌지 않는다(`react-native-svg`는 플러그인 없는 자동 연결). `no-location.test.ts`가 계속 통과한다.
- DM19: 도식을 본 뒤 일기 파일이 바이트까지 같다(저장 0). `src/ui/theme/tokens.ts`의 지도 색 5개는 `design/tokens.json`과 동기다(`tokens-sync`).

## 저장 (소유자 결정 2026-11-22 — 스냅샷)

- DM20: `savedPlacesOf(visits, names)`는 각 자리에 `latE5 = Math.round(latitude × 100000)`·`lonE5 = Math.round(longitude × 100000)`를 담는다. 좌표가 유한한 수가 아니면 그 자리의 두 필드를 모두 담지 않는다(NaN을 저장하지 않는다, 원칙 V).
- DM21: 파이프라인이 저장하는 새 일기의 `places`는 자리 수만큼 좌표를 가진다(「장소 이름으로 보기」가 끔이어도 같다 — 이름 칸만 `null`). 일기 저장·읽기 왕복에서 두 필드가 손실 없이 돌아온다. 좌표 없는 옛 일기는 그대로 읽힌다(`places[i].latE5 === undefined`).
- DM22: 지면을 열어 보는 동작(`routeDay`·`buildDayRoute`)은 일기 저장소를 쓰지 않는다 — 좌표 채움은 일기 쓰기 때뿐이다(DB3 유지). 옛 일기에 좌표를 채워 넣는 이행 코드는 없다.
- DM23: 화면·`RouteMap`·`DayRoute`에는 `latE5`·`lonE5`가 없다(DM6의 키 검사가 이 이름도 막는다).
