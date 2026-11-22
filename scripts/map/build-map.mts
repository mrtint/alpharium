/**
 * 126 — OpenStreetMap 한국 추출본에서 동선 지도 파일(`assets/map/kr-map.bin`)을 만든다.
 *
 * 계약: specs/126-route-map-illustration/contracts/map-file.md BM1~BM5, research R2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 사람이 필요할 때만 돌린다(`npm run map:build`). 저장소 밖 도구 `osmium-tool`(Homebrew)이 있어야 한다.
 *
 * 1. 장소 데이터(`scripts/places/.cache/south-korea-latest.osm.pbf`)와 같은 원본을 쓴다(없으면 `places:build`가 받는다).
 * 2. 층마다 `osmium tags-filter`로 거르고 `osmium export -f geojsonseq`로 내보낸다(`scripts/map/.cache/`, gitignore).
 * 3. 층별 허용 오차로 단순화(`simplify.ts`)하고 0.1도 칸마다 잘라(`clipLineToRect`·`clipRingToRect`) 묶는다(`pack.ts`).
 * 4. `kr-map.bin`과 기록 `kr-map.meta.json`(원본·크기·sha256·칸 수·층별 크기·허용 오차)을 쓴다.
 *    **크기가 `MAP_MAX_BYTES`를 넘으면 아무것도 쓰지 않고 실패한다**(BM4) — 허용 오차는 사람이 아래 상수를 고쳐 다시 돈다.
 *
 * 한계: 해안선(`natural=coastline`)은 선으로만 담는다(바다 면을 채우지 않는다 — OSM에는 바다 면이 없다). 건물·보행로·오솔길·
 * `highway=service`는 넣지 않는다(소유자 결정, 용량).
 *
 * 데이터 © OpenStreetMap contributors, ODbL 1.0. 가공 파일도 같은 라이선스다(site/licenses/).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

import {
  MAP_CELL_E5,
  MAP_LAYERS,
  MAP_MAX_BYTES,
  type CellLayers,
  type MapLayer,
} from "../../src/map/map-file.ts";
import { layerByteTotals, packMapFile } from "./pack.ts";
import { clipLineToRect, clipRingToRect, douglasPeucker, mergeLines, orientRing, type Pt } from "./simplify.ts";

const SOURCE_URL = "https://download.geofabrik.de/asia/south-korea-latest.osm.pbf";

/** 격자 — 경도 124.0~133.0, 위도 33.0~39.0(한국 전역, 1e-5도). 사람이 정한 값 */
const GRID = { minLonE5: 12_400_000, minLatE5: 3_300_000, cols: 90, rows: 60 };

/** 이보다 작은 숲·산림 면은 버린다(㎡). 사람이 정한 값 — 10km² */
const MIN_FOREST_M2 = 10_000_000;

/**
 * 층별 허용 오차(미터)와 거르는 태그. **사람이 정한 값이다**(헌법 원칙 V, 측정이 아니다) — 크기가 상한을 넘으면 사람이 고쳐 다시 돈다
 * (research R2: L6부터 8→12m, 숲 문턱 올리기).
 */
const LAYER_BUILD: Record<
  MapLayer,
  { kind: "line" | "area"; tolM: number; filters: string[] }
> = {
  water: { kind: "area", tolM: 20, filters: ["a/natural=water", "a/natural=wetland"] },
  park: { kind: "area", tolM: 50, filters: ["a/leisure=park", "a/landuse=forest", "a/natural=wood"] },
  rail: { kind: "line", tolM: 8, filters: ["w/railway=rail,subway"] },
  river: { kind: "line", tolM: 15, filters: ["w/waterway=river", "w/natural=coastline"] },
  roadMajor: {
    kind: "line",
    tolM: 8,
    filters: ["w/highway=motorway,trunk,primary,motorway_link,trunk_link,primary_link"],
  },
  roadMid: { kind: "line", tolM: 10, filters: ["w/highway=secondary,tertiary,secondary_link,tertiary_link"] },
  roadMinor: { kind: "line", tolM: 15, filters: ["w/highway=residential,unclassified,living_street"] },
};
/** 이보다 짧은 작은 길 조각은 버린다(미터, 막다른 골목 조각 등). 사람이 정한 값 — 용량이 상한을 넘어 더했다 */
const MIN_MINOR_LINE_M = 60;
/** 숲·산림 면의 허용 오차(미터) */
const FOREST_TOL_M = 60;

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cache = join(root, "scripts", "map", ".cache");
const placesCache = join(root, "scripts", "places", ".cache");
const outDir = join(root, "assets", "map");

function run(cmd: string, args: string[]) {
  execFileSync(cmd, args, { stdio: ["ignore", "inherit", "inherit"] });
}

type Geometry = { type: string; coordinates: unknown };
type Props = Record<string, string | undefined>;

/** 면의 다각형들 — 다각형마다 `[바깥 고리, ...구멍]` */
function polygonsOf(g: Geometry): number[][][][] {
  if (g.type === "Polygon") return [g.coordinates as number[][][]];
  if (g.type === "MultiPolygon") return g.coordinates as number[][][][];
  return [];
}

function rawRings(g: Geometry, kind: "line" | "area"): number[][][] {
  const c = g.coordinates as never;
  switch (g.type) {
    case "LineString":
      return kind === "line" ? [c as number[][]] : [];
    case "MultiLineString":
      return kind === "line" ? (c as number[][][]) : [];
    case "Polygon":
      return c as number[][][];
    case "MultiPolygon":
      return (c as number[][][][]).flat();
    default:
      return [];
  }
}

/** 고리의 어림 면적(㎡, 신발끈 공식 — 한국 중위도 환산) */
function areaM2(ring: number[][]): number {
  const kx = 111_320 * Math.cos((36.5 * Math.PI) / 180);
  const ky = 110_540;
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    a += ring[i]![0]! * kx * ring[i + 1]![1]! * ky - ring[i + 1]![0]! * kx * ring[i]![1]! * ky;
  }
  return Math.abs(a) / 2;
}

/** 경위도(도)를 1e-5도 평면 좌표로, 허용 오차(미터)로 단순화한 뒤 다시 1e-5도 좌표로 돌려준다 */
function simplifyDeg(coords: number[][], tolM: number): Pt[] {
  const lat0 = coords[0]![1]!;
  const kx = 1.1132 * Math.cos((lat0 * Math.PI) / 180); // 1e-5도 경도 1단위의 미터
  const ky = 1.1054;
  const scaled: Pt[] = coords.map(([lon, lat]) => [lon! * 1e5 * kx, lat! * 1e5 * ky]);
  return douglasPeucker(scaled, tolM).map(([x, y]) => [x / kx, y / ky] as Pt);
}

/** 1e-5도 좌표 선의 길이(미터, 어림) */
function lengthM(pts: Pt[]): number {
  let len = 0;
  const kx = 1.1132 * Math.cos((36.5 * Math.PI) / 180);
  for (let i = 1; i < pts.length; i++) len += Math.hypot((pts[i]![0] - pts[i - 1]![0]) * kx, (pts[i]![1] - pts[i - 1]![1]) * 1.1054);
  return len;
}

function addToCells(cells: Map<number, CellLayers>, layer: MapLayer, e5: Pt[], closed: boolean) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of e5) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const c0 = Math.max(0, Math.floor((minX - GRID.minLonE5) / MAP_CELL_E5));
  const c1 = Math.min(GRID.cols - 1, Math.floor((maxX - GRID.minLonE5) / MAP_CELL_E5));
  const r0 = Math.max(0, Math.floor((minY - GRID.minLatE5) / MAP_CELL_E5));
  const r1 = Math.min(GRID.rows - 1, Math.floor((maxY - GRID.minLatE5) / MAP_CELL_E5));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const xmin = GRID.minLonE5 + c * MAP_CELL_E5;
      const ymin = GRID.minLatE5 + r * MAP_CELL_E5;
      const rect = { xmin, ymin, xmax: xmin + MAP_CELL_E5, ymax: ymin + MAP_CELL_E5 };
      const pieces: Pt[][] = closed ? [clipRingToRect(e5, rect)] : clipLineToRect(e5, rect);
      for (const piece of pieces) {
        if (piece.length < (closed ? 4 : 2)) continue;
        const flat: number[] = [];
        for (const [x, y] of piece) flat.push(Math.round(x - xmin), Math.round(y - ymin));
        // 반올림으로 이웃 점이 같아졌으면 한 점으로 줄인다
        const dedup: number[] = [flat[0]!, flat[1]!];
        for (let i = 2; i < flat.length; i += 2) {
          if (flat[i] !== dedup[dedup.length - 2] || flat[i + 1] !== dedup[dedup.length - 1]) dedup.push(flat[i]!, flat[i + 1]!);
        }
        if (dedup.length < (closed ? 8 : 4)) continue;
        const cell = r * GRID.cols + c;
        const entry = cells.get(cell) ?? {};
        (entry[layer] ??= []).push(dedup);
        cells.set(cell, entry);
      }
    }
  }
}

async function main() {
  mkdirSync(cache, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  const pbf = join(placesCache, "south-korea-latest.osm.pbf");
  if (!existsSync(pbf)) throw new Error(`원본이 없다: ${pbf} — 먼저 npm run places:build 로 받는다`);
  const sourceBytes = statSync(pbf).size;
  const sourceSha256 = createHash("sha256").update(readFileSync(pbf)).digest("hex");

  const cells = new Map<number, CellLayers>();
  const counts: Record<string, { shapes: number; points: number }> = {};

  for (const layer of MAP_LAYERS) {
    const cfg = LAYER_BUILD[layer];
    const filtered = join(cache, `${layer}.osm.pbf`);
    const exported = join(cache, `${layer}.geojsonseq`);
    run("osmium", ["tags-filter", "--overwrite", "-o", filtered, pbf, ...cfg.filters]);
    run("osmium", ["export", "--overwrite", "-f", "geojsonseq", "--format-option", "print_record_separator=false", "-o", exported, filtered]);
    let shapes = 0;
    let points = 0;
    const lineBuf: Pt[][] = [];
    const lines = createInterface({ input: createReadStream(exported) });
    for await (const line of lines) {
      if (line.trim() === "") continue;
      const f = JSON.parse(line) as { geometry: Geometry; properties: Props };
      const forest = layer === "park" && f.properties.leisure !== "park";
      if (cfg.kind === "line") {
        for (const ring of rawRings(f.geometry, "line")) {
          if (ring.length < 2) continue;
          lineBuf.push(ring.map(([lon, lat]) => [lon!, lat!] as Pt));
        }
        continue;
      }
      // 면 — 다각형마다 바깥 고리는 반시계, 구멍은 시계로 맞춘다(화면이 비영 채우기로 그려도 겹친 면이 구멍이 되지 않는다)
      for (const polygon of polygonsOf(f.geometry)) {
        polygon.forEach((ring, ringIndex) => {
          if (ring.length < 4) return;
          if (forest && ringIndex === 0 && areaM2(ring) < MIN_FOREST_M2) return;
          const oriented = orientRing(
            ring.map(([lon, lat]) => [lon!, lat!] as Pt),
            ringIndex === 0,
          );
          const s = simplifyDeg(oriented, forest ? FOREST_TOL_M : cfg.tolM);
          if (s.length < 4) return;
          addToCells(cells, layer, s, true);
          shapes += 1;
          points += s.length;
        });
      }
    }
    if (cfg.kind === "line") {
      // 교차로마다 쪼개진 way를 끝점이 둘만 만나는 곳에서 잇는다(도형 수가 용량의 큰 몫이다)
      for (const merged of mergeLines(lineBuf)) {
        const s = simplifyDeg(merged, cfg.tolM);
        if (s.length < 2) continue;
        if (layer === "roadMinor" && lengthM(s) < MIN_MINOR_LINE_M) continue;
        addToCells(cells, layer, s, false);
        shapes += 1;
        points += s.length;
      }
    }
    counts[layer] = { shapes, points };
    console.log(`${layer}: 도형 ${shapes}개 · 점 ${points}개`);
  }

  const bytes = packMapFile({ ...GRID, cells });
  const layerBytes = layerByteTotals(cells);
  console.log(`총 ${bytes.length}바이트 (상한 ${MAP_MAX_BYTES})`, layerBytes);
  if (bytes.length > MAP_MAX_BYTES) {
    throw new Error(
      `kr-map.bin ${bytes.length}바이트가 상한 ${MAP_MAX_BYTES}를 넘는다 — 아무것도 쓰지 않았다. 허용 오차(LAYER_BUILD)·숲 문턱을 사람이 고쳐 다시 돈다(research R2).`,
    );
  }

  writeFileSync(join(outDir, "kr-map.bin"), bytes);
  const meta = {
    source: { url: SOURCE_URL, lastModified: null as string | null, bytes: sourceBytes, sha256: sourceSha256, license: "ODbL 1.0 © OpenStreetMap contributors" },
    output: {
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      cells: cells.size,
      layerBytes,
      counts,
    },
    build: {
      grid: GRID,
      cellE5: MAP_CELL_E5,
      toleranceM: Object.fromEntries(MAP_LAYERS.map((l) => [l, LAYER_BUILD[l].tolM])),
      forestToleranceM: FOREST_TOL_M,
      minForestM2: MIN_FOREST_M2,
    },
  };
  writeFileSync(join(outDir, "kr-map.meta.json"), JSON.stringify(meta, null, 2) + "\n");
  console.log(`쓴 파일: ${join(outDir, "kr-map.bin")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
