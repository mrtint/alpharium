/**
 * 121 — 장소 목록을 `kr-places.bin` 형식으로 묶는다(데이터 만들기 전용).
 *
 * 계약: specs/121-richer-day-places/contracts/place-index.md 「파일 형식」
 * 형식 상수는 읽는 쪽(`src/signals/place-index.ts`)과 같은 것을 쓴다.
 */

import {
  E5,
  FLAG_BOX,
  MAX_NAME_BYTES,
  FLAG_POLYGON,
  PLACE_CATEGORIES,
  PLACE_ENTRY_BYTES,
  PLACE_FILE_MAGIC,
  PLACE_FILE_VERSION,
  PLACE_HEADER_BYTES,
  type PlaceCategory,
} from "../../src/signals/place-index.ts";

export type PackPlace = {
  lat: number;
  lon: number;
  category: PlaceCategory;
  name: string;
  /** 닫힌 고리 하나 `[위도, 경도][]`(도) — `rings: [ring]`의 줄임 */
  ring?: [number, number][];
  /**
   * 닫힌 고리들(바깥 고리·구멍·여러 조각 모두). 안·밖은 모든 고리에 대한 짝홀 판정이라 구멍은 저절로 밖이 된다
   * (여의도한강공원처럼 섬을 비운 공원 — 바깥 고리만 담으면 섬 전체가 공원 안이 됐다).
   */
  rings?: [number, number][][];
  /** 참이면 경계 상자만 담고 꼭짓점은 버린다 */
  boxOnly?: boolean;
};

const I16_MIN = -32768;
const I16_MAX = 32767;

/** 글자 경계를 지키며 UTF-8 255바이트 안으로 자른다 */
function encodeName(encoder: TextEncoder, name: string): Uint8Array {
  let chars = [...name];
  let bytes = encoder.encode(name);
  while (bytes.length > MAX_NAME_BYTES) {
    chars = chars.slice(0, -1);
    bytes = encoder.encode(chars.join(""));
  }
  return bytes;
}

export function packPlaces(places: PackPlace[]): Uint8Array {
  const encoder = new TextEncoder();
  const names: Uint8Array[] = [];
  const geoms: Uint8Array[] = [];
  const entries = new Uint8Array(places.length * PLACE_ENTRY_BYTES);
  const ev = new DataView(entries.buffer);
  let nameOffset = 0;
  let geomOffset = 0;

  places.forEach((p, i) => {
    const latE5 = Math.round(p.lat * E5);
    const lonE5 = Math.round(p.lon * E5);
    const name = encodeName(encoder, p.name);
    let flags = 0;
    let geom: Uint8Array | null = null;

    const rings = (p.rings ?? (p.ring !== undefined ? [p.ring] : [])).filter((r) => r.length >= 4);
    const deltaRings = rings.map((r) =>
      r.map(([la, lo]) => [Math.round(la * E5) - latE5, Math.round(lo * E5) - lonE5] as const),
    );
    const all = deltaRings.flat();
    const fitsI16 =
      deltaRings.length <= 0xffff &&
      deltaRings.every((r) => r.length <= 0xffff) &&
      all.every(([a, b]) => a >= I16_MIN && a <= I16_MAX && b >= I16_MIN && b <= I16_MAX);
    // 꼭짓점을 담을 수 없는 면(int16 범위를 넘는 큰 면)은 상자도 두지 않고 점으로만 남긴다 — 상자로 「안」을 가르면 해상
    // 국립공원이 목포·여수·통영·거제를 통째로 품었다(코드 리뷰). 건물·기관(`boxOnly`)은 의도대로 상자만 담는다.
    const keepBox = all.length > 0 && (p.boxOnly === true || fitsI16);
    const keepPolygon = keepBox && p.boxOnly !== true;
    if (keepBox) {
      flags = FLAG_BOX | (keepPolygon ? FLAG_POLYGON : 0);
      const polyBytes = keepPolygon ? 2 + deltaRings.reduce((sum, r) => sum + 2 + r.length * 4, 0) : 0;
      geom = new Uint8Array(16 + polyBytes);
      const gv = new DataView(geom.buffer);
      gv.setInt32(0, latE5 + Math.min(...all.map((q) => q[0])), true);
      gv.setInt32(4, lonE5 + Math.min(...all.map((q) => q[1])), true);
      gv.setInt32(8, latE5 + Math.max(...all.map((q) => q[0])), true);
      gv.setInt32(12, lonE5 + Math.max(...all.map((q) => q[1])), true);
      if (keepPolygon) {
        let g = 16;
        gv.setUint16(g, deltaRings.length, true);
        g += 2;
        for (const r of deltaRings) {
          gv.setUint16(g, r.length, true);
          g += 2;
          for (const [a, b] of r) {
            gv.setInt16(g, a, true);
            gv.setInt16(g + 2, b, true);
            g += 4;
          }
        }
      }
    }

    const at = i * PLACE_ENTRY_BYTES;
    ev.setInt32(at, latE5, true);
    ev.setInt32(at + 4, lonE5, true);
    ev.setUint32(at + 8, nameOffset, true);
    ev.setUint32(at + 12, geom === null ? 0 : geomOffset, true);
    ev.setUint8(at + 16, name.length);
    ev.setUint8(at + 17, PLACE_CATEGORIES.indexOf(p.category));
    ev.setUint8(at + 18, flags);
    names.push(name);
    nameOffset += name.length;
    if (geom !== null) {
      geoms.push(geom);
      geomOffset += geom.length;
    }
  });

  const total = PLACE_HEADER_BYTES + entries.length + nameOffset + geomOffset;
  const out = new Uint8Array(total);
  const hv = new DataView(out.buffer);
  out.set(encoder.encode(PLACE_FILE_MAGIC), 0);
  hv.setUint32(4, PLACE_FILE_VERSION, true);
  hv.setUint32(8, places.length, true);
  hv.setUint32(12, nameOffset, true);
  let at = PLACE_HEADER_BYTES;
  out.set(entries, at);
  at += entries.length;
  for (const n of names) {
    out.set(n, at);
    at += n.length;
  }
  for (const g of geoms) {
    out.set(g, at);
    at += g.length;
  }
  return out;
}
