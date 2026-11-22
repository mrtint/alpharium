# Tasks: 하루 동선 도식의 일러스트풍 지도

**Input**: `specs/126-route-map-illustration/` (spec.md·plan.md·research.md·data-model.md·contracts/·quickstart.md)

**Tests**: 이 저장소는 계약을 먼저 정하고 테스트를 먼저 쓴다(헌법 「개발 방식」). 각 구현 앞에 실패하는 테스트를 둔다.

**표기**: `[P]` 서로 다른 파일·선행 미완 없음 / `[US1~4]` spec의 사용자 이야기 / 값 표기 「사람이 정한 값」은 코드 주석에 그렇게 적는다(원칙 V).

## Phase 1: Setup

- [ ] T001 `npx expo install react-native-svg`로 의존성을 더하고 `package.json`의 버전이 `15.15.4`(`node_modules/expo/bundledNativeModules.json`)인지 확인한다. `app.json` 플러그인·권한은 바꾸지 않는다(DM18). `package-lock.json` 갱신 포함
- [ ] T002 `package.json`에 스크립트 `map:build`(`node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/map/build-map.mts`)를 더한다
- [ ] T003 `design/tokens.json` `color.items`에 `mapLand`(`#efe9dc`)·`mapWater`(`#a9cfe2`)·`mapPark`(`#bfd9a8`)·`mapRoad`(`#fffdf7`)·`mapRoadMinor`(`#fbf6ea`)를 라이트·다크 둘 다 적고(`note`에 왜 이 값인지: 모형 2026-11-22), `contrast`에 `text`/`mapLand` 쌍을 더한 뒤 `node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/design/build-tokens.mts`로 `src/ui/theme/tokens.ts`·`site/assets/tokens.css`를 생성한다. `__tests__/design/*`(tokens-sync·contrast·app-values)가 통과하게 `__tests__/design/fixtures/app-tokens-before.json`을 새 값으로 고치고 이유를 스펙 `research.md` R8에 남긴다
- [ ] T004 `design/DESIGN.md`에 「지도 전용 색(`mapLand` 외 넷)은 동선 지도에서만 쓴다」 한 줄과 새 토큰 이름을 더하고 `__tests__/design/design-doc.test.ts`가 통과하는지 본다

## Phase 2: Foundational — 지도 파일·읽기·렌더 (모든 이야기가 기댄다)

- [ ] T005 [P] `__tests__/map/map-file.test.ts` 작성(먼저 실패): 헤더 파싱(MP1), 칸 표·층 블록(MP2·MP3), 가변 정수·zigzag 왕복, 도형 왕복(MP10), 잘못된 매직·버전·범위 밖 블록은 던진다(MP8), 범위 밖·빈 칸은 빈 목록(MP9)
- [ ] T006 `src/map/map-file.ts` 구현 — 형식 상수(`MAP_FILE_MAGIC="MAP1"`·`MAP_FILE_VERSION=1`·`MAP_HEADER_BYTES=32`·`MAP_CELL_E5=10000`·`MAP_LAYERS` 7개 코드 L0~L6), `parseMapFile(bytes)`, `readCellLayers(index, cell, layers)`, 위경도 → 칸 번호 도우미. **import가 없다**(MP7). T005 통과
- [ ] T007 [P] `__tests__/map/simplify.test.ts` 작성(먼저 실패): Douglas-Peucker(허용 오차 안의 점 제거·끝점 보존), 선 칸 사각형 자르기(조각으로 나눔), 면 칸 사각형 자르기(닫힌 고리 유지, 칸을 가로지르는 면이 양쪽 칸에 나뉨)
- [ ] T008 `scripts/map/simplify.ts` 구현(순수, 허용 오차는 미터 입력). T007 통과
- [ ] T009 [P] `__tests__/map/pack.test.ts` 작성(먼저 실패): 작은 표본 도형(층별 몇 개)을 `pack` → `parseMapFile`·`readCellLayers`로 읽으면 입력과 같다(MP10), 같은 입력은 같은 바이트(BM3), 표본이 칸 경계를 가로지를 때 양쪽 칸에서 이어진다(MP6)
- [ ] T010 `scripts/map/pack.ts` 구현 — `src/map/map-file.ts` 상수를 가져다 쓴다. T009 통과
- [ ] T011 `scripts/map/build-map.mts` 구현(BM1~BM5): `osmium tags-filter`·`export`로 research R2 표의 층을 뽑아(`scripts/places/.cache/south-korea-latest.osm.pbf` 입력) `simplify`·`pack`으로 `assets/map/kr-map.bin`·`kr-map.meta.json`을 쓴다. 층별 허용 오차(L0 20·L1 20/40·L2 8·L3 15·L4 8·L5 8·L6 8 m, **사람이 정한 값**)·숲 문턱(1km²)은 빌드 상수 한 곳. 크기가 `MAP_MAX_BYTES`(`src/map/map-file.ts`의 상수, 처음 값 10,000,000)를 넘으면 실패(자동 튜닝 없음, BM4)
- [ ] T012 `npm run map:build`를 실제로 돌려 `assets/map/kr-map.bin`·`kr-map.meta.json`을 만든다. 총 크기·층별 크기를 `kr-map.meta.json`과 `research.md` R3에 적고, 약 9MB 목표와 다르면 **여기서 멈추고** 소유자에게 알린다(허용 오차 사다리 R2 — 값 변경은 사람이 한다)
- [ ] T013 `__tests__/map/kr-map-file.test.ts` 작성·통과(MP11~MP14, `kr-places-file.test.ts`와 같은 방식): 크기 ≤ `MAP_MAX_BYTES`(`src/map/map-file.ts`의 상수 — T012 결과를 보고 필요하면 소유자와 정해 줄인다), meta의 sha256·bytes 일치, 원본 `geofabrik.de`·라이선스 `ODbL`·`OpenStreetMap`, 서울 한 점(37.5547, 126.8977) 칸에 L0~L6 도형 있음, 한강 위 점이 L0 면 안, `metro.config.js`가 `bin`을 자산 확장자로 가진다
- [ ] T014 [P] `__tests__/map/render.test.ts` 작성(먼저 실패): 작은 표본 `MapIndex`와 `options`(문턱·굵기·점 수 상한)로 `renderMap`이 상자 상대 정수 좌표(0~1000 × 0~620) 경로를 내는지(DM8a), 상세 정도가 프레임 폭과 `options` 문턱으로 갈리는지(<3km L0~L6, 3~15km L0~L5, ≥15km L0~L4 — DM8), 범위 밖·도형 없음은 `null`(DM8b), 점 수가 `MAX_PATH_POINTS`를 넘으면 한 단계 낮춰 다시 만든다(DM8c), 반환에 위경도가 없다(키 검사)
- [ ] T015 `src/map/render.ts` 구현으로 T014 통과 — `RouteMap` 타입(data-model)과 `renderMap(index, frame, options)`를 여기에 둔다. 상세 정도 문턱·`MAX_PATH_POINTS`·구간표별 `roadWidth`는 `options`로 **받는다**(`src/map/`이 `src/app/`을 import하지 않는다). 이어서 `src/app/day-map.ts` 작성 — 그 값들(3km·15km, `MAX_PATH_POINTS` 처음 값 20,000점, `roadWidth` 구간표, 모두 **사람이 정한 값**)과 `renderMap` 호출 도우미. 위경도를 받는 곳은 `src/app/`·`src/map/` 안뿐이다. `MIN_FRAME_METERS`는 `day-route.ts`에 둔다(R6)
- [ ] T016 [P] `src/map/map-port.ts`와 `__tests__/map/map-port.test.ts` — `place-index-port.ts`와 같은 모양: `prepare()`(여러 번 불러도 한 번, 지연 import `expo-asset`·`expo-file-system`)·`load()`(`File.bytesSync`, **비동기 `File` 호출 금지**)·프로세스 안 보관. 실패는 던진다. 테스트는 대역으로 한 번만 읽는지·실패가 던져지는지 본다
- [ ] T017 [P] `scripts/constitution-rules.ts`에 규칙 추가 — `src/ui/`가 `src/map/`을 import하지 못함(`DM16` — 타입은 `src/app/day-route.ts`의 `export type { RouteMap }`로 가져온다), `src/map/`은 `map-port.ts`를 뺀 모든 파일이 `react-native`·`expo-*`·`fetch`를 import·호출하지 못함, 도식 코드에 `react-native-maps`·`maplibre`·`mapbox`·`fetch(`·`XMLHttpRequest` 없음(DM17). `__tests__/config/day-map-rules.test.ts`로 규칙을 잠그고 **위반 주입**(ui가 map을 import하게 바꿔 보고 되돌린다)으로 잡히는지 확인

**Checkpoint**: 지도 파일이 만들어지고 읽히며 렌더가 순수하게 상대 경로를 낸다. 기기 불필요 테스트 통과.

## Phase 2b: 좌표 스냅샷 저장 (US3·US4, 소유자 결정 2026-11-22) — Phase 3 앞에서 한다

ID는 뒤에 붙었지만 실행 순서는 Phase 2 다음, Phase 3 앞이다(「Dependencies」).

- [ ] T042 [P] [US4] `__tests__/diary/place-lines.test.ts`에 추가(먼저 실패, DM20): `savedPlacesOf(visits, names)`가 자리마다 `latE5 = Math.round(latitude × 100000)`·`lonE5`를 담고 자리 수·시각순·이름은 그대로다, 좌표가 유한하지 않은 자리는 두 필드를 담지 않는다(NaN 금지, 원칙 V), 둘은 함께 있거나 함께 없다
- [ ] T043 [US4] `src/diary/types.ts`의 `SavedPlace`에 옵셔널 `latE5?: number`·`lonE5?: number`(위도 −9,000,000~9,000,000, 경도 −18,000,000~18,000,000 정수)를 더하고 주석(「좌표는 없다」)을 고친다. `src/diary/place-lines.ts` `savedPlacesOf`가 채워 T042 통과. `PromptPlaces`·프롬프트 경로는 좌표를 받지 않는다(원칙 II — 일기 글에 좌표가 들어가지 않는다, 기존 프롬프트 테스트가 통과하는지 본다)
- [ ] T044 [P] [US4] `__tests__/diary/store-places-coordinates.test.ts`(없으면 새로) 작성·통과(DM21): 「장소 이름으로 보기」가 끔이어도 새 일기에 좌표가 저장되고(이름 칸만 `null`), 좌표를 가진 `places`가 일기 저장·읽기 왕복에서 손실 없이 돌아오고, 좌표 없는 옛 일기가 그대로 읽히며(`latE5 === undefined`), 파이프라인이 저장하는 새 일기의 `places` 길이만큼 좌표가 있다(`src/diary/pipeline.ts` 호출부가 방문 좌표를 `savedPlacesOf`에 넘기는지 소스를 읽어 확인하고 테스트로 잠근다)
- [ ] T045 [US4] 일기 파일 불변·저장 경계 계약 확인(DM22): `routeDay`·`buildDayRoute`·`DiaryHomeScreen`에 좌표를 일기에 쓰는 호출이 0건임을 `__tests__/config/day-route-rules.test.ts`(DB3)에 포함하고, 옛 일기에 좌표를 채우는 이행 코드가 없음을 소스 계약으로 둔다
- [ ] T046 [P] [US4] `site/privacy/index.html`에 「일기에 장소 이름과 함께 방문 위치(좌표)가 담기고, 일기는 휴대폰 기본 백업에 포함될 수 있다」 서술을 보강한다(36행 사진 좌표 항목·103행 백업 항목 근처, FR-018). `__tests__/privacy/`(`policy-facts`·`declarations`·`site-pages`)를 읽어 새 서술과 어긋나는 단정이 있으면 맞추고, 스토어 데이터 선언(`docs/store/privacy-declarations.md`)의 「위치 수집 안 함」이 여전히 사실임을 근거 한 줄로 확인한다

 — 한 곳·좁은 지역 상자 (Priority: P1)

**Goal**: 자리가 1곳이거나 몰려 있어도 도식이 그려지는 상자를 만든다(지도는 US1이 더한다).
**Independent Test**: 자리 1곳·70m 안 4곳·250m 두 곳 입력에서 `diagram: true`이고 점이 프레임 안 정해진 위치에 있다.

- [ ] T018 [P] [US2] `__tests__/app/day-route.test.ts` 고치기(먼저 실패): DM1(`saved.length >= 1`·읽었고 일치하면 `diagram: true`, 한 곳이어도), DM2(프레임 폭 ≥ 600m, 한 곳은 점이 (0.5, 0.5), `SAME_PLACE_METERS` 퇴화 없음), DM3(600m보다 넓게 퍼지면 125와 같은 프레임·같은 x,y — 기존 DR7 기대값 유지), DM5(좌표 없는 옛 일기에서 못 읽음·불일치는 `diagram: false`), DM1의 (a)(모든 자리에 `latE5`·`lonE5`가 있으면 `visits`가 `null`이어도 `diagram: true`이고 위치는 저장된 좌표에서 온다 — FR-017), 한 자리라도 좌표가 없으면 (b)로 간다
- [ ] T019 [US2] `src/app/day-route.ts` 고치기 — 저장된 좌표가 모든 자리에 있으면 그 좌표로(`latE5/1e5`) 투영하고 `visits`·`sameVisits`는 쓰지 않으며(없으면 기존 다시 읽기 경로),  `MIN_FRAME_METERS = 600`(**사람이 정한 값**)을 `project()`의 배율 상한으로 더하고(`scale = min(scale, 111320 / MIN_FRAME_METERS)` — 경도×cos 환산 도 단위), 한 곳·같은 곳 퇴화 `return null`을 걷고, `saved.length < 2`·`maxPairDistance` 판정을 지운다. T018 통과, 기존 12곳 상한·`sameVisits` 유지
- [ ] T020 [US2] `src/ui/DayRouteSection.tsx`·`src/app/day-route.ts` 문구 처리(FR-016) — 자리가 1곳이면 설명 줄 「사진이 찍힌 자리를 시간순으로 이은 거예요」를 그리지 않는다(DM9), `__tests__/ui/day-route-section.test.tsx` 먼저 고쳐 실패 → 통과
- [ ] T021 [US2] `src/ui/DiaryHomeScreen.tsx`(및 `DiaryListScreen.tsx`·`WrittenDayPaper.tsx` 호출부)의 「2곳 이상일 때만 `routeDay` 호출」을 「1곳 이상」으로 고친다(DM14). `__tests__/ui/diary-home-day-route.test.tsx`·`written-day-route-reach.test.tsx` 기대를 먼저 고쳐 실패 → 통과

**Checkpoint**: 한 곳·몰린 날도 점이 그려진다(지도 없이도).

## Phase 4: User Story 1 — 지도 위에서 동선 보기 (Priority: P1) 🎯 MVP

**Goal**: 도식 뒤에 일러스트풍 색 지도가 깔린다.
**Independent Test**: 서울 도심 하루와 주말 나들이 입력에서 `DayRoute.map`이 있고 화면에 면·선이 그려진다.

- [ ] T022 [P] [US1] `__tests__/app/day-route.test.ts`에 추가(먼저 실패): `buildDayRoute(visits, saved, mapIndex)`가 `diagram: true`이고 `MapIndex`가 프레임을 덮으면 `DayRoute.map`을 채운다(DM4), `diagram: false`면 `map`이 없다(DM5), 반환 모양에 위도·경도가 없다(DM6 키 검사), 순수하다(DM7)
- [ ] T023 [US1] `src/app/day-route.ts` 고치기 — 인자 `map: MapIndex | null`을 받고, 프레임의 위경도 범위·폭을 `renderMap`(T015)에 넘겨 `DayRoute.map`을 채운다. 위경도는 이 파일과 `src/map/render.ts` 안에서만 쓰고 반환에 남기지 않는다. 화면이 쓸 `RouteMap` 타입은 이 파일이 `export type { RouteMap } from "../map/render"`로 다시 내보낸다(DM16). T022 통과
- [ ] T024 [P] [US1] `__tests__/ui/route-map-layer.test.tsx` 작성(먼저 실패): `RouteMap`을 받아 `react-native-svg`의 `Svg`(viewBox = `box`)와 `Path`(면은 `fill-rule="evenodd"`, 선은 굵기 단계별)·바탕 `Rect`를 토큰 색으로 그린다(DM10), 빈 문자열 경로는 그리지 않는다, 낭독에서 숨긴다(DU5), 모서리 반경·그림자·그라데이션 속성이 없다
- [ ] T025 [US1] `src/ui/RouteMapLayer.tsx` 구현 — `DayRoute`·`RouteMap`만 `src/app/day-route.ts`에서 import(`src/map/`·`signals` 직접 import 금지, DM9·DM16). T023에서 `day-route.ts`가 `RouteMap` 타입을 다시 내보낸다. 색은 `COLORS`/토큰의 `mapLand` 외 넷만 쓴다. T024 통과
- [ ] T026 [P] [US1] `__tests__/ui/label-placement.test.ts` 작성(먼저 실패): `labelPlacement`(순수)가 오른쪽(점이 상자 오른쪽 45%면 왼쪽) 우선, 겹치면 위·아래 대각선 후보 중 첫 자리, 어디도 안 되면 그 라벨만 생략(DM11, R7). 글자 폭 어림은 한글 한 글자 12.5dp·글꼴 12, 이름 `null`은 라벨 없음
- [ ] T027 [US1] `src/ui/label-placement.ts` 구현으로 T026 통과, `src/ui/DayRouteSection.tsx`가 `route.map`이 있으면 도식 상자 뒤에 `RouteMapLayer`를 깔고 점 옆에 `labelPlacement`가 정한 라벨을 얹는다(점·번호·직선은 125 그대로 RN `View`). `__tests__/ui/day-route-section.test.tsx`에 지도 있음·없음·라벨 생략 경우 추가, 글꼴 2.0배에서 점·번호·지도는 변하지 않고 범례만 줄바꿈되는지 확인
- [ ] T028 [US1] `src/app/wiring.ts`의 `routeDay` 고치기 — 저장된 자리에 좌표가 다 있으면 `loadSignals`를 부르지 않고(호출 0건 테스트), 없으면 `loadSignals`로 사진 좌표를 읽은 뒤(125 그대로) `map-port`를 준비·읽어 `parseMapFile`로 `MapIndex`를 만들어 `buildDayRoute`에 넘긴다. 포트·파싱이 던지면 `null`로 접는다(DM13). 일기 저장소를 쓰지 않는다. `__tests__/app/wiring-route-day.test.ts`(없으면 새로)에서 대역 포트로 확인
- [ ] T029 [US1] `App.tsx`에서 `map-port`를 연결한다(실기기 포트 한 곳, 상태 흉내 때 `routeDay`를 홈에 넘기지 않는 기존 규칙 DB6 유지). `__tests__/config/day-route-rules.test.ts`의 DB6 기대가 통과하는지 본다

**Checkpoint**: 서울·주말 날에 지도가 보인다(개발 빌드 전 단위 수준).

## Phase 5: User Story 3 — 못 그릴 때 거짓 없이 (Priority: P1)

**Goal**: 지도를 못 읽거나 범위 밖이면 125 도식으로 물러난다.
**Independent Test**: 지도 읽기 실패·한국 밖·좌표 못 읽음·불일치 네 경우 모두 지도·빈 바탕이 없다.

- [ ] T030 [P] [US3] `__tests__/app/day-route.test.ts`·`__tests__/ui/diary-home-day-route.test.tsx`에 추가(먼저 실패): ① `map === null` → `DayRoute.map` 없음·125 모양 ② 프레임이 파일 범위 밖(해외 좌표) → `map` 없음 ③ `renderMap`이 `null`(도형 없음) → `map` 없음 ④ 좌표 못 읽음·`sameVisits` 불일치 → 목록만 ⑤ 포트가 던져도 화면에 예외가 올라오지 않고 저장된 목록이 남는다(DM13) ⑥ 좌표가 저장된 새 일기는 원본 사진을 지우거나 사진 권한을 거부해도 지도가 보인다(FR-017) ⑦ 날이 바뀐 뒤 늦게 도착한 지도 결과는 버려진다(FR-009, 125 DF3의 `routeFor` 규칙이 지도 경로에서도 지켜진다) ⑧ 지도가 늦게 더해져 지면 높이가 늘어도 `onReachEndChange`는 값이 바뀐 경우에만 한 번 불린다(FR-014·DM15)
- [ ] T031 [US3] `src/app/day-route.ts`·`src/app/wiring.ts`·`src/map/render.ts`의 접힘 경로를 보강해 T030 통과(`catch`가 빈 바탕을 만들지 않는다, 원칙 V)
- [ ] T032 [P] [US3] `__tests__/map/render.test.ts`에 경계 경우 추가: 칸 경계에 걸친 프레임에서 선·면이 끊기지 않는다(DM8a), 섬·바다만 있는 프레임에서 물 면만으로도 `RouteMap`이 나온다

## Phase 6: User Story 4 — 약속과 문구 (Priority: P1)

**Goal**: 외부 요청·권한·저장·좌표 경계·이름 없음 문구가 지켜진다.
**Independent Test**: 소스 계약·일기 파일 불변 테스트가 통과하고 「이름을 모르는 곳」이 코드·카탈로그에 없다.

- [ ] T033 [P] [US4] `__tests__/config/day-map-rules.test.ts`에 계약 추가: 도식 코드·`src/map/`에 `fetch(`·`XMLHttpRequest`·지도 라이브러리 0건(DM17), `app.json` 권한·플러그인 목록이 이 기능으로 바뀌지 않았다(스냅샷 대조, DM18), `no-location.test.ts` 통과, `src/ui/`의 지도 파일이 위경도 타입(`PlaceVisit`·`Coordinate`)을 쓰지 않는다(DM9)
- [ ] T034 [P] [US4] `__tests__/ui/day-route-section.test.tsx`·`src/i18n/catalogs/ko/home.ts` 고치기(먼저 실패 → 통과): 이름이 `null`인 자리의 범례는 「번호 · 때」만 적고(DM12·FR-015) 점 옆 라벨이 없으며 낭독도 번호·때만 읽는다. 「이름을 모르는 곳」(`unknownPlace`)을 카탈로그에서 지우고 `__tests__/i18n/ko-golden.test.ts`의 `CHANGED_AFTER_GOLDEN`/`ADDED_AFTER_GOLDEN`에 올린다(골든을 다시 쓰지 않는다)
- [ ] T035 [US4] 도식을 본 뒤 일기 파일이 바이트까지 같은지 소스 계약·기존 `day-route-rules`(DB3)가 지도 경로에서도 통과함을 확인하고, 새 `routeDay` 경로에 `store.save` 호출 0건을 계약에 포함한다(DM19)
- [ ] T036 [P] [US4] `site/licenses/index.html`의 OSM 항목에 「장소 이름」 옆에 「동선 지도 그림」 용도를 한 줄 더한다(`__tests__/privacy/`·`site/` 계약 통과). 방침 보강은 T046이 한다(R9)

## Phase 7: Polish & Cross-Cutting

- [ ] T037 `AGENTS.md` 「저장소의 현재 상태」에서 125 동선 도식 서술을 126이 바꾼 규칙(한 곳·몰린 날 지도, 이름 칸 비움, 최소 폭 600m, `src/map/` 경계, `kr-map.bin` 약 9MB, `react-native-svg` 네이티브 재빌드, **일기에 좌표 스냅샷 저장(`latE5`·`lonE5`, 125의 「좌표 저장 안 함」을 뒤집었다)**)으로 고쳐 쓴다(주석 덧대기 금지)
- [ ] T038 `npm test`·`npm run lint`를 실제로 돌려 통과를 확인한다(헌법 검사·prettier 포함). 위반 주입 네 가지(`quickstart.md`)를 실제로 어겨 보고 잡힌 뒤 되돌린다
- [ ] T039 `quickstart.md`의 안드로이드(SM-S901N) 개발 빌드 절차 ①~⑤를 실행하고 R3 측정값(크기·읽기·해석·그리기 시간·메모리·네트워크 0건)을 `quickstart.md` 아래 「기록」에 적는다. 못 본 것은 못 봤다고 적는다
- [ ] T040 `quickstart.md`의 iPhone 14 개발 서명 빌드 확인과 125 T017(iPhone 도식 확인)을 같은 회차에서 본다. 결과를 같은 「기록」에 적는다
- [ ] T041 `docs/roadmap/README.md`에서 「동선 도식에 지도 느낌을 더한다」 과제를 빼고 「완료 이력」에 126과 한 줄로 옮긴다(구현·검증 커밋과 분리한 완료 처리 커밋에서)

## Dependencies & Execution Order

- **Phase 1** (T001~T004) → **Phase 2** (T005~T017). T012(실제 빌드)는 T006·T008·T010·T011 뒤, T013은 T012 뒤. T015는 T014 뒤.
- **Phase 2b**(T042~T046, 좌표 저장)는 Phase 2와 독립이고 Phase 3 앞에서 끝난다(T019가 `SavedPlace`의 좌표 필드에 기댄다).
- **Phase 3 US2**(T018~T021)는 Phase 2b 뒤, Phase 2와는 독립이다(`day-route`의 상자만 만진다). Phase 2·Phase 3은 병행 가능.
- **Phase 4 US1**은 Phase 2·3 뒤(T023이 T015·T019에 기댄다). **Phase 5 US3**은 Phase 4 뒤. **Phase 6 US4**는 Phase 4 뒤(T034는 Phase 3 T020과 같은 파일 `__tests__/ui/day-route-section.test.tsx` — 순서대로).
- **Phase 7**은 모두 뒤.
- 같은 파일을 만지는 작업은 병행하지 않는다: `src/app/day-route.ts`(T019·T023·T031), `__tests__/app/day-route.test.ts`(T018·T022·T030), `src/ui/DayRouteSection.tsx`(T020·T027).

## Parallel Examples

- Phase 2: T005·T007·T009·T014는 서로 다른 테스트 파일이라 병행 가능(각자 구현 T006·T008·T010·T015 앞). T016(포트)과 T017(헌법 규칙)도 다른 파일이라 병행 가능.
- Phase 4: T024(`route-map-layer` 테스트)와 T026(`label-placement` 테스트)은 병행 가능.

## Implementation Strategy

- **MVP**: Phase 1~2(지도 파일·읽기·렌더) → Phase 3(상자) → Phase 4(US1). 여기까지로 지도가 도식 뒤에 보인다.
- 이후 US3(물러남)·US4(약속·문구)로 안전망을 닫고 개발 빌드 실기기로 측정·확인한다(T039~T040). **T012에서 크기가 목표와 다르면 멈춰 소유자 결정을 받는다.**
