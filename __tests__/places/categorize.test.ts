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
    [{ office: "government" }, "building"],
    [{ office: "diplomatic" }, "building"],
    [{ office: "quango" }, "building"],
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
    [{ amenity: "clinic" }],
    [{ shop: "clothes", building: "yes" }],
    [{ amenity: "cafe", building: "commercial" }],
    [{ building: "apartments", shop: "convenience" }],
    [{ building: "commercial", tourism: "motel" }],
    [{ building: "yes", leisure: "fitness_centre" }],
    [{ building: "yes", healthcare: "clinic" }],
    [{ building: "retail" }],
    [{ highway: "residential" }],
    // 리뷰 — 중개·법무·세무·이사 사무소와 민간 회사·학원·대리점은 상호 수준이라 담지 않는다
    [{ office: "estate_agent" }],
    [{ office: "lawyer" }],
    [{ office: "tax_advisor" }],
    [{ office: "moving_company" }],
    [{ office: "logistics" }],
    [{ office: "company" }],
    [{ office: "it" }],
    [{ office: "educational_institution" }],
    [{ office: "telecommunication" }],
    [{ office: "yes" }],
    [{}],
  ])("가게·음식점·상호·기타는 null — %j", (tags) => {
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

  it("동네 의원·진료과목은 null이고, 병원·의료원·보건소·의원회관은 남긴다", () => {
    expect(placeNameOf({ name: "엔비의원" })).toBeNull();
    expect(placeNameOf({ name: "김동훈한의원" })).toBeNull();
    expect(placeNameOf({ name: "연세미메이드치과" })).toBeNull();
    expect(placeNameOf({ name: "메이저피부과 성신여대점" })).toBeNull();
    expect(placeNameOf({ amenity: "hospital", name: "바른정내과" })).toBeNull();
    expect(placeNameOf({ amenity: "hospital", name: "킴스코바디스타일 서면본점" })).toBeNull();

    expect(placeNameOf({ amenity: "hospital", name: "삼성서울병원" })).toBe("삼성서울병원");
    expect(placeNameOf({ amenity: "hospital", name: "성남시의료원" })).toBe("성남시의료원");
    expect(placeNameOf({ amenity: "hospital", name: "남양주보건소" })).toBe("남양주보건소");
    expect(placeNameOf({ amenity: "hospital", name: "서울대학교치과병원" })).toBe(
      "서울대학교치과병원",
    );
    expect(placeNameOf({ name: "국회의원회관" })).toBe("국회의원회관");
  });

  it("학원·교습소는 null이고, 대학원·과학원은 남긴다", () => {
    expect(placeNameOf({ name: "플러스 수학 학원" })).toBeNull();
    expect(placeNameOf({ name: "이산국어수학전문학원" })).toBeNull();
    expect(placeNameOf({ name: "메이플어학원" })).toBeNull();
    expect(placeNameOf({ name: "한빛 정보 통신학원" })).toBeNull();
    expect(placeNameOf({ name: "학교법인 영신학원" })).toBeNull();

    expect(placeNameOf({ name: "법학전문대학원" })).toBe("법학전문대학원");
    expect(placeNameOf({ name: "국립기상과학원" })).toBe("국립기상과학원");
    expect(placeNameOf({ name: "고려신학대학원" })).toBe("고려신학대학원");
  });

  it("법인 표지·상호명과 동네 수리/애완 병원 이름은 null이다", () => {
    expect(placeNameOf({ name: "(주)이너웨이브" })).toBeNull();
    expect(placeNameOf({ name: "한국토코넷(주)" })).toBeNull();
    expect(placeNameOf({ name: "만복부동산" })).toBeNull();
    expect(placeNameOf({ name: "파랑새노래방" })).toBeNull();
    expect(placeNameOf({ name: "힐링PC방" })).toBeNull();
    expect(placeNameOf({ name: "컴퓨터종합병원" })).toBeNull();
  });
});
