/** 070 — `docs/e2e/sample-table.md`를 표(manifest)와 사진 목록(photos.json)에서 다시 쓴다. */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadCatalog } from "./e2e-sample/catalog.ts";
import { renderSampleTable } from "./e2e-sample/doc.ts";

const catalog = loadCatalog({ allowEmptyHashes: true });
if (!catalog.ok) {
  console.error("사진 목록이 규칙을 어긴다:");
  for (const problem of catalog.problems) console.error(`  - ${problem}`);
  process.exit(1);
}
writeFileSync(join(process.cwd(), "docs", "e2e", "sample-table.md"), renderSampleTable(catalog.photos), "utf8");
console.log("docs/e2e/sample-table.md를 다시 썼다.");
