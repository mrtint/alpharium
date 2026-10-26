/**
 * 시간 규칙 읽기 (106) — 빠른 주기 기록을 **읽는 유일한 자리**.
 *
 * 계약: specs/106-auto-write-fast-cycle/contracts/fast-cycle.md FC2·FC2a·FC3 (헌법 검사 `FAST_CYCLE_LEAKS` FL1·FL2)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **개발 환경에서만 읽는다.** `devEnvironment`는 호출부가 `showsOnScreen(resolution)`으로 구해 넘긴다(064 `useSimulation`·`task.ts`와 같은
 * 방식) — 이 파일은 `process.env`도 환경 판정도 부르지 않는다(`config/environment.ts`만 읽는다, FR-009a). 거짓이면 기록 통로를 **부르지도
 * 않고** 배포 규칙을 준다. 기록이 켜진 채 배포 빌드에 남아 있어도 배포 사용자의 일기는 이 기능이 건드리지 않는다.
 *
 * 읽지 못하거나 모양이 다르면 꺼짐이다(원칙 V) — 켜짐으로 채우지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { EnvironmentResolution } from "../config/types";
import {
  expoFastCyclePort,
  loadFastCycle,
  type FastCyclePort,
  type FastCycleRecord,
} from "./fast-cycle-store";
import type { AutoDiarySettings } from "./settings";
import { fastCycleTiming, productionTiming, type ScheduleTiming } from "./timing";

/**
 * 빠른 주기를 읽어도 되는 환경인가 — **판정에 성공한 개발 환경(local·dev)만**. 호출부가 이 값을 `devEnvironment`로 넘긴다.
 *
 * 화면 쪽 안전 선택(`sinksFor` — 판정에 실패하면 화면에 드러낸다, 064 흉내와 같은 `showsOnScreen`)과 달리 **판정을 못 한 환경은 읽지 않는다**:
 * 이 기능은 일기를 지운다. 모르는 환경에서 일기를 지우지 않는다(원칙 V — 모르는 것을 켜짐으로 채우지 않는다).
 */
export function allowsFastCycle(resolution: EnvironmentResolution): boolean {
  return resolution.ok && resolution.environment !== "prod";
}

/** 가드가 있는 기록 읽기. 개발 환경이 아니면 통로를 부르지 않고 `null`. 리셋·화면이 쓴다. */
export async function loadFastCycleRecord({
  devEnvironment,
  port,
}: {
  devEnvironment: boolean;
  port?: FastCyclePort | undefined;
}): Promise<FastCycleRecord | null> {
  if (!devEnvironment) return null;
  return loadFastCycle(port ?? expoFastCyclePort());
}

/** 이 순간의 시간 규칙과, 빠른 주기면 읽은 기록 */
export async function loadScheduleTiming({
  settings,
  devEnvironment,
  port,
}: {
  settings: AutoDiarySettings;
  devEnvironment: boolean;
  port?: FastCyclePort | undefined;
}): Promise<{ timing: ScheduleTiming; fastCycle: FastCycleRecord | null }> {
  const fastCycle = await loadFastCycleRecord({ devEnvironment, port });
  if (fastCycle === null) return { timing: productionTiming(settings), fastCycle: null };
  return { timing: fastCycleTiming(fastCycle.periodMinutes), fastCycle };
}
