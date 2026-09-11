import { triggerFirstRunAutoDiary } from "../../src/app/wiring";
import type { Pipeline, PipelineResult } from "../../src/diary/pipeline";
import type { EnvironmentResolution } from "../../src/config/types";

/**
 * 040 — 자동 첫 일기 생성 트리거 계약 테스트 (US3).
 *
 * 계약: specs/040-onboarding-parallel-setup/research.md #4
 *       contracts/first-run-gate.md G6
 *       tasks.md T023
 *
 * `triggerFirstRunAutoDiary`가 주입된 mock pipeline의 `run()`을 정확히
 * 호출하는지, 예외를 삼키는지 확인한다. 중복 호출 방지(G6, "세션 스코프
 * 플래그")는 `App.tsx`가 소유하므로 여기서는 트리거 함수 자체가 매 호출마다
 * `run()`을 1번씩 부르는 것만 확인 — 세션 스코프 중복 방지는 App.tsx 쪽
 * 계약(T025)의 몫이다.
 */

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };

function okResult(): PipelineResult {
  return {
    ok: true,
    entry: {
      day: "2026-09-11",
      character: "quiet",
      body: "본문",
      createdAt: "2026-09-11T12:00:00.000Z",
    },
  } as unknown as PipelineResult;
}

describe("triggerFirstRunAutoDiary — mock pipeline 호출", () => {
  it("주입된 pipeline.run()을 day/now/character/vision으로 정확히 1회 호출한다", async () => {
    const run = jest.fn(async () => okResult());
    const pipeline: Pick<Pipeline, "run"> = { run };

    const now = new Date("2026-09-11T13:00:00.000Z");
    await triggerFirstRunAutoDiary(
      resolved,
      { day: "2026-09-11", now, character: "quiet", vision: "none" },
      { pipeline },
    );

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        day: "2026-09-11",
        now,
        character: "quiet",
        vision: "none",
      }),
    );
  });

  it("pipeline.run()이 거부되어도(reject) 예외를 던지지 않는다", async () => {
    const run = jest.fn(async () => {
      throw new Error("boom");
    });
    const pipeline: Pick<Pipeline, "run"> = { run };

    await expect(
      triggerFirstRunAutoDiary(
        resolved,
        { day: "2026-09-11", now: new Date(), character: "quiet", vision: "none" },
        { pipeline },
      ),
    ).resolves.toBeUndefined();
  });

  it("pipeline.run()이 거부 판정(ok:false)을 돌려줘도 예외 없이 끝난다", async () => {
    const run = jest.fn(
      async () => ({ ok: false, stage: "judge", reason: "empty" }) as unknown as PipelineResult,
    );
    const pipeline: Pick<Pipeline, "run"> = { run };

    await expect(
      triggerFirstRunAutoDiary(
        resolved,
        { day: "2026-09-11", now: new Date(), character: "quiet", vision: "none" },
        { pipeline },
      ),
    ).resolves.toBeUndefined();
    expect(run).toHaveBeenCalledTimes(1);
  });
});
