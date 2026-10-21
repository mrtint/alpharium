/**
 * 089 — 세 페이지가 같은 스타일시트 셋을 같은 순서로 링크한다 (G10, contracts/site-style.md 링크 절).
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

import { PAGES, ROOT, readText, stripHtmlComments } from "./helpers";

const SITE = join(ROOT, "site");
const EXPECTED = ["tokens.css", "fonts.css", "site.css"];

describe.each(PAGES)("089 site 링크 — %s", (rel) => {
  const html = stripHtmlComments(readText(join(SITE, rel)));
  const links = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((m) => m[0])
    .filter((tag) => /\brel\s*=\s*"stylesheet"/i.test(tag));

  it("스타일시트 링크가 정확히 셋이고 순서가 tokens → fonts → site다", () => {
    const hrefs = links.map((tag) => /\bhref\s*=\s*"([^"]*)"/.exec(tag)?.[1] ?? "");
    expect(hrefs.map((h) => h.split("/").pop())).toEqual(EXPECTED);
  });

  it("경로가 상대 경로이고 실제 파일을 가리킨다", () => {
    for (const tag of links) {
      const href = /\bhref\s*=\s*"([^"]*)"/.exec(tag)?.[1] ?? "";
      expect(href).not.toMatch(/^([a-z]+:)?\/\//i);
      expect(href.startsWith("/")).toBe(false);
      expect(existsSync(join(SITE, dirname(rel), href))).toBe(true);
    }
  });
});
