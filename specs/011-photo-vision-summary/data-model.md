# Phase 1 Data Model: 사진의 내용을 보고 일기의 재료로 준다

**Feature**: `011-photo-vision-summary` | **Date**: 2026-08-22

## 값이 흐르는 길

```
004 DaySignals.photos ──┐
  (PhotoObservation)    │
                        ▼
              selectForVision()          ← src/vision/select.ts (순수·결정적)
                        │
                        ▼  Photo[] 최대 5장, 하루에 걸쳐 균일
              [VLM 열기 → 장별 캡션 → 닫기]  ← src/vision/vision-port.ts (기기)
                        │
                        ▼  PhotoVision
              buildPrompt(request)        ← src/diary/prompt.ts (원칙 II의 통과 지점)
                        │
                        ▼  string
              [캐릭터 모델 열기 → 일기]
```

**★ `PhotoVision`은 `DaySignals` 안에 들어가지 않는다.** 나란히 흐른다.

**왜인가** — 셋 다 004를 지키기 위해서다:

1. **수집 시점이 다르다.** 004의 신호는 파이프라인 3단계에서 한 번에 모이고, 캡션은
   5단계 직전에 모델을 열어야 나온다. 같은 타입에 넣으면 「신호를 가져온다」가 갑자기
   모델을 여는 일이 된다.
2. **`vision: "none"`이면 아예 없다.** `DaySignals`의 자리는 언제나 채워지는데(값이
   `unknown`이더라도), 캡션은 **설정에 따라 존재하지 않는다.** 자리를 두면 「보지 않음」인
   하루에도 `unknown`이 들어가고, 그것은 「보려 했는데 못 봤다」와 구분되지 않는다.
3. **004의 테스트가 그대로 통과해야 한다.** `DaySignals`를 넓히면 002·004·005·009의
   모든 판정이 영향받는다 — 004가 `Photo[]`를 `PhotoObservation`으로 바꿀 때 자리 수를
   그대로 둔 것과 같은 판단(FR-026).

---

## 새 타입 — `src/vision/types.ts`

### `PhotoCaption` — 사진 한 장을 읽은 결과

```ts
export type PhotoCaption = {
  /** 어느 사진인가. 004의 Photo.id를 그대로 쓴다 */
  photoId: string;
  /** 언제 찍혔는가. 프롬프트가 「하루의 어느 때」를 말하는 근거 (FR-007b) */
  takenAt: Date;
  /** 읽어 낸 문장. 빈 문자열이 아니다 — 비면 실패이며 이 값이 만들어지지 않는다 */
  text: string;
};
```

**금지**(원칙 IV): 처리 시간·토큰 수·확신도를 담지 않는다. **자리가 없으면 담을 수 없다** —
005의 `RunResult`가 `{ text, ending }` 둘뿐인 것과 같은 방어.

**⚠️ `confidence`를 두고 싶어지는 자리다.** 두면 「낮은 것은 빼자」가 한 줄로 가능해지고,
그것이 임계값이며 원칙 IV로 가는 길이다. spec FR-011이 확신도를 이미 금지했다.

### `PhotoVision` — 하루의 사진을 읽은 결과

```ts
export type PhotoVision = {
  /** 읽어 낸 것들. 찍힌 시각 순 */
  captions: PhotoCaption[];
  /**
   * 읽으려고 고른 사진의 수 (FR-006).
   *
   * `captions.length`와 다를 수 있다 — 고른 5장 중 2장이 실패하면 3과 5다.
   * **둘이 함께 있어야 뜻이 산다**: 004의 photosWithLocation/photosConsidered와 같은 구조.
   */
  considered: number;
  /**
   * 그 하루에 실제로 있던 사진의 수.
   *
   * `considered`보다 클 수 있다 — 12장 중 5장을 골랐으면 5와 12다.
   * **이것이 「본 것이 전부가 아니다」의 근거**(FR-012, SC-007).
   */
  available: number;
};
```

**세 수가 서로 다른 것을 말한다**:

| 하루 | `available` | `considered` | `captions.length` | 뜻 |
| --- | ---: | ---: | ---: | --- |
| 사진 3장, 다 읽힘 | 3 | 3 | 3 | 전부 보았다 |
| 사진 12장 | 12 | 5 | 5 | **있는 것 중 다섯만 보았다** |
| 사진 5장, 1장 실패 | 5 | 5 | 4 | **보려 했으나 하나를 못 읽었다** |
| 사진 5장, 전부 실패 | 5 | 5 | 0 | **있는데 하나도 못 읽었다** |

**마지막 줄이 원칙 V의 자리다.** `captions`가 비었지만 이것은 **「사진이 없다」가
아니다** — 004의 `photos`가 `none`인 것과 완전히 다른 사실이며, 프롬프트가 다르게 적는다.

### `VisionOutcome` — 사진 읽기가 어떻게 끝났는가

```ts
export type VisionOutcome =
  | { kind: "skipped" }                        // vision === "none" (FR-003)
  | { kind: "no-photos" }                      // 004가 none/unknown이라 볼 것이 없다
  | { kind: "seen"; vision: PhotoVision }      // 읽었다 (전부 실패도 여기다)
  | { kind: "not-ready"; reason: string }      // 모델이 기기에 없다 (FR-027)
  | { kind: "failed"; reason: string }         // 열지 못했거나 무너졌다
  | { kind: "cancelled" };                     // 사용자가 그만뒀다 (FR-009)
```

**`seen`과 `no-photos`가 갈리는 것이 핵심이다.** 전자는 「보았다(하나도 못 읽었을
수 있다)」이고 후자는 「볼 것이 없었다」다.

**⚠️ `no-photos`가 004의 `none`과 `unknown`을 뭉개지 않는가**: 뭉개지 않는다.
`vision`은 004의 값을 **바꾸지 않고**, 프롬프트는 004의 `photos` 신호를 **여전히 그대로**
적는다(「사진: 없었다」 / 「사진: 모른다」). `no-photos`는 「그래서 캡션 단계를 돌지
않았다」는 뜻일 뿐이다.

### `VisionDepth` — 얼마나 자세히 볼 것인가

```ts
/** VisionSetting에서 파생된다. "none"은 여기 오지 않는다 */
export type VisionDepth = "quick" | "detailed";
```

**`VisionSetting`을 그대로 쓰지 않는 까닭**: `none`은 「깊이」가 아니라 「하지 않음」이다.
포트가 `none`을 받을 수 있으면 「깊이가 none인 캡션」이라는 뜻 없는 상태가 타입에 생긴다.
002가 `SignalValue`에서 `unknown`이 값을 갖지 못하게 한 것과 같은 판단.

---

## 재사용하는 타입 — 새로 만들지 않는다

| 타입 | 어디서 | 어떻게 쓰는가 |
| --- | --- | --- |
| `ModelReadiness` | `src/models/types.ts` | 사진 보는 모델의 준비 상태(FR-026). **갈래 넷을 그대로 쓴다** — `partial`이 있어 「본체만 받고 mmproj가 없다」를 표현한다 |
| `DownloadProgress` | `src/models/types.ts` | ⚠️ **`character: Character`를 담고 있다.** 사진 보는 모델은 캐릭터가 아니므로 **그대로 못 쓴다** → 아래 참조 |
| `Photo` | `src/signals/types.ts` | 고르기의 입력. 손대지 않는다 |
| `VisionSetting` | `src/diary/types.ts` | 002부터 있던 것. **바꾸지 않는다** |

### ⚠️ `DownloadProgress`가 캐릭터에 묶여 있다 — 설계 중에 찾았다

```ts
export type DownloadProgress = {
  character: Character;      // ← 사진 보는 모델은 캐릭터가 아니다
  fraction: number | null;
};
```

003이 「캐릭터 단위다」를 **의도적으로** 못 박은 자리다(FR-013a: 파일 이름·개수·바이트를
담지 않는다 — 바이트를 담으면 그것이 모델 크기다).

**해결**: `character` 자리를 넓히지 않고 **대상을 가리키는 갈래**로 바꾼다.

```ts
export type DownloadTarget =
  | { kind: "character"; character: Character }
  | { kind: "vision" };                          // 하나뿐이므로 식별자가 없다

export type DownloadProgress = {
  target: DownloadTarget;
  fraction: number | null;
};
```

**`{ kind: "vision" }`에 식별자가 없는 것이 방어다**(FR-031a) — 모델명이 지나갈 통로가
없다. 003이 `AssetKey`를 불투명하게 둔 것과 같은 판단이며, 여기서는 **아예 자리가 없다.**

**이 변경이 008의 `DownloadView`·`DownloadRejection`에 번진다.** `busyWith: Character`도
같은 이유로 `DownloadTarget`이 되어야 한다 — 사진 보는 모델을 받는 중에 캐릭터를 누르면
008이 만든 거부 안내가 **무엇을 멈추라고 말할지 몰라야 하기 때문이다.**

---

## 사진 보는 모델의 자산 — `src/vision/roster.ts`

```ts
type VisionAsset = {
  /** 파일 이름이 되는 불투명한 값. 003의 AssetKey와 같은 성질 */
  key: string;
  url: string;
  expectedBytes: number;
  md5: string;          // 첫 내려받기에서 채록한다 (FR-031, 원칙 V)
};

/** 본체와 mmproj **둘 다** 있어야 쓸 수 있다 */
type VisionAssets = { base: VisionAsset; projector: VisionAsset };
```

**★ `src/models/roster.ts`와 별개의 파일이며 서로 import 하지 않는다.**

합치면 「캐릭터가 사진을 본다」는 잘못된 모양이 코드에 생기고, 003이 지킨 「캐릭터 →
자산은 있고 자산 → 캐릭터는 없다」(FR-003)의 한 방향성이 흐려진다.

**`allAssets()`를 두지 않는다** — 003 FR-010과 같은 이유. 여기서는 자산이 둘(본체·mmproj)
이므로 **둘을 함께 다루는 함수는 필요하다.** 다만 그것이 **밖으로 나가지 않는다**:
준비 상태는 `ModelReadiness` 하나로만 나간다(FR-026).

### 준비 상태를 둘에서 하나로 접는 규칙 (FR-027)

| 본체 | mmproj | 밖으로 나가는 값 |
| --- | --- | --- |
| ready | ready | `ready` |
| ready | not-downloaded | **`partial`** — 「일부만 있음」 |
| not-downloaded | 무엇이든 | `not-downloaded` |
| unusable | 무엇이든 | `unusable` |
| partial | 무엇이든 | `partial` |

**하나라도 없으면 `ready`가 아니다**(FR-027, SC-009). 003의 갈래 넷이 **파일이 둘일 때도
그대로 성립한다** — 003이 `partial`을 「이어받으면 된다」로 정의한 것이 여기서 값을 한다.

---

## 파이프라인 단계가 하나 는다

```ts
export type PipelineStage =
  | "day-not-closed"
  | "already-running"
  | "signals"
  | "request-build"
  | "model-not-ready"
  | "vision"          // ★ 새로 생긴다
  | "generation"
  | "storage";
```

**왜 `generation` 안에 넣지 않는가**: 사용자가 할 일이 다르다.

- `vision` 실패 → 「사진 보는 것을 준비해야 한다」 / 「사진 설정을 보지 않음으로 바꿔라」
- `generation` 실패 → 「캐릭터를 준비해야 한다」 / 다시 시도

003이 `model-not-ready`를 `generation`과 따로 둔 것과 **같은 판단**이다. 뭉개면 002
FR-019(어느 단계에서 멈췄는지 말한다)가 무의미해진다.

**어디에 놓이는가**: `model-not-ready` **뒤**, `generation` **앞**이다.

```
4b. model-not-ready   ← 캐릭터 모델이 있는가
5.  vision            ← ★ 사진을 읽는다 (VLM 열고 닫는다)
6.  generation        ← 캐릭터 모델을 연다
```

**순서의 근거는 E1이다**(research §2). 그리고 **캐릭터 모델이 없는데 사진부터 읽으면**
10초를 쓰고 나서 「캐릭터가 없다」고 말하게 된다 — 사용자의 시간을 버린다.

---

## 화면으로 나가는 것 / 나가지 않는 것

003의 안쪽/바깥쪽 구분을 그대로 쓴다.

| 안쪽 (화면 금지) | 바깥쪽 (화면 허용) |
| --- | --- |
| `VisionAsset`, `VisionAssets` — url·바이트·md5 | `ModelReadiness` — 준비 상태 넷 |
| `PhotoCaption.photoId` — 기기 안 식별자 | `VisionSetting` — 사용자가 고른 것 |
| `image_max_tokens` 등 모델 설정 | `DownloadProgress` — 진행률(대상은 `{kind:"vision"}`) |

**⚠️ `PhotoVision`은 어느 쪽인가**: **화면에 나가지 않는다.**

캡션 텍스트는 **일기의 입력이지 사용자가 읽는 것이 아니다.** 화면에 보이면:

1. 005 FR-028b(생성 중인 글을 보여주지 않는다)의 같은 위반 — 판정을 거치지 않은 글이
   화면에 오른다
2. 사용자가 캡션과 일기를 견주게 되고, 그것이 곧 품질 비교다(원칙 IV)

**목록·상세에 보이는 것은 004가 이미 주는 「사진 N장」뿐이다.** 011이 그것을 바꾸지
않는다.

---

## 저장되는 것 / 저장되지 않는 것

| 값 | 저장 | 어디 |
| --- | --- | --- |
| 사진 설정 | **한다** | `files/preferences/vision-setting.json` (007의 캐릭터 선택과 같은 방식) |
| 사진 보는 모델 파일 | **한다** | 003의 모델 저장 자리 |
| `PhotoVision`(캡션) | **★ 하지 않는다** | — |

**캡션을 저장하지 않는 것이 원칙 I이다.** 저장하면 「같은 하루를 다시 쓸 때 캡션을
재사용하자」가 자연스러워지고, 그 순간 **미리 만들어 둔 응답**이 된다. 005가 일기 생성에
캐싱을 두지 않은 것과 같은 판단이며, spec Out of Scope가 명시했다.

**대가는 10초를 다시 쓰는 것이다.** 그것이 옳다 — 헌법 원칙 I이 「개발 편의를 위해서도
만들지 않는다」고 못 박았다.
