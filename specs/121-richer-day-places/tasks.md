# Tasks: 일기가 하루의 장소를 더 풍부하게 말한다

**Input**: `specs/121-richer-day-places/` (plan.md, spec.md, research.md, data-model.md, contracts/)

**Tests**: 헌법 「개발 방식」이 TDD를 요구한다 — 테스트 태스크가 구현 태스크보다 먼저이며 먼저 실패해야 한다.

## Phase 1: Setup

- [X] T001 `osmium-tool` 설치 확인(`brew install osmium-tool`, 저장소 밖 도구)과 `scripts/places/.cache/`를 `.gitignore`에 추가 — `.gitignore`
- [X] T002 `expo-asset`을 직접 의존성으로 올림(`npx expo install expo-asset`, `npx expo install --check` 통과) — `package.json`
- [X] T003 `metro.config.js`의 `resolver.assetExts`에 `"bin"` 추가(NativeWind 래핑 유지) — `metro.config.js`

## Phase 2: Foundational (장소 데이터 — 모든 스토리의 전제)

- [X] T004 [P] 범주 판정 테스트(contract place-index 범주 코드 0~7, 가게·음식점 `null`, 한글 없는 이름 거름) — `__tests__/places/categorize.test.ts`
- [X] T005 [P] Douglas–Peucker 단순화 테스트(직선 위 점 제거, 허용 오차 1e-4도, 닫힌 고리 유지) — `__tests__/places/simplify.test.ts`
- [X] T006 [P] 이진 묶기·파싱 왕복 테스트(머리 `PLC1`·판 1, 장소 표 24바이트, int16 범위를 넘는 다각형은 경계 상자만, IX1 깨진 머리에 던짐) — `__tests__/places/pack.test.ts`
- [X] T007 [P] 범주 판정 구현 — `scripts/places/categorize.ts`
- [X] T008 [P] 단순화 구현 — `scripts/places/simplify.ts`
- [X] T009 이진 묶기 구현 — `scripts/places/pack.ts`
- [X] T010 이진 파싱·격자 색인 구현(0.01도 칸, 64칸 넘는 다각형은 「큰 것」 목록, R4) — `src/signals/place-index.ts` (T006이 파싱도 검증)
- [X] T011 데이터 만들기 스크립트(원본 받기→`osmium tags-filter`→`osmium export -f geojsonseq`→범주·단순화·묶기, `kr-places.meta.json`에 원본 URL·Last-Modified·바이트 수·결과 sha256·곳 수·범주별 수·만든 날짜) + `package.json` `places:build` — `scripts/places/build-place-index.mts`
- [X] T012 데이터 만들기 실행 → `assets/places/kr-places.bin`·`kr-places.meta.json` 커밋 대상 생성, 크기 ≤ 10MB 확인
- [X] T013 데이터 파일 계약 테스트(IX2 한글, IX3 범주 0~7, IX4 ≤10MB, IX5 sha256 일치) — `__tests__/places/kr-places-file.test.ts`

## Phase 3: User Story 2 — 장소 이름은 사람이 아는 수준으로 (P1)

**Goal**: 좌표 하나 → 대표 장소명. **Independent Test**: 20곳 대조표.

- [X] T014 [P] [US2] 이름 고르기 단위 테스트(순위 1~6, PN2 건물 안이 역보다 먼저, 역 「역」 붙이기, 가장 큰 다각형, `none`) — 작은 합성 색인으로 — `__tests__/signals/place-names.test.ts`
- [X] T015 [P] [US2] 20곳 대조표 테스트(실제 번들 파일, ≥16곳 일치, 불일치는 `expectedMiss`와 까닭) — `__tests__/signals/place-names.golden.test.ts`
- [X] T016 [US2] `choosePlaceName`·`placeNamer(port)` 구현(거리 상수 250·300·100·1500m 한 곳, 「사람이 정한 값, 실측 아님」 주석, 실패 시 기억하지 않고 `unknown`, R10) — `src/signals/place-names.ts`
- [X] T017 [US2] 기기 포트(`expo-asset` → `File(localUri).bytesSync()`, 비동기 금지 PP1) — `src/signals/place-index-port.ts`
- [X] T018 [US2] 대조표가 16곳 미만이면 순위·거리·데이터 거르기를 조정하고 T012를 다시 돌린다(조정 내용은 research.md R4에 기록)

## Phase 4: User Story 1 — 여러 곳을 시각순으로 말한다 (P1)

**Goal**: 자리 목록 → 프롬프트 장소 줄. **Independent Test**: 세 곳 날의 프롬프트에 세 이름이 시각순·때와 함께.

- [X] T019 [P] [US1] `tracePlaces` visits 테스트(TV1~TV3: `photoCount` 합 = 좌표 사진 수, `firstSeenAt ≤ lastSeenAt`, 시각순, 좌표 0개면 `[]`, 대표 좌표 = `visits[0].coordinate`) — `__tests__/signals/places.test.ts`
- [X] T020 [P] [US1] 자리 줄 만들기 테스트(연이은 같은 이름·이름 없음 합치기, 첫 3항목 + `more`, 때 구간 「오전 0–11·오후 12–17·저녁 18–20·밤 21–23」, 전부 `unknown`이면 싣지 않음, SavedPlace는 합치기 전 전부·「끔」이면 이름 `null`) — `__tests__/diary/place-lines.test.ts`
- [X] T021 [P] [US1] 프롬프트 장소 줄 테스트(PL1~PL8: 한 항목·세 항목·넘침 「그 밖에 두 곳에서도 찍혔어요.」·「이름을 모르는 곳」·「다녀온 곳은」 없음·「갔·머물·있었」 없음·비 E2SN 문장체) — `__tests__/diary/prompt-places.test.ts`
- [X] T022 [US1] `PlaceVisit`·`PlaceTrace.visits` 타입 — `src/signals/types.ts`
- [X] T023 [US1] `tracePlaces`가 visits를 내도록 확장, `collectPlaces`가 사진 시각을 넘김 — `src/signals/places.ts`, `src/signals/collect.ts`
- [X] T024 [US1] `buildPromptPlaces(named: NamedVisit[])`·`savedPlacesOf(visits: PlaceVisit[], names?: PlaceName[])` 구현 — `src/diary/place-lines.ts`
- [X] T025 [US1] `DiaryRequest.places?: PromptPlaces`(`placeName?` 걷음), `DiaryEntry.places?: SavedPlace[]`(옛 `placeName` 읽기 유지) — `src/diary/types.ts`
- [X] T026 [US1] 프롬프트 장소 줄 교체(E2SN·옛 경로 모두, 새 문장은 v5 미측정 주석) — `src/diary/prompt.ts`
- [X] T027 [US1] 파이프라인 4c 교체 테스트(DP1~DP5: 「켬」이면 이름 찾기, 「끔」이면 안 찾음, 찾기가 던져도 계속, `buildPrompt` 전에 실림, 저장 `entry.places`) — `__tests__/diary/pipeline.test.ts`
- [X] T028 [US1] 파이프라인 4c 구현(`deps.placeNamer?`, `deps.placeNamesEnabled?` — 기존 `geocoding?`·`geocodingEnabled?` 대체. 이름은 `placeNamesEnabled` 하나로 통일) — `src/diary/pipeline.ts`
- [X] T029 [US1] 조립부에 `placeNamer(expoPlaceIndexPort())` 연결, `placeNamesEnabled`를 resolve 결과에서 그대로 넘김 — `src/app/wiring.ts`

- [X] T029b [US1] 백그라운드 태스크도 장소 이름 설정을 읽어 `placeNamesEnabled`를 넘긴다(기기 안에서 찾으므로 017의 「백그라운드는 지오코딩하지 않는다」를 걷음, FR-008) — `src/schedule/task.ts`, `__tests__/schedule/background-generation.test.ts`

## Phase 5: User Story 3 — 좌표가 밖으로 나가지 않고 위치 권한을 묻지 않는다 (P2)

**Goal**: 역지오코딩·위치 권한 제거, 설정 켬/끔, 문서 정합. **Independent Test**: 소스 계약 0건, 권한 단계 없음, 대화상자 두 칸.

- [X] T030 [P] [US3] 바깥 전송·권한 0건 소스 계약(NX1~NX6) — `__tests__/config/no-location.test.ts`
- [X] T031 [P] [US3] 설정 이전 테스트(ST1: `"auto"`·`"on"`·파일 없음·깨짐·`{enabled:true}` → `"on"`, `"off"`·`{enabled:false}` → `"off"`) — `__tests__/app/geocoding-setting-store.test.ts`
- [X] T032 [P] [US3] 대화상자 두 칸 테스트(ST2·ST3) — `__tests__/ui/place-name-dialog.test.tsx`
- [X] T033 [US3] 설정 저장소를 두 갈래로(`GeocodingPreference = "on" | "off"`) — `src/app/geocoding-setting-store.ts`
- [X] T034 [US3] `resolve-generation.ts`에서 `locationPermission` 입력 제거, 출력 `geocodingEnabled`를 `placeNamesEnabled = preference === "on"`으로 개명(호출부 모두 따라 고침) — `src/app/resolve-generation.ts`
- [X] T035 [US3] 대화상자 두 칸·문구(카탈로그 `placeOnDesc`·`placeOffDesc`·`placeNotice` 고침, `placeAuto*` 걷음, 골든 `CHANGED_AFTER_GOLDEN`/삭제 기록) — `src/ui/PlaceNameDialog.tsx`, `src/i18n/catalogs/ko/settings.ts`, `__tests__/i18n/ko-golden.test.ts`
- [X] T036 [US3] 위치 권한 제거: `requirements.ts`(`location` 항목·`PermissionKey`, order 재배치), `location-permission-port.ts` 삭제, `OnboardingScreen.tsx`, `permission-tags.ts`·`use-permission-tags.ts`, `SettingsScreen.tsx` 권한 행 — `src/onboarding/`, `src/app/`, `src/ui/`
- [X] T037 [US3] `App.tsx`에서 `expo-location` 권한 읽기·`expoLocationPermissionPort`·`"auto"` 기본값 걷기 — `App.tsx`
- [X] T038 [US3] `geocoding-port.ts`·그 테스트 삭제, `expo-location` 의존성·`app.json` 플러그인 제거, `blockedPermissions`에 `ACCESS_FINE_LOCATION`·`ACCESS_COARSE_LOCATION`·`ACCESS_BACKGROUND_LOCATION` 추가 — `src/signals/`, `package.json`, `app.json`
- [X] T039 [US3] 기존 테스트 정리(`ios-permissions`·`permission-ports`·`requirements`·`decision`·`permission-tags`·`resolve-generation`·`onboarding-screen`·`settings-screen` 등 `location`·`auto`를 전제한 단언 갱신, e2e 스크립트 `scripts/layer1/baseline.ts`·`scripts/seed/shapes.ts`·`scripts/e2e-sample/ios-device.ts`의 위치 권한 처리) — `__tests__/`, `scripts/`
- [X] T040 [US3] 방침·지원·선언·바깥 표 정합(순서: 방침 → 선언 초안 → `outbound.ts`; `place-name` 항목·절 제거, 「기기 안 지도 자료에서 찾고 좌표를 보내지 않는다」, 지원 FAQ 「장소 이름을 끄고 싶어요」 답, 선언 위치 줄 「수집 안 함」 — 콘솔 입력은 소유자) — `site/privacy/index.html`, `site/support/index.html`, `docs/store/privacy-declarations.md`, `__tests__/privacy/outbound.ts`
- [X] T041 [US3] 라이선스 페이지에 OpenStreetMap(ODbL) 항목(© OpenStreetMap contributors, 가공 파일·스크립트 저장소 경로) + 기존 라이선스 계약 테스트 갱신 — `site/licenses/index.html`, `__tests__/` 라이선스 테스트

## Phase 6: User Story 4 — 저장된 자리 목록 (P3)

**Goal**: 저장·다시 읽기. **Independent Test**: 왕복·옛 형식.

- [X] T042 [P] [US4] 저장 왕복 테스트(세 자리 `places` 그대로, 옛 `placeName` 파일 오류 없음) — `__tests__/diary/store-places.test.ts`
- [X] T043 [US4] 저장소가 `places`를 쓰고 읽음(검증: `label: string|null`, `category` 코드 또는 `null`, ISO 문자열, `photoCount ≥ 1`) — `src/diary/store.ts`

## Phase 7: Polish & Cross-Cutting

- [X] T044 위반 주입: `src/`에 `import("expo-location")`, `PERMISSION_REQUIREMENTS`에 `location`, `prompt.ts`에 「다녀온 곳은」을 각각 넣어 테스트가 잡는지 확인하고 되돌림
- [X] T045 `AGENTS.md` 갱신(장소명 = 기기 안 OSM 데이터, 역지오코딩·위치 권한 없음, 데이터 다시 만들기 절차) — `AGENTS.md`
- [X] T046 `npm test`·`npm run lint`(tsc 0 포함) 통과
- [X] T047 실기기: `npx expo prebuild --platform android --clean` → `dumpsys package`로 위치 권한 부재 확인, SM-S901N dev 빌드에서 `sample:seed` 여러 곳 날 일기(프롬프트 미리보기·본문), 「끔」 다시 쓰기, 비행기 모드, 이름 찾기 시간(SC-007) — 기록 `specs/121-richer-day-places/quickstart.md`
- [X] T048 실기기: iPhone 14 개발 서명 빌드에서 여러 곳 날 일기 1회 — 기록 `quickstart.md`
- [X] T049 시뮬레이터: 첫 실행 권한 단계(위치 없음)·설정 대화상자 두 칸·글꼴 2.0배 — 기록 `quickstart.md`

## Dependencies

- Phase 1 → Phase 2 → US2(이름) → US1(줄·파이프라인, US2의 `placeNamer` 필요) → US3(제거·문서, US1의 4c 교체 뒤라야 지오코딩을 걷을 수 있다) → US4(저장, US1의 `savedPlacesOf` 필요) → Polish.
- 같은 Phase 안 [P]는 서로 다른 파일이라 나란히 할 수 있다.

## Parallel Example

```text
T004, T005, T006 (테스트) → T007, T008 (구현) 나란히
T019, T020, T021 (US1 테스트) 나란히
T030, T031, T032 (US3 테스트) 나란히
```

## Implementation Strategy

MVP는 Phase 2 + US2 + US1(일기가 장소명을 시각순으로 말함). US3는 같은 PR 안에서 지오코딩을 걷어 마무리하고, US4는 저장 계약을 잠근다. 모두 한 브랜치·한 구현 커밋.
