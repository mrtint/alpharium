# Tasks: 061 후속 — 하루가 안 끝난 날의 꼬리와 본 장면 없는 날의 제목 질문

**Input**: [spec.md](spec.md), [plan.md](plan.md)

## Phase 1: 테스트 먼저

- [x] T001 [US1] `__tests__/diary/prompt-e2sn.test.ts` — 하루가 안 끝난 본 장면 없는 날(②③④)은 기록 첫 줄이 `S_DAY_OPEN`, 꼬리에 B 문장 없음; 끝난 날은 `S_DAY_OPEN` 없음; `instructionLines`에 `S_DAY_OPEN`
- [x] T002 [US2] 같은 파일 `TITLE_ASK`를 새 문장으로, `__tests__/inference/on-device.test.ts`의 제목 질문 단언도 새 문장으로
- [x] T003 테스트가 실패하는지 확인 (6건 실패)

## Phase 2: 구현 (`src/diary/prompt.ts`)

- [x] T004 [US1] `sentenceSignalLines()`·`sentenceInstructionLines()` — `dayStillOpen`이면 날의 갈래와 무관하게 `S_DAY_OPEN`
- [x] T005 [US1] `NO_SCENE_DAY_OPEN` 삭제, `noSceneTail(kind)`·`tailFor(kind)`
- [x] T006 [US2] `TITLE_ASK` 교체, 주석에 근거(§10.3·§10.4)

## Phase 3: 판정

- [x] T007 ② `npm test` · `npm run lint`
- [x] T008 ③ 계약 넷(prompt-signature · acceptance A-7 · title · 018 `fixedHead`)
- [x] T009 ① 바이트 대조 + 위반 주입(main의 `prompt.ts`로 돌려 불일치가 잡히는지)
- [x] T010 ④ 기기 등가 재측정
- [x] T011 ⑤ 실기기 dev 6편
- [x] T012 AGENTS.md 061 항목·quickstart 결과 갱신
