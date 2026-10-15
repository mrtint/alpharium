/**
 * 070 — 표본 사진을 내려받는다 (`npm run sample:fetch`, 정체 필드가 빈 항목이 있으면 `-- --record-hashes`).
 *
 * 계약: specs/070-e2e-sample-seed/contracts/sample-seeding.md F-1·F-3, specs/084-sample-photo-identity/contracts/photo-identity.md V-1~V-7·W-1·W-2
 *
 * **외부 서비스(Wikimedia Commons)를 부른다** — 썸네일, 그리고 처음 보는 썸네일 변형이나 빈 원본 sha1일 때의 원본 조회(Commons API).
 * 목록(`scripts/e2e-sample/photos.json`)을 소유자가 확인한 뒤에만 돌린다. 받은 파일은 `scripts/e2e-sample/.cache/`(gitignore)에만 둔다.
 *
 * 084: 같은 썸네일 URL이 데이터센터마다 다른 바이트를 준다. 원본 확인을 거쳐 받아들인 변형은 목록에 덧붙으므로, **성공한 실행이 목록을 바꾸면
 * photos.json을 다시 쓴다**(기록 모드와 무관). 사람이 diff를 보고 커밋한다. 실패한 실행은 목록을 쓰지 않는다.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { CATALOG_PATH, loadCatalog } from "./e2e-sample/catalog.ts";
import { realLookupJson } from "./e2e-sample/commons.ts";
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
    lookupJson: realLookupJson,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    recordHashes,
  });
  if (!result.ok) {
    console.error(`내려받기 실패: ${result.reason}`);
    return 1;
  }

  for (const file of result.accepted) console.log(`새 썸네일 변형을 받아들였다: ${file} (원본 sha1 확인)`);
  if (result.changed) {
    writeFileSync(CATALOG_PATH(), `${JSON.stringify(result.photos, null, 2)}\n`, "utf8");
    console.log("photos.json을 고쳤다 (받아들인 변형·빈 정체 필드 채움) — git diff로 보고 커밋한다.");
  }
  console.log(`사진 ${result.photos.length}장 준비됨 (새로 받음 ${result.downloaded}, 캐시 ${result.cached}) → ${CACHE_DIR()}`);
  return 0;
}

process.exit(await main());
