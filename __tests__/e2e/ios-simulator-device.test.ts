import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { iosSimulatorDevice, type Exec } from "../../scripts/layer1/ios-simulator-device";

/**
 * 095 — iOS 시뮬레이터 장치 (`Layer1Device` 구현). `xcrun`·`maestro`는 대역이고 컨테이너는 임시 폴더다.
 *
 * 계약: specs/095-ios-e2e-suite/contracts/ios-layer1-runner.md (L1·L2, I-1)
 */

const UDID = "11111111-2222-3333-4444-555555555555";
const bootedJson = JSON.stringify({
  devices: {
    "com.apple.CoreSimulator.SimRuntime.iOS-27-0": [
      { udid: UDID, name: "iPhone 18 Pro", state: "Booted" },
    ],
    "com.apple.CoreSimulator.SimRuntime.watchOS-27-0": [
      { udid: "WATCH-1", name: "Apple Watch", state: "Booted" },
    ],
  },
});

type Call = { cmd: string; args: string[] };

function fixture(options: { containers?: string[]; list?: string; app?: boolean } = {}) {
  const calls: Call[] = [];
  let lookup = 0;
  const containers = options.containers ?? [mkdtempSync(join(tmpdir(), "pocketlog-sim-"))];
  for (const dir of containers) mkdirSync(join(dir, "Documents"), { recursive: true });
  const exec: Exec = (cmd, args) => {
    calls.push({ cmd, args });
    if (args[0] === "simctl" && args[1] === "list") {
      return { status: 0, stdout: options.list ?? bootedJson, stderr: "" };
    }
    if (args[1] === "get_app_container") {
      if (options.app === false)
        return { status: 2, stdout: "", stderr: "No such file or directory" };
      const dir = containers[Math.min(lookup, containers.length - 1)];
      lookup += 1;
      return { status: 0, stdout: `${dir}\n`, stderr: "" };
    }
    return { status: 0, stdout: "", stderr: "" };
  };
  const device = iosSimulatorDevice({ exec, maestro: () => ({ status: 0, junit: null }) });
  return { device, calls, containers };
}

describe("iOS 시뮬레이터 장치 (095)", () => {
  it("listDevices — 부팅된 iOS 시뮬레이터만 준다 (watchOS 제외)", () => {
    expect(fixture().device.listDevices()).toEqual([UDID]);
  });

  it("listDevices — xcrun을 못 부르면 null (건너뜀 이유)", () => {
    const device = iosSimulatorDevice({
      exec: () => ({ status: null, stdout: "", stderr: "", error: new Error("ENOENT") }),
      maestro: () => ({ status: 0, junit: null }),
    });
    expect(device.listDevices()).toBeNull();
  });

  it("컨테이너 위치는 호출마다 다시 찾는다 — 저장하지 않는다 (066: 재설치마다 바뀐다)", () => {
    const a = mkdtempSync(join(tmpdir(), "pocketlog-sim-a-"));
    const b = mkdtempSync(join(tmpdir(), "pocketlog-sim-b-"));
    const { device } = fixture({ containers: [a, b] });
    device.writeFile(UDID, "preferences/x.json", "A");
    device.writeFile(UDID, "preferences/x.json", "B");
    expect(readFileSync(join(a, "Documents", "preferences", "x.json"), "utf8")).toBe("A");
    expect(readFileSync(join(b, "Documents", "preferences", "x.json"), "utf8")).toBe("B");
  });

  it("probe — 앱이 없으면 이유를 말하고, 있으면 Documents에 닿는다", () => {
    const missing = fixture({ app: false }).device.probe(UDID);
    expect(missing.ok).toBe(false);
    expect(fixture().device.probe(UDID)).toEqual({ ok: true, value: undefined });
  });

  it("파일 연산은 Documents/ 아래에서 일어난다", () => {
    const { device, containers } = fixture();
    expect(device.ensureDirs(UDID).ok).toBe(true);
    for (const dir of ["preferences", "diary", "vision-cache"]) {
      expect(existsSync(join(containers[0], "Documents", dir))).toBe(true);
    }
    const local = join(containers[0], "src.jpg");
    writeFileSync(local, "jpg");
    expect(device.copyFile(UDID, "vision-cache/a.jpg", local).ok).toBe(true);
    expect(device.writeFile(UDID, "diary/2026-10-01.json", "{}").ok).toBe(true);
    expect(device.listDir(UDID, "diary")).toEqual({ ok: true, value: ["2026-10-01.json"] });
    expect(device.removeFile(UDID, "diary/2026-10-01.json").ok).toBe(true);
    expect(device.listDir(UDID, "diary")).toEqual({ ok: true, value: [] });
  });

  it("없는 폴더는 비어 있음이다 (오류 아님)", () => {
    expect(fixture().device.listDir(UDID, "models")).toEqual({ ok: true, value: [] });
  });

  it("안전하지 않은 경로는 거절하고 아무것도 쓰지 않는다", () => {
    const { device, containers } = fixture();
    for (const bad of ["../escape.json", "a b.json", "/abs.json", "diary/../../x"]) {
      expect(device.writeFile(UDID, bad, "x").ok).toBe(false);
      expect(device.removeFile(UDID, bad).ok).toBe(false);
      expect(device.listDir(UDID, bad).ok).toBe(false);
    }
    expect(existsSync(join(containers[0], "escape.json"))).toBe(false);
  });

  it("forceStop — simctl terminate를 부르고, 실행 중이 아니어서 실패해도 성공이다", () => {
    const calls: Call[] = [];
    const device = iosSimulatorDevice({
      exec: (cmd, args) => {
        calls.push({ cmd, args });
        return { status: 3, stdout: "", stderr: "found nothing to terminate" };
      },
      maestro: () => ({ status: 0, junit: null }),
    });
    expect(device.forceStop(UDID).ok).toBe(true);
    expect(calls[0].args.slice(0, 2)).toEqual(["simctl", "terminate"]);
    expect(calls[0].args).toContain(UDID);
    expect(calls[0].args).toContain("com.a810labs.pocketlog");
  });

  it("forceStop — xcrun 자체를 못 부르면 실패다", () => {
    const device = iosSimulatorDevice({
      exec: () => ({ status: null, stdout: "", stderr: "", error: new Error("ENOENT") }),
      maestro: () => ({ status: 0, junit: null }),
    });
    expect(device.forceStop(UDID).ok).toBe(false);
  });

  it("runMaestro — 부팅된 시뮬레이터 하나를 --device로 지정하고 -e 값을 넘긴다", () => {
    const seen: string[][] = [];
    const device = iosSimulatorDevice({
      exec: (_c, args) =>
        args[1] === "list"
          ? { status: 0, stdout: bootedJson, stderr: "" }
          : { status: 0, stdout: "", stderr: "" },
      maestro: (args) => {
        seen.push(args);
        return { status: 0, junit: null };
      },
    });
    const result = device.runMaestro([".maestro/a.yml", ".maestro/b.yml"], { TODAY: "2026-10-22" });
    expect(result).toEqual({ status: 0, failed: null });
    const args = seen[0];
    expect(args.slice(0, 3)).toEqual(["--device", UDID, "test"]);
    expect(args).toEqual(
      expect.arrayContaining(["-e", "TODAY=2026-10-22", ".maestro/a.yml", ".maestro/b.yml"]),
    );
  });

  it("runMaestro — 안전하지 않은 -e 값은 Maestro를 부르지 않고 실패한다", () => {
    let called = false;
    const device = iosSimulatorDevice({
      exec: () => ({ status: 0, stdout: bootedJson, stderr: "" }),
      maestro: () => {
        called = true;
        return { status: 0, junit: null };
      },
    });
    expect(device.runMaestro([".maestro/a.yml"], { TODAY: "a b" }).status).toBe(2);
    expect(called).toBe(false);
  });

  it("runMaestro — 시뮬레이터가 하나가 아니면 고르지 않고 실패한다", () => {
    const device = iosSimulatorDevice({
      exec: () => ({ status: 0, stdout: JSON.stringify({ devices: {} }), stderr: "" }),
      maestro: () => ({ status: 0, junit: null }),
    });
    expect(device.runMaestro([".maestro/a.yml"]).status).toBe(2);
  });

  it("runMaestro — 실패 보고서에서 실패한 흐름 이름을 모은다", () => {
    const junit = `<testsuite><testcase name="ok"/><testcase name="bad"><failure/></testcase></testsuite>`;
    const device = iosSimulatorDevice({
      exec: () => ({ status: 0, stdout: bootedJson, stderr: "" }),
      maestro: () => ({ status: 1, junit }),
    });
    expect(device.runMaestro([".maestro/a.yml"])).toEqual({ status: 1, failed: ["bad"] });
  });

  it("labels — iOS 문구를 준다", () => {
    const labels = fixture().device.labels;
    expect(labels?.toolMissing).toContain("simctl");
    expect(labels?.noDevice).toContain("시뮬레이터");
  });
});
