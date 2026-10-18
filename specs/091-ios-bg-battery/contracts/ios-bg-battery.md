# Contract — 091

- **RQ1** 설치된 expo 패치: 식별자 둘, 요청 둘(충전: `requiresExternalPower = true`; 배터리: `false`, 둘 다 네트워크 `false`), 두 식별자 등록, 처리기가 `pocketlog.bgWakeIdentifier`에 식별자를 쓴다. Info.plist 식별자 둘(config plugin, 중복 없음).
- **WK1** `readWakeKind()`: 모듈 없음·예외 → `undefined`; 값 그대로 `power`/`battery`.
- **WK2** 백그라운드 태스크 시작 줄에 `wake`; 수동 실행은 싣지 않는다. 화면 꼬리 「· 충전」/「· 배터리」.
- **PC1** `pacingFor(owner, platform, wake)`: `background`·`ios`·`battery`만 `{ threads: 1, pauseRatio: 0.5, chunkTokens: 32 }`, 그 밖 `undefined`. 배터리 모드 한도 30분.
- **PC2** 쉼: 호출 하나가 `t` ms 걸리면 `t × pauseRatio`를 잔다(주입한 잠자기·시계). 멈춤 신호가 서 있으면 자지 않고 끝낸다.
- **PC3** 조각 생성: 서식 프롬프트 + 누적 생성분, 조각 `n_predict = chunkTokens`, 문법·샘플링 같음, `eos` → 끝, 누적 ≥ `SAMPLING.n_predict` → `length`, `interrupted`·`context`는 그대로. 결과는 `{text, ending}`뿐. 토큰 콜백 없음. 멈춤(`stop()`)은 도는 조각을 `stopCompletion`으로 끊고 다음 조각·쉼을 시작하지 않으며 `interrupted`로 끝난다(FR-004).
- **PC4** 사진 캡션: 장마다 끝나면 쉰다.
- **PC5** pacing이 없으면 종전 경로(바이트 동일 인자).
