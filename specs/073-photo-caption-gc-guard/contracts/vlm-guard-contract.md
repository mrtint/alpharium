# Interface Contract: VLM 전량 실패 가드 & Asset 스코프 보장 계약

**Feature**: `073-photo-caption-gc-guard`
**Date**: 2026-10-10

## 1. `readPhotos` 실패 가드 계약

### 계약 위치
`src/inference/on-device.ts`

### 입력 조건
- `selected`: `Photo[]` (시각 처리용으로 선별된 1장 이상의 사진 목록)
- `photos.value.photos.length > 0`: 그날 찍힌 사진이 1장 이상 존재
- `result`: `PhotoVision | null` (`captionAll`의 실행 결과)

### 출력 계약
```typescript
if (result === null) {
  return { kind: "cancelled" };
}

// 073 계약: 후보 사진이 있었는데 캡션된 결과가 0장이면 거짓 일기를 막기 위해 실패로 반환한다
if (selected.length > 0 && result.captions.length === 0) {
  return { kind: "failed", reason: "전량 캡션 실패" };
}

return { kind: "seen", vision: result };
```

- **호출자(`generate`) 계약**:
  - `outcome.kind === "failed"` 수신 시 즉시 `{ kind: "vision-failed", reason: "failed" }`로 반환.
  - LLM 모델을 로드하거나 일기 본문 생성 단계로 진행하지 않음.
  - 사용되지 않은 임시 사진 사본을 정리함(`cleanupUsedPhotos()`).

---

## 2. `expo-port.ts` Asset 참조 유지 계약

### 계약 위치
`src/signals/expo-port.ts`

### 규칙
- `expo-media-library`의 `new lib.Asset(id)`로 생성된 네이티브 공유 객체는 `await asset.method()` 호출 완료 시점까지 JS 로컬 스코프에 살아 있어야 한다.
- `new lib.Asset(id).method()`와 같은 임시 체이닝은 금지된다.
- `await` 완료 직후 `if (asset.id === "") return ...` 등 참조를 명시적으로 소비하여 Hermes JSI 래퍼의 조기 수거를 방어한다.

---

## 3. 정적 소스 계약 테스트 계약

### 계약 위치
`__tests__/signals/expo-asset-scope.test.ts`

### 검증 대상
- `expo-media-library`를 참조하는 `src/` 내 모든 파일.
- 정규식: `new\s+(?:lib\.)?Asset\([^)]*\)\s*\.\s*(?:getUri|getLocation|getExif)` 패턴 매칭 시 테스트 실패.
- 검사 대상 파일 목록 개수가 1개 이상이어야 함.
