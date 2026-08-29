# Contract: 헌법 검사 새 규칙 (023)

**Feature**: `023-photo-selection-algorithm` | **파일**: `scripts/constitution-rules.ts`

023이 여는 두 경계를 `check-constitution`이 강제한다. 007~021의 관례대로,
새 규칙마다 위반을 실제로 주입해 잡히는지 확인한다.

---

## G1. `src/vision/`이 픽셀·이미지 채점에 닿지 못하게 (FR-023, 원칙 IV)

기존 `checkVisionFile()`(constitution-rules.ts ~356행)이 이미 `src/vision/`을
대상으로 `VISION_TOUCHES_DIARY`·`VISION_SHARES_SAMPLING`를 본다. 여기에
**이미지 채점·픽셀 처리 어휘**를 잡는 규칙을 더한다.

```ts
/**
 * 사진 분류가 픽셀·이미지 채점에 닿는 것을 잡는다 (023 FR-023, 원칙 IV).
 *
 * 023의 분류는 파일 경로의 폴더 이름 문자열 대조뿐이다. 픽셀을 디코드하거나
 * 밝기·대비·엔트로피를 재거나 "품질 점수"를 매기면 그것이 이미지 채점이며,
 * 이 저장소가 되돌리기의 이유로 삼은 것(원칙 IV)이다.
 *
 * **`resize.ts`를 오탐하지 않는다**: 리사이즈는 `ResizeExecutor` 주입으로
 * 격리돼 순수 계약에 픽셀 어휘가 없다. 아래 토큰은 디코드·채점에 특정된
 * 것만 골랐다 — "resize"·"maxLongEdge"는 포함하지 않는다.
 */
const VISION_SCORES_IMAGE =
  /\b(?:decodePixels|getImageData|pixelData|imageEntropy|brightness|contrast|histogram|blurScore|qualityScore|sharpness|isBlank|isBlackImage|Jimp|sharp\(|canvas\.getContext)\b/;
```

- `checkVisionFile()`의 루프에 `if (VISION_SCORES_IMAGE.test(code))` 분기
  추가, rule 문구:
  `"사진 분류가 픽셀·이미지 채점에 닿는다 — 폴더 이름 대조로 끝나야 한다 (023 FR-023, 원칙 IV)"`
- 주석 줄은 기존처럼 벗겨낸 뒤 검사(설명이 위반으로 잡히면 안 됨).

## G2. `src/signals/expo-port.ts`가 잡사진 판정을 하지 못하게 (spec Clarification)

분류 판정(잡사진 폴더 목록 대조)은 순수 계층(`select.ts`)에만 있어야 한다.
`expo-port.ts`는 폴더 이름 **문자열 추출**까지만 한다.

```ts
/**
 * 기기 통로(expo-port.ts)가 잡사진 판정을 하는 것을 잡는다 (023, spec
 * Clarification 2026-08-29).
 *
 * 폴더 이름을 뽑는 것(마지막 "/" 앞 세그먼트)까지가 expo-port.ts의 몫이다.
 * 그 이름이 스크린샷·다운로드 폴더인지 대조하는 것은 select.ts만 한다 —
 * NON_CAMERA_FOLDERS를 import하거나, "screenshot"/"잡사진" 판정 어휘가
 * 여기 나오면 분류가 기기 계층으로 샌 것이다.
 */
const PORT_CLASSIFIES_PHOTO =
  /NON_CAMERA_FOLDERS|\bfrom\s+["'][^"']*vision\/(?:select|classify)["']|\b(?:isScreenshot|isNonCamera|classifyPhoto)\b/;
```

- 새 함수 또는 `checkSourceFile`의 기존 골격에 얹는다 — 대상은
  `src/signals/expo-port.ts` 한 파일. rule 문구:
  `"기기 통로가 잡사진을 판정한다 — 폴더 이름 추출까지만, 대조는 select.ts (023, spec Clarification)"`

---

## G3. 위반 주입 (구현 시 실제로 어겨 본다)

| # | 주입 | 잡는 것 |
|---|---|---|
| 1 | `select.ts`에 `const b = getImageData(photo);` 한 줄 | G1 (`VISION_SCORES_IMAGE`) |
| 2 | `expo-port.ts`에 `import { NON_CAMERA_FOLDERS } from "../vision/select";` | G2 (`PORT_CLASSIFIES_PHOTO`) |
| 3 | `selectForVision(photos, limit)` — 둘째 인자 추가 | `tsc` (계약 테스트가 소스 선언을 읽어 인자 수 검사 — 011 S1) |

3번은 헌법 검사가 아니라 `select.test.ts`의 소스 직접 읽기 계약이 잡는다
(009·011에서 `Function.length`가 기본값 인자를 안 세는 함정을 겪어 확립된
패턴). 셋 다 실제로 잡히는 것을 확인하고 되돌린다.

---

## G4. 기존 규칙은 그대로 유효한지 확인

023은 `select.ts`에 순수 함수를 더할 뿐이므로:
- `VISION_TOUCHES_DIARY` — `select.ts`는 여전히 `diary/store`·`pipeline`을
  import하지 않는다. ✓
- `VISION_SHARES_SAMPLING` — `select.ts`는 샘플링과 무관. ✓

`PhotoFacts`·`Photo` 확장은 `src/signals/`에 있고 `checkVisionFile` 대상이
아니다. `src/signals/`에 대한 기존 규칙(있다면)과 충돌하지 않는지
`check-constitution.test.ts` 전체 통과로 확인한다.
