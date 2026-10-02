import { readFileSync } from "node:fs";
import { join } from "node:path";

import { skippedLineText } from "../../src/app/skipped-line";

/**
 * 057 — 설정 사진 행의 건너뜀 보조 줄 (보드 `6g`).
 *
 * 계약: specs/057-auto-write-rules/contracts/auto-write.md SL1, spec FR-010, Clarification Q5
 *
 * 「어제」는 **건너뛴 날**(일기의 날)을 보는 순간의 오늘과 비교한다. 그 밖(오늘 포함)은 「{M}월 {d}일」이다 — 「오늘」 문구는
 * 보드에 없어 두지 않는다.
 */

const NOW = new Date(2026, 8, 14, 10, 0);

describe("SL1 — 어제 / M월 d일", () => {
  it("어제면 보드 원문 「어제 …」", () => {
    expect(skippedLineText("2026-09-13", NOW)).toBe("어제 자동 쓰기를 건너뛰었어요");
  });

  it("그 전이면 「{M}월 {d}일 …」", () => {
    expect(skippedLineText("2026-09-11", NOW)).toBe("9월 11일 자동 쓰기를 건너뛰었어요");
  });

  it("오늘이면 날짜로 (「오늘」 문구 없음)", () => {
    expect(skippedLineText("2026-09-14", NOW)).toBe("9월 14일 자동 쓰기를 건너뛰었어요");
  });

  it("월·일에 앞 0이 없다", () => {
    expect(skippedLineText("2026-10-02", new Date(2026, 9, 20, 9, 0))).toBe(
      "10월 2일 자동 쓰기를 건너뛰었어요",
    );
  });

  it("자정 직후에는 방금 끝난 날이 어제다 (049 자정 경계)", () => {
    expect(skippedLineText("2026-09-13", new Date(2026, 8, 14, 0, 5))).toBe(
      "어제 자동 쓰기를 건너뛰었어요",
    );
    expect(skippedLineText("2026-09-13", new Date(2026, 8, 13, 23, 55))).toBe(
      "9월 13일 자동 쓰기를 건너뛰었어요",
    );
  });

  it("하루 경계를 다시 계산하지 않는다 (DB11)", () => {
    const code = readFileSync(join(__dirname, "../../src/app/skipped-line.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/getHours/);
    expect(code).toMatch(/latestClosedDay\(/);
  });
});
