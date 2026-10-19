/**
 * llama-port 계약 테스트.
 *
 * 계약: specs/005-diary-generation/contracts/engine.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`initLlama`가 실제로 성공하는지는 여기서 못 본다** — 실기기의 몫이다(quickstart D1).
 *
 * 여기서 보는 것은 **경계에서 무엇이 버려지는가**이며, 그것이 원칙 IV의 방어다.
 * `completion()`이 `timings`·`tokens_predicted`를 공짜로 주므로, 버리지 않으면 위로
 * 샌다 — 001~004와 달리 「안 쓴다」로는 부족한 자리다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildPrompt, promptPrefix } from "../../src/diary/prompt";
import { buildRequest } from "../../src/diary/request";
import { CHARACTERS, type Character } from "../../src/diary/types";
import { judgeServerOutput, serverRequestFor } from "../../src/inference/desktop-server";
import { ROMAN_LETTER_BLOCK_GRAMMAR, SAMPLING } from "../../src/inference/sampling";
import { richDay } from "../../src/signals/fake";
import { contextParams, createLlamaEngine, endingOf } from "../../src/inference/llama-port";
import { FUTURE_CHARACTER } from "../future-character";

/** 로스터에 있는 캐릭터. 한 캐릭터만 필요한 자리에 쓴다. */
const QUIET = "quiet" as const;

const pathFor = async (character: Character) => `/models/${character}.bin`;

describe("Ending 매핑 (engine.md)", () => {
  it("stopped_eos만 정상이다", () => {
    expect(endingOf({ stopped_eos: true })).toEqual({ kind: "eos" });
  });

  it("interrupted가 가장 먼저다", () => {
    // 여러 플래그가 동시에 설 수 있고, 그때 무엇으로 볼지 정해져 있어야 같은 입력에
    // 같은 답이 나온다.
    expect(endingOf({ interrupted: true, stopped_eos: true })).toEqual({
      kind: "interrupted",
    });
  });

  it("context_full과 truncated는 context다", () => {
    expect(endingOf({ context_full: true })).toEqual({ kind: "context" });
    expect(endingOf({ truncated: true })).toEqual({ kind: "context" });
  });

  it("stopped_limit은 length다 — 수로 와도 불리언으로 와도", () => {
    expect(endingOf({ stopped_limit: 1 })).toEqual({ kind: "length" });
    expect(endingOf({ stopped_limit: true })).toEqual({ kind: "length" });
  });

  it("stopped_limit이 0이면 length가 아니다", () => {
    expect(endingOf({ stopped_limit: 0, stopped_eos: true })).toEqual({ kind: "eos" });
  });

  it("★ 어느 갈래에도 안 맞으면 정상이 아닌 쪽으로 본다 (원칙 V)", () => {
    // **모르는 것을 정상으로 처리하면 잘린 글이 일기가 된다.**
    expect(endingOf({})).toEqual({ kind: "length" });
    expect(endingOf({ stopped_eos: false })).toEqual({ kind: "length" });
  });

  it("Ending이 값을 갖지 않는다 (원칙 IV)", () => {
    const results = [
      { stopped_eos: true },
      { interrupted: true },
      { context_full: true },
      { stopped_limit: 1 },
      {},
    ];
    for (const result of results) {
      expect(Object.keys(endingOf(result))).toEqual(["kind"]);
    }
  });
});

describe("지표가 경계를 넘지 못한다 (원칙 IV) ★", () => {
  /** 네이티브가 실제로 돌려주는 모양 (research.md §1의 실측) */
  const NATIVE_WITH_METRICS = {
    text: "오늘은 조용한 하루였다.",
    stopped_eos: true,
    tokens_predicted: 128,
    tokens_evaluated: 512,
    draft_tokens: 0,
    tokens_cached: 64,
    timings: {
      prompt_ms: 1234,
      prompt_per_second: 415.2,
      predicted_ms: 9876,
      predicted_per_token_ms: 77.1,
      predicted_per_second: 12.9,
    },
  };

  it("completion()의 지표가 RunResult로 넘어오지 않는다", async () => {
    const engine = createLlamaEngine(
      async () => ({
        async completion() {
          return NATIVE_WITH_METRICS;
        },
        async stopCompletion() {},
        async release() {},
      }),
      pathFor,
    );

    await engine.load("quiet");
    const result = await engine.run("프롬프트", { timeoutMs: 1000 });

    // **자리가 둘뿐이므로 담을 수 없다.**
    expect(Object.keys(result).sort()).toEqual(["ending", "text"]);

    const serialized = JSON.stringify(result);
    for (const forbidden of ["timings", "tokens_predicted", "per_second"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("토큰 콜백을 넘기지 않는다 (E3, FR-028b)", async () => {
    // **스트리밍 경로가 코드에 존재하지 않아야 한다** — 존재하면 판정을 통과하지 않은
    // 글이 화면에 닿을 수 있다.
    let argCount = -1;
    const engine = createLlamaEngine(
      async () => ({
        async completion(...args: unknown[]) {
          argCount = args.length;
          return { content: "글", stopped_eos: true };
        },
        async stopCompletion() {},
        async release() {},
      }),
      pathFor,
    );

    await engine.load("quiet");
    await engine.run("프롬프트", { timeoutMs: 1000 });

    expect(argCount).toBe(1);
  });

  it("샘플링 값이 그대로 전달된다 (FR-005a)", async () => {
    let params: Record<string, unknown> = {};
    const engine = createLlamaEngine(
      async () => ({
        async completion(p: Record<string, unknown>) {
          params = p;
          return { content: "글", stopped_eos: true };
        },
        async stopCompletion() {},
        async release() {},
      }),
      pathFor,
    );

    await engine.load("quiet");
    await engine.run("프롬프트", { timeoutMs: 1000 });

    // **`messages` + jinja로 넘긴다**(실기기에서 정한 것, 2026-08-17). 평문 `prompt`로는
    // 모델이 빈 글만 냈다 — research §4의 「거부가 잦으면 다시 본다」가 실현된 자리다.
    expect(params.jinja).toBe(true);
    expect(params.messages).toEqual([{ role: "user", content: "프롬프트" }]);
    expect(params.temperature).toBeDefined();
    expect(params.n_predict).toBeDefined();
  });

  it("프롬프트 문자열이 사용자 메시지로만 들어간다 (FR-013b)", async () => {
    // 프롬프트를 여기서 고쳐 쓰지 않는다 — `buildPrompt()`가 만든 것이 그대로 간다.
    let params: Record<string, unknown> = {};
    const engine = createLlamaEngine(
      async () => ({
        async completion(p: Record<string, unknown>) {
          params = p;
          return { content: "글", stopped_eos: true };
        },
        async stopCompletion() {},
        async release() {},
      }),
      pathFor,
    );

    await engine.load("quiet");
    await engine.run("원본 프롬프트", { timeoutMs: 1000 });

    const messages = params.messages as { role: string; content: string }[];
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("원본 프롬프트");
  });

  it("캐릭터가 달라도 샘플링 값이 같다 (FR-014)", async () => {
    // 갈리면 성격이 모델이 아니라 파라미터에서 오게 되고, 그것도 지어낸 성격이다.
    const seen: Record<string, unknown>[] = [];
    const makeEngine = () =>
      createLlamaEngine(
        async () => ({
          async completion(p: Record<string, unknown>) {
            seen.push(p);
            return { content: "글", stopped_eos: true };
          },
          async stopCompletion() {},
          async release() {},
        }),
        pathFor,
      );

    for (const character of [QUIET, FUTURE_CHARACTER] as const) {
      const engine = makeEngine();
      await engine.load(character);
      await engine.run("같은 프롬프트", { timeoutMs: 1000 });
    }

    const [first, ...rest] = seen;
    for (const params of rest) {
      expect(params.temperature).toBe(first.temperature);
      expect(params.top_p).toBe(first.top_p);
      expect(params.n_predict).toBe(first.n_predict);
    }
  });
});

describe("적재와 정리 (E1·E2)", () => {
  /** 열림/닫힘을 세는 대역 */
  function countingLoader() {
    const state = { opened: 0, released: 0, paths: [] as string[] };
    const loader = async (path: string) => {
      state.opened += 1;
      state.paths.push(path);
      return {
        async completion() {
          return { content: "글", stopped_eos: true };
        },
        async stopCompletion() {},
        async release() {
          state.released += 1;
        },
      };
    };
    return { state, loader };
  }

  it("다른 캐릭터를 열면 앞의 것이 먼저 닫힌다 (E1)", async () => {
    const { state, loader } = countingLoader();
    const engine = createLlamaEngine(loader, pathFor);

    await engine.load("quiet");
    await engine.load(FUTURE_CHARACTER);

    // **두 번째를 열기 전에 첫 번째가 닫혔다** — GB 둘이 동시에 열리면 기기가 죽는다.
    expect(state.opened).toBe(2);
    expect(state.released).toBe(1);
  });

  it("같은 캐릭터를 다시 열면 재사용한다", async () => {
    const { state, loader } = countingLoader();
    const engine = createLlamaEngine(loader, pathFor);

    await engine.load("quiet");
    await engine.load("quiet");

    expect(state.opened).toBe(1);
    expect(state.released).toBe(0);
  });

  it("unload 뒤에는 다시 열 수 있다", async () => {
    const { state, loader } = countingLoader();
    const engine = createLlamaEngine(loader, pathFor);

    await engine.load("quiet");
    await engine.unload();
    await engine.load("quiet");

    expect(state.opened).toBe(2);
    expect(state.released).toBe(1);
  });

  it("release()가 실패해도 다음 load가 된다", async () => {
    // 실패한 채로 붙들고 있으면 다음 요청이 영영 안 된다.
    let opened = 0;
    const engine = createLlamaEngine(async () => {
      opened += 1;
      return {
        async completion() {
          return { content: "글", stopped_eos: true };
        },
        async stopCompletion() {},
        async release() {
          throw new Error("release가 실패했다");
        },
      };
    }, pathFor);

    await engine.load("quiet");
    await engine.unload();
    await engine.load("quiet");

    expect(opened).toBe(2);
  });

  it("003의 경로를 쓴다 — 매핑을 새로 만들지 않는다 (FR-007a)", async () => {
    const { state, loader } = countingLoader();
    const engine = createLlamaEngine(loader, pathFor);

    await engine.load("quiet");

    expect(state.paths).toEqual(["/models/quiet.bin"]);
  });
});

describe("콜드/핫 판정 — warm (016, research.md §1)", () => {
  function countingLoader() {
    const state = { opened: 0, released: 0 };
    const loader = async () => {
      state.opened += 1;
      return {
        async completion() {
          return { content: "글", stopped_eos: true };
        },
        async stopCompletion() {},
        async release() {
          state.released += 1;
        },
      };
    };
    return { state, loader };
  }

  it("처음 여는 캐릭터는 warm: false다", async () => {
    const { loader } = countingLoader();
    const engine = createLlamaEngine(loader, pathFor);

    expect(await engine.load("quiet")).toEqual({ ok: true, warm: false });
  });

  it("같은 캐릭터를 다시 열면 warm: true다 — loader()가 다시 불리지 않는다", async () => {
    const { state, loader } = countingLoader();
    const engine = createLlamaEngine(loader, pathFor);

    await engine.load("quiet");
    const second = await engine.load("quiet");

    expect(second).toEqual({ ok: true, warm: true });
    // **진짜 재사용 검증** — loader()(네이티브 적재, 비용이 드는 호출)가
    // 두 번째 호출에서는 불리지 않는다(research.md §1).
    expect(state.opened).toBe(1);
  });

  it("다른 캐릭터로 전환하면 warm: false다 (E1)", async () => {
    const { loader } = countingLoader();
    const engine = createLlamaEngine(loader, pathFor);

    await engine.load("quiet");
    const second = await engine.load(FUTURE_CHARACTER);

    expect(second).toEqual({ ok: true, warm: false });
  });

  it("로드 실패 결과에는 warm 필드가 없다", async () => {
    const engine = createLlamaEngine(async () => {
      throw new Error("ENOENT: no such file or directory");
    }, pathFor);

    const result = await engine.load("quiet");

    expect(result).toEqual({ ok: false, reason: "not-found" });
    expect("warm" in result).toBe(false);
  });
});

describe("실패는 값이다 (E5)", () => {
  it("적재 실패가 돌아온다 — 던지지 않는다", async () => {
    const engine = createLlamaEngine(async () => {
      throw new Error("ENOENT: no such file or directory");
    }, pathFor);

    expect(await engine.load("quiet")).toEqual({ ok: false, reason: "not-found" });
  });

  it("파일이 있는데 못 여는 것은 load-failed다", async () => {
    // 파일이 없는 것과 있는데 못 여는 것은 사용자가 할 일이 다르다(FR-017d).
    const engine = createLlamaEngine(async () => {
      throw new Error("failed to allocate memory");
    }, pathFor);

    expect(await engine.load("quiet")).toEqual({ ok: false, reason: "load-failed" });
  });

  it("경로 해석이 실패하면 not-found다", async () => {
    const engine = createLlamaEngine(
      async () => ({
        async completion() {
          return { content: "글", stopped_eos: true };
        },
        async stopCompletion() {},
        async release() {},
      }),
      async () => {
        throw new Error("경로를 찾지 못했다");
      },
    );

    expect(await engine.load("quiet")).toEqual({ ok: false, reason: "not-found" });
  });

  it("★ 적재 실패 결과에 경로·오류 문구가 없다 (원칙 III)", async () => {
    // 경로에는 자산키가 들어 있고, 자산키가 새면 캐릭터→모델 매핑을 역추적할 수 있다.
    const engine = createLlamaEngine(async () => {
      throw new Error("ENOENT: /data/user/0/app/files/models/a1.bin not found");
    }, pathFor);

    const result = await engine.load("quiet");
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("a1");
    expect(serialized).not.toContain("/data");
    expect(Object.keys(result).sort()).toEqual(["ok", "reason"]);
  });

  it("load 없이 run하면 던지지 않고 끝나지 않은 결과를 준다", async () => {
    const { loader } = countingLoaderStub();
    const engine = createLlamaEngine(loader, pathFor);

    const result = await engine.run("프롬프트", { timeoutMs: 1000 });

    // 정상이 아닌 쪽으로 — 판정이 unfinished로 거부한다.
    expect(result.ending.kind).not.toBe("eos");
  });

  it("stop()이 조용히 실패해도 된다", async () => {
    // 이미 끝난 생성을 멈추려는 것은 정상이며 알릴 것이 없다.
    const engine = createLlamaEngine(
      async () => ({
        async completion() {
          return { content: "글", stopped_eos: true };
        },
        async stopCompletion() {
          throw new Error("이미 끝났다");
        },
        async release() {},
      }),
      pathFor,
    );

    await engine.load("quiet");
    await expect(engine.stop()).resolves.toBeUndefined();
  });

  it("열린 것이 없어도 stop()·unload()가 무사하다", async () => {
    const { loader } = countingLoaderStub();
    const engine = createLlamaEngine(loader, pathFor);

    await expect(engine.stop()).resolves.toBeUndefined();
    await expect(engine.unload()).resolves.toBeUndefined();
  });
});

/** 위 describe 밖에서 쓰는 대역 */
function countingLoaderStub() {
  return {
    loader: async () => ({
      async completion() {
        return { content: "글", stopped_eos: true };
      },
      async stopCompletion() {},
      async release() {},
    }),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * FR-005 — 온디바이스와 데스크톱이 같은 것을 쓴다
 *
 * 헌법 원칙 I: "온디바이스와 동일한 GGUF, 동일한 프롬프트, 동일한 샘플링 파라미터를
 * 쓴다(MUST). 실행 위치만 다르고 그 외에 다른 것은 허용하지 않는다."
 *
 * **각자 만들 자리가 없어야 어긋날 수 없다.** 이 테스트가 그것을 확인한다.
 * ══════════════════════════════════════════════════════════════════════════ */

describe("FR-005 — 두 경로가 같은 프롬프트·샘플링을 쓴다 ★", () => {
  function requestFor(character: Character = "quiet") {
    const built = buildRequest(richDay("2026-08-16"), character, "quick");
    if (!built.ok) throw new Error("테스트 준비 실패");
    return built.request;
  }

  it("데스크톱 요청의 프롬프트가 buildPrompt의 결과와 같다", () => {
    const request = requestFor();
    expect(serverRequestFor(request).prompt).toBe(buildPrompt(request));
  });

  it("온디바이스가 네이티브에 넘기는 것과 데스크톱이 서버에 보내는 것이 같다", async () => {
    // **이것이 FR-005의 핵심 검증이다.** 두 경로가 실제로 같은 값을 쓰는지 본다.
    const request = requestFor();

    let nativeParams: Record<string, unknown> = {};
    const engine = createLlamaEngine(
      async () => ({
        async completion(p: Record<string, unknown>) {
          nativeParams = p;
          return { content: "글", stopped_eos: true };
        },
        async stopCompletion() {},
        async release() {},
      }),
      pathFor,
    );

    await engine.load(request.character);
    await engine.run(buildPrompt(request), { timeoutMs: 1000 });

    const serverParams = serverRequestFor(request);

    // **넘기는 형식은 다르지만 프롬프트 문자열은 같다.** 네이티브는 채팅 템플릿을 쓰고
    // (모델이 자기 형식으로 두른다) 서버는 평문을 받지만, **우리가 넣는 문자열은 하나다** —
    // 그것이 원칙 I의 「동일한 프롬프트」가 요구한 바다.
    const nativeMessages = nativeParams.messages as { content: string }[];
    expect(nativeMessages[0].content).toBe(serverParams.prompt);
    expect(nativeParams.temperature).toBe(serverParams.temperature);
    expect(nativeParams.top_p).toBe(serverParams.top_p);
    expect(nativeParams.top_k).toBe(serverParams.top_k);
    expect(nativeParams.n_predict).toBe(serverParams.n_predict);
  });

  it("다섯 캐릭터 전부에서 같다", () => {
    for (const character of CHARACTERS) {
      const request = requestFor(character);
      expect(serverRequestFor(request).prompt).toBe(buildPrompt(request));
    }
  });

  it("데스크톱이라고 더 큰 값을 쓰지 않는다 (원칙 I)", () => {
    // "데스크톱이라는 이유로 더 큰 모델을 쓰지 않는다(MUST NOT)"의 연장이다.
    const request = requestFor();
    const server = serverRequestFor(request);

    expect(server.n_predict).toBe(SAMPLING.n_predict);
    expect(server.temperature).toBe(SAMPLING.temperature);
  });

  it("데스크톱 판정이 온디바이스 판정과 같다", () => {
    const request = requestFor();

    // 통과하는 글
    expect(judgeServerOutput(request, "오늘 주인은 어딘가로 나섰다.", { kind: "eos" })).toEqual({
      text: "오늘 주인은 어딘가로 나섰다.",
    });

    // 끝나지 않은 글 — 데스크톱이라고 느슨하게 보지 않는다
    const truncated = judgeServerOutput(request, "오늘 주인은", { kind: "length" });
    expect("text" in truncated).toBe(false);
    if ("kind" in truncated) expect(truncated.kind).toBe("rejected");

    // 끊긴 글
    const interrupted = judgeServerOutput(request, "오늘 주인은", {
      kind: "interrupted",
    });
    if ("kind" in interrupted) expect(interrupted.kind).toBe("interrupted");
  });

  it("데스크톱 판정도 거부된 글을 실어 나르지 않는다 (FR-017c)", () => {
    const request = requestFor();
    const rejected = "이 글은 거부되어야 한다";

    const result = judgeServerOutput(request, rejected, { kind: "length" });

    expect(JSON.stringify(result)).not.toContain(rejected);
  });
});

describe("018 — prewarm() (contracts/prewarm-engine.md)", () => {
  /** completion() 호출을 기록하는 로더. */
  function recordingLoader() {
    const calls: Record<string, unknown>[] = [];
    const loader = async () => ({
      async completion(params: Record<string, unknown>) {
        calls.push(params);
        return { content: "글", stopped_eos: true };
      },
      async stopCompletion() {},
      async release() {},
    });
    return { calls, loader };
  }

  it("E7·E8: run()과 같은 모양(messages+jinja)으로 n_predict:1을 보낸다", async () => {
    const { calls, loader } = recordingLoader();
    const engine = createLlamaEngine(loader, pathFor);

    await engine.load(QUIET);
    await engine.prewarm(QUIET, promptPrefix(QUIET));

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      messages: [{ role: "user", content: promptPrefix(QUIET) }],
      jinja: true,
      n_predict: 1,
    });
  });

  it("E11: prewarm()은 아무것도 반환하지 않는다", async () => {
    const { loader } = recordingLoader();
    const engine = createLlamaEngine(loader, pathFor);

    await engine.load(QUIET);
    expect(await engine.prewarm(QUIET, promptPrefix(QUIET))).toBeUndefined();
  });

  it("E9: load() 없이 부르면 네이티브를 건드리지 않고 조용히 끝난다", async () => {
    const { calls, loader } = recordingLoader();
    const engine = createLlamaEngine(loader, pathFor);

    await expect(engine.prewarm(QUIET, promptPrefix(QUIET))).resolves.toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it("E9: 다른 캐릭터가 열려 있으면 조용히 끝난다", async () => {
    const { calls, loader } = recordingLoader();
    const engine = createLlamaEngine(loader, pathFor);

    await engine.load("quiet");
    await expect(engine.prewarm(FUTURE_CHARACTER, promptPrefix(QUIET))).resolves.toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it("N18: llama-port.ts가 diary/prompt를 import하지 않는다 (035)", () => {
    // 018에서는 포트가 promptPrefix()를 직접 불렀다. 035가 사용자 지정 이름을
    // 접두사에 들이면서 포트가 이름까지 알아야 하는 문제가 생겼고, 접두사를
    // 통째로 인자로 받아 해소했다 — 경계가 오히려 깨끗해졌다.
    const code = readFileSync(join(__dirname, "../../src/inference/llama-port.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/from\s+["'][^"']*diary\/prompt["']/);
    expect(code).not.toContain("promptPrefix");
  });

  it("E10: completion()이 실패해도 던지지 않는다", async () => {
    const engine = createLlamaEngine(async () => {
      return {
        async completion() {
          throw new Error("boom");
        },
        async stopCompletion() {},
        async release() {},
      };
    }, pathFor);

    await engine.load(QUIET);
    await expect(engine.prewarm(QUIET, promptPrefix(QUIET))).resolves.toBeUndefined();
  });
});

describe("061 — ask() (specs/061-diary-prompt-swap/contracts/title-ask.md TA1)", () => {
  function recordingLoader(result: Record<string, unknown>) {
    const calls: Record<string, unknown>[] = [];
    const loader = async () => ({
      async completion(params: Record<string, unknown>) {
        calls.push(params);
        return result;
      },
      async stopCompletion() {},
      async release() {},
    });
    return { calls, loader };
  }

  it("같은 대화로 보낸다 — user(프롬프트) → assistant(본문) → user(질문), 샘플링은 run()과 같다", async () => {
    const { calls, loader } = recordingLoader({ content: "고양이의 밤", stopped_eos: true });
    const engine = createLlamaEngine(loader, pathFor);
    await engine.load(QUIET);

    await engine.ask("프롬프트", "본문", "제목을 적어라.", { timeoutMs: 1000 });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      messages: [
        { role: "user", content: "프롬프트" },
        { role: "assistant", content: "본문" },
        { role: "user", content: "제목을 적어라." },
      ],
      jinja: true,
      temperature: SAMPLING.temperature,
      top_p: SAMPLING.top_p,
      top_k: SAMPLING.top_k,
      n_predict: SAMPLING.n_predict,
      // 077 — 제목도 로마자 차단 문법을 받는다(GR2)
      grammar: ROMAN_LETTER_BLOCK_GRAMMAR,
    });
  });

  it("결과는 { text, ending } 둘뿐이다 — 지표가 경계를 넘지 못한다 (원칙 IV)", async () => {
    const { loader } = recordingLoader({
      content: " 고양이의 밤 ",
      stopped_eos: true,
      timings: { predicted_per_second: 9 },
      tokens_predicted: 5,
    });
    const engine = createLlamaEngine(loader, pathFor);
    await engine.load(QUIET);

    const result = await engine.ask("p", "b", "q", { timeoutMs: 1000 });
    expect(result).toEqual({ text: "고양이의 밤", ending: { kind: "eos" } });
  });

  it("load() 없이 부르면 네이티브를 건드리지 않고 끝나지 않은 결과를 준다 (E5)", async () => {
    const { calls, loader } = recordingLoader({ content: "x", stopped_eos: true });
    const engine = createLlamaEngine(loader, pathFor);

    expect(await engine.ask("p", "b", "q", { timeoutMs: 1000 })).toEqual({
      text: "",
      ending: { kind: "length" },
    });
    expect(calls).toHaveLength(0);
  });

  it("토큰 콜백을 넘기지 않는다 (E3)", async () => {
    const seen: unknown[][] = [];
    const engine = createLlamaEngine(
      async () => ({
        async completion(...args: unknown[]) {
          seen.push(args);
          return { content: "t", stopped_eos: true };
        },
        async stopCompletion() {},
        async release() {},
      }),
      pathFor,
    );
    await engine.load(QUIET);
    await engine.ask("p", "b", "q", { timeoutMs: 1000 });
    expect(seen[0]).toHaveLength(1);
  });
});

/* ═══════════════════ 077 — 로마자 차단 문법 (contracts/grammar.md) ═══════════════════ */

describe("077 — 로마자 차단 문법 (GR1~GR5)", () => {
  const GRAMMAR = "root ::= [^A-Za-z]*";

  function recording() {
    const calls: Record<string, unknown>[] = [];
    const loader = async () => ({
      async completion(params: Record<string, unknown>) {
        calls.push(params);
        return { content: "글", stopped_eos: true, timings: { predicted_ms: 1 } };
      },
      async stopCompletion() {},
      async release() {},
    });
    return { calls, engine: createLlamaEngine(loader, pathFor) };
  }

  it("GR1 — sampling.ts가 원본 문법 문자열을 내보낸다(줄바꿈 없음)", () => {
    expect(ROMAN_LETTER_BLOCK_GRAMMAR).toBe(GRAMMAR);
  });

  it("GR2 — 본문(run)과 제목(ask) 호출이 같은 문법을 넘긴다", async () => {
    const { calls, engine } = recording();
    await engine.load(QUIET);
    await engine.run("프롬프트", { timeoutMs: 1000 });
    await engine.ask("프롬프트", "본문", "제목을 적어라.", { timeoutMs: 1000 });
    expect(calls).toHaveLength(2);
    expect(calls[0].grammar).toBe(GRAMMAR);
    expect(calls[1].grammar).toBe(GRAMMAR);
  });

  it("GR3 — 프리웜은 문법을 넘기지 않는다(생성하지 않는다)", async () => {
    const { calls, engine } = recording();
    await engine.load(QUIET);
    await engine.prewarm(QUIET, promptPrefix(QUIET));
    expect(calls).toHaveLength(1);
    expect("grammar" in calls[0]).toBe(false);
  });

  it("GR4 — 데스크톱 요청이 온디바이스와 같은 문법을 싣는다", async () => {
    const { calls, engine } = recording();
    const r = buildRequest(richDay("2026-01-15"), "quiet", "quick");
    if (!r.ok) throw new Error("테스트 준비 실패");
    await engine.load(QUIET);
    await engine.run(buildPrompt(r.request), { timeoutMs: 1000 });
    expect(calls[0].grammar).toBe(GRAMMAR);
    expect(serverRequestFor(r.request).grammar).toBe(calls[0].grammar);
  });

  it("GR1 — 문법 문자열 리터럴이 src/ 안에서 sampling.ts 한 곳에만 있다", () => {
    const files = ["inference/llama-port.ts", "inference/desktop-server.ts", "diary/prompt.ts"];
    for (const f of files) {
      expect(readFileSync(join(__dirname, "../../src", f), "utf8")).not.toContain("[^A-Za-z]");
    }
    expect(readFileSync(join(__dirname, "../../src/inference/sampling.ts"), "utf8")).toContain(
      `"${GRAMMAR}"`,
    );
  });

  it("GR5 — 결과는 여전히 { text, ending } 둘뿐이다(원칙 IV)", async () => {
    const { engine } = recording();
    await engine.load(QUIET);
    const result = await engine.run("프롬프트", { timeoutMs: 1000 });
    expect(Object.keys(result).sort()).toEqual(["ending", "text"]);
  });
});

/**
 * 079 — 모델을 여는 값 (specs/079-bg-auto-write-threads/contracts/assembly.md A4·A5).
 *
 * 백그라운드 조립만 스레드 수를 싣는다. **화면 조립의 인자에는 키 자체가 없다** — 값이
 * `undefined`인 키도 네이티브로 넘어가면 「주지 않음」과 같다는 보장이 없다.
 */
describe("079 — 모델을 여는 값 (assembly.md A4·A5)", () => {
  const code = readFileSync(join(__dirname, "../../src/inference/llama-port.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("A5 — 스레드 수를 주면 n_threads를 싣고 나머지 값은 그대로다", () => {
    expect(contextParams("/m.bin", 2)).toEqual({
      model: "/m.bin",
      n_ctx: 2048,
      n_gpu_layers: 0,
      n_threads: 2,
    });
  });

  it("A4 — 스레드 수를 주지 않으면 이 기능 이전의 값과 같다", () => {
    expect(contextParams("/m.bin")).toEqual({ model: "/m.bin", n_ctx: 2048, n_gpu_layers: 0 });
  });

  it("A4 — 주지 않으면 n_threads 키 자체가 없다 (undefined 값의 키도 안 된다)", () => {
    expect(Object.keys(contextParams("/m.bin"))).toEqual(["model", "n_ctx", "n_gpu_layers"]);
    expect(Object.keys(contextParams("/m.bin", undefined))).not.toContain("n_threads");
  });

  it("llamaEngine이 받은 스레드 수를 contextParams로 initLlama에 넘긴다", () => {
    expect(code).toMatch(
      /export function llamaEngine\(threads\?: number, pacing\?: EnginePacing\)/,
    );
    expect(code).toMatch(/initLlama\(contextParams\(modelPath, threads\)\)/);
  });
});

/**
 * 079 — 도는 생성이 끝나기 전에 컨텍스트를 놓지 않는다
 * (specs/079-bg-auto-write-threads/contracts/assembly.md U1~U7).
 *
 * 2026-10-13 iOS 시뮬레이터에서 앱이 죽었다(SIGSEGV). 시간 한도에 걸린 생성은 멈춤 신호만 받고
 * 아직 `llama_decode` 중이었는데, 부른 쪽의 `finally`가 `unload()`로 컨텍스트를 놓았다.
 * `stopCompletion()`은 플래그만 세운다 — 생성이 실제로 끝났는지는 `completion()`의 Promise만 안다.
 */
describe("079 — 도는 생성이 끝나기 전에 놓지 않는다 (assembly.md U1~U7)", () => {
  /** 테스트가 끝내 줄 때까지 `completion()`이 끝나지 않는 대역. 불린 순서를 적는다 */
  function controllable(options: { stopThrows?: boolean; releaseThrows?: boolean } = {}) {
    const order: string[] = [];
    const state = { opened: 0 };
    let settle: { finish: () => void; fail: () => void } | null = null;

    const loader = async () => {
      state.opened += 1;
      return {
        completion() {
          order.push("completion");
          return new Promise<{ content: string; stopped_eos: boolean }>((resolve, reject) => {
            settle = {
              finish: () => resolve({ content: "글", stopped_eos: true }),
              fail: () => reject(new Error("네이티브 생성이 실패했다")),
            };
          });
        },
        async stopCompletion() {
          order.push("stopCompletion");
          if (options.stopThrows) throw new Error("멈추지 못했다");
        },
        async release() {
          order.push("release");
          if (options.releaseThrows) throw new Error("놓지 못했다");
        },
      };
    };

    return {
      order,
      state,
      engine: createLlamaEngine(loader, pathFor),
      finish: () => settle?.finish(),
      fail: () => settle?.fail(),
    };
  }

  /** 마이크로태스크를 넉넉히 비운다 — 「기다리지 않고 놓았다」면 이 사이에 release가 찍힌다 */
  async function flush() {
    for (let i = 0; i < 20; i += 1) await Promise.resolve();
  }

  it("U2·U3 — 본문 생성 도중 unload()는 멈춤을 보내고, 생성이 끝나기 전에는 놓지 않는다", async () => {
    const fake = controllable();
    await fake.engine.load(QUIET);
    const running = fake.engine.run("프롬프트", { timeoutMs: 1000 });
    await flush();

    const unloading = fake.engine.unload();
    await flush();
    expect(fake.order).toEqual(["completion", "stopCompletion"]);

    fake.finish();
    await unloading;
    expect(fake.order).toEqual(["completion", "stopCompletion", "release"]);
    await expect(running).resolves.toEqual({ text: "글", ending: { kind: "eos" } });
  });

  it("U1 — 제목 질문(ask) 도중의 unload()도 끝나기를 기다린다", async () => {
    const fake = controllable();
    await fake.engine.load(QUIET);
    const asking = fake.engine.ask("프롬프트", "본문", "제목을 적어라.", { timeoutMs: 1000 });
    await flush();

    const unloading = fake.engine.unload();
    await flush();
    expect(fake.order).not.toContain("release");

    fake.finish();
    await unloading;
    await asking;
    expect(fake.order).toEqual(["completion", "stopCompletion", "release"]);
  });

  it("U1 — 미리 준비(prewarm) 도중의 unload()도 끝나기를 기다린다", async () => {
    const fake = controllable();
    await fake.engine.load(QUIET);
    const warming = fake.engine.prewarm(QUIET, "접두사");
    await flush();

    const unloading = fake.engine.unload();
    await flush();
    expect(fake.order).not.toContain("release");

    fake.finish();
    await unloading;
    await warming;
    expect(fake.order).toEqual(["completion", "stopCompletion", "release"]);
  });

  it("U1·U4 — 생성이 끝난 뒤의 unload()는 멈춤 없이 바로 놓는다", async () => {
    const fake = controllable();
    await fake.engine.load(QUIET);
    const running = fake.engine.run("프롬프트", { timeoutMs: 1000 });
    await flush();
    fake.finish();
    await running;

    await fake.engine.unload();
    expect(fake.order).toEqual(["completion", "release"]);
  });

  it("U4 — 도는 생성이 없으면 멈춤 없이 바로 놓는다", async () => {
    const fake = controllable();
    await fake.engine.load(QUIET);

    await fake.engine.unload();
    expect(fake.order).toEqual(["release"]);
  });

  it("U5 — 생성이 거부로 끝나도 놓는다", async () => {
    const fake = controllable();
    await fake.engine.load(QUIET);
    const running = fake.engine.run("프롬프트", { timeoutMs: 1000 }).catch(() => "거부");
    await flush();

    const unloading = fake.engine.unload();
    await flush();
    expect(fake.order).not.toContain("release");

    fake.fail();
    await unloading;
    await running;
    expect(fake.order).toEqual(["completion", "stopCompletion", "release"]);
  });

  it("U5 — 멈춤이 던져도 생성이 끝나기를 기다린 뒤 놓는다", async () => {
    const fake = controllable({ stopThrows: true });
    await fake.engine.load(QUIET);
    const running = fake.engine.run("프롬프트", { timeoutMs: 1000 });
    await flush();

    const unloading = fake.engine.unload();
    await flush();
    expect(fake.order).toEqual(["completion", "stopCompletion"]);

    fake.finish();
    await unloading;
    await running;
    expect(fake.order).toEqual(["completion", "stopCompletion", "release"]);
  });

  it("U6 — 기다리는 동안 온 run()은 「열린 것이 없다」로 답한다", async () => {
    const fake = controllable();
    await fake.engine.load(QUIET);
    const running = fake.engine.run("프롬프트", { timeoutMs: 1000 });
    await flush();
    const unloading = fake.engine.unload();
    await flush();

    await expect(fake.engine.run("다른 프롬프트", { timeoutMs: 1000 })).resolves.toEqual({
      text: "",
      ending: { kind: "length" },
    });
    expect(fake.order).not.toContain("release");

    fake.finish();
    await unloading;
    await running;
  });

  it("U6 — 기다리는 동안 온 load()는 앞 컨텍스트가 놓인 뒤에 새로 연다 (E1 — 둘이 함께 열리지 않는다)", async () => {
    const fake = controllable();
    await fake.engine.load(QUIET);
    const running = fake.engine.run("프롬프트", { timeoutMs: 1000 });
    await flush();
    const unloading = fake.engine.unload();
    await flush();

    const loading = fake.engine.load(QUIET);
    await flush();
    // 앞 컨텍스트는 아직 계산 중이다 — GB 단위 모델 둘이 함께 열리면 기기가 죽는다.
    expect(fake.state.opened).toBe(1);
    expect(fake.order).not.toContain("release");

    fake.finish();
    await unloading;
    await running;
    await expect(loading).resolves.toEqual({ ok: true, warm: false });
    expect(fake.state.opened).toBe(2);
    expect(fake.order.filter((call) => call === "release")).toHaveLength(1);
  });

  /**
   * 리뷰에서 잡힌 구멍: 「도는 생성」을 한 칸에만 들면, 미리 준비가 도는 중에 온 본문 호출이
   * 네이티브의 「Context is busy」로 곧바로 거부될 때 그 칸이 비워진다. 홈은 `prepare()`를
   * 기다리지 않고 부르므로(018) 「쓰기」를 누르면 실제로 이 순서가 된다.
   */
  it("U1 — 겹친 호출이 먼저 끝나도, 아직 도는 호출이 끝나기 전에는 놓지 않는다", async () => {
    const order: string[] = [];
    let finishFirst: (() => void) | null = null;
    let calls = 0;
    const engine = createLlamaEngine(
      async () => ({
        completion() {
          calls += 1;
          order.push(`completion#${calls}`);
          // 첫 호출(미리 준비)은 테스트가 끝내 줄 때까지 돈다. 그 사이의 호출은 네이티브처럼 곧바로 거부된다.
          if (calls === 1) {
            return new Promise<{ content: string; stopped_eos: boolean }>((resolve) => {
              finishFirst = () => resolve({ content: "", stopped_eos: true });
            });
          }
          return Promise.reject(new Error("Context is busy"));
        },
        async stopCompletion() {
          order.push("stopCompletion");
        },
        async release() {
          order.push("release");
        },
      }),
      pathFor,
    );

    await engine.load(QUIET);
    const warming = engine.prewarm(QUIET, "접두사");
    await flush();
    await engine.run("프롬프트", { timeoutMs: 1000 }).catch(() => "거부");
    await flush();

    const unloading = engine.unload();
    await flush();
    expect(order).toEqual(["completion#1", "completion#2", "stopCompletion"]);

    (finishFirst as (() => void) | null)?.();
    await unloading;
    await warming;
    expect(order).toEqual(["completion#1", "completion#2", "stopCompletion", "release"]);
  });

  it("U7 — 놓기가 실패해도 unload()는 던지지 않고, 다음 load()가 새로 연다", async () => {
    const fake = controllable({ releaseThrows: true });
    await fake.engine.load(QUIET);

    await expect(fake.engine.unload()).resolves.toBeUndefined();
    await expect(fake.engine.load(QUIET)).resolves.toEqual({ ok: true, warm: false });
    expect(fake.state.opened).toBe(2);
  });
});

/**
 * 091 PC3·PC5 — 느린 쓰기의 조각 생성. 배터리 요청으로 깬 iOS 백그라운드 쓰기는 한 번의 생성 호출이 CPU 감시 한도를 넘지 않게
 * 서식 프롬프트에 지금까지 쓴 글을 이어 붙여 조각씩 생성하고 조각 사이에 쉰다.
 */
describe("091 — 조각 생성 (PC3·PC5)", () => {
  const PACING = { pauseRatio: 0.5, chunkTokens: 32 };
  const FORMATTED = "<|user|>프롬프트<|assistant|>";

  function chunkedContext(pieces: { text: string; eos?: boolean; interrupted?: boolean }[]) {
    const calls: Record<string, unknown>[] = [];
    let i = 0;
    const context = {
      completion: jest.fn(async (params: Record<string, unknown>) => {
        calls.push(params);
        const piece = pieces[Math.min(i++, pieces.length - 1)]!;
        return {
          text: piece.text,
          stopped_eos: piece.eos === true,
          stopped_limit: piece.eos === true || piece.interrupted === true ? 0 : 1,
          interrupted: piece.interrupted === true,
          timings: { predicted_ms: 1 },
          tokens_predicted: 32,
        };
      }),
      formatChat: jest.fn(async () => ({ prompt: FORMATTED, stops: [] as string[] })),
      stopCompletion: jest.fn(async () => {}),
      release: jest.fn(async () => {}),
    };
    return { context, calls };
  }

  async function pacedEngine(context: ReturnType<typeof chunkedContext>["context"]) {
    const sleep = jest.fn(async () => {});
    let now = 0;
    const clock = () => (now += 1000);
    const engine = createLlamaEngine(async () => context, pathFor, {
      pacing: PACING,
      clock,
      sleep,
    });
    await engine.load(QUIET);
    return { engine, sleep };
  }

  it("서식 프롬프트 + 누적 생성분으로 조각씩 부르고, eos 조각에서 끝낸다", async () => {
    const { context, calls } = chunkedContext([
      { text: "오늘은 " },
      { text: "맑았어요.", eos: true },
    ]);
    const { engine, sleep } = await pacedEngine(context);
    const result = await engine.run("프롬프트", { timeoutMs: 1000 });
    expect(result).toEqual({ text: "오늘은 맑았어요.", ending: { kind: "eos" } });
    expect(calls.map((c) => c.prompt)).toEqual([FORMATTED, FORMATTED + "오늘은 "]);
    for (const call of calls) {
      expect(call.n_predict).toBe(32);
      expect(call.grammar).toBe(ROMAN_LETTER_BLOCK_GRAMMAR);
      expect(call.temperature).toBe(SAMPLING.temperature);
      expect(call.messages).toBeUndefined();
      expect(call.jinja).toBeUndefined();
    }
    expect(context.formatChat).toHaveBeenCalledWith([{ role: "user", content: "프롬프트" }]);
    // 조각마다 쉰다(시계 대역: 호출당 1000ms × 0.5)
    expect(sleep).toHaveBeenCalledWith(500);
    // 원칙 IV — 지표가 결과에 없다
    expect(Object.keys(result).sort()).toEqual(["ending", "text"]);
  });

  it("누적이 전체 길이(SAMPLING.n_predict)에 닿으면 length로 끝낸다", async () => {
    const { context, calls } = chunkedContext([{ text: "가" }]);
    const { engine } = await pacedEngine(context);
    const result = await engine.run("프롬프트", { timeoutMs: 1000 });
    expect(result.ending).toEqual({ kind: "length" });
    expect(calls).toHaveLength(Math.ceil(SAMPLING.n_predict / 32));
  });

  it("빈 조각이 오면 더 부르지 않고 length로 끝낸다 (무한히 돌지 않는다)", async () => {
    const { context, calls } = chunkedContext([{ text: "" }]);
    const { engine } = await pacedEngine(context);
    expect((await engine.run("프롬프트", { timeoutMs: 1000 })).ending).toEqual({ kind: "length" });
    expect(calls).toHaveLength(1);
  });

  it("멈춤이 오면 다음 조각을 부르지 않고 interrupted로 끝난다", async () => {
    const { context, calls } = chunkedContext([
      { text: "하나 " },
      { text: "둘 " },
      { text: "셋", eos: true },
    ]);
    const { engine } = await pacedEngine(context);
    context.completion.mockImplementationOnce(async (params: Record<string, unknown>) => {
      calls.push(params);
      await engine.stop();
      return {
        text: "하나 ",
        stopped_eos: false,
        stopped_limit: 1,
        interrupted: false,
        timings: { predicted_ms: 1 },
        tokens_predicted: 32,
      };
    });
    const result = await engine.run("프롬프트", { timeoutMs: 1000 });
    expect(result.ending).toEqual({ kind: "interrupted" });
    expect(calls).toHaveLength(1);
    expect(context.stopCompletion).toHaveBeenCalled();
  });

  it("조각이 interrupted로 끝나면 그대로 돌려준다", async () => {
    const { context } = chunkedContext([{ text: "하나 ", interrupted: true }]);
    const { engine } = await pacedEngine(context);
    expect((await engine.run("프롬프트", { timeoutMs: 1000 })).ending).toEqual({
      kind: "interrupted",
    });
  });

  it("제목 질문(ask)도 같은 방식이다 — 대화 셋을 서식으로", async () => {
    const { context, calls } = chunkedContext([{ text: "맑은 날", eos: true }]);
    const { engine } = await pacedEngine(context);
    expect(await engine.ask("프롬프트", "본문", "제목은?", { timeoutMs: 1000 })).toEqual({
      text: "맑은 날",
      ending: { kind: "eos" },
    });
    expect(context.formatChat).toHaveBeenCalledWith([
      { role: "user", content: "프롬프트" },
      { role: "assistant", content: "본문" },
      { role: "user", content: "제목은?" },
    ]);
    expect(calls[0]?.prompt).toBe(FORMATTED);
  });

  it("코드 리뷰 — 길이로 끊긴 조각 끝의 U+FFFD는 떼고 다음 조각이 그 음절부터 다시 쓴다", async () => {
    const { context, calls } = chunkedContext([
      { text: "오늘\uFFFD" },
      { text: "은 맑았어요.", eos: true },
    ]);
    const { engine } = await pacedEngine(context);
    const result = await engine.run("프롬프트", { timeoutMs: 1000 });
    expect(result.text).toBe("오늘은 맑았어요.");
    expect(calls[1]?.prompt).toBe(FORMATTED + "오늘");
  });

  it("코드 리뷰 — 템플릿의 멈춤 문자열을 조각마다 싣는다, 서식 프롬프트가 비면 종전 경로", async () => {
    const { context, calls } = chunkedContext([{ text: "끝", eos: true }]);
    context.formatChat.mockResolvedValueOnce({ prompt: FORMATTED, stops: ["<|end|>"] });
    const { engine } = await pacedEngine(context);
    await engine.run("프롬프트", { timeoutMs: 1000 });
    expect(calls[0]?.stop).toEqual(["<|end|>"]);

    context.formatChat.mockResolvedValueOnce({ prompt: "", stops: [] });
    await engine.run("프롬프트", { timeoutMs: 1000 });
    expect(calls[1]?.messages).toEqual([{ role: "user", content: "프롬프트" }]);
    expect(calls[1]?.jinja).toBe(true);
  });

  it("코드 리뷰 — 멈춤 문자열에서 멈춘 조각은 차례의 끝(eos)이다", async () => {
    const { context, calls } = chunkedContext([{ text: "맑았어요." }]);
    context.completion.mockImplementationOnce(async (params: Record<string, unknown>) => {
      calls.push(params);
      return {
        text: "맑았어요.",
        stopped_eos: false,
        stopped_limit: 0,
        interrupted: false,
        timings: { predicted_ms: 1 },
        tokens_predicted: 5,
        stopped_word: "<|end|>",
      } as never;
    });
    const { engine } = await pacedEngine(context);
    expect(await engine.run("프롬프트", { timeoutMs: 1000 })).toEqual({
      text: "맑았어요.",
      ending: { kind: "eos" },
    });
    expect(calls).toHaveLength(1);
  });

  it("PC5 — pacing이 없으면 종전 경로(messages + jinja, n_predict 전체)", async () => {
    const { context, calls } = chunkedContext([{ text: "끝", eos: true }]);
    const engine = createLlamaEngine(async () => context, pathFor);
    await engine.load(QUIET);
    await engine.run("프롬프트", { timeoutMs: 1000 });
    expect(calls[0]?.messages).toEqual([{ role: "user", content: "프롬프트" }]);
    expect(calls[0]?.jinja).toBe(true);
    expect(calls[0]?.n_predict).toBe(SAMPLING.n_predict);
    expect(context.formatChat).not.toHaveBeenCalled();
  });
});
