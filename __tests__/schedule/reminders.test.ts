/**
 * 085 — 쓸 차례 알림 맞추기.
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md RC1~RC7, FX3
 *       spec.md FR-008·FR-010·FR-012·FR-016
 *
 * 통로는 대역이다 — 호출을 순서대로 기록한다. 「지금」은 2026-10-15 21:00(목표 22시 → 첫 발화는 오늘 22시).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { BatteryExceptionStatus } from "../../src/schedule/battery-exception-port";
import { planReminders, type ReminderPlanEntry } from "../../src/schedule/reminder-plan";
import type {
  PresentedReminder,
  ReminderPort,
  ScheduledReminder,
} from "../../src/schedule/reminder-port";
import { reconcileReminders, type ReminderDeps } from "../../src/schedule/reminders";
import type { AutoDiarySettings } from "../../src/schedule/settings";

const NOW = new Date(2026, 9, 15, 21, 0);
const ON: AutoDiarySettings = { enabled: true, targetHour: 22 };
const OFF: AutoDiarySettings = { enabled: false, targetHour: 22 };

const asScheduled = (e: ReminderPlanEntry): ScheduledReminder => ({
  id: e.id,
  day: e.day,
  at: e.at,
  title: e.title,
});

function fakePort(init: { scheduled?: ScheduledReminder[]; presented?: PresentedReminder[] } = {}) {
  const calls: string[] = [];
  const port: ReminderPort & {
    failScheduled?: boolean;
    failPresented?: boolean;
    failCancel?: string;
    failSchedule?: string;
  } = {
    async scheduled() {
      calls.push("scheduled");
      if (port.failScheduled) throw new Error("scheduled");
      return init.scheduled ?? [];
    },
    async schedule(entry) {
      calls.push(`schedule:${entry.day}`);
      if (port.failSchedule === entry.day) throw new Error("schedule");
    },
    async cancel(id) {
      calls.push(`cancel:${id}`);
      if (port.failCancel === id) throw new Error("cancel");
    },
    async presented() {
      calls.push("presented");
      if (port.failPresented) throw new Error("presented");
      return init.presented ?? [];
    },
    async dismiss(id) {
      calls.push(`dismiss:${id}`);
    },
  };
  return { port, calls };
}

function deps(
  port: ReminderPort,
  calls: string[],
  over: Partial<ReminderDeps> & { settings?: AutoDiarySettings; written?: string[] } = {},
): ReminderDeps {
  return {
    port,
    now: () => NOW,
    prepare: async () => {
      calls.push("prepare");
    },
    loadSettings: async () => over.settings ?? ON,
    listDiaryDays: async () => over.written ?? [],
    loadName: async () => "은동",
    loadBatteryStatus: async () => "unknown",
    ...over,
  };
}

const planFor = (settings = ON, written: string[] = []) =>
  planReminders({ now: NOW, settings, writtenDays: written, name: "은동", delayMinutes: 0 });

describe("RC1 — 차이만 고친다", () => {
  it("같은 것은 두고, at이 다른 것·계획에 없는 것만 취소하고, 빠진 것만 건다", async () => {
    const p = planFor();
    const same = asScheduled(p[0]!);
    const moved = { ...asScheduled(p[1]!), at: p[1]!.at + 3_600_000 };
    const stray = { id: "diary-reminder-2026-09-01", day: "2026-09-01", at: 1, title: "x" };
    const { port, calls } = fakePort({ scheduled: [same, moved, stray] });

    await reconcileReminders(deps(port, calls));

    expect(calls[0]).toBe("prepare");
    expect(calls[1]).toBe("scheduled");
    const cancels = calls.filter((c) => c.startsWith("cancel:"));
    const schedules = calls.filter((c) => c.startsWith("schedule:"));
    expect(cancels.sort()).toEqual([`cancel:${moved.id}`, `cancel:${stray.id}`].sort());
    expect(schedules).toEqual(p.slice(1).map((e) => `schedule:${e.day}`));
    const lastCancel = Math.max(...cancels.map((c) => calls.indexOf(c)));
    const firstSchedule = Math.min(...schedules.map((c) => calls.indexOf(c)));
    expect(lastCancel).toBeLessThan(firstSchedule);
    expect(calls.indexOf("presented")).toBeGreaterThan(firstSchedule);
  });

  it("제목이 바뀌면(이름 변경) 다시 건다", async () => {
    const p = planFor();
    const { port, calls } = fakePort({
      scheduled: p.map((e) => ({ ...asScheduled(e), title: "옛 이름이 … 차례예요" })),
    });
    await reconcileReminders(deps(port, calls));
    expect(calls.filter((c) => c.startsWith("cancel:"))).toHaveLength(7);
    expect(calls.filter((c) => c.startsWith("schedule:"))).toHaveLength(7);
  });

  it("모두 같으면 취소도 예약도 없다", async () => {
    const { port, calls } = fakePort({ scheduled: planFor().map(asScheduled) });
    await reconcileReminders(deps(port, calls));
    expect(calls.filter((c) => c.startsWith("cancel:") || c.startsWith("schedule:"))).toEqual([]);
  });
});

describe("꺼짐 — 걸린 것을 모두 취소하고 트레이를 비운다", () => {
  it("cancel 전부, dismiss 전부, schedule 없음", async () => {
    const { port, calls } = fakePort({
      scheduled: planFor().slice(0, 2).map(asScheduled),
      presented: [{ id: "diary-reminder-2026-10-14", day: "2026-10-14" }],
    });
    await reconcileReminders(deps(port, calls, { settings: OFF }));
    expect(calls.filter((c) => c.startsWith("cancel:"))).toHaveLength(2);
    expect(calls.filter((c) => c.startsWith("schedule:"))).toEqual([]);
    expect(calls).toContain("dismiss:diary-reminder-2026-10-14");
  });
});

describe("RC3 — 실패를 밖으로 던지지 않고 이어 간다", () => {
  it("prepare가 던져도 계속한다", async () => {
    const { port, calls } = fakePort();
    await expect(
      reconcileReminders(
        deps(port, calls, {
          prepare: async () => {
            throw new Error("channel");
          },
        }),
      ),
    ).resolves.toBeUndefined();
    expect(calls.filter((c) => c.startsWith("schedule:"))).toHaveLength(7);
  });

  it("cancel 하나·schedule 하나가 던져도 나머지를 한다", async () => {
    const stray = [
      { id: "diary-reminder-2026-09-01", day: "2026-09-01", at: 1, title: "x" },
      { id: "diary-reminder-2026-09-02", day: "2026-09-02", at: 2, title: "x" },
    ];
    const { port, calls } = fakePort({ scheduled: stray });
    port.failCancel = stray[0]!.id;
    port.failSchedule = "2026-10-16";
    await reconcileReminders(deps(port, calls));
    expect(calls).toContain(`cancel:${stray[1]!.id}`);
    expect(calls.filter((c) => c.startsWith("schedule:"))).toHaveLength(7);
  });

  it("scheduled()가 던지면 계획 밖의 계산 가능한 id만 취소하고 계획 전부를 건다", async () => {
    const { port, calls } = fakePort();
    port.failScheduled = true;
    await reconcileReminders(deps(port, calls));
    const planned = planFor().map((e) => e.id);
    for (const c of calls.filter((x) => x.startsWith("cancel:"))) {
      expect(planned).not.toContain(c.slice("cancel:".length));
    }
    expect(calls.filter((c) => c.startsWith("schedule:"))).toHaveLength(7);
  });

  it("scheduled()가 던지고 꺼져 있으면 계산 가능한 우리 id(어제 ~ 8일 뒤)를 취소한다 — 계획에 든 것은 건드리지 않는다", async () => {
    const { port, calls } = fakePort();
    port.failScheduled = true;
    await reconcileReminders(deps(port, calls, { settings: OFF }));
    const cancels = calls.filter((c) => c.startsWith("cancel:"));
    expect(cancels).toContain("cancel:diary-reminder-2026-10-14");
    expect(cancels).toContain("cancel:diary-reminder-2026-10-15");
    expect(cancels).toContain("cancel:diary-reminder-2026-10-23");
    expect(calls.filter((c) => c.startsWith("schedule:"))).toEqual([]);

    const on = fakePort();
    on.port.failScheduled = true;
    await reconcileReminders(deps(on.port, on.calls));
    const planned = planFor().map((e) => `cancel:${e.id}`);
    for (const c of on.calls.filter((x) => x.startsWith("cancel:")))
      expect(planned).not.toContain(c);
  });

  it("presented()가 던져도 던지지 않는다", async () => {
    const { port, calls } = fakePort();
    port.failPresented = true;
    await expect(reconcileReminders(deps(port, calls))).resolves.toBeUndefined();
  });

  it("loadName이 던지면 RC6처럼 아무것도 바꾸지 않는다 (캐릭터는 기본 조립이 정한다 — research R8)", async () => {
    const { port, calls } = fakePort({
      scheduled: planFor().slice(0, 1).map(asScheduled),
      presented: [{ id: "diary-reminder-2026-10-14", day: "2026-10-14" }],
    });
    await reconcileReminders(
      deps(port, calls, {
        written: ["2026-10-14"],
        loadName: async () => {
          throw new Error("selection");
        },
      }),
    );
    expect(calls.filter((c) => /^(cancel|schedule|dismiss):/.test(c))).toEqual([]);
  });
});

describe("RC4 — 동시에 불려도 한 줄로 선다", () => {
  it("첫 호출의 마지막 통로 호출이 둘째 호출의 prepare보다 먼저다", async () => {
    const { port, calls } = fakePort();
    const first = reconcileReminders(deps(port, calls));
    const second = reconcileReminders(deps(port, calls));
    await Promise.all([first, second]);
    const prepares = calls.map((c, i) => (c === "prepare" ? i : -1)).filter((i) => i >= 0);
    expect(prepares).toHaveLength(2);
    const firstPresented = calls.indexOf("presented");
    expect(firstPresented).toBeLessThan(prepares[1]!);
  });
});

describe("RC5 — 부를 때마다 다시 읽는다", () => {
  it("두 번 사이에 목록이 바뀌면 둘째 계획이 따른다", async () => {
    const { port, calls } = fakePort();
    let written: string[] = [];
    const d = deps(port, calls, { listDiaryDays: async () => written });
    await reconcileReminders(d);
    written = ["2026-10-15"];
    calls.length = 0;
    await reconcileReminders(d);
    expect(calls.filter((c) => c.startsWith("schedule:"))).not.toContain("schedule:2026-10-15");
  });
});

describe("RC6 — 설정·목록을 읽지 못하면 아무것도 바꾸지 않는다", () => {
  it("loadSettings가 던지면", async () => {
    const { port, calls } = fakePort({
      scheduled: planFor().map(asScheduled),
      presented: [{ id: "diary-reminder-2026-10-14", day: "2026-10-14" }],
    });
    await reconcileReminders(
      deps(port, calls, {
        loadSettings: async () => {
          throw new Error("read");
        },
      }),
    );
    expect(calls.filter((c) => /^(cancel|schedule|dismiss):/.test(c))).toEqual([]);
  });

  it("listDiaryDays가 던지면", async () => {
    const { port, calls } = fakePort({ scheduled: planFor().map(asScheduled) });
    await reconcileReminders(
      deps(port, calls, {
        listDiaryDays: async () => {
          throw new Error("list");
        },
      }),
    );
    expect(calls.filter((c) => /^(cancel|schedule|dismiss):/.test(c))).toEqual([]);
  });
});

describe("RC2(일부) — 날을 모르는 우리 알림은 거둔다", () => {
  it("day === null", async () => {
    const { port, calls } = fakePort({ presented: [{ id: "diary-reminder-x", day: null }] });
    await reconcileReminders(deps(port, calls));
    expect(calls).toContain("dismiss:diary-reminder-x");
  });
});

describe("RC7·FX3 — 소스 경계", () => {
  const read = (file: string) =>
    readFileSync(join(__dirname, "..", "..", file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

  it.each([
    "src/schedule/reminders.ts",
    "src/schedule/reminder-plan.ts",
    "src/schedule/reminder-port.ts",
  ])("%s는 AppState·react-native를 참조하지 않는다", (file) => {
    const source = read(file);
    expect(source).not.toMatch(/\bAppState\b/);
    expect(source).not.toMatch(/["']react-native["']/);
  });

  it.each(["src/schedule/reminders.ts", "src/schedule/reminder-plan.ts"])(
    "%s는 ../app/을 import하지 않는다",
    (file) => {
      expect(read(file)).not.toMatch(/from ["']\.\.\/app\//);
    },
  );

  it("reminders.ts는 알림 권한을 묻지 않는다 (FR-016)", () => {
    expect(read("src/schedule/reminders.ts")).not.toMatch(/getPermission|getPermissionsAsync/);
  });
});

describe("RC2 — 켜져 있으면 쓴 날·사흘 밖·날 모름만 거둔다", () => {
  it("넷 중 셋", async () => {
    // 21:00 — 사흘은 오늘·어제·그제(10-15·10-14·10-13)
    const { port, calls } = fakePort({
      presented: [
        { id: "diary-reminder-2026-10-14", day: "2026-10-14" }, // 쓴 날
        { id: "diary-reminder-2026-10-01", day: "2026-10-01" }, // 사흘 밖
        { id: "diary-reminder-2026-10-13", day: "2026-10-13" }, // 안 쓴 사흘 안
        { id: "diary-reminder-x", day: null },
      ],
    });
    await reconcileReminders(deps(port, calls, { written: ["2026-10-14"] }));
    expect(calls.filter((c) => c.startsWith("dismiss:")).sort()).toEqual(
      [
        "dismiss:diary-reminder-2026-10-14",
        "dismiss:diary-reminder-2026-10-01",
        "dismiss:diary-reminder-x",
      ].sort(),
    );
  });
});

describe("RC8 — 시각이 지났지만 아직 전달되지 않은 예약을 지우지 않는다 (085 실기기 2026-10-15)", () => {
  // 부정확 알람(최대 +1시간)·삼성 얼림 동안은 목표 시각이 지나도 예약이 남아 있다. 그 사이 맞추기가 돌면 계획에는 그 발화가 없다
  // (지난 시각) — 그것을 「계획에 없음」으로 취소하면 그날 알림이 영영 안 뜬다(17:01:53 백그라운드 잡의 맞추기가 17:00 예약을 취소함).
  const AT_1701 = new Date(2026, 9, 15, 17, 1);
  const ON17: AutoDiarySettings = { enabled: true, targetHour: 17 };
  const pending = {
    id: "diary-reminder-2026-10-15",
    day: "2026-10-15",
    at: new Date(2026, 9, 15, 17, 0).getTime(),
    title: "은동이 10월 15일 일기를 쓸 차례예요",
  };
  const with1701 = (
    port: ReminderPort,
    calls: string[],
    over: Parameters<typeof deps>[2] = {},
  ) => ({
    ...deps(port, calls, { settings: ON17, ...over }),
    now: () => AT_1701,
  });

  it("켜져 있고 그 날을 아직 안 썼으면 지난 예약을 그대로 둔다", async () => {
    const { port, calls } = fakePort({ scheduled: [pending] });
    await reconcileReminders(with1701(port, calls));
    expect(calls).not.toContain(`cancel:${pending.id}`);
  });

  it("그 날을 썼으면 취소한다", async () => {
    const { port, calls } = fakePort({ scheduled: [pending] });
    await reconcileReminders(with1701(port, calls, { written: ["2026-10-15"] }));
    expect(calls).toContain(`cancel:${pending.id}`);
  });

  it("꺼졌으면 취소한다", async () => {
    const { port, calls } = fakePort({ scheduled: [pending] });
    await reconcileReminders(
      with1701(port, calls, { settings: { enabled: false, targetHour: 17 } }),
    );
    expect(calls).toContain(`cancel:${pending.id}`);
  });

  it("scheduled()를 읽지 못해도 켜져 있으면 안 쓴 날의 id를 취소하지 않는다", async () => {
    const { port, calls } = fakePort();
    port.failScheduled = true;
    await reconcileReminders(with1701(port, calls));
    expect(calls).not.toContain(`cancel:${pending.id}`);
  });
});

/* ───────────────────────── 104 — 배터리 예외 상태가 알림 시각을 정한다 ───────────────────────── */

const MIN = 60_000;

/** 예약이 들고 있는 상태를 흉내 낸다 — 같은 id를 다시 걸면 바꿔 끼운다 */
function statefulPort(initial: ReminderPlanEntry[] = []) {
  const state = new Map<string, ScheduledReminder>(initial.map((e) => [e.id, asScheduled(e)]));
  const ops: string[] = [];
  const port: ReminderPort = {
    async scheduled() {
      return [...state.values()];
    },
    async schedule(entry) {
      ops.push(`schedule:${entry.day}`);
      state.set(entry.id, asScheduled(entry));
    },
    async cancel(id) {
      ops.push(`cancel:${id}`);
      state.delete(id);
    },
    async presented() {
      return [];
    },
    async dismiss() {},
  };
  return { port, state, ops };
}

const planWith = (delayMinutes: number, written: string[] = []) =>
  planReminders({ now: NOW, settings: ON, writtenDays: written, name: "은동", delayMinutes });

const withStatus = (status: BatteryExceptionStatus | (() => Promise<BatteryExceptionStatus>)) => ({
  loadBatteryStatus: typeof status === "function" ? status : async () => status,
});

describe("RC9·RC10 — 예외 상태가 계획의 지연을 정한다", () => {
  it("exempt면 모든 발화가 정각 + 30분", async () => {
    const { port, state } = statefulPort();
    await reconcileReminders(deps(port, [], withStatus("exempt")));
    expect([...state.values()].map((s) => s.at).sort()).toEqual(
      planWith(30)
        .map((e) => e.at)
        .sort(),
    );
    expect([...state.values()].map((s) => s.at).sort()).toEqual(
      planWith(0)
        .map((e) => e.at + 30 * MIN)
        .sort(),
    );
  });

  it.each(["restricted", "unknown"] as const)(
    "%s면 모든 발화가 정각이다 (SC-003)",
    async (status) => {
      const { port, state } = statefulPort();
      await reconcileReminders(deps(port, [], withStatus(status)));
      expect([...state.values()].map((s) => s.at).sort()).toEqual(
        planWith(0)
          .map((e) => e.at)
          .sort(),
      );
    },
  );

  it("상태를 읽다 던져도(SC-007) 맞추기를 멈추지 않고 정각으로 7개를 건다", async () => {
    const { port, state } = statefulPort();
    await reconcileReminders(
      deps(
        port,
        [],
        withStatus(async () => {
          throw new Error("native");
        }),
      ),
    );
    expect(state.size).toBe(7);
    expect([...state.values()].map((s) => s.at).sort()).toEqual(
      planWith(0)
        .map((e) => e.at)
        .sort(),
    );
  });

  it("상태 읽기가 동기로 던져도 마찬가지다", async () => {
    const { port, state } = statefulPort();
    await reconcileReminders(
      deps(port, [], {
        loadBatteryStatus: () => {
          throw new Error("sync");
        },
      }),
    );
    expect(state.size).toBe(7);
  });

  it("자동 쓰기가 꺼져 있으면 상태를 읽지 않는다", async () => {
    const { port } = statefulPort();
    const loadBatteryStatus = jest.fn(async () => "exempt" as const);
    await reconcileReminders(deps(port, [], { settings: OFF, loadBatteryStatus }));
    expect(loadBatteryStatus).not.toHaveBeenCalled();
  });
});

describe("RC11 — 상태가 바뀌면 걸린 예약이 새 시각으로 바뀐다", () => {
  it("정각으로 걸린 7개가 exempt가 되면 +30분으로 다시 걸린다", async () => {
    const { port, state, ops } = statefulPort(planWith(0));
    await reconcileReminders(deps(port, [], withStatus("exempt")));
    expect(ops.filter((o) => o.startsWith("schedule:"))).toHaveLength(7);
    expect([...state.values()].map((s) => s.at).sort()).toEqual(
      planWith(30)
        .map((e) => e.at)
        .sort(),
    );
    expect(state.size).toBe(7);
  });

  it("exempt → restricted → exempt를 오가도 같은 id의 예약은 하나씩이다", async () => {
    const { port, state } = statefulPort();
    let status: BatteryExceptionStatus = "exempt";
    const d = deps(port, [], { loadBatteryStatus: async () => status });
    const first = planWith(30)[0]!;

    await reconcileReminders(d);
    expect(state.get(first.id)!.at).toBe(first.at);
    status = "restricted";
    await reconcileReminders(d);
    expect(state.get(first.id)!.at).toBe(first.at - 30 * MIN);
    status = "exempt";
    await reconcileReminders(d);
    expect(state.get(first.id)!.at).toBe(first.at);
    expect(state.size).toBe(7);
  });

  it("이미 새 시각으로 걸려 있으면 취소도 예약도 없다", async () => {
    const { port, ops } = statefulPort(planWith(30));
    await reconcileReminders(deps(port, [], withStatus("exempt")));
    expect(ops).toEqual([]);
  });
});

describe("RC12 — 안전장치: 일기 파일이 생긴 날의 예약만 거둔다", () => {
  it.each(["exempt", "restricted", "unknown"] as const)(
    "%s — 파일이 없는 날의 예약은 취소되지 않고 시각만 맞춰진다",
    async (status) => {
      const { port, state } = statefulPort(planWith(status === "exempt" ? 0 : 30));
      await reconcileReminders(deps(port, [], withStatus(status)));
      expect([...state.keys()].sort()).toEqual(
        planWith(0)
          .map((e) => e.id)
          .sort(),
      );
      expect(state.has("diary-reminder-2026-10-15")).toBe(true);
    },
  );

  it("지연으로 걸어 둔 예약은 일기가 없는 동안 그대로 남는다 (쓰기 도중에도 맞추기는 거두지 않는다)", async () => {
    const { port, state, ops } = statefulPort(planWith(30));
    // 쓰기가 시작됐다고 해서 목록(일기 파일)에는 아무것도 생기지 않는다 — 몇 번을 맞춰도 그대로다.
    await reconcileReminders(deps(port, [], withStatus("exempt")));
    await reconcileReminders(deps(port, [], withStatus("exempt")));
    expect(ops).toEqual([]);
    expect(state.size).toBe(7);
  });
});

describe("RC13 — 조립: 저장되면 지연된 예약이 알림 전에 거둬진다", () => {
  it("저장 전에는 남고, 저장(목록에 날 생김) 뒤 맞추기에서 그 날만 거둬진다", async () => {
    const { port, state } = statefulPort(planWith(30));
    let written: string[] = [];
    const d = deps(port, [], {
      ...withStatus("exempt"),
      listDiaryDays: async () => written,
    });

    await reconcileReminders(d);
    expect(state.has("diary-reminder-2026-10-15")).toBe(true);

    written = ["2026-10-15"];
    await reconcileReminders(d);
    expect(state.has("diary-reminder-2026-10-15")).toBe(false);
    expect(state.size).toBe(6);
    expect(state.has("diary-reminder-2026-10-16")).toBe(true);
  });
});

describe("RC12 — 리뷰 회귀: 정각~정각+30분 사이에 상태가 바뀌거나 읽기가 실패해도 일기 없는 날의 예약은 남는다", () => {
  // 22시 목표 · 지금 22:10 — 정각은 지났고 exempt로 걸어 둔 22:30은 아직 오지 않았다
  const LATE = new Date(2026, 9, 15, 22, 10);
  const planLate = (delay: number) =>
    planReminders({
      now: new Date(2026, 9, 15, 21, 0),
      settings: ON,
      writtenDays: [],
      name: "은동",
      delayMinutes: delay,
    });

  it.each(["unknown", "restricted"] as const)(
    "%s로 읽혀도 오늘 22:30 예약은 취소되지 않는다",
    async (status) => {
      const { port, state } = statefulPort(planLate(30));
      await reconcileReminders(deps(port, [], { ...withStatus(status), now: () => LATE }));
      expect(state.get("diary-reminder-2026-10-15")?.at).toBe(at2(2026, 10, 15, 22, 30));
    },
  );

  it("읽기가 던져도 마찬가지다", async () => {
    const { port, state } = statefulPort(planLate(30));
    await reconcileReminders(
      deps(port, [], {
        now: () => LATE,
        loadBatteryStatus: async () => {
          throw new Error("headless");
        },
      }),
    );
    expect(state.has("diary-reminder-2026-10-15")).toBe(true);
  });

  it("일기가 저장됐으면 그 날 예약은 거둬진다", async () => {
    const { port, state } = statefulPort(planLate(30));
    await reconcileReminders(
      deps(port, [], {
        ...withStatus("unknown"),
        now: () => LATE,
        listDiaryDays: async () => ["2026-10-15"],
      }),
    );
    expect(state.has("diary-reminder-2026-10-15")).toBe(false);
  });

  it("목표 시각을 바꿔서 계획에 없는 옛 예약(+30분이 아닌 시각)은 거둬진다", async () => {
    // 22시로 걸린 오늘 22:30 예약, 목표를 18시로 바꾼 뒤(지금 22:10) — 18:30은 지났고 22:30은 새 목표의 지연 시각이 아니다
    const { port, state } = statefulPort(planLate(30));
    await reconcileReminders(
      deps(port, [], {
        ...withStatus("exempt"),
        now: () => LATE,
        settings: { enabled: true, targetHour: 18 },
      }),
    );
    expect(state.get("diary-reminder-2026-10-15")).toBeUndefined();
  });
});

const at2 = (y: number, m: number, d: number, h: number, min: number) =>
  new Date(y, m - 1, d, h, min).getTime();
