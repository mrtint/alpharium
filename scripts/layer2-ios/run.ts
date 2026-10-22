/**
 * 097 — iOS 층 2 진입점: 실제 `devicectl`·키보드·`ios:seed`를 `runLayer2Ios`에 꽂는다 (`npm run test:layer2:ios`).
 *
 * `run-device-tests.mjs`는 `.ts`를 정적으로 불러오지 않으므로(경고) 동적 import로 이 한 함수만 부른다. 판정은 `runner.ts`에 있다.
 *
 * 인자: 흐름 id를 주면 그것만 돈다(`write-and-read` …), `--operation-timeout <초>`·`--generation-timeout <초>`로 대기 한도를 덮는다(음성 확인용).
 */

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

import type { Outcome } from "../layer1/device.ts";
import { iosPhoneDevice } from "./device.ts";
import { waitForSignalFile } from "./enter-signal.ts";
import { IOS_LAYER2_FLOWS } from "./flows.ts";
import {
  runLayer2Ios,
  SEED_PHOTO_COUNT,
  type IosLayer2Result,
  type PromptPort,
  type SeedPort,
} from "./runner.ts";

/** 사진 시딩에 쓰는 표본 사진 — 잡사진(document)이 아닌 풍경 다섯 장 */
const SEED_PHOTO_FILES = [1, 2, 3, 4, 5].map((n) => `commons-landscape-0${n}.jpg`);
const SAMPLE_CACHE = join("scripts", "e2e-sample", ".cache");
const SEEDED_FILE = join(".cache", "layer2-ios", "seeded.json");

/** 이전 대기에서 터미널에 남은 Enter가 곧바로 읽히는 것을 막는다 — 사람이 안내문을 읽고 누르려면 이보다 오래 걸린다 */
const STRAY_ENTER_GUARD_MS = 700;

const realPrompt: PromptPort = {
  announce(lines) {
    console.log("");
    console.log("  ▶ 사람이 할 조작");
    for (const line of lines) console.log(`    ${line}`);
  },
  waitForEnter(timeoutMs) {
    if (!process.stdin.isTTY) {
      // 터미널이 아니면(에이전트·CI 셸) 신호 파일로 알린다 — 환경변수가 없으면 중단한다
      const file = process.env.POCKETLOG_IOS_L2_ENTER_FILE;
      if (file === undefined || file === "") return Promise.resolve("no-tty");
      console.log(`    (터미널이 아니라 신호 파일로 알린다: touch ${file})`);
      return waitForSignalFile(file, timeoutMs, {
        exists: (path) => existsSync(path),
        remove: (path) => rmSync(path, { force: true }),
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
        nowMs: () => Date.now(),
      });
    }
    return new Promise((resolve) => {
      const rl = createInterface({ input: process.stdin });
      const startedAt = Date.now();
      const timer = setTimeout(() => {
        rl.close();
        resolve("timeout");
      }, timeoutMs);
      rl.on("line", () => {
        // 앞 흐름의 생성 대기 중에 누른 Enter가 버퍼에 남아 있다가 곧바로 들어오면 무시한다
        if (Date.now() - startedAt < STRAY_ENTER_GUARD_MS) return;
        clearTimeout(timer);
        rl.close();
        resolve("entered");
      });
    });
  },
};

/** 기기마다 심은 날짜를 따로 적는다 — `{ "<UDID>": ["2026-10-21", …] }`. 옛 모양(배열)은 읽지 않는다 */
function readSeeded(): Record<string, string[]> {
  try {
    const parsed: unknown = JSON.parse(readFileSync(SEEDED_FILE, "utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([udid, days]) => [
        udid,
        Array.isArray(days) ? days.filter((d): d is string => typeof d === "string") : [],
      ]),
    );
  } catch {
    return {};
  }
}

function realSeed(udid: () => string | null): SeedPort {
  return {
    xcodeRunning() {
      return spawnSync("pgrep", ["-x", "Xcode"]).status === 0;
    },
    seedDay(day, count): Outcome<void> {
      const photos = mkdtempSync(join(tmpdir(), "pocketlog-ios-seed-photos-"));
      for (const name of SEED_PHOTO_FILES.slice(0, count)) {
        const source = join(SAMPLE_CACHE, name);
        if (!existsSync(source))
          return { ok: false, detail: `표본 사진이 없다: ${source} — 먼저 npm run sample:fetch` };
        copyFileSync(source, join(photos, name));
      }
      const device = udid();
      const args = [
        "run",
        "ios:seed",
        "--",
        "--day",
        day,
        "--count",
        String(count),
        "--photos",
        photos,
      ];
      if (device !== null) args.push("--device", device);
      const run = spawnSync("npm", args, { encoding: "utf8" });
      const last = (run.stdout ?? "").trim().split(/\r?\n/).pop() ?? "";
      try {
        const result = JSON.parse(last) as { ok?: boolean; reason?: string; seeded?: number };
        if (result.ok === true && result.seeded === count) return { ok: true, value: undefined };
        return { ok: false, detail: result.reason ?? `심은 사진이 ${result.seeded ?? 0}장이다` };
      } catch {
        return {
          ok: false,
          detail: `ios:seed 출력을 읽지 못했다: ${(run.stderr ?? last).slice(-300)}`,
        };
      }
    },
    seededDays: (udid) => readSeeded()[udid] ?? [],
    markSeeded(udid, day) {
      mkdirSync(join(".cache", "layer2-ios"), { recursive: true });
      const all = readSeeded();
      all[udid] = [...new Set([...(all[udid] ?? []), day])];
      writeFileSync(SEEDED_FILE, JSON.stringify(all), "utf8");
    },
  };
}

/** 명령줄 인자 — 흐름 id(위치 인자)와 `--operation-timeout`·`--generation-timeout`(초). 모르는 인자는 `unknown`에 모은다 */
export function parseIosLayer2Args(argv: readonly string[]): {
  flowIds: string[];
  operationTimeoutMs?: number;
  generationTimeoutMs?: number;
  unknown: string[];
} {
  const flowIds: string[] = [];
  const unknown: string[] = [];
  let operationTimeoutMs: number | undefined;
  let generationTimeoutMs: number | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--operation-timeout" || arg === "--generation-timeout") {
      const seconds = Number(argv[i + 1]);
      i += 1;
      if (!Number.isFinite(seconds) || seconds <= 0) {
        unknown.push(`${arg} ${argv[i] ?? ""}`.trim());
        continue;
      }
      if (arg === "--operation-timeout") operationTimeoutMs = seconds * 1000;
      else generationTimeoutMs = seconds * 1000;
    } else if (IOS_LAYER2_FLOWS.some((f) => f.id === arg)) {
      flowIds.push(arg);
    } else {
      unknown.push(arg);
    }
  }
  return { flowIds, operationTimeoutMs, generationTimeoutMs, unknown };
}

export async function runIosLayer2(
  argv: string[],
  log: (line: string) => void,
): Promise<IosLayer2Result> {
  const args = parseIosLayer2Args(argv);
  // 잘못 쓴 인자가 모든 흐름(열 분이 넘는 것 포함)을 돌리지 않게 한다
  if (args.unknown.length > 0) {
    return {
      status: "aborted",
      reason: `알 수 없는 인자: ${args.unknown.join(", ")} — 흐름 id는 ${IOS_LAYER2_FLOWS.map((f) => f.id).join(", ")}, 옵션은 --operation-timeout <초>·--generation-timeout <초>`,
      perFlow: IOS_LAYER2_FLOWS.map((f) => ({ id: f.id, outcome: "not-run" as const })),
    };
  }
  const phone = iosPhoneDevice();
  const flows =
    args.flowIds.length > 0
      ? IOS_LAYER2_FLOWS.filter((f) => args.flowIds.includes(f.id))
      : IOS_LAYER2_FLOWS;
  return runLayer2Ios({
    phone,
    seed: realSeed(() => phone.listDevices()?.[0] ?? null),
    prompt: realPrompt,
    clock: {
      nowMs: () => Date.now(),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    },
    flows,
    operationTimeoutMs: args.operationTimeoutMs,
    generationTimeoutMs: args.generationTimeoutMs,
    log,
  });
}

export { SEED_PHOTO_COUNT };
