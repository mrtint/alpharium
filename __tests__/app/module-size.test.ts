/**
 * 058 — 「쓰는 모듈」 용량 (`src/app/module-size.ts`).
 *
 * 계약: specs/058-settings-this-phone/contracts/this-phone.md MS1·MS2, spec FR-004(1000 기준)
 */

import { formatModuleBytes, readModuleBytes } from "../../src/app/module-size";
import { ESSENTIAL_ASSET_KEYS } from "../../src/onboarding/essential-assets";

describe("MS1 — formatModuleBytes (1000 기준)", () => {
  it.each([
    [2_004_831_040, "2.0GB"],
    [1_000_000_000, "1.0GB"],
    [999_499_999, "999MB"],
    [999_500_000, "1.0GB"],
    [480_000_000, "480MB"],
    [0, "0MB"],
    [1_950_000_000, "2.0GB"],
    [12_345_678_901, "12.3GB"],
  ])("%d → %s", (bytes, text) => {
    expect(formatModuleBytes(bytes)).toBe(text);
  });
});

describe("MS2 — readModuleBytes", () => {
  it("필수 모듈 키마다 한 번씩 읽어 더한다", async () => {
    const asked: string[] = [];
    const sizes: Record<string, number> = { v1: 379_219_104, v2: 102_815_168, a1: 1_522_796_768 };
    const total = await readModuleBytes({
      async bytesUsed(key) {
        asked.push(key);
        return sizes[key] ?? 0;
      },
    });
    expect([...asked].sort()).toEqual([...ESSENTIAL_ASSET_KEYS].sort());
    expect(total).toBe(2_004_831_040);
  });

  it("하나라도 던지면 던진다", async () => {
    await expect(
      readModuleBytes({
        async bytesUsed(key) {
          if (key === "v2") throw new Error("못 읽음");
          return 1;
        },
      }),
    ).rejects.toThrow("못 읽음");
  });
});
