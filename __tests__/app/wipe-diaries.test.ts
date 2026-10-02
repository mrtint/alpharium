/**
 * 058 — 일기 모두 지우기 조합 (`wipeDiaries`).
 *
 * 계약: specs/058-settings-this-phone/contracts/this-phone.md WP1~WP8, research R2·R3
 *
 * 호출 순서를 배열 하나에 기록하는 대역들로 순서를 본다 — 잠금이 먼저(FR-016), 일기가 사진 사본보다 먼저(반쪽 상태 방지),
 * 알림 기록은 그 뒤, 트레이 거두기는 맨 끝이고 실패해도 결과를 바꾸지 않는다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { wipeDiaries, type WipeDeps } from "../../src/app/wipe-diaries";
import type { LockRecord } from "../../src/schedule/lock";

const NOW = Date.UTC(2026, 9, 2, 12, 0, 0);

type Options = {
  lock?: LockRecord | null;
  removeAllThrows?: boolean;
  dismissThrows?: boolean;
  notified?: string | null;
};

function harness(options: Options = {}) {
  const calls: string[] = [];
  let lockRecord: LockRecord | null = options.lock ?? null;
  let notified: string | null =
    options.notified !== undefined
      ? options.notified
      : JSON.stringify({
          "2026-09-30": {
            sentAt: "2026-09-30T22:10:00.000Z",
            acknowledged: true,
            notificationId: "id1",
          },
          "2026-10-01": {
            sentAt: "2026-10-01T22:10:00.000Z",
            acknowledged: false,
            notificationId: "id2",
          },
        });
  const deps: WipeDeps = {
    store: {
      async removeAll() {
        calls.push("removeAll");
        if (options.removeAllThrows === true) throw new Error("일기를 못 지움");
      },
    },
    async clearPhotoCopies() {
      calls.push("clearPhotoCopies");
    },
    notifiedPort: {
      async read() {
        calls.push("notified.read");
        return notified;
      },
      async write(serialized) {
        calls.push(`notified.write ${serialized}`);
        notified = serialized;
      },
    },
    async dismiss(id) {
      calls.push(`dismiss ${id}`);
      if (options.dismissThrows === true) throw new Error("못 거둠");
    },
    lockPort: {
      async read() {
        calls.push("lock.read");
        return lockRecord;
      },
      async write(record) {
        calls.push("lock.write");
        lockRecord = record;
      },
      async clear() {
        calls.push("lock.clear");
        lockRecord = null;
      },
    },
    nowMs: NOW,
  };
  return { deps, calls, lock: () => lockRecord, notified: () => notified };
}

describe("WP1 — 잠금을 못 얻으면 아무것도 건드리지 않는다", () => {
  it("★ 지금 쓰는 백그라운드 잠금 → busy, 지우기 호출 0회", async () => {
    const h = harness({ lock: { owner: "background", acquiredAtMs: NOW - 30_000 } });
    expect(await wipeDiaries(h.deps)).toEqual({ kind: "busy" });
    expect(h.calls).toEqual(["lock.read"]);
    expect(h.lock()).toEqual({ owner: "background", acquiredAtMs: NOW - 30_000 });
  });
});

describe("WP2·WP3 — 순서", () => {
  it("★ 잠금 → 알림 기록 읽기 → 일기 → 사진 사본 → 알림 기록 비우기 → 거두기 → 잠금 놓기", async () => {
    const h = harness();
    expect(await wipeDiaries(h.deps)).toEqual({ kind: "wiped" });
    expect(h.calls).toEqual([
      "lock.read",
      "lock.write",
      "notified.read",
      "removeAll",
      "clearPhotoCopies",
      "notified.write {}",
      "dismiss id1",
      "dismiss id2",
      "lock.read",
      "lock.clear",
    ]);
    expect(h.lock()).toBeNull();
    expect(h.notified()).toBe("{}");
  });

  it("알림 기록이 없으면 거두지 않는다", async () => {
    const h = harness({ notified: null });
    expect(await wipeDiaries(h.deps)).toEqual({ kind: "wiped" });
    expect(h.calls.filter((c) => c.startsWith("dismiss"))).toEqual([]);
  });
});

describe("WP4·WP5 — 실패", () => {
  it("★ WP4 — 일기 지우기가 던져도 나머지와 잠금 놓기를 하고 failed다", async () => {
    const h = harness({ removeAllThrows: true });
    const outcome = await wipeDiaries(h.deps);
    expect(outcome.kind).toBe("failed");
    expect(h.calls).toEqual(
      expect.arrayContaining([
        "clearPhotoCopies",
        "notified.write {}",
        "dismiss id1",
        "lock.clear",
      ]),
    );
    expect(h.lock()).toBeNull();
  });

  it("WP5 — 거두기가 던져도 wiped다", async () => {
    const h = harness({ dismissThrows: true });
    expect(await wipeDiaries(h.deps)).toEqual({ kind: "wiped" });
    expect(h.lock()).toBeNull();
  });
});

describe("WP6 — 잠금 규칙은 020 그대로", () => {
  it("owner는 screen이고, 6분이 지난 잠금은 얻는다", async () => {
    const h = harness({ lock: { owner: "background", acquiredAtMs: NOW - 7 * 60 * 1000 } });
    expect(await wipeDiaries(h.deps)).toEqual({ kind: "wiped" });
    expect(h.calls.slice(0, 2)).toEqual(["lock.read", "lock.write"]);
  });

  it("쓴 잠금의 owner는 screen이다", async () => {
    const h = harness();
    const writes: LockRecord[] = [];
    const write = h.deps.lockPort.write.bind(h.deps.lockPort);
    h.deps.lockPort.write = async (record) => {
      writes.push(record);
      await write(record);
    };
    await wipeDiaries(h.deps);
    expect(writes).toEqual([{ owner: "screen", acquiredAtMs: NOW }]);
  });
});

describe("WP6·WP7·WP8 — 소스 계약", () => {
  const source = readFileSync(join(__dirname, "../../src/app/wipe-diaries.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("WP6 — 잠금 판정을 다시 두지 않는다(숫자 없음, schedule/lock에서 가져온다)", () => {
    expect(source).not.toMatch(/STALE_LOCK_MS|360000|360_000|6 \* 60/);
    expect(source).toMatch(
      /import \{[^}]*acquireLock[^}]*releaseLock[^}]*\} from "\.\.\/schedule\/lock"/,
    );
  });

  it("WP7 — 시각을 스스로 읽지 않는다(nowMs는 인자)", () => {
    expect(source).not.toMatch(/Date\.now|new Date/);
  });

  it("WP8 — 남는 기록의 통로를 import하지 않는다", () => {
    for (const banned of [
      /skip-store/,
      /auto-diary/,
      /schedule\/settings/,
      /geocoding/,
      /onboarding/,
      /character-names/,
      /custom-names/,
    ]) {
      expect(source).not.toMatch(banned);
    }
  });
});
