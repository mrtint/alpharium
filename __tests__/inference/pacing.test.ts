/**
 * 091 PC2 — 느린 쓰기의 쉼. 호출 시간 × 비율만큼 쉬고, 멈춤 신호가 서 있으면 쉬지 않는다.
 */

import { PAUSE_SLICE_MS, paced, pauseAfter, rest } from "../../src/inference/pacing";

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
    // 092 — 토막으로 나눠 잔다. 합이 쉼 길이다
    const total = (sleep.mock.calls as unknown as [number][]).reduce((sum, [ms]) => sum + ms, 0);
    expect(total).toBe(20_000);
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

describe("092 CW8 — rest (멈춤이 끊는 쉼)", () => {
  it("쉼을 토막으로 나눠 자고 합이 쉼 길이와 같다", async () => {
    const slept: number[] = [];
    await rest(
      PAUSE_SLICE_MS * 2 + 100,
      () => false,
      async (ms) => {
        slept.push(ms);
      },
    );
    expect(slept).toEqual([PAUSE_SLICE_MS, PAUSE_SLICE_MS, 100]);
  });

  it("멈춤이 서면 남은 토막을 자지 않는다", async () => {
    let stop = false;
    const slept: number[] = [];
    await rest(
      PAUSE_SLICE_MS * 5,
      () => stop,
      async (ms) => {
        slept.push(ms);
        stop = true;
      },
    );
    expect(slept).toEqual([PAUSE_SLICE_MS]);
  });

  it("0 이하면 자지 않는다", async () => {
    const sleep = jest.fn(async () => {});
    await rest(0, () => false, sleep);
    expect(sleep).not.toHaveBeenCalled();
  });
});
