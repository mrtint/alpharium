/**
 * 089 — 페이지당 첫 로딩 글꼴 용량 상한 (G7, FR-010a·SC-006a, research R2).
 *
 * 브라우저는 페이지에 쓰인 글자가 속한 `unicode-range` 조각만, 쓰는 굵기마다 받는다. 그래서 (페이지 글자 집합 ×
 * 조각의 범위)로 필요한 파일을 추리고 크기를 합친다. 선언한 굵기를 모두 쓴다고 보는 상한 쪽 추정이다.
 */

import { statSync } from "node:fs";
import { join } from "node:path";

import {
  FONTS_CSS,
  FONTS_DIR,
  PAGES,
  parseFontFaces,
  readText,
  ROOT,
  stripHtmlComments,
} from "./helpers";

const BUDGET_BYTES = 1_000_000;

const faces = parseFontFaces(readText(FONTS_CSS));

/** 이름 있는 엔티티 — 모르는 것은 공백으로 센다(페이지는 지금 글자를 그대로 쓴다) */
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  nbsp: "\u00a0",
  middot: "\u00b7",
  hellip: "\u2026",
  rarr: "\u2192",
};

/** 페이지가 화면에 그리는 글자(태그·주석·스타일 제외) + 기본 ASCII */
function codepointsOf(html: string): Set<number> {
  const text = stripHtmlComments(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-zA-Z]+);/g, (whole, name: string) => ENTITIES[name] ?? " ");
  const cps = new Set<number>();
  for (const ch of text) cps.add(ch.codePointAt(0)!);
  for (let c = 0x20; c < 0x7f; c++) cps.add(c);
  return cps;
}

function neededBytes(cps: Set<number>): { bytes: number; files: number } {
  let bytes = 0;
  let files = 0;
  for (const f of faces) {
    const hit = [...cps].some((c) => f.ranges.some(([a, z]) => c >= a && c <= z));
    if (hit) {
      bytes += statSync(join(FONTS_DIR, f.file)).size;
      files += 1;
    }
  }
  return { bytes, files };
}

describe.each(PAGES)("089 글꼴 용량 — %s", (rel) => {
  const html = readText(join(ROOT, "site", rel));
  const { bytes, files } = neededBytes(codepointsOf(html));

  it(`선언 굵기를 모두 쓴다고 보아도 합계가 ${BUDGET_BYTES}바이트 이하다`, () => {
    expect(files).toBeGreaterThan(0);
    expect(bytes).toBeLessThanOrEqual(BUDGET_BYTES);
  });
});

describe("089 글꼴 용량 — 계산이 실제로 조각을 가린다", () => {
  it("한글 한 글자만 있는 페이지는 전체 합계의 일부만 필요하다", () => {
    const all = faces.reduce((n, f) => n + statSync(join(FONTS_DIR, f.file)).size, 0);
    const one = neededBytes(new Set([0xac00, 0x41]));
    expect(one.bytes).toBeGreaterThan(0);
    expect(one.bytes).toBeLessThan(all / 10);
  });

  it("글자가 늘면 필요한 용량이 줄지 않는다(단조)", () => {
    const small = neededBytes(new Set([0x41]));
    const large = neededBytes(new Set([0x41, 0xac00, 0xd55c, 0x6f22]));
    expect(large.bytes).toBeGreaterThanOrEqual(small.bytes);
  });
});
