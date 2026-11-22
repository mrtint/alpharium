/**
 * 126 — 지도 파일의 칸을 도식 상자의 **상대 경로 문자열**로 바꾼다(순수).
 *
 * 계약: specs/126-route-map-illustration/contracts/day-map.md DM8·DM8a~DM8c, DM6
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 입력은 프레임의 위경도 범위와 투영 함수(`app/day-route.ts`가 만든다 — 위경도 → 상자 0~1)이고, 출력 `RouteMap`에는 위도·경도가
 * 없다: 경로 문자열은 상자(`box`) 안의 정수 좌표뿐이다. 화면은 이 문자열과 굵기만 받아 그린다.
 *
 * **이 파일은 `src/app/`을 import하지 않는다** — 상세 정도 문턱·굵기 구간표 같은 「사람이 정한 값」은 `app/day-map.ts`가 갖고
 * `options`로 넘긴다. 기기·파일·시각·네트워크를 읽지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  cellOrigin,
  cellRange,
  readCellLayers,
  type CellLayers,
  type MapIndex,
  type MapLayer,
} from "./map-file";

/** 화면이 받는 지도. 위경도가 없다 — 경로는 `box` 안의 정수 좌표다 */
export type RouteMap = {
  box: { w: number; h: number };
  water: string;
  park: string;
  rail: string;
  river: string;
  roadMajor: string;
  roadMid: string;
  roadMinor: string;
  /** 상자 단위의 큰 길 굵기(작은 길·철도 굵기는 그림이 이 값에서 정한다) */
  roadWidth: number;
};

export type RenderFrame = {
  /** 프레임이 닿는 위경도 범위(1e-5도) */
  minLonE5: number;
  minLatE5: number;
  maxLonE5: number;
  maxLatE5: number;
  /** 위경도(도) → 상자 상대 위치. x는 폭 기준, y는 높이 기준 0~1(북쪽이 위라 위도가 클수록 y가 작다) */
  project: (latDeg: number, lonDeg: number) => { x: number; y: number };
};

export type RenderOptions = {
  box: { w: number; h: number };
  /** 그릴 층(상세 정도) */
  layers: readonly MapLayer[];
  /** 모든 경로의 점 수 합 상한 — 넘으면 작은 길부터 한 단계씩 줄여 다시 만든다(DM8c) */
  maxPathPoints: number;
  roadWidth: number;
};

const AREA_LAYERS: readonly MapLayer[] = ["water", "park"];
/**
 * 점 수가 상한을 넘을 때 먼저 버리는 순서. 작은 길부터, 물·강(해안선 포함)은 마지막까지 남긴다. **사람이 정한 값이다** — 넓은 프레임에서 경로
 * 문자열이 수백만 자가 되어 JS 스레드와 `react-native-svg`를 막는 것을 막는다(코드 리뷰, FR-009).
 */
const DROP_ORDER: readonly MapLayer[] = ["roadMinor", "roadMid", "park", "rail", "roadMajor"];

const EMPTY: Omit<RouteMap, "box" | "roadWidth"> = {
  water: "",
  park: "",
  rail: "",
  river: "",
  roadMajor: "",
  roadMid: "",
  roadMinor: "",
};

export function renderMap(
  index: MapIndex,
  frame: RenderFrame,
  options: RenderOptions,
): RouteMap | null {
  const range = cellRange(index, frame.minLonE5, frame.minLatE5, frame.maxLonE5, frame.maxLatE5);
  if (range === null) return null;

  // 필요한 칸을 한 번만 읽는다(요청한 층 전부)
  const cells: { origin: { lonE5: number; latE5: number }; layers: CellLayers }[] = [];
  for (let r = range.r0; r <= range.r1; r++) {
    for (let c = range.c0; c <= range.c1; c++) {
      const cell = r * index.cols + c;
      const layers = readCellLayers(index, cell, options.layers);
      if (Object.keys(layers).length > 0) cells.push({ origin: cellOrigin(index, cell), layers });
    }
  }
  if (cells.length === 0) return null;

  // **경로 문자열을 만들기 전에** 층별 점 수를 세어 상한 안에 들 때까지 층을 버린다(DM8c). 만든 뒤에 재면 비용은 이미 낸 뒤다.
  // 센 값은 칸 안 전체 점이라 프레임 밖 점도 포함한다 — 읽은 칸만큼이 비용의 상한이다.
  const counts = new Map<MapLayer, number>(options.layers.map((l) => [l, rawPoints(cells, l)]));
  const active = [...options.layers];
  const total = () => active.reduce((sum, l) => sum + (counts.get(l) ?? 0), 0);
  while (total() > options.maxPathPoints) {
    const drop = DROP_ORDER.find((l) => active.includes(l));
    if (drop === undefined) break; // 더 줄일 층이 없다 — 있는 그대로
    active.splice(active.indexOf(drop), 1);
  }
  return finish(build(cells, active, frame, options.box), options);
}

function rawPoints(cells: { layers: CellLayers }[], layer: MapLayer): number {
  let n = 0;
  for (const cell of cells) for (const shape of cell.layers[layer] ?? []) n += shape.length / 2;
  return n;
}

function finish(paths: Partial<Record<MapLayer, string>>, options: RenderOptions): RouteMap | null {
  const map: RouteMap = { box: options.box, ...EMPTY, roadWidth: options.roadWidth };
  let any = false;
  for (const layer of Object.keys(paths) as MapLayer[]) {
    const d = paths[layer] ?? "";
    if (d !== "") any = true;
    map[layer] = d;
  }
  return any ? map : null;
}

function build(
  cells: { origin: { lonE5: number; latE5: number }; layers: CellLayers }[],
  layers: readonly MapLayer[],
  frame: RenderFrame,
  box: { w: number; h: number },
): Partial<Record<MapLayer, string>> {
  const paths: Partial<Record<MapLayer, string>> = {};
  for (const layer of layers) {
    const area = AREA_LAYERS.includes(layer);
    let d = "";
    for (const cell of cells) {
      for (const shape of cell.layers[layer] ?? []) {
        const xs: number[] = [];
        const ys: number[] = [];
        for (let i = 0; i < shape.length; i += 2) {
          const p = frame.project(
            (cell.origin.latE5 + shape[i + 1]!) / 1e5,
            (cell.origin.lonE5 + shape[i]!) / 1e5,
          );
          const x = Math.round(p.x * box.w);
          const y = Math.round(p.y * box.h);
          const n = xs.length;
          if (n > 0 && xs[n - 1] === x && ys[n - 1] === y) continue; // 정수로 바꾸면 같아진 이웃 점
          xs.push(x);
          ys.push(y);
        }
        if (xs.length < (area ? 3 : 2)) continue;
        // 상자 밖(경계 위 포함)에만 있는 도형은 버린다(걸친 도형은 둔다 — `Svg`가 자른다)
        if (
          xs.every((x) => x <= 0) ||
          xs.every((x) => x >= box.w) ||
          ys.every((y) => y <= 0) ||
          ys.every((y) => y >= box.h)
        )
          continue;
        d += `M${xs[0]} ${ys[0]}`;
        for (let i = 1; i < xs.length; i++) d += `L${xs[i]} ${ys[i]}`;
        if (area) d += "Z";
      }
    }
    paths[layer] = d;
  }
  return paths;
}
