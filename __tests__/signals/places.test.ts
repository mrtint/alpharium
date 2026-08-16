/**
 * 사진 좌표로 자리를 세는 규칙.
 *
 * 계약: specs/004-photo-signal-collection/contracts/collection.md 「자리 묶기」 C10~C12
 *
 * 순수 함수라 기기가 필요 없다.
 */

import { SAME_PLACE_METERS, isUsableCoordinate, tracePlaces } from "../../src/signals/places";

/** 서울시청 근처. 기준점으로 쓴다 */
const BASE = { latitude: 37.5665, longitude: 126.978 };

/**
 * 위도로 북쪽 `meters`만큼 옮긴 좌표.
 *
 * 위도 1도는 어디서나 약 111,320m다. 경도와 달리 위도에 따라 변하지 않아 시험값으로 쓰기 좋다.
 */
const northOf = (meters: number) => ({
  latitude: BASE.latitude + meters / 111_320,
  longitude: BASE.longitude,
});

const at = (iso: string) => new Date(iso).getTime();

describe("C11 — 100m 안이면 한 자리다 (FR-013f, SC-005a)", () => {
  it("같은 좌표 여럿은 한 자리다", () => {
    // 집에서 찍은 열 장이 열 군데가 되면 안 된다.
    const trace = tracePlaces([
      { ...BASE, takenAtMs: at("2026-08-12T09:00:00") },
      { ...BASE, takenAtMs: at("2026-08-12T12:00:00") },
      { ...BASE, takenAtMs: at("2026-08-12T18:00:00") },
    ]);

    expect(trace.visitCount).toBe(1);
  });

  it("50m 떨어진 좌표는 같은 자리다", () => {
    const trace = tracePlaces([
      { ...BASE, takenAtMs: at("2026-08-12T09:00:00") },
      { ...northOf(50), takenAtMs: at("2026-08-12T10:00:00") },
    ]);

    expect(trace.visitCount).toBe(1);
  });

  it("한 자리뿐이면 이동 거리는 0이다", () => {
    const trace = tracePlaces([
      { ...BASE, takenAtMs: at("2026-08-12T09:00:00") },
      { ...northOf(30), takenAtMs: at("2026-08-12T10:00:00") },
    ]);

    expect(trace.approximateDistanceMeters).toBe(0);
  });
});

describe("C12 — 100m 밖이면 다른 자리다 (FR-013f)", () => {
  it("500m 떨어지면 두 자리다", () => {
    const trace = tracePlaces([
      { ...BASE, takenAtMs: at("2026-08-12T09:00:00") },
      { ...northOf(500), takenAtMs: at("2026-08-12T14:00:00") },
    ]);

    expect(trace.visitCount).toBe(2);
  });

  it("두 자리 사이 거리가 이동 거리가 된다", () => {
    const trace = tracePlaces([
      { ...BASE, takenAtMs: at("2026-08-12T09:00:00") },
      { ...northOf(1000), takenAtMs: at("2026-08-12T14:00:00") },
    ]);

    // 하버사인이 정확하면 1000m 근처여야 한다. 10m 오차를 허용한다.
    expect(trace.approximateDistanceMeters).toBeGreaterThan(990);
    expect(trace.approximateDistanceMeters).toBeLessThan(1010);
  });

  it("시각 순으로 이어 거리를 더한다", () => {
    // 집 → 회사 → 집이면 왕복이 잡힌다.
    const trace = tracePlaces([
      { ...BASE, takenAtMs: at("2026-08-12T09:00:00") },
      { ...northOf(1000), takenAtMs: at("2026-08-12T13:00:00") },
      { ...BASE, takenAtMs: at("2026-08-12T19:00:00") },
    ]);

    expect(trace.visitCount).toBe(3);
    expect(trace.approximateDistanceMeters).toBeGreaterThan(1980);
  });

  it("뒤섞여 들어와도 시각 순으로 정렬한다", () => {
    const trace = tracePlaces([
      { ...northOf(1000), takenAtMs: at("2026-08-12T13:00:00") },
      { ...BASE, takenAtMs: at("2026-08-12T09:00:00") },
    ]);

    expect(trace.visitCount).toBe(2);
    expect(trace.approximateDistanceMeters).toBeGreaterThan(990);
  });
});

describe("C10 — 유효하지 않은 좌표는 자리가 아니다 (FR-013d, SC-005)", () => {
  it("(0,0)은 좌표가 아니다", () => {
    // 좌표를 못 읽었을 때의 채움값일 수 있다. 실제 좌표로 다루면 아프리카 서쪽 바다가 된다.
    expect(isUsableCoordinate(0, 0)).toBe(false);
  });

  it("범위를 벗어난 값은 좌표가 아니다", () => {
    expect(isUsableCoordinate(91, 0)).toBe(false);
    expect(isUsableCoordinate(-91, 0)).toBe(false);
    expect(isUsableCoordinate(0, 181)).toBe(false);
    expect(isUsableCoordinate(0, -181)).toBe(false);
  });

  it("정상 좌표는 통과한다", () => {
    expect(isUsableCoordinate(BASE.latitude, BASE.longitude)).toBe(true);
    // 경계값 — 극점과 날짜변경선은 실제 좌표다.
    expect(isUsableCoordinate(90, 180)).toBe(true);
  });

  it("위도만 0인 좌표는 유효하다", () => {
    // 적도 위의 실제 지점이다. (0,0)만 걸러야 한다.
    expect(isUsableCoordinate(0, 126.978)).toBe(true);
  });
});

describe("빈 입력", () => {
  it("좌표가 없으면 자리도 0이다", () => {
    const trace = tracePlaces([]);

    expect(trace.visitCount).toBe(0);
    expect(trace.approximateDistanceMeters).toBe(0);
  });
});

describe("상수", () => {
  it("같은 자리 기준이 100m다", () => {
    // 이 값이 저장소에서 여기 하나뿐이어야 한다(FR-013g).
    expect(SAME_PLACE_METERS).toBe(100);
  });
});
