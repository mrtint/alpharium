# Tasks: 쓴 날 일기 화면의 동선 도식 (125)

**Input**: spec.md · plan.md · research.md · data-model.md · contracts/day-route.md · quickstart.md · 테스트 먼저(TDD) — 헌법 「개발 방식」

**형식**: `- [ ] T### [P?] [US?] 설명 (파일)` — `[P]`는 다른 파일이라 병렬 가능, `[US]`는 스펙 사용자 이야기(US1 도식·US2 거짓 없는 상태·US3 약속 지키기).

## Phase 1: Setup
- [x] T001 기준선: `main`에서 갈라진 브랜치에서 `npm test`·`npm run lint`가 통과하는지 확인하고 결과를 남긴다 (`git status` 깨끗, 변경 파일 없음)

## Phase 2: Foundational — 순수 변환과 문구 (US1·US2가 함께 쓴다)
- [x] T002 [P] `__tests__/app/day-route.test.ts`(logic)에 계약 DR1~DR9를 먼저 쓴다 — 저장 자리 없음 → `null`; 1곳 → 한 항목·`diagram: false`; 읽은 자리 `null`·수 불일치 → 저장 목록·`diagram: false`; 수 같음 ≥2 → `diagram: true`·모든 `x`·`y ∈ [0,1]`; 12곳 상한과 `more = 전체 − 12`(수 일치 검사는 자르기 전 전체 수); 모든 점이 100m 안에 겹치면(퇴화) `diagram: false`·목록만; 공선(한 축이 0)에서도 비율이 유지되고 찌그러지지 않음; 반환 객체에 `lat`·`lng`·`coordinate` 키가 없음(타입과 런타임). 실패를 확인한다
- [x] T003 `src/app/day-route.ts`에 순수 `buildDayRoute(visits, saved)`와 `DayRoute`·`RouteItem` 타입을 구현한다 — data-model의 검증 규칙을 그대로 지킨다: 「모든 `x`·`y`는 `[0,1]` 안」, 「`items.length ≤ 12`, `more = 전체 − items.length`(≥0)」, 「`diagram: true`이면 `items.length ≥ 2`이고 모든 점이 100m 안에 겹치지 않는다」. 투영은 `cos(중간 위도)` 가로 보정·비율 유지·안쪽 여백(상수 `MARGIN`은 사람이 정한 값), 때는 `dayPeriodOf(new Date(firstSeenAt))`. 시각·파일·기기·네트워크를 읽지 않는다. T002가 통과한다
- [x] T004 [P] `src/i18n/catalogs/ko/home.ts`에 도식 이름(「하루 동선」)·설명 한 줄(「사진이 찍힌 자리를 시간순으로 이은 거예요」)·범례 줄(번호·때 이름·이름 모르는 곳·「외 N곳」)·도식 화면 낭독(「사진이 찍힌 자리 N곳을 시간순으로 이은 도식」)을 `text()`/함수로 더하고(모듈 최상단 상수에서 평가하지 않는다), `__tests__/i18n/ko-golden.test.ts`는 다시 쓰지 않고 `ADDED_AFTER_GOLDEN`에 올린다

## Phase 3: US1 — 쓴 날 지면에서 그날의 동선을 본다 (Priority: P1) 🎯 MVP
**목표**: 자리 2곳 이상이고 자리 수가 같은 쓴 날에 본문 아래 번호 점·직선·범례·설명 한 줄이 보인다.
**독립 확인**: 11-16(자리 4곳)을 열면 점 4·선 3·범례 4줄·설명 한 줄(quickstart 1·2).
- [x] T005 [US1] `__tests__/ui/day-route-section.test.tsx`(ui)에 계약 DU1~DU7를 먼저 쓴다 — `diagram: true`이면 번호 점 `n`개·직선 `n−1`개(이웃끼리, 각도·길이가 두 점 위치와 맞음)·첫 점만 강조 색; 범례 「번호 · 때 · 이름」 순서, `label: null` → 「이름을 모르는 곳」, `more > 0` → 「외 N곳」; 설명 한 줄은 `diagram: true`일 때만; 화면 낭독 요소 하나이고 점·선은 낭독에서 숨김; 글꼴 2.0배에서 범례가 줄바꿈. 실패를 확인한다
- [x] T006 [US1] `src/ui/DayRouteSection.tsx`를 만든다 — `DayRoute`만 받고(신호·`Coordinate`·`PlaceVisit`을 import하지 않는다), `View`로 점(정사각)·선(중점에 두고 `atan2`로 회전한 얇은 `View`)을 그린다. 크기·굵기는 컴포넌트 안 상수(사람이 정한 값)이고 색은 `COLORS` 토큰만, 곡선·그림자·그라데이션 없음. 지면 폭을 잰 값으로 높이는 폭에 비례. T005가 통과한다
- [x] T007 [US1] `src/ui/WrittenDayPaper.tsx`에 선택 prop `route?: DayRoute`를 더해 본문 아래 지면 맨 끝(`bottomInset` 안쪽)에 `DayRouteSection`을 붙인다. 첫 화면 본문 노출·`reachedEnd`·스크롤 접힘은 칸이 없을 때와 같다 — `__tests__/ui/written-day-home.test.tsx`·`written-day-reach.test.ts`(소스·순수 검사)가 계속 통과한다. 새 `__tests__/ui/written-day-route-reach.test.tsx`(ui — `WrittenDayPaper`를 렌더해 `contentSizeChange`를 쏘는 테스트)에 먼저 쓴다 — DF1: `route`가 있으면 칸이 본문 뒤(지면 맨 끝)에 렌더되고 없으면 칸이 없다; DF6: `route`가 나중에 더해져 내용이 늘어도 `onReachEndChange`는 값이 바뀐 경우에만 한 번 불린다(FR-016)
- [x] T008 [US1] `src/app/wiring.ts`에 `routeDay(day, saved)`를 `previewDay` 옆에 더한다(성공·실패 두 반환 모양 모두 — 실패 쪽은 `undefined`) — `loadSignals(day)`의 `places`가 `known`이고 `trace.visits`가 있으면 `buildDayRoute(visits, saved)`, 아니면 `buildDayRoute(null, saved)`. 일기 저장소를 쓰지 않는다. `__tests__/app/wiring.test.ts`에 대역 신호로 갈래별 결과를 잠근다
- [x] T009 [US1] `src/ui/DiaryHomeScreen.tsx`에 선택 prop `routeDay`와 상태를 더하고(`App.tsx`가 `wiring.routeDay`를 `previewDay` 옆에서 넘긴다), 계산한 `route`를 `src/ui/DiaryListScreen.tsx`의 새 prop을 거쳐 `WrittenDayPaper`에 넘긴다 — `paper.kind === "readable"`이고 `entry.places`가 2곳 이상일 때만 날마다 부르고(1곳은 부르지 않고 한 줄 목록), `routeFor` ref로 날이 바뀐 뒤 늦게 도착한 결과를 버리며(`previewFor`와 같은 방식, 캐시 없음), 읽기 전에는 저장된 목록(`buildDayRoute(null, saved)`)을 먼저 `WrittenDayPaper`에 넘긴다. `__tests__/ui/diary-home-day-route.test.tsx`(ui)에 흐름을 먼저 쓴다 — 쓴 날에만 호출·결과 반영 시 도식으로 바뀜

## Phase 4: US2 — 위치를 모르는 날은 거짓 없이 보인다 (Priority: P1)
**목표**: 읽지 못함·수 불일치·자리 1곳·옛 일기에서 아는 만큼만 보인다.
**독립 확인**: quickstart 3·4 — 11-15 한 줄, 11-12 칸 없음, 권한 거부 시 이름·때 목록.
- [x] T010 [P] [US2] `__tests__/ui/diary-home-day-route.test.tsx`에 갈래를 더한다 — `routeDay`가 던지면 저장된 목록만 남고 예외가 화면까지 오지 않음(DF5); `entry.places` 없는 일기는 칸이 없고 `routeDay`를 부르지 않음(DF2); 자리 1곳은 `routeDay`를 부르지 않고 도식 없이 한 줄; 쓰는 중·안 쓴 날에는 호출 0(DF2); 날을 빠르게 넘기면 늦은 결과가 다른 날에 그려지지 않음(DF3); `routeDay`를 풀지 않은 약속으로 대기시키는 동안 저장된 목록이 먼저 보이고 지면이 막히지 않다가, 풀리면 도식으로 바뀜(DF4, FR-009). 실패를 확인한 뒤 T009 구현이 통과시키는지 본다(안 되면 T009를 고친다)
- [x] T011 [P] [US2] `__tests__/ui/day-route-section.test.tsx`에 `diagram: false` 갈래를 더한다 — 범례만 있고 점·선·설명 줄이 없음, 자리 1곳은 한 줄

## Phase 5: US3 — 위치가 휴대폰 밖으로 나가지 않고 저장도 늘지 않는다 (Priority: P1)
**목표**: 외부 요청 0·새 권한 0·일기 파일 변화 0·화면에 절대 좌표 0.
**독립 확인**: 소스 계약 테스트가 통과하고, 도식을 본 뒤 일기 파일이 시험 전과 바이트까지 같다(quickstart 5).
- [x] T012 [US3] `__tests__/config/day-route-rules.test.ts`(logic)에 소스 계약을 쓴다(주석을 걷어낸 소스로 — AGENTS 「테스트 작성의 함정」): DB1 도식 코드(`day-route.ts`·`DayRouteSection.tsx`)에 `react-native-maps`·`maplibre`·`mapbox`·`fetch(`·`XMLHttpRequest` 없음; DB2 `DayRouteSection.tsx`가 `signals/`·`PlaceVisit`·`Coordinate`를 import하지 않음; DB3 `routeDay` 본문에 `store.save`·`writeFile` 호출 없음; DB4 `visits === null`을 도식으로 채우지 않음; DB5 `app.json`의 권한·플러그인 목록에 이 기능으로 더해진 항목이 없음(위치 권한 0건은 기존 `no-location.test.ts`가 잠근다). 위반 주입으로 각각 실제로 잡히는지 확인한 뒤 되돌린다(주입이 적용됐는지 먼저 단언)
- [x] T013 [US3] `__tests__/app/wiring.test.ts`에 `routeDay`가 일기 저장소를 건드리지 않는다는 것을 저장소 대역의 호출 기록으로 잠근다(FR-007)

## Phase 6: Polish & 확인
- [x] T014 `npm test`·`npm run lint`(tsc·헌법 검사·prettier)를 실제로 돌려 통과를 확인한다. 위반 주입으로 계약 테스트 몇 개가 실제로 실패하는지 본 기록을 남긴다
- [x] T015 `docs/store/privacy-declarations.md`의 위치 항목이 「기기 안에서 같은 권한으로 읽고 새로 저장·전송하지 않는다」는 사실과 어긋나지 않는지 읽고, 어긋나면 고친다(research R7). 바꿀 것이 없으면 없다고 남긴다
- [x] T016 SM-S901N 개발 빌드(Metro, `adb reverse`)에서 quickstart 1~5를 돌려 `specs/125-day-route-diagram/quickstart.md` 「기록」에 날짜·기기·결과 표로 남긴다(11-16 도식, 11-15 한 줄, 11-12 칸 없음, 글꼴 2.0배, 권한 거부, 일기 파일 바이트 비교). 못 본 것은 못 봤다고 적는다
- [ ] T017 iPhone 14(개발 서명 빌드)에서 11-16 하나로 quickstart 6을 한 번 확인해 같은 「기록」에 더한다. 못 하면 사유를 적고 완료로 세지 않는다
- [x] T018 AGENTS.md 「홈(Modernist)」 절에 쓴 날 동선 도식을 한 줄로 더한다 — 위치는 저장하지 않고 열 때 다시 읽는 것·자리 수가 같을 때만 도식·12곳 상한·`routeDay`(`previewDay` 옆)·실기기에서 본 것과 못 본 것

## 추적 (요구사항 → 과제)
| 요구사항 | 과제 |
| --- | --- |
| FR-001 | T007(DF1) · T016 |
| FR-002 | T003 · T005 · T006 |
| FR-003 | T005 · T006 |
| FR-004 | T003 · T012(DB2) |
| FR-005 | T002 · T003 |
| FR-006 | T002 · T010 · T011 |
| FR-007 | T012(DB3) · T013 · T016 |
| FR-008 | T012(DB1·DB5) · T016 |
| FR-009 | T009 · T010(DF4) |
| FR-010 | T005 · T006 |
| FR-011 | T004 · T006 |
| FR-012 | T002 · T012(DB4) |
| FR-013 | T002 · T005 |
| FR-014 | T004 · T005 |
| FR-015 | T009 · T010(DF2·DF3) |
| FR-016 | T007(DF6) |
| SC-001 | T005 · T016 |
| SC-002 | T010 · T011 · T016 |
| SC-003 | T012 · T013 · T016 |
| SC-004 | T007 · T016 |
| SC-005 | T016 · T017 |

## 의존
- T002 → T003. T004는 T002·T003과 병렬(다른 파일).
- Phase 3(US1)은 Phase 2가 끝나야 한다: T005 → T006 → T007 → T008·T009. T005는 T003(타입)·T004(문구) 뒤다.
- Phase 4(US2)·Phase 5(US3)는 T009 뒤. T012는 T006·T008 뒤, T013은 T008 뒤.
- Phase 6은 모든 구현 뒤: T014 → T015 → T016 → T017 → T018.

## 병렬 기회
- T002 ∥ T004, T010 ∥ T011(다른 테스트 파일이다). T011은 T005가 만든 파일을 고치므로 T005 뒤다.

## 구현 전략
- MVP는 US1(Phase 2 + 3)이다. US2·US3은 같은 코드 위에서 갈래·계약을 잠그는 일이라 US1 직후에 이어서 한다. 실기기 확인(T016·T017)이 끝나기 전에는 완료로 세지 않는다.

## Phase 7: Convergence
- [x] T019 `specs/125-day-route-diagram/plan.md` 「Source Code」에 `src/signals/places.ts`(`distanceMeters`를 내보냈다 — 도식의 겹침 판정이 `tracePlaces`와 같은 하버사인을 재사용해 거리 계산이 두 벌이 되지 않게 한다)와 `src/ui/home-text.ts`(`ROUTE_TEXT` 래퍼 — 다른 홈 문구와 같은 방식)를 한 줄 근거와 함께 더한다 per plan: Source Code (unrequested)
- [x] T020 `specs/125-day-route-diagram/plan.md` 「Source Code」의 `App.tsx` 줄에 「상태 흉내(064)가 켜져 있으면 `routeDay`를 넘기지 않는다 — 흉내 날과 실제 사진이 어긋난다」를 더하고, `__tests__/` 쪽에 이 분기를 잠그는 단언이 있는지 보아 없으면 `__tests__/config/day-route-rules.test.ts`에 소스 계약 한 줄을 더한다 per FR-008 (unrequested)
- [x] T021 `src/ui/DayRouteSection.tsx`에 겹친 점 합치기(`markersOf`, DU8)를 넣고 `__tests__/ui/day-route-section.test.tsx`에 DU8을 잠근다 — 실기기에서 마지막 점이 시작점을 가리는 것을 본 뒤 고쳤다 (partial)
