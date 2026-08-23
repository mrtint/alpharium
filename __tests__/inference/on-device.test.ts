import { createOnDeviceBackend, type VisionSupport } from "../../src/inference/on-device";
import type { GenerationEngine, LoadResult, RunResult } from "../../src/inference/engine-port";
import type { DaySignals, Photo } from "../../src/signals/types";
import type { DiaryRequest } from "../../src/diary/types";
import type { VisionEngine, VisionLoadResult, VisionRunResult } from "../../src/vision/vision-port";

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
