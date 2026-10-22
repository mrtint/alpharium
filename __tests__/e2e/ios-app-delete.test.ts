import {
  buildDeleteScript,
  deleteInApp,
  isDeletable,
  type RunLldb,
} from "../../scripts/layer2-ios/app-delete";
import type { Ctl } from "../../scripts/layer2-ios/device";

/**
 * 097 — 앱 안에서 파일 지우기 (lldb). `devicectl`·`lldb`·시계는 대역이다.
 *
 * 계약: specs/097-ios-e2e-suite/contracts/ios-layer2-runner.md (L2-3, I-1), research R2
 */

const UDID = "00008110-000000000000001E";
const APP_PROCESS = {
  result: {
    runningProcesses: [
      {
        executable: "file:///private/var/containers/Bundle/Application/X/Pocketlog.app/Pocketlog",
        processIdentifier: 4135,
      },
    ],
  },
};

function setup(options: { lldbStdout?: string; processes?: unknown; xcode?: boolean } = {}) {
  const calls: string[][] = [];
  const scripts: string[] = [];
  const ctl: Ctl = (args) => {
    calls.push(args);
    if (args.slice(0, 3).join(" ") === "device info processes")
      return { ok: true, json: options.processes ?? APP_PROCESS };
    return { ok: true, json: {} };
  };
  const runLldb: RunLldb = (script) => {
    scripts.push(script);
    return { stdout: options.lldbStdout ?? "(int) $0 = 0\n(int) $1 = 0\n(int) $2 = -1\n" };
  };
  const run = (relatives: string[]) =>
    deleteInApp(
      { ctl, runLldb, sleep: async () => {}, xcodeRunning: () => options.xcode ?? false },
      UDID,
      relatives,
    );
  return { run, calls, scripts };
}

describe("앱 안에서 파일 지우기 (097)", () => {
  it("isDeletable — preferences·diary·vision-cache 아래 파일만 허용한다 (models는 없다)", () => {
    expect(isDeletable("diary/2026-10-21.json")).toBe(true);
    expect(isDeletable("preferences/auto-diary.json")).toBe(true);
    expect(isDeletable("vision-cache/a.jpg")).toBe(true);
    for (const bad of [
      "models/a1.bin",
      "models",
      "diary",
      "../x",
      "/diary/x",
      "Library/x",
      "diary/../models/a1.bin",
      "a b/c",
    ]) {
      expect(isDeletable(bad)).toBe(false);
    }
  });

  it("지울 것이 없으면 아무것도 하지 않는다", async () => {
    const { run, calls, scripts } = setup();
    expect(await run([])).toEqual({ ok: true, value: undefined });
    expect(calls).toEqual([]);
    expect(scripts).toEqual([]);
  });

  it("허용 밖 경로가 하나라도 있으면 아무것도 지우지 않고 앱도 띄우지 않는다 (I-1)", async () => {
    const { run, calls, scripts } = setup();
    const result = await run(["diary/a.json", "models/a1.bin"]);
    expect(result.ok).toBe(false);
    expect(calls).toEqual([]);
    expect(scripts).toEqual([]);
  });

  it("Xcode가 켜져 있으면 앱을 띄우기 전에 실패한다 (087)", async () => {
    const { run, calls } = setup({ xcode: true });
    const result = await run(["diary/a.json"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.detail).toContain("Xcode");
    expect(calls).toEqual([]);
  });

  it("앱을 띄워 pid로 lldb에 붙고, 파일마다 unlink를 부르고, 끝나면 앱을 끈다", async () => {
    const { run, calls, scripts } = setup();
    expect((await run(["diary/a.json", "preferences/b.json"])).ok).toBe(true);
    const kinds = calls.map((c) => c.slice(0, 3).join(" "));
    expect(kinds).toEqual([
      "device process launch",
      "device info processes",
      "device process terminate",
    ]);
    expect(calls[0]).toEqual(expect.arrayContaining(["--terminate-existing", "--start-stopped"]));
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toContain("device process attach --pid 4135");
    expect(scripts[0].match(/"unlink"/g)).toHaveLength(2);
    expect(scripts[0]).toContain('"Documents/diary/a.json"');
    expect(scripts[0]).toContain('"Documents/preferences/b.json"');
    expect(scripts[0]).toContain('"chdir"');
    expect(scripts[0]).not.toContain("models");
  });

  it("lldb가 삭제 결과를 다 돌려주지 않으면 실패한다 (조용한 실패 방지)", async () => {
    const { run } = setup({ lldbStdout: "(int) $0 = 0\n(int) $1 = 0\n" });
    const result = await run(["diary/a.json", "diary/b.json"]);
    expect(result.ok).toBe(false);
  });

  it("앱 프로세스를 못 찾으면 실패한다", async () => {
    const { run } = setup({ processes: { result: { runningProcesses: [] } } });
    const result = await run(["diary/a.json"]);
    expect(result.ok).toBe(false);
  });

  it("buildDeleteScript — UIApplicationMain까지 달린 뒤에 삭제한다 (멈춘 채로는 라이브러리가 없다)", () => {
    const lines = buildDeleteScript({
      device: UDID,
      pid: 7,
      paths: ["diary/x.json"],
      attachWaitSec: 30,
    }).split("\n");
    const breakpoint = lines.findIndex((l) => l === "breakpoint set -n UIApplicationMain");
    const run = lines.findIndex((l) => l === "process continue");
    const firstCall = lines.findIndex((l) => l.includes("dlsym"));
    expect(breakpoint).toBeGreaterThan(-1);
    expect(breakpoint).toBeLessThan(run);
    expect(run).toBeLessThan(firstCall);
  });

  it("buildDeleteScript — 붙기 → 멈춤 대기 → 삭제 식 → detach", () => {
    const script = buildDeleteScript({
      device: UDID,
      pid: 7,
      paths: ["diary/x.json"],
      attachWaitSec: 30,
    });
    const lines = script.split("\n");
    expect(lines.findIndex((l) => l.startsWith("device process attach"))).toBeLessThan(
      lines.findIndex((l) => l.includes("unlink")),
    );
    expect(lines).toContain("process kill");
    expect(lines).not.toContain("process detach");
    expect(script).toContain('dlsym((void*)-2, "getenv")');
  });
});
