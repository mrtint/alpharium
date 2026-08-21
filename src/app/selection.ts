/**
 * 고른 캐릭터의 판정 규칙.
 *
 * 계약: specs/007-diary-ui-refinement/contracts/selection.md §1,
 *       data-model.md §2 전이표
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 헌법 원칙 III이 요구하는 「고르는 행위」가 여기서 성립한다.**
 *
 * 006까지 `App.tsx`의 `readyCharacter()`가 `CHARACTERS`를 돌며 **먼저 준비된 것 하나를
 * 말없이 집었다.** 다섯을 다 준비해 두어도 사용자는 어느 캐릭터가 자기 일기를 썼는지
 * 모르고 바꿀 방법도 없었다 — **로스터가 다섯인 이유가 화면에서 사라져 있었다.**
 *
 * **순수 함수만 둔다**(research.md §7). 파일을 읽지 않고 준비 상태를 스스로 판정하지
 * 않는다 — 둘 다 인자로 받는다. 그래야 갈래 전부가 기기 없이 검증된다(006의
 * `state.ts`, 003의 `readinessOf`와 같은 구조).
 *
 * **「알린다」를 값으로 만든다**(FR-005a). 옮겨졌다는 사실이 `movedFrom`으로 결과에
 * 실리므로, 화면이 스스로 이전 값과 비교해 판단하지 않는다 — 비교하면 같은 규칙이
 * 두 곳에 생긴다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Character } from "../diary/types";

/**
 * 지금 누가 쓰는가 (data-model.md §2).
 *
 * **갈래가 둘뿐이다.** 「옮겨졌다」는 별도 갈래가 아니라 `movedFrom`이라는 사실이다 —
 * 옮겨진 뒤에도 상태는 「골라져 있다」이고, 다른 점은 **알릴 것이 있다**는 것뿐이다.
 */
export type SelectionState =
  { kind: "selected"; character: Character; movedFrom?: Character } | { kind: "none" };

/**
 * 저장된 선택과 준비된 캐릭터로 지금 상태를 정한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ `stored`가 null이면 준비된 것이 있어도 고르지 않는다**(FR-008).
 *
 * 그것이 006의 결함 그 자체이며, 「옮김」은 **사용자가 이미 고른 뒤에만** 일어난다.
 * 옮길 대상은 `ready`의 첫 번째이고 **성격을 근거로 고르지 않는다** — 어디로 옮기든
 * 알리고(FR-005a) 되돌릴 수 있으므로(FR-005b) 이 선택이 사용자를 가두지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function resolveSelection(
  stored: Character | null,
  ready: readonly Character[],
): SelectionState {
  // 고른 적이 없다 — **자동으로 고르지 않는다**(FR-008).
  if (stored === null) return { kind: "none" };

  // 고른 것이 그대로 쓸 수 있다.
  if (ready.includes(stored)) return { kind: "selected", character: stored };

  // 고른 것이 준비를 잃었다 — 옮길 곳이 있으면 옮기고 **그 사실을 남긴다**(FR-005a).
  const moveTo = ready[0];
  if (moveTo === undefined) return { kind: "none" };

  return { kind: "selected", character: moveTo, movedFrom: stored };
}
