/**
 * 062 — 기기 선호 언어를 읽는 통로 (contracts/i18n.md D1~D3, research R1·R2).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { readDeviceLocales } from "../../src/i18n/locale-port";

const mockGetLocales = jest.fn();
jest.mock("expo-localization", () => ({ getLocales: () => mockGetLocales() }));

beforeEach(() => mockGetLocales.mockReset());

describe("D1 — 호출 시점에 require한다", () => {
  const code = readFileSync(join(__dirname, "../../src/i18n/locale-port.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("최상단 import가 없고 함수 안에 require가 하나 있다", () => {
    expect(code).not.toMatch(/^import\s+(?!type)[^;]*["']expo-localization["']/m);
    expect(code.match(/require\(["']expo-localization["']\)/g)).toHaveLength(1);
  });
});

describe("D2 — 던지지 않고, 못 읽으면 null이다", () => {
  it.each([
    [
      "던짐",
      () => {
        throw new Error("no native module");
      },
    ],
    ["빈 배열", () => []],
    ["빈 태그만", () => [{ languageTag: "" }, { languageTag: "  " }]],
    ["배열 아님", () => ({ languageTag: "ko-KR" })],
    ["태그 없음", () => [{ languageCode: "ko" }]],
  ])("%s → null", (_label, impl) => {
    mockGetLocales.mockImplementation(impl);
    expect(() => readDeviceLocales()).not.toThrow();
    expect(readDeviceLocales()).toBeNull();
  });
});

describe("D3 — 태그 원문을 선호 순서대로 준다", () => {
  it("languageTag만 순서대로, 빈 것은 거른다", () => {
    mockGetLocales.mockReturnValue([
      { languageTag: "en-US", languageCode: "en" },
      { languageTag: "" },
      { languageTag: "ko-KR", languageCode: null },
    ]);
    expect(readDeviceLocales()).toEqual(["en-US", "ko-KR"]);
  });
});
