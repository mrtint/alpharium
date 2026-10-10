/**
 * 070 — 표본 보장: 기기를 되읽어 표본이 표와 맞으면 건너뛰고, 아니면 `s30-` 사진만 지우고 다시 심는다.
 *
 * 계약: specs/070-e2e-sample-seed/contracts/sample-seeding.md S-1~S-6, G-1~G-5
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **표식(`s30-marker.txt`)만 믿지 않는다.** 표식은 기기의 `PocketlogSeed/` 안 텍스트 파일이고(기준일·표 지문·사진 수) 개발 기계에는 기록을 두지 않는다
 * (clarify Q1). 건너뛰려면 표식이 맞고 **기기의 사진을 되읽은 결과도 표와 맞아야** 한다 — `seed:clear`로 지웠거나 일부가 빠졌거나 `datetaken`이
 * NULL인 기기를 표식만으로 통과시키면 흐름이 거짓 통과·거짓 실패를 한다.
 *
 * **어떤 단계도 던지지 않는다.** 기기 접근은 `SampleDevice`, 파일 접근은 `SampleFs`로 주입받고 실패는 값으로 돌려준다 — 기기 없이 테스트된다.
 * 이 파일은 `fs`·`adb`를 직접 import하지 않는다.
 *
 * 삭제는 `s30-` 접두 사진과 표식뿐이다(010 사진·소유자의 진짜 사진은 건드리지 않는다). 색인은 `scan_volume` 한 번이다(research R1).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { dayBounds, dayOf } from "../../src/config/day-boundary.ts";
import type { CatalogPhoto } from "./catalog.ts";
import { writeExif } from "./exif-write.ts";
import { fingerprint, planSample, type SeedItem } from "./plan.ts";

export type Outcome<T> = { ok: true; value: T } | { ok: false; detail: string };
export type MediaRow = { path: string; datetakenMs: number | null };

/** 표식 파일 이름 — `s30-` 접두라 삭제 대상에 든다 */
export const MARKER_NAME = "s30-marker.txt";

/** 되읽은 촬영 시각이 계획 시각과 이만큼(ms) 안이면 같다고 본다 — 스캐너가 초 단위·시간대 보정을 다룰 수 있다 */
export const TIME_TOLERANCE_MS = 2 * 60 * 1000;

const VERIFY_ATTEMPTS = 5;
const VERIFY_INTERVAL_MS = 800;

export interface SampleDevice {
  /** 로컬 폴더의 내용을 `PocketlogSeed/`로 밀어 넣는다 (하위 폴더 구조 유지) */
  pushDir(localDir: string): Outcome<void>;
  /** `s30-` 접두 사진과 표식만 지운다 */
  removeSampleFiles(): Outcome<void>;
  scanVolume(): Outcome<void>;
  /** `PocketlogSeed` 아래 `s30-` 사진의 MediaStore 행들 */
  queryRows(): Outcome<MediaRow[]>;
  readMarker(): Outcome<string | null>;
  writeMarker(text: string): Outcome<void>;
}

export interface SampleFs {
  /** 캐시의 사진 바이트. 없으면 null */
  readCached(file: string): Buffer | null;
  makeTempDir(): string;
  writeFile(path: string, bytes: Buffer): void;
  cleanup(dir: string): void;
}

export type EnsureReason = "missing-cache" | "push-failed" | "index-failed" | "verify-mismatch";

export type EnsureResult =
  | { status: "skipped" }
  | { status: "seeded"; seededCount: number; seconds: number }
  | { status: "failed"; reason: EnsureReason; detail: string };

export type EnsureOptions = {
  device: SampleDevice;
  fs: SampleFs;
  catalog: readonly CatalogPhoto[];
  now: Date;
  log: (line: string) => void;
  sleep: (ms: number) => Promise<void>;
};

export type Marker = { anchor: string; fingerprint: string; photos: number };

export function formatMarker(marker: Marker): string {
  return `anchor=${marker.anchor}\nfingerprint=${marker.fingerprint}\nphotos=${marker.photos}\n`;
}

/** 표식을 읽는다. 읽을 수 없거나 키가 빠지면 null — 「표식 없음」이다 */
export function parseMarker(text: string | null): Marker | null {
  if (text === null) return null;
  const values = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const m = /^([a-z]+)=(.*)$/.exec(line.trim());
    if (m !== null) values.set(m[1], m[2]);
  }
  const anchor = values.get("anchor");
  const fp = values.get("fingerprint");
  const photos = Number(values.get("photos"));
  if (anchor === undefined || fp === undefined || !Number.isInteger(photos)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor) || !/^[0-9a-f]{16}$/.test(fp)) return null;
  return { anchor, fingerprint: fp, photos };
}

type Verdict = { ok: true } | { ok: false; reason: "index-failed" | "verify-mismatch"; detail: string };

/**
 * 되읽은 행이 계획과 같은지 본다. **색인 실패를 시간대 어긋남보다 먼저 본다**(010 `verifySeeded`와 같은 원칙) —
 * `datetaken`이 NULL인 것과 엉뚱한 하루에 걸린 것은 대응이 다르다.
 */
export function verifyRows(items: readonly SeedItem[], rows: readonly MediaRow[]): Verdict {
  const byName = new Map(rows.map((r) => [r.path.split("/").pop() ?? r.path, r]));

  const missing = items.filter((i) => !byName.has(i.deviceName));
  if (missing.length > 0) {
    return {
      ok: false,
      reason: "index-failed",
      detail: `${items.length}장 중 ${missing.length}장이 보관함에 없다 (예: ${missing[0].deviceName})`,
    };
  }
  const unindexed = items.filter((i) => byName.get(i.deviceName)!.datetakenMs === null);
  if (unindexed.length > 0) {
    return {
      ok: false,
      reason: "index-failed",
      detail: `${unindexed.length}장의 촬영 시각(datetaken)이 비어 있다 (예: ${unindexed[0].deviceName}) — 파일은 있어도 앱은 그 사진을 어느 하루에서도 보지 못한다`,
    };
  }
  if (rows.length !== items.length) {
    return {
      ok: false,
      reason: "verify-mismatch",
      detail: `표본 사진이 ${items.length}장이어야 하는데 보관함에는 ${rows.length}장이다 (남은 파일)`,
    };
  }

  for (const item of items) {
    const taken = byName.get(item.deviceName)!.datetakenMs!;
    const { startMs, endMs } = dayBounds(item.day);
    if (taken < startMs || taken >= endMs) {
      return {
        ok: false,
        reason: "verify-mismatch",
        detail: `${item.deviceName}이 ${item.day}가 아니라 ${dayOf(new Date(taken))}로 잡혔다. 개발 기계와 기기의 시간대가 다를 수 있다`,
      };
    }
    if (Math.abs(taken - item.takenAt.getTime()) > TIME_TOLERANCE_MS) {
      return {
        ok: false,
        reason: "verify-mismatch",
        detail: `${item.deviceName}의 촬영 시각이 계획과 ${Math.round(Math.abs(taken - item.takenAt.getTime()) / 60000)}분 다르다`,
      };
    }
  }
  return { ok: true };
}

/** 던지는 대역·기기가 있어도 값으로 바꾼다 */
function guarded<T>(label: string, action: () => Outcome<T>): Outcome<T> {
  try {
    return action();
  } catch (error) {
    return { ok: false, detail: `${label}: ${String(error)}` };
  }
}

export async function ensureSample(options: EnsureOptions): Promise<EnsureResult> {
  const { device, fs, catalog, now, log, sleep } = options;
  const started = Date.now();

  let items: SeedItem[];
  try {
    items = planSample(catalog, now);
  } catch (error) {
    return { status: "failed", reason: "missing-cache", detail: String(error) };
  }
  const print = fingerprint(items, catalog);
  const anchor = dayOf(now);

  // 1) 건너뛸 수 있나 — 표식과 기기 되읽기가 둘 다 맞아야 한다
  const markerRead = guarded("표식 읽기", () => device.readMarker());
  const marker = markerRead.ok ? parseMarker(markerRead.value) : null;
  if (
    marker !== null &&
    marker.anchor === anchor &&
    marker.fingerprint === print &&
    marker.photos === items.length
  ) {
    const rows = guarded("보관함 조회", () => device.queryRows());
    if (rows.ok && verifyRows(items, rows.value).ok) {
      log(`표본: 건너뜀(맞음, 기준일 ${marker.anchor}, ${items.length}장)`);
      return { status: "skipped" };
    }
  }

  // 2) 캐시에 사진이 다 있나 — 없으면 기기를 건드리지 않고 내려받기를 안내한다
  const bytesOf = new Map<string, Buffer>();
  const absent: string[] = [];
  for (const file of new Set(items.map((i) => i.catalogFile))) {
    const bytes = fs.readCached(file);
    if (bytes === null) absent.push(file);
    else bytesOf.set(file, bytes);
  }
  if (absent.length > 0) {
    return {
      status: "failed",
      reason: "missing-cache",
      detail: `캐시에 사진 ${absent.length}장이 없다 (예: ${absent[0]}) — 먼저 npm run sample:fetch`,
    };
  }

  // 3) 낡은 표본을 치우고 EXIF를 쓴 사진을 로컬 임시 폴더에 만든다
  const removed = guarded("표본 삭제", () => device.removeSampleFiles());
  if (!removed.ok) return { status: "failed", reason: "push-failed", detail: removed.detail };

  const dir = fs.makeTempDir();
  try {
    for (const item of items) {
      const bytes = writeExif(bytesOf.get(item.catalogFile)!, {
        takenAt: item.takenAt,
        coordinate: item.coordinate,
      });
      fs.writeFile(`${dir}/${item.folder}/${item.deviceName}`, bytes);
    }

    // 4) 폴더째 밀어 넣고 볼륨 색인 한 번
    const pushed = guarded("사진 밀어 넣기", () => device.pushDir(dir));
    if (!pushed.ok) return { status: "failed", reason: "push-failed", detail: pushed.detail };
    const scanned = guarded("색인", () => device.scanVolume());
    if (!scanned.ok) return { status: "failed", reason: "index-failed", detail: scanned.detail };
  } catch (error) {
    return { status: "failed", reason: "push-failed", detail: `사진을 만들지 못했다: ${String(error)}` };
  } finally {
    try {
      fs.cleanup(dir);
    } catch {
      // 임시 폴더를 못 지워도 심은 결과는 그대로다
    }
  }

  // 5) 되읽기 — 색인이 끝나기를 기다린다. 시간대 어긋남은 기다려도 안 바뀌므로 바로 그만둔다
  let verdict: Verdict = { ok: false, reason: "index-failed", detail: "조회하지 못했다" };
  for (let attempt = 0; attempt < VERIFY_ATTEMPTS; attempt += 1) {
    if (attempt > 0) await sleep(VERIFY_INTERVAL_MS);
    const rows = guarded("보관함 조회", () => device.queryRows());
    if (!rows.ok) {
      verdict = { ok: false, reason: "index-failed", detail: rows.detail };
      continue;
    }
    verdict = verifyRows(items, rows.value);
    if (verdict.ok || verdict.reason === "verify-mismatch") break;
  }
  if (!verdict.ok) return { status: "failed", reason: verdict.reason, detail: verdict.detail };

  // 6) 표식 — 검증을 통과한 뒤에만 쓴다
  const written = guarded("표식 쓰기", () =>
    device.writeMarker(formatMarker({ anchor, fingerprint: print, photos: items.length })),
  );
  if (!written.ok) return { status: "failed", reason: "push-failed", detail: written.detail };

  const seconds = Math.round((Date.now() - started) / 100) / 10;
  log(`표본: ${items.length}장 심음(${seconds}초, 기준일 ${anchor})`);
  return { status: "seeded", seededCount: items.length, seconds };
}
