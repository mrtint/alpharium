import { foldVisionReadiness } from "../../src/vision/readiness";
import type { ModelReadiness } from "../../src/models/types";

/**
 * 준비 상태 접기의 계약 테스트.
 *
 * 계약: specs/011-photo-vision-summary/data-model.md 「준비 상태를 둘에서 하나로 접는 규칙」
 *
 * **순수 함수이므로 전 갈래가 기기 없이 검증된다.** 003이 `readinessOf`를, 005가
 * `acceptance`를 순수 함수로 둔 것과 같은 판단이다.
 */

const ready: ModelReadiness = { kind: "ready" };
const missing: ModelReadiness = { kind: "not-downloaded" };
const partial: ModelReadiness = { kind: "partial", reason: "절반쯤", resumable: true };
const unusable: ModelReadiness = { kind: "unusable", reason: "깨졌다" };

describe("foldVisionReadiness — 규칙 표 (FR-027)", () => {
  it("둘 다 준비되면 ready", () => {
    expect(foldVisionReadiness(ready, ready)).toEqual({ kind: "ready" });
  });

  // ★ SC-009 — 이것이 이 함수의 핵심이다.
  it("본체만 있으면 ready가 아니다 — mmproj 없이는 서지 않는다", () => {
    expect(foldVisionReadiness(ready, missing).kind).not.toBe("ready");
  });

  it("mmproj만 있어도 ready가 아니다", () => {
    expect(foldVisionReadiness(missing, ready).kind).not.toBe("ready");
  });

  it("둘 다 없으면 not-downloaded", () => {
    expect(foldVisionReadiness(missing, missing)).toEqual({ kind: "not-downloaded" });
  });

  /**
   * **하나만 있는 것은 「없음」이 아니라 「일부만 있음」이다.**
   *
   * 「없음」으로 적으면 사용자가 처음부터 받는다고 생각하는데, 실제로는 이미 받아 둔
   * 파일이 자리를 차지하고 있다. 003이 `partial`과 `not-downloaded`를 가른 이유다.
   */
  it("하나만 준비되면 partial이며 이어받을 수 있다", () => {
    const folded = foldVisionReadiness(ready, missing);
    expect(folded.kind).toBe("partial");
    if (folded.kind === "partial") {
      expect(folded.resumable).toBe(true);
    }
  });

  it("일부만 받은 것이 있으면 partial", () => {
    expect(foldVisionReadiness(partial, ready).kind).toBe("partial");
    expect(foldVisionReadiness(ready, partial).kind).toBe("partial");
  });

  /**
   * **`unusable`을 가장 먼저 본다.** 쓸 수 없는 파일은 이어받기로 해결되지 않으며
   * 정리가 먼저다 — 003 FR-006a가 두 갈래를 가른 이유가 그것이다.
   */
  it.each([
    ["본체가", unusable, ready],
    ["mmproj가", ready, unusable],
    ["본체가 (상대가 없어도)", unusable, missing],
    ["mmproj가 (상대가 일부여도)", partial, unusable],
  ])("%s 쓸 수 없으면 unusable이 이긴다", (_label, base, projector) => {
    expect(foldVisionReadiness(base, projector).kind).toBe("unusable");
  });
});

describe("갈래를 늘리지 않는다 (FR-026)", () => {
  const all: ModelReadiness[] = [ready, missing, partial, unusable];

  it("003의 네 갈래 안에서만 답한다", () => {
    const kinds = new Set<string>();
    for (const base of all) {
      for (const projector of all) {
        kinds.add(foldVisionReadiness(base, projector).kind);
      }
    }

    for (const kind of kinds) {
      expect(["ready", "not-downloaded", "partial", "unusable"]).toContain(kind);
    }
  });

  // 원칙 III — 화면이 파일 개수를 알면 그것이 모델 구성의 정보다.
  it("결과에 파일이 둘이라는 것이 드러나지 않는다", () => {
    const folded = foldVisionReadiness(ready, missing);
    const serialized = JSON.stringify(folded);

    expect(serialized).not.toMatch(/mmproj|projector|base|본체|파일 2|두 파일/);
  });

  it("모든 조합에서 결과가 나온다 — 판정되지 않는 상태가 없다", () => {
    for (const base of all) {
      for (const projector of all) {
        expect(foldVisionReadiness(base, projector)).toBeDefined();
      }
    }
  });
});
