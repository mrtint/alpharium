# Implementation Plan: 온디바이스 일기 모델 교체와 R2 미러·폴백 내려받기

**Branch**: `122-diary-model-r2-fallback` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

## Summary

`a1` 자산을 새 GGUF(R2 주, HF 예비)로 바꾸고, `acquisition.prepare`가 주 경로 `failed` 뒤 예비 경로로 한 번
다시 받게 한다(끝난 구간은 이어받기). 옛 파일·옛 구간 기록 정리는 기존 규칙을 테스트로 잠근다. 다시 받기 안내의
받을 양이 옛 큰 파일에서 0이 되는 것을 고친다. 샘플링 0.60 / 0.90.

## Technical Context

**Language/Version**: TypeScript (Expo SDK 57, RN 0.86)
**Primary Dependencies**: `expo-file-system`(구간 받기), `llama.rn`
**Storage**: 앱 문서 `models/` + `state.json`
**Testing**: jest `logic` 프로젝트(`__tests__/models/*.test.ts`, `__tests__/app/*.test.ts`)
**Target Platform**: Android(SM-S901N)·iOS(iPhone 14) 실기기
**Project Type**: 모바일 앱
**Performance Goals**: 기존 구간 받기 그대로(16구간·동시 4)
**Constraints**: `roster.ts`는 어디서도 설정을 읽지 않는다. 경로·크기·지문은 화면 금지
**Scale/Scope**: 파일 약 6개 + 테스트

## Constitution Check

- **I 온디바이스**: 추론 위치 불변. 대체 자산 없음(검증 실패 시 예비로 대체하지 않음). ✅
- **II 화자**: 무관. ✅
- **III 캐릭터는 모델 위에**: 경로가 `ModelAsset`(안쪽 값)에만 있다. 바깥쪽 타입 불변. 로스터 하나 유지. ✅
- **IV 측정 장치 없음**: 어느 경로를 썼는지·시간 기록하지 않음. ✅
- **V 모르는 것을 채우지 않음**: 값은 실측(R2 curl·terrarium). 받을 양을 적게 말하지 않는다. ✅

설계 후 재검토: 위반 없음.

## Project Structure

```text
src/models/types.ts          ModelAsset.fallbackUrl?
src/models/roster.ts         a1 값 교체
src/models/acquisition.ts    예비 경로 전환
src/app/redownload-plan.ts   remainingBytes 큰 파일 처리
src/inference/sampling.ts    0.60 / 0.90
scripts/constitution-rules.ts 주석 속 0.8 언급 갱신
AGENTS.md                    「저장소의 현재 상태」 모델 줄
__tests__/models/acquisition-fallback.test.ts  (신규)
__tests__/models/roster.test.ts, __tests__/app/module-lines|redownload 테스트, __tests__/inference/sampling.test.ts (신규), __tests__/models/boundaries.test.ts
```

**Structure Decision**: 기존 `src/models/` 경계 안에서만 바꾼다. 구간 코어(`segmented/`)·`expo-port.ts`는 손대지 않는다.
