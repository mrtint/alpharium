import type { EnsureResult } from "../../scripts/e2e-sample/ensure";
import type { Layer1Device, Outcome } from "../../scripts/layer1/device";
import { runLayer1WithSample, type SampleStep } from "../../scripts/layer1/with-sample";

/**
 * 070 — 층 1 앞에 표본 보장을 끼우는 래퍼 (contracts/sample-seeding.md G-5, sample-days-flow.md FL-3).
 */

const ok: Outcome = { ok: true, value: undefined };

function fakeDevice(over: { devices?: string[] | null; maestro?: boolean } = {}) {
  const calls: string[] = [];
  const envSeen: (Record<string, string> | undefined)[] = [];
  const device: Layer1Device = {
    listDevices: () => (over.devices === undefined ? ["SERIAL"] : over.devices),
    hasMaestro: () => over.maestro ?? true,
    probe: () => {
      calls.push("probe");
      return ok;
    },
    listDir: (_s, relative) => ({
      ok: true,
      value: relative === "models" ? ["a1.bin", "v1.bin", "v2.bin"] : [],
    }),
    forceStop: () => ok,
    ensureDirs: () => ok,
    writeFile: () => ok,
    copyFile: () => ok,
    removeFile: () => ok,
    runMaestro: (flows, env) => {
      calls.push("maestro");
      envSeen.push(env as Record<string, string> | undefined);
      return { status: 0, failed: null };
    },
  };
  return { device, calls, envSeen };
}

function sampleStep(
  result: EnsureResult,
  env: Record<string, string> = { P0_DATE: "2026-10-07", P0_BACK: "0" },
) {
  const calls: string[] = [];
  const step: SampleStep = {
    ensure: async () => {
      calls.push("ensure");
      return result;
    },
    env: () => env,
  };
  return { step, calls };
}

const fixtures = { diaries: [], photos: [] };

describe("runLayer1WithSample", () => {
  it("표본 보장 → 흐름 실행, 대표 날 값이 maestro -e로 넘어간다", async () => {
    const { device, calls, envSeen } = fakeDevice();
    const { step, calls: sampleCalls } = sampleStep({ status: "skipped" });
    const result = await runLayer1WithSample({ device, flows: ["a.yml"], fixtures }, step);
    expect(result.status).toBe("passed");
    expect(sampleCalls).toEqual(["ensure"]);
    expect(calls).toContain("maestro");
    expect(envSeen[0]).toEqual({ P0_DATE: "2026-10-07", P0_BACK: "0" });
  });

  it("표본 보장이 실패하면 통과가 아니라 중단이고 흐름을 돌리지 않는다", async () => {
    const { device, calls } = fakeDevice();
    const { step } = sampleStep({
      status: "failed",
      reason: "index-failed",
      detail: "12장의 datetaken이 비어 있다",
    });
    const result = await runLayer1WithSample({ device, flows: ["a.yml"], fixtures }, step);
    expect(result.status).toBe("aborted");
    expect(result.reason).toMatch(/index-failed/);
    expect(result.reason).toMatch(/datetaken/);
    expect(calls).not.toContain("maestro");
  });

  it("기기가 없으면 표본을 건드리지 않고 069의 「건너뜀」이 나온다", async () => {
    const { device } = fakeDevice({ devices: [] });
    const { step, calls } = sampleStep({ status: "skipped" });
    const result = await runLayer1WithSample({ device, flows: ["a.yml"], fixtures }, step);
    expect(result.status).toBe("skipped");
    expect(calls).toEqual([]);
  });

  it("Maestro가 없어도 건너뜀이고 표본을 심지 않는다", async () => {
    const { device } = fakeDevice({ maestro: false });
    const { step, calls } = sampleStep({ status: "skipped" });
    expect((await runLayer1WithSample({ device, flows: ["a.yml"], fixtures }, step)).status).toBe(
      "skipped",
    );
    expect(calls).toEqual([]);
  });

  it("기기가 여럿이면 임의로 고르지 않고 중단한다", async () => {
    const { device } = fakeDevice({ devices: ["A", "B"] });
    const { step, calls } = sampleStep({ status: "skipped" });
    const result = await runLayer1WithSample({ device, flows: ["a.yml"], fixtures }, step);
    expect(result.status).toBe("aborted");
    expect(result.reason).toMatch(/하나/);
    expect(calls).toEqual([]);
  });

  it("FL-3: 값에 공백·따옴표가 있으면 심기 전에 중단한다", async () => {
    const { device } = fakeDevice();
    const { step, calls } = sampleStep({ status: "skipped" }, { P0_DATE: "2026 10 07" });
    const result = await runLayer1WithSample({ device, flows: ["a.yml"], fixtures }, step);
    expect(result.status).toBe("aborted");
    expect(calls).toEqual([]);
  });
});
