import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NAME_MAX_LENGTH } from "../../src/welcome/naming";
import {
  loadCustomNames,
  saveCustomNames,
  type CharacterNamesPort,
} from "../../src/welcome/names-port";

/**
 * 사용자 지정 이름 저장의 계약 테스트.
 *
 * 계약: specs/035-model-ready-welcome-naming/contracts/character-name.md N8·N9
 *       welcome-gate.md W19, data-model.md §1
 *
 * **부분 복구가 007과 다른 점이다** — `selected-character.json`은 값이 하나라
 * 「깨지면 없는 것」으로 충분했다. 여기는 다섯 이름이 한 파일에 있으므로 하나가
 * 깨졌다고 나머지를 버리면 사용자가 지은 이름을 이유 없이 잃는다.
 */

/** 주석을 걷어낸 코드만 검사한다 (011 `vision/engine.test.ts` 관례). */
const SOURCE = readFileSync(join(__dirname, "../../src/welcome/names-port.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

function memoryPort(initial: string | null = null) {
  const box = {
    stored: initial,
    async read() {
      return box.stored;
    },
    async write(serialized: string) {
      box.stored = serialized;
    },
  };
  return box as CharacterNamesPort & { stored: string | null };
}

describe("N8 — 읽기는 예외를 던지지 않는다", () => {
  it("파일이 없으면 빈 객체다", async () => {
    expect(await loadCustomNames(memoryPort(null))).toEqual({});
  });

  it("깨진 JSON이면 빈 객체다", async () => {
    expect(await loadCustomNames(memoryPort("{{{"))).toEqual({});
  });

  it("배열이면 빈 객체다", async () => {
    expect(await loadCustomNames(memoryPort("[]"))).toEqual({});
  });

  it("names가 객체가 아니면 빈 객체다", async () => {
    expect(await loadCustomNames(memoryPort(JSON.stringify({ names: "복실이" })))).toEqual({});
  });

  it("통로가 예외를 던져도 빈 객체다", async () => {
    const port: CharacterNamesPort = {
      read: () => Promise.reject(new Error("boom")),
      write: () => Promise.resolve(),
    };
    expect(await loadCustomNames(port)).toEqual({});
  });
});

describe("N8 — ★ 키 단위로 살린다 (부분 복구)", () => {
  it("로스터 밖 키 하나가 섞여도 정상 키는 살아남는다", async () => {
    const port = memoryPort(JSON.stringify({ names: { quiet: "복실이", foo: "바깥" } }));
    expect(await loadCustomNames(port)).toEqual({ quiet: "복실이" });
  });

  it("값이 문자열이 아닌 키만 버린다", async () => {
    const port = memoryPort(JSON.stringify({ names: { quiet: "복실이", narrative: 42 } }));
    expect(await loadCustomNames(port)).toEqual({ quiet: "복실이" });
  });

  it("빈 문자열·공백만인 키만 버린다", async () => {
    const port = memoryPort(
      JSON.stringify({ names: { quiet: "복실이", narrative: "", imaginative: "   " } }),
    );
    expect(await loadCustomNames(port)).toEqual({ quiet: "복실이" });
  });

  it("상한을 넘는 값만 버린다", async () => {
    const port = memoryPort(
      JSON.stringify({
        names: { quiet: "복실이", narrative: "가".repeat(NAME_MAX_LENGTH + 1) },
      }),
    );
    expect(await loadCustomNames(port)).toEqual({ quiet: "복실이" });
  });

  it("읽을 때도 앞뒤 공백을 다듬는다", async () => {
    const port = memoryPort(JSON.stringify({ names: { quiet: "  복실이  " } }));
    expect(await loadCustomNames(port)).toEqual({ quiet: "복실이" });
  });

  /**
   * 037(계약 C3) — 로스터 밖 이름은 걸러진다.
   *
   * 원래 이 자리는 "여러 캐릭터의 이름이 함께 살아남는다"였다(로스터 밖 `bogus`만
   * 걸러짐). 037로 `narrative`도 로스터 밖이 되었으므로 **`bogus`와 같은 대우를
   * 받는 것이 정상이다** — 저장된 파일에 남아 있어도 로스터에 없으면 이름이 아니다.
   * 캐릭터가 늘면 그 캐릭터로 "함께 살아남는다"를 되살린다.
   */
  it("로스터 안의 이름만 살아남는다 (C3)", async () => {
    const port = memoryPort(
      JSON.stringify({ names: { quiet: "복실이", narrative: "이야기꾼", bogus: "x" } }),
    );
    expect(await loadCustomNames(port)).toEqual({ quiet: "복실이" });
  });
});

describe("N9·W19 — 저장은 이름만 담는다", () => {
  it("왕복해도 값이 같다", async () => {
    const port = memoryPort();
    await saveCustomNames(port, { quiet: "복실이" });
    expect(await loadCustomNames(port)).toEqual({ quiet: "복실이" });
  });

  it("W19 — 빈 값은 키째 빠진다", async () => {
    const port = memoryPort();
    // 037 — 로스터가 하나여서 "다른 키는 남고 빈 키만 빠진다"를 두 캐릭터로
    // 보일 수 없다. 검사하는 성질은 **빈 문자열을 저장하지 않는다**이므로 그
    // 캐릭터 하나로 본다 — 빈 값을 주면 키째 빠져 저장된 이름이 없다.
    await saveCustomNames(port, { quiet: "" });
    const stored = JSON.parse(port.stored ?? "{}") as { names: Record<string, string> };
    expect(stored.names).toEqual({});
    expect("quiet" in stored.names).toBe(false);
  });

  it("W19 — 이름을 지우면 기본 이름으로 되돌아간다 (키 제거)", async () => {
    const port = memoryPort();
    await saveCustomNames(port, { quiet: "복실이" });
    // 사용자가 설정에서 비웠다 — 키를 지운 객체를 저장한다.
    await saveCustomNames(port, {});
    expect(await loadCustomNames(port)).toEqual({});
  });

  it("상한을 넘는 값은 저장되지 않는다", async () => {
    const port = memoryPort();
    await saveCustomNames(port, { quiet: "가".repeat(NAME_MAX_LENGTH + 1) });
    expect(await loadCustomNames(port)).toEqual({});
  });

  it("N9 — 저장된 JSON에 모델 정보·시각이 없다", async () => {
    const port = memoryPort();
    await saveCustomNames(port, { quiet: "복실이" });
    const stored = port.stored ?? "";
    expect(stored).not.toMatch(/asset|path|bytes|\bat\b|updated|changed|history|model/i);
    expect(Object.keys(JSON.parse(stored) as object)).toEqual(["names"]);
  });
});

describe("경계 — 소스 검사", () => {
  it("preferences/character-names.json에 담는다 (FR-029)", () => {
    expect(SOURCE).toContain("preferences");
    expect(SOURCE).toContain("character-names.json");
  });

  it("expo-file-system을 쓴다 (AsyncStorage 아님, 007 선례)", () => {
    expect(SOURCE).toContain("expo-file-system");
    expect(SOURCE).not.toMatch(/AsyncStorage|async-storage/);
  });

  it("임시 파일에 쓰고 옮긴다 (반쯤 쓰인 파일을 남기지 않는다)", () => {
    expect(SOURCE).toContain(".writing");
    expect(SOURCE).toMatch(/\.move\(/);
  });

  it("검증을 복제하지 않고 validateCharacterName을 공유한다", () => {
    // 두 자리에 각각 규칙을 두면 저장은 되는데 읽히지 않는 값이 생긴다.
    expect(SOURCE).toContain("validateCharacterName");
    expect(SOURCE).not.toMatch(/length\s*>\s*\d+/);
  });
});
