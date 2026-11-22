/**
 * 126 — 동선 지도의 「사람이 정한 값」과 지도 렌더 위임.
 *
 * 계약: specs/126-route-map-illustration/contracts/day-map.md DM8, research R6
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일의 값은 모두 **사람이 정한 값이다**(헌법 원칙 V, 측정이 아니다) — 모형(비공개 아티팩트 2026-11-22)에서 정했고
 * 실기기에서 손본다. 상세 정도 문턱·굵기 구간표·점 수 상한을 `src/map/render.ts`가 아니라 여기 두는 까닭은 `src/map/`이 순수 폴더로
 * `src/app/`을 import하지 않기 때문이다(DM16) — 값은 `renderMap`의 `options`로 넘어간다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { MapIndex, MapLayer } from "../map/map-file";
import { renderMap, type RenderFrame, type RouteMap } from "../map/render";

export type { RouteMap };

/** 이 폭(미터) 미만이면 골목·생활도로(L6)까지 그린다. 사람이 정한 값 — 모형에서 12km에 골목을 그리면 회색 덩어리가 됐다 */
export const DETAIL_FINE_BELOW_M = 3000;
/** 이 폭(미터) 이상이면 주요 도로(L4)까지만 그린다. 사람이 정한 값 — 37km 상자는 2차 도로까지 그리면 선이 너무 많다 */
export const DETAIL_COARSE_FROM_M = 15000;

/** 경로 점 수 합의 상한. 사람이 정한 값(처음 값 20,000) — 넘으면 작은 길부터 줄인다. 실기기 측정(T039) 뒤 손본다 */
export const MAX_PATH_POINTS = 20_000;

/**
 * 이 폭(미터)보다 넓은 프레임은 지도를 그리지 않는다(도식만, 125 모양). **사람이 정한 값이다** — 서울~부산급 4도 폭은 경로 문자열이 280만 자가 되어
 * 첫 쓴 날 지면에서 JS 스레드와 `react-native-svg`가 오래 막힌다(코드 리뷰, FR-009). 몇 개 도시를 오간 하루의 지도는 어차피 길이 안 읽힌다.
 */
export const MAP_MAX_FRAME_M = 60_000;

/** 상세 정도(층 목록)를 프레임 폭(미터)으로 정한다 */
export function layersForWidth(widthM: number): MapLayer[] {
  const base: MapLayer[] = ["water", "park", "rail", "river", "roadMajor"];
  if (widthM >= DETAIL_COARSE_FROM_M) return base;
  if (widthM >= DETAIL_FINE_BELOW_M) return [...base, "roadMid"];
  return [...base, "roadMid", "roadMinor"];
}

/**
 * 큰 길 굵기(경로 상자 단위, 폭 1000 기준). 사람이 정한 값 — 상자가 좁을수록 굵다. 모형의 320dp 폭 기준 7.5·5·3dp를
 * 1000단위로 환산한 값이다(24·16·9).
 */
export function roadWidthForWidth(widthM: number): number {
  if (widthM < 2000) return 24;
  if (widthM < 8000) return 16;
  return 9;
}

/** 프레임 폭에 맞는 층·굵기·점 수 상한으로 지도를 만든다. 그릴 것이 없으면 `null`(FR-007) */
export function renderRouteMap(
  index: MapIndex,
  frame: RenderFrame,
  widthM: number,
  box: { w: number; h: number },
): RouteMap | null {
  if (widthM > MAP_MAX_FRAME_M) return null;
  return renderMap(index, frame, {
    box,
    layers: layersForWidth(widthM),
    maxPathPoints: MAX_PATH_POINTS,
    roadWidth: roadWidthForWidth(widthM),
  });
}
