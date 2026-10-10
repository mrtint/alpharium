/**
 * 070 — 표본 사진을 내려받는다 (`npm run sample:fetch`, 최초 한 번 `-- --record-hashes`).
 *
 * 계약: specs/070-e2e-sample-seed/contracts/sample-seeding.md F-1~F-5
 *
 * **외부 서비스(Wikimedia Commons)를 부른다.** 목록(`scripts/e2e-sample/photos.json`)을 소유자가 확인한 뒤에만 돌린다.
 * 받은 파일은 `scripts/e2e-sample/.cache/`(gitignore)에만 둔다.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { CATALOG_PATH, loadCatalog } from "./e2e-sample/catalog.ts";
import { fetchCatalog, realFetchBytes } from "./e2e-sample/fetch.ts";

export const CACHE_DIR = () => join(process.cwd(), "scripts", "e2e-sample", ".cache");

const recordHashes = process.argv.includes("--record-hashes");

async function main(): Promise<number> {
  const loaded = loadCatalog({ allowEmptyHashes: recordHashes });
  if (!loaded.ok) {
    console.error("사진 목록이 규칙을 어긴다:");
    for (const problem of loaded.problems) console.error(`  - ${problem}`);
    return 1;
  }

  const result = await fetchCatalog({
    catalog: loaded.photos,
    cacheDir: CACHE_DIR(),
    fetchBytes: realFetchBytes,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    recordHashes,
  });
  if (!result.ok) {
    console.error(`내려받기 실패: ${result.reason}`);
    return 1;
  }

  if (recordHashes) {
    writeFileSync(CATALOG_PATH(), `${JSON.stringify(result.photos, null, 2)}\n`, "utf8");
    console.log("photos.json에 빈 sha256을 채웠다.");
  }
  console.log(`사진 ${result.photos.length}장 준비됨 (새로 받음 ${result.downloaded}, 캐시 ${result.cached}) → ${CACHE_DIR()}`);
  return 0;
}

process.exit(await main());
