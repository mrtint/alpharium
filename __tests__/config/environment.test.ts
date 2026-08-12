import { resolveEnvironment } from "../../src/config/environment";

/**
 * contracts/environment.md 「검증 표」를 그대로 옮긴다.
 *
 * 대소문자와 공백을 관대하게 처리하지 않는 것이 핵심이다. 관대하면 설정 오타가 조용히
 * 통과하고, FR-009b가 막으려는 "모르는 채로 진행"이 발생한다.
 */
describe("resolveEnvironment", () => {
  describe("아는 값은 그대로 판정한다", () => {
    it.each([
      ["local", "local"],
      ["dev", "dev"],
      ["prod", "prod"],
    ] as const)("%s -> %s", (raw, expected) => {
      expect(resolveEnvironment(raw)).toEqual({ ok: true, environment: expected });
    });
  });

  describe("값이 없으면 missing으로 실패한다", () => {
    it("undefined", () => {
      expect(resolveEnvironment(undefined)).toEqual({
        ok: false,
        reason: "missing",
        received: undefined,
      });
    });

    it("빈 문자열", () => {
      expect(resolveEnvironment("")).toEqual({
        ok: false,
        reason: "missing",
        received: "",
      });
    });
  });

  describe("아는 값이 아니면 unknown으로 실패하며, 받은 값을 남긴다", () => {
    it.each(["staging", "PROD", " dev "])("%p", (raw) => {
      expect(resolveEnvironment(raw)).toEqual({
        ok: false,
        reason: "unknown",
        received: raw,
      });
    });
  });

  it("판정에 실패해도 기본값으로 떨어지지 않는다", () => {
    // 어느 쪽으로 떨어지든 "모르는데 진행한" 것이다.
    const result = resolveEnvironment("staging");
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty("environment");
  });
});
