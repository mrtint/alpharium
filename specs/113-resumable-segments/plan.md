# Implementation Plan: 받다가 끊기거나 죽어도 끝난 구간은 다시 받지 않는다

**Branch**: `113-resumable-segments` | **Date**: 2026-11-11 | **Spec**: [spec.md](spec.md)

**Input**: `specs/113-resumable-segments/spec.md`, 설계 `docs/superpowers/specs/2026-11-11-resumable-segments-design.md`

## Summary

구간을 16개로 잘게 나눠 동시에 4개씩 받고, 구간 하나가 끝나 최종 파일에 놓이는 즉시 「끝난 구간 번호 목록」을 `state.json`에 남긴다. 다시 받을 때는 기록과 파일이 맞는지 보고, 맞으면 끝난 구간을 건너뛴다. 받던 구간은 처음부터 다시 받는다. 기록 쓰기는 한 줄로 세워(직렬화) 동시에 끝난 구간이 서로를 덮어쓰지 않게 한다.

## Technical Context

**Language/Version**: TypeScript (Expo SDK 57, RN 0.86), `expo-file-system` `DownloadTask`/`FileHandle`

**Primary Dependencies**: 없음(새 의존성 없음). 기존 `src/models/` 포트 구조

**Storage**: `models/state.json`(`MetadataPort.writeAtomically`). 형식 변경: `segmented[]` 항목의 `receivedBytes` → `doneIndices`

**Testing**: jest `logic` 프로젝트(`__tests__/models/`), 포트 대역. 실기기는 iPhone 개발 빌드

**Target Platform**: iOS·Android 앱(이번 실기기 확인은 iPhone만)

**Project Type**: mobile-app

**Performance Goals**: 처음부터 받는 시간이 지금과 눈에 띄게 다르지 않을 것(동시 연결 수 4로 같다)

**Constraints**: 힙에 올라오는 바이트는 `COPY_CHUNK_BYTES`뿐(041). 진행률은 `fraction` 하나만 밖으로(원칙 III·IV). 숫자는 사람이 정한 값(원칙 V)

**Scale/Scope**: 파일 둘(약 1.5GB·0.5GB), 구간 16개

## Constitution Check

| 원칙 | 판정 |
|---|---|
| I 온디바이스 | 해당 없음(받기). 대체 모델·대체 파일로 채우지 않는다 — 검증 실패 시 지금처럼 `verification-failed`. 통과 |
| II 프롬프트 | 해당 없음 |
| III 캐릭터는 모델 위에 | `src/models/` 안에서만 변경. 구간 코드는 `Character`를 import하지 않는다(`checkSegmentedFile`). 구간 수·바이트는 UI로 안 나감. 통과 |
| IV 측정 장치 없음 | 속도·시간을 재지 않는다. 동시 수·구간 수는 상수. 통과 |
| V 관측과 추측 | 16·4는 사람이 정한 값이라 상수 주석에 그렇게 적는다. 어긋난 기록은 믿지 않고 버린다. iPhone에서만 본 것은 그렇다고 적는다. 통과 |

Post-design 재검토: 설계(아래)가 위 판정을 바꾸지 않는다.

## Project Structure

### Documentation

```text
specs/113-resumable-segments/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/checkpoint.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code

```text
src/models/
├── segmented/types.ts     SegmentedResume: receivedBytes → doneIndices
├── segmented/plan.ts      SEGMENT_COUNT 16, SEGMENT_CONCURRENCY 4, remainingSegments/isComplete/mergeProgress를 doneIndices로
├── segmented/transfer.ts  동시 4 풀, onCheckpoint, 재개 때 진행 합산에 끝난 구간을 채움
├── port.ts                DownloadPort.start/resume에 선택 인자 checkpoint, MAX 구간 상수 근거
├── storage.ts             mutateState(직렬화), segmented 읽을 때 옛·깨진 항목 버림(형태 검사만, plan.ts를 import하지 않는다)
├── resume.ts (신규)       재개 기록 ↔ 파일 정합 판정(순수)
├── acquisition.ts         기록 검증, checkpoint → mutateState, 멈춤 시 기록 형식
├── verification.ts        state 쓰기를 mutateState로
├── expo-port.ts           checkpoint 전달, isSegmentedResume 새 형식, MAX_TRACKED_SEGMENTS
src/vision/acquisition.ts  state 쓰기를 mutateState로(같은 state.json을 쓴다)
__tests__/models/          segmented-plan·segmented-transfer·storage·acquisition·concurrent-acquisition·readiness 갱신, resume.test.ts 신규
```

**Structure Decision**: 기존 `src/models/` 구조에 맞춘다. 새 파일은 순수 판정 `resume.ts` 하나뿐이다.

## 기술 결정 (research.md에 근거)

1. **구간 완료 통지 경로**: `TransferHandle`을 만드는 `DownloadPort.start/resume`에 선택 인자 `checkpoint?: (resume: SegmentedResume) => void | Promise<void>`를 더한다. 코어(`runSegmented`)는 구간이 끝날 때마다 누적 기록 전체를 담아 부르고, `expo-port.ts`가 그대로 전달한다. `acquisition.ts`가 받아 `mutateState`로 쓴다.
2. **직렬화**: `storage.ts`의 `mutateState(metadata, fn)`가 `MetadataPort` 객체별 프로미스 사슬로 읽기-바꾸기-쓰기를 한 줄로 세운다. `state.json`을 쓰는 모든 자리(`acquisition.ts`·`verification.ts`·`src/vision/acquisition.ts`)를 이 함수로 옮긴다.
3. **기록 형식**: `{ assetKey, totalBytes, segmentCount, doneIndices: number[] }`(번호 오름차순, 중복 없음, 0 ≤ i < segmentCount). `readState`가 형태가 맞지 않는 `segmented` 항목(옛 `receivedBytes` 형식 포함)을 버린다. 계획과의 일치(구간 수)는 결정 4에서 본다.
4. **기록-파일 정합(재개 전)**: `resume.ts`의 순수 함수가 판정한다. 맞으려면 ① `segmentCount === planSegments(totalBytes).segments.length` ② 기준 크기가 있으면 `totalBytes === expectedBytes` ③ 최종 파일이 있고 크기가 `(끝난 구간 중 가장 뒤 구간의 end) + 1` 이상 `totalBytes` 이하. 어긋나면 `acquisition`이 기록을 지우고 부분 파일도 지운 뒤 처음부터 받는다.
5. **정리**: `MAX_TRACKED_SEGMENTS`를 32로 올리고(구간 16의 두 배 여유) `SEGMENT_COUNT ≤ MAX_TRACKED_SEGMENTS`를 테스트로 잠근다. 구간 임시 파일은 구간 시작 때 지우고 끝나면 지우는 지금 동작을 유지한다.
6. **풀**: `transfer.ts`가 남은 구간 큐와 `SEGMENT_CONCURRENCY`개의 일꾼으로 돌린다. 실패·멈춤이 오면 새 구간을 더 꺼내지 않고 내부 컨트롤러로 진행 중인 구간을 취소한다. 체크포인트 쓰기 실패는 받기를 멈추지 않는다(최적화일 뿐이고 최종 지문 검증이 안전망이다).
7. **이어받기의 공간 판정**: 정합한 재개 기록이 있으면 `acquisition.ts`의 공간 판정이 `expectedBytes − 끝난 구간 합`에 `SPACE_HEADROOM`을 곱한 값만 요구한다(없으면 지금처럼 전체). 이미 최종 파일이 자리를 차지하고 있어 전체를 다시 요구하면 이어받기가 불필요하게 거부된다.
