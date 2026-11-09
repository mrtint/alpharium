/**
 * 111 — 오늘 찍은 표본 사진 한 장을 기기 보관함에 심고 지운다 (층 2 「첫 일기 분기, 재료 있음」).
 *
 * 30일치 표본은 1~30일 전뿐이라 전용 기기의 오늘에는 재료가 없다. 표본 표(`planSample`)에 넣으면 대표 날 계약이 바뀌므로 표 밖의 한 장으로 둔다.
 * `s30-` 접두라 흐름이 중간에 죽어 남아도 다음 표본 보장이 치운다. `seed:day`의 1×1 템플릿은 VLM이 자주 실패해 쓰지 않는다(AGENTS).
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Outcome } from "../layer1/device.ts";
import type { TodayPhotoPort } from "../layer2/runner.ts";
import { SEED_FOLDER, scanVolume } from "../seed/device.ts";
import { loadCatalog } from "./catalog.ts";
import { writeExif } from "./exif-write.ts";
import { realSampleFs } from "./fs-port.ts";
import { planSample } from "./plan.ts";

export const TODAY_PHOTO_NAME = "s30-today.jpg";

function adb(args: string[]): Outcome {
  const result = spawnSync("adb", args, { encoding: "utf8", shell: true });
  if (result.error) return { ok: false, detail: `adb를 부르지 못했다: ${result.error.message}` };
  if (result.status !== 0) {
    return { ok: false, detail: (result.stderr || result.stdout || "").trim() };
  }
  return { ok: true, value: undefined };
}

function scanned(): Outcome {
  const scan = scanVolume();
  return scan.ok ? { ok: true, value: undefined } : scan;
}

export function adbTodayPhoto(): TodayPhotoPort {
  const devicePath = `${SEED_FOLDER}/${TODAY_PHOTO_NAME}`;
  return {
    seed(now) {
      const catalog = loadCatalog();
      if (!catalog.ok) return { ok: false, detail: "표본 목록을 읽지 못했다" };
      const fs = realSampleFs();
      // 잡사진이 아닌 한 장 — 시간 분포 선별(023)이 빼지 않게 Camera 폴더의 것을 쓴다
      const item = planSample(catalog.photos, now).find((i) => i.folder === "Camera");
      const bytes = item === undefined ? null : fs.readCached(item.catalogFile);
      if (item === undefined || bytes === null) {
        return { ok: false, detail: "캐시에 사진이 없다 — 먼저 npm run sample:fetch" };
      }
      const local = join(mkdtempSync(join(tmpdir(), "pocketlog-today-")), TODAY_PHOTO_NAME);
      writeFileSync(local, writeExif(bytes, { takenAt: now, coordinate: item.coordinate }));
      const pushed = adb(["push", `"${local}"`, devicePath]);
      if (!pushed.ok) return pushed;
      const scan = scanned();
      if (!scan.ok) adb(["shell", `rm -f ${devicePath}`]);
      return scan;
    },
    remove() {
      const removed = adb(["shell", `rm -f ${devicePath}`]);
      if (!removed.ok) return removed;
      return scanned();
    },
  };
}
