import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createPipeline } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import type { Character, VisionSetting } from "../../src/diary/types";
import type { GenerationResult, InferenceBackend } from "../../src/inference/types";
import { partiallyUnknownDay } from "../../src/signals/fake";
import type { DayDate } from "../../src/config/day-boundary";

/**
 * `pipeline.ts`의 옵셔널 `acquireLock?` 확장 계약 테스트.
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/generation-lock.md
 *       L5·L6·L8
 *       spec.md FR-008·User Story 3
 *
 * **003의 `isModelReady?`, 017의 `geocoding?`과 같은 옵셔널 확장** — 주지
 * 않으면 002~019 동작 그대로(회귀 없음).
 */

const AFTER_CLOSE = new Date("2026-08-13T06:00:00");
const DAY: DayDate = "2026-08-12";

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

function inputFor() {
  return {
    day: DAY,
    now: AFTER_CLOSE,
    character: "quiet" as Character,
    vision: "quick" as VisionSetting,
  };
}

describe("L5 — acquireLock을 주지 않으면 기존 동작 (회귀 없음)", () => {
  it("두 인자 호출이 그대로 통과한다", async () => {
    const pipeline = createPipeline({
      backend: backendReturning({ text: "제목\n\n오늘은 조용한 하루였다." }),
      store: memoryStore(),
      loadSignals: async (day) => partiallyUnknownDay(day),
    });
    const result = await pipeline.run(inputFor());
    expect(result.ok).toBe(true);
  });
});

describe("L5·L6 — acquireLock을 주면", () => {
  it("취득 실패(null)면 { ok: false, stage: 'already-running' }로 즉시 반환한다", async () => {
    const generate = jest.fn();
    const pipeline = createPipeline({
      backend: {
        location: "on-device",
        async isAvailable() {
          return { kind: "loaded" };
        },
        generate,
      },
      store: memoryStore(),
      loadSignals: async (day) => partiallyUnknownDay(day),
      acquireLock: async () => null,
    });

    const result = await pipeline.run(inputFor());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("already-running");
    // 취득 실패면 생성을 시도하지 않는다.
    expect(generate).not.toHaveBeenCalled();
  });

  it("취득 성공이면 생성을 진행하고, finally에서 release를 부른다", async () => {
    const release = jest.fn().mockResolvedValue(undefined);
    const pipeline = createPipeline({
      backend: backendReturning({ text: "제목\n\n오늘은 조용한 하루였다." }),
      store: memoryStore(),
      loadSignals: async (day) => partiallyUnknownDay(day),
      acquireLock: async () => ({ release }),
    });

    const result = await pipeline.run(inputFor());
    expect(result.ok).toBe(true);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("생성이 실패해도 release를 부른다 (finally)", async () => {
    const release = jest.fn().mockResolvedValue(undefined);
    const pipeline = createPipeline({
      backend: backendReturning({ kind: "not-implemented" }),
      store: memoryStore(),
      loadSignals: async (day) => partiallyUnknownDay(day),
      acquireLock: async () => ({ release }),
    });

    const result = await pipeline.run(inputFor());
    expect(result.ok).toBe(false);
    expect(release).toHaveBeenCalledTimes(1);
  });
});

describe("L8 — 위반 주입 (소스 검사)", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/diary/pipeline.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("pipeline.ts는 expo-file-system을 import하지 않는다 (파일 통로는 주입)", () => {
    expect(CODE).not.toMatch(/expo-file-system/);
  });

  it("pipeline.ts는 STALE_LOCK_MS를 하드코딩하지 않는다 (lock.ts에만)", () => {
    expect(CODE).not.toMatch(/STALE_LOCK_MS|5\s*\*\s*60\s*\*\s*1000/);
  });

  it("acquireLock 취득 후 finally에서 release를 부른다", () => {
    const runFn = CODE.match(/async run\(([\s\S]*?)\n {4}\},\n {2}\};/)?.[0] ?? CODE;
    expect(runFn).toMatch(/handle\?\.release\(\)/);
  });
});
