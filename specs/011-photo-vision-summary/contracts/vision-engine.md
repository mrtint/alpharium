# Contract: 사진 보는 엔진

**Feature**: `011-photo-vision-summary` | **파일**: `src/vision/vision-port.ts`

005의 `contracts/engine.md`와 나란한 계약이다. **기기에 닿는 유일한 자리이자 원칙 IV의
두 번째 경계다.**

---

## 왜 이 계약이 필요한가

005가 배운 것이 여기서 반복된다: **네이티브가 요청하지 않은 지표를 결과에 담아 보낸다.**

`completion()`이 `timings`·`tokens_predicted`·`predicted_per_second`를 주는 것은 005에서
확인됐고, 멀티모달이라고 다르지 않다 — 오히려 **사진 처리 시간이 더 붙을 수 있다.**

그래서 방어가 「안 쓴다」가 아니라 **「경계에서 버린다」**여야 한다. **`VisionRunResult`에
자리를 하나만 둔 것이 방어 그 자체다 — 자리가 없으면 담을 수 없다.**

---

## 타입

```ts
/** 캡션 한 번의 결과. **자리가 하나뿐인 것이 계약이다** */
export type VisionRunResult = {
  /** 읽어 낸 문장. 비어 있으면 실패이며 호출자가 그렇게 다룬다 */
  text: string;
};

export type VisionLoadResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "load-failed" | "no-vision-support" };

export interface VisionEngine {
  /** 본체를 열고 그 위에 mmproj를 붙인다. 둘 다 성공해야 ok다 */
  load(depth: VisionDepth): Promise<VisionLoadResult>;
  /** 사진 한 장을 읽는다. **한 장씩이다**(FR-001a) */
  caption(photoPath: string): Promise<VisionRunResult>;
  /** 읽는 중인 것을 끊는다 */
  stop(): Promise<void>;
  /** mmproj를 떼고 본체를 닫는다 */
  unload(): Promise<void>;
}
```

### V1. `VisionRunResult`에 자리가 하나뿐이다

**금지**: `elapsedMs`·`tokens`·`imageTokens`·`confidence`·`perSecond`를 더하지 않는다
(FR-032, 헌법 원칙 IV).

**⚠️ `ending`을 두지 않는 것이 005와 다르다.** 005는 「글이 끝났는가」가 판정의 근거였다
(잘린 일기를 거부해야 한다). **캡션은 다르다** — 잘린 캡션도 「사진에서 본 것」이며,
문장이 완결되지 않았다고 버리면 그것이 품질 판정이고 원칙 IV다.

**대신 빈 문자열만 실패로 본다.** 「아무것도 못 읽었다」와 「조금 읽었다」만 가른다.

### V2. `no-vision-support`가 별도 갈래인 까닭

`getMultimodalSupport()`가 `{ vision, audio }`를 준다(research §1). **물어볼 수 있으므로
짐작하지 않는다**(원칙 V).

`not-found`(파일이 없다)와 `no-vision-support`(파일은 있는데 사진을 못 본다)는 **사용자가
할 일이 다르다** — 전자는 받으면 되고 후자는 잘못된 파일을 받은 것이다. 003이
`ModelReadiness`를 넷으로 가른 것과 같은 판단.

---

## 불변식

### E1. 한 번에 하나만 열린다 — **005와 공유하는 제약**

`GenerationEngine`의 E1과 **같은 자원을 다툰다.** 두 엔진이 각자 「나는 하나만 연다」를
지켜도, **둘이 동시에 열려 있으면 기기가 죽는다.**

**그래서 순서가 계약이다**(research §2):

```
load(depth) → caption ×N → unload()   ← 여기까지 완전히 끝난 뒤에
                                      GenerationEngine.load(character)
```

**호출자(`on-device.ts`)가 이 순서를 지킨다.** 엔진끼리는 서로를 모른다 — 알면 두 축이
엉킨다.

### E2. 어떻게 끝나든 정리된다

성공·실패·끊김·예외 어느 경로로도 `unload()`가 불린다. **정리되지 않으면 캐릭터 모델을
열 때 메모리가 모자라 죽는다** — 005의 E2보다 결과가 더 나쁘다(그때는 다음 요청이
죽었고, 여기서는 **같은 요청 안에서** 죽는다).

```ts
try {
  await engine.load(depth);
  for (const photo of selected) { … }
} finally {
  await engine.unload();          // ★ 반드시
}
```

### E3. 예외를 던지지 않는다

실패는 값이어야 파이프라인이 `vision` 단계에서 멈췄다고 말할 수 있다(002 FR-019).
005의 E5, 001의 `ModuleStatus`와 같다.

### E4. 한 장의 실패가 나머지를 무너뜨리지 않는다 (FR-005a)

`caption()`이 빈 문자열을 돌려주거나 안에서 실패해도 **다음 사진으로 넘어간다.**
`considered`는 세고 `captions`에는 안 넣는다 — 그 차이가 「보려 했으나 못 읽었다」다.

**⚠️ 예외**: `load()`가 실패하면 한 장도 시도하지 않는다. 그때는 `not-ready`/`failed`이지
「전부 못 읽었다」가 아니다.

### E5. 끊기면 거기까지의 것을 버린다 (FR-009)

`stop()`이 불리면 `VisionOutcome`이 `cancelled`이며, **그때까지 만든 캡션을 쓰지
않는다.** 007이 생성에서 「부분 결과를 명시적으로 버린다」고 정한 것과 같다.

**왜 살리지 않는가**: 그만둔 것은 취소이지 「적게 본 일기를 달라」가 아니다.

---

## 경계에서 버리는 것 — 원칙 IV

`completion()`의 결과에서 **`text`(또는 `content`)만 꺼낸다.**

```ts
// 005의 llama-port.ts와 같은 구조
type NativeResult = {
  text?: string;
  content?: string;
  // timings·tokens_*를 **타입에 적지도 않는다** — 이름을 적어 두면 언젠가 누가 쓴다
};
```

**`initMultimodal`에 넘기는 값도 밖으로 나가지 않는다.** `image_max_tokens`는
`VisionDepth`에서 파생되며(research §4), **그 수가 화면이나 로그로 가지 않는다** —
가면 「빠르게 봄은 256토큰」이 사용자에게 보이고 그것이 모델 설정 노출이다(원칙 III).

---

## 샘플링 — `SAMPLING`을 재사용하지 않는다

**research §7에서 찾은 함정이다.**

`src/inference/sampling.ts`는 헌법 원칙 I의 「동일한 샘플링 파라미터」를 지키는 자리이며,
캡션이 그것을 같이 쓰면 **캡션을 위해 값을 바꾸는 순간 일기 생성이 함께 바뀐다.**

```ts
// src/vision/sampling.ts — 캡션 전용, 한 자리에만 둔다
export const CAPTION_SAMPLING = {
  temperature: 0.1,   // 옆 저장소 2026-08-10 실측: 세 VLM 모두 0.1 > 0.7
  n_predict: 64,      // 짐작 (research §5)
};
```

**값이 정반대인 것이 핵심이다**: 일기는 `temperature` 0.8(감상), 캡션은 0.1(관찰).
**같은 자리에 둘 수 없는 값이다.**

---

## 테스트로 못 박는 것

| 번호 | 무엇 | 어떻게 |
| --- | --- | --- |
| V1 | `VisionRunResult`의 자리가 **하나뿐** | 선언을 `readFileSync`로 직접 읽는다 — **`npm test`만으로 잡힌다**(007이 배운 것) |
| V2 | 두 엔진이 동시에 열리지 않는다 | 대역 엔진이 열림/닫힘을 기록하고, 캐릭터 모델 `load` 시점에 VLM이 닫혀 있는지 본다 |
| V3 | `unload()`가 실패·예외·끊김 모두에서 불린다 | 대역이 던지게 하고 호출을 센다 |
| V4 | 한 장 실패가 나머지를 안 무너뜨린다 | 3번째만 실패시키고 `captions.length === 4`, `considered === 5` |
| V5 | 끊으면 캡션을 안 쓴다 | `stop()` 뒤 결과가 `cancelled`이고 프롬프트에 캡션이 없다 |
| V6 | `timings`를 주어도 새지 않는다 | 대역이 지표를 잔뜩 담아 돌려주고, 결과에 없음을 확인 |
| V7 | `CAPTION_SAMPLING`과 `SAMPLING`이 **다른 파일** | import 검사 — `vision/`이 `inference/sampling`을 읽지 않는다 |
