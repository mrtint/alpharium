/**
 * 121 — 앱에 들어가는 장소 데이터 파일 계약 (contracts/place-index.md IX2~IX5, SC-006).
 */
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { PLACE_CATEGORIES, parsePlaceIndex } from "../../src/signals/place-index";

const ROOT = join(__dirname, "..", "..");
const BIN = join(ROOT, "assets", "places", "kr-places.bin");
const META = join(ROOT, "assets", "places", "kr-places.meta.json");

describe("assets/places/kr-places.bin", () => {
  const bytes = new Uint8Array(readFileSync(BIN));
  const meta = JSON.parse(readFileSync(META, "utf8")) as {
    source: { url: string; lastModified: string | null; bytes: number; license: string };
    output: { bytes: number; sha256: string; places: number };
  };
  const index = parsePlaceIndex(bytes);

  it("IX4 — 10MB 이하다", () => {
    expect(statSync(BIN).size).toBeLessThanOrEqual(10 * 1000 * 1000);
  });

  it("IX5 — 기록의 sha256·크기·곳 수가 파일과 같다", () => {
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(meta.output.sha256);
    expect(bytes.length).toBe(meta.output.bytes);
    expect(index.count).toBe(meta.output.places);
  });

  it("기록에 원본·라이선스가 있다(FR-013)", () => {
    expect(meta.source.url).toContain("geofabrik.de");
    expect(meta.source.bytes).toBeGreaterThan(0);
    expect(meta.source.license).toContain("ODbL");
    expect(meta.source.license).toContain("OpenStreetMap");
  });

  // 이름 끝말로는 가르지 못한다 — 「고속터미널」「인천공항1터미널」「서부정류장」은 진짜 지하철역이다. 역인지는 빌드가 태그로 가른다
  // (`categorize.test.ts`). 여기서는 리뷰가 찾은 실제 예가 역이 아닌지만 본다.
  it("코드 리뷰 — 버스·여객선 정류장(도동정류소)은 역 범주가 아니다", () => {
    const stations: string[] = [];
    for (let i = 0; i < index.count; i += 1) {
      if (index.nameOf(i) === "도동정류소") stations.push(index.categoryOf(i));
    }
    expect(stations.length).toBeGreaterThan(0);
    expect(stations).not.toContain("station");
  });

  it("IX2·IX3 — 모든 이름이 한글을 품고 범주는 여덟 가지 안이다", () => {
    for (let i = 0; i < index.count; i += 1) {
      const name = index.nameOf(i);
      if (!/[가-힣]/.test(name)) throw new Error(`한글 없는 이름 #${i}: ${name}`);
      if (!PLACE_CATEGORIES.includes(index.categoryOf(i))) throw new Error(`범주 #${i}`);
    }
  });
});
