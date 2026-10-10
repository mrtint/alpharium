/**
 * 073 — 층 2 실행 앞에 「표본 보장」을 끼운다 (층 1의 `with-sample.ts`와 같은 모양).
 *
 * 쓰기 흐름은 사진이 있는 어제(표본 1일 전 = `commute`, 사진 5장)를 쓴다 — 표본이 없으면 사진 읽기 경로가 돌지 않는다.
 * 기기·Maestro가 없으면 실행기의 「건너뜀」이 나오도록 그대로 넘기고, 표본 보장이 실패하면 **통과가 아니라 중단**이다.
 * 표본은 `adb`를 기기 지정 없이 부르므로 기기가 정확히 하나일 때만 돈다(실행기도 같은 규칙).
 */

import type { SampleStep } from "../layer1/with-sample.ts";
import { LAYER2_FLOWS } from "./flows.ts";
import { runLayer2, type Layer2Options, type Layer2Result } from "./runner.ts";

export async function runLayer2WithSample(options: Layer2Options, sample: Pick<SampleStep, "ensure">): Promise<Layer2Result> {
  const serials = options.device.listDevices();
  if (serials === null || serials.length !== 1 || !options.device.hasMaestro()) return runLayer2(options);

  const ensured = await sample.ensure();
  if (ensured.status === "failed") {
    return {
      status: "aborted",
      reason: `표본 보장 실패(${ensured.reason}): ${ensured.detail}`,
      perFlow: (options.flows ?? LAYER2_FLOWS).map((f) => ({ file: f.file, status: "not-run" as const })),
    };
  }
  return runLayer2(options);
}
