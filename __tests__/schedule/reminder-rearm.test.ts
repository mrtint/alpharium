/**
 * 107 — 쓸 차례 알림 다시 걸기.
 *
 * 계약: specs/107-reminder-rearm/contracts/rearm.md RA1~RA8
 *
 * 통로는 대역이다. 「지금」은 2026-10-15 21:00(목표 22시). 문(門)은 프로세스 메모리 한 칸이라 테스트마다 새로 만든다.
 */

import { planReminders, type ReminderPlanEntry } from "../../src/schedule/reminder-plan";
import { expoReminderDeps } from "../../src/schedule/reminder-deps";
import type {
  PresentedReminder,
  ReminderPort,
  ScheduledReminder,
} from "../../src/schedule/reminder-port";
import {
  createRearmGate,
  reconcileReminders,
  type RearmGate,
  type ReminderDeps,
} from "../../src/schedule/reminders";
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

const planFor = (settings = ON, written: string[] = []) =>
  planReminders({ now: NOW, settings, writtenDays: written, name: "은동", delayMinutes: 0 });

function fakePort(init: { scheduled?: ScheduledReminder[]; presented?: PresentedReminder[] } = {}) {
  const calls: string[] = [];
  const port: ReminderPort & { failScheduled?: boolean; failSchedule?: string } = {
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
    },
    async presented() {
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
  rearm: RearmGate | undefined,
  over: Partial<ReminderDeps> & { settings?: AutoDiarySettings; written?: string[] } = {},
): ReminderDeps {
  return {
    port,
    now: () => NOW,
    prepare: async () => {},
    loadSettings: async () => over.settings ?? ON,
    listDiaryDays: async () => over.written ?? [],
    loadName: async () => "은동",
    loadBatteryStatus: async () => "unknown",
    rearm,
    ...over,
  };
}

const schedules = (calls: string[]) => calls.filter((c) => c.startsWith("schedule:"));

describe("RA1·RA2 — 첫 맞추기에서 전부 다시 건다", () => {
  it("걸린 예약이 계획과 똑같아도 첫 맞추기는 계획 전부를 다시 건다", async () => {
    const p = planFor();
    const { port, calls } = fakePort({ scheduled: p.map(asScheduled) });
    await reconcileReminders(deps(port, createRearmGate()));
    expect(schedules(calls)).toEqual(p.map((e) => `schedule:${e.day}`));
    expect(calls.filter((c) => c.startsWith("cancel:"))).toEqual([]);
  });

  it("같은 문의 두 번째 맞추기는 아무것도 다시 걸지 않는다", async () => {
    const p = planFor();
    const { port, calls } = fakePort({ scheduled: p.map(asScheduled) });
    const gate = createRearmGate();
    await reconcileReminders(deps(port, gate));
    calls.length = 0;
    await reconcileReminders(deps(port, gate));
    expect(schedules(calls)).toEqual([]);
  });

  it("문이 없으면(rearm 미지정) 종전처럼 차이만 고친다", async () => {
    const p = planFor();
    const { port, calls } = fakePort({ scheduled: p.map(asScheduled) });
    await reconcileReminders(deps(port, undefined));
    expect(schedules(calls)).toEqual([]);
  });

  it("새 문(새 프로세스)이면 다시 건다", async () => {
    const p = planFor();
    const { port, calls } = fakePort({ scheduled: p.map(asScheduled) });
    await reconcileReminders(deps(port, createRearmGate()));
    calls.length = 0;
    await reconcileReminders(deps(port, createRearmGate()));
    expect(schedules(calls)).toHaveLength(p.length);
  });
});

describe("RA3~RA5 — 소비 조건", () => {
  it("schedule이 하나라도 실패하면 소비하지 않아 다음 맞추기가 다시 전부 건다", async () => {
    const p = planFor();
    const { port, calls } = fakePort({ scheduled: p.map(asScheduled) });
    port.failSchedule = p[2]!.day;
    const gate = createRearmGate();
    await reconcileReminders(deps(port, gate));
    expect(gate.pending()).toBe(true);
    port.failSchedule = undefined;
    calls.length = 0;
    await reconcileReminders(deps(port, gate));
    expect(schedules(calls)).toHaveLength(p.length);
    expect(gate.pending()).toBe(false);
  });

  it("설정을 읽지 못한 맞추기(RC6)는 문을 건드리지 않는다", async () => {
    const { port, calls } = fakePort();
    const gate = createRearmGate();
    await reconcileReminders(
      deps(port, gate, {
        loadSettings: async () => {
          throw new Error("io");
        },
      }),
    );
    expect(schedules(calls)).toEqual([]);
    expect(gate.pending()).toBe(true);
  });

  it("일기 목록·이름을 못 읽어도 문은 그대로다", async () => {
    const { port } = fakePort();
    const gate = createRearmGate();
    await reconcileReminders(
      deps(port, gate, {
        listDiaryDays: async () => {
          throw new Error("io");
        },
      }),
    );
    await reconcileReminders(
      deps(port, gate, {
        loadName: async () => {
          throw new Error("io");
        },
      }),
    );
    expect(gate.pending()).toBe(true);
  });

  it("꺼짐(계획 빔)이면 소비하지 않는다 — 켜는 순간의 맞추기가 첫 맞추기다", async () => {
    const { port, calls } = fakePort();
    const gate = createRearmGate();
    await reconcileReminders(deps(port, gate, { settings: OFF }));
    expect(gate.pending()).toBe(true);
    await reconcileReminders(deps(port, gate, { settings: ON }));
    expect(schedules(calls)).toHaveLength(planFor().length);
    expect(gate.pending()).toBe(false);
  });

  it("계획이 비면(7일치 모두 쓴 날) 소비하지 않는다", async () => {
    const all = planFor().map((e) => e.day);
    const { port } = fakePort();
    const gate = createRearmGate();
    await reconcileReminders(deps(port, gate, { written: all }));
    expect(gate.pending()).toBe(true);
  });

  it("예약 목록을 못 읽은 맞추기도 계획 전부를 걸었으면 소비한다", async () => {
    const { port, calls } = fakePort();
    port.failScheduled = true;
    const gate = createRearmGate();
    await reconcileReminders(deps(port, gate));
    expect(schedules(calls)).toHaveLength(planFor().length);
    expect(gate.pending()).toBe(false);
  });
});

describe("RA6 — 기존 규칙은 다시 걸기와 무관하다", () => {
  it("쓴 날의 예약은 다시 걸기 맞추기에서도 거둔다", async () => {
    const p = planFor();
    const writtenDay = p[0]!.day;
    const stale = asScheduled(p[0]!);
    const { port, calls } = fakePort({ scheduled: [stale, ...p.slice(1).map(asScheduled)] });
    await reconcileReminders(deps(port, createRearmGate(), { written: [writtenDay] }));
    expect(calls).toContain(`cancel:${stale.id}`);
    expect(schedules(calls)).not.toContain(`schedule:${writtenDay}`);
  });

  it("RC8 — 지났지만 전달 전일 수 있는 그 날의 예약은 취소하지 않는다", async () => {
    const past: ScheduledReminder = {
      id: "diary-reminder-2026-10-14",
      day: "2026-10-14",
      at: new Date(2026, 9, 14, 22).getTime(),
      title: "t",
    };
    const p = planFor();
    const { port, calls } = fakePort({ scheduled: [past, ...p.map(asScheduled)] });
    await reconcileReminders(deps(port, createRearmGate()));
    expect(calls).not.toContain(`cancel:${past.id}`);
  });

  it("104 — 지연 예약(정각 지남·정각+30분 전)은 다시 걸기에서도 취소하지 않는다", async () => {
    const at = new Date(2026, 9, 15, 22, 30).getTime();
    const now = new Date(2026, 9, 15, 22, 10);
    const delayed = planReminders({
      now: new Date(2026, 9, 15, 21, 0),
      settings: ON,
      writtenDays: [],
      name: "은동",
      delayMinutes: 30,
    })[0]!;
    expect(delayed.at).toBe(at);
    const rest = planFor(ON).slice(1);
    const { port, calls } = fakePort({
      scheduled: [asScheduled(delayed), ...rest.map(asScheduled)],
    });
    await reconcileReminders(deps(port, createRearmGate(), { now: () => now }));
    expect(calls).not.toContain(`cancel:${delayed.id}`);
  });
});

describe("RA7 — 거의 동시에 불려도 첫 맞추기는 한 번이다", () => {
  it("두 번을 함께 부르면 다시 걸기는 한 번분", async () => {
    const p = planFor();
    const { port, calls } = fakePort({ scheduled: p.map(asScheduled) });
    const gate = createRearmGate();
    await Promise.all([reconcileReminders(deps(port, gate)), reconcileReminders(deps(port, gate))]);
    expect(schedules(calls)).toHaveLength(p.length);
  });
});

describe("RA8 — 기본 조립의 문은 프로세스 메모리다", () => {
  it("expoReminderDeps()는 호출마다 같은 문을 쓴다(프로세스당 하나)", () => {
    expect(expoReminderDeps().rearm).toBeDefined();
    expect(expoReminderDeps().rearm).toBe(expoReminderDeps().rearm);
  });

  it("rearmGate 덮어쓰기를 따른다", () => {
    const gate = createRearmGate();
    expect(expoReminderDeps({ rearmGate: gate }).rearm).toBe(gate);
  });

  it("조립: 같은 문으로 부른 두 번째 맞추기는 다시 걸지 않고, 새 문은 다시 건다", async () => {
    // 실제 조립은 홈과 같은 기본 캐릭터 이름을 쓰므로, 통로가 건 예약을 그대로 되돌려 주는 상태 있는 대역을 쓴다.
    const stored = new Map<string, ScheduledReminder>();
    const { port, calls } = fakePort();
    port.scheduled = async () => [...stored.values()];
    const baseSchedule = port.schedule;
    port.schedule = async (entry) => {
      await baseSchedule(entry);
      stored.set(entry.id, asScheduled(entry));
    };
    const common = {
      reminderPort: port,
      notificationPort: { ensureChannel: async () => {} },
      settingsPort: { read: async () => JSON.stringify(ON) },
      store: { listDays: async () => [] },
      batteryPort: { readStatus: async () => "unknown" as const },
      selectionPort: { read: async () => null, write: async () => {} },
      namesPort: { read: async () => null, write: async () => {} },
    };
    const gate = createRearmGate();
    const run = (g: RearmGate) =>
      reconcileReminders({ ...expoReminderDeps({ ...common, rearmGate: g }), now: () => NOW });
    await run(gate);
    const first = schedules(calls).length;
    expect(first).toBeGreaterThan(0);
    calls.length = 0;
    await run(gate);
    expect(schedules(calls)).toEqual([]);
    await run(createRearmGate());
    expect(schedules(calls)).toHaveLength(first);
  });
});
