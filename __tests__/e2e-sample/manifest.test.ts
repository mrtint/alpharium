import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CLUSTERS,
  DAYS,
  JITTER_METERS,
  SITUATIONS,
  WALK_STEP_MIN_METERS,
  type Situation,
} from "../../scripts/e2e-sample/manifest";

/**
 * 070 — 표본 표의 불변식 (contracts/sample-manifest.md M-1~M-8).
 *
 * 표의 기대 장소 수는 **사람이 적은 값**이다. 이 테스트는 그 값이 방문 순서와 안 어긋나는지만 센다 — 앱의 100m 규칙을 다시 구현하지 않는다(원칙 IV).
 */

const situationOf = (name: string): Situation => {
  const found = SITUATIONS.find((s) => s.name === name);
  if (found === undefined) throw new Error(`상황 없음: ${name}`);
  return found;
};

/** 두 점 사이 거리(m) — 표의 군집 간격을 확인하는 테스트용 계산이다(앱의 판정이 아니다) */
function meters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const dedupe = <T>(items: T[]): T[] => items.filter((item, i) => i === 0 || items[i - 1] !== item);

describe("표본 표 (M-1~M-8)", () => {
  it("M-1: 날은 정확히 30개, 오프셋 1~30이 각각 한 번", () => {
    expect(DAYS).toHaveLength(30);
    expect(DAYS.map((d) => d.offset).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 30 }, (_, i) => i + 1),
    );
  });

  it("M-2: 슬롯 합계는 100 이상 140 이하이고 150을 넘지 않는다", () => {
    const total = DAYS.reduce((sum, d) => sum + situationOf(d.situation).slots.length, 0);
    expect(total).toBeGreaterThanOrEqual(100);
    expect(total).toBeLessThanOrEqual(140);
    expect(total).toBeLessThanOrEqual(150);
  });

  it("M-3: 상황 열둘이 모두 쓰이고 필요한 모양이 갖춰진다", () => {
    expect(SITUATIONS).toHaveLength(12);
    const used = new Set(DAYS.map((d) => d.situation));
    for (const s of SITUATIONS) expect(used.has(s.name)).toBe(true);

    const photos = (d: (typeof DAYS)[number]) => situationOf(d.situation).slots.length;
    expect(DAYS.filter((d) => photos(d) === 0).length).toBeGreaterThanOrEqual(3);
    expect(DAYS.filter((d) => photos(d) === 1).length).toBeGreaterThanOrEqual(2);
    expect(DAYS.filter((d) => photos(d) >= 9).length).toBeGreaterThanOrEqual(1);

    const hour = (t: string) => Number(t.slice(0, 2));
    const slots = (d: (typeof DAYS)[number]) => situationOf(d.situation).slots;
    const nightOnly = DAYS.filter(
      (d) => slots(d).length > 0 && slots(d).every((s) => hour(s.time) >= 22),
    );
    const noonOnly = DAYS.filter(
      (d) => slots(d).length > 0 && slots(d).every((s) => hour(s.time) >= 11 && hour(s.time) <= 13),
    );
    const allDay = DAYS.filter(
      (d) => slots(d).some((s) => hour(s.time) <= 8) && slots(d).some((s) => hour(s.time) >= 20),
    );
    expect(nightOnly.length).toBeGreaterThanOrEqual(1);
    expect(noonOnly.length).toBeGreaterThanOrEqual(1);
    expect(allDay.length).toBeGreaterThanOrEqual(1);

    const noGps = DAYS.filter(
      (d) => slots(d).length > 0 && slots(d).every((s) => s.place === null),
    );
    expect(noGps.length).toBeGreaterThanOrEqual(2);

    const mixed = DAYS.filter(
      (d) =>
        slots(d).some((s) => s.folder !== "Camera") && slots(d).some((s) => s.folder === "Camera"),
    );
    expect(mixed.length).toBeGreaterThanOrEqual(1);
    // 023 잡사진 폴더가 둘 다 쓰인다
    const folders = new Set(DAYS.flatMap((d) => slots(d).map((s) => s.folder)));
    expect(folders.has("Screenshots")).toBe(true);
    expect(folders.has("Download")).toBe(true);
  });

  it("M-4: 슬롯 시각은 그날 00:00~23:59 안이고 시각순이다", () => {
    for (const s of SITUATIONS) {
      const minutes = s.slots.map((slot) => {
        expect(slot.time).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
        return Number(slot.time.slice(0, 2)) * 60 + Number(slot.time.slice(3));
      });
      expect([...minutes].sort((a, b) => a - b)).toEqual(minutes);
    }
  });

  it("M-5: 기대 사진 수는 슬롯 수, 기대 장소 수는 사람이 적은 방문 순서의 길이와 같다", () => {
    for (const s of SITUATIONS) {
      expect(s.expectPlaces).toBe(s.visits.length);

      const withCoordinate = s.slots.filter((slot) => slot.place !== null);
      if (withCoordinate.length === 0) {
        expect(s.visits).toEqual([]);
      } else if (s.name === "walking") {
        // 걸어 다닌 날 — 슬롯마다 따로 센다(아래 M-6가 간격을 잠근다)
        expect(s.visits).toHaveLength(withCoordinate.length);
      } else {
        // 방문 순서에서 연속 중복을 뺀 것이 사람이 적은 값과 같다
        expect(s.visits).toEqual(dedupe(withCoordinate.map((slot) => slot.place)));
      }
    }
  });

  it("M-6: 군집 사이 ≥ 1000m, 방문 안 흔들림 ≤ 40m, 걸어 다닌 날 간격 > 100m", () => {
    const names = Object.keys(CLUSTERS) as (keyof typeof CLUSTERS)[];
    expect(names).toHaveLength(4);
    for (let i = 0; i < names.length; i += 1) {
      for (let j = i + 1; j < names.length; j += 1) {
        expect(meters(CLUSTERS[names[i]], CLUSTERS[names[j]])).toBeGreaterThanOrEqual(1000);
      }
    }
    expect(JITTER_METERS).toBeLessThanOrEqual(40);

    const walking = situationOf("walking").slots;
    const steps = walking.map((s) => s.walkNorthMeters ?? 0);
    for (let i = 1; i < steps.length; i += 1) {
      expect(steps[i] - steps[i - 1]).toBeGreaterThan(100);
    }
    expect(WALK_STEP_MIN_METERS).toBeGreaterThan(100);
    // 걷지 않는 날은 걸음 오프셋을 쓰지 않는다
    for (const s of SITUATIONS.filter((x) => x.name !== "walking")) {
      for (const slot of s.slots) expect(slot.walkNorthMeters).toBeUndefined();
    }
  });

  it("M-7: 군집 좌표는 manifest.ts 한 곳에만 있다", () => {
    const dir = join(process.cwd(), "scripts", "e2e-sample");
    const sources = [
      "plan.ts",
      "ensure.ts",
      "device.ts",
      "exif-write.ts",
      "fetch.ts",
      "catalog.ts",
    ].map((f) => {
      try {
        return readFileSync(join(dir, f), "utf8");
      } catch {
        return "";
      }
    });
    for (const source of sources) {
      for (const c of Object.values(CLUSTERS)) {
        expect(source).not.toContain(String(c.latitude));
        expect(source).not.toContain(String(c.longitude));
      }
    }
  });

  it("M-8: 대표 날은 여덟이고 상황 일곱 이상, 오프셋 ≥ 3, 필요한 모양을 포함한다", () => {
    const probes = DAYS.filter((d) => d.probe === true);
    expect(probes).toHaveLength(8);
    for (const d of probes) expect(d.offset).toBeGreaterThanOrEqual(3);
    expect(new Set(probes.map((d) => d.situation)).size).toBeGreaterThanOrEqual(7);

    const slotsOf = (d: (typeof DAYS)[number]) => situationOf(d.situation).slots;
    expect(probes.some((d) => slotsOf(d).length === 0)).toBe(true);
    expect(probes.some((d) => slotsOf(d).length === 1)).toBe(true);
    expect(probes.some((d) => slotsOf(d).length >= 9)).toBe(true);
    expect(
      probes.some((d) => slotsOf(d).length > 0 && slotsOf(d).every((s) => s.place === null)),
    ).toBe(true);
    expect(probes.some((d) => slotsOf(d).some((s) => s.folder !== "Camera"))).toBe(true);
    expect(
      probes.some(
        (d) => slotsOf(d).length > 0 && slotsOf(d).every((s) => Number(s.time.slice(0, 2)) >= 22),
      ),
    ).toBe(true);
    // 달 경계를 건너는 날이 있어야 BACK 경로가 쓰인다(가장 먼 대표 날)
    expect(Math.max(...probes.map((d) => d.offset))).toBeGreaterThanOrEqual(25);
  });
});
