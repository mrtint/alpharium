/**
 * 064 — 상태 흉내가 켜진 동안 백그라운드 자동 쓰기는 쓰지 않는다 (contracts/simulation.md BG1~BG3).
 *
 * 헤드리스에는 화면이 없으므로 `runAutoDiaryTask`가 흉내 기록을 직접 읽는다. 판정 함수는 하나다(`simulationBlocksWriting`).
 */

import type { SimulationStorePort } from "../../src/app/simulation-store";
import type { WriteFailurePort } from "../../src/app/write-failures";
import { runAutoDiaryTask } from "../../src/schedule/task";

/** 목표 시각 7시, 지금 7시 30분 — 시도 창 안. 흉내가 없으면 쓴다 */
const IN_WINDOW = new Date(2026, 7, 28, 7, 30, 0, 0);

function simulationPort(content: string | null, fail = false): SimulationStorePort {
  return {
    read: async () => {
      if (fail) throw new Error("io");
      return content;
    },
    write: async () => {},
    remove: async () => {},
  };
}

function make(environment: "dev" | "prod", simulation: SimulationStorePort) {
  const run = jest.fn().mockResolvedValue({ ok: true, entry: {}, overwrote: false });
  const makePipeline = jest.fn(() => ({
    ok: true,
    pipeline: { run },
    location: "on-device",
    previewDay: async (day: string) => ({
      day,
      photos: { kind: "known" as const, count: 3 },
      places: { kind: "unknown" as const },
      photoAccess: "ok" as const,
    }),
    store: { listDays: async () => [] },
  }));
  const present = jest.fn(async () => "n");
  const failureWrites = jest.fn(async () => {});
  const failurePort: WriteFailurePort = { read: async () => null, write: failureWrites };
  const deps = {
    simulationPort: simulation,
    failurePort,
    skipPort: { read: async () => null, write: async () => {}, remove: async () => {} },
    now: IN_WINDOW,
    resolution: { ok: true, environment } as never,
    settingsPort: {
      read: async () => JSON.stringify({ enabled: true, targetHour: 7 }),
      write: async () => {},
    },
    notifiedPort: { read: async () => null, write: async () => {} },
    notificationPort: {
      ensureChannel: async () => {},
      requestPermission: async () => "granted" as const,
      getPermission: async () => "granted" as const,
      present,
      dismiss: async () => {},
      lastResponse: async () => null,
      onResponse: () => () => {},
    },
    listDiaryDays: async () => [],
    loadCharacter: async () => "quiet" as const,
    loadNames: async () => ({}),
    makePipeline: makePipeline as never,
  };
  return { deps, run, makePipeline, present, failureWrites };
}

describe("BG1 — 개발 환경 + 흉내 켬 → 건너뜀", () => {
  it.each([{ noPhoto: true }, { date: "2026-09-13" }, { failToast: true }, { noMaterial: true }])(
    "%j — 파이프라인을 만들지 않고 알림·실패 기록 없음",
    async (record) => {
      const m = make("dev", simulationPort(JSON.stringify(record)));
      expect(await runAutoDiaryTask(m.deps)).toBe("skipped");
      expect(m.makePipeline).not.toHaveBeenCalled();
      expect(m.run).not.toHaveBeenCalled();
      expect(m.present).not.toHaveBeenCalled();
      expect(m.failureWrites).not.toHaveBeenCalled();
    },
  );

  it("진단의 수동 실행도 같다", async () => {
    const m = make("dev", simulationPort(JSON.stringify({ noPhoto: true })));
    expect(await runAutoDiaryTask({ ...m.deps, manual: true })).toBe("skipped");
    expect(m.run).not.toHaveBeenCalled();
  });
});

describe("BG2 — 배포 환경은 흉내 기록을 무시한다", () => {
  it("기록이 있어도 평소대로 쓴다", async () => {
    const m = make("prod", simulationPort(JSON.stringify({ noPhoto: true })));
    expect(await runAutoDiaryTask(m.deps)).toBe("ran");
    expect(m.run).toHaveBeenCalledTimes(1);
  });
});

describe("BG3 — 흉내 기록을 못 읽으면 평소대로", () => {
  it.each([
    ["읽기 예외", simulationPort(null, true)],
    ["깨진 기록", simulationPort("{")],
    ["기록 없음", simulationPort(null)],
  ])("%s", async (_name, port) => {
    const m = make("dev", port);
    expect(await runAutoDiaryTask(m.deps)).toBe("ran");
    expect(m.run).toHaveBeenCalledTimes(1);
  });
});
