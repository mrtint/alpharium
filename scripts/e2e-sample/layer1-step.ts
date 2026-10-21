/**
 * 070 — 층 1 실행기가 쓰는 실제 「표본 보장」 단계 (`SampleStep`의 실제 구현).
 *
 * `run-device-tests.mjs`는 `.ts`를 정적으로 불러오지 않으므로(경고) 동적 import로 이 한 함수만 부른다. 판정은 `ensure.ts`에 있다.
 */

import type { SampleStep } from "../layer1/with-sample.ts";
import { loadCatalog } from "./catalog.ts";
import { adbSampleDevice } from "./device.ts";
import { ensureSample, type Outcome, type SampleDevice } from "./ensure.ts";
import { realSampleFs } from "./fs-port.ts";
import { probeEnv } from "./plan.ts";

/**
 * `device`는 기본이 안드로이드다. 095: iOS 시뮬레이터는 `iosSampleDevice()`와 권한 부여(`beforeEnsure`)를 넘긴다.
 * `beforeEnsure`가 실패하면 표본을 심지 않고 실패로 돌려준다.
 */
export function realSampleStep(
  log: (line: string) => void,
  device: SampleDevice = adbSampleDevice(),
  beforeEnsure?: () => Outcome<void>,
): SampleStep {
  return {
    async ensure() {
      if (beforeEnsure !== undefined) {
        const prepared = beforeEnsure();
        if (!prepared.ok) return { status: "failed", reason: "push-failed", detail: prepared.detail };
      }
      const catalog = loadCatalog();
      if (!catalog.ok) {
        return {
          status: "failed",
          reason: "missing-cache",
          detail: `사진 목록이 규칙을 어긴다: ${catalog.problems.join("; ")}`,
        };
      }
      return ensureSample({
        device,
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
