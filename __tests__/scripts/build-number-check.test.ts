/**
 * 096 — iOS 빌드 번호 판정(`scripts/ios-release/build-number-check.ts`)의 계약 I1~I5.
 * 스토어 응답은 목록 대역이다. 실제 App Store Connect 응답은 첫 실행에서만 본다.
 */

import {
  decideBuildNumber,
  describeBuildNumber,
} from "../../scripts/ios-release/build-number-check.ts";

describe("096 buildNumber 판정", () => {
  it("I2 이 버전의 스토어 빌드가 없으면 통과한다 (새 버전)", () => {
    expect(decideBuildNumber("1", "1.1.0", [])).toEqual({ ok: true, last: undefined, ignored: 0 });
  });

  it("더 크면 통과한다", () => {
    expect(decideBuildNumber("8", "1.0.0", ["5", "7", "6"])).toEqual({
      ok: true,
      last: 7,
      ignored: 0,
    });
  });

  it("I3 같으면 실패하고 버전 이름·이미 있는 번호·올릴 값·app.json 위치를 말한다", () => {
    const verdict = decideBuildNumber("7", "1.0.0", ["5", "7"]);
    expect(verdict).toMatchObject({ ok: false, relation: "same", last: 7, minimum: 8 });
    if (verdict.ok) return;
    expect(verdict.message).toContain("1.0.0");
    expect(verdict.message).toContain("7");
    expect(verdict.message).toContain("8");
    expect(verdict.message).toContain("expo.ios.buildNumber");
  });

  it("I3 작으면 lower로 실패한다", () => {
    expect(decideBuildNumber("4", "1.0.0", ["5", "7"])).toMatchObject({
      ok: false,
      relation: "lower",
      last: 7,
      minimum: 8,
    });
  });

  it("I3 마지막보다 작아도 이미 있는 번호면 same이다", () => {
    expect(decideBuildNumber("5", "1.0.0", ["5", "7"])).toMatchObject({
      ok: false,
      relation: "same",
    });
  });

  it("I1·I4 정수가 아닌 스토어 번호는 비교에서 빼고 개수를 알린다", () => {
    expect(decideBuildNumber("8", "1.0.0", ["7", "1.2.3", "x"])).toEqual({
      ok: true,
      last: 7,
      ignored: 2,
    });
    const verdict = decideBuildNumber("7", "1.0.0", ["7", "1.2.3"]);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.ignored).toBe(1);
    expect(verdict.message).toContain("1개");
  });

  it("I1 비교 가능한 번호가 하나도 없으면 통과하고 무시한 개수를 남긴다", () => {
    expect(decideBuildNumber("1", "1.0.0", ["1.2"])).toEqual({
      ok: true,
      last: undefined,
      ignored: 1,
    });
  });

  it("I5 통과 한 줄은 버전·빌드·커밋 앞 7자·스토어 마지막을 담는다", () => {
    expect(
      describeBuildNumber({ version: "1.0.0", current: "8", last: 7, commit: "0123456789abcdef" }),
    ).toBe("버전 1.0.0 · 빌드 8 · 커밋 0123456 · 스토어 마지막 7");
    expect(
      describeBuildNumber({ version: "1.1.0", current: "1", last: undefined, commit: "abc" }),
    ).toBe("버전 1.1.0 · 빌드 1 · 커밋 abc · 스토어 마지막 없음");
  });
});
