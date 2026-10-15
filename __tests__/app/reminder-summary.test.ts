/**
 * 085 — 개발자 화면의 쓸 차례 예약 줄.
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md DV1
 *       spec.md FR-022
 */

import { reminderSummaryLine } from "../../src/app/reminder-summary";

const r = (day: string, at: number | null) => ({
  id: `diary-reminder-${day}`,
  day,
  at,
  title: "t",
});
const at = (m: number, d: number, h: number) => new Date(2026, m - 1, d, h).getTime();

describe("DV1", () => {
  it("빈 목록이면 「예약 없음」", () => {
    expect(reminderSummaryLine([])).toBe("쓸 차례 알림 · 예약 없음");
  });

  it("개수와 가장 이른 시각 — 순서가 섞여 있어도", () => {
    expect(
      reminderSummaryLine([
        r("2026-10-17", at(10, 17, 22)),
        r("2026-10-15", at(10, 15, 22)),
        r("2026-10-16", at(10, 16, 22)),
      ]),
    ).toBe("쓸 차례 알림 · 3개 예약 · 다음 10월 15일 22시");
  });

  it("시각을 모르는 항목은 세되 「다음」에서 뺀다", () => {
    expect(reminderSummaryLine([r("2026-10-15", null), r("2026-10-16", at(10, 16, 7))])).toBe(
      "쓸 차례 알림 · 2개 예약 · 다음 10월 16일 7시",
    );
  });

  it("모두 모르면 줄이 없다", () => {
    expect(reminderSummaryLine([r("2026-10-15", null)])).toBeUndefined();
  });
});
