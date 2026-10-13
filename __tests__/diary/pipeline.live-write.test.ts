import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { DayDate } from "../../src/config/day-boundary";
import { createLiveWrites, type WriteHandle } from "../../src/diary/live-write";
import { createPipeline, type PipelineDeps } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import type { Character, VisionSetting } from "../../src/diary/types";
import type {
  GenerationResult,
  InferenceBackend,
  MonologueBranch,
  ProgressStage,
} from "../../src/inference/types";
import { partiallyUnknownDay } from "../../src/signals/fake";

/**
 * `pipeline.ts`가 등록부의 칸을 차지하고 비우는 계약 (080).
 *
 * 계약: specs/080-live-write-registry/contracts/live-write.md P1~P6
 *       spec.md FR-001·FR-005·FR-015
 *
 * 020의 `pipeline.lock.test.ts`(`acquireLock?`)를 대체한다 — **003의 `isModelReady?`, 017의 `geocoding?`과 같은 옵셔널
 * 확장**이라는 성질은 그대로다: `beginWrite`를 주지 않으면 002~019 동작 그대로.
 */

const AFTER_CLOSE = new Date("2026-08-13T06:00:00");
const DAY: DayDate = "2026-08-12";
const TEXT = "제목\n\n오늘은 조용한 하루였다.";

function backendReturning(result: GenerationResult): InferenceBackend {
  return {
    location: "on-device",
    async isAvailable() {
      return { kind: "loaded" };
    },
    async generate() {
      return result;
    },
  };
}

function inputFor(over: { day?: DayDate; now?: Date } = {}) {
  return {
    day: over.day ?? DAY,
    now: over.now ?? AFTER_CLOSE,
    character: "quiet" as Character,
    vision: "quick" as VisionSetting,
  };
}

/** 호출을 적는 손잡이 대역. `cancelled`를 밖에서 세울 수 있다 */
function recordingHandle(log: string[] = []) {
  const state = { cancelled: false };
  const handle: WriteHandle = {
    publish: (stage: ProgressStage, branch?: MonologueBranch) => {
      log.push(branch === undefined ? `publish:${stage}` : `publish:${stage}:${branch}`);
    },
    isCancelled: () => state.cancelled,
    end: (result) => {
      log.push(`end:${String(result.ok)}`);
    },
  };
  return { handle, state, log };
}

function depsWith(over: Partial<PipelineDeps>): PipelineDeps {
  return {
    backend: backendReturning({ text: TEXT }),
    store: memoryStore(),
    loadSignals: async (day) => partiallyUnknownDay(day),
    ...over,
  };
}

describe("P1 — beginWrite를 주지 않으면 기존 동작 (회귀 없음)", () => {
  it("등록부 없이도 쓰고 저장한다", async () => {
    const result = await createPipeline(depsWith({})).run(inputFor());

    expect(result.ok).toBe(true);
  });
});

describe("P2 — 칸을 차지하지 못하면 시작하지 않는다", () => {
  it("already-running으로 곧바로 돌아오고 신호도 생성도 건드리지 않는다", async () => {
    const generate = jest.fn();
    const loadSignals = jest.fn(async (day: DayDate) => partiallyUnknownDay(day));
    const pipeline = createPipeline(
      depsWith({
        backend: { ...backendReturning({ text: TEXT }), generate },
        loadSignals,
        beginWrite: () => null,
      }),
    );

    const result = await pipeline.run(inputFor());

    expect(result).toMatchObject({ ok: false, stage: "already-running" });
    expect(loadSignals).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
  });

  it("미래 날이면 칸을 차지하려 하지도 않는다 (day-writable이 먼저)", async () => {
    const beginWrite = jest.fn(() => recordingHandle().handle);
    const pipeline = createPipeline(depsWith({ beginWrite }));

    const result = await pipeline.run(inputFor({ day: "2026-08-20" }));

    expect(result).toMatchObject({ ok: false, stage: "day-not-closed" });
    expect(beginWrite).not.toHaveBeenCalled();
  });

  it("차지할 때 그 쓰기의 날을 넘긴다", async () => {
    const beginWrite = jest.fn((_day: DayDate) => recordingHandle().handle);
    await createPipeline(depsWith({ beginWrite })).run(inputFor());

    expect(beginWrite).toHaveBeenCalledTimes(1);
    expect(beginWrite).toHaveBeenCalledWith(DAY);
  });
});

describe("P3 — 어느 길로 끝나도 칸을 비운다", () => {
  it("성공이면 생성이 돌아온 뒤 end({ ok: true })를 한 번 부른다", async () => {
    const { handle, log } = recordingHandle();
    const pipeline = createPipeline(
      depsWith({
        backend: {
          ...backendReturning({ text: TEXT }),
          async generate() {
            log.push("generate");
            return { text: TEXT };
          },
        },
        beginWrite: () => handle,
      }),
    );

    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(true);
    expect(log.filter((line) => line.startsWith("end"))).toEqual(["end:true"]);
    expect(log.indexOf("generate")).toBeLessThan(log.indexOf("end:true"));
  });

  it("생성이 실패해도 end({ ok: false })를 한 번 부른다", async () => {
    const { handle, log } = recordingHandle();
    const pipeline = createPipeline(
      depsWith({
        backend: backendReturning({ kind: "not-implemented" }),
        beginWrite: () => handle,
      }),
    );

    const result = await pipeline.run(inputFor());

    expect(result).toMatchObject({ ok: false, stage: "generation" });
    expect(log.filter((line) => line.startsWith("end"))).toEqual(["end:false"]);
  });

  it("저장이 실패해도 end({ ok: false })를 한 번 부른다", async () => {
    const { handle, log } = recordingHandle();
    const pipeline = createPipeline(
      depsWith({
        store: memoryStore({ failWith: "디스크가 가득 찼다" }),
        beginWrite: () => handle,
      }),
    );

    const result = await pipeline.run(inputFor());

    expect(result).toMatchObject({ ok: false, stage: "storage" });
    expect(log.filter((line) => line.startsWith("end"))).toEqual(["end:false"]);
  });

  it("생성이 던져도 칸은 빈다", async () => {
    const { handle, log } = recordingHandle();
    const pipeline = createPipeline(
      depsWith({
        backend: {
          ...backendReturning({ text: TEXT }),
          async generate() {
            throw new Error("어댑터가 무너졌다");
          },
        },
        beginWrite: () => handle,
      }),
    );

    await pipeline.run(inputFor()).catch(() => {});

    expect(log.filter((line) => line.startsWith("end"))).toEqual(["end:false"]);
  });
});

describe("P4 — 진행 신호를 칸에도 싣는다", () => {
  it("호출자가 onProgress를 주지 않아도 싣는다", async () => {
    const { handle, log } = recordingHandle();
    await createPipeline(depsWith({ beginWrite: () => handle })).run(inputFor());

    expect(log).toContain("publish:signals");
  });

  it("호출자의 onProgress와 칸이 같은 신호를 받는다", async () => {
    const { handle, log } = recordingHandle();
    const seen: string[] = [];
    const pipeline = createPipeline(
      depsWith({
        backend: {
          ...backendReturning({ text: TEXT }),
          async generate(_request, onProgress) {
            onProgress?.("vision", "many");
            onProgress?.("generation");
            return { text: TEXT };
          },
        },
        beginWrite: () => handle,
      }),
    );

    await pipeline.run(inputFor(), (stage, branch) => {
      seen.push(branch === undefined ? stage : `${stage}:${branch}`);
    });

    expect(seen).toEqual(["signals", "vision:many", "generation"]);
    expect(log.filter((line) => line.startsWith("publish"))).toEqual([
      "publish:signals",
      "publish:vision:many",
      "publish:generation",
    ]);
  });
});

describe("P5·P6 — 사용자가 그만둔 쓰기", () => {
  it("칸에 그만둠이 서 있으면 저장하지 않고 사진 사본을 정리한다", async () => {
    const { handle, state } = recordingHandle();
    const store = memoryStore();
    const cleanup = jest.fn(async () => {});
    const pipeline = createPipeline(
      depsWith({
        backend: {
          ...backendReturning({ text: TEXT }),
          async generate() {
            // 생성이 끝나는 순간에 그만두기가 왔다(071 SE-3) — 어댑터는 이미 글을 돌려줬다.
            state.cancelled = true;
            return {
              text: TEXT,
              usedPhotos: [
                {
                  photoId: "a",
                  takenAt: AFTER_CLOSE,
                  resizedPath: "/cache/a.jpg",
                  ownsResizedPath: true,
                },
                {
                  photoId: "b",
                  takenAt: AFTER_CLOSE,
                  resizedPath: "/dcim/b.jpg",
                  ownsResizedPath: false,
                },
              ],
            };
          },
        },
        store,
        cleanupResizedPhoto: cleanup,
        beginWrite: () => handle,
      }),
    );

    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(false);
    expect(await store.load(DAY)).toBeNull();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledWith("/cache/a.jpg");
  });

  // 코드 리뷰에서 잡힘 — 어댑터는 `generate()`에 들어설 때 지난 그만두기 신호를 비운다(새 요청이므로). 그래서 신호 읽기 도중에 온
  // 끊기는 사라지고 사진 읽기·모델 적재·본문·제목이 끝까지 돈 뒤 저장 직전에야 버려졌다. 합류한 홈의 「그만두기」와 지우기는 그
  // 끝을 기다리므로 그 시간만큼 「쓰는 중」·설정에 묶인다.
  it("★ 생성에 들어서기 전에 끊겼으면 생성을 시작하지 않는다", async () => {
    const { handle, state } = recordingHandle();
    const generate = jest.fn(async () => ({ text: TEXT }));
    const pipeline = createPipeline(
      depsWith({
        backend: { ...backendReturning({ text: TEXT }), generate },
        loadSignals: async (day) => {
          // 신호를 읽는 사이에 「그만두기」가 왔다.
          state.cancelled = true;
          return partiallyUnknownDay(day);
        },
        beginWrite: () => handle,
      }),
    );

    const result = await pipeline.run(inputFor());

    expect(generate).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: false, stage: "generation", cancelled: true });
  });

  it("호출자의 isCancelled로도 생성에 들어서기 전에 멈춘다 (홈이 시작한 쓰기)", async () => {
    const generate = jest.fn(async () => ({ text: TEXT }));
    let cancelled = false;
    const pipeline = createPipeline(
      depsWith({
        backend: { ...backendReturning({ text: TEXT }), generate },
        loadSignals: async (day) => {
          cancelled = true;
          return partiallyUnknownDay(day);
        },
      }),
    );

    const result = await pipeline.run({ ...inputFor(), isCancelled: () => cancelled });

    expect(generate).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: false, stage: "generation" });
  });

  it("호출자의 isCancelled가 생성 도중에 참이 돼도 저장하지 않는다 (071 그대로)", async () => {
    const { handle } = recordingHandle();
    const store = memoryStore();
    let cancelled = false;
    const pipeline = createPipeline(
      depsWith({
        backend: {
          ...backendReturning({ text: TEXT }),
          async generate() {
            cancelled = true;
            return { text: TEXT };
          },
        },
        store,
        beginWrite: () => handle,
      }),
    );

    const result = await pipeline.run({ ...inputFor(), isCancelled: () => cancelled });

    expect(result.ok).toBe(false);
    expect(await store.load(DAY)).toBeNull();
  });

  it("저장 직전 확인에 걸린 실패에 cancelled가 실린다", async () => {
    const { handle, state } = recordingHandle();
    const pipeline = createPipeline(
      depsWith({
        backend: {
          ...backendReturning({ text: TEXT }),
          async generate() {
            // 글은 다 나왔고, 그 순간 그만두기가 왔다.
            state.cancelled = true;
            return { text: TEXT };
          },
        },
        beginWrite: () => handle,
      }),
    );

    const result = await pipeline.run(inputFor());

    expect(result).toMatchObject({ ok: false, stage: "generation", cancelled: true });
  });

  it("엔진이 끊겨 돌아온 실패에도 cancelled가 실린다", async () => {
    const { handle, state } = recordingHandle();
    const pipeline = createPipeline(
      depsWith({
        backend: {
          ...backendReturning({ text: TEXT }),
          async generate() {
            state.cancelled = true;
            return { kind: "interrupted" };
          },
        },
        beginWrite: () => handle,
      }),
    );

    const result = await pipeline.run(inputFor());

    expect(result).toMatchObject({ ok: false, stage: "generation", cancelled: true });
  });

  it("그만두지 않은 실패에는 cancelled 키가 없다", async () => {
    const { handle } = recordingHandle();
    const pipeline = createPipeline(
      depsWith({ backend: backendReturning({ kind: "interrupted" }), beginWrite: () => handle }),
    );

    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(false);
    expect(Object.keys(result)).not.toContain("cancelled");
  });

  it("호출자의 isCancelled로 걸린 실패에는 cancelled가 실리지 않는다 (홈이 스스로 가린다)", async () => {
    const { handle } = recordingHandle();
    const pipeline = createPipeline(depsWith({ beginWrite: () => handle }));

    const result = await pipeline.run({ ...inputFor(), isCancelled: () => true });

    expect(Object.keys(result)).not.toContain("cancelled");
  });

  it("성공 결과에는 cancelled가 없다 — 저장이 시작된 뒤의 그만두기는 일기를 남긴다", async () => {
    const { handle, state } = recordingHandle();
    const store = memoryStore();
    const pipeline = createPipeline(
      depsWith({
        store: {
          ...store,
          async save(entry) {
            // 저장이 이미 시작된 뒤에 그만두기가 왔다.
            state.cancelled = true;
            return store.save(entry);
          },
        },
        beginWrite: () => handle,
      }),
    );

    const result = await pipeline.run(inputFor());

    expect(result.ok).toBe(true);
    expect(Object.keys(result)).not.toContain("cancelled");
  });
});

describe("진짜 등록부를 나눠 쓰는 두 파이프라인", () => {
  it("한쪽이 도는 동안 다른 쪽은 already-running이고, 끝난 뒤에는 돈다", async () => {
    const registry = createLiveWrites();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const background = createPipeline(
      depsWith({
        backend: {
          ...backendReturning({ text: TEXT }),
          async generate() {
            await gate;
            return { text: TEXT };
          },
        },
        beginWrite: (day) => registry.beginWrite({ day, owner: "background" }),
      }),
    );
    const screen = createPipeline(
      depsWith({ beginWrite: (day) => registry.beginWrite({ day, owner: "screen" }) }),
    );

    const first = background.run(inputFor());
    // 첫 쓰기가 칸을 차지할 때까지 한 박자.
    await Promise.resolve();
    const slot = registry.current();
    expect(slot?.kind === "write" && slot.owner).toBe("background");

    const blocked = await screen.run(inputFor());
    expect(blocked).toMatchObject({ ok: false, stage: "already-running" });

    release();
    expect((await first).ok).toBe(true);
    expect(registry.current()).toBeNull();

    expect((await screen.run(inputFor())).ok).toBe(true);
  });
});

describe("소스 계약", () => {
  const CODE = readFileSync(join(__dirname, "../../src/diary/pipeline.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("pipeline.ts는 파일에 닿지 않는다 (통로는 주입)", () => {
    expect(CODE).toMatch(/beginWrite/);
    expect(CODE).not.toMatch(/expo-file-system/);
  });

  it("pipeline.ts는 등록부의 값을 import하지 않는다 — 타입뿐이다", () => {
    const imports = CODE.match(/import[^;]*from\s+"\.\/live-write"/g) ?? [];

    expect(imports.length).toBeGreaterThan(0);
    for (const line of imports) expect(line).toMatch(/^import type /);
  });

  it("PipelineStage에 그만둠 갈래를 더하지 않았다 (071)", () => {
    const stages = CODE.match(/export type PipelineStage =([\s\S]*?);/)?.[1] ?? "";

    expect(stages).toMatch(/"already-running"/);
    expect(stages).not.toMatch(/cancel/i);
  });
});
