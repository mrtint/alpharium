# Research: 추론 런타임 속도 최적화 (123)

## R1. flash attention
- Decision: `flash_attn_type`을 `initLlama`에 명시하는 안(`on`/`off`)을 기본값 `auto`와 기기에서 비교한다. 채택은 실측 뒤.
- Rationale: 0.12.9 `JSIParams.cpp`가 `flash_attn_type` 문자열("on"/"off"/그 외=auto)을 읽는다. 기본 `auto`는 llama.cpp가 백엔드 지원에 따라 켠다 — CPU 백엔드도 지원하므로 이미 켜져 있을 수 있다. 문서(`types.ts`)는 「GPU 장치에서만 권장」이라 적는다. 우리는 `n_gpu_layers: 0`(CPU).
- Alternatives: 기본 유지(변경 없음). 이득이 오차 안이면 이쪽이 결론이다.
- 확인법: 개발 중 `logcat`/Xcode 콘솔의 llama.cpp 로그(「Flash Attention was auto, set to …」)로 `auto`의 실제 결과를 먼저 읽는다.

## R2. 1→2턴 재사용 (실측으로 정정됨, 2026-11-22)
- 처음 가설(0.12.9는 요청마다 KV를 지워 상태 파일이 필요하다)은 틀렸다. SM-S901N 실측: 제목 호출의 `timings` — 새로 읽은 프롬프트 52토큰, `cache_n` 약 850 → 같은 컨텍스트의 다음 호출은 공통 접두어 KV를 이미 재사용한다. 상태 파일(`save/load_state_path`·`saveSession`)은 넣지 않는다.
- iPhone 14 실측: iOS 화면 쓰기의 조각 경로는 제목(`ask`)에서도 프롬프트를 짧은 접두어부터 `n_predict: 1`로 미리 읽는다. llama.rn은 새 프롬프트가 KV보다 짧으면 그 뒤를 버려, 제목 호출이 프롬프트(약 1,440자 서식)와 본문을 처음부터 다시 읽었다(제목 12.7초 — 안드로이드 3.9초).
- Decision: `ask()`는 미리 읽기를 건너뛰고 첫 호출이 곧바로 조각 생성(`warm`). 새로 읽을 토큰은 질문 수십 개뿐이라 092의 앱 밖 진행 공백 보호가 필요한 큰 읽기가 아니다.

## R3. KV q8_0과 메모리 기준
- Decision: `cache_type_k`/`cache_type_v: "q8_0"`. 양자화 V 캐시는 FA 필요(llama.cpp 규칙) — 함께 켜야 하는지 기기에서 확인한다.
- 메모리를 읽는 자리: 이미 쓰는 `getBackendDevicesInfo()`(`llama.rn`, on-device.ts가 지연 import로 호출) 결과의 `maxMemorySize`. 새 의존성(`expo-device`)을 들이지 않는다. 어느 장치 항목이 기기 RAM을 뜻하는지는 기기에서 값을 찍어 확인한다(모르면 q8_0을 켜지 않는다 — 원칙 V).
- 기준 2 GiB: 로드맵이 정한 값, 사람이 정한 값이다(실측 아님).
- 결과(2026-11-22, SM-S901N): q8_0은 프롬프트 읽기를 느리게 해(39 → 31 t/s) 1+2턴이 짧아지지 않았고 PSS 차이는 흔들림 안이었다 → 미채택(quickstart).

## R4. 측정 도구(제품 밖)
- t/s·1+2턴 시간: 개발 중 `logcat`/콘솔의 llama.cpp 타이밍 줄과 앱 로그 시각. 최고 RAM: 안드로이드 `dumpsys meminfo` 폴링, iOS Xcode Instruments/`devicectl`·lldb. 제품 코드에는 넣지 않는다(원칙 IV).
- 시험 경로: SM-S901N은 Metro로 띄우거나 main 빌드(옛 JS 내장 APK는 새 a1과 맞지 않음, `adb reverse --list` 먼저). iPhone 14는 122 개발 서명 Release 빌드 위에 변경 빌드.

## R5. 기존 경계와의 충돌
- 079: `unload()`는 `inFlight` 생성이 끝난 뒤 `release()` — 상태 저장/복원 호출도 `tracked()`로 감싸 inFlight에 든다.
- 106: `load()` 직렬화 — 변경 없음.
- 092: 제목 구간 박동 — `ask()` 경로 그대로 `onToken`/`onChunk`가 나오는지 테스트로 확인.
- 099: 본문 흔적 파일은 백업 대상이 아닌 곳에(캐시 디렉터리).
