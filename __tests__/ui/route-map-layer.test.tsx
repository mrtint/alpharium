/**
 * 126 — 지도 층 (화면 부품 `RouteMapLayer`, contracts/day-map.md DM9·DM10·DU5).
 *
 * `RouteMap`(상자 안 정수 경로)만 받아 `react-native-svg`로 평평한 색 면·선을 그린다. 색은 토큰만, 모서리 반경·그림자·그라데이션이 없다.
 * ⚠️ RNTL 14의 `render`는 Promise다 — `await`한다.
 */

import { render, screen } from "@testing-library/react-native";
import { processColor } from "react-native";

import type { RouteMap } from "../../src/app/day-route";
import { ROAD_WIDTH_RATIO, RouteMapLayer } from "../../src/ui/RouteMapLayer";
import { COLORS, MAP_COLORS } from "../../src/ui/theme/tokens";

const MAP: RouteMap = {
  box: { w: 1000, h: 620 },
  water: "M0 0L500 0L500 300L0 0Z",
  park: "M600 100L900 100L900 300L600 100Z",
  rail: "M0 500L1000 500",
  river: "M0 400L1000 420",
  roadMajor: "M0 620L1000 0",
  roadMid: "M0 300L1000 320",
  roadMinor: "M100 100L200 200",
  roadWidth: 16,
};

const HIDDEN = { includeHiddenElements: true } as const;
const get = (id: string) => screen.getByTestId(id, HIDDEN);
const maybe = (id: string) => screen.queryByTestId(id, HIDDEN);
/** react-native-svg는 색을 `{ type: 0, payload: ARGB }`로 바꿔 네이티브에 넘긴다 */
const colorOf = (hex: string) => ({ type: 0, payload: processColor(hex) });
/** react-native-svg의 채우기 규칙 코드 — evenodd가 0, nonzero가 1이다 */
const FILL_RULE_NONZERO = 1;

describe("126 RouteMapLayer", () => {
  it("DM10 — 일곱 경로를 그리고 경로 문자열을 그대로 쓴다", async () => {
    await render(<RouteMapLayer map={MAP} />);
    expect(get("map-water").props.d).toBe(MAP.water);
    expect(get("map-park").props.d).toBe(MAP.park);
    expect(get("map-river").props.d).toBe(MAP.river);
    expect(get("map-rail").props.d).toBe(MAP.rail);
    expect(get("map-road-major").props.d).toBe(MAP.roadMajor);
    expect(get("map-road-mid").props.d).toBe(MAP.roadMid);
    expect(get("map-road-minor").props.d).toBe(MAP.roadMinor);
  });

  it("DM10 — 상자(viewBox)는 map.box다", async () => {
    await render(<RouteMapLayer map={MAP} />);
    const svg = get("day-route-map");
    expect([svg.props.minX, svg.props.minY, svg.props.vbWidth, svg.props.vbHeight]).toEqual([
      0, 0, 1000, 620,
    ]);
  });

  it("DM10 — 색은 지도 토큰만 쓴다(바탕·물·공원·길)", async () => {
    await render(<RouteMapLayer map={MAP} />);
    expect(get("map-water").props.fill).toEqual(colorOf(MAP_COLORS.mapWater));
    expect(get("map-park").props.fill).toEqual(colorOf(MAP_COLORS.mapPark));
    expect(get("map-road-major").props.stroke).toEqual(colorOf(MAP_COLORS.mapRoad));
    expect(get("map-road-minor").props.stroke).toEqual(colorOf(MAP_COLORS.mapRoad));
    expect(get("map-road-mid").props.stroke).toEqual(colorOf(MAP_COLORS.mapRoadMinor));
    expect(get("map-river").props.stroke).toEqual(colorOf(MAP_COLORS.mapWater));
    expect(get("map-rail").props.stroke).toEqual(colorOf(COLORS.border));
  });

  it("DM10 — 면은 비영(nonzero)으로 채운다 — 바깥 고리 반시계·구멍 시계로 맞춰 둔 파일이라 겹친 면이 구멍이 되지 않는다", async () => {
    await render(<RouteMapLayer map={MAP} />);
    expect(get("map-water").props.fillRule).toBe(FILL_RULE_NONZERO);
    expect(get("map-park").props.fillRule).toBe(FILL_RULE_NONZERO);
  });

  it("굵기는 큰 길 기준으로 중간 길·작은 길이 비례해 가늘다", async () => {
    await render(<RouteMapLayer map={MAP} />);
    expect(get("map-road-major").props.strokeWidth).toBe(16);
    expect(get("map-road-mid").props.strokeWidth).toBeCloseTo(16 * ROAD_WIDTH_RATIO.mid, 5);
    expect(get("map-road-minor").props.strokeWidth).toBeCloseTo(16 * ROAD_WIDTH_RATIO.minor, 5);
  });

  it("빈 경로는 그리지 않는다", async () => {
    await render(<RouteMapLayer map={{ ...MAP, water: "", rail: "", roadMinor: "" }} />);
    expect(maybe("map-water")).toBeNull();
    expect(maybe("map-rail")).toBeNull();
    expect(maybe("map-road-minor")).toBeNull();
    expect(get("map-road-major")).toBeTruthy();
  });

  it("DU5 — 낭독에서 숨긴다", async () => {
    await render(<RouteMapLayer map={MAP} />);
    const svg = get("day-route-map");
    expect(svg.props.accessibilityElementsHidden).toBe(true);
    expect(svg.props.importantForAccessibility).toBe("no-hide-descendants");
  });

  it("반경·그림자·그라데이션이 없다 — 지도 층 어디에도 borderRadius·shadow·Gradient 키가 없다", async () => {
    await render(<RouteMapLayer map={MAP} />);
    const json = JSON.stringify(screen.toJSON());
    expect(json).not.toMatch(/borderRadius|shadow|LinearGradient|RadialGradient|rx":/i);
  });
});
