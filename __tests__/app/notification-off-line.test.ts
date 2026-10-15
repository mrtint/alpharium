/**
 * 085 — 설정 알림 행 아래 「알림이 꺼져 있어 …」 줄의 판정.
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md ST1
 *       spec.md FR-015·FR-016
 */

import { notificationOffLine } from "../../src/app/notification-off-line";

const LINE = "알림이 꺼져 있어 쓸 차례를 알리지 못해요";

describe("ST1", () => {
  it("자동 쓰기 켜짐 + 허용 안 함이면 그 줄", () => {
    expect(notificationOffLine(true, "denied")).toBe(LINE);
  });

  it.each(["allowed", "partial", "unread"] as const)("켜짐 + %s이면 없다", (tag) => {
    expect(notificationOffLine(true, tag)).toBeUndefined();
  });

  it("꺼짐이면 허용 안 함이어도 없다", () => {
    expect(notificationOffLine(false, "denied")).toBeUndefined();
  });
});
