---
description: "Task list for 023 사진 선별 알고리즘 고도화"
---

# Tasks: 사진 선별 알고리즘 고도화 — 잡사진 거르기·시간 분포 선별·상한 확장

**Input**: `specs/023-photo-selection-algorithm/` (spec.md, plan.md, research.md,
data-model.md, contracts/, quickstart.md)

**Tests**: 필수. 이 저장소의 헌법 「개발 방식」이 "계약을 먼저 정하고 테스트를
먼저 쓴다"를 MUST로 못 박는다. 계약 테스트는 소스 선언을 `readFileSync`로
직접 읽는 패턴을 쓴다(011·009 관례).

**Organization**: spec.md의 세 User Story(P1·P1·P2)별로 phase를 나눈다. US1·US2는
`select.ts` 한 파일을 함께 건드리므로 완전 독립은 아니지만, 각각 독립적으로
테스트 가능한 증분이다(US1 = 분류·되돌림, US2 = 시간 분포 배분).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일, 미완 선행 없음 → 병렬 가능
- **[Story]**: US1 / US2 / US3
- 파일 경로를 설명에 포함

## Path Conventions

이 저장소는 확립된 단일 구조(AGENTS.md 「코드를 어디에 두는가」). `src/` ·
`__tests__/` · `scripts/` at repo root.

---

## Phase 1: Setup

**Purpose**: 착수 전 확인. 신규 디렉터리·의존 없음.

- [X] T001 `git branch --show-current`로 `023-photo-selection-algorithm` 확인
  (AGENTS.md — 스펙 디렉터리 이름과 체크아웃 브랜치는 다를 수 있다)
- [X] T002 `npm run test:logic` 기준선 통과 확인 (수정 전 초록불 기록)
- [X] T003 설치본 타입 확인: `expo-media-library`의 `AssetMetadata`(=
  `exeForMetadata()` 반환 요소)에 파일 경로/URI 필드가 있는지 확인해
  research.md §5 (a)/(b)를 확정하고 `data-model.md` §5에 기록

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `PhotoFacts`·`Photo` 계약 확장. US1·US2·US3 전부 이 필드에
의존한다.

**⚠️ CRITICAL**: 이 phase가 끝나기 전에는 어느 User Story도 시작할 수 없다.

- [X] T004 [P] `src/signals/port.ts`의 `PhotoFacts`에 `folderName?: string`
  추가 (data-model.md §1 주석 그대로 — "풀 수 없으면 undefined = 분류 불가")
- [X] T005 [P] `src/signals/types.ts`의 `Photo`에 `folderName?: string`
  추가 (data-model.md §2)
- [X] T006 `src/signals/collect.ts`의 `usablePhotos()`가 `PhotoFacts →
  Photo` 변환 시 `folderName`을 이월하도록 수정 (data-model.md §2)
- [X] T007 `__tests__/signals/collect.test.ts`에 회귀 테스트 추가:
  (a) 기존 케이스 전부 통과(SC-009 — `folderName` 없어도 004 판정 불변),
  (b) `folderName`이 있는 `PhotoFacts` 입력 → `Photo`에 그대로 실림
- [X] T008 `scripts/constitution-rules.ts`에 새 정규식 상수 2개 추가:
  `VISION_SCORES_IMAGE`(G1), `PORT_CLASSIFIES_PHOTO`(G2) — 문구는
  contracts/constitution-guard.md 그대로. 아직 `checkVisionFile()`/
  검사 함수에 배선하지 않는다(T009에서)
- [X] T009 `scripts/constitution-rules.ts`: `checkVisionFile()` 루프에
  `VISION_SCORES_IMAGE` 분기 추가, `expo-port.ts` 대상으로
  `PORT_CLASSIFIES_PHOTO` 검사(기존 `checkSourceFile` 골격 또는 새 함수 —
  constitution-guard.md G2)
- [X] T010 `__tests__/scripts/check-constitution.test.ts`에 위반 주입 3종
  (constitution-guard.md G3): (1) `select.ts`에 `getImageData(...)` →
  G1이 잡음, (2) `expo-port.ts`가 `NON_CAMERA_FOLDERS` import → G2가 잡음,
  (3) 정상 소스에서 새 규칙 0건. 실제로 어겨 보고 되돌린다

**Checkpoint**: `PhotoFacts`·`Photo`에 `folderName`이 있고, 헌법 검사가 새
경계를 강제한다. US1·US2·US3 착수 가능.

---

## Phase 3: User Story 1 - 잡사진 필터링 (Priority: P1) 🎯 MVP

**Goal**: 카메라로 찍지 않은 사진(스크린샷·다운로드·메신저 저장)을 선별
대상에서 걸러내되, 전부 걸러지면 원본으로 되돌린다.

**Independent Test**: 카메라 원본 3장 + 스크린샷 2장인 하루 → 고른 목록에
스크린샷 없음. 스크린샷만 4장인 하루 → 그 4장이 고름 대상에 들어옴.

### Tests for User Story 1 ⚠️ (먼저 쓰고 FAIL 확인)

- [X] T011 [P] [US1] `__tests__/signals/expo-port.test.ts`에 `folderNameOf()`
  순수 함수 테스트 (data-model.md §5, quickstart T5): `file://.../DCIM/
  Camera/x.jpg` → `"Camera"`, `.../Pictures/Screenshots/x.png` →
  `"Screenshots"`, `content://media/external/images/media/123` → `undefined`,
  `""`/`null`/슬래시 없음 → `undefined`
- [X] T012 [P] [US1] `__tests__/vision/select.test.ts`에 분류 계약 테스트
  (contracts/classification.md C1·C2·C3·C5, 「예시로 못 박기」 표 전부):
  Camera×4+Screenshots×3 → kept Camera 4장 / Screenshots×8 → 되돌림 8장 /
  undefined×10 → 10장 / 목록 밖 이름 `OpenCamera` → camera로 남음 /
  같은 입력 2회 → 동일(결정성)
- [X] T013 [P] [US1] `__tests__/vision/select.test.ts`에 시그니처·순수성
  계약 테스트 (contracts/classification.md 헌법 경계, 011 S1, FR-016·
  FR-022): 소스를 `readFileSync`로 읽어 (a) `selectForVision` 인자
  1개(둘째·기본값 인자 없음), (b) `NON_CAMERA_FOLDERS`·`BUCKET_COUNT`·
  `VISION_PHOTO_LIMIT` export 안 됨, (c) `select.ts`가 `../signals/expo-port`·
  `expo-*`·`react-native`·`fs`·`expo-file-system`·`expo-media-library`를
  import하지 않음(순수 — 기기·파일에 닿지 않는다, FR-022)

### Implementation for User Story 1

- [X] T014 [US1] `src/signals/expo-port.ts`에 `folderNameOf(pathOrUri)` 순수
  헬퍼 추가 (data-model.md §5) — `content://` prefix면 바로 `undefined`,
  `file://` 벗기고 마지막 `/` 앞 세그먼트. `NON_CAMERA_FOLDERS`를 모른다
- [X] T015 [US1] `src/signals/expo-port.ts`의 `photosBetween()`가 각 asset에
  `folderName: folderNameOf(...)`을 채우도록 수정. 경로 출처는 T003 결과에
  따라 (a) `AssetMetadata` 필드 또는 (b) asset별 `getUri()` 추가 호출
  (research §5). (b)면 병렬 호출, 비용은 quickstart D1에서 잼
- [X] T016 [US1] `src/vision/select.ts`에 `PhotoClass` 타입과
  `NON_CAMERA_FOLDERS` 상수(파일 로컬, export 안 함) 추가 — data-model.md
  §3.1·§3.2. 초기 목록은 research §3의 알려진 값, 주석에 "quickstart D1
  실측 후 확정" 표시
- [X] T017 [US1] `src/vision/select.ts`에 `classifyPhotos(photos)` 순수 함수
  추가 (data-model.md §4.2, contracts/classification.md C1~C4): 분류 →
  `non-camera` 제거 → 비면 `[...photos]` 되돌림. `classes` Map도 반환
  (진단·테스트용)
- [X] T018 [US1] `src/vision/select.ts`의 `selectForVision()`이 R1(상한 이하
  전부) 다음에 `classifyPhotos()`를 부르도록 수정 — 아직 `distributeByTime`은
  없으므로 이 단계에서는 `kept`를 기존 인덱스 균등 로직에 넘긴다(US2에서
  교체). 시그니처 불변
- [X] T019 [US1] T011~T013 전부 GREEN 확인. `npm run test:logic` 통과

**Checkpoint**: 잡사진이 걸러지고 되돌림이 동작한다. `select.ts`는 아직 US2의
시간 분포 없이 011 인덱스 균등을 `kept`에 적용한다 — US1만으로도 캡션
대상에서 스크린샷이 빠지는 것이 독립 확인 가능.

---

## Phase 4: User Story 2 - 시간 분포 선별 (Priority: P1)

**Goal**: 인덱스 균등을 찍힌 시각 분포 배분으로 교체. 사진 있는 칸마다 최소
1장 + 남은 예산을 사진 수에 비례(최대 잔여법) 배분. 몰린 칸은 여러 장.

**Independent Test**: 오전 20장·오후 2장·저녁 2장인 하루 → 고른 사진의
시각이 오전에만 몰려 있지 않고, 오전 칸에서 2장 이상.

### Tests for User Story 2 ⚠️ (먼저 쓰고 FAIL 확인)

- [X] T020 [P] [US2] `__tests__/vision/select.test.ts`에 `bucketIndexOf()`
  테스트 (data-model.md §4.1): 04:00 → 0, 07:59 → 0, 08:00 → 1, 03:30 →
  마지막 칸, 자정 → 마지막 칸 그룹. `BUCKET_COUNT` 기준
- [X] T021 [P] [US2] `__tests__/vision/select.test.ts`에 시간 분포 배분 계약
  테스트 (contracts/time-distribution.md D2~D8, 「예시로 못 박기」 표 전부):
  3장 → 전부 / 오전20+오후2+저녁2, 예산5 → 오전 칸 2~3장·오후1·저녁1 /
  6칸 각1장, 예산5 → 시간축 균등 5칸(양 끝 포함) / 칸 수 == 예산 경계
  (예산5, 5칸 각2장) → 5칸 각 1장, 각 칸에서 인덱스 중앙값
  `photos[floor((n-1)/2)]` (D5) / 전부 20–22시 10장, 예산5 → 그 칸에서
  011 R2로 5장
- [X] T022 [P] [US2] `__tests__/vision/select.test.ts`에 최대 잔여법 정확값
  테스트 (contracts/time-distribution.md D4 예시): 예산 8, 칸
  A(2)·B(30)·C(5)·D(3) → alloc A1·B4·C2·D1. 동점 시 사진 수 → 이른 칸 순
- [X] T023 [P] [US2] `__tests__/vision/select.test.ts`에 결정성·시각순·중복
  없음 테스트 (contracts/time-distribution.md D7·D8, SC-004): 몰린 하루로
  2회 실행 → 동일 집합; 출력이 `takenAt` 오름차순, 중복 0

### Implementation for User Story 2

- [X] T024 [US2] `src/vision/select.ts`에 `BUCKET_COUNT` 상수(파일 로컬,
  export 안 함, 값 6) + `bucketIndexOf(takenAt)` 순수 헬퍼 추가 —
  data-model.md §4.1. `day-boundary.ts`를 import하지 않는다
- [X] T025 [US2] `src/vision/select.ts`에 `distributeByTime(photos, budget)`
  순수 함수 추가 — data-model.md §4.3, contracts/time-distribution.md
  D2~D8: 상한 이하 전부 / 칸 그룹핑 / 칸≥예산이면 시간축 균등(D5) /
  아니면 최소 커버리지 + 최대 잔여법(D3·D4) / 칸 내부 011 R2(D6) /
  시각순·중복 제거(D7)
- [X] T026 [US2] `src/vision/select.ts`의 `selectForVision()`이 US1의 011
  인덱스 균등 대신 `distributeByTime(kept, VISION_PHOTO_LIMIT)`을 부르도록
  교체 — data-model.md §4.4. 시그니처 불변. 기존 인덱스 균등 코드 제거
- [X] T027 [US2] `__tests__/vision/select.test.ts`의 011 기존 케이스 검토:
  "전부 저녁 10장" 같은 케이스가 새 알고리즘에서도 통과하는지(칸 1개면
  011로 수렴, contracts/time-distribution.md 「예시」 마지막 줄). 깨지는
  케이스가 있으면 011 계약과 충돌 여부 판단 후 케이스 갱신 또는 코드 수정
- [X] T028 [US2] T020~T023 전부 GREEN 확인. `npm run test:logic` +
  `npm run lint`(헌법 검사 포함) 통과

**Checkpoint**: 선별이 시간 분포 기반이 됐다. 몰린 하루에서 다른 시간대가
대표된다. US1 + US2 = 로드맵 2번 완성(상한 확장 제외).

---

## Phase 5: User Story 3 - 상한 확장 (Priority: P2)

**Goal**: 시간·컨텍스트 두 물리 한계를 실기기에서 재 작은 쪽에서 여유를
뺀 값을 새 `VISION_PHOTO_LIMIT`으로 확정.

**Independent Test**: 사진이 새 상한보다 많은 하루 → 정확히 새 상한 개수만큼
고름. 그 캡션이 들어간 캐릭터 프롬프트가 `n_ctx`를 안 넘김(`adb logcat`).

### Tests for User Story 3 ⚠️

- [X] T029 [P] [US3] `__tests__/vision/select.test.ts`: `VISION_PHOTO_LIMIT`
  숫자가 export되지 않고 `reachedVisionLimit(n)`이 새 값 기준으로
  판정하는지(경계값 n = LIMIT-1, LIMIT, LIMIT+1) — 소스 직접 읽기 + 함수
  호출. FR-018·FR-021
- [X] T030 [P] [US3] `__tests__/vision/select.test.ts`: `distributeByTime`이
  budget을 인자로 받아 budget=5와 budget=12에서 같은 규칙으로 동작하는지
  (FR-020 — 밀집 가산량 별도 상수 없음). 큰 budget에서 몰린 칸이 더 많은
  여분을 받는지

### Implementation for User Story 3

- [X] T031 [US3] **quickstart D3 실기기 실측** (debug, SM-S901N): 상한 후보
  N장(10·12) 하루로 `quiet` 생성 → `adb logcat`에서 (1) 캡션 장당·누적
  시간, VLM 적재 + 캐릭터 모델 로드 시간, `runWithTimeout()` 여유, (2)
  캡션 N장이 들어간 캐릭터 프롬프트 토큰 수 대 `n_ctx`. 가능하면
  `narrative`로도 1회, 못 하면 미확인 명시
- [X] T032 [US3] T031 결과로 `VISION_PHOTO_LIMIT` 확정 — 시간·컨텍스트
  작은 쪽에서 여유 뺀 값. `src/vision/select.ts`의 상수와 주석 갱신
  (data-model.md §3.4 — 어느 제약이 걸렸는지, 잰 값, 기기·날짜)
- [X] T033 [US3] `data-model.md` §3.4 주석과 `specs/023-*/quickstart.md`
  「검증 후 기록」 절에 실측값 기입. `src/inference/`의 `n_ctx` 값과 안전
  비율(사람이 정한 값), **캡션 N장이 들어간 프롬프트의 토큰 수 / `n_ctx`
  여유율**을 주석에 남긴다 — 미래에 상한을 올릴 때 참조 기준이 된다
  (FR-019에 대한 자동 가드는 없고 실측+주석으로 갈음, analyze F4 수용
  근거)
- [X] T034 [US3] T029·T030 GREEN 확인. 상한이 바뀐 뒤 US1·US2의 기존
  테스트가 여전히 통과하는지(`distributeByTime` 케이스가 budget에
  하드코딩돼 있으면 상수 참조로 교체하되, 최대 잔여법 정확값 테스트는
  budget을 명시적으로 넘겨 상한과 무관하게 유지)

**Checkpoint**: 새 상한으로 사진 많은 하루가 5장보다 많이 캡션되고, 시간·
컨텍스트 한계 안에 여유를 두고 든다.

---

## Phase 6: Polish & Cross-Cutting

- [X] T035 [P] quickstart D1 실기기: 심은 각 종류 사진(실촬·스크린샷·
  저장)의 실제 경로 문자열을 `adb logcat`으로 확인 → `NON_CAMERA_FOLDERS`
  최종 확정, `select.ts` 주석에 "SM-S901N, Android 16, 날짜" 근거 기입.
  `content://` 다수면 분류 최적화(상한 초과 하루에만) 결정 기록
- [X] T036 [P] quickstart D2 실기기: 사진 몰린 합성 하루(오전 15장·오후·
  저녁 각 2장)로 생성 → 캡션된 사진의 시각 분포가 하루에 걸침, 몰린 칸이
  독점 안 함(SC-003) 확인
- [X] T037 quickstart D4 회귀: `.maestro/` 사진 관련 흐름 PASS, 「보지
  않음」 vs 「빠르게 봄」 일기 차이 유지(011), 리사이즈 유지(013). 새
  Maestro 흐름 추가 시 `run-device-tests.mjs` `FLOWS`에 등록
- [X] T038 `npm test` 전체 + `npm run lint` 최종 통과 (기기 없는 테스트,
  헌법 검사 0건, prettier)
- [X] T039 AGENTS.md에 023 절 추가 — 실측 규칙(폴더 경로 문자열, 상한
  근거·어느 제약, `BUCKET_COUNT` 사람이 정함, narrative 미확인 여부,
  `content://` 여부)
- [X] T040 `docs/roadmap/README.md`의 2번·8번 항목에 023 완료 표시 및 구현
  결과 요약 (022가 6번에 한 방식)

---

## Dependencies & Execution Order

- **Phase 1 (Setup)** → **Phase 2 (Foundational)**: T003(타입 확인)이 T015의
  경로 출처 결정에 필요.
- **Phase 2** 는 US1·US2·US3 전부의 선행. T004·T005 병렬, T006은 둘 뒤,
  T007은 T006 뒤. T008 → T009 → T010 순차(헌법 검사 배선).
- **Phase 3 (US1)**: T011·T012·T013 병렬(테스트 먼저) → T014 → T015(T014·
  T003 의존) → T016 → T017(T016 의존) → T018 → T019.
- **Phase 4 (US2)**: US1 완료 후(같은 `select.ts` 파일, `selectForVision`이
  `kept`를 넘기는 구조가 T018에서 이미 섬). T020~T023 병렬 → T024 → T025 →
  T026(T025 의존) → T027 → T028.
- **Phase 5 (US3)**: US2 완료 후. T029·T030 병렬 → **T031(실기기)** → T032 →
  T033 → T034. T031은 debug 빌드·기기 필요.
- **Phase 6**: 구현 완료 후. T035·T036 병렬(실기기). T037 → T038 → T039 →
  T040.

## Parallel Opportunities

- **Phase 2**: T004 ∥ T005 (다른 파일)
- **US1 tests**: T011 ∥ T012 ∥ T013 (T011은 `expo-port.test.ts`, T012·T013은
  `select.test.ts`의 다른 describe 블록 — 같은 파일이라도 독립 작성 가능)
- **US2 tests**: T020 ∥ T021 ∥ T022 ∥ T023
- **US3 tests**: T029 ∥ T030
- **Polish 실기기**: T035 ∥ T036

---

## 구현 상태 (2026-08-29, `/speckit-implement`)

**기기 없는 작업 전부 완료.** 실기기가 필요한 T031~T037·T039·T040만 미결.

- **완료**: T001~T030, T038 (30개). Phase 2~4(US1·US2)와 US3의 계약 테스트,
  헌법 경계 2종 + 위반 주입. `npm test` 1906개 통과, `npm run lint` 클린
  (eslint 0 errors, 헌법 0건, prettier 클린).
- **US1·US2를 한 번에 구현했다** — T018의 중간 단계("011 인덱스 균등을
  `kept`에 임시 적용")를 건너뛰고 바로 `distributeByTime`으로 갔다. 결과는
  같고 테스트가 최종 알고리즘을 잠근다.
- **구현 중 발견·해결**:
  - `bucketIndexOf`가 04:00 경계를 유도하므로, 같은 달력일에 00:00~03:59
    사진을 두면 "하루의 끝 칸"이 된다 — 시각 순 정렬이 뒤집혀 011 R3("가장
    이른/늦은 것 포함")이 사진 단위로는 깨질 수 있었다. `distributeByTime`의
    D5·D3+D4 양쪽에 "첫 칸은 가장 이른 장, 마지막 칸은 가장 늦은 장" 보정을
    넣어 해결. 테스트 `spread()`도 04:00~다음날 03:59 범위로 고쳤다.
  - `AssetMetadata`(= `exeForMetadata()`)에 경로 필드가 없음을 T003에서
    확인 → `photosBetween()`이 asset마다 `getUri()`를 `Promise.all`로 부른다
    (research §5 (b) 확정). 수백 장 하루의 비용은 quickstart D1에서 잰다.
- **미결(실기기 필요)**:
  - T031~T033 — 상한(`VISION_PHOTO_LIMIT`) 실측. 현재 5로 두고 주석에
    "quickstart D3 대기" 표시. `distributeByTime`은 budget을 인자로 받으므로
    값만 바꾸면 된다(FR-020).
  - T035 — `NON_CAMERA_FOLDERS` 실측 확정 (현재 알려진 값, 주석에 "D1 대기").
    `content://` 다수 여부에 따른 분류 최적화 결정.
  - T036·T037 — 시간 분포 관찰·회귀 (Maestro).
  - T039·T040 — AGENTS.md·로드맵 갱신 (실측값 확보 후).

## Implementation Strategy

- **MVP = Phase 1 + 2 + 3 (US1)**: 잡사진이 캡션 대상에서 빠지는 것만으로도
  로드맵 2번의 핵심(일기 본문 재료 오염 방지)이 전달된다. `select.ts`는
  이 시점에 011 인덱스 균등을 `kept`에 적용한다.
- **+ Phase 4 (US2)**: 로드맵 2번 완성. 사진 몰린 하루도 하루 전체가 보인다.
- **+ Phase 5 (US3)**: 로드맵 8번. 실기기 실측이 필요하므로 US1·US2와 분리
  가능한 증분.
- 각 phase 끝에 `npm run test:logic`, phase 4·6 끝에 `npm run lint`(헌법
  검사), Phase 5·6에 실기기.

---

## Phase 7: Convergence (2026-08-29, `/speckit-converge`)

`/speckit-implement` 후 코드베이스를 spec·plan·tasks에 대조한 결과, 실기기가
필요한 항목(T031~T037, 상한 실측·폴더 목록 확정·Maestro 회귀)을 제외하면
코드로 닫을 수 있는 미결이 하나 남았다.

- [X] T041 `src/signals/expo-port.ts`의 `photosBetween()`가 폴더 이름
  (`getUri()`) 해석을 **조건부·지연**으로 바꾼다 — plan.md 「구조 결정」의
  `AssetMetadata` 경로 유무 (b), data-model.md §5 (partial). 지금은 하루의
  모든 사진에 `getUri()`를 `Promise.all`로 무조건 부른다. 004 신호 수집
  경로(`collect.ts`가 장수만 세는)와 `selectForVision()`의 R1 빠른 경로
  (상한 이하 → 분류 안 함)는 이 비용을 치를 이유가 없다. 반환값(SC-009)은
  그대로 유지하되, 폴더 이름이 실제로 필요한 경로에서만 해석되도록 게이트를
  둔다("분류 불가" 의미는 동일). **quickstart D1의 URI N회 비용 실측(T035)
  결과에 따라 게이트 조건을 확정**하되, 실측 전이라도 "장수만 세는 004
  경로에서는 `getUri()`를 부르지 않는다"는 하한은 먼저 구현할 수 있다 —
  예: `PhotoPort`에 `foldersFor(ids: string[])` 같은 별도 조회를 두고
  `collect.ts`는 부르지 않으며, 폴더 이름이 필요한 자리(011 캡션 경로 또는
  선별 직전)에서만 채운다.

**참고(수렴 태스크 아님)**:
- FR-017·FR-017a(`VISION_PHOTO_LIMIT` 실측값) — 실기기 전용, Phase 5(T031~
  T033)에 이미 있음. `/speckit-implement`가 기기 없이 닫을 수 없다.
- FR-023 헌법 가드(`VISION_SCORES_IMAGE`)는 토큰 목록 기반이라 미등록 이름의
  채점 헬퍼는 놓칠 수 있다 — 저장소의 다른 가드(`VISION_TOUCHES_DIARY` 등)와
  같은 성질이고 위반 주입으로 검증됨. 추가 작업 불필요, 인지용.

---

## Phase 8: 검증 도구 확장 (seed-day가 다채로운 하루를 만든다)

**Purpose**: 023의 실기기 검증(quickstart D1·D2·D3)은 "카메라 원본 + 잡사진이
섞인 하루", "특정 시간대에 몰린 하루", "상한 초과인 하루"를 필요로 하는데,
현재 `scripts/seed/shapes.ts`는 `build: (day) => PlannedPhoto[]` 하나에 시각·
위치·장수를 통으로 하드코딩해 새 상황마다 `build` 함수를 새로 써야 한다.
사진을 "언제·어디서·무슨 종류·몇 장"의 조합(burst)으로 기술하고, 그 조합을
합성하는 얇은 레이어를 둔다. 010의 원칙("앱 코드 0줄 변경, 심고 끝난다", 원칙
IV·V)과 계약("이름=계약", `shapes.test.ts`)은 그대로.

**⚠️ 이 phase는 023 기능이 아니라 023 검증을 실기기에서 돌리기 위한 도구
변경이다.** 010 스펙 문서는 건드리지 않고, 변경 이유는 023 quickstart가 설명한다.

### 설계 결정 (사용자와 합의, 2026-08-29)

- **폴더 격리는 하위 폴더로 한다.** `SEED_FOLDER`(`/sdcard/Pictures/
  AlphariumSeed`) 아래에 `Camera/`·`Screenshots/`·`Download/` 하위 폴더를 두고
  그리로 push한다. `folderNameOf()`가 보는 "마지막 `/` 앞 세그먼트"가 각각
  `"Camera"`·`"Screenshots"`·`"Download"`가 되어 023 분류가 실기기에서
  재현된다. `queryFolder()`의 `%AlphariumSeed%` LIKE와 `removeSeedFolder()`의
  `rm -rf SEED_FOLDER`가 하위 폴더까지 그대로 잡으므로 FR-016a(폴더 밖을
  못 지운다)가 유지된다 — 실제 시스템 폴더(`DCIM/Camera` 등)에 흩뿌리지
  않는다.
- **`folder` 미지정은 기존 동작**: `SEED_FOLDER/<파일>` 그대로. 회귀 없음.
- **정해 둔 이름표 + 애드혹 조합 둘 다 지원**: `SHAPES`는 비교 검증용 고정
  조합(이름=계약). 목록에 없는 상황은 에이전트가 `--bursts <json>`으로 조합을
  직접 넘긴다 — 010 원칙 V("코드가 값을 보고 조합을 만들지 않는다")는
  **정해 둔 이름표**에만 적용되고, 애드혹은 사람(에이전트)이 명시적으로
  지정하는 것이라 위반이 아니다.

### Tests ⚠️ (먼저)

- [X] T042 [P] `__tests__/seed/burst.test.ts`(신규): `burst(day, spec)` 순수
  함수 — `{fromHour, spanHours, count, location, folder?}` → `PlannedPhoto[]`.
  검사: (a) count장이 `[fromHour, fromHour+spanHours]`에 균등 분포,
  (b) `spanHours=0`이면 전부 같은 시각, (c) 마지막 사진이 하루 시작+20시간을
  넘지 않게 clamp(자정 넘김 방지 — `spread-day` 주석의 함정),
  (d) `location` 심볼(`"near-a"`·`"b"`·`null`) → 좌표 변환,
  (e) `folder` 그대로 실림, (f) 결정적(같은 입력 → 같은 출력).
- [X] T043 [P] `__tests__/seed/compose.test.ts`(신규): `composeDay(day,
  bursts[])` → 모든 burst를 flatMap + `takenAtMs` 오름차순 정렬. 겹치는
  시각 허용(같은 순간 여러 장은 정상).
- [X] T044 `__tests__/seed/shapes.test.ts` 갱신: (a) 새 이름 4개를 이름
  목록에 추가(`mixed-clutter`·`morning-heavy`·`screenshots-only`·
  `many-camera`), (b) **기존 6개 모양의 `build(day)` 출력이 바이트 동일**
  (burst 표현으로 옮겨도 결과 불변 — `rich`·`spread-day` 등 기존 단언 유지),
  (c) `mixed-clutter`가 `folder` 셋(`Camera`·`Screenshots`·`Download`)을
  전부 포함, (d) `morning-heavy`가 한 시간 칸(023 `BUCKET_COUNT=6` 기준
  4시간)에 그날 사진의 절반 이상, (e) `many-camera`가 12~15장이고 전부
  `folder` 미지정 또는 `Camera`.
- [X] T045 `__tests__/seed/plan.test.ts` 또는 신규: `planSeeding`이
  `--bursts` 경로(이름 대신 조합 JSON)를 받아 `SyntheticDay`를 만드는지.
  잘못된 JSON은 `unknown-shape`로 거부(되묻지 않음, FR-018).

### Implementation

- [X] T046 `scripts/seed/shapes.ts`: `PlannedPhoto`에 `folder?: "Camera" |
  "Screenshots" | "Download"` 추가. `BurstSpec` 타입 +  `burst(day, spec)` ·
  `composeDay(day, bursts)` 순수 헬퍼 추가(자정 clamp, 심볼릭 location 변환).
  `DayShape`를 `{ name, description, bursts: BurstSpec[] }`로 바꾸고 `build`는
  `composeDay(day, this.bursts)`로 유도(또는 `build`를 유지하되 내부에서
  `composeDay` 호출). **기존 6개 모양을 burst 조합으로 이전, 출력 불변.**
- [X] T047 `scripts/seed/shapes.ts`: 새 이름표 4개 추가 —
  - `mixed-clutter`: Camera 6장(하루 흩어짐, near-a) + Screenshots 3장 +
    Download 1장. → D1 잡사진 필터링.
  - `screenshots-only`: Screenshots 5장. → D1 되돌림.
  - `morning-heavy`: 오전 04–06시 15장(near-a) + 낮 10시 2장(b) + 저녁 16시
    2장(b). → D2 시간 분포 밀집 배분. (자정 clamp가 20시간 상한을 지킴)
  - `many-camera`: Camera 12장, 하루 04시부터 균등(자정 전). → D3 상한 확장.
    `over-limit`(201장, 010 실측에서 색인 밀림으로 사망)의 실용 대체.
- [X] T048 `scripts/seed/device.ts`: `SEED_FOLDER` 아래 하위 폴더 지원 —
  `folder`가 있으면 push 목적지가 `${SEED_FOLDER}/${folder}/${name}`.
  `queryFolder()`의 LIKE는 `%AlphariumSeed%`라 하위 폴더도 잡힘(변경
  불필요). `listSeedFolder()`가 재귀(`ls -R` 또는 `find`)로 하위 폴더도
  세도록. `removeSeedFolder()`는 `rm -rf SEED_FOLDER`라 그대로.
- [X] T049 `scripts/seed-day.mts`: (a) push 전에 `photo.folder`가 있으면
  하위 폴더를 만들고(`mkdir -p`) 그리로 push, (b) `--bursts <json>` 인자
  파싱 — 있으면 `shapeName` 대신 조합으로 `planSeeding`. 마지막 줄 JSON·
  종료 코드 계약 유지, 되묻지 않음.
- [X] T050 `scripts/seed/ledger.ts`: `SeededPhoto.devicePath`가 이미 전체
  경로라 하위 폴더가 그대로 기록됨 — 변경 불필요 확인만. `cleanup()`이
  하위 폴더 경로도 `removeFile`로 지우는지 확인(경로 기반이라 이미 됨).
- [X] T051 `npm run test:logic` + `npm run lint`(헌법 검사 — `checkSeedFile`이
  새 헬퍼도 커버, `generate(`·`diary/*` 어휘 없음 확인) 통과.
- [X] T052 `specs/023-photo-selection-algorithm/quickstart.md` D1·D2 갱신:
  `mixed-clutter`·`screenshots-only`(D1), `morning-heavy`(D2),
  `many-camera`(D3)를 쓰도록. 애드혹 조합 예시(`--bursts`)도 한 줄 추가.

### Checkpoint

`npm run seed:day -- mixed-clutter <날짜>`가 Camera·Screenshots·Download
하위 폴더에 사진을 심고, 023의 `folderNameOf()`가 각 폴더 이름을 뽑아
분류한다. `--bursts`로 임의 조합도 심긴다. 010의 이름=계약·앱 무변경·
심고 끝남 원칙 유지.

---

## Phase 9: Convergence (2026-08-29, 2차)

`/speckit-implement` 2차(T041 + Phase 8) 후 대조. CRITICAL·HIGH 없음. 실기기
항목을 빼면 코드로 닫을 미결 셋 — 전부 새 통합/순수 코드의 테스트 공백이다.

- [X] T053 `__tests__/inference/on-device.test.ts`에 T041 통합 경로 테스트 추가
  per T041 (partial): (a) 사진이 상한(`VISION_PHOTO_LIMIT`)을 넘는 하루 +
  `resolveFolders` 스텁(스크린샷 폴더 이름을 몇 장에 매핑) → `readPhotos()`가
  성공하고 캡션 대상에 그 스크린샷이 안 들어감(잡사진 필터링이 통합 경로에서
  실제로 돎), (b) `resolveFolders`가 throw → `readPhotos()`가 여전히 완성
  (`attachFolderNames`의 예외 삼킴), (c) `resolveFolders` 미주입(옵셔널) →
  폴더 없이 선별(필터링 no-op). 사진 ≤ 상한인 하루에서는 `resolveFolders`가
  불리지 않는 것도 확인(`reachedVisionLimit` 게이트).
- [X] T054 `__tests__/seed/`에 `seedPathFor()` 순수 함수 테스트 추가 per T048
  (partial): `seedPathFor("x.jpg")` → `<SEED_FOLDER>/x.jpg`,
  `seedPathFor("x.jpg", "Screenshots")` → `<SEED_FOLDER>/Screenshots/x.jpg`.
  결과가 항상 `SEED_FOLDER`로 시작함을 단언(FR-016a — 폴더 밖으로 안 나간다).
  `folderNameOf`와 왕복(seedPathFor로 만든 경로 → folderNameOf가 그 folder를
  되뽑음)도 확인.
- [X] T055 `scripts/seed-day.mts`의 `--bursts` argv 파싱을 순수 헬퍼로 추출해
  테스트 per T049 (partial): argv 배열 → `{ usingBursts, burstsJson, day,
  shapeName }`. `scripts/seed/plan.ts` 또는 새 `scripts/seed/args.ts`에 두고
  `main()`이 그것을 부른다. 케이스: `--bursts <json> <날짜>`,
  `<모양> <날짜>`, `--bursts`가 마지막 인자(날짜 없음), `--bursts` 없이
  인자 부족. 마지막 줄 JSON·종료 코드 계약은 그대로.

**참고(수렴 태스크 아님, Phase 7과 동일)**: FR-017·FR-017a·FR-019·SC-007·
SC-008(상한 실측값·`n_ctx`·180초)은 Phase 5(T031~T033)의 실기기 항목이다.

---

## 실기기 검증 완료 (2026-08-29, SM-S901N / Galaxy S22, Android 16 / SDK 36, debug)

**T018·T031~T037·T039·T040 전부 수행.** 상세는
`specs/023-photo-selection-algorithm/quickstart.md` 「검증 후 기록」.

### 관측값

- **T031·T032 — 상한 `VISION_PHOTO_LIMIT` 5 → 8.** `many-camera`(12장)
  하루로 「빠르게 봄」 `quiet` 생성을 상한 5·8 두 번 걸어 `DiaryEntry.timing`·
  `adb logcat`(`RNLlama`)을 읽음. 상한 8: 캡션 46초(`visionMs=45652`) +
  생성 92초(`writingMs=91663`) = 총 ~138초 / 한도 180초, 여유 42초.
  **걸린 제약은 시간**(narrative exaone 콜드 최대 242초 미확인 → 8에서
  멈춤). 컨텍스트는 여유(캡션 5장 프롬프트 852토큰 / 캐릭터 `n_ctx` 2048,
  `n_predict` 512 → 상한 1536, 8장 ≈ 1030토큰 67%). VLM `n_ctx`=4096,
  IMAGE 청크 장당 1개(013 리사이즈 유효).
- **T033 — `data-model.md` §3.4, `src/vision/select.ts` 상수 주석 갱신.**
- **T034 — 상한 5 하드코딩 테스트 갱신.** `select.test.ts`(US1·US2·S1 26개),
  `generate.test.ts`(016 many 갈래), `on-device.test.ts`(T053 (a)(b)(c) —
  8장 → 12장). `distributeByTime` 계약은 budget을 명시적으로 넘겨 상한과
  무관하게 유지, D4 정확값 테스트가 이제 contract 예시(예산 8)와 일치.
- **T035 — `getUri()`는 `file://` 경로를 반환**(`content://` 아님).
  `folderNameOf()`의 `file://` 분기가 실기기에서 유효. `NON_CAMERA_FOLDERS`
  실촬 경로 확정은 미완(seed 하위폴더 격리·분류만 확인). `content://`
  다수 아님 → 분류 최적화 불필요.
- **T036 — 시간 분포 선별.** `many-camera` 12장(02:00~10:22 KST에 몰림)
  → 캡션 8장이 `02:00, 02:06, 04:02, 06:25, 06:31, 06:39, 09:33, 10:22`로
  균등 분포. 첫·마지막 사진 포함(011 R3). `distributeByTime` budget=8이
  실기기에서 정확히 동작.
- **T037 — Maestro 회귀.** `photo-vision`·`diary-user-path`·`past-day-diary`·
  `skeleton`·`today-diary`·`diary-body-screen` PASS. **stale 둘 수정**(023
  회귀 아님, 014 이후): `generate-diary.yml`(진단 화면 생성 패널 → 일기 탭
  "일기 쓰기"), `diary-character-select.yml`(내부 키 → 페르소나 이름).
  신규 `photo-selection-over-limit.yml` + `run-device-tests.mjs` `FLOWS` 등록.
- **T039·T040 — AGENTS.md 023 절, `docs/roadmap/README.md` 2·8번 갱신.**

### D1 — 잡사진 필터링 실기기 확인 (quickstart D1)

`mixed-clutter`(Camera 6 + Screenshots 3 + Download 1 = 10장, Phase 8
하위폴더 격리) → `signalsUsed`(선별 전) 10장 / **캡션 6장 전부 `Camera/`
하위폴더**. Screenshots·Download가 캡션 대상에서 빠짐 — `folderNameOf()`가
`file://` 경로에서 하위폴더 이름을 뽑아 제외. MediaStore `bucket_display_name`이
하위폴더별로 갈림.

### seed 도구 결함 발견·수정 (T035 부산물)

`scripts/samples/no-gps/`의 실사 샘플(2017년 Galaxy)이 이 기기 미디어
스캐너에서 `datetaken`을 NULL로 둔다 — patch 여부·EXIF 날짜 태그 일치
여부와 무관, 원본 그대로도 그렇다. `mixed-clutter`·`screenshots-only`
seed가 "색인 6/10"으로 실패했다. 수정: `pickNoGpsSample()`이 `with-gps/`
후보를 먼저 쓰고(`patchLocation` 안 부름 → 좌표 안 심김), `patchDate()`가
IFD0 `DateTime`(0x0132)도 덮어쓴다(세 날짜 태그 일치, 정석 강화).

### 미확인 잔여

- **`narrative`(exaone) 완주 시간** — 180초 초과 여부. `quiet`만 실측.
  상한을 8보다 올리려면 이것부터.
- **`NON_CAMERA_FOLDERS` 실촬 경로** — seed 하위폴더로 분류 로직은 확인,
  실제 스크린샷/메신저 저장 경로(`Pictures/Screenshots` vs `DCIM/...` 등)는
  안 쟀다.
- **prod 게이트** — 새 네이티브 모듈 없어 release 재확인 생략(012 기준).
- ※ 검증용 합성 하루는 010 원칙대로 "경로가 도는가"만 봤고 품질 결론에
  쓰지 않았다.

### 최종 상태

기기 없는 테스트 1959개 통과, lint·헌법 검사(위반 0)·prettier 클린.
