#!/usr/bin/env node
/**
 * 가상의 하루를 기기에 심는다 (010).
 *
 * 계약: specs/010-synthetic-day-fixture/contracts/cli.md
 *       specs/010-synthetic-day-fixture/contracts/seeding.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 도구는 앱의 일부가 아니다**(FR-001). `scripts/`에 있으므로 번들에 들어갈 길이
 * 없다 — 조심해서 안 넣는 것이 아니라 **넣을 수 없는 것**이 방어다.
 *
 * **도구는 일기를 만들지도 읽지도 않는다**(FR-003·022, 헌법 원칙 IV). 심는 것은
 * **입력(사진)**이고, 일기는 여전히 기기에서 생성된다.
 *
 * **에이전트가 부른다**(명확화 Q2). 대화형 되묻기가 없고, 마지막 줄이 항상 JSON이며,
 * 종료 코드가 성공과 실패를 가른다.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 쓰는 법: `npm run seed:day -- <모양> <YYYY-MM-DD>`
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { patchDate, patchLocation } from "./seed/exif.ts";
import { planSeeding } from "./seed/plan.ts";
import { pickNoGpsSample, pickWithGpsSample } from "./seed/samples.ts";
import { shapeNames } from "./seed/shapes.ts";
import { recordSeeding, type SeededPhoto } from "./seed/ledger.ts";
import { verifySeeded } from "./seed/verify.ts";
import {
  connectedDevices,
  listSeedFolder,
  pushFile,
  queryFolder,
  removeFile,
  scanFile,
  scanVolume,
  SEED_FOLDER,
} from "./seed/device.ts";
import {
  describeRun,
  failure,
  report,
  EXIT_DIRTY,
  EXIT_FAILED,
  EXIT_OK,
  type RunResult,
} from "./seed/output.ts";

/**
 * 색인이 끝나기를 기다리는 횟수와 간격.
 *
 * **실측에서 2초면 됐으나 표본이 적다**(research.md 짐작 표, 원칙 V). 그래서 한 번
 * 물어보고 포기하지 않고 몇 번 다시 묻는다 — **없다고 단정하기 전에 기다린다.**
 */
const VERIFY_ATTEMPTS = 5;
const VERIFY_INTERVAL_MS = 800;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function finish(result: RunResult, code: number): never {
  report(result, describeRun(result));
  process.exit(code);
}

/** 이번 실행이 넣은 것만 치운다. `existing`은 사람이 지시하지 않았으므로 건드리지 않는다 */
function cleanup(pushed: string[]): boolean {
  let clean = true;
  for (const path of pushed) {
    if (!removeFile(path).ok) clean = false;
  }
  // 지운 뒤 유령 행이 남지 않게 한다(research.md §5)
  if (pushed.length > 0 && !scanVolume().ok) clean = false;
  return clean;
}

async function main(): Promise<never> {
  const [shapeName, day] = process.argv.slice(2);

  // ── 0단계: 심기 전 확인. 아무것도 안 만진다 ──────────────────────────────
  if (!shapeName || !day) {
    // **되묻지 않는다**(FR-018). 에이전트가 부르므로 대화형 자리를 두지 않는다.
    finish(
      failure(
        "unknown-shape",
        `쓰는 법: npm run seed:day -- <모양> <YYYY-MM-DD>. 모양: ${shapeNames().join(", ")}`,
      ),
      EXIT_FAILED,
    );
  }

  const devices = connectedDevices();
  if (!devices.ok) finish(failure("no-device", devices.detail), EXIT_FAILED);
  if (devices.value.length === 0) {
    finish(failure("no-device", "붙어 있는 기기가 없다"), EXIT_FAILED);
  }
  if (devices.value.length > 1) {
    // 대상을 특정할 수 없다. 임의로 고르면 엉뚱한 기기에 심는다.
    finish(
      failure(
        "no-device",
        `기기가 여럿이다 (${devices.value.join(", ")}). 하나만 남기고 다시 부른다`,
      ),
      EXIT_FAILED,
    );
  }

  const planned = planSeeding(shapeName, day, new Date());
  if (!planned.ok) finish(failure(planned.reason, planned.detail), EXIT_FAILED);

  // ── 1단계: 이미 있는 것 세기 (FR-011b) ────────────────────────────────────
  const before = listSeedFolder();
  if (!before.ok) finish(failure("push-failed", before.detail), EXIT_FAILED);
  const existing = before.value.length;

  // ── 2단계: EXIF 패치 (개발 기계 안, 기기에 안 닿는다) ─────────────────────
  // 사진마다 새로 고른다 — `scripts/samples/`에 여럿 있으면 장마다 다른 실사
  // 이미지가 쓰인다(scripts/samples/README.md). 비어 있으면 검은 단색 템플릿이다.
  const workDir = mkdtempSync(join(tmpdir(), "alpharium-seed-"));
  const pushed: string[] = [];
  const recorded: SeededPhoto[] = [];

  try {
    for (const [index, photo] of planned.day.photos.entries()) {
      const hasLocation = photo.location !== null;
      let buffer: Buffer;

      try {
        const source = readFileSync(hasLocation ? pickWithGpsSample() : pickNoGpsSample());
        buffer = patchDate(source, new Date(photo.takenAtMs));
        if (photo.location !== null) {
          buffer = patchLocation(buffer, photo.location.latitude, photo.location.longitude);
        }
      } catch (error) {
        // EXIF 패치 실패는 기기에 닿기 전이므로 치울 것이 없다
        cleanup(pushed);
        finish(failure("push-failed", `EXIF 패치 실패: ${String(error)}`), EXIT_FAILED);
      }

      // 파일명이 어느 하루의 몇 번째인지 말한다 — 하루별 되돌리기가 이것을 쓴다
      const name = `${day}-${String(index).padStart(3, "0")}.jpg`;
      const localPath = join(workDir, name);
      const devicePath = `${SEED_FOLDER}/${name}`;
      writeFileSync(localPath, buffer);

      // ── 3단계: 밀어 넣기 ────────────────────────────────────────────────
      const push = pushFile(localPath, devicePath);
      if (!push.ok) {
        // **절반만 심긴 상태를 남기지 않는다**(FR-019)
        const clean = cleanup(pushed);
        finish(
          failure(clean ? "push-failed" : "cleanup-failed", push.detail),
          clean ? EXIT_FAILED : EXIT_DIRTY,
        );
      }
      pushed.push(devicePath);
      recorded.push({ devicePath, takenAtMs: photo.takenAtMs, hasLocation });

      // ── 4단계: 색인 ─────────────────────────────────────────────────────
      // ⚠️ `content call scan_file`만 실제로 동작한다(research.md §3)
      const scan = scanFile(devicePath);
      if (!scan.ok) {
        const clean = cleanup(pushed);
        finish(
          failure(clean ? "index-failed" : "cleanup-failed", scan.detail),
          clean ? EXIT_FAILED : EXIT_DIRTY,
        );
      }
    }

    // ── 5단계: ★ 되읽어 확인 (FR-018d) ──────────────────────────────────────
    // **「push 성공」은 「심겼다」가 아니다**(research.md §1 실측)
    const expected = planned.day.photos.length;
    const mineOnly = (rows: { path: string; datetakenMs: number | null }[]) =>
      // 이번에 넣은 것만 본다 — `existing`은 앞선 실행의 것이다
      rows.filter((r) => pushed.some((p) => r.path.endsWith(p.split("/").pop()!)));

    let verdict = verifySeeded([], day, expected);

    // 색인이 끝나기를 기다린다. **없다고 단정하기 전에 몇 번 다시 묻는다**
    for (let attempt = 0; attempt < VERIFY_ATTEMPTS; attempt++) {
      if (attempt > 0) await sleep(VERIFY_INTERVAL_MS);

      const rows = queryFolder();
      if (!rows.ok) {
        const clean = cleanup(pushed);
        finish(
          failure(clean ? "index-failed" : "cleanup-failed", rows.detail),
          clean ? EXIT_FAILED : EXIT_DIRTY,
        );
      }

      verdict = verifySeeded(mineOnly(rows.value), day, expected);
      if (verdict.ok) break;

      // 시간대가 어긋난 것은 기다려도 안 바뀐다 — 곧바로 그만둔다
      if (verdict.reason === "verify-mismatch") break;
    }

    if (!verdict.ok) {
      const clean = cleanup(pushed);
      finish(
        failure(
          clean ? verdict.reason : "cleanup-failed",
          clean ? verdict.detail : `${verdict.detail} (치우지도 못했다)`,
        ),
        clean ? EXIT_FAILED : EXIT_DIRTY,
      );
    }

    // ── 6단계: 기록 ─────────────────────────────────────────────────────────
    recordSeeding({
      day,
      shape: shapeName,
      seededAtMs: Date.now(),
      photos: recorded,
    });

    finish(
      {
        ok: true,
        day,
        shape: shapeName,
        seeded: recorded.length,
        withLocation: recorded.filter((p) => p.hasLocation).length,
        existing,
      },
      EXIT_OK,
    );
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

void main();
