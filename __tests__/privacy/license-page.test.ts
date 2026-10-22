/**
 * 101 — 고지 페이지 `site/licenses/index.html`의 계약 (specs/101-license-notice/contracts/license-page.md LP1~LP10).
 *
 * 전문은 `specs/101-license-notice/sources/`의 원문 파일과 글자까지 같아야 한다 — 요약이 아니라 받은 원문이 정본이다
 * (헌법 원칙 V). 모델 이름은 이 페이지에 나와도 된다: 앱 밖 페이지라 원칙 III(사용자 화면에 모델 식별자 비노출)이
 * 닿지 않는다. 앱 안 문구는 `__tests__/i18n/license-links.test.ts`가 막는다.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PLACEHOLDERS,
  ROOT,
  SITE,
  attrValues,
  readSite,
  sectionBy,
  stripHtmlComments,
} from "./read-site";

const PAGE = "licenses/index.html";
const SOURCES = join(ROOT, "specs/101-license-notice/sources");
const RESEARCH = readFileSync(join(ROOT, "specs/101-license-notice/research.md"), "utf8");

const ITEMS = ["kanana", "lfm", "llama-cpp", "llama-rn"] as const;
const BUNDLED = [
  ["nlohmann-json", "bundled-nlohmann-json-LICENSE.txt"],
  ["anyascii", "bundled-anyascii-LICENSE.txt"],
  ["stb-image", "bundled-stb-image-LICENSE.txt"],
  ["miniaudio", "bundled-miniaudio-LICENSE.txt"],
  ["opencl-headers", "bundled-opencl-headers-NOTICE.txt"],
] as const;
const ITEM_SOURCE: Record<(typeof ITEMS)[number], string> = {
  kanana: "kanana-LICENSE.txt",
  lfm: "lfm-LICENSE.txt",
  "llama-cpp": "llama-cpp-LICENSE.txt",
  "llama-rn": "llama-rn-LICENSE.txt",
};

const readSource = (name: string): string =>
  readFileSync(join(SOURCES, name), "utf8").replace(/\r\n/g, "\n");
const sha256 = (name: string): string =>
  createHash("sha256")
    .update(readFileSync(join(SOURCES, name)))
    .digest("hex");

/** HTML 엔티티를 풀어 원문 글자로 되돌린다 */
function unescapeHtml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** 항목(또는 하위 블록)이 가진 첫 `<pre>`의 내용 — 하위 `<section>`이 시작되기 전까지만 본다 */
function ownPre(section: string): string | null {
  const body = section.slice(section.indexOf(">") + 1);
  const nested = body.indexOf("<section");
  const own = nested === -1 ? body : body.slice(0, nested);
  const m = /<pre>([\s\S]*?)<\/pre>/.exec(own);
  return m === null ? null : unescapeHtml(m[1]).replace(/\r\n/g, "\n");
}

/** 표에서 `파일 | … | SHA-256` 해시를 읽는다 (research.md R1·R3) */
function researchHash(file: string): string | null {
  const re = new RegExp(file.replace(/\./g, "\\.") + "[^\\n]*?`([0-9a-f]{64})`");
  const m = re.exec(RESEARCH);
  return m === null ? null : m[1];
}

describe("101 licenses page — 고지 페이지", () => {
  it("LP1 — 페이지가 있고 lang ko·charset·viewport·title을 갖는다", () => {
    expect(existsSync(join(SITE, PAGE))).toBe(true);
    const html = readSite(PAGE);
    expect(html).toMatch(/<html lang="ko">/);
    expect(html).toMatch(/<meta charset="utf-8">/i);
    expect(html).toMatch(/<meta name="viewport"[^>]*width=device-width/);
    expect(html).toMatch(/<title>[^<]+<\/title>/);
  });

  it("LP2 — 외부 자원이 없다(스크립트 0·상대 경로 스타일시트만·외부 src 0)", () => {
    const html = stripHtmlComments(readSite(PAGE));
    expect(html).not.toMatch(/<script/i);
    for (const tag of html.match(/<link\b[^>]*\brel="stylesheet"[^>]*>/gi) ?? []) {
      expect(tag).toMatch(/\bhref="(?![a-z][a-z0-9+.-]*:|\/)[^"]+"/i);
    }
    expect(html).not.toMatch(/@import/);
    expect(html).not.toMatch(/\bsrc="https?:\/\//);
  });

  it("LP3 — data-license가 kanana·lfm·llama-cpp·llama-rn 순서대로 정확히 한 번씩 있다", () => {
    expect(attrValues(readSite(PAGE), "data-license")).toEqual([...ITEMS]);
  });

  describe.each(ITEMS)("항목 %s", (id) => {
    const section = (): string => sectionBy(readSite(PAGE), "data-license", id) ?? "";

    it("LP4 — 이름·저작권자 줄·라이선스 이름·원문 링크·확인일이 있다", () => {
      const html = stripHtmlComments(section());
      expect(html).toMatch(/<h2>[^<]+<\/h2>/);
      expect(html).toMatch(/<p>저작권자: [^<]+<\/p>/);
      expect(html).toMatch(/<p>라이선스: [^<]+<\/p>/);
      expect(html).toMatch(/<a href="https:\/\/[^"]+"/);
      expect(html).toMatch(/data-checked="2026-10-22"/);
    });

    it("LP5 — 전문(<pre>)이 원문 파일과 글자까지 같다", () => {
      expect(ownPre(section())).toBe(readSource(ITEM_SOURCE[id]));
    });

    it("LP7 — 원문 파일의 SHA-256이 research.md R1과 같다(원문 교체 탐지)", () => {
      const file = ITEM_SOURCE[id];
      expect(researchHash(file)).toBe(sha256(file));
    });
  });

  it("LP4 — kanana 항목은 재배포본(DevQuasar)의 출처와 저작권자 표기 없음을 밝힌다", () => {
    const html = stripHtmlComments(sectionBy(readSite(PAGE), "data-license", "kanana") ?? "");
    expect(html).toContain("DevQuasar");
    expect(html).toContain("원문에 저작권자 표기가 없음");
  });

  it("LP6 — llama.cpp·llama.rn 원문은 설치된 llama.rn과 같다(버전이 올라 고지가 낡으면 실패)", () => {
    const installed = (rel: string): string =>
      readFileSync(join(ROOT, "node_modules/llama.rn", rel), "utf8").replace(/\r\n/g, "\n");
    expect(readSource(ITEM_SOURCE["llama-cpp"])).toBe(installed("cpp/LICENSE"));
    expect(readSource(ITEM_SOURCE["llama-rn"])).toBe(installed("LICENSE"));
  });

  it("LP8 — llama-cpp 항목에 서드파티 하위 블록 다섯이 순서대로 있다", () => {
    const item = sectionBy(readSite(PAGE), "data-license", "llama-cpp") ?? "";
    expect(attrValues(item, "data-bundled")).toEqual(BUNDLED.map(([id]) => id));
  });

  describe.each(BUNDLED)("하위 블록 %s", (id, file) => {
    const block = (): string => sectionBy(readSite(PAGE), "data-bundled", id) ?? "";

    it("LP8 — 이름·저작권자·라이선스 이름이 있고 전문이 원문 파일과 같다", () => {
      const html = stripHtmlComments(block());
      expect(html).toMatch(/<h3>[^<]+<\/h3>/);
      expect(html).toMatch(/<p>저작권자: [^<]+<\/p>/);
      expect(html).toMatch(/<p>라이선스: [^<]+<\/p>/);
      expect(ownPre(block())).toBe(readSource(file));
      expect(researchHash(file)).toBe(sha256(file));
    });
  });

  it("LP8 — opencl-headers 블록은 Apache 2.0 원문 링크를 두고 본문은 Kanana 항목을 가리킨다고 적는다", () => {
    const html = stripHtmlComments(
      sectionBy(readSite(PAGE), "data-bundled", "opencl-headers") ?? "",
    );
    expect(html).toContain('href="https://www.apache.org/licenses/LICENSE-2.0"');
    // 가리키는 Kanana 항목의 전문이 실제로 Apache 2.0 Version 2.0이다.
    expect(ownPre(sectionBy(readSite(PAGE), "data-license", "kanana") ?? "")).toContain(
      "Version 2.0",
    );
    expect(html).toContain(
      "본문은 위 Kanana 항목에 실은 Apache License 2.0(Version 2.0) 전문과 같은 라이선스입니다",
    );
  });

  it("LP9 — lfm 항목은 본체와 mmproj 두 파일이 같은 라이선스라고 밝히고 조건을 줄여 말하지 않는다", () => {
    const html = stripHtmlComments(sectionBy(readSite(PAGE), "data-license", "lfm") ?? "");
    expect(html).toContain("본체와 mmproj");
    // 요약·해설 문장이 조건을 대신하지 않는다: 전문 밖에서 매출 기준을 말하지 않는다.
    const outsidePre = html.replace(/<pre>[\s\S]*?<\/pre>/g, "");
    expect(outsidePre).not.toMatch(/매출|Threshold|상업적/);
  });

  it("LP10 — 자리표시자가 없고 site/index.html이 이 페이지로 링크한다", () => {
    for (const p of PLACEHOLDERS) expect(readSite(PAGE)).not.toContain(p);
    expect(stripHtmlComments(readSite("index.html"))).toContain('href="licenses/"');
  });
});
