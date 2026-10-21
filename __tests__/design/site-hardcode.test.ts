/**
 * 089 — 사이트 하드코딩 금지 (contracts/site-style.md L1·L3·S1·S2, FR-007·FR-008·SC-001·SC-002).
 *
 * 사이트가 앱 토큰을 벗어나도 브라우저는 오류 없이 그린다 — 색 리터럴 하나, 글꼴 선언 하나가 조용히 시스템에서
 * 갈라진다. 그래서 소스를 읽어 잠근다. 주석은 먼저 걷는다(주석은 금지어를 설명하며 정당하게 담는다).
 */

import {
  FONTS_CSS,
  loadTokens,
  PAGES,
  readText,
  SITE_CSS,
  stripCssComments,
  stripHtmlComments,
  TOKENS_CSS,
} from "./helpers";

const tokens = loadTokens();
const roles = Object.keys(tokens.color.items);

const TEXT_COLORS = ["text", "textMuted", "danger", "dangerForeground", "accentForeground"];
const BACKGROUNDS = ["bg", "surface", "accent", "danger"];
const ALLOWED_CLASSES = ["page", "doc", "meta", "summary", "section", "links"];

/** 선언 하나: 속성 이름과 값 */
function declarations(css: string): { prop: string; value: string }[] {
  return [...stripCssComments(css).matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g)].map((m) => ({
    prop: m[1].trim(),
    value: m[2].trim(),
  }));
}

/** 괄호 깊이 0에서 공백으로 나눈다 — `calc(...)` 안의 공백은 나누지 않는다 */
function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of value) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (/\s/.test(ch) && depth === 0) {
      if (cur !== "") parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur !== "") parts.push(cur);
  return parts;
}

/** 규칙 블록: 선택자와 선언들 (site.css에는 @media 같은 중첩이 없다) */
function rules(css: string): { selector: string; decls: { prop: string; value: string }[] }[] {
  return [...stripCssComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1].trim(),
    decls: declarations(`${m[2]}`),
  }));
}

/** `var(--color-x)` 한 값의 역할 이름, 아니면 null */
function roleOf(value: string): string | null {
  return /^var\(--color-([a-zA-Z]+)\)$/.exec(value.trim())?.[1] ?? null;
}

function varNamesDefined(): Set<string> {
  return new Set([...readText(TOKENS_CSS).matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map((m) => m[1]));
}

describe.each(PAGES)("089 site HTML — %s", (rel) => {
  const raw = readText(`${__dirname}/../../site/${rel}`);
  const html = stripHtmlComments(raw);

  it("L1 — 페이지 안 스타일·스크립트·외부 주소 자원이 없다", () => {
    expect(html).not.toMatch(/<style\b/i);
    expect(html).not.toMatch(/\sstyle\s*=/i);
    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toMatch(/@import/);
    expect(html).not.toMatch(/<link\b[^>]*\bhref\s*=\s*["']?(https?:)?\/\//i);
    expect(html).not.toMatch(/\bsrc\s*=\s*["']?(https?:)?\/\//i);
  });

  it("L1 — 색 리터럴이 없다", () => {
    const withoutFragments = html
      .replace(/\bhref\s*=\s*"#[^"]*"/g, "")
      .replace(/&#x?[0-9a-fA-F]+;/g, "");
    expect(withoutFragments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(html).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/);
  });

  it("L3 — class는 site.css가 정의한 것만 쓴다", () => {
    const used = [...html.matchAll(/\bclass\s*=\s*"([^"]*)"/g)]
      .flatMap((m) => m[1].split(/\s+/))
      .filter(Boolean);
    const css = stripCssComments(readText(SITE_CSS));
    for (const c of used) {
      expect(ALLOWED_CLASSES).toContain(c);
      expect(css).toMatch(new RegExp(`\\.${c}\\b`));
    }
  });
});

describe("089 site.css — 변수만 참조한다", () => {
  const css = stripCssComments(readText(SITE_CSS));
  const decls = declarations(css);
  const defined = varNamesDefined();

  it("선언이 있다(경로가 사라져 조용히 무력해지지 않게)", () => {
    expect(decls.length).toBeGreaterThan(20);
  });

  it("S1 — 16진수·rgb·hsl·@import·외부 url이 없고 font-family는 var(--font-sans)뿐이다", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/i);
    const families = decls.filter((d) => d.prop === "font-family");
    expect(families.length).toBeGreaterThan(0);
    for (const d of families) expect(d.value).toBe("var(--font-sans)");
    expect(css).not.toMatch(/@import/);
    expect(css).not.toMatch(/url\(\s*['"]?(https?:)?\/\//i);
  });

  it("S1 — var()가 가리키는 변수는 모두 tokens.css에 정의돼 있다", () => {
    const refs = [...css.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(0);
    for (const r of refs) expect({ r, ok: defined.has(r) }).toEqual({ r, ok: true });
  });

  it("S1 — 여백·간격은 간격 단계 변수(또는 그 정수배·0·auto)만 쓴다", () => {
    const spacing = decls.filter((d) =>
      /^(padding|margin|gap|row-gap|column-gap)(-[a-z]+)?$/.test(d.prop),
    );
    expect(spacing.length).toBeGreaterThan(0);
    const token = /^(0|auto|var\(--space-\d+\))$/;
    const calcOk = (part: string): boolean =>
      part.startsWith("calc(") &&
      part.endsWith(")") &&
      /^[\s\d+*/().-]*$/.test(part.replace(/^calc/, "").replace(/var\(--space-\d+\)/g, "")) &&
      /var\(--space-\d+\)/.test(part);
    for (const d of spacing) {
      const parts = splitTopLevel(d.value);
      for (const part of parts) {
        const ok = token.test(part) || calcOk(part);
        expect({ prop: d.prop, part, ok }).toEqual({ prop: d.prop, part, ok: true });
      }
    }
  });

  it("S1 — 글자 크기·굵기·행간·반경은 변수만 쓴다", () => {
    const rules: [RegExp, RegExp][] = [
      [/^font-size$/, /^(inherit|var\(--text-[a-zA-Z]+-size\))$/],
      [/^font-weight$/, /^(inherit|var\(--text-[a-zA-Z]+-weight\))$/],
      [/^line-height$/, /^(inherit|normal|var\(--text-[a-zA-Z]+-line\))$/],
      [/^border(-[a-z]+)*-radius$/, /^(0|var\(--radius-[a-zA-Z]+\))$/],
    ];
    for (const [prop, value] of rules) {
      for (const d of decls.filter((x) => prop.test(x.prop))) {
        expect({ prop: d.prop, value: d.value, ok: value.test(d.value) }).toEqual({
          prop: d.prop,
          value: d.value,
          ok: true,
        });
      }
    }
    expect(decls.some((d) => d.prop === "font")).toBe(false);
  });

  it("S2/SC-002 — 글자 색은 허용된 역할뿐이고 accent를 글자에 쓰지 않는다", () => {
    const colorProps = decls.filter((d) =>
      /^(color|text-decoration-color|caret-color|-webkit-text-fill-color)$/.test(d.prop),
    );
    expect(colorProps.length).toBeGreaterThan(0);
    for (const d of colorProps) {
      const m = /^var\(--color-([a-zA-Z]+)\)$/.exec(d.value);
      const ok =
        d.value === "inherit" ||
        d.value === "currentColor" ||
        (m !== null && TEXT_COLORS.includes(m[1]));
      expect({ prop: d.prop, value: d.value, ok }).toEqual({
        prop: d.prop,
        value: d.value,
        ok: true,
      });
    }
  });

  it("SC-002 — 배경은 허용된 역할뿐이다", () => {
    const bg = decls.filter((d) => /^background(-color)?$/.test(d.prop));
    expect(bg.length).toBeGreaterThan(0);
    for (const d of bg) {
      const m = /^var\(--color-([a-zA-Z]+)\)$/.exec(d.value);
      const ok =
        ["transparent", "inherit", "none"].includes(d.value) ||
        (m !== null && BACKGROUNDS.includes(m[1]));
      expect({ prop: d.prop, value: d.value, ok }).toEqual({
        prop: d.prop,
        value: d.value,
        ok: true,
      });
    }
  });

  it("SC-002 — 한 규칙의 글자색·배경 짝이 정본 대비 표에 있다(표에 없는 조합 금지)", () => {
    const pairs = new Set(tokens.contrast.map((p) => `${p.fg}/${p.bg}`));
    const blocks = rules(css);
    expect(blocks.length).toBeGreaterThan(10);
    for (const { selector, decls: d } of blocks) {
      const fg = roleOf(d.find((x) => x.prop === "color")?.value ?? "");
      const bg = roleOf(d.find((x) => /^background(-color)?$/.test(x.prop))?.value ?? "");
      if (bg !== null && (bg === "accent" || bg === "danger")) {
        // 면 위 글자는 규칙 안에서 명시해야 한다 — 상속된 글자색(text)은 이 면 위 쌍이 표에 없다
        expect({ selector, fg }).not.toEqual({ selector, fg: null });
      }
      if (fg !== null && bg !== null) {
        expect({ selector, pair: `${fg}/${bg}`, ok: pairs.has(`${fg}/${bg}`) }).toEqual({
          selector,
          pair: `${fg}/${bg}`,
          ok: true,
        });
      }
      if (fg !== null && bg === null) {
        // 배경이 없으면 페이지 바탕(bg) 또는 면(surface) 위다 — 두 쌍이 모두 표에 있어야 한다
        const ok = pairs.has(`${fg}/bg`) && pairs.has(`${fg}/surface`);
        expect({ selector, fg, ok }).toEqual({ selector, fg, ok: true });
      }
    }
  });

  it("S1 — 색을 받는 속성에는 var()와 크기·선 종류 말고 이름 있는 색 같은 낱말이 없다", () => {
    const colorProps =
      /^(color|background(-color)?|border(-[a-z]+)*|outline(-[a-z]+)*|fill|stroke|text-decoration-color|caret-color|box-shadow)$/;
    const ok = new Set([
      "solid",
      "dashed",
      "dotted",
      "none",
      "transparent",
      "inherit",
      "currentColor",
    ]);
    for (const d of decls.filter((x) => colorProps.test(x.prop))) {
      const rest = d.value.replace(/var\([^)]*\)/g, " ").replace(/-?\d+(\.\d+)?(px|em|rem)?/g, " ");
      for (const word of rest.split(/\s+/).filter(Boolean)) {
        expect({ prop: d.prop, word, ok: ok.has(word) }).toEqual({ prop: d.prop, word, ok: true });
      }
    }
  });

  it("S1 — 색 변수는 정본 역할만 가리킨다", () => {
    for (const m of css.matchAll(/var\(--color-([a-zA-Z]+)\)/g)) expect(roles).toContain(m[1]);
  });

  it("S3 — 포커스 가능한 요소에 :focus-visible 윤곽이 있다", () => {
    expect(css).toMatch(/:focus-visible/);
    expect(css).toMatch(/outline\s*:/);
  });

  it("S5 — 색 모드 분기는 tokens.css가 맡는다(site.css에 prefers-color-scheme이 없다)", () => {
    expect(css).not.toMatch(/prefers-color-scheme/);
  });

  it("S4 — 읽기 폭 제한이 있다(max-width)", () => {
    expect(css).toMatch(/max-width\s*:/);
  });
});

describe("089 fonts.css — @font-face만 있다", () => {
  it("블록을 빼면 아무것도 남지 않는다", () => {
    const rest = stripCssComments(readText(FONTS_CSS)).replace(/@font-face\s*\{[^}]*\}/g, "");
    expect(rest.trim()).toBe("");
  });
});
