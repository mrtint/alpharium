/**
 * 고른 캐릭터의 판정 규칙.
 *
 * 계약: specs/007-diary-ui-refinement/contracts/selection.md §1
 *       specs/007-diary-ui-refinement/data-model.md §2 전이표
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 순수 함수인가**: 이 규칙이 007에서 갈래가 가장 많은 판단이고, 그중 하나
 * (「고른 캐릭터를 지운 직후」)는 **기기에서 만들어 내기 번거로운 상태**다.
 * 006이 `state.ts`를, 003이 `readinessOf`를 순수 함수로 둔 것과 같은 이유로
 * 여기서도 갈래 전부를 기기 없이 검증한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { resolveSelection } from "../../src/app/selection";

describe("resolveSelection (007 contracts/selection.md §1 검증 표)", () => {
  it("1. 고른 것이 준비돼 있으면 그대로다", () => {
    const state = resolveSelection("quiet", ["quiet", "narrative"]);

    expect(state).toEqual({ kind: "selected", character: "quiet" });
    // **옮기지 않았으므로 알릴 것이 없다** — 여기 movedFrom이 붙으면 바뀌지 않았는데
    // 「바뀌었다」고 알리게 된다.
    expect(state).not.toHaveProperty("movedFrom");
  });

  it("2. 준비된 것이 그것 하나뿐이어도 그대로다", () => {
    expect(resolveSelection("quiet", ["quiet"])).toEqual({
      kind: "selected",
      character: "quiet",
    });
  });

  it("3. 고른 것이 준비를 잃으면 다른 것으로 옮기고 그 사실을 남긴다(FR-005·005a)", () => {
    const state = resolveSelection("quiet", ["narrative"]);

    expect(state).toEqual({
      kind: "selected",
      character: "narrative",
      movedFrom: "quiet",
    });
  });

  it("4. 옮길 곳이 없으면 고른 것이 없다(FR-005c)", () => {
    // **준비되지 않은 것을 고른 상태로 남기지 않는다** — 그러면 쓰려다 실패한다.
    expect(resolveSelection("quiet", [])).toEqual({ kind: "none" });
  });

  it("★ 5. 고른 적이 없으면 준비된 것이 있어도 고르지 않는다(FR-008)", () => {
    // ─────────────────────────────────────────────────────────────────────────
    // **이 표의 핵심이다.** 앱이 말없이 첫 준비된 것을 집던 것이 007이 고치는 결함이며,
    // 「옮김」은 사용자가 이미 고른 뒤에만 일어난다.
    // ─────────────────────────────────────────────────────────────────────────
    expect(resolveSelection(null, ["narrative"])).toEqual({ kind: "none" });
  });

  it("6. 고른 적도 없고 준비된 것도 없으면 없다", () => {
    expect(resolveSelection(null, [])).toEqual({ kind: "none" });
  });

  it("7. 옮길 곳이 여럿이면 첫 준비된 것으로 간다", () => {
    const state = resolveSelection("quiet", ["narrative", "english"]);

    expect(state).toEqual({
      kind: "selected",
      character: "narrative",
      movedFrom: "quiet",
    });
  });

  /**
   * **성격을 근거로 고르지 않는다**(FR-008).
   *
   * 어디로 옮기든 알리고 되돌릴 수 있으므로 이 선택이 사용자를 가두지 않는다.
   * 「imaginative가 상상을 섞으니 피하자」 같은 판단을 여기 넣으면 그것이 추천이다.
   */
  it("옮길 대상을 성격으로 고르지 않는다 — 순서에서 첫 준비된 것이다", () => {
    // imaginative가 앞에 있으면 그것으로 간다. 성격을 보지 않는다.
    const state = resolveSelection("quiet", ["imaginative", "narrative"]);

    expect(state).toEqual({
      kind: "selected",
      character: "imaginative",
      movedFrom: "quiet",
    });
  });

  it("파일을 읽지 못한 것과 고른 적 없는 것은 같은 자리로 간다(원칙 V)", () => {
    // loadSelection()이 읽기 실패를 null로 돌려주므로 여기서는 5번과 같다.
    // **지어내지 않는다** — 깨진 파일에서 캐릭터를 만들어 내지 않는다.
    expect(resolveSelection(null, ["quiet"])).toEqual({ kind: "none" });
  });
});
