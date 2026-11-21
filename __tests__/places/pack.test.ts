/**
 * 121 — 장소 데이터 이진 형식 왕복 (contracts/place-index.md 형식·IX1).
 */
import { packPlaces } from "../../scripts/places/pack";
import { parsePlaceIndex } from "../../src/signals/place-index";

const square: [number, number][] = [
  [37.5, 127.0],
  [37.5, 127.01],
  [37.51, 127.01],
  [37.51, 127.0],
  [37.5, 127.0],
];

describe("packPlaces ↔ parsePlaceIndex", () => {
  const bytes = packPlaces([
    { lat: 37.49795, lon: 127.02762, category: "station", name: "강남" },
    { lat: 37.505, lon: 127.005, category: "park", name: "네모공원", ring: square },
    {
      lat: 37.0,
      lon: 127.5,
      category: "park",
      name: "아주큰공원",
      ring: [
        [36.5, 127.0],
        [36.5, 128.0],
        [37.5, 128.0],
        [37.5, 127.0],
        [36.5, 127.0],
      ],
    },
  ]);
  const index = parsePlaceIndex(bytes);

  it("머리와 장소 수를 읽는다", () => {
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("PLC1");
    expect(index.count).toBe(3);
  });

  it("좌표·범주·이름이 왕복한다", () => {
    expect(index.latE5[0]).toBe(3749795);
    expect(index.lonE5[0]).toBe(12702762);
    expect(index.categoryOf(0)).toBe("station");
    expect(index.nameOf(0)).toBe("강남");
    expect(index.nameOf(1)).toBe("네모공원");
  });

  it("다각형 안·밖을 가른다", () => {
    expect(index.contains(1, 3750500, 12700500)).toBe(true);
    expect(index.contains(1, 3752000, 12700500)).toBe(false);
    expect(index.contains(0, 3749795, 12702762)).toBe(false);
  });

  // 리뷰 — 해상 국립공원 셋이 상자로만 남아 목포·여수·통영·거제를 통째로 「품었다」. 꼭짓점을 못 담는 면은 상자도 두지 않고
  // 점(대표 좌표)으로만 남긴다 — 「안」을 단정할 근거가 없다.
  it("int16을 넘는 다각형은 점으로만 남고 아무것도 품지 않는다", () => {
    expect(index.hasPolygon(2)).toBe(false);
    expect(index.contains(2, 3700000, 12750000)).toBe(false);
    expect(index.boxArea(2)).toBe(0);
  });

  it("구멍이 있는 고리들 — 구멍 안은 밖이다", () => {
    const hole: [number, number][] = [
      [37.502, 127.002],
      [37.502, 127.008],
      [37.508, 127.008],
      [37.508, 127.002],
      [37.502, 127.002],
    ];
    const one = parsePlaceIndex(
      packPlaces([
        { lat: 37.505, lon: 127.005, category: "park", name: "고리공원", rings: [square, hole] },
      ]),
    );
    expect(one.contains(0, 3750100, 12700100)).toBe(true);
    expect(one.contains(0, 3750500, 12700500)).toBe(false);
  });

  it("boxOnly면 상자만 담는다", () => {
    const one = parsePlaceIndex(
      packPlaces([
        {
          lat: 37.505,
          lon: 127.005,
          category: "building",
          name: "네모빌딩",
          ring: square,
          boxOnly: true,
        },
      ]),
    );
    expect(one.hasPolygon(0)).toBe(false);
    expect(one.contains(0, 3750500, 12700500)).toBe(true);
  });

  it("경계 상자 넓이로 크기를 비교한다", () => {
    expect(index.boxArea(1)).toBeGreaterThan(0);
    expect(index.boxArea(0)).toBe(0);
  });

  it("주변 칸의 후보를 준다", () => {
    const near = index.candidates(3749800, 12702760, 1);
    expect(near).toContain(0);
    expect(near).toContain(1);
    expect(near).not.toContain(2);
  });

  it("255바이트를 넘는 이름은 글자 경계에서 자른다", () => {
    const long = "가".repeat(100); // 300바이트
    const one = parsePlaceIndex(packPlaces([{ lat: 37, lon: 127, category: "park", name: long }]));
    expect(one.nameOf(0)).toBe("가".repeat(85));
  });

  it("깨진 머리는 던진다(IX1)", () => {
    const broken = bytes.slice();
    broken[0] = 0;
    expect(() => parsePlaceIndex(broken)).toThrow();
    expect(() => parsePlaceIndex(bytes.slice(0, 20))).toThrow();
  });
});
