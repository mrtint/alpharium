/**
 * 078 — 창 밖 따라잡기 기록 (CU1~CU4). 「오늘 창 밖에서 한 번 판정했다」는 날짜 하나다(057 건너뜀 기록과 같은 꼴).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  loadCatchUpDay,
  saveCatchUpDay,
  type CatchUpStorePort,
} from "../../src/schedule/catch-up-store";

function memoryPort(initial: string | null = null): CatchUpStorePort & { content: string | null } {
  const port = {
    content: initial,
    async read() {
      return port.content;
    },
    async write(serialized: string) {
      port.content = serialized;
    },
  };
  return port;
}

describe("CU1 — 저장과 읽기", () => {
  it("날짜 하나를 { on }으로 쓰고 그대로 읽는다", async () => {
    const port = memoryPort();
    await saveCatchUpDay(port, "2026-10-13");
    expect(JSON.parse(port.content ?? "")).toEqual({ on: "2026-10-13" });
    expect(await loadCatchUpDay(port)).toBe("2026-10-13");
  });

  it("다시 쓰면 덮는다 — 날짜는 하나뿐이다", async () => {
    const port = memoryPort();
    await saveCatchUpDay(port, "2026-10-13");
    await saveCatchUpDay(port, "2026-10-14");
    expect(await loadCatchUpDay(port)).toBe("2026-10-14");
  });
});

describe("CU2 — 못 읽으면 「쓴 적 없음」이다 (막지 않는 쪽으로)", () => {
  it.each([
    ["파일 없음", null],
    ["JSON 아님", "{"],
    ["객체 아님", "3"],
    ["날짜 꼴 아님", JSON.stringify({ on: "어제" })],
    ["필드 없음", JSON.stringify({ day: "2026-10-13" })],
  ])("%s → null", async (_name, raw) => {
    expect(await loadCatchUpDay(memoryPort(raw))).toBeNull();
  });

  it("읽기 예외 → null", async () => {
    const broken: CatchUpStorePort = {
      read: () => Promise.reject(new Error("io")),
      write: async () => {},
    };
    expect(await loadCatchUpDay(broken)).toBeNull();
  });
});

describe("CU3 — 소스 계약", () => {
  const SRC = readFileSync(join(__dirname, "../../src/schedule/catch-up-store.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("파일은 preferences/auto-write-catch-up.json 하나이고 비동기 File 호출을 쓰지 않는다", () => {
    expect(SRC).toMatch(/"preferences"/);
    expect(SRC).toMatch(/"auto-write-catch-up\.json"/);
    expect(SRC).toMatch(/textSync\(\)/);
    expect(SRC).not.toMatch(/\.text\(\)|\.move\(|\.copy\(|\.bytes\(/);
  });

  it("횟수·시각을 세지 않는다 — 날짜 하나뿐이다 (원칙 IV)", () => {
    expect(SRC).not.toMatch(/count|elapsed|duration|toISOString|Date\.now/i);
  });
});
