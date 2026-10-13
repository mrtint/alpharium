# Implementation Plan: 백그라운드 자동 쓰기 완주 — 스레드 수와 생성 중 해제 경합

**Branch**: `079-bg-auto-write-threads` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/079-bg-auto-write-threads/spec.md`

## Summary

백그라운드 자동 쓰기가 안드로이드에서 26분 걸리던 주원인은 추론 스레드 4개가 백그라운드 cpuset의 작은 코어 3개를 나눠 쓰는 것이었다(설계 문서 실측). 세 가지를 한다:

1. **조립 주체로 모델을 여는 값을 가른다** — 백그라운드가 조립한 쓰기는 안드로이드에서 본문·사진 모델을 스레드 2로 연다. 화면 조립과 iOS는 값을 싣지 않는다.
2. **조립 주체로 생성 시간 한도를 가른다** — 화면 180초(그대로), 백그라운드 600초. 플랫폼으로 가르지 않는다.
3. **도는 생성이 끝나기 전에 컨텍스트를 놓지 않는다** — 엔진의 `unload()`가 멈춤을 보내고 생성 종료를 기다린 뒤 놓는다(iOS 시뮬레이터 SIGSEGV의 경로).

조립 주체는 `wiring.ts`가 이미 받는 `lockOwner`를 그대로 흘린다. `task.ts`는 바뀌지 않는다.

## Technical Context

**Language/Version**: TypeScript 5.x (Expo SDK 57, React Native 0.86)

**Primary Dependencies**: `llama.rn` ^0.12.8(`initLlama`의 `n_threads`, `completion`/`stopCompletion`/`release`) — 새 의존성 없음

**Storage**: 없음(새 저장 필드·파일 없음)

**Testing**: jest 두 프로젝트(`logic`/`ui`) — 이 기능은 `logic`만. 실기기는 dev 빌드(SM-S901N)와 iOS 시뮬레이터, 맥의 Metro

**Target Platform**: Android(스레드 값·한도), iOS(한도·해제 순서)

**Project Type**: mobile-app (단일 저장소)

**Performance Goals**: 안드로이드 백그라운드 잡 1회가 10분(잡 실행 최소 보장) 안에 저장까지 — 수정 전 실험값 약 3분 40초(스레드 2)

**Constraints**: 측정 코드를 제품에 넣지 않는다(원칙 IV) · 전경의 `initLlama` 인자는 바이트가 같아야 한다 · 계약(005 `engine.md`)을 먼저 고친다 · release 빌드는 만들지 않는다

**Scale/Scope**: 소스 5개 파일 수정 + 새 파일 1개, 계약 문서 1개 개정 + 새 계약 1개, 테스트 7개 파일(새 파일 2개)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I. 온디바이스 추론 | 통과 | 추론 위치·GGUF·프롬프트·샘플링 값은 바뀌지 않는다. 스레드 수와 시간 한도는 샘플링 파라미터가 아니다(같은 입력에 같은 분포) |
| II. 화자는 휴대폰 | 해당 없음 | 프롬프트·판정을 건드리지 않는다 |
| III. 캐릭터는 모델 위에 | 통과 | 스레드 수가 화면에 닿지 않는다. `LlamaContext`를 밖으로 내보내지 않는 경계(`llama-port.ts`)는 그대로다 |
| IV. 측정 장치를 들이지 않는다 | 통과 | 확인은 라이브러리가 찍는 로그·078 시도 기록·일기 `timing`으로 한다. 코드가 코어 수·속도를 읽어 값을 정하지 않는다(FR-005·FR-013) |
| V. 실측과 추측의 구분 | 통과 | 상수 둘(2, 600초)에 실측 근거와 한계(한 기기·조건당 1~2회)를 적는다. iOS 스레드 값은 재지 않았으므로 주지 않는다. 완료 전에 dev 실기기에서 본다 |
| 개발 방식 | 통과 | 계약 먼저(005 `engine.md` 개정 + 새 계약) → 테스트 먼저 → 구현. 기능 브랜치·한국어 커밋 |

**Post-design re-check (Phase 1 뒤)**: 위와 같다. 새 파일 `src/inference/assembly.ts`는 순수 판정이고 `src/inference/` 안에 있어 계층 경계 검사(`scripts/constitution-rules.ts`)에 새 예외가 필요 없다.

## Project Structure

### Documentation (this feature)

```text
specs/079-bg-auto-write-threads/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── assembly.md        # 조립 주체 → 모델을 여는 값·시간 한도, 해제 순서
├── checklists/requirements.md
└── tasks.md               # /speckit-tasks가 만든다
```

### Source Code (repository root)

```text
src/
├── inference/
│   ├── assembly.ts        # 새 파일 — AssemblyOwner, BACKGROUND_THREADS, inferenceThreadsFor(), generationTimeoutFor()
│   ├── sampling.ts        # BACKGROUND_GENERATION_TIMEOUT_MS = 600_000 (GENERATION_TIMEOUT_MS 옆)
│   ├── llama-port.ts      # contextParams(), llamaEngine(threads?), 도는 생성 추적 + unload() 순서
│   ├── on-device.ts       # onDeviceBackend(…, owner), visionContextParams(), visionSupport(threads?)
│   └── select.ts          # selectBackend(…, owner) → onDeviceBackend로 전달
└── app/
    └── wiring.ts          # lockOwner를 selectBackend에도 넘긴다(같은 변수)

specs/005-diary-generation/contracts/engine.md   # n_threads 줄·E2 정리 규칙·시간 한도 개정

__tests__/
├── inference/
│   ├── assembly.test.ts   # 새 파일
│   ├── llama-port.test.ts # contextParams, unload 순서
│   ├── on-device.test.ts  # visionContextParams, 소스 계약(주체 → 스레드·한도)
│   ├── engine.test.ts     # 주체별 시간 한도(본문·제목, 가짜 타이머)
│   └── select.test.ts     # 소스 계약(주체 전달)
├── app/wiring.test.ts     # 소스 계약(잠금 주체와 같은 변수)
└── schedule/task-assembly-source.test.ts   # 새 파일 — 소스 계약(조립이 한 곳, 수동 전용 갈래 없음)
```

**Structure Decision**: 기존 계층을 그대로 쓴다. 판정은 `src/inference/assembly.ts`(순수), 기기에 닿는 자리는 지금처럼 `llama-port.ts`(본문)와 `on-device.ts`의 `visionSupport()`(사진) 둘이다. `src/schedule/task.ts`·`src/vision/`·`src/ui/`는 바뀌지 않는다.

## 설계 요점 (research.md의 결정을 옮김)

- **주체의 타입**: `src/inference/assembly.ts`의 `AssemblyOwner = "screen" | "background"`. `src/schedule/lock.ts`의 주체 유니온과 글자가 같다 — `wiring.ts`가 같은 변수를 두 곳(잠금·백엔드 선택)에 넘기므로 어긋나면 `tsc`가 잡는다. `inference/`가 `schedule/`을 import하지 않는다.
- **플랫폼**: `on-device.ts`의 `isIOS()`(066)를 그대로 써서 `"ios" | "android"`로 옮겨 `inferenceThreadsFor()`에 넘긴다. jest(node)에서는 `react-native` 해석이 실패해 안드로이드로 떨어진다(066 선례).
- **키를 싣지 않는다**: `contextParams(modelPath, threads?)`·`visionContextParams(modelPath, threads?)`가 `threads === undefined`이면 `n_threads` 키 자체를 만들지 않는다. 두 함수는 순수라 기기 없이 검사한다.
- **해제 순서**: `createLlamaEngine()`이 `inFlight`(지금 도는 호출의 Promise)를 든다. `run`·`ask`·`prewarm`이 그것을 세우고 끝나면 비운다(자기 것일 때만). `unload()`는 ① `context`·`openFor` 비움 → ② `inFlight`가 있으면 `stopCompletion()` 뒤 그 Promise의 종료를 기다림(거부도 종료다) → ③ `release()`.
- **`runWithTimeout()`·`askWithTimeout()`은 모양을 바꾸지 않는다.** 받는 `timeoutMs` 값만 주체에 따라 달라진다.
- **사진 엔진은 바꾸지 않는다**: `vision-port.ts`에는 한도 타이머가 없고 `caption()`을 하나씩 기다린 뒤 `unload()`한다(research R6).

## Complexity Tracking

위반 없음.
