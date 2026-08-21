#!/usr/bin/env node
/**
 * 지금 기기에 무엇이 심겨 있나 (FR-011c).
 *
 * 계약: specs/010-synthetic-day-fixture/contracts/cli.md 「seed:list」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **치우는 것과 별개로 물을 수 있어야 한다.**
 *
 * 자동으로 치우지 않기로 했으므로(명확화 Q4) **남은 것이 안 보이는 일이 없어야
 * 한다**(FR-011b). 008에서 받다 만 모델 셋이 기기에 남았고 앱에서 치울 길이 없었던
 * 것이 이 자리의 선례다.
 *
 * **기기의 폴더를 실제로 세어서 답한다.** 기록만 읽으면 어긋난 것을 못 본다 —
 * 기록은 편의이고 **폴더가 경계다**(data-model.md).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readLedger } from "./seed/ledger.ts";
import { connectedDevices, listSeedFolder } from "./seed/device.ts";
import { EXIT_FAILED, EXIT_OK } from "./seed/output.ts";

type DaySummary = { day: string; count: number; shape: string | null };

type ListResult =
  { ok: true; total: number; days: DaySummary[] } | { ok: false; reason: string; detail: string };

function finish(result: ListResult, lines: string[], code: number): never {
  for (const line of lines) console.log(line);
  console.log(JSON.stringify(result));
  process.exit(code);
}

function main(): never {
  const devices = connectedDevices();
  if (!devices.ok || devices.value.length !== 1) {
    const detail = !devices.ok
      ? devices.detail
      : devices.value.length === 0
        ? "붙어 있는 기기가 없다"
        : `기기가 여럿이다 (${devices.value.join(", ")})`;
    finish({ ok: false, reason: "no-device", detail }, [`실패: ${detail}`], EXIT_FAILED);
  }

  const listed = listSeedFolder();
  if (!listed.ok) {
    finish(
      { ok: false, reason: "list-failed", detail: listed.detail },
      ["실패: 폴더를 읽지 못했다"],
      EXIT_FAILED,
    );
  }

  // 파일명이 `YYYY-MM-DD-NNN.jpg`다. 하루별로 센다.
  const counts = new Map<string, number>();
  for (const name of listed.value) {
    const match = /^(\d{4}-\d{2}-\d{2})-\d+\.jpg$/.exec(name);
    if (match === null) continue;
    counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }

  // 어느 모양으로 심었는지는 **기록에서** 온다 — 기기는 그것을 모른다.
  // 기록이 없어도 개수는 답할 수 있다(폴더가 경계다).
  const ledger = readLedger();
  const shapeOf = (day: string) =>
    ledger.entries.filter((e) => e.day === day).at(-1)?.shape ?? null;

  const days: DaySummary[] = [...counts.entries()]
    .map(([day, count]) => ({ day, count, shape: shapeOf(day) }))
    .sort((a, b) => b.day.localeCompare(a.day));

  const total = days.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    finish({ ok: true, total: 0, days: [] }, ["기기에 심긴 사진이 없다."], EXIT_OK);
  }

  const lines = [`기기에 심긴 사진 ${total}장:`];
  for (const d of days) {
    lines.push(`  ${d.day} — ${d.count}장${d.shape === null ? "" : ` (${d.shape})`}`);
  }
  lines.push("치우려면: npm run seed:clear");

  finish({ ok: true, total, days }, lines, EXIT_OK);
}

main();
