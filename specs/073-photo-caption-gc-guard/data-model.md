# Phase 1 Data Model: 사진 있는 날의 VLM 캡션 전량 스킵 방어

**Feature**: `073-photo-caption-gc-guard`
**Date**: 2026-10-10

## 1. VisionOutcome 상태 전이 모델

`src/inference/on-device.ts`의 `readPhotos`가 반환하는 내부 유니온 타입 `VisionOutcome`:

```typescript
type VisionOutcome =
  | { kind: "seen"; vision: PhotoVision }
  | { kind: "no-photos" }
  | { kind: "not-ready"; reason: string }
  | { kind: "failed"; reason: string }
  | { kind: "cancelled" };
```

### 전이 규칙 (State Transitions)

| 사전 조건 (입력 신호) | captionAll 결과 | 이전 동작 | 변경 후 동작 (073) | 최종 generate 결과 |
| :--- | :--- | :--- | :--- | :--- |
| `photos.length === 0` | (시각 엔진 미적재) | `no-photos` | `no-photos` (불변) | 정상 일기 (`zero`) |
| `cancel.cancelled === true` | `null` | `cancelled` | `cancelled` (불변) | `{ kind: "interrupted" }` |
| `selected.length > 0` | `captions.length >= 1` | `seen` | `seen` (불변) | 정상 일기 (`scenes`) |
| **`selected.length > 0`** | **`captions.length === 0`** | **`seen` (버그: unread 거짓 일기)** | **`failed` (전량 캡션 실패)** | **`{ kind: "vision-failed", reason: "failed" }`** |
| `engine.load()` 실패 | (시각 엔진 미적재) | `failed` / `not-ready` | `failed` / `not-ready` (불변) | `{ kind: "vision-failed" }` |

## 2. PhotoPathResolver & Signals Port Contract

`src/signals/expo-port.ts`:

- `filePathOf(photoId: string): Promise<string | null>`
  - 반환값: 파일 시스템 경로 (접두사 `file://` 제거된 절대경로) 또는 `null`
  - 불변식: `asset.getUri()` 완료 시점까지 `asset` 인스턴스의 JS 스택 참조가 유지되어야 함
- `folderNamesFor(photoIds: readonly string[]): Promise<Map<string, string | undefined>>`
  - 반환값: `Map<photoId, folderName | undefined>`
  - 불변식: 병렬 `Promise.all` 매핑 내 각 `asset.getUri()` 완료 시점까지 개별 `asset` 참조 유지
- `locationOf(photoId: string): Promise<LocationOutcome>`
  - 반환값: `LocationOutcome` (`found` | `absent` | `failed`)
  - 불변식: `asset.getLocation()` 완료 시점까지 `asset` 참조 유지

## 3. WriteFailure 기록 모델

`src/diary/write-failures.ts`:
- 시각 전량 실패 시 기록 형태:
  ```json
  {
    "dateKey": "YYYY-MM-DD",
    "timestampMs": 1773000000000,
    "reason": "vision-failed",
    "phase": "vision"
  }
  ```
- 기존 `vision-failed` 카테고리를 그대로 재사용하며 별도 엔터티 확장을 하지 않는다 (헌법 원칙 IV 준수).
