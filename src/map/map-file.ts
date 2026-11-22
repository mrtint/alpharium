/**
 * 126 — 동선 지도 파일(`assets/map/kr-map.bin`)을 읽는 순수 파서.
 *
 * 계약: specs/126-route-map-illustration/contracts/map-file.md MP1~MP10
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **순수 모듈이다** — 바이트를 받아 색인을 돌려줄 뿐 기기·파일에 닿지 못한다. 바이트를 얻는 일은 `map-port.ts`가 하고, 그림용
 * 경로로 바꾸는 일은 `render.ts`가 한다. 데이터를 만드는 `scripts/map/pack.ts`가 이 파일의 형식 상수·가변 정수를 함께 쓴다
 * (형식이 한 곳에만 있다).
 *
 * **import가 없다**(MP7) — Node 스크립트가 타입 제거만으로 이 파일을 그대로 읽는다(`place-index.ts`와 같은 방식).
 *
 * 형식(리틀엔디안):
 *   헤더 32바이트: 매직 "MAP1"(4) · 버전 u16 · 층 수 u16 · 칸 크기 u32 · 서·남·동·북 경계 i32×4 · 열 수 u16 · 행 수 u16
 *   칸 표: `cols × rows`개 u32(파일 처음부터의 위치, 0이면 빈 칸). 칸 번호 = 행 × 열 수 + 열, 열은 서→동, 행은 남→북
 *   칸 블록: 층 길이 u32 × 7 뒤에 층 블록들. 층 블록: 도형 수(가변 정수) 뒤에 도형들.
 *   도형: 점 수(가변 정수) · 첫 점 x u16·y u16(칸 안 상대, 1e-5도) · 이어서 이전 점과의 차 dx·dy(zigzag 가변 정수)
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const MAP_FILE_MAGIC = "MAP1";
export const MAP_FILE_VERSION = 1;
export const MAP_HEADER_BYTES = 32;
/** 칸 한 변 — 1e-5도 단위로 10,000(0.1도) */
export const MAP_CELL_E5 = 10_000;

/**
 * 번들 지도 파일의 크기 상한(바이트). **사람이 정한 값이다**(헌법 원칙 V, 측정이 아니다) — 처음 값은 장소 파일(`kr-places.bin`)과
 * 같은 10MB다. 첫 실제 빌드(T012)를 보고 소유자와 정해 줄인다. 빌드(`build-map.mts`)와 번들 계약 테스트가 같이 읽는다.
 */
export const MAP_MAX_BYTES = 10_000_000;

/** 층. 배열의 자리가 파일의 층 코드다(L0~L6, MP5) */
export const MAP_LAYERS = [
  "water",
  "park",
  "rail",
  "river",
  "roadMajor",
  "roadMid",
  "roadMinor",
] as const;
export type MapLayer = (typeof MAP_LAYERS)[number];
export const MAP_LAYER_COUNT = MAP_LAYERS.length;

/** 칸 안 도형 — 평평한 `[x0, y0, x1, y1, …]`(칸 안 상대 좌표, 0~10000) */
export type MapShape = number[];
export type CellLayers = Partial<Record<MapLayer, MapShape[]>>;

export type MapIndex = {
  bytes: Uint8Array;
  view: DataView;
  cellE5: number;
  minLonE5: number;
  minLatE5: number;
  maxLonE5: number;
  maxLatE5: number;
  cols: number;
  rows: number;
};

// ─── 가변 정수·zigzag ────────────────────────────────────────────────────────

/** 0 이상의 정수를 가변 정수 바이트로(7비트씩, 이어지면 최상위 비트 1). 32비트 부호 연산을 쓰지 않는다 */
export function encodeVarint(value: number): number[] {
  if (!Number.isInteger(value) || value < 0)
    throw new Error(`가변 정수는 0 이상의 정수여야 한다: ${value}`);
  const out: number[] = [];
  let v = value;
  while (v >= 0x80) {
    out.push((v % 0x80) | 0x80);
    v = Math.floor(v / 0x80);
  }
  out.push(v);
  return out;
}

/** `[값, 다음 위치]`. 끝나지 않으면 던진다 */
export function decodeVarint(bytes: Uint8Array, pos: number): [number, number] {
  let value = 0;
  let scale = 1;
  let p = pos;
  for (;;) {
    if (p >= bytes.length) throw new Error("지도 파일: 가변 정수가 끝나지 않는다");
    const b = bytes[p]!;
    p += 1;
    value += (b & 0x7f) * scale;
    if ((b & 0x80) === 0) return [value, p];
    scale *= 0x80;
    if (scale > 2 ** 35) throw new Error("지도 파일: 가변 정수가 너무 길다");
  }
}

export function zigzagEncode(n: number): number {
  return n >= 0 ? n * 2 : -n * 2 - 1;
}

export function zigzagDecode(z: number): number {
  return z % 2 === 0 ? z / 2 : -(z + 1) / 2;
}

// ─── 파서 ────────────────────────────────────────────────────────────────────

/** MP8 — 매직·버전·층 수가 다르거나 헤더·칸 표가 파일 밖이면 던진다. 받는 쪽이 「지도 없음」으로 접는다 */
export function parseMapFile(bytes: Uint8Array): MapIndex {
  if (bytes.length < MAP_HEADER_BYTES) throw new Error("지도 파일: 헤더가 잘렸다");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== MAP_FILE_MAGIC.charCodeAt(i)) throw new Error("지도 파일: 매직이 다르다");
  }
  if (view.getUint16(4, true) !== MAP_FILE_VERSION) throw new Error("지도 파일: 버전이 다르다");
  if (view.getUint16(6, true) !== MAP_LAYER_COUNT) throw new Error("지도 파일: 층 수가 다르다");
  const cellE5 = view.getUint32(8, true);
  const minLonE5 = view.getInt32(12, true);
  const minLatE5 = view.getInt32(16, true);
  const maxLonE5 = view.getInt32(20, true);
  const maxLatE5 = view.getInt32(24, true);
  const cols = view.getUint16(28, true);
  const rows = view.getUint16(30, true);
  if (cellE5 <= 0 || cols === 0 || rows === 0)
    throw new Error("지도 파일: 격자 크기가 맞지 않는다");
  if (MAP_HEADER_BYTES + cols * rows * 4 > bytes.length)
    throw new Error("지도 파일: 칸 표가 잘렸다");
  return { bytes, view, cellE5, minLonE5, minLatE5, maxLonE5, maxLatE5, cols, rows };
}

/** 위경도(1e-5도)가 든 칸 번호. 파일 범위 밖이면 `null` */
export function cellOf(index: MapIndex, lonE5: number, latE5: number): number | null {
  if (
    lonE5 < index.minLonE5 ||
    lonE5 >= index.maxLonE5 ||
    latE5 < index.minLatE5 ||
    latE5 >= index.maxLatE5
  ) {
    return null;
  }
  const col = Math.floor((lonE5 - index.minLonE5) / index.cellE5);
  const row = Math.floor((latE5 - index.minLatE5) / index.cellE5);
  return row * index.cols + col;
}

/** 위경도 범위(1e-5도)가 닿는 칸의 열·행 범위(양끝 포함). 파일과 전혀 겹치지 않으면 `null` */
export function cellRange(
  index: MapIndex,
  minLonE5: number,
  minLatE5: number,
  maxLonE5: number,
  maxLatE5: number,
): { c0: number; c1: number; r0: number; r1: number } | null {
  if (
    maxLonE5 < index.minLonE5 ||
    minLonE5 >= index.maxLonE5 ||
    maxLatE5 < index.minLatE5 ||
    minLatE5 >= index.maxLatE5
  ) {
    return null;
  }
  const clamp = (v: number, hi: number) => Math.min(hi, Math.max(0, v));
  return {
    c0: clamp(Math.floor((minLonE5 - index.minLonE5) / index.cellE5), index.cols - 1),
    c1: clamp(Math.floor((maxLonE5 - index.minLonE5) / index.cellE5), index.cols - 1),
    r0: clamp(Math.floor((minLatE5 - index.minLatE5) / index.cellE5), index.rows - 1),
    r1: clamp(Math.floor((maxLatE5 - index.minLatE5) / index.cellE5), index.rows - 1),
  };
}

/** 칸의 서남쪽 모서리(1e-5도) */
export function cellOrigin(index: MapIndex, cell: number): { lonE5: number; latE5: number } {
  const col = cell % index.cols;
  const row = Math.floor(cell / index.cols);
  return { lonE5: index.minLonE5 + col * index.cellE5, latE5: index.minLatE5 + row * index.cellE5 };
}

/**
 * 칸의 요청한 층만 해석한다(MP9). 빈 칸·없는 층은 키가 없고, 파일 밖 칸 번호는 던지지 않고 빈 객체다.
 * 블록이 파일 밖으로 나가면 던진다(MP8).
 */
export function readCellLayers(
  index: MapIndex,
  cell: number,
  layers: readonly MapLayer[],
): CellLayers {
  const out: CellLayers = {};
  if (!Number.isInteger(cell) || cell < 0 || cell >= index.cols * index.rows) return out;
  const offset = index.view.getUint32(MAP_HEADER_BYTES + cell * 4, true);
  if (offset === 0) return out;
  const { bytes, view } = index;
  if (offset + MAP_LAYER_COUNT * 4 > bytes.length)
    throw new Error("지도 파일: 칸 블록이 파일 밖이다");
  const lengths: number[] = [];
  for (let i = 0; i < MAP_LAYER_COUNT; i++) lengths.push(view.getUint32(offset + i * 4, true));
  let start = offset + MAP_LAYER_COUNT * 4;
  for (let i = 0; i < MAP_LAYER_COUNT; i++) {
    const len = lengths[i]!;
    const layer = MAP_LAYERS[i]!;
    const end = start + len;
    if (end > bytes.length) throw new Error("지도 파일: 층 블록이 파일 밖이다");
    if (len > 0 && layers.includes(layer)) out[layer] = readLayerBlock(bytes, start, end);
    start = end;
  }
  return out;
}

function readLayerBlock(bytes: Uint8Array, start: number, end: number): MapShape[] {
  let pos = start;
  let count: number;
  [count, pos] = decodeVarint(bytes, pos);
  const shapes: MapShape[] = [];
  for (let s = 0; s < count; s++) {
    let n: number;
    [n, pos] = decodeVarint(bytes, pos);
    if (pos + 4 > end) throw new Error("지도 파일: 도형이 층 블록 밖이다");
    let x = bytes[pos]! | (bytes[pos + 1]! << 8);
    let y = bytes[pos + 2]! | (bytes[pos + 3]! << 8);
    pos += 4;
    const shape: MapShape = [x, y];
    for (let i = 1; i < n; i++) {
      let dx: number;
      let dy: number;
      [dx, pos] = decodeVarint(bytes, pos);
      [dy, pos] = decodeVarint(bytes, pos);
      x += zigzagDecode(dx);
      y += zigzagDecode(dy);
      shape.push(x, y);
    }
    if (pos > end) throw new Error("지도 파일: 도형이 층 블록 밖이다");
    shapes.push(shape);
  }
  return shapes;
}
