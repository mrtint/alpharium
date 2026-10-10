import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 073 — 릴리스 전 체크리스트가 있고 배포 절에서 링크된다 (FR-019, SC-007).
 */

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8");
const CHECKLIST = "docs/e2e/layer2-release-checklist.md";

/** AGENTS.md의 `## 제목` 절 본문 */
function section(source: string, heading: RegExp): string {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith("## ") && heading.test(l));
  if (start < 0) throw new Error(`절을 찾지 못했다: ${heading}`);
  const end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  return lines.slice(start, end < 0 ? undefined : end).join("\n");
}

describe("층 2 릴리스 전 체크리스트 (073)", () => {
  const doc = read(...CHECKLIST.split("/"));
  const agents = read("AGENTS.md");

  it("C1 — 층 2 실행 명령과 본문 읽기를 담는다", () => {
    expect(doc).toContain("npm run test:layer2");
    expect(doc).toMatch(/본문/);
    expect(doc).toMatch(/사람이 봄/);
  });

  it("C2 — iOS 층 2 갈래가 없다는 사실을 적는다", () => {
    expect(doc).toMatch(/iOS/);
    expect(doc).toMatch(/TestFlight/);
  });

  it.each([/release 빌드·서명·Google Play/, /iOS 빌드·서명·TestFlight/])(
    "C3 — AGENTS.md의 %s 절이 체크리스트를 링크한다",
    (heading) => {
      expect(section(agents, heading)).toContain(CHECKLIST);
    },
  );
});
