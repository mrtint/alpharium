import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CHARACTERS } from "../../src/diary/types";
import { personaOf } from "../../src/diary/persona";

/**
 * 캐릭터 페르소나 계약 테스트.
 *
 * 계약: specs/014-character-persona/contracts/persona.md 「규칙 P1~P4」
 */

describe("P1 — 다섯 값 모두 정의된다", () => {
  it("CHARACTERS의 모든 값에 페르소나가 있다", () => {
    for (const character of CHARACTERS) {
      const persona = personaOf(character);
      expect(persona).toBeDefined();
      expect(persona.name.length).toBeGreaterThan(0);
      expect(persona.tagline.length).toBeGreaterThan(0);
    }
  });
});

describe("P2 — 모델 자산에 닿지 않는다", () => {
  it("persona.ts가 roster를 import하지 않는다", () => {
    const source = readFileSync(join(__dirname, "../../src/diary/persona.ts"), "utf8");
    const code = source
      .split(/\r?\n/)
      .map((line) => line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, ""))
      .join("\n");

    expect(code).not.toMatch(/from\s+["'][^"']*models\/roster["']/);
    expect(code).not.toMatch(/\bModelAsset\b/);
  });
});

describe("소개 문구는 빈 문자열이 아니다", () => {
  it.each(CHARACTERS)("%s의 이름과 소개가 채워져 있다", (character) => {
    const persona = personaOf(character);
    expect(persona.name.trim()).not.toBe("");
    expect(persona.tagline.trim()).not.toBe("");
  });
});

describe("이름이 서로 다르다", () => {
  it("다섯 캐릭터의 이름이 중복되지 않는다", () => {
    const names = CHARACTERS.map((c) => personaOf(c).name);
    expect(new Set(names).size).toBe(names.length);
  });
});
