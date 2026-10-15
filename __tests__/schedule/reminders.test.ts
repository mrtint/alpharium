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
    ...over,
  };
}

const planFor = (settings = ON, written: string[] = []) =>
  planReminders({ now: NOW, settings, writtenDays: written, name: "은동" });

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
