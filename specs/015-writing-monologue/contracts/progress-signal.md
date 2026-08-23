# 계약: 진행 신호 (onProgress / onStage)

**대상**: `src/inference/types.ts`, `src/inference/on-device.ts`,
`src/diary/pipeline.ts`
**관련 요구사항**: FR-001, FR-002, FR-003, FR-012

---

## 신호 흐름

```
DiaryHomeScreen.generate()
  └─ pipeline.run(input, onProgress)
       ├─ onProgress("signals")           ← pipeline.ts가 직접 보낸다
       ├─ deps.loadSignals(day)
       ├─ buildRequest(...)
       ├─ deps.isModelReady?.(character)
       └─ deps.backend.generate(request, onProgress)   ← 그대로 전달
            ├─ (vision !== "none" && vision 엔진 있음)
            │     readPhotos(...)
            │       └─ engine.load() 성공
            │             └─ captionAll(..., onPhotoStart)
            │                    for (const photo of photos) {
            │                      onPhotoStart?.()   ← ★ "vision" 신호는
            │                    }                       오직 여기서만 나간다
            │                                            (사진 1장 이상일 때만)
            ├─ onProgress("generation")    ← on-device.ts가 engine.run() 직전에
            └─ engine.run(...)
```

**★ 2026-08-23 `/speckit-analyze` C1 정정**: 이전 버전은 `readPhotos()` 호출
직전에 `on-device.ts`가 **별도로** `onStage?.("vision")`을 보내고, 그 안의
`captionAll()`도 `onPhotoStart`로 `"vision"`을 다시 보내 **사진마다 이중
발화**(사진 1장 → 2회, 3장 → 4회)가 나는 결함이 있었다. **`on-device.ts`
자신은 더 이상 `"vision"`을 직접 보내지 않는다** — `captionAll()`의
`onPhotoStart`가 이 신호의 유일한 발생원이다.

## 누가 언제 보내는가

| 신호 | 보내는 자리 | 조건 |
| --- | --- | --- |
| `"signals"` | `pipeline.ts`의 `runStages()`, `loadSignals()` 호출 직전 | 항상 |
| `"vision"` | `caption.ts`의 `captionAll()`, `for` 루프 매 반복 시작(`onPhotoStart` 경유, `contracts/photo-advance.md` 참조) | 사진이 1장 이상 있고 실제로 `captionAll()`이 호출될 때만. **사진이 0장이면 `captionAll()` 자체가 안 불리므로 `"vision"`이 한 번도 안 온다**(2026-08-23 정정 — 「볼 것이 없으면 여는 것 자체를 생략한다」는 011 원칙을 신호에도 그대로 적용) |
| `"generation"` | `on-device.ts`의 `generate()`, `runWithTimeout()`(→`engine.run()`) 호출 직전 | 항상 (엔진이 있고 모델 로드에 성공한 뒤) |

**`"vision"`을 보내지 않는 경우**(FR-003 방어):
- `request.vision === "none"` — 사용자가 사진 보기를 껐다.
- `vision`(VisionSupport)이 `undefined` — 시뮬레이터·웹 등 사진 읽기 수단
  자체가 없다.
- **그 하루에 사진이 0장이다** — `readPhotos()`가 `photos.value.photos.length
  === 0`을 확인하면 `captionAll()`을 아예 호출하지 않고 `{ kind: "no-photos"
  }`로 반환한다(기존 011 동작, 변경 없음). `onPhotoStart`가 한 번도 안 불리므로
  `"vision"`도 한 번도 안 온다.

이 세 경우 모두 `captionAll()` 자체가 호출되지 않으므로, 신호를 안 보내는
것이 아니라 애초에 보낼 계기가 없다 — "실제로 하지 않는 일을 말하지
않는다"(FR-012)가 조건 분기가 아니라 **호출 여부 자체**로 지켜진다.

## 검증 표

| 상황 | 기대 | 근거 |
| --- | --- | --- |
| vision="none"으로 생성 | `onProgress`가 `"vision"`으로 불리지 않는다 | FR-003, SC-002 |
| vision="quick"이고 사진 1장 | `onProgress`가 `"signals"` → `"vision"`(×1) → `"generation"` 순서로 불린다(첫 `onPhotoStart`가 진입과 전환을 겸한다) | FR-001, SC-001 |
| vision="quick"이고 사진 3장 | `onProgress`가 `"signals"` → `"vision"`(×3) → `"generation"` 순서로, `"vision"`이 정확히 3번(사진 장수와 같은 수) 불린다 | FR-013, SC-006 |
| vision="quick"이고 사진 0장 | `onProgress`가 `"signals"` → `"generation"` 순서로 불리고, `"vision"`은 한 번도 안 온다(captionAll 자체가 안 불림) | FR-003, FR-012 |
| `onProgress`를 안 넘김 | 기존 `pipeline.test.ts`/`on-device.test.ts` 테스트가 그대로 통과한다 | 옵셔널 확장(003·012 선례) |
| 사진 읽기 실패(`vision-failed`), 최소 1장은 시도됨 | `"vision"`은 최소 1번 불렸고(시도는 했다), `"generation"`은 불리지 않는다 | FR-012 — 실제로 시도한 것만 말한다 |
| 생성 도중 취소(`stop()`) | 이미 보낸 신호를 취소하는 별도 신호는 없다 — 화면이 `cancelled.current`로 결과를 버리는 기존 메커니즘(007)이 화면 갱신을 막는다 | FR-010 |

**사진이 여러 장이면 `"vision"`이 그 장수만큼 불린다.** `contracts/photo-advance.md`
가 정의하는 사진 전환 신호가 `"vision"`의 **유일한** 발생원이다 — 별도의
"진입 신호"는 없다. `readPhotos()`가 `captionAll()`에 넘기는 `onPhotoStart`가
내부적으로 `onStage("vision")`을 호출하며, **그 첫 호출이 곧 "사진 보기
시작"이고 두 번째 이후 호출이 "장 전환"이다** — 화면은 어느 쪽이든 구분할
필요 없이 매번 새 문구를 고르면 된다.

## 불변식

1. **콜백은 순서를 보장한다.** `"vision"`(1회 이상)이 `"generation"`보다
   먼저 불린다(같은 `generate()` 호출 안에서 동기적으로 순서가 정해진 코드
   경로이므로 레이스 컨디션이 없다).
2. **콜백은 최대 한 번씩만 불린다.** 재시도 로직이 이 기능에 없으므로 같은
   단계가 한 실행 안에서 두 번 불릴 일이 없다.
3. **콜백은 `Promise`를 반환하지 않는다.** 동기 함수이며, 예외를 던지면 안
   된다(화면 쪽 구현이 `try/catch` 없이 직접 부른다 — 콜백 내부에서 던진
   예외가 생성 파이프라인을 죽이면 안 되므로, 화면 구현은 `setState` 한 줄만
   담는다).
4. **콜백이 없어도(옵셔널 생략) 생성 전체 흐름이 지금과 동일하게 동작한다.**
