# Tasks: 일기 말투 교체 — `~요`·감상·첫 문장 틀·로마자 차단

**Input**: `specs/077-diary-tone-yo/` — [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/prompt.md](contracts/prompt.md), [contracts/grammar.md](contracts/grammar.md), [quickstart.md](quickstart.md)

**Tests**: TDD 필수(CLAUDE.md `test-driven-development`) — 각 구현 태스크 앞에 실패하는 테스트 태스크가 있다.

**원본**: my-ollama `e192c9b` `results/hand-prompt/v5/user-prompt.md`·`user-instruction.md`·`grammar.gbnf`·`prompts.json`. 문자열은 원본에서 글자 그대로 옮긴다(손으로 다듬지 않는다).

## Phase 1: Setup

- [X] T001 my-ollama v5 「첫 문장 틀」 코드 블록 11줄을 그대로(LF, 끝 줄바꿈 하나) `__tests__/diary/fixtures/v5-first-sentence-frames.txt`에 둔다 — 파일 머리에 출처 주석을 두지 않는다(바이트 대조 기준). 출처는 `prompt-e2sn.test.ts`의 주석에 적는다

## Phase 2: Foundational (첫 문장 틀 — US1·US2가 함께 쓴다)

- [X] T002 `__tests__/diary/prompt-e2sn.test.ts`에 틀 계약 테스트를 쓴다(실패 확인): (a) `buildPrompt()`의 본 장면 꼬리에 든 `'…'`를 연속 11일(2026-01-01~2026-01-11)에서 모아 픽스처 11줄의 집합과 같음(TN3b), (b) `2026-01-01`의 틀이 픽스처의 `floor(Date.UTC(2026,0,1)/86400000) % 11`번째 줄(0부터)과 같음(고르는 규칙 잠금 — 테스트는 내보내지 않은 상수를 참조하지 않고 픽스처로 계산한다). TN3a(시간대 무관)는 T012의 소스 계약이 맡는다
- [X] T003 `src/diary/prompt.ts`에 `FIRST_SENTENCE_FRAMES`(11개, 원본 순서·글자 그대로 — 「`~` 자리는 하나, 문장은 `요`로 끝난다」, 「나」·「내」를 꾸미는 말 안에)와 `frameFor(day: DayDate)`(`Date.UTC(y, m-1, d) / 86_400_000`의 정수 `% 11`, `new Date()`·난수·`getTimezoneOffset` 금지)를 더한다. 주석에 고르는 이유(지시서 §3: 하나면 36/36 같은 첫 문장, 여럿 주면 첫째만 12/12)와 틀을 더할 때의 기준을 적는다

## Phase 3: User Story 1 — 본 장면 있는 날이 감상 있는 `~요` 글 (P1) 🎯 MVP

**Goal**: 캡션이 있는 날의 머리·기록·꼬리가 v5와 같다. **Independent Test**: 캡션 있는 날 `buildPrompt()`가 v5 `rich`/`one` 모양과 같다(틀 자리 제외).

- [X] T004 [US1] `__tests__/diary/prompt-e2sn.test.ts`의 머리·기록·본 장면 꼬리 문안 단언을 v5로 고친다(실패 확인): 머리 2~5행(TN1), 기록 머리줄 「오늘 내가 본 것은 이래요.」, 사진 수 「사진은 {n}이 남았어요. {때} 찍혔어요.」, 자리 여럿/하나/출처(「…떨어져 있어요.」·「자리는 한 곳에 남았어요.」·「…에서 얻은 자리예요.」), 「다녀온 곳은 {이름} 근처였어요.」, `S_PLACES`·`S_VISION_PARTIAL`·`S_TRUNCATED`·`S_DAY_OPEN`의 `~요` 판, 본 장면 꼬리 「이 기록으로 그 하루의 일기를 써라. 첫 문장은 '{틀}'처럼 시작하고, 끝까지 '요'로 끝나는 말투로 쓴다.」(TN2·TN4). v5 `prompts.json`의 `rich`·`one` 케이스와 같은 신호를 만들어 틀 자리를 뺀 전체 문자열을 비교하는 단언을 하나 둔다. 기존 접두사 단언(018 P8 「`buildPrompt()`는 `promptPrefix()`로 시작」·P11 호칭 줄)이 새 머리로 그대로 통과해야 한다(FR-013)
- [X] T005 [US1] `src/diary/prompt.ts`의 `E2_RULES` 세 줄과 `E_TONE.quiet`를 원본 머리 2~5행으로 바꾼다
- [X] T006 [US1] `src/diary/prompt.ts`의 `S_DAY_OPEN`·`S_TRUNCATED`·`S_PLACES`·`S_VISION_PARTIAL`과 `sentenceSignalLines()`의 머리줄·사진 수·사진 없음·자리 여럿/하나/출처/없음·다녀온 곳 문장을 원본 `~요` 문장으로 바꾼다(영어 경로 상수 `DAY_STILL_OPEN` 등은 손대지 않는다)
- [X] T007 [US1] `src/diary/prompt.ts`의 `SCENE_TAIL` 상수를 `sceneTail(day)`(T003의 `frameFor` 사용)로 바꾸고 `tailFor(kind, day)`가 `request.signals.date`를 받게 한다
- [X] T008 [US1] `__tests__/diary/prompt-e2sn.test.ts`·`__tests__/diary/prompt.test.ts`에 본 장면 꼬리가 `instructionLines()`에 들어 있고(TN5) 제목 질문을 뺀 모든 지시문 줄이 `buildPrompt()` 결과에 있다(TN5a, P-7)는 단언을 더한다(실패 확인)
- [X] T009 [US1] `src/diary/prompt.ts`의 `instructionLines()` 한국어 갈래에서 본 장면 있는 날에도 꼬리(`sceneTail(day)`)를 넣는다
- [X] T010 [US1] `__tests__/diary/acceptance.test.ts`에 되뱉기 특성화 테스트를 더한다(판정 로직은 바꾸지 않으므로 「틀대로 시작해도 통과」는 처음부터 초록일 수 있다; 「꼬리 지시 절 낭독은 거부」는 `instructionLines()`로 만든 줄을 넘기므로 T009 이전에는 실패해야 한다 — 이것을 확인한다): 틀대로 시작한 `~요` 본문은 통과, 본 장면 꼬리의 지시 절(「끝까지 '요'로 끝나는 말투로 쓴다」를 포함한 절)을 옮긴 본문은 `echo` 거부(TN5b). 기존 문안 의존 단언(옛 평어 꼬리·머리)을 새 문안으로 고친다

## Phase 4: User Story 2 — 첫 문장이 날마다 다르다 (P1)

**Goal**: 날짜로 틀이 돌고 같은 날은 같다. **Independent Test**: T002의 세 단언.

- [X] T011 [US2] `__tests__/diary/prompt-e2sn.test.ts`에 같은 `request`로 `buildPrompt()`를 두 번 부르면 바이트가 같고, 날짜만 다른 두 요청(연속한 날)은 꼬리의 틀만 다르다는 단언을 더한다(T003·T007 뒤에 초록이어야 함; 실패하면 구현을 고친다)
- [X] T012 [US2] `__tests__/diary/prompt-e2sn.test.ts`의 소스 계약(주석 걷은 `PROMPT_CODE`)에 `frameFor` 본문이 `new Date(`·`Math.random`·`getTimezoneOffset`·`getHours`를 쓰지 않음을 더한다(005 P6, TN3a)

## Phase 5: User Story 3 — 로마자가 나오지 않는다 (P2)

**Goal**: 본문·제목·데스크톱 요청이 같은 로마자 차단 문법을 보낸다. **Independent Test**: GR1~GR5 테스트.

- [X] T013 [US3] `__tests__/inference/llama-port.test.ts`에 GR2(run·ask의 `completion()` 인자 `grammar`가 `"root ::= [^A-Za-z]*"`로 같음)·GR3(프리웜 인자에 `grammar` 없음)·GR5(결과 키가 여전히 `["ending","text"]`) 단언을 더한다(실패 확인)
- [X] T014 [US3] `__tests__/inference/llama-port.test.ts`의 데스크톱 동일성 단언(`serverRequestFor`를 쓰는 기존 블록 — T013과 같은 파일이라 순차)에 GR4(`serverRequestFor(request).grammar === ROMAN_LETTER_BLOCK_GRAMMAR`이고 온디바이스가 넘기는 값과 같음)를 더하고, 저장소 소스에서 문법 문자열 리터럴이 `src/inference/sampling.ts` 한 곳에만 있음(GR1)을 소스 계약으로 더한다(실패 확인)
- [X] T015 [US3] `src/inference/sampling.ts`에 `export const ROMAN_LETTER_BLOCK_GRAMMAR = "root ::= [^A-Za-z]*";`(줄바꿈 없음)를 두고 근거(지시서 §4, v5 0/180, llama.rn 미측정, 비한국어 캐릭터가 들어오면 다시 판단)를 주석으로 적는다
- [X] T016 [US3] `src/inference/llama-port.ts`의 `complete()`가 `grammar: ROMAN_LETTER_BLOCK_GRAMMAR`를 넘기게 한다(프리웜 호출은 그대로)
- [X] T017 [US3] `src/inference/desktop-server.ts`의 `ServerRequest`에 `grammar: string`을 더하고 `serverRequestFor()`가 같은 상수를 싣게 한다

## Phase 6: User Story 4 — 사진이 없거나 못 본 날도 같은 말투 (P2)

**Goal**: 본 장면 없는 세 꼬리가 v5와 같고 까닭 문자열이 프롬프트에 없다. **Independent Test**: TN2a·TN4 단언.

- [X] T018 [US4] `__tests__/diary/prompt-e2sn.test.ts`의 본 장면 없는 꼬리 단언을 원본 「사진이 없는 날」·「사진은 있는데 읽지 못한 날」·「사진을 볼 길이 막힌 날」 블록으로 고치고(실패 확인), 기록의 「사진은 없었어요.」·「다닌 자리는 남지 않았어요.」를 단언한다. v5 `none`·`h-trunc`·`h-denied`·`h-dayopen` 케이스 신호로 전체 프롬프트 비교 단언을 하나씩 둔다
- [X] T019 [US4] `__tests__/diary/prompt-e2sn.test.ts`에 까닭 고정 문장 계약을 더한다(실패 확인): 사진 `unknown`(까닭 `"가짜-까닭-사진"`) → 「사진은 몰라요. 사진을 볼 수 있는 길이 막혀 있어요.」이고 프롬프트에 `가짜-까닭`이 없음, 자리 `unknown` & 사진 `unknown` → 「다닌 자리는 몰라요. 사진을 보지 못해 좌표를 물을 수 없어요.」, 자리 `unknown` & 사진 `known` → 「다닌 자리는 몰라요. 사진의 좌표를 읽지 못했어요.」, 사진 `none`과 `unknown`이 다른 문장(TN2b)
- [X] T020 [US4] `src/diary/prompt.ts`의 `NO_SCENE_WHY`·`NO_SCENE_MINE`·`noSceneTail()`을 원본으로 바꾼다(「너는/네」, 「'나는 오늘 아무것도 보지 못했어요'라는 말로」, `~요` 보기 문장, 「본문은 네댓 문장이면 되고, 끝까지 '요'로 끝나는 말투로 쓴다.」) — 061 규칙 1(꼬리 첫 문장이 시작 문장을 품는다)이 바뀐 이유를 주석에 적는다(지시서 §3, 본 장면 없는 날 평어 19 → 2/80)
- [X] T021 [US4] `src/diary/prompt.ts`의 `sentenceSignalLines()`에서 사진·자리 `unknown` 문장을 신호 `kind`로 고르는 세 고정 문장으로 바꾼다(`reason` 문자열을 읽지 않는다)

## Phase 7: Polish & Cross-Cutting

- [X] T022 [P] `src/diary/prompt.ts` 주석의 문안 출처(`variants.ts`·`H2`·`R16`·`R17`·`R18`·6,180런)를 my-ollama `results/hand-prompt/v5/`(PR #8)로 고치고, 머리 4행이 탐정 말투 교정의 자리라는 근거와 측정 안 된 것(새 좌표 문장, llama.rn)을 적는다
- [X] T023 `__tests__/diary/entry.test.ts` 등 옛 평어 문안에 기대던 나머지 테스트를 `npm run test:logic` 실패 목록으로 찾아 새 문안으로 고친다. 진단 프롬프트 미리보기(`__tests__/diagnostics/prompt-preview.test.ts`)·i18n 골든(`ko-outputs.golden.json`)이 흔들리면 원인을 확인한다(골든은 화면 문구라 바뀌지 않아야 한다). 제목 질문 둘·영어 경로(`SPEAKER_RULES` 등) 단언은 고치지 않은 채 초록이어야 한다(FR-012)
- [X] T024 `npm test`와 `npm run lint`(eslint·tsc·헌법 검사·prettier)를 돌려 모두 통과시킨다
- [X] T025 위반 주입 넷을 돌려 각각 실패함을 확인하고 되돌린다(quickstart §1): 틀 한 글자 변경 / `complete()`의 `grammar` 제거 / 사진 `unknown` 문장을 `${ph.reason}`으로 되돌림 / `instructionLines()`의 본 장면 꼬리 제거 — 치환 적용을 먼저 단언한다
- [X] T026 my-ollama 바이트 대조(quickstart §2)를 돌려 결과를 `specs/077-diary-tone-yo/quickstart.md` 「실측」에 적는다 — 틀 자리 제외 10케이스 `prompt`·`followUp` 일치, `instructionLines` 집합 일치(본 장면 있는 날 꼬리 줄은 틀 자리 제외)
- [X] T027 AGENTS.md에 077 절(결론·남은 위험)을 더하고 061 절의 「문안의 원본은 my-ollama `variants.ts`」를 hand-prompt v5 기준으로 고친다(이력처럼 덧대지 않고 고친다). `docs/superpowers/specs/2026-10-12-diary-tone-yo-design.md`와 어긋나는 서술이 없게 한다
- [X] T028 (D5 헤드리스 약 18분 45초 — 한도 180초를 크게 넘음, 소유자 결정으로 머지·릴리스하고 후속 과제로 남김 2026-10-12, quickstart 「실측」) dev 실기기 확인 D1~D5(quickstart §3)를 하고 결과(로마자 0, 첫 문장 틀 변화, `~요` 유지, 권한 없는 날, **헤드리스 시간**)를 quickstart 「실측」에 적는다 — 헤드리스가 한도를 넘으면 소유자에게 보고하고 완료로 처리하지 않는다(SC-005)

## Dependencies & Execution Order

- T001 → T002 → T003 (Foundational) → US1(T004~T010) → US2(T011~T012). US1의 꼬리가 `frameFor`를 쓴다.
- US3(T013~T017)은 `prompt.ts`와 독립 — Foundational 뒤 언제든, US1과 병렬 가능.
- US4(T018~T021)는 `prompt.ts`의 다른 함수지만 같은 파일·같은 테스트 파일이라 US1 뒤에 순차로.
- Polish(T022~T028)는 모든 스토리 뒤. T026·T028은 T024 통과 뒤.

### Parallel Opportunities

- US3 전체(T013~T017)는 `prompt.ts` 작업(US1·US4)과 병렬 가능 — 안에서는 T013 → T014(같은 파일) → T015~T017 순차.
- T022(주석)는 US 구현이 끝난 뒤 T023과 병렬.

## Implementation Strategy

MVP = Foundational + US1(본 장면 있는 날의 말투) — 피드백의 직접 대상. 그다음 US2 결정성 잠금, US3 문법, US4 본 장면 없는 날. 한 번에 머지한다(문안이 한 판이어야 v5와 같다 — 부분 머지하면 측정하지 않은 섞인 프롬프트가 나간다).

## Phase 8: Convergence

- [X] T029 `specs/077-diary-tone-yo/contracts/prompt.md` TN5b에 되뱉기로 잡히는 꼬리 조각을 명시한다 — 「이 기록으로 그 하루의 일기를 써라」 절과 꼬리 줄 전체(「끝까지 '요'로 끝나는 말투로 쓴다」는 따옴표를 걷으면 16자 미만이라 절로 잡히지 않는다; 판정은 바꾸지 않는다, 원칙 IV) per T010 / contracts TN5b (partial)
- [X] T030 `src/diary/prompt.ts`의 `speakerHeadLine` 주석에 077 hand-prompt v5도 받침 없는 이름(금동이)으로만 쟀다는 사실을 더한다 per T022 (partial)
