/**
 * 111 — 첫 쓰기의 결과 갈래(FO1~FO7)와 재료 읽기(FM1~FM4).
 *
 * 계약: specs/111-first-diary-branch/contracts/first-diary-flow.md
 */

import {
  FIRST_DIARY_READ_LIMIT_MS,
  firstWriteOutcome,
  readFirstDiaryMaterial,
  type FirstWriteSettled,
} from "../../src/app/first-diary-material";
import type { DayPreview } from "../../src/app/state";
import type { DayDate } from "../../src/config/day-boundary";

const NOW = new Date("2026-11-04T12:00:00");
const TODAY = "2026-11-04" as DayDate;

const finished = (result: {
  ok: boolean;
  stage?: string;
  reason?: string;
  cancelled?: boolean;
}): FirstWriteSettled => ({ kind: "finished", result });

describe("firstWriteOutcome", () => {
  it("FO1 시작 거절은 refused", () => {
    expect(firstWriteOutcome({ kind: "refused" })).toBe("refused");
  });
  it("FO2 그만두기·지우기는 stopped", () => {
    expect(firstWriteOutcome({ kind: "stopped" })).toBe("stopped");
  });
  it("FO3 저장은 saved", () => {
    expect(firstWriteOutcome(finished({ ok: true }))).toBe("saved");
  });
  it("FO4 cancelled는 stopped", () => {
    expect(
      firstWriteOutcome(
        finished({ ok: false, stage: "generation", reason: "interrupted: x", cancelled: true }),
      ),
    ).toBe("stopped");
  });
  it("FO5 다른 쓰기에 막힘은 busy", () => {
    expect(firstWriteOutcome(finished({ ok: false, stage: "already-running", reason: "" }))).toBe(
      "busy",
    );
  });
  it.each([
    ["generation", "interrupted: 앞을 벗어남"],
    ["vision", "vision-failed: cancelled"],
  ])("FO6 %s의 끊김은 interrupted", (stage, reason) => {
    expect(firstWriteOutcome(finished({ ok: false, stage, reason }))).toBe("interrupted");
  });
  it.each([
    ["generation", "rejected: echo"],
    ["generation", "timed-out: x"],
    ["generation", "generation-failed: x"],
    ["storage", "x"],
    ["signals", "x"],
    ["vision", "vision-failed: all"],
    ["model-not-ready", "x"],
  ])("FO7 %s(%s)은 failed", (stage, reason) => {
    expect(firstWriteOutcome(finished({ ok: false, stage, reason }))).toBe("failed");
  });
  it("FO7 쓰기가 던지면 failed", () => {
    expect(firstWriteOutcome({ kind: "threw" })).toBe("failed");
  });
});

describe("readFirstDiaryMaterial", () => {
  const preview = (over: Partial<DayPreview> = {}): DayPreview =>
    ({
      day: TODAY,
      photos: { kind: "known", count: 1 },
      places: { kind: "none" },
      photoAccess: "ok",
      ...over,
    }) as DayPreview;

  it("FM1 오늘 일기가 있으면 미리보기를 읽지 않고 묻지 않는다", async () => {
    const previewDay = jest.fn(async () => preview());
    await expect(
      readFirstDiaryMaterial({ now: NOW, hasDiary: async () => true, previewDay }),
    ).resolves.toEqual({ day: TODAY, canAsk: false });
    expect(previewDay).not.toHaveBeenCalled();
  });

  it("FM2 사진이나 장소가 하나라도 있으면 묻는다", async () => {
    const read = (over: Partial<DayPreview>) =>
      readFirstDiaryMaterial({
        now: NOW,
        hasDiary: async () => false,
        previewDay: async () => preview(over),
      });
    await expect(read({})).resolves.toEqual({ day: TODAY, canAsk: true });
    await expect(
      read({ photos: { kind: "none" }, places: { kind: "known", count: 2 } }),
    ).resolves.toEqual({ day: TODAY, canAsk: true });
  });

  it("FM2 관측된 0과 볼 수 없음은 묻지 않는다", async () => {
    const read = (over: Partial<DayPreview>) =>
      readFirstDiaryMaterial({
        now: NOW,
        hasDiary: async () => false,
        previewDay: async () => preview(over),
      });
    await expect(
      read({ photos: { kind: "none" }, places: { kind: "none" } }),
    ).resolves.toMatchObject({ canAsk: false });
    await expect(
      read({ photos: { kind: "unknown" }, places: { kind: "unknown" } } as Partial<DayPreview>),
    ).resolves.toMatchObject({ canAsk: false });
  });

  it("FM3 일기 유무·미리보기가 던져도 던지지 않고 묻지 않는다", async () => {
    await expect(
      readFirstDiaryMaterial({
        now: NOW,
        hasDiary: () => Promise.reject(new Error("x")),
        previewDay: async () => preview(),
      }),
    ).resolves.toEqual({ day: TODAY, canAsk: false });
    await expect(
      readFirstDiaryMaterial({
        now: NOW,
        hasDiary: async () => false,
        previewDay: () => Promise.reject(new Error("x")),
      }),
    ).resolves.toEqual({ day: TODAY, canAsk: false });
  });

  it("미리보기 통로가 없으면 묻지 않는다", async () => {
    await expect(
      readFirstDiaryMaterial({ now: NOW, hasDiary: async () => false, previewDay: undefined }),
    ).resolves.toEqual({ day: TODAY, canAsk: false });
  });

  it("FM4 한도를 넘으면 묻지 않는다", async () => {
    jest.useFakeTimers();
    try {
      const reading = readFirstDiaryMaterial({
        now: NOW,
        hasDiary: async () => false,
        previewDay: () => new Promise<DayPreview>(() => {}),
      });
      await jest.advanceTimersByTimeAsync(FIRST_DIARY_READ_LIMIT_MS);
      await expect(reading).resolves.toEqual({ day: TODAY, canAsk: false });
    } finally {
      jest.useRealTimers();
    }
  });
});
