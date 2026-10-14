import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { createLiveWrites, type LiveProgress, type WriteHandle } from "../../src/diary/live-write";

/**
 * 살아 있는 쓰기 등록부 계약 테스트 (080).
 *
 * 계약: specs/080-live-write-registry/contracts/live-write.md R1~R10·P8
 *       spec.md FR-001~FR-005·FR-019·SC-006
 *
 * 020 `lock.test.ts`(파일 잠금 + 나이로 낡음 판정)를 대체한다 — 등록부에는 나이도 파일도 없다.
 */

const ROOT = join(__dirname, "..", "..");
const YESTERDAY = "2026-10-12";
const TODAY = "2026-10-13";

/** 주석을 걷는다 — 이 저장소의 주석은 금지어를 설명 안에 정당하게 쓴다(AGENTS) */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function sourceOf(relative: string): string {
  return stripComments(readFileSync(join(ROOT, relative), "utf8"));
}

/** `src/` 아래의 모든 `.ts`·`.tsx` (상대 경로) */
function sourceFiles(directory = "src"): string[] {
  return readdirSync(join(ROOT, directory)).flatMap((name) => {
    const relative = `${directory}/${name}`;
    if (statSync(join(ROOT, relative)).isDirectory()) return sourceFiles(relative);
    return /\.tsx?$/.test(name) ? [relative] : [];
  });
}

/** 마이크로태스크를 비운다 */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe("R1 — 칸은 하나다", () => {
  it("빈 칸에서 쓰기를 차지하면 그 날과 주체가 보인다", () => {
    const registry = createLiveWrites();
    expect(registry.current()).toBeNull();

    const handle = registry.beginWrite({ day: YESTERDAY, owner: "background" });

    expect(handle).not.toBeNull();
    const slot = registry.current();
    expect(slot?.kind).toBe("write");
    if (slot?.kind !== "write") throw new Error("쓰기 칸이 아니다");
    expect(slot.day).toBe(YESTERDAY);
    expect(slot.owner).toBe("background");
  });

  it("쓰기가 든 칸은 다른 쓰기도 지우기도 받지 않는다", () => {
    const registry = createLiveWrites();
    registry.beginWrite({ day: YESTERDAY, owner: "background" });

    expect(registry.beginWrite({ day: TODAY, owner: "screen" })).toBeNull();
    expect(registry.beginWipe()).toBeNull();
  });

  it("지우기가 든 칸은 쓰기도 다른 지우기도 받지 않는다 (FR-001)", () => {
    const registry = createLiveWrites();
    expect(registry.beginWipe()).not.toBeNull();
    expect(registry.current()).toEqual({ kind: "wipe" });

    expect(registry.beginWrite({ day: TODAY, owner: "screen" })).toBeNull();
    expect(registry.beginWipe()).toBeNull();
  });

  it("지우기가 끝나면 칸이 비고 다시 차지할 수 있다", () => {
    const registry = createLiveWrites();
    const wipe = registry.beginWipe();
    wipe?.end();

    expect(registry.current()).toBeNull();
    expect(registry.beginWrite({ day: TODAY, owner: "screen" })).not.toBeNull();
  });
});

describe("FR-002 — 나이로 죽었다고 보지 않는다", () => {
  afterEach(() => jest.useRealTimers());

  // 이 테스트는 **뜻을 적는 자리다** — 등록부는 시계를 읽지 않으므로 시각을 옮겨도 실패할 수 없다(코드 리뷰). 「나이로 판정하는
  // 길이 다시 열리지 않는다」를 실제로 잠그는 것은 아래 R9 소스 계약이다.
  it("11분이 지나도 살아 있는 쓰기는 칸을 쥐고 있다", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-10-13T14:00:00"));
    const registry = createLiveWrites();
    registry.beginWrite({ day: YESTERDAY, owner: "background" });

    jest.setSystemTime(new Date("2026-10-13T14:11:00"));
    jest.advanceTimersByTime(11 * 60 * 1000);

    expect(registry.beginWrite({ day: YESTERDAY, owner: "screen" })).toBeNull();
    expect(registry.current()?.kind).toBe("write");
  });
});

describe("R3·R4 — 끝", () => {
  it("끝나면 칸을 비우고, 끝남을 풀고, 그 뒤에 변화를 알린다", async () => {
    const registry = createLiveWrites();
    const order: string[] = [];
    const handle = registry.beginWrite({ day: YESTERDAY, owner: "background" });
    const slot = registry.current();
    if (slot?.kind !== "write" || handle === null) throw new Error("쓰기 칸이 아니다");
    registry.onChange(() => order.push(`change:${registry.current() === null ? "empty" : "full"}`));
    void slot.done.then((end) => {
      order.push(`done:${registry.current() === null ? "empty" : "full"}:${String(end.ok)}`);
    });

    handle.end({ ok: true });
    // 끝난 그 자리에서 이미 비어 있다 — 끝남을 들은 쪽이 곧바로 차지할 수 있다.
    expect(registry.current()).toBeNull();
    await flush();

    expect(order).toContain("done:empty:true");
    expect(order).toContain("change:empty");
    await expect(slot.done).resolves.toEqual({ ok: true, cancelled: false });
  });

  it("두 번 끝내도 그 사이 새로 차지한 쓰기를 비우지 않는다", () => {
    const registry = createLiveWrites();
    const first = registry.beginWrite({ day: YESTERDAY, owner: "background" });
    first?.end({ ok: false });
    const second = registry.beginWrite({ day: TODAY, owner: "screen" });
    expect(second).not.toBeNull();

    first?.end({ ok: false });

    const slot = registry.current();
    expect(slot?.kind === "write" && slot.day).toBe(TODAY);
  });
});

describe("R5·R6 — 끊기", () => {
  it("그만둠을 세우고 멈춤을 정확히 한 번 부른다", () => {
    const registry = createLiveWrites();
    const stop = jest.fn();
    const handle = registry.beginWrite({ day: YESTERDAY, owner: "background", stop });
    const slot = registry.current();
    if (slot?.kind !== "write" || handle === null) throw new Error("쓰기 칸이 아니다");
    expect(handle.isCancelled()).toBe(false);

    slot.cancel();
    slot.cancel();

    expect(handle.isCancelled()).toBe(true);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("멈춤이 던지거나 거부해도 끊기는 던지지 않는다", async () => {
    const throwing = createLiveWrites();
    throwing.beginWrite({
      day: YESTERDAY,
      owner: "background",
      stop: () => {
        throw new Error("멈춤 실패");
      },
    });
    const first = throwing.current();
    expect(() => first?.kind === "write" && first.cancel()).not.toThrow();

    const rejecting = createLiveWrites();
    rejecting.beginWrite({
      day: YESTERDAY,
      owner: "background",
      stop: () => Promise.reject(new Error("멈춤 거부")),
    });
    const second = rejecting.current();
    expect(() => second?.kind === "write" && second.cancel()).not.toThrow();
    // 거부가 잡히지 않은 채 남으면 여기서 테스트가 죽는다.
    await flush();
  });

  it("멈춤을 주지 않아도 끊을 수 있다", () => {
    const registry = createLiveWrites();
    const handle = registry.beginWrite({ day: YESTERDAY, owner: "screen" });
    const slot = registry.current();

    expect(() => slot?.kind === "write" && slot.cancel()).not.toThrow();
    expect(handle?.isCancelled()).toBe(true);
  });

  it("끝난 쓰기의 끊기는 아무 일도 하지 않는다", () => {
    const registry = createLiveWrites();
    const stop = jest.fn();
    const handle = registry.beginWrite({ day: YESTERDAY, owner: "background", stop });
    const slot = registry.current();
    if (slot?.kind !== "write") throw new Error("쓰기 칸이 아니다");
    handle?.end({ ok: true });

    slot.cancel();

    expect(stop).not.toHaveBeenCalled();
  });

  it("그만둔 뒤 실패로 끝나면 { ok: false, cancelled: true }다", async () => {
    const registry = createLiveWrites();
    const handle = registry.beginWrite({ day: YESTERDAY, owner: "background" });
    const slot = registry.current();
    if (slot?.kind !== "write") throw new Error("쓰기 칸이 아니다");

    slot.cancel();
    handle?.end({ ok: false });

    await expect(slot.done).resolves.toEqual({ ok: false, cancelled: true });
  });

  it("그만둔 뒤에도 저장이 끝났으면 { ok: true, cancelled: true }다 (071)", async () => {
    const registry = createLiveWrites();
    const handle = registry.beginWrite({ day: YESTERDAY, owner: "background" });
    const slot = registry.current();
    if (slot?.kind !== "write") throw new Error("쓰기 칸이 아니다");

    slot.cancel();
    handle?.end({ ok: true });

    await expect(slot.done).resolves.toEqual({ ok: true, cancelled: true });
  });
});

describe("R7 — 단계", () => {
  it("한 번도 싣지 않았으면 없고, 실으면 최근 단계가 보인다", () => {
    const registry = createLiveWrites();
    const handle = registry.beginWrite({ day: YESTERDAY, owner: "background" });
    const slot = registry.current();
    if (slot?.kind !== "write") throw new Error("쓰기 칸이 아니다");
    expect(slot.progress()).toBeNull();

    handle?.publish("signals");
    expect(slot.progress()).toEqual({ stage: "signals" });

    handle?.publish("vision", "many");
    expect(slot.progress()).toEqual({ stage: "vision", branch: "many" });
  });

  it("구독자는 단계를 받고, 끊은 뒤에는 받지 않는다", () => {
    const registry = createLiveWrites();
    const handle = registry.beginWrite({ day: YESTERDAY, owner: "background" });
    const slot = registry.current();
    if (slot?.kind !== "write") throw new Error("쓰기 칸이 아니다");
    const seen: LiveProgress[] = [];
    const unsubscribe = slot.onProgress((progress) => seen.push(progress));

    handle?.publish("load", "cold");
    unsubscribe();
    handle?.publish("generation");

    expect(seen).toEqual([{ stage: "load", branch: "cold" }]);
  });

  it("던지는 구독자가 있어도 싣는 쪽은 던지지 않고 다른 구독자는 받는다", () => {
    const registry = createLiveWrites();
    const handle = registry.beginWrite({ day: YESTERDAY, owner: "background" });
    const slot = registry.current();
    if (slot?.kind !== "write") throw new Error("쓰기 칸이 아니다");
    const seen: LiveProgress[] = [];
    slot.onProgress(() => {
      throw new Error("구독자 실패");
    });
    slot.onProgress((progress) => seen.push(progress));

    expect(() => handle?.publish("generation")).not.toThrow();
    expect(seen).toEqual([{ stage: "generation" }]);
  });
});

describe("R8 — 변화 구독", () => {
  it("차지와 비움마다 한 번씩 불리고, 끊으면 불리지 않는다", async () => {
    const registry = createLiveWrites();
    const listener = jest.fn();
    const unsubscribe = registry.onChange(listener);

    const handle = registry.beginWrite({ day: YESTERDAY, owner: "background" });
    await flush();
    expect(listener).toHaveBeenCalledTimes(1);

    handle?.end({ ok: true });
    await flush();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    registry.beginWipe()?.end();
    await flush();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("던지는 구독자가 차지와 비움을 막지 않는다", async () => {
    const registry = createLiveWrites();
    registry.onChange(() => {
      throw new Error("구독자 실패");
    });

    const handle = registry.beginWrite({ day: YESTERDAY, owner: "background" });
    expect(handle).not.toBeNull();
    expect(() => handle?.end({ ok: true })).not.toThrow();
    await flush();
    expect(registry.current()).toBeNull();
  });
});

describe("020 L9 대체 — 어느 시점에도 둘이 함께 차지하지 않는다", () => {
  it("두 호출자가 무작위 순서로 100번 차지·비움을 섞어도 살아 있는 손잡이는 하나 이하다", () => {
    const registry = createLiveWrites();
    // 시드 고정 선형 합동 난수 — 실패하면 같은 순서로 다시 돈다.
    let seed = 20261013;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const held: (WriteHandle | null)[] = [null, null];
    let granted = 0;

    for (let step = 0; step < 100; step += 1) {
      const who = next() < 0.5 ? 0 : 1;
      const mine = held[who];
      if (mine === null) {
        const handle = registry.beginWrite({
          day: YESTERDAY,
          owner: who === 0 ? "screen" : "background",
        });
        held[who] = handle;
        if (handle !== null) granted += 1;
      } else if (next() < 0.6) {
        mine.end({ ok: true });
        held[who] = null;
      }

      const alive = held.filter((handle) => handle !== null).length;
      expect(alive).toBeLessThanOrEqual(1);
      expect(registry.current() === null).toBe(alive === 0);
    }

    // 실제로 여러 번 주고받았다 — 한 번도 안 준 채로 통과한 것이 아니다.
    expect(granted).toBeGreaterThan(5);
  });
});

describe("R2·R9·R10 — 소스 계약", () => {
  it("등록부는 시각·타이머·파일·기기를 읽지 않고, 차지에 비동기 경계가 없다", () => {
    const code = sourceOf("src/diary/live-write.ts");

    // 치환이 조용히 빗나가지 않게 — 읽은 것이 진짜 그 파일인지 먼저 본다.
    expect(code).toMatch(/export function createLiveWrites/);

    for (const forbidden of [
      /\bDate\b/,
      /setTimeout/,
      /setInterval/,
      /expo-/,
      /react-native/,
      /require\(/,
      /\bawait\b/,
    ]) {
      expect(code).not.toMatch(forbidden);
    }
  });

  it("화면에 닿는 값에 시각·소요 시간·모델·토큰이 없다 (FR-019)", () => {
    const code = sourceOf("src/diary/live-write.ts");

    for (const forbidden of [
      /acquiredAt/,
      /startedAt/,
      /elapsed/i,
      /durationMs/,
      /model/i,
      /token/i,
    ]) {
      expect(code).not.toMatch(forbidden);
    }
  });

  it("앱이 쓰는 등록부는 하나다 — 만드는 자리가 등록부 파일뿐이다", () => {
    const callers = [...sourceFiles(), "App.tsx"].filter((file) =>
      /createLiveWrites\(/.test(sourceOf(file)),
    );

    expect(callers).toEqual(["src/diary/live-write.ts"]);
    expect(sourceOf("src/diary/live-write.ts")).toMatch(
      /export const liveWrites(?::\s*LiveWrites)?\s*=\s*createLiveWrites\(\)/,
    );
  });
});

describe("P8 — 잠금 파일·낡음 시간·시작 시 청소가 제품에 없다 (SC-006)", () => {
  const FORBIDDEN = [
    "STALE_LOCK_MS",
    "diary-generation.lock",
    "clearStaleLocksOnStart",
    "lock-port",
    "schedule/lock",
    "acquireLock",
    "LockPort",
  ];

  it("src/와 App.tsx에 잠금의 흔적이 0건이다", () => {
    const hits = [...sourceFiles(), "App.tsx"].flatMap((file) => {
      const code = sourceOf(file);
      return FORBIDDEN.filter((word) => code.includes(word)).map((word) => `${file}: ${word}`);
    });

    expect(hits).toEqual([]);
  });

  it("잠금 파일 둘이 없다", () => {
    expect(existsSync(join(ROOT, "src/schedule/lock.ts"))).toBe(false);
    expect(existsSync(join(ROOT, "src/schedule/lock-port.ts"))).toBe(false);
  });

  it("이 테스트가 읽는 자리가 실제로 있다", () => {
    expect(existsSync(join(ROOT, "App.tsx"))).toBe(true);
    expect(sourceFiles().length).toBeGreaterThan(50);
  });
});
