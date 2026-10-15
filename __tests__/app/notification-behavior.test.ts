/**
 * 085 — 앞쪽 숨김과 쓸 차례 응답 판별.
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md FG1·FG2·RA5
 *       spec.md FR-021·FR-023
 */

import {
  isWriteReminderResponse,
  notificationBehaviorFor,
} from "../../src/app/notification-behavior";

const note = (data: unknown) => ({ request: { content: { data } } }) as never;
const SHOW = {
  shouldShowBanner: true,
  shouldShowList: true,
  shouldPlaySound: false,
  shouldSetBadge: false,
};
const HIDE = {
  shouldShowBanner: false,
  shouldShowList: false,
  shouldPlaySound: false,
  shouldSetBadge: false,
};

describe("FG1 — 쓸 차례 알림은 앞에서 숨긴다", () => {
  it("넷 다 거짓", () => {
    expect(
      notificationBehaviorFor(note({ day: "2026-10-15", kind: "write-reminder", at: 1 })),
    ).toEqual(HIDE);
  });
});

describe("FG2 — 그 밖은 지금 값이다", () => {
  it.each([
    ["완성 알림", note({ day: "2026-10-15" })],
    ["data 없음", note(undefined)],
    ["request 없음", {} as never],
    ["null", null as never],
  ])("%s", (_, n) => {
    expect(notificationBehaviorFor(n)).toEqual(SHOW);
  });
});

describe("RA5 — 쓸 차례 알림 응답인가", () => {
  const response = (data: unknown) =>
    ({ notification: { request: { content: { data } } } }) as never;

  it("쓸 차례 알림이면 참", () => {
    expect(isWriteReminderResponse(response({ day: "2026-10-15", kind: "write-reminder" }))).toBe(
      true,
    );
  });

  it.each([
    ["완성 알림", response({ day: "2026-10-15" })],
    ["null", null],
    ["모양이 깨짐", { notification: null } as never],
    ["kind가 다름", response({ kind: "other" })],
  ])("%s이면 거짓", (_, r) => {
    expect(isWriteReminderResponse(r as never)).toBe(false);
  });
});
