/**
 * 121 — OSM 태그 → 장소 범주·이름 (contracts/place-index.md 범주 코드, IX2·IX3).
 */
import { CATEGORY_CODES, categorize, placeNameOf } from "../../scripts/places/categorize";

describe("categorize", () => {
  it.each([
    [{ railway: "station" }, "station"],
    [{ railway: "halt" }, "station"],
    [{ public_transport: "station", train: "yes" }, "station"],
    [{ public_transport: "station", subway: "yes" }, "station"],
    [{ public_transport: "station", light_rail: "yes" }, "station"],
    // 리뷰 — 버스·여객선 터미널은 역이 아니다(「도동정류소역」을 지어냈다). 이름 그대로 명소로 둔다
    [{ public_transport: "station", bus: "yes", amenity: "bus_station" }, "landmark"],
    [{ public_transport: "station", ferry: "yes", amenity: "ferry_terminal" }, "landmark"],
    [{ public_transport: "station" }, "landmark"],
    [{ public_transport: "station", train: "disused" }, "landmark"],
    [{ aeroway: "aerodrome" }, "landmark"],
    [{ tourism: "attraction" }, "landmark"],
    [{ historic: "palace" }, "landmark"],
    [{ leisure: "park" }, "park"],
    [{ natural: "beach" }, "park"],
    [{ shop: "mall" }, "mall"],
    [{ shop: "department_store" }, "mall"],
    [{ amenity: "university" }, "institution"],
    [{ amenity: "exhibition_centre" }, "institution"],
    [{ building: "commercial" }, "building"],
    [{ office: "company" }, "building"],
    [{ office: "government" }, "building"],
    [{ office: "research" }, "building"],
    [{ landuse: "residential" }, "residential"],
    [{ building: "apartments" }, "residential"],
    [{ place: "neighbourhood" }, "locality"],
    [{ place: "village" }, "locality"],
  ])("%j → %s", (tags, expected) => {
    expect(categorize(tags)).toBe(expected);
  });

  it.each([
    [{ shop: "convenience" }],
    [{ amenity: "cafe" }],
    [{ amenity: "restaurant" }],
    [{ amenity: "fast_food" }],
    [{ amenity: "bank" }],
    [{ shop: "clothes", building: "yes" }],
    [{ amenity: "cafe", building: "commercial" }],
    [{ highway: "residential" }],
    // 리뷰 — 중개·법무·세무·이사 사무소는 가게 수준이다(소유자: 가게·음식점 제외)
    [{ office: "estate_agent" }],
    [{ office: "lawyer" }],
    [{ office: "tax_advisor" }],
    [{ office: "moving_company" }],
    [{ office: "logistics" }],
    [{ office: "yes" }],
    [{}],
  ])("가게·음식점·기타는 null — %j", (tags) => {
    expect(categorize(tags)).toBeNull();
  });

  it("범주 코드는 0~7이다(IX3)", () => {
    expect(Object.values(CATEGORY_CODES).sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});

describe("placeNameOf", () => {
  it("name:ko를 name보다 먼저 쓴다", () => {
    expect(placeNameOf({ "name:ko": "서울숲", name: "Seoul Forest" })).toBe("서울숲");
  });

  it("한글이 없으면 null이다(IX2)", () => {
    expect(placeNameOf({ name: "Three IFC" })).toBeNull();
    expect(placeNameOf({})).toBeNull();
  });

  it("아파트 동·호 번호뿐인 이름은 null, 이름 뒤에 붙은 동 번호는 걷는다", () => {
    expect(placeNameOf({ name: "101동" })).toBeNull();
    expect(placeNameOf({ name: "A동" })).toBeNull();
    expect(placeNameOf({ name: "학마을영남아파트 121동" })).toBe("학마을영남아파트");
    expect(placeNameOf({ name: "역삼1동" })).toBe("역삼1동");
  });

  it("앞뒤 공백을 걷는다", () => {
    expect(placeNameOf({ name: "  경복궁 " })).toBe("경복궁");
  });
});
