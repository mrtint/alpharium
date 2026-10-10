/**
 * 070 — 층 1 실행 앞에 「표본 보장」을 끼운다.
 *
 * 계약: specs/070-e2e-sample-seed/contracts/sample-seeding.md G-5, contracts/sample-days-flow.md FL-1·FL-3
 *
 * 069 `runLayer1`(동기)은 건드리지 않고 이 래퍼가 앞단을 맡는다: 기기·Maestro가 있는지 보고(없으면 069의 「건너뜀」이 나오도록 그대로 넘긴다)
 * → 표본 보장 → 실패면 **통과가 아니라 중단**(069 I-3) → 대표 날 값을 `-e`로 흐름에 넘겨 `runLayer1`을 부른다.
 *
 * 표본은 `adb`를 기기 지정 없이 부르므로(010과 같은 규칙) 기기가 정확히 하나일 때만 돈다 — 여럿이면 임의로 고르지 않고 중단한다.
 */

import type { EnsureResult } from "../e2e-sample/ensure.ts";
import { runLayer1, type Layer1Options, type Layer1Result } from "./runner.ts";

export type SampleStep = {
  ensure(): Promise<EnsureResult>;
  /** 흐름에 `-e`로 넘길 값 (`P<n>_DATE` …) */
  env(): Record<string, string>;
};

/** `maestro -e` 값의 안전한 모양 (FL-3) */
const SAFE_ENV = /^[A-Za-z0-9_-]+$/;

export async function runLayer1WithSample(
  options: Layer1Options,
  sample: SampleStep,
): Promise<Layer1Result> {
  const serials = options.device.listDevices();
  // 기기·Maestro가 없으면 069가 「건너뜀」으로 보고하게 그대로 넘긴다
  if (serials === null || serials.length === 0 || !options.device.hasMaestro()) {
    return runLayer1(options);
  }
  if (serials.length > 1) {
    return {
      status: "aborted",
      reason: `표본은 기기가 하나일 때만 심는다 (${serials.join(", ")}) — 하나만 남기고 다시 부른다`,
    };
  }

  const env = sample.env();
  for (const [key, value] of Object.entries(env)) {
    if (!SAFE_ENV.test(value)) {
      return { status: "aborted", reason: `표본 값이 maestro -e 인자로 안전하지 않다: ${key}` };
    }
  }

  const ensured = await sample.ensure();
  if (ensured.status === "failed") {
    return { status: "aborted", reason: `표본 보장 실패(${ensured.reason}): ${ensured.detail}` };
  }

  return runLayer1({ ...options, env });
}
