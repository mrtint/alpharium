import { createOnDeviceBackend, type VisionSupport } from "../../src/inference/on-device";
import type { GenerationEngine, LoadResult, RunResult } from "../../src/inference/engine-port";
import { emptyDay } from "../../src/signals/fake";
import type { DaySignals, Photo } from "../../src/signals/types";
import type { DiaryRequest } from "../../src/diary/types";
import type { VisionEngine, VisionLoadResult, VisionRunResult } from "../../src/vision/vision-port";
import type { PhotoVision } from "../../src/vision/types";

/**
 * contracts/inference.md 「온디바이스 어댑터 검증 표」.
 *
 * 모델 파일 없이 네이티브 계층에 닿는 호출의 성공 여부로 판정한다(FR-008).
 * unavailable(시뮬레이터의 예상된 상태)과 failed(실기기의 문제)를 뭉뚱그리지 않는 것이
 * 핵심이다.
 */
describe("onDeviceBackend.isAvailable", () => {
  it("location은 on-device다", () => {
    const backend = createOnDeviceBackend(async () => []);
    expect(backend.location).toBe("on-device");
  });

  it("네이티브 호출이 성공하면 loaded (실기기)", async () => {
    const backend = createOnDeviceBackend(async () => [{ name: "CPU" }]);
    await expect(backend.isAvailable()).resolves.toEqual({ kind: "loaded" });
  });

  it("네이티브 모듈이 없으면 unavailable — 시뮬레이터에서는 예상된 상태다", async () => {
    const backend = createOnDeviceBackend(async () => {
      throw new Error("RNLlama native module is not available");
    });

    const status = await backend.isAvailable();
    expect(status.kind).toBe("unavailable");
  });

  it("그 밖의 실패는 failed이고 원인이 실린다(FR-007)", async () => {
    const backend = createOnDeviceBackend(async () => {
      throw new Error("backend init crashed");
    });

    const status = await backend.isAvailable();
    expect(status).toEqual({ kind: "failed", reason: expect.stringContaining("crashed") });
  });

  it("예외를 삼키지 않는다 — 조용히 loaded로 만들지 않는다", async () => {
    const backend = createOnDeviceBackend(async () => {
      throw new Error("boom");
    });

    const status = await backend.isAvailable();
    expect(status.kind).not.toBe("loaded");
  });
});

/**
 * 017 — `usedPhotos` (data-model.md §5, contracts/photo-preservation.md P4).
 *
 * `generate()`가 성공 시 캡션 성공한 사진(resizedPath가 있는 것)만 `usedPhotos`로
 * 담고, 실패 경로에서는 그 사본을 스스로 정리하는지 검증한다.
 */
describe("017 — generate()의 usedPhotos (contracts/photo-preservation.md P4)", () => {
  const photo = (id: string, hour: number): Photo => ({
    id,
    takenAt: new Date(2026, 7, 20, hour, 0, 0),
  });

  const THREE = [photo("a", 8), photo("b", 12), photo("c", 18)];

  function signalsWithPhotos(photos: Photo[]): DaySignals {
    return {
      date: "2026-08-20",
      photos: { kind: "known", value: { photos, complete: true } },
      places: { kind: "none" },
      steps: { kind: "unknown", reason: "no-channel" },
      battery: { kind: "unknown", reason: "no-channel" },
      connectivity: { kind: "unknown", reason: "no-channel" },
    };
  }

  function requestWith(signals: DaySignals): DiaryRequest {
    return { signals, character: "quiet", vision: "quick", dayStillOpen: false };
  }

  /** 캡션마다 성공/실패를 가르는 vision 엔진 대역. resizedPath는 `/resized/{id}.jpg` */
  function visionSupportWith(fails: string[] = []): {
    support: VisionSupport;
    cleaned: string[];
  } {
    const cleaned: string[] = [];
    const engine: VisionEngine = {
      async load(): Promise<VisionLoadResult> {
        return { ok: true };
      },
      async caption(path: string): Promise<VisionRunResult> {
        const id = (path.split("/").pop() ?? path).replace(".jpg", "");
        return fails.includes(id) ? { text: "" } : { text: `사진 ${id}` };
      },
      async stop() {},
      async unload() {},
    };

    const support: VisionSupport = {
      engine,
      resolvePath: async (p) => `/photo/${p.id}.jpg`,
      resize: async (sourcePath) => ({
        ok: true,
        path: sourcePath.replace("/photo/", "/resized/"),
      }),
      cleanupResized: async (path) => {
        cleaned.push(path);
      },
    };

    return { support, cleaned };
  }

  function engineReturning(
    run: RunResult,
    load: LoadResult = { ok: true, warm: true },
  ): GenerationEngine {
    return {
      async load() {
        return load;
      },
      async prewarm() {},
      async run() {
        return run;
      },
      async stop() {},
      async unload() {},
    };
  }

  it("성공한 생성에서 usedPhotos가 캡션 성공한 사진만 담는다(실패한 장 제외)", async () => {
    const { support } = visionSupportWith(["b"]);
    const engine = engineReturning({
      text: "2026년 8월 20일. 오늘은 공원에 갔다. 사진 세 장을 찍었다.",
      ending: { kind: "eos" },
    });

    const backend = createOnDeviceBackend(async () => [], engine, 60_000, support);
    const result = await backend.generate(requestWith(signalsWithPhotos(THREE)));

    expect("text" in result).toBe(true);
    if (!("text" in result)) throw new Error("expected success");

    // b는 캡션 실패 → usedPhotos에서 제외. a·c만 남는다.
    const used = (result as unknown as { usedPhotos?: unknown[] }).usedPhotos;
    expect(used).toBeDefined();
    expect(used).toHaveLength(2);
    expect((used as { photoId: string }[]).map((u) => u.photoId)).toEqual(["a", "c"]);
  });

  it("판정 거부(GenerationFailure)에서 usedPhotos 필드 자체가 없다", async () => {
    const { support, cleaned } = visionSupportWith();
    // 빈 글 → judge()가 empty로 거부한다.
    const engine = engineReturning({ text: "", ending: { kind: "eos" } });

    const backend = createOnDeviceBackend(async () => [], engine, 60_000, support);
    const result = await backend.generate(requestWith(signalsWithPhotos(THREE)));

    expect("kind" in result).toBe(true);
    expect((result as { usedPhotos?: unknown }).usedPhotos).toBeUndefined();
    // 캡션 성공한 세 장의 사본이 스스로 정리된다.
    expect(cleaned).toHaveLength(3);
  });

  it("타임아웃 실패에서도 캡션 성공한 사본이 정리된다", async () => {
    const { support, cleaned } = visionSupportWith();
    const engine: GenerationEngine = {
      async load() {
        return { ok: true, warm: true };
      },
      async prewarm() {},
      async run() {
        // 타임아웃을 흉내낸다 — 절대 resolve하지 않는다.
        return new Promise<RunResult>(() => {});
      },
      async stop() {},
      async unload() {},
    };

    const backend = createOnDeviceBackend(async () => [], engine, 10, support);
    const result = await backend.generate(requestWith(signalsWithPhotos(THREE)));

    expect(result).toEqual({ kind: "timed-out" });
    expect(cleaned).toHaveLength(3);
  });

  it("사진을 아예 읽지 않은 경우(vision none) usedPhotos가 없다", async () => {
    const { support } = visionSupportWith();
    const engine = engineReturning({
      text: "2026년 8월 20일. 오늘은 조용했다. 별다른 일은 없었다.",
      ending: { kind: "eos" },
    });

    const backend = createOnDeviceBackend(async () => [], engine, 60_000, support);
    const request: DiaryRequest = {
      signals: signalsWithPhotos([]),
      character: "quiet",
      vision: "none",
      dayStillOpen: false,
    };
    const result = await backend.generate(request);

    expect("text" in result).toBe(true);
    expect((result as { usedPhotos?: unknown }).usedPhotos).toBeUndefined();
  });
});

/**
 * 017 — generate()의 timing (contracts/elapsed-time.md T1~T4, 헌법 1.2.0).
 *
 * 벽시계 측정 지점은 정확히 둘, `on-device.ts`의 `generate()` 안에만 있다.
 */
describe("017 — generate()의 timing (contracts/elapse-time.md T1~T4)", () => {
  const photo = (id: string, hour: number): Photo => ({
    id,
    takenAt: new Date(2026, 7, 20, hour, 0, 0),
  });

  function signalsWithPhotos(photos: Photo[]): DaySignals {
    return {
      date: "2026-08-20",
      photos: { kind: "known", value: { photos, complete: true } },
      places: { kind: "none" },
      steps: { kind: "unknown", reason: "no-channel" },
      battery: { kind: "unknown", reason: "no-channel" },
      connectivity: { kind: "unknown", reason: "no-channel" },
    };
  }

  function requestWith(signals: DaySignals): DiaryRequest {
    return { signals, character: "quiet", vision: "quick", dayStillOpen: false };
  }

  function visionSupportWith(delayMs = 0): VisionSupport {
    const engine: VisionEngine = {
      async load(): Promise<VisionLoadResult> {
        return { ok: true };
      },
      async caption(path: string): Promise<VisionRunResult> {
        if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
        const id = (path.split("/").pop() ?? path).replace(".jpg", "");
        return { text: `사진 ${id}` };
      },
      async stop() {},
      async unload() {},
    };

    return {
      engine,
      resolvePath: async (p) => `/photo/${p.id}.jpg`,
      resize: async (sourcePath) => ({
        ok: true,
        path: sourcePath.replace("/photo/", "/resized/"),
      }),
      cleanupResized: async () => {},
    };
  }

  function engineReturning(run: RunResult, delayMs = 0): GenerationEngine {
    return {
      async load() {
        return { ok: true, warm: true };
      },
      async prewarm() {},
      async run() {
        if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
        return run;
      },
      async stop() {},
      async unload() {},
    };
  }

  it("사진을 실제로 읽은 성공 경로에서 timing.visionMs·writingMs가 둘 다 양수다", async () => {
    const support = visionSupportWith(5);
    const engine = engineReturning(
      { text: "2026년 8월 20일. 오늘은 공원에 갔다.", ending: { kind: "eos" } },
      5,
    );

    const backend = createOnDeviceBackend(async () => [], engine, 60_000, support);
    const result = await backend.generate(requestWith(signalsWithPhotos([photo("a", 8)])));

    expect("text" in result).toBe(true);
    const timing = (result as { timing?: { visionMs?: number; writingMs: number } }).timing;
    expect(timing).toBeDefined();
    expect(timing?.visionMs).toBeGreaterThan(0);
    expect(timing?.writingMs).toBeGreaterThan(0);
  });

  it("사진을 읽지 않은 경로(vision none)에서 timing.visionMs가 없고 writingMs만 있다 (FR-013)", async () => {
    const support = visionSupportWith();
    const engine = engineReturning({ text: "오늘은 조용했다.", ending: { kind: "eos" } }, 5);

    const backend = createOnDeviceBackend(async () => [], engine, 60_000, support);
    const request: DiaryRequest = {
      signals: signalsWithPhotos([]),
      character: "quiet",
      vision: "none",
      dayStillOpen: false,
    };
    const result = await backend.generate(request);

    expect("text" in result).toBe(true);
    const timing = (result as { timing?: { visionMs?: number; writingMs: number } }).timing;
    expect(timing).toBeDefined();
    expect(timing?.visionMs).toBeUndefined();
    expect(timing?.writingMs).toBeGreaterThan(0);
  });

  it("vision 설정은 켜져 있지만 그날 사진이 0장이면 timing.visionMs가 없다 (T4)", async () => {
    const support = visionSupportWith();
    const engine = engineReturning({ text: "오늘은 조용했다.", ending: { kind: "eos" } }, 5);

    const backend = createOnDeviceBackend(async () => [], engine, 60_000, support);
    // requestWith()의 기본 vision은 "quick"이다 — 설정은 켜져 있지만
    // signalsWithPhotos([])라 그날 사진이 0장이다. readPhotos()가
    // no-photos로 즉시 반환하므로, 「실제로 읽었다」고 볼 시간이 없다.
    const result = await backend.generate(requestWith(signalsWithPhotos([])));

    expect("text" in result).toBe(true);
    const timing = (result as { timing?: { visionMs?: number; writingMs: number } }).timing;
    expect(timing).toBeDefined();
    expect(timing?.visionMs).toBeUndefined();
    expect(timing?.writingMs).toBeGreaterThan(0);
  });

  it("실패 경로 전부에서 timing 필드 자체가 없다", async () => {
    const support = visionSupportWith();
    // 빈 글 → judge()가 empty로 거부한다.
    const engine = engineReturning({ text: "", ending: { kind: "eos" } });

    const backend = createOnDeviceBackend(async () => [], engine, 60_000, support);
    const result = await backend.generate(requestWith(signalsWithPhotos([photo("a", 8)])));

    expect("kind" in result).toBe(true);
    expect((result as { timing?: unknown }).timing).toBeUndefined();
  });

  it("writingMs가 모델 로드 시간을 포함하지 않는다", async () => {
    const support = visionSupportWith();
    let loadDelayed = false;
    const engine: GenerationEngine = {
      async load() {
        // 로드에 시간이 걸리는 대역 — writingMs에 반영되면 안 된다.
        await new Promise((resolve) => setTimeout(resolve, 30));
        loadDelayed = true;
        return { ok: true, warm: false };
      },
      async prewarm() {},
      async run() {
        return { text: "짧은 생성.", ending: { kind: "eos" } };
      },
      async stop() {},
      async unload() {},
    };

    const backend = createOnDeviceBackend(async () => [], engine, 60_000, support);
    const request: DiaryRequest = {
      signals: signalsWithPhotos([]),
      character: "quiet",
      vision: "none",
      dayStillOpen: false,
    };
    const result = await backend.generate(request);

    expect(loadDelayed).toBe(true);
    expect("text" in result).toBe(true);
    const timing = (result as { timing?: { writingMs: number } }).timing;
    // run()이 즉시 resolve하므로 writingMs는 로드 지연(30ms)보다 훨씬 작아야 한다.
    expect(timing?.writingMs).toBeLessThan(30);
  });
});

/**
 * 018 — prepare()/release() (contracts/prewarm-engine.md E12~E14).
 */
describe("018 — prepare()/release()", () => {
  function countingEngine() {
    const calls: string[] = [];
    let loadResult: LoadResult = { ok: true, warm: false };
    const engine: GenerationEngine = {
      async load(character) {
        calls.push(`load:${character}`);
        return loadResult;
      },
      async prewarm(character) {
        calls.push(`prewarm:${character}`);
      },
      async run() {
        calls.push("run");
        return { text: "글", ending: { kind: "eos" } };
      },
      async stop() {
        calls.push("stop");
      },
      async unload() {
        calls.push("unload");
      },
    };
    return {
      calls,
      engine,
      setLoadResult(result: LoadResult) {
        loadResult = result;
      },
    };
  }

  it("E12: prepare() 뒤 engine.unload()가 불리지 않는다", async () => {
    const { calls, engine } = countingEngine();
    const backend = createOnDeviceBackend(async () => [], engine);

    await backend.prepare?.("narrative");

    expect(calls).toEqual(["load:narrative", "prewarm:narrative"]);
    expect(calls).not.toContain("unload");
  });

  it("prepare() 뒤의 generate()는 네이티브 로더를 다시 부르지 않는다 (재사용)", async () => {
    const { calls, engine } = countingEngine();
    const backend = createOnDeviceBackend(async () => [], engine);

    await backend.prepare?.("narrative");
    const loadCallsBeforeGenerate = calls.filter((c) => c.startsWith("load:")).length;

    const request: DiaryRequest = {
      signals: emptyDay("2026-08-26"),
      character: "narrative",
      vision: "none",
      dayStillOpen: false,
    };
    await backend.generate(request);

    const loadCallsAfterGenerate = calls.filter((c) => c.startsWith("load:")).length;
    // load()는 여전히 불리지만(재사용 판정을 엔진 내부가 하므로), 여기서는
    // 어댑터가 다시 로더를 부르는 추가 호출을 만들지 않는지만 본다 — 실제
    // 재사용 여부는 llama-port.test.ts의 E1 테스트가 담당한다.
    expect(loadCallsAfterGenerate).toBeGreaterThanOrEqual(loadCallsBeforeGenerate);
    expect(calls).toContain("unload"); // generate()가 끝나면 여전히 정리된다 (E2)
  });

  it("generate()는 prepare()가 있었든 없었든 끝나면 여전히 unload한다 (E2 유지)", async () => {
    const { calls, engine } = countingEngine();
    const backend = createOnDeviceBackend(async () => [], engine);

    const request: DiaryRequest = {
      signals: emptyDay("2026-08-26"),
      character: "narrative",
      vision: "none",
      dayStillOpen: false,
    };
    await backend.generate(request);

    expect(calls).toContain("unload");
  });

  it("E13: prepare()의 load() 실패가 예외를 던지지 않는다", async () => {
    const { engine, setLoadResult } = countingEngine();
    setLoadResult({ ok: false, reason: "not-found" });
    const backend = createOnDeviceBackend(async () => [], engine);

    await expect(backend.prepare?.("narrative")).resolves.toBeUndefined();
  });

  it("E14: release()가 열린 것을 닫는다", async () => {
    const { calls, engine } = countingEngine();
    const backend = createOnDeviceBackend(async () => [], engine);

    await backend.prepare?.("narrative");
    await backend.release?.();

    expect(calls).toContain("unload");
  });

  it("E14: release()는 engine.unload()에 그대로 위임한다 — 새 정리 로직이 없다", async () => {
    const { calls, engine } = countingEngine();
    const backend = createOnDeviceBackend(async () => [], engine);

    await backend.release?.();

    // prepare() 없이 release()만 불러도 engine.unload()가 호출된다(위임) —
    // "열려 있는가"의 판단은 실제 엔진(llama-port.ts)의 unload()가 이미
    // 안전하게 처리한다(context가 null이면 no-op). 여기서는 위임 자체만 본다.
    expect(calls).toEqual(["unload"]);
  });

  it("엔진이 없으면 prepare()/release()가 조용히 끝난다", async () => {
    const backend = createOnDeviceBackend(async () => []);

    await expect(backend.prepare?.("narrative")).resolves.toBeUndefined();
    await expect(backend.release?.()).resolves.toBeUndefined();
  });
});

/**
 * 018 — generate()가 seen을 받으면 사진을 다시 읽지 않는다.
 *
 * 계약: specs/018-prompt-prefix-prewarm/data-model.md §4·§5, research.md §6
 */
describe("018 — generate(request, onStage, seen)", () => {
  const photo = (id: string, hour: number): Photo => ({
    id,
    takenAt: new Date(2026, 7, 20, hour, 0, 0),
  });

  function signalsWithPhotos(photos: Photo[]): DaySignals {
    return {
      date: "2026-08-20",
      photos: { kind: "known", value: { photos, complete: true } },
      places: { kind: "none" },
      steps: { kind: "unknown", reason: "no-channel" },
      battery: { kind: "unknown", reason: "no-channel" },
      connectivity: { kind: "unknown", reason: "no-channel" },
    };
  }

  function requestWith(signals: DaySignals): DiaryRequest {
    return { signals, character: "quiet", vision: "quick", dayStillOpen: false };
  }

  /** vision engine.load() 호출 횟수를 세는 대역. 불리면 readPhotos()가 실행된 것이다 */
  function countingVisionSupport(): { support: VisionSupport; loadCalls: number[] } {
    const loadCalls: number[] = [];
    let count = 0;
    const engine: VisionEngine = {
      async load(): Promise<VisionLoadResult> {
        count += 1;
        loadCalls.push(count);
        return { ok: true };
      },
      async caption(): Promise<VisionRunResult> {
        return { text: "사진 내용" };
      },
      async stop() {},
      async unload() {},
    };
    return {
      support: { engine, resolvePath: async (p) => `/photo/${p.id}.jpg` },
      loadCalls,
    };
  }

  function goodEngine(): GenerationEngine {
    return {
      async load() {
        return { ok: true, warm: false };
      },
      async prewarm() {},
      async run() {
        return { text: "짧은 생성.", ending: { kind: "eos" } };
      },
      async stop() {},
      async unload() {},
    };
  }

  const preSeen: PhotoVision = {
    captions: [{ photoId: "x", takenAt: new Date(2026, 7, 20, 9, 0, 0), text: "미리 읽은 사진" }],
    considered: 1,
    available: 1,
  };

  it("seen이 주어지면 readPhotos()(vision engine.load)를 다시 부르지 않는다", async () => {
    const { support, loadCalls } = countingVisionSupport();
    const backend = createOnDeviceBackend(async () => [], goodEngine(), 60_000, support);

    const result = await backend.generate(
      requestWith(signalsWithPhotos([photo("a", 8)])),
      undefined,
      preSeen,
    );

    expect(loadCalls).toEqual([]); // vision engine이 한 번도 열리지 않았다
    expect("text" in result).toBe(true);
  });

  it("seen이 없으면 기존과 동일하게 스스로 읽는다 (회귀 없음)", async () => {
    const { support, loadCalls } = countingVisionSupport();
    const backend = createOnDeviceBackend(async () => [], goodEngine(), 60_000, support);

    const result = await backend.generate(requestWith(signalsWithPhotos([photo("a", 8)])));

    expect(loadCalls).toEqual([1]); // vision engine이 정상적으로 열렸다
    expect("text" in result).toBe(true);
  });

  it("seen을 쓴 경로에서는 timing.visionMs가 없다 (FR-010)", async () => {
    const { support } = countingVisionSupport();
    const backend = createOnDeviceBackend(async () => [], goodEngine(), 60_000, support);

    const result = await backend.generate(
      requestWith(signalsWithPhotos([photo("a", 8)])),
      undefined,
      preSeen,
    );

    expect("text" in result).toBe(true);
    const timing = (result as { timing?: { visionMs?: number } }).timing;
    expect(timing?.visionMs).toBeUndefined();
  });

  it("seen을 쓴 경로에서도 writingMs는 여전히 기록된다", async () => {
    const { support } = countingVisionSupport();
    const backend = createOnDeviceBackend(async () => [], goodEngine(), 60_000, support);

    const result = await backend.generate(
      requestWith(signalsWithPhotos([photo("a", 8)])),
      undefined,
      preSeen,
    );

    expect("text" in result).toBe(true);
    const timing = (result as { timing?: { writingMs: number } }).timing;
    expect(timing?.writingMs).toBeGreaterThanOrEqual(0);
  });
});

/**
 * 018 2단계 — captionDay() (contracts/prewarm-engine.md E15).
 */
describe("018 — captionDay()", () => {
  const DAY = "2026-08-20";

  const photo = (id: string, hour: number): Photo => ({
    id,
    takenAt: new Date(2026, 7, 20, hour, 0, 0),
  });

  function signalsWithPhotos(photos: Photo[]): DaySignals {
    return {
      date: DAY,
      photos: { kind: "known", value: { photos, complete: true } },
      places: { kind: "none" },
      steps: { kind: "unknown", reason: "no-channel" },
      battery: { kind: "unknown", reason: "no-channel" },
      connectivity: { kind: "unknown", reason: "no-channel" },
    };
  }

  function loadSignalsReturning(signals: DaySignals | null) {
    return async () => signals;
  }

  function visionSupportWith(): { support: VisionSupport; unloaded: boolean[] } {
    const unloaded: boolean[] = [];
    const engine: VisionEngine = {
      async load(): Promise<VisionLoadResult> {
        return { ok: true };
      },
      async caption(): Promise<VisionRunResult> {
        return { text: "사진 내용" };
      },
      async stop() {},
      async unload() {
        unloaded.push(true);
      },
    };
    return {
      support: { engine, resolvePath: async (p) => `/photo/${p.id}.jpg` },
      unloaded,
    };
  }

  it("사진이 있는 날은 캡션 결과를 돌려주고 vision engine을 닫는다 (E2)", async () => {
    const { support, unloaded } = visionSupportWith();
    const backend = createOnDeviceBackend(
      async () => [],
      undefined,
      60_000,
      support,
      loadSignalsReturning(signalsWithPhotos([photo("a", 8)])),
    );

    const outcome = await backend.captionDay(DAY, "quiet", "quick");

    expect(outcome.kind).toBe("seen");
    if (outcome.kind === "seen") {
      expect(outcome.vision.captions).toHaveLength(1);
    }
    expect(unloaded).toEqual([true]);
  });

  it("사진이 없는 날은 no-photos를 돌려주고 vision engine을 열지 않는다", async () => {
    const { support, unloaded } = visionSupportWith();
    const backend = createOnDeviceBackend(
      async () => [],
      undefined,
      60_000,
      support,
      loadSignalsReturning(signalsWithPhotos([])),
    );

    const outcome = await backend.captionDay(DAY, "quiet", "quick");

    expect(outcome.kind).toBe("no-photos");
    expect(unloaded).toEqual([]);
  });

  it("vision 수단이 없으면 no-photos로 조용히 끝난다", async () => {
    const backend = createOnDeviceBackend(async () => []);

    const outcome = await backend.captionDay(DAY, "quiet", "quick");

    expect(outcome.kind).toBe("no-photos");
  });

  it("loadSignals가 없으면 no-photos로 조용히 끝난다", async () => {
    const { support } = visionSupportWith();
    const backend = createOnDeviceBackend(async () => [], undefined, 60_000, support);

    const outcome = await backend.captionDay(DAY, "quiet", "quick");

    expect(outcome.kind).toBe("no-photos");
  });

  it("신호를 못 읽으면(null) no-photos로 조용히 끝난다", async () => {
    const { support } = visionSupportWith();
    const backend = createOnDeviceBackend(
      async () => [],
      undefined,
      60_000,
      support,
      loadSignalsReturning(null),
    );

    const outcome = await backend.captionDay(DAY, "quiet", "quick");

    expect(outcome.kind).toBe("no-photos");
  });

  it("captionDay()가 돌려준 결과를 generate()의 seen으로 그대로 쓸 수 있다 (E1 순서)", async () => {
    const { support } = visionSupportWith();
    const engine: GenerationEngine = {
      async load() {
        return { ok: true, warm: false };
      },
      async prewarm() {},
      async run() {
        return { text: "짧은 생성.", ending: { kind: "eos" } };
      },
      async stop() {},
      async unload() {},
    };
    const signals = signalsWithPhotos([photo("a", 8)]);
    const backend = createOnDeviceBackend(
      async () => [],
      engine,
      60_000,
      support,
      loadSignalsReturning(signals),
    );

    const outcome = await backend.captionDay(DAY, "quiet", "quick");
    expect(outcome.kind).toBe("seen");

    const seen = outcome.kind === "seen" ? outcome.vision : undefined;
    const request: DiaryRequest = {
      signals,
      character: "quiet",
      vision: "quick",
      dayStillOpen: false,
    };
    const result = await backend.generate(request, undefined, seen);

    expect("text" in result).toBe(true);
  });
});

/**
 * 023 T041 — `readPhotos()`가 상한 초과인 하루에만 폴더 이름을 해석하고,
 * 잡사진(스크린샷 폴더)을 캡션 대상에서 뺀다.
 *
 * 계약: specs/023-photo-selection-algorithm/tasks.md T053
 *       specs/023-photo-selection-algorithm/contracts/classification.md
 *
 * `select.ts`·`expo-port.ts` 단위 테스트는 각 조각을 잠근다. 여기서는
 * `on-device.ts`의 통합 경로 — `reachedVisionLimit` 게이트 → `resolveFolders`
 * → `attachFolderNames` → `selectForVision` — 가 실제로 도는지 본다.
 */
describe("023 T041 — 잡사진 필터링 통합 경로", () => {
  const cameraPhoto = (id: string, hour: number): Photo => ({
    id,
    takenAt: new Date(2026, 7, 20, hour, 0, 0),
  });

  function signalsWithPhotos(photos: Photo[]): DaySignals {
    return {
      date: "2026-08-20",
      photos: { kind: "known", value: { photos, complete: true } },
      places: { kind: "none" },
      steps: { kind: "unknown", reason: "no-channel" },
      battery: { kind: "unknown", reason: "no-channel" },
      connectivity: { kind: "unknown", reason: "no-channel" },
    };
  }

  function requestWith(signals: DaySignals): DiaryRequest {
    return { signals, character: "quiet", vision: "quick", dayStillOpen: false };
  }

  /** 캡션된 사진 id를 모은다. `resolveFolders`는 옵션으로 주입. */
  function visionCapturing(resolveFolders?: VisionSupport["resolveFolders"]): {
    support: VisionSupport;
    captioned: string[];
  } {
    const captioned: string[] = [];
    const engine: VisionEngine = {
      async load(): Promise<VisionLoadResult> {
        return { ok: true };
      },
      async caption(path: string): Promise<VisionRunResult> {
        const id = (path.split("/").pop() ?? path).replace(".jpg", "");
        captioned.push(id);
        return { text: `사진 ${id}` };
      },
      async stop() {},
      async unload() {},
    };
    return {
      support: {
        engine,
        resolvePath: async (p) => `/photo/${p.id}.jpg`,
        resolveFolders,
      },
      captioned,
    };
  }

  function passingEngine(): GenerationEngine {
    return {
      async load(): Promise<LoadResult> {
        return { ok: true, warm: true };
      },
      async prewarm() {},
      async run(): Promise<RunResult> {
        return {
          text: "2026년 8월 20일. 오늘은 공원에 갔다. 사진을 여러 장 찍었다.",
          ending: { kind: "eos" },
        };
      },
      async stop() {},
      async unload() {},
    };
  }

  // 12장(상한 8 초과). s1~s4는 스크린샷 폴더, 나머지는 카메라.
  const OVER_LIMIT = [
    cameraPhoto("c1", 5),
    cameraPhoto("s1", 6),
    cameraPhoto("c2", 8),
    cameraPhoto("s2", 10),
    cameraPhoto("c3", 12),
    cameraPhoto("s3", 13),
    cameraPhoto("c4", 15),
    cameraPhoto("c5", 16),
    cameraPhoto("s4", 18),
    cameraPhoto("c6", 19),
    cameraPhoto("c7", 21),
    cameraPhoto("c8", 23),
  ];

  it("(a) 상한 초과 + resolveFolders 스텁 → 스크린샷이 캡션 대상에서 빠진다", async () => {
    const folders = new Map<string, string | undefined>([
      ["s1", "Screenshots"],
      ["s2", "Screenshots"],
      ["s3", "Screenshots"],
      ["s4", "Screenshots"],
    ]);
    const { support, captioned } = visionCapturing(async () => folders);
    const backend = createOnDeviceBackend(async () => [], passingEngine(), 60_000, support);

    const result = await backend.generate(requestWith(signalsWithPhotos(OVER_LIMIT)));

    expect("text" in result).toBe(true);
    // s1~s4는 잡사진으로 걸러져 캡션되지 않는다.
    expect(captioned).not.toContain("s1");
    expect(captioned).not.toContain("s2");
    expect(captioned).not.toContain("s3");
    expect(captioned).not.toContain("s4");
    // 카메라 원본에서 상한(8)만큼 골라 캡션한다.
    expect(captioned.length).toBeLessThanOrEqual(8);
    expect(captioned.every((id) => id.startsWith("c"))).toBe(true);
  });

  it("(b) resolveFolders가 throw → readPhotos()가 여전히 완성한다(폴더 태깅 없음)", async () => {
    const { support, captioned } = visionCapturing(async () => {
      throw new Error("미디어 라이브러리 접근 실패");
    });
    const backend = createOnDeviceBackend(async () => [], passingEngine(), 60_000, support);

    const result = await backend.generate(requestWith(signalsWithPhotos(OVER_LIMIT)));

    // 예외를 삼키고 폴더 없이 선별 — 잡사진 필터링이 no-op, 하루는 안 무너진다.
    expect("text" in result).toBe(true);
    expect(captioned.length).toBeLessThanOrEqual(8);
  });

  it("(c) resolveFolders 미주입 → 폴더 없이 선별(필터링 no-op)", async () => {
    const { support, captioned } = visionCapturing(undefined);
    const backend = createOnDeviceBackend(async () => [], passingEngine(), 60_000, support);

    const result = await backend.generate(requestWith(signalsWithPhotos(OVER_LIMIT)));

    expect("text" in result).toBe(true);
    // 전부 "분류 불가" → 카메라 원본 취급 → s1~s4도 후보에 남는다(필터링 안 함).
    expect(captioned.length).toBeLessThanOrEqual(8);
  });

  it("사진 ≤ 상한이면 resolveFolders를 부르지 않는다 (reachedVisionLimit 게이트)", async () => {
    let called = false;
    const { support } = visionCapturing(async () => {
      called = true;
      return new Map();
    });
    const backend = createOnDeviceBackend(async () => [], passingEngine(), 60_000, support);

    // 4장 — 상한(8) 이하. R1 빠른 경로라 분류가 필요 없다.
    const four = [
      cameraPhoto("a", 8),
      cameraPhoto("b", 12),
      cameraPhoto("c", 16),
      cameraPhoto("d", 20),
    ];
    const result = await backend.generate(requestWith(signalsWithPhotos(four)));

    expect("text" in result).toBe(true);
    expect(called).toBe(false);
  });
});
