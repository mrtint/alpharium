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
      },
      {
        label: "서울숲",
        category: "park",
        firstSeenAt: new Date(2026, 10, 21, 9, 0).toISOString(),
        lastSeenAt: new Date(2026, 10, 21, 9, 30).toISOString(),
        photoCount: 1,
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
});
