/**
 * 070 — 층 1 실행기가 쓰는 실제 「표본 보장」 단계 (`SampleStep`의 실제 구현).
 *
 * `run-device-tests.mjs`는 `.ts`를 정적으로 불러오지 않으므로(경고) 동적 import로 이 한 함수만 부른다. 판정은 `ensure.ts`에 있다.
 */

import type { SampleStep } from "../layer1/with-sample.ts";
import { loadCatalog } from "./catalog.ts";
import { adbSampleDevice } from "./device.ts";
import { ensureSample } from "./ensure.ts";
import { realSampleFs } from "./fs-port.ts";
import { probeEnv } from "./plan.ts";

export function realSampleStep(log: (line: string) => void): SampleStep {
  return {
    async ensure() {
      const catalog = loadCatalog();
      if (!catalog.ok) {
        return {
          status: "failed",
          reason: "missing-cache",
          detail: `사진 목록이 규칙을 어긴다: ${catalog.problems.join("; ")}`,
        };
      }
      return ensureSample({
        device: adbSampleDevice(),
        fs: realSampleFs(),
        catalog: catalog.photos,
        now: new Date(),
        log,
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      });
    },
    env: () => probeEnv(new Date()),
  };
}
