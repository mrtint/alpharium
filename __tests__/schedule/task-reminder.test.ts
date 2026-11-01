/**
 * 085 — 태스크와 쓸 차례 알림 맞추기.
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md TK1~TK4, CH4
 *       spec.md FR-009·FR-011, research R7·R17
 *
 * `runAutoDiaryTask`는 의존을 주입받는 조합 함수라 기기 없이 검증한다(`task-manual.test.ts`와 같은 조립).
 */

import { runAutoDiaryTask } from "../../src/schedule/task";
import { ledgerPort } from "./attempt-ledger-fixture";

/** 목표 7시, 지금 15시 30분 */
const NOW = new Date(2026, 7, 28, 15, 30, 0, 0);

function make(
  over: {
    run?: jest.Mock;
    manual?: boolean;
    enabled?: boolean;
    reconcile?: () => Promise<void>;
  } = {},
) {
  const order: string[] = [];
  const run = over.run ?? jest.fn().mockResolvedValue({ ok: true, entry: {}, overwrote: false });
  const memory = () => {
    let content: string | null = null;
    return {
      read: async () => content,
      write: async (s: string) => {
        content = s;
      },
    };
  };
  const present = jest.fn(async () => {
    order.push("present");
    return "n";
  });
  const reconcile = jest.fn(
    over.reconcile ??
      (async () => {
        order.push("reconcile");
      }),
  );
  const deps = {
    manual: over.manual,
    now: NOW,
    catchUpPort: { read: async () => null, write: async () => {}, remove: async () => {} },
    attemptPort: ledgerPort(),
    failurePort: memory(),
    skipPort: { read: async () => null, write: async () => {}, remove: async () => {} },
    resolution: { ok: true, environment: "dev" } as never,
    settingsPort: {
      read: async () => JSON.stringify({ enabled: over.enabled ?? true, targetHour: 15 }),
      write: async () => {},
    },
    simulationPort: { read: async () => null, write: async () => {}, remove: async () => {} },
    notifiedPort: { read: async () => null, write: async () => {} },
    notificationPort: {
      ensureChannel: jest.fn(async () => {
        order.push("ensureChannel");
      }),
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
    reconcileReminders: reconcile,
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
      store: { listDays: async () => [] },
    })) as never,
  };
  return { deps, order, present, reconcile, run };
}

describe("TK1·CH4 — 저장에 성공하면 맞추기 → 채널 보장 → 완성 알림", () => {
  it("순서", async () => {
    const { deps, order, reconcile } = make();
    expect(await runAutoDiaryTask(deps)).toBe("ran");
    expect(order).toEqual(["reconcile", "ensureChannel", "present"]);
    expect(reconcile).toHaveBeenCalledTimes(1);
  });
});

describe("TK2 — 맞추기가 실패해도 결과·알림은 그대로다", () => {
  it("ran, present 1번", async () => {
    const { deps, present } = make({
      reconcile: async () => {
        throw new Error("x");
      },
    });
    expect(await runAutoDiaryTask(deps)).toBe("ran");
    expect(present).toHaveBeenCalledTimes(1);
  });
});

describe("TK3 — 끝날 때마다 한 번", () => {
  it("건너뜀(꺼짐)이어도 1번, 알림 없음", async () => {
    const { deps, reconcile, present } = make({ enabled: false });
    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(present).not.toHaveBeenCalled();
  });

  it("파이프라인 실패여도 1번", async () => {
    const { deps, reconcile } = make({
      run: jest.fn().mockResolvedValue({ ok: false, stage: "generate", reason: "x" }),
    });
    expect(await runAutoDiaryTask(deps)).toBe("failed");
    expect(reconcile).toHaveBeenCalledTimes(1);
  });
});

describe("TK4 — 수동 실행도 같다", () => {
  it("manual 성공 — 같은 순서", async () => {
    const { deps, order } = make({ manual: true, enabled: false });
    expect(await runAutoDiaryTask(deps)).toBe("ran");
    expect(order).toEqual(["reconcile", "ensureChannel", "present"]);
  });
});
