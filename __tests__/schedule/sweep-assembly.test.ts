/**
 * 105 — 후보 훑기 조립: 백그라운드 본체(`runAutoDiaryTask`)가 실제 `decideSchedule`·`resolveAutoWrite`와 함께
 * 재료 없는 최근 날을 건너뛰어 재료 있는 날을 쓰고, 시도 기록에 고른 날을 남기며, 하루 1회 몫은 파이프라인 직전에만 쓴다.
 * (앱 열기 경로는 `use-auto-write-handoff.test.tsx`, 같은 판정 함수 `resolveAutoWrite`를 쓴다 — FR-003.)
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { runAutoDiaryTask } from "../../src/schedule/task";

/** 목표 시각 7시, 지금은 15시 30분 — 창 밖. 후보는 어제(08-27)·그제(08-26)·그끄제(08-25) */
const NOW = new Date(2026, 7, 28, 15, 30, 0, 0);

type Hint = { kind: "known"; count: number } | { kind: "none" } | { kind: "unknown" };

function make(byDay: Record<string, Hint>, opts: { spentToday?: boolean } = {}) {
  const run = jest.fn().mockResolvedValue({ ok: true, entry: {}, overwrote: false });
  const previewed: string[] = [];
  const catchUp = {
    content:
      opts.spentToday === true ? JSON.stringify({ on: "2026-08-28" }) : (null as string | null),
    reads: 0,
    writes: [] as string[],
  };
  const attempts = { content: null as string | null };
  const deps = {
    catchUpPort: {
      read: async () => {
        catchUp.reads += 1;
        return catchUp.content;
      },
      write: async (s: string) => {
        catchUp.writes.push(s);
        catchUp.content = s;
      },
      remove: async () => {
        catchUp.content = null;
      },
    },
    reconcileReminders: async () => {},
    attemptPort: {
      read: async () => attempts.content,
      write: async (s: string) => {
        attempts.content = s;
      },
    },
    failurePort: { read: async () => null, write: async () => {} },
    skipPort: { read: async () => null, write: async () => {}, remove: async () => {} },
    now: NOW,
    resolution: { ok: true, environment: "dev" } as never,
    settingsPort: {
      read: async () => JSON.stringify({ enabled: true, targetHour: 7 }),
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
    listDiaryDays: async () => [] as string[],
    loadCharacter: async () => "quiet" as const,
    loadNames: async () => ({}),
    makePipeline: (() => ({
      ok: true,
      pipeline: { run },
      location: "on-device",
      previewDay: async (day: string) => {
        previewed.push(day);
        return {
          day,
          photos: byDay[day] ?? { kind: "none" },
          places: { kind: "none" },
          photoAccess: "ok",
        };
      },
      store: { listDays: async () => [] },
    })) as never,
  };
  const lines = () =>
    (JSON.parse(attempts.content ?? '{"items":[]}') as { items: Record<string, string>[] }).items;
  return { deps, run, previewed, catchUp, lines };
}

describe("105 — 백그라운드가 재료 없는 최근 날을 건너뛴다", () => {
  it("어제는 재료 없음·그제는 재료 있음 → 그제를 쓰고, 기록에 그제가 남고, 몫은 쓰기 직전에 한 번", async () => {
    const { deps, run, previewed, catchUp, lines } = make({
      "2026-08-27": { kind: "none" },
      "2026-08-26": { kind: "known", count: 3 },
    });
    expect(await runAutoDiaryTask(deps)).toBe("ran");
    expect(previewed).toEqual(["2026-08-27", "2026-08-26"]);
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ day: "2026-08-26" }));
    expect(catchUp.writes).toHaveLength(1);
    expect(lines()[0]).toMatchObject({ path: "background", outcome: "ran", day: "2026-08-26" });
  });

  it("후보 전부 재료 없음 → 쓰지 않고 몫도 쓰지 않으며 기록은 날 없이 재료 없음", async () => {
    const { deps, run, catchUp, lines } = make({});
    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(run).not.toHaveBeenCalled();
    expect(catchUp.writes).toHaveLength(0);
    expect(lines()[0]).toMatchObject({ outcome: "no-material" });
    expect(lines()[0]).not.toHaveProperty("day");
  });

  it("몫을 이미 썼으면 신호를 읽지 않고 끝난다 (FR-008)", async () => {
    const { deps, run, previewed, lines } = make(
      { "2026-08-26": { kind: "known", count: 3 } },
      { spentToday: true },
    );
    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(previewed).toHaveLength(0);
    expect(run).not.toHaveBeenCalled();
    expect(lines()[0]).toMatchObject({ outcome: "catch-up-spent" });
  });

  it("쓰다 실패해도 기록에는 고른 날이 남는다", async () => {
    const { deps, run, lines } = make({ "2026-08-27": { kind: "known", count: 2 } });
    run.mockResolvedValue({ ok: false, stage: "storage", reason: "disk" });
    expect(await runAutoDiaryTask(deps)).toBe("failed");
    expect(lines()[0]).toMatchObject({ outcome: "failed", day: "2026-08-27" });
  });
});

describe("105 — 세 경로가 같은 판정 하나를 쓴다 (소스 계약)", () => {
  const code = (file: string) =>
    readFileSync(join(__dirname, "..", "..", file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

  it("task.ts와 앱 열기 훅은 resolveAutoWrite를 부르고 자기 후보 선택(pickRetryDay)을 두지 않는다", () => {
    for (const file of ["src/schedule/task.ts", "src/app/use-auto-write-handoff.ts"]) {
      expect(code(file)).toMatch(/\bresolveAutoWrite\(/);
      expect(code(file)).not.toMatch(/pickRetryDay/);
    }
  });
});
