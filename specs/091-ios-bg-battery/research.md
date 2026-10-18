# Research — 091

## R1. CPU 한도
「CPU 48s over 60s」(090 `cpu_resource_fatal`) — 프로세스의 모든 스레드 합. 스레드 1이면 CPU ≈ 벽시계. **Decision**: 스레드 1 + 호출마다 `쉼 = 호출 시간 × 0.5`(평균 ≈ 67%). 한 호출이 길면 쉼 전에 48초를 넘으므로 호출을 짧게 자른다(R2). 비율·조각 크기는 사람이 정한 상수, 실측으로 조정.

## R2. 본문 조각 생성
**Decision**: `getFormattedChat(messages, null, {jinja: true})`로 만든 서식 프롬프트 `P`에 생성분 `G`를 이어 `completion({prompt: P + G, n_predict: CHUNK, grammar, sampling})`을 되풀이한다. 끝: 조각 결과 `ending`이 `eos`이거나(→ eos), 누적이 `SAMPLING.n_predict` 이상(→ length), 그 밖 갈래(interrupted·context)는 그대로 반환. llama.rn은 같은 컨텍스트에서 앞 프롬프트와 공통 접두사의 KV를 재사용한다(018이 기대는 원리) — 조각마다 새로 읽는 것은 직전 조각뿐. 결과 텍스트는 원문(`text`)을 쓴다(서식 프롬프트 경로는 `content` 파서를 타지 않을 수 있다 — 둘 중 내용이 있는 쪽, 기존 규칙). **Alternatives**: 토큰 콜백(금지), `n_predict` 한 번(한도 초과).
- 위험: 조각마다 샘플링이 다시 시작 — 판정 통과율을 실기기로 본다. 프리필 한 번(약 900토큰)은 자를 수 없다 — 실측.

## R3. 깬 요청 알기
expo 패치의 처리기가 `task.identifier`를 `UserDefaults.standard`의 `pocketlog.bgWakeIdentifier`에 쓰고(종전대로 JS 태스크 실행), 로컬 모듈의 동기 함수 `wakeKind()`가 읽는다(값이 배터리 식별자면 `battery`, 기존이면 `power`, 없으면 null). 태스크는 시작 때 한 번 읽는다. **Alternatives**: expo 모듈에 정적 값(우리 모듈이 expo 모듈을 import할 수 없음), JS 이벤트(번들 로드 전 유실).

## R4. 요청 둘
`scheduleWorker`가 두 `BGProcessingTaskRequest`를 낸다(같은 `earliestBeginDate`; 배터리: `requiresExternalPower=false`·`requiresNetworkConnectivity=false`). `stopWorkerOnce`·`isWorkerRunning`은 둘 다. AppDelegate는 두 식별자를 같은 처리기로 등록. Info.plist는 config plugin이 배터리 식별자를 더한다(expo 플러그인과 같은 방식, 중복 방지). 둘이 함께 깨면 080 등록부가 둘째를 `already-running`으로.

## R5. 배터리 한도
`BATTERY_GENERATION_TIMEOUT_MS = 1_800_000`(30분, 사람이 정한 값 — 실제 상한은 iOS 예산 만료).

## R6. 문구 (clarify)
FR-008 — SC-001 확인 시에만 `permBatteryHintIos`를 085 문구로.
