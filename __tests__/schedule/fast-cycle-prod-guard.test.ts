/**
 * 106 — 배포 환경에는 아무 영향이 없다 (spec US2, SC-002·SC-003, contracts/fast-cycle.md FC2).
 *
 * 빠른 주기는 일기를 지우는 기능이라 **판정에 성공한 개발 환경(local·dev)에서만** 읽는다. 배포 환경과 환경을 판정하지 못한 경우는 기록이 켜져
 * 있어도 통로를 부르지도 않고 일기를 지우지 않는다. 기록이 깨졌으면 개발 환경에서도 꺼짐이다.
 */

import { createFastCycleResetter } from "../../src/app/fast-cycle-reset";
import { createLiveWrites } from "../../src/diary/live-write";
import { memoryStore } from "../../src/diary/store";
import type { EnvironmentResolution } from "../../src/config/types";
import { serializeFastCycle } from "../../src/schedule/fast-cycle-store";
import { runAutoDiaryTask } from "../../src/schedule/task";
import { allowsFastCycle, loadScheduleTiming } from "../../src/schedule/timing-source";
import { entry, IN_WINDOW, make, TODAY } from "./fast-cycle-task-fixture";

const PROD: EnvironmentResolution = { ok: true, environment: "prod" };
const UNKNOWN: EnvironmentResolution = { ok: false, reason: "unknown", received: "stagin" };
const MISSING: EnvironmentResolution = { ok: false, reason: "missing", received: undefined };

describe("allowsFastCycle — 판정에 성공한 개발 환경만 참", () => {
  it.each([
    [{ ok: true, environment: "dev" } as EnvironmentResolution, true],
    [{ ok: true, environment: "local" } as EnvironmentResolution, true],
    [PROD, false],
    [UNKNOWN, false],
    [MISSING, false],
  ])("%j → %s", (resolution, expected) => {
    expect(allowsFastCycle(resolution)).toBe(expected);
  });
});

describe.each([
  ["prod", "prod" as const],
  ["환경 판정 실패", "unknown" as const],
])("(a)(b) 백그라운드: %s에서 기록이 켜져 있어도", (_name, which) => {
  it("기록 통로를 부르지 않고 일기를 지우지 않으며 평소 규칙이다", async () => {
    // 평소 규칙: 목표 10시 → 10:05는 창 안이고 정오 전이라 후보는 지난 사흘 중 가장 최근(어제)
    const m = make({ environment: "prod", targetHour: 10 });
    if (which === "unknown") m.deps.resolution = UNKNOWN as never;
    await m.store.save(entry(TODAY));
    expect(await runAutoDiaryTask(m.deps)).toBe("ran");
    expect(m.fast.reads).toBe(0);
    expect(m.log.some((l) => l.startsWith("removeDay"))).toBe(false);
    expect(await m.store.has(TODAY)).toBe(true);
    expect(m.run.mock.calls[0][0].day).toBe("2026-10-25");
  });
});

describe("(c) 앱 열기 경로: 배포용으로 만든 리셋 클로저", () => {
  it.each([
    ["prod", PROD],
    ["환경 판정 실패", UNKNOWN],
  ])("%s — 기록 통로를 부르지 않고 {reset:false}, 일기는 그대로", async (_n, resolution) => {
    const store = memoryStore();
    await store.save(entry(TODAY));
    let reads = 0;
    const port = {
      read: async () => {
        reads += 1;
        return serializeFastCycle({ periodMinutes: 30, resetCycle: "2026-10-26#19" });
      },
      write: async () => {},
      remove: async () => {},
    };
    const none = { read: async () => null, write: async () => {}, remove: async () => {} };
    const reset = createFastCycleResetter({
      devEnvironment: allowsFastCycle(resolution),
      fastCyclePort: port,
      store,
      notifiedPort: none,
      skipPort: none,
      catchUpPort: none,
      dismiss: async () => {},
      liveWrites: createLiveWrites(),
    });
    expect(await reset(IN_WINDOW)).toEqual({ reset: false });
    expect(reads).toBe(0);
    expect(await store.has(TODAY)).toBe(true);
  });
});

describe("(d) 기록이 깨졌으면 개발 환경에서도 꺼짐이다", () => {
  it.each([
    ["JSON 깨짐", "{"],
    ["범위 밖 주기", JSON.stringify({ periodMinutes: 4, resetCycle: "x" })],
    ["필드 없음", JSON.stringify({ periodMinutes: 30 })],
  ])("%s → 배포 timing, 리셋 없음", async (_n, raw) => {
    const m = make({ fastCycle: raw });
    await m.store.save(entry(TODAY));
    const timing = await loadScheduleTiming({
      settings: { enabled: true, targetHour: 7 },
      devEnvironment: true,
      port: m.deps.fastCyclePort,
    });
    expect(timing.timing.kind).toBe("production");
    await runAutoDiaryTask(m.deps);
    expect(m.log.some((l) => l.startsWith("removeDay"))).toBe(false);
    expect(await m.store.has(TODAY)).toBe(true);
  });
});
