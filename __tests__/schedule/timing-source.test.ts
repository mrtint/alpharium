import type { FastCyclePort } from "../../src/schedule/fast-cycle-store";
import { loadFastCycleRecord, loadScheduleTiming } from "../../src/schedule/timing-source";
import type { AutoDiarySettings } from "../../src/schedule/settings";

/**
 * 시간 규칙 읽기 (106).
 *
 * 계약: specs/106-auto-write-fast-cycle/contracts/fast-cycle.md FC2·FC2a·FC3
 *
 * **개발 환경에서만 읽는다**: `devEnvironment`가 거짓이면 기록 통로를 부르지도 않는다.
 */

const SETTINGS: AutoDiarySettings = { enabled: true, targetHour: 22 };
const VALID = JSON.stringify({ periodMinutes: 30, resetCycle: "2026-10-26#4" });

function port(raw: string | null | Error) {
  const reads: string[] = [];
  const p: FastCyclePort = {
    async read() {
      reads.push("read");
      if (raw instanceof Error) throw raw;
      return raw;
    },
    async write() {},
    async remove() {},
  };
  return { port: p, reads };
}

describe("loadFastCycleRecord — 가드 (FC2a)", () => {
  it("devEnvironment가 거짓이면 통로를 부르지 않고 null이다 — 기록이 켜짐이어도", async () => {
    const m = port(VALID);
    expect(await loadFastCycleRecord({ devEnvironment: false, port: m.port })).toBeNull();
    expect(m.reads).toEqual([]);
  });

  it("devEnvironment가 참이면 유효한 기록을 돌려준다", async () => {
    const m = port(VALID);
    expect(await loadFastCycleRecord({ devEnvironment: true, port: m.port })).toEqual({
      periodMinutes: 30,
      resetCycle: "2026-10-26#4",
    });
  });

  it.each([
    ["기록 없음", null],
    ["깨짐", "{"],
    ["범위 밖", JSON.stringify({ periodMinutes: 4, resetCycle: "x" })],
    ["읽기 예외", new Error("io")],
  ])("%s → null (꺼짐)", async (_n, raw) => {
    expect(await loadFastCycleRecord({ devEnvironment: true, port: port(raw).port })).toBeNull();
  });
});

describe("loadScheduleTiming (FC2·FC3)", () => {
  it("devEnvironment가 거짓이면 통로를 부르지 않고 배포 timing이다 (FC2)", async () => {
    const m = port(VALID);
    const r = await loadScheduleTiming({ settings: SETTINGS, devEnvironment: false, port: m.port });
    expect(r.timing.kind).toBe("production");
    expect(r.fastCycle).toBeNull();
    expect(m.reads).toEqual([]);
  });

  it("devEnvironment가 참이고 기록이 유효하면 빠른 주기 timing이다 (FC3)", async () => {
    const r = await loadScheduleTiming({
      settings: SETTINGS,
      devEnvironment: true,
      port: port(VALID).port,
    });
    expect(r.timing.kind).toBe("fast-cycle");
    expect(r.fastCycle).toEqual({ periodMinutes: 30, resetCycle: "2026-10-26#4" });
  });

  it.each([
    ["기록 없음", null],
    ["깨짐", "not json"],
    ["읽기 예외", new Error("io")],
  ])("개발 환경이어도 %s → 배포 timing (FC3)", async (_n, raw) => {
    const r = await loadScheduleTiming({
      settings: SETTINGS,
      devEnvironment: true,
      port: port(raw).port,
    });
    expect(r.timing.kind).toBe("production");
    expect(r.fastCycle).toBeNull();
  });

  it("배포 timing은 설정의 목표 시각을 따른다", async () => {
    const r = await loadScheduleTiming({
      settings: { enabled: true, targetHour: 7 },
      devEnvironment: false,
      port: port(null).port,
    });
    expect(r.timing.targetAhead(new Date(2026, 9, 26, 6, 0))).toBe(true);
    expect(r.timing.targetAhead(new Date(2026, 9, 26, 7, 0))).toBe(false);
  });
});
