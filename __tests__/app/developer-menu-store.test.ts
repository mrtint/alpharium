/**
 * 059 — 개발자 메뉴 켜짐 파일 (계약 DS1~DS4, data-model §1).
 *
 * 값은 켜짐 여부 하나뿐이다 — 시각·횟수를 담으면 실행 이력 로그로 자란다(원칙 IV, D3).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  clearDeveloperMenu,
  loadDeveloperMenu,
  saveDeveloperMenu,
  type DeveloperMenuStorePort,
} from "../../src/app/developer-menu-store";

function memoryPort(initial: string | null = null) {
  let content = initial;
  const port: DeveloperMenuStorePort & { content: () => string | null } = {
    read: jest.fn(async () => content),
    write: jest.fn(async (s: string) => {
      content = s;
    }),
    remove: jest.fn(async () => {
      content = null;
    }),
    content: () => content,
  };
  return port;
}

describe("DS1 — 저장", () => {
  it('{"enabled":true} 하나만 쓴다', async () => {
    const port = memoryPort();
    await saveDeveloperMenu(port);
    expect(Object.keys(JSON.parse(port.content() as string))).toEqual(["enabled"]);
    expect(JSON.parse(port.content() as string)).toEqual({ enabled: true });
  });
});

describe("DS2 — 지우기", () => {
  it("remove 를 부르고 파일이 없어도 던지지 않는다", async () => {
    const port = memoryPort();
    await expect(clearDeveloperMenu(port)).resolves.toBeUndefined();
    expect(port.remove).toHaveBeenCalledTimes(1);
  });
});

describe("DS3 — 읽기는 던지지 않고 모르면 꺼짐이다", () => {
  it.each([
    ["없음", null],
    ["JSON 아님", "not json"],
    ["enabled false", '{"enabled":false}'],
    ["enabled 문자열", '{"enabled":"yes"}'],
    ["빈 객체", "{}"],
    ["배열", "[]"],
  ])("%s → false", async (_name, raw) => {
    expect(await loadDeveloperMenu(memoryPort(raw))).toBe(false);
  });

  it("켜짐 파일이면 true", async () => {
    expect(await loadDeveloperMenu(memoryPort('{"enabled":true}'))).toBe(true);
  });

  it("통로가 던져도 false", async () => {
    const port: DeveloperMenuStorePort = {
      read: async () => {
        throw new Error("io");
      },
      write: async () => {},
      remove: async () => {},
    };
    expect(await loadDeveloperMenu(port)).toBe(false);
  });
});

describe("DS4 — 이 파일 하나만 만진다", () => {
  const source = readFileSync(join(__dirname, "../../src/app/developer-menu-store.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("preferences/developer-menu.json 이다", () => {
    expect(source).toMatch(/preferences/);
    expect(source).toMatch(/developer-menu\.json/);
  });

  it("다른 설정 파일을 읽거나 쓰지 않는다", () => {
    expect(source).not.toMatch(/auto-diary\.json/);
    expect(source).not.toMatch(/onboarding\.json/);
    expect(source).not.toMatch(/auto-write-skipped\.json/);
  });
});
