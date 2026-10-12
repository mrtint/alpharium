# Implementation Plan: 일기 말투 교체 — `~요`·감상·첫 문장 틀·로마자 차단

**Branch**: `077-diary-tone-yo` | **Date**: 2026-10-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/077-diary-tone-yo/spec.md`

## Summary

my-ollama PR #8의 v5 문안을 한국어 프롬프트 경로에 옮긴다 — 머리 넉 줄·기록 문장 `~요`·본 장면 없는 날 꼬리 「너는」·본 장면 있는 날 꼬리에 날짜로 고른 첫 문장 틀(11개, UTC 일수 mod 11).
신호의 까닭 문자열 대신 갈래별 고정 `~요` 문장을 쓰고, 지시문 줄에 본 장면 꼬리를 더한다. 본문·제목 생성과 데스크톱 요청에 로마자 차단 문법(`root ::= [^A-Za-z]*`)을 건다.
변경은 `prompt.ts`·`sampling.ts`·`llama-port.ts`·`desktop-server.ts` 네 파일과 테스트·문서다.

## Technical Context

**Language/Version**: TypeScript (Expo SDK 57, RN 0.86, Hermes)

**Primary Dependencies**: `llama.rn` 0.12.9(`completion()`의 `grammar` 옵션 — 새 의존성 없음)

**Storage**: 무변경(`DiaryEntry`·설정 파일 그대로)

**Testing**: jest `logic` 프로젝트(`__tests__/diary/*`, `__tests__/inference/*`), 헌법 검사(`npm run lint`), Maestro 무변경, dev 실기기 수동 확인

**Target Platform**: Android(dev 실기기 확인), iOS는 같은 코드(시뮬레이터 미확인 — 범위 밖)

**Project Type**: mobile-app

**Performance Goals**: 생성 시간 한도 180초 안(헤드리스 포함) — 본문이 길어져(토큰 중앙값 134 → 209) 실기기에서 잰다

**Constraints**: `buildPrompt()` 결정성(005 P6), 판정 갈래 넷(원칙 IV), 원본과 글자 단위 일치, 측정 코드 금지

**Scale/Scope**: 소스 4파일, 테스트 6~8파일

## Constitution Check

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스 | 통과 | 온디바이스·데스크톱이 같은 프롬프트·같은 샘플링·같은 문법(GR4). |
| II 화자는 휴대폰 | 통과 | 머리가 「사진에 담긴 장면만 보고 이야기한다」, 기록에 없는 대상 금지 줄 유지. 틀에 「나」·「내」가 꾸미는 말로 들어 있어 화자가 휴대폰으로 읽힌다(17/18). 짐작은 「주인의 마음」 한 번(MAY). |
| III 캐릭터 | 통과 | `E_TONE.quiet` 값만 바뀐다 — 근거는 my-ollama 측정(별도 저장소). 이름은 호칭에만. |
| IV 측정 장치 금지 | 통과 | 채점·말투 세기 코드는 my-ollama에 남는다. 이 저장소는 문안·결정적 고르기·문법 문자열만. 판정 갈래 넷 그대로. |
| V 사실/추측 구분 | 통과 | `none`/`unknown` 다른 문장 유지(TN2b). 측정 안 한 것(새 좌표 문장, llama.rn 문법, 헤드리스 시간)은 문서에 미측정으로 적는다. 실기기 확인이 완료 조건. |

Post-design 재확인: 같음(위반 없음, Complexity Tracking 없음).

## Project Structure

### Documentation (this feature)

```text
specs/077-diary-tone-yo/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── prompt.md
│   └── grammar.md
└── tasks.md   (speckit-tasks)
```

### Source Code (repository root)

```text
src/diary/prompt.ts          # 문안·틀·고정 까닭 문장·instructionLines (한국어 경로만)
src/inference/sampling.ts    # ROMAN_LETTER_BLOCK_GRAMMAR
src/inference/llama-port.ts  # complete()에 grammar
src/inference/desktop-server.ts  # ServerRequest.grammar

__tests__/diary/prompt-e2sn.test.ts      # 문안 잠금 갱신 + TN2a·TN3·TN5 추가
__tests__/diary/prompt.test.ts           # 한국어 경로 기대값 갱신
__tests__/diary/acceptance.test.ts       # 틀대로 시작한 본문 통과·꼬리 낭독 거부
__tests__/diary/entry.test.ts            # 문안 의존 단언이 있으면 갱신
__tests__/diary/fixtures/v5-first-sentence-frames.txt  # 원본 「첫 문장 틀」 블록 사본(바이트 대조 기준)
__tests__/inference/llama-port.test.ts   # GR1~GR5 (데스크톱 동일성 단언도 이 파일에 있다)
```

**Structure Decision**: 기존 구조 그대로. 원칙 II의 유일한 통과 지점(`prompt.ts`)과 샘플링 공유 자리(`sampling.ts`)에만 넣는다. 틀 사본 픽스처는 원본(private 저장소)을 테스트가 읽을 수 없어 두는 것이며 측정 장치가 아니다.

## 구현 순서 (TDD)

1. 픽스처(틀 블록 사본) → 틀 목록·`frameFor` 계약 테스트(실패) → 구현.
2. 문안 잠금 테스트를 v5로 고침(실패) → `E2_RULES`·`E_TONE`·기록·한계 문장·꼬리 교체.
3. 까닭 고정 문장 테스트(가짜 까닭이 안 나옴·세 문장 갈래)(실패) → `sentenceSignalLines` 수정.
4. `instructionLines()` 본 장면 꼬리 테스트(실패) → 구현. 되뱉기 테스트(틀대로 시작 통과, 지시 절 낭독 거부).
5. 문법 테스트(GR1~GR5)(실패) → `sampling.ts`·`llama-port.ts`·`desktop-server.ts`.
6. 주석 출처 갱신(`variants.ts`·6,180런 → hand-prompt v5), AGENTS.md(061 절 원본 표기, 077 절).
7. `npm test`·`npm run lint`, 위반 주입, 바이트 대조(quickstart §2), 실기기(quickstart §3).

## Complexity Tracking

없음.
