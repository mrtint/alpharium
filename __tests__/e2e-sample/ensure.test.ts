import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { CatalogPhoto } from "../../scripts/e2e-sample/catalog";
import {
  MARKER_NAME,
  ensureSample,
  parseMarker,
  type MediaRow,
  type Outcome,
  type SampleDevice,
  type SampleFs,
} from "../../scripts/e2e-sample/ensure";
import { PHOTO_TAGS } from "../../scripts/e2e-sample/manifest";
import { fingerprint, planSample } from "../../scripts/e2e-sample/plan";
import { readDate } from "../../scripts/seed/exif";

/**
 * 070 — 표본 보장 (contracts/sample-seeding.md S-1~S-6, G-1~G-5).
 *
 * 기기는 메모리 안의 대역이다. 대역의 「스캐너」는 사진에 쓰인 EXIF를 `readDate`로 읽어 `datetaken`을 정한다 — 쓰인 EXIF가 실제로 소비되는지도 본다.
 */

const TEMPLATE = readFileSync(join(process.cwd(), "scripts", "seed-template.jpg"));
const SEED = "/sdcard/Pictures/PocketlogSeed";
const NOW = new Date(2026, 9, 10, 14, 0, 0);

function catalog(): CatalogPhoto[] {
  const list: CatalogPhoto[] = [];
  PHOTO_TAGS.forEach((tag) => {
    for (let i = 0; i < 4; i += 1) {
      list.push({
        file: `commons-${tag}-${i}.jpg`,
        url: `https://upload.wikimedia.org/x/${tag}${i}.jpg`,
        sha256: "c".repeat(64),
        license: "CC0",
        sourcePage: `https://commons.wikimedia.org/wiki/File:${tag}${i}.jpg`,
        checkedOn: "2026-10-10",
        tags: [tag],
        widthPx: 960,
      });
    }
  });
  return list;
}

type FakeFile = { bytes: Buffer };

class World {
  /** 기기 파일: 전체 경로 → 바이트 */
  files = new Map<string, FakeFile>();
  /** 스캔된 행: 전체 경로 → datetaken */
  rows = new Map<string, number | null>();
  marker: string | null = null;
  calls: string[] = [];
  /** 로컬 임시 폴더의 파일 */
  local = new Map<string, Buffer>();
  nullDates = false;
  failScan = false;
  failPush = false;

  device: SampleDevice = {
    pushDir: (dir) => {
      this.calls.push("pushDir");
      if (this.failPush) return { ok: false, detail: "push 실패" };
      for (const [path, bytes] of this.local) {
        if (!path.startsWith(dir)) continue;
        const relative = path
          .slice(dir.length)
          .replace(/^[\\/]/, "")
          .replace(/\\/g, "/");
        this.files.set(`${SEED}/${relative}`, { bytes });
      }
      return { ok: true, value: undefined };
    },
    removeSampleFiles: () => {
      this.calls.push("removeSampleFiles");
      for (const path of [...this.files.keys()]) {
        const name = path.split("/").pop()!;
        if (name.startsWith("s30-")) this.files.delete(path);
      }
      this.marker = null;
      return { ok: true, value: undefined };
    },
    scanVolume: () => {
      this.calls.push("scanVolume");
      if (this.failScan) return { ok: false, detail: "scan 실패" };
      this.rows.clear();
      for (const [path, file] of this.files) {
        if (!path.endsWith(".jpg")) continue;
        const taken = readDate(file.bytes);
        this.rows.set(path, this.nullDates || taken === null ? null : taken.getTime());
      }
      return { ok: true, value: undefined };
    },
    queryRows: () => {
      this.calls.push("queryRows");
      const rows: MediaRow[] = [...this.rows]
        .filter(([path]) => path.split("/").pop()!.startsWith("s30-"))
        .map(([path, datetakenMs]) => ({ path, datetakenMs }));
      return { ok: true, value: rows };
    },
    readMarker: () => ({ ok: true, value: this.marker }),
    writeMarker: (text) => {
      this.calls.push("writeMarker");
      this.marker = text;
      return { ok: true, value: undefined };
    },
  };

  fs: SampleFs = {
    readCached: (file) => (file.startsWith("commons-") ? TEMPLATE : null),
    makeTempDir: () => "/tmp/pocketlog-sample-test",
    writeFile: (path, bytes) => {
      this.local.set(path.replace(/\\/g, "/"), bytes);
    },
    cleanup: () => {
      this.local.clear();
    },
  };

  /** 010 사진 하나와 소유자의 진짜 사진 하나 */
  addForeign() {
    this.files.set(`${SEED}/2026-10-08-000.jpg`, { bytes: TEMPLATE });
    this.files.set(`${SEED}/Camera/IMG_real.jpg`, { bytes: TEMPLATE });
    this.rows.set(`${SEED}/2026-10-08-000.jpg`, 1);
  }
}

const noSleep = async () => {};

async function run(world: World, now = NOW) {
  const lines: string[] = [];
  const result = await ensureSample({
    device: world.device,
    fs: world.fs,
    catalog: catalog(),
    now,
    log: (line) => lines.push(line),
    sleep: noSleep,
  });
  return { result, lines };
}

describe("ensureSample", () => {
  it("S-1: 처음에는 심고(표식 없음) 표식을 쓴다", async () => {
    const world = new World();
    const { result } = await run(world);
    expect(result.status).toBe("seeded");
    expect(world.calls).toEqual(
      expect.arrayContaining(["removeSampleFiles", "pushDir", "scanVolume", "writeMarker"]),
    );
    const planned = planSample(catalog(), NOW);
    const sample = [...world.files.keys()].filter((p) => p.split("/").pop()!.startsWith("s30-"));
    expect(sample).toHaveLength(planned.length);
    // 폴더 구조: Camera/Screenshots/Download
    expect(sample.some((p) => p.includes("/Screenshots/"))).toBe(true);
    expect(sample.some((p) => p.includes("/Download/"))).toBe(true);
    expect(parseMarker(world.marker)).toEqual({
      anchor: "2026-10-10",
      fingerprint: fingerprint(planned, catalog()),
      photos: planned.length,
    });
  });

  it("G-2: 표식·기준일·지문·사진이 모두 맞으면 건너뛴다 (심기 호출 0)", async () => {
    const world = new World();
    await run(world);
    world.calls = [];
    const { result, lines } = await run(world);
    expect(result.status).toBe("skipped");
    expect(world.calls).not.toContain("pushDir");
    expect(world.calls).not.toContain("removeSampleFiles");
    expect(lines.join("\n")).toMatch(/건너뜀/);
  });

  it("G-3: 기준일이 어제이면 다시 심는다", async () => {
    const world = new World();
    await run(world, new Date(2026, 9, 9, 14, 0, 0));
    const { result } = await run(world);
    expect(result.status).toBe("seeded");
  });

  it("G-3: 표 지문이 다르면(표식이 낡았다) 다시 심는다", async () => {
    const world = new World();
    await run(world);
    world.marker = world.marker!.replace(/fingerprint=[0-9a-f]+/, "fingerprint=0000000000000000");
    const { result } = await run(world);
    expect(result.status).toBe("seeded");
  });

  it("G-3: 표식이 없으면 다시 심는다", async () => {
    const world = new World();
    await run(world);
    world.marker = null;
    expect((await run(world)).result.status).toBe("seeded");
  });

  it("G-3: 표식이 맞아도 사진 일부가 사라졌으면 다시 심는다 (표식만 믿지 않는다)", async () => {
    const world = new World();
    await run(world);
    const victim = [...world.files.keys()].find((p) => p.split("/").pop()!.startsWith("s30-"))!;
    world.files.delete(victim);
    world.rows.delete(victim);
    const { result } = await run(world);
    expect(result.status).toBe("seeded");
    expect(
      [...world.files.keys()].filter((p) => p.split("/").pop()!.startsWith("s30-")),
    ).toHaveLength(planSample(catalog(), NOW).length);
  });

  it("G-3: datetaken이 NULL인 행이 있으면 다시 심는다", async () => {
    const world = new World();
    await run(world);
    const victim = [...world.rows.keys()].find((p) => p.split("/").pop()!.startsWith("s30-"))!;
    world.rows.set(victim, null);
    expect((await run(world)).result.status).toBe("seeded");
  });

  it("S-2: 색인이 계속 NULL이면 index-failed이고 표식을 쓰지 않는다", async () => {
    const world = new World();
    world.nullDates = true;
    const { result } = await run(world);
    expect(result).toMatchObject({ status: "failed", reason: "index-failed" });
    expect(world.marker).toBeNull();
  });

  it("S-2: 시각이 다른 하루로 색인되면 verify-mismatch이다", async () => {
    const world = new World();
    const original = world.device.scanVolume;
    world.device.scanVolume = () => {
      const r = original();
      for (const [path, v] of world.rows) {
        if (v !== null) world.rows.set(path, v + 3 * 24 * 3600 * 1000);
      }
      return r;
    };
    const { result } = await run(world);
    expect(result).toMatchObject({ status: "failed", reason: "verify-mismatch" });
    expect(world.marker).toBeNull();
  });

  it("S-3: push 실패는 push-failed이고 표식을 쓰지 않는다", async () => {
    const world = new World();
    world.failPush = true;
    const { result } = await run(world);
    expect(result).toMatchObject({ status: "failed", reason: "push-failed" });
    expect(world.marker).toBeNull();
  });

  it("G-4: 캐시에 사진이 없으면 missing-cache이고 내려받기를 안내한다 (기기를 건드리지 않는다)", async () => {
    const world = new World();
    world.fs.readCached = () => null;
    const { result } = await run(world);
    expect(result).toMatchObject({ status: "failed", reason: "missing-cache" });
    expect((result as { detail?: string }).detail).toMatch(/sample:fetch/);
    expect(world.calls).not.toContain("pushDir");
    expect(world.calls).not.toContain("removeSampleFiles");
  });

  it("S-4: 010 사진과 소유자의 진짜 사진은 그대로다", async () => {
    const world = new World();
    world.addForeign();
    await run(world);
    expect(world.files.has(`${SEED}/2026-10-08-000.jpg`)).toBe(true);
    expect(world.files.has(`${SEED}/Camera/IMG_real.jpg`)).toBe(true);
    // 재심기 후에도
    world.marker = null;
    await run(world);
    expect(world.files.has(`${SEED}/2026-10-08-000.jpg`)).toBe(true);
    expect(world.files.has(`${SEED}/Camera/IMG_real.jpg`)).toBe(true);
  });

  it("S-1: 심은 사진의 EXIF 시각이 계획 시각이다 (쓰인 EXIF가 소비된다)", async () => {
    const world = new World();
    await run(world);
    const planned = planSample(catalog(), NOW);
    for (const item of planned.slice(0, 20)) {
      const path = `${SEED}/${item.folder}/${item.deviceName}`;
      expect(world.rows.get(path)).toBe(item.takenAt.getTime());
    }
  });

  it("S-6: 로컬 임시 폴더는 끝나면 치운다", async () => {
    const world = new World();
    await run(world);
    expect(world.local.size).toBe(0);
  });

  it("S-5: 어떤 단계도 던지지 않는다 — 기기 대역이 던져도 값으로 실패한다", async () => {
    const world = new World();
    world.device.scanVolume = (): Outcome<void> => {
      throw new Error("adb 터짐");
    };
    const { result } = await run(world);
    expect(result.status).toBe("failed");
  });

  it("표식 이름은 s30- 접두라 삭제 대상에 든다", () => {
    expect(MARKER_NAME).toBe("s30-marker.txt");
  });
});

describe("parseMarker", () => {
  it("키가 모두 있어야 표식이다", () => {
    expect(parseMarker("anchor=2026-10-10\nfingerprint=abcdef0123456789\nphotos=129\n")).toEqual({
      anchor: "2026-10-10",
      fingerprint: "abcdef0123456789",
      photos: 129,
    });
    expect(parseMarker("anchor=2026-10-10\nphotos=129\n")).toBeNull();
    expect(parseMarker(null)).toBeNull();
    expect(parseMarker("쓰레기")).toBeNull();
    expect(
      parseMarker("anchor=2026-10-10\r\nfingerprint=abcdef0123456789\r\nphotos=129\r\n"),
    ).not.toBeNull();
  });
});
