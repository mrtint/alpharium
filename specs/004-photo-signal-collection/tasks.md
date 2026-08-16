# 작업: 사진 신호 수집

**Feature**: 004-photo-signal-collection | **Date**: 2026-08-16

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**테스트를 먼저 쓴다.** 헌법 「개발 방식」이 요구하며 001~003이 그렇게 했다.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일이고 미완료 작업에 기대지 않아 병렬 가능
- **[US1~US4]**: 사용자 스토리 단계에서만 붙는다. Setup·Foundational·마무리에는 없다

## Path Conventions

`src/signals/`가 이 기능의 본체다. 002에서 열렸고 지금까지 모양만 있었다.
테스트는 `__tests__/signals/`.

---

## Phase 1: Setup (공유 기반)

**목표**: 의존성과 앱 설정. 여기가 끝나야 무엇이든 돈다.

- [X] T001 `npx expo install expo-media-library`로 설치하고 `package.json`에 선언 확인 — **버전을 추측하지 않는다**(AGENTS.md). 설치본은 57.0.3이며 `expo install`이 SDK 57에 맞는 것을 고른다
- [X] T002 `app.json`의 `plugins`에 `["expo-media-library", { "granularPermissions": ["photo"], "isAccessMediaLocationEnabled": true }]` 추가 — **`granularPermissions`를 좁히는 것이 핵심이다**(research.md §8). 기본값이면 영상·음성 권한까지 매니페스트에 들어가고, 그것은 쓰지 않는 권한을 사용자에게 요구하는 것이다
- [X] T003 `npx expo install --check`와 `npm run lint` 통과 확인 — T001·T002가 기준선(AGENTS.md 「버전」 표)을 깨지 않았는지
  - **실측(2026-08-16)**: `npm run lint`(eslint+tsc+헌법검사) 통과, `npm test` 260개 통과.
  - **`expo install`이 expo를 57.0.9→57.0.12로 올렸고 되돌렸다.** 저장소 소유자의 결정 —
    온디바이스 추론이 실증된 조합에서 실기기 확인 없이 움직이지 않는다. `npm install`이
    범위를 `^57.0.9`로 바꾼 것도 `~57.0.9`로 복구했다(`^`는 다음 설치에서 다시 올라간다).
  - **`expo install --check`는 여전히 세 패키지를 지적한다**(expo ~57.0.13,
    metro-runtime ~57.0.10, expo-file-system ~57.0.4). **의도된 상태다** — 헌법은 SDK 57만
    못 박았지 패치 버전을 정하지 않았고, 실증된 조합을 지키는 쪽을 골랐다. T042(실기기
    빌드)에서 이 조합이 도는지 확인하고 그때 실측으로 정한다.

**⚠️ T002 이후 네이티브 빌드를 다시 해야 반영된다**(`npx expo run:android`). Metro 재시작만으로는 매니페스트가 바뀌지 않는다.

---

## Phase 2: Foundational (차단 전제)

**목표**: 타입과 통로의 모양. 모든 스토리가 여기에 기댄다.

**⚠️ 이 단계가 끝나기 전에는 어떤 스토리도 시작할 수 없다.**

- [X] T004 `src/signals/types.ts`에 `PhotoObservation` 추가 — `{ photos: Photo[]; complete: boolean }` (data-model.md). **`SignalValue`의 세 갈래와 `DaySignals`의 자리 수를 건드리지 않는다**(FR-026)
- [X] T005 [P] `src/signals/types.ts`에 `PhotoPlaces` 추가 — `{ trace: PlaceTrace; source: "photo-exif"; photosWithLocation: number; photosConsidered: number }`. **`source`가 지금 값이 하나뿐이어도 둔다** — 005에서 실제 GPS가 붙을 때 "어디서 왔나"를 묻는 코드가 이미 있어야 한다
- [X] T006 `src/signals/types.ts`의 `DaySignals`에서 `photos`를 `SignalValue<PhotoObservation>`으로, `places`를 `SignalValue<PhotoPlaces>`로 바꾼다 — **담기는 값의 타입만 넓어지고 뼈대는 그대로다**(FR-026)
- [X] T007 `src/signals/fake.ts`를 T006에 맞춰 고친다 — **제품 경로가 아니라는 경계는 그대로 유지한다**(FR-018). `src/ui/`에서 import 하지 않는다
- [X] T008 [P] `src/signals/port.ts`에 `PhotoPort` 정의 — `PermissionState`(다섯), `PhotoFacts`, `LocationOutcome`(셋), 그리고 여섯 함수 (contracts/photo-port.md). **`PhotoFacts`에 URI·파일 경로를 담지 않는다**(FR-005) — 담으면 다음 사람이 파일을 열 수 있고 그 순간 경계가 뚫린다
- [X] T009 `npm run lint` 통과 확인 — 타입이 002·003의 기존 코드를 깨지 않았는지. `pipeline.ts`·`request.ts`가 `DaySignals`를 쓰므로 여기서 드러난다
  - **타입 변경이 네 자리를 드러냈다**: `diary/store.ts:71`(직렬화 왕복), `diagnostics/storage-check.ts:45`,
    `signals/fake.ts` 두 곳, `__tests__/diary/store.test.ts:185`.
  - **`store.ts`가 가장 중요했다** — `takenAt`를 되살리는 코드가 값이 한 겹 깊어지면서
    `complete`를 떨어뜨릴 뻔했다. 떨어뜨렸다면 잘린 하루가 저장을 거쳐 「전부 봤다」로
    되살아났을 것이다(FR-014d 위반). 왕복 테스트를 하나 더 추가했다.

**Checkpoint**: 타입과 통로가 섰다. 스토리들이 병렬로 갈 수 있다.

---

## Phase 3: User Story 2 - 보지 못한 것을 보았다고 하지 않는다 (Priority: P1) 🎯 MVP

**목표**: 권한 상태가 신호로 정확히 옮겨진다. **이것이 이 기능의 방어선이다.**

**왜 US1보다 먼저인가**: US1(사진을 모은다)이 이것 없이 완성되면 **거짓을 만드는 기능**이
된다. 권한 거절을 "사진 0장"으로 옮기는 코드가 한 번 들어가면 그 위에 쌓이므로, 판정
규칙을 먼저 세운다.

**Independent Test**: 권한 다섯 갈래를 대역으로 만들어 판정이 갈리는지 확인한다. 기기 불필요.

### Tests for User Story 2 ⚠️ 먼저 쓰고, 실패를 확인한 뒤 구현한다

- [X] T010 [P] [US2] `__tests__/signals/collect.test.ts`에 C1·C3 작성 — 권한 다섯 갈래가 각각 **다른 `unknown` 이유**를 만든다(FR-010), 그리고 `denied`가 절대 `none`이 되지 않는다(SC-002). **C3이 이 기능에서 가장 중요한 테스트다**
- [X] T011 [P] [US2] `__tests__/signals/collect.test.ts`에 C15 작성 — 신호를 물어도 `requestPhotoPermission()`이 **불리지 않는다**(FR-011). 대역이 호출 횟수를 센다
- [X] T012 [P] [US2] `__tests__/signals/collect.test.ts`에 C14·C16 작성 — `steps`·`battery`·`connectivity`의 `unknown` 이유가 **서로 다르다**(FR-015a), `SignalValue` 갈래 수가 002와 같다(SC-006b)

### Implementation for User Story 2

- [X] T013 [US2] `src/signals/collect.ts`에 `collectDaySignals(port, day, options?)` 뼈대 — 권한 판정 갈래만 먼저(contracts/collection.md 「photos」 1번). **`granted`가 아니면 전부 `unknown`이고 상태별로 이유가 다르다**
- [X] T014 [US2] `src/signals/collect.ts`에 채우지 않는 셋 추가 — `steps`는 「안드로이드가 기간 걸음 수를 제공하지 않는다」, 나머지 둘은 「아직 수집하지 않는다」(FR-015a). **문구가 달라야 「못 하는 것」과 「안 한 것」이 갈린다**
- [X] T015 [US2] `collect.ts`가 **어떤 경우에도 던지지 않는지** 확인 — 포트가 무너져도 `unknown`이 나간다(FR-012). 파이프라인이 어느 단계에서 멈췄는지 말할 수 있어야 한다

**Checkpoint**: 권한 없음이 절대 `none`이 되지 않는다. US1이 안전하게 올라갈 바닥이 생겼다.

**실측(2026-08-16)**: C1·C3·C14·C15·C16 — 11개 통과.

**계획에 없던 것을 하나 했다**: `day-boundary.ts`에 `dayBounds(day)`를 더했다. 하루의 시각
구간을 미디어 라이브러리에 넘겨야 하는데, 그것을 `collect.ts`에서 계산하면 **04:00이
`day-boundary.ts` 밖으로 새어 나간다**(FR-021a가 금지). 경계를 아는 자리를 하나로 지키려면
접근자가 그 파일에 있어야 했다.

---

## Phase 4: User Story 1 - 하루의 사진을 되짚어 신호로 만든다 (Priority: P1)

**목표**: 그 하루의 사진이 신호에 담긴다. 04:00 경계로 갈린다.

**Independent Test**: 여러 시각의 사진을 대역으로 만들고 하루를 물어 그 하루의 것만 오는지, 03:59과 04:01이 다른 날로 갈리는지 확인한다. 기기 불필요.

### Tests for User Story 1 ⚠️

- [X] T016 [P] [US1] `__tests__/signals/collect.test.ts`에 C2·C5 작성 — `granted` + 0장이면 `none`(FR-009), 04:00 양쪽이 **다른 하루**로 갈린다(FR-002, SC-003)
- [X] T017 [P] [US1] `__tests__/signals/collect.test.ts`에 C6·C7 작성 — 찍힌 시각이 없는 사진(FR-003)과 미래 시각 사진(Edge Cases)이 **버려진다**
- [X] T018 [P] [US1] `__tests__/signals/collect.test.ts`에 C8·C9 작성 — 201장이면 200장 + `complete: false`(FR-014a), 잘릴 때 **이른 시각부터** 남는다(FR-014b)

### Implementation for User Story 1

- [X] T019 [US1] `src/signals/collect.ts`에 사진 조회 추가 — `day-boundary.ts`로 하루의 시작·끝을 구해 `photosBetween(from, to, limit + 1)` 호출. **04:00을 여기서 다시 계산하지 않는다**(FR-002)
- [X] T020 [US1] `src/signals/collect.ts`에 사진 거르기 추가 — 시각이 없거나 미래인 것을 버린다(FR-003). **버린 뒤 0장이면 `none`이다** — 파일은 있었지만 하루에 넣을 수 있는 사진이 없었다
- [X] T021 [US1] `src/signals/collect.ts`에 상한 처리 추가 — `limit + 1`장이 오면 이른 시각부터 `limit`장을 담고 `complete: false`(FR-014a·b). 기본 상한 200(research.md §7). **200은 짐작이라고 주석에 적는다**(원칙 V)
- [X] T022 [US1] `src/signals/expo-port.ts`에 `photosBetween` 구현 — `Query`의 `gte`/`lt`(CREATION_TIME)·`eq`(MEDIA_TYPE=photo)·`orderBy`·`limit`으로 질의하고 **`exeForMetadata()`를 쓴다**(research.md §1). **`exe()`를 쓰지 않는다** — 메타데이터 경로에는 픽셀에 닿을 문이 없고, 그것이 FR-005를 구조로 보장한다
- [X] T023 [US1] `src/signals/expo-port.ts`에 권한 조회·요청 넷 구현 — `getPermissionsAsync`/`requestPermissionsAsync`의 `status`·`canAskAgain`·`accessPrivileges`를 `PermissionState` 다섯으로 옮긴다. **`canAskAgain: false`가 `blocked`다**(FR-023)

**Checkpoint**: 사진이 신호에 담긴다. `photos`가 진짜 값이 된다.

**실측(2026-08-16)**: C2·C4·C5·C6·C7·C8·C9·C13 — 25개 통과(누적 43개).

**⚠️ 설치본에서 확인한 제약 — US3의 설계를 바꾼다**: `expo-media-library 57`은
**`ACCESS_MEDIA_LOCATION`을 따로 묻는 함수를 주지 않는다.** 패키지 전체에서 이 권한은
`getLocation()`·`getExif()`의 주석에만 나오고 조회 API가 없다.

그래서 `locationPermission()`은 **좌표 권한을 알 수 없다**. 사진 권한을 좌표 권한인 척
돌려주면 「좌표 권한이 있다」는 거짓이 신호에 실린다(원칙 V). 사진이 안 되면 좌표도 확실히
안 된다는 것만 반영하고, 나머지는 `undetermined`를 돌려준다.

**따라서 `places` 판정은 권한이 아니라 「실제로 읽어 본 결과」로 해야 한다** —
`locationOf()`가 전부 `failed`면 권한이 없는 것이고, 그것이 `unknown`의 근거다.
contracts/collection.md의 「places」 2번을 이 사실에 맞춰 고친다(T030).

---

## Phase 5: User Story 3 - 사진의 좌표로 다닌 자리를 짐작한다 (Priority: P2)

**목표**: 위치 권한 없이 사진 좌표로 `places`를 채운다.

**Independent Test**: 좌표가 있는·없는 사진을 섞어 `places`가 어떻게 채워지는지 확인한다. 기기 불필요.

### Tests for User Story 3 ⚠️

- [X] T024 [P] [US3] `__tests__/signals/places.test.ts`에 C11·C12 작성 — 100m 안이면 한 자리(FR-013f, SC-005a), 밖이면 두 자리
- [X] T025 [P] [US3] `__tests__/signals/places.test.ts`에 C10 작성 — `(0,0)`과 범위 밖 좌표가 **자리로 세어지지 않는다**(FR-013d, SC-005)
- [X] T026 [P] [US3] `__tests__/signals/collect.test.ts`에 C4·C13 작성 — **좌표 권한 없음이 `photos`를 바꾸지 않는다**(FR-013a, SC-004), `locationOf`가 던져도 `photos`가 산다(FR-012). **C4가 이 스토리의 핵심이다**
- [X] T027 [P] [US3] `__tests__/signals/collect.test.ts`에 `places` 판정 작성 — 좌표 있는 사진 0장이면 `none`(FR-013c), `photos`가 `known`이 아니면 `unknown`

### Implementation for User Story 3

- [X] T028 [P] [US3] `src/signals/places.ts`에 `SAME_PLACE_METERS = 100`과 하버사인 거리 함수 — **이 상수가 저장소에서 여기 하나뿐이어야 한다**(FR-013g). **100m는 짐작이라고 주석에 적는다**(FR-013h) — 실측인 척하면 원칙 V가 깨진다
- [X] T029 [US3] `src/signals/places.ts`에 `tracePlaces(points)` 구현 — 시각 순 정렬 → 직전 자리 중심과 100m 비교 → 자리 수와 이은 거리(contracts/collection.md 「자리 묶기」). **순차 묶기이며 최적이 아니라고 주석에 적는다**
- [X] T030 [US3] `src/signals/collect.ts`에 `places` 판정 추가 — **순서가 중요하다**: `photos`가 `known`인지 먼저 보고, 그다음 좌표 권한을 본다(contracts/collection.md). 뒤바뀌면 "좌표 권한 없음"이 이유로 나가는데 진짜 이유는 사진을 못 본 것이다
- [X] T031 [US3] `src/signals/collect.ts`에 유효하지 않은 좌표 거르기 — `(0,0)`과 `|lat|>90`·`|lon|>180`을 `tracePlaces()`에 넣기 전에 버린다(FR-013d)
- [X] T032 [US3] `src/signals/expo-port.ts`에 `locationOf` 구현 — `Asset.getLocation()`을 쓰되 **반드시 try/catch로 감싼다**(research.md §3). 안드로이드에서 권한이 없으면 **`null`이 아니라 예외를 던지므로**, 감싸지 않으면 좌표 권한 없는 기기에서 사진 신호 전체가 무너진다. `getExif()`를 쓰지 않는다

**Checkpoint**: 위치 권한 없이 자리를 짐작한다. 한쪽 실패가 다른 쪽을 오염시키지 않는다.

**실측(2026-08-16)**: C4·C10·C11·C12 + `places` 판정 — 63개 통과(신호 갈래 전체).

**계약을 하나 고쳤다**: `places` 판정을 「좌표 권한을 본다」에서 **「실제로 읽어 본 결과를
본다」**로 바꿨다(contracts/collection.md 반영). `expo-media-library`가
`ACCESS_MEDIA_LOCATION`을 따로 묻는 함수를 주지 않기 때문이며, 사진 권한을 좌표 권한인 척
돌려주면 거짓이 신호에 실린다. 전부 `failed`면 `unknown`, `absent`가 섞였으면 `none`이다.

---

## Phase 6: User Story 4 - 채우지 않은 신호를 채운 척하지 않는다 (Priority: P3)

**목표**: 셋이 `unknown`이고 이유가 구분된다.

**이미 T012·T014에서 끝났다.** 스토리로 따로 세운 것은 명세의 구조를 따르기 위함이며, 여기서는 확인만 한다.

- [X] T033 [US4] T012의 테스트가 초록불인지 확인하고, 세 이유 문구가 서로 다른지 눈으로 본다(FR-015a)

---

## Phase 7: 진단 화면과 파이프라인 잇기

**목표**: 실기기에서 권한을 허용할 길과, 신호가 파이프라인으로 흐를 길.

- [X] T034 [P] `__tests__/signals/port.test.ts` 작성 — 대역이 `PhotoPort` 계약을 만족하는지, contracts/photo-port.md 「대역이 만들 수 있어야 하는 상태」 1~10번
- [X] T035 [P] `__tests__/ui/diagnostics-permission.test.tsx` 작성 — G1~G4(contracts/diagnostics.md). **G2가 중요하다**: 화면이 열려도 요청이 불리지 않는다(FR-011)
- [X] T036 `src/signals/expo-port.ts`에 `expoPhotoPort()` 조립 — 지연 import로 `expo-media-library`를 부른다(001~003과 같은 이유). **이 파일이 004에서 기기에 닿는 유일한 자리다**(FR-017)
- [X] T037 `src/ui/DiagnosticsScreen.tsx`에 권한 자리 추가 — 사진·좌표 **각각의** 상태와 요청 버튼(FR-020, FR-021). **둘을 합치지 않는다** — 합치면 "사진은 되는데 좌표가 안 되는" 상태를 진단할 수 없다
- [X] T038 `src/ui/DiagnosticsScreen.tsx`에서 `blocked`를 `denied`와 다르게 보인다(FR-023) — 다시 요청해도 창이 안 뜬다는 것이 드러나야 사용자가 버튼을 반복해 누르지 않는다. **`useEffect`에서 요청하지 않는다**(FR-011) — expo 튜토리얼이 그렇게 하지만 그것을 따라 하면 위반이다
- [X] T039 `src/ui/DiagnosticsScreen.tsx`에서 오늘의 신호를 조회해 보이는 경로 추가 — quickstart D2·D3이 이것으로 검증된다. **사용자용 문안을 짓지 않는다**(FR-022)
- [X] T040 `PipelineDeps.loadSignals`에 `collectDaySignals`를 꽂는 자리 확인 — **`pipeline.ts`를 고치지 않는다**(research.md §6). 002가 주석으로 예고한 자리이며 호출부에서 갈아끼운다
- [X] T041 `npm test`와 `npm run lint` 전부 통과 확인 — C1~C16, G1~G4가 초록불

**Checkpoint**: 기기 없이 검증할 수 있는 것은 전부 끝났다. **아직 이 기능은 검증되지 않았다.**

**실측(2026-08-16)**: `npm test` 326개 통과(25 스위트), `npm run lint` 통과, 헌법 검사 위반 0건.
004 이전이 260개였으므로 66개가 늘었다.

**T040은 코드가 아니라 확인이었다**: `loadSignals`의 제품 경로 호출부가 아직 없다(파이프라인을
테스트 밖에서 돌리는 곳이 없다). `collectDaySignals`가 `PipelineDeps["loadSignals"]` 자리에
**어댑터 없이 그대로 들어가는 것**을 타입으로 확인했다 — 002가 예고한 자리가 그대로 맞았다.

**계획에 없던 파일 둘**: `src/ui/PermissionPanel.tsx`, `src/ui/SignalProbe.tsx`.
`DiagnosticsScreen.tsx`에 다 넣으면 그 파일이 하는 일이 너무 많아진다 — 권한은 상태와 동작을
함께 가져 성격이 다르고, 신호 조회는 D2·D3의 검증 경로다.

**막혔던 것 — `@testing-library/react-native` 14의 `render`가 Promise를 반환한다.**
`await` 없이 쓰면 `screen`이 비어 있고 오류 문구가 "`render` function has not been called"라
원인을 가리키지 않는다. 7줄짜리 최소 재현으로 좁혔다(반환값의 프로토타입이
`then`/`catch`/`finally`). 또 `toHaveTextContent`는 **정확히 일치**를 보므로 부분 문자열은
정규식으로 줘야 한다. 둘 다 테스트 파일 주석에 남겼다.

---

## Phase 8: 실기기 검증 — **완료 조건**

**건너뛴 실기기 테스트는 통과가 아니다**(헌법 원칙 V, AGENTS.md).

**먼저 읽을 것**: AGENTS.md 「실기기 테스트를 돌리기 전에」 — Metro가 dev로 떠 있어야 하고, 기기 잠금이 풀려 있어야 하며, 한글 검증 문구는 `run-device-tests.mjs`를 거쳐야 한다.

> **✅ 2026-08-16 무선(adb over Wi-Fi)으로 검증했다.** SM-G986N, Android 13.
> 핵심 경로(T042·T045·T046)는 확인됐고, T043·T047·T048은 **재지 못한 채로 남겼다** —
> 재지 않은 것을 잰 척하지 않는다(원칙 V).

- [X] T042 `npx expo run:android`로 **네이티브 빌드를 다시 한다** — T002의 매니페스트 변경은 이것 없이 반영되지 않는다
  - **무선(adb over Wi-Fi)으로 했다**(2026-08-16). `adb mdns services`가 기기를 찾아 주고
    `adb connect IP:포트` 한 번으로 붙었다. `adb reverse tcp:8081 tcp:8081`도 무선에서 되므로
    Metro를 `localhost:8081`로 잡을 수 있다. **`expo run:android --device`는 `IP:포트` 형식을
    받지 못한다** — 기기가 하나뿐이면 플래그를 빼면 된다.
  - **⚠️ `expo run:android`만으로는 매니페스트가 갱신되지 않았다.** `android/`가 이미 있으면
    prebuild를 건너뛰기 때문이다. 첫 빌드 뒤 확인해 보니 `READ_MEDIA_IMAGES`와
    `ACCESS_MEDIA_LOCATION`이 **둘 다 없었고** `READ_MEDIA_VISUAL_USER_SELECTED`만 있었다.
    그 상태로는 사진 접근을 허용할 방법이 아예 없다.
  - **`npx expo prebuild --platform android --clean`이 필요했다.** 그 뒤 셋이 모두 들어갔고,
    `READ_MEDIA_VIDEO`·`READ_MEDIA_AUDIO`는 들어가지 않았다 — `granularPermissions: ["photo"]`가
    의도대로 동작한 것이 실측으로 확인됐다(research.md §8).
  - **실측 절차**: `adb shell dumpsys package com.anonymous.alpharium`의 `requested permissions`를
    본다. 빌드가 성공했다고 매니페스트가 맞다고 가정하지 않는다.
- [~] T043 **quickstart D1 — 안드로이드가 「일부 사진만 허용」을 `limited`로 주는가**. **미확인으로 남긴다**
  - **전체 허용만 쟀다**(2026-08-16). 「모두 허용」에서 `photoPermission()`이 `granted`,
    `dumpsys`의 `READ_MEDIA_IMAGES`가 `granted=true, flags=[USER_SET]`,
    `READ_MEDIA_VISUAL_USER_SELECTED`는 런타임 부여 없음. **예상된 갈래이며 FR-008이 다루는
    상태가 아니다.**
  - **「일부만 허용」 갈래는 재지 않았다.** 저장소 소유자의 판단으로 **제품이 「모두 허용」을
    전제하기 때문이다**(research.md §2a) — 자동으로 일기를 쓰려면 매번 사진을 다시 골라 줄 수
    없다.
  - **재지 않은 것을 잰 척하지 않는다**(원칙 V). 「구분할 수 없다」는 결론을 적지 않았다.
- [X] T044 **T043의 결과를 research.md에 실측으로 적었다** — §2에 전체 허용 실측을, §2a에 제품이 「모두 허용」을 전제한다는 결정과 그 귀결을 적었다. **명세(FR-008)는 고치지 않았다** — 「구분할 수 없다」가 확인되지 않았으므로 고칠 근거가 없다. `limited`를 `unknown`으로 다루는 코드는 그대로 둔다(사용자가 설정에서 만들 수 있는 상태이고, 그때 부분 목록을 `known`으로 내보내면 원칙 V가 깨진다)
- [X] T045 quickstart D2 — **실기기에서 신호가 나왔다**(2026-08-16, SM-G986N, Android 13). SC-008 충족
  ```
  사진    known — 3장
  자리    known — 1곳, 0m (사진 3장 중 3장에서)
  걸음    unknown — 안드로이드가 기간 걸음 수를 제공하지 않는다
  배터리  unknown — 아직 수집하지 않는다
  연결    unknown — 아직 수집하지 않는다
  ```
  - **`photos`가 진짜 값이 됐다** — 미디어 라이브러리에서 그날의 사진을 실제로 되짚었다.
  - **좌표가 실제로 읽혔다** — `ACCESS_MEDIA_LOCATION`이 붙었고 `getLocation()`이 3장 모두에서
    좌표를 얻었다. 한 곳으로 묶인 것은 같은 장소에서 찍힌 사진들이기 때문이며 100m 규칙이
    동작했다는 뜻이다(D5의 근거가 되기엔 표본이 작다).
  - **채우지 않는 셋이 각자 다른 이유로 `unknown`이다**(FR-015a) — 화면에서 눈으로 확인했다.
  - **FR-011도 확인됐다** — 진단 화면을 열었을 때 권한 창이 뜨지 않았고 둘 다 「아직 묻지 않음」이었다.
- [X] T046 quickstart D3 — **왕복이 확인됐다**(2026-08-16). SC-008a 충족. **이 기능의 핵심 검증이다**
  - `adb shell pm revoke ... READ_MEDIA_IMAGES` 후 조회:
    ```
    사진   unknown — 사진 접근 권한을 아직 묻지 않았다
    자리   unknown — 사진을 보지 못해 좌표를 물을 수 없다
    ```
  - **`none`이 아니라 `unknown`이었다.** 직전에 `known — 3장`을 낸 바로 그 사진들이 그대로
    있는데 권한을 거두자 「없다」가 아니라 「모른다」가 됐다. **SC-002가 실기기에서 확인됐다.**
  - **`자리`의 이유가 「좌표 권한이 없다」가 아니라 「사진을 보지 못해」였다** — 판정 순서(사진
    먼저, 좌표 나중)가 실기기에서 옳게 동작한 증거다(contracts/collection.md 「places」 1번).
  - `pm grant`로 되돌리자 `known — 3장`으로 복귀했다.
  - **부수적으로 확인된 것**: 좌표 접근이 화면에 「아직 묻지 않음」인데도 `자리 known`이 나온다.
    **버그가 아니라 설계대로다** — `locationPermission()`은 「알 수 없다」는 뜻으로
    `undetermined`를 돌려주고, 실제 판정은 읽어 본 결과로 한다(research.md §2a).
    `ACCESS_MEDIA_LOCATION`은 부여돼 있어 3장 모두에서 좌표가 읽혔다.
- [~] T047 [P] quickstart D4 — **건너뛴다.** 기기의 오늘 사진이 3장뿐이라 200장 상한을 재 볼
  표본이 없다. **research.md §7의 200은 여전히 짐작이다**(원칙 V). 사진이 많은 날에 다시 잰다
- [~] T048 [P] quickstart D5 — **부분 확인.** 같은 장소의 사진 3장이 **1곳으로 묶였다**(자리
  known — 1곳, 0m). 100m 규칙이 동작하는 것은 봤지만 **떨어진 두 곳을 가르는지는 못 봤다** —
  표본이 한 장소뿐이었다. **research.md §4의 100m는 여전히 짐작이다**(원칙 V)

---

**Phase 8 상태(2026-08-16)**: T042·T044·T045·T046 **완료**. T043·T047·T048은 **미측정으로
남겼다** — 각각 제품이 「모두 허용」을 전제해서(T043), 표본이 없어서(T047·T048)다.
**셋 다 「재지 않았다」고 적었지 「확인했다」고 적지 않았다.**

---

## Phase 9: 마무리

- [X] T049 AGENTS.md 갱신 — `src/signals/`가 이제 **모양만 있는 것이 아니라 사진을 실제로 수집한다**로 고친다. 004가 무엇을 채웠고 무엇이 여전히 `unknown`인지 적는다
- [X] T050 AGENTS.md의 **낡은 서술 정정** — 「로스터의 크기·지문은 아직 비어 있고 R2·R3이 빨간불」이 003 완료로 사실이 아니다. 크기는 다섯 개 다 찼고 `quiet`의 md5도 실기기에서 채록됐다
- [X] T051 `npm test`·`npm run lint`·`npm run test:device` 전부 통과 확인. **건너뛴 것이 있으면 그렇게 보고한다**(원칙 V)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
   ↓
Phase 2 (Foundational) ← 차단. 여기가 끝나야 스토리가 시작된다
   ↓
Phase 3 (US2 판정 방어선) ← MVP. US1보다 먼저인 것이 의도적이다
   ↓
Phase 4 (US1 사진 수집)
   ↓
Phase 5 (US3 좌표)  ←  Phase 6 (US4 확인만)
   ↓
Phase 7 (진단·파이프라인)
   ↓
Phase 8 (실기기) ← **완료 조건**
   ↓
Phase 9 (마무리)
```

### 스토리 의존

- **US2 → US1**: 판정 규칙이 먼저 서야 US1이 그 위에 안전하게 올라간다. 순서를 뒤집으면 "권한 없음 → 빈 목록"이 들어갈 자리가 생긴다
- **US1 → US3**: 좌표는 사진 목록이 있어야 물어볼 대상이 생긴다
- **US4**: 사실상 US2에 포함된다. 확인만 한다

### 병렬 기회

- T004·T005·T008 — 타입과 통로 (T006이 T004·T005에 기댄다)
- T010·T011·T012 — US2 테스트 셋
- T016·T017·T018 — US1 테스트 셋
- T024·T025·T026·T027 — US3 테스트 넷
- T034·T035 — 포트·화면 테스트
- T047·T048 — 실기기 값 조정 둘

---

## Implementation Strategy

### MVP 우선 (Phase 1~3)

**Phase 3까지가 MVP다.** 사진을 아직 모으지 않지만 **권한 판정이 정확하다.** 이 상태에서
이미 헌법 원칙 V가 지켜지고, 그 위에 US1을 올리는 것이 안전하다.

거꾸로 US1을 먼저 하면 판정 없이 사진을 모으게 되고, "권한 없으면 빈 배열" 같은 임시
코드가 들어간다. **그 두 줄이 이 기능 전체를 무너뜨린다.**

### 증분 전달

1. Phase 1~3 → 권한 판정이 정확하다
2. + Phase 4 → `photos`가 진짜 값이 된다. **파이프라인의 `signals` 단계가 처음으로 진짜 값을 통과한다**
3. + Phase 5 → 위치 권한 없이 자리를 짐작한다
4. + Phase 7 → 실기기에서 권한을 허용할 길이 생긴다
5. + Phase 8 → **이제 검증됐다고 말할 수 있다**

### T043이 명세를 바꿀 수 있다

**Phase 8의 첫 작업이 명세를 되돌릴 수 있는 유일한 작업이다.** 안드로이드가 「일부만
허용」을 구분해 주지 않으면 FR-008을 지킬 방법이 없고, 그때는 **발견한 사실을 적고 판정을
다시 정한다.** 통과시키려고 그럴듯한 판정을 지어내는 것이 원칙 V 위반이다.

`PhotoObservation.complete`가 이미 있으므로 "전부인지 알 수 없다"를 담을 길은 열려 있다.

---

## 이 기능이 끝나도 안 되는 것

- **일기는 나오지 않는다.** `generate()`는 여전히 `not-implemented`이고 파이프라인은 `generation`에서 멈춘다. 다만 `signals` 단계는 이제 **진짜 값**을 통과시킨다
- **사진의 내용을 보지 않는다.** 시각 처리(VLM)는 005다 — mmproj가 생성 엔진에 붙는 구조라 그것이 먼저 서야 한다
- **걸음·배터리·연결은 `unknown`이다.** 그것이 이 기능의 결론이다
- **캐릭터에 이름과 설명이 없다.** 003과 같다
