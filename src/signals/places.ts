/**
 * 사진 좌표로 「몇 군데를 다녔나」를 센다.
 *
 * 계약: specs/004-photo-signal-collection/contracts/collection.md 「자리 묶기」
 *
 * **순수 함수만 둔다.** 기기에 닿지 않으므로 대역 없이 검증된다.
 *
 * **여기서 나오는 값은 하루의 궤적이 아니라 사진이 찍힌 지점들이다**(FR-013e). 집→회사→집
 * 이어도 회사에서만 찍었으면 이동 거리는 0이다. 그 한계가 `PhotoPlaces`에 함께 담긴다.
 */

import type { PlaceTrace } from "./types";

/**
 * 이 거리 안이면 같은 자리로 본다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **100m는 짐작이며 실측이 아니다**(FR-013h, 헌법 원칙 V).
 *
 * 근거는 GPS 오차가 통상 수~수십 미터라는 일반 지식이고, **이 저장소가 잰 값이 아니다.**
 * 100m면 건물 하나~블록 하나가 한 자리가 되어 「집/회사/그 카페」 수준의 자리 감각과 맞고,
 * 오차에 자리 수가 부풀지 않는다.
 *
 * **실기기에서 집 사진 여럿이 한 자리로 세어지는지 확인하면 실측으로 바뀐다**
 * (quickstart D5).
 *
 * **이 상수가 저장소에서 여기 하나뿐이어야 한다**(FR-013g). 거리 판단이 여러 곳에
 * 흩어지면 한쪽만 고쳐지는 일이 생긴다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const SAME_PLACE_METERS = 100;

/** 지구 반지름(m). 하버사인에 쓴다 */
const EARTH_RADIUS_METERS = 6_371_000;

export type Coordinate = { latitude: number; longitude: number };
export type TimedCoordinate = Coordinate & { takenAtMs: number };

/**
 * 실제 좌표인지 본다(FR-013d).
 *
 * **`(0,0)`을 거르는 것이 핵심이다** — 좌표를 못 읽었을 때 0으로 채워진 값일 수 있고,
 * 실제 좌표로 다루면 아프리카 서쪽 바다에 다녀온 것이 된다. 적도 위의 실제 지점
 * (위도만 0)은 유효하므로 **둘 다 0일 때만** 거른다.
 */
export function isUsableCoordinate(latitude: number, longitude: number): boolean {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude === 0 && longitude === 0) return false;
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

/**
 * 두 점 사이 거리(m). 하버사인 공식이다.
 *
 * **평면 근사를 쓰지 않는 이유**: 100m 규모에서는 근사로도 충분하지만, 위도에 따라 경도
 * 1도의 실제 거리가 달라져 고위도에서 틀린다. 공식이 다섯 줄이므로 근사할 이유가 없다.
 */
function distanceMeters(a: Coordinate, b: Coordinate): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);

  const h =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * 좌표들을 자리로 묶어 하루의 요약을 만든다.
 *
 * **순차 묶기이며 최적이 아니다.** 시각 순으로 훑으면서 직전 자리와 `SAME_PLACE_METERS`
 * 안이면 같은 자리, 아니면 새 자리로 센다. 하루 종일 천천히 이동한 경우 자리를 잘게
 * 쪼갠다 — 진짜 군집화라면 그러지 않는다.
 *
 * **그래도 이것으로 충분한 이유**: 이 앱은 "정확한 기록 장치가 아니라 감상"이고(헌법),
 * 자리 수는 짐작이면 된다. 정교한 군집화는 이 기능의 본체가 아니다.
 *
 * **유효하지 않은 좌표는 들어오기 전에 걸러져야 한다**(FR-013d). 이 함수는 받은 것을
 * 그대로 믿는다.
 */
export function tracePlaces(points: TimedCoordinate[]): PlaceTrace {
  if (points.length === 0) {
    return { visitCount: 0, approximateDistanceMeters: 0 };
  }

  const ordered = [...points].sort((a, b) => a.takenAtMs - b.takenAtMs);

  // 자리의 대표 좌표들. 첫 점이 첫 자리다.
  const places: Coordinate[] = [{ latitude: ordered[0].latitude, longitude: ordered[0].longitude }];

  for (const point of ordered.slice(1)) {
    const previous = places[places.length - 1];

    if (distanceMeters(previous, point) > SAME_PLACE_METERS) {
      places.push({ latitude: point.latitude, longitude: point.longitude });
    }
  }

  // 자리들을 시각 순으로 이은 거리의 합. **실제 이동 거리가 아니다**(FR-013e).
  let total = 0;
  for (let i = 1; i < places.length; i += 1) {
    total += distanceMeters(places[i - 1], places[i]);
  }

  return {
    visitCount: places.length,
    approximateDistanceMeters: Math.round(total),
    representativeCoordinate: places[0],
  };
}
