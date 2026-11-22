/**
 * 121 — 자리 목록 → 프롬프트 장소 항목·저장 자리 (data-model PromptPlace·SavedPlace, spec FR-005·FR-007).
 */
import { buildPromptPlaces, dayPeriodOf, savedPlacesOf } from "../../src/diary/place-lines";
import type { PlaceName } from "../../src/signals/place-names";
import type { PlaceVisit } from "../../src/signals/types";

function visit(hour: number, photoCount = 1): PlaceVisit {
  const first = new Date(2026, 10, 21, hour, 0);
  return {
    coordinate: { latitude: 37.5, longitude: 127 + hour / 100 },
    firstSeenAt: first,
    lastSeenAt: new Date(2026, 10, 21, hour, 30),
    photoCount,
    source: "photo-exif",
  };
}
const named = (label: string): PlaceName => ({ kind: "known", label, category: "park" });
const NONE: PlaceName = { kind: "none" };
const UNKNOWN: PlaceName = { kind: "unknown" };

describe("dayPeriodOf — 오전 0–11·오후 12–17·저녁 18–20·밤 21–23", () => {
  it.each([
    [0, "morning"],
    [11, "morning"],
    [12, "afternoon"],
    [17, "afternoon"],
    [18, "evening"],
    [20, "evening"],
    [21, "night"],
    [23, "night"],
  ])("%i시 → %s", (hour, period) => {
    expect(dayPeriodOf(new Date(2026, 10, 21, hour, 15))).toBe(period);
  });
});

describe("buildPromptPlaces", () => {
  it("세 곳을 시각순 때와 함께", () => {
    expect(
      buildPromptPlaces(
        [visit(8), visit(13), visit(19)],
        [named("판교역"), named("서울숲"), named("망원한강공원")],
      ),
    ).toEqual({
      items: [
        { period: "morning", label: "판교역" },
        { period: "afternoon", label: "서울숲" },
        { period: "evening", label: "망원한강공원" },
      ],
      more: 0,
    });
  });

  it("FR-007 — 연이은 같은 이름과 연이은 이름 없음은 하나로, 때는 첫 자리의 때", () => {
    expect(
      buildPromptPlaces(
        [visit(8), visit(9), visit(12), visit(13), visit(19)],
        [named("서울숲"), named("서울숲"), NONE, NONE, named("서울숲")],
      ),
    ).toEqual({
      items: [
        { period: "morning", label: "서울숲" },
        { period: "afternoon", label: null },
        { period: "evening", label: "서울숲" },
      ],
      more: 0,
    });
  });

  it("FR-005 — 넷 이상이면 첫 세 항목과 나머지 수", () => {
    const places = buildPromptPlaces(
      [visit(7), visit(9), visit(12), visit(15), visit(20)],
      [named("가"), named("나"), named("다"), named("라"), named("마")],
    );
    expect(places?.items.map((i) => i.label)).toEqual(["가", "나", "다"]);
    expect(places?.more).toBe(2);
  });

  it("unknown은 이름 없음으로 보지만, 전부 unknown이면 싣지 않는다", () => {
    expect(buildPromptPlaces([visit(8), visit(13)], [UNKNOWN, UNKNOWN])).toBeUndefined();
    expect(buildPromptPlaces([visit(8), visit(13)], [named("서울숲"), UNKNOWN])?.items).toEqual([
      { period: "morning", label: "서울숲" },
      { period: "afternoon", label: null },
    ]);
  });

  it("자리가 없으면 싣지 않는다", () => {
    expect(buildPromptPlaces([], [])).toBeUndefined();
  });
});

describe("savedPlacesOf", () => {
  it("합치기 전 자리 전부를 이름과 함께", () => {
    expect(savedPlacesOf([visit(8, 2), visit(9)], [named("서울숲"), named("서울숲")])).toEqual([
      {
        label: "서울숲",
        category: "park",
        firstSeenAt: new Date(2026, 10, 21, 8, 0).toISOString(),
        lastSeenAt: new Date(2026, 10, 21, 8, 30).toISOString(),
        photoCount: 2,
        latE5: 3_750_000,
        lonE5: 12_708_000,
      },
      {
        label: "서울숲",
        category: "park",
        firstSeenAt: new Date(2026, 10, 21, 9, 0).toISOString(),
        lastSeenAt: new Date(2026, 10, 21, 9, 30).toISOString(),
        photoCount: 1,
        latE5: 3_750_000,
        lonE5: 12_709_000,
      },
    ]);
  });

  it("이름이 없거나(「끔」) none·unknown이면 이름 칸이 null", () => {
    const off = savedPlacesOf([visit(8)]);
    expect(off[0]).toMatchObject({ label: null, category: null, photoCount: 1 });
    expect(savedPlacesOf([visit(8), visit(9)], [NONE, UNKNOWN]).map((p) => p.label)).toEqual([
      null,
      null,
    ]);
  });

  it("126 DM20 — 좌표를 1e-5도 정수(약 1m)로 담는다(스냅샷)", () => {
    const v: PlaceVisit = {
      ...visit(8),
      coordinate: { latitude: 37.554712, longitude: 126.897683 },
    };
    const [p] = savedPlacesOf([v]);
    expect(p).toMatchObject({ latE5: 3_755_471, lonE5: 12_689_768 });
    expect(Number.isInteger(p!.latE5)).toBe(true);
    expect(Number.isInteger(p!.lonE5)).toBe(true);
  });

  it("126 DM20 — 음수 좌표도 반올림해 담는다", () => {
    const v: PlaceVisit = { ...visit(8), coordinate: { latitude: -33.8688, longitude: -70.6693 } };
    expect(savedPlacesOf([v])[0]).toMatchObject({ latE5: -3_386_880, lonE5: -7_066_930 });
  });

  it("126 DM20 — 좌표가 유한한 수가 아니면 그 자리의 두 필드를 모두 담지 않는다(NaN을 저장하지 않는다)", () => {
    const bad: PlaceVisit = { ...visit(8), coordinate: { latitude: Number.NaN, longitude: 127 } };
    const inf: PlaceVisit = {
      ...visit(9),
      coordinate: { latitude: 37, longitude: Number.POSITIVE_INFINITY },
    };
    const out = savedPlacesOf([bad, inf, visit(10)]);
    expect("latE5" in out[0]!).toBe(false);
    expect("lonE5" in out[0]!).toBe(false);
    expect("latE5" in out[1]!).toBe(false);
    expect("lonE5" in out[1]!).toBe(false);
    expect(out[2]).toMatchObject({ latE5: 3_750_000 });
  });

  it("126 — 「장소 이름으로 보기」가 꺼져 이름이 없어도 좌표는 담는다(이름 칸만 null)", () => {
    const [p] = savedPlacesOf([visit(8)]);
    expect(p).toMatchObject({ label: null, category: null, latE5: 3_750_000, lonE5: 12_708_000 });
  });

  it("126 — 좌표 두 필드는 함께 있거나 함께 없다", () => {
    for (const p of savedPlacesOf([
      visit(8),
      { ...visit(9), coordinate: { latitude: Number.NaN, longitude: 1 } },
    ])) {
      expect("latE5" in p).toBe("lonE5" in p);
    }
  });
});
