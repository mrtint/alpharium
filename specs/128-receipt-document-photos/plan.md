# Implementation Plan: 영수증·문서 사진 거르기

**Branch**: `128-receipt-document-photos` | **Date**: 2026-11-24 | **Spec**: [spec.md](spec.md)

## Summary

사진 묘사 단계(`src/vision/caption.ts`의 `captionAll`) 한 곳에 문서류 판정을 둔다 — 읽기 전에는 파일 이름·화면 비율로 화면 캡처를 건너뛰고(방안 1), 읽은 뒤에는 문답 꼴·좁은 낱말로 문서 묘사를 버린다(방안 2). 거른 장 수(`PhotoVision.unreadable`)만 싣고, 묘사가 0장·거른 장 ≥1인 날은 실패 대신 「본 장면 없는 날」로 쓰며 고정 한 줄을 넣는다.

## Technical Context

**Language/Version**: TypeScript (Expo SDK 57, RN 0.86, Hermes)
**Primary Dependencies**: `expo-media-library`(`exeForMetadata` — filename·width·height 기존 제공), `llama.rn`(VLM, 변화 없음)
**Storage**: 변화 없음(일기 `photos`에 거른 장이 안 들어갈 뿐)
**Testing**: jest `logic`(.ts) — 판정·파이프라인·프롬프트 계약, 헌법 검사
**Target Platform**: Android(SM-S901N)·iOS(iPhone 14) 실기기
**Project Type**: mobile-app
**Performance Goals**: 화면 캡처 장당 묘사 시간 0(건너뜀). 판정 자체는 문자열 검사라 무시할 만함
**Constraints**: 새 네이티브 모듈 없음, 추론 추가 없음, 묘사 프롬프트 불변
**Scale/Scope**: 소스 8파일(아래), 테스트 3~4파일

## Constitution Check

| 원칙 | 판단 |
| --- | --- |
| I 온디바이스 | 통과 — 네트워크·서버 없음 |
| II 좁은 시야 | 통과 — 영수증 글자를 싣지 않고, 못 읽은 것을 못 읽었다고 쓴다. 고정 줄은 관측된 장수만 담는다 |
| III 캐릭터 | 통과 — 로스터·모델 무관 |
| IV 측정 장치 없음 | 통과 — 판정은 라벨 하나(문서류인가)이고 점수·순위·채점이 없다. 거른 묘사 글은 남기지 않는다. 낱말 목록은 사람이 정한 값으로 표기 |
| V 관측/추측 | 통과 — 크기·이름을 모르면 판정하지 않는다. 기준은 「사람이 정한 값(표본 문서 12·보통 4)」으로 표기. 원인 가름은 실제 사진·실기기 |
| 사진과 시각 처리 「반드시 시각 처리」 | 통과 — 그 하루의 사진은 여전히 선별·묘사 단계를 거친다. 화면 캡처를 읽기 전에 거르는 것은 023 폴더 분류와 같은 선별이다(끄는 경로 아님). 전부 화면 캡처인 날은 엔진을 열고 한 장도 묘사하지 않는다 — research R4 |

재평가(Phase 1 뒤): 변화 없음.

## Project Structure

```text
specs/128-receipt-document-photos/  plan.md research.md data-model.md contracts/detection.md quickstart.md tasks.md
src/signals/port.ts        PhotoFacts에 filename?·width?·height?
src/signals/expo-port.ts   photosBetween()이 메타데이터 세 값을 싣는다
src/signals/types.ts·collect.ts  Photo로 이월
src/vision/types.ts        PhotoVision.unreadable
src/vision/caption.ts      판정 두 개(파일 로컬 상수·함수) + 건너뜀·사본 삭제·셈
src/inference/on-device.ts 「전량 캡션 실패」를 거른 장 0일 때만
src/diary/prompt.ts        unread 날 + unreadable>0 → 고정 줄
__tests__/vision/…, __tests__/diary/…, __tests__/inference/…
```

**Structure Decision**: 기존 계층 그대로. 판정은 `src/vision/caption.ts` 한 곳(FR-001).

## Complexity Tracking

없음.

- **소유자 결정(2026-11-24)**: iPhone 「적용 전」 일기는 재지 않는다 — 같은 VLM이라 안드로이드 「전」으로 갈음한다(SC-001의 iPhone 「전」 미측정).
