# Tasks: 일기 프롬프트 교체 — 날의 갈래 넷과 따로 묻는 제목

**Input**: `specs/061-diary-prompt-swap/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)

**Tests**: 헌법 「계약을 먼저 정하고 테스트를 먼저 쓴다」 — 각 이야기에서 테스트를 먼저 고친다.

**순서 원칙**: 사용자 지시대로 **US4(isEcho)를 가장 먼저** 한다 — 꼬리가 길어지기 전에 낭독을 막는다.

## Phase 1: Setup

- [ ] T001 기준선 기록: `npx jest` 결과(216 스위트 통과)와 기대값 `expected.json`(스크래치, `R16.u1`·`R17.x1` 10행)을 research.md R6에 맞춰 확인

## Phase 2: Foundational — US4 되뱉기 판정 수선 (가장 먼저)

**Goal**: 지시 절을 옮긴 글은 `echo`, 따옴표 안의 쓰라고 준 말만 옮긴 글은 통과 (contracts/echo.md EC1~EC5)

- [ ] T002 [US4] `__tests__/diary/acceptance.test.ts`에 EC2(꼬리의 지시 절 포함 → echo)·EC3(‘ ’·공백 차이 → echo)·EC4(따옴표 안 말만 → 통과)·EC1 회귀 테스트를 먼저 쓰고 실패를 확인
- [ ] T003 [US4] `src/diary/acceptance.ts`의 `isEcho`를 지시서 §5 코드(`flat`·`IMPERATIVE`·`echoPieces`, 조각 하한 `MIN_ECHO_LENGTH + 4`)로 교체, 주석에 「고르기까지가 값, 그다음은 불리언」 명시
- [ ] T004 [US4] 위반 주입: `echoPieces`의 조각 비교를 빼면 T002가 실패하는지, A-7(갈래 넷)이 살아 있는지 확인

## Phase 3: US1·US2·US3 — 프롬프트 문안 교체 (prompt.ts)

**Goal**: 10케이스 프롬프트·`instructionLines`·제목 질문이 원본과 글자 단위로 같다 (contracts/prompt.md PR1~PR5)

- [ ] T005 [P] [US1] `__tests__/diary/particle.test.ts`에 `quoteParticleFor`(받침 → 「이라」, 없음·판정 불가 → 「라」) 테스트, `src/diary/particle.ts`에 구현
- [ ] T006 [US1] `__tests__/diary/prompt-e2sn.test.ts`를 새 문안으로 고쳐 쓴다 — 머리 다섯 줄 글자 그대로(호칭 줄 「너는 '금동이'라 불리는, …」), 제목 지시 없음, 언어 줄 둘째 문장, 때 이름 넷(「오후부터 밤까지 찍혔다」·「오후에 담은 장면:」), 「자리는 한 곳에 남았다.」, `SCENE_LIMIT` 없음, 본 장면 없는 날 머리줄·`S_DAY_OPEN` 없음
- [ ] T007 [US2] [US3] 같은 파일에 꼬리 네 갈래(①`TAIL` / ② 0장 / ③ 캡션 없음 / ④ `unknown` 「사진이 있었는지도 나는 모른다」) + 하루 안 끝남 B 문장 + `titleQuestion` 두 갈래 + `instructionLines` 순서(data-model.md) 테스트
- [ ] T008 [US1] `__tests__/diary/prompt.test.ts`의 E2SN 의존 단언(기록 문장·제목 지시·P-7 「모든 줄이 프롬프트에 있다」에서 제목 질문 제외)을 새 문안으로 고쳐 쓴다
- [ ] T009 [US1] `src/diary/prompt.ts`: `E2_RULES`·`E_TONE`→새 머리(`H2` 다섯 줄, 다섯째가 톤 자리), `E2_TITLE` 삭제, 언어 줄 둘째 문장, 호칭 조사 `quoteParticleFor`
- [ ] T010 [US1] `src/diary/prompt.ts`: `partOf`(때 이름 넷)·사진 때 구간·캡션 줄머리·한 곳 자리 문장·`SCENE_LIMIT` 제거·`S_VISION_PARTIAL`은 ①에서만
- [ ] T011 [US2] [US3] `src/diary/prompt.ts`: 날의 갈래 판정(data-model.md 표)·`noSceneTail()`(`X_WHY`/`X_MINE`/`X_TAIL`)·본 장면 없는 날의 머리줄·`S_DAY_OPEN` 생략·`titleQuestion()` export·`instructionLines()` 순서, E2SN 경로에서 `visionLimitLines` 제외
- [ ] T012 [US1] 스크래치 바이트 대조: alpharium `buildPrompt`/`instructionLines`/`titleQuestion` 10케이스 ↔ `expected.json` 전부 일치 (quickstart ①)
- [ ] T013 [US1] 다른 테스트 정리: `__tests__/inference/generate.test.ts` 등 옛 문안을 박은 곳, 진단 프롬프트 미리보기(PP1은 실제 `buildPrompt`라 자동 추종) 확인

## Phase 4: US1 — 제목 두 번째 호출

**Goal**: 판정 통과 뒤에만 제목을 묻고 한 줄이면 「제목\n\n본문」 (contracts/title-ask.md TA1·TA2)

- [ ] T014 [US1] `__tests__/inference/engine.test.ts`·`llama-port.test.ts`에 `ask()` 테스트(메시지 셋·샘플링 동일·`{ text, ending }`만·컨텍스트 없으면 length) 먼저
- [ ] T015 [US1] `__tests__/inference/on-device.test.ts`에 2단계 테스트: 통과 뒤에만 ask, 질문 = `titleQuestion`, 한 줄 eos ≤40자 → 합침, 여러 줄/잘림/시간 초과/예외/41자 → 본문만, ask 뒤 그만두기 → `interrupted`, 판정 거부면 ask 안 부름
- [ ] T016 [US1] `src/inference/engine-port.ts`에 `ask(prompt, body, question, limits)` 계약 추가, `src/inference/llama-port.ts` 구현
- [ ] T017 [US1] `src/diary/title.ts`의 `MAX_TITLE_LENGTH` export(값 불변), `src/inference/on-device.ts`에 제목 호출(`askWithTimeout`)·합치기
- [ ] T018 [US1] 테스트 대역 엔진(`__tests__/inference/*`)에 `ask` 추가 — `tsc`가 짚는 곳 전부

## Phase 5: Polish & 검증

- [ ] T019 `npm test` 전체 — 새로 깨진 것 0(기준선 실패 0), `prompt-e2sn`·`prompt.test`는 고쳐 썼음을 확인
- [ ] T020 `npm run lint`(eslint·tsc·`check:constitution`·prettier)
- [ ] T021 계약 넷: prompt-signature·acceptance A-7·title·018 접두사 같은 배열(소스)
- [ ] T022 my-ollama `gen-prompts.ts`로 공식 바이트 대조(SC-①) — 결과를 `prompts.json`에 쓰므로 끝나면 my-ollama 작업 트리를 되돌린다
- [ ] T023 SC-④ 기기 등가 재측정(my-ollama, llama-server + GGUF가 있을 때) — 합격선 여덟 줄
- [ ] T024 SC-⑤ 실기기 dev 6편 — 갈래 섞어 생성, 제목·본문 그대로 기록
- [ ] T025 문서: `AGENTS.md`에 061 결론(지금도 유효한 것만), quickstart.md 끝에 실기기 결과, `src/diary/prompt.ts` 주석의 문안 출처 갱신

## Dependencies

- T002→T003→T004 (US4)가 Phase 3보다 먼저.
- Phase 3 안: T005 ∥ T006~~T008(테스트) → T009~~T011 → T012~T013.
- Phase 4는 T011(`titleQuestion`) 뒤.
- Phase 5는 전부 뒤.

## Parallel

- T005와 T006~T008(다른 파일). T014와 T015(다른 테스트 파일).

## Implementation Strategy

MVP = US4 + 프롬프트 교체(Phase 2~3, 바이트 일치). 그다음 제목 분리(Phase 4) — 제목 지시를 머리에서 지우는 순간 제목이 안 붙으므로 Phase 3·4는 같은 PR에 담는다.
