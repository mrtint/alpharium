/**
 * 071 — 저장을 시작하기 전에 그만두기가 오면 저장하지 않는다 (SE-3, spec Edge Cases).
 *
 * 실기기 관측(2026-10-10): 생성이 끝나는 순간(약 26초)에 그만두기를 눌렀더니 일기가 저장됐다. 중단 신호는 모델 적재 직후와
 * 제목 질문 직후 두 곳에서만 확인되고, 그 뒤 `store.save`까지는 아무도 취소를 보지 않았다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **경계(소유자 확정 대기, 추천안 가정):** 취소는 저장을 시작하기 *직전*까지만 확인한다. 저장 I/O가 시작된 뒤의 취소는
 * 일기를 남긴다 — 이미 쓴 날의 다시 쓰기에서 저장 뒤에 지우면 옛 일기까지 잃는다(002 FR-023b). 그래서 저장 뒤에 지우는
 * 경로는 만들지 않는다(DiaryStore에 하루 단위 삭제가 없다).
 *
 * 통로는 `PipelineInput.isCancelled?`다 — 화면이 쓰기 시도마다 판정을 넘긴다. 주지 않으면(백그라운드·옛 경로) 동작이 그대로다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DayDate } from "../../src/config/day-boundary";
import { createPipeline, type PipelineInput } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import type { Character, VisionSetting } from "../../src/diary/types";
import type { InferenceBackend } from "../../src/inference/types";
import { partiallyUnknownDay } from "../../src/signals/fake";

const AFTER_CLOSE = new Date("2026-08-13T06:00:00");
const DAY: DayDate = "2026-08-12";

const input = (overrides: Partial<PipelineInput> = {}): PipelineInput => ({
  day: DAY,
  now: AFTER_CLOSE,
  character: "quiet" as Character,
  vision: "quick" as VisionSetting,
  ...overrides,
});

const usedPhotos = [
  { photoId: "p1", takenAt: AFTER_CLOSE, resizedPath: "/cache/p1.jpg", ownsResizedPath: true },
  { photoId: "p2", takenAt: AFTER_CLOSE, resizedPath: "/orig/p2.jpg", ownsResizedPath: false },
];

function make(options: { cleanup?: (path: string) => Promise<void> } = {}) {
  const store = memoryStore();
  const backend: InferenceBackend = {
    location: "on-device",
    async isAvailable() {
      return { kind: "loaded" };
    },
    async generate() {
      return { text: "오늘의 일기다.", usedPhotos };
    },
  };
  const pipeline = createPipeline({
    backend,
    store,
    loadSignals: async (day) => partiallyUnknownDay(day),
    ...(options.cleanup !== undefined ? { cleanupResizedPhoto: options.cleanup } : {}),
  });
  return { pipeline, store };
}

describe("C1 — 생성이 끝난 뒤 저장 직전에 취소를 본다", () => {
  it("★ 취소돼 있으면 저장하지 않는다 — 파일이 생기지 않고 실패 값이 돌아온다", async () => {
    const { pipeline, store } = make();
    const save = jest.spyOn(store, "save");

    const result = await pipeline.run(input({ isCancelled: () => true }));

    expect(save).not.toHaveBeenCalled();
    expect(await store.load(DAY)).toBeNull();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // 새 단계를 만들지 않는다(060 실패 갈래에 파급된다) — 기존 `generation`, 이유는 중단.
      expect(result.stage).toBe("generation");
      expect(result.reason).toMatch(/interrupted/);
      expect("entry" in result).toBe(false);
    }
  });

  it("★ 이미 쓴 날의 다시 쓰기도 옛 일기를 건드리지 않는다", async () => {
    const { pipeline, store } = make();
    const first = await pipeline.run(input());
    expect(first.ok).toBe(true);
    const before = await store.load(DAY);

    const result = await pipeline.run(input({ isCancelled: () => true }));

    expect(result.ok).toBe(false);
    expect(await store.load(DAY)).toEqual(before);
  });

  it("취소돼 저장을 건너뛰면 우리 사본만 정리한다 — 원본 경로는 지우지 않는다 (013 C1)", async () => {
    const cleanup = jest.fn(async () => {});
    const { pipeline } = make({ cleanup });

    await pipeline.run(input({ isCancelled: () => true }));

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledWith("/cache/p1.jpg");
  });

  it("취소가 아니면 그대로 저장한다 — 통로를 주지 않은 옛 경로도 같다", async () => {
    for (const extra of [{}, { isCancelled: () => false }]) {
      const { pipeline, store } = make();
      const result = await pipeline.run(input(extra));
      expect(result.ok).toBe(true);
      expect(await store.load(DAY)).not.toBeNull();
    }
  });

  it("취소 판정은 저장 직전에 한 번 본다 — 생성 도중에 바뀐 값을 읽는다", async () => {
    let cancelled = false;
    const store = memoryStore();
    const pipeline = createPipeline({
      backend: {
        location: "on-device",
        async isAvailable() {
          return { kind: "loaded" };
        },
        async generate() {
          cancelled = true; // 생성 도중(저장 전)에 그만두기가 온 것
          return { text: "오늘의 일기다." };
        },
      },
      store,
      loadSignals: async (day) => partiallyUnknownDay(day),
    });

    const result = await pipeline.run(input({ isCancelled: () => cancelled }));

    expect(result.ok).toBe(false);
    expect(await store.load(DAY)).toBeNull();
  });
});
