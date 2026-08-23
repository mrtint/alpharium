import { readFileSync } from "node:fs";
import { join } from "node:path";
import { particleFor } from "../../src/diary/particle";

/**
 * 조사 선택(이/가) 계약 테스트.
 *
 * 계약: specs/016-writing-monologue-expansion/contracts/particle.md
 *       specs/016-writing-monologue-expansion/research.md §5
 */

describe("particleFor — 로스터 5인 (research.md §5 실측)", () => {
  it.each([
    ["금동이", "가"],
    ["루이", "가"],
    ["오드", "가"],
    ["샤오바이", "가"],
    ["모카", "가"],
  ])("%s → %s", (name, expected) => {
    expect(particleFor(name)).toBe(expected);
  });
});

describe("particleFor — 받침 있는 이름 (죽은 코드 방지)", () => {
  it("받침 있는 가상 이름은 '이'를 돌려준다", () => {
    // "테스트인"의 마지막 글자 "인"은 받침(ㄴ)이 있다.
    expect(particleFor("테스트인")).toBe("이");
  });
});

describe("particleFor — 방어 (예외를 던지지 않는다)", () => {
  it("빈 문자열에서도 예외 없이 값을 돌려준다", () => {
    expect(() => particleFor("")).not.toThrow();
    expect(particleFor("")).toBe("가");
  });

  it("비한글 문자에서도 예외 없이 값을 돌려준다", () => {
    expect(() => particleFor("Mocha")).not.toThrow();
    expect(particleFor("Mocha")).toBe("가");
  });
});

describe("particleFor — '이'·'가' 둘 중 하나만 돌려준다", () => {
  it.each(["금동이", "루이", "오드", "샤오바이", "모카", "테스트인", "", "Mocha"])(
    "%s의 결과가 이/가 중 하나다",
    (name) => {
      expect(["이", "가"]).toContain(particleFor(name));
    },
  );
});

describe("particle.ts — roster.ts·persona.ts·Character를 import하지 않는다 (원칙 III)", () => {
  const source = readFileSync(join(__dirname, "../../src/diary/particle.ts"), "utf8");

  it("roster를 import하지 않는다", () => {
    expect(source).not.toMatch(/from ["'].*roster["']/);
  });

  it("persona를 import하지 않는다", () => {
    expect(source).not.toMatch(/from ["'].*persona["']/);
  });

  it("Character 타입을 import하지 않는다", () => {
    expect(source).not.toMatch(/import[^;]*\bCharacter\b[^;]*;/);
  });
});
