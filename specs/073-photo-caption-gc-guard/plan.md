# Implementation Plan: 사진 있는 날의 VLM 캡션 전량 스킵(SharedObject GC 레이스) 방어

**Branch**: `073-photo-caption-gc-guard` | **Date**: 2026-10-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/073-photo-caption-gc-guard/spec.md`

## Summary

사진이 있는 날 대형 모델 적재 및 메모리 압박 시 Hermes GC가 `expo-media-library`의 임시 `Asset` 인스턴스를 조기 수거(`Cannot use shared object that was already released`)하여 VLM 캡션이 전량 스킵되고 거짓 `unread` 일기("나는 오늘 아무것도 보지 못했다")가 저장되는 침묵 결함을 3중 방어선(1차: `Asset` 참조 수명 보장, 2차: 캡션 0장 시 `vision-failed` 즉시 거부 가드, 3차: 정적 소스 계약 테스트)으로 차단한다.

## Technical Context

**Language/Version**: TypeScript 5.9 / React Native 0.86 / Expo SDK 57

**Primary Dependencies**: `expo-media-library`, `llama.rn`, Hermes Engine

**Storage**: On-device JSON files (`files/diary/*.json`, `files/diagnostics/write-failures.json`)

**Testing**: Jest (Node/Expo test runner), 정적 소스 계약 테스트 (`node:fs`)

**Target Platform**: Android (SM-G986N 및 실제 기기), iOS 시뮬레이터

**Project Type**: Mobile Application (On-device AI)

**Performance Goals**: VLM 캡션 스킵 없이 정상 수행 (장당 약 4~5초 실측 유지)

**Constraints**: 메모리 압박/Doze 상태에서도 Hermes GC에 의해 JSI 네이티브 공유 객체가 회수되지 않아야 함

**Scale/Scope**: `src/signals/expo-port.ts`, `src/inference/on-device.ts`, `__tests__/signals/expo-asset-scope.test.ts`, `__tests__/inference/on-device.test.ts`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **원칙 I (온디바이스가 제품이다)**: 온디바이스 VLM 파이프라인의 조용한 실패를 바로잡고 온디바이스 추론이 정상 수행되도록 보장한다. (PASS)
- **원칙 II (화자는 휴대폰이고, 시야는 좁다)**: 사진이 있는데 보지 못했다고 거짓말하는 `unread` 일기가 데이터베이스에 영구 저장되는 것을 차단한다. (PASS)
- **원칙 III (캐릭터는 모델 위에 선다)**: 캐릭터 페르소나나 로스터에 영향 없음. (PASS)
- **원칙 IV (측정 장치를 제품에 들이지 않는다)**: 복잡한 점수화나 재시도 임계값 없이 단순한 0장 실패 가드(`vision-failed`)를 적용한다. (PASS)
- **원칙 V (관측된 사실과 추측을 구분해 기록한다)**: 관측된 사진이 있으면 정직하게 읽고, 실패 시 정직하게 쓰기 실패로 기록한다. (PASS)

## Project Structure

### Documentation (this feature)

```text
specs/073-photo-caption-gc-guard/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── vlm-guard-contract.md
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
src/
├── signals/
│   └── expo-port.ts                  # 1차 방어선: Asset 참조 유지 (filePathOf, folderNamesFor, locationOf)
├── inference/
│   └── on-device.ts                  # 2차 방어선: readPhotos 캡션 0장 발생 시 failed 반환 가드

__tests__/
├── signals/
│   ├── expo-asset-scope.test.ts      # 3차 방어선: 정적 소스 계약 테스트
│   └── expo-port.test.ts             # 1차 방어선 단위 테스트
└── inference/
    └── on-device.test.ts             # 2차 방어선 검증 단위 테스트
```
