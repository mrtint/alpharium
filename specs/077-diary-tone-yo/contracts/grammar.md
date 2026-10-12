# Contract: 로마자 차단 문법 (077)

원본: my-ollama `e192c9b` `results/hand-prompt/v5/grammar.gbnf`, `prompts.json`의 `grammar` 필드.

- **GR1**: `src/inference/sampling.ts`가 `ROMAN_LETTER_BLOCK_GRAMMAR = "root ::= [^A-Za-z]*"`(줄바꿈 없음)를 내보낸다. 이 문자열이 저장소에서 이 한 곳에만 있다.
- **GR2**: `llama-port.ts`의 본문 생성(`run`)과 제목 생성(`ask`) 호출이 `completion()`에 `grammar: ROMAN_LETTER_BLOCK_GRAMMAR`를 넘긴다(두 호출이 같은 값).
- **GR3**: 프리웜 호출(`n_predict: 1`)은 `grammar`를 넘기지 않는다.
- **GR4**: `desktop-server.ts`의 `serverRequestFor()`가 `grammar: ROMAN_LETTER_BLOCK_GRAMMAR`를 싣는다 — 온디바이스 값과 같다(FR-005, 기존 동일성 테스트에 항목 추가).
- **GR5**: 결과 경계는 그대로 — `complete()`는 여전히 `{ text, ending }`만 돌려준다(원칙 IV).
