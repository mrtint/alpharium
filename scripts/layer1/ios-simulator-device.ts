/**
 * 097 — iOS 시뮬레이터가 층 1에 닿는 유일한 자리 (`xcrun simctl`·`maestro`·호스트 파일).
 *
 * 계약: specs/097-ios-e2e-suite/contracts/ios-layer1-runner.md (L1·L2, I-1)
 *
 * 안드로이드 `adbDevice()`(device.ts)의 iOS 짝이다. 시뮬레이터의 앱 컨테이너는 호스트 파일 시스템에 있으므로
 * `get_app_container … data`가 준 경로의 `Documents/`를 직접 읽고 쓴다. **컨테이너 위치는 호출마다 다시 찾는다** — 재설치마다 바뀐다(066).
 *
 * **여기에 앱 삭제·재설치·시뮬레이터 초기화가 없다**(I-1, `ios-layer1-source-contract.test.ts`가 소스를 읽어 잠근다).
 * 모델 파일(`Documents/models/`)은 `listDir`로 읽기만 한다. 사진 보관함 초기화는 이 파일의 일이 아니다(`scripts/e2e-sample/ios-device.ts`).
 *
 * `xcrun`·`maestro`는 `deps`로 주입받아 기기 없이 테스트된다. 경로는 모두 앱 데이터 루트(`Documents/`) 기준 상대 경로다.
 */

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { PACKAGE, type DeviceLabels, type Layer1Device, type Outcome } from "./device.ts";
import { failedFlowNames } from "./junit.ts";

export type ExecResult = { status: number | null; stdout: string; stderr: string; error?: Error };
export type Exec = (cmd: string, args: string[]) => ExecResult;
/** Maestro 한 번 실행 — 종료 코드와 JUnit 보고서 본문(없으면 null) */
export type MaestroRunner = (args: string[]) => { status: number | null; junit: string | null };

export const IOS_LABELS: DeviceLabels = {
  toolMissing: "xcrun simctl을 찾지 못했다",
  noDevice: "부팅된 iOS 시뮬레이터가 없다",
  probeHint: "앱(개발 클라이언트)이 시뮬레이터에 설치돼 있지 않을 수 있다",
};

const realExec: Exec = (cmd, args) => {
  const result = spawnSync(cmd, args, { encoding: "utf8" });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ?? undefined,
  };
};

const realMaestro: MaestroRunner = (args) => {
  const junit = join(mkdtempSync(join(tmpdir(), "pocketlog-maestro-")), "report.xml");
  const run = spawnSync("maestro", insertJunit(args, junit), {
    stdio: "inherit",
    env: {
      ...process.env,
      // iOS 드라이버 콜드 기동이 느리다(AGENTS 068)
      MAESTRO_DRIVER_STARTUP_TIMEOUT: process.env.MAESTRO_DRIVER_STARTUP_TIMEOUT ?? "180000",
      JAVA_TOOL_OPTIONS: "-Dfile.encoding=UTF-8",
    },
  });
  return { status: run.status, junit: existsSync(junit) ? readFileSync(junit, "utf8") : null };
};

/** `--device <udid> test`와 흐름 사이에 보고서 옵션을 끼운다 */
function insertJunit(args: string[], junit: string): string[] {
  const testIndex = args.indexOf("test");
  return [...args.slice(0, testIndex + 1), "--format", "junit", "--output", junit, ...args.slice(testIndex + 1)];
}

type Deps = { exec?: Exec; maestro?: MaestroRunner };

/** 파일 이름·폴더 이름으로 안전한 것만 받는다 (안드로이드 `safeRelative`와 같은 규칙) */
function safeRelative(relative: string): boolean {
  return /^[A-Za-z0-9._/-]+$/.test(relative) && !relative.startsWith("/") && !relative.includes("..");
}

const unsafe = (relative: string): { ok: false; detail: string } => ({
  ok: false,
  detail: `안전하지 않은 경로: ${relative}`,
});

const done: Outcome = { ok: true, value: undefined };

export function iosSimulatorDevice(deps: Deps = {}): Layer1Device {
  const exec = deps.exec ?? realExec;
  const runMaestroProcess = deps.maestro ?? realMaestro;

  /** 부팅된 iOS 시뮬레이터 UDID들. xcrun을 못 부르면 null */
  const bootedUdids = (): string[] | null => {
    const listed = exec("xcrun", ["simctl", "list", "devices", "booted", "--json"]);
    if (listed.error || listed.status !== 0) return null;
    try {
      const parsed = JSON.parse(listed.stdout) as {
        devices?: Record<string, { udid: string; state?: string }[]>;
      };
      return Object.entries(parsed.devices ?? {})
        .filter(([runtime]) => /SimRuntime\.iOS-/.test(runtime))
        .flatMap(([, devices]) => devices.filter((d) => d.state === undefined || d.state === "Booted"))
        .map((d) => d.udid);
    } catch {
      return null;
    }
  };

  /** 이 호출 시점의 앱 데이터 루트(`<컨테이너>/Documents`). 저장하지 않는다 */
  const documents = (udid: string): Outcome<string> => {
    const found = exec("xcrun", ["simctl", "get_app_container", udid, PACKAGE, "data"]);
    if (found.error) return { ok: false, detail: `xcrun을 부르지 못했다: ${found.error.message}` };
    if (found.status !== 0) {
      return {
        ok: false,
        detail: `앱 컨테이너를 찾지 못했다 (${found.status}): ${(found.stderr || found.stdout).trim()}`,
      };
    }
    const container = found.stdout.trim();
    if (container === "") return { ok: false, detail: "앱 컨테이너 경로가 비어 있다" };
    return { ok: true, value: join(container, "Documents") };
  };

  const at = (udid: string, relative: string): Outcome<string> => {
    if (!safeRelative(relative)) return unsafe(relative);
    const root = documents(udid);
    return root.ok ? { ok: true, value: join(root.value, relative) } : root;
  };

  const guarded = (label: string, action: () => void): Outcome => {
    try {
      action();
      return done;
    } catch (error) {
      return { ok: false, detail: `${label}: ${String(error)}` };
    }
  };

  return {
    labels: IOS_LABELS,

    listDevices() {
      return bootedUdids();
    },

    hasMaestro() {
      const result = exec("maestro", ["--version"]);
      return !result.error && result.status === 0;
    },

    probe(udid) {
      const root = documents(udid);
      if (!root.ok) return root;
      return existsSync(root.value) ? done : { ok: false, detail: `Documents가 없다: ${root.value}` };
    },

    listDir(udid, relative) {
      const target = at(udid, relative);
      if (!target.ok) return target;
      // 폴더가 없으면 「비어 있음」이지 오류가 아니다
      if (!existsSync(target.value)) return { ok: true, value: [] };
      try {
        return { ok: true, value: readdirSync(target.value) };
      } catch (error) {
        return { ok: false, detail: `${relative}를 읽지 못했다: ${String(error)}` };
      }
    },

    forceStop(udid) {
      const result = exec("xcrun", ["simctl", "terminate", udid, PACKAGE]);
      if (result.error) return { ok: false, detail: `xcrun을 부르지 못했다: ${result.error.message}` };
      // 실행 중이 아니면 non-zero다 — 이미 꺼져 있는 것이지 오류가 아니다
      return done;
    },

    ensureDirs(udid) {
      const root = documents(udid);
      if (!root.ok) return root;
      return guarded("폴더 준비", () => {
        for (const dir of ["preferences", "diary", "vision-cache"]) mkdirSync(join(root.value, dir), { recursive: true });
      });
    },

    writeFile(udid, relative, content) {
      const target = at(udid, relative);
      if (!target.ok) return target;
      return guarded(`${relative} 쓰기`, () => {
        mkdirSync(dirname(target.value), { recursive: true });
        writeFileSync(target.value, content, "utf8");
      });
    },

    copyFile(udid, relative, localPath) {
      const target = at(udid, relative);
      if (!target.ok) return target;
      return guarded(`${relative} 복사`, () => {
        mkdirSync(dirname(target.value), { recursive: true });
        copyFileSync(localPath, target.value);
      });
    },

    removeFile(udid, relative) {
      const target = at(udid, relative);
      if (!target.ok) return target;
      return guarded(`${relative} 삭제`, () => rmSync(target.value, { force: true }));
    },

    runMaestro(flows, env) {
      const envArgs: string[] = [];
      for (const [key, value] of Object.entries(env ?? {})) {
        // 안드로이드와 같은 규칙: 공백·따옴표가 든 값은 보내지 않는다(070 contracts/sample-days-flow.md FL-3)
        if (!/^[A-Z][A-Z0-9_]*$/.test(key) || !/^[A-Za-z0-9_-]+$/.test(value)) {
          console.error(`maestro -e 값이 안전하지 않다: ${key}`);
          return { status: 2, failed: null };
        }
        envArgs.push("-e", `${key}=${value}`);
      }
      const booted = bootedUdids();
      if (booted === null || booted.length !== 1) {
        console.error(`부팅된 iOS 시뮬레이터가 하나여야 한다 (${booted?.length ?? "xcrun 실패"})`);
        return { status: 2, failed: null };
      }
      const run = runMaestroProcess(["--device", booted[0], "test", "--no-reinstall-driver", ...envArgs, ...flows]);
      const failed = run.junit === null ? [] : failedFlowNames(run.junit);
      return { status: run.status, failed: failed.length > 0 ? failed : null };
    },
  };
}
