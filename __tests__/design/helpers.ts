/**
 * 089 — 디자인 시스템 테스트 공용 헬퍼. 파일을 읽을 뿐 값을 만들지 않는다.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { TokensJson } from "../../scripts/design/tokens-build";

export const ROOT = join(__dirname, "..", "..");
export const TOKENS_JSON = join(ROOT, "design", "tokens.json");
export const TOKENS_TS = join(ROOT, "src", "ui", "theme", "tokens.ts");
export const TOKENS_CSS = join(ROOT, "site", "assets", "tokens.css");
export const SITE_CSS = join(ROOT, "site", "assets", "site.css");
export const FONTS_CSS = join(ROOT, "site", "assets", "fonts.css");
export const FONTS_DIR = join(ROOT, "site", "assets", "fonts");
export const PAGES = ["index.html", "privacy/index.html", "support/index.html"] as const;

/** LF로 읽는다(줄 끝이 CRLF여도 같게) */
export function readText(path: string): string {
  if (!existsSync(path)) throw new Error(`${path} 가 없다`);
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

export function loadTokens(): TokensJson {
  return JSON.parse(readText(TOKENS_JSON)) as TokensJson;
}

/** 깊은 복사 — 위반 주입용 */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

export function stripHtmlComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

export interface FontFace {
  family: string;
  style: string;
  display: string;
  weight: string;
  src: string;
  file: string;
  ranges: [number, number][];
  raw: string;
}

/** `fonts.css`의 `@font-face` 블록들을 읽는다(주석은 먼저 걷는다) */
export function parseFontFaces(css: string): FontFace[] {
  const body = stripCssComments(css);
  const blocks = [...body.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
  return blocks.map((raw) => {
    const get = (prop: string): string => {
      const m = new RegExp(`${prop}\\s*:\\s*([^;]+);`).exec(raw);
      return m === null ? "" : m[1].trim();
    };
    const src = get("src");
    const file = /url\(\s*['"]?\.\/fonts\/([^'")]+\.woff2)['"]?\s*\)/.exec(src)?.[1] ?? "";
    const ranges = get("unicode-range")
      .split(",")
      .map((s) => s.trim().replace(/^U\+/i, ""))
      .filter((s) => s.length > 0)
      .map((s) => {
        const [a, z] = s.split("-").map((h) => parseInt(h, 16));
        return [a, z ?? a] as [number, number];
      });
    return {
      family: get("font-family").replace(/['"]/g, ""),
      style: get("font-style"),
      display: get("font-display"),
      weight: get("font-weight"),
      src,
      file,
      ranges,
      raw,
    };
  });
}
