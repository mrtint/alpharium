/**
 * 125·126 — 쓴 날 일기 화면의 동선 도식: 순수 변환 `buildDayRoute`.
 *
 * 계약: specs/125-day-route-diagram/contracts/day-route.md DR1~DR9(126이 DR2·DR4·DR6을 대체한다),
 *       specs/126-route-map-illustration/contracts/day-map.md DM1~DM7
 *
 * **이 변환이 좌표가 화면으로 가는 유일한 길이다**(FR-004) — 절대 좌표는 여기서 0~1 상대 위치로 바뀌고 반환
 * 모양에는 남지 않는다. 모르는 것을 채우지 않는다(원칙 V): 읽지 못했거나 수가 어긋나면 도식을 만들지 않는다.
 */

import type { SavedPlace } from "../../src/diary/place-lines";
import {
  buildDayRoute,
  MAX_ROUTE_ITEMS,
  MIN_FRAME_METERS,
  ROUTE_ASPECT,
  ROUTE_MARGIN,
} from "../../src/app/day-route";
import type { PlaceVisit } from "../../src/signals/types";
import { packMapFile } from "../../scripts/map/pack";
import { parseMapFile } from "../../src/map/map-file";

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

describe("DM1 — 자리 1곳도 읽었고 일치하면 도식(점 하나, 프레임 가운데)", () => {
  it("diagram true·x=y=0.5 (126이 125 DR2를 대체한다)", () => {
    const route = buildDayRoute([visit(37.5, 127, 21)], [place("집 근처", 21)]);
    expect(route).toEqual({
      items: [{ n: 1, period: "night", label: "집 근처", x: 0.5, y: 0.5 }],
      more: 0,
      diagram: true,
    });
  });

  it("읽지 못했으면(visits null) 한 줄 목록이다 — 모르는 것을 도식으로 채우지 않는다", () => {
    const route = buildDayRoute(null, [place("집 근처", 21)]);
    expect(route).toEqual({
      items: [{ n: 1, period: "night", label: "집 근처" }],
      more: 0,
      diagram: false,
    });
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

describe("DM2·DM3 — 상자 폭은 최소 600m (126이 125 DR6의 퇴화 규칙을 대체한다)", () => {
  /** 땅 위 미터를 위도·경도 차로 — 위도 37.5에서 */
  const dLat = (m: number) => m / 110_540;
  const dLon = (m: number) => m / (111_320 * Math.cos((37.5 * Math.PI) / 180));

  it("최소 폭 상수는 600m다(사람이 정한 값)", () => {
    expect(MIN_FRAME_METERS).toBe(600);
  });

  it("100m 안에 몰린 날도 도식이다 — 점이 서로 가까이 놓이되 한 곳에 쌓이지 않는다(70m 안 네 곳)", () => {
    const base = [37.5, 127.0];
    const near = [
      visit(base[0]!, base[1]!),
      visit(base[0]! + dLat(25), base[1]! + dLon(45)),
      visit(base[0]! + dLat(55), base[1]! + dLon(15)),
      visit(base[0]! + dLat(15), base[1]! - dLon(50)),
    ];
    const route = buildDayRoute(near, [place("a"), place("b"), place("c"), place("d")])!;
    expect(route.diagram).toBe(true);
    // 600m 폭 상자에서 70m는 폭의 약 12% — 전부 가운데 근처에 있고 서로 떨어져 있다
    for (const i of route.items) {
      expect(Math.abs(i.x! - 0.5)).toBeLessThan(0.15);
      expect(Math.abs(i.y! - 0.5)).toBeLessThan(0.2);
    }
    expect(new Set(route.items.map((i) => `${i.x},${i.y}`)).size).toBe(4);
  });

  it("같은 좌표의 자리 둘은 둘 다 가운데에 있다(도식은 그리되 점은 합쳐진다)", () => {
    const route = buildDayRoute([visit(37.5, 127), visit(37.5, 127)], [place("a"), place("b")])!;
    expect(route.diagram).toBe(true);
    expect(route.items.map((i) => [i.x, i.y])).toEqual([
      [0.5, 0.5],
      [0.5, 0.5],
    ]);
  });

  it("250m 떨어진 두 곳은 600m 폭 상자에 거리 비율대로 놓인다", () => {
    const route = buildDayRoute(
      [visit(37.5, 127), visit(37.5 + dLat(150), 127 + dLon(200))],
      [place("a"), place("b")],
    )!;
    const [p1, p2] = route.items;
    expect(p2!.x! - p1!.x!).toBeCloseTo(200 / 600, 3); // 폭 600m 기준
    // 높이는 폭 × ROUTE_ASPECT. 도식은 경도·위도 1도를 같은 길이로 본다(등각, 위도 1도 110.5km 대 111.3km — 0.7% 차이)
    expect(Math.abs((p1!.y! - p2!.y!) * ROUTE_ASPECT * 600 - 150)).toBeLessThan(2);
    expect((p1!.x! + p2!.x!) / 2).toBeCloseTo(0.5, 6); // 가운데에 놓인다
  });

  it("DM3 — 600m보다 넓게 퍼진 자리는 최소 폭의 영향을 받지 않는다(여백 안을 채운다)", () => {
    const route = buildDayRoute(
      [visit(37.5, 127.0), visit(37.5, 127.05)],
      [place("a"), place("b")],
    )!;
    expect(route.items[0]!.x).toBeCloseTo(ROUTE_MARGIN, 9);
    expect(route.items[1]!.x).toBeCloseTo(1 - ROUTE_MARGIN, 9);
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
    expect(Object.keys(route).sort()).toEqual(["diagram", "items", "more"]); // 지도 없음 — map 키 자체가 없다
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

describe("DM1 (a) — 저장된 좌표(latE5·lonE5)가 모든 자리에 있으면 사진을 읽지 않는다 (FR-017)", () => {
  const withCoords = (p: SavedPlace, lat: number, lon: number): SavedPlace => ({
    ...p,
    latE5: Math.round(lat * 1e5),
    lonE5: Math.round(lon * 1e5),
  });
  const SAVED_WITH_COORDS = SEOUL_SAVED.map((p, i) =>
    withCoords(p, SEOUL[i]!.coordinate.latitude, SEOUL[i]!.coordinate.longitude),
  );

  it("visits가 null이어도(사진을 지웠거나 권한이 없다) 도식이다", () => {
    const route = buildDayRoute(null, SAVED_WITH_COORDS)!;
    expect(route.diagram).toBe(true);
    expect(route.items).toHaveLength(3);
    for (const i of route.items) {
      expect(i.x).toBeGreaterThanOrEqual(ROUTE_MARGIN - 1e-9);
      expect(i.y).toBeLessThanOrEqual(1 - ROUTE_MARGIN + 1e-9);
    }
  });

  it("저장된 좌표로 그린 위치는 다시 읽은 좌표로 그린 위치와 같다(1m 안의 반올림 차이만)", () => {
    const fromVisits = buildDayRoute(SEOUL, SEOUL_SAVED)!;
    const fromSaved = buildDayRoute(null, SAVED_WITH_COORDS)!;
    fromSaved.items.forEach((item, i) => {
      expect(item.x!).toBeCloseTo(fromVisits.items[i]!.x!, 4);
      expect(item.y!).toBeCloseTo(fromVisits.items[i]!.y!, 4);
    });
  });

  it("visits와 어긋나도(자리 수·시각이 달라도) 저장된 좌표를 쓴다 — 읽은 쪽을 보지 않는다", () => {
    const other = [visit(10, 10, 3)];
    expect(buildDayRoute(other, SAVED_WITH_COORDS)!.diagram).toBe(true);
  });

  it("한 자리라도 좌표가 없으면 (b)로 간다 — visits가 없으면 목록만, 일치하면 도식", () => {
    const partial = SAVED_WITH_COORDS.map((p, i) => (i === 1 ? SEOUL_SAVED[1]! : p));
    expect(buildDayRoute(null, partial)!.diagram).toBe(false);
    expect(buildDayRoute(SEOUL, partial)!.diagram).toBe(true);
  });

  it("한 곳뿐인 저장된 좌표도 도식이다(점 하나)", () => {
    const route = buildDayRoute(null, [withCoords(place("집", 21), 37.5, 127)])!;
    expect(route.diagram).toBe(true);
    expect(route.items[0]).toMatchObject({ x: 0.5, y: 0.5 });
  });

  it("반환 모양에 latE5·lonE5가 없다(DM23)", () => {
    const route = buildDayRoute(null, SAVED_WITH_COORDS)!;
    expect(JSON.stringify(route)).not.toMatch(/latE5|lonE5|latitude|longitude/i);
  });
});

describe("DM4~DM7 — 지도 (126)", () => {
  /** 경도 126.9~127.1 · 위도 37.5~37.6 두 칸. 두 번째 칸(경도 127.0~127.1)에 큰 길 하나와 물 면을 둔다 */
  const MIN_LON = 12_690_000;
  const MIN_LAT = 3_750_000;
  const index = parseMapFile(
    packMapFile({
      minLonE5: MIN_LON,
      minLatE5: MIN_LAT,
      cols: 2,
      rows: 1,
      cells: new Map([
        [1, { roadMajor: [[0, 0, 10_000, 10_000]], water: [[0, 0, 4000, 0, 4000, 4000, 0, 0]] }],
      ]),
    }),
  );
  const HERE = visit(37.51, 127.01, 21);
  const SAVED_HERE = [place("집 근처", 21)];

  it("DM4 — 도식이고 지도를 읽었으면 map이 채워진다(상자 정수 경로)", () => {
    const route = buildDayRoute([HERE], SAVED_HERE, index)!;
    expect(route.diagram).toBe(true);
    expect(route.map).toBeDefined();
    expect(route.map!.box).toEqual({ w: 1000, h: 620 });
    expect(route.map!.roadMajor).toMatch(/^M-?\d+ -?\d+L/);
    expect(route.map!.roadWidth).toBeGreaterThan(0);
  });

  it("DM4 — 지도를 못 읽었으면(null) 125 모양이다(map 키가 없다)", () => {
    const route = buildDayRoute([HERE], SAVED_HERE, null)!;
    expect(route.diagram).toBe(true);
    expect("map" in route).toBe(false);
    expect(Object.keys(route).sort()).toEqual(["diagram", "items", "more"]);
  });

  it("DM4 — 프레임이 파일 범위 밖(한국 밖)이면 map이 없다 — 빈 바탕을 만들지 않는다", () => {
    const route = buildDayRoute([visit(48.85, 2.35, 21)], SAVED_HERE, index)!;
    expect(route.diagram).toBe(true);
    expect("map" in route).toBe(false);
  });

  it("DM4 — 파일 안이지만 그릴 도형이 없는 칸이면 map이 없다", () => {
    const route = buildDayRoute([visit(37.51, 126.95, 21)], SAVED_HERE, index)!;
    expect("map" in route).toBe(false);
  });

  it("DM5 — 좌표를 모르면(visits null·좌표 없는 일기) diagram false이고 map도 없다", () => {
    const route = buildDayRoute(null, SAVED_HERE, index)!;
    expect(route.diagram).toBe(false);
    expect("map" in route).toBe(false);
  });

  it("DM5 — 저장된 좌표로 그린 도식에도 지도가 붙는다(사진이 없어도)", () => {
    const saved: SavedPlace[] = [{ ...place("집 근처", 21), latE5: 3_751_000, lonE5: 12_701_000 }];
    const route = buildDayRoute(null, saved, index)!;
    expect(route.diagram).toBe(true);
    expect(route.map).toBeDefined();
  });

  it("DM6 — 지도가 붙은 반환에도 위도·경도가 없다(키 검사)", () => {
    const route = buildDayRoute([HERE], SAVED_HERE, index)!;
    expect(Object.keys(route).sort()).toEqual(["diagram", "items", "map", "more"]);
    expect(Object.keys(route.map!).sort()).toEqual(
      [
        "box",
        "park",
        "rail",
        "river",
        "roadMajor",
        "roadMid",
        "roadMinor",
        "roadWidth",
        "water",
      ].sort(),
    );
    expect(JSON.stringify(route)).not.toMatch(/latitude|longitude|coordinate|lat|lng|lon/i);
  });

  it("DM7 — 같은 입력에 같은 결과(순수)", () => {
    expect(buildDayRoute([HERE], SAVED_HERE, index)).toEqual(
      buildDayRoute([HERE], SAVED_HERE, index),
    );
  });
});
