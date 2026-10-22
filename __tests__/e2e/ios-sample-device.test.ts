import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Exec } from "../../scripts/layer1/ios-simulator-device";
import {
  grantSimulatorPermissions,
  iosSampleDevice,
  RESET_OPT_IN,
} from "../../scripts/e2e-sample/ios-device";

/**
 * 097 — iOS 시뮬레이터 표본 장치 (`SampleDevice` 구현). `xcrun`·`sqlite3`는 대역이고 시뮬레이터 데이터 폴더는 임시 폴더다.
 *
 * 계약: specs/097-ios-e2e-suite/contracts/ios-layer1-runner.md (S), research R4 (보관함 초기화로 지운다)
 */

const UDID = "11111111-2222-3333-4444-555555555555";
const bootedJson = JSON.stringify({
  devices: { "com.apple.CoreSimulator.SimRuntime.iOS-27-0": [{ udid: UDID, state: "Booted" }] },
});

function setup(
  options: { sqliteOut?: string; withMarker?: boolean; env?: Record<string, string> } = {},
) {
  const sqliteOut = options.sqliteOut ?? "";
  const root = mkdtempSync(join(tmpdir(), "pocketlog-devices-"));
  const media = join(root, UDID, "data", "Media");
  for (const dir of ["PhotoData", "DCIM"]) {
    mkdirSync(join(media, dir), { recursive: true });
    writeFileSync(join(media, dir, "keep.txt"), "x");
  }
  mkdirSync(join(root, UDID, "data", "Containers"), { recursive: true });
  writeFileSync(join(root, UDID, "data", "Containers", "app.txt"), "app");
  const calls: { cmd: string; args: string[] }[] = [];
  const exec: Exec = (cmd, args) => {
    calls.push({ cmd, args });
    if (cmd === "xcrun" && args[1] === "list") return { status: 0, stdout: bootedJson, stderr: "" };
    if (cmd === "sqlite3") return { status: 0, stdout: sqliteOut, stderr: "" };
    return { status: 0, stdout: "", stderr: "" };
  };
  if (options.withMarker) writeFileSync(join(media, "s30-marker.txt"), "anchor=2026-10-21\n");
  const device = iosSampleDevice({ exec, devicesRoot: root, env: options.env ?? {} });
  return { device, calls, media, root };
}

describe("iOS 표본 장치 (097)", () => {
  it("pushDir — 폴더 안의 사진 파일 전부를 simctl addmedia로 심는다 (하위 폴더 포함)", () => {
    const { device, calls } = setup();
    const dir = mkdtempSync(join(tmpdir(), "pocketlog-push-"));
    mkdirSync(join(dir, "Camera"));
    mkdirSync(join(dir, "Screenshots"));
    writeFileSync(join(dir, "Camera", "s30-a.jpg"), "a");
    writeFileSync(join(dir, "Screenshots", "s30-b.jpg"), "b");
    expect(device.pushDir(dir).ok).toBe(true);
    const add = calls.filter((c) => c.args[1] === "addmedia");
    const files = add.flatMap((c) => c.args.slice(3));
    expect(add[0].args.slice(0, 3)).toEqual(["simctl", "addmedia", UDID]);
    expect(files.map((f) => f.split("/").pop()).sort()).toEqual(["s30-a.jpg", "s30-b.jpg"]);
  });

  it("scanVolume — 할 일이 없다 (보관함이 바로 반영한다)", () => {
    expect(setup().device.scanVolume().ok).toBe(true);
  });

  it("queryRows — 원래 이름이 s30-로 시작하는 행의 촬영 시각(ms)을 준다", () => {
    const { device, calls } = setup({ sqliteOut: "s30-a.jpg|1765685807553\ns30-b.jpg|\n" });
    const rows = device.queryRows();
    expect(rows).toEqual({
      ok: true,
      value: [
        { path: "s30-a.jpg", datetakenMs: 1765685807553 },
        { path: "s30-b.jpg", datetakenMs: null },
      ],
    });
    const sql = calls.find((c) => c.cmd === "sqlite3")!.args.join(" ");
    expect(sql).toContain("-readonly");
    expect(sql).toContain("ZORIGINALFILENAME");
    expect(sql).toContain("s30-%");
    expect(sql).toContain("ZTRASHEDSTATE");
  });

  it("queryRows — sqlite3를 못 부르면 실패다 (색인 확인 불가)", () => {
    const device = iosSampleDevice({
      exec: (cmd, args) =>
        cmd === "xcrun"
          ? { status: 0, stdout: bootedJson, stderr: "" }
          : { status: 1, stdout: "", stderr: "unable to open" },
      devicesRoot: mkdtempSync(join(tmpdir(), "pocketlog-devices-")),
    });
    expect(device.queryRows().ok).toBe(false);
  });

  it("removeSampleFiles — 사진 보관함만 초기화한다: shutdown → PhotoData·DCIM 삭제 → boot (앱 데이터는 그대로)", () => {
    const { device, calls, media, root } = setup({ withMarker: true });
    expect(device.removeSampleFiles().ok).toBe(true);
    const order = calls
      .filter((c) => c.cmd === "xcrun" && c.args[0] === "simctl")
      .map((c) => c.args[1]);
    expect(order.indexOf("shutdown")).toBeGreaterThan(-1);
    expect(order.indexOf("boot")).toBeGreaterThan(order.indexOf("shutdown"));
    expect(order).toContain("bootstatus");
    expect(existsSync(join(media, "PhotoData"))).toBe(false);
    expect(existsSync(join(media, "DCIM"))).toBe(false);
    expect(existsSync(join(root, UDID, "data", "Containers", "app.txt"))).toBe(true);
    expect(calls.some((c) => c.args.includes("erase"))).toBe(false);
  });

  it("리뷰 6 — 표식도 허락(환경변수)도 없으면 보관함을 초기화하지 않고 이유와 방법을 말한다", () => {
    const { device, calls, media } = setup();
    const result = device.removeSampleFiles();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.detail).toContain(RESET_OPT_IN);
      expect(result.detail).toContain("사진이 모두 사라진다");
    }
    expect(calls.some((c) => c.args[1] === "shutdown")).toBe(false);
    expect(existsSync(join(media, "PhotoData"))).toBe(true);
  });

  it("리뷰 6 — 환경변수로 허락하면 표식이 없어도 초기화한다", () => {
    const { device, media } = setup({ env: { [RESET_OPT_IN]: "1" } });
    expect(device.removeSampleFiles().ok).toBe(true);
    expect(existsSync(join(media, "PhotoData"))).toBe(false);
  });

  it("removeSampleFiles — 시뮬레이터가 하나가 아니면 아무것도 지우지 않는다", () => {
    const root = mkdtempSync(join(tmpdir(), "pocketlog-devices-"));
    const calls: string[][] = [];
    const device = iosSampleDevice({
      exec: (_c, args) => {
        calls.push(args);
        return { status: 0, stdout: JSON.stringify({ devices: {} }), stderr: "" };
      },
      devicesRoot: root,
    });
    expect(device.removeSampleFiles().ok).toBe(false);
    expect(calls.some((a) => a[1] === "shutdown")).toBe(false);
  });

  it("표식 — 시뮬레이터 Media 폴더 안에 읽고 쓴다 (없으면 null)", () => {
    const { device, media } = setup();
    expect(device.readMarker()).toEqual({ ok: true, value: null });
    expect(device.writeMarker("anchor=2026-10-22\n").ok).toBe(true);
    expect(existsSync(join(media, "s30-marker.txt"))).toBe(true);
    expect(device.readMarker()).toEqual({ ok: true, value: "anchor=2026-10-22\n" });
  });

  it("grantSimulatorPermissions — 사진·위치 권한을 앱에 준다", () => {
    const seen: string[][] = [];
    const result = grantSimulatorPermissions((cmd, args) => {
      seen.push(args);
      return cmd === "xcrun" && args[1] === "list"
        ? { status: 0, stdout: bootedJson, stderr: "" }
        : { status: 0, stdout: "", stderr: "" };
    });
    expect(result.ok).toBe(true);
    const grants = seen.filter((a) => a[1] === "privacy");
    expect(grants.map((a) => a[4])).toEqual(["photos", "location"]);
    expect(
      grants.every((a) => a[2] === UDID && a[3] === "grant" && a[5] === "com.a810labs.pocketlog"),
    ).toBe(true);
  });
});
