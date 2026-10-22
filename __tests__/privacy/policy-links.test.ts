/**
 * 086 — 방침·지원 주소의 대조 (contracts/policy-facts.md L1~L5).
 *
 * 앱(`src/app/policy-links.ts`) ↔ 사이트(`site/`) ↔ 지원 페이지의 방침 링크 ↔ 선언 초안(`docs/store/`)이 같은 문자열을 쓴다.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { FIX_POLICY } from "./outbound";
import { ROOT, SITE, readSite, stripHtmlComments } from "./read-site";

import { LICENSES_URL, PRIVACY_URL, SUPPORT_URL } from "../../src/app/policy-links";

const BASE = "https://mrtint.github.io/alpharium/";

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

describe("086 L — 방침·지원 주소", () => {
  it.each([PRIVACY_URL, SUPPORT_URL, LICENSES_URL])(
    "L1 — %s 는 게시 주소 아래에 있고 /로 끝난다",
    (url) => {
      expect(url.startsWith(BASE)).toBe(true);
      expect(url.endsWith("/")).toBe(true);
    },
  );

  it.each([PRIVACY_URL, SUPPORT_URL, LICENSES_URL])(
    "L2 — %s 의 경로마다 site/<경로>index.html 이 있다",
    (url) => {
      const path = url.slice(BASE.length);
      expect(existsSync(join(SITE, path, "index.html"))).toBe(true);
    },
  );

  it("L3 — 지원 페이지의 방침 링크 = PRIVACY_URL", () => {
    const hrefs = [
      ...stripHtmlComments(readSite("support/index.html")).matchAll(/href="([^"]*privacy[^"]*)"/g),
    ].map((m) => m[1]);
    expect({ hrefs, why: FIX_POLICY }).toEqual({ hrefs: [PRIVACY_URL], why: FIX_POLICY });
  });

  it("L4 — 선언 초안에 두 주소가 그대로 있다", () => {
    const doc = readFileSync(join(ROOT, "docs/store/privacy-declarations.md"), "utf8");
    expect(doc).toContain(PRIVACY_URL);
    expect(doc).toContain(SUPPORT_URL);
  });

  it("L5 — src/에서 두 주소가 나오는 파일은 src/app/policy-links.ts 하나뿐이다", () => {
    const files = sourceFiles(join(ROOT, "src"))
      .filter((f) => {
        const code = readFileSync(f, "utf8");
        return code.includes(BASE) || code.includes("mrtint.github.io");
      })
      .map((f) => relative(ROOT, f));
    expect(files).toEqual(["src/app/policy-links.ts"]);
  });
});
