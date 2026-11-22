/**
 * 126 — 지도 도형을 `kr-map.bin` 형식으로 묶는다(데이터 만들기 전용).
 *
 * 계약: specs/126-route-map-illustration/contracts/map-file.md MP1~MP6, BM3
 * 형식 상수·가변 정수는 읽는 쪽(`src/map/map-file.ts`)과 같은 것을 쓴다. 같은 입력은 같은 바이트다(칸 번호·층 순서로 쓴다).
 */

import {
  MAP_CELL_E5,
  MAP_FILE_MAGIC,
  MAP_FILE_VERSION,
  MAP_HEADER_BYTES,
  MAP_LAYERS,
  MAP_LAYER_COUNT,
  encodeVarint,
  zigzagEncode,
  type CellLayers,
  type MapLayer,
  type MapShape,
} from "../../src/map/map-file.ts";

export type PackMapInput = {
  /** 격자의 서남쪽 모서리(1e-5도). 칸 크기의 배수여야 한다 */
  minLonE5: number;
  minLatE5: number;
  cols: number;
  rows: number;
  /** 칸 번호(행 × 열 수 + 열) → 층별 도형(칸 안 상대 좌표 0~10000). 없는 칸은 빈 칸이다 */
  cells: Map<number, CellLayers>;
};

function checkShape(shape: MapShape): void {
  if (shape.length < 4 || shape.length % 2 !== 0) throw new Error("지도 묶기: 도형은 점이 둘 이상이고 좌표 수가 짝수여야 한다");
  for (const v of shape) {
    if (!Number.isInteger(v) || v < 0 || v > MAP_CELL_E5) throw new Error(`지도 묶기: 칸 안 좌표는 0~${MAP_CELL_E5} 정수여야 한다: ${v}`);
  }
}

function encodeShape(shape: MapShape): number[] {
  checkShape(shape);
  const n = shape.length / 2;
  const out = encodeVarint(n);
  out.push(shape[0]! & 0xff, shape[0]! >> 8, shape[1]! & 0xff, shape[1]! >> 8);
  for (let i = 1; i < n; i++) {
    out.push(...encodeVarint(zigzagEncode(shape[i * 2]! - shape[(i - 1) * 2]!)));
    out.push(...encodeVarint(zigzagEncode(shape[i * 2 + 1]! - shape[(i - 1) * 2 + 1]!)));
  }
  return out;
}

function encodeLayer(shapes: readonly MapShape[] | undefined): number[] {
  if (shapes === undefined || shapes.length === 0) return [];
  const out = encodeVarint(shapes.length);
  for (const s of shapes) out.push(...encodeShape(s));
  return out;
}

export function packMapFile(input: PackMapInput): Uint8Array {
  const { minLonE5, minLatE5, cols, rows, cells } = input;
  if (minLonE5 % MAP_CELL_E5 !== 0 || minLatE5 % MAP_CELL_E5 !== 0) throw new Error("지도 묶기: 격자 원점이 칸 크기의 배수가 아니다");
  const total = cols * rows;
  for (const cell of cells.keys()) {
    if (!Number.isInteger(cell) || cell < 0 || cell >= total) throw new Error(`지도 묶기: 칸 번호가 격자 밖이다: ${cell}`);
  }

  // 칸 블록을 칸 번호 순으로 만든다
  const blocks: { cell: number; bytes: number[] }[] = [];
  for (const cell of [...cells.keys()].sort((a, b) => a - b)) {
    const layers = cells.get(cell)!;
    const encoded = MAP_LAYERS.map((layer) => encodeLayer(layers[layer]));
    if (encoded.every((e) => e.length === 0)) continue; // 비어 있으면 빈 칸(표 0)
    const head: number[] = [];
    for (const e of encoded) head.push(e.length & 0xff, (e.length >> 8) & 0xff, (e.length >> 16) & 0xff, (e.length >>> 24) & 0xff);
    const body = encoded.flat();
    blocks.push({ cell, bytes: [...head, ...body] });
  }

  const tableBytes = total * 4;
  let size = MAP_HEADER_BYTES + tableBytes;
  const offsets = new Map<number, number>();
  for (const b of blocks) {
    offsets.set(b.cell, size);
    size += b.bytes.length;
  }

  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  for (let i = 0; i < 4; i++) out[i] = MAP_FILE_MAGIC.charCodeAt(i);
  view.setUint16(4, MAP_FILE_VERSION, true);
  view.setUint16(6, MAP_LAYER_COUNT, true);
  view.setUint32(8, MAP_CELL_E5, true);
  view.setInt32(12, minLonE5, true);
  view.setInt32(16, minLatE5, true);
  view.setInt32(20, minLonE5 + cols * MAP_CELL_E5, true);
  view.setInt32(24, minLatE5 + rows * MAP_CELL_E5, true);
  view.setUint16(28, cols, true);
  view.setUint16(30, rows, true);
  for (const [cell, offset] of offsets) view.setUint32(MAP_HEADER_BYTES + cell * 4, offset, true);
  for (const b of blocks) out.set(b.bytes, offsets.get(b.cell)!);
  return out;
}

/** 층별로 칸 블록에 들어가는 바이트 합(기록용, 헤더·칸 표 제외) */
export function layerByteTotals(cells: Map<number, CellLayers>): Record<MapLayer, number> {
  const totals = Object.fromEntries(MAP_LAYERS.map((l) => [l, 0])) as Record<MapLayer, number>;
  for (const layers of cells.values()) {
    for (const layer of MAP_LAYERS) totals[layer] += encodeLayer(layers[layer]).length;
  }
  return totals;
}
