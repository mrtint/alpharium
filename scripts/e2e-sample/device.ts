/**
 * 070 — 표본이 기기에 닿는 유일한 자리 (`adb`).
 *
 * 계약: specs/070-e2e-sample-seed/contracts/sample-seeding.md S-4·S-5, 소스 계약 K-2·K-3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `ensure.ts`는 이 모양(`SampleDevice`)만 본다 — 기기 없이 테스트된다. 어떤 함수도 던지지 않는다(`scripts/seed/device.ts`와 같은 결정).
 *
 * **지우는 명령은 `s30-` 접두 파일뿐이다.** 010 도구가 심은 사진·소유자의 진짜 사진·`PocketlogSeed/` 폴더 자체를 지우지 않는다(`rm -rf` 없음).
 * 010의 `SEED_FOLDER`·`scanVolume`·`queryFolder`를 재사용한다 — 경로·질의를 복제하지 않는다. 010의 ledger는 쓰지 않는다
 * (개발 기계에는 기록을 두지 않는다, clarify Q1).
 *
 * **셸 연산자를 명령에 넣지 않는다**: `spawnSync`가 `shell: true`라 개발 기계의 셸이 `2>/dev/null`·`||` 같은 것을 삼킨다(010 실측).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SEED_FOLDER, queryFolder, scanVolume } from "../seed/device.ts";
import { MARKER_NAME, type MediaRow, type Outcome, type SampleDevice } from "./ensure.ts";

function adb(args: string[]): Outcome<string> {
  const result = spawnSync("adb", args, { encoding: "utf8", shell: true });
  if (result.error) return { ok: false, detail: `adb를 부르지 못했다: ${result.error.message}` };
  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || "").trim();
    return { ok: false, detail: `adb ${args[0]} 실패 (${result.status}): ${message}` };
  }
  return { ok: true, value: result.stdout };
}

const MARKER_PATH = `${SEED_FOLDER}/${MARKER_NAME}`;

export function adbSampleDevice(): SampleDevice {
  return {
    pushDir(localDir) {
      // `<폴더>/.`는 폴더의 내용을 목적지에 그대로 푼다 — 하위 폴더 구조(Camera·Screenshots·Download)가 유지된다
      const made = adb(["shell", `mkdir -p ${SEED_FOLDER}`]);
      if (!made.ok) return made;
      const pushed = adb(["push", `"${localDir}/."`, `${SEED_FOLDER}/`]);
      return pushed.ok ? { ok: true, value: undefined } : pushed;
    },

    removeSampleFiles() {
      // `s30-` 접두 파일만. 폴더·010 사진·진짜 사진은 건드리지 않는다
      const removed = adb(["shell", `"find ${SEED_FOLDER} -type f -name 's30-*' -delete"`]);
      if (removed.ok) return { ok: true, value: undefined };
      // 폴더가 없으면 find가 non-zero다 — 지울 것이 없는 것이지 오류가 아니다. 그 밖의 실패(기기 없음 등)는 값으로 돌려준다
      return /No such file|not found/i.test(removed.detail) ? { ok: true, value: undefined } : removed;
    },

    scanVolume() {
      return scanVolume();
    },

    queryRows() {
      const queried = queryFolder();
      if (!queried.ok) return queried;
      // 010 사진·진짜 사진을 거른다 — 표본 접두만
      const rows: MediaRow[] = queried.value.filter((r) => (r.path.split("/").pop() ?? "").startsWith("s30-"));
      return { ok: true, value: rows };
    },

    readMarker() {
      const read = adb(["shell", `cat ${MARKER_PATH}`]);
      // 없으면 non-zero다 — 「표식 없음」이다
      return read.ok ? { ok: true, value: read.value.replace(/\r/g, "") } : { ok: true, value: null };
    },

    writeMarker(text) {
      const local = join(mkdtempSync(join(tmpdir(), "pocketlog-marker-")), MARKER_NAME);
      writeFileSync(local, text, "utf8");
      const pushed = adb(["push", `"${local}"`, MARKER_PATH]);
      return pushed.ok ? { ok: true, value: undefined } : pushed;
    },
  };
}
