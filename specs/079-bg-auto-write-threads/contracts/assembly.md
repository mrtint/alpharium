# Contract: 조립 주체가 정하는 값과 해제 순서 (079)

005 `contracts/engine.md`의 「모델을 여는 값」·「시간 한도」·E2를 고치는 근거 문서다. 둘이 어긋나면 이 문서가 최신이고 `engine.md`를 맞춘다.

낱말: 스펙의 「모델을 내린다」는 여기의 「컨텍스트를 놓는다」(`release()`)이고, 스펙의 「도는 생성」은 엔진이 돌리고 있는 `completion()` 호출 하나다.

## A. 조립 주체 → 모델을 여는 값·시간 한도

자리: `src/inference/assembly.ts`(순수). 값의 표는 [data-model.md](../data-model.md).

| ID | 규칙 |
| --- | --- |
| A1 | `inferenceThreadsFor("background", "android")`만 `BACKGROUND_THREADS`(2)를 준다. 나머지 세 조합은 `undefined`다 |
| A2 | `BACKGROUND_THREADS`는 사람이 정한 상수이고 선언 옆 주석에 실측(날짜·기기·수치)과 한계가 있다. 이 파일은 기기의 코어 수·상태를 읽지 않는다(`hardwareConcurrency`·`Platform`·`AppState`·`require` 없음) |
| A3 | `generationTimeoutFor("screen")`은 `GENERATION_TIMEOUT_MS`(180,000), `generationTimeoutFor("background")`은 `BACKGROUND_GENERATION_TIMEOUT_MS`(600,000)다. 플랫폼을 인자로 받지 않는다 |
| A4 | `contextParams(modelPath, threads)`(본문)와 `visionContextParams(modelPath, threads)`(사진)는 `threads === undefined`이면 `n_threads` **키가 없는** 객체를 준다 — 화면 조립의 인자는 이 기능 이전과 깊은 비교로 같다 |
| A5 | 두 함수는 `threads`가 수이면 `n_threads: threads`를 싣고 다른 값(`n_ctx`·`n_gpu_layers`·`model`)은 그대로다 |
| A6 | `onDeviceBackend(loadSignals, loadCustomNames, owner)`는 `owner`로 스레드 수를 **한 번** 정해 본문 엔진과 사진 엔진 **둘 다**에 넘기고, `generationTimeoutFor(owner)`를 `createOnDeviceBackend()`의 `timeoutMs`로 넘긴다. `owner`를 주지 않으면 `"screen"`이다 |
| A7 | `selectBackend(…, owner)`는 받은 `owner`를 `onDeviceBackend()`에 그대로 넘긴다. 데스크톱 어댑터에는 넘기지 않는다 |
| A8 | `createAppPipeline()`은 잠금에 쓰는 주체 변수(`deps.lockOwner ?? "screen"`)를 `selectBackend()`에도 넘긴다 — 주체를 정하는 식이 `wiring.ts`에 하나뿐이다(FR-006) |
| A9 | `task.ts`는 파이프라인을 한 곳에서 `{ lockOwner: "background" }`로 조립하고 `manual`로 가르지 않는다(FR-004 — 지금 코드가 이미 그렇다, 소스 계약으로 잠근다) |

## U. 도는 생성이 끝나기 전에 컨텍스트를 놓지 않는다

자리: `src/inference/llama-port.ts`의 `createLlamaEngine()`.

| ID | 규칙 |
| --- | --- |
| U1 | `run`·`ask`·`prewarm`이 네이티브 호출을 돌리는 동안 엔진은 그 호출을 「도는 생성」으로 든다. 호출이 끝나면(성공·거부) 비운다 |
| U2 | 도는 생성이 있을 때 `unload()`는 `stopCompletion()`을 부르고, **그 생성이 끝난 뒤에만** `release()`를 부른다. 순서는 `stopCompletion` → (생성 종료) → `release`다 |
| U3 | 도는 생성이 끝나지 않으면 `release()`는 불리지 않는다. 기다림에 시간 한도가 없다 |
| U4 | 도는 생성이 없으면 `stopCompletion()` 없이 바로 `release()`한다(지금과 같다) |
| U5 | 도는 생성이 거부로 끝나도 `release()`한다. `stopCompletion()`이 던져도 기다림과 `release()`는 이어진다 |
| U6 | `unload()`는 기다리기 전에 `context`·`openFor`를 먼저 비운다 — 기다리는 동안 온 `run()`은 「열린 것이 없다」로 답하고, `load()`는 새 컨텍스트를 연다(E2·지금의 순서 유지) |
| U7 | `unload()`는 던지지 않는다(E5). `release()`가 실패해도 다음 `load()`가 새로 연다(지금과 같다) |
| U8 | `runWithTimeout()`·`askWithTimeout()`의 모양(멈춤을 보내고 기다리지 않고 `timedOut`으로 끝남)은 바뀌지 않는다 — 한도 판정은 지금처럼 바로 난다 |

## 005 `engine.md`에 옮길 것

- 「모델을 여는 값」 표의 `n_threads` 줄: 「화면 조립은 주지 않음(라이브러리 기본값). 안드로이드 백그라운드 조립은 **2** — **실측**(079, SM-S901N: 4스레드 26분 7초 → 2스레드 3분 42초)」.
- E2에 한 줄: 「정리는 도는 생성이 끝난 뒤에 컨텍스트를 놓는다(079 U2) — 계산 중인 컨텍스트를 놓으면 앱이 죽는다(iOS 시뮬레이터 SIGSEGV)」.
- 「시간 한도」에 주체별 값: 화면 180초, 백그라운드 600초(079 A3).
- 검증 표에 E-11(도는 생성이 끝나기 전에 `release`가 불리지 않는다)·E-12(백그라운드 조립만 `n_threads`를 싣는다).

## 검증

| 무엇 | 어디서 |
| --- | --- |
| A1·A3 | `__tests__/inference/assembly.test.ts` — 네 조합·두 주체 |
| A3의 동작 | `__tests__/inference/engine.test.ts` 「E-3 시간 한도」 — 백그라운드 한도로 조립하면 300초짜리 본문·제목이 끊기지 않고, 화면 한도면 끊긴다(가짜 타이머) |
| A2 | 같은 파일 — `assembly.ts` 소스에 기기를 읽는 낱말이 없다(주석을 걷고 본다) |
| A4·A5 | `llama-port.test.ts`·`on-device.test.ts` — 키 유무와 깊은 비교 |
| A6·A7·A8·A9 | 소스 계약 — `on-device.test.ts`·`select.test.ts`·`wiring.test.ts`·`__tests__/schedule/task-assembly-source.test.ts` |
| U1~U7 | `llama-port.test.ts` — 대역 컨텍스트(끝나지 않는 `completion`, 호출 순서 기록) |
| U8 | 기존 E-3 테스트가 그대로 통과한다 |
| 실기기 | [quickstart.md](../quickstart.md) |
