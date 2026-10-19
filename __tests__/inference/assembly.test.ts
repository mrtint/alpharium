/**
 * 조립 주체가 정하는 값 (079, specs/079-bg-auto-write-threads/contracts/assembly.md A1~A3).
 *
 * 백그라운드가 조립한 쓰기만 안드로이드에서 스레드 수를 받고, 생성 시간 한도는 주체로만 갈린다.
 * 값은 사람이 정한 상수다 — 코드가 기기를 읽어 정하지 않는다(FR-005).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  BACKGROUND_THREADS,
  generationTimeoutFor,
  inferenceThreadsFor,
  pacingFor,
} from "../../src/inference/assembly";
import {
  BACKGROUND_GENERATION_TIMEOUT_MS,
  GENERATION_TIMEOUT_MS,
} from "../../src/inference/sampling";

describe("079 A1 — 스레드 수는 안드로이드 백그라운드 조립에만 준다", () => {
  it("백그라운드 스레드 수는 2다", () => {
    expect(BACKGROUND_THREADS).toBe(2);
  });

  it("안드로이드 백그라운드 조립은 2를 받는다", () => {
    expect(inferenceThreadsFor("background", "android")).toBe(2);
  });

  it.each([
    ["screen", "android"],
    ["screen", "ios"],
    ["background", "ios"],
  ] as const)("%s · %s 조립은 스레드 수를 받지 않는다", (owner, platform) => {
    expect(inferenceThreadsFor(owner, platform)).toBeUndefined();
  });
});

describe("079 A3 — 생성 시간 한도는 조립 주체로만 갈린다", () => {
  it("화면 조립은 180초 그대로다", () => {
    expect(GENERATION_TIMEOUT_MS).toBe(180_000);
    expect(generationTimeoutFor("screen")).toBe(GENERATION_TIMEOUT_MS);
  });

  it("백그라운드 조립은 600초다", () => {
    expect(BACKGROUND_GENERATION_TIMEOUT_MS).toBe(600_000);
    expect(generationTimeoutFor("background")).toBe(BACKGROUND_GENERATION_TIMEOUT_MS);
  });

  it("플랫폼을 받지 않는다 — 인자는 주체 하나다", () => {
    // `Function.length`는 기본값 인자를 세지 않는다 — 선언을 직접 읽는다.
    const code = readFileSync(join(__dirname, "../../src/inference/assembly.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).toMatch(/export function generationTimeoutFor\(owner: AssemblyOwner\): number \{/);
  });
});

describe("079 A2 — 판정은 기기를 읽지 않는다", () => {
  const code = readFileSync(join(__dirname, "../../src/inference/assembly.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it.each(["hardwareConcurrency", "Platform", "AppState", "require(", "process.env"])(
    "소스에 %s가 없다",
    (word) => {
      expect(code).not.toContain(word);
    },
  );
});

/**
 * 091 PC1 — 배터리 요청으로 깬 iOS 백그라운드 쓰기만 「느린 쓰기」다. CPU 감시(60초 동안 코어 하나의 80%) 밑으로 돌게 스레드 1,
 * 호출 사이 쉼, 본문 조각 생성, 그리고 길어진 쓰기를 감당하는 한도.
 */
describe("091 PC1 — 느린 쓰기는 iOS 백그라운드 배터리 깨움에만", () => {
  it("background·ios·battery → 느린 쓰기", () => {
    expect(pacingFor("background", "ios", "battery")).toEqual({
      threads: 1,
      pauseRatio: 0.5,
      chunkTokens: 32,
      timeoutMs: 1_800_000,
    });
  });

  it.each([
    ["background", "ios", "power"],
    ["background", "ios", undefined],
    ["background", "android", "battery"],
    ["screen", "ios", "battery"],
  ] as const)("%s·%s·%s → 없음 (종전 경로)", (owner, platform, wake) => {
    expect(pacingFor(owner, platform, wake)).toBeUndefined();
  });

  it("평균 CPU가 한도(80%) 아래다 — 스레드 1이면 CPU ≈ 벽시계, 쉼 비율 r이면 1/(1+r)", () => {
    const p = pacingFor("background", "ios", "battery");
    expect(p).toBeDefined();
    expect(1 / (1 + (p?.pauseRatio ?? 0))).toBeLessThan(0.8);
  });
});

describe("091 — 깬 요청이 조립까지 닿는다 (소스)", () => {
  const read = (rel: string) =>
    readFileSync(join(__dirname, "../..", rel), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
  it("wiring → select → onDeviceBackend → pacingFor", () => {
    expect(read("src/app/wiring.ts")).toMatch(/owner,\s*deps\.wake,\s*\)/);
    expect(read("src/inference/select.ts")).toMatch(
      /onDeviceBackend\(loadSignals, loadCustomNames, owner, wake\)/,
    );
    const onDevice = read("src/inference/on-device.ts");
    expect(onDevice).toMatch(/pacingFor\(owner, platform, wake\)/);
    expect(onDevice).toMatch(/pacing\?\.timeoutMs \?\? generationTimeoutFor\(owner\)/);
    expect(onDevice).toMatch(/pacing\?\.threads \?\? inferenceThreadsFor\(owner, platform\)/);
  });
});
