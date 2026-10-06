/**
 * 저장 점검 계약 (060, DI1~DI3).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { inspectDiaries } from "../../src/app/diary-inspect";
import type { DiaryEntry } from "../../src/diary/types";

const entry = { date: "x" } as unknown as DiaryEntry;

describe("DI1 — 편수와 읽기 실패", () => {
  it("모두 읽히면 읽기 실패 0", async () => {
    const result = await inspectDiaries({
      listDays: async () => ["2026-10-01", "2026-10-02", "2026-10-03"],
      load: async () => entry,
    });
    expect(result).toEqual({ kind: "done", total: 3, unreadable: 0 });
  });

  it("load가 던지거나 null인 날은 읽기 실패로 센다", async () => {
    const result = await inspectDiaries({
      listDays: async () => ["2026-10-01", "2026-10-02", "2026-10-03"],
      load: async (day) => {
        if (day === "2026-10-02") throw new Error("broken");
        if (day === "2026-10-03") return null;
        return entry;
      },
    });
    expect(result).toEqual({ kind: "done", total: 3, unreadable: 2 });
  });

  it("일기가 없으면 0편이다", async () => {
    const result = await inspectDiaries({ listDays: async () => [], load: async () => null });
    expect(result).toEqual({ kind: "done", total: 0, unreadable: 0 });
  });
});

describe("DI2 — 목록을 못 읽으면 점검하지 못한 것이다", () => {
  it("listDays가 던지면 unavailable (0편·정상이 아니다)", async () => {
    const result = await inspectDiaries({
      listDays: () => Promise.reject(new Error("io")),
      load: async () => entry,
    });
    expect(result).toEqual({ kind: "unavailable" });
  });
});

describe("DI3 — 읽기만 한다", () => {
  it("통로 타입이 listDays·load 둘뿐이다", () => {
    const src = readFileSync(join(__dirname, "..", "..", "src", "app", "diary-inspect.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(src).toContain('Pick<DiaryStore, "listDays" | "load">');
    expect(src).not.toMatch(/\.save\(|\.removeAll\(|writeFile|\.write\(/);
  });
});
