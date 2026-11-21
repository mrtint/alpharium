/**
 * 121 — 이름 고르기 순서 (contracts/place-index.md 「이름 고르기」 PN1·PN2·PN4, R10).
 */
import { packPlaces, type PackPlace } from "../../scripts/places/pack";
import { parsePlaceIndex } from "../../src/signals/place-index";
import { choosePlaceName, placeNamer } from "../../src/signals/place-names";

/** 기준점 근처에 장소를 놓는다. dLat·dLon은 미터 */
const BASE = { latitude: 37.5, longitude: 127.0 };
const M_LAT = 1 / 111_000;
const M_LON = 1 / 88_000;
function at(dLatM: number, dLonM: number): { lat: number; lon: number } {
  return { lat: BASE.latitude + dLatM * M_LAT, lon: BASE.longitude + dLonM * M_LON };
}
function box(halfM: number, cLatM = 0, cLonM = 0): [number, number][] {
  const a = at(cLatM - halfM, cLonM - halfM);
  const b = at(cLatM + halfM, cLonM + halfM);
  return [
    [a.lat, a.lon],
    [a.lat, b.lon],
    [b.lat, b.lon],
    [b.lat, a.lon],
    [a.lat, a.lon],
  ];
}
function indexOf(places: PackPlace[]) {
  return parsePlaceIndex(packPlaces(places));
}
const name = (places: PackPlace[]) => choosePlaceName(indexOf(places), BASE);

describe("choosePlaceName", () => {
  it("품는 명소·공원 가운데 가장 큰 것을 고른다(경복궁 > 강녕전)", () => {
    expect(
      name([
        { ...at(0, 0), category: "landmark", name: "강녕전", ring: box(30) },
        { ...at(0, 0), category: "landmark", name: "경복궁", ring: box(400) },
        { ...at(20, 0), category: "station", name: "경복궁" },
      ]),
    ).toEqual({ kind: "known", label: "경복궁", category: "landmark" });
  });

  it("PN2 — 품는 건물이 가까운 역보다 먼저다(코엑스)", () => {
    expect(
      name([
        { ...at(0, 0), category: "building", name: "코엑스", ring: box(150) },
        { ...at(200, 0), category: "station", name: "한국도심공항터미널" },
      ]),
    ).toMatchObject({ kind: "known", label: "코엑스" });
  });

  it("품는 것이 없으면 250m 안의 가장 가까운 역 — 「역」을 붙인다", () => {
    expect(
      name([
        { ...at(240, 0), category: "station", name: "먼데" },
        { ...at(40, 0), category: "station", name: "강남" },
      ]),
    ).toEqual({ kind: "known", label: "강남역", category: "station" });
    expect(name([{ ...at(40, 0), category: "station", name: "서울역" }])).toMatchObject({
      label: "서울역",
    });
  });

  it("250m 밖의 역은 고르지 않고 300m 안의 공원으로 간다", () => {
    expect(
      name([
        { ...at(260, 0), category: "station", name: "멀리" },
        { ...at(280, 0), category: "park", name: "근린공원" },
      ]),
    ).toMatchObject({ label: "근린공원" });
  });

  it("100m 안의 건물·기관, 그다음 1.5km 안의 지명", () => {
    expect(name([{ ...at(90, 0), category: "institution", name: "역삼초등학교" }])).toMatchObject({
      label: "역삼초등학교",
    });
    expect(name([{ ...at(110, 0), category: "institution", name: "먼학교" }])).toEqual({
      kind: "none",
    });
    expect(name([{ ...at(1400, 0), category: "locality", name: "양수리" }])).toMatchObject({
      label: "양수리",
      category: "locality",
    });
  });

  it("근처에 아무것도 없으면 none", () => {
    expect(name([{ ...at(5000, 0), category: "park", name: "먼공원" }])).toEqual({ kind: "none" });
  });

  it("PN4 — 같은 입력은 같은 출력", () => {
    const index = indexOf([
      { ...at(40, 0), category: "station", name: "가" },
      { ...at(40, 0), category: "station", name: "나" },
    ]);
    expect(choosePlaceName(index, BASE)).toEqual(choosePlaceName(index, BASE));
  });
});

describe("placeNamer", () => {
  const bytes = packPlaces([{ ...at(40, 0), category: "station", name: "강남" }]);

  it("처음 한 번만 읽는다", () => {
    const load = jest.fn(() => bytes);
    const namer = placeNamer({ load });
    expect(namer.nameAll([BASE, BASE])).toEqual([
      { kind: "known", label: "강남역", category: "station" },
      { kind: "known", label: "강남역", category: "station" },
    ]);
    namer.nameAll([BASE]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("R10 — 읽기가 던지면 모두 unknown이고, 다음 호출에서 다시 읽는다", () => {
    let fail = true;
    const load = jest.fn(() => {
      if (fail) throw new Error("없음");
      return bytes;
    });
    const namer = placeNamer({ load });
    expect(namer.nameAll([BASE, BASE])).toEqual([{ kind: "unknown" }, { kind: "unknown" }]);
    fail = false;
    expect(namer.nameAll([BASE])[0]).toMatchObject({ kind: "known" });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("깨진 바이트도 unknown으로 접는다", () => {
    const namer = placeNamer({ load: () => new Uint8Array(4) });
    expect(namer.nameAll([BASE])).toEqual([{ kind: "unknown" }]);
  });

  it("빈 목록이면 읽지 않는다", () => {
    const load = jest.fn(() => bytes);
    expect(placeNamer({ load }).nameAll([])).toEqual([]);
    expect(load).not.toHaveBeenCalled();
  });
});
