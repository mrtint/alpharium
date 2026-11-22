/**
 * 126 — 지도 렌더 (contracts/day-map.md DM8·DM8a~c). 칸 상대 좌표를 프레임 상대 정수 경로로 바꾼다.
 */
import { packMapFile } from "../../scripts/map/pack";
import { parseMapFile } from "../../src/map/map-file";
import { renderMap, type RenderFrame, type RenderOptions } from "../../src/map/render";

const MIN_LON = 12_690_000;
const MIN_LAT = 3_750_000;
const BOX = { w: 1000, h: 620 };

/** 첫 칸 전체(0.1도)를 프레임 전체에 꼭 맞추는 투영 — 북쪽이 위(y 작음) */
function frameOverCell(): RenderFrame {
  return {
    minLonE5: MIN_LON,
    minLatE5: MIN_LAT,
    maxLonE5: MIN_LON + 10_000,
    maxLatE5: MIN_LAT + 10_000,
    project: (latDeg, lonDeg) => ({
      x: (lonDeg * 1e5 - MIN_LON) / 10_000,
      y: 1 - (latDeg * 1e5 - MIN_LAT) / 10_000,
    }),
  };
}

const LAYERS_ALL = ["water", "park", "rail", "river", "roadMajor", "roadMid", "roadMinor"] as const;
const opts = (over: Partial<RenderOptions> = {}): RenderOptions => ({
  box: BOX,
  layers: LAYERS_ALL,
  maxPathPoints: 100_000,
  roadWidth: 12,
  ...over,
});

function indexOf(cells: Parameters<typeof packMapFile>[0]["cells"]) {
  return parseMapFile(
    packMapFile({ minLonE5: MIN_LON, minLatE5: MIN_LAT, cols: 2, rows: 1, cells }),
  );
}

describe("126 renderMap", () => {
  it("DM8a — 칸 상대 좌표가 프레임 상자의 정수 경로가 된다(북쪽이 위)", () => {
    const idx = indexOf(new Map([[0, { roadMajor: [[0, 0, 10_000, 10_000]] }]]));
    const map = renderMap(idx, frameOverCell(), opts())!;
    expect(map.roadMajor).toBe("M0 620L1000 0");
    expect(map.box).toEqual(BOX);
    expect(map.roadWidth).toBe(12);
  });

  it("면은 닫아 그린다(Z)", () => {
    const idx = indexOf(new Map([[0, { water: [[0, 0, 5000, 0, 5000, 5000, 0, 0]] }]]));
    const map = renderMap(idx, frameOverCell(), opts())!;
    expect(map.water).toBe("M0 620L500 620L500 310L0 620Z");
  });

  it("DM8 — 요청한 층만 그린다(options.layers)", () => {
    const idx = indexOf(
      new Map([[0, { roadMajor: [[0, 0, 10_000, 10_000]], roadMinor: [[0, 0, 5000, 5000]] }]]),
    );
    const map = renderMap(idx, frameOverCell(), opts({ layers: ["roadMajor"] }))!;
    expect(map.roadMajor).not.toBe("");
    expect(map.roadMinor).toBe("");
  });

  it("DM8b — 파일 범위 밖의 프레임은 null이다", () => {
    const idx = indexOf(new Map([[0, { roadMajor: [[0, 0, 10, 10]] }]]));
    const far: RenderFrame = {
      ...frameOverCell(),
      minLonE5: 0,
      maxLonE5: 100,
      minLatE5: 0,
      maxLatE5: 100,
    };
    expect(renderMap(idx, far, opts())).toBeNull();
  });

  it("DM8b — 도형이 하나도 없으면 null이다(빈 지도 바탕을 만들지 않는다)", () => {
    const idx = indexOf(new Map([[1, { roadMajor: [[0, 0, 10, 10]] }]]));
    expect(renderMap(idx, frameOverCell(), opts())).toBeNull();
  });

  it("DM8a — 프레임 밖으로 완전히 나간 도형은 버리고 걸친 도형은 둔다", () => {
    const idx = indexOf(
      new Map([
        [
          0,
          {
            roadMajor: [
              [9000, 9000, 9500, 9500],
              [200, 200, 9000, 9000],
            ],
          },
        ],
      ]),
    );
    // 프레임을 칸의 서남쪽 절반만 덮게 좁힌다
    const half: RenderFrame = {
      ...frameOverCell(),
      maxLonE5: MIN_LON + 5000,
      maxLatE5: MIN_LAT + 5000,
      project: (la, lo) => ({ x: (lo * 1e5 - MIN_LON) / 5000, y: 1 - (la * 1e5 - MIN_LAT) / 5000 }),
    };
    const map = renderMap(idx, half, opts())!;
    expect(map.roadMajor.split("M").filter(Boolean)).toHaveLength(1);
  });

  it("DM8c — 점 수가 상한을 넘으면 작은 길부터 한 단계씩 줄여 다시 만든다", () => {
    const line = Array.from({ length: 400 }, (_, i) => [i * 20, (i % 2) * 20]).flat();
    const idx = indexOf(
      new Map([[0, { roadMajor: [[0, 0, 100, 100]], roadMid: [line], roadMinor: [line] }]]),
    );
    const full = renderMap(idx, frameOverCell(), opts())!;
    expect(full.roadMinor).not.toBe("");
    const lowered = renderMap(idx, frameOverCell(), opts({ maxPathPoints: 500 }))!;
    expect(lowered.roadMinor).toBe("");
    expect(lowered.roadMid).not.toBe("");
    const lowest = renderMap(idx, frameOverCell(), opts({ maxPathPoints: 10 }))!;
    expect(lowest.roadMid).toBe("");
    expect(lowest.roadMajor).not.toBe("");
  });

  it("DM6 — 반환 모양에 위도·경도가 없다(키 검사)", () => {
    const idx = indexOf(new Map([[0, { roadMajor: [[0, 0, 10_000, 10_000]] }]]));
    const map = renderMap(idx, frameOverCell(), opts())!;
    expect(Object.keys(map).sort()).toEqual(
      [
        "box",
        "park",
        "rail",
        "river",
        "roadMajor",
        "roadMid",
        "roadMinor",
        "roadWidth",
        "water",
      ].sort(),
    );
    expect(JSON.stringify(map)).not.toMatch(/lat|lon/i);
  });

  it("두 칸에 걸친 프레임은 두 칸의 선을 모두 그린다", () => {
    const idx = indexOf(
      new Map([
        [0, { roadMajor: [[5000, 5000, 10_000, 5000]] }],
        [1, { roadMajor: [[0, 5000, 4000, 5000]] }],
      ]),
    );
    const wide: RenderFrame = {
      minLonE5: MIN_LON,
      minLatE5: MIN_LAT,
      maxLonE5: MIN_LON + 20_000,
      maxLatE5: MIN_LAT + 10_000,
      project: (la, lo) => ({
        x: (lo * 1e5 - MIN_LON) / 20_000,
        y: 1 - (la * 1e5 - MIN_LAT) / 10_000,
      }),
    };
    const map = renderMap(idx, wide, opts())!;
    expect(map.roadMajor.split("M").filter(Boolean)).toHaveLength(2);
    expect(map.roadMajor).toContain("L500 310");
    expect(map.roadMajor).toContain("M500 310");
  });

  it("DM8b — 물 면만 있는 프레임(섬·바다)도 RouteMap이 나온다(길이 없어도)", () => {
    const idx = indexOf(
      new Map([[0, { water: [[0, 0, 10_000, 0, 10_000, 10_000, 0, 10_000, 0, 0]] }]]),
    );
    const map = renderMap(idx, frameOverCell(), opts())!;
    expect(map.water).not.toBe("");
    expect(map.roadMajor).toBe("");
  });

  it("DM8c — 문자열을 만들기 전에 점 수로 층을 버린다 — 작은 길·중간 길·공원·철도·큰 길 순이고 물·강은 마지막까지 남는다", () => {
    const line = Array.from({ length: 300 }, (_, i) => [i * 30, (i % 2) * 30]).flat();
    const ring = [0, 0, 9000, 0, 9000, 9000, 0, 9000, 0, 0];
    const idx = indexOf(
      new Map([
        [
          0,
          {
            water: [ring],
            river: [[0, 0, 10, 10]],
            park: [ring],
            rail: [line],
            roadMajor: [line],
            roadMid: [line],
            roadMinor: [line],
          },
        ],
      ]),
    );
    const all = renderMap(idx, frameOverCell(), opts())!;
    expect(all.rail).not.toBe("");
    const tight = renderMap(idx, frameOverCell(), opts({ maxPathPoints: 20 }))!;
    expect(tight.roadMinor).toBe("");
    expect(tight.roadMid).toBe("");
    expect(tight.park).toBe("");
    expect(tight.rail).toBe("");
    expect(tight.roadMajor).toBe("");
    expect(tight.water).not.toBe("");
    expect(tight.river).not.toBe("");
  });
});
