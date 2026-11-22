/**
 * 126 — 지도 파일 묶기 (contracts/map-file.md MP10·BM3·MP6, `scripts/map/pack.ts`).
 */
import { layerByteTotals, packMapFile } from "../../scripts/map/pack";
import { MAP_LAYERS, parseMapFile, readCellLayers } from "../../src/map/map-file";

const base = { minLonE5: 12_690_000, minLatE5: 3_750_000, cols: 3, rows: 1 };

describe("126 packMapFile", () => {
  it("BM3 — 같은 입력은 같은 바이트다", () => {
    const cells = new Map([[1, { roadMajor: [[1, 2, 3, 4]] }]]);
    const a = packMapFile({ ...base, cells });
    const b = packMapFile({ ...base, cells: new Map(cells) });
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("MP10 — 음수 차이(왼쪽·아래로 가는 선)도 왕복한다", () => {
    const shape = [9000, 9000, 100, 50, 8000, 10000, 0, 0];
    const idx = parseMapFile(packMapFile({ ...base, cells: new Map([[2, { river: [shape] }]]) }));
    expect(readCellLayers(idx, 2, MAP_LAYERS).river).toEqual([shape]);
  });

  it("빈 칸은 표에서 0이고 읽으면 빈 목록이다", () => {
    const idx = parseMapFile(
      packMapFile({ ...base, cells: new Map([[0, { water: [[0, 0, 10, 10]] }]]) }),
    );
    expect(readCellLayers(idx, 1, MAP_LAYERS)).toEqual({});
    expect(readCellLayers(idx, 2, MAP_LAYERS)).toEqual({});
  });

  it("MP6 — 칸 경계에서 잘린 선이 두 칸에서 이어진다(끝점이 칸 경계 좌표 0·10000에서 만난다)", () => {
    const idx = parseMapFile(
      packMapFile({
        ...base,
        cells: new Map([
          [0, { roadMajor: [[5000, 5000, 10000, 5000]] }],
          [1, { roadMajor: [[0, 5000, 4000, 5000]] }],
        ]),
      }),
    );
    const left = readCellLayers(idx, 0, ["roadMajor"]).roadMajor![0]!;
    const right = readCellLayers(idx, 1, ["roadMajor"]).roadMajor![0]!;
    expect(left.slice(-2)).toEqual([10000, 5000]);
    expect(right.slice(0, 2)).toEqual([0, 5000]);
  });

  it("좌표가 0~10000 밖이거나 정수가 아니면 던진다", () => {
    expect(() =>
      packMapFile({ ...base, cells: new Map([[0, { river: [[0, 0, 10001, 5]] }]]) }),
    ).toThrow();
    expect(() =>
      packMapFile({ ...base, cells: new Map([[0, { river: [[0, 0, 1.5, 5]] }]]) }),
    ).toThrow();
  });

  it("점이 하나이거나 좌표 수가 홀수인 도형은 던진다", () => {
    expect(() => packMapFile({ ...base, cells: new Map([[0, { river: [[1, 1]] }]]) })).toThrow();
    expect(() => packMapFile({ ...base, cells: new Map([[0, { river: [[1, 1, 2]] }]]) })).toThrow();
  });

  it("범위 밖 칸 번호는 던진다", () => {
    expect(() =>
      packMapFile({ ...base, cells: new Map([[3, { river: [[0, 0, 1, 1]] }]]) }),
    ).toThrow();
  });

  it("기록용 층별 바이트 합은 층마다 따로 센다", () => {
    const cells = new Map([
      [
        0,
        {
          river: [[0, 0, 10, 10]],
          roadMinor: [
            [0, 0, 5, 5],
            [1, 1, 2, 2],
          ],
        },
      ],
    ]);
    const totals = layerByteTotals(cells);
    expect(totals.river).toBeGreaterThan(0);
    expect(totals.roadMinor).toBeGreaterThan(totals.river);
    expect(totals.water).toBe(0);
  });
});
