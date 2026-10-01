/**
 * 055 — 버전 표기 (data-model VersionText, spec FR-028).
 */
import { formatVersion } from "../../src/app/version";

describe("055 formatVersion", () => {
  it.each([
    ["1.0.0", "9", "1.0.0 (9)"],
    ["1.0.0", null, "1.0.0"],
    ["1.0.0", "", "1.0.0"],
    [null, "9", null],
    ["", "9", null],
    [null, null, null],
  ] as const)("(%p, %p) → %p", (name, build, expected) => {
    expect(formatVersion(name, build)).toBe(expected);
  });
});
