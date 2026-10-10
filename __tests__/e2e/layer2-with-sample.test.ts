import type { EnsureResult } from "../../scripts/e2e-sample/ensure";
import type { Layer2Device, Outcome } from "../../scripts/layer1/device";
import { LAYER2_FLOWS } from "../../scripts/layer2/flows";
import { runLayer2WithSample } from "../../scripts/layer2/with-sample";

/**
 * 073 — 층 2 앞에 표본 보장을 끼우는 래퍼 (contracts/layer2-runner.md L2-1·L2-2).
 *
 * 층 1의 `with-sample.test.ts`(070)와 같은 갈래를 잠근다: 보장 실패는 통과가 아니라 중단이고 흐름을 돌리지 않으며,
 * 기기·Maestro가 없거나 기기가 여럿이면 표본을 건드리지 않고 실행기의 건너뜀·중단으로 넘긴다.
 */

const ok: Outcome = { ok: true, value: undefined };

function fakeDevice(over: { devices?: string[] | null; maestro?: boolean } = {}) {
  const calls: string[] = [];
  const device: Layer2Device = {
    listDevices: () => (over.devices === undefined ? ["SERIAL"] : over.devices),
    hasMaestro: () => over.maestro ?? true,
    probe: () => ok,
    listDir: (_s, relative) => ({
      ok: true,
      value: relative === "models" ? ["a1.bin", "v1.bin", "v2.bin"] : [],
    }),
    forceStop: () => ok,
    ensureDirs: () => ok,
    writeFile: () => ok,
    copyFile: () => ok,
    removeFile: () => ok,
    pullFile: () => ok,
    runMaestro: () => {
      calls.push("maestro");
      return { status: 0, failed: null };
    },
  };
  return { device, calls };
}

function sampleStep(result: EnsureResult) {
  const calls: string[] = [];
  return {
    step: {
      ensure: async () => {
        calls.push("ensure");
        return result;
      },
    },
    calls,
  };
}

describe("runLayer2WithSample", () => {
  it("표본 보장 → 흐름 넷 실행", async () => {
    const { device, calls } = fakeDevice();
    const { step, calls: sampleCalls } = sampleStep({ status: "skipped" });
    const result = await runLayer2WithSample({ device }, step);
    expect(result.status).toBe("passed");
    expect(sampleCalls).toEqual(["ensure"]);
    expect(calls.filter((c) => c === "maestro")).toHaveLength(LAYER2_FLOWS.length);
  });

  it("표본 보장이 실패하면 통과가 아니라 중단이고 흐름을 돌리지 않는다", async () => {
    const { device, calls } = fakeDevice();
    const { step } = sampleStep({
      status: "failed",
      reason: "index-failed",
      detail: "12장의 datetaken이 비어 있다",
    });
    const result = await runLayer2WithSample({ device }, step);
    expect(result.status).toBe("aborted");
    expect(result.reason).toMatch(/index-failed/);
    expect(result.reason).toMatch(/datetaken/);
    expect(calls).not.toContain("maestro");
    expect(result.perFlow.map((f) => f.status)).toEqual(LAYER2_FLOWS.map(() => "not-run"));
  });

  it.each([
    ["기기 없음", { devices: [] }],
    ["adb 없음", { devices: null }],
    ["Maestro 없음", { maestro: false }],
  ] as [string, { devices?: string[] | null; maestro?: boolean }][])(
    "%s이면 표본을 건드리지 않고 실행기의 건너뜀이 나온다",
    async (_name, over) => {
      const { device } = fakeDevice(over);
      const { step, calls } = sampleStep({ status: "skipped" });
      const result = await runLayer2WithSample({ device }, step);
      expect(result.status).toBe("skipped");
      expect(calls).toEqual([]);
    },
  );

  it("기기가 여럿이면 표본을 심지 않고 중단한다", async () => {
    const { device, calls: deviceCalls } = fakeDevice({ devices: ["A", "B"] });
    const { step, calls } = sampleStep({ status: "skipped" });
    const result = await runLayer2WithSample({ device }, step);
    expect(result.status).toBe("aborted");
    expect(result.reason).toMatch(/하나/);
    expect(calls).toEqual([]);
    expect(deviceCalls).not.toContain("maestro");
  });
});
