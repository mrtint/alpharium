# 계약: 사진 전환 신호 (onPhotoStart)

**대상**: `src/vision/caption.ts`, `src/inference/on-device.ts`
**관련 요구사항**: FR-013, spec Edge Cases(사진 1장 / 후보 풀 재사용)

---

## 신호 흐름

```
on-device.ts readPhotos()
  └─ captionAll(engine, photos, available, resolvePath, cancel, resize,
                cleanup, onPhotoStart)
       for (const photo of photos) {
         onPhotoStart?.()          ← ★ 반복 시작 시점, 취소 검사 직후
         ... 경로 해석 → 리사이즈 → 캡션 ...
       }
```

`readPhotos()`(on-device.ts)는 `captionAll()`에 넘길 `onPhotoStart`를 자신이
받은 `onStage`(vision/generation 신호 콜백)로부터 만든다:

```ts
const onPhotoStart = onStage === undefined ? undefined : () => onStage("vision");
```

**사진 전환 신호는 별도 `ProgressStage` 값을 쓰지 않는다.** `"vision"`을
재사용한다 — 화면 입장에서 "이것이 최초 진입인지 장 전환인지"는 구분할
필요가 없고, 매번 "새 vision 문구를 골라라"라는 동일한 처리로 충분하다
(data-model.md 「사진 전환 신호」).

**★ 2026-08-23 `/speckit-analyze` C1 정정 — `"vision"`의 유일한 발생원이다.**
이전 버전은 `on-device.ts`가 `readPhotos()` 호출 직전에 **별도로**
`onStage?.("vision")`을 한 번 더 보내는 것으로 그려져 있었다 — 그러면 사진
1장에서 "진입 1회 + `onPhotoStart` 1회 = 2회", 3장에서 "진입 1회 +
`onPhotoStart` 3회 = 4회"로 이중 발화가 나서 `contracts/progress-signal.md`
의 검증 표와 어긋났다. **`on-device.ts`는 이제 `"vision"`을 직접 보내지
않는다** — `readPhotos()`가 `captionAll()`을 부르기 전에는 아무 신호도
없고, `onPhotoStart`의 첫 호출이 "사진 보기를 시작했다"를 겸한다.

## 누가 언제 보내는가

| 신호 | 보내는 자리 | 조건 |
| --- | --- | --- |
| `onPhotoStart()` | `caption.ts`의 `captionAll()`, `for` 루프 매 반복 시작(취소 검사 직후, 경로 해석 이전) | 사진마다 정확히 1회. 경로 해석 실패·캡션 실패로 그 장을 건너뛰어도 이미 호출은 됐다 |

**호출 횟수는 실제 처리 시도 횟수와 정확히 같다.** `photos.length`가 5면
정확히 5회 불린다 — 몇 장이 실제로 캡션에 성공했는지와 무관하다(실패한
장도 "보려고 시도했다"는 사실은 참이므로 FR-012 위반이 아니다).

## 검증 표

| 상황 | 기대 | 근거 |
| --- | --- | --- |
| 사진 5장으로 `captionAll()` 호출 | `onPhotoStart`가 정확히 5번 불린다 | FR-013, SC-006 |
| 사진 1장으로 호출 | `onPhotoStart`가 1번 불린다(장 전환은 없지만 최초 진입 신호는 있다) | Edge Case |
| `onPhotoStart`를 안 넘김 | 기존 `caption.test.ts` 테스트가 그대로 통과한다 | 옵셔널 확장 |
| 그만두기(`cancel.cancelled`)로 3번째 사진에서 중단 | `onPhotoStart`가 2번만 불린다(중단된 반복은 신호를 안 보낸다 — 71행 취소 검사가 신호보다 먼저) | FR-009 계열(그만둔 뒤 신호 안 남음) |
| `onPhotoStart` 호출 시 인자 | 없음(`() => void`) | FR-013 "순번을 넣지 않는다" |

## 불변식

1. **콜백은 인자를 받지 않는다.** 순번·`Photo.id`·시각 어느 것도 넘기지
   않는다 — 화면이 "몇 번째"를 계산할 재료 자체가 없다.
2. **콜백은 동기이며 예외를 던지지 않는다**(`contracts/progress-signal.md`
   불변식 3과 동일한 이유).
3. **취소된 반복은 신호를 보내지 않는다.** `cancel?.cancelled === true`
   검사가 `onPhotoStart()` 호출보다 먼저이므로, 그만둔 뒤 남은 장들은
   신호가 발생하지 않는다.
4. **콜백이 없어도(옵셔널 생략) `captionAll()`의 기존 동작이 완전히
   동일하다.**
