---

description: "Task list for 042 — 사진이 있는 하루는 VLM을 반드시 거친다"
---

# Tasks: 사진이 있는 하루는 VLM을 반드시 거친다

**Input**: Design documents from `specs/042-photo-vision-always/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/photo-vision-always.md](./contracts/photo-vision-always.md)

**Tests**: 이 저장소는 **계약을 먼저 정하고 테스트를 먼저 쓴다**(헌법 「개발 방식」 MUST).
테스트 태스크가 선택이 아니라 기본이다.

**Organization**: 사용자 스토리별로 묶되, **이 기능은 타입 축소가 먼저 와야 나머지가
`tsc`로 드러나는 구조**라 Foundational이 유난히 무겁다(그것이 이 기능의 성격이다).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능 (다른 파일, 미완 태스크에 의존하지 않음)
- **[Story]**: US1(반드시 본다) · US2(볼 것 없으면 안 연다) · US3(설정이 사라진다)

## Path Conventions

모바일 단일 프로젝트 — `src/`, `__tests__/`, `.maestro/`가 저장소 루트에 있다.

---

## ⚠️ 시작 전에

- [ ] T001 `git branch --show-current`로 `042-photo-vision-always`임을 **눈으로** 확인한다 (AGENTS.md — 2026-08-29 main 작업 사고). 스펙킷이 출력하는 `BRANCH`는 디렉터리 이름이지 체크아웃된 브랜치가 아니다
- [ ] T002 실기기 상태를 보존할 것을 확인한다 — **자동 생성 ON(목표 12시)·배터리 예외·작성자 금동이를 끄지 않는다.** `pm clear`를 쓰는 `.maestro/unified-permission-onboarding.yml`을 이 스펙에서 실행하지 않는다(024 2차 세션이 그것으로 검증용 모델을 날렸다)

---

## Phase 1: Setup

**Purpose**: 축소 전 기준선을 남긴다 — 나중에 "원래 통과하던 것"과 구분하기 위해

- [ ] T003 `npm run lint && npm test`를 돌려 **축소 이전 기준선**을 기록한다 (현재 `logic` 111 스위트 / `ui` 44 스위트, 전부 통과가 기준선)

---

## Phase 2: Foundational — 타입을 좁혀 작업 목록을 뽑는다

**⚠️ CRITICAL**: 이 단계가 끝나야 US1~US3을 시작할 수 있다. **T004가 이 기능의
시작점이며, 그 뒤 `tsc`의 출력이 나머지 태스크의 실제 목록이다**(R1).

- [ ] T004 `src/diary/types.ts`의 `VisionSetting`을 `"quick"` 하나로, `VISION_SETTINGS`를 `["quick"]`으로 좁힌다. 주석의 "아래 셋으로만 제시한다"를 헌법 v1.7.0 문구로 갱신한다 (E1)
- [ ] T005 `npx tsc --noEmit`을 돌려 **오류 목록 전체를 파일에 받아 둔다.** 이 목록이 T010~T020의 실제 범위다 — 아래 태스크가 그것과 어긋나면 **목록을 믿는다**(R1)
- [ ] T006 [P] `src/vision/types.ts`의 `VisionDepth`를 `"quick"` 하나로 좁힌다 (E2, FR-006·FR-009)
- [ ] T007 [P] `src/vision/types.ts`의 `VisionOutcome`에서 `skipped` 갈래를 제거한다 — 제품 코드가 한 번도 반환하지 않으며 설정이 사라져 **도달 불가**가 된다 (R3, E3, C8)
- [ ] T008 [P] `src/vision/vision-port.ts`의 `IMAGE_TOKENS`를 `{ quick: 256 }` 하나로 좁힌다 (E2, C2, FR-006·FR-010)
- [ ] T009 `src/inference/on-device.ts:221`의 `request.vision === "detailed" ? ... : "quick"` 삼항을 제거하고 깊이를 `"quick"` 고정으로 둔다 (T005의 `tsc`가 짚는 자리)

**Checkpoint**: 타입이 좁아졌고 `tsc`가 나머지 자리를 전부 짚었다

---

## Phase 3: User Story 1 — 사진이 있는 하루는 반드시 사진을 보고 쓴다 (P1) 🎯 MVP

**Goal**: 사진이 있으면 **네 경로 전부**(화면·백그라운드·진단·최초실행)가 캡션을 돈다

**Independent Test**: 사진 있는 하루를 설정 조작 없이 써서 캡션이 도는지 확인
(`has_media=1`). 이것만 돼도 헌법 MUST의 본체가 성립한다

### Tests for User Story 1 ⚠️ (먼저 쓰고 실패를 확인한다)

- [ ] T010 [P] [US1] `__tests__/schedule/background-generation.test.ts`(기존 파일, 024의 B1a가 있는 곳)에 백그라운드 경로가 **사진 설정을 읽지 않는다**는 계약 테스트를 추가한다 — `task.ts` 소스를 읽어 `loadVisionSetting`·`vision = "none"` 분기가 없음을 확인 (C3, 주석 걷어낸 뒤 검사)
- [ ] T011 [P] [US1] `__tests__/vision/photo-vision-always.test.ts`(T019와 같은 신규 파일)에 `GenerationProbeProps`에 `vision` 필드가 **없다**는 계약 테스트를 추가한다 — 선언을 `readFileSync`로 읽어 확인. **`.ts`이므로 `render()`를 쓰지 않는다**(소스 검사만, jest 프로젝트 분리 규칙) (C3, FR-004a)

### Implementation for User Story 1

- [ ] T012 [US1] `src/schedule/task.ts`에서 `loadVisionSetting`·`expoVisionSettingPort` import(36행 부근)와 「자동/설정없음 → `"none"`」 분기(139-141행)를 **통째로 제거**하고 `pipeline.run`에 `vision: "quick"`을 넘긴다. `SettingsEffectDeps`의 `loadVision` 주입 자리도 함께 정리한다 (R7, FR-004) — **이 기능의 실질적 이행 지점이다**
- [ ] T013 [P] [US1] `src/ui/GenerationProbe.tsx`에서 `vision?: VisionSetting` prop과 기본값 `"none"`(40·49행)을 제거하고, `pipeline.run` 호출에 `"quick"`을 넘긴다 (R8, FR-004a)
- [ ] T014 [P] [US1] `App.tsx:691`의 최초 실행 자동 생성 `vision: "quick"`은 **그대로 둔다.** 주석이 011을 근거로 든 설명을 헌법 v1.7.0 근거로 갱신만 한다 (R6 — 이미 이 기능이 요구하는 모양)

**Checkpoint**: 사진이 있으면 네 경로 전부가 캡션을 돈다 — 끄는 설정은 아직 화면에 남아 있어도 무방

---

## Phase 4: User Story 2 — 볼 것이 없으면 열지 않는다 (P1)

**Goal**: 0장·권한없음이면 엔진을 열지 않고, 그 둘이 **서로 다른 말**로 일기에 남는다

**Independent Test**: 0장인 하루로 써서 캡션 시도 0회·「사진 없음」, 권한 거부
상태로 써서 「사진 모름」이 나오는지 확인

> **011이 세운 것을 유지하는 스토리다.** 새로 만드는 것이 아니라 **축소 과정에서
> 깨지지 않았음을 잠그는** 자리다.

### Tests for User Story 2 ⚠️

- [ ] T015 [P] [US2] `__tests__/inference/on-device.test.ts`에 「0장」과 「권한없음」 두 입력으로 각각 (a) 시각 엔진 `load` 0회, (b) `no-photos` 반환을 확인하는 케이스가 있는지 점검하고 없으면 추가한다 (C4, FR-002)
- [ ] T016 [P] [US2] `__tests__/diary/prompt*` 계열에 「사진: 없었다」와 「사진: 모른다」가 **서로 다른 문구**로 나오는 케이스가 있는지 점검하고 없으면 추가한다 (C4, FR-003, 원칙 V)

### Implementation for User Story 2

- [ ] T017 [US2] `src/inference/on-device.ts`의 `photos.kind !== "known" || photos.value.photos.length === 0 → no-photos` 판정이 **그대로인지 확인한다.** 축소로 인해 이 판정이 바뀌면 안 된다 (FR-002 — 011의 결론을 뒤집지 않는다)
- [ ] T018 [US2] `src/diary/prompt.ts`가 `photos` 신호를 여전히 그대로 적는지 확인한다 — 캡션을 안 돈 이유는 `no-photos` 하나지만 **프롬프트의 두 문구는 갈려 있어야 한다** (FR-003)

**Checkpoint**: 0장·권한없음에서 엔진이 안 열리고 두 상태가 일기에서 구분된다

---

## Phase 5: User Story 3 — 사진 보기 설정이 사라진다 (P2)

**Goal**: 사진을 볼지·얼마나 깊이 볼지 고르는 자리가 앱 어디에도 없다

**Independent Test**: 설정 탭을 끝까지 훑어 네 선택지가 모두 없고, 사진 모델
준비 상태는 그대로 있는지 확인

### Tests for User Story 3 ⚠️

- [ ] T019 [P] [US3] `__tests__/vision/photo-vision-always.test.ts`(신규)에 C1 계약 테스트를 추가한다 — `src/`에 `VisionPicker`·`vision-setting-store`가 없고, `VisionSetting`의 멤버가 **하나**임을 소스에서 확인(주석은 걷어낸 뒤). **`tsc`는 유니온을 넓히는 위반을 못 잡으므로 이 테스트가 유일한 방어다** (C1, SC-003)
- [ ] T020 [P] [US3] 같은 파일(`__tests__/vision/photo-vision-always.test.ts`)에 C7 계약 테스트를 추가한다 — `src/`에 `vision-setting.json` 문자열이 없고, 그 파일을 **지우는 코드도 없다**(`delete`·`remove` 호출 없음) (C7, FR-007)

### Implementation for User Story 3

- [ ] T021 [P] [US3] `src/app/vision-setting-store.ts`를 **삭제**한다 (E8, FR-007)
- [ ] T022 [P] [US3] `src/ui/VisionPicker.tsx`를 **삭제**한다 (E8, FR-005)
- [ ] T023 [US3] `App.tsx`에서 사진 보기 설정을 걷어낸다 — import(64-68·90행), 일기 탭 state·로드(1017·1019·1027·1039·1052·1156·1159행), 설정 탭 state·로드·콜백(1548·1552·1560·1566·1572·1584-1589행), 「사진 보기」 섹션 렌더(1712-1714행). **`visionState`/`prepareVision` 등 모델 준비 관리(1414-1484행)는 건드리지 않는다** (FR-008)
- [ ] T024 [US3] `src/app/resolve-generation.ts`에서 `ResolveInput.visionPreference`와 R5의 `auto` 삼항을 제거하고, `ResolvedParams.vision`을 `hasPhotos: boolean`으로 교체한다. **`photoSignalPresent`는 입력으로 남는다** (E4·E5, FR-012a, C6)
- [ ] T025 [US3] `App.tsx`의 `resolveWrite` 클로저에서 `visionPreference` 전달을 제거한다 (T024의 `tsc`가 짚는 자리)

**Checkpoint**: 설정이 사라졌고 판정이 설정을 보지 않는다

---

## Phase 6: 018 두 갈래 — ★ 조용한 실패 지점 (P1 수준의 위험)

**Goal**: 「사진 없는 날」·「사진 있는 날」 준비 갈래가 **각자 자기 갈래로만** 간다

> **이 단계를 건너뛰면 오류 없이 느려지거나 018 E1(엔진 하나만 열림)이 깨진다.**
> `tsc`·lint·실기기 육안 어느 것도 못 잡는다 (C5). AGENTS.md가 반복 경고한
> 계열(011 `has_media=0`, 013 URI 계약, 020 헤드리스 `defineTask`, 033 worklets).

### Tests ⚠️

- [ ] T026 [US1] (SC-007) `__tests__/ui/diary-home.test.tsx`의 018 블록(920·938행)을 **`hasPhotos` 기준으로 재작성**한다 — 이름부터 `vision: none`/`quick/detailed`에 묶여 있어 그대로 못 쓴다. 세 케이스: `hasPhotos:false` → `prepare` 1회·`captionDay` 0회 / `hasPhotos:true` → `captionDay` 먼저, 풀린 **뒤** `prepare` / 캡션 도중 「쓰기」 → 기존 `Promise` 재사용 (C5)
- [ ] T027 [US1] `__tests__/ui/diary-home.test.tsx:522`의 `it.each(["none","quick","detailed"])`("resolve가 정한 vision이 pipeline.run까지 도달한다")를 **`hasPhotos`가 018 갈래를 가르는지**로 바꾼다. `:543`의 "홈에 사진 설정 선택기가 없다"는 **강화되므로 유지**한다
- [ ] T028 [P] [US1] `__tests__/vision/photo-vision-always.test.ts`(T019와 같은 신규 파일)에 C6 계약 테스트를 추가한다 — `DiaryHomeScreenProps` 선언에 `photoSignalPresent` 같은 신호 prop이 **없음**을 소스에서 확인("두 개의 진실" 금지, FR-012a)

### Implementation

- [ ] T029 [US1] `src/ui/DiaryHomeScreen.tsx:230`과 `:252`의 판별자를 `outcome.params.vision === "none"` → `outcome.params.hasPhotos`로 바꾼다. `captionDay` 호출(257행)에서 `vision` 인자를 정리한다 (FR-011·FR-012)

**Checkpoint**: 두 갈래가 살아 있고 계약이 그것을 잠근다

---

## Phase 7: 나머지 `tsc` 자리와 테스트 정리

**Purpose**: T005의 목록에서 아직 안 닫힌 자리

- [ ] T030 [P] `src/diary/request.ts`·`src/diary/pipeline.ts`·`src/inference/select.ts`·`src/app/wiring.ts`의 `vision: VisionSetting` 시그니처를 확인한다 — **타입만 좁아지고 구조는 그대로일 것**이다(E6). `DiaryRequest.vision` 필드는 **남긴다**
- [ ] T031 [P] `__tests__/vision/types.test.ts`를 고친다 — `VisionOutcome` 갈래 수 6→5(`"skipped"` 제거), `VisionDepth` 블록의 주장을 「`quick` 하나뿐이며 `none`이 아니다」로 **반전**한다. **테스트를 지우지 않는다** — 지우면 "깊이가 `none`인 캡션은 뜻이 없다"는 011의 판단이 함께 사라진다 (C2·C8)
- [ ] T032 [P] `__tests__/vision/engine.test.ts`를 고친다 — 127행 「깊이에 따라 다른 값을 넘긴다」는 **성립 불가**(비교 대상이 없다)이므로 「언제나 256을 넘긴다」로 바꾼다. 141행 「두 번 열면 앞의 것을 먼저 닫는다」는 **깊이와 무관한 E1 계약**이므로 `load("quick")` 두 번으로 바꿔 **살린다**
- [ ] T033 [P] `__tests__/inference/generate.test.ts`의 「시각 설정을 조용히 낮추지 않는다」 블록(104-141행, **005 스펙의 FR-022** — 042의 FR이 아니다)을 재구성한다 — `it.each(["quick","detailed"])`가 `"quick"` 하나로, `"none"이면 생성이 진행된다` 케이스는 **그 설정이 없으므로 제거**한다. 「막힌 요청은 모델을 열지도 않는다」는 `"quick"`으로 살린다
- [ ] T034 [P] `__tests__/app/resolve-generation.test.ts`를 고친다 — `visionPreference` 입력과 R5 케이스(107-124행)를 `hasPhotos` 기준으로 바꾼다 (C6)
- [ ] T035 [P] `__tests__/inference/on-device.test.ts`의 `vision: "none"` 픽스처들(201·302·365·433·453행)을 `"quick"`으로 바꾼다 — **전부 `signalsWithPhotos([])`/`emptyDay`와 짝이라 의미가 안 바뀐다**(사진이 0장이라 캡션이 안 도는 것은 그대로)
- [ ] T036 [P] `__tests__/diary/request.test.ts`·`__tests__/diary/pipeline.test.ts`·`__tests__/diary/pipeline.lock.test.ts`·`__tests__/ui/writing-monologue-typewriter.test.tsx`의 `"none"`·`VISION_SETTINGS` 사용을 좁아진 타입에 맞춘다
- [ ] T037 [P] `__tests__/app/vision-setting-store.test.ts`를 **삭제**한다 (대상 파일이 없다)
- [ ] T038 [P] `__tests__/ui/vision-picker.test.tsx`를 **삭제**한다 (대상 파일이 없다)
- [ ] T039 `__tests__/vision/select.test.ts:373`의 `not.toMatch(/depth|quick|detailed|VisionDepth/)`가 여전히 성립하는지 확인한다 (`select.ts`가 깊이를 모른다는 기존 경계)

**Checkpoint**: `npx tsc --noEmit` 0 오류, `npm test` 전부 통과

---

## Phase 8: Maestro

- [ ] T040 `.maestro/photo-vision.yml`을 재작성한다 — `vision-auto/none/quick/detailed` 선택 assert와 「그날 사진이 있으면」·「무엇이 담겼는지」·「오래 걸린다」 문구 assert, 마지막 「자동으로 되돌리기」 블록을 **전부 제거**하고, 설정 탭에 그 넷이 **없음**(`assertNotVisible`)으로 바꾼다. **M4(`vision-row` 준비 상태 + 모델명·크기 미노출)는 그대로 유지**한다 (FR-008, 명확화 Q3)
- [ ] T041 `scripts/run-device-tests.mjs`의 `FLOWS`에 `.maestro/photo-vision.yml` 등록이 **유지**되는지 확인하고, 주석을 042 내용으로 갱신한다 (등록이 빠지면 초록불인데 아무것도 검증 안 된다)

---

## Phase 9: 위반 주입 — 방어가 실제로 잡는가

**각각 고친 뒤 되돌린다.** 잡히지 않으면 그 계약은 없는 것이다 (quickstart §2).

- [ ] T042 [P] V1: `VisionSetting`에 `"none"` 되살리기 → C1이 잡아야 한다 (**`tsc`는 못 잡는다** — 유니온을 넓히는 것은 타입 오류가 아니다)
- [ ] T043 [P] V2: `IMAGE_TOKENS`에 `detailed: 1024` 더하기 → `tsc` 잉여 속성
- [ ] T044 [P] V3: `task.ts`에 `vision = "none"` 분기 되살리기 → C3
- [ ] T045 [P] V4: 018 두 `useEffect` 조건을 같게 만들기 → C5 세 케이스 (**가장 중요한 주입**, SC-007)
- [ ] T046 [P] V5: 화면에 `photoSignalPresent` prop 더하기 → C6
- [ ] T047 [P] V6: `VisionOutcome`에 `skipped` 되살리기 → C8
- [ ] T048 [P] V7: 옛 설정 파일 정리 코드 넣기 → C7

---

## Phase 10: 실기기 — dev(debug) 1회

**전제**: SM-S901N / dev debug / 모델 `a1`·`v1`·`v2` 배치됨 / `run-as` 가능.
**T002의 보존 조건을 지킨다.**

- [ ] T049 `adb shell dumpsys trust | grep deviceLocked`(0), `adb reverse tcp:8081 tcp:8081`, `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`로 준비한다
- [ ] T050 D1 — 설정 탭을 끝까지 훑어 「사진 보기」 섹션과 네 선택지가 **없음**을 확인한다. 사진 모델 준비 상태는 **있고** 모델명·크기가 없음을 함께 본다 (FR-005·FR-008, SC-004)
- [ ] T051 D2 ★ — 사진 있는 하루를 **설정 조작 없이** 쓴다. `adb logcat | grep -iE "has_media"`에서 `has_media=1`, 일기에 사진 분석 소요 시간, 본문이 사진 내용 반영 (FR-001, SC-001)
- [ ] T052 D3 — 사진 0장인 하루를 쓴다. `has_media` 로그 **없음**, VLM 로드 없음, 소요 시간에 사진 항목 없음, 본문이 사진을 단정하지 않음 (FR-002, SC-002)
- [ ] T053 D4 — 사진 권한을 회수한 상태로 쓴다(`pm revoke READ_MEDIA_IMAGES`). 「사진 없음」과 **다른 문구**인지 D3과 견준다. **확인 후 `pm grant`로 되돌린다** (FR-003, SC-005). ⚠️ `pm revoke`는 앱 프로세스를 즉시 kill한다(024 실측)
- [ ] T054 D5 ★★ — 백그라운드 자동 생성이 사진을 보는지 확인한다(개발자 탭 「지금 자동 생성 트리거」 또는 `cmd jobscheduler run -f`). `has_media=1`. **지금은 이 경로가 사진을 한 장도 안 본다** — 이 기능의 실질을 보는 자리다 (FR-004, SC-001)
- [ ] T055 D6 — 개발자 탭 「지금 생성」으로 사진 있는 하루를 쓴다. `has_media=1`. **지금은 이 버튼도 사진을 안 본다** (FR-004a)
- [ ] T056 D7 — 이전 버전에 쓴 일기 몇 개를 연다. 전부 정상, 사진 슬라이더·갤러리(025) 회귀 없음 (FR-013, SC-006)
- [ ] T057 `node scripts/run-device-tests.mjs`로 `photo-vision.yml`(재작성분)·`generate-diary.yml`·`diary-photo-gallery.yml` PASS를 확인한다. **`unified-permission-onboarding.yml`은 제외**(T002)

---

## Phase 11: 마무리

- [ ] T058 `npm run lint && npm test` 최종 확인 — `tsc` 0, eslint 0 error, 헌법 검사 위반 0, prettier 클린
- [ ] T059 [P] `specs/042-photo-vision-always/`에 실측을 적는다 — D2·D5·D6의 `has_media` 관측과 소요 시간. **256과 1024의 차이는 재지 않았음을 명시**한다(원칙 V)
- [ ] T060 [P] `AGENTS.md`에 042 절을 더한다 — 백그라운드가 사진을 안 보고 있었다는 사실, `skipped` 갈래가 죽은 코드였다는 사실, `tsc`가 유니온 확장을 못 잡는다는 것
- [ ] T061 [P] `docs/roadmap/README.md`의 25번을 완료로 표시하고 결과를 적는다

---

## Dependencies & Execution Order

### Phase Dependencies

- **T001·T002(시작 전)** → 무조건 먼저
- **Phase 1(Setup)** → 기준선
- **Phase 2(Foundational)** → **T004가 모든 것의 시작**. T005의 `tsc` 출력이 이후 범위를 정한다. T006·T007·T008은 T004와 독립이라 병렬 가능하나 T009는 T004 이후
- **Phase 3~5(US1·US2·US3)** → Phase 2 완료 후. **서로 독립적으로 진행 가능**
- **Phase 6(018 갈래)** → **T024(hasPhotos 신설) 이후여야 한다** — 판별자가 있어야 쓴다
- **Phase 7** → Phase 3~6이 끝나야 `tsc`가 조용해진다
- **Phase 8~9** → Phase 7 이후
- **Phase 10(실기기)** → Phase 9까지 전부 통과 후
- **Phase 11** → 마지막

### 결정적 경로 (critical path)

```
T004 → T005 → T024 → T029 → T026/T027 → T030~T039 → T042~T048 → T054 → T058
        (타입)   (판정)  (화면)   (계약)      (정리)       (주입)      (실기기)
```

**T024 → T029가 좁은 목이다** — `hasPhotos`가 없으면 018 갈래를 못 고친다.

### User Story Dependencies

- **US1(P1)**: Phase 2 후 시작. Phase 6이 US1의 연장이다(018 갈래도 "반드시 본다"의 일부)
- **US2(P1)**: Phase 2 후 시작. **US1과 독립** — 유지 확인이 주된 일이라 US1 없이도 검증된다
- **US3(P2)**: Phase 2 후 시작. T024가 US1/Phase 6의 선행이므로 **US3을 너무 늦추지 않는다**

### Parallel Opportunities

- **Phase 2**: T006·T007·T008 동시 (다른 파일)
- **Phase 3**: T010·T011 동시 / T013·T014 동시
- **Phase 5**: T019·T020 동시 / T021·T022 동시
- **Phase 7**: T030~T039 **대부분 동시** (전부 다른 파일) — 이 단계가 가장 병렬적이다
- **Phase 9**: T042~T048 동시 (각각 독립 주입, 단 **하나씩 넣고 되돌린다**)
- **Phase 11**: T059·T060·T061 동시

### Parallel Example: Phase 7

```
T031(vision/types.test) · T032(engine.test) · T033(generate.test) ·
T034(resolve-generation.test) · T035(on-device.test) · T036(4개 파일) ·
T037(삭제) · T038(삭제)   ← 전부 동시 가능
```

---

## Implementation Strategy

### MVP (최소 전달 단위)

**Phase 2 + Phase 3(US1) + Phase 6.** 이것만으로 헌법 MUST의 본체가 성립한다 —
사진이 있으면 네 경로 전부가 본다. 설정이 화면에 남아 있어도 **`VisionSetting`이
이미 하나라 고를 것이 없다.**

### 증분 전달

1. **Phase 2~3**: 사진이 있으면 반드시 본다 (핵심)
2. **Phase 6**: 018 갈래가 안 죽는다 (조용한 실패 방지)
3. **Phase 4**: 볼 것 없으면 안 연다 (유지 확인)
4. **Phase 5**: 설정이 화면에서 사라진다 (사용자가 보는 변화)
5. **Phase 7~9**: 정리와 방어 확인
6. **Phase 10**: 실기기 — **건너뛴 실기기 테스트는 통과가 아니다**(원칙 V)

### 이 기능에서 가장 위험한 것

| 위험 | 왜 | 방어 |
|---|---|---|
| 018 두 갈래 붕괴 | `tsc`가 침묵한다 | T026·T027·T045 |
| 유니온을 다시 넓힘 | `tsc`가 구조적으로 못 잡는다 | T019·T042 |
| 백그라운드를 빠뜨림 | 화면만 고치면 자동 일기는 그대로 안 본다 | T012·T054 |
| 진단 경로를 빠뜨림 | 검증이 제품을 재현하지 못한다 | T013·T055 |
