/**
 * 126 — 동선 도식 뒤에 까는 일러스트풍 지도 층 (화면 부품).
 *
 * 계약: specs/126-route-map-illustration/contracts/day-map.md DM9·DM10
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 부품은 `RouteMap`(상자 안 정수 경로 문자열)만 안다** — 위경도·지도 파일은 모른다(`RouteMap` 타입은 `app/day-route.ts`가 다시
 * 내보낸다, DM16). `react-native-svg`의 `Svg`(viewBox = `map.box`)로 바탕·면·선을 평평하게 그린다: 모서리 반경·그림자·그라데이션이
 * 없다(Modernist). 색은 토큰 `MAP_COLORS`만 쓴다. 낭독에서 숨긴다(DU5) — 도식 한 요소가 「N곳」을 말하고 범례가 읽힌다.
 *
 * 굵기는 경로 상자 단위다(상자가 `Svg` 크기로 늘어난다). 작은 길·중간 길은 큰 길 굵기에 비례한다 — 비율은 사람이 정한 값이다(모형).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { StyleSheet } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import type { RouteMap } from "../app/day-route";
import { COLORS, MAP_COLORS } from "./theme/tokens";

/** 큰 길 굵기에 대한 중간 길(2·3차)·작은 길(골목)의 비율. 사람이 정한 값 — 모형에서 정했다 */
export const ROAD_WIDTH_RATIO = { mid: 0.7, minor: 0.45 } as const;
/** 철도 선 굵기(경로 상자 단위)와 점선. 사람이 정한 값 */
const RAIL_STROKE = 4;

export function RouteMapLayer({ map }: { map: RouteMap }) {
  const { box, roadWidth } = map;
  return (
    <Svg
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      height="100%"
      pointerEvents="none"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}
      testID="day-route-map"
      viewBox={`0 0 ${box.w} ${box.h}`}
      width="100%"
    >
      <Rect fill={MAP_COLORS.mapLand} height={box.h} width={box.w} x={0} y={0} />
      {map.park !== "" && (
        <Path d={map.park} fill={MAP_COLORS.mapPark} fillRule="nonzero" testID="map-park" />
      )}
      {map.water !== "" && (
        <Path d={map.water} fill={MAP_COLORS.mapWater} fillRule="nonzero" testID="map-water" />
      )}
      {map.river !== "" && (
        <Path
          d={map.river}
          fill="none"
          stroke={MAP_COLORS.mapWater}
          strokeWidth={roadWidth}
          testID="map-river"
        />
      )}
      {map.rail !== "" && (
        <Path
          d={map.rail}
          fill="none"
          opacity={0.5}
          stroke={COLORS.border}
          strokeDasharray="12 9"
          strokeWidth={RAIL_STROKE}
          testID="map-rail"
        />
      )}
      {map.roadMinor !== "" && (
        <Path
          d={map.roadMinor}
          fill="none"
          stroke={MAP_COLORS.mapRoad}
          strokeLinecap="butt"
          strokeWidth={roadWidth * ROAD_WIDTH_RATIO.minor}
          testID="map-road-minor"
        />
      )}
      {map.roadMid !== "" && (
        <Path
          d={map.roadMid}
          fill="none"
          stroke={MAP_COLORS.mapRoadMinor}
          strokeLinecap="butt"
          strokeWidth={roadWidth * ROAD_WIDTH_RATIO.mid}
          testID="map-road-mid"
        />
      )}
      {map.roadMajor !== "" && (
        <Path
          d={map.roadMajor}
          fill="none"
          stroke={MAP_COLORS.mapRoad}
          strokeLinecap="butt"
          strokeWidth={roadWidth}
          testID="map-road-major"
        />
      )}
    </Svg>
  );
}
