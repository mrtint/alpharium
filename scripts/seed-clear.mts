#!/usr/bin/env node
/**
 * 심은 것을 치운다 (FR-011·012).
 *
 * 계약: specs/010-synthetic-day-fixture/contracts/cli.md 「seed:clear」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **사람이 지시할 때만 돈다**(FR-011a, 명확화 Q4). `seed-day.mts`가 끝나면서 부르지
 * 않고, 에이전트가 검증을 마쳤다는 이유로 부르지도 않는다.
 *
 * **왜 자동으로 치우지 않는가**: 심은 하루는 검증의 대상이지 부산물이 아니다. 한 번
 * 돌고 치워 버리면 사람이 그 화면을 눈으로 볼 수 없고, 여러 캐릭터로 같은 하루를
 * 써 보는 것도 불가능해진다.
 *
 * **전용 폴더 안의 것만 지운다**(FR-016a). 개발자의 개인 기기에서 돌아야 하므로,
 * 판단이 틀려도 진짜 사진에 닿을 길이 없어야 한다.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 쓰는 법: `npm run seed:clear` (전부) 또는 `npm run seed:clear -- 2026-08-20` (그 하루만)
 */

import { forgetSeeding } from "./seed/ledger.ts";
import {
  connectedDevices,
  listSeedFolder,
  queryFolder,
  removeFile,
  removeSeedFolder,
  scanVolume,
  SEED_FOLDER,
} from "./seed/device.ts";
import { EXIT_FAILED, EXIT_OK } from "./seed/output.ts";

/** 치우기의 결과. `RunResult`와 다르다 — 심는 것이 아니므로 담을 것이 다르다 */
type ClearResult =
  { ok: true; removed: number; remaining: number } | { ok: false; reason: string; detail: string };

function finish(result: ClearResult, lines: string[], code: number): never {
  for (const line of lines) console.log(line);
  console.log(JSON.stringify(result));
  process.exit(code);
}

function main(): never {
  const [day] = process.argv.slice(2);

  const devices = connectedDevices();
  if (!devices.ok) {
    finish(
      { ok: false, reason: "no-device", detail: devices.detail },
      ["실패: 기기를 찾지 못했다"],
      EXIT_FAILED,
    );
  }
  if (devices.value.length !== 1) {
    const detail =
      devices.value.length === 0
        ? "붙어 있는 기기가 없다"
        : `기기가 여럿이다 (${devices.value.join(", ")})`;
    finish({ ok: false, reason: "no-device", detail }, [`실패: ${detail}`], EXIT_FAILED);
  }

  // 1. 지우기 전에 센다
  const before = listSeedFolder();
  if (!before.ok) {
    finish(
      { ok: false, reason: "list-failed", detail: before.detail },
      ["실패: 폴더를 읽지 못했다"],
      EXIT_FAILED,
    );
  }

  // 하루를 지정하면 그 하루의 파일만 고른다. 파일명이 `YYYY-MM-DD-NNN.jpg`다.
  const targets = day === undefined ? before.value : before.value.filter((f) => f.startsWith(day));

  if (targets.length === 0) {
    // **지울 것이 없으면 오류가 아니다.** 그 사실을 알린다(FR-012의 계약)
    finish(
      { ok: true, removed: 0, remaining: before.value.length },
      [day === undefined ? "지울 것이 없다." : `${day}에 심은 것이 없다.`],
      EXIT_OK,
    );
  }

  // 2. 지운다. **전용 폴더 안으로만 간다**(FR-016a)
  let failed = 0;
  if (day === undefined) {
    // 폴더째 — `removeSeedFolder()`가 인자를 받지 않으므로 밖으로 나갈 수 없다
    if (!removeSeedFolder().ok) failed = targets.length;
  } else {
    for (const name of targets) {
      // 경로를 우리가 만든다. 파일명이 폴더를 벗어나게 하는 것을 막는다.
      if (name.includes("/") || name.includes("..")) {
        failed++;
        continue;
      }
      if (!removeFile(`${SEED_FOLDER}/${name}`).ok) failed++;
    }
  }

  // 3. ★ 볼륨 스캔 — 빠뜨리면 MediaStore에 유령 행이 남는다(research.md §5 실측)
  const scanned = scanVolume();

  // 4. 유령 행이 없는지 확인한다
  const rows = queryFolder();
  const ghosts = rows.ok
    ? rows.value.filter((r) => day === undefined || r.path.includes(`/${day}-`)).length
    : -1;

  // 5. 기록에서 지운다
  forgetSeeding(day);

  const removed = targets.length - failed;

  if (failed > 0) {
    // **조용히 넘기지 않는다**(FR-012b)
    finish(
      {
        ok: false,
        reason: "remove-failed",
        detail: `${targets.length}장 중 ${failed}장을 지우지 못했다`,
      },
      [`⚠️ ${targets.length}장 중 ${failed}장을 지우지 못했다 — 기기에 남아 있다.`],
      EXIT_FAILED,
    );
  }

  if (!scanned.ok || ghosts > 0) {
    // 파일은 지웠는데 MediaStore가 아직 그것을 안다 — 앱이 계속 본다
    finish(
      {
        ok: false,
        reason: "scan-failed",
        detail: ghosts > 0 ? `유령 행 ${ghosts}개가 남았다` : scanned.ok ? "" : scanned.detail,
      },
      ["⚠️ 파일은 지웠으나 미디어 목록이 아직 그것을 안다 — 앱에 계속 보일 수 있다."],
      EXIT_FAILED,
    );
  }

  const after = listSeedFolder();
  finish(
    { ok: true, removed, remaining: after.ok ? after.value.length : 0 },
    [`${removed}장을 지웠다.`],
    EXIT_OK,
  );
}

main();
