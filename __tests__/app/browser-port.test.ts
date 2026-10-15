/**
 * 086 — 브라우저 여는 통로 (contracts/settings-rows.md B1·B3).
 *
 * `react-native`의 `Linking`을 갈아 끼워 결과만 본다. 실제 브라우저가 열리는지는 실기기에서 본다(quickstart §3).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { openInBrowser } from "../../src/app/browser-port";

// `require("react-native")`는 openInBrowser를 부를 때 일어나므로 아래 대역이 그때 쓰인다(jest.mock은 끌어올려진다).
const mockOpenURL = jest.fn<Promise<void>, [string]>();
const mockCanOpenURL = jest.fn();

jest.mock("react-native", () => ({
  Linking: { openURL: mockOpenURL, canOpenURL: mockCanOpenURL },
}));

const strip = (code: string): string =>
  code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

beforeEach(() => {
  mockOpenURL.mockReset();
  mockCanOpenURL.mockReset();
});

describe("086 B — openInBrowser", () => {
  it("B1 — openURL이 resolve하면 true, 받은 주소를 그대로 넘긴다", async () => {
    mockOpenURL.mockResolvedValue(undefined);
    await expect(openInBrowser("https://example.test/a/")).resolves.toBe(true);
    expect(mockOpenURL).toHaveBeenCalledWith("https://example.test/a/");
  });

  it("B1 — openURL이 reject하면 false, 던지지 않는다", async () => {
    mockOpenURL.mockRejectedValue(new Error("No Activity found"));
    await expect(openInBrowser("https://example.test/b/")).resolves.toBe(false);
  });

  it("B3 — canOpenURL을 부르지 않는다(안드로이드 11+ <queries> 없이는 거짓을 줄 수 있다)", async () => {
    mockOpenURL.mockResolvedValue(undefined);
    await openInBrowser("https://example.test/c/");
    expect(mockCanOpenURL).not.toHaveBeenCalled();
    const code = strip(readFileSync(join(__dirname, "../../src/app/browser-port.ts"), "utf8"));
    expect(code).not.toMatch(/canOpenURL/);
  });
});
