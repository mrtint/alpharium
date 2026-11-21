/**
 * 121 — 장소 이름 데이터(OpenStreetMap, ODbL 1.0)의 출처 표기 (spec FR-013·FR-014).
 *
 * ODbL은 공개적으로 쓰는 가공 데이터베이스에 출처·라이선스 안내를 붙이고(4.3), 가공 데이터베이스를 같은 라이선스로
 * 제공하라고(4.4) 한다. 앱 밖 라이선스 페이지가 그 안내 자리이고, 가공 파일은 공개 저장소의 `assets/places/`에 있다.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

import { ROOT, readSite, sectionBy } from "./read-site";

describe("121 — OpenStreetMap 출처 표기", () => {
  const section =
    sectionBy(readSite("licenses/index.html"), "data-data-source", "openstreetmap") ?? "";

  it("라이선스 페이지에 OSM 항목이 있다", () => {
    expect(section).not.toBe("");
  });

  it("저작권 표기·ODbL 원문·OSM 저작권 안내 링크가 있다", () => {
    expect(section).toContain("© OpenStreetMap contributors");
    expect(section).toContain("Open Database License (ODbL) 1.0");
    expect(section).toContain('href="https://opendatacommons.org/licenses/odbl/1-0/"');
    expect(section).toContain('href="https://www.openstreetmap.org/copyright"');
  });

  it("가공 데이터와 만드는 방법의 자리를 알리고, 그 자리가 저장소에 있다", () => {
    expect(section).toContain("assets/places");
    expect(section).toContain("scripts/places");
    expect(existsSync(join(ROOT, "assets/places/kr-places.bin"))).toBe(true);
    expect(existsSync(join(ROOT, "scripts/places/build-place-index.mts"))).toBe(true);
  });
});
