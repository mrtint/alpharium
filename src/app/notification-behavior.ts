/**
 * 알림이 앞에서 어떻게 보이는가·응답이 쓸 차례 알림인가 (085).
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md FG1·FG2·RA5
 *       spec.md FR-021·FR-023
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **순수 함수.** `App.tsx`의 `setNotificationHandler`가 앞에 있을 때 받은 알림마다 묻는다(안드로이드는 앱이 RESUMED일 때만, iOS는
 * `willPresent`) — 쓸 차례 알림은 「열어 주세요」라서 이미 앱 안에 있는 사용자에게는 할 말이 아니다. 숨긴다. 완성 알림은 종전대로
 * 배너·목록에 보인다(020 research §1).
 *
 * 누른 응답이 쓸 차례 알림이면 그 실행의 앱 열기 자동 쓰기 「한 번」을 다시 연다(FR-023 — `App.tsx`의 `onResponse`).
 * 갈래는 `data.kind`로만 가른다(문구로 가르지 않는다 — 062 B5).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Notification, NotificationBehavior, NotificationResponse } from "expo-notifications";

import { WRITE_REMINDER_KIND } from "../schedule/reminder-port";

const SHOW: NotificationBehavior = {
  shouldShowBanner: true,
  shouldShowList: true,
  shouldPlaySound: false,
  shouldSetBadge: false,
};

const HIDE: NotificationBehavior = {
  shouldShowBanner: false,
  shouldShowList: false,
  shouldPlaySound: false,
  shouldSetBadge: false,
};

function isWriteReminder(notification: Notification | null | undefined): boolean {
  const data = (notification?.request?.content as { data?: unknown } | undefined)?.data;
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { kind?: unknown }).kind === WRITE_REMINDER_KIND
  );
}

/** 앞에서 받은 알림의 보임새 — 쓸 차례 알림은 숨기고 그 밖은 지금 값 */
export function notificationBehaviorFor(
  notification: Notification | null | undefined,
): NotificationBehavior {
  return isWriteReminder(notification) ? { ...HIDE } : { ...SHOW };
}

/** 누른 응답이 쓸 차례 알림인가 */
export function isWriteReminderResponse(
  response: NotificationResponse | null | undefined,
): boolean {
  return isWriteReminder(response?.notification);
}
