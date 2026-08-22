/**
 * 사진 보는 모델의 준비 상태.
 *
 * 계약: specs/011-photo-vision-summary/data-model.md 「준비 상태를 둘에서 하나로 접는 규칙」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **파일이 둘인데 밖으로는 하나로 나간다**(FR-026).
 *
 * 003의 `ModelReadiness` 네 갈래를 그대로 쓴다 — 새 갈래를 만들지 않는다. 003이
 * 「한 캐릭터가 여러 파일을 가질 수 있는 모양은 열어 두되 밖으로는 하나의 수로 나간다」
 * (FR-033)고 적어 둔 자리가 여기서 값을 한다.
 *
 * **화면이 파일 개수를 알면 그것이 모델 구성의 정보다**(원칙 III). 「본체는 받았고
 * mmproj가 없다」가 화면에 보이면 사용자가 이 모델이 두 파일로 이뤄졌음을 알게 된다.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * **순수 함수다.** 기기에 닿지 않으므로 기기 없이 전 갈래가 검증된다.
 */

import type { ModelReadiness } from "../models/types";

/**
 * 본체와 mmproj의 준비 상태를 하나로 접는다.
 *
 * **하나라도 없으면 「쓸 수 있음」이 아니다**(FR-027, SC-009). `initMultimodal`이
 * mmproj 없이는 서지 않으므로, 본체만 있는 상태는 **쓸 수 없는 상태**다.
 *
 * | 본체 | mmproj | 결과 |
 * | --- | --- | --- |
 * | ready | ready | `ready` |
 * | ready | not-downloaded | **`partial`** |
 * | not-downloaded | 무엇이든 | `not-downloaded` |
 * | unusable | 무엇이든 | `unusable` |
 * | partial | 무엇이든 | `partial` |
 *
 * **순서가 있다.** 둘이 서로 다른 갈래일 때 무엇으로 볼지 정해져 있어야 같은 입력에
 * 같은 답이 나온다 — 005의 `endingOf()`가 같은 이유로 순서를 못 박았다.
 *
 * **`unusable`을 가장 먼저 본다**: 쓸 수 없는 파일이 하나라도 있으면 정리가 먼저다.
 * 이어받기로 해결되지 않기 때문이며, 003이 `partial`과 `unusable`을 가른 이유가
 * 그것이다(FR-006a).
 */
export function foldVisionReadiness(
  base: ModelReadiness,
  projector: ModelReadiness,
): ModelReadiness {
  // 1. 쓸 수 없는 것이 있으면 정리가 먼저다 — 이어받아도 해결되지 않는다.
  if (base.kind === "unusable") return base;
  if (projector.kind === "unusable") return projector;

  // 2. 둘 다 준비됐을 때만 쓸 수 있다 (FR-027).
  if (base.kind === "ready" && projector.kind === "ready") return { kind: "ready" };

  // 3. 하나라도 일부만 있으면 이어받을 수 있다.
  if (base.kind === "partial") return base;
  if (projector.kind === "partial") return projector;

  // 4. 하나는 있고 하나는 없다 — **일부만 있는 것이며 「없음」이 아니다.**
  //
  //    「없음」으로 적으면 사용자가 처음부터 받는다고 생각하는데, 실제로는 이미 받아 둔
  //    파일이 자리를 차지하고 있다. **받다 만 것과 같은 상태다.**
  if (base.kind === "ready" || projector.kind === "ready") {
    return {
      kind: "partial",
      reason: "사진을 보는 데 필요한 것이 아직 다 준비되지 않았다",
      resumable: true,
    };
  }

  // 5. 둘 다 없다.
  return { kind: "not-downloaded" };
}
