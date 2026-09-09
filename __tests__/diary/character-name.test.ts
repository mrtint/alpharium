import { readFileSync } from "node:fs";
import { join } from "node:path";

import { displayNameOf, type CustomNames } from "../../src/diary/character-name";
import { PERSONA_NAMES, personaOf } from "../../src/diary/persona";
import { CHARACTERS } from "../../src/diary/types";

/**
 * 사용자 지정 캐릭터 이름 해석의 계약 테스트.
 *
 * 계약: specs/035-model-ready-welcome-naming/contracts/character-name.md N1~N4
 *       spec.md FR-017
 *
 * **`displayNameOf()`가 표시 이름의 유일한 통과 지점이다**(N1). 규칙은 한 곳뿐:
 * `custom[character]`가 있으면 그것, 없으면 `personaOf(character).name`.
 *
 * **순수 함수다**(N2) — 파일·시각·난수를 읽지 않는다. 그래야 `buildPrompt()`가
 * 결정적으로 남는다(005 P6, 018 P12).
 */

/**
 * **주석을 걷어낸 코드만 검사한다** — 011의 `vision/engine.test.ts`가 세운 관례.
 *
 * 이 저장소의 주석은 「무엇을 왜 금지하는가」를 적으므로 금지어가 설명 안에
 * 정당하게 등장한다. 주석째로 검사하면 이유를 적을 수 없게 되고, 그것은 이
 * 저장소가 지켜 온 것과 정반대다.
 */
const SOURCE = readFileSync(join(__dirname, "../../src/diary/character-name.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

describe("N1 — 사용자 지정 이름이 있으면 그것, 없으면 기본 이름", () => {
  it("custom에 값이 있으면 그 값을 쓴다", () => {
    const custom: CustomNames = { quiet: "복실이" };
    expect(displayNameOf("quiet", custom)).toBe("복실이");
  });

  it("custom이 비어 있으면 persona.ts의 기본 이름을 쓴다", () => {
    for (const character of CHARACTERS) {
      expect(displayNameOf(character, {})).toBe(personaOf(character).name);
    }
  });

  // 037 — 로스터가 하나라 "다른 캐릭터에 새지 않는다"를 캐릭터 둘로 보일 수
  // 없다. 캐릭터가 늘면 되살린다(FR-014). `displayNameOf`가 키로 조회한다는
  // 성질은 아래 "지정하지 않으면 기본 이름"이 이미 잠근다.
  it.skip("다른 캐릭터의 지정 이름이 이 캐릭터에 새지 않는다", () => {
    expect(true).toBe(true);
  });

  it("로스터의 캐릭터 전부에 대해 기본 이름이 PERSONAS와 일치한다", () => {
    // 기본 이름이 이 파일에 복제되지 않았다는 것의 확인 — 복제하면 언젠가 어긋난다.
    const defaults = CHARACTERS.map((c) => displayNameOf(c, {}));
    expect(defaults).toEqual(CHARACTERS.map((c) => personaOf(c).name));
    expect(new Set(defaults).size).toBe(CHARACTERS.length); // 다섯이 서로 다르다
  });
});

describe("N3 — 절대 빈 문자열을 반환하지 않는다 (SC-005)", () => {
  it("빈 문자열 지정은 없는 것으로 보고 기본 이름으로 폴백한다", () => {
    expect(displayNameOf("quiet", { quiet: "" })).toBe(personaOf("quiet").name);
  });

  it("공백만인 지정도 없는 것으로 본다", () => {
    expect(displayNameOf("quiet", { quiet: "   " })).toBe(personaOf("quiet").name);
    expect(displayNameOf("quiet", { quiet: "\t\n " })).toBe(personaOf("quiet").name);
  });

  it("어떤 조합에서도 빈 문자열이 나오지 않는다", () => {
    const nasty: CustomNames = { quiet: "   " };
    for (const character of CHARACTERS) {
      expect(displayNameOf(character, nasty).trim()).not.toBe("");
    }
  });

  it("앞뒤 공백이 있는 지정 이름은 다듬어 돌려준다", () => {
    // 저장 단계(validateCharacterName)가 이미 다듬지만 읽기 단계에서도 방어한다.
    expect(displayNameOf("quiet", { quiet: "  복실이  " })).toBe("복실이");
  });
});

describe("N2 — 순수 함수다", () => {
  it("같은 인자에 같은 결과를 준다", () => {
    const custom: CustomNames = { quiet: "복실이" };
    const first = displayNameOf("quiet", custom);
    const second = displayNameOf("quiet", custom);
    expect(first).toBe(second);
  });

  it("인자를 변형하지 않는다", () => {
    const custom: CustomNames = { quiet: "복실이" };
    displayNameOf("quiet", custom);
    expect(custom).toEqual({ quiet: "복실이" });
  });

  it("소스가 시각·난수·파일을 읽지 않는다", () => {
    expect(SOURCE).not.toMatch(/new Date\(|Date\.now|Math\.random|readFile|expo-file-system/);
  });
});

describe("N4 — persona.ts와 roster의 경계", () => {
  it("roster·ModelAsset을 import하지 않는다 (원칙 III)", () => {
    expect(SOURCE).not.toMatch(/models\/roster|ModelAsset|assetFor/);
  });

  it("기본 이름을 이 파일에 복제하지 않고 personaOf()로 얻는다", () => {
    // 「금동이」 같은 문자열이 여기 있으면 persona.ts와 어긋날 수 있다.
    expect(SOURCE).toMatch(/personaOf/);
    for (const character of CHARACTERS) {
      expect(SOURCE).not.toContain(personaOf(character).name);
    }
  });
});

/**
 * 037 계약 C3 — `personaOf()`는 로스터 안만 안다.
 *
 * 계약: specs/037-roster-verified-only/contracts/roster-entry.md
 *
 * **로스터 밖 캐릭터에 페르소나를 만들어 주지 않는다.** 그 순간 "로스터에 없는데
 * 성격은 있다"가 되어 원칙 III의 경계가 흐려진다 — `persona.ts`가 캐릭터→이름·소개의
 * 유일한 통과 지점인 이유다.
 *
 * 저장된 옛 일기의 작성자 이름은 `DiaryEntry.authorName`에서 오고, 그것도 없으면
 * `PERSONA_NAMES`가 `undefined`를 주어 화면이 그 자리를 비운다(FR-008, C4).
 */
describe("037 C3 — personaOf()는 로스터 밖을 모른다", () => {
  it("C3 — 로스터 밖 캐릭터에 페르소나가 없다", () => {
    const outside = "imaginative" as unknown as Character;
    expect(personaOf(outside)).toBeUndefined();
  });

  it("C3 — PERSONA_NAMES도 로스터 밖에는 undefined다", () => {
    expect(PERSONA_NAMES["imaginative"]).toBeUndefined();
    expect(PERSONA_NAMES["quiet"]).toBe(personaOf("quiet").name);
  });
});
