/**
 * 2026-11-03 — 시도 줄에 싣는 기기 상태를 읽는 통로. 읽지 못한 값은 빠지고(원칙 V), 읽기가 쓰기를 막지 않는다.
 */

import { readDeviceState } from "../../src/app/device-state-port";

const NOW = new Date("2026-11-02T11:08:45.000Z");
const FULL = {
  now: () => NOW,
  readPower: async () => ({ battery: "charging", batteryLevel: 41, lowPower: false }) as const,
  readConnection: async () => "wifi" as const,
  readNative: async () =>
    ({ thermal: "fair", protectedData: false, availableMemoryMB: 1200 }) as const,
  readAppState: () => "background" as const,
  timeoutMs: 20,
};

describe("readDeviceState", () => {
  it("읽은 값을 모두 싣는다", async () => {
    expect(await readDeviceState(FULL)).toEqual({
      at: NOW,
      battery: "charging",
      batteryLevel: 41,
      lowPower: false,
      network: "wifi",
      thermal: "fair",
      protectedData: false,
      availableMemoryMB: 1200,
      appState: "background",
    });
  });

  it("한 통로가 던져도 나머지는 남고 모르는 값은 빠진다", async () => {
    const state = await readDeviceState({
      ...FULL,
      readPower: async () => {
        throw new Error("no module");
      },
      readConnection: async () => "unknown" as const,
      readAppState: () => {
        throw new Error("no rn");
      },
    });
    expect(state).toEqual({
      at: NOW,
      thermal: "fair",
      protectedData: false,
      availableMemoryMB: 1200,
    });
  });

  it("안 돌아오는 통로는 한도 뒤 빠진다 — 멈춘 네이티브 호출이 기록을 잡지 않는다", async () => {
    const state = await readDeviceState({ ...FULL, readNative: () => new Promise(() => {}) });
    expect(state).toMatchObject({ battery: "charging", network: "wifi" });
    expect(state.thermal).toBeUndefined();
  });
});

describe("기기 통로의 값 옮기기", () => {
  it("expo-battery 값을 갈래로 옮기고 -1 잔량은 뺀다", async () => {
    const { readPowerState } = jest.requireActual("../../src/app/power-state-port");
    const load = (state: number, level: number) => async () => ({
      getBatteryStateAsync: async () => state,
      getBatteryLevelAsync: async () => level,
      isLowPowerModeEnabledAsync: async () => true,
    });
    expect(await readPowerState(load(2, 0.416))).toEqual({
      battery: "charging",
      batteryLevel: 42,
      lowPower: true,
    });
    expect(await readPowerState(load(1, -1))).toEqual({ battery: "unplugged", lowPower: true });
    expect(await readPowerState(load(0, 1))).toEqual({ batteryLevel: 100, lowPower: true });
  });
});
