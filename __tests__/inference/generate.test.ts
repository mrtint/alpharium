/**
 * generate() 계약 테스트.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/diary.md 「추론 어댑터 확장」
 *       specs/005-diary-generation/contracts/engine.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 파일이 헌법 원칙 I의 방어선이다.**
 *
 * ⚠️ **005에서 이 파일의 전제 하나가 바뀌었다.** 002는 「두 어댑터가 늘
 * `not-implemented`를 반환한다」를 검증했다. 005가 실제 생성을 붙였으므로 그 단언은
 * 더 이상 참이 아니며, **바뀌는 것이 목적이지 사고가 아니다**(tasks.md T034).
 *
 * 함께 고친 것: 요청의 시각 설정을 `"quick"`에서 `"none"`으로 바꿨다. `"quick"`은
 * 005 FR-022가 막는 값이 됐고, 그대로 두면 새 코드에서도 `not-implemented`가 나와
 * **테스트가 「우연히」 통과한다** — 통과의 이유가 바뀐 것을 놓치게 된다.
 *
 * **바뀌지 않은 것: 「실패 결과 어디에도 텍스트가 없다」**(FR-016, SC-004). 002가 세운
 * 이 불변식은 005에서도 그대로이며, 갈래가 늘었으므로 오히려 더 넓게 검증한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { buildRequest } from "../../src/diary/request";
import type { DiaryRequest, VisionSetting } from "../../src/diary/types";
import { createDesktopServerBackend } from "../../src/inference/desktop-server";
import { createOnDeviceBackend } from "../../src/inference/on-device";
import type { GenerationEngine } from "../../src/inference/engine-port";
import type { GenerationFailure, InferenceBackend } from "../../src/inference/types";
import { emptyDay, richDay, unknownDay } from "../../src/signals/fake";
import type { DaySignals } from "../../src/signals/types";

const GOOD_KO = "오늘 주인은 어딘가로 나섰다. 사진 세 장이 남았고 나는 그것만 안다.";

/**
 * 요청 하나를 만든다. buildRequest를 거쳐 실제 경로와 같은 모양을 쓴다.
 *
 * **시각 설정 기본값이 `"none"`이다** — 005 FR-022가 나머지 둘을 막으므로, 생성 경로를
 * 보려면 `none`이어야 한다.
 */
function requestFor(
  day: DaySignals = richDay("2026-08-12"),
  vision: VisionSetting = "none",
): DiaryRequest {
  const result = buildRequest(day, "quiet", vision);
  if (!result.ok) throw new Error("테스트 준비 실패: 요청을 만들지 못했다");
  return result.request;
}

/** 늘 통과할 글을 돌려주는 엔진 대역 */
const goodEngine = (): GenerationEngine => ({
  async load() {
    return { ok: true, warm: false };
  },
  async run() {
    return { text: GOOD_KO, ending: { kind: "eos" } };
  },
  async stop() {},
  async unload() {},
});

describe("005 — 온디바이스가 실제로 생성한다 (FR-001·004) ★", () => {
  it("엔진이 있으면 일기가 나온다", async () => {
    // **002 이후 처음이다.** 이 어댑터는 지금까지 not-implemented만 돌려줬다.
    const backend = createOnDeviceBackend(async () => ({}), goodEngine());

    const result = await backend.generate(requestFor());

    expect(result).toEqual(expect.objectContaining({ text: GOOD_KO }));
  });

  it("신호가 비어도 생성한다 (002 FR-005a·b)", async () => {
    // 휴대폰이 아무것도 보지 못한 것 자체가 일기의 내용이 된다(원칙 II).
    const backend = createOnDeviceBackend(async () => ({}), goodEngine());

    expect(await backend.generate(requestFor(emptyDay("2026-08-12")))).toEqual(
      expect.objectContaining({ text: GOOD_KO }),
    );
    expect(await backend.generate(requestFor(unknownDay("2026-08-12")))).toEqual(
      expect.objectContaining({ text: GOOD_KO }),
    );
  });
});

describe("005 — 엔진이 없으면 정직하게 말한다 (원칙 I)", () => {
  // 시뮬레이터·웹에는 네이티브 모듈이 없다. **그럴듯한 텍스트를 만들지 않는다.**
  it("backend-unavailable을 반환한다", async () => {
    const result = await createOnDeviceBackend(async () => ({})).generate(requestFor());

    expect("text" in result).toBe(false);
    if ("kind" in result) expect(result.kind).toBe("backend-unavailable");
  });

  it("데스크톱 어댑터는 아직 not-implemented다", async () => {
    // 데스크톱 경로는 서버 프로토콜이 서야 돈다(research §8). 없는 것을 없다고 말한다.
    const backend = createDesktopServerBackend("http://localhost:8080", async () => true);

    const result = await backend.generate(requestFor());

    expect("text" in result).toBe(false);
  });
});

describe("005 — 시각 설정을 조용히 낮추지 않는다 (FR-022, SC-009)", () => {
  it("none이면 생성이 진행된다", async () => {
    const backend = createOnDeviceBackend(async () => ({}), goodEngine());

    expect(await backend.generate(requestFor(richDay("2026-08-12"), "none"))).toEqual(
      expect.objectContaining({ text: GOOD_KO }),
    );
  });

  it.each(["quick", "detailed"] as const)(
    "%s면 사진을 보지 않은 일기가 대신 나오지 않는다",
    async (vision) => {
      // **`none`으로 조용히 낮추면 사용자가 요청하지 않은 일기가 나온다.**
      const backend = createOnDeviceBackend(async () => ({}), goodEngine());

      const result = await backend.generate(requestFor(richDay("2026-08-12"), vision));

      expect("text" in result).toBe(false);
      if ("kind" in result) expect(result.kind).toBe("not-implemented");
    },
  );

  it("막힌 요청은 모델을 열지도 않는다", async () => {
    // 열고 닫는 것은 비싸다. 어차피 못 할 일이면 시작하지 않는다.
    let loaded = false;
    const engine: GenerationEngine = {
      ...goodEngine(),
      async load() {
        loaded = true;
        return { ok: true, warm: false };
      },
    };

    await createOnDeviceBackend(async () => ({}), engine).generate(
      requestFor(richDay("2026-08-12"), "detailed"),
    );

    expect(loaded).toBe(false);
  });
});

describe("실패 결과에 텍스트가 없다 (002 FR-016, SC-004) — 원칙 I의 방어선", () => {
  /**
   * `GenerationFailure`의 어느 갈래에도 `text` 필드가 없어야 한다.
   * 있으면 그 순간 가짜 일기가 만들어질 자리가 생긴다.
   *
   * **005가 갈래를 넷 더했고, 전부 같은 불변식을 지킨다.**
   */
  const failures: readonly GenerationFailure[] = [
    { kind: "not-implemented" },
    { kind: "backend-unavailable", reason: "네이티브 모듈이 없다" },
    { kind: "generation-failed", reason: "추론 중 중단됐다" },
    // ─── 005가 더한 갈래 ───
    { kind: "model-load-failed", reason: "not-found" },
    { kind: "rejected", why: "empty" },
    { kind: "rejected", why: "echo" },
    { kind: "rejected", why: "language" },
    { kind: "rejected", why: "unfinished" },
    { kind: "timed-out" },
    { kind: "interrupted" },
  ];

  it.each(failures)("$kind 갈래에 text 필드가 없다", (failure) => {
    expect("text" in failure).toBe(false);
    expect(Object.keys(failure)).not.toContain("text");
  });

  it("거부 갈래가 거부된 글을 실어 나르지 않는다 (005 FR-017c)", () => {
    // `why`는 갈래일 뿐 글이 아니다. 글을 담으면 그것이 `text`가 새는 경로가 된다.
    const rejected: GenerationFailure = { kind: "rejected", why: "echo" };

    expect(Object.keys(rejected).sort()).toEqual(["kind", "why"]);
  });

  it("실패의 reason은 원인이지 일기 본문이 아니다", () => {
    // reason이 있는 갈래도 그것은 진단용 사실이지 사용자가 읽을 일기가 아니다.
    // 호출자가 reason을 일기 자리에 넣지 않도록 타입이 text와 이름을 달리한다.
    const failure: GenerationFailure = { kind: "generation-failed", reason: "중단됨" };

    expect(Object.keys(failure).sort()).toEqual(["kind", "reason"]);
  });

  it("판정이 거부한 결과에 본문이 없다", async () => {
    const rejecting: GenerationEngine = {
      ...goodEngine(),
      async run() {
        return { text: "이 글은 거부되어야 한다", ending: { kind: "length" } };
      },
    };
    const backend = createOnDeviceBackend(async () => ({}), rejecting);

    const result = await backend.generate(requestFor());

    expect(JSON.stringify(result)).not.toContain("이 글은 거부되어야 한다");
    expect("text" in result).toBe(false);
  });
});

describe("어느 어댑터도 예외를 던지지 않는다 (002 FR-019)", () => {
  const backends: readonly { name: string; make: () => InferenceBackend }[] = [
    {
      name: "온디바이스(엔진 있음)",
      make: () => createOnDeviceBackend(async () => ({}), goodEngine()),
    },
    { name: "온디바이스(엔진 없음)", make: () => createOnDeviceBackend(async () => ({})) },
    {
      name: "데스크톱 서버",
      make: () => createDesktopServerBackend("http://localhost:8080", async () => true),
    },
  ];

  it.each(backends)("$name: 실패는 값이다", async ({ make }) => {
    await expect(make().generate(requestFor())).resolves.toBeDefined();
  });

  it.each(backends)("$name: isAvailable()은 001 그대로 남아 있다", async ({ make }) => {
    const backend = make();

    expect(typeof backend.isAvailable).toBe("function");
    expect(await backend.isAvailable()).toEqual({ kind: "loaded" });
  });

  it("엔진이 던져도 값으로 돌아온다", async () => {
    const throwing: GenerationEngine = {
      ...goodEngine(),
      async run() {
        throw new Error("네이티브가 무너졌다");
      },
    };
    const backend = createOnDeviceBackend(async () => ({}), throwing);

    const result = await backend.generate(requestFor());

    expect("text" in result).toBe(false);
    if ("kind" in result) expect(result.kind).toBe("generation-failed");
  });
});

describe("요청에 맞춘 그럴듯한 답을 만들지 않는다 (원칙 I)", () => {
  it("엔진이 없으면 어떤 요청이든 같은 상태를 돌려준다", async () => {
    // 미리 만들어 둔 응답도, 요청을 보고 지어낸 텍스트도 없다.
    const backend = createOnDeviceBackend(async () => ({}));

    const forRich = await backend.generate(requestFor(richDay("2026-08-12")));
    const forEmpty = await backend.generate(requestFor(emptyDay("2026-08-13")));

    expect(forRich).toEqual(forEmpty);
    expect("text" in forRich).toBe(false);
  });
});

/* ═══════════════ 011 — 사진을 읽고 그 내용이 프롬프트에 닿는다 ═══════════════ */

/**
 * 계약: specs/011-photo-vision-summary/contracts/vision-engine.md
 *       specs/011-photo-vision-summary/plan.md 「E1 순서」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 이 묶음이 이 기능의 조용한 실패를 막는 그물이다.**
 *
 * 이 저장소에서 반복된 실패는 **오류 없이 아무 일도 일어나지 않는 것**이었다:
 * 006의 `GenerationProbe`, 007의 끊긴 `stop` 배선, 008의 버려진 반환값, 009의 `day:`.
 *
 * **시각 처리의 같은 실패는 「캡션이 프롬프트에 안 들어갔는데 일기는 멀쩡히 나오는 것」이다.**
 * 그래서 아래 첫 테스트가 **엔진이 받은 프롬프트를 직접 읽는다** — 009의 W-T1과 같은 구조.
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("011 — 사진을 읽는다", () => {
  /** 엔진이 받은 프롬프트를 기록하는 대역 */
  const recordingEngine = (seen: string[]): GenerationEngine => ({
    async load() {
      return { ok: true, warm: false };
    },
    async run(prompt: string) {
      seen.push(prompt);
      return { text: GOOD_KO, ending: { kind: "eos" } };
    },
    async stop() {},
    async unload() {},
  });

  const pathOf = async (photo: { id: string }) => `/photo/${photo.id}.jpg`;

  /** 사진을 읽는 대역. 열림·닫힘을 기록한다 */
  function fakeVision(opened: string[], captionText = "창가에 놓인 커피잔") {
    return {
      engine: {
        async load(depth: string) {
          opened.push(`vision:load:${depth}`);
          return { ok: true as const };
        },
        async caption() {
          opened.push("vision:caption");
          return { text: captionText };
        },
        async stop() {
          opened.push("vision:stop");
        },
        async unload() {
          opened.push("vision:unload");
        },
      },
      resolvePath: pathOf,
    };
  }

  /** 사진 엔진을 열지 못하는 대역 */
  const brokenVision = (reason: "not-found" | "load-failed") => ({
    engine: {
      async load() {
        return { ok: false as const, reason };
      },
      async caption() {
        return { text: "" };
      },
      async stop() {},
      async unload() {},
    },
    resolvePath: pathOf,
  });

  // ★ T031 — 이 기능의 배선 검증.
  it("★ 캡션이 실제로 프롬프트에 들어간다", async () => {
    const prompts: string[] = [];
    const backend = createOnDeviceBackend(
      async () => ({}),
      recordingEngine(prompts),
      180_000,
      fakeVision([]),
    );

    const result = await backend.generate(requestFor(richDay("2026-08-12"), "quick"));

    expect("text" in result).toBe(true);
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain("창가에 놓인 커피잔");
    expect(prompts[0]).toContain("사진에 담긴 것:");
  });

  it("「보지 않음」이면 캡션이 프롬프트에 없다 (FR-003, SC-002)", async () => {
    const prompts: string[] = [];
    const opened: string[] = [];
    const backend = createOnDeviceBackend(
      async () => ({}),
      recordingEngine(prompts),
      180_000,
      fakeVision(opened),
    );

    await backend.generate(requestFor(richDay("2026-08-12"), "none"));

    expect(prompts[0]).not.toContain("사진에 담긴 것:");
    // **사진 읽기를 아예 시작하지 않는다** — 10초를 쓰지 않는다.
    expect(opened).toEqual([]);
  });

  /**
   * ★ E1 — 이것을 어기면 GB 단위 모델 둘이 동시에 열려 **기기가 죽는다.**
   *
   * research §2가 「미관측」으로 남긴 자리이며, quickstart D3이 실기기에서 잰다.
   * 여기서는 **순서만이라도** 기기 없이 못 박는다.
   */
  it("★ E1. 캐릭터 모델을 열기 전에 사진 엔진을 완전히 닫는다", async () => {
    const order: string[] = [];
    const engine: GenerationEngine = {
      async load() {
        order.push("character:load");
        return { ok: true, warm: false };
      },
      async run() {
        order.push("character:run");
        return { text: GOOD_KO, ending: { kind: "eos" } };
      },
      async stop() {},
      async unload() {
        order.push("character:unload");
      },
    };

    const backend = createOnDeviceBackend(async () => ({}), engine, 180_000, fakeVision(order));
    await backend.generate(requestFor(richDay("2026-08-12"), "quick"));

    // 사진 엔진의 unload가 캐릭터 모델의 load보다 **먼저** 와야 한다.
    expect(order.indexOf("vision:unload")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("character:load")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("vision:unload")).toBeLessThan(order.indexOf("character:load"));
  });

  it("사진 엔진이 실패해도 닫힌다 (E2)", async () => {
    const opened: string[] = [];
    const vision = {
      engine: {
        async load() {
          opened.push("vision:load");
          return { ok: true as const };
        },
        async caption(): Promise<{ text: string }> {
          throw new Error("무너졌다");
        },
        async stop() {},
        async unload() {
          opened.push("vision:unload");
        },
      },
      resolvePath: pathOf,
    };

    const backend = createOnDeviceBackend(async () => ({}), goodEngine(), 180_000, vision);
    await backend.generate(requestFor(richDay("2026-08-12"), "quick"));

    expect(opened).toContain("vision:unload");
  });

  /**
   * ★ FR-021 — 005 FR-022의 판단을 잇는다.
   *
   * **「보지 않음」으로 조용히 낮추지 않는다.** 사용자가 「빠르게 봄」을 골랐는데 사진을
   * 보지 않은 일기가 나오면, 그 일기는 사용자가 요청한 것이 아니다.
   */
  it("★ 사진을 못 보면 일기를 주지 않는다 — none으로 낮추지 않는다 (FR-021)", async () => {
    const prompts: string[] = [];
    const backend = createOnDeviceBackend(
      async () => ({}),
      recordingEngine(prompts),
      180_000,
      brokenVision("not-found"),
    );

    const result = await backend.generate(requestFor(richDay("2026-08-12"), "quick"));

    expect(result).toEqual({ kind: "vision-failed", reason: "not-ready" });
    // **생성을 아예 시도하지 않는다** — 사진을 안 본 일기가 나올 경로가 없다.
    expect(prompts).toEqual([]);
  });

  it("실패 갈래에 text가 없다 (002 FR-016)", async () => {
    const backend = createOnDeviceBackend(
      async () => ({}),
      goodEngine(),
      180_000,
      brokenVision("load-failed"),
    );
    const result = await backend.generate(requestFor(richDay("2026-08-12"), "quick"));

    expect("text" in result).toBe(false);
    expect(result).toEqual({ kind: "vision-failed", reason: "failed" });
  });

  it("사진을 읽을 수단이 없으면 여전히 not-implemented다", async () => {
    const backend = createOnDeviceBackend(async () => ({}), goodEngine());
    const result = await backend.generate(requestFor(richDay("2026-08-12"), "quick"));

    expect(result).toEqual({ kind: "not-implemented" });
  });

  it("깊이가 설정에서 온다 (FR-019)", async () => {
    const quick: string[] = [];
    await createOnDeviceBackend(
      async () => ({}),
      goodEngine(),
      180_000,
      fakeVision(quick),
    ).generate(requestFor(richDay("2026-08-12"), "quick"));

    const detailed: string[] = [];
    await createOnDeviceBackend(
      async () => ({}),
      goodEngine(),
      180_000,
      fakeVision(detailed),
    ).generate(requestFor(richDay("2026-08-12"), "detailed"));

    expect(quick).toContain("vision:load:quick");
    expect(detailed).toContain("vision:load:detailed");
  });

  // FR-009 — 그만두면 거기까지 읽은 것을 버린다.
  it("★ 그만두면 사진 읽기가 끊기고 일기가 나오지 않는다 (FR-009)", async () => {
    const prompts: string[] = [];
    let stopIt: () => Promise<void> = async () => {};

    const vision = {
      engine: {
        async load() {
          return { ok: true as const };
        },
        async caption() {
          // 첫 장을 읽는 동안 사용자가 그만둔다.
          await stopIt();
          return { text: "읽은 것" };
        },
        async stop() {},
        async unload() {},
      },
      resolvePath: pathOf,
    };

    const backend = createOnDeviceBackend(
      async () => ({}),
      recordingEngine(prompts),
      180_000,
      vision,
    );
    stopIt = () => backend.stop();

    const result = await backend.generate(requestFor(richDay("2026-08-12"), "quick"));

    expect(result).toEqual({ kind: "vision-failed", reason: "cancelled" });
    // **거기까지 읽은 것으로 일기를 쓰지 않는다.**
    expect(prompts).toEqual([]);
  });
});

/* ═══════════════ 015 — 쓰는 중 독백: onStage 진행 신호 ═══════════════ */

/**
 * 계약: specs/015-writing-monologue/contracts/progress-signal.md
 *       specs/015-writing-monologue/contracts/photo-advance.md
 *       specs/015-writing-monologue/data-model.md 「onStage 콜백」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`"vision"`의 유일한 발생원은 `captionAll()`의 `onPhotoStart`다.**
 *
 * `generate()`가 `readPhotos()` 호출 직전에 별도로 `onStage("vision")`을 보내면
 * 사진 1장에서 신호가 2번(진입 1회 + `onPhotoStart` 1회) 나가는 이중 발화가
 * 재발한다(2026-08-23 `/speckit-analyze` C1) — 그 회귀를 여기서 못박는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("015 — onStage 진행 신호", () => {
  const pathOf = async (photo: { id: string }) => `/photo/${photo.id}.jpg`;

  function fakeVision(captionText = "창가에 놓인 커피잔") {
    return {
      engine: {
        async load() {
          return { ok: true as const };
        },
        async caption() {
          return { text: captionText };
        },
        async stop() {},
        async unload() {},
      },
      resolvePath: pathOf,
    };
  }

  it("engine.run() 직전에 onStage가 'generation'으로 불린다", async () => {
    const stages: string[] = [];
    const engine: GenerationEngine = {
      async load() {
        return { ok: true, warm: false };
      },
      async run() {
        // run()이 불린 시점에는 이미 'generation'이 보내졌어야 한다.
        expect(stages).toContain("generation");
        return { text: GOOD_KO, ending: { kind: "eos" } };
      },
      async stop() {},
      async unload() {},
    };
    const backend = createOnDeviceBackend(async () => ({}), engine);

    await backend.generate(requestFor(), (stage) => stages.push(stage));

    expect(stages).toContain("generation");
  });

  it("onStage를 안 넘겨도 기존 성공 경로가 그대로 동작한다 (옵셔널 확장)", async () => {
    const backend = createOnDeviceBackend(async () => ({}), goodEngine());

    const result = await backend.generate(requestFor());

    expect(result).toEqual(expect.objectContaining({ text: GOOD_KO }));
  });

  it("onStage를 안 넘겨도 실패 경로가 그대로 동작한다", async () => {
    const backend = createOnDeviceBackend(async () => ({}));

    const result = await backend.generate(requestFor());

    expect("kind" in result && result.kind).toBe("backend-unavailable");
  });

  it("사진 N장 → onStage가 장 전환마다 정확히 N번만 'vision'(branch 없음)으로 불린다 (2배가 아니다, C1)", async () => {
    const stages: [string, string | undefined][] = [];
    const backend = createOnDeviceBackend(async () => ({}), goodEngine(), 180_000, fakeVision());

    // richDay는 사진 3장을 준다 — generate()가 readPhotos() 앞에서 별도로
    // "vision"(장 전환용)을 보내면 3(진입) + 3(onPhotoStart) = 6이 되어 이
    // 검사가 잡는다.
    //
    // 016 — `readPhotos()`가 `captionAll()` 호출 **전에** branch(많음/보통)를
    // 실은 "vision" 신호를 한 번 더 보낸다(별도 계약, research.md §3) — 이
    // 신호는 `branch`가 있다는 점으로 `onPhotoStart`(장 전환, branch 없음)와
    // 구분된다. 여기서는 `branch`가 없는 장 전환 신호만 세어 015의 원래
    // 의도(장 전환 신호가 이중 발화하지 않는다)를 그대로 검증한다.
    await backend.generate(requestFor(richDay("2026-08-12"), "quick"), (stage, branch) =>
      stages.push([stage, branch]),
    );

    const photoAdvanceSignals = stages.filter(([s, b]) => s === "vision" && b === undefined);
    expect(photoAdvanceSignals).toHaveLength(3);
  });

  it("generate()는 'vision'(branch 없음)을 직접 보내지 않는다 — readPhotos() 호출 전에는 장 전환 신호가 없다", async () => {
    const stages: [string, string | undefined][] = [];
    let visionLoaded = false;
    const vision = {
      engine: {
        async load() {
          visionLoaded = true;
          return { ok: true as const };
        },
        async caption() {
          // 캡션이 시작된 시점에는 016의 branch 신호(1회) + 첫 onPhotoStart
          // (1회) = 2번의 'vision'이 왔어야 한다 — `readPhotos()` 호출 직전에
          // `generate()`가 별도로 장 전환 신호를 만들어 보내지는 않는다는
          // 것의 증거는 branch 없는 신호가 정확히 1개(첫 장 전환)라는 사실로
          // 확인한다.
          expect(stages.filter(([s]) => s === "vision")).toHaveLength(2);
          expect(stages.filter(([s, b]) => s === "vision" && b === undefined)).toHaveLength(1);
          return { text: "창가에 놓인 커피잔" };
        },
        async stop() {},
        async unload() {},
      },
      resolvePath: pathOf,
    };
    const backend = createOnDeviceBackend(async () => ({}), goodEngine(), 180_000, vision);

    await backend.generate(requestFor(richDay("2026-08-12"), "quick"), (stage, branch) =>
      stages.push([stage, branch]),
    );

    expect(visionLoaded).toBe(true);
  });
});

/* ═══════════ 016 — 모델 로드 신호 (콜드/핫) ═══════════ */

/**
 * 계약: specs/016-writing-monologue-expansion/contracts/load-signal.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **로드 신호는 두 단계다** — 로드 시작(branch 없음, 아직 콜드/핫 모름)과
 * 로드 완료(branch 확정). 로드가 실패하면 확정 신호는 오지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("016 — onStage 모델 로드 신호", () => {
  type Signal = [stage: string, branch: string | undefined];

  it("engine.load() 직전에 onStage가 ('load')(branch 없음)로 불린다", async () => {
    const signals: Signal[] = [];
    const engine: GenerationEngine = {
      async load() {
        // load()가 불린 시점에는 이미 로드 시작 신호가 보내졌어야 한다.
        expect(signals).toContainEqual(["load", undefined]);
        return { ok: true, warm: false };
      },
      async run() {
        return { text: GOOD_KO, ending: { kind: "eos" } };
      },
      async stop() {},
      async unload() {},
    };
    const backend = createOnDeviceBackend(async () => ({}), engine);

    await backend.generate(requestFor(), (stage, branch) => signals.push([stage, branch]));

    expect(signals).toContainEqual(["load", undefined]);
  });

  it("로드 성공(warm: false)이면 그 직후 onStage가 ('load', 'cold')로 불린다", async () => {
    const signals: Signal[] = [];
    const backend = createOnDeviceBackend(async () => ({}), goodEngine());

    await backend.generate(requestFor(), (stage, branch) => signals.push([stage, branch]));

    expect(signals).toContainEqual(["load", "cold"]);
    expect(signals).not.toContainEqual(["load", "hot"]);
  });

  it("로드 성공(warm: true)이면 그 직후 onStage가 ('load', 'hot')로 불린다", async () => {
    const signals: Signal[] = [];
    const engine: GenerationEngine = {
      async load() {
        return { ok: true, warm: true };
      },
      async run() {
        return { text: GOOD_KO, ending: { kind: "eos" } };
      },
      async stop() {},
      async unload() {},
    };
    const backend = createOnDeviceBackend(async () => ({}), engine);

    await backend.generate(requestFor(), (stage, branch) => signals.push([stage, branch]));

    expect(signals).toContainEqual(["load", "hot"]);
    expect(signals).not.toContainEqual(["load", "cold"]);
  });

  it("로드 실패 시 확정 신호(cold/hot)도 generation도 오지 않는다 (FR-011)", async () => {
    const signals: Signal[] = [];
    const engine: GenerationEngine = {
      async load() {
        return { ok: false, reason: "not-found" };
      },
      async run() {
        return { text: GOOD_KO, ending: { kind: "eos" } };
      },
      async stop() {},
      async unload() {},
    };
    const backend = createOnDeviceBackend(async () => ({}), engine);

    const result = await backend.generate(requestFor(), (stage, branch) =>
      signals.push([stage, branch]),
    );

    expect(signals).toContainEqual(["load", undefined]);
    expect(signals).not.toContainEqual(["load", "cold"]);
    expect(signals).not.toContainEqual(["load", "hot"]);
    expect(signals).not.toContainEqual(["generation", undefined]);
    expect("kind" in result && result.kind).toBe("model-load-failed");
  });

  it("onStage를 안 넘겨도 로드 경로가 그대로 동작한다 (옵셔널 확장)", async () => {
    const backend = createOnDeviceBackend(async () => ({}), goodEngine());

    const result = await backend.generate(requestFor());

    expect(result).toEqual(expect.objectContaining({ text: GOOD_KO }));
  });
});

/* ═══════════ 016 — 로드 도중 취소 (FR-013) ═══════════ */

/**
 * 계약: specs/016-writing-monologue-expansion/contracts/load-signal.md
 *       「취소 — 로드 자체는 중단되지 않는다」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **로드 자체를 멈출 수는 없다**(research.md §7 — `llama.rn`에 로드 취소
 * API가 없다). 로드가 끝난 직후 취소 상태를 재확인해 결과를 버린다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("016 — 로드 도중 취소 (FR-013)", () => {
  it("로드 완료 시점에 취소 상태면 확정 신호·generation을 보내지 않고 unload한다", async () => {
    const signals: [string, string | undefined][] = [];
    let unloaded = false;
    const engine: GenerationEngine = {
      async load() {
        return { ok: true, warm: false };
      },
      async run() {
        throw new Error("취소됐으면 run()이 불려서는 안 된다");
      },
      async stop() {
        // stop()이 취소 신호를 세운다(007 기존 동작) — 다음 load() 완료 시점에
        // 반영된다.
      },
      async unload() {
        unloaded = true;
      },
    };
    const backend = createOnDeviceBackend(async () => ({}), engine);

    const generatePromise = backend.generate(requestFor(), (stage, branch) =>
      signals.push([stage, branch]),
    );
    // 로드 시작 직후, 완료되기 전에 그만두기를 누른 것을 흉내낸다.
    await backend.stop();
    const result = await generatePromise;

    expect(signals).not.toContainEqual(["load", "cold"]);
    expect(signals).not.toContainEqual(["load", "hot"]);
    expect(signals).not.toContainEqual(["generation", undefined]);
    expect(unloaded).toBe(true);
    expect(result).toEqual({ kind: "interrupted" });
  });

  it("취소하지 않으면 기존 시나리오와 동일하게 동작한다 (회귀 확인)", async () => {
    const signals: [string, string | undefined][] = [];
    const backend = createOnDeviceBackend(async () => ({}), goodEngine());

    const result = await backend.generate(requestFor(), (stage, branch) =>
      signals.push([stage, branch]),
    );

    expect(signals).toContainEqual(["load", "cold"]);
    expect(signals).toContainEqual(["generation", undefined]);
    expect(result).toEqual(expect.objectContaining({ text: GOOD_KO }));
  });
});

/* ═══════════ 016 — 사진 보기 갈래(많음/보통) 신호 ═══════════ */

/**
 * 계약: specs/016-writing-monologue-expansion/research.md §3
 *       specs/016-writing-monologue-expansion/contracts/load-signal.md
 *
 * `selectForVision()`이 고른 장수가 상한(VISION_PHOTO_LIMIT=5)에 닿았는지로
 * many/normal을 가른다. `readPhotos()`가 `captionAll()` 호출 전에 이 신호를
 * 한 번 보낸다 — 015의 `onPhotoStart`(장 전환, branch 없음) 계약은 그대로다.
 */
describe("016 — 사진 보기 갈래(많음/보통) 신호", () => {
  const pathOf = async (photo: { id: string }) => `/photo/${photo.id}.jpg`;

  function fakeVision() {
    return {
      engine: {
        async load() {
          return { ok: true as const };
        },
        async caption() {
          return { text: "창가에 놓인 커피잔" };
        },
        async stop() {},
        async unload() {},
      },
      resolvePath: pathOf,
    };
  }

  function dayWithPhotos(count: number): DaySignals {
    const base = richDay("2026-08-12");
    if (base.photos.kind !== "known") throw new Error("테스트 준비 실패");
    return {
      ...base,
      photos: {
        kind: "known",
        value: {
          photos: Array.from({ length: count }, (_, i) => ({
            id: `fake-photo-${i}`,
            takenAt: new Date(`2026-08-12T${String(9 + i).padStart(2, "0")}:00:00`),
          })),
          complete: true,
        },
      },
    };
  }

  it("사진이 상한(5장)에 닿으면 onStage가 ('vision', 'many')로 불린다", async () => {
    const signals: [string, string | undefined][] = [];
    const backend = createOnDeviceBackend(async () => ({}), goodEngine(), 180_000, fakeVision());

    await backend.generate(requestFor(dayWithPhotos(5), "quick"), (stage, branch) =>
      signals.push([stage, branch]),
    );

    expect(signals).toContainEqual(["vision", "many"]);
    expect(signals).not.toContainEqual(["vision", "normal"]);
  });

  it("사진이 상한보다 많아도(12장) 'many'다", async () => {
    const signals: [string, string | undefined][] = [];
    const backend = createOnDeviceBackend(async () => ({}), goodEngine(), 180_000, fakeVision());

    await backend.generate(requestFor(dayWithPhotos(12), "quick"), (stage, branch) =>
      signals.push([stage, branch]),
    );

    expect(signals).toContainEqual(["vision", "many"]);
  });

  it("사진이 상한 미만이면(3장) onStage가 ('vision', 'normal')로 불린다", async () => {
    const signals: [string, string | undefined][] = [];
    const backend = createOnDeviceBackend(async () => ({}), goodEngine(), 180_000, fakeVision());

    await backend.generate(requestFor(dayWithPhotos(3), "quick"), (stage, branch) =>
      signals.push([stage, branch]),
    );

    expect(signals).toContainEqual(["vision", "normal"]);
    expect(signals).not.toContainEqual(["vision", "many"]);
  });

  it("사진이 0장이거나 vision이 꺼져 있으면 vision 신호 자체가 없다 (015 계약 유지)", async () => {
    const signals: [string, string | undefined][] = [];
    const backend = createOnDeviceBackend(async () => ({}), goodEngine(), 180_000, fakeVision());

    await backend.generate(requestFor(dayWithPhotos(3), "none"), (stage, branch) =>
      signals.push([stage, branch]),
    );

    expect(signals.filter(([s]) => s === "vision")).toHaveLength(0);
  });
});
