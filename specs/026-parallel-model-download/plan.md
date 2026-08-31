# Implementation Plan: 모델 병렬·동시 내려받기

**Branch**: `026-parallel-model-download` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/026-parallel-model-download/spec.md`

## Summary

003 FR-020의 "한 번에 하나" 제약을 풀어 **여러 캐릭터 모델을 동시에** 받게 하고, 서버가
지원하면 **한 파일을 여러 구간으로 나눠 병렬로** 받아 단일 모델 수신 시간을 줄인다. 서버가
구간 요청을 지원하지 않으면 조용히 기존 단일 스트림으로 폴백한다. 세그먼트 이어받기를 직접
구현한다(각 구간의 받은 바이트를 상태 파일에 남기고 남은 구간부터 재개).

**기술 접근** (brainstorming 확정, 방식 3+1 조합):

- **세그먼트 코어는 순수 함수 + 얇은 포트로 분리** — 구간 나누기·재개 계산·진행 병합·완료
  판정을 `src/models/segmented/plan.ts`에 순수 함수로 두고, 한 구간을 받아 파일 오프셋에 쓰는
  `RangeFetchPort` 하나만 기기에 닿게 한다.
- **`DownloadPort`(003 계약) 뒤에서 세그먼트/폴백을 고른다** — `expo-port.ts`의
  `expoDownloadPort()`가 Range 지원을 탐지해 세그먼트 경로 또는 기존 `createDownloadTask`
  폴백을 선택한다. `acquisition.ts`·`download-view.ts`는 전송 방식을 모른다.
- **동시성은 슬롯 → 맵** — `acquisition.ts`의 `running: Character | null`을
  `Map<Character, handle>`으로 바꾼다. `busy` 거부는 **같은 캐릭터 중복 요청**을 막는 용도로
  유지한다.
- **`src/vision/acquisition.ts`는 코드 변경 0** — `DownloadPort` 계약 뒤에서 세그먼트 병렬과
  폴백을 얻는다(011이 003 포트를 그대로 쓰는 구조 덕분).

## Technical Context

**Language/Version**: TypeScript 5.x, React Native 0.86 / Expo SDK 57 (헌법 원칙 I 확정
기준선)

**Primary Dependencies**: `expo-file-system` 57 (`File.createDownloadTask` — 폴백 경로만;
`File` 쓰기 API — 세그먼트 조각 기록), 표준 `fetch`(Range 요청). **새 네이티브 모듈 없음.**

**Storage**: `Paths.document/models/state.json` — 003의 `ModelState` 스키마를 확장한다
(`SegmentedResume` 추가). 모델 파일과 부분 파일은 003과 동일한 자리.

**Testing**: jest 두 프로젝트 (`test:logic` 순수 로직 `.ts` / `test:ui` 화면 `.tsx`).
계약 테스트는 소스 선언을 `readFileSync`로 직접 읽어 검사(007·009·012 관례). 실기기는
Maestro (`run-device-tests.mjs` `FLOWS` 등록 필요).

**Target Platform**: Android (실기기 SM-S901N / Galaxy S22 검증 기준). i8mm 없는 기기와
무관 — 추론 경로를 건드리지 않는다.

**Project Type**: Mobile app (단일 저장소, `src/` + `App.tsx` + `__tests__/` + `.maestro/`).

**Performance Goals**: 세그먼트 병렬 켬 쪽이 끔 쪽보다 완료 벽시계 시간이 **더 짧거나
길지 않다**(SC-004, 같은 실행 대조). 절대 목표치는 두지 않는다 — 원칙 IV(속도를 재서
비교·저장하지 않는다)와 부딪히지 않도록, 이 대조는 실기기 1회 관찰이며 코드에 남기지 않는다.

**Constraints**:

- 진행 상태 타입(`DownloadProgress`)은 `{ character, fraction }` 둘로 고정 — 세그먼트
  정보가 들어갈 자리 없음(원칙 III·IV).
- 열리는 동시 연결 ≤ (동시 모델 수 × `SEGMENT_COUNT` 상수).
- 새 네이티브 모듈 없음 → debug 실기기 1회로 충분, release 재확인 불필요(012 기준).

**Scale/Scope**: 캐릭터 5 + 비전 모델 1 = 최대 6개 동시 다운로드. 파일당 0.8~1.6GB.
새 파일 ~4개(`segmented/plan.ts`, `segmented/transfer.ts`, `segmented/types.ts`,
`expo-port.ts`에 `expoRangeFetchPort()` 추가). 수정 파일 ~5개(`acquisition.ts`,
`download-view.ts`, `port.ts`, `types.ts`, `App.tsx`, `CharacterListScreen.tsx`).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| 원칙                                     | 게이트                                            | 이 기능에서                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. 온디바이스가 제품이다**             | 추론 위치·미리 만든 응답 저장 여부                | 해당 없음 — 모델 **파일 전송**만 다룬다. 추론 경로·GGUF·프롬프트·샘플링 무변경. ✅                                                                                                                                                                                                                                                                    |
| **II. 화자는 휴대폰**                    | 프롬프트·판정 갈래                                | 해당 없음 — `diary/` 미변경. ✅                                                                                                                                                                                                                                                                                                                       |
| **III. 모델은 캐릭터다**                 | 모델 식별자·크기·구성이 사용자 화면에 노출되는가  | **위험 지점.** 세그먼트 계획은 자산키·바이트만 다루고 `Character`를 import하지 않는다(FR-019). 진행률은 `fraction` 하나로만 밖에 나간다(FR-016). 전송 방식은 `expo-port.ts`에 격리되어 화면·판정 계층이 모른다(FR-017). 계약 테스트가 타입·화면 문자열에서 구간 정보 부재를 검사(SC-008). ✅                                                          |
| **IV. 측정 장치를 제품에 들이지 않는다** | 속도·처리량을 재서 비교·채점·저장하는 코드        | **위험 지점.** 세그먼트 속도·구간별 처리량을 재는 코드를 넣지 않는다. SC-004의 켬/끔 대조는 실기기 1회 관찰이며 `quickstart.md`에만 있고 코드에 없다. `DownloadProgress`에 `elapsed`·`bytesPerSecond`가 들어갈 자리 없음(003 불변식 유지). 네이티브 fetch가 주는 헤더(`Content-Length` 등)는 세그먼트 계획 계산에만 쓰고 밖으로 내보내지 않는다. ✅   |
| **V. 관측된 사실과 추측을 구분**         | 모르는 값을 지어내는가 / 임계값을 코드가 정하는가 | `SEGMENT_COUNT`·`MIN_SEGMENT_BYTES`는 **사람이 정한 `readonly` 상수**로 못박는다(FR-012·013, 012·021·023 전례). 코드가 파일 크기·네트워크로 개수를 정하지 않는다. Range 지원 여부는 실측으로 확인하고 모르면 폴백(지어내지 않음). 상수 초기값은 잠정이며 실기기로 확정(003 `SPACE_HEADROOM` 전례). 탭 복귀 시 백분율을 0%로 채우지 않는다(FR-006). ✅ |
| **로스터**                               | "사용자가 고른 캐릭터의 모델만 내려받는 구조"     | `prepareAll()`·`allAssets()` 같은 일괄 경로를 만들지 않는다(FR-008). 동시 다운로드는 사용자가 각각 누른 캐릭터만. ✅                                                                                                                                                                                                                                  |
| **개발 방식**                            | 계약 먼저, 테스트 먼저, 커밋 메시지 한국어        | Phase 1에서 계약 3개 작성. 계약 테스트를 구현 전에 쓴다. ✅                                                                                                                                                                                                                                                                                           |

**게이트 결과: 통과.** 위험 지점(III·IV)은 설계로 방어되며 Complexity Tracking에 justify할
위반이 없다.

### Phase 1 이후 재점검 (2026-08-31)

Phase 1 산출물(data-model.md, contracts/, quickstart.md) 작성 후 다시 본다.

| 원칙         | Phase 1에서 확인된 것                                                                                                                                                                                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **III**      | `Segment`·`SegmentPlan`·`SegmentedResume`·`RangeSupport`가 전부 data-model.md의 「안쪽 값」 표에 있고 화면에 안 나간다. `RangeFetchPort`는 `AssetKey`만 받는다(`Character` 없음). `checkSegmentedFile`(research §9)가 `segmented/*`의 `Character`·`roster` import를 차단. ✅                 |
| **IV**       | `DownloadProgress` 무변경 확인(data-model.md). `mergeProgress`가 `fraction` 하나만 낸다. SC-004 벽시계 대조는 quickstart.md에만 있고 코드에 없다. `checkSegmentedFile`이 속도 어휘(`elapsed`·`speed` 등) 차단. 계약 테스트 C17이 이를 검사. ✅                                               |
| **V**        | `SEGMENT_COUNT=4`·`MIN_SEGMENT_BYTES=8MiB`가 `readonly` 리터럴, 계약 테스트 C14가 소스에서 잠금(C15 위반 주입). `planSegments`가 파일 크기로 개수를 정하지 않는다 — `count` 인자는 상수에서 온다. `probeRange`가 애매하면 `unsupported`(폴백). `plan.ts` 주석에 "잠정, 실기기 확정" 명시. ✅ |
| **로스터**   | `segmented/plan.ts`·`transfer.ts`에 `planAll()` 없음(segmented-transfer.md 명시). `acquisition.ts`는 여전히 캐릭터별 `prepare`. ✅                                                                                                                                                           |
| **008 계약** | contracts/download-view.md가 008의 네 불변식을 표로 대조하며 전부 유지. ✅                                                                                                                                                                                                                   |
| **003 계약** | contracts/concurrent-acquisition.md가 003의 실패 갈래를 안 지우고 `busy` 의미만 좁힘을 명시(A12·A13). ✅                                                                                                                                                                                     |

**재점검 결과: 통과.** 설계가 게이트를 흔들지 않았다.

## Project Structure

### Documentation (this feature)

```text
specs/026-parallel-model-download/
├── plan.md              # 이 파일
├── research.md          # Phase 0 — Range/CDN 실측 계획, 세그먼트 재개 설계 근거
├── data-model.md        # Phase 1 — SegmentPlan, SegmentedResume, 동시 슬롯, 타입 확장
├── quickstart.md        # Phase 1 — 실기기 검증 시나리오
├── contracts/
│   ├── segmented-transfer.md   # 세그먼트 코어(순수) + RangeFetchPort 계약
│   ├── concurrent-acquisition.md # acquisition.ts 동시성 확장 계약
│   └── download-view.md         # download-view.ts active 복수화 계약 (008 확장)
├── checklists/
│   └── requirements.md  # 완료됨 (/speckit-specify)
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/models/
├── acquisition.ts        # [수정] running: Character|null → Map<Character, handle>.
│                         #        prepare/pause/busyWith 시그니처 확장. 공간 판정 = 여유
│                         #        - (받는 중인 것들의 남은 용량 합).
├── download-view.ts      # [수정] resolveDownloadView(active[], rejection). noticeFor의
│                         #        "거부가 아직 참인가"를 배열 대응으로.
├── port.ts               # [수정] RangeFetchPort 추가. DownloadPort.resume 시그니처를
│                         #        resume(key, url, state, onProgress)로 확장(url 추가 —
│                         #        세그먼트 재개가 로스터 url을 다시 필요로 한다).
│                         #        vision/acquisition.ts는 resume()를 부르지 않으므로
│                         #        FR-027 무영향(start()만 씀). state에 SegmentedResume
│                         #        또는 003 DownloadPauseState가 담기는 것을 주석으로
│                         #        명시(타입은 이미 unknown). ModelPorts에 range 추가 —
│                         #        VisionAcquisitionPorts는 ModelPorts를 spread하지 않는
│                         #        독립 타입이라 무영향.
├── types.ts              # [수정] DownloadView.active: DownloadProgress[]. SegmentedResume
│                         #        타입 추가(안쪽 값). ModelState 확장은 storage.ts.
├── storage.ts            # [수정] ModelState에 segmented: SegmentedResume[] 추가.
│                         #        with/without 헬퍼 추가. PausedDownload와 상호배타.
├── readiness.ts          # [수정] ReadinessInput에 segmentedResume?: 추가. 있으면
│                         #        partial + resumable: true (FR-023).
├── expo-port.ts          # [수정] expoDownloadPort()가 Range 탐지 → 세그먼트/폴백 선택.
│                         #        expoRangeFetchPort() 신규. __DEV__ 게이트 강제 폴백
│                         #        경로(SC-004 켬/끔 대조, Q3·Q4 공용). fraction ↔
│                         #        TransferProgress 어댑터를 여기서 소유(runSegmented는
│                         #        fraction만 내고, 이 파일이 { bytesWritten:
│                         #        fraction*total, totalBytes: total }로 되돌린다 — 003
│                         #        fractionOf 재사용, 바이트 누출 없음).
└── segmented/            # [신규 경계]
    ├── types.ts          # SegmentPlan, Segment, SegmentedResume, RangeSupport.
    ├── plan.ts           # 순수: planSegments(totalBytes) → Segment[].
    │                     #        remainingSegments(resume) → Segment[].
    │                     #        mergeProgress(perSegmentBytes, totalBytes) → fraction.
    │                     #        isComplete(perSegmentBytes, plan) → boolean.
    └── transfer.ts       # RangeFetchPort를 받아 구간들을 병렬 수신. Range 미지원 판정 →
                          #        { fallback: true } 반환(호출자가 단일 스트림으로).

src/vision/
└── acquisition.ts        # [변경 없음 — FR-027, SC-009] git diff 0줄이어야 한다.

App.tsx                   # [수정] progress: DownloadProgress|null →
                          #        Map<Character, DownloadProgress>. 탭 복귀 시 busyWith()
                          #        배열 전부 복원. onPause(character).
src/ui/CharacterListScreen.tsx  # [수정] busy 판정을 view.active.find(...)로. 여러 줄에
                          #        동시에 진행 표시·멈추기. onPause(character).

__tests__/models/
├── segmented-plan.test.ts        # [신규] 순수 함수 — 구간 나누기·재개·병합·완료.
├── segmented-transfer.test.ts    # [신규] RangeFetchPort 대역 — 병렬 수신·폴백 판정.
├── concurrent-acquisition.test.ts # [신규] 동시 prepare, 같은 캐릭터 거부, 캐릭터별 pause.
├── acquisition.test.ts           # [수정] 기존 "한 번에 하나" 테스트를 "같은 캐릭터만
│                                 #        거부"로 갱신.
├── download-view.test.ts         # [수정] active 복수화.
└── storage.test.ts               # [수정] segmented 필드 왕복.

__tests__/ui/character-list.test.tsx  # [수정] 여러 줄 동시 진행 표시.

.maestro/
└── parallel-model-download.yml   # [신규] run-device-tests.mjs FLOWS에 등록.

scripts/constitution-rules.ts     # [수정] checkSegmentedFile — src/models/segmented/가
                                  #        diary/*·Character·models/roster를 import하지
                                  #        못하게. 속도 측정 어휘 차단.
```

**Structure Decision**: 003이 세운 `src/models/` 구조를 유지하고 그 안에 `segmented/`
하위 경계를 새로 만든다(020의 `src/schedule/`, 021의 `src/onboarding/` 전례). 순수 판정은
`segmented/plan.ts`에, 기기 통로는 `expo-port.ts`의 `RangeFetchPort` 구현에. `acquisition.ts`
와 `download-view.ts`는 003/008 경계를 유지한 채 시그니처만 확장한다.

## Complexity Tracking

> Constitution Check 위반 없음 — 이 절은 비워 둔다.

세그먼트 병렬 + 이어받기 직접 구현은 범위가 크지만, 이는 사용자가 명시적으로 요청한 것
(brainstorming Q1=C, Q4=B)이며 헌법 원칙을 어기지 않는다. 순수 함수 분리로 대부분이 기기
없이 검증되므로 "한 축을 깊게 판다"(개발 방식)의 실패 신호에 해당하지 않는다 — 축은
"전송"과 "동시성" 둘이고, 둘 다 계약으로 경계가 그어져 있다.
