# Research: 백그라운드 자동 쓰기 완주 (079)

실측 표와 관찰은 설계 문서(`docs/superpowers/specs/2026-10-13-bg-auto-write-completion-design.md`)에 있다. 여기에는 계획에 필요한 결정만 둔다.

## R1 — 왜 스레드 수인가

- **Decision**: 백그라운드 조립의 본문·사진 모델에 `n_threads: 2`를 준다(안드로이드).
- **Rationale**: `llama.rn` 0.12의 안드로이드 경로(`cpp/jsi/JSIParams.cpp` `set_best_cores`)는 `n_threads`가 없으면 `min(4, 코어 수)` 스레드를 최고 주파수 코어에 `strict_cpu`로 고정한다. 잡으로 도는 프로세스는 `/background` cpuset(SM-S901N: CPU 0–2)에 있어 고정이 실패하고 4스레드가 3코어를 나눠 쓴다 — ggml 스레드풀의 폴링·장벽이 넘친 스레드를 기다리며 헛돈다. 실측: 4스레드 26분 7초, 3스레드 2분 36초·3분 33초, 2스레드 3분 42초.
- **Alternatives considered**: 3(이 기기의 백그라운드 코어 수에 맞춤 — 코어가 적은 기기에서 다시 넘친다, 소유자가 2로 정함) · `cpu_mask`/`cpu_strict: false`만 주기(스레드 수가 그대로면 넘침이 남는다, 재지 않았다) · 포그라운드 서비스(새 네이티브 코드·Play 신고, 이 세션에서 실기기 확인 불가) · 분량 축소(3스레드 조건에서 시간을 가르지 못했다).

## R2 — 「백그라운드 조립인가」를 어디서 아는가

- **Decision**: `wiring.ts` `createAppPipeline()`의 `deps.lockOwner`(020 L5)를 그대로 `selectBackend()` → `onDeviceBackend()`로 넘긴다. 새 플래그를 만들지 않는다.
- **Rationale**: `runAutoDiaryTask`가 이미 `makePipeline(resolution, { lockOwner: "background" })`로 조립한다. `manual` 실행도 같은 줄을 지나므로 FR-004가 코드 변경 없이 성립한다. 잠금 주체와 추론 조립 주체를 한 변수로 두면 둘이 어긋날 수 없다(FR-006).
- **Alternatives considered**: 모듈 전역 스위치(같은 프로세스에 홈·백그라운드 파이프라인이 함께 산다 — 값이 샌다) · `AppState`로 판정(헤드리스에서 믿을 수 없다 — 024, 수동 실행을 같은 값으로 돌린다는 결정과도 어긋난다) · `task.ts`가 스레드 수를 직접 넘기기(잠금 주체와 따로 놀 수 있고 `schedule/`이 추론 값을 알게 된다).

## R3 — 판정을 어디에 두는가

- **Decision**: 새 순수 파일 `src/inference/assembly.ts` — `AssemblyOwner`, `BACKGROUND_THREADS = 2`, `inferenceThreadsFor(owner, platform)`, `generationTimeoutFor(owner)`.
- **Rationale**: 값과 갈래를 한 파일에 두면 「어느 조립이 무엇을 받는가」가 한 곳에서 읽히고, 기기 없이 네 조합을 검사할 수 있다. `on-device.ts`(48KB)에 더 쌓지 않는다.
- **Alternatives considered**: `llama-port.ts`에 두기(사진 모델도 같은 값을 쓰는데 `llama-port`는 본문 엔진의 자리다) · `sampling.ts`에 전부 두기(샘플링이 아니다 — 시간 한도 상수만 기존 `GENERATION_TIMEOUT_MS` 옆에 둔다).

## R4 — 주체의 타입과 플랫폼 읽기

- **Decision**: `AssemblyOwner`를 `inference/`에 따로 정의한다(`"screen" | "background"`). 플랫폼은 `on-device.ts`의 `isIOS()`를 써서 `"ios" | "android"`로 옮긴다.
- **Rationale**: `inference/`가 `schedule/lock.ts`나 `app/platform.ts`를 import하면 의존 방향이 뒤집힌다(`app/`·`schedule/`이 `inference/`를 쓴다). 유니온의 글자가 같으므로 `wiring.ts`가 한 변수를 두 자리에 넘길 때 `tsc`가 구조로 맞춰 본다 — 한쪽을 넓히면 오류다.
- **Alternatives considered**: `lock.ts`의 타입을 import(방향 위반) · 공용 타입 파일 신설(유니온 하나에 과하다).

## R5 — 해제 경합을 어디서 막는가

- **Decision**: `llama-port.ts`의 `createLlamaEngine()`이 도는 호출을 기억하고 `unload()`가 그 종료를 기다린다. 기다림에 한도를 두지 않는다.
- **Rationale**: 경합의 양쪽(`completion`과 `release`)이 모두 이 파일에서만 불린다 — 호출부(`runWithTimeout`의 `void engine.stop()`, `generate()`의 `finally`, `load()`의 「다른 캐릭터면 먼저 닫는다」, 화면의 `release()`)가 어떤 순서로 부르든 한 곳에서 막힌다. 한도를 두면 한도가 찬 순간 계산 중인 컨텍스트를 놓는다 — 크래시 보고서의 모양 그대로다(`llama_decode` 중인 스레드와 `lm_ggml_backend_blas_free` 중인 스레드).
- **Alternatives considered**: `runWithTimeout()`이 `stop()` 뒤 `run`의 종료를 기다리게 하기(호출부 하나만 막는다 — `askWithTimeout`·`load()`·`release()` 경로가 남는다) · 타이머가 멈춘 시간을 세지 않게 하기(경합 자체는 남는다, 범위 밖).
- **확인한 것**: `llama.rn`의 `stopCompletion()`은 플래그를 세울 뿐 생성 종료를 기다리지 않는다(AGENTS 「`stopCompletion()`은 거부시키지 않는다」— `interrupted: true`로 정상 resolve). 그래서 「기다림」은 우리가 들고 있는 `completion()`의 Promise로 한다.
- **코드 리뷰에서 더 읽은 것**: 네이티브 해제는 이미 그 컨텍스트의 작업을 기다리지만 **5초까지만**이다(`cpp/jsi/JSITaskManager.cpp` `TASK_WAIT_TIMEOUT`) — 「한도를 두면 그 순간 놓는다」는 가정이 아니라 지금 라이브러리가 하는 일이고, 시뮬레이터의 「복귀 5초 만에 종료」가 그 값이다. 또 한 컨텍스트에 호출이 겹치면 네이티브가 뒤의 것을 「Context is busy」로 곧바로 거부한다(`RNLlamaJSI.cpp` `throwIfContextBusy`) — 홈이 `prepare()`를 기다리지 않으므로 「도는 생성」은 한 칸이 아니라 집합으로 든다.

## R6 — 사진 엔진에도 같은 경합이 있는가

- **Decision**: `vision-port.ts`는 바꾸지 않는다.
- **Rationale**: 소스 확인 — `caption()`은 `context.completion()`을 `await`하고, `on-device.ts`의 사진 읽기 루프는 각 `caption()`을 기다린 뒤에만 다음으로 가거나 `unload()`한다. 사진 단계에는 한도 타이머가 없다. `stop()`은 플래그만 세우고 루프가 끝난 뒤 닫는다. 스펙의 가정(Assumptions 넷째 줄)이 성립한다.
- **남는 것**: 화면이 `captionDay()` 도중 다른 `load()`를 부르는 경로는 화면이 막는다(018 E1) — 이 기능이 넓히지 않는다.

## R7 — 시간 한도 600초를 어디에 두고 어떻게 넘기는가

- **Decision**: `BACKGROUND_GENERATION_TIMEOUT_MS = 600_000`을 `sampling.ts`의 `GENERATION_TIMEOUT_MS` 옆에 둔다. `onDeviceBackend()`가 `generationTimeoutFor(owner)`를 `createOnDeviceBackend()`의 기존 `timeoutMs` 인자로 넘긴다.
- **Rationale**: `createOnDeviceBackend()`는 이미 `timeoutMs`를 받는다(테스트가 주입한다) — 새 통로가 없다. 제목 질문은 같은 값을 한 번 더 쓴다(061 규칙 그대로). 600은 SM-S901N `dumpsys jobscheduler`의 `runtime_min_guarantee_ms=600000`에서 왔다.
- **Alternatives considered**: 백그라운드는 한도 없음(멈추지 않는 생성을 끊을 수단이 OS 한도뿐이 된다) · 안드로이드만(소유자가 두 플랫폼 모두로 정함 — 한도는 속도를 바꾸지 않는 안전장치다).
- **참고**: 정상 동작 확인의 `LIVENESS_TIMEOUT_MS`는 화면만 부르며 건드리지 않는다.

## R8 — 무엇으로 검사하는가

- **Decision**: (a) 순수 함수 값 테스트 — `inferenceThreadsFor`·`generationTimeoutFor`·`contextParams`·`visionContextParams`, (b) 대역 컨텍스트로 `unload()` 순서 테스트, (c) 소스 계약 — `wiring.ts`가 잠금에 쓰는 변수를 `selectBackend`에 넘기는가, `select.ts`·`on-device.ts`가 주체를 흘리는가, `task.ts`에 수동 전용 조립 갈래가 없는가.
- **Rationale**: 실제 `llama.rn`은 jest에 없다(지연 import). 전달 사슬 전체를 값으로 돌릴 수 없으므로 끝(인자를 만드는 순수 함수)과 이음매(소스)를 따로 잠근다 — 066 `projectorOnGpu`와 같은 방식이다. 소스를 읽을 때는 주석을 먼저 걷는다(AGENTS 「테스트 작성의 함정」).
- **위반 주입**: 기다림 제거 · 화면 조립에 `n_threads` 싣기 · 화면 조립에 600초 주기 — 치환이 적용됐는지 먼저 단언한다.

## R9 — 실기기에서 무엇을 보는가

- **Decision**: 안드로이드는 설계 문서의 D2 절차(화면 끔 + 강제 deep idle + 배터리 예외)로 강제 잡을 돌려 시도 기록·일기·알림·`Attached ggml threadpool (n_threads=…)` 로그를 본다. iOS 시뮬레이터는 수동 실행 도중 홈으로 내려 (a) 180초 넘기고 600초 안에 복귀, (b) 600초 넘겨 복귀 두 번을 본다.
- **Rationale**: 수정 전 같은 절차의 값이 있다(안드로이드 4스레드 26분 7초, iOS 210초 복귀에서 종료). 수동 실행은 백그라운드 조립이라 600초 한도를 탄다 — (a)는 수정 전이면 죽던 구간이다.
- **한계**: 강제 잡·살아 있는 프로세스·한 기기. OS가 스스로 깨운 잡, 배터리 예외 없는 상태, 실제 iPhone은 보지 않는다(로드맵에 남는다).
