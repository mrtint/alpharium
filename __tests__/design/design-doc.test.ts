/**
 * 089 — 규칙 문서 (G8·G9, FR-013·FR-014·SC-008).
 *
 * 규칙 문서가 없는 이름을 적으면 읽는 쪽(사람·에이전트)이 그대로 믿고 조용히 스타일이 안 먹는 코드를 쓴다.
 * 그래서 문서의 백틱 이름이 정본·생성물·소스에 실제로 있는지 본다.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { loadTokens, readText, ROOT, SITE_CSS, stripCssComments, TOKENS_CSS } from "./helpers";

const DOC = join(ROOT, "design", "DESIGN.md");
const tokens = loadTokens();

const REQUIRED_HEADINGS = [
  "토큰과 역할 이름",
  "타입 스케일",
  "서체",
  "색 사용 규칙",
  "간격",
  "공용 부품",
  "화면 유형별 패턴",
  "하지 않는 것",
  "새 값을 더하는 절차",
];

/** 코드 블록(```)을 걷고 한 줄 백틱 이름만 모은다 */
function codeSpans(markdown: string): string[] {
  const body = markdown.replace(/```[\s\S]*?```/g, "");
  return [...body.matchAll(/`([^`\n]+)`/g)].map((m) => m[1].trim());
}

describe("089 design/DESIGN.md — 규칙 문서", () => {
  const md = readText(DOC);

  it("필수 절이 모두 있다", () => {
    const headings = [...md.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
    for (const h of REQUIRED_HEADINGS) {
      expect({ h, found: headings.some((x) => x.includes(h)) }).toEqual({ h, found: true });
    }
  });

  it("G8 — 적은 CSS 변수 이름이 tokens.css에 실재한다", () => {
    const defined = new Set(
      [...readText(TOKENS_CSS).matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map((m) => m[1]),
    );
    const used = codeSpans(md).filter((s) =>
      /^--(color|radius|font|text|space)-[a-zA-Z0-9-]+$/.test(s),
    );
    expect(used.length).toBeGreaterThan(0);
    for (const v of used) expect({ v, ok: defined.has(v) }).toEqual({ v, ok: true });
  });

  it("G8 — `--color-*`·`--space-*`처럼 접두사로만 적은 이름도 실제 변수의 접두사다", () => {
    const defined = [...readText(TOKENS_CSS).matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map((m) => m[1]);
    const prefixes = codeSpans(md).filter((s) => /^--[a-zA-Z0-9-]+\*$/.test(s));
    for (const p of prefixes) {
      const stem = p.slice(0, -1);
      expect({ p, ok: defined.some((d) => d.startsWith(stem)) }).toEqual({ p, ok: true });
    }
  });

  it("G8 — 적은 웹 공용 클래스가 site.css에 실재한다", () => {
    const css = stripCssComments(readText(SITE_CSS));
    const classes = codeSpans(md).filter((s) => /^\.[a-z][a-z-]*$/.test(s));
    expect(classes.length).toBeGreaterThan(0);
    for (const c of classes) {
      expect({ c, ok: new RegExp(`\\${c}\\b`).test(css) }).toEqual({ c, ok: true });
    }
  });

  it("G8 — 적은 파일 경로가 실재한다", () => {
    const paths = codeSpans(md).filter(
      (s) => /\//.test(s) && /\.(tsx?|mts|json|css|md|html)$/.test(s),
    );
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) expect({ p, ok: existsSync(join(ROOT, p)) }).toEqual({ p, ok: true });
  });

  it("G8 — `COLORS.x`·`TYPE.x`·`RADIUS.x` 꼴 이름의 키가 정본에 있다", () => {
    const refs = codeSpans(md).filter((s) => /^(COLORS|TYPE|RADIUS)\.[A-Za-z]+$/.test(s));
    for (const r of refs) {
      const [group, key] = r.split(".");
      const items =
        group === "COLORS"
          ? tokens.color.items
          : group === "TYPE"
            ? tokens.type.items
            : tokens.radius.items;
      expect({ r, ok: key in items }).toEqual({ r, ok: true });
    }
  });

  it("G8 — 역할 이름 표에 정본의 색 역할 아홉이 모두 적혀 있다", () => {
    const spans = new Set(codeSpans(md));
    for (const role of Object.keys(tokens.color.items)) {
      expect({ role, ok: spans.has(role) }).toEqual({ role, ok: true });
    }
  });

  it("accent를 글자에 쓰지 않는다는 규칙과 그 이유(대비)를 적는다", () => {
    expect(md).toMatch(/accent/);
    expect(md).toMatch(/danger/);
    expect(md).toMatch(/3\.76/);
  });
});

describe("089 안내 문서 — 규칙 문서를 먼저 읽으라고 가리킨다 (G9)", () => {
  it("design/DESIGN.md가 실제로 있다", () => {
    expect(existsSync(DOC)).toBe(true);
  });

  it.each(["AGENTS.md", "CLAUDE.md"])("%s 가 design/DESIGN.md를 가리킨다", (file) => {
    expect(readText(join(ROOT, file))).toMatch(/design\/DESIGN\.md/);
  });
});
