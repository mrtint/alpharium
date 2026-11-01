/**
 * 108 — 정상 동작 확인 단축(G2 · F1). 계약: specs/108-liveness-token-cap/spec.md FR-001~FR-005.
 *
 * 확인은 「안녕?」의 답을 확인 전용 상한(`LIVENESS_MAX_TOKENS`)에서 끊는다. 그 상한은 이번 호출에만 걸린다 —
 * 일기 본문·제목·iOS 조각 생성은 `SAMPLING.n_predict` 그대로여야 한다(원칙 I). 짧게 끊긴 생성도 079의 해제 순서를 지킨다.
 */

import type { Character, DiaryRequest } from "../../src/diary/types";
import type { GenerationEngine, RunLimits } from "../../src/inference/engine-port";
import { createLlamaEngine } from "../../src/inference/llama-port";
import { createOnDeviceBackend, type VisionSupport } from "../../src/inference/on-device";
import { SAMPLING } from "../../src/inference/sampling";
import { emptyDay } from "../../src/signals/fake";
import { LIVENESS_INPUT, LIVENESS_MAX_TOKENS } from "../../src/welcome/liveness";

const pathFor = async (character: Character) => `/models/${character}.bin`;

/** 매 호출의 인자를 남기는 대역. `eos`가 아니면 길이로 끝난 것처럼 돌려준다 */
function recordingContext(reply: { text: string; eos: boolean } = { text: "안녕", eos: false }) {
  const calls: Record<string, unknown>[] = [];
  const context = {
    completion: jest.fn(async (params: Record<string, unknown>) => {
      calls.push(params);
      return {
        text: reply.text,
        content: reply.text,
        stopped_eos: reply.eos,
        stopped_limit: reply.eos ? 0 : 1,
        timings: { predicted_ms: 1 },
        tokens_predicted: 16,
      };
    }),
    formatChat: jest.fn(async () => ({
      prompt: "<|user|>안녕?<|assistant|>",
      stops: [] as string[],
    })),
    stopCompletion: jest.fn(async () => {}),
    release: jest.fn(async () => {}),
  };
  return { context, calls };
}

describe("확인 전용 상한 값 (FR-001)", () => {
  it("16토큰이다 — 사람이 정한 값(소유자, 2026-10-31), 일기 상한보다 작다", () => {
    expect(LIVENESS_MAX_TOKENS).toBe(16);
    expect(LIVENESS_MAX_TOKENS).toBeLessThan(SAMPLING.n_predict);
  });

  it("일기 샘플링 정본은 그대로다 (FR-002, 원칙 I)", () => {
    expect(SAMPLING.n_predict).toBe(512);
  });
});

describe("엔진 — 이번 호출만의 상한 (FR-002·FR-003)", () => {
  it("종전 경로: maxTokens를 주면 그 호출의 n_predict가 그 값이다", async () => {
    const { context, calls } = recordingContext();
    const engine = createLlamaEngine(async () => context, pathFor);
    await engine.load("quiet");
    await engine.run("안녕?", { timeoutMs: 1000, maxTokens: 16 });
    expect(calls[0]?.n_predict).toBe(16);
  });

  it("종전 경로: 상한은 그 호출에만 걸린다 — 다음 run()·ask()는 SAMPLING.n_predict다", async () => {
    const { context, calls } = recordingContext();
    const engine = createLlamaEngine(async () => context, pathFor);
    await engine.load("quiet");
    await engine.run("안녕?", { timeoutMs: 1000, maxTokens: 16 });
    await engine.run("일기 프롬프트", { timeoutMs: 1000 });
    await engine.ask("일기 프롬프트", "본문", "제목은?", { timeoutMs: 1000 });
    expect(calls.map((c) => c.n_predict)).toEqual([16, SAMPLING.n_predict, SAMPLING.n_predict]);
  });

  it("ask()도 같은 필드를 따른다 — 같은 한도 타입을 받는 두 메서드가 다르게 굴지 않는다", async () => {
    const { context, calls } = recordingContext();
    const engine = createLlamaEngine(async () => context, pathFor);
    await engine.load("quiet");
    await engine.ask("p", "b", "q", { timeoutMs: 1000, maxTokens: 16 });
    expect(calls[0]?.n_predict).toBe(16);
  });

  describe("iOS 조각 경로 (SCREEN_IOS_PACING과 같은 조각 32)", () => {
    const pacing = { pauseRatio: 0, chunkTokens: 32 };
    const paced = (context: ReturnType<typeof recordingContext>["context"]) =>
      createLlamaEngine(async () => context, pathFor, {
        pacing,
        sleep: async () => {},
        clock: () => 0,
      });

    it("상한 16이면 16토큰짜리 조각 하나로 끝나고 길이로 끝난다", async () => {
      const { context, calls } = recordingContext();
      const engine = paced(context);
      await engine.load("quiet");
      const result = await engine.run("안녕?", { timeoutMs: 1000, maxTokens: 16 });
      expect(calls.map((c) => c.n_predict)).toEqual([16]);
      expect(result).toEqual({ text: "안녕", ending: { kind: "length" } });
    });

    it("상한이 조각보다 크면 마지막 조각만 남은 만큼으로 줄인다", async () => {
      const { context, calls } = recordingContext();
      const engine = paced(context);
      await engine.load("quiet");
      await engine.run("안녕?", { timeoutMs: 1000, maxTokens: 40 });
      expect(calls.map((c) => c.n_predict)).toEqual([32, 8]);
    });

    it("상한을 주지 않은 제목(ask)도 종전대로 512 ÷ 32 조각까지 간다", async () => {
      const { context, calls } = recordingContext();
      const engine = paced(context);
      await engine.load("quiet");
      await engine.ask("일기 프롬프트", "본문", "제목은?", { timeoutMs: 1000 });
      expect(calls.map((c) => c.n_predict)).toEqual(Array(SAMPLING.n_predict / 32).fill(32));
    });

    it("16토큰이 끝의 깨진 글자(U+FFFD)뿐이면 빈 답이고 확인은 실패로 판정된다 — 안전한 쪽", async () => {
      const { context } = recordingContext({ text: "\uFFFD", eos: false });
      const backend = createOnDeviceBackend(async () => [], paced(context));
      await expect(backend.checkLiveness("quiet")).resolves.toBe("failed");
    });

    it("상한을 주지 않은 일기는 종전대로 512 ÷ 32 = 16조각까지 간다", async () => {
      const { context, calls } = recordingContext();
      const engine = paced(context);
      await engine.load("quiet");
      await engine.run("일기 프롬프트", { timeoutMs: 1000 });
      expect(calls).toHaveLength(SAMPLING.n_predict / 32);
      expect(calls.every((c) => c.n_predict === 32)).toBe(true);
    });
  });
});

describe("상한 값이 양의 정수가 아니면 상한이 없는 것으로 본다 (코드 리뷰)", () => {
  it.each([0, -1, Number.NaN, 2.5])(
    "maxTokens %p → 두 경로 모두 SAMPLING.n_predict",
    async (bad) => {
      const plain = recordingContext();
      const engine = createLlamaEngine(async () => plain.context, pathFor);
      await engine.load("quiet");
      await engine.run("p", { timeoutMs: 1000, maxTokens: bad });
      expect(plain.calls[0]?.n_predict).toBe(SAMPLING.n_predict);

      const chunked = recordingContext();
      const pacedEngine = createLlamaEngine(async () => chunked.context, pathFor, {
        pacing: { pauseRatio: 0, chunkTokens: 32 },
        sleep: async () => {},
        clock: () => 0,
      });
      await pacedEngine.load("quiet");
      await pacedEngine.run("p", { timeoutMs: 1000, maxTokens: bad });
      expect(chunked.calls).toHaveLength(SAMPLING.n_predict / 32);
    },
  );
});

describe("checkLiveness() — 확인만 상한을 넘긴다 (FR-001·FR-003·FR-004)", () => {
  function spyEngine(): { engine: GenerationEngine; runs: RunLimits[]; asks: RunLimits[] } {
    const runs: RunLimits[] = [];
    const asks: RunLimits[] = [];
    const engine: GenerationEngine = {
      async load() {
        return { ok: true, warm: false };
      },
      async prewarm() {},
      async run(_prompt, limits) {
        runs.push(limits);
        return { text: "안녕하세요", ending: { kind: "length" } };
      },
      async ask(_p, _b, _q, limits) {
        asks.push(limits);
        return { text: "", ending: { kind: "eos" } };
      },
      async stop() {},
      async unload() {},
    };
    return { engine, runs, asks };
  }

  it("확인 호출은 maxTokens = LIVENESS_MAX_TOKENS를 넘기고, 상한에서 잘린 답도 ok다", async () => {
    const { engine, runs } = spyEngine();
    const backend = createOnDeviceBackend(async () => [], engine);
    await expect(backend.checkLiveness("quiet")).resolves.toBe("ok");
    expect(runs).toHaveLength(1);
    expect(runs[0]?.maxTokens).toBe(LIVENESS_MAX_TOKENS);
  });

  it("일기 본문·제목 호출은 maxTokens를 넘기지 않는다 — 확인 뒤에도 (FR-003)", async () => {
    const { engine, runs, asks } = spyEngine();
    // 본문이 판정을 통과해야 제목을 묻는다 — 끝맺은 한국어 본문을 돌려준다
    engine.run = async (_prompt, limits) => {
      runs.push(limits);
      return {
        text: "나는 오늘 아무것도 보지 못했다. 가방 속은 조용했다. 내일은 무엇이든 보여 줬으면 좋겠다.",
        ending: { kind: "eos" },
      };
    };
    // 사진 엔진 대역 — 사진이 없는 날은 열리지 않지만 없으면 생성하지 않는다(042, on-device.test.ts 061과 같다)
    const vision: VisionSupport = {
      engine: {
        load: async () => ({ ok: true }),
        caption: async () => ({ text: "" }),
        stop: async () => {},
        unload: async () => {},
      },
      resolvePath: async (p) => `/photo/${p.id}.jpg`,
    };
    const backend = createOnDeviceBackend(async () => [], engine, 60_000, vision);
    const request: DiaryRequest = {
      signals: emptyDay("2026-10-31"),
      character: "quiet",
      vision: "quick",
      dayStillOpen: false,
    };
    await backend.checkLiveness("quiet");
    await backend.generate(request);
    expect(runs).toHaveLength(2);
    expect(runs[1]?.maxTokens).toBeUndefined();
    expect(asks).toHaveLength(1);
    expect(asks[0]?.maxTokens).toBeUndefined();
  });

  it("실제 엔진을 묶으면 확인의 네이티브 호출이 상한 16으로 가고, 끝나면 놓는다", async () => {
    const { context, calls } = recordingContext();
    const backend = createOnDeviceBackend(
      async () => [],
      createLlamaEngine(async () => context, pathFor),
    );
    await expect(backend.checkLiveness("quiet")).resolves.toBe("ok");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.messages).toEqual([{ role: "user", content: LIVENESS_INPUT }]);
    expect(calls[0]?.n_predict).toBe(LIVENESS_MAX_TOKENS);
    expect(context.release).toHaveBeenCalledTimes(1);
  });
});

describe("짧게 끊긴 생성도 끝난 뒤에 놓는다 (FR-005, 079 U2·U3)", () => {
  it("상한을 받은 생성이 도는 동안 unload()를 불러도 release()는 생성이 끝난 뒤다", async () => {
    let finish!: () => void;
    const order: string[] = [];
    const calls: Record<string, unknown>[] = [];
    const context = {
      completion: jest.fn((params: Record<string, unknown>) => {
        calls.push(params);
        return new Promise<{ content: string; stopped_limit: number }>((resolve) => {
          finish = () => {
            order.push("generation-done");
            resolve({ content: "안", stopped_limit: 1 });
          };
        });
      }),
      stopCompletion: jest.fn(async () => {
        order.push("stop");
      }),
      release: jest.fn(async () => {
        order.push("release");
      }),
    };
    const engine = createLlamaEngine(async () => context, pathFor);
    await engine.load("quiet");

    const running = engine.run(LIVENESS_INPUT, { timeoutMs: 1000, maxTokens: LIVENESS_MAX_TOKENS });
    const unloading = engine.unload();
    await Promise.resolve();
    await Promise.resolve();
    expect(context.release).not.toHaveBeenCalled();

    finish();
    await running;
    await unloading;
    expect(calls[0]?.n_predict).toBe(LIVENESS_MAX_TOKENS);
    expect(order).toEqual(["stop", "generation-done", "release"]);
  });
});
