/**
 * 095 — iOS 시뮬레이터에서 표본이 기기에 닿는 유일한 자리 (`xcrun simctl`·`sqlite3`·시뮬레이터 데이터 폴더).
 *
 * 계약: specs/095-ios-e2e-suite/contracts/ios-layer1-runner.md (S), research R4
 *
 * 안드로이드 `adbSampleDevice()`(device.ts)의 iOS 짝이다. `ensure.ts`는 `SampleDevice` 모양만 보므로 기기 없이 테스트된다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * - 심기: `simctl addmedia`. 보관함은 파일 이름을 `IMG_nnnn`으로 바꾸고 원래 이름을 `ZORIGINALFILENAME`에 남긴다 — 되읽기는 그 이름으로 한다.
 *   EXIF의 촬영 시각·GPS를 존중하며 몇 초 안에 DB에 반영된다(실측).
 * - 되읽기: 시뮬레이터의 `Photos.sqlite`를 `sqlite3 -readonly`로 읽는다. 촬영 시각은 Core Data 시간(유닉스 + 978307200초 이전)이다.
 * - **지우기 = 사진 보관함 초기화**: 보관함에는 단건 삭제 통로가 없고 표본은 기준일(오늘) 상대라 날이 바뀌면 낡는다. 시뮬레이터를 끄고
 *   `Media/PhotoData`·`Media/DCIM` 두 폴더만 지운 뒤 다시 켜면 보관함이 빈 채로 다시 만들어진다(실측). **앱 컨테이너·모델은 건드리지 않는다.**
 *   전용 시뮬레이터 전제다 — 그 시뮬레이터의 사진은 모두 사라진다.
 * - 표식은 시뮬레이터 `Media/` 안에 둔다(개발 기계에는 기록을 두지 않는다, 070 clarify Q1).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { PACKAGE } from "../layer1/device.ts";
import type { Exec } from "../layer1/ios-simulator-device.ts";
import { MARKER_NAME, type MediaRow, type Outcome, type SampleDevice } from "./ensure.ts";

const realExec: Exec = (cmd, args) => {
  const result = spawnSync(cmd, args, { encoding: "utf8" });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ?? undefined,
  };
};

const DEFAULT_DEVICES_ROOT = join(homedir(), "Library", "Developer", "CoreSimulator", "Devices");
/** 한 번에 넘기는 파일 수 — 인자 길이 한도를 피한다 */
const ADD_BATCH = 20;
/** Core Data 시간 → 유닉스 시간 (초) */
const CORE_DATA_EPOCH = 978307200;

type Deps = { exec?: Exec; devicesRoot?: string; env?: Readonly<Record<string, string | undefined>> };

/** 보관함 초기화를 허락하는 환경변수 — 전용 시뮬레이터를 처음 쓸 때 한 번 준다 */
export const RESET_OPT_IN = "POCKETLOG_E2E_RESET_SIM_PHOTOS";

const done: Outcome<void> = { ok: true, value: undefined };

function failure(step: string, result: { status: number | null; stdout: string; stderr: string; error?: Error }): Outcome<never> {
  if (result.error) return { ok: false, detail: `${step}: ${result.error.message}` };
  return { ok: false, detail: `${step} 실패 (${result.status}): ${(result.stderr || result.stdout).trim()}` };
}

/** 부팅된 iOS 시뮬레이터가 정확히 하나일 때 그 UDID */
function onlyBootedUdid(exec: Exec): Outcome<string> {
  const listed = exec("xcrun", ["simctl", "list", "devices", "booted", "--json"]);
  if (listed.error || listed.status !== 0) return failure("simctl list", listed);
  let udids: string[] = [];
  try {
    const parsed = JSON.parse(listed.stdout) as { devices?: Record<string, { udid: string }[]> };
    udids = Object.entries(parsed.devices ?? {})
      .filter(([runtime]) => /SimRuntime\.iOS-/.test(runtime))
      .flatMap(([, devices]) => devices.map((d) => d.udid));
  } catch {
    return { ok: false, detail: "simctl list 출력을 읽지 못했다" };
  }
  if (udids.length !== 1) {
    return { ok: false, detail: `부팅된 iOS 시뮬레이터가 하나여야 한다 (${udids.length}개)` };
  }
  return { ok: true, value: udids[0] };
}

/** 폴더 안의 모든 파일(하위 폴더 포함) */
function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

export function iosSampleDevice(deps: Deps = {}): SampleDevice {
  const exec = deps.exec ?? realExec;
  const env = deps.env ?? process.env;
  const devicesRoot = deps.devicesRoot ?? DEFAULT_DEVICES_ROOT;
  const mediaDir = (udid: string) => join(devicesRoot, udid, "data", "Media");
  const libraryDb = (udid: string) => join(mediaDir(udid), "PhotoData", "Photos.sqlite");

  return {
    pushDir(localDir) {
      const udid = onlyBootedUdid(exec);
      if (!udid.ok) return udid;
      const files = listFiles(localDir);
      for (let i = 0; i < files.length; i += ADD_BATCH) {
        const added = exec("xcrun", ["simctl", "addmedia", udid.value, ...files.slice(i, i + ADD_BATCH)]);
        if (added.error || added.status !== 0) return failure("simctl addmedia", added);
      }
      return done;
    },

    removeSampleFiles() {
      const udid = onlyBootedUdid(exec);
      if (!udid.ok) return udid;
      // 이 시뮬레이터의 사진이 모두 사라진다 — 이 도구가 전에 심은 적이 있거나(표식) 소유자가 환경변수로 허락했을 때만 한다
      if (!existsSync(join(mediaDir(udid.value), MARKER_NAME)) && env[RESET_OPT_IN] !== "1") {
        return {
          ok: false,
          detail: `이 시뮬레이터(${udid.value})의 사진 보관함을 초기화해야 표본을 심을 수 있다 — 사진이 모두 사라진다. 전용 시뮬레이터라면 ${RESET_OPT_IN}=1을 주고 다시 부른다`,
        };
      }
      const down = exec("xcrun", ["simctl", "shutdown", udid.value]);
      if (down.error) return failure("simctl shutdown", down);
      try {
        // 보관함 두 폴더만 — Containers(앱 데이터·모델)는 건드리지 않는다
        rmSync(join(mediaDir(udid.value), "PhotoData"), { recursive: true, force: true });
        rmSync(join(mediaDir(udid.value), "DCIM"), { recursive: true, force: true });
      } catch (error) {
        return { ok: false, detail: `보관함 폴더를 지우지 못했다: ${String(error)}` };
      }
      const up = exec("xcrun", ["simctl", "boot", udid.value]);
      if (up.error || up.status !== 0) return failure("simctl boot", up);
      const ready = exec("xcrun", ["simctl", "bootstatus", udid.value, "-b"]);
      if (ready.error || ready.status !== 0) return failure("simctl bootstatus", ready);
      return done;
    },

    scanVolume() {
      // 보관함이 바로 반영한다 — 할 일이 없다
      return done;
    },

    queryRows() {
      const udid = onlyBootedUdid(exec);
      if (!udid.ok) return udid;
      const sql =
        `select aa.ZORIGINALFILENAME, cast((a.ZDATECREATED + ${CORE_DATA_EPOCH}) * 1000 as integer) ` +
        "from ZASSET a join ZADDITIONALASSETATTRIBUTES aa on aa.ZASSET = a.Z_PK " +
        "where aa.ZORIGINALFILENAME like 's30-%' and a.ZTRASHEDSTATE = 0;";
      const queried = exec("sqlite3", ["-readonly", "-separator", "|", libraryDb(udid.value), sql]);
      if (queried.error || queried.status !== 0) return failure("sqlite3 조회", queried);
      const rows: MediaRow[] = queried.stdout
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "")
        .map((line) => {
          const [name, ms] = line.split("|");
          const taken = ms === undefined || ms.trim() === "" ? null : Number(ms);
          return { path: name, datetakenMs: taken !== null && Number.isFinite(taken) ? taken : null };
        });
      return { ok: true, value: rows };
    },

    readMarker() {
      const udid = onlyBootedUdid(exec);
      if (!udid.ok) return udid;
      const path = join(mediaDir(udid.value), MARKER_NAME);
      // 없으면 「표식 없음」이다
      return { ok: true, value: existsSync(path) ? readFileSync(path, "utf8") : null };
    },

    writeMarker(text) {
      const udid = onlyBootedUdid(exec);
      if (!udid.ok) return udid;
      try {
        writeFileSync(join(mediaDir(udid.value), MARKER_NAME), text, "utf8");
        return done;
      } catch (error) {
        return { ok: false, detail: `표식을 쓰지 못했다: ${String(error)}` };
      }
    },
  };
}

/** 앱에 사진·위치 권한을 준다 — 표본 보장 앞에서 한 번 부른다 */
export function grantSimulatorPermissions(exec: Exec = realExec): Outcome<void> {
  const udid = onlyBootedUdid(exec);
  if (!udid.ok) return udid;
  for (const service of ["photos", "location"]) {
    const granted = exec("xcrun", ["simctl", "privacy", udid.value, "grant", service, PACKAGE]);
    if (granted.error || granted.status !== 0) return failure(`simctl privacy grant ${service}`, granted);
  }
  return done;
}
