import { readFileSync } from "node:fs";
import { join } from "node:path";

import { loadCatalog } from "../../scripts/e2e-sample/catalog";
import { renderSampleTable } from "../../scripts/e2e-sample/doc";
import { CLUSTERS, DAYS, situationOf } from "../../scripts/e2e-sample/manifest";

/**
 * 070 — 표본 표 문서가 표(manifest)·사진 목록(photos.json)과 같다 (contracts/sample-manifest.md D-1~D-3).
 *
 * 문서는 `renderSampleTable`의 출력과 글자 단위로 같아야 한다. 어긋나면 `node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/sample-doc.mts`로 다시 쓴다.
 */

const DOC_PATH = join(process.cwd(), "docs", "e2e", "sample-table.md");
const doc = () => readFileSync(DOC_PATH, "utf8");

const loaded = loadCatalog({ allowEmptyHashes: true });
const catalog = loaded.ok ? loaded.photos : [];

describe("docs/e2e/sample-table.md", () => {
  it("사진 목록이 읽힌다 (검사 대상이 비지 않았다)", () => {
    expect(loaded.ok).toBe(true);
    expect(catalog.length).toBeGreaterThanOrEqual(200);
  });

  it("D-1·D-2: 문서가 표·목록에서 그려진 것과 같다", () => {
    expect(doc()).toBe(renderSampleTable(catalog));
  });

  it("D-1: 날 30행 — 오프셋·상황·사진 수·기대 장소 수·대표 날이 표와 같다", () => {
    const rows = doc()
      .split("\n")
      .filter((l) => /^\| \d+ \| [a-z-]+ \| \d+ \| \d+ \| (○|—) \|/.test(l));
    expect(rows).toHaveLength(30);
    for (const d of DAYS) {
      const s = situationOf(d.situation);
      const row = rows.find((r) => r.startsWith(`| ${d.offset} | `));
      expect(row).toBeDefined();
      expect(row).toContain(
        `| ${d.situation} | ${s.slots.length} | ${s.expectPlaces} | ${d.probe === true ? "○" : "—"} |`,
      );
    }
  });

  it("D-2: 군집 좌표가 문서에 있다", () => {
    for (const c of Object.values(CLUSTERS)) {
      expect(doc()).toContain(String(c.latitude));
      expect(doc()).toContain(String(c.longitude));
    }
  });

  it("D-2: 사진 출처 표에 목록의 모든 파일·라이선스·확인 일자가 있다", () => {
    for (const p of catalog)
      expect(doc()).toContain(
        `| ${p.file} | ${p.tags.join(", ")} | ${p.license} | ${p.checkedOn} |`,
      );
  });

  it("D-3: iOS 시뮬레이터는 범위 밖(미검증)이라고 적혀 있다", () => {
    expect(doc()).toMatch(/iOS 시뮬레이터는 범위 밖이다\(미검증\)/);
  });

  it("위반 주입: 문서의 숫자 하나를 바꾸면 일치 검사가 잡는다 (치환이 실제로 적용됐는지 먼저 단언)", () => {
    const original = doc();
    const broken = original.replace("| 4 | single | 1 | 1 |", "| 4 | single | 1 | 2 |");
    expect(broken).not.toBe(original);
    expect(broken === renderSampleTable(catalog)).toBe(false);
  });
});
