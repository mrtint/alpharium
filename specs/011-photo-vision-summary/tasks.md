---
description: "Task list for 011-photo-vision-summary"
---

# Tasks: 사진의 내용을 보고 일기의 재료로 준다

**Input**: Design documents from `/specs/011-photo-vision-summary/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: **필수다.** 헌법 「개발 방식」이 「계약을 먼저 정하고 테스트를 먼저 쓴다(MUST)」를
못 박았다. 각 이야기에서 **테스트를 먼저 쓰고 빨간불을 본 뒤** 구현한다.

**Organization**: 이야기별로 묶어 각각을 독립적으로 구현·검증할 수 있게 한다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능 (다른 파일, 끝나지 않은 작업에 기대지 않음)
- **[Story]**: 어느 사용자 이야기인가 (US1~US5)

---

## ⚠️ 이 기능에서 가장 조심할 것

이 저장소에서 반복된 실패는 **오류 없이 아무 일도 일어나지 않는 것**이었다:
006의 `GenerationProbe`(파이프라인 건너뜀), 007의 끊긴 `stop` 배선, 008의 버려진
반환값, 009의 `day:` 한 줄.

**시각 처리의 같은 실패는 「캡션이 프롬프트에 안 들어갔는데 일기는 멀쩡히 나오는 것」이다.**

그래서 **T031이 이 기능의 배선 검증**이고, **T063(D2)이 실기기에서 그것을 확인한다.**
「일기가 나왔다」로 통과시키지 않는다.

---

## Phase 1: Setup

**Purpose**: 새 자리를 열고 헌법 검사를 먼저 세운다

- [X] T001 `src/vision/` 폴더를 만들고 `src/vision/types.ts`에 `PhotoCaption`·`PhotoVision`·`VisionOutcome`·`VisionDepth` 선언 (data-model.md 「새 타입」). **`confidence`·`elapsedMs`·토큰 필드를 두지 않는다**(FR-032, 원칙 IV)
- [X] T002 [P] `__tests__/vision/types.test.ts`에 **선언을 `readFileSync`로 직접 읽어** `PhotoCaption`·`PhotoVision`에 시간·토큰·확신도 필드가 없음을 검사 (contracts/vision-engine.md V1). **007이 배운 것 — 타입 방어는 `tsc`에만 있으면 `npm test`가 놓친다**
- [X] T003 [P] `scripts/constitution-rules.ts`에 규칙 추가: `src/vision/`이 `diary/store`·`DiaryEntry`에 닿지 않는다 (plan.md 「헌법 검사에 규칙을 더한다」). **주석을 걷어내고 검사한다**(008이 배운 것 — 설명이 위반으로 잡히면 아무도 설명을 안 쓴다)
- [X] T004 [P] `scripts/constitution-rules.ts`에 규칙 추가: `src/vision/`이 `inference/sampling`을 import 하지 않는다 (research.md §7, contracts/vision-engine.md V7). **원칙 I이 조용히 깨지는 경로다**
- [X] T005 [P] `__tests__/scripts/constitution-rules.test.ts`에 T003·T004 규칙의 검사 추가 — **위반을 실제로 주입해 걸리는 것을 확인한다**

**Checkpoint**: 타입과 그물이 섰다. 아직 아무것도 동작하지 않는다

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: 이 단계가 끝나기 전에는 어느 이야기도 시작할 수 없다

**Purpose**: 사진 보는 모델의 출처와 준비 상태 — US1·US4·US5가 전부 여기 기댄다

- [X] T006 `src/vision/roster.ts`에 `VisionAsset`·`VisionAssets` 선언과 LFM2.5-VL 450M의 본체·mmproj URL·`expectedBytes` (research.md §6). **`md5`는 빈 문자열로 둔다** — 첫 내려받기에서 채록한다(FR-031, 원칙 V). **⚠️ mmproj는 `450m` 소문자다 — 대문자는 404**
- [X] T007 [P] `__tests__/vision/roster.test.ts`: URL 둘이 다르고, `md5`가 비어 있는 것이 **의도된 상태임을 드러내는** 테스트 (003의 R3과 같은 구조). **통과시키려고 그럴듯한 지문을 넣지 않는다**
- [X] T008 [P] `__tests__/vision/roster.test.ts`에 `src/vision/roster.ts`가 `models/roster`를 import 하지 않음을 검사 (data-model.md, 원칙 III). **합치면 「캐릭터가 사진을 본다」는 잘못된 모양이 코드에 생긴다**
- [~] T009 **US5로 미뤘다** (2026-08-22, 사용자 결정). `DownloadProgress`를 `DownloadTarget`으로 넓히는 것 — 아래 「⚠️ 미룬 까닭」 참조
- [~] T010 **US5로 미뤘다** — `DownloadRejection`·`DownloadView`의 `DownloadTarget` 전환
- [~] T011 **US5로 미뤘다** — 008의 기존 검사 조정
- [X] T012 `src/vision/readiness.ts`에 본체·mmproj 두 준비 상태를 `ModelReadiness` 하나로 접는 순수 함수 (data-model.md 「준비 상태를 둘에서 하나로 접는 규칙」)
- [X] T013 [P] `__tests__/vision/readiness.test.ts`: 접기 규칙 표의 다섯 줄을 전부 검사. **하나라도 없으면 `ready`가 아니다**(FR-027, SC-009)

### ⚠️ T009~T011을 미룬 까닭 (2026-08-22)

**구현 중에 드러난 것**: `DownloadPort`(`src/models/port.ts:107`)가 **이미 캐릭터를
모른다** — `start(key, url, onProgress)`로 자산키와 주소만 받는다. 캐릭터 모양은
`Acquisition`의 busy 슬롯(`running: Character`)과 `assetFor()`에만 있다.

그래서 **사진 보는 모델은 008의 타입을 건드리지 않고도 기기에 닿는 machinery를 전부
재사용할 수 있다.** `src/vision/acquisition.ts`가 `DownloadPort`를 직접 쓴다.

**미루는 것이 옳은 까닭**: US1(사진을 본 일기)이 아직 서지 않았는데 008의 계약·화면·
테스트 29개를 흔드는 것은 **이 저장소가 반복해 실패한 「한 축 파고들기」**다. US5에서
사진 모델 받는 화면을 실제로 만들 때, 무엇이 진짜 필요한지 알고 고친다.

**대가를 적어 둔다**(원칙 V): 지금은 **사진 모델과 캐릭터를 동시에 받을 수 있다** —
008의 「한 번에 하나」가 이 쌍에는 적용되지 않는다. US5가 이것을 다룬다.

**Checkpoint**: 사진 보는 모델을 가리킬 수 있고 준비 상태를 말할 수 있다

---

## Phase 3: User Story 1 — 사진을 본 일기를 읽는다 (P1) 🎯 MVP

**Goal**: 휴대폰이 사진을 읽어 그 내용이 일기의 재료가 된다. **005 이후 처음으로 눈을 뜬다**

**Independent Test**: 010의 도구로 사진 있는 하루를 심고, 「빠르게 봄」과 「보지 않음」으로
각각 생성해 **견준다**. 둘이 사실상 같으면 실패다

### 고르기 (순수 함수)

- [X] T014 [P] [US1] `__tests__/vision/select.test.ts`에 contracts/selection.md의 R1~R6과 예시 표 다섯 줄을 **먼저** 검사로 쓴다 (빨간불 확인)
- [X] T015 [P] [US1] `__tests__/vision/select.test.ts`에 **선언을 `readFileSync`로 읽어** 둘째 인자와 `VISION_PHOTO_LIMIT` export가 없음을 검사 (contracts/selection.md S1). **009가 배운 것 — `Function.length`는 기본값 인자를 세지 않는다**
- [X] T016 [US1] `src/vision/select.ts`에 `selectForVision(photos)` 구현 — 균등 분위, 양 끝 포함, 시각 순 유지, 결정적 (contracts/selection.md)

### 엔진 계약 (기기에 닿는 자리)

- [X] T017 [P] [US1] `src/vision/vision-port.ts`에 `VisionEngine`·`VisionRunResult`·`VisionLoadResult` 선언 (contracts/vision-engine.md). **`VisionRunResult`의 자리가 `text` 하나뿐이다**
- [X] T018 [P] [US1] `src/vision/sampling.ts`에 `CAPTION_SAMPLING` (`temperature` 0.1 — 옆 저장소 실측, `n_predict` 64 — 짐작). **`inference/sampling.ts`를 재사용하지 않는 까닭을 주석으로 남긴다**(research.md §7)
- [X] T019 [US1] `__tests__/vision/engine.test.ts`에 대역 엔진으로 V1~V6을 **먼저** 검사로 쓴다 — 특히 **V6(`timings`를 주어도 새지 않는다)**와 **V3(`unload()`가 예외에서도 불린다)**
- [X] T020 [US1] `src/vision/vision-port.ts`에 `createLlamaVisionEngine(loader)` 구현 — `initLlama` → `initMultimodal(mmproj)` → `completion({ media_paths: [경로], jinja: true })` → `releaseMultimodal` → `release` (research.md §1). **`text`/`content`만 꺼내고 나머지를 버린다**
- [X] T021 [US1] `src/vision/vision-port.ts`에 `getMultimodalSupport()`로 `no-vision-support` 판정 — **짐작하지 않고 물어본다**(contracts/vision-engine.md V2, 원칙 V)

### 캡션 모으기

- [X] T022 [P] [US1] `__tests__/vision/caption.test.ts`에 E4(한 장 실패가 나머지를 안 무너뜨림)·E5(끊기면 버림)와 `available`/`considered`/`captions.length` 세 수의 표를 **먼저** 검사로 쓴다
- [X] T023 [US1] `src/vision/caption.ts`에 `captionAll(engine, photos, available)` 구현 — 한 장씩 돌고, 빈 결과는 `captions`에 안 넣되 `considered`는 센다 (FR-001a·005a·006)

### 프롬프트 (원칙 II의 통과 지점)

- [X] T024 [P] [US1] `__tests__/diary/prompt.test.ts`에 contracts/prompt.md의 P-1~P-9를 **먼저** 검사로 쓴다. **P-1(`vision` 없으면 005와 바이트 단위로 같다)이 SC-002의 방어다**
- [X] T025 [US1] `src/diary/prompt.ts`의 `buildPrompt(request, vision?)`에 캡션 줄 추가 — `- 08시: …` 꼴로 시각과 함께 (contracts/prompt.md P2, FR-007b). **「~것 같다」·「틀릴 수 있다」를 붙이지 않는다**(FR-011)
- [X] T026 [US1] `src/diary/prompt.ts`에 P3의 한계 줄 넷 추가 — 범위에 대한 것만이며 정확도가 아니다 (FR-012)
- [X] T027 [US1] `src/diary/prompt.ts`의 `instructionLines(request, vision?)`에 **한계 줄만** 넣고 **캡션 본문은 넣지 않는다** (contracts/prompt.md P5). **⚠️ 넣으면 성공한 일기가 되뱉기로 거부된다**

### 파이프라인 배선 — ★ 이 기능의 조용한 실패 지점

- [X] T028 [US1] `src/diary/pipeline.ts`의 `PipelineStage`에 `"vision"` 추가 (data-model.md). **`model-not-ready` 뒤, `generation` 앞이다**
- [X] T029 [US1] `src/diary/pipeline.ts`의 `PipelineDeps`에 `readPhotos?` 추가 — 옵셔널이므로 **002~010의 기존 테스트가 그대로 통과한다**(003의 `isModelReady?`와 같은 방식)
- [X] T030 [US1] `src/inference/on-device.ts`의 `if (request.vision !== "none") return { kind: "not-implemented" }`를 실제 동작으로 교체 — **VLM을 완전히 닫은 뒤 캐릭터 모델을 연다**(research.md §2, E1). `unload()`를 `finally`에 둔다
- [X] T031 [US1] ★ `__tests__/diary/pipeline.test.ts`에 **대역이 받은 프롬프트를 직접 읽어** 캡션 문자열이 들어 있는지 검사 — 009의 W-T1과 같은 구조. **이것이 「캡션이 안 닿았는데 일기는 나오는」 실패를 잡는 유일한 그물이다**
- [X] T032 [US1] `__tests__/inference/engine.test.ts`에 **두 엔진이 동시에 열리지 않음**을 검사 (contracts/vision-engine.md V2) — 대역이 열림/닫힘을 기록하고 캐릭터 `load` 시점에 VLM이 닫혀 있는지 본다

**Checkpoint**: 「빠르게 봄」으로 사진을 본 일기가 기기 없이 검증된다 — **MVP가 선다**

---

## Phase 4: User Story 2 — 사진 설정 셋을 고른다 (P1)

**Goal**: 사용자가 「보지 않음 / 빠르게 봄 / 자세히 봄」을 고르고 그것이 남는다

**Independent Test**: 셋을 고를 수 있고, 앱을 완전히 종료했다 다시 열어도 남아 있다

**⚠️ US1과 함께 P1인 까닭**: `VisionSetting`은 002부터 타입이 있었으나 **사용자가 고를
자리가 한 번도 없었다** — 지금까지 언제나 `none`이 하드코딩돼 있다. US1을 실기기에서
검증하려면 이 자리가 필요하다

- [X] T033 [P] [US2] `__tests__/app/vision-setting-store.test.ts`를 **먼저** 쓴다 — 저장·조회·고른 적 없음의 기본값(FR-018)
- [X] T034 [US2] `src/app/vision-setting-store.ts`에 `files/preferences/vision-setting.json` 읽기·쓰기 (007의 `selection-store.ts`와 같은 방식, `expo-file-system`). **새 의존 0개**
- [X] T035 [P] [US2] `__tests__/ui/vision-setting.test.tsx`를 **먼저** 쓴다 — 셋이 보이고, 고른 표시가 붙고, **모델 정보가 하나도 없다**(FR-016, SC-004)
- [X] T036 [US2] `src/ui/DiaryHomeScreen.tsx`에 사진 설정 고르는 자리 추가 — 「보지 않음/빠르게 봄/자세히 봄」과 **결과의 차이로 쓴 설명**(FR-019a)
- [X] T037 [US2] `src/ui/DiaryHomeScreen.tsx`에 「자세히 봄」이 더 오래 걸린다는 고지 (FR-020). **초·백분율·속도를 쓰지 않는다**(원칙 IV) — 헌법 원칙 III의 「기다림은 그 순간에 알린다」
- [X] T038 [US2] `App.tsx`에서 고른 설정을 파이프라인까지 잇는다 — **⚠️ 007의 `stop`, 008의 반환값, 009의 `day:`가 끊겼던 자리와 같은 종류**. 잇지 않으면 화면에서 골라도 언제나 `none`이 쓰인다
- [X] T039 [P] [US2] `__tests__/app/wiring.test.ts`에 고른 설정이 `PipelineInput.vision`까지 도달하는지 검사 — **T038이 조용히 빠지는 것을 막는다**

**Checkpoint**: 사용자가 사진 설정을 고를 수 있다 — **US1의 실기기 검증이 가능해진다**

---

## Phase 5: User Story 4 — 사진을 볼 수 없으면 그렇다고 말한다 (P2)

**Goal**: 준비되지 않았으면 **가짜 일기를 대신 주지 않고** 무엇이 필요한지 말한다

**Independent Test**: 사진 보는 모델이 없는 상태에서 「빠르게 봄」으로 시도하고, 일기가
나오지 않으며 빠져나갈 길이 제시되는지 확인

**⚠️ US5보다 먼저다**: US5(받기)가 없어도 「없을 때 어떻게 하는가」는 검증할 수 있고,
**그것이 원칙 I의 방어선이다**

- [X] T040 [P] [US4] `__tests__/diary/pipeline.test.ts`에 `vision` 단계 실패가 **`none`으로 낮추지 않음**을 **먼저** 검사로 쓴다 (FR-021, SC-005). **005 FR-022의 판단을 잇는다**
- [X] T041 [US4] `src/diary/pipeline.ts`에서 `vision` 단계 실패를 `stop("vision", …)`으로 돌려준다 — **`generation`으로 뭉개지 않는다**(사용자가 할 일이 다르다)
- [X] T042 [P] [US4] `__tests__/ui/diary-home.test.tsx`에 `vision` 실패의 안내와 **빠져나갈 길**(준비하러 가기)을 검사 (FR-022)
- [X] T043 [US4] `src/ui/DiaryHomeScreen.tsx`에 `vision` 실패 안내 — **모델 정보를 담지 않는다**(FR-023, 원칙 III). 003 FR-028·007의 「캐릭터 준비하러 가기」와 같은 구조
- [X] T044 [US4] `src/ui/DiaryHomeScreen.tsx`에 **일기를 쓰기 전에** 준비 여부를 알린다 (FR-024). **10초를 기다린 뒤 실패를 알리지 않는다**

**Checkpoint**: 준비되지 않았을 때 가짜 일기가 나오지 않는다

---

## Phase 6: User Story 5 — 사진을 보는 모델을 준비한다 (P2)

**Goal**: 사진 보는 모델을 **한 번** 받으면 다섯 캐릭터 어느 것으로도 사진을 본다

**Independent Test**: 지운 뒤 다시 받고, 사진을 본 일기가 나오는지 확인

- [X] T045 [P] [US5] `__tests__/vision/acquisition.test.ts`를 **먼저** 쓴다 — 두 파일을 받고, 하나만 받히면 `partial`이며, 지우면 둘 다 사라진다(FR-027·028)
- [X] T046 [US5] `src/vision/acquisition.ts`에 003의 `expoDownloadPort`·검증·삭제를 재사용해 본체·mmproj 두 파일을 다룬다. **003의 `acquisition.ts`를 고치지 않는다** — 그 테스트가 두껍다(008이 같은 판단을 했다)
- [X] T047 [P] [US5] `__tests__/ui/character-list.test.tsx`에 사진 보는 모델 줄이 **하나의 준비 상태**로 보이고 **파일이 둘인 것이 드러나지 않음**을 검사 (FR-026, SC-008)
- [X] T048 [US5] `src/ui/CharacterListScreen.tsx`에 사진 보는 모델 준비 자리 추가 — **「사진을 보는 데 필요한 것」으로만 보인다**(FR-031a). 모델명·파일명·크기가 없다
- [X] T049 [US5] 저장 공간 표시에 사진 보는 모델을 합산 (FR-029). **파일별로 쪼개지 않는다**
- [X] T050 [P] [US5] `__tests__/vision/acquisition.test.ts`에 **첫 내려받기에서 md5를 채록하는 경로** 검사 (FR-031, 003 contracts/readiness.md 「기준값이 아직 없을 때」)

**Checkpoint**: 사진 보는 모델을 받고 지울 수 있다 — **실기기 검증의 전제가 갖춰진다**

---

## Phase 7: User Story 3 — 「빠르게 봄」과 「자세히 봄」이 다르다 (P2)

**Goal**: 둘이 **같은 수의 사진을 보되** 각 사진에서 얻는 세밀함이 다르다

**Independent Test**: 같은 하루·같은 캐릭터로 두 설정을 각각 돌려 견준다

**⚠️ 마지막인 까닭**: 값(256/1024)이 **짐작이며**(research.md §4), US1이 실기기에서
서야 조절할 자리가 생긴다

- [X] T051 [P] [US3] `__tests__/vision/engine.test.ts`에 `VisionDepth`가 `image_max_tokens`로 옮겨지는 것을 검사 — **그 수가 밖으로 나가지 않는 것**도 함께(원칙 III)
- [X] T052 [US3] `src/vision/vision-port.ts`의 `load(depth)`에서 `initMultimodal({ image_max_tokens })` 분기 — `quick` 256 / `detailed` 1024 (research.md §4). **짐작임을 주석에 남긴다**(원칙 V)
- [X] T053 [P] [US3] `__tests__/vision/select.test.ts`에 **두 깊이가 같은 수의 사진을 고름**을 검사 (FR-019, SC-015). **보는 수로 가르지 않는다**

**Checkpoint**: 세 설정이 서로 다르게 동작한다 — 기기 없는 검증 완료

---

## Phase 8: Polish & 실기기 검증

**⚠️ 건너뛴 실기기 테스트는 통과가 아니다**(헌법 원칙 V). 기기 없이 전부 초록불이어도
온디바이스는 검증되지 않은 상태다

### 자동 흐름

- [X] T054 [P] `.maestro/photo-vision.yml` 작성 — 사진 설정 고르기, 생성, **모델 정보 0건**, **진행 지표 0건**. **⚠️ 부분 문자열은 정규식으로 준다**(007이 배운 것). **`childOf`를 쓰지 않는다**(008 — RN은 접근성 트리가 평탄하다)
- [X] T055 `scripts/run-device-tests.mjs`의 `FLOWS`에 `.maestro/photo-vision.yml` 등록. **⚠️ 등록하지 않으면 파일이 있어도 돌지 않고, 그러면 초록불인데 아무것도 검증되지 않는다**

### 실기기 (quickstart.md)

**⚠️ 아래 아홉은 기기가 있어야 돈다.** 기기 없는 검증이 전부 초록불이어도
**온디바이스는 검증되지 않은 상태다**(헌법 원칙 V). **SC-016이 성공 기준에 올라
있으므로 이것 없이는 이 기능이 끝나지 않는다.**

- [ ] T056 D1: 사진 보는 모델을 받고 **5장이 몇 초인지 잰다**. **★ md5를 채록해 `src/vision/roster.ts`에 옮겨 적는다**(T006이 비워 둔 자리)
- [ ] T057 ★ D2: **같은 하루를 「보지 않음」과 「빠르게 봄」으로 각각 생성해 전문을 견준다** (SC-001). **둘이 사실상 같으면 실패다** — 「일기가 나왔다」로 통과시키지 않는다
- [ ] T058 ⚠️ D3: **VLM을 닫고 캐릭터 모델을 여는 것이 되는가** (research.md §2 — 미관측). **`narrative`(2.4B, 가장 큼)로 반드시 해 본다** — 죽으면 E1 순서를 다시 봐야 한다
- [ ] T059 [P] D4: 사진 0장 / 권한 없음 / 「보지 않음」 세 갈래 (FR-003, SC-002·006). **★ 권한을 되돌리는 것을 잊지 않는다**
- [ ] T060 ★ D5: **균일 선택을 눈으로 확인** — 8~12장을 아침부터 저녁까지 심고, 일기에 **아침 것과 저녁 것이 둘 다** 나오는지 (FR-007a, SC-007a). 전부 아침이면 004의 `slice`를 그대로 쓴 것이다
- [ ] T061 [P] D6: 「빠르게 봄」과 「자세히 봄」이 **다른가** (SC-015). **어느 쪽이 나은지 판정하지 않는다**(원칙 IV). 거의 같으면 값을 벌린다
- [ ] T062 ⚠️ D7: **캡션 언어를 확인한다** (research.md §7 — 미결). 영어가 섞이면 캡션을 한국어로 뽑을지 **여기서 실제로 보고 정한다**
- [ ] T063 [P] D8: 그만두기와 **화면에 백분율·초·「사진 3/5」·캡션 본문이 하나도 없음** (SC-012, FR-034)
- [ ] T064 release 빌드 검증 — **⚠️ `initMultimodal`의 JNI 심볼이 R8·ProGuard에서 사는가**(005가 `initLlama`에서 통과했으나 **멀티모달은 처음이다**). 서명 `CN=alpharium`, Metro 없이 뜨는가

### 기록

- [X] T065 `AGENTS.md`에 011 절 추가 — **실측과 짐작을 구분해** 적는다(원칙 V). quickstart.md 「검증 뒤에 남기는 것」의 표를 채운다. **「합성 하루에서의 관측」으로 구분한다**(010 FR-020)
- [X] T066 [P] 위반 주입 검증 — ① `VisionRunResult`에 `elapsedMs` ② 캡션을 `instructionLines()`에 넣기 ③ `selectForVision`을 `slice(0,5)`로 ④ `vision` 실패를 `none`으로 낮추기. **넷 다 걸리는지 확인한다**(008·010이 같은 절차를 밟았다)

---

## Dependencies

```
Phase 1 (Setup)
   ↓
Phase 2 (Foundational) ← ⚠️ 여기가 끝나야 어느 이야기도 시작된다
   ↓
Phase 3 (US1) 🎯 MVP ─────┐
   ↓                      │
Phase 4 (US2) ← US1의 실기기 검증에 필요
   ↓                      │
Phase 5 (US4) ←───────────┘ (US1의 실패 경로)
   ↓
Phase 6 (US5) ← 실기기 검증의 전제
   ↓
Phase 7 (US3) ← US1이 서야 조절할 자리가 생긴다
   ↓
Phase 8 (Polish + 실기기)
```

**이야기 사이의 실제 의존**:

| 이야기 | 무엇에 기대는가 | 왜 |
| --- | --- | --- |
| US1 | Phase 2 | 로스터·준비 상태가 있어야 모델을 연다 |
| US2 | 없음 (US1과 병렬 가능) | 설정 저장은 독립적이다 |
| US4 | US1의 파이프라인 단계 | `vision` 단계가 있어야 실패를 말한다 |
| US5 | Phase 2 | 준비 상태 접기가 있어야 화면에 그린다 |
| US3 | US1의 엔진 | `load(depth)`가 있어야 깊이를 준다 |

**⚠️ US2가 US1과 병렬 가능하지만 순서를 두는 까닭**: US1을 **실기기에서 검증하려면**
사진 설정을 고를 자리가 필요하다. 기기 없는 검증까지는 병렬로 가도 된다

---

## Parallel Execution Examples

### Phase 1 — 넷이 동시에

```
T002 (타입 테스트) ‖ T003 (헌법 규칙 A) ‖ T004 (헌법 규칙 B) ‖ T005 (규칙 테스트)
```

### Phase 3 (US1) — 테스트 먼저 병렬로

```
T014 (select 테스트) ‖ T017 (엔진 선언) ‖ T018 (샘플링) ‖ T022 (caption 테스트) ‖ T024 (prompt 테스트)
     ↓                      ↓
T016 (select 구현)     T019 → T020 → T021
                            ↓
                     T023 (caption 구현)
                            ↓
                  T025 → T026 → T027 (prompt)
                            ↓
                  T028 → T029 → T030 → T031 ★ → T032
```

### Phase 8 — 실기기는 대체로 순차 (같은 기기를 쓴다)

```
T054 ‖ T055 는 병렬
T056 → T057 ★ → T058 ⚠️ → T060 ★   (같은 기기, 순차)
T059 ‖ T061 ‖ T063 은 서로 독립
```

---

## Implementation Strategy

### MVP = Phase 1 + 2 + 3 (US1)

**T031까지 가면 「휴대폰이 눈을 떴다」가 기기 없이 검증된다.** 그것이 이 기능의 전부이며
나머지는 그 경로의 변주다.

**다만 실기기 확인에는 US2가 필요하다** — 사진 설정을 고를 자리가 없으면 `none`만 쓰인다.
그래서 **실질적 MVP는 Phase 4까지**다.

### 점진적 전달

| 단계 | 무엇이 되는가 |
| --- | --- |
| Phase 3 끝 | 캡션이 프롬프트에 닿는다 (기기 없이) |
| Phase 4 끝 | **실기기에서 사진을 본 일기를 볼 수 있다** ← 여기서 D2를 돌린다 |
| Phase 5 끝 | 준비 안 됐을 때 가짜 일기가 안 나온다 |
| Phase 6 끝 | 사용자가 모델을 받고 지울 수 있다 |
| Phase 7 끝 | 세 설정이 다르게 동작한다 |

### ⚠️ 먼저 하고 싶어지지만 미뤄야 하는 것

- **T061(깊이 비교)을 US1 전에** — 값이 짐작이라 조절할 근거가 없다
- **캡션을 화면에 보이기** — 005 FR-028b의 같은 위반이며 품질 비교의 시작점이다(원칙 IV)
- **캡션 저장** — 원칙 I이 금지한 「미리 만들어 둔 응답」으로 가는 길이다

---

## Task Summary

| Phase | 이야기 | 작업 수 |
| --- | --- | ---: |
| 1. Setup | — | 5 |
| 2. Foundational | — | 8 |
| 3. US1 (P1) 🎯 | 사진을 본 일기 | 19 |
| 4. US2 (P1) | 사진 설정 고르기 | 7 |
| 5. US4 (P2) | 볼 수 없으면 말한다 | 5 |
| 6. US5 (P2) | 모델 준비 | 6 |
| 7. US3 (P2) | 깊이의 차이 | 3 |
| 8. Polish + 실기기 | — | 13 |
| **합계** | | **66** |
