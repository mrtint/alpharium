import { resolveEnvironment } from "../../src/config/environment";
import { sinksFor } from "../../src/diagnostics/sink";

/**
 * contracts/diagnostics.md 「출력 경로」의 검증 표 4행.
 *
 * 두 불변식이 핵심이다:
 *  1. 모든 경우에 log가 포함된다 — prod에서 화면에 안 보이는 것이 안 남긴다는 뜻이 아니다(FR-007b)
 *  2. prod에서만 screen이 빠진다 — 엔드유저가 진단 정보를 보는 경우는 0건(SC-013)
 */
const resolved = (raw: string) => resolveEnvironment(raw);
const unresolved = () => resolveEnvironment("staging");

describe("sinksFor", () => {
  it("local은 화면과 로그 모두", () => {
    expect(sinksFor(resolved("local")).sort()).toEqual(["log", "screen"]);
  });

  it("dev는 화면과 로그 모두", () => {
    expect(sinksFor(resolved("dev")).sort()).toEqual(["log", "screen"]);
  });

  it("prod는 로그만", () => {
    expect(sinksFor(resolved("prod"))).toEqual(["log"]);
  });

  it("판정 실패 시 화면에 보인다 — 환경을 모르면 prod 규칙을 적용할 수 없다", () => {
    expect(sinksFor(unresolved()).sort()).toEqual(["log", "screen"]);
  });

  describe("불변식", () => {
    it("모든 경우에 log가 포함된다(FR-007b)", () => {
      const cases = [resolved("local"), resolved("dev"), resolved("prod"), unresolved()];
      cases.forEach((c) => expect(sinksFor(c)).toContain("log"));
    });

    it("prod에서만 screen이 빠진다(SC-013)", () => {
      expect(sinksFor(resolved("prod"))).not.toContain("screen");
      expect(sinksFor(resolved("local"))).toContain("screen");
      expect(sinksFor(resolved("dev"))).toContain("screen");
    });
  });
});
