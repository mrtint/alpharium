# 계약 — 125 동선 도식 (`__tests__/app/day-route.test.ts`·`__tests__/ui/day-route-section.test.tsx`·`__tests__/ui/diary-home-day-route.test.tsx`·`__tests__/ui/written-day-route-reach.test.tsx`·`__tests__/config/day-route-rules.test.ts`가 잠근다)

## 순수 변환 `buildDayRoute(visits, saved)` (`src/app/day-route.ts`)
- DR1: `saved`가 없거나 비면 `null`을 낸다.
- DR2: `saved.length === 1`이면 한 항목, `diagram: false`.
- DR3: `visits`가 `null`이거나 `visits.length !== saved.length`이면 저장된 이름·때 목록(`diagram: false`).
- DR4: 수가 같고 ≥2이며 점이 서로 떨어져 있으면(DR6의 퇴화가 아니면) `diagram: true`, 모든 항목에 `x`·`y ∈ [0,1]`.
- DR5: 항목은 시간순 앞 12곳, 넘으면 `more = 전체 − 12`. 수 일치 검사는 자르기 전 전체 수.
- DR6: 모든 점이 `SAME_PLACE_METERS` 안에 겹치면(퇴화) `diagram: false` — 저장된 이름·때 목록만 낸다. 겹친 번호 점을 도식으로 쌓지 않는다.
- DR7: 가로세로 비율을 유지한다(가로 보정 `cos(위도)`). 한 축이 0이어도(공선) 다른 축이 [0,1]을 채우고 찌그러지지 않는다.
- DR8: 반환 모양에 위도·경도·`Coordinate`가 없다(타입과 런타임 키 검사).
- DR9: 순수하다 — 시각·파일·기기·네트워크를 읽지 않는다(`dayPeriodOf`는 주어진 시각만 읽는다).

## 화면 `DayRouteSection` (`src/ui/DayRouteSection.tsx`)
- DU1: `DayRoute`만 받는다. 신호·`Coordinate`·`PlaceVisit`을 import하지 않는다.
- DU2: `diagram: true`이면 점 `n`개(번호), 선 `n−1`개(직선, 이웃끼리), 첫 점만 강조 색(`accent`). 곡선·그림자·그라데이션 없음.
- DU3: 범례 목록은 번호 순서로 「번호 · 때 · 이름」. `label: null`은 「이름을 모르는 곳」. `more > 0`이면 「외 N곳」 한 줄.
- DU4: `diagram: true`이면 아래에 설명 한 줄 「사진이 찍힌 자리를 시간순으로 이은 거예요」. `false`이면 설명 줄이 없다(이을 선이 없다).
- DU5: 도식은 하나의 화면 낭독 요소(「사진이 찍힌 자리 N곳을 시간순으로 이은 도식」), 점·선은 낭독에서 숨기고 범례가 순서대로 읽힌다.
- DU6: 색은 토큰만, 화면 한글은 `ko/home.ts`에서만. 글꼴 2.0배에서 범례가 줄바꿈된다(`useFontScale`).
- DU7: 도식 칸은 가로를 채우고 높이는 가로에 비례한다(고정 비). 지면 폭을 잰 값을 쓴다.

## 화면 배치·흐름 (`WrittenDayPaper`·`DiaryHomeScreen`)
- DF1: 칸은 본문 아래 지면 맨 끝이다. 첫 화면 본문 노출·`reachedEnd`·스크롤 접힘은 칸이 없을 때와 같다.
- DF2: `routeDay`는 쓴 날(`paper.kind === "readable"`이고 `entry.places`가 있을 때)에만 부른다. 쓰는 중·안 쓴 날에는 부르지 않는다.
- DF3: 늦게 도착한 결과는 날이 바뀌었으면 버린다(`routeFor` ref). 캐시가 없다 — 날을 다시 열면 다시 읽는다.
- DF4: 읽는 동안 지면은 막히지 않고, 읽기 전에는 저장된 목록(`diagram: false`)을 먼저 보인다.
- DF5: `routeDay`가 던져도 화면에 예외를 올리지 않는다 — 저장된 목록으로 남는다.
- DF6: 도식이 늦게 더해져 지면 내용 높이가 늘어도 `onReachEndChange`는 값이 바뀐 경우에만 한 번 불린다(052의 1px 미만 무시·108의 띠 높이 규칙과 같은 판정). 칸을 위한 자리 표시 높이를 미리 잡지 않는다.

## 경계·저장 (원칙 V·FR-007·FR-008)
- DB1: 소스에 지도 라이브러리(`react-native-maps`·`maplibre`·`mapbox`)·`fetch(`·`XMLHttpRequest`가 도식 코드에 없다.
- DB2: `src/ui/`는 `signals/`를 import하지 않고 `PlaceVisit`·`Coordinate`를 쓰지 않는다(도식 화면 파일 한정).
- DB3: `routeDay`는 일기 저장소를 쓰지 않는다 — 읽기만 한다(`store.save` 호출 0건, 소스 계약).
- DB4: `unknown`·`none`을 기본값으로 채우지 않는다 — `visits === null`이면 도식이 없다.
- DB5: 새 권한이 없다 — `app.json`의 권한·플러그인 목록이 이 기능으로 바뀌지 않고, 기존 `__tests__/config/no-location.test.ts`(위치 권한 0건)가 계속 통과한다.
