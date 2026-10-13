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
