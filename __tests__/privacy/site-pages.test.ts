/**
 * 086 — 사이트 원문(`site/`)의 계약 (contracts/site-pages.md S1~S10).
 *
 * 방침의 문장 내용은 사람이 근거와 대조한다(SC-001 — quickstart 「실측」). 이 테스트는 절의 존재·순서, 외부 전송 표식과
 * 목록의 짝, 자리표시자, 단정 금지 낱말, 외부 자원 0을 잠근다. 자리표시자가 남아 있어도 통과한다(S6 — 게시를 막는 것은
 * `.github/workflows/pages.yml`의 검사 단계다).
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { OUTBOUND, FIX_POLICY } from "./outbound";
import {
  PLACEHOLDERS,
  SITE,
  attrValues,
  placeholderLike,
  readSite,
  sectionBy,
  sectionIds,
  stripHtmlComments,
} from "./read-site";

import { PRIVACY_URL } from "../../src/app/policy-links";

const PAGES = ["index.html", "privacy/index.html", "support/index.html"] as const;
const POLICY_SECTIONS = [
  "summary",
  "on-device",
  "outbound",
  "third-party",
  "retention",
  "permissions",
  "contact",
  "changes",
];

describe("086 site — 사이트 원문", () => {
  it("S1 — 세 페이지와 .nojekyll이 있다", () => {
    for (const rel of [...PAGES, ".nojekyll"]) expect(existsSync(join(SITE, rel))).toBe(true);
  });

  it.each(PAGES)("S2 — %s 는 lang ko·charset·viewport·title을 갖는다", (rel) => {
    const html = readSite(rel);
    expect(html).toMatch(/<html lang="ko">/);
    expect(html).toMatch(/<meta charset="utf-8">/i);
    expect(html).toMatch(/<meta name="viewport"[^>]*width=device-width/);
    expect(html).toMatch(/<title>[^<]+<\/title>/);
  });

  it.each(PAGES)("S3 — %s 는 외부 자원을 부르지 않는다(스크립트·외부 스타일·외부 src 0)", (rel) => {
    const html = stripHtmlComments(readSite(rel));
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<link[^>]*rel="stylesheet"/i);
    expect(html).not.toMatch(/@import/);
    expect(html).not.toMatch(/\bsrc="https?:\/\//);
  });

  it("S4 — 방침의 절 여덟이 순서대로 있다", () => {
    const ids = sectionIds(readSite("privacy/index.html")).filter((id) =>
      POLICY_SECTIONS.includes(id),
    );
    expect(ids).toEqual(POLICY_SECTIONS);
  });

  it("S5 — outbound 절의 data-outbound 표식 = 외부 전송 목록(각 한 번, 목록 밖 0)", () => {
    const outbound = sectionBy(readSite("privacy/index.html"), "id", "outbound");
    expect(outbound).not.toBeNull();
    const marks = attrValues(outbound ?? "", "data-outbound");
    const ids = OUTBOUND.map((e) => e.id);
    const all = attrValues(readSite("privacy/index.html"), "data-outbound");
    // outbound 절 밖에 표식이 있으면 그것도 어긋남이다.
    expect({ marks: [...all].sort(), why: FIX_POLICY }).toEqual({
      marks: [...ids].sort(),
      why: FIX_POLICY,
    });
    expect(marks.length).toBe(all.length);
    expect(new Set(marks).size).toBe(marks.length);
  });

  it.each(OUTBOUND.map((e) => e.id))("S5 — data-outbound=%s 절에 근거 주석이 있다", (id) => {
    const body = sectionBy(readSite("privacy/index.html"), "data-outbound", id);
    expect(body).toMatch(/<!--\s*근거:/);
  });

  it("S6 — 자리표시자 꼴은 정해진 셋뿐이다(있어도 통과)", () => {
    const found = PAGES.flatMap((rel) => placeholderLike(readSite(rel)));
    const unknown = found.filter((p) => !(PLACEHOLDERS as readonly string[]).includes(p));
    expect(unknown).toEqual([]);
  });

  it("S7 — 문의 절: 메일 자리와 「처리가 끝나면 지체 없이 지웁니다」", () => {
    const contact = stripHtmlComments(
      sectionBy(readSite("privacy/index.html"), "id", "contact") ?? "",
    );
    expect(contact).toMatch(/\{SUPPORT_EMAIL\}|[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(contact).toMatch(/\{OPERATOR\}|책임자/);
    expect(contact).toContain("문의 처리가 끝나면 지체 없이 지웁니다");
  });

  it("S8 — 변경 이력: 시행일 자리·이력 목록·저장소 기록 링크", () => {
    const changes = stripHtmlComments(
      sectionBy(readSite("privacy/index.html"), "id", "changes") ?? "",
    );
    expect(changes).toMatch(/<ol|<ul/);
    expect(changes).toContain(
      'href="https://github.com/mrtint/alpharium/commits/main/site/privacy/index.html"',
    );
  });

  it("S9 — 지원 페이지: 방침 링크·메일 자리·자주 묻는 것 다섯", () => {
    const html = readSite("support/index.html");
    expect(stripHtmlComments(html)).toContain(`href="${PRIVACY_URL}"`);
    expect(stripHtmlComments(html)).toMatch(/\{SUPPORT_EMAIL\}|mailto:/);
    expect(attrValues(html, "data-faq")).toEqual([
      "download",
      "auto-write",
      "uninstall",
      "on-device",
      "place-name",
    ]);
  });

  it("S10 — 보존 절은 백업 포함을 단정하지 않는다(「포함될 수 있습니다」)", () => {
    const retention = stripHtmlComments(
      sectionBy(readSite("privacy/index.html"), "id", "retention") ?? "",
    );
    expect(retention).toContain("포함될 수 있습니다");
    expect(retention).not.toMatch(/포함됩니다|포함되지 않습니다/);
  });

  it("S10 — 지원 페이지도 백업을 단정하지 않는다(방침 보존 절과 같은 말)", () => {
    const uninstall = stripHtmlComments(
      sectionBy(readSite("support/index.html"), "data-faq", "uninstall") ?? "",
    );
    expect(uninstall).toContain("포함될 수 있지만");
    expect(stripHtmlComments(readSite("support/index.html"))).not.toMatch(
      /포함됩니다|포함되지 않습니다/,
    );
  });
});
