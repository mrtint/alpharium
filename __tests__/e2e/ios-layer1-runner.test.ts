import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { iosSimulatorDevice, type Exec } from "../../scripts/layer1/ios-simulator-device";
import { runLayer1 } from "../../scripts/layer1/runner";

/**
 * 095 — iOS 층 1: 실제 `iosSimulatorDevice`(임시 컨테이너)를 `runLayer1`에 꽂아 단계와 보고를 본다.
 *
 * 계약: specs/095-ios-e2e-suite/contracts/ios-layer1-runner.md (L1~L7, I-1)
 */

const UDID = "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE";
const NOW = new Date(2026, 9, 22, 10, 0);
const FLOWS = [".maestro/restart-persistence.yml"];

function booted(udids: string[]): string {
  return JSON.stringify({
    devices: {
      "com.apple.CoreSimulator.SimRuntime.iOS-27-0": udids.map((udid) => ({
        udid,
        state: "Booted",
      })),
    },
  });
}

function setup(
  options: { udids?: string[]; app?: boolean; models?: string[]; maestroStatus?: number } = {},
) {
  const container = mkdtempSync(join(tmpdir(), "pocketlog-ios-l1-"));
  const docs = join(container, "Documents");
  mkdirSync(join(docs, "models"), { recursive: true });
  for (const m of options.models ?? ["a1.bin", "v1.bin", "v2.bin"])
    writeFileSync(join(docs, "models", m), "m");
  const maestroCalls: string[][] = [];
  const exec: Exec = (cmd, args) => {
    if (cmd === "maestro") return { status: 0, stdout: "2.11.0", stderr: "" };
    if (args[1] === "list")
      return { status: 0, stdout: booted(options.udids ?? [UDID]), stderr: "" };
    if (args[1] === "get_app_container") {
      return options.app === false
        ? { status: 2, stdout: "", stderr: "not installed" }
        : { status: 0, stdout: container, stderr: "" };
    }
    return { status: 0, stdout: "", stderr: "" };
  };
  const device = iosSimulatorDevice({
    exec,
    maestro: (args) => {
      maestroCalls.push(args);
      return { status: options.maestroStatus ?? 0, junit: null };
    },
  });
  const lines: string[] = [];
  const result = runLayer1({ device, flows: FLOWS, now: NOW, log: (l) => lines.push(l) });
  return { result, lines, docs, maestroCalls };
}

describe("iOS 층 1 실행기 (095)", () => {
  it("시뮬레이터가 없으면 skipped이고 iOS 문구로 이유를 말한다", () => {
    const { result } = setup({ udids: [] });
    expect(result.status).toBe("skipped");
    expect(result.reason).toContain("시뮬레이터");
  });

  it("앱이 설치돼 있지 않으면 aborted이고 iOS 짐작을 말한다 (release/잠금 해제 문구 아님)", () => {
    const { result } = setup({ app: false });
    expect(result.status).toBe("aborted");
    expect(result.reason).toContain("개발 클라이언트");
    expect(result.reason).not.toContain("release");
  });

  it("모델이 없으면 aborted이고 일기 폴더를 만들지 않는다", () => {
    const { result, docs } = setup({ models: ["a1.bin"] });
    expect(result.status).toBe("aborted");
    expect(result.reason).toContain("모델이 없다");
    expect(existsSync(join(docs, "diary"))).toBe(false);
  });

  it("정상이면 기준 상태를 만들고 Maestro를 --device로 한 번 부른다 (passed)", () => {
    const { result, maestroCalls, docs } = setup();
    expect(result.status).toBe("passed");
    expect(maestroCalls).toHaveLength(1);
    expect(maestroCalls[0].slice(0, 3)).toEqual(["--device", UDID, "test"]);
    expect(readdirSync(join(docs, "preferences"))).toContain("onboarding.json");
  });

  it("SC-003 — 실행 뒤 일기 폴더에는 픽스처(.json)뿐이고 .writing 같은 쓰기 흔적이 없다", () => {
    const { docs } = setup();
    const names = readdirSync(join(docs, "diary"));
    expect(names).toHaveLength(3);
    expect(names.every((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n))).toBe(true);
  });

  it("흐름이 실패하면 failed이고 이유가 있다", () => {
    const { result } = setup({ maestroStatus: 1 });
    expect(result.status).toBe("failed");
    expect(result.reason).toContain("알 수 없음");
  });
});
