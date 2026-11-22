/**
 * 126 — 동선 지도의 「사람이 정한 값」과 위임 (contracts/day-map.md DM8). 문턱·굵기 구간·점 수 상한은 코드 주석에 사람이 정했다고 적혀 있다.
 */
import { packMapFile } from "../../scripts/map/pack";
import {
  DETAIL_COARSE_FROM_M,
  DETAIL_FINE_BELOW_M,
  MAP_MAX_FRAME_M,
  MAX_PATH_POINTS,
  layersForWidth,
  renderRouteMap,
  roadWidthForWidth,
} from "../../src/app/day-map";
import { parseMapFile } from "../../src/map/map-file";

describe("126 상세 정도 (FR-006)", () => {
  it("3km 미만은 골목·생활도로(L6)까지 일곱 층이다", () => {
    expect(layersForWidth(600)).toEqual([
      "water",
      "park",
      "rail",
      "river",
      "roadMajor",
      "roadMid",
      "roadMinor",
    ]);
    expect(layersForWidth(DETAIL_FINE_BELOW_M - 1)).toContain("roadMinor");
  });

  it("3km 이상 15km 미만은 2·3차 도로(L5)까지, 작은 길은 없다", () => {
    const l = layersForWidth(DETAIL_FINE_BELOW_M);
    expect(l).toContain("roadMid");
    expect(l).not.toContain("roadMinor");
    expect(layersForWidth(DETAIL_COARSE_FROM_M - 1)).not.toContain("roadMinor");
  });

  it("15km 이상은 주요 도로(L4)까지만이다", () => {
    const l = layersForWidth(DETAIL_COARSE_FROM_M);
    expect(l).toContain("roadMajor");
    expect(l).not.toContain("roadMid");
    expect(l).toContain("water");
    expect(l).toContain("park");
  });

  it("문턱은 3km·15km다(사람이 정한 값)", () => {
    expect(DETAIL_FINE_BELOW_M).toBe(3000);
    expect(DETAIL_COARSE_FROM_M).toBe(15000);
  });
});

describe("126 큰 길 굵기 구간표", () => {
  it("상자가 좁을수록 굵다", () => {
    expect(roadWidthForWidth(600)).toBeGreaterThan(roadWidthForWidth(5000));
    expect(roadWidthForWidth(5000)).toBeGreaterThan(roadWidthForWidth(30000));
    expect(roadWidthForWidth(30000)).toBeGreaterThan(0);
  });
});

describe("126 renderRouteMap", () => {
  const MIN_LON = 12_690_000;
  const MIN_LAT = 3_750_000;
  const idx = parseMapFile(
    packMapFile({
      minLonE5: MIN_LON,
      minLatE5: MIN_LAT,
      cols: 1,
      rows: 1,
      cells: new Map([[0, { roadMajor: [[0, 0, 10_000, 10_000]], roadMinor: [[0, 0, 100, 100]] }]]),
    }),
  );
  const frame = {
    minLonE5: MIN_LON,
    minLatE5: MIN_LAT,
    maxLonE5: MIN_LON + 10_000,
    maxLatE5: MIN_LAT + 10_000,
    project: (la: number, lo: number) => ({
      x: (lo * 1e5 - MIN_LON) / 10_000,
      y: 1 - (la * 1e5 - MIN_LAT) / 10_000,
    }),
  };

  it("프레임 폭에 맞는 층·굵기로 지도를 만든다(작은 길은 넓은 프레임에서 빠진다)", () => {
    const narrow = renderRouteMap(idx, frame, 600, { w: 1000, h: 620 })!;
    expect(narrow.roadMinor).not.toBe("");
    expect(narrow.roadWidth).toBe(roadWidthForWidth(600));
    const wide = renderRouteMap(idx, frame, 20_000, { w: 1000, h: 620 })!;
    expect(wide.roadMinor).toBe("");
    expect(wide.roadMajor).not.toBe("");
  });

  it("점 수 상한 처음 값은 20,000이다(사람이 정한 값, 실기기 측정 뒤 손본다)", () => {
    expect(MAX_PATH_POINTS).toBe(20_000);
  });

  it("MAP_MAX_FRAME_M — 60km보다 넓은 프레임은 지도를 그리지 않는다(null — 125 모양, 코드 리뷰 FR-009)", () => {
    expect(MAP_MAX_FRAME_M).toBe(60_000);
    expect(renderRouteMap(idx, frame, MAP_MAX_FRAME_M + 1, { w: 1000, h: 620 })).toBeNull();
    expect(renderRouteMap(idx, frame, MAP_MAX_FRAME_M, { w: 1000, h: 620 })).not.toBeNull();
  });
});
