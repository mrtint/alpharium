/**
 * 062 — 카탈로그의 모양과 지원 목록 (contracts/i18n.md K1·K4·B4).
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { CATALOGS } from "../../src/i18n/catalogs";
import { ko } from "../../src/i18n/catalogs/ko";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "../../src/i18n/languages";

const KO_DIR = join(__dirname, "../../src/i18n/catalogs/ko");
const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("K1 — 한국어 카탈로그에 as const가 없다", () => {
  it.each(readdirSync(KO_DIR).filter((f) => f.endsWith(".ts")))("%s", (file) => {
    expect(strip(readFileSync(join(KO_DIR, file), "utf8"))).not.toMatch(/as const/);
  });
});

/** 카탈로그의 모든 함수를 찾아 대표 인자로 부른다 */
function functionsOf(value: unknown, path: string, out: [string, (...a: never[]) => unknown][]) {
  if (typeof value === "function") out.push([path, value as (...a: never[]) => unknown]);
  else if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) functionsOf(child, `${path}.${key}`, out);
  }
  return out;
}

describe("K4 — 카탈로그 함수는 던지지 않고 문자열을 돌려준다", () => {
  const fns = functionsOf(ko, "ko", []);

  it("함수가 있다", () => {
    expect(fns.length).toBeGreaterThan(10);
  });

  it.each(fns)("%s", (_path, fn) => {
    // 인자는 모두 문자열로 준다 — 숫자 자리는 템플릿에 그대로 들어가고, 이름 자리는 조사 판정을 탄다
    for (const args of [
      ["0", "0", "0"],
      ["금동이", "12", "x"],
      ["Momo", "3", "y"],
      ["", "", ""],
    ]) {
      const call = () => (fn as (...a: unknown[]) => unknown)(...args);
      expect(call).not.toThrow();
      expect(typeof call()).toBe("string");
    }
  });
});

describe("B4 — 제품 지원 목록은 한국어 하나다", () => {
  it("SUPPORTED_LANGUAGES = [ko], DEFAULT_LANGUAGE = ko", () => {
    expect(SUPPORTED_LANGUAGES).toEqual(["ko"]);
    expect(DEFAULT_LANGUAGE).toBe("ko");
    expect(SUPPORTED_LANGUAGES).toContain(DEFAULT_LANGUAGE);
  });

  it("카탈로그 표도 한국어 하나다", () => {
    expect(Object.keys(CATALOGS)).toEqual(["ko"]);
    expect(CATALOGS.ko).toBe(ko);
  });
});
