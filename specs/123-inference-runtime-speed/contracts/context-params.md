# Contract: 모델을 여는 값과 제목 호출 (123)

- CP1: `contextParams(modelPath, threads?, resident?)`의 출력은 123 이전과 같다 — `flash_attn_type`·`cache_type_k/_v`를 싣지 않는다(실측으로 이득이 없어 미채택, quickstart).
- TR1: `ask()`(제목 호출)는 조각 경로에서 서식 프롬프트 미리 읽기(`n_predict: 1` 토막)를 하지 않고 첫 호출이 곧바로 조각 생성이다. `run()`(본문)은 종전대로 미리 읽는다.
- TR2: 제목 구간에서도 조각이 끝날 때마다 박동한다(092) — `onChunk`·`onToken`은 종전대로.
- TR3: 해제(`unload()`)는 진행 중 생성이 끝난 뒤(079), `load()`는 도착 순서대로(106) — 이 변경이 건드리지 않는다.
