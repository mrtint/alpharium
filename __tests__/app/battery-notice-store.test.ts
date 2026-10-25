/**
 * 104 — 홈 배터리 안내를 닫은 시각 기록.
 *
 * 계약: specs/104-battery-exception-awareness/contracts/home-notice.md BS1~BS3, research R11
 *
 * **시각 하나뿐이다.** 횟수·이유·이력을 담으면 실행 이력 로그로 자란다(원칙 IV) — `skip-store`와 같은 층이다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  loadDismissedAt,
  saveDismissedAt,
  type BatteryNoticeStorePort,
} from "../../src/app/battery-notice-store";

function memoryPort(
  initial: string | null = null,
): BatteryNoticeStorePort & { stored: string | null } {
  return {
    stored: initial,
    async read() {
      return this.stored;
    },
    async write(serialized: string) {
      this.stored = serialized;
    },
  };
}

const SOURCE = readFileSync(join(__dirname, "../../src/app/battery-notice-store.ts"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("BS1 — 저장 모양은 시각 하나", () => {
  it('{"at":<ms>} 하나만 쓰고 이전 기록을 덮는다', async () => {
    const port = memoryPort();
    await saveDismissedAt(port, 1_700_000_000_000);
    expect(JSON.parse(port.stored ?? "null")).toEqual({ at: 1_700_000_000_000 });
    await saveDismissedAt(port, 1_800_000_000_000);
    expect(JSON.parse(port.stored ?? "null")).toEqual({ at: 1_800_000_000_000 });
  });

  it("소스에 횟수·이력·이유 어휘가 없다", () => {
    expect(CODE).not.toMatch(/\b(?:count|history|reason)\b/);
  });
});

describe("BS2 — 읽기: 없음·깨짐은 null, 통로 예외는 unreadable", () => {
  it("저장된 시각을 읽는다", async () => {
    expect(await loadDismissedAt(memoryPort(JSON.stringify({ at: 123 })))).toBe(123);
  });

  it("파일이 없으면 null", async () => {
    expect(await loadDismissedAt(memoryPort(null))).toBeNull();
  });

  it("깨진 JSON·모양이 다른 값·숫자가 아닌 at이면 null (닫은 적 없음 — 다음에 닫으면 덮는다)", async () => {
    expect(await loadDismissedAt(memoryPort("{not json"))).toBeNull();
    expect(await loadDismissedAt(memoryPort("[]"))).toBeNull();
    expect(await loadDismissedAt(memoryPort(JSON.stringify({ at: "어제" })))).toBeNull();
    expect(await loadDismissedAt(memoryPort(JSON.stringify({ at: Number.NaN })))).toBeNull();
    expect(await loadDismissedAt(memoryPort(JSON.stringify({ at: -5 })))).toBeNull();
  });

  it("통로가 던지면 unreadable — 모르는 것을 닫지 않았음으로 채우지 않는다", async () => {
    const port: BatteryNoticeStorePort = {
      read: async () => {
        throw new Error("io");
      },
      write: async () => {},
    };
    expect(await loadDismissedAt(port)).toBe("unreadable");
  });
});

describe("BS1 — 기기 통로", () => {
  it("preferences/battery-notice-dismissed.json 하나, 지연 import, 임시 파일 뒤 교체", () => {
    expect(CODE).toMatch(/["']preferences["']/);
    expect(CODE).toMatch(/battery-notice-dismissed\.json/);
    expect(CODE).toMatch(/await import\(["']expo-file-system["']\)/);
    expect(CODE).not.toMatch(/^import .* from ["']expo-file-system["']/m);
    expect(CODE).toMatch(/\.writing/);
  });

  it("★ File은 동기 메서드만 쓴다 (067·073 — 비동기 text()/move()는 GC로 실패한다)", () => {
    expect(CODE).toMatch(/textSync\(/);
    expect(CODE).toMatch(/moveSync\(/);
    expect(CODE).not.toMatch(/\.text\(|\.bytes\(|\.move\(|\.copy\(/);
  });
});

describe("BS3 — 069 G-1: 층 1 기준 상태 표에 이 파일이 있다", () => {
  it("scripts/layer1/baseline.ts", () => {
    const baseline = readFileSync(join(__dirname, "../../scripts/layer1/baseline.ts"), "utf8");
    expect(baseline).toMatch(/battery-notice-dismissed\.json/);
  });
});
