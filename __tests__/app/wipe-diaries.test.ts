/**
 * 058 — 일기 모두 지우기 조합 (`wipeDiaries`).
 *
 * 계약: specs/058-settings-this-phone/contracts/this-phone.md WP1~WP8, research R2·R3
 *
 * 호출 순서를 배열 하나에 기록하는 대역들로 순서를 본다 — 칸을 차지하는 것이 먼저(FR-016), 일기가 사진 사본보다 먼저(반쪽
 * 상태 방지), 알림 기록은 그 뒤, 트레이 거두기는 맨 끝이고 실패해도 결과를 바꾸지 않는다.
 *
 * 080 — 쓰기 잠금 파일(020) 대신 살아 있는 쓰기 등록부의 칸을 차지한다
 * (specs/080-live-write-registry/contracts/live-write.md W1~W4). 등록부는 진짜를 쓴다(`createLiveWrites()`).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { wipeDiaries, type WipeDeps } from "../../src/app/wipe-diaries";
import { createLiveWrites } from "../../src/diary/live-write";

type Options = {
  removeAllThrows?: boolean;
  dismissThrows?: boolean;
  notified?: string | null;
};

function harness(options: Options = {}) {
  const calls: string[] = [];
  const registry = createLiveWrites();
  /** 지우는 동안 칸에 무엇이 들었는가 — `removeAll`이 불린 순간에 적는다 */
  const slotDuring: (string | null)[] = [];
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
        slotDuring.push(registry.current()?.kind ?? null);
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
    liveWrites: registry,
  };
  return { deps, calls, registry, slotDuring, notified: () => notified };
}

describe("WP1 — 칸을 차지하지 못하면 아무것도 건드리지 않는다 (080 W3)", () => {
  it("★ 다른 지우기가 칸을 쥐고 있으면 busy, 지우기 호출 0회", async () => {
    const h = harness();
    h.registry.beginWipe();

    expect(await wipeDiaries(h.deps)).toEqual({ kind: "busy" });
    expect(h.calls).toEqual([]);
    expect(h.registry.current()).toEqual({ kind: "wipe" });
  });
});

/**
 * 080 W2 — 누가 시작했든 살아 있는 쓰기를 멈추고, 끝난 뒤에 지운다 (spec FR-018, speckit-clarify).
 *
 * 058은 홈이 시작한 쓰기만 멈추고(부르는 쪽의 `stopHome`) 백그라운드의 쓰기에는 「쓰는 중」이라고만 알렸다. 이제 칸에 남은
 * 쓰기 — 정의상 남의 쓰기 — 를 칸에서 받은 `cancel()`로 끊고 끝을 기다린다. 기다리지 않고 지우면 지운 뒤에 그 쓰기가 저장한다.
 */
describe("080 W2 — 살아 있는 쓰기를 끊고 끝난 뒤에 지운다", () => {
  it("★ 끊고, 그 쓰기가 끝나기 전에는 아무것도 지우지 않는다", async () => {
    const h = harness();
    const stop = jest.fn(() => {
      h.calls.push("stop");
    });
    const write = h.registry.beginWrite({ day: "2026-10-02", owner: "background", stop });
    if (write === null) throw new Error("칸이 이미 차 있다");

    const wiping = wipeDiaries(h.deps);
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(stop).toHaveBeenCalledTimes(1);
    expect(write.isCancelled()).toBe(true);
    // 그 쓰기가 아직 돈다(모델을 내리는 중이다) — 지우기는 기다린다.
    expect(h.calls).toEqual(["stop"]);

    h.calls.push("write.end");
    write.end({ ok: false });

    expect(await wiping).toEqual({ kind: "wiped" });
    expect(h.calls).toEqual([
      "stop",
      "write.end",
      "notified.read",
      "removeAll",
      "clearPhotoCopies",
      "notified.write {}",
      "dismiss id1",
      "dismiss id2",
    ]);
    expect(h.slotDuring).toEqual(["wipe"]);
    expect(h.registry.current()).toBeNull();
  });

  it("끊은 쓰기가 끝난 틈에 다른 쓰기가 칸을 차지하면 지우지 않고 busy다 (W3)", async () => {
    const h = harness();
    const write = h.registry.beginWrite({ day: "2026-10-02", owner: "background" });
    const slot = h.registry.current();
    if (write === null || slot?.kind !== "write") throw new Error("쓰기 칸이 아니다");
    // 끝남을 지우기보다 먼저 들은 쪽이 칸을 차지한다(지우기의 기다림보다 앞서 등록한 구독).
    void slot.done.then(() => {
      h.registry.beginWrite({ day: "2026-10-01", owner: "screen" });
    });

    const wiping = wipeDiaries(h.deps);
    write.end({ ok: false });

    expect(await wiping).toEqual({ kind: "busy" });
    expect(h.calls).toEqual([]);
    const now = h.registry.current();
    expect(now?.kind === "write" && now.day).toBe("2026-10-01");
  });

  it("칸에 든 것이 지우기면 끊지도 기다리지도 않고 busy다", async () => {
    const h = harness();
    h.registry.beginWipe();

    expect(await wipeDiaries(h.deps)).toEqual({ kind: "busy" });
    expect(h.calls).toEqual([]);
  });
});

describe("WP2·WP3 — 순서", () => {
  it("★ 칸 차지 → 알림 기록 읽기 → 일기 → 사진 사본 → 알림 기록 비우기 → 거두기 → 칸 비움", async () => {
    const h = harness();
    expect(await wipeDiaries(h.deps)).toEqual({ kind: "wiped" });
    expect(h.calls).toEqual([
      "notified.read",
      "removeAll",
      "clearPhotoCopies",
      "notified.write {}",
      "dismiss id1",
      "dismiss id2",
    ]);
    // 지우는 동안 칸은 지우기가 쥐고 있었고(그 사이 쓰기가 시작되지 못한다 — FR-001), 끝나면 빈다.
    expect(h.slotDuring).toEqual(["wipe"]);
    expect(h.registry.current()).toBeNull();
    expect(h.notified()).toBe("{}");
  });

  it("지우는 동안에는 쓰기가 칸을 차지하지 못한다", async () => {
    const h = harness();
    let blocked: unknown = "안 불림";
    const removeAll = h.deps.store.removeAll.bind(h.deps.store);
    h.deps.store.removeAll = async () => {
      blocked = h.registry.beginWrite({ day: "2026-10-02", owner: "background" });
      await removeAll();
    };

    await wipeDiaries(h.deps);

    expect(blocked).toBeNull();
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
      expect.arrayContaining(["clearPhotoCopies", "notified.write {}", "dismiss id1"]),
    );
    expect(h.registry.current()).toBeNull();
  });

  it("WP5 — 거두기가 던져도 wiped다", async () => {
    const h = harness({ dismissThrows: true });
    expect(await wipeDiaries(h.deps)).toEqual({ kind: "wiped" });
    expect(h.registry.current()).toBeNull();
  });
});

describe("WP6·WP7·WP8 — 소스 계약", () => {
  const source = readFileSync(join(__dirname, "../../src/app/wipe-diaries.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("WP6 — 나이로 판정하지 않는다(숫자·잠금 파일 없음, 등록부의 타입만 가져온다) (080 W1)", () => {
    expect(source).toMatch(/liveWrites/);
    expect(source).not.toMatch(/STALE_LOCK_MS|360000|360_000|6 \* 60|600000|600_000|10 \* 60/);
    expect(source).not.toMatch(/schedule\/lock|lockPort|nowMs/);
    expect(source).toMatch(/import type \{[^}]*LiveWrites[^}]*\} from "\.\.\/diary\/live-write"/);
  });

  it("WP7 — 시각을 읽지 않는다", () => {
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
