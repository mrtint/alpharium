# Contract — 제목 두 번째 호출 (061)

## TA1 엔진 포트

```ts
interface GenerationEngine {
  // …기존…
  ask(prompt: string, body: string, question: string, limits: RunLimits): Promise<RunResult>;
}
```

- `llama-port.ts`: `completion({ messages: [{user, prompt}, {assistant, body}, {user, question}], jinja: true, …SAMPLING })`. 토큰 콜백 없음.
  결과는 `{ text, ending }` 둘만(원칙 IV 경계, `run()`과 같은 `endingOf`·`content` 우선).
- 열린 컨텍스트가 없으면 던지지 않고 `{ text: "", ending: length }`.

## TA2 on-device 순서

`buildPrompt → load → run(본문) → judge → (통과) ask(제목) → 합치기 → unload`

- 제목 질문은 `titleQuestion(request, seen)`, `prompt`는 본문 호출과 **같은 문자열**.
- `ask`는 `runWithTimeout`과 같은 방식으로 같은 `timeoutMs` 한도를 받는다. 시간 초과·예외·`eos` 아님 → 제목 없이 본문만(일기를 버리지 않는다).
- `ask` 뒤 `cancel.cancelled`면 `interrupted`(그만두기가 이긴다).
- 합치기는 data-model.md 「제목 합치기」. `writingMs`는 본문 호출 구간 그대로(017 계약 불변).
- 진행 단계 신호(`onStage`)는 늘리지 않는다 — 제목은 「글쓰기」의 일부다.
- 판정 갈래·`DiaryDraft` 모양 불변. `pipeline.ts`의 `extractTitle()`이 지금처럼 뗀다.
