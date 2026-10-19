/**
 * 091 PC2 — 느린 쓰기의 쉼. 호출 시간 × 비율만큼 쉬고, 멈춤 신호가 서 있으면 쉬지 않는다.
 */

import { paced, pauseAfter } from "../../src/inference/pacing";

describe("PC2 — pauseAfter", () => {
  it.each([
    [10_000, 0.5, 5_000],
    [0, 0.5, 0],
    [-5, 0.5, 0],
    [Number.NaN, 0.5, 0],
    [1_000, -1, 0],
  ])("%p ms × %p → %p ms", (elapsed, ratio, expected) => {
    expect(pauseAfter(elapsed, ratio)).toBe(expected);
  });
});

describe("PC2 — paced", () => {
  function fakeClock(steps: number[]) {
    let i = 0;
    return () => steps[Math.min(i++, steps.length - 1)] ?? 0;
  }

  it("호출 시간 × 비율만큼 쉰다", async () => {
    const sleep = jest.fn(async () => {});
    const result = await paced(
      async () => "ok",
      0.5,
      () => false,
      fakeClock([1_000, 41_000]),
      sleep,
    );
    expect(result).toBe("ok");
    expect(sleep).toHaveBeenCalledWith(20_000);
  });

  it("멈춤 신호가 서 있으면 쉬지 않는다", async () => {
    const sleep = jest.fn(async () => {});
    await paced(
      async () => 1,
      0.5,
      () => true,
      fakeClock([0, 30_000]),
      sleep,
    );
    expect(sleep).not.toHaveBeenCalled();
  });

  it("호출이 던지면 쉬지 않고 그대로 던진다", async () => {
    const sleep = jest.fn(async () => {});
    await expect(
      paced(
        async () => {
          throw new Error("boom");
        },
        0.5,
        () => false,
        fakeClock([0, 10_000]),
        sleep,
      ),
    ).rejects.toThrow("boom");
    expect(sleep).not.toHaveBeenCalled();
  });
});
