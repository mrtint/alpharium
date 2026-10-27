import {
  clearFastCycle,
  loadFastCycle,
  parseFastCycle,
  saveFastCycle,
  serializeFastCycle,
  type FastCycleRecord,
  type FastCyclePort,
} from "../../src/schedule/fast-cycle-store";

/**
 * 빠른 주기 기록 (106).
 *
 * 계약: specs/106-auto-write-fast-cycle/contracts/fast-cycle.md FC3 · data-model「빠른 주기 설정」
 * 064 `simulation-store`와 같은 모양 — 담고 꺼내기만 한다. 읽기는 던지지 않고 모르면 꺼짐(`null`)이다(원칙 V).
 */

const RECORD: FastCycleRecord = { periodMinutes: 30, resetCycle: "2026-10-26#4" };

function memoryPort(initial: string | null = null) {
  let value = initial;
  const calls: string[] = [];
  const port: FastCyclePort = {
    async read() {
      return value;
    },
    async write(serialized) {
      calls.push("write");
      value = serialized;
    },
    async remove() {
      calls.push("remove");
      value = null;
    },
  };
  return {
    port,
    calls,
    get value() {
      return value;
    },
  };
}

describe("parseFastCycle — 유효한 기록만 켜짐이다", () => {
  it("유효한 기록을 읽는다", () => {
    expect(parseFastCycle(JSON.stringify(RECORD))).toEqual(RECORD);
  });

  it("알 수 없는 필드는 무시한다", () => {
    expect(parseFastCycle(JSON.stringify({ ...RECORD, extra: 1 }))).toEqual(RECORD);
  });

  it.each([
    ["null", null],
    ["JSON 깨짐", "{"],
    ["문자열", JSON.stringify("x")],
    ["배열", JSON.stringify([RECORD])],
    ["periodMinutes 4", JSON.stringify({ ...RECORD, periodMinutes: 4 })],
    ["periodMinutes 181", JSON.stringify({ ...RECORD, periodMinutes: 181 })],
    ["periodMinutes 30.5", JSON.stringify({ ...RECORD, periodMinutes: 30.5 })],
    ["periodMinutes 문자열", JSON.stringify({ ...RECORD, periodMinutes: "30" })],
    ["periodMinutes 없음", JSON.stringify({ resetCycle: "2026-10-26#4" })],
    ["resetCycle 숫자", JSON.stringify({ ...RECORD, resetCycle: 4 })],
    ["resetCycle 없음", JSON.stringify({ periodMinutes: 30 })],
  ])("%s → 꺼짐(null) — 켜짐으로 채우지 않는다", (_name, raw) => {
    expect(parseFastCycle(raw)).toBeNull();
  });
});

describe("serializeFastCycle", () => {
  it("왕복한다", () => {
    expect(parseFastCycle(serializeFastCycle(RECORD))).toEqual(RECORD);
  });

  it("두 필드만 담는다 — 시각·횟수·이력을 담지 않는다 (원칙 IV)", () => {
    expect(Object.keys(JSON.parse(serializeFastCycle(RECORD))).sort()).toEqual([
      "periodMinutes",
      "resetCycle",
    ]);
  });
});

describe("loadFastCycle — 던지지 않는다", () => {
  it("기록 없음은 null", async () => {
    expect(await loadFastCycle(memoryPort().port)).toBeNull();
  });

  it("읽기 예외는 null", async () => {
    const port: FastCyclePort = {
      read: async () => {
        throw new Error("io");
      },
      write: async () => {},
      remove: async () => {},
    };
    expect(await loadFastCycle(port)).toBeNull();
  });

  it("저장한 기록을 읽는다", async () => {
    const m = memoryPort();
    await saveFastCycle(m.port, RECORD);
    expect(await loadFastCycle(m.port)).toEqual(RECORD);
  });
});

describe("clearFastCycle", () => {
  it("기록을 지운다", async () => {
    const m = memoryPort(serializeFastCycle(RECORD));
    await clearFastCycle(m.port);
    expect(m.calls).toEqual(["remove"]);
    expect(await loadFastCycle(m.port)).toBeNull();
  });
});
