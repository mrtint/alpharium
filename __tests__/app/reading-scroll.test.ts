/**
 * 052 — 읽기 스크롤의 접힘·펼침 판정.
 *
 * 계약: specs/052-reading-scroll/contracts/reading-scroll.md FOLD1~FOLD9
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  FOLD_AFTER,
  foldAfterScroll,
  UNFOLD_AT,
  type ScrollSample,
} from "../../src/app/reading-scroll";

const code = (file: string) =>
  readFileSync(join(__dirname, "../..", file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

/** 접어도 더 내릴 게 넉넉한 긴 본문 */
const sample = (over: Partial<ScrollSample>): ScrollSample => ({
  y: 0,
  previousY: 0,
  viewport: 600,
  content: 3000,
  stripHeight: 120,
  ...over,
});

describe("foldAfterScroll (052)", () => {
  it("FOLD1 — 펼침 + 아래로 + 9px → 접힘, 8px → 펼침 그대로", () => {
    expect(foldAfterScroll(false, sample({ previousY: 8, y: 9 }))).toBe(true);
    expect(foldAfterScroll(false, sample({ previousY: 7, y: 8 }))).toBe(false);
  });

  it("FOLD2 — 펼침 + 위로 가는 중이면 멀리 내려가 있어도 접지 않는다", () => {
    expect(foldAfterScroll(false, sample({ previousY: 60, y: 50 }))).toBe(false);
  });

  it("FOLD3 — y가 그대로(previousY === y = 9)면 위가 아니므로 접힘", () => {
    expect(foldAfterScroll(false, sample({ previousY: 9, y: 9 }))).toBe(true);
  });

  it("FOLD4 — 접힘 + 위로 + 2px → 펼침, 3px → 접힘 그대로", () => {
    expect(foldAfterScroll(true, sample({ previousY: 5, y: 2 }))).toBe(false);
    expect(foldAfterScroll(true, sample({ previousY: 6, y: 3 }))).toBe(true);
  });

  it("FOLD5 — 접힘 + 아래로(또는 제자리) + 0px → 접힘 그대로", () => {
    expect(foldAfterScroll(true, sample({ previousY: 0, y: 0 }))).toBe(true);
    expect(foldAfterScroll(true, sample({ previousY: 0, y: 1 }))).toBe(true);
  });

  it("FOLD6 — 접힘 + 위로 스크롤만으로는 펼치지 않는다(멀리 있으면)", () => {
    expect(foldAfterScroll(true, sample({ previousY: 200, y: 100 }))).toBe(true);
  });

  it("FOLD7 — 접은 뒤 더 내릴 거리가 8이면 접지 않고, 9면 접는다", () => {
    // 남는 거리 = content − viewport − stripHeight
    const at = (left: number) =>
      foldAfterScroll(
        false,
        sample({ previousY: 19, y: 20, viewport: 600, stripHeight: 100, content: 700 + left }),
      );
    expect(at(8)).toBe(false);
    expect(at(9)).toBe(true);
  });

  it("FOLD8 — 상수는 8·2이고 화면 소스에 스크롤 비교 숫자가 없다", () => {
    expect(FOLD_AFTER).toBe(8);
    expect(UNFOLD_AT).toBe(2);
    for (const file of ["src/ui/DiaryListScreen.tsx", "src/ui/WrittenDayPaper.tsx"]) {
      const src = code(file);
      expect(src).not.toMatch(/\by\s*>=?\s*8\b/);
      expect(src).not.toMatch(/\by\s*<=?\s*2\b/);
    }
  });

  it("FOLD9 — 판정 파일에 시각·타이머(디바운스)가 없다", () => {
    const src = code("src/app/reading-scroll.ts");
    expect(src).not.toMatch(/new Date\(|Date\.now\(|setTimeout/);
  });
});
