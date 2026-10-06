/**
 * 062 — 감지한 기기 언어 → 화면 언어 (contracts/i18n.md L1~L5, spec FR-007·FR-008·FR-009, Clarification Q3).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveLanguage } from "../../src/i18n/resolve";

const KO = ["ko"] as const;
const KO_XX = ["ko", "xx"] as const;

describe("L1 — 감지 못함은 기본 언어이고 감지값을 지어내지 않는다", () => {
  it("null → ko, matched false, detected null", () => {
    expect(resolveLanguage(null, KO, "ko")).toEqual({
      detected: null,
      chosen: "ko",
      matched: false,
    });
  });
});

describe("L2 — 선호 순서대로 언어 마디를 대소문자 무시로 맞춘다", () => {
  it.each([
    [["ko-KR"], "ko", true],
    [["ko"], "ko", true],
    [["KO"], "ko", true],
    [["ko_KR"], "ko", true],
    [["en-US", "ko-KR"], "ko", true],
  ])("%j → %s (matched %s)", (detected, chosen, matched) => {
    const result = resolveLanguage(detected, KO, "ko");
    expect(result.chosen).toBe(chosen);
    expect(result.matched).toBe(matched);
  });

  it("가짜 목록 — 첫 일치가 이긴다", () => {
    expect(resolveLanguage(["xx-YY", "ko"], KO_XX, "ko").chosen).toBe("xx");
    expect(resolveLanguage(["ko", "xx-YY"], KO_XX, "ko").chosen).toBe("ko");
  });
});

describe("L3 — 맞는 것이 없으면 기본 언어, 감지값은 입력 그대로", () => {
  it("en-US → ko, matched false", () => {
    const detected = ["en-US"];
    const result = resolveLanguage(detected, KO, "ko");
    expect(result).toEqual({ detected: ["en-US"], chosen: "ko", matched: false });
    expect(result.detected).toBe(detected);
  });
});

describe("L4 — 언어 마디가 빈 태그는 건너뛰고 던지지 않는다", () => {
  it.each([[["-KR"]], [[""]], [["_", " "]]])("%j", (detected) => {
    expect(() => resolveLanguage(detected, KO, "ko")).not.toThrow();
    expect(resolveLanguage(detected, KO, "ko")).toMatchObject({ chosen: "ko", matched: false });
  });

  it("빈 태그 뒤의 맞는 태그는 고른다", () => {
    expect(resolveLanguage(["-KR", "xx"], KO_XX, "ko").chosen).toBe("xx");
  });
});

describe("L5 — 순수 함수다", () => {
  const code = readFileSync(join(__dirname, "../../src/i18n/resolve.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("시각·전역 상태·모듈 변수를 읽지 않는다", () => {
    expect(code).not.toMatch(/new Date|Date\.now|^let\s/m);
    expect(code).not.toMatch(/\bimport\s+(?!type)/);
  });
});
