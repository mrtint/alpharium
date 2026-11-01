#!/usr/bin/env node
/**
 * 실제 iPhone의 사진 보관함에 합성 하루의 사진을 심는다 (087). 안드로이드 `npm run seed:day`(010)의 iOS 짝.
 *
 * 쓰는 법: `npm run ios:seed -- --day 2026-10-17 --count 8 --photos <JPEG 폴더> [--no-gps] [--device <UDID>]`
 *          `npm run ios:seed -- --range 15 --count 4 --photos <JPEG 폴더>` — 요청 당일 앞뒤 15일(오늘 포함 31일) 날마다 4장
 *
 * 흐름: PocketSeed.dylib 빌드·서명 → 사진·계획·dylib을 앱 컨테이너(`Documents/seed-ios/`)에 `devicectl`로 올림 → 앱을 새로 띄움 →
 *       lldb가 앱 프로세스에 붙어 dylib을 `dlopen`하고 `PocketSeedStart`를 부름 → 상태 파일을 읽어 끝을 기다림.
 *
 * **앱의 일부가 아니다.** 일기를 만들지도 읽지도 않는다(원칙 IV) — 심는 것은 입력(사진)뿐이다. 마지막 줄은 항상 JSON이다.
 * 전제: 개발 서명 빌드(`get-task-allow`)가 깔려 있고 앱에 사진 읽기·쓰기 권한이 허용돼 있다. **Xcode를 꺼 둔다**(켜 두면 lldb attach가 멈춘다).
 */

import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildLldbScript,
  buildRangePlan,
  daysAround,
  DYLIB_PATH,
  parseArgs,
  planPathOf,
  runDir,
} from "./plan.ts";

const BUNDLE_ID = "com.a810labs.pocketlog";
/** dylib은 앱과 같은 팀의 인증서로 서명해야 `dlopen`된다 */
const TEAM_ID = "PGNGG84B39";
const APP_START_WAIT_MS = 20_000;
const ATTACH_WAIT_SEC = 280;
const STATUS_POLL_MS = 3_000;
const STATUS_WAIT_MS = 5 * 60_000;

const here = dirname(fileURLToPath(import.meta.url));
const env = {
  ...process.env,
  DEVELOPER_DIR: process.env.DEVELOPER_DIR ?? "/Applications/Xcode.app/Contents/Developer",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const run = (cmd: string, args: string[], opts: { timeout?: number } = {}) =>
  execFileSync(cmd, args, {
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: opts.timeout,
  });

function fail(reason: string): never {
  console.log(JSON.stringify({ ok: false, reason }));
  process.exit(1);
}

function pickDevice(requested: string | undefined): string {
  const explicit = requested ?? process.env.POCKETLOG_IOS_DEVICE;
  if (explicit) return explicit;
  const out = join(mkdtempSync(join(tmpdir(), "ios-seed-")), "devices.json");
  run("xcrun", ["devicectl", "list", "devices", "--json-output", out]);
  const devices: {
    identifier: string;
    deviceProperties?: { name?: string };
    hardwareProperties?: { deviceType?: string };
    connectionProperties?: { pairingState?: string };
  }[] = JSON.parse(readFileSync(out, "utf8")).result.devices;
  const phones = devices.filter(
    (d) =>
      d.hardwareProperties?.deviceType === "iPhone" &&
      d.connectionProperties?.pairingState === "paired",
  );
  if (phones.length !== 1)
    fail(
      `페어링된 iPhone이 ${phones.length}대다 — --device <UDID> 또는 POCKETLOG_IOS_DEVICE로 고른다: ${phones.map((d) => `${d.deviceProperties?.name} ${d.identifier}`).join(", ")}`,
    );
  return phones[0].identifier;
}

function signingIdentity(dylib: string): string {
  const explicit = process.env.POCKETLOG_IOS_DEV_IDENTITY;
  const listing = run("security", ["find-identity", "-v", "-p", "codesigning"]);
  const candidates = explicit
    ? [explicit]
    : [...listing.matchAll(/([0-9A-F]{40}) "Apple Development/g)].map((m) => m[1]);
  for (const id of candidates) {
    const signed = spawnSync("codesign", ["-f", "-s", id, dylib], { encoding: "utf8" });
    if (signed.status !== 0) continue;
    const info = spawnSync("codesign", ["-dv", dylib], { encoding: "utf8" }).stderr;
    if (info.includes(`TeamIdentifier=${TEAM_ID}`)) return id;
  }
  return fail(
    `팀 ${TEAM_ID}의 Apple Development 서명 ID를 찾지 못했다 — POCKETLOG_IOS_DEV_IDENTITY에 SHA1을 준다`,
  );
}

function buildDylib(stage: string): void {
  const dylib = join(stage, "PocketSeed.dylib");
  run("xcrun", [
    "--sdk",
    "iphoneos",
    "clang",
    "-arch",
    "arm64",
    "-miphoneos-version-min=15.0",
    "-dynamiclib",
    "-fobjc-arc",
    "-framework",
    "Foundation",
    "-framework",
    "Photos",
    "-framework",
    "CoreLocation",
    join(here, "PocketSeed.m"),
    "-o",
    dylib,
  ]);
  signingIdentity(dylib);
}

function appPid(device: string): number | undefined {
  const text = run("xcrun", ["devicectl", "device", "info", "processes", "--device", device]);
  const m = text.match(/^\s*(\d+)\s+\S*Pocketlog\.app\/Pocketlog/m);
  return m ? Number(m[1]) : undefined;
}

function readDeviceFile(device: string, rel: string, to: string): boolean {
  const r = spawnSync(
    "xcrun",
    [
      "devicectl",
      "device",
      "copy",
      "from",
      "--device",
      device,
      "--domain-type",
      "appDataContainer",
      "--domain-identifier",
      BUNDLE_ID,
      "--source",
      rel,
      "--destination",
      to,
    ],
    { env, encoding: "utf8" },
  );
  return r.status === 0 && existsSync(to);
}

const args = (() => {
  try {
    return parseArgs(process.argv.slice(2));
  } catch (e) {
    return fail((e as Error).message);
  }
})();

const photosDir = args.photos ? resolve(args.photos) : undefined;
if (!photosDir || !existsSync(photosDir))
  fail("--photos <JPEG 폴더>가 필요하다 (예: .cache/e2e-sample의 사진)");
const photos = readdirSync(photosDir)
  .filter((f) => /\.jpe?g$/i.test(f))
  .sort()
  .map((f) => join(photosDir, f));
if (photos.length === 0) fail(`${photosDir}에 JPEG가 없다`);

const device = pickDevice(args.device);
const runId = `r${Date.now()}`;
const tzMin = -new Date().getTimezoneOffset();
const tz = `${tzMin >= 0 ? "+" : "-"}${String(Math.floor(Math.abs(tzMin) / 60)).padStart(2, "0")}:${String(Math.abs(tzMin) % 60).padStart(2, "0")}`;
const days = args.range !== undefined ? daysAround(new Date(), args.range) : [args.day as string];
const total = days.length * args.count;
const { plan, uploads } = buildRangePlan({
  runId,
  days,
  count: args.count,
  photos,
  tz,
  gps: args.gps,
});

if (spawnSync("pgrep", ["-x", "Xcode"]).status === 0)
  console.error("경고: Xcode가 켜져 있다 — lldb attach가 멈출 수 있다. 끄고 다시 돌린다.");

// 1. 빌드·서명, 2. 올릴 것을 한 폴더에 모아 올린다
const stage = mkdtempSync(join(tmpdir(), "ios-seed-stage-"));
buildDylib(stage);
mkdirSync(join(stage, runId, "photos"), { recursive: true });
for (const u of uploads)
  copyFileSync(u.from, join(stage, u.to.slice(`Documents/seed-ios/`.length)));
writeFileSync(join(stage, runId, "plan.json"), JSON.stringify(plan));
run("xcrun", [
  "devicectl",
  "device",
  "copy",
  "to",
  "--device",
  device,
  "--domain-type",
  "appDataContainer",
  "--domain-identifier",
  BUNDLE_ID,
  "--source",
  stage,
  "--destination",
  "Documents/seed-ios",
]);

// 3. 앱을 새로 띄우고 lldb로 붙어 dylib을 부른다
run("xcrun", [
  "devicectl",
  "device",
  "process",
  "launch",
  "--device",
  device,
  "--terminate-existing",
  BUNDLE_ID,
]);
await sleep(APP_START_WAIT_MS);
const pid = appPid(device);
if (pid === undefined) fail("앱 프로세스를 찾지 못했다 — 기기 잠금을 풀고 다시 돌린다");
const lldbFile = join(stage, "seed.lldb");
writeFileSync(
  lldbFile,
  buildLldbScript({
    device,
    pid,
    planPath: planPathOf(runId),
    dylibPath: DYLIB_PATH,
    attachWaitSec: ATTACH_WAIT_SEC,
  }),
);
const lldb = spawnSync("xcrun", ["lldb", "-b", "-s", lldbFile], {
  env,
  encoding: "utf8",
  timeout: (ATTACH_WAIT_SEC + 60) * 1000,
});
if (!/\(int\) \$\d+ = 1/.test(lldb.stdout ?? ""))
  fail(`PocketSeedStart를 부르지 못했다 (lldb 출력 끝: ${(lldb.stdout ?? "").slice(-300)})`);

// 4. 상태 파일을 읽어 끝을 기다린다
const statusLocal = join(stage, "status.json");
const deadline = Date.now() + STATUS_WAIT_MS;
let status:
  | { done?: boolean; fatal?: string; results?: { ok: boolean; id?: string; error?: string }[] }
  | undefined;
while (Date.now() < deadline) {
  await sleep(STATUS_POLL_MS);
  if (!readDeviceFile(device, plan.statusPath, statusLocal)) continue;
  status = JSON.parse(readFileSync(statusLocal, "utf8"));
  if (status?.done) break;
}
if (!status?.done) fail("상태 파일이 끝나지 않았다 — 기기에서 사진 보관함을 확인한다");
if (status.fatal) fail(`심기를 시작하지 못했다: ${status.fatal}`);
const results = status.results ?? [];
const seeded = results.filter((r) => r.ok).length;
console.log(
  JSON.stringify({
    ok: seeded === total,
    days: days.length === 1 ? days[0] : `${days[0]}..${days[days.length - 1]}`,
    requested: total,
    seeded,
    runDir: runDir(runId),
    errors: results.filter((r) => !r.ok).map((r) => r.error),
  }),
);
process.exit(seeded === total ? 0 : 1);
