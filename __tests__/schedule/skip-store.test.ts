import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  clearSkippedDay,
  loadSkippedDay,
  saveSkippedDay,
  type SkipStorePort,
} from "../../src/schedule/skip-store";

/**
 * 사진 권한 때문에 건너뛴 가장 최근 날의 기록 (057).
 *
 * 계약: specs/057-auto-write-rules/contracts/auto-write.md SK1~SK4
 *       data-model.md §2, 분해 설계 D3, 020 S7
 *
 * **날짜 하나뿐이다.** 시각·횟수·이유를 담으면 실행 이력 로그로 자란다(원칙 IV).
 */

function memoryPort(initial: string | null = null): SkipStorePort & { stored: string | null } {
  return {
    stored: initial,
    async read() {
      return this.stored;
    },
    async write(serialized: string) {
      this.stored = serialized;
    },
    async remove() {
      this.stored = null;
    },
  };
}

const SOURCE = readFileSync(join(__dirname, "../../src/schedule/skip-store.ts"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("SK1 — 저장 모양은 날짜 하나", () => {
  it('{"day":"YYYY-MM-DD"} 하나만 쓴다', async () => {
    const port = memoryPort();
    await saveSkippedDay(port, "2026-09-13");
    expect(JSON.parse(port.stored ?? "null")).toEqual({ day: "2026-09-13" });
  });

  it("소스에 시각·횟수·이력·이유 어휘가 없다", () => {
    expect(CODE).not.toMatch(/\b(?:Date|timestamp|count|history|reason)\b/);
  });
});

describe("SK2 — 읽기 방어", () => {
  it("파일이 없으면 null", async () => {
    expect(await loadSkippedDay(memoryPort(null))).toBeNull();
  });

  it("깨진 JSON이면 null (던지지 않는다)", async () => {
    expect(await loadSkippedDay(memoryPort("{not json"))).toBeNull();
  });

  it("day가 YYYY-MM-DD가 아니면 null", async () => {
    expect(await loadSkippedDay(memoryPort(JSON.stringify({ day: "9월 13일" })))).toBeNull();
    expect(await loadSkippedDay(memoryPort(JSON.stringify({ day: 20260913 })))).toBeNull();
    expect(await loadSkippedDay(memoryPort(JSON.stringify([])))).toBeNull();
  });

  it("통로가 던져도 null", async () => {
    const port: SkipStorePort = {
      read: () => Promise.reject(new Error("x")),
      write: async () => {},
      remove: async () => {},
    };
    expect(await loadSkippedDay(port)).toBeNull();
  });
});

describe("SK3 — 덮어쓰기와 지우기", () => {
  it("새 건너뜀이 이전 것을 덮는다 (가장 최근 한 번)", async () => {
    const port = memoryPort();
    await saveSkippedDay(port, "2026-09-11");
    await saveSkippedDay(port, "2026-09-13");
    expect(await loadSkippedDay(port)).toBe("2026-09-13");
  });

  it("지운 뒤에는 null", async () => {
    const port = memoryPort();
    await saveSkippedDay(port, "2026-09-13");
    await clearSkippedDay(port);
    expect(await loadSkippedDay(port)).toBeNull();
  });
});

describe("SK4 — 자리는 preferences/auto-write-skipped.json", () => {
  it("파일 이름과 디렉터리", () => {
    expect(CODE).toMatch(/["']auto-write-skipped\.json["']/);
    expect(CODE).toMatch(/["']preferences["']/);
  });

  it("자동 쓰기 설정 파일에 쓰지 않는다 (020 S7)", () => {
    expect(CODE).not.toMatch(/auto-diary\.json/);
  });
});
