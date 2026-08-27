# Contract: `GenerationEngine.prewarm()`

FR-001~004, FR-006a, FR-007, FR-008, 헌법 원칙 I·IV·E1의 계약이다.

## 불변식

**E6. `prewarm()`은 글을 남기지 않는다.** 생성된 토큰은 어느 경로로도
밖에 나가지 않는다 — `DiaryDraft`에도, 화면에도, 로그에도. 프리워밍의
산출물은 KV 캐시뿐이며, 그것은 코드가 값으로 들고 다니는 것이 아니라
네이티브 컨텍스트 내부에만 존재한다.

**E7. `prewarm()`은 `run()`과 같은 모양으로 보낸다.** `messages` 배열 +
`jinja: true`를 쓰고, 평문 `prompt`를 쓰지 않는다. 채팅 템플릿이
`run()`과 다르게 둘러지면 접두사의 토큰 열이 달라지고, 그러면 KV
캐시가 빗나간다 — 실패가 아니라 **효과가 조용히 사라지는 것**이므로
가장 늦게 발견되는 종류의 버그다.

**E8. `prewarm()`은 `n_predict: 1`을 쓴다.** 0이 아니다 — llama.rn에서
0이 안전하게 동작하는지 확인되지 않았다(원 문서 근거). 목적은 프리필이지
생성이 아니므로 최소값을 쓴다.

**E9. `load()` 없이 부르면 조용히 넘어간다.** `context === null`이거나
`openFor !== character`(다른 캐릭터가 열려 있거나 아무것도 안 열려
있음)면 아무 일도 하지 않고 즉시 resolve한다 — 부르는 쪽이 순서를
지키지 않은 것이며, 이 함수가 대신 `load()`를 부르지 않는다(그러면
E1을 어길 위험이 이 함수 안으로 들어온다 — 순서는 항상 호출자 책임).

**E10. 실패해도 던지지 않는다(E5 연장).** 네이티브 `completion()` 호출이
실패하면 잡아서 버린다. 프리워밍 실패는 알릴 것이 없다 — 다음 `run()`이
그냥 느릴 뿐 틀리지 않는다(FR-007).

**E11. 반환값이 없다(원칙 IV).** `Promise<void>`다. 결과를 담을 자리를
만들지 않는 것 자체가 방어다 — 담을 자리가 없으면 소요 시간도 성공
여부도 실을 수 없다.

## 계약 시그니처

```ts
interface GenerationEngine {
  // ...기존 메서드...
  prewarm(character: Character): Promise<void>;
}
```

`src/diary/prompt.ts`의 `promptPrefix(character)`를 프리필 대상으로
쓴다 — [prompt-prefix.md](prompt-prefix.md) 계약과 맞물린다.

## `on-device.ts`가 노출하는 `prepare()`

**E12. `prepare()`는 컨텍스트를 열어 둔 채로 끝난다.** `generate()`의
`finally { unload() }`와 달리, `prepare()`는 unload하지 않는다 — 열어
두어야 뒤이은 `generate()`의 `load()`가 `warm: true`로 재사용하고 KV
캐시가 살아 있다.

**E13. `prepare()`의 `load()`가 실패하면 조용히 끝난다.** 모델이 준비되지
않았거나 로드에 실패해도 예외를 던지지 않고 그냥 반환한다 — 사용자가
아직 "쓰기"를 누르지 않았으므로 이 시점에 오류를 보여줄 화면이 없다.
실제 실패는 사용자가 "쓰기"를 눌렀을 때 `generate()`의 기존 `load()`
실패 경로가 정직하게 알린다.

**E14. `release()`는 열려 있으면 닫고, 없으면 아무 일도 하지 않는다.**
`engine.unload()`를 그대로 위임한다 — 새 정리 로직을 만들지 않는다.

## 사진 읽기와의 순서 (E1 연장)

**E15. `prepare()`를 부르는 화면 쪽은 사진 읽기가 끝난 뒤에만
불러야 한다(사진이 있는 날인 경우).** 이 계약 파일은 `prepare()` 자체가
이 순서를 강제하지 않는다는 것을 명시한다 — `prepare()`는 사진을 읽는
중인지 모른다. 순서를 지키는 책임은 화면(`DiaryHomeScreen.tsx`)에
있다(기존 `generate()`의 E1 처리와 같은 소재지 — "두 엔진이 서로를
모르므로 호출자가 순서를 지킨다").

**E16. 사진 읽기가 진행 중일 때 "쓰기"가 눌리면, 진행 중인 읽기를
취소하거나 병행하지 않고 완료를 기다린다**(FR-006a, Clarification
2026-08-26). 화면은 사진 읽기의 `Promise`를 들고 있다가 "쓰기" 핸들러가
그 `Promise`를 `await`한 뒤 `generate()`를 부르는 방식으로 이를
만족한다 — 새로운 취소 신호나 조율 로직을 추가하지 않는다.

## 테스트로 확인해야 하는 것

- `llama-port.test.ts`:
  - `prewarm`이 `run`과 같은 모양(`messages`+`jinja`+`n_predict: 1`)으로
    보내는지 (E7·E8)
  - `prewarm`이 아무것도 반환하지 않는지 (E11)
  - `load()` 없이 부르면 네이티브를 건드리지 않고 조용히 끝나는지 (E9)
  - `completion()`이 실패해도 던지지 않는지 (E10)
- `on-device.test.ts`:
  - `prepare()` 뒤 `engine.unload()`가 불리지 않았는지 (E12)
  - `prepare()` 뒤의 `generate()`가 `engine.load()`를 다시 부르지
    않는지(네이티브 적재 호출 횟수로 확인) — 재사용 확인
  - `generate()`는 `prepare()`가 있었든 없었든 끝나면 여전히
    `unload()`하는지 (기존 E2 유지 확인)
  - `prepare()`의 `load()` 실패가 예외를 던지지 않는지 (E13)
  - `release()`가 열린 것을 닫고, 안 열려 있으면 아무 일도 하지
    않는지 (E14)
- 위반 주입: `prewarm()`이 실수로 `{ text }`를 반환하도록 고쳐보고
  타입 검사(`tsc`)가 잡는지 확인 — 계약 테스트가 아니라 타입 시스템이
  1차 방어선임을 확인한다(007·009·012의 관례 — jest는 타입을 지운다).
- `pipeline.test.ts`: `PipelineInput.seen`이 `runStages()`를 거쳐
  `deps.backend.generate()`의 세 번째 인자로 그대로 전달되는지, `seen`을
  안 주면 기존 두 인자 호출과 동일하게 동작하는지(회귀 없음) —
  `/speckit-analyze` F1이 발견한 "화면이 미리 읽은 `seen`이 파이프라인을
  거치지 않고는 실제 백엔드에 닿을 수 없다"는 구조적 문제의 해소를
  검증한다.
