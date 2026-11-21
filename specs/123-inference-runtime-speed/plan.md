# Implementation Plan: 추론 런타임 속도 최적화

**Branch**: `123-inference-runtime-speed` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

## Summary
먼저 기기에서 재고(스파이크·기준선), 이득이 실측된 옵션만 `llama-port.ts`의 모델 열기 값·제목 호출에 넣는다. 제품 코드에는 측정 장치를 두지 않는다.

## Technical Context
- 언어/런타임: TypeScript, Expo SDK 57, `llama.rn` 0.12.9, jest(logic/ui)
- 대상 파일(실측 뒤 확정): `src/inference/llama-port.ts`(`send`·`completePaced`의 `ask` 경로), `__tests__/inference/llama-port.test.ts`. `contextParams`·`assembly.ts`는 값 확인만(FA·KV·상태 파일은 미채택).
- 제약: 079 해제 순서, 106 직렬화, 092 박동, 099 백업, 원칙 IV·V.
- 규모: 새 엔티티 없음, 외부 연동 없음. 변경 파일 5개 안팎.

## Constitution Check
- I 온디바이스: 변경 없음. ✔
- IV 측정 장치: 측정은 개발 중 도구로만(FR-001). 소스 계약 테스트로 `tokens_predicted`·`timings` 비노출 유지. ✔
- V 사실/추측: 2 GiB 기준 사람이 정한 값으로 표기, 못 본 것 [미확인], 읽지 못한 메모리는 기본값으로 채우지 않음. ✔
- 개발 방식: 테스트 먼저, main 직접 작업 없음. ✔

## Phases
0. research.md (완료)
1. 스파이크·기준선(기기, 코드 변경 없이 개발용 임시 계측 없음) — 결과로 R1·R2·R3 결정 닫음
2. 채택 옵션만 TDD로 구현 + 위반 주입
3. 변경 후 실측(두 기기), quickstart 표, lint·test, AGENTS·로드맵, PR

## 위험
- R2의 상태 API가 일반 `completion()`에서 안 먹을 수 있다 → (c)로 닫고 기록.
- 기기 실측 조작(실기기는 도구로 못 누름)은 사람 손이 필요한 부분이 있어 [미확인]으로 남을 수 있다.
