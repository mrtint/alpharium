/**
 * 121 — OpenStreetMap 한국 추출본에서 장소 데이터(`assets/places/kr-places.bin`)를 만든다.
 *
 * 계약: specs/121-richer-day-places/contracts/place-index.md, research R3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 사람이 필요할 때만 돌린다(`npm run places:build`). 저장소 밖 도구 `osmium-tool`(Homebrew)이 있어야 한다.
 *
 * 1. Geofabrik `south-korea-latest.osm.pbf`를 `scripts/places/.cache/`(gitignore)에 받는다 — 이미 있으면 그대로 쓴다.
 *    다른 파일을 쓰려면 `-- --pbf <경로>`. 캐시·`--pbf` 파일의 원본 날짜는 `-- --last-modified "<Last-Modified 값>"`으로 적는다
 *    (주지 않으면 모름으로 남는다). 어느 파일이었는지는 기록의 원본 sha256이 가린다.
 * 2. `osmium tags-filter`로 이름 있는 것 → 범주 태그가 있는 것 순으로 거른다(두 번 거르면 AND가 된다).
 * 3. `osmium export -f geojsonseq`로 점·면을 내보낸다.
 * 4. 범주·한글 이름(`categorize.ts`), 경계 단순화(`simplify.ts`), 이진 묶기(`pack.ts`).
 * 5. `kr-places.bin`과 기록 `kr-places.meta.json`(원본 URL·Last-Modified·바이트 수, 결과 sha256·곳 수·범주별 수)을 쓴다.
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

import { categorize, placeNameOf, type OsmTags } from "./categorize.ts";
import { packPlaces, type PackPlace } from "./pack.ts";
import { simplifyRing, type LatLon } from "./simplify.ts";

const SOURCE_URL = "https://download.geofabrik.de/asia/south-korea-latest.osm.pbf";
/**
 * 다각형까지 담는 범주. 건물·기관(학교·병원 부지)은 대부분 네모라 경계 상자로 안·밖을 가르고 꼭짓점은 버린다 — 파일을 10MB 아래로
 * 두려는 것이다(SC-006, 첫 빌드 14.9MB 중 도형 6.1MB).
 */
const POLYGON_CATEGORIES = new Set(["landmark", "park", "mall", "residential", "locality"]);
/** 경계 단순화 허용 오차(도) — 약 20m. 사람이 정한 값(1e-4도에서 11.5MB라 넓혔다, SC-006) */
const SIMPLIFY_TOLERANCE = 2e-4;

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cache = join(root, "scripts", "places", ".cache");
const outDir = join(root, "assets", "places");

const CATEGORY_FILTERS = [
  "nwr/railway=station,halt",
  "nwr/public_transport=station",
  "nwr/aeroway=aerodrome",
  "nwr/tourism=attraction,museum,theme_park,zoo,aquarium,gallery,viewpoint",
  "nwr/historic=castle,palace,monument,memorial,archaeological_site,building,city_gate",
  "nwr/leisure=park,garden,nature_reserve,stadium,water_park,marina",
  "nwr/natural=beach,peak,bay,island",
  "nwr/boundary=national_park",
  "nwr/shop=mall,department_store",
  "nwr/amenity=marketplace,university,college,school,hospital,library,townhall,place_of_worship,theatre,cinema,arts_centre,community_centre,exhibition_centre,conference_centre",
  "nwr/place=neighbourhood,quarter,locality,hamlet,village,suburb,isolated_dwelling",
  "nwr/landuse=residential",
  "nwr/building",
  "nwr/office",
];

function run(cmd: string, args: string[]) {
  execFileSync(cmd, args, { stdio: ["ignore", "inherit", "inherit"] });
}

async function lastModified(): Promise<string | null> {
  try {
    const res = await fetch(SOURCE_URL, { method: "HEAD", redirect: "follow" });
    return res.headers.get("last-modified");
  } catch {
    return null;
  }
}

/**
 * 면의 모든 고리(바깥·구멍·여러 조각)와, 대표 좌표를 낼 가장 큰 바깥 고리를 꺼낸다. GeoJSON은 [경도, 위도]다.
 * osmium은 면을 모두 MultiPolygon으로 내보낸다.
 */
function ringsOf(geometry: { type: string; coordinates: unknown }): { all: LatLon[][]; outer: LatLon[] } | null {
  let polys: number[][][][] = [];
  if (geometry.type === "Polygon") polys = [geometry.coordinates as number[][][]];
  else if (geometry.type === "MultiPolygon") polys = geometry.coordinates as number[][][][];
  else return null;
  const toLatLon = (r: number[][]) => r.map(([lon, lat]) => [lat, lon] as LatLon);
  const all = polys.flat().filter((r) => r.length >= 4).map(toLatLon);
  const outers = polys.map((p) => p[0]).filter((r) => r !== undefined && r.length >= 4);
  if (all.length === 0 || outers.length === 0) return null;
  const outer = toLatLon(outers.reduce((a, b) => (b.length > a.length ? b : a), outers[0]));
  return { all, outer };
}

async function main() {
  const args = process.argv.slice(2);
  const pbfArg = args.indexOf("--pbf");
  mkdirSync(cache, { recursive: true });
  const pbf = pbfArg >= 0 ? args[pbfArg + 1] : join(cache, "south-korea-latest.osm.pbf");

  // 원본 날짜는 이번에 받은 때만 원격 머리에서 적는다 — 캐시나 `--pbf` 파일이면 원격의 지금 날짜가 그 파일의 날짜가 아니다
  // (코드 리뷰). 그때는 모름(null)으로 두고, 어느 파일이었는지는 sha256으로 가린다.
  // 캐시 파일을 받던 때 원격 머리를 따로 적어 두었으면 `-- --last-modified "<값>"`으로 넘긴다.
  const modifiedArg = args.indexOf("--last-modified");
  let modified: string | null = modifiedArg >= 0 ? args[modifiedArg + 1] : null;
  if (!existsSync(pbf)) {
    console.log(`원본 받기: ${SOURCE_URL}`);
    modified = await lastModified();
    run("curl", ["-sSL", "-o", pbf, SOURCE_URL]);
  }
  const sourceBytes = statSync(pbf).size;
  const sourceSha256 = createHash("sha256").update(readFileSync(pbf)).digest("hex");

  const named = join(cache, "named.osm.pbf");
  const filtered = join(cache, "filtered.osm.pbf");
  const exported = join(cache, "places.geojsonseq");
  run("osmium", ["tags-filter", "--overwrite", "-o", named, pbf, "nwr/name", "nwr/name:ko"]);
  run("osmium", ["tags-filter", "--overwrite", "-o", filtered, named, ...CATEGORY_FILTERS]);
  run("osmium", [
    "export",
    "--overwrite",
    "-f",
    "geojsonseq",
    "--format-option",
    "print_record_separator=false",
    "--geometry-types=point,polygon",
    "-o",
    exported,
    filtered,
  ]);

  const places: PackPlace[] = [];
  const lines = createInterface({ input: createReadStream(exported) });
  for await (const line of lines) {
    if (line.trim() === "") continue;
    const feature = JSON.parse(line) as {
      geometry: { type: string; coordinates: unknown };
      properties: OsmTags;
    };
    const category = categorize(feature.properties);
    const name = placeNameOf(feature.properties);
    if (category === null || name === null) continue;

    if (feature.geometry.type === "Point") {
      const [lon, lat] = feature.geometry.coordinates as number[];
      places.push({ lat, lon, category, name });
      continue;
    }
    const geometry = ringsOf(feature.geometry);
    if (geometry === null) continue;
    const simple = geometry.all.map((r) => simplifyRing(r, SIMPLIFY_TOLERANCE));
    const body = simplifyRing(geometry.outer, SIMPLIFY_TOLERANCE).slice(0, -1);
    const lat = body.reduce((s, p) => s + p[0], 0) / body.length;
    const lon = body.reduce((s, p) => s + p[1], 0) / body.length;
    // 건물·기관은 꼭짓점을 버리고 경계 상자만 담는다(`boxOnly`, POLYGON_CATEGORIES 주석).
    places.push({ lat, lon, category, name, rings: simple, boxOnly: !POLYGON_CATEGORIES.has(category) });
  }

  const bytes = packPlaces(places);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "kr-places.bin"), bytes);

  const byCategory: Record<string, number> = {};
  for (const p of places) byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
  const meta = {
    source: {
      url: SOURCE_URL,
      lastModified: modified,
      bytes: sourceBytes,
      sha256: sourceSha256,
      license: "ODbL 1.0 — © OpenStreetMap contributors",
    },
    output: {
      file: "assets/places/kr-places.bin",
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      places: places.length,
      byCategory,
    },
    simplifyToleranceDegrees: SIMPLIFY_TOLERANCE,
    builtAt: new Date().toISOString().slice(0, 10),
  };
  writeFileSync(join(outDir, "kr-places.meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`장소 ${places.length}곳, ${(bytes.length / 1e6).toFixed(2)}MB`, byCategory);
}

await main();
