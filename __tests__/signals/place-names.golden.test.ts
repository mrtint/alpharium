/**
 * 121 — 시험 20곳 대조표 (contracts/place-index.md PN3, spec SC-001).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **실제 번들 파일로 돈다** — 데이터를 다시 만들거나 고르는 규칙을 바꾸면 이 표가 먼저 말한다.
 * 결정적 조회의 시험이지 모델 출력을 채점하는 장치가 아니다(헌법 원칙 IV와 무관).
 *
 * `accept`는 사람이 수긍하는 이름들이다(2026-11-21 스파이크에서 소유자가 「역·광장·궁·공원·큰 건물 수준」을
 * 골랐다). 좌표는 공개 지점과 `scripts/e2e-sample/manifest.ts`의 표본 군집 중심이다. `expectedMiss`는 데이터에
 * 이름이 없어 맞힐 수 없는 곳과 그 까닭이다 — 데이터가 나아지면 이 테스트가 「이제 맞는다」고 실패해 표를 고치게 한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parsePlaceIndex } from "../../src/signals/place-index";
import { choosePlaceName } from "../../src/signals/place-names";

type Row = {
  place: string;
  latitude: number;
  longitude: number;
  accept: readonly string[];
  expectedMiss?: string;
};

const TABLE: readonly Row[] = [
  { place: "강남역", latitude: 37.49795, longitude: 127.02762, accept: ["강남역"] },
  { place: "광화문광장", latitude: 37.57259, longitude: 126.9769, accept: ["광화문광장"] },
  { place: "서울숲", latitude: 37.5444, longitude: 127.0374, accept: ["서울숲"] },
  {
    place: "해운대해수욕장",
    latitude: 35.1587,
    longitude: 129.1603,
    accept: ["해운대 해수욕장", "해운대해수욕장"],
  },
  { place: "판교역", latitude: 37.39475, longitude: 127.11112, accept: ["판교역"] },
  { place: "경복궁", latitude: 37.57961, longitude: 126.97704, accept: ["경복궁"] },
  { place: "정자동 주택가", latitude: 37.3656, longitude: 127.1082, accept: ["정자역", "정자동"] },
  {
    place: "망원(표본 집)",
    latitude: 37.5547,
    longitude: 126.8977,
    // 서울함공원은 망원한강공원 안에 있다 — 「근처」로 말하면 맞는 이름이다.
    accept: ["망원한강공원", "서울함공원", "망원동"],
  },
  {
    place: "두물머리(표본 나들이)",
    latitude: 37.5446,
    longitude: 127.3226,
    accept: ["두물머리"],
    expectedMiss: "OSM에 「두물머리」라는 이름 붙은 장소가 없다 — 지명 「양수리」로 내려간다",
  },
  { place: "코엑스", latitude: 37.5116, longitude: 127.0592, accept: ["코엑스"] },
  {
    place: "홍대입구역 9번출구",
    latitude: 37.5571,
    longitude: 126.9245,
    accept: ["홍대입구역", "경의선숲길"],
  },
  { place: "성수 연무장길", latitude: 37.5427, longitude: 127.0563, accept: ["성수역"] },
  {
    place: "여의도 IFC",
    latitude: 37.5251,
    longitude: 126.9255,
    accept: ["IFC 서울", "IFC몰", "여의도역"],
  },
  {
    place: "성산일출봉",
    latitude: 33.458,
    longitude: 126.9425,
    accept: ["성산일출봉", "성산일출해양도립공원"],
  },
  // 시골 — 가까운 산 이름이면 수긍한다.
  { place: "양평 시골 논", latitude: 37.48, longitude: 127.56, accept: ["칠읍산"] },
  { place: "잠실 롯데월드", latitude: 37.5111, longitude: 127.0982, accept: ["롯데월드"] },
  { place: "인천공항 T1", latitude: 37.4491, longitude: 126.4505, accept: ["인천국제공항"] },
  { place: "부산역", latitude: 35.1151, longitude: 129.0418, accept: ["부산역"] },
  {
    place: "전주 한옥마을",
    latitude: 35.815,
    longitude: 127.153,
    accept: ["전주한옥마을"],
    expectedMiss:
      "OSM에 「전주한옥마을」이라는 이름 붙은 장소가 없다 — 가까운 전시관 이름이 나온다",
  },
  // 단지 안이 아니라 단지 사이 좌표다 — 가장 가까운 공원 이름이면 수긍한다.
  {
    place: "분당 정자동 주거지",
    latitude: 37.37,
    longitude: 127.115,
    accept: ["능골공원", "느티마을어린이공원"],
  },
];

/**
 * 코드 리뷰에서 찾은 회귀 — 모두 맞아야 한다. 해상 국립공원 셋이 경계 상자로만 남아 남해안 도시를 통째로 「품었고」(목포역 →
 * 「다도해 해상 국립공원」), 버스·여객선 정류장에 「역」이 붙었다(「도동정류소역」).
 */
const REGRESSION: readonly Row[] = [
  { place: "목포역", latitude: 34.7906, longitude: 126.3867, accept: ["목포역"] },
  { place: "여수엑스포역", latitude: 34.7529, longitude: 127.7489, accept: ["여수엑스포역"] },
  // 시청 둘레의 고현성(사적) 면이 시청을 품는다 — 그 자리의 실제 이름이라 수긍한다
  { place: "거제시청", latitude: 34.8806, longitude: 128.6211, accept: ["거제시청", "고현성"] },
  { place: "완도읍", latitude: 34.311, longitude: 126.755, accept: ["완도군청", "완도항"] },
  {
    place: "울릉 도동항",
    latitude: 37.4846,
    longitude: 130.9076,
    accept: ["도동정류소", "도동항"],
  },
];

describe("코드 리뷰 회귀 — 국립공원 상자·정류장 「역」", () => {
  const index = parsePlaceIndex(
    new Uint8Array(readFileSync(join(__dirname, "..", "..", "assets", "places", "kr-places.bin"))),
  );

  it.each(REGRESSION.map((r) => [r.place, r]))("%s", (_place, row) => {
    const name = choosePlaceName(index, row);
    const label = name.kind === "known" ? name.label : `(${name.kind})`;
    expect({ place: row.place, label, hit: row.accept.includes(label) }).toEqual({
      place: row.place,
      label,
      hit: true,
    });
    expect(label).not.toMatch(/국립공원/);
    expect(label).not.toMatch(/(정류소|정류장|터미널|선착장)역$/);
  });
});

describe("시험 20곳 대조표(SC-001)", () => {
  const index = parsePlaceIndex(
    new Uint8Array(readFileSync(join(__dirname, "..", "..", "assets", "places", "kr-places.bin"))),
  );
  const results = TABLE.map((row) => {
    const name = choosePlaceName(index, row);
    const label = name.kind === "known" ? name.label : `(${name.kind})`;
    return { row, label, hit: row.accept.includes(label) };
  });

  it("표는 20곳이다", () => {
    expect(TABLE).toHaveLength(20);
  });

  it.each(results.filter((r) => r.row.expectedMiss === undefined).map((r) => [r.row.place, r]))(
    "%s",
    (_place, r) => {
      expect({ place: r.row.place, label: r.label, hit: r.hit }).toEqual({
        place: r.row.place,
        label: r.label,
        hit: true,
      });
    },
  );

  it("데이터에 없는 곳은 여전히 못 맞힌다 — 맞히게 되면 표를 고친다", () => {
    for (const r of results.filter((x) => x.row.expectedMiss !== undefined)) {
      expect({ place: r.row.place, hit: r.hit }).toEqual({ place: r.row.place, hit: false });
    }
  });

  it("16곳 이상 맞는다", () => {
    expect(results.filter((r) => r.hit).length).toBeGreaterThanOrEqual(16);
  });
});
