# Phase 0 Research: 사진 있는 날의 VLM 캡션 전량 스킵(SharedObject GC 레이스) 방어

**Feature**: `073-photo-caption-gc-guard`
**Date**: 2026-10-10

## 1. Expo `SharedObject` (Asset) 생명주기와 Hermes GC 레이스

### 배경 및 연구 결과
`expo-media-library`의 `Asset` 클래스는 Kotlin의 `expo.modules.kotlin.sharedobjects.SharedObject`를 상속받은 네이티브 공유 객체다.
`await new lib.Asset(id).getUri()` 패턴처럼 임시 표현식으로 인스턴스를 생성하고 즉시 `await`에 들어가면:
1. `getUri()`는 네이티브 백그라운드 스레드(`Dispatchers.IO`)에서 MediaStore ContentResolver를 비동기로 조회한다.
2. VLM 모델 적재 직후 네이티브 힙 메모리 압박(`NativeAlloc`)으로 인해 안드로이드/Hermes 런타임에서 강제 가비지 컬렉션이 발동한다.
3. JS 콜스택에 명시적 로컬 참조가 없는 임시 `Asset` 객체는 Hermes GC에 의해 조기 회수된다.
4. C++/JSI 브릿지는 이미 해제된 객체에 대한 역참조를 감지하고 `Cannot use shared object that was already released` 예외를 던진다.

### Decision
`src/signals/expo-port.ts` 내의 세 비동기 호출 지점(`filePathOf`, `folderNamesFor`, `locationOf`)에서 `const asset = new lib.Asset(...)`을 명시적 로컬 변수로 바인딩하고, `await`가 완료된 후에도 스코프 내에서 참조를 유지한다:
```typescript
const asset = new lib.Asset(photoId);
try {
  const uri = await asset.getUri();
  if (asset.id === "") return null; // await 완료 시점까지 JS 스코프 내 참조 유지
  ...
```

### Alternatives Considered
- **동기 API 사용 (`*Sync()`)**: `expo-file-system`의 경우 `textSync()`, `moveSync()`가 있어 해결했으나, `expo-media-library`는 시스템 MediaStore 쿼리를 비동기로만 제공하므로 동기 API가 없다.
- **전역 캐시/배열에 참조 보관**: 메모리 누수 위험이 있고 스코프 관리가 복잡해짐. 함수 로컬 변수 바인딩 + await 후 참조 유지가 가장 깔끔하고 안전함.

---

## 2. VLM 전량 실패(0장 캡션) 발생 시의 방어벽 (Fail-Fast)

### 배경 및 연구 결과
사진이 N장 존재하는데도 시각 엔진이 0장으로 끝나는 경우, 현재 파이프라인은 이를 정상 결과로 취급하고 `prompt.ts`의 `dayKindOf`가 `unread`로 분류하여 다음과 같은 지시문을 LLM에 주입한다:
> `'나는 오늘 아무것도 보지 못했다'는 말로 시작하고, 사진은 쌓였는데 그 속을 끝까지 들여다보지 못한 내가 어땠는지 적는다.`

이는 헌법 원칙 II(기록에 없는 사실 단언 금지) 및 원칙 V(관측과 실측 일치)를 정면으로 위반하는 침묵 결함이다.

### Decision
`src/inference/on-device.ts`의 `readPhotos`에서 후보 사진이 1장 이상 주어졌으나(`selected.length > 0`) 취소되지 않았고 결과 캡션이 0장(`result.captions.length === 0`)인 경우:
- 정상 `seen`이 아니라 즉시 `{ kind: "failed", reason: "전량 캡션 실패 (0장 생성)" }`을 반환한다.
- `generate()`는 이를 받아 `{ kind: "vision-failed", reason: "failed" }`로 처리한다.
- 기존 실패 처리 파이프라인(`write-failures.json` 기록, 일기 영구 저장 차단, 사용자에게 재시도 기회 제공)에 자연스럽게 합류한다.

### Alternatives Considered
- **동일 실행 내 1회 재시도**: 일시적 I/O 지연을 방어할 수 있으나, 이미 Doze/배터리/타임아웃(180초) 제약이 있는 상황에서 중복 지연을 유발하고 상태 머신이 복잡해짐(원칙 IV 위반).
- **진단에 별도 실패 사유('zero-captions') 신설**: 사용자 Clarification 결과, 기존 `vision-failed` 체계를 그대로 유지하여 복잡성을 최소화하기로 확정.

---

## 3. 정적 소스 계약 테스트 설계

### Decision
`__tests__/signals/expo-asset-scope.test.ts`를 신설하고:
- `expo-media-library`를 import하거나 사용하는 소스 파일들을 수집.
- 정규식으로 주석을 제거한 뒤, `new\s+.*Asset\(.*?\)\s*\.\s*(getUri|getLocation|getExif)`와 같은 임시 객체 즉시 비동기 체이닝 패턴이 존재하는지 정적으로 검사한다.
- 검사 대상 파일 목록이 0개가 되지 않도록 최소 개수를 단언한다.

### Rationale
Jest 환경은 Node.js V8 기반 대역(mock)으로 동작하여 Hermes JSI의 SharedObject GC 레이스가 재현되지 않는다. 따라서 소스 코드를 직접 읽어 위험 패턴을 차단하는 정적 계약 테스트가 유일하고 가장 견고한 방어벽이다.
