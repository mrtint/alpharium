import { decideNotify, type NotifyDecision } from "../../src/schedule/notify";
import type { NotifiedEntry } from "../../src/schedule/notified-store";

/**
 * 알림 발송 판정의 계약 테스트.
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/notification.md N1·N9
 *       spec.md FR-004·FR-005·FR-007·FR-013·SC-006
 */

const ACKED: NotifiedEntry = {
  sentAt: "2026-08-28T07:00:00.000Z",
  acknowledged: true,
  notificationId: "a",
};
const PENDING: NotifiedEntry = {
  sentAt: "2026-08-28T07:00:00.000Z",
  acknowledged: false,
  notificationId: "p-id",
};

describe("N1-1 — 생성 실패면 안 보낸다 (FR-005, SC-006)", () => {
  it("generationSucceeded: false → { send: false, reason: 'generation-failed' }", () => {
    expect(decideNotify({ day: "2026-08-27", generationSucceeded: false, notified: null })).toEqual(
      { send: false, reason: "generation-failed" },
    );
  });

  it("실패면 기존 알림 상태와 무관하게 안 보낸다", () => {
    expect(
      decideNotify({ day: "2026-08-27", generationSucceeded: false, notified: PENDING }),
    ).toEqual({ send: false, reason: "generation-failed" });
  });
});

describe("N1-2 — 이미 확인했으면 안 보낸다 (FR-007 (2), FR-013)", () => {
  it("acknowledged: true → { send: false, reason: 'already-acknowledged' }", () => {
    expect(decideNotify({ day: "2026-08-27", generationSucceeded: true, notified: ACKED })).toEqual(
      { send: false, reason: "already-acknowledged" },
    );
  });
});

describe("N1-3 — 미확인 알림이 있으면 갱신한다 (FR-007 (1))", () => {
  it("acknowledged: false → { send: true, mode: 'replace', dismissId }", () => {
    const d = decideNotify({ day: "2026-08-27", generationSucceeded: true, notified: PENDING });
    expect(d).toEqual({ send: true, mode: "replace", dismissId: "p-id" });
  });
});

describe("N1-4 — 새 알림", () => {
  it("상태가 없으면 { send: true, mode: 'new' }", () => {
    expect(decideNotify({ day: "2026-08-27", generationSucceeded: true, notified: null })).toEqual({
      send: true,
      mode: "new",
    });
  });
});

describe("send: false면 어떤 경우에도 알림이 없다 (불변식)", () => {
  const cases: { label: string; input: Parameters<typeof decideNotify>[0] }[] = [
    { label: "실패", input: { day: "2026-08-27", generationSucceeded: false, notified: null } },
    {
      label: "확인됨",
      input: { day: "2026-08-27", generationSucceeded: true, notified: ACKED },
    },
  ];
  it.each(cases)("$label → send: false", ({ input }) => {
    const d: NotifyDecision = decideNotify(input);
    expect(d.send).toBe(false);
  });
});
