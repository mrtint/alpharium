# Implementation Plan: 일기 프롬프트 교체 — 날의 갈래 넷과 따로 묻는 제목

**Branch**: `061-diary-prompt-swap` | **Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/061-diary-prompt-swap/spec.md`

## Summary

한국어 캐릭터가 타는 문장형(E2SN) 프롬프트의 머리·기록·꼬리를 my-ollama `variants.ts`의 `R16.u1`(신호 있는 날)·`R17.x1`(신호 없는
날 네 갈래)과 **바이트까지 같게** 바꾸고, 제목을 본문 판정 통과 뒤의 두 번째 호출로 뗀다. 그 전에 `isEcho`를 절 단위 포함 비교로 고쳐
길어진 꼬리의 낭독을 막는다. 모델·샘플링·판정 갈래·`extractTitle()`·`buildPrompt` 시그니처는 그대로다.

## Technical Context

**Language/Version**: TypeScript 5 (Expo SDK 57, RN 0.86)

**Primary Dependencies**: `llama.rn`(기존, `completion({ messages, jinja })`) — 새 의존성 0

**Storage**: 변화 없음 (`DiaryEntry` 형식 그대로 — 제목은 `extractTitle()`이 지금처럼 뗀다)

**Testing**: jest(`logic`·`ui` 두 프로젝트), `npm run lint`(eslint + tsc + 헌법 검사 + prettier), 실기기 dev

**Target Platform**: Android 실기기 (SM-S901N / SM-G986N)

**Project Type**: mobile-app

**Performance Goals**: 호출이 1회 → 2회. 둘째 호출은 제목 한 줄(실측 중앙 9토큰, 최대 16)이고 본문까지 KV 캐시가 남는다 — 추가 시간은
짧을 것으로 짐작(실측 아님, 실기기에서 본다)

**Constraints**: 바이트 대조 10케이스 전부 일치. 프롬프트 823 → 509토큰(지시서 §4 실측 환산)

**Scale/Scope**: `src/diary/prompt.ts`·`src/diary/acceptance.ts`·`src/diary/particle.ts`·`src/inference/{engine-port,llama-port,on-device}.ts`
와 그 테스트

## Constitution Check

| 원칙              | 확인                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| I 온디바이스      | 두 호출 모두 같은 기기 엔진. 데스크톱 경로는 전송 미구현이라 둘째 호출 자리가 없음 — 프롬프트·판정은 같은 함수                             |
| II 화자           | 꼬리가 「상상으로 쓴다」를 버리고 「내 하루」를 쓰게 한다(지어내기 중앙 5→0). 하루 미완료 문장은 갈래마다 남는다                           |
| III 캐릭터        | 이름(호칭)만 프롬프트에 들어간다. 조사 판정은 `particle.ts`(캐릭터를 모름)                                                                 |
| IV 측정 장치 금지 | `isEcho`는 포함 불리언, 갈래 넷 그대로. 케이스·채점·바이트 대조 도구는 my-ollama에만. 제목 호출 결과에서 지표를 버린다(`{ text, ending }`) |
| V 관측/추측       | `unknown`(권한 없음) 갈래가 「모른다」로 시작 — 기록과 꼬리가 같은 말. 제목 호출 시간 한도는 새 숫자 대신 기존 한도 재사용                 |
| 시각 처리         | 캡션 상한(8) 그대로(범위 밖)                                                                                                               |
| 개발 방식         | 계약 → 테스트 → 구현. 한국어 커밋. 기능 브랜치                                                                                             |

게이트 통과. 위반 없음.

## Project Structure

### Documentation (this feature)

```text
specs/061-diary-prompt-swap/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── prompt.md       # 머리·기록·꼬리·instructionLines·titleQuestion
│   ├── echo.md         # isEcho 비교 조각
│   └── title-ask.md    # 엔진 ask() + on-device 2단계
└── tasks.md
```

### Source Code (repository root)

```text
src/diary/acceptance.ts      # isEcho 교체 (가장 먼저)
src/diary/particle.ts        # 인용 조사 이라/라 (quoteParticleFor)
src/diary/prompt.ts          # E2SN 경로: 머리·기록·꼬리·instructionLines, titleQuestion() 추가
src/inference/engine-port.ts # GenerationEngine.ask() 추가
src/inference/llama-port.ts  # ask(): user → assistant(본문) → user(질문)
src/inference/on-device.ts   # 판정 통과 뒤 제목을 묻고 한 줄이면 「제목\n\n본문」

__tests__/diary/acceptance.test.ts   # 절 단위 echo
__tests__/diary/prompt-e2sn.test.ts  # 새 문안으로 고쳐 씀 (반드시 깨진다)
__tests__/diary/prompt.test.ts       # 새 문안으로 고쳐 씀 (반드시 깨진다)
__tests__/diary/particle.test.ts
__tests__/inference/{engine,generate,on-device,llama-port}.test.ts  # ask 대역·2단계
```

**Structure Decision**: 기존 계층 그대로. 새 파일 없음. 프롬프트는 `prompt.ts` 한 곳(FR-013b), 기기는 `llama-port.ts` 한 곳.

## Complexity Tracking

없음.
