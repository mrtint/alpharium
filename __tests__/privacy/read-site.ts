/**
 * 086 — 사이트 원문(`site/`)을 읽는 테스트 공용 헬퍼.
 *
 * HTML 파서 의존성 없이 정규식으로 읽는다(research R3) — 사이트는 손으로 쓴 정적 페이지 셋이라 충분하다.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const ROOT = join(__dirname, "../..");
export const SITE = join(ROOT, "site");

/** 게시 전에 채울 자리표시자 셋 (data-model §2) */
export const PLACEHOLDERS = ["{SUPPORT_EMAIL}", "{OPERATOR}", "{EFFECTIVE_DATE}"] as const;

/** `site/` 기준 경로의 파일을 읽는다(줄 끝은 LF로) */
export function readSite(rel: string): string {
  const path = join(SITE, rel);
  if (!existsSync(path)) throw new Error(`site/${rel} 가 없다`);
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

/** HTML 주석을 걷는다 — 근거 주석 안의 낱말이 단언을 흐리지 않게 */
export function stripHtmlComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

/** `attr="값"`의 값을 나온 순서대로 모은다(주석 밖만) */
export function attrValues(html: string, attr: string): string[] {
  const re = new RegExp(`\\b${attr}="([^"]*)"`, "g");
  return [...stripHtmlComments(html).matchAll(re)].map((m) => m[1]);
}

/** `<section ... id="x" ...>` 의 id를 나온 순서대로 */
export function sectionIds(html: string): string[] {
  return [...stripHtmlComments(html).matchAll(/<section\b[^>]*\bid="([^"]*)"/g)].map((m) => m[1]);
}

/**
 * `<section … attr="value" …>`부터 그것을 닫는 `</section>`까지(안쪽 section 중첩을 센다).
 * 주석은 걷지 않는다 — 근거 주석을 보는 쪽이 쓴다. 없으면 `null`.
 */
export function sectionBy(html: string, attr: string, value: string): string | null {
  const open = new RegExp(`<section\\b[^>]*\\b${attr}="${value}"[^>]*>`);
  const m = open.exec(html);
  if (m === null) return null;
  let depth = 1;
  const tag = /<section\b|<\/section>/g;
  tag.lastIndex = m.index + m[0].length;
  let t: RegExpExecArray | null;
  while ((t = tag.exec(html)) !== null) {
    depth += t[0] === "</section>" ? -1 : 1;
    if (depth === 0) return html.slice(m.index, t.index + t[0].length);
  }
  return null;
}

/** `{대문자_밑줄}` 꼴을 모두 찾는다 */
export function placeholderLike(text: string): string[] {
  return [...text.matchAll(/\{[A-Z][A-Z0-9_]*\}/g)].map((m) => m[0]);
}
