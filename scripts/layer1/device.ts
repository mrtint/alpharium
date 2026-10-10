/**
 * 069 — 층 1이 기기에 닿는 유일한 자리 (`adb`·`run-as`·`maestro`).
 *
 * 나머지(`runner.ts`)는 이 모양(`Layer1Device`)만 보므로 기기 없이 테스트된다(`scripts/seed/device.ts`와 같은 구조).
 *
 * **전제**: debug 빌드(`run-as`)와 전용 테스트 기기. release 빌드는 `package not debuggable`이고, 재부팅 뒤 첫 잠금 해제 전에는 debug도
 * 실패한다(Direct Boot) — 둘 다 `probe()`가 실패 이유를 말한다.
 *
 * **여기에 `pm clear`·`install`·`uninstall`이 없다**(계약 I-1, `layer1-source-contract.test.ts`가 소스를 읽어 잠근다).
 * 모델 파일(`files/models/`)은 `listDir`로 읽기만 한다.
 *
 * 경로는 모두 앱의 `files/` 기준 상대 경로다(`preferences/onboarding.json`, `diary/2026-10-10.json` …).
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { failedFlowNames } from "./junit.ts";

export const PACKAGE = "com.a810labs.pocketlog";

export type Outcome<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; detail: string };

export interface Layer1Device {
  /** 붙어 있는 기기 시리얼들. adb를 못 찾으면 null */
  listDevices(): string[] | null;
  hasMaestro(): boolean;
  /** `run-as`로 앱 데이터에 닿는가 */
  probe(serial: string): Outcome;
  /** `files/<relative>`의 파일 이름들. 폴더가 없으면 빈 목록 */
  listDir(serial: string, relative: string): Outcome<string[]>;
  forceStop(serial: string): Outcome;
  /** 필요한 폴더(`preferences`·`diary`·`vision-cache`)가 있게 한다 */
  ensureDirs(serial: string): Outcome;
  writeFile(serial: string, relative: string, content: string): Outcome;
  copyFile(serial: string, relative: string, localPath: string): Outcome;
  removeFile(serial: string, relative: string): Outcome;
  runMaestro(flows: readonly string[]): { status: number | null; failed: string[] | null };
}

const DEVICE_TMP = "/data/local/tmp/layer1";

function adb(serial: string | null, args: string[]): Outcome<string> {
  const prefix = serial === null ? [] : ["-s", serial];
  const result = spawnSync("adb", [...prefix, ...args], { encoding: "utf8", shell: true });
  if (result.error) return { ok: false, detail: `adb를 부르지 못했다: ${result.error.message}` };
  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || "").trim();
    return { ok: false, detail: `adb ${args[0]} 실패 (${result.status}): ${message}` };
  }
  return { ok: true, value: result.stdout };
}

/** `adb shell run-as <패키지> <명령>` — 명령은 공백 없는 조각들이라 따옴표가 필요 없다 */
function runAs(serial: string, ...command: string[]): Outcome<string> {
  return adb(serial, ["shell", "run-as", PACKAGE, ...command]);
}

/** 파일 이름·폴더 이름으로 안전한 것만 셸에 싣는다 */
function safeRelative(relative: string): boolean {
  return /^[A-Za-z0-9._/-]+$/.test(relative) && !relative.includes("..");
}

/** 보고서에서 실패한 흐름 이름을 모은다. 보고서가 없거나 실패 이름을 못 찾으면 null. */
function failedFlows(path: string): string[] | null {
  if (!existsSync(path)) return null;
  const names = failedFlowNames(readFileSync(path, "utf8"));
  return names.length > 0 ? names : null;
}

export function adbDevice(): Layer1Device {
  const needPath = (relative: string): { ok: false; detail: string } | null =>
    safeRelative(relative) ? null : { ok: false, detail: `안전하지 않은 경로: ${relative}` };

  return {
    listDevices() {
      const result = spawnSync("adb", ["devices"], { encoding: "utf8", shell: true });
      if (result.error || result.status !== 0) return null;
      return result.stdout
        .split(/\r?\n/)
        .slice(1)
        .map((line) => line.trim().split(/\s+/))
        .filter((parts) => parts.length >= 2 && parts[1] === "device")
        .map((parts) => parts[0]);
    },

    hasMaestro() {
      const result = spawnSync("maestro", ["--version"], { encoding: "utf8", shell: true });
      return !result.error && result.status === 0;
    },

    probe(serial) {
      const result = runAs(serial, "ls", "files");
      return result.ok ? { ok: true, value: undefined } : { ok: false, detail: result.detail };
    },

    listDir(serial, relative) {
      const bad = needPath(relative);
      if (bad !== null) return bad;
      const result = runAs(serial, "ls", `files/${relative}`);
      // 폴더가 없으면 non-zero다 — 그것은 「비어 있음」이지 오류가 아니다
      if (!result.ok) return { ok: true, value: [] };
      return {
        ok: true,
        value: result.value
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line !== ""),
      };
    },

    forceStop(serial) {
      const result = adb(serial, ["shell", "am", "force-stop", PACKAGE]);
      return result.ok ? { ok: true, value: undefined } : result;
    },

    ensureDirs(serial) {
      const result = runAs(serial, "mkdir", "-p", "files/preferences", "files/diary", "files/vision-cache");
      return result.ok ? { ok: true, value: undefined } : { ok: false, detail: result.detail };
    },

    writeFile(serial, relative, content) {
      const bad = needPath(relative);
      if (bad !== null) return bad;
      const local = join(mkdtempSync(join(tmpdir(), "pocketlog-layer1-")), "payload");
      writeFileSync(local, content, "utf8");
      return this.copyFile(serial, relative, local);
    },

    copyFile(serial, relative, localPath) {
      const bad = needPath(relative);
      if (bad !== null) return bad;
      const name = relative.split("/").pop() ?? "payload";
      const made = adb(serial, ["shell", "mkdir", "-p", DEVICE_TMP]);
      if (!made.ok) return { ok: false, detail: made.detail };
      const pushed = adb(serial, ["push", `"${localPath}"`, `${DEVICE_TMP}/${name}`]);
      if (!pushed.ok) return { ok: false, detail: pushed.detail };
      const copied = runAs(serial, "cp", `${DEVICE_TMP}/${name}`, `files/${relative}`);
      return copied.ok ? { ok: true, value: undefined } : { ok: false, detail: copied.detail };
    },

    removeFile(serial, relative) {
      const bad = needPath(relative);
      if (bad !== null) return bad;
      const result = runAs(serial, "rm", "-f", `files/${relative}`);
      return result.ok ? { ok: true, value: undefined } : { ok: false, detail: result.detail };
    },

    runMaestro(flows) {
      // 한국어 Windows의 CP949 때문에 흐름의 한글이 뭉개진다 — UTF-8을 준다(run-device-tests.mjs와 같은 이유).
      const junit = join(mkdtempSync(join(tmpdir(), "pocketlog-maestro-")), "report.xml");
      const run = spawnSync(
        "maestro",
        ["test", "--no-reinstall-driver", "--format", "junit", "--output", junit, ...flows],
        {
          stdio: "inherit",
          shell: true,
          env: { ...process.env, JAVA_TOOL_OPTIONS: "-Dfile.encoding=UTF-8" },
        },
      );
      return { status: run.status, failed: failedFlows(junit) };
    },
  };
}
