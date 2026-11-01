/**
 * 106 — 백그라운드 태스크의 빠른 주기 테스트 공용 대역 (`task-fast-cycle`·`fast-cycle-prod-guard`).
 *
 * `runAutoDiaryTask`의 의존을 전부 메모리 대역으로 채운다. 일기 목록 읽기·일기 삭제 순서는 `log`에 남는다.
 */

import { createLiveWrites } from "../../src/diary/live-write";
import { memoryStore } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import { serializeFastCycle } from "../../src/schedule/fast-cycle-store";
import { emptyDay } from "../../src/signals/fake";
import { ledgerPort } from "./attempt-ledger-fixture";

/** 2026-10-26 10:05 — 30분 주기 순번 20(10:00~10:30), 창 [10:00, 10:15) 안 */
export const IN_WINDOW = new Date(2026, 9, 26, 10, 5, 0, 0);
/** 15:50 — 순번 31(15:30~16:00)의 창 [15:30, 15:45) 밖 */
export const OUT_OF_WINDOW = new Date(2026, 9, 26, 15, 50, 0, 0);
export const TODAY = "2026-10-26";

export const entry = (date: string): DiaryEntry => ({
  date,
  text: `${date}의 일기`,
  character: "quiet",
  signalsUsed: emptyDay(date),
  createdAt: new Date(`${date}T20:00:00`),
});

export function make(
  over: {
    environment?: "dev" | "prod";
    enabled?: boolean;
    now?: Date;
    manual?: boolean;
    fastCycle?: string | null;
    targetHour?: number;
  } = {},
) {
  const log: string[] = [];
  const store = memoryStore();
  const removeDay = store.removeDay.bind(store);
  store.removeDay = async (day) => {
    log.push(`removeDay:${day}`);
    return removeDay(day);
  };
  const fast = {
    content:
      over.fastCycle === undefined
        ? serializeFastCycle({ periodMinutes: 30, resetCycle: "2026-10-26#19" })
        : over.fastCycle,
    reads: 0,
  };
  const run = jest.fn().mockResolvedValue({ ok: true, entry: {}, overwrote: false });
  let reconciles = 0;
  const attempts = ledgerPort();
  const deps = {
    manual: over.manual,
    now: over.now ?? IN_WINDOW,
    resolution: { ok: true, environment: over.environment ?? "dev" } as never,
    fastCyclePort: {
      read: async () => {
        fast.reads += 1;
        return fast.content;
      },
      write: async (s: string) => {
        fast.content = s;
      },
      remove: async () => {
        fast.content = null;
      },
    },
    liveWrites: createLiveWrites(),
    catchUpPort: { read: async () => null, write: async () => {}, remove: async () => {} },
    skipPort: { read: async () => null, write: async () => {}, remove: async () => {} },
    reconcileReminders: async () => {
      reconciles += 1;
    },
    attemptPort: attempts,
    failurePort: { read: async () => null, write: async () => {} },
    settingsPort: {
      read: async () =>
        JSON.stringify({ enabled: over.enabled ?? true, targetHour: over.targetHour ?? 7 }),
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
    listDiaryDays: async () => {
      log.push("listDiaryDays");
      return store.listDays();
    },
    loadCharacter: async () => "quiet" as const,
    loadNames: async () => ({}),
    makePipeline: (() => ({
      ok: true,
      pipeline: { run },
      location: "on-device",
      previewDay: async (day: string) => ({
        day,
        photos: { kind: "known", count: 3 },
        places: { kind: "unknown" },
        photoAccess: "ok",
      }),
      store,
    })) as never,
  };
  return { deps, run, log, store, fast, reconciles: () => reconciles };
}
