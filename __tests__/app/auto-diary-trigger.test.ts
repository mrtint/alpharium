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
      { day: "2026-09-11", now, character: "quiet", vision: "quick" },
      { pipeline },
    );

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        day: "2026-09-11",
        now,
        character: "quiet",
        vision: "quick",
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
        { day: "2026-09-11", now: new Date(), character: "quiet", vision: "quick" },
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
        { day: "2026-09-11", now: new Date(), character: "quiet", vision: "quick" },
        { pipeline },
      ),
    ).resolves.toBeUndefined();
    expect(run).toHaveBeenCalledTimes(1);
  });
});

/** 060 — 첫 실행 자동 첫 일기의 실패도 진단 「최근 실패」에 남는다 (FR-015). 기록은 던지지 않는다(WF6). */
describe("triggerFirstRunAutoDiary — 쓰기 실패 기록 (060)", () => {
  function memoryPort() {
    const port = {
      content: null as string | null,
      read: async () => port.content,
      write: async (serialized: string) => {
        port.content = serialized;
      },
    };
    return port;
  }
  const input = {
    day: "2026-09-11",
    now: new Date("2026-09-11T13:00:00.000Z"),
    character: "quiet" as const,
    vision: "quick" as const,
  };

  it("실패 결과면 주입한 failurePort에 한 줄이 쓰인다", async () => {
    const run = jest.fn(
      async () => ({ ok: false, stage: "storage", reason: "disk" }) as unknown as PipelineResult,
    );
    const failurePort = memoryPort();
    await triggerFirstRunAutoDiary(resolved, input, { pipeline: { run }, failurePort });
    const items = (JSON.parse(failurePort.content ?? "{}") as { items: { reason: string }[] })
      .items;
    expect(items.map((i) => i.reason)).toEqual(["save"]);
  });

  it("성공·already-running은 기록하지 않는다", async () => {
    const failurePort = memoryPort();
    await triggerFirstRunAutoDiary(resolved, input, {
      pipeline: { run: jest.fn(async () => okResult()) },
      failurePort,
    });
    await triggerFirstRunAutoDiary(resolved, input, {
      pipeline: {
        run: jest.fn(
          async () =>
            ({ ok: false, stage: "already-running", reason: "x" }) as unknown as PipelineResult,
        ),
      },
      failurePort,
    });
    expect(failurePort.content).toBeNull();
  });

  it("run()이 던져도 기록 통로가 던져도 함수는 던지지 않는다", async () => {
    const broken = {
      read: () => Promise.reject(new Error("io")),
      write: () => Promise.reject(new Error("io")),
    };
    await expect(
      triggerFirstRunAutoDiary(resolved, input, {
        pipeline: {
          run: jest.fn(
            async () =>
              ({ ok: false, stage: "storage", reason: "disk" }) as unknown as PipelineResult,
          ),
        },
        failurePort: broken,
      }),
    ).resolves.toBeUndefined();
    await expect(
      triggerFirstRunAutoDiary(resolved, input, {
        pipeline: {
          run: jest.fn(async () => {
            throw new Error("boom");
          }),
        },
        failurePort: broken,
      }),
    ).resolves.toBeUndefined();
  });
});
