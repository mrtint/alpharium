/**
 * 126 — 지도 파일 형식 (contracts/map-file.md MP1~MP10). 바이트는 `scripts/map/pack.ts`가 만들고 순수 파서가 읽는다.
 */
import { packMapFile } from "../../scripts/map/pack";
import {
  MAP_CELL_E5,
  MAP_FILE_MAGIC,
  MAP_HEADER_BYTES,
  MAP_LAYERS,
  cellOf,
  cellOrigin,
  cellRange,
  decodeVarint,
  encodeVarint,
  parseMapFile,
  readCellLayers,
  zigzagDecode,
  zigzagEncode,
} from "../../src/map/map-file";

/** 서울 한 칸(경도 126.9~127.0, 위도 37.5~37.6)에서 시작하는 2×2칸 표본 파일 */
const MIN_LON = 12_690_000;
const MIN_LAT = 3_750_000;

function sample(): Uint8Array {
  return packMapFile({
    minLonE5: MIN_LON,
    minLatE5: MIN_LAT,
    cols: 2,
    rows: 2,
    cells: new Map([
      [
        0,
        {
          water: [[0, 0, 5000, 0, 5000, 5000, 0, 5000, 0, 0]],
          roadMajor: [[100, 200, 4000, 3000, 9999, 10000]],
          roadMinor: [
            [10, 10, 20, 15, 5, 40],
            [7000, 7000, 7010, 7020],
          ],
        },
      ],
      [3, { park: [[1, 1, 100, 1, 100, 100, 1, 1]], river: [[0, 5000, 10000, 5000]] }],
    ]),
  });
}

describe("126 가변 정수·zigzag", () => {
  it("MP4 — 가변 정수는 0·127·128·큰 값에서 왕복한다", () => {
    for (const n of [0, 1, 127, 128, 16383, 16384, 2_097_151, 4_294_967_295]) {
      const bytes = encodeVarint(n);
      const [value, next] = decodeVarint(Uint8Array.from(bytes), 0);
      expect(value).toBe(n);
      expect(next).toBe(bytes.length);
    }
  });

  it("MP4 — zigzag는 음수·양수를 왕복하고 작은 크기가 작은 값이 된다", () => {
    for (const n of [0, 1, -1, 63, -64, 10000, -10000, 2_000_000, -2_000_000]) {
      expect(zigzagDecode(zigzagEncode(n))).toBe(n);
    }
    expect(zigzagEncode(0)).toBe(0);
    expect(zigzagEncode(-1)).toBe(1);
    expect(zigzagEncode(1)).toBe(2);
  });

  it("끝나지 않는 가변 정수는 던진다", () => {
    expect(() => decodeVarint(Uint8Array.from([0x80, 0x80]), 0)).toThrow();
  });
});

describe("126 헤더·칸 (MP1·MP2)", () => {
  const bytes = sample();
  const index = parseMapFile(bytes);

  it("MP1 — 매직·버전·칸 크기·범위·격자 크기를 읽는다", () => {
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe(MAP_FILE_MAGIC);
    expect(index.cellE5).toBe(MAP_CELL_E5);
    expect(index.cols).toBe(2);
    expect(index.rows).toBe(2);
    expect(index.minLonE5).toBe(MIN_LON);
    expect(index.minLatE5).toBe(MIN_LAT);
    expect(index.maxLonE5).toBe(MIN_LON + 2 * MAP_CELL_E5);
    expect(index.maxLatE5).toBe(MIN_LAT + 2 * MAP_CELL_E5);
    expect(MAP_HEADER_BYTES).toBe(32);
  });

  it("MP8 — 매직이 다르면 던진다", () => {
    const bad = Uint8Array.from(bytes);
    bad[0] = 0x58;
    expect(() => parseMapFile(bad)).toThrow();
  });

  it("MP8 — 버전이 다르면 던진다", () => {
    const bad = Uint8Array.from(bytes);
    bad[4] = 9;
    expect(() => parseMapFile(bad)).toThrow();
  });

  it("MP8 — 잘린 파일(헤더·칸 표 밖)은 던진다", () => {
    expect(() => parseMapFile(bytes.slice(0, 10))).toThrow();
    expect(() => parseMapFile(bytes.slice(0, MAP_HEADER_BYTES + 3))).toThrow();
  });

  it("MP8 — 칸 블록이 파일 밖이면 읽을 때 던진다", () => {
    const cut = bytes.slice(0, bytes.length - 8);
    const idx = parseMapFile(cut);
    expect(() => readCellLayers(idx, 3, MAP_LAYERS)).toThrow();
  });

  it("위경도 → 칸 번호: 범위 안은 행·열로, 밖은 null이다", () => {
    expect(cellOf(index, MIN_LON + 1, MIN_LAT + 1)).toBe(0);
    expect(cellOf(index, MIN_LON + MAP_CELL_E5 + 5, MIN_LAT + 1)).toBe(1);
    expect(cellOf(index, MIN_LON + 1, MIN_LAT + MAP_CELL_E5 + 5)).toBe(2);
    expect(cellOf(index, MIN_LON + MAP_CELL_E5 + 5, MIN_LAT + MAP_CELL_E5 + 5)).toBe(3);
    expect(cellOf(index, MIN_LON - 1, MIN_LAT)).toBeNull();
    expect(cellOf(index, MIN_LON, MIN_LAT + 2 * MAP_CELL_E5)).toBeNull();
  });

  it("범위가 닿는 칸 범위를 구하고, 파일과 겹치지 않으면 null이다", () => {
    expect(cellRange(index, MIN_LON + 10, MIN_LAT + 10, MIN_LON + 20, MIN_LAT + 20)).toEqual({
      c0: 0,
      c1: 0,
      r0: 0,
      r1: 0,
    });
    expect(
      cellRange(index, MIN_LON - 50_000, MIN_LAT - 50_000, MIN_LON + 50_000, MIN_LAT + 50_000),
    ).toEqual({ c0: 0, c1: 1, r0: 0, r1: 1 });
    expect(cellRange(index, 0, 0, 100, 100)).toBeNull();
  });

  it("칸 원점은 열·행으로 구한다", () => {
    expect(cellOrigin(index, 0)).toEqual({ lonE5: MIN_LON, latE5: MIN_LAT });
    expect(cellOrigin(index, 3)).toEqual({
      lonE5: MIN_LON + MAP_CELL_E5,
      latE5: MIN_LAT + MAP_CELL_E5,
    });
  });
});

describe("126 칸 읽기 (MP9·MP10)", () => {
  const index = parseMapFile(sample());

  it("MP10 — 왕복: 읽은 도형이 넣은 도형과 같다", () => {
    const got = readCellLayers(index, 0, MAP_LAYERS);
    expect(got.water).toEqual([[0, 0, 5000, 0, 5000, 5000, 0, 5000, 0, 0]]);
    expect(got.roadMajor).toEqual([[100, 200, 4000, 3000, 9999, 10000]]);
    expect(got.roadMinor).toEqual([
      [10, 10, 20, 15, 5, 40],
      [7000, 7000, 7010, 7020],
    ]);
    const other = readCellLayers(index, 3, MAP_LAYERS);
    expect(other.park).toEqual([[1, 1, 100, 1, 100, 100, 1, 1]]);
    expect(other.river).toEqual([[0, 5000, 10000, 5000]]);
  });

  it("MP9 — 요청한 층만 해석한다", () => {
    const got = readCellLayers(index, 0, ["water"]);
    expect(Object.keys(got)).toEqual(["water"]);
  });

  it("MP9 — 빈 칸·없는 층은 빈 목록이다", () => {
    expect(readCellLayers(index, 1, MAP_LAYERS)).toEqual({});
    expect(readCellLayers(index, 0, ["rail"])).toEqual({});
  });

  it("MP9 — 파일 밖 칸 번호는 던지지 않고 빈 목록이다", () => {
    expect(readCellLayers(index, 99, MAP_LAYERS)).toEqual({});
    expect(readCellLayers(index, -1, MAP_LAYERS)).toEqual({});
  });

  it("MP7 — map-file.ts는 import가 없다(Node 스크립트가 타입 제거만으로 읽는다)", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const src = (require("node:fs") as typeof import("node:fs")).readFileSync(
      require("node:path").join(__dirname, "..", "..", "src", "map", "map-file.ts"),
      "utf8",
    );
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/^\s*import\s/m);
  });
});
