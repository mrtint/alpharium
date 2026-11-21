# Research: 추론 런타임 속도 최적화 (123)

## R1. flash attention
- Decision: `flash_attn_type`을 `initLlama`에 명시하는 안(`on`/`off`)을 기본값 `auto`와 기기에서 비교한다. 채택은 실측 뒤.
- Rationale: 0.12.9 `JSIParams.cpp`가 `flash_attn_type` 문자열("on"/"off"/그 외=auto)을 읽는다. 기본 `auto`는 llama.cpp가 백엔드 지원에 따라 켠다 — CPU 백엔드도 지원하므로 이미 켜져 있을 수 있다. 문서(`types.ts`)는 「GPU 장치에서만 권장」이라 적는다. 우리는 `n_gpu_layers: 0`(CPU).
- Alternatives: 기본 유지(변경 없음). 이득이 오차 안이면 이쪽이 결론이다.
- 확인법: 개발 중 `logcat`/Xcode 콘솔의 llama.cpp 로그(「Flash Attention was auto, set to …」)로 `auto`의 실제 결과를 먼저 읽는다.

## R2. 1→2턴 재사용
- Fact: 본문(`run`)과 제목(`ask`)은 이미 한 컨텍스트다(해제는 `unload()` 한 번). `completion()`은 슬롯 시작에서 그 시퀀스 KV를 지운다(`rn-slot.cpp` 「No loaded state, start fresh」) — 접두어 재사용은 상태를 불러올 때만 일어난다. `cache_prompt`·`cache_reuse`는 0.12.9에 없다.
- Candidates: (a) `completion()` 파라미터로 `save_state_path`/`load_state_path`(타입은 병렬 요청용 `NativeParallelCompletionParams`라 일반 `completion()`이 받는지 불명) (b) `LlamaContext.saveSession`/`loadSession`(JSI에 있음)으로 본문 직후 저장 → 제목 전에 불러오기 (c) 아무것도 안 함.
- Decision: 스파이크로 (a)·(b) 중 동작하는 것과 이득을 재고, 이득이 없거나 불안정하면 (c) — 까닭과 수치를 quickstart에 기록한다. 이 결정은 구현 전 T-스파이크 결과로 닫는다.
- Rationale: 제목 구간은 사진 있는 날 약 4.6초(AGENTS 100)이고 그 중 프롬프트(수천 토큰) 재읽기가 비중이 클 수 있다. 상태 저장·복원 I/O가 그보다 싸야 이득이다.

## R3. KV q8_0과 메모리 기준
- Decision: `cache_type_k`/`cache_type_v: "q8_0"`. 양자화 V 캐시는 FA 필요(llama.cpp 규칙) — 함께 켜야 하는지 기기에서 확인한다.
- 메모리를 읽는 자리: 이미 쓰는 `getBackendDevicesInfo()`(`llama.rn`, on-device.ts가 지연 import로 호출) 결과의 `maxMemorySize`. 새 의존성(`expo-device`)을 들이지 않는다. 어느 장치 항목이 기기 RAM을 뜻하는지는 기기에서 값을 찍어 확인한다(모르면 q8_0을 켜지 않는다 — 원칙 V).
- 기준 2 GiB: 로드맵이 정한 값, 사람이 정한 값이다(실측 아님).

## R4. 측정 도구(제품 밖)
- t/s·1+2턴 시간: 개발 중 `logcat`/콘솔의 llama.cpp 타이밍 줄과 앱 로그 시각. 최고 RAM: 안드로이드 `dumpsys meminfo` 폴링, iOS Xcode Instruments/`devicectl`·lldb. 제품 코드에는 넣지 않는다(원칙 IV).
- 시험 경로: SM-S901N은 Metro로 띄우거나 main 빌드(옛 JS 내장 APK는 새 a1과 맞지 않음, `adb reverse --list` 먼저). iPhone 14는 122 개발 서명 Release 빌드 위에 변경 빌드.

## R5. 기존 경계와의 충돌
- 079: `unload()`는 `inFlight` 생성이 끝난 뒤 `release()` — 상태 저장/복원 호출도 `tracked()`로 감싸 inFlight에 든다.
- 106: `load()` 직렬화 — 변경 없음.
- 092: 제목 구간 박동 — `ask()` 경로 그대로 `onToken`/`onChunk`가 나오는지 테스트로 확인.
- 099: 본문 흔적 파일은 백업 대상이 아닌 곳에(캐시 디렉터리).
