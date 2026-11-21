/**
 * 121 — OSM 태그를 장소 범주와 이름으로 옮긴다(데이터 만들기 전용, 앱 번들에 들어가지 않는다).
 *
 * 계약: specs/121-richer-day-places/contracts/place-index.md 범주 코드, IX2·IX3
 *
 * 가게·음식점은 담지 않는다(소유자 결정 2026-11-21). 범주를 판정하는 순서가 곧 우선순위다 — 한 장소에 여러 태그가
 * 붙으면 먼저 맞는 범주가 이긴다. 가게·음식점 태그가 붙은 건물은 건물로 세지 않는다.
 */

import { PLACE_CATEGORIES, type PlaceCategory } from "../../src/signals/place-index.ts";

export type OsmTags = Record<string, string | undefined>;

export const CATEGORY_CODES = Object.fromEntries(
  PLACE_CATEGORIES.map((c, i) => [c, i]),
) as Record<PlaceCategory, number>;

const LANDMARK_TOURISM = new Set([
  "attraction",
  "museum",
  "theme_park",
  "zoo",
  "aquarium",
  "gallery",
  "viewpoint",
]);
const LANDMARK_HISTORIC = new Set([
  "castle",
  "palace",
  "monument",
  "memorial",
  "archaeological_site",
  "building",
  "city_gate",
]);
const PARK_LEISURE = new Set([
  "park",
  "garden",
  "nature_reserve",
  "stadium",
  "water_park",
  "marina",
]);
const PARK_NATURAL = new Set(["beach", "peak", "bay", "island"]);
const INSTITUTION_AMENITY = new Set([
  "university",
  "college",
  "school",
  "hospital",
  "library",
  "townhall",
  "place_of_worship",
  "theatre",
  "cinema",
  "arts_centre",
  "community_centre",
  "exhibition_centre",
  "conference_centre",
]);
const LOCALITY_PLACE = new Set([
  "neighbourhood",
  "quarter",
  "locality",
  "hamlet",
  "village",
  "suburb",
  "isolated_dwelling",
]);
const BUILDING_KINDS = new Set([
  "commercial",
  "office",
  "public",
  "yes",
  "train_station",
  "stadium",
  "civic",
]);

/** `public_transport=station`이 철도역인지 알려 주는 탈것 태그 — 이것이 있어야 「○○역」이다 */
const RAIL_MODES = ["train", "subway", "light_rail", "monorail", "tram"] as const;

/**
 * `office` 가운데 그 자리를 대표할 만한 공공·행정·외교·공단. 중개·법무·세무·이사·물류 사무소뿐 아니라 민간 회사(`company`·`it`)·
 * 사설 학원(`educational_institution`)·통신 대리점(`telecommunication`) 등 상호명도 받지 않는다. 종류를 모르는 `office=yes`도 받지 않는다.
 */
const OFFICE_KINDS = new Set([
  "government",
  "administrative",
  "diplomatic",
  "quango",
]);

/** 다른 범주 태그와 겹쳐도 담지 않을 가게·음식점·의원·약국·사설 교습소 등 `amenity` */
const EXCLUDED_AMENITY = new Set([
  "restaurant",
  "fast_food",
  "cafe",
  "bar",
  "pub",
  "food_court",
  "ice_cream",
  "biergarten",
  "clinic",
  "doctors",
  "dentist",
  "pharmacy",
  "veterinary",
  "bank",
  "atm",
  "bureau_de_change",
  "fuel",
  "car_wash",
  "car_repair",
  "car_rental",
  "nightclub",
  "love_hotel",
  "stripclub",
  "gambling",
  "internet_cafe",
  "karaoke_box",
  "childcare",
  "kindergarten",
  "language_school",
  "driving_school",
  "music_school",
  "prep_school",
  "dancing_school",
]);

/** 범주를 정한다. 담지 않을 장소(가게·음식점·의원·도로 등)는 null */
export function categorize(t: OsmTags): PlaceCategory | null {
  if (t.healthcare !== undefined && t.healthcare !== "hospital") return null;
  if (EXCLUDED_AMENITY.has(t.amenity ?? "")) return null;
  // 철도역만 역이다 — 앱이 이름 뒤에 「역」을 붙인다. 버스·여객선 터미널을 역으로 넣으면 「도동정류소역」을 지어낸다(코드 리뷰).
  const railStation =
    t.railway === "station" ||
    t.railway === "halt" ||
    (t.public_transport === "station" && RAIL_MODES.some((m) => t[m] === "yes"));
  if (railStation) return "station";
  // 철도가 아닌 정류장(버스·여객선 터미널 등)은 이름 그대로 명소다.
  if (t.public_transport === "station" || t.amenity === "bus_station" || t.amenity === "ferry_terminal") {
    return "landmark";
  }
  // 공항은 역보다 대표성이 크다 — 인천공항 안에서 「제1터미널역」이 아니라 공항 이름이 나와야 한다(스파이크).
  if (t.aeroway === "aerodrome") return "landmark";
  if (LANDMARK_TOURISM.has(t.tourism ?? "") || LANDMARK_HISTORIC.has(t.historic ?? "")) {
    return "landmark";
  }
  if (
    PARK_LEISURE.has(t.leisure ?? "") ||
    PARK_NATURAL.has(t.natural ?? "") ||
    t.boundary === "national_park"
  ) {
    return "park";
  }
  if (t.shop === "mall" || t.shop === "department_store" || t.amenity === "marketplace") {
    return "mall";
  }
  if (INSTITUTION_AMENITY.has(t.amenity ?? "")) return "institution";
  if (LOCALITY_PLACE.has(t.place ?? "")) return "locality";
  // 여기까지 오지 못한 가게·음식점·숙박·여가·수리·의료 시설은 건물·주거 태그가 함께 붙어 있어도 담지 않는다.
  if (
    t.shop !== undefined ||
    t.amenity !== undefined ||
    t.tourism !== undefined ||
    t.leisure !== undefined ||
    t.craft !== undefined ||
    t.healthcare !== undefined ||
    t.club !== undefined
  ) {
    return null;
  }
  if (t.landuse === "residential" || t.building === "apartments" || t.building === "residential") {
    return "residential";
  }
  if (t.office !== undefined) return OFFICE_KINDS.has(t.office) ? "building" : null;
  if (BUILDING_KINDS.has(t.building ?? "")) return "building";
  return null;
}

const HANGUL = /[가-힣]/;
/** 아파트 동·호 번호(「101동」「A동」「3호」) — 이름 전체면 버리고, 이름 뒤에 띄어 붙었으면 걷는다 */
const UNIT_ONLY = /^[\dA-Za-z-]+(동|호)$/;
const UNIT_SUFFIX = /\s+[\dA-Za-z-]+(동|호)$/;

const HOSPITAL_KEEP = /(병원|의료원|보건소|보건지소|보건진료소)/;
const FAKE_HOSPITAL = /(동물|자동차|컴퓨터|폰|휴대폰|시계|구두|가방|악기).*병원/;
const TRAILING_PAREN = /\s*\([^()]*\)\s*$/;
const TRAILING_BRANCH = /\s+\S+(?:점|지점|영업소|대리점)$/;
const CORP_MARKER = /(?:\(주\)|㈜|주식회사|유한회사|법무법인|세무법인|특허법인|회계법인)/;

/**
 * 이름 어디에든 나오면 의원·학원으로 보는 말.
 * - 국회의원·지방의회 의원회관·재민의원빌딩·삼성의원사거리·자연의원룸(자연의+원룸)은 남긴다.
 * - 대학원·과학원·신학원(카톨릭신학원·감리교신학원)·백학원 건립 기념비·송학원룸(송학+원룸)은 남긴다.
 */
const CLINIC_OR_ACADEMY_ANYWHERE =
  /(?:(?<!국회|시의회\s*|도의회\s*|구의회\s*|군의회\s*)의원(?!회관|룸|사거리|빌딩)|한의원|어학원|(?<!대|과|카톨릭신|감리교신|백)학원(?!룸|동|전용|연합회|\s*건립))/;

/** 끝의 괄호 부연·지점명을 걷어낸 본체 끝말이 의원·교습소·상호명인 경우(치과병원·치과대학·치의학은 남긴다). */
const EXCLUDED_STEM_SUFFIX =
  /(?:(?<!치의학|치과대학\s*)치과(?!병원|대학)|클리닉|내과|소아과|소아청소년과|이비인후과|피부과|안과|정형외과|성형외과|산부인과|비뇨기과|비뇨의학과|신경과|신경외과|정신과|정신건강의학과|재활의학과|마취통증의학과|가정의학과|영상의학과|약국|교습소|공부방|독서실|스터디카페|어린이집|부동산|공인중개사?|중개사무소|세무사(?:\s*사무소)?|법무사(?:\s*사무소)?|노무사(?:\s*사무소)?|변호사(?:\s*사무소)?|변리사(?:\s*사무소)?|회계사(?:\s*사무소)?|관세사(?:\s*사무소)?|행정사(?:\s*사무소)?|법률사무소|세무회계(?:\s*사무소)?|노래방|노래연습장|노래타운|PC방|피씨방|당구장|당구클럽|볼링장|사우나|목욕탕|찜질방|모텔|무인텔|여인숙|펜션|게스트하우스|호스텔|웨딩홀|예식장|장례식장|주유소|충전소|세차장|카센터|정비소|공업사|타이어|편의점|세탁소|빨래방|미용실|헤어|네일|에스테틱|뷰티|다방|카페|식당|음식점|고깃집|횟집|치킨|피자|베이커리|제과|분식|김밥|마트|슈퍼)$/;

function stripTrailingBranchOrParen(s: string): string {
  let cur = s.trim();
  while (TRAILING_PAREN.test(cur)) cur = cur.replace(TRAILING_PAREN, "").trim();
  cur = cur.replace(TRAILING_BRANCH, "").trim();
  while (TRAILING_PAREN.test(cur)) cur = cur.replace(TRAILING_PAREN, "").trim();
  return cur;
}

/** 이름 — `name:ko` → `name`. 한글이 없거나 의원·학원·상호명이면 null(IX2·IX6) */
export function placeNameOf(t: OsmTags): string | null {
  const raw = (t["name:ko"] ?? t.name ?? "").trim().replace(UNIT_SUFFIX, "");
  if (raw === "" || UNIT_ONLY.test(raw) || !HANGUL.test(raw)) return null;
  if (FAKE_HOSPITAL.test(raw) || CORP_MARKER.test(raw) || CLINIC_OR_ACADEMY_ANYWHERE.test(raw)) {
    return null;
  }
  const stem = stripTrailingBranchOrParen(raw);
  if (EXCLUDED_STEM_SUFFIX.test(stem)) return null;
  if (t.amenity === "hospital" && !HOSPITAL_KEEP.test(raw)) return null;
  return raw;
}
