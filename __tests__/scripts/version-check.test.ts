/**
 * 096 — 안드로이드 versionCode 판정(`scripts/android-release/version-check.ts`)의 계약 A1~A5.
 * 스토어 응답은 목록 대역이다. 실제 Play 응답은 첫 실행에서만 본다(specs/096-release-build-number-check/research.md).
 */

import {
  decideVersionCode,
  describeVersionCode,
} from "../../scripts/android-release/version-check.ts";

describe("096 versionCode 판정", () => {
  it("A1 스토어 번들이 하나도 없으면 통과한다 (마지막 번호 없음)", () => {
    expect(decideVersionCode(1, [])).toEqual({ ok: true, last: undefined });
  });

  it("A2 스토어 최댓값보다 크면 통과한다", () => {
    expect(decideVersionCode(13, [10, 12, 11])).toEqual({ ok: true, last: 12 });
  });

  it("A3 최댓값과 같으면 실패하고 이미 있는 번호·올릴 값·app.json 위치를 말한다", () => {
    const verdict = decideVersionCode(12, [10, 12]);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict).toMatchObject({ relation: "same", last: 12, minimum: 13 });
    expect(verdict.message).toContain("12");
    expect(verdict.message).toContain("13");
    expect(verdict.message).toContain("expo.android.versionCode");
  });

  it("A3 중간 번호가 이미 있어도 같음으로 실패한다 (최댓값보다 작아도 same이 먼저)", () => {
    const verdict = decideVersionCode(10, [9, 10, 12]);
    expect(verdict).toMatchObject({ ok: false, relation: "same", last: 12, minimum: 13 });
  });

  it("A4 최댓값보다 작고 중복도 아니면 lower로 실패하고 마지막 번호와 이번 번호를 모두 말한다", () => {
    const verdict = decideVersionCode(9, [10, 12]);
    expect(verdict).toMatchObject({ ok: false, relation: "lower", last: 12, minimum: 13 });
    if (verdict.ok) return;
    expect(verdict.message).toContain("9");
    expect(verdict.message).toContain("12");
    expect(verdict.message).toContain("13");
  });

  it("A5 통과 한 줄은 버전·번호·커밋 앞 7자·스토어 마지막을 담는다", () => {
    expect(
      describeVersionCode({
        version: "1.2.3",
        current: 13,
        last: 12,
        commit: "0123456789abcdef",
      }),
    ).toBe("버전 1.2.3 · versionCode 13 · 커밋 0123456 · 스토어 마지막 12");
    expect(
      describeVersionCode({ version: "1.0.0", current: 1, last: undefined, commit: "abc" }),
    ).toBe("버전 1.0.0 · versionCode 1 · 커밋 abc · 스토어 마지막 없음");
  });
});
