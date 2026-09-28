/**
 * 050 — 「다시 쓰기」가 기존 일기를 바꾸는 순간 (contracts/dialogs.md OW8, spec FR-010).
 *
 * 보드 `2d`: 「기존 일기는 새 일기가 다 써질 때까지 그대로 두고, 완성되는 순간 교체. 도중에 그만두거나
 * 실패하면 기존 일기로 돌아감」. 파이프라인이 판정을 통과한 뒤에야 저장하므로 **이미 참**이다(§3.1 대조).
 * 050은 저장 동작을 바꾸지 않고 이 사실을 잠근다 — 기존 `pipeline.test.ts`의 「생성이 실패하면 저장을
 * 부르지 않는다」는 백엔드 실패(`not-implemented`)만 덮었다(analyze 1회차 확인). 판정 거부·중단·시간
 * 초과 갈래를 여기서 덮는다.
 */

import { createPipeline } from "../../src/diary/pipeline";
import { memoryStore } from "../../src/diary/store";
import type { Character, VisionSetting } from "../../src/diary/types";
import type { DayDate } from "../../src/config/day-boundary";
import type { GenerationResult, InferenceBackend } from "../../src/inference/types";
import { partiallyUnknownDay, richDay } from "../../src/signals/fake";

const DAY: DayDate = "2026-09-20";
const NOW = new Date("2026-09-28T09:00:00");

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

async function storeWithExisting() {
  const store = memoryStore();
  await store.save({
    date: DAY,
    text: "먼저 쓴 일기",
    character: "quiet",
    signalsUsed: richDay(DAY),
    createdAt: new Date("2026-09-20T21:00:00"),
  });
  return store;
}

function run(store: ReturnType<typeof memoryStore>, result: GenerationResult) {
  const pipeline = createPipeline({
    backend: backendReturning(result),
    store,
    loadSignals: async (day) => partiallyUnknownDay(day),
  });
  return pipeline.run({
    day: DAY,
    now: NOW,
    character: "quiet" as Character,
    vision: "quick" as VisionSetting,
  });
}

describe("★ OW8 — 새 일기가 판정을 통과하지 못하면 기존 일기가 그대로다", () => {
  it.each<[string, GenerationResult]>([
    ["판정 거부 (echo)", { kind: "rejected", why: "echo" }],
    ["판정 거부 (unfinished)", { kind: "rejected", why: "unfinished" }],
    ["중단 (그만두기·앱 이탈)", { kind: "interrupted" }],
    ["시간 초과", { kind: "timed-out" }],
  ])("%s → 저장 0회, 기존 일기 불변", async (_label, result) => {
    const store = await storeWithExisting();
    const save = jest.spyOn(store, "save");

    const outcome = await run(store, result);

    expect(outcome.ok).toBe(false);
    expect(save).not.toHaveBeenCalled();
    expect((await store.load(DAY))?.text).toBe("먼저 쓴 일기");
  });

  it("판정을 통과한 순간에만 새 일기로 바뀐다", async () => {
    const store = await storeWithExisting();
    const outcome = await run(store, { text: "새로 쓴 일기" });

    expect(outcome.ok).toBe(true);
    expect((await store.load(DAY))?.text).toContain("새로 쓴 일기");
  });
});
