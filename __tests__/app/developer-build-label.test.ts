/**
 * 059 — 개발자 화면 머리글 오른쪽 글자 (계약 BL1, 보드 `6e` 「DEV · 1.0.0 (24)」 / `6j` 「1.0.0 (24)」).
 */

import { buildLabelFor } from "../../src/app/developer-build-label";

describe("BL1", () => {
  it("개발 환경은 「DEV · 버전」", () => {
    expect(buildLabelFor({ devEnvironment: true, versionText: "1.0.0 (24)" })).toBe(
      "DEV · 1.0.0 (24)",
    );
  });

  it("배포 환경은 버전만(「DEV」 없음)", () => {
    expect(buildLabelFor({ devEnvironment: false, versionText: "1.0.0 (24)" })).toBe("1.0.0 (24)");
  });

  it("버전을 못 읽으면 지어내지 않는다 — 개발 환경은 「DEV」, 배포는 빈 글자", () => {
    expect(buildLabelFor({ devEnvironment: true, versionText: null })).toBe("DEV");
    expect(buildLabelFor({ devEnvironment: false, versionText: null })).toBe("");
  });
});
