/**
 * 121 — 자리의 좌표에서 그 자리를 대표하는 장소 이름을 고른다.
 *
 * 계약: specs/121-richer-day-places/contracts/place-index.md 「이름 고르기」·「포트」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **기기 안에서만 찾는다** — 앱에 함께 들어간 OpenStreetMap 한국 데이터를 읽는다. 좌표를 어디에도 보내지 않는다
 * (spec FR-009, 017의 OS 역지오코딩을 대체했다).
 *
 * 이름의 수준은 역·광장·궁·공원·큰 건물·단지다. 가게·음식점은 데이터에 아예 없다(소유자 결정 2026-11-21).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Coordinate } from "./places";
import { E5, parsePlaceIndex, type PlaceCategory, type PlaceIndex } from "./place-index";

export type PlaceName =
  | { kind: "known"; label: string; category: PlaceCategory }
  /** 근처에 이름 붙은 곳이 없다(한국 밖 포함) */
  | { kind: "none" }
  /** 장소 데이터를 읽지 못했다 */
  | { kind: "unknown" };

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * **아래 거리들은 사람이 정한 값이며 실측이 아니다**(헌법 원칙 V, PN1).
 *
 * 근거는 스파이크(2026-11-21)의 시험 20곳에서 사람이 수긍한 이름이 나온 거리다. 역은 출구가 흩어져 있어 넓게,
 * 건물은 옆 건물로 새지 않게 좁게, 지명은 시골에서 마지막으로 기댈 곳이라 넓게 잡았다. 거리 판단은 이 파일에만 있다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const STATION_RADIUS_METERS = 250;
export const LANDMARK_RADIUS_METERS = 300;
export const BUILDING_RADIUS_METERS = 100;
export const LOCALITY_RADIUS_METERS = 1500;

const CONTAINER_TOP = new Set<PlaceCategory>(["landmark", "park", "mall"]);
const CONTAINER_NEXT = new Set<PlaceCategory>(["building", "institution", "residential"]);
const NEARBY_LANDMARK = CONTAINER_TOP;
const NEARBY_BUILDING = new Set<PlaceCategory>(["building", "institution"]);

const EARTH_RADIUS_METERS = 6_371_000;

function distanceMeters(latA: number, lonA: number, latB: number, lonB: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(r(latB - latA) / 2) ** 2 +
    Math.cos(r(latA)) * Math.cos(r(latB)) * Math.sin(r(lonB - lonA) / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

function known(index: PlaceIndex, i: number): PlaceName {
  const category = index.categoryOf(i);
  let label = index.nameOf(i);
  if (category === "station" && !label.endsWith("역")) label = `${label}역`;
  return { kind: "known", label, category };
}

/**
 * 좌표 하나의 이름을 고른다. 먼저 맞는 순위가 이긴다(contracts 표).
 *
 * 1 품는 명소·공원·몰(가장 큰 것) → 2 품는 건물·기관·주거(가장 큰 것) → 3 250m 안 역 → 4 300m 안 명소·공원·몰
 * → 5 100m 안 건물·기관 → 6 1.5km 안 지명 → none. 같은 순위에서 크기·거리가 같으면 데이터 순서가 앞선 것(결정적, PN4).
 */
export function choosePlaceName(index: PlaceIndex, coordinate: Coordinate): PlaceName {
  const la = Math.round(coordinate.latitude * E5);
  const lo = Math.round(coordinate.longitude * E5);
  // 0.01도 칸 — 둘레 1칸이면 약 0.9km 이상을 늘 덮는다. 지명(1.5km)만 2칸.
  const near = index.candidates(la, lo, 1);
  const wide = index.candidates(la, lo, 2);

  const biggestContaining = (cats: Set<PlaceCategory>): number => {
    let best = -1;
    let bestArea = -1;
    for (const i of near) {
      if (!cats.has(index.categoryOf(i)) || !index.contains(i, la, lo)) continue;
      const area = index.boxArea(i);
      if (area > bestArea || (area === bestArea && i < best)) {
        best = i;
        bestArea = area;
      }
    }
    return best;
  };

  const nearest = (pool: number[], cats: Set<PlaceCategory>, radius: number): number => {
    let best = -1;
    let bestD = Infinity;
    for (const i of pool) {
      if (!cats.has(index.categoryOf(i))) continue;
      const d = distanceMeters(
        coordinate.latitude,
        coordinate.longitude,
        index.latE5[i] / E5,
        index.lonE5[i] / E5,
      );
      if (d <= radius && (d < bestD || (d === bestD && i < best))) {
        best = i;
        bestD = d;
      }
    }
    return best;
  };

  const steps: (() => number)[] = [
    () => biggestContaining(CONTAINER_TOP),
    () => biggestContaining(CONTAINER_NEXT),
    () => nearest(near, new Set(["station"]), STATION_RADIUS_METERS),
    () => nearest(near, NEARBY_LANDMARK, LANDMARK_RADIUS_METERS),
    () => nearest(near, NEARBY_BUILDING, BUILDING_RADIUS_METERS),
    () => nearest(wide, new Set(["locality"]), LOCALITY_RADIUS_METERS),
  ];
  for (const step of steps) {
    const i = step();
    if (i >= 0) return known(index, i);
  }
  return { kind: "none" };
}

/** 장소 데이터 바이트를 주는 통로. 실패는 던진다 */
export interface PlaceIndexPort {
  load(): Uint8Array;
}

export type PlaceNamer = {
  /** 좌표마다 이름. 데이터를 읽지 못하면 모두 `unknown` */
  nameAll(coordinates: readonly Coordinate[]): PlaceName[];
};

/**
 * 처음 이름을 찾을 때 데이터를 한 번 읽어 색인을 만들고 기억한다.
 *
 * **읽기·해석이 던지면 기억하지 않는다**(R10) — 이번 호출의 이름은 모두 `unknown`이고 다음 일기에서 다시 읽는다.
 * 일기 쓰기는 이름 없이 계속된다(FR-015).
 */
export function placeNamer(port: PlaceIndexPort): PlaceNamer {
  let index: PlaceIndex | null = null;
  return {
    nameAll(coordinates) {
      if (coordinates.length === 0) return [];
      if (index === null) {
        try {
          index = parsePlaceIndex(port.load());
        } catch {
          return coordinates.map(() => ({ kind: "unknown" }) as const);
        }
      }
      const ready = index;
      return coordinates.map((c) => {
        try {
          return choosePlaceName(ready, c);
        } catch {
          return { kind: "unknown" } as const;
        }
      });
    },
  };
}
