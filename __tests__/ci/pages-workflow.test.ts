/**
 * 086 — 게시 워크플로(`.github/workflows/pages.yml`)의 계약 (contracts/pages-workflow.md P1~P8).
 *
 * 이 워크플로는 퍼블릭 저장소에서 방침·지원 페이지를 GitHub Pages로 올린다. jest는 그것을 돌릴 수 없으므로 파일 텍스트를
 * 읽어 「올리면 안 되는 것이 올라가는 길」(자리표시자가 남은 원문, 저장소 전체, 넓은 권한, 비밀)을 잠근다. 읽을 때 주석을
 * 먼저 걷는다 — 075·076과 같은 방식.
 *
 * 저장소 설정의 Pages 소스(「GitHub Actions」)와 `github-pages` 환경 보호 규칙은 파일에 없다 — 이 테스트가 못 잡는다.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const WORKFLOW = join(__dirname, "../../.github/workflows/pages.yml");

function read(): string {
  if (!existsSync(WORKFLOW)) throw new Error(`${WORKFLOW} 가 없다`);
  return readFileSync(WORKFLOW, "utf8")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .map((line) => line.replace(/\s+#.*$/, ""))
    .join("\n");
}

/** 들여쓰기가 `indent`칸인 키 `key:` 아래의 블록(다음 같은 깊이 키 전까지) */
function section(text: string, key: string, indent: number): string {
  const lines = text.split("\n");
  const pad = " ".repeat(indent);
  const start = lines.findIndex((l) => l.startsWith(`${pad}${key}:`));
  if (start === -1) return "";
  const out = [lines[start]];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() !== "" && line.length - line.trimStart().length <= indent) break;
    out.push(line);
  }
  return out.join("\n");
}

/** 블록 바로 아래 깊이(`indent + 2`)의 키 이름들 */
function childKeys(block: string, indent: number): string[] {
  const pad = " ".repeat(indent + 2);
  return block
    .split("\n")
    .slice(1)
    .filter((l) => l.startsWith(pad) && !l.startsWith(`${pad} `))
    .map((l) => l.trim().replace(/:.*$/, ""));
}

describe("086 pages.yml — 게시 워크플로", () => {
  it("P1 — 트리거는 push·workflow_dispatch 둘뿐이다", () => {
    expect(childKeys(section(read(), "on", 0), 0).sort()).toEqual(["push", "workflow_dispatch"]);
  });

  it("P2 — push는 main과 site/** 경로에서만", () => {
    const push = section(section(read(), "on", 0), "push", 2);
    expect(push).toMatch(/branches:\s*\[\s*main\s*\]/);
    expect(push).toMatch(/paths:\s*\[\s*["']site\/\*\*["']\s*\]/);
  });

  it("P3 — 최상위 권한은 contents: read · pages: write · id-token: write 뿐이다", () => {
    const perms = section(read(), "permissions", 0)
      .split("\n")
      .slice(1)
      .map((l) => l.trim())
      .filter((l) => l !== "")
      .sort();
    expect(perms).toEqual(["contents: read", "id-token: write", "pages: write"]);
    // 잡 수준에서 권한을 다시 넓히지 않는다.
    expect(read().match(/^ +permissions:/m)).toBeNull();
  });

  it("P4 — 비밀을 쓰지 않는다", () => {
    expect(read()).not.toMatch(/secrets\./);
  });

  it("P5 — GitHub 공식 Action 넷만, 주 버전 고정", () => {
    const uses = [...read().matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]).sort();
    expect(uses).toEqual([
      "actions/checkout@v5",
      "actions/configure-pages@v6",
      "actions/deploy-pages@v5",
      "actions/upload-pages-artifact@v5",
    ]);
  });

  it("P6 — 자리표시자 검사 단계가 업로드보다 앞이고 세 이름을 모두 담는다", () => {
    const text = read();
    const check = text.indexOf("name: 자리표시자 검사");
    const upload = text.indexOf("actions/upload-pages-artifact");
    expect(check).toBeGreaterThan(-1);
    expect(check).toBeLessThan(upload);
    const body = text.slice(check, upload);
    for (const name of ["SUPPORT_EMAIL", "OPERATOR", "EFFECTIVE_DATE"])
      expect(body).toContain(name);
    // 찾으면(grep 성공) 실패한다 — 조건을 뒤집으면(`if ! grep`) 자리표시자가 남은 채 게시된다.
    expect(body).toContain(
      "if grep -rnE '\\{(SUPPORT_EMAIL|OPERATOR|EFFECTIVE_DATE)\\}' site; then",
    );
    expect(body).not.toMatch(/if !/);
    expect(body).toMatch(/exit 1/);
  });

  it("P7 — 업로드 경로는 site 다", () => {
    const text = read();
    const upload = text.slice(text.indexOf("actions/upload-pages-artifact"));
    expect(upload).toMatch(/^\s+path:\s*site\s*$/m);
  });

  it("P9 — checkout은 자격 증명을 .git에 남기지 않는다(persist-credentials: false)", () => {
    const text = read();
    const checkout = text.slice(
      text.indexOf("actions/checkout@v5"),
      text.indexOf("name: 자리표시자 검사"),
    );
    expect(checkout).toMatch(/persist-credentials:\s*false/);
  });

  it("P8 — concurrency 그룹이 있다", () => {
    expect(section(read(), "concurrency", 0)).toMatch(/group:\s*\S+/);
  });
});
