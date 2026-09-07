import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NAME_MAX_LENGTH, validateCharacterName } from "../../src/welcome/naming";

/**
 * 작명 입력 검증의 계약 테스트.
 *
 * 계약: specs/035-model-ready-welcome-naming/contracts/character-name.md N5~N7
 *       spec.md FR-012·FR-013·FR-016·FR-021
 *
 * **검사는 둘뿐이다**(N5) — 빈 문자열/공백만과 길이 초과. 세 번째 갈래를 만들지
 * 않는다: 금칙어·패턴·모델 식별자 필터를 더하는 순간 이 함수가 로스터나 식별자
 * 목록을 알아야 하고, 그것이 원칙 III 경계의 오염이다.
 *
 * 005의 `acceptance.ts`가 판정 갈래 수를 직접 센 것과 같은 방어를 쓴다.
 */

/** 주석을 걷어낸 코드만 검사한다 (011 `vision/engine.test.ts` 관례). */
const SOURCE = readFileSync(join(__dirname, "../../src/welcome/naming.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

describe("N5 — 반환 갈래가 정확히 셋이다", () => {
  it("소스의 실패 사유가 정확히 둘이다 (empty·too-long)", () => {
    // 갈래를 늘리려면 이 테스트를 먼저 고쳐야 한다 — 그때 계약을 다시 본다.
    const reasons = [...SOURCE.matchAll(/reason:\s*"([a-z-]+)"/g)].map((m) => m[1]);
    expect(new Set(reasons)).toEqual(new Set(["empty", "too-long"]));
  });

  it("실제 반환값의 갈래가 셋을 넘지 않는다", () => {
    const outcomes = new Set(
      ["", "   ", "복실이", "가".repeat(NAME_MAX_LENGTH + 1)].map((raw) => {
        const result = validateCharacterName(raw);
        return result.ok ? "ok" : result.reason;
      }),
    );
    expect(outcomes).toEqual(new Set(["ok", "empty", "too-long"]));
  });
});

describe("FR-012 — 빈 문자열과 공백만은 거부한다", () => {
  it.each(["", " ", "   ", "\t", "\n", " \t\n "])("%j → empty", (raw) => {
    const result = validateCharacterName(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("empty");
  });
});

describe("FR-013 — 글자 수 상한 (NAME_MAX_LENGTH)", () => {
  it("상한은 12다 — 사람이 정한 상수", () => {
    expect(NAME_MAX_LENGTH).toBe(12);
  });

  it("상한 이하는 통과한다", () => {
    expect(validateCharacterName("가".repeat(NAME_MAX_LENGTH)).ok).toBe(true);
    expect(validateCharacterName("가").ok).toBe(true);
  });

  it("상한을 넘으면 too-long이다", () => {
    const result = validateCharacterName("가".repeat(NAME_MAX_LENGTH + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("too-long");
  });

  it("길이는 다듬은 뒤에 잰다", () => {
    // 앞뒤 공백 때문에 상한을 넘는 것으로 판정하지 않는다.
    const padded = `  ${"가".repeat(NAME_MAX_LENGTH)}  `;
    expect(validateCharacterName(padded).ok).toBe(true);
  });
});

describe("N7 — 앞뒤 공백을 제거해 돌려준다 (FR-016)", () => {
  it("다듬은 값을 value로 준다", () => {
    const result = validateCharacterName("  복실이  ");
    expect(result).toEqual({ ok: true, value: "복실이" });
  });

  it("가운데 공백은 유지한다", () => {
    const result = validateCharacterName("우리 집 강아지");
    expect(result).toEqual({ ok: true, value: "우리 집 강아지" });
  });
});

describe("FR-021 — 모델 식별자류 문자열을 필터링하지 않는다", () => {
  it.each(["kanana", "exaone-3.5", "qwen3-1.7b", "gemma3-1b", "hyperclovax"])(
    "%s 를 이름으로 쓸 수 있다",
    (raw) => {
      expect(validateCharacterName(raw)).toEqual({ ok: true, value: raw });
    },
  );
});

describe("N6 — 캐릭터도 로스터도 모른다", () => {
  it("Character·CHARACTERS·roster·PERSONAS를 참조하지 않는다", () => {
    // 필터 목록을 두면 이 함수가 식별자 목록을 알아야 하고, 그것이 원칙 III
    // 경계의 오염이다. 이 함수는 문자열 하나를 받아 검사할 뿐 캐릭터를 모른다.
    expect(SOURCE).not.toMatch(/\bCharacter\b|\bCHARACTERS\b|roster|PERSONAS|personaOf/);
  });

  it("금칙어·차단 목록을 두지 않는다", () => {
    expect(SOURCE).not.toMatch(/BANNED|FORBIDDEN|BLOCKLIST|DENYLIST|금칙/);
  });

  it("순수 함수다 — 시각·난수·파일을 읽지 않는다", () => {
    expect(SOURCE).not.toMatch(/new Date\(|Date\.now|Math\.random|readFile|expo-file-system/);
  });
});
