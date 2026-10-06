/**
 * 062 FR-011b — 진단 「환경」 묶음의 언어 줄 (contracts V1·V2, Clarification Q5).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { languageLine } from "../../src/app/diagnostics-view";

const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("V1 — 감지한 첫 태그 → 고른 언어 이름", () => {
  it("한국어 기기", () => {
    expect(languageLine({ detected: ["ko-KR"], chosen: "ko", matched: true })).toBe(
      "ko-KR → 한국어",
    );
  });

  it("영어 기기 — 감지한 것과 고른 것이 다르게 보인다", () => {
    expect(languageLine({ detected: ["en-US", "ko-KR"], chosen: "ko", matched: true })).toBe(
      "en-US → 한국어",
    );
    expect(languageLine({ detected: ["en-US"], chosen: "ko", matched: false })).toBe(
      "en-US → 한국어",
    );
  });

  it("감지 못함은 「모름」 — 지어내지 않는다", () => {
    expect(languageLine({ detected: null, chosen: "ko", matched: false })).toBe("모름 → 한국어");
  });
});

describe("V2 — 조립은 diagnostics-view, 화면은 문자열만 받는다", () => {
  it("DiagnosticsScreen·DiagnosticsParts가 해석 결과·감지 통로에 닿지 않는다", () => {
    for (const file of ["DiagnosticsScreen.tsx", "DiagnosticsParts.tsx"]) {
      const code = strip(readFileSync(join(__dirname, "../../src/ui", file), "utf8"));
      expect(code).not.toMatch(/languageResolution|locale-port|i18n\/resolve/);
    }
  });

  it("조립부(App)가 languageLine(languageResolution())을 넘긴다", () => {
    const app = strip(readFileSync(join(__dirname, "../../App.tsx"), "utf8"));
    expect(app).toMatch(/language=\{languageLine\(languageResolution\(\)\)\}/);
  });
});
