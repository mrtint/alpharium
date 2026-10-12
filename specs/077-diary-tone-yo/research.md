# Research: 077 일기 말투 교체

원본 파일은 my-ollama `e192c9b`의 `results/hand-prompt/v5/`(`user-prompt.md`·`user-instruction.md`·`grammar.gbnf`·`prompts.json`)이다.
작업본 `results/hand-prompt/user-prompt.md`와 `v5/user-prompt.md`는 바이트가 같다(2026-10-12 `diff` 확인).

## R1. 기준선 — `prompt.ts`는 지시서 기준과 같은가

- **Decision**: 그대로 진행. `git diff 7e74aa6 HEAD -- src/diary/prompt.ts`가 비어 있다(2026-10-12).
- **Rationale**: 지시서 §8 「그 뒤로 바뀌었으면 바이트 대조부터」의 조건에 걸리지 않는다.

## R2. 첫 문장 틀을 고르는 값

- **Decision**: `request.signals.date`(`DayDate`, `YYYY-MM-DD`)를 `Date.UTC(y, m - 1, d) / 86_400_000`로 일수로 바꾸고 `% 11`. 음수는 없다(1970 이후).
- **Rationale**: `buildPrompt()`는 「시각·난수를 읽지 않는다」(005 P6)가 계약이다. 요청에 이미 든 날짜만 쓰고 `Date.UTC`는 기기 시간대를 읽지 않는다. 같은 날 다시 쓰기 → 같은 틀(지시서 §3).
- **Alternatives**: `new Date(day)`(문자열 파싱은 UTC 자정이라 결과는 같지만 파서 규칙에 기댄다 — 명시적 `Date.UTC`가 낫다), 날짜 문자열 해시(연속한 날의 고른 분포를 보장하지 못한다), 난수(P6 위반, 다시 쓰기에서 틀이 바뀐다).

## R3. llama.rn에서 `grammar`가 jinja 경로와 함께 듣는가

- **Decision**: `completion({ messages, jinja: true, grammar, ... })`로 넘긴다.
- **Rationale**: 설치본 llama.rn 0.12.9 `src/index.ts`의 `completion()`은 `nativeParams = { ...params }`로 시작하고, jinja 서식 결과가 **문법을 줄 때만**(`if (jinjaResult.grammar)`) 덮어쓴다 — 도구·`response_format`을 쓰지 않는 우리 호출에서는 서식 결과의 문법이 비므로 우리 값이 남는다(소스 읽기, 실측 아님). 타입 `CompletionParams.grammar?: string`.
- **미확인**: 네이티브가 실제로 그 문법으로 샘플링하는지, 속도 — 실기기에서 본다(quickstart).
- **Alternatives**: 프롬프트로만 막기(「영어로 적힌 장면도 한국어로 풀어 쓴다」가 이미 있고 60런 중 2편이 샜다), 출력 후처리로 로마자 제거(지어낸 글을 고치는 일이 되고 원칙상 판정 갈래를 늘리지 않는다).

## R4. 문법 상수의 자리와 값

- **Decision**: `src/inference/sampling.ts`에 `ROMAN_LETTER_BLOCK_GRAMMAR = "root ::= [^A-Za-z]*"`(줄바꿈 없음). `llama-port.ts`의 `complete()`(run·ask 공용)와 `desktop-server.ts`의 `serverRequestFor()`가 읽는다.
- **Rationale**: `sampling.ts`가 「온디바이스·데스크톱이 공유하는 유일한 자리」(AGENTS). v5 `prompts.json`의 `grammar` 필드 값이 줄바꿈 없는 그 문자열이고 my-ollama `run.mjs`는 본문·제목 둘 다에 같은 값을 건다(`followGrammar ?? grammar`, v5에는 `followGrammar` 없음).
- 프리웜(`n_predict: 1`)에는 넣지 않는다 — 생성하지 않으므로 의미가 없고 KV 캐시 키에도 영향이 없다.

## R5. `{reason}` 고정 문장의 갈래

- **Decision**: 한국어 경로에서 사진 `unknown` → 「사진은 몰라요. 사진을 볼 수 있는 길이 막혀 있어요.」, 자리 `unknown` & 사진 `known` 아님 → 「다닌 자리는 몰라요. 사진을 보지 못해 좌표를 물을 수 없어요.」, 자리 `unknown` & 사진 `known` → 「다닌 자리는 몰라요. 사진의 좌표를 읽지 못했어요.」
- **Rationale**: `collect.ts`의 자리 `unknown`은 두 갈래뿐이다 — 사진이 `known`이 아니면 「사진을 보지 못해 좌표를…」, 사진이 `known`이면 좌표 읽기 실패(`사진의 좌표를 읽지 못했다: {오류}`). 갈래를 신호의 `kind`로 가르면 문자열 비교 없이 같은 구분이 된다. 앞의 둘은 v5 측정 문장, 셋째는 새 문장(소유자 결정).
- 사진 `unknown`의 다섯 까닭(권한 확인 실패·부분 허용·거부·차단·묻지 않음·조회 실패)은 프롬프트에서 하나가 된다. 진단 화면은 신호의 까닭을 그대로 보인다(바뀌지 않음).

## R6. `instructionLines()`의 순서

- **Decision**: 지금 순서(머리 → 기록 한계 문장 → 제목 질문 → 언어 줄 → 꼬리)를 유지하고 본 장면 있는 날에도 꼬리를 더한다.
- **Rationale**: v5 `prompts.json`의 순서는 머리 → 언어 → 한계 → 꼬리 → 제목 질문으로 다르지만 `judge()`는 줄 집합으로 비교한다(061·063에서 같은 차이를 집합 대조로 처리). 순서를 바꾸면 기존 테스트만 흔든다.

## R7. 바이트 대조의 틀 자리

- **Decision**: my-ollama `gen-prompts.ts`가 alpharium의 `buildPrompt()`를 부르면 틀은 그 케이스의 날짜로 정해져 v5가 케이스에 맡긴 틀과 다를 수 있다. 꼬리 줄(본문 프롬프트 마지막 줄과 `instructionLines`의 해당 줄)은 `'…'` 안을 같은 자리표로 바꾼 뒤 비교한다. 틀 목록 자체는 v5 블록과의 바이트 대조 테스트로 잠근다.
- Windows 함정(AGENTS 061): `gen-prompts.ts`의 동적 import는 `pathToFileURL`이 필요하다 — 스크래치 복사본에서 돌린다.

## R8. 헤드리스 시간 위험

- **Decision**: 실기기 헤드리스 자동 쓰기를 최소 1회 잰다(SC-005). 넘으면 소유자 보고.
- **Rationale**: 본문 토큰 중앙값 134 → 209(최대 324, `n_predict` 512 안). 042 헤드리스 `writingMs` 137.5초, 024 `quiet` 콜드 158초 — 토큰이 1.5배면 한도 180초에 닿을 수 있다(짐작, 미측정).
