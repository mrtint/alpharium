/**
 * 060 — 진단의 「자동 쓰기 지금 실행」(`manual`)과 쓰기 실패 기록 (AR1~AR5).
 *
 * `runAutoDiaryTask`는 의존을 주입받는 조합 함수라 기기 없이 검증한다(`background-generation.test.ts`와 같은 구조).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { runAutoDiaryTask } from "../../src/schedule/task";
import type { WriteFailurePort } from "../../src/app/write-failures";

/** 목표 시각 7시, 지금은 15시 30분 — 시도 창(7~9시) 밖이다 */
const OUT_OF_WINDOW = new Date(2026, 7, 28, 15, 30, 0, 0);

const previewOf =
  (
    photos: { kind: "known"; count: number } | { kind: "none" } | { kind: "unknown" },
    photoAccess: "ok" | "denied" | "blocked" = "ok",
  ) =>
  async (day: string) => ({ day, photos, places: { kind: "unknown" as const }, photoAccess });

function failurePort(): WriteFailurePort & { content: string | null } {
  const port = {
    content: null as string | null,
    async read() {
      return port.content;
    },
    async write(serialized: string) {
      port.content = serialized;
    },
  };
  return port;
}

function make(over: {
  enabled?: boolean;
  now?: Date;
  run?: jest.Mock;
  listDiaryDays?: () => Promise<string[]>;
  preview?: ReturnType<typeof previewOf>;
  manual?: boolean;
}) {
  const run = over.run ?? jest.fn().mockResolvedValue({ ok: true, entry: {}, overwrote: false });
  const failures = failurePort();
  const deps = {
    manual: over.manual,
    failurePort: failures,
    skipPort: { read: async () => null, write: async () => {}, remove: async () => {} },
    now: over.now ?? OUT_OF_WINDOW,
    resolution: { ok: true, environment: "dev" } as never,
    settingsPort: {
      read: async () => JSON.stringify({ enabled: over.enabled ?? false, targetHour: 7 }),
      write: async () => {},
    },
    notifiedPort: { read: async () => null, write: async () => {} },
    notificationPort: {
      ensureChannel: async () => {},
      requestPermission: async () => "granted" as const,
      getPermission: async () => "granted" as const,
      present: async () => "n",
      dismiss: async () => {},
      lastResponse: async () => null,
      onResponse: () => () => {},
    },
    listDiaryDays: over.listDiaryDays ?? (async () => []),
    loadCharacter: async () => "quiet" as const,
    loadNames: async () => ({}),
    makePipeline: (() => ({
      ok: true,
      pipeline: { run },
      location: "on-device",
      previewDay: over.preview ?? previewOf({ kind: "known", count: 3 }),
      store: { listDays: async () => [] },
    })) as never,
  };
  return { deps, run, failures };
}

describe("AR1 — manual은 시도 창과 토글을 무시한다", () => {
  it("설정이 꺼져 있고 창 밖이어도 안 쓴 날이 있으면 쓴다", async () => {
    const { deps, run } = make({ enabled: false, manual: true });
    expect(await runAutoDiaryTask(deps)).toBe("ran");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("안 쓴 날이 없으면 skipped", async () => {
    const { deps, run } = make({
      enabled: false,
      manual: true,
      listDiaryDays: async () => ["2026-08-27", "2026-08-26", "2026-08-25", "2026-08-28"],
    });
    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(run).not.toHaveBeenCalled();
  });
});

describe("AR2 — manual이어도 재료·사진 권한 규칙은 그대로다", () => {
  it("사진이 관측된 0장이면 쓰지 않는다", async () => {
    const { deps, run } = make({ manual: true, preview: previewOf({ kind: "known", count: 0 }) });
    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(run).not.toHaveBeenCalled();
  });

  it("사진 권한이 없으면 쓰지 않는다", async () => {
    const { deps, run } = make({ manual: true, preview: previewOf({ kind: "unknown" }, "denied") });
    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(run).not.toHaveBeenCalled();
  });

  it("정오 전에는 오늘을 쓰지 않는다 — 어제까지만 본다 (049 구성 규칙)", async () => {
    const { deps, run } = make({
      manual: true,
      now: new Date(2026, 7, 28, 9, 0, 0, 0),
      listDiaryDays: async () => ["2026-08-27", "2026-08-26", "2026-08-25"],
    });
    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(run).not.toHaveBeenCalled();
  });
});

describe("AR4 — manual이 아니면 기존 그대로", () => {
  it("꺼져 있으면 skipped", async () => {
    const { deps, run } = make({ enabled: false });
    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(run).not.toHaveBeenCalled();
  });

  it("켜져 있어도 창 밖이면 skipped", async () => {
    const { deps, run } = make({ enabled: true });
    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(run).not.toHaveBeenCalled();
  });
});

describe("AR3 — 판정 파일은 이 조각이 건드리지 않는다", () => {
  const code = (file: string) =>
    readFileSync(join(__dirname, "..", "..", file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

  it.each(["src/schedule/decision.ts", "src/schedule/auto-write.ts", "src/schedule/retry.ts"])(
    "%s에 manual이 없다",
    (file) => {
      expect(code(file)).not.toMatch(/manual/i);
    },
  );

  it("manual은 설정 입력 둘(켜짐·목표 시각)만 덮는다", () => {
    const src = code("src/schedule/manual.ts");
    expect(src).toContain("enabled: true");
    expect(src).toContain("targetHour: now.getHours()");
    expect(src).not.toMatch(/decideSchedule|resolveAutoWrite|selectableDays/);
  });
});

describe("AR5 — 쓰기 실패 기록", () => {
  const reasons = (port: { content: string | null }) =>
    (JSON.parse(port.content ?? '{"items":[]}') as { items: { reason: string }[] }).items.map(
      (i) => i.reason,
    );

  it("파이프라인이 실패하면 갈래로 한 줄 기록하고 failed를 돌려준다", async () => {
    const run = jest.fn().mockResolvedValue({ ok: false, stage: "storage", reason: "disk" });
    const { deps, failures } = make({ manual: true, run });
    expect(await runAutoDiaryTask(deps)).toBe("failed");
    expect(reasons(failures)).toEqual(["save"]);
  });

  it("already-running은 기록하지 않고 skipped", async () => {
    const run = jest.fn().mockResolvedValue({ ok: false, stage: "already-running", reason: "x" });
    const { deps, failures } = make({ manual: true, run });
    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(failures.content).toBeNull();
  });

  it("성공은 기록하지 않는다", async () => {
    const { deps, failures } = make({ manual: true });
    expect(await runAutoDiaryTask(deps)).toBe("ran");
    expect(failures.content).toBeNull();
  });

  it("예상 못 한 예외도 unwritten으로 기록하고 던지지 않는다", async () => {
    const run = jest.fn().mockRejectedValue(new Error("boom"));
    const { deps, failures } = make({ manual: true, run });
    expect(await runAutoDiaryTask(deps)).toBe("failed");
    expect(reasons(failures)).toEqual(["unwritten"]);
  });

  it("기록 통로가 던져도 결과는 그대로다", async () => {
    const run = jest
      .fn()
      .mockResolvedValue({ ok: false, stage: "generation", reason: "timed-out" });
    const { deps } = make({ manual: true, run });
    const broken: WriteFailurePort = {
      read: () => Promise.reject(new Error("io")),
      write: () => Promise.reject(new Error("io")),
    };
    expect(await runAutoDiaryTask({ ...deps, failurePort: broken })).toBe("failed");
  });
});
