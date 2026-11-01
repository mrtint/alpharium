import { render, screen, waitFor } from "@testing-library/react-native";
import { useMemo } from "react";
import { Text } from "react-native";

import { createFastCycleResetter } from "../../src/app/fast-cycle-reset";
import type { DayPreview } from "../../src/app/state";
import { useAutoWriteHandoff } from "../../src/app/use-auto-write-handoff";
import { createLiveWrites } from "../../src/diary/live-write";
import { memoryStore } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import { decideSchedule } from "../../src/schedule/decision";
import { planReminders } from "../../src/schedule/reminder-plan";
import { fastCycleTiming } from "../../src/schedule/timing";
import { loadFastCycle, serializeFastCycle } from "../../src/schedule/fast-cycle-store";
import type {
  PresentedReminder,
  ReminderPort,
  ScheduledReminder,
} from "../../src/schedule/reminder-port";
import { reconcileReminders } from "../../src/schedule/reminders";
import type { AutoDiarySettings } from "../../src/schedule/settings";
import { runAutoDiaryTask } from "../../src/schedule/task";
import { loadScheduleTiming } from "../../src/schedule/timing-source";
import { emptyDay } from "../../src/signals/fake";
import { ledgerPort } from "./attempt-ledger-fixture";

/**
 * 106 — 빠른 주기의 한 바퀴를 실제 판정·리셋·기록으로 묶은 조립 테스트 (spec US1, SC-009의 코드 쪽).
 *
 * 「리셋 → 쓰기 → 저장 → 같은 주기 재판정은 이미 쓴 날 → 다음 주기 리셋 → 다시 쓰기」를 판정 자리 둘(백그라운드 `task.ts`, 앱 열기
 * 훅)에서 각각 돈다. 통로만 대역(메모리 일기 목록·기록)이다. 둘 중 한 자리에서 리셋이나 `timing`을 빼면 이 테스트가 실패한다.
 */

const TODAY = "2026-10-26";
/** 30분 주기. 순번 20은 10:00~10:30(창 10:00~10:15), 순번 21은 10:30~11:00(창 10:30~10:45) */
const AT = (h: number, m: number) => new Date(2026, 9, 26, h, m);
const PERIOD_RECORD = (cycle: string) =>
  serializeFastCycle({ periodMinutes: 30, resetCycle: cycle });

const entry = (date: string): DiaryEntry => ({
  date,
  text: `${date}의 일기`,
  character: "quiet",
  signalsUsed: emptyDay(date),
  createdAt: new Date(`${date}T20:00:00`),
});

const preview = (day: string): DayPreview => ({
  day,
  photos: { kind: "known", count: 3 },
  places: { kind: "unknown" },
  photoAccess: "ok",
});

function memoryFile(initial: string | null = null) {
  const f = { content: initial };
  return {
    f,
    port: {
      read: async () => f.content,
      write: async (s: string) => {
        f.content = s;
      },
      remove: async () => {
        f.content = null;
      },
    },
  };
}

function world(initialCycle = "2026-10-26#19") {
  const store = memoryStore();
  const fast = memoryFile(PERIOD_RECORD(initialCycle));
  const notified = memoryFile();
  const skip = memoryFile();
  const catchUp = memoryFile();
  const liveWrites = createLiveWrites();
  const dismissed: string[] = [];
  const base = {
    devEnvironment: true,
    fastCyclePort: fast.port,
    store,
    notifiedPort: notified.port,
    skipPort: skip.port,
    catchUpPort: catchUp.port,
    dismiss: async (id: string) => {
      dismissed.push(id);
    },
    liveWrites,
  };
  return { store, fast, notified, skip, catchUp, liveWrites, dismissed, base };
}

describe("US1 — 백그라운드 자리: 리셋 → 쓰기 → 저장 → 같은 주기는 이미 씀 → 다음 주기에 다시", () => {
  it("두 주기를 돈다", async () => {
    const w = world();
    // 파이프라인 대역은 진짜처럼 저장한다 — 그래서 다음 판정이 「이미 쓴 날」을 본다
    const run = jest.fn(async ({ day }: { day: string }) => {
      await w.store.save(entry(day));
      return { ok: true, entry: entry(day), overwrote: false };
    });
    const attempts = ledgerPort();
    const deps = {
      resolution: { ok: true, environment: "dev" } as never,
      fastCyclePort: w.fast.port,
      liveWrites: w.liveWrites,
      catchUpPort: w.catchUp.port,
      skipPort: w.skip.port,
      notifiedPort: w.notified.port,
      reconcileReminders: async () => {},
      attemptPort: attempts,
      failurePort: { read: async () => null, write: async () => {} },
      settingsPort: {
        read: async () => JSON.stringify({ enabled: true, targetHour: 7 }),
        write: async () => {},
      },
      notificationPort: {
        ensureChannel: async () => {},
        requestPermission: async () => "granted" as const,
        getPermission: async () => "granted" as const,
        present: async () => "n",
        dismiss: async (id: string) => {
          w.dismissed.push(id);
        },
        lastResponse: async () => null,
        onResponse: () => () => {},
      },
      loadCharacter: async () => "quiet" as const,
      loadNames: async () => ({}),
      makePipeline: (() => ({
        ok: true,
        pipeline: { run },
        location: "on-device",
        previewDay: async (day: string) => preview(day),
        store: w.store,
      })) as never,
    };

    // 주기 20 — 창 안: 쓴다
    expect(await runAutoDiaryTask({ ...deps, now: AT(10, 5) })).toBe("ran");
    expect(await w.store.has(TODAY)).toBe(true);
    expect((await loadFastCycle(w.fast.port))?.resetCycle).toBe("2026-10-26#20");

    // 같은 주기의 남은 시간 — 이미 쓴 날
    expect(await runAutoDiaryTask({ ...deps, now: AT(10, 10) })).toBe("skipped");
    expect(run).toHaveBeenCalledTimes(1);

    // 창 밖 — 쓰지 않는다
    expect(await runAutoDiaryTask({ ...deps, now: AT(10, 20) })).toBe("skipped");
    expect(run).toHaveBeenCalledTimes(1);

    // 주기 21 — 판정 직전에 오늘이 지워져 다시 쓴다
    expect(await runAutoDiaryTask({ ...deps, now: AT(10, 35) })).toBe("ran");
    expect(run).toHaveBeenCalledTimes(2);
    expect((await loadFastCycle(w.fast.port))?.resetCycle).toBe("2026-10-26#21");
    expect(await w.store.has(TODAY)).toBe(true);
  });
});

describe("US1 — 앱 열기 자리: 같은 한 바퀴를 훅이 돈다", () => {
  function Harness(props: {
    w: ReturnType<typeof world>;
    now: () => Date;
    onCycleReset: () => void;
  }) {
    const { w } = props;
    // 훅의 의존은 안정된 참조여야 한다(조립부가 `useMemo`로 쥔다)
    const resetFastCycle = useMemo(() => createFastCycleResetter(w.base), [w]);
    const loadTiming = useMemo(
      () => (settings: AutoDiarySettings) =>
        loadScheduleTiming({ settings, devEnvironment: true, port: w.fast.port }).then(
          (r) => r.timing,
        ),
      [w],
    );
    const settings = useMemo(() => ({ enabled: true, targetHour: 7 }), []);
    const previewDay = useMemo(() => async (d: string) => preview(d), []);
    const listDiaryDays = useMemo(() => () => w.store.listDays(), [w]);
    const day = useAutoWriteHandoff({
      settings,
      previewDay,
      skipPort: w.skip.port,
      listDiaryDays,
      now: props.now,
      resetFastCycle,
      onCycleReset: props.onCycleReset,
      loadTiming,
    });
    return <Text testID="day">{day ?? "없음"}</Text>;
  }
  const handed = () => screen.getByTestId("day").props.children as string;

  it("두 주기를 돈다 — 리셋했을 때만 onCycleReset이 불린다", async () => {
    const w = world();
    const onCycleReset = jest.fn();
    let current = AT(10, 5);
    const view = await render(<Harness w={w} now={() => current} onCycleReset={onCycleReset} />);

    // 주기 20 — 리셋(기록은 #19) 뒤 오늘을 넘긴다
    await waitFor(() => expect(handed()).toBe(TODAY));
    expect(onCycleReset).toHaveBeenCalledTimes(1);

    // 홈이 쓴 것으로 치고 오늘 일기를 둔다 — 같은 주기에는 지우지도 다시 넘기지도 않는다
    await w.store.save(entry(TODAY));
    current = AT(10, 10);
    await view.rerender(<Harness w={w} now={() => current} onCycleReset={onCycleReset} />);
    await waitFor(() => expect(handed()).toBe("없음"));
    expect(await w.store.has(TODAY)).toBe(true);
    expect(onCycleReset).toHaveBeenCalledTimes(1);

    // 창 밖
    current = AT(10, 20);
    await view.rerender(<Harness w={w} now={() => current} onCycleReset={onCycleReset} />);
    await waitFor(() => expect(handed()).toBe("없음"));

    // 주기 21 — 오늘이 지워지고 다시 넘긴다
    current = AT(10, 35);
    await view.rerender(<Harness w={w} now={() => current} onCycleReset={onCycleReset} />);
    await waitFor(() => expect(handed()).toBe(TODAY));
    expect(await w.store.has(TODAY)).toBe(false);
    expect(onCycleReset).toHaveBeenCalledTimes(2);
  });

  it("배포 환경이면 기록이 켜져 있어도 오늘을 지우지 않는다", async () => {
    const w = world();
    await w.store.save(entry(TODAY));
    const prod = createFastCycleResetter({ ...w.base, devEnvironment: false });
    expect(await prod(AT(10, 35))).toEqual({ reset: false });
    expect(await w.store.has(TODAY)).toBe(true);
    expect((await loadFastCycle(w.fast.port))?.resetCycle).toBe("2026-10-26#19");
  });
});

describe("US4 — 쓸 차례 알림: 주기 시작에 걸리고, 저장되면 거둬지고, 다음 주기에 다시 걸린다", () => {
  function reminderWorld() {
    const w = world();
    const scheduled: ScheduledReminder[] = [];
    let presented: PresentedReminder[] = [];
    const dismissed: string[] = [];
    const port: ReminderPort = {
      async scheduled() {
        return [...scheduled];
      },
      async schedule(entry) {
        const i = scheduled.findIndex((s) => s.id === entry.id);
        const next = { id: entry.id, day: entry.day, at: entry.at, title: entry.title };
        if (i >= 0) scheduled[i] = next;
        else scheduled.push(next);
      },
      async cancel(id) {
        const i = scheduled.findIndex((s) => s.id === id);
        if (i >= 0) scheduled.splice(i, 1);
      },
      async presented() {
        return [...presented];
      },
      async dismiss(id) {
        dismissed.push(id);
        presented = presented.filter((p) => p.id !== id);
      },
    };
    const reconcile = (now: Date) =>
      reconcileReminders({
        port,
        now: () => now,
        prepare: async () => {},
        loadSettings: async () => ({ enabled: true, targetHour: 22 }),
        listDiaryDays: () => w.store.listDays(),
        loadName: async () => "은동",
        loadBatteryStatus: async () => "unknown",
        loadTiming: (settings) =>
          loadScheduleTiming({ settings, devEnvironment: true, port: w.fast.port }).then(
            (r) => r.timing,
          ),
      });
    return {
      w,
      scheduled,
      dismissed,
      reconcile,
      tray: (reminders: PresentedReminder[]) => {
        presented = reminders;
      },
    };
  }

  it("다음 주기 시작에 예약 하나 → 일기 저장 뒤 트레이의 쓸 차례 알림이 거둬지고 → 다음 주기에 다시 하나", async () => {
    const r = reminderWorld();

    // 주기 20(10:00~10:30) 안 — 다음 주기 시작(10:30)에 하나
    await r.reconcile(AT(10, 20));
    expect(r.scheduled).toHaveLength(1);
    expect(r.scheduled[0]!.at).toBe(AT(10, 30).getTime());

    // 주기 시작에 알림이 떴다 — 아직 일기가 없으니 트레이에 남는다
    r.tray([{ id: `diary-reminder-${TODAY}`, day: TODAY }]);
    await r.reconcile(AT(10, 32));
    expect(r.dismissed).toEqual([]);

    // 쓰기가 저장됐다 — 맞추기가 트레이의 알림을 거둔다 (완성 알림만 남는다)
    await r.w.store.save(entry(TODAY));
    await r.reconcile(AT(10, 40));
    expect(r.dismissed).toEqual([`diary-reminder-${TODAY}`]);

    // 다음 주기(11:00)의 예약이 같은 id로 바뀌어 걸려 있다
    expect(r.scheduled).toHaveLength(1);
    expect(r.scheduled[0]!.at).toBe(AT(11, 0).getTime());
  });
});

describe("코드 리뷰 I1 — 지연된 쓸 차례 알림을 누르면 앱 열기 판정이 아직 창 안이다", () => {
  it.each([5, 10, 30, 60, 100, 180])(
    "N=%d: 배터리 예외 지연을 더한 알림 시각에서 판정하면 오늘을 쓰기로 정한다",
    (n) => {
      const timing = fastCycleTiming(n);
      const now = AT(10, 7);
      const [entry] = planReminders({
        now,
        settings: { enabled: true, targetHour: 22 },
        writtenDays: [],
        name: "은동",
        delayMinutes: timing.reminderDelayCap,
        timing,
      });
      const decision = decideSchedule({
        settings: { enabled: true, targetHour: 22 },
        now: new Date(entry!.at),
        today: dayOfDate(new Date(entry!.at)),
        targetDay: timing.targetDay,
        selectableDays: [],
        existingDiaryDays: [],
        timing,
      });
      expect(decision.act).toBe(true);
    },
  );
});

function dayOfDate(d: Date): string {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
