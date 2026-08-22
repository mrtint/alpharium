import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createVisionEngine, type VisionLoader } from "../../src/vision/vision-port";
import { CAPTION_SAMPLING } from "../../src/vision/sampling";
import { SAMPLING } from "../../src/inference/sampling";

/**
 * 사진 보는 엔진의 계약 테스트.
 *
 * 계약: specs/011-photo-vision-summary/contracts/vision-engine.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **대역을 주입해 기기 없이 규칙을 검증한다.** 005의 `engine.test.ts`와 같은 구조다.
 *
 * **V6이 이 파일의 핵심이다**: 네이티브가 지표를 잔뜩 담아 보내도 **경계를 넘지 못하는가.**
 * 005에서 `completion()`이 요청하지 않은 `timings`를 준다는 것이 실측으로 확인됐고,
 * 멀티모달이라고 다르지 않다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Call = { kind: string; detail?: unknown };

/** 열림·닫힘·호출을 기록하는 대역 */
function fakeContext(calls: Call[], overrides: Partial<Record<string, unknown>> = {}) {
  return {
    async initMultimodal(params: { path: string; image_max_tokens?: number }) {
      calls.push({ kind: "initMultimodal", detail: params });
      if (overrides.initThrows) throw new Error("mmproj를 붙이지 못했다");
      return true;
    },
    async getMultimodalSupport() {
      calls.push({ kind: "getMultimodalSupport" });
      return { vision: overrides.noVision !== true, audio: false };
    },
    async releaseMultimodal() {
      calls.push({ kind: "releaseMultimodal" });
    },
    async completion(params: Record<string, unknown>) {
      calls.push({ kind: "completion", detail: params });
      if (overrides.completionThrows) throw new Error("생성 실패");
      // ★ 네이티브가 요청하지 않은 지표를 담아 보낸다 (005 실측).
      return {
        text: (overrides.text as string) ?? "A cup of coffee on a table.",
        content: overrides.content as string | undefined,
        timings: { prompt_ms: 812, predicted_per_second: 14.2 },
        tokens_predicted: 23,
        tokens_evaluated: 205,
      };
    },
    async stopCompletion() {
      calls.push({ kind: "stopCompletion" });
    },
    async release() {
      calls.push({ kind: "release" });
    },
  };
}

const loaderFor =
  (calls: Call[], overrides: Partial<Record<string, unknown>> = {}): VisionLoader =>
  async (path: string) => {
    calls.push({ kind: "load", detail: path });
    if (overrides.loaderThrows) throw new Error(String(overrides.loaderThrows));
    return fakeContext(calls, overrides) as never;
  };

const paths = async (key: string) => `/models/${key}.gguf`;

describe("load — 본체를 열고 mmproj를 붙인다", () => {
  it("본체와 mmproj 둘 다 연다", async () => {
    const calls: Call[] = [];
    const engine = createVisionEngine(loaderFor(calls), paths);

    expect(await engine.load("quick")).toEqual({ ok: true });

    const kinds = calls.map((c) => c.kind);
    expect(kinds).toContain("load");
    expect(kinds).toContain("initMultimodal");
  });

  // V2 — 짐작하지 않고 물어본다 (원칙 V).
  it("사진을 볼 수 있는지 물어본다", async () => {
    const calls: Call[] = [];
    const engine = createVisionEngine(loaderFor(calls), paths);
    await engine.load("quick");

    expect(calls.map((c) => c.kind)).toContain("getMultimodalSupport");
  });

  it("사진을 못 보는 모델이면 no-vision-support로 거부한다 (V2)", async () => {
    const calls: Call[] = [];
    const engine = createVisionEngine(loaderFor(calls, { noVision: true }), paths);

    expect(await engine.load("quick")).toEqual({ ok: false, reason: "no-vision-support" });
  });

  it("파일이 없으면 not-found — 있는데 못 여는 것과 가른다", async () => {
    const calls: Call[] = [];
    const engine = createVisionEngine(loaderFor(calls, { loaderThrows: "ENOENT: no such file" }), paths);

    expect(await engine.load("quick")).toEqual({ ok: false, reason: "not-found" });
  });

  it("있는데 못 열면 load-failed", async () => {
    const calls: Call[] = [];
    const engine = createVisionEngine(loaderFor(calls, { loaderThrows: "깨진 파일" }), paths);

    expect(await engine.load("quick")).toEqual({ ok: false, reason: "load-failed" });
  });

  // 원칙 III — 오류 문구에 경로가 들어 있고, 경로에는 자산키가 들어 있다.
  it("실패에 경로·모델 정보를 담지 않는다 (원칙 III)", async () => {
    const calls: Call[] = [];
    const engine = createVisionEngine(loaderFor(calls, { loaderThrows: "/models/v1.gguf 없음" }), paths);

    const result = await engine.load("quick");
    expect(JSON.stringify(result)).not.toMatch(/models|gguf|v1|LFM|mmproj/i);
  });

  it("깊이에 따라 다른 값을 넘긴다 (research §4)", async () => {
    const quick: Call[] = [];
    await createVisionEngine(loaderFor(quick), paths).load("quick");
    const detailed: Call[] = [];
    await createVisionEngine(loaderFor(detailed), paths).load("detailed");

    const tokensOf = (calls: Call[]) =>
      (calls.find((c) => c.kind === "initMultimodal")?.detail as { image_max_tokens: number })
        .image_max_tokens;

    expect(tokensOf(quick)).not.toBe(tokensOf(detailed));
    expect(tokensOf(detailed)).toBeGreaterThan(tokensOf(quick));
  });

  it("두 번 열면 앞의 것을 먼저 닫는다 — 컨텍스트가 하나뿐이다", async () => {
    const calls: Call[] = [];
    const engine = createVisionEngine(loaderFor(calls), paths);

    await engine.load("quick");
    await engine.load("detailed");

    // 두 번째 load 앞에 release가 있어야 한다.
    const secondLoad = calls.map((c) => c.kind).lastIndexOf("load");
    const firstRelease = calls.map((c) => c.kind).indexOf("release");
    expect(firstRelease).toBeGreaterThanOrEqual(0);
    expect(firstRelease).toBeLessThan(secondLoad);
  });
});

/**
 * ★ V6 — 이 파일의 핵심.
 *
 * **네이티브가 지표를 잔뜩 담아 보내도 경계를 넘지 못한다.**
 */
describe("V6. 경계에서 버린다 (원칙 IV)", () => {
  it("timings·tokens를 담아 보내도 결과에 없다", async () => {
    const calls: Call[] = [];
    const engine = createVisionEngine(loaderFor(calls), paths);
    await engine.load("quick");

    const result = await engine.caption("/photo/1.jpg");

    expect(Object.keys(result)).toEqual(["text"]);
    expect(JSON.stringify(result)).not.toMatch(/timings|tokens|per_second|prompt_ms/);
  });

  it("결과의 자리가 text 하나뿐이다 (V1)", async () => {
    const calls: Call[] = [];
    const engine = createVisionEngine(loaderFor(calls), paths);
    await engine.load("quick");

    expect(Object.keys(await engine.caption("/photo/1.jpg"))).toHaveLength(1);
  });

  // 선언을 직접 읽는다 — 007이 배운 것.
  it("VisionRunResult 선언에 시간·토큰 자리가 없다", () => {
    const source = readFileSync(join(__dirname, "../../src/vision/vision-port.ts"), "utf8");
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    const declaration = code.slice(
      code.indexOf("export type VisionRunResult"),
      code.indexOf("export type VisionLoadResult"),
    );

    expect(declaration).toContain("text: string");
    expect(declaration).not.toMatch(/elapsed|duration|tokens|perSecond|confidence|score/i);
  });
});

describe("caption — 한 장씩 읽는다 (FR-001a)", () => {
  it("사진 하나만 넘긴다 — media_paths의 길이가 1이다", async () => {
    const calls: Call[] = [];
    const engine = createVisionEngine(loaderFor(calls), paths);
    await engine.load("quick");
    await engine.caption("/photo/1.jpg");

    const params = calls.find((c) => c.kind === "completion")?.detail as {
      media_paths: string[];
    };
    expect(params.media_paths).toEqual(["/photo/1.jpg"]);
  });

  it("content를 먼저 본다 — 005가 실기기에서 배운 것", async () => {
    const calls: Call[] = [];
    const engine = createVisionEngine(
      loaderFor(calls, { text: "무시될 것", content: "진짜 캡션" }),
      paths,
    );
    await engine.load("quick");

    expect((await engine.caption("/p.jpg")).text).toBe("진짜 캡션");
  });

  // E4 — 한 장의 실패가 나머지를 무너뜨리지 않는다.
  it("실패하면 빈 문자열이며 던지지 않는다 (E3·E4)", async () => {
    const calls: Call[] = [];
    const engine = createVisionEngine(loaderFor(calls, { completionThrows: true }), paths);
    await engine.load("quick");

    await expect(engine.caption("/p.jpg")).resolves.toEqual({ text: "" });
  });

  it("load를 건너뛰어도 던지지 않는다 (E3)", async () => {
    const engine = createVisionEngine(loaderFor([]), paths);
    await expect(engine.caption("/p.jpg")).resolves.toEqual({ text: "" });
  });

  // FR-034 — 읽는 중인 글이 화면에 닿을 경로가 코드에 없어야 한다.
  it("토큰 콜백을 넘기지 않는다 (FR-034)", async () => {
    const calls: Call[] = [];
    const engine = createVisionEngine(loaderFor(calls), paths);
    await engine.load("quick");
    await engine.caption("/p.jpg");

    const call = calls.find((c) => c.kind === "completion");
    // completion(params) 하나만 넘긴다 — 콜백 인자가 없다.
    expect(call?.detail).toBeDefined();
    const source = readFileSync(join(__dirname, "../../src/vision/vision-port.ts"), "utf8");
    expect(source).not.toMatch(/completion\([^)]*,\s*\(/);
  });
});

describe("V3. 어떻게 끝나든 정리된다 (E2)", () => {
  it("unload가 mmproj를 먼저 떼고 본체를 닫는다", async () => {
    const calls: Call[] = [];
    const engine = createVisionEngine(loaderFor(calls), paths);
    await engine.load("quick");
    calls.length = 0;

    await engine.unload();

    expect(calls.map((c) => c.kind)).toEqual(["releaseMultimodal", "release"]);
  });

  it("정리가 실패해도 던지지 않는다 — 다음 요청이 막히면 안 된다", async () => {
    const calls: Call[] = [];
    const engine = createVisionEngine(async () => {
      calls.push({ kind: "load" });
      return {
        async initMultimodal() {
          return true;
        },
        async getMultimodalSupport() {
          return { vision: true, audio: false };
        },
        async releaseMultimodal() {
          throw new Error("정리 실패");
        },
        async completion() {
          return { text: "x" };
        },
        async stopCompletion() {},
        async release() {
          throw new Error("정리 실패");
        },
      } as never;
    }, paths);

    await engine.load("quick");
    await expect(engine.unload()).resolves.toBeUndefined();
  });

  it("두 번 정리해도 괜찮다", async () => {
    const calls: Call[] = [];
    const engine = createVisionEngine(loaderFor(calls), paths);
    await engine.load("quick");

    await engine.unload();
    await expect(engine.unload()).resolves.toBeUndefined();
  });

  it("정리한 뒤에는 읽지 않는다", async () => {
    const calls: Call[] = [];
    const engine = createVisionEngine(loaderFor(calls), paths);
    await engine.load("quick");
    await engine.unload();

    expect((await engine.caption("/p.jpg")).text).toBe("");
  });
});

describe("stop — 이미 끝난 것을 멈춰도 괜찮다", () => {
  it("열려 있지 않아도 던지지 않는다", async () => {
    const engine = createVisionEngine(loaderFor([]), paths);
    await expect(engine.stop()).resolves.toBeUndefined();
  });

  it("stopCompletion을 부른다", async () => {
    const calls: Call[] = [];
    const engine = createVisionEngine(loaderFor(calls), paths);
    await engine.load("quick");
    await engine.stop();

    expect(calls.map((c) => c.kind)).toContain("stopCompletion");
  });
});

/**
 * V7 — 캡션이 일기의 샘플링을 함께 쓰지 않는다 (research §7, 원칙 I).
 *
 * 헌법 검사에도 규칙이 있지만, **여기서도 본다** — 검사가 둘이면 하나가 빠져도 남는다.
 */
describe("V7. 일기의 샘플링을 재사용하지 않는다 (원칙 I)", () => {
  it("inference/sampling을 import 하지 않는다", () => {
    const source = readFileSync(join(__dirname, "../../src/vision/vision-port.ts"), "utf8");
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    expect(code).not.toMatch(/from\s+["'][^"']*inference\/sampling["']/);
    expect(code).not.toMatch(/\bSAMPLING\b/);
  });

  it("캡션 온도가 일기와 다르다 — 관찰과 감상은 다르다", () => {
    expect(CAPTION_SAMPLING.temperature).toBeLessThan(SAMPLING.temperature);
  });

  /**
   * **값이 정반대인 것이 핵심이다.** 일기는 감상이라 흔들려도 되고, 캡션은 관찰이라
   * 흔들리면 같은 사진에서 다른 답이 나온다. **같은 자리에 둘 수 없는 값이다.**
   */
  it("캡션은 0.1이고 일기는 0.8이다 (옆 저장소 2026-08-10 실측)", () => {
    expect(CAPTION_SAMPLING.temperature).toBe(0.1);
    expect(SAMPLING.temperature).toBe(0.8);
  });
});
