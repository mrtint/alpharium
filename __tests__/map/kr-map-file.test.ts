/**
 * 126 — 앱에 들어가는 지도 데이터 파일 계약 (contracts/map-file.md MP11~MP14, SC-005).
 * 장소 파일(`kr-places-file.test.ts`)과 같은 방식으로 실제 번들 자산을 읽는다.
 */
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  MAP_LAYERS,
  MAP_MAX_BYTES,
  cellOf,
  cellOrigin,
  parseMapFile,
  readCellLayers,
} from "../../src/map/map-file";

const ROOT = join(__dirname, "..", "..");
const BIN = join(ROOT, "assets", "map", "kr-map.bin");
const META = join(ROOT, "assets", "map", "kr-map.meta.json");

describe("assets/map/kr-map.bin", () => {
  const bytes = new Uint8Array(readFileSync(BIN));
  const meta = JSON.parse(readFileSync(META, "utf8")) as {
    source: { url: string; bytes: number; license: string };
    output: { bytes: number; sha256: string; cells: number; layerBytes: Record<string, number> };
  };
  const index = parseMapFile(bytes);

  /** 짝홀(evenodd) 점-면 판정 — 칸 상대 좌표 */
  function insideShapes(shapes: number[][], x: number, y: number): boolean {
    let inside = false;
    for (const s of shapes) {
      for (let i = 0, j = s.length - 2; i < s.length; j = i, i += 2) {
        const xi = s[i]!;
        const yi = s[i + 1]!;
        const xj = s[j]!;
        const yj = s[j + 1]!;
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
    }
    return inside;
  }

  function cellAt(lat: number, lon: number) {
    const lonE5 = Math.round(lon * 1e5);
    const latE5 = Math.round(lat * 1e5);
    const cell = cellOf(index, lonE5, latE5);
    if (cell === null) throw new Error("파일 범위 밖");
    const o = cellOrigin(index, cell);
    return { cell, x: lonE5 - o.lonE5, y: latE5 - o.latE5 };
  }

  it("MP11 — MAP_MAX_BYTES 이하다(상수는 src/map/map-file.ts, 사람이 정한 값)", () => {
    expect(statSync(BIN).size).toBeLessThanOrEqual(MAP_MAX_BYTES);
  });

  it("MP12 — 기록의 sha256·크기가 파일과 같다", () => {
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(meta.output.sha256);
    expect(bytes.length).toBe(meta.output.bytes);
    expect(meta.output.cells).toBeGreaterThan(1000);
  });

  it("MP12 — 기록에 원본·라이선스가 있다", () => {
    expect(meta.source.url).toContain("geofabrik.de");
    expect(meta.source.bytes).toBeGreaterThan(0);
    expect(meta.source.license).toContain("ODbL");
    expect(meta.source.license).toContain("OpenStreetMap");
  });

  it("MP13 — 서울 한 점의 칸에 일곱 층이 모두 있다(빈 파일을 막는다)", () => {
    const { cell } = cellAt(37.5547, 126.8977);
    const layers = readCellLayers(index, cell, MAP_LAYERS);
    for (const layer of MAP_LAYERS) expect(layers[layer]?.length ?? 0).toBeGreaterThan(0);
  });

  it("MP13 — 한강 위의 점(한강대교 근처)은 물 면 안이고 용산 쪽 육지의 점은 밖이다", () => {
    const river = cellAt(37.5172, 126.9573);
    expect(
      insideShapes(readCellLayers(index, river.cell, ["water"]).water ?? [], river.x, river.y),
    ).toBe(true);
    const land = cellAt(37.5547, 126.8977);
    expect(
      insideShapes(readCellLayers(index, land.cell, ["water"]).water ?? [], land.x, land.y),
    ).toBe(false);
  });

  it("MP13 — 층별 크기 기록의 합이 파일 크기를 넘지 않는다", () => {
    const sum = Object.values(meta.output.layerBytes).reduce((a, b) => a + b, 0);
    expect(sum).toBeLessThanOrEqual(bytes.length);
  });

  it("MP14 — metro가 bin을 자산 확장자로 가진다", () => {
    const metro = readFileSync(join(ROOT, "metro.config.js"), "utf8");
    expect(metro).toMatch(/\bbin\b/);
  });
});
