import { dayBounds } from "../../src/config/day-boundary";
import { burst, composeDay } from "../../scripts/seed/shapes";

/**
 * 023 Phase 8 — burst 원자와 composeDay 합성.
 *
 * 계약: specs/023-photo-selection-algorithm/tasks.md T042·T043
 *
 * 사진을 "언제·어디서·무슨 종류·몇 장"의 조합으로 기술한다. 순수 함수이며
 * 결정적이다 — 010의 이름표 모양들도 이제 이것으로 만들어진다.
 */

const DAY = "2026-08-20";
const { startMs, endMs } = dayBounds(DAY);
const hoursInto = (h: number) => startMs + h * 3_600_000;

describe("burst — 한 구간을 사진들로 편다", () => {
  it("count장을 [fromHour, fromHour+spanHours]에 균등 분포", () => {
    const photos = burst(DAY, { fromHour: 4, spanHours: 8, count: 5, location: null });

    expect(photos).toHaveLength(5);
    expect(photos[0].takenAtMs).toBe(hoursInto(4));
    expect(photos[4].takenAtMs).toBe(hoursInto(12));
    // 균등 → 간격이 일정
    const gaps = photos.slice(1).map((p, i) => p.takenAtMs - photos[i].takenAtMs);
    expect(new Set(gaps).size).toBe(1);
  });

  it("spanHours=0이면 전부 같은 시각", () => {
    const photos = burst(DAY, { fromHour: 9, spanHours: 0, count: 4, location: null });

    expect(photos).toHaveLength(4);
    expect(new Set(photos.map((p) => p.takenAtMs)).size).toBe(1);
    expect(photos[0].takenAtMs).toBe(hoursInto(9));
  });

  it("count=1이면 시작 시각에 한 장", () => {
    const photos = burst(DAY, { fromHour: 7, spanHours: 5, count: 1, location: null });
    expect(photos).toEqual([{ takenAtMs: hoursInto(7), location: null }]);
  });

  it("count<=0이면 빈 배열", () => {
    expect(burst(DAY, { fromHour: 4, spanHours: 2, count: 0, location: null })).toEqual([]);
  });

  it("자정 넘김 clamp — 마지막 사진이 하루 시작 + 20시간을 넘지 않는다", () => {
    // 22시간 폭을 요청해도 clamp된다(자정을 넘으면 미디어 스캐너가 다음날로 색인).
    const photos = burst(DAY, { fromHour: 2, spanHours: 22, count: 6, location: null });

    for (const p of photos) {
      expect(p.takenAtMs - startMs).toBeLessThanOrEqual(20 * 3_600_000);
      expect(p.takenAtMs).toBeLessThan(endMs);
    }
  });

  it("location 심볼 — near-a는 NEAR_A 순환, b는 PLACE_B, null은 좌표 없음", () => {
    const nearA = burst(DAY, { fromHour: 4, spanHours: 6, count: 6, location: "near-a" });
    expect(nearA.every((p) => p.location !== null)).toBe(true);
    // NEAR_A는 4개 — 6장이면 순환한다(0,1,2,3,0,1)
    const coords = nearA.map((p) => `${p.location!.latitude},${p.location!.longitude}`);
    expect(coords[0]).toBe(coords[4]);

    const b = burst(DAY, { fromHour: 4, spanHours: 0, count: 3, location: "b" });
    expect(new Set(b.map((p) => `${p.location!.latitude},${p.location!.longitude}`)).size).toBe(1);

    const none = burst(DAY, { fromHour: 4, spanHours: 0, count: 2, location: null });
    expect(none.every((p) => p.location === null)).toBe(true);
  });

  it("좌표를 직접 줄 수 있다", () => {
    const photos = burst(DAY, {
      fromHour: 5,
      spanHours: 0,
      count: 1,
      location: { latitude: 37.1, longitude: 127.2 },
    });
    expect(photos[0].location).toEqual({ latitude: 37.1, longitude: 127.2 });
  });

  it("folder를 지정하면 그대로 실린다 (없으면 필드 자체가 없다)", () => {
    const shot = burst(DAY, {
      fromHour: 4,
      spanHours: 0,
      count: 1,
      location: null,
      folder: "Screenshots",
    });
    expect(shot[0].folder).toBe("Screenshots");

    const cam = burst(DAY, { fromHour: 4, spanHours: 0, count: 1, location: null });
    expect("folder" in cam[0]).toBe(false);
  });

  it("결정적 — 같은 입력에 같은 출력", () => {
    const spec = { fromHour: 3, spanHours: 12, count: 7, location: "near-a" as const };
    expect(burst(DAY, spec)).toEqual(burst(DAY, spec));
  });
});

describe("composeDay — burst들을 이어붙인다", () => {
  it("모든 burst를 합치고 찍힌 시각 순으로 정렬", () => {
    const day = composeDay(DAY, [
      { fromHour: 12, spanHours: 0, count: 2, location: null },
      { fromHour: 4, spanHours: 0, count: 2, location: "b" },
    ]);

    expect(day).toHaveLength(4);
    const times = day.map((p) => p.takenAtMs);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(day[0].takenAtMs).toBe(hoursInto(4));
  });

  it("빈 burst 목록이면 빈 하루", () => {
    expect(composeDay(DAY, [])).toEqual([]);
  });

  it("겹치는 시각을 허용한다 (같은 순간 여러 장은 정상)", () => {
    const day = composeDay(DAY, [
      { fromHour: 9, spanHours: 0, count: 3, location: null, folder: "Camera" },
      { fromHour: 9, spanHours: 0, count: 2, location: null, folder: "Screenshots" },
    ]);
    expect(day).toHaveLength(5);
    expect(day.filter((p) => p.folder === "Screenshots")).toHaveLength(2);
  });

  it("결정적", () => {
    const specs = [
      { fromHour: 1, spanHours: 18, count: 6, location: "near-a" as const },
      { fromHour: 3, spanHours: 10, count: 3, location: null, folder: "Screenshots" as const },
    ];
    expect(composeDay(DAY, specs)).toEqual(composeDay(DAY, specs));
  });
});
