# Tasks: 쓴 날의 두 뷰 — 사진 자리에서 지도로 뒤집기

**Input**: specs/135-diary-route-views/ (plan · research · data-model · contracts/written-route.md)
**Tests**: 프로젝트 규칙상 TDD — 테스트를 먼저 쓴다.

## Phase 1: Setup

- [X] T001 화면 문구 추가 — `ROUTE_TEXT.showMapA11y`(「다닌 길 보기」)·`showPhotosA11y`(「사진 보기」)·`markerA11y(numbers, label, period)`(「N번 자리, 이름, 때」, 합친 점은 「1·4번 자리」)·`cardLine(numbers, label, period)`(「번호 · 이름 · 때」, 이름 없으면 「번호 · 때」)·`cardA11y(numbers, count)`(「N번 자리 사진 M장 크게 보기」)·`cardMore(n)`(「+N」)·`cardEmpty`(「이곳에서 남은 사진이 없어요」)·`cardUnlinked`(「이 일기에는 자리별 사진이 남아 있지 않아요」)을 `src/i18n/catalogs/ko/`의 ROUTE_TEXT 정의 파일과 `src/ui/home-text.ts` 재수출에 두고 `__tests__/i18n/ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`에 올린다

## Phase 2: Foundational — 자리 묶기가 사진 식별자를 낸다

- [X] T002 [P] 테스트: `tracePlaces`가 `PlaceVisit.photoIds`(시각순, `photoIds.length === photoCount`)를 낸다 — `__tests__/signals/places.test.ts`
- [X] T003 `TimedCoordinate`에 `photoId: string`, `PlaceVisit`에 `photoIds: string[]` 추가 — `src/signals/places.ts`, `src/signals/types.ts`
- [X] T004 `collect.ts`의 points에 `photoId: photo.id` 싣기, 테스트 대역·픽스처의 `PlaceVisit`·`TimedCoordinate` 리터럴을 `tsc`가 0이 될 때까지 고친다 — `src/signals/collect.ts`, `__tests__/**`

## Phase 3: User Story 3 — 새 일기는 사진마다 자리를 기억한다 (P1)

**Independent Test**: 파이프라인 대역으로 자리 둘·사진 셋(하나는 좌표 없음)을 써서 저장된 `photos[].placeIndex`가 `[0, 1, null]`인지 본다.

- [X] T005 [P] [US3] 테스트: `placeIndexOf(visits, photoId)` — 묶인 자리의 0부터 순번, 없으면 `null` — `__tests__/diary/place-lines.test.ts`
- [X] T006 [P] [US3] 테스트: 파이프라인이 저장 일기의 모든 `photos[]` 항목에 `placeIndex`(「`number | null`」, 숫자는 `0 ≤ placeIndex < places.length`) 키를 둔다; 자리 신호가 없으면 모두 `null` — `__tests__/diary/pipeline.test.ts`(또는 기존 places 저장 테스트 파일)
- [X] T007 [US3] `DiaryEntry.photos[]` 항목에 `placeIndex?: number | null` 추가(문서 주석: 없음=135 이전) — `src/diary/types.ts`
- [X] T008 [US3] `placeIndexOf` 구현 — `src/diary/place-lines.ts`
- [X] T009 [US3] 저장 직전 `generated.usedPhotos`에 `placeIndex`를 붙인다(visits 없으면 `null`) — `src/diary/pipeline.ts`
- [X] T010 [US3] 테스트: 저장·불러오기 왕복에서 `placeIndex`(숫자·`null`)가 남고 옛 일기(키 없음)는 키 없이 남는다 — `__tests__/diary/store*.test.ts`

## Phase 4: User Story 1 — 사진 자리를 지도로 뒤집기 (P1)

**Independent Test**: 지도 가능한 쓴 날 지면 렌더 → `show-route-map` 누름 → `route-face`·`show-photos` → 누름 → 캐러셀.

- [X] T011 [US1] `DayRouteSection`의 `Diagram` 그리기(지도층·선·점 합치기 `markersOf`·라벨)를 `RouteCanvas`로 떼어 낸다 — 선택 prop `selected?: number[]`(강조 점은 `COLORS.accent`), `onPressMarker?(numbers)`(있으면 점이 `accessibilityRole="button"`·라벨 `markerA11y`·`hitSlop`으로 44pt 이상·`testID="route-marker-<첫 번호>"`), `width`·`height` 고정 크기 입력. `DayRouteSection`은 이것을 써서 겉모양·testID(`day-route-diagram`·`day-route-dot-*`·`day-route-line-*`·`day-route-label-*`)를 그대로 유지 — `src/ui/RouteCanvas.tsx`, `src/ui/DayRouteSection.tsx` (기존 `__tests__` DayRouteSection 테스트가 그대로 통과해야 한다)
- [X] T012 [P] [US1] 테스트(WR1~WR6·WR9): 지도 가능 날 아이콘 있음·누르면 지도 면·되돌림 시 캐러셀 장 유지·지도 불가 날 아이콘 없음·사진 0장이면 지도 면만(`show-photos` 없음)·지도 면 날 `day-route-section` 없음·날짜 바뀌면 사진 면 — `__tests__/ui/written-route-face.test.tsx`
- [X] T013 [US1] `PhotoCarousel`에 `onShowMap?: () => void` — 있으면 사진 위 우측 하단(배지와 같은 `inset`)에 지도 아이콘 버튼 `show-route-map`(누름 자리 44pt 이상), 1장일 때도 — `src/ui/PhotoCarousel.tsx`
- [X] T014 [US1] `RouteFace` 기본: 폭=캐러셀 폭, 높이=`WRITTEN_DAY.photoHeight` + 인디케이터 줄(marginTop+height) 빈 자리, 안의 지도 상자는 `ROUTE_ASPECT` contain·가운데, 바탕 `COLORS.surface`; 우측 하단 `show-photos`(`onShowPhotos` 있을 때만, 누름 자리 44pt 이상) — `src/ui/RouteFace.tsx`
- [X] T015 [US1] `WrittenDayPaper`: 면 상태(`"photos"|"map"`, `paper.entry.date` 키로 초기화), WR1 판정, 캐러셀은 마운트 유지하고 숨김(`FadeLayer` 크로스페이드, `useReduceMotion` 참이면 즉시), 지도 면 날 `DayRouteSection` 생략, 사진 0장 + 지도면 `RouteFace`만 — `src/ui/WrittenDayPaper.tsx`

## Phase 5: User Story 2 — 번호를 눌러 그 자리 사진 (P1)

**Independent Test**: `route-marker-2` 누름 → `route-card` 사진 수·줄 → 카드 누름 → `photo-viewer`의 장 수.

- [X] T016 [P] [US2] 테스트: `routeCardFor(photos, numbers)` — `photos`(시각순, 합친 점은 여러 자리)·`empty`·`unlinked`(사진 1장 이상이고 모두 `placeIndex` 키 없음) — 사진 0장은 언제나 `empty` — `__tests__/app/route-photos.test.ts`
- [X] T017 [US2] `routeCardFor` 구현 — `src/app/route-photos.ts` (자리 번호는 1부터, `placeIndex`는 0부터)
- [X] T018 [P] [US2] 테스트: `cardPlacement(marker, card, box)` — 오른쪽 위 → 왼쪽 위 → 오른쪽 아래 → 왼쪽 아래, 점 사각형과 겹치지 않고 상자 안; 다 안 되면 상자 안으로 clamp — `__tests__/ui/card-placement.test.ts`
- [X] T019 [US2] `cardPlacement` 구현(카드 132×116, 사람이 정한 값) — `src/ui/card-placement.ts`
- [X] T020 [P] [US2] 테스트(WR7·WR8): 점 누름 → 카드·강조, 같은 점/빈 곳 → 닫힘, 다른 점 → 옮김, 면 전환 → 닫힘, 3장 초과 「+N」, 이름 없음 줄, `empty`·`unlinked` 문구, 카드 누름 → `PhotoViewer`가 그 사진들로 — `__tests__/ui/route-face-card.test.tsx`
- [X] T021 [US2] `RouteFace`에 선택 상태·`route-face-backdrop`·폴라로이드 카드(흰 테두리, 최대 3장 겹침, 아래 한 줄, 반경·그림자 없는 Modernist 판)·카드 누름 시 `PhotoViewer`(startIndex 0, 닫으면 카드 유지) — `src/ui/RouteFace.tsx`, `WrittenDayPaper`가 `entry.photos`를 넘긴다

## Phase 6: Polish

- [X] T022 위반 주입: (a) `routeCardFor`가 시각으로 짐작하도록 바꾸면 `unlinked` 테스트가 잡는지 (b) WR5 숨김을 빼면 테스트가 잡는지 확인 후 되돌림
- [X] T023 `npm test`·`npm run lint`(tsc·헌법 검사·prettier) 통과
- [ ] T024 iOS 시뮬레이터에서 모양 확인(quickstart), 실기기 iPhone 14·SM-S901N dev 빌드에서 동작·저장된 `placeIndex` 확인, 결과를 `quickstart.md` 「기록」에
- [ ] T025 AGENTS.md 「홈(Modernist)」 항목에 135 요약(지도 면·폴라로이드·`placeIndex`)을 고쳐 넣고 125·126의 「쓴 날 지면 맨 아래」 서술을 지도 면 날 기준으로 고친다; 로드맵 과제 본문의 「하단 바 버튼」 결정을 뒤집힌 것으로 고친다 — `AGENTS.md`, `docs/roadmap/README.md`

## Dependencies

Phase 1·2 → US3(T005~T010) → US1(T011~T015) → US2(T016~T021) → Polish. US2의 카드 사진은 US3의 `placeIndex`에, 카드 자리는 US1의 `RouteFace`에 기댄다.

## Parallel

T002·T005·T006·T012·T016·T018은 서로 다른 테스트 파일이라 병렬 작성 가능.

## Strategy

MVP = US3 + US1(두 뷰 오가기). 그 위에 US2(카드).

## Phase 7: Convergence

- [X] T026 카드 한 줄의 순서를 기존 범례(126)와 같은 「번호 · 때 · 이름」으로 spec FR-005·US2 시나리오 1·contracts WR8에 맞춘다(코드는 그대로) per FR-005 (contradicts)
