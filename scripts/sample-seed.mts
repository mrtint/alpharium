/**
 * 070 — 30일치 표본을 기기에 심는다 (`npm run sample:seed`). 층 1 실행기 앞단과 같은 코드(`ensureSample`)를 부른다.
 *
 * 계약: specs/070-e2e-sample-seed/contracts/sample-seeding.md S-1~S-6, G-1~G-5
 *
 * **전용 테스트 기기에서만 돌린다** — 볼륨 전체를 다시 훑고 `PocketlogSeed/`의 `s30-` 사진을 지우고 다시 심는다. 010 사진·진짜 사진은 건드리지 않는다.
 * 먼저 `npm run sample:fetch`로 캐시에 사진을 받아 둔다(내려받기는 여기서 하지 않는다).
 */

import { loadCatalog } from "./e2e-sample/catalog.ts";
import { adbSampleDevice } from "./e2e-sample/device.ts";
import { ensureSample } from "./e2e-sample/ensure.ts";
import { realSampleFs } from "./e2e-sample/fs-port.ts";
import { connectedDevices } from "./seed/device.ts";

async function main(): Promise<number> {
  const devices = connectedDevices();
  if (!devices.ok) {
    console.error(`기기를 확인하지 못했다: ${devices.detail}`);
    return 1;
  }
  if (devices.value.length !== 1) {
    console.error(
      devices.value.length === 0
        ? "붙어 있는 기기가 없다"
        : `기기가 여럿이다 (${devices.value.join(", ")}) — 하나만 남기고 다시 부른다`,
    );
    return 1;
  }

  const catalog = loadCatalog();
  if (!catalog.ok) {
    console.error("사진 목록이 규칙을 어긴다:");
    for (const problem of catalog.problems) console.error(`  - ${problem}`);
    return 1;
  }

  console.log("전용 테스트 기기에서만 — PocketlogSeed/ 의 s30- 사진을 지우고 다시 심는다.");
  const result = await ensureSample({
    device: adbSampleDevice(),
    fs: realSampleFs(),
    catalog: catalog.photos,
    now: new Date(),
    log: (line) => console.log(line),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  });
  if (result.status === "failed") {
    console.error(`표본 보장 실패(${result.reason}): ${result.detail}`);
    return 1;
  }
  return 0;
}

process.exit(await main());
