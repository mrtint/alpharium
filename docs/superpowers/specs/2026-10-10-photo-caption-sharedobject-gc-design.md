# 사진 있는 날의 VLM 캡션 전량 스킵(SharedObject GC 레이스) 방어 설계

- **작성일**: 2026-10-10
- **상태**: Brainstorming 완료 및 설계 확정
- **연관 분석 문서**: [`docs/superpowers/specs/2026-10-10-photo-caption-silent-failure.md`](./2026-10-10-photo-caption-silent-failure.md)

---

## 1. 배경 및 문제 정의

### 1.1 관측된 현상
테스트 디바이스(SM-G986N, Android 13)에서 사진이 각각 6장·12장 관측된 날임에도:
- `timing.visionMs`가 1초 미만(972ms, 1027ms)에 종료
- 일기 본문이 `"나는 오늘 아무것도 보지 못했다. 사진은 쌓였지만, 그 속을 끝까지 들여다보지 못해 심심했다..."`로 저장
- 홈 화면 상세에서 사진 캐러셀 누락
- 포그라운드에서 「다시 쓰기」 시 정상적으로 6장(24초)·8장(38초) 캡션과 캐러셀이 정상 복구

### 1.2 근본 원인
1. **Expo `SharedObject`와 Hermes GC 간 비동기 레이스**:
   - `src/signals/expo-port.ts`의 `await new lib.Asset(photoId).getUri()` 등에서 임시 인스턴스로 생성된 Kotlin `SharedObject` 래퍼가 비동기 I/O 대기 중 JS 스택에서 참조를 잃음.
   - VLM 모델 적재 직후 네이티브 힙 압박(`NativeAlloc`)으로 GC가 발동하여 JSI 브릿지에서 `Cannot use shared object that was already released` 예외 발생.
2. **조용한 실패(Silent Fallback)와 거짓 일기 저장**:
   - `filePathOf`의 `catch`가 조용히 `null`을 반환하고 `captionAll`은 이를 스킵(`continue`).
   - 사진이 N장 존재함에도 캡션 결과가 0장인 `{ captions: [], available: N, considered: N }`이 반환됨.
   - `prompt.ts`의 `dayKindOf`가 이를 `unread`로 분류하여 "나는 오늘 아무것도 보지 못했다"라는 거짓 일기를 정상 일기로 영구 저장.
   - 이는 **헌법 원칙 II (기록에 없는 것을 단언하지 않는다)** 및 **원칙 V (실측과 일치하지 않는 단언 금지)**를 정면으로 위반하는 침묵 결함임.

---

## 2. 해결 목표

1. **`Asset` SharedObject 생명주기 보장**:
   비동기 호출(`getUri()`, `getLocation()`) 완료 시점까지 JS 참조를 명시적으로 유지하여 Hermes GC의 조기 수거를 원천 차단한다.
2. **VLM 전량 스킵 방어 (Fail-Fast)**:
   사진이 후보로 1장 이상 주어졌으나 캡션된 결과가 0장인 경우, 조용히 거짓 일기를 쓰는 대신 즉시 쓰기 실패(`vision-failed`)로 거부하여 잘못된 일기 저장을 차단한다.
3. **정적 소스 계약 테스트로 회귀 방지**:
   `expo-media-library`의 `Asset` 비동기 메서드가 임시 객체 체이닝으로 호출되지 않도록 정적으로 차단한다.

---

## 3. 상세 설계

### 3.1 1차 방어선: `Asset` 객체 생명주기 보장 (`src/signals/expo-port.ts`)

`new lib.Asset(...)` 인스턴스를 로컬 변수로 바인딩하고, `await`가 완료된 후에도 스코프 내에서 해당 객체 참조를 유지한다.

```typescript
// 1. filePathOf
async filePathOf(photoId: string): Promise<string | null> {
  try {
    const lib = await import("expo-media-library");
    const asset = new lib.Asset(photoId);
    const uri = await asset.getUri();
    // await 완료 이후까지 참조를 유지하여 Hermes GC 조기 회수 방지
    if (asset.id === "") return null;

    if (typeof uri !== "string" || uri === "") return null;
    return uri.startsWith("file://") ? uri.slice("file://".length) : uri;
  } catch {
    return null;
  }
}

// 2. folderNamesFor
async folderNamesFor(photoIds: readonly string[]): Promise<Map<string, string | undefined>> {
  const lib = await import("expo-media-library");
  const entries = await Promise.all(
    photoIds.map(async (id): Promise<[string, string | undefined]> => {
      try {
        const asset = new lib.Asset(id);
        const uri = await asset.getUri();
        if (asset.id === "") return [id, undefined];
        return [id, folderNameOf(uri)];
      } catch {
        return [id, undefined];
      }
    }),
  );
  return new Map(entries);
}

// 3. locationOf
async locationOf(photoId: string): Promise<LocationOutcome> {
  try {
    const lib = await import("expo-media-library");
    const asset = new lib.Asset(photoId);
    const location = await asset.getLocation();
    if (asset.id === "") return { kind: "absent" };

    if (location === null) return { kind: "absent" };
    if (!isUsableCoordinate(location.latitude, location.longitude)) return { kind: "absent" };

    return { kind: "found", latitude: location.latitude, longitude: location.longitude };
  } catch (error) {
    return { kind: "failed", reason: messageOf(error) };
  }
}
```

### 3.2 2차 방어선: VLM 전량 실패 방어 (`src/inference/on-device.ts`)

`readPhotos()` 함수에서 VLM 추론을 시도할 때:
- 후보 사진(`selected`)이 1장 이상 존재 (`selected.length > 0`)
- 취소(`cancel.cancelled === true`)되지 않았음
- 그런데 `result.captions.length === 0`인 경우

이 상태는 정상적인 하루 완료가 아니며, 사진 캡션 파이프라인의 전량 실패 상태다.
이를 `{ kind: "seen", vision: result }`로 흘려보내 `unread` 거짓 일기를 작성하게 두지 않고, 즉시 `{ kind: "failed", reason: "전량 캡션 실패 (0장 생성)" }`으로 반환한다.

`generate()` 함수는 이를 받아 `{ kind: "vision-failed", reason: "failed" }`로 탈락시키며, `pipeline.ts`는 이를 쓰기 실패(`write-failures.json`)로 기록하고 일기 저장을 거부한다.

```typescript
// src/inference/on-device.ts의 readPhotos 내부
if (result === null) {
  return { kind: "cancelled" };
}

// 2차 방어선: 사진이 있었는데 캡션이 전량 누락된 경우 거짓 일기 작성 차단
if (selected.length > 0 && result.captions.length === 0) {
  return { kind: "failed", reason: "전량 캡션 실패" };
}

return { kind: "seen", vision: result };
```

> [!NOTE]
> `dayKindOf`의 `unread` 갈래는 **VLM 엔진 자체가 없는 레거시/목 환경이나 사진 신호 수집 단계에서만 유지**되며, 실제 온디바이스 VLM 파이프라인이 동작하는 런타임에서는 사진이 있는데 캡션 0장으로 끝나는 침묵 저장을 차단한다.

### 3.3 3차 방어선: 정적 소스 계약 테스트 (`__tests__/signals/expo-asset-scope.test.ts`)

`__tests__/diary/expo-file-sync.test.ts`와 동일하게 소스 코드를 읽어 다음 규칙을 단언한다:
1. `expo-media-library`를 참조하는 모든 소스 파일에서 `new ...Asset(` 직후 임시 객체 체이닝(`.getUri()`, `.getLocation()`, `.getExif()`) 패턴이 존재하지 않아야 한다.
2. 검사 대상 파일 목록이 0개가 되지 않도록 최소 개수를 단언한다.

---

## 4. 검증 계획

1. **단위 및 계약 테스트**:
   - `__tests__/signals/expo-asset-scope.test.ts`: 임시 `Asset` 체이닝 호출이 없음을 정적으로 검증.
   - `__tests__/inference/on-device.test.ts`: 사진이 1장 이상 주어졌으나 `captionAll`이 빈 캡션을 돌려줄 때 `readPhotos` 및 `generate`가 `vision-failed`로 거부하는지 검증.
   - `__tests__/signals/expo-port.test.ts`: `filePathOf`, `folderNamesFor`, `locationOf`의 정상 동작 확인.
2. **정적 분석 및 헌법 검사**:
   - `npm run lint` (`eslint`, `tsc --noEmit`, `check:constitution`, `prettier`) 위반 0건 확인.
3. **실기기(dev) 검증**:
   - Android 실기기(SM-G986N)에서 사진이 있는 날 생성 시 정상적으로 사진 캡션과 캐러셀이 포함되어 일기가 저장되는지 확인.
