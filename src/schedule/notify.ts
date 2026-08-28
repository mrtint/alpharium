/**
 * 알림 발송 판정 — "보낼지, 어떻게" (020).
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/notification.md N1
 *       spec.md FR-004·FR-005·FR-007·FR-013
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **순수 함수.** 알림 문구는 이 함수가 만들지 않는다 —
 * `notification-port.ts`의 고정 문구 상수를 어댑터가 쓴다. 이 함수는
 * "보낼지/어떻게"만 정한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DayDate } from "../config/day-boundary";
import type { NotifiedEntry } from "./notified-store";

export type NotifyDecision =
  | { send: false; reason: "generation-failed" | "already-acknowledged" }
  | { send: true; mode: "new" }
  | { send: true; mode: "replace"; dismissId: string };

/**
 * 지금 이 날짜의 완료 알림을 보낼지 정한다.
 *
 * 판정 순서(고정):
 *  1. `!generationSucceeded` → `{ send: false, reason: "generation-failed" }`
 *     (FR-005, SC-006).
 *  2. `notified?.acknowledged === true` → `{ send: false, reason:
 *     "already-acknowledged" }` (FR-007 (2), FR-013).
 *  3. `notified !== null && !acknowledged` → `{ send: true, mode:
 *     "replace", dismissId }` (FR-007 (1) — 기존 것 걷어내고 갱신).
 *  4. 그 외 → `{ send: true, mode: "new" }`.
 */
export function decideNotify(input: {
  day: DayDate;
  generationSucceeded: boolean;
  notified: NotifiedEntry | null;
}): NotifyDecision {
  const { generationSucceeded, notified } = input;

  if (!generationSucceeded) {
    return { send: false, reason: "generation-failed" };
  }

  if (notified?.acknowledged === true) {
    return { send: false, reason: "already-acknowledged" };
  }

  if (notified !== null && notified.acknowledged === false) {
    return { send: true, mode: "replace", dismissId: notified.notificationId };
  }

  return { send: true, mode: "new" };
}
