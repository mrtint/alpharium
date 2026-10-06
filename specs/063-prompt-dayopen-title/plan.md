# Implementation Plan: 061 후속 — 하루가 안 끝난 날의 꼬리와 본 장면 없는 날의 제목 질문

**Branch**: `063-prompt-dayopen-title` | **Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)

## Summary

`src/diary/prompt.ts` 한 파일, 두 곳만 바꾼다.

1. **하루가 안 끝난 날의 `S_DAY_OPEN`** — `sentenceSignalLines()`·`sentenceInstructionLines()`가 `S_DAY_OPEN`을 「본 장면이
   있을 때만」이 아니라 `dayStillOpen`이면 늘 기록 첫 줄·지시문 줄로 싣는다. 본 장면 없는 날 꼬리의 `NO_SCENE_DAY_OPEN`
   (원본 `DAY_OPEN_ME`)을 지우고 `noSceneTail()`·`tailFor()`가 `request`를 받지 않게 한다. 원본 `R18.y3`.
2. **본 장면 없는 날의 `TITLE_ASK`** — 지시서 §10.3의 문장으로 바꾼다. `TITLE_ASK_SCENE`은 그대로.

캡션 있는 날은 하루가 안 끝났어도 061에서 이미 `S_DAY_OPEN`이 기록 첫 줄이었으므로 바이트가 같다.

## Technical Context

TypeScript(Expo SDK 57 / RN 0.86) · jest(`logic`·`ui` 두 프로젝트). 새 의존성·네이티브 변경 없음.

## Constitution Check

- **원칙 II**: 하루가 안 끝났다는 사실이 여전히 기록에 실린다(012 MUST). 제목이 「모른다」를 「없었다」로 단정하지 않게 한다 — 개선.
- **원칙 IV**: 측정 도구(`gen-prompts.ts`·`run.mjs`·`score.ts`·케이스)는 이 저장소로 가져오지 않는다. 스크래치 사본으로 돌린다.
- **원칙 I**: `judge()` 거부 갈래 넷·`isEcho`는 그대로다.

통과.

## 바뀌지 않는 것 (계약)

`judge()` 갈래 넷(A-7) · `extractTitle()` · `buildPrompt(request, vision?)` 시그니처 · 018 `fixedHead()` 공유 · 053 `decideMaterial` ·
샘플링 · `isEcho` · `VISION_PHOTO_LIMIT = 8`.

## 판정 (지시서 §6 다섯 단계, 합격선은 §10.1·§10.5)

① 바이트 대조(my-ollama `R18.y3`/`R17.x1`/`R16.u1` + 새 제목 질문) ② `npm test` ③ 계약 넷 ④ 기기 등가 재측정 ⑤ 실기기 6편.
결과는 [quickstart.md](quickstart.md).
