/**
 * 125 — 쓴 날 일기 화면의 동선 도식: 순수 변환 `buildDayRoute`.
 *
 * 계약: specs/125-day-route-diagram/contracts/day-route.md DR1~DR9, data-model.md 「상태」·「검증 규칙」
 *
 * **이 변환이 좌표가 화면으로 가는 유일한 길이다**(FR-004) — 절대 좌표는 여기서 0~1 상대 위치로 바뀌고 반환
 * 모양에는 남지 않는다. 모르는 것을 채우지 않는다(원칙 V): 읽지 못했거나 수가 어긋나면 도식을 만들지 않는다.
 */

import type { SavedPlace } from "../../src/diary/place-lines";
import {
  buildDayRoute,
  MAX_ROUTE_ITEMS,
  ROUTE_ASPECT,
  ROUTE_MARGIN,
} from "../../src/app/day-route";
import type { PlaceVisit } from "../../src/signals/types";

/** 로컬 시각으로 만든 ISO — `dayPeriodOf`가 로컬 시를 읽으므로 시험이 시간대에 흔들리지 않는다 */
const at = (hour: number): string => new Date(2026, 10, 16, hour, 0).toISOString();

const visit = (latitude: number, longitude: number, hour = 9): PlaceVisit => ({
  coordinate: { latitude, longitude },
  firstSeenAt: new Date(2026, 10, 16, hour, 0),
  lastSeenAt: new Date(2026, 10, 16, hour, 30),
  photoCount: 1,
  source: "photo-exif",
});

const place = (label: string | null, hour = 9): SavedPlace => ({
  label,
  category: null,
  firstSeenAt: at(hour),
  lastSeenAt: at(hour),
  photoCount: 1,
});

/** 서울 안의 서로 멀리 떨어진 세 자리 */
const SEOUL: PlaceVisit[] = [
  visit(37.5665, 126.978, 9),
  visit(37.5133, 127.1028, 13),
  visit(37.5796, 126.977, 19),
];
const SEOUL_SAVED: SavedPlace[] = [place("시청", 9), place("잠실", 13), place("경복궁", 19)];

describe("DR1 — 저장된 자리가 없으면 칸이 없다", () => {
  it("undefined와 빈 배열은 null", () => {
    expect(buildDayRoute(SEOUL, undefined)).toBeNull();
    expect(buildDayRoute(SEOUL, [])).toBeNull();
    expect(buildDayRoute(null, undefined)).toBeNull();
  });
});

describe("DR2 — 자리 1곳은 한 줄, 도식 없음", () => {
  it("한 항목·diagram false·x/y 없음", () => {
    const route = buildDayRoute([visit(37.5, 127)], [place("집 근처", 21)]);
    expect(route).toEqual({
      items: [{ n: 1, period: "night", label: "집 근처" }],
      more: 0,
      diagram: false,
    });
    expect(Object.keys(route!.items[0]!)).not.toContain("x");
  });
});

describe("DR3 — 읽지 못했거나 수가 어긋나면 저장된 목록만", () => {
  it("visits가 null이면 목록(diagram false, x/y 없음) — 모르는 것을 도식으로 채우지 않는다", () => {
    const route = buildDayRoute(null, SEOUL_SAVED)!;
    expect(route.diagram).toBe(false);
    expect(route.items.map((i) => i.label)).toEqual(["시청", "잠실", "경복궁"]);
    // 9시 오전 · 13시 오후 · 19시 저녁(18~20) — 일기 글과 같은 구간이다
    expect(route.items.map((i) => i.period)).toEqual(["morning", "afternoon", "evening"]);
    expect(route.items.every((i) => !("x" in i) && !("y" in i))).toBe(true);
  });

  it("다시 읽은 자리 수가 저장 수와 다르면(더 적든 더 많든) 목록", () => {
    expect(buildDayRoute(SEOUL.slice(0, 2), SEOUL_SAVED)!.diagram).toBe(false);
    expect(buildDayRoute([...SEOUL, visit(37.4, 127.1)], SEOUL_SAVED)!.diagram).toBe(false);
  });

  it("★ 수는 같아도 자리별 처음 시각이나 사진 수가 다르면 목록 — 어긋난 채 이름과 위치를 합치지 않는다(원칙 V)", () => {
    // 사진을 지우고 다른 사진이 더해져 자리 수는 그대로인데 자리가 달라진 경우
    const shiftedTime = SEOUL.map((v, i) =>
      i === 1 ? { ...v, firstSeenAt: new Date(2026, 10, 16, 14, 0) } : v,
    );
    expect(buildDayRoute(shiftedTime, SEOUL_SAVED)!.diagram).toBe(false);
    const otherCount = SEOUL.map((v, i) => (i === 2 ? { ...v, photoCount: 2 } : v));
    expect(buildDayRoute(otherCount, SEOUL_SAVED)!.diagram).toBe(false);
    // 같으면 도식이다(대조군)
    expect(buildDayRoute(SEOUL, SEOUL_SAVED)!.diagram).toBe(true);
  });

  it("빈 visits 배열(사진을 모두 지움)도 목록", () => {
    const route = buildDayRoute([], SEOUL_SAVED)!;
    expect(route.diagram).toBe(false);
    expect(route.items).toHaveLength(3);
  });
});

describe("DR4 — 수가 같고 떨어져 있으면 도식", () => {
  const route = buildDayRoute(SEOUL, SEOUL_SAVED)!;

  it("diagram true, 번호는 1부터 시간순, 이름·때는 저장된 값", () => {
    expect(route.diagram).toBe(true);
    expect(route.more).toBe(0);
    expect(route.items.map((i) => i.n)).toEqual([1, 2, 3]);
    expect(route.items.map((i) => i.label)).toEqual(["시청", "잠실", "경복궁"]);
  });

  it("모든 x·y가 [0,1] 안이고 안쪽 여백을 지킨다", () => {
    for (const item of route.items) {
      expect(item.x).toBeGreaterThanOrEqual(ROUTE_MARGIN - 1e-9);
      expect(item.x).toBeLessThanOrEqual(1 - ROUTE_MARGIN + 1e-9);
      expect(item.y).toBeGreaterThanOrEqual(ROUTE_MARGIN - 1e-9);
      expect(item.y).toBeLessThanOrEqual(1 - ROUTE_MARGIN + 1e-9);
    }
  });

  it("이름을 모르는 자리(label null)도 그대로 둔다 — 지어내지 않는다", () => {
    const named = buildDayRoute(SEOUL, [place(null, 9), place("잠실", 13), place(null, 19)])!;
    expect(named.items.map((i) => i.label)).toEqual([null, "잠실", null]);
    expect(named.diagram).toBe(true);
  });
});

describe("DR5 — 앞 12곳까지, 넘으면 more", () => {
  const many = (count: number): { visits: PlaceVisit[]; saved: SavedPlace[] } => ({
    visits: Array.from({ length: count }, (_, i) => visit(37.5 + i * 0.01, 127 + i * 0.01, 8)),
    saved: Array.from({ length: count }, (_, i) => place(`자리${i + 1}`, 8)),
  });

  it("상한은 12다", () => {
    expect(MAX_ROUTE_ITEMS).toBe(12);
  });

  it("14곳이면 앞 12곳과 more 2, 도식은 그대로", () => {
    const { visits, saved } = many(14);
    const route = buildDayRoute(visits, saved)!;
    expect(route.items).toHaveLength(12);
    expect(route.items[11]!.label).toBe("자리12");
    expect(route.more).toBe(2);
    expect(route.diagram).toBe(true);
  });

  it("정확히 12곳이면 more 0", () => {
    const { visits, saved } = many(12);
    expect(buildDayRoute(visits, saved)!.more).toBe(0);
  });

  it("수 일치 검사는 자르기 전 전체 수로 한다 — 13곳 대 14곳은 목록", () => {
    const a = many(13);
    const b = many(14);
    const route = buildDayRoute(a.visits, b.saved)!;
    expect(route.diagram).toBe(false);
    expect(route.items).toHaveLength(12);
    expect(route.more).toBe(2);
  });

  it("투영은 보이는 앞 12곳만으로 한다(12곳 밖의 먼 자리가 보이는 점을 찌그러뜨리지 않는다)", () => {
    const { visits, saved } = many(13);
    visits[12] = visit(10, 10, 8); // 12곳 밖 아주 먼 자리
    const route = buildDayRoute(visits, saved)!;
    const xs = route.items.map((i) => i.x!);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.3);
  });
});

describe("DR6 — 모든 점이 100m 안에 겹치면(퇴화) 도식을 만들지 않는다", () => {
  it("diagram false — 저장된 목록은 그대로", () => {
    // 위도 0.0002° ≈ 22m
    const near = [visit(37.5, 127), visit(37.5002, 127), visit(37.5, 127.0002)];
    const route = buildDayRoute(near, [place("a"), place("b"), place("c")])!;
    expect(route.diagram).toBe(false);
    expect(route.items).toHaveLength(3);
    expect(route.items.every((i) => !("x" in i))).toBe(true);
  });

  it("한 쌍이라도 100m를 넘으면 도식이다", () => {
    const route = buildDayRoute(
      [visit(37.5, 127), visit(37.5, 127.0002), visit(37.502, 127)], // 마지막은 약 220m
      [place("a"), place("b"), place("c")],
    )!;
    expect(route.diagram).toBe(true);
  });
});

describe("DR7 — 가로세로 비율을 지킨다(위도 보정), 북쪽이 위", () => {
  it("가로 일직선(같은 위도): y는 모두 0.5, x는 여백 안쪽 끝까지", () => {
    const route = buildDayRoute(
      [visit(37.5, 127.0), visit(37.5, 127.05), visit(37.5, 127.1)],
      [place("a"), place("b"), place("c")],
    )!;
    expect(route.items.map((i) => i.y)).toEqual([0.5, 0.5, 0.5]);
    expect(route.items[0]!.x).toBeCloseTo(ROUTE_MARGIN, 9);
    expect(route.items[2]!.x).toBeCloseTo(1 - ROUTE_MARGIN, 9);
  });

  it("세로 일직선(같은 경도): x는 모두 0.5, 북쪽 점이 위(y가 작다)", () => {
    const route = buildDayRoute(
      [visit(37.5, 127), visit(37.55, 127), visit(37.6, 127)],
      [place("a"), place("b"), place("c")],
    )!;
    expect(route.items.map((i) => i.x)).toEqual([0.5, 0.5, 0.5]);
    expect(route.items[0]!.y!).toBeGreaterThan(route.items[1]!.y!);
    expect(route.items[1]!.y!).toBeGreaterThan(route.items[2]!.y!);
  });

  it("경도 차는 cos(위도)로 줄이고, 화면 상자의 세로 비율(ROUTE_ASPECT)을 반영해 실제 비율이 유지된다", () => {
    const lat = 37.5;
    const route = buildDayRoute(
      [visit(lat, 127.0), visit(lat + 0.01, 127.02)],
      [place("a"), place("b")],
    )!;
    const [p1, p2] = route.items;
    // 화면에서 가로 1은 폭 한 개, 세로 1은 폭의 ROUTE_ASPECT배다 — 같은 단위(폭 기준)로 맞춰 비교한다
    const dx = p2!.x! - p1!.x!;
    const dyNorth = (p1!.y! - p2!.y!) * ROUTE_ASPECT; // 북쪽이 위라 y 차이의 부호를 뒤집는다
    const expected = (0.02 * Math.cos(((lat + 0.005) * Math.PI) / 180)) / 0.01;
    expect(dx / dyNorth).toBeCloseTo(expected, 6);
  });

  it("★ 같은 거리(동쪽 대 북쪽)는 화면에서도 같은 길이다 — 가로로 긴 상자에서 세로가 눌리지 않는다", () => {
    const lat = 37.5;
    const dLat = 0.01;
    const dLon = dLat / Math.cos(((lat + dLat / 2) * Math.PI) / 180); // 땅 위 같은 거리
    const route = buildDayRoute(
      [visit(lat, 127.0), visit(lat + dLat, 127.0 + dLon)],
      [place("a"), place("b")],
    )!;
    const [p1, p2] = route.items;
    const pxEast = p2!.x! - p1!.x!; // 폭 단위
    const pxNorth = (p1!.y! - p2!.y!) * ROUTE_ASPECT; // 폭 단위
    expect(pxEast).toBeCloseTo(pxNorth, 9);
  });

  it("남북으로 긴 동선은 세로 여백까지, 동서로 긴 동선은 가로 여백까지 상자를 채운다", () => {
    const tall = buildDayRoute(
      [visit(37.4, 127.0), visit(37.6, 127.01)],
      [place("a"), place("b")],
    )!;
    expect(tall.items[0]!.y).toBeCloseTo(1 - ROUTE_MARGIN, 9);
    expect(tall.items[1]!.y).toBeCloseTo(ROUTE_MARGIN, 9);
    const wide = buildDayRoute(
      [visit(37.5, 126.9), visit(37.505, 127.1)],
      [place("a"), place("b")],
    )!;
    expect(wide.items[0]!.x).toBeCloseTo(ROUTE_MARGIN, 9);
    expect(wide.items[1]!.x).toBeCloseTo(1 - ROUTE_MARGIN, 9);
  });
});

describe("DR8 — 반환 모양에 좌표가 없다", () => {
  it("항목 키는 n·period·label·x·y뿐이고 직렬화에 위도·경도가 없다", () => {
    const route = buildDayRoute(SEOUL, SEOUL_SAVED)!;
    const allowed = new Set(["n", "period", "label", "x", "y"]);
    for (const item of route.items) {
      for (const key of Object.keys(item)) expect(allowed.has(key)).toBe(true);
    }
    expect(Object.keys(route).sort()).toEqual(["diagram", "items", "more"]);
    expect(JSON.stringify(route)).not.toMatch(/latitude|longitude|coordinate|lat|lng/i);
  });
});

describe("DR9 — 순수하다", () => {
  it("입력을 바꾸지 않고(동결) 같은 입력에 같은 결과", () => {
    const visits = SEOUL.map((v) =>
      Object.freeze({ ...v, coordinate: Object.freeze({ ...v.coordinate }) }),
    );
    const saved = SEOUL_SAVED.map((p) => Object.freeze({ ...p }));
    const first = buildDayRoute(visits, saved);
    const second = buildDayRoute(visits, saved);
    expect(first).toEqual(second);
  });
});
