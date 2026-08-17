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

import { buildPrompt } from "../../src/diary/prompt";
import { buildRequest } from "../../src/diary/request";
import { CHARACTERS, type Character } from "../../src/diary/types";
import {
  judgeServerOutput,
  serverRequestFor,
} from "../../src/inference/desktop-server";
import { SAMPLING } from "../../src/inference/sampling";
import { richDay } from "../../src/signals/fake";
import { createLlamaEngine, endingOf } from "../../src/inference/llama-port";

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

    for (const character of ["quiet", "chinese", "english"] as const) {
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
    await engine.load("narrative");

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
    const built = buildRequest(richDay("2026-08-16"), character, "none");
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
    expect(
      judgeServerOutput(request, "오늘 주인은 어딘가로 나섰다.", { kind: "eos" }),
    ).toEqual({ text: "오늘 주인은 어딘가로 나섰다." });

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
