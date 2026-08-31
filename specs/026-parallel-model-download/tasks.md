---
description: "Task list for 모델 병렬·동시 내려받기"
---

# Tasks: 모델 병렬·동시 내려받기

**Input**: Design documents from `/specs/026-parallel-model-download/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 이 저장소는 헌법 「개발 방식」 MUST("계약을 먼저 정하고 테스트를 먼저 쓴다") 아래
있으므로 **테스트 태스크는 필수**다. 계약 테스트는 소스 선언을 `readFileSync`로 직접 읽어
검사하는 관례(007·009·012)를 따른다.

**Organization**: User Story별로 묶는다. US1(동시 다운로드)·US3(폴백)이 P1, US2(세그먼트
병렬)·US4(세그먼트 이어받기)가 P2다. US1은 세그먼트 없이 독립적으로 MVP가 된다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일, 선행 태스크 없음 → 병렬 가능
- **[Story]**: US1~US4 (spec.md User Story), Setup/Foundational/Polish는 라벨 없음

## Path Conventions

Mobile 단일 저장소: `src/`, `App.tsx`, `__tests__/`, `.maestro/`, `scripts/` (repo root).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 새 경계 디렉터리와 헌법 검사 규칙 자리를 만든다.

- [ ] T001 `src/models/segmented/` 디렉터리 생성. `src/models/segmented/types.ts`에
  `Segment`·`SegmentPlan`·`SegmentedResume`·`RangeSupport` 타입 선언 (data-model.md
  「신규 타입」 표 그대로, 아직 로직 없음, 전부 `export type`).
- [ ] T002 [P] `scripts/constitution-rules.ts`에 `checkSegmentedFile` 추가 —
  `src/models/segmented/` 파일이 `../diary/`·`Character`·`models/roster`를 import하거나
  소스에 속도 어휘(`elapsed`·`bytesPerSecond`·`throughput`·`\bspeed\b`)를 두면 위반.
  `scripts/check-constitution.mts`가 이 규칙을 호출하도록 등록 (020 `checkScheduleFile`,
  023 `VISION_SCORES_IMAGE` 전례).
- [ ] T003 [P] `.maestro/parallel-model-download.yml` 빈 파일 생성 + `scripts/run-device-tests.mjs`의
  `FLOWS` 배열에 등록 (AGENTS.md 「⚠️ 새 Maestro 흐름은 FLOWS에 등록해야 돈다」).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: US1~US4 어느 것도 시작하기 전에 완성돼야 하는 순수 코어와 스토리지 확장.

**⚠️ CRITICAL**: 이 페이즈가 끝나야 User Story 작업을 시작한다.

### 순수 계획 함수 (segmented/plan.ts)

- [ ] T004 [P] `__tests__/models/segmented-plan.test.ts` 작성 (구현 전, FAIL 확인) —
  contracts/segmented-transfer.md 검증 표 C1~C8·C14·C15 (`planSegments` 경계 불변식,
  작은 파일 `count=1`, 나머지 바이트, `remainingSegments` 완료 구간 제외·`start` 이동,
  `mergeProgress` null·클램프, `isComplete`, `SEGMENT_COUNT`/`MIN_SEGMENT_BYTES`가
  `readonly` 리터럴 — `readFileSync` 검사, 값 변경 시 실패).
- [ ] T005 `src/models/segmented/plan.ts` 구현 — `SEGMENT_COUNT = 4`,
  `MIN_SEGMENT_BYTES = 8 * 1024 * 1024` (`as const`, 주석에 "잠정 — 실기기 T037(Q3)에서
  확정, 근거 research.md §3"). 순수 함수 `planSegments`·`remainingSegments`·`mergeProgress`·
  `isComplete`·`remainingCapacity` (data-model.md 「순수 함수 시그니처」 표). `Date`·난수·
  파일 미사용. T004가 GREEN.

### 스토리지 확장 (state.json 스키마)

- [ ] T006 [P] `__tests__/models/storage.test.ts`에 `segmented` 필드 왕복 케이스 추가
  (구현 전, FAIL) — `readState`가 `segmented` 없는 옛 파일을 빈 배열로, 깨진 값도 빈 배열로;
  `withSegmentedResume`가 같은 `assetKey`를 `paused`에서 제거; `withPaused`가 `segmented`에서
  제거; `withoutAsset`이 `segmented`도 비움 (data-model.md 「ModelState」).
- [ ] T007 `src/models/storage.ts` 확장 — `ModelState`에 `segmented: SegmentedResume[]`,
  `readState` 파싱에 `Array.isArray(parsed.segmented) ? … : []`, 헬퍼 `segmentedFor`·
  `withSegmentedResume`·`withoutSegmented` 추가, `withPaused`·`withoutAsset` 상호배타
  처리. `src/models/types.ts`에서 `SegmentedResume`를 re-export 하거나 `segmented/types.ts`
  에서 import (경계: `storage.ts`는 `segmented/plan.ts`를 import하지 않는다 — 타입만).
  T006이 GREEN.

### 포트 계약 확장 (port.ts)

- [ ] T008 `src/models/port.ts` 확장 — `RangeFetchPort` 인터페이스 추가 (`probeRange(url)`,
  `fetchRange(key, url, segment, onBytes, signal?)`, `RangeOutcome` 타입), contracts/
  segmented-transfer.md 「기기 포트」 그대로. `DownloadPort.resume` 시그니처를
  `resume(key, url, state, onProgress)`로 확장 (url 추가 — segmented-transfer.md
  「expoDownloadPort 탐지 분기」의 resume 절). `ModelPorts`에 `range: RangeFetchPort` 추가.
  주석에 "`resume`의 `state`에 `SegmentedResume` 또는 003 `DownloadPauseState`가 담긴다,
  타입이 `unknown`이라 안 깨진다".

**Checkpoint**: 순수 코어·스토리지·포트 계약 준비 완료. US1~US4 시작 가능.

---

## Phase 3: User Story 1 - 여러 캐릭터를 동시에 준비한다 (Priority: P1) 🎯 MVP

**Goal**: 003 FR-020의 "한 번에 하나"를 해제. 서로 다른 캐릭터를 무제한 동시 다운로드,
캐릭터별 멈추기, 여러 줄 동시 진행 표시, 탭 복귀 시 전부 복원, 동시 공간 판정.

**Independent Test**: 캐릭터 두 개를 연달아 "준비하기" → 둘 다 진행 표시가 뜨고 각각 완료·
검증된다. 세그먼트 병렬은 켜지 않아도 된다 (quickstart Q1·Q2).

### Tests for User Story 1 (먼저 작성, FAIL 확인) ⚠️

- [ ] T009 [P] [US1] `__tests__/models/concurrent-acquisition.test.ts` 작성 —
  contracts/concurrent-acquisition.md 검증 표 A1~A11 (서로 다른 캐릭터 동시 `prepare`,
  같은 캐릭터 `busy` 거부, `busyWith()` 배열, `pause(character)` 격리, `pause()` 전부,
  동시 공간 합산 판정 A6, `finally` 정리 A7, 자리 선점 A8, 세그먼트 재개 전달 A9·A10·A11).
  대역 `DownloadPort`·`DiskSpacePort`·`MetadataPort` 사용.
- [ ] T010 [P] [US1] `__tests__/models/acquisition.test.ts` 수정 — 003의 "다른 캐릭터
  받는 중 → busy" 케이스를 "이제 둘 다 시작"으로 갱신 (A13). `insufficient-space`·
  `network`·`verification-failed` 갈래 회귀 케이스는 유지 (A12). 구현 전이므로 이 수정은
  FAIL이어야 한다.
- [ ] T011 [P] [US1] `__tests__/models/download-view.test.ts` 수정 — contracts/
  download-view.md 검증 표 V1~V9 (`active` 배열화, `noticeFor` 배열 대응, 타입에 시간·
  속도·바이트·구간 필드 없음 `readFileSync` 검사). 구현 전 FAIL.
- [ ] T012 [P] [US1] `__tests__/ui/character-list.test.tsx` 수정 — 여러 줄이 동시에
  진행 표시 + "멈추기"를 그리는 케이스, `onPause(character)` 인자 전달. 구현 전 FAIL.

### Implementation for User Story 1

- [ ] T013 [US1] `src/models/types.ts` 수정 — `DownloadView.active`를
  `DownloadProgress | null` → `DownloadProgress[]`. `DownloadProgress`·`DownloadFailure`·
  `DownloadRejection`은 무변경 (data-model.md 확인). T011의 타입 검사 부분 GREEN.
- [ ] T014 [US1] `src/models/download-view.ts` 수정 — `resolveDownloadView(active: DownloadProgress[], rejection)`.
  `noticeFor`를 contracts/download-view.md 「noticeFor 배열로」 로직으로 (008의 4단계를
  배열 대응 3단계로). T011 전부 GREEN.
- [ ] T015 [US1] `src/models/acquisition.ts` 수정 — `running`을
  `Map<Character, { pause(): Promise<void> }>`로. `prepare`: `running.has(character)`만
  `busy`, 자리 선점을 첫 `await` 전에, 공간 판정에 `remainingCapacity` 합산 (§6,
  `lastBytesOf` 최신 바이트 기록), 세그먼트/일반 재개 분기 (`segmentedFor`), pause 시
  `withSegmentedResume`/`withPaused` 분기, `finally`에서 `running.delete`. `pause(character?)`.
  `busyWith(): Character[]`. contracts/concurrent-acquisition.md 「prepare 흐름」 그대로.
  T009·T010 GREEN.
- [ ] T016 [US1] `src/ui/CharacterListScreen.tsx` 수정 — `busy` 판정을
  `view.active.find(p => p.character === character)`로, 여러 줄에 동시 진행 표시 + "멈추기",
  "멈추기" `onPress` → `props.onPause(character)`. `CharacterListProps.onPause`를
  `(character: Character) => void`로. T012 GREEN.
- [ ] T017 [US1] `App.tsx` 수정 — `progress` 상태를 `Map<Character, DownloadProgress>`로
  (또는 배열). `resolveDownloadView([...progress.values()], rejection)`. `onPrepare`가
  자기 요청 결과로만 자기 캐릭터의 progress를 거둠 (008 버그 ② 방어를 맵 대응으로).
  탭 복귀 `useEffect`: `acquisition.busyWith()` 배열을 순회해 없는 것마다
  `progress.set(c, { character: c, fraction: null })` (0%로 안 채움, FR-006).
  `onPause={(character) => void acquisition.pause(character)}`.
- [ ] T018 [US1] `src/vision/acquisition.ts` **무변경 확인** — `git diff --stat main -- src/vision/acquisition.ts`
  가 0줄임을 확인. `prepareVision`이 `App.tsx`에서 캐릭터와 동시에 호출돼도 동작하는지
  `__tests__/vision/acquisition.test.ts` 회귀 실행 (FR-027, SC-009).

**Checkpoint**: US1 완결 — 세그먼트 없이 여러 캐릭터 동시 다운로드가 기기 없는 테스트로
검증됨. `npm run test:logic` + `npm run test:ui` 통과. MVP 데모 가능.

---

## Phase 4: User Story 3 - 서버가 구간 요청을 지원하지 않아도 받아진다 (Priority: P1)

**Goal**: 세그먼트 코어 조립(`runSegmented`)과 폴백 판정. Range 미지원·크기 불명이면 조용히
기존 단일 스트림으로. **US2보다 먼저** — 폴백이 없으면 US2가 회귀를 만든다.

**Independent Test**: 구간 요청을 무시하는 응답을 대역으로 흉내 → 단일 스트림 경로로 완주
(quickstart Q4, 계약 테스트 C9).

### Tests for User Story 3 (먼저 작성, FAIL 확인) ⚠️

- [ ] T019 [P] [US3] `__tests__/models/segmented-transfer.test.ts` 작성 — contracts/
  segmented-transfer.md 검증 표 C9~C13·C16·C17 (`runSegmented` Range 미지원 →
  `{ kind: "fallback" }`, 작은 파일 → fallback, 정상 완주 → `{ completed }` + `onProgress(1)`,
  한 구간 실패 → 나머지 abort + `{ failed }`, pause → `{ paused, resume }` `receivedBytes`
  정확, 재개 → 남은 구간만 `fetchRange`; `checkSegmentedFile`이 `segmented/*`의 금지
  import·속도 어휘를 잡는지). 대역 `RangeFetchPort`.

### Implementation for User Story 3

- [ ] T020 [US3] `src/models/segmented/transfer.ts` 구현 — `runSegmented(deps, key, url, opts)`
  (contracts/segmented-transfer.md 「조립」 흐름 1~5). `probeRange` → `unsupported`이면
  `{ kind: "fallback" }`, `plan.segments.length === 1`이면 `{ kind: "fallback" }`, 구간
  `Promise.all(fetchRange)`, `combinedSignal` (pauseSignal OR 내부 abort), 결과 취합.
  지문 검증·`state.json` 쓰기는 하지 않는다. `Character` import 금지. T019의 C9~C13 GREEN.
- [ ] T021 [US3] `src/models/expo-port.ts` 수정 — `expoDownloadPort().start()`의
  `wait()` 안에서 `runSegmented` 먼저 시도, `{ fallback: true }`면 기존
  `File.createDownloadTask` 경로 실행 (segmented-transfer.md 「expoDownloadPort 탐지
  분기」 1~5). **`fraction → TransferProgress` 어댑터를 이 파일이 소유**한다:
  `wrapToTransferProgress`가 `fraction`을 `{ bytesWritten: Math.round(fraction*total),
  totalBytes: total }`로 되돌려 `acquisition.ts`의 `fractionOf`가 그대로 동작 (segmented-
  transfer.md 「조립」 1). `runSegmented` 시그니처는 `onProgress: (fraction: number|null)
  => void`로 고정 — 세그먼트 코어가 바이트를 모른다. **`__DEV__` 강제 폴백 스위치 추가**
  (`__DEV__ && globalThis.__FORCE_DOWNLOAD_FALLBACK__` → `probeRange` 건너뛰고 unsupported
  취급, segmented-transfer.md 「__DEV__ 강제 폴백」, SC-004·Q3·Q4 공용). `{ paused, resume }`
  → `{ kind: "paused", state: resume }`.
- [ ] T022 [US3] `src/models/expo-port.ts`에 `expoRangeFetchPort()` 구현 —
  `probeRange`: `HEAD` 또는 `Range: bytes=0-0` fetch, 리다이렉트 따라간 최종 응답의
  `Accept-Ranges: bytes` + 유효 `Content-Length`/`Content-Range` 확인, 애매하면
  `{ kind: "unsupported" }` (research §1). `fetchRange`: `Range: bytes=start-end` fetch →
  받은 청크를 `file.write(chunk, { position })` (T-Q0에서 확인한 시그니처), `onBytes(delta)`,
  `AbortSignal` 존중. `expoModelPorts()`에 `range: expoRangeFetchPort()` 추가.
- [ ] T023 [US3] `src/models/acquisition.ts` — `prepare`의 `download.start`/`download.resume`
  경로가 이미 `DownloadPort` 계약만 부르므로 코드 변경 없음을 확인. `download.resume`
  호출부에 `asset.url` 인자 추가 (T008에서 시그니처가 `resume(key, url, state, onProgress)`
  로 바뀌었으므로). concurrent-acquisition.md A9 회귀.

**Checkpoint**: US3 완결 — 세그먼트 코어가 있고, 미지원 서버에서 폴백으로 완주. US1 + US3가
기기 없는 테스트로 검증됨.

---

## Phase 5: User Story 2 - 한 모델을 더 빨리 받는다 (Priority: P2)

**Goal**: 서버가 지원하면 실제로 세그먼트 병렬로 받아 단일 스트림보다 빠르거나 느리지 않다.
사용자 화면엔 `fraction` 하나만.

**Independent Test**: 같은 모델을 세그먼트 켬/끔으로 두 번 받아 완료 벽시계 시간을 같은 실행
안에서 대조 (quickstart Q3). 켬 쪽이 더 짧거나 길지 않다.

### Tests for User Story 2 (먼저 작성, FAIL 확인) ⚠️

- [ ] T024 [P] [US2] `__tests__/models/segmented-transfer.test.ts`에 병렬 수신 케이스
  보강 — `runSegmented` 정상 경로에서 `fetchRange`가 모든 구간에 대해 **동시에**(순차
  아님) 호출되는지 (대역이 호출 시점을 기록), `onProgress`가 `mergeProgress`로 합쳐진
  단일 `fraction`만 받는지, 동시 호출 수가 `SEGMENT_COUNT`를 넘지 않는지.
- [ ] T025 [P] [US2] `__tests__/models/segmented-transfer.test.ts`에 원칙 III·IV 검사 —
  `runSegmented`/`transfer.ts`/`plan.ts` 소스에 구간 개수·구간별 바이트·속도가 콜백
  바깥으로 나가는 경로가 없는지 (`readFileSync` + `checkSegmentedFile` 재확인, SC-008).

### Implementation for User Story 2

- [ ] T026 [US2] `src/models/segmented/transfer.ts` — `runSegmented`의 `Promise.all`
  병렬 실행이 T024를 만족하도록 확정 (T020에서 이미 병렬이면 검증만; 순차였으면 병렬로).
  구간 실패 시 `AbortController`로 나머지 즉시 취소. T024 GREEN.
- [ ] T027 [US2] `src/models/expo-port.ts` `expoRangeFetchPort().fetchRange` — 청크
  스트리밍 쓰기가 메모리에 전체 구간을 담지 않도록 (구간당 200MB — 스트림으로 오프셋에
  이어 쓴다). `probeRange` 결과를 `runSegmented`가 재사용하도록 `start()` 경로에서 한 번만
  호출. (T022의 오프셋 쓰기가 실기기 Q0에서 확인된 시그니처를 쓰는지 재확인.)
- [ ] T028 [US2] `src/models/segmented/plan.ts` 주석 — `SEGMENT_COUNT`·`MIN_SEGMENT_BYTES`
  옆에 "실기기 **T037(Q3)** 에서 확정" 참조. (값 자체는 T005에서 잠정 확정, 여기선 실측
  대기 표시만.)

**Checkpoint**: US2 완결 — 세그먼트 병렬이 코어에서 동작. 실제 속도 이득은 실기기 T037(Q3)
에서 확인.

---

## Phase 6: User Story 4 - 받다 만 세그먼트 다운로드를 이어받는다 (Priority: P2)

**Goal**: 세그먼트 다운로드가 멈추면 각 구간의 받은 바이트를 `state.json`에 남기고, "이어받기"
시 남은 구간부터. 합친 파일이 지문과 어긋나면 `verification-failed`.

**Independent Test**: 재개 상태를 만들어 두고 "이어받기"가 각 구간을 남은 Range부터 요청하는지,
완료 후 파일이 온전한지 (quickstart Q5, 계약 테스트 C13).

### Tests for User Story 4 (먼저 작성, FAIL 확인) ⚠️

- [ ] T029 [P] [US4] `__tests__/models/segmented-plan.test.ts`에 재개 계산 보강 —
  `remainingSegments`가 부분 구간의 `start`를 `receivedBytes[i]`만큼 밀고 완료 구간은
  제외 (C4·C5 심화: 여러 구간이 서로 다른 진행도일 때).
- [ ] T030 [P] [US4] `__tests__/models/concurrent-acquisition.test.ts`에 세그먼트 재개
  경로 보강 — pause 시 `outcome.state`에 `segmentCount`가 있으면 `withSegmentedResume`,
  없으면 `withPaused` (A10); `readiness.ts`가 `segmentedResume` non-null → `partial` +
  `resumable: true` (FR-023); 재개 상태 없이 부분 파일만 → `partial` + `resumable: false`
  (FR-026); 합친 파일 지문 불일치 → `verification-failed`, 파일 삭제 (FR-024).
  `__tests__/models/readiness.test.ts`에도 `segmentedResume` 케이스 추가.

### Implementation for User Story 4

- [ ] T031 [US4] `src/models/readiness.ts` 수정 — `ReadinessInput`에
  `segmentedResume?: SegmentedResume | null`, `readinessOf`의 파일 없음 분기에
  `if (segmentedResume != null) return { kind: "partial", reason: interrupted, resumable: true }`
  (data-model.md 「ReadinessInput」). T030의 readiness 부분 GREEN.
- [ ] T032 [US4] `App.tsx`의 `ModelSection.read()` 수정 — 준비 상태 재료 수집 시
  `segmentedFor(state, asset.key)`를 읽어 `readinessOf`에 `segmentedResume` 전달
  (기존 `verdictFor`·`pausedFor` 옆).
- [ ] T033 [US4] `src/models/expo-port.ts` `expoDownloadPort().resume()` 수정 —
  `state`에 `"segmentCount" in state`이면 `runSegmented(deps, key, url, { resume: state, … })`,
  아니면 기존 `DownloadTask.fromSavable` 경로 (segmented-transfer.md 「resume」).
- [ ] T034 [US4] `src/models/acquisition.ts` `prepare`의 7-a (pause 처리) 확정 —
  `outcome.state`가 `SegmentedResume` 모양이면 `withSegmentedResume(state', { assetKey, ...outcome.state })`,
  아니면 `withPaused`. `verifyDownloaded` 실패 시 `withoutAsset`(segmented 포함)로 정리.
  T030의 acquisition 부분 GREEN.

**Checkpoint**: US4 완결 — 세그먼트 이어받기가 기기 없는 테스트로 검증. 강제종료 타이밍은
실기기(T037)에서 정상 재개만 확인, 재현 불가분은 findings에 명시.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 전체 회귀, 실기기 검증, 문서.

- [ ] T035 [P] `npm run lint` 클린 확인 — eslint 0 error, `tsc` 통과 (특히
  `DownloadView` 생성 자리 전부, `resume` 시그니처 호출부), 헌법 검사 위반 0
  (`checkSegmentedFile` 포함), prettier. 위반 주입 3종 확인: `SEGMENT_COUNT` 값 변경 →
  T004 실패 / `segmented/transfer.ts`가 `Character` import → `checkSegmentedFile` 실패 /
  `acquisition`이 다른 캐릭터에도 `busy` 반환 → T009 A1 실패.
- [ ] T036 [P] `npm test` 전부 통과 (`test:logic` + `test:ui`, 신규 스위트
  `segmented-plan`·`segmented-transfer`·`concurrent-acquisition` 포함). 003·008·011 회귀
  스위트 GREEN.
- [ ] T037 실기기 검증 (SM-S901N, debug, `EXPO_PUBLIC_APP_ENV=dev`) — quickstart.md
  Q0~Q6 수행:
  - Q0: `expo-file-system` 57 오프셋 쓰기 시그니처 확인 → findings §1
  - Q1·Q2: 여러 캐릭터 동시, 캐릭터별 멈추기, 탭 복귀 전부 복원 (SC-001~003)
  - Q3: 세그먼트 켬/끔 벽시계 대조, HF CDN Range 유지 여부, `SEGMENT_COUNT`·
    `MIN_SEGMENT_BYTES` 실측 판단 → `plan.ts` 주석 갱신 (잠정 → 확정), findings §2·§3
  - Q4: 폴백 완주 (probeRange 강제 unsupported 1회) → findings §4
  - Q5: 세그먼트 이어받기 정상 재개 + 강제종료 "미확인" 명시 → findings §5
  - Q6: `git diff --stat` src/vision 0줄, 008 안내 회귀, 003 지우기, Maestro
    `parallel-model-download.yml` + `download-conflict.yml` PASS → findings §6
- [ ] T038 [P] `.maestro/parallel-model-download.yml` 작성 — 캐릭터 A·B 동시 "준비하기" →
  두 줄에 진행 표시, A "멈추기" → B 계속, 탭 이동/복귀 후 표시 복원. (실기기 Q1·Q2를
  Maestro로.) `scrollUntilVisible`·`accessibilityLabel` 함정 주의 (025 교훈).
- [ ] T039 [P] `specs/026-parallel-model-download/findings.md` 작성 — quickstart.md
  「findings.md 채울 항목」 §1~§7. 미확인 잔여(prod 게이트, release 재확인 판정 —
  새 네이티브 모듈 없으므로 debug 1회로 충분, 012 기준 명시).
- [ ] T040 [P] `docs/roadmap/README.md` 갱신 — 10번 항목에 `(026 — 동시 다운로드 +
  세그먼트 병렬 + 폴백 + 세그먼트 이어받기)` 표기, 「과제별 상세」 10번에 구현 결과 문단
  (023·024·025 항목과 같은 형식).
- [ ] T041 `specs/003-character-model-files/contracts/acquisition.md`의 「한 번에 하나
  (FR-020)」 절에 각주 추가 — "026이 이 제약을 해제한다. `specs/026-parallel-model-download/contracts/concurrent-acquisition.md`
  참조." (003 스펙 본문은 역사적 기록으로 유지, 확장 관계만 링크.)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 선행 없음. T001→(T002·T003 병렬).
- **Foundational (Phase 2)**: Setup 완료 후. T004→T005, T006→T007, T008 (T001에 의존).
  플랜/스토리지/포트는 서로 독립이라 (T004·T005), (T006·T007), (T008) 세 갈래 병렬 가능.
- **US1 (Phase 3, P1)**: Foundational 완료 후. **US2·US3·US4에 의존하지 않는다** — 세그먼트
  없이 폴백 경로만으로 동작 (T021이 아직 없어도 `expoDownloadPort`가 기존 `createDownloadTask`
  를 쓰면 됨 — T021 전에는 세그먼트 시도 자체가 없음). **MVP.**
- **US3 (Phase 4, P1)**: Foundational 완료 후. **US1과 독립** (파일이 거의 겹치지 않음 —
  `transfer.ts`·`expo-port.ts` vs `acquisition.ts`·`download-view.ts`·UI). T023이
  `acquisition.ts`를 건드리므로 US1의 T015와 같은 파일 → **US1 이후** 권장.
- **US2 (Phase 5, P2)**: US3 완료 후 (세그먼트 코어가 있어야 병렬을 논함).
- **⚠️ T022 (`expoRangeFetchPort`)는 실기기 Q0(오프셋 쓰기 시그니처 확인)이 선행이다.**
  quickstart.md Q0를 T022 착수 전에 1회 돌려 `expo-file-system` 57 `File`의 부분/오프셋
  쓰기 시그니처를 findings §1에 확정한다. 순수 코어(T004·T005)와 스토리지·포트 계약
  (T006~T008), US1 전체는 이 확인과 무관하게 진행 가능 — Q0는 US3의 T020(순수 조립) 이후,
  T022(기기 fetch 구현) 이전에만 있으면 된다.
- **US4 (Phase 6, P2)**: US3 완료 후 (세그먼트 재개는 세그먼트 코어에 딸림). US1의
  `acquisition.ts`·`App.tsx`도 건드림 → US1 이후.
- **Polish (Phase 7)**: 원하는 US 전부 완료 후.

### User Story Dependencies

- **US1 (P1)**: Foundational만. 독립 MVP.
- **US3 (P1)**: Foundational만. US1과 논리적으로 독립하나 `acquisition.ts` 파일 충돌로
  US1 뒤에 둔다.
- **US2 (P2)**: US3에 의존 (`runSegmented` 필요).
- **US4 (P2)**: US3에 의존 (`runSegmented` 재개 경로) + US1의 `acquisition.ts`/`App.tsx`
  변경 위에 얹힘.

### Within Each User Story

- 테스트를 먼저 쓰고 FAIL 확인 (헌법 MUST).
- 타입 → 순수 함수 → 포트 구현 → `acquisition.ts` 배선 → UI → `App.tsx`.
- 스토리 완결 후 다음 우선순위로.

### Parallel Opportunities

- Setup: T002·T003 병렬.
- Foundational: (T004·T005) ∥ (T006·T007) ∥ (T008) — 서로 다른 파일.
- US1 테스트: T009·T010·T011·T012 병렬 (다른 파일).
- US3 테스트: T019 단독. US2 테스트: T024·T025 병렬.
- US4 테스트: T029·T030 병렬.
- Polish: T035·T036·T038·T039·T040 병렬 (T037 실기기는 단독).

---

## Parallel Example: User Story 1

```bash
# US1 테스트를 먼저 함께 작성 (전부 FAIL 확인):
Task: "__tests__/models/concurrent-acquisition.test.ts — A1~A11"
Task: "__tests__/models/acquisition.test.ts 수정 — A12·A13"
Task: "__tests__/models/download-view.test.ts 수정 — V1~V9"
Task: "__tests__/ui/character-list.test.tsx 수정 — 여러 줄 진행 표시"

# 그다음 구현 (파일 의존순, 병렬 아님):
# T013(types) → T014(download-view) → T015(acquisition) → T016(UI) → T017(App) → T018(vision 무변경 확인)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001~T003)
2. Phase 2: Foundational (T004~T008) — 순수 코어·스토리지·포트 계약
3. Phase 3: US1 (T009~T018) — 여러 캐릭터 동시 다운로드
4. **STOP & VALIDATE**: `npm run test:logic` + `test:ui` 통과. 세그먼트 없이 동시
   다운로드가 폴백(= 기존 단일 스트림) 경로로 동작. 실기기 Q1·Q2만 먼저 돌려도 됨.
5. 데모: "이제 캐릭터 여러 개를 한꺼번에 준비할 수 있다."

### Incremental Delivery

1. Setup + Foundational → 코어 준비
2. US1 → 동시 다운로드 (MVP, 세그먼트 없이 폴백 경로)
3. US3 → 세그먼트 코어 + 폴백 판정 (아직 속도 이득 없음, 회귀 방지)
4. US2 → 세그먼트 병렬 실제 동작 (속도 이득)
5. US4 → 세그먼트 이어받기
6. Polish → 실기기 Q0~Q6, findings, 로드맵

### 왜 US3(P1)가 US2(P2)보다 먼저인가

세그먼트 코어(`runSegmented`)를 도입하면서 폴백을 같이 넣지 않으면, HF CDN이 Range를
거부하는 순간 모델을 아예 못 받는 회귀가 생긴다. US3 = "세그먼트 코어 + 항상 안전한 폴백",
US2 = "그 코어가 실제로 병렬로 빨라짐". US3 없이 US2를 하면 안전망 없이 새 경로를 켜는 것.

---

## Notes

- [P] = 다른 파일, 선행 없음.
- 커밋 메시지는 한국어 (헌법 「개발 방식」).
- `main`에서 작업 금지 — 이미 `026-parallel-model-download` 브랜치.
- 위반 주입으로 방어 검증 (007~025 공통 관례) — T035에 3종 명시.
- `src/vision/acquisition.ts`는 한 줄도 고치지 않는다 (SC-009) — T018·T036에서 `git diff` 확인.
- 새 네이티브 모듈 없음 → debug 실기기 1회로 충분, release 재확인 불필요 (012 기준).
- `expo-file-system` 57 `File` 오프셋 쓰기 시그니처는 T-Q0(실기기)에서 먼저 확인 — 순수
  코어(T004·T005)는 이것과 무관하게 진행 가능, `expoRangeFetchPort`(T022) 전에 확정.
