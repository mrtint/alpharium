/**
 * 108 — 홈 제약 띠가 무엇을 보일지 정하는 판정 (순수).
 *
 * 계약: specs/108-notice-unification/contracts/constraint-band.md CB1~CB5
 */

import { constraintBandFor, type ConstraintBandInput } from "../../src/app/constraint-band";

const base: ConstraintBandInput = {
  photoDenied: false,
  platform: "android",
  autoWriteEnabled: true,
  battery: "restricted",
};

describe("CB1 — 사진 권한이 거부면 다른 입력과 무관하게 photos", () => {
  it.each([
    ["android·restricted", base],
    ["android·exempt", { ...base, battery: "exempt" as const }],
    ["ios", { ...base, platform: "ios" as const }],
    ["자동 쓰기 꺼짐", { ...base, autoWriteEnabled: false }],
    ["자동 쓰기 모름", { ...base, autoWriteEnabled: undefined }],
  ])("%s", (_name, input) => {
    expect(constraintBandFor({ ...input, photoDenied: true })).toBe("photos");
  });
});

describe("CB2 — 사진 권한 거부가 아니고 android + 자동 쓰기 켬 + restricted면 battery", () => {
  it("photoDenied false", () => {
    expect(constraintBandFor(base)).toBe("battery");
  });
  it("photoDenied undefined(아직 못 읽음)도 배터리는 판정한다", () => {
    expect(constraintBandFor({ ...base, photoDenied: undefined })).toBe("battery");
  });
});

describe("CB3 — 그 밖에는 띠가 없다", () => {
  it.each([
    ["ios", { ...base, platform: "ios" as const }],
    ["자동 쓰기 꺼짐", { ...base, autoWriteEnabled: false }],
    ["자동 쓰기 모름", { ...base, autoWriteEnabled: undefined }],
    ["exempt", { ...base, battery: "exempt" as const }],
    ["unknown(원칙 V — 모르면 보이지 않는다)", { ...base, battery: "unknown" as const }],
  ])("%s", (_name, input) => {
    expect(constraintBandFor(input)).toBeNull();
  });
});

describe("CB4 — 두 조건이 함께 참이면 photos 하나", () => {
  it("photoDenied true + restricted", () => {
    expect(constraintBandFor({ ...base, photoDenied: true })).toBe("photos");
  });
});

describe("CB5 — 전수: 반환은 photos·battery·null 셋뿐이고 photos가 항상 먼저다", () => {
  const photo = [true, false, undefined] as const;
  const platforms = ["android", "ios"] as const;
  const auto = [true, false, undefined] as const;
  const battery = ["restricted", "exempt", "unknown"] as const;
  for (const p of photo)
    for (const pl of platforms)
      for (const a of auto)
        for (const b of battery) {
          it(`photo=${String(p)} ${pl} auto=${String(a)} ${b}`, () => {
            const got = constraintBandFor({
              photoDenied: p,
              platform: pl,
              autoWriteEnabled: a,
              battery: b,
            });
            const expected =
              p === true
                ? "photos"
                : pl === "android" && a === true && b === "restricted"
                  ? "battery"
                  : null;
            expect(got).toBe(expected);
          });
        }
});
