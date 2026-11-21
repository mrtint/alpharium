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
  "retail",
  "public",
  "yes",
  "train_station",
  "stadium",
  "civic",
]);

/** `public_transport=station`이 철도역인지 알려 주는 탈것 태그 — 이것이 있어야 「○○역」이다 */
const RAIL_MODES = ["train", "subway", "light_rail", "monorail", "tram"] as const;

/**
 * `office` 가운데 그 자리를 대표할 만한 것. 중개·법무·세무·이사·물류 사무소는 가게 수준이라 받지 않는다(코드 리뷰 —
 * 「기쁨부동산」「법무법인 ○○」이 건물 이름으로 나왔다). 종류를 모르는 `office=yes`도 받지 않는다.
 */
const OFFICE_KINDS = new Set([
  "government",
  "administrative",
  "diplomatic",
  "research",
  "educational_institution",
  "telecommunication",
  "newspaper",
  "association",
  "religion",
  "quango",
  "energy_supplier",
  "company",
  "it",
]);

/** 범주를 정한다. 담지 않을 장소(가게·음식점·도로 등)는 null */
export function categorize(t: OsmTags): PlaceCategory | null {
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
  if (t.landuse === "residential" || t.building === "apartments" || t.building === "residential") {
    return "residential";
  }
  // 여기까지 오지 못한 가게·음식점·편의 시설은 담지 않는다 — 건물 태그가 함께 붙어 있어도.
  if (t.shop !== undefined || t.amenity !== undefined) return null;
  if (t.office !== undefined) return OFFICE_KINDS.has(t.office) ? "building" : null;
  if (BUILDING_KINDS.has(t.building ?? "")) return "building";
  return null;
}

const HANGUL = /[가-힣]/;
/** 아파트 동·호 번호(「101동」「A동」「3호」) — 이름 전체면 버리고, 이름 뒤에 띄어 붙었으면 걷는다 */
const UNIT_ONLY = /^[\dA-Za-z-]+(동|호)$/;
const UNIT_SUFFIX = /\s+[\dA-Za-z-]+(동|호)$/;

/** 이름 — `name:ko` → `name`. 한글이 없으면 null(IX2) */
export function placeNameOf(t: OsmTags): string | null {
  const raw = (t["name:ko"] ?? t.name ?? "").trim().replace(UNIT_SUFFIX, "");
  if (raw === "" || UNIT_ONLY.test(raw) || !HANGUL.test(raw)) return null;
  return raw;
}
