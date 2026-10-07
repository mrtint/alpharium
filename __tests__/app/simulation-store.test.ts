/**
 * 064 — 상태 흉내 기록 통로 (contracts/simulation.md SS1~SS3).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { OFF } from "../../src/app/simulation";
import {
  clearSimulation,
  loadSimulation,
  saveSimulation,
  type SimulationStorePort,
} from "../../src/app/simulation-store";

function memoryPort(initial: string | null = null) {
  let value = initial;
  const calls: string[] = [];
  const port: SimulationStorePort = {
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

describe("SS1 — loadSimulation", () => {
  it("통로가 던져도 OFF", async () => {
    const port: SimulationStorePort = {
      read: () => Promise.reject(new Error("io")),
      write: async () => {},
      remove: async () => {},
    };
    await expect(loadSimulation(port)).resolves.toEqual(OFF);
  });

  it("저장된 값을 읽는다", async () => {
    const m = memoryPort(JSON.stringify({ noPhoto: true }));
    await expect(loadSimulation(m.port)).resolves.toEqual({ ...OFF, noPhoto: true });
  });
});

describe("SS2 — saveSimulation", () => {
  it("OFF면 지운다", async () => {
    const m = memoryPort(JSON.stringify({ noPhoto: true }));
    await saveSimulation(m.port, OFF);
    expect(m.calls).toEqual(["remove"]);
    expect(m.value).toBeNull();
  });

  it("켜진 것이 있으면 쓴다", async () => {
    const m = memoryPort();
    await saveSimulation(m.port, { ...OFF, failToast: true });
    expect(m.calls).toEqual(["write"]);
    await expect(loadSimulation(m.port)).resolves.toEqual({ ...OFF, failToast: true });
  });

  it("clearSimulation은 지운다", async () => {
    const m = memoryPort(JSON.stringify({ noPhoto: true }));
    await clearSimulation(m.port);
    expect(m.value).toBeNull();
  });
});

describe("SS3 — 파일 자리", () => {
  it("preferences/simulation.json이다(diary/ 밖)", () => {
    const source = readFileSync(join(__dirname, "../../src/app/simulation-store.ts"), "utf8");
    expect(source).toMatch(/const DIRECTORY = "preferences";/);
    expect(source).toMatch(/const SIMULATION_FILE = "simulation\.json";/);
  });
});
