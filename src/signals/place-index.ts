/**
 * 121 — 장소 데이터 파일(`assets/places/kr-places.bin`)을 읽어 조회할 수 있게 한다.
 *
 * 계약: specs/121-richer-day-places/contracts/place-index.md 「파일 형식」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **순수 모듈이다** — 바이트를 받아 색인을 돌려줄 뿐 기기·파일에 닿지 않는다. 바이트를 얻는 일은
 * `place-index-port.ts`, 이름을 고르는 일은 `place-names.ts`가 한다. 데이터를 만드는
 * `scripts/places/pack.ts`가 이 파일의 형식 상수를 함께 쓴다(형식이 한 곳에만 있다).
 *
 * **import가 없다** — Node 스크립트가 타입 제거만으로 이 파일을 그대로 읽는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 장소의 종류. 배열의 자리가 파일의 범주 코드다(0~7, IX3) */
export const PLACE_CATEGORIES = [
  "station",
  "landmark",
  "park",
  "mall",
  "institution",
  "building",
  "residential",
  "locality",
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export const PLACE_FILE_MAGIC = "PLC1";
export const PLACE_FILE_VERSION = 1;
export const PLACE_HEADER_BYTES = 16;
export const PLACE_ENTRY_BYTES = 20;
/** 이름 바이트 상한(표의 `nameLen`이 u8이다) */
export const MAX_NAME_BYTES = 255;
/** 좌표 단위 — 1e-5도(약 1.1m) */
export const E5 = 100_000;
export const FLAG_BOX = 1;
export const FLAG_POLYGON = 2;

/** 격자 한 칸 = 0.01도(1e-5도 단위로 1000) */
const CELL_E5 = 1000;
/** 이보다 많은 칸을 덮는 장소는 「큰 것」 목록에 따로 둔다(R4) */
const LARGE_CELLS = 64;

export type PlaceIndex = {
  count: number;
  latE5: Int32Array;
  lonE5: Int32Array;
  categoryOf(i: number): PlaceCategory;
  nameOf(i: number): string;
  hasPolygon(i: number): boolean;
  /** 경계가 있는 장소의 안에 있는가. 다각형이 있으면 다각형으로, 상자만 있으면 상자로 가른다. 경계가 없으면 false */
  contains(i: number, latE5: number, lonE5: number): boolean;
  /** 경계 상자 넓이(1e-5도²) — 크기 비교에만 쓴다. 경계가 없으면 0 */
  boxArea(i: number): number;
  /** 점 주변 (2r+1)² 칸과 「큰 것」 목록의 장소 번호(중복 없음) */
  candidates(latE5: number, lonE5: number, radiusCells: number): number[];
};

function cellOf(latE5: number, lonE5: number): number {
  return Math.floor(latE5 / CELL_E5) * 100_000 + Math.floor(lonE5 / CELL_E5);
}

/** 짧은 이름만 다루는 UTF-8 해석기 — Hermes의 `TextDecoder` 유무에 기대지 않는다 */
function decodeUtf8(bytes: Uint8Array, start: number, length: number): string {
  let out = "";
  let i = start;
  const end = start + length;
  while (i < end) {
    const b = bytes[i];
    let code: number;
    if (b < 0x80) {
      code = b;
      i += 1;
    } else if (b < 0xe0) {
      code = ((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f);
      i += 2;
    } else if (b < 0xf0) {
      code = ((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f);
      i += 3;
    } else {
      code =
        ((b & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      i += 4;
    }
    out += String.fromCodePoint(code);
  }
  return out;
}

/**
 * 파일 바이트를 색인으로 만든다.
 *
 * **머리·길이가 맞지 않으면 던진다**(IX1) — 부르는 쪽(`place-names.ts`)이 잡아 이름을 「모름」으로 접는다.
 */
export function parsePlaceIndex(bytes: Uint8Array): PlaceIndex {
  if (bytes.length < PLACE_HEADER_BYTES) throw new Error("장소 데이터가 너무 짧다");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (magic !== PLACE_FILE_MAGIC) throw new Error("장소 데이터의 머리가 다르다");
  if (view.getUint32(4, true) !== PLACE_FILE_VERSION) throw new Error("장소 데이터의 판이 다르다");

  const count = view.getUint32(8, true);
  const namesBytes = view.getUint32(12, true);
  const namesStart = PLACE_HEADER_BYTES + count * PLACE_ENTRY_BYTES;
  const geomStart = namesStart + namesBytes;
  if (geomStart > bytes.length) throw new Error("장소 데이터의 길이가 맞지 않는다");

  const latE5 = new Int32Array(count);
  const lonE5 = new Int32Array(count);
  const category = new Uint8Array(count);
  const flags = new Uint8Array(count);
  const nameLen = new Uint8Array(count);
  const nameOffset = new Uint32Array(count);
  const geomOffset = new Uint32Array(count);
  const box = new Int32Array(count * 4);

  const cells = new Map<number, number[]>();
  const large: number[] = [];
  const push = (cell: number, i: number) => {
    const list = cells.get(cell);
    if (list === undefined) cells.set(cell, [i]);
    else list.push(i);
  };

  for (let i = 0; i < count; i += 1) {
    const at = PLACE_HEADER_BYTES + i * PLACE_ENTRY_BYTES;
    latE5[i] = view.getInt32(at, true);
    lonE5[i] = view.getInt32(at + 4, true);
    nameOffset[i] = view.getUint32(at + 8, true);
    geomOffset[i] = view.getUint32(at + 12, true);
    nameLen[i] = view.getUint8(at + 16);
    category[i] = view.getUint8(at + 17);
    flags[i] = view.getUint8(at + 18);
    if (category[i] >= PLACE_CATEGORIES.length) throw new Error("장소 데이터의 범주가 잘못됐다");

    if ((flags[i] & FLAG_BOX) !== 0) {
      const g = geomStart + geomOffset[i];
      if (g + 16 > bytes.length) throw new Error("장소 데이터의 도형이 잘렸다");
      for (let k = 0; k < 4; k += 1) box[i * 4 + k] = view.getInt32(g + k * 4, true);
      const lat0 = Math.floor(box[i * 4] / CELL_E5);
      const lon0 = Math.floor(box[i * 4 + 1] / CELL_E5);
      const lat1 = Math.floor(box[i * 4 + 2] / CELL_E5);
      const lon1 = Math.floor(box[i * 4 + 3] / CELL_E5);
      if ((lat1 - lat0 + 1) * (lon1 - lon0 + 1) > LARGE_CELLS) {
        large.push(i);
      } else {
        for (let a = lat0; a <= lat1; a += 1) {
          for (let b = lon0; b <= lon1; b += 1) push(a * 100_000 + b, i);
        }
      }
    } else {
      push(cellOf(latE5[i], lonE5[i]), i);
    }
  }

  const inBox = (i: number, la: number, lo: number) =>
    la >= box[i * 4] && la <= box[i * 4 + 2] && lo >= box[i * 4 + 1] && lo <= box[i * 4 + 3];

  return {
    count,
    latE5,
    lonE5,
    categoryOf: (i) => PLACE_CATEGORIES[category[i]],
    nameOf: (i) => decodeUtf8(bytes, namesStart + nameOffset[i], nameLen[i]),
    hasPolygon: (i) => (flags[i] & FLAG_POLYGON) !== 0,
    boxArea: (i) =>
      (flags[i] & FLAG_BOX) === 0
        ? 0
        : (box[i * 4 + 2] - box[i * 4]) * (box[i * 4 + 3] - box[i * 4 + 1]),
    contains(i, la, lo) {
      if ((flags[i] & FLAG_BOX) === 0) return false;
      if (!inBox(i, la, lo)) return false;
      if ((flags[i] & FLAG_POLYGON) === 0) return true;
      // 모든 고리(바깥·구멍·조각)에 대한 짝홀 판정 — 구멍 안은 저절로 밖이다. 꼭짓점은 장소 좌표에서의 차이(int16)다.
      let g = geomStart + geomOffset[i] + 16;
      const ringCount = view.getUint16(g, true);
      g += 2;
      let inside = false;
      for (let r = 0; r < ringCount; r += 1) {
        const n = view.getUint16(g, true);
        g += 2;
        let py = latE5[i] + view.getInt16(g + (n - 1) * 4, true);
        let px = lonE5[i] + view.getInt16(g + (n - 1) * 4 + 2, true);
        for (let k = 0; k < n; k += 1) {
          const y = latE5[i] + view.getInt16(g + k * 4, true);
          const x = lonE5[i] + view.getInt16(g + k * 4 + 2, true);
          if (y > la !== py > la && lo < ((px - x) * (la - y)) / (py - y) + x) inside = !inside;
          py = y;
          px = x;
        }
        g += n * 4;
      }
      return inside;
    },
    candidates(la, lo, r) {
      const seen = new Set<number>();
      const cLat = Math.floor(la / CELL_E5);
      const cLon = Math.floor(lo / CELL_E5);
      for (let a = cLat - r; a <= cLat + r; a += 1) {
        for (let b = cLon - r; b <= cLon + r; b += 1) {
          const list = cells.get(a * 100_000 + b);
          if (list !== undefined) for (const i of list) seen.add(i);
        }
      }
      for (const i of large) seen.add(i);
      return [...seen];
    },
  };
}
