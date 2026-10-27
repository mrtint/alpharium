import {
  createFastCycleResetter,
  resetFastCycleIfDue,
  startFastCycle,
} from "../../src/app/fast-cycle-reset";
import { createLiveWrites } from "../../src/diary/live-write";
import { memoryStore } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import type { CatchUpStorePort } from "../../src/schedule/catch-up-store";
import {
  loadFastCycle,
  serializeFastCycle,
  type FastCyclePort,
} from "../../src/schedule/fast-cycle-store";
import type { NotifiedStorePort } from "../../src/schedule/notified-store";
import type { SkipStorePort } from "../../src/schedule/skip-store";
import { emptyDay } from "../../src/signals/fake";

/**
 * 106 — 주기 리셋 (contracts/cycle-reset.md CR1~CR7).
 *
 * 주기가 바뀌면 오늘의 일기와 딸린 기록만 지운다. 쓰기가 살아 있으면 지우지 않고 쓰기를 끊지 않는다. 던지지 않는다.
 */

const TODAY = "2026-10-26";
const NOW = new Date(2026, 9, 26, 10, 20); // 30분 주기: 순번 20 (10:00~10:30)
const CYCLE_20 = "2026-10-26#20";
const CYCLE_19 = "2026-10-26#19";

const entry = (date: string): DiaryEntry => ({
  date,
  text: `${date}의 일기`,
  character: "quiet",
  signalsUsed: emptyDay(date),
  createdAt: new Date(`${date}T20:00:00`),
});

function memoryFile(initial: string | null) {
  const f = { content: initial, writes: 0, reads: 0 };
  const port = {
    async read() {
      f.reads += 1;
      return f.content;
    },
    async write(serialized: string) {
      f.writes += 1;
      f.content = serialized;
    },
    async remove() {
      f.content = null;
    },
  };
  return { f, port };
}

function make(
  options: {
    fastCycle?: string | null;
    notified?: Record<string, unknown>;
    skipped?: string | null;
    catchUp?: string | null;
    diaries?: string[];
    devEnvironment?: boolean;
  } = {},
) {
  const store = memoryStore();
  const removeDay = jest.spyOn(store, "removeDay");
  const fast = memoryFile(
    options.fastCycle === undefined
      ? serializeFastCycle({ periodMinutes: 30, resetCycle: CYCLE_19 })
      : options.fastCycle,
  );
  const notified = memoryFile(
    options.notified === undefined ? null : JSON.stringify(options.notified),
  );
  const skip = memoryFile(options.skipped === undefined ? null : options.skipped);
  const catchUp = memoryFile(options.catchUp === undefined ? null : options.catchUp);
  const dismissed: string[] = [];
  const liveWrites = createLiveWrites();
  const deps = {
    devEnvironment: options.devEnvironment ?? true,
    fastCyclePort: fast.port as FastCyclePort,
    store,
    notifiedPort: notified.port as NotifiedStorePort,
    skipPort: skip.port as SkipStorePort,
    catchUpPort: catchUp.port as CatchUpStorePort,
    dismiss: async (id: string) => {
      dismissed.push(id);
    },
    liveWrites,
  };
  return { deps, store, removeDay, fast, notified, skip, catchUp, dismissed, liveWrites, options };
}

async function seedDiaries(store: ReturnType<typeof memoryStore>, days: string[]) {
  for (const d of days) await store.save(entry(d));
}

describe("CR1·CR2 — 리셋할 때가 아니면 아무것도 지우지 않는다", () => {
  it("개발 환경이 아니면 기록 통로를 부르지 않고 {reset:false}", async () => {
    const m = make({ devEnvironment: false });
    await seedDiaries(m.store, [TODAY]);
    expect(await resetFastCycleIfDue({ ...m.deps, now: NOW })).toEqual({ reset: false });
    expect(m.fast.f.reads).toBe(0);
    expect(await m.store.has(TODAY)).toBe(true);
  });

  it("빠른 주기 기록이 없으면 {reset:false}", async () => {
    const m = make({ fastCycle: null });
    await seedDiaries(m.store, [TODAY]);
    expect(await resetFastCycleIfDue({ ...m.deps, now: NOW })).toEqual({ reset: false });
    expect(m.removeDay).not.toHaveBeenCalled();
  });

  it("현재 주기가 기록된 마지막 리셋 주기와 같으면 {reset:false} (CR2)", async () => {
    const m = make({ fastCycle: serializeFastCycle({ periodMinutes: 30, resetCycle: CYCLE_20 }) });
    await seedDiaries(m.store, [TODAY]);
    expect(await resetFastCycleIfDue({ ...m.deps, now: NOW })).toEqual({ reset: false });
    expect(m.removeDay).not.toHaveBeenCalled();
    expect(await m.store.has(TODAY)).toBe(true);
  });
});

describe("CR5 — 주기가 바뀌면 오늘만 지운다", () => {
  it("오늘 일기와 딸린 기록을 지우고 resetCycle을 현재 주기로 갱신한다", async () => {
    const m = make({
      notified: {
        [TODAY]: {
          sentAt: "2026-10-26T01:00:00.000Z",
          acknowledged: false,
          notificationId: "n-today",
        },
        "2026-10-25": {
          sentAt: "2026-10-25T01:00:00.000Z",
          acknowledged: true,
          notificationId: "n-old",
        },
      },
      skipped: JSON.stringify({ day: TODAY }),
      catchUp: JSON.stringify({ on: TODAY }),
    });
    await seedDiaries(m.store, [TODAY, "2026-10-25", "2026-10-24"]);

    expect(await resetFastCycleIfDue({ ...m.deps, now: NOW })).toEqual({ reset: true });

    expect(m.removeDay).toHaveBeenCalledTimes(1);
    expect(m.removeDay).toHaveBeenCalledWith(TODAY);
    expect(await m.store.listDays()).toEqual(["2026-10-25", "2026-10-24"]);
    expect(Object.keys(JSON.parse(m.notified.f.content ?? "{}"))).toEqual(["2026-10-25"]);
    expect(m.dismissed).toEqual(["n-today"]);
    expect(m.skip.f.content).toBeNull();
    expect(m.catchUp.f.content).toBeNull();
    expect((await loadFastCycle(m.deps.fastCyclePort))?.resetCycle).toBe(CYCLE_20);
  });

  it("건너뜀·따라잡기 기록이 오늘이 아닌 날이면 건드리지 않는다", async () => {
    const m = make({
      skipped: JSON.stringify({ day: "2026-10-25" }),
      catchUp: JSON.stringify({ on: "2026-10-25" }),
    });
    await resetFastCycleIfDue({ ...m.deps, now: NOW });
    expect(m.skip.f.content).toBe(JSON.stringify({ day: "2026-10-25" }));
    expect(m.catchUp.f.content).toBe(JSON.stringify({ on: "2026-10-25" }));
  });

  it("사진 사본(vision-cache)에 닿지 않는다 — 의존에 사진 통로가 없다", () => {
    const m = make();
    expect(Object.keys(m.deps).sort()).toEqual(
      [
        "catchUpPort",
        "devEnvironment",
        "dismiss",
        "fastCyclePort",
        "liveWrites",
        "notifiedPort",
        "skipPort",
        "store",
      ].sort(),
    );
  });

  it("오늘 일기가 없어도 리셋은 일어난다 (resetCycle 갱신)", async () => {
    const m = make();
    expect(await resetFastCycleIfDue({ ...m.deps, now: NOW })).toEqual({ reset: true });
    expect((await loadFastCycle(m.deps.fastCyclePort))?.resetCycle).toBe(CYCLE_20);
  });

  it("같은 주기에 다시 불러도 한 번만 지운다", async () => {
    const m = make();
    await seedDiaries(m.store, [TODAY]);
    expect(await resetFastCycleIfDue({ ...m.deps, now: NOW })).toEqual({ reset: true });
    await m.store.save(entry(TODAY)); // 이 주기에 새로 쓴 일기
    expect(await resetFastCycleIfDue({ ...m.deps, now: new Date(2026, 9, 26, 10, 25) })).toEqual({
      reset: false,
    });
    expect(await m.store.has(TODAY)).toBe(true);
    expect(m.removeDay).toHaveBeenCalledTimes(1);
  });
});

describe("스펙 Edge Cases — 주기를 바꾸거나 날짜가 바뀐다", () => {
  it("resetCycle이 비어 있으면(기록이 비게 쓰인 경우) 현재 주기와 달라 리셋한다", async () => {
    const m = make({ fastCycle: serializeFastCycle({ periodMinutes: 10, resetCycle: "" }) });
    await seedDiaries(m.store, [TODAY]);
    expect(await resetFastCycleIfDue({ ...m.deps, now: NOW })).toEqual({ reset: true });
    expect(await m.store.has(TODAY)).toBe(false);
    expect((await loadFastCycle(m.deps.fastCyclePort))?.resetCycle).toBe("2026-10-26#62");
  });

  it("자정을 넘으면 새 날의 일기만 지우고 어제 일기는 남긴다 — 순번은 새 날 0부터", async () => {
    const m = make({
      fastCycle: serializeFastCycle({ periodMinutes: 30, resetCycle: "2026-10-25#47" }),
    });
    await seedDiaries(m.store, ["2026-10-25", TODAY]);
    expect(await resetFastCycleIfDue({ ...m.deps, now: new Date(2026, 9, 26, 0, 5) })).toEqual({
      reset: true,
    });
    expect(await m.store.listDays()).toEqual(["2026-10-25"]);
    expect((await loadFastCycle(m.deps.fastCyclePort))?.resetCycle).toBe("2026-10-26#0");
  });
});

describe("코드 리뷰 I3·I4 — 경합: 오래된 기록·꺼짐·주기 변경", () => {
  it("I4 — 낡은 기록을 읽은 판정이 칸을 쥐었을 때 이미 리셋된 주기면 새로 쓴 일기를 또 지우지 않는다", async () => {
    const m = make();
    await seedDiaries(m.store, [TODAY]);
    // 판정 A가 이 주기를 리셋한다
    expect(await resetFastCycleIfDue({ ...m.deps, now: NOW })).toEqual({ reset: true });
    await seedDiaries(m.store, [TODAY]); // 이 주기에 새로 쓴 일기
    // 판정 B는 A가 저장하기 전에 읽은 낡은 기록(#19)을 처음에 본다
    let firstRead = true;
    const staleThenReal: FastCyclePort = {
      read: async () => {
        if (firstRead) {
          firstRead = false;
          return serializeFastCycle({ periodMinutes: 30, resetCycle: CYCLE_19 });
        }
        return m.fast.port.read();
      },
      write: m.fast.port.write,
      remove: m.fast.port.remove,
    };
    expect(
      await resetFastCycleIfDue({ ...m.deps, fastCyclePort: staleThenReal, now: NOW }),
    ).toEqual({ reset: false });
    expect(await m.store.has(TODAY)).toBe(true);
  });

  it("I3 — 지우는 동안 모드가 꺼지면 옛 기록으로 되살리지 않는다", async () => {
    const m = make();
    await seedDiaries(m.store, [TODAY]);
    m.removeDay.mockImplementationOnce(async () => {
      m.fast.f.content = null; // 지우는 사이 개발자가 모드를 껐다
    });
    expect(await resetFastCycleIfDue({ ...m.deps, now: NOW })).toEqual({ reset: false });
    expect(m.fast.f.content).toBeNull();
  });

  it("I3 — 지우는 동안 주기가 바뀌면 옛 주기로 덮지 않는다", async () => {
    const m = make();
    await seedDiaries(m.store, [TODAY]);
    const changed = serializeFastCycle({ periodMinutes: 10, resetCycle: "2026-10-26#62" });
    m.removeDay.mockImplementationOnce(async () => {
      m.fast.f.content = changed;
    });
    expect(await resetFastCycleIfDue({ ...m.deps, now: NOW })).toEqual({ reset: false });
    expect(m.fast.f.content).toBe(changed);
  });

  it("칸을 쥔 사이 모드가 꺼졌으면 아무것도 지우지 않는다", async () => {
    const m = make();
    await seedDiaries(m.store, [TODAY]);
    const original = m.deps.liveWrites.beginWipe.bind(m.deps.liveWrites);
    m.deps.liveWrites.beginWipe = () => {
      const slot = original();
      m.fast.f.content = null; // 칸을 쥐는 순간 꺼짐
      return slot;
    };
    expect(await resetFastCycleIfDue({ ...m.deps, now: NOW })).toEqual({ reset: false });
    expect(await m.store.has(TODAY)).toBe(true);
  });
});

describe("CR3·CR4 — 쓰기가 살아 있으면 지우지 않고 끊지 않는다", () => {
  it("칸에 쓰기가 있으면 {reset:false}이고 쓰기는 끊기지 않는다", async () => {
    const m = make();
    await seedDiaries(m.store, [TODAY]);
    const stop = jest.fn();
    const handle = m.liveWrites.beginWrite({ day: TODAY, owner: "background", stop });
    expect(handle).not.toBeNull();

    expect(await resetFastCycleIfDue({ ...m.deps, now: NOW })).toEqual({ reset: false });

    expect(stop).not.toHaveBeenCalled();
    expect(handle?.isCancelled()).toBe(false);
    expect(m.removeDay).not.toHaveBeenCalled();
    expect(await m.store.has(TODAY)).toBe(true);
    expect((await loadFastCycle(m.deps.fastCyclePort))?.resetCycle).toBe(CYCLE_19);
  });

  it("지우기가 칸을 쥐고 있어도 {reset:false}", async () => {
    const m = make();
    const wipe = m.liveWrites.beginWipe();
    expect(wipe).not.toBeNull();
    expect(await resetFastCycleIfDue({ ...m.deps, now: NOW })).toEqual({ reset: false });
    wipe?.end();
  });

  it("끝나면 칸을 비운다 — 성공·실패 모두 (CR4)", async () => {
    const ok = make();
    await resetFastCycleIfDue({ ...ok.deps, now: NOW });
    expect(ok.liveWrites.current()).toBeNull();

    const failing = make();
    failing.removeDay.mockRejectedValueOnce(new Error("io"));
    await resetFastCycleIfDue({ ...failing.deps, now: NOW });
    expect(failing.liveWrites.current()).toBeNull();
  });
});

describe("CR6·CR7 — 실패해도 던지지 않고 수렴한다", () => {
  it("일기 삭제가 던지면 나머지 기록은 비우되 resetCycle은 갱신하지 않고 {reset:false}", async () => {
    const m = make({
      notified: {
        [TODAY]: {
          sentAt: "2026-10-26T01:00:00.000Z",
          acknowledged: false,
          notificationId: "n-today",
        },
      },
      skipped: JSON.stringify({ day: TODAY }),
      catchUp: JSON.stringify({ on: TODAY }),
    });
    await seedDiaries(m.store, [TODAY]);
    m.removeDay.mockRejectedValueOnce(new Error("io"));

    expect(await resetFastCycleIfDue({ ...m.deps, now: NOW })).toEqual({ reset: false });

    expect(m.skip.f.content).toBeNull();
    expect(m.catchUp.f.content).toBeNull();
    expect((await loadFastCycle(m.deps.fastCyclePort))?.resetCycle).toBe(CYCLE_19);
  });

  it("다음 판정이 다시 시도해 같은 결과로 수렴한다", async () => {
    const m = make();
    await seedDiaries(m.store, [TODAY]);
    m.removeDay.mockRejectedValueOnce(new Error("io"));
    expect(await resetFastCycleIfDue({ ...m.deps, now: NOW })).toEqual({ reset: false });
    expect(await resetFastCycleIfDue({ ...m.deps, now: NOW })).toEqual({ reset: true });
    expect(await m.store.has(TODAY)).toBe(false);
  });

  it("어느 통로가 던져도 밖으로 던지지 않는다", async () => {
    const m = make();
    const broken = {
      ...m.deps,
      notifiedPort: {
        read: () => Promise.reject(new Error("io")),
        write: () => Promise.reject(new Error("io")),
      },
      skipPort: {
        read: () => Promise.reject(new Error("io")),
        write: () => Promise.reject(new Error("io")),
        remove: () => Promise.reject(new Error("io")),
      },
      catchUpPort: {
        read: () => Promise.reject(new Error("io")),
        write: () => Promise.reject(new Error("io")),
        remove: () => Promise.reject(new Error("io")),
      },
      dismiss: () => Promise.reject(new Error("io")),
    };
    await expect(resetFastCycleIfDue({ ...broken, now: NOW })).resolves.toEqual(
      expect.objectContaining({ reset: expect.any(Boolean) }),
    );
  });
});

describe("createFastCycleResetter — 훅에 주는 클로저 (CR8)", () => {
  it("now만 받아 같은 절차를 돈다", async () => {
    const m = make();
    await seedDiaries(m.store, [TODAY]);
    const resetter = createFastCycleResetter(m.deps);
    expect(await resetter(NOW)).toEqual({ reset: true });
    expect(await m.store.has(TODAY)).toBe(false);
  });
});

describe("CR10 — startFastCycle: 켜기", () => {
  it("오늘 일기와 딸린 기록을 지우고 resetCycle을 켠 순간의 주기로 쓴다 (FR-009a)", async () => {
    const m = make({
      fastCycle: null,
      notified: {
        [TODAY]: {
          sentAt: "2026-10-26T01:00:00.000Z",
          acknowledged: false,
          notificationId: "n-today",
        },
      },
      skipped: JSON.stringify({ day: TODAY }),
    });
    await seedDiaries(m.store, [TODAY, "2026-10-25"]);
    expect(await startFastCycle({ ...m.deps, now: NOW, periodMinutes: 30 })).toEqual({ ok: true });
    expect(await m.store.listDays()).toEqual(["2026-10-25"]);
    expect(m.dismissed).toEqual(["n-today"]);
    expect(m.skip.f.content).toBeNull();
    expect(await loadFastCycle(m.deps.fastCyclePort)).toEqual({
      periodMinutes: 30,
      resetCycle: CYCLE_20,
    });
    // 켠 직후 같은 주기에서는 다시 지우지 않는다
    await seedDiaries(m.store, [TODAY]);
    expect(await resetFastCycleIfDue({ ...m.deps, now: NOW })).toEqual({ reset: false });
    expect(await m.store.has(TODAY)).toBe(true);
  });

  it("개발 환경이 아니면 아무것도 하지 않는다", async () => {
    const m = make({ fastCycle: null, devEnvironment: false });
    await seedDiaries(m.store, [TODAY]);
    expect(await startFastCycle({ ...m.deps, now: NOW, periodMinutes: 30 })).toEqual({ ok: false });
    expect(await m.store.has(TODAY)).toBe(true);
    expect(m.fast.f.content).toBeNull();
  });

  it("쓰기가 칸을 쥐고 있으면 지우지 않고 {ok:false}", async () => {
    const m = make({ fastCycle: null });
    await seedDiaries(m.store, [TODAY]);
    m.liveWrites.beginWrite({ day: TODAY, owner: "background" });
    expect(await startFastCycle({ ...m.deps, now: NOW, periodMinutes: 30 })).toEqual({ ok: false });
    expect(await m.store.has(TODAY)).toBe(true);
    expect(m.fast.f.content).toBeNull();
  });

  it("일기 삭제가 실패하면 기록을 쓰지 않고 {ok:false}", async () => {
    const m = make({ fastCycle: null });
    await seedDiaries(m.store, [TODAY]);
    m.removeDay.mockRejectedValueOnce(new Error("io"));
    expect(await startFastCycle({ ...m.deps, now: NOW, periodMinutes: 30 })).toEqual({ ok: false });
    expect(m.fast.f.content).toBeNull();
  });
});
