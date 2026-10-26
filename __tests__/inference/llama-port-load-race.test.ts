/**
 * 106 — `load()` 동시 호출 경합 (contracts/engine-load.md LD1~LD5, 080 잔여 ①).
 *
 * 앱 열기 쓰기·백그라운드·진단 수동 실행이 거의 동시에 같은 엔진의 `load()`를 부르면, 둘 다 `context === null`을 보고 네이티브 적재를 둘 다
 * 불러 GB 단위 모델이 둘 열렸다(E1 위반). `load()`는 도착 순서대로 하나씩 처리된다 — 같은 캐릭터면 앞 호출이 연 것을 재사용하고, 다른
 * 캐릭터면 앞의 적재가 끝난 뒤 닫고 연다. 앞 호출이 실패해도 대기열은 막히지 않는다. `unload()`는 대기열을 거치지 않는다.
 */

import { createLlamaEngine } from "../../src/inference/llama-port";
import type { Character } from "../../src/diary/types";
import { FUTURE_CHARACTER } from "../future-character";

const pathFor = async (character: Character) => `/models/${character}.bin`;

/** 손으로 여는 문 */
function gate() {
  let open!: () => void;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open };
}

/** 적재를 문으로 붙잡는 대역 — 동시에 진행 중인 적재 수와 동시에 열린 컨텍스트 수를 센다 */
function heldLoader(gates: { promise: Promise<void> }[], failOn: number[] = []) {
  const state = {
    called: 0,
    inProgress: 0,
    maxInProgress: 0,
    live: 0,
    maxLive: 0,
    released: 0,
    events: [] as string[],
  };
  const loader = async (path: string) => {
    const n = state.called;
    state.called += 1;
    state.inProgress += 1;
    state.maxInProgress = Math.max(state.maxInProgress, state.inProgress);
    state.events.push(`load:${path}`);
    await gates[n]?.promise;
    state.inProgress -= 1;
    if (failOn.includes(n)) throw new Error("native load failed");
    state.live += 1;
    state.maxLive = Math.max(state.maxLive, state.live);
    return {
      async completion() {
        return { content: "글", stopped_eos: true };
      },
      async stopCompletion() {},
      async release() {
        state.live -= 1;
        state.released += 1;
        state.events.push(`release:${path}`);
      },
    };
  };
  return { state, loader };
}

describe("LD2 — 같은 캐릭터 동시 load는 네이티브 적재 한 번", () => {
  it("둘 다 성공하고 첫째는 warm:false, 둘째는 재사용(warm:true)이다", async () => {
    const g = gate();
    const { state, loader } = heldLoader([g]);
    const engine = createLlamaEngine(loader, pathFor);

    const a = engine.load("quiet");
    const b = engine.load("quiet");
    g.open();

    expect(await a).toEqual({ ok: true, warm: false });
    expect(await b).toEqual({ ok: true, warm: true });
    expect(state.called).toBe(1);
    expect(state.maxLive).toBe(1);
  });
});

describe("LD3 — 다른 캐릭터가 뒤따르면 앞 적재가 끝난 뒤 닫고 연다", () => {
  it("적재가 동시에 둘 진행되지 않고, 열린 컨텍스트는 어느 순간에도 최대 하나다", async () => {
    const g1 = gate();
    const g2 = gate();
    const { state, loader } = heldLoader([g1, g2]);
    const engine = createLlamaEngine(loader, pathFor);

    const first = engine.load("quiet");
    const second = engine.load(FUTURE_CHARACTER);
    // 앞 적재가 끝나기 전에는 둘째 적재가 시작되지 않는다
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(state.called).toBe(1);

    g1.open();
    await first;
    g2.open();
    await second;

    expect(state.maxInProgress).toBe(1);
    expect(state.maxLive).toBe(1);
    // 앞 것이 닫힌 뒤에 둘째가 열렸다
    expect(state.events).toEqual([
      "load:/models/quiet.bin",
      "release:/models/quiet.bin",
      `load:/models/${FUTURE_CHARACTER}.bin`,
    ]);
  });
});

describe("LD4 — 앞 호출이 실패해도 뒤따른 호출은 새로 시도한다", () => {
  it("앞 적재가 실패하면 그 호출은 load-failed, 뒤 호출은 loader를 다시 불러 성공한다", async () => {
    const g1 = gate();
    const g2 = gate();
    const { state, loader } = heldLoader([g1, g2], [0]);
    const engine = createLlamaEngine(loader, pathFor);

    const first = engine.load("quiet");
    const second = engine.load("quiet");
    g1.open();
    expect(await first).toEqual({ ok: false, reason: "load-failed" });
    g2.open();
    expect(await second).toEqual({ ok: true, warm: false });
    expect(state.called).toBe(2);
  });

  it("경로를 못 찾은 앞 호출도 대기열을 막지 않는다", async () => {
    let calls = 0;
    const resolvePath = async () => {
      calls += 1;
      if (calls === 1) throw new Error("no path");
      return "/models/quiet.bin";
    };
    const { state, loader } = heldLoader([]);
    const engine = createLlamaEngine(loader, resolvePath);

    const [first, second] = await Promise.all([engine.load("quiet"), engine.load("quiet")]);
    expect(first).toEqual({ ok: false, reason: "not-found" });
    expect(second).toEqual({ ok: true, warm: false });
    expect(state.called).toBe(1);
  });
});

describe("LD5 — unload는 대기열을 거치지 않는다", () => {
  it("진행 중인 적재가 있어도 unload()는 그 적재를 기다리지 않고 돌아온다", async () => {
    const g = gate();
    const { loader } = heldLoader([g]);
    const engine = createLlamaEngine(loader, pathFor);

    const pending = engine.load("quiet");
    await expect(engine.unload()).resolves.toBeUndefined();
    g.open();
    expect(await pending).toEqual({ ok: true, warm: false });
  });
});

describe("LD6 — 대기 중인 load()가 그 사이 온 멈춤을 지우지 않는다 (092 FR-010, 106 수렴)", () => {
  it("앞 적재를 기다리는 동안 온 stop()은 적재가 끝난 뒤 시작하는 쓰기를 멈춘다", async () => {
    const g = gate();
    const completion = jest.fn(async () => ({ text: "글", stopped_eos: true, stopped_limit: 0 }));
    const context = {
      completion,
      formatChat: jest.fn(async () => ({ prompt: "<서식>", stops: [] as string[] })),
      stopCompletion: jest.fn(async () => {}),
      release: jest.fn(async () => {}),
    };
    const engine = createLlamaEngine(
      async () => {
        await g.promise;
        return context;
      },
      pathFor,
      { pacing: { pauseRatio: 0, chunkTokens: 32 } },
    );

    const first = engine.load("quiet");
    const second = engine.load("quiet"); // 앞 적재를 기다린다
    await engine.stop(); // 그 쓰기를 그만둔다 — 아직 적재 중이다
    g.open();
    await first;
    await second;

    const result = await engine.run("프롬프트", { timeoutMs: 1000 });
    // 멈춤이 살아 있다 — 조각 경계에서 interrupted로 끝나고 한 조각도 생성하지 않는다
    expect(result.ending).toEqual({ kind: "interrupted" });
    expect(completion).not.toHaveBeenCalled();
  });

  it("앞 쓰기의 멈춤은 다음 쓰기의 load() 호출이 비운다 (종전과 같다)", async () => {
    const completion = jest.fn(async () => ({ text: "글", stopped_eos: true, stopped_limit: 0 }));
    const context = {
      completion,
      formatChat: jest.fn(async () => ({ prompt: "<서식>", stops: [] as string[] })),
      stopCompletion: jest.fn(async () => {}),
      release: jest.fn(async () => {}),
    };
    const engine = createLlamaEngine(async () => context, pathFor, {
      pacing: { pauseRatio: 0, chunkTokens: 32 },
    });
    await engine.load("quiet");
    await engine.stop(); // 앞 쓰기의 멈춤
    await engine.load("quiet"); // 다음 쓰기의 시작 — 비운다
    const result = await engine.run("프롬프트", { timeoutMs: 1000 });
    expect(result.ending).toEqual({ kind: "eos" });
    expect(completion).toHaveBeenCalled();
  });
});
