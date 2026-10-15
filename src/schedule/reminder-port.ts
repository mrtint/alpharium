/**
 * 쓸 차례 알림 통로 (085).
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md RT1~RT4
 *       research R2·R4·R16
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **예약 알림은 앱 없이 운영체제가 띄운다** — 안드로이드는 `AlarmManager`(정확 알람 권한이 없어 Android 12+는 부정확한
 * `setAndAllowWhileIdle`)와 네이티브 리시버가, iOS는 `UNTimeIntervalNotificationTrigger`가 게시한다. 그 순간 JS는 돌지 않는다
 * (그래서 재료 없는 날을 뺄 수 없다 — spec Clarifications). 020이 예약 알림을 배제한 근거(「그 시각에 일기가 있다는 보장이 없다」)는
 * 알림의 뜻이 「다 썼다」였을 때의 것이다 — 이 알림은 「열면 쓴다」다(research R4).
 *
 * **울릴 시각은 `data.at`에 함께 싣는다**(R16) — iOS 예약표에는 처음 간격만 남아 시각을 되읽을 수 없다. 맞추기가 「같은 예약인가」를
 * `id`·`at`·`title`로 가른다. 본문 줄은 없다(일기 내용을 담지 않는다 — 020 FR-012).
 *
 * `scheduled()`·`presented()`는 **실패하면 던진다** — 빈 목록으로 바꾸면 「예약 없음」으로 단정하게 된다(원칙 V).
 * 지연 import: `expo-notifications`를 메서드 안에서 불러온다(`load`). 테스트는 `load`로 대역을 넘긴다 — jest `logic`(node)에서는
 * 동적 import가 돌지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DayDate } from "../config/day-boundary";
import { REMINDER_ID_PREFIX, type ReminderPlanEntry } from "./reminder-plan";

/** 안드로이드 채널 id — 「일기 쓸 시각 알림」. 채널은 `notification-port.ts`의 `ensureChannel`이 만든다 */
export const REMINDER_CHANNEL_ID = "diary-reminder";

/** 알림 `data.kind` — 앞쪽 숨김(085 FR-021)과 누름 판별(FR-023)이 본다. 라우팅(020)은 `day`만 읽는다 */
export const WRITE_REMINDER_KIND = "write-reminder";

export type ScheduledReminder = {
  id: string;
  day: DayDate | null;
  at: number | null;
  title: string | null;
};

export type PresentedReminder = { id: string; day: DayDate | null };

export interface ReminderPort {
  /** 우리 예약(접두사). 실패하면 던진다 */
  scheduled(): Promise<ScheduledReminder[]>;
  /** 날짜 예약 하나를 건다(같은 id면 바꿔 낀다) */
  schedule(entry: ReminderPlanEntry): Promise<void>;
  /** 예약 하나를 취소한다. 없어도 던지지 않는다 */
  cancel(id: string): Promise<void>;
  /** 트레이에 떠 있는 우리 알림(접두사). 실패하면 던진다 */
  presented(): Promise<PresentedReminder[]>;
  /** 트레이에서 걷는다. 없어도 던지지 않는다 */
  dismiss(id: string): Promise<void>;
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dataOf(content: unknown): Record<string, unknown> {
  const data = (content as { data?: unknown } | null | undefined)?.data;
  return typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
}

const dayIn = (data: Record<string, unknown>): DayDate | null =>
  typeof data.day === "string" && DAY_PATTERN.test(data.day) ? data.day : null;

const ours = (id: unknown): id is string =>
  typeof id === "string" && id.startsWith(REMINDER_ID_PREFIX);

type NotificationsModule = typeof import("expo-notifications");

export function expoReminderPort(
  load: () => Promise<NotificationsModule> = () => import("expo-notifications"),
): ReminderPort {
  return {
    async scheduled() {
      const Notifications = await load();
      const requests = await Notifications.getAllScheduledNotificationsAsync();
      return requests
        .filter((request) => ours(request.identifier))
        .map((request) => {
          const data = dataOf(request.content);
          const title = (request.content as { title?: unknown } | undefined)?.title;
          return {
            id: request.identifier,
            day: dayIn(data),
            at: typeof data.at === "number" && Number.isFinite(data.at) ? data.at : null,
            title: typeof title === "string" ? title : null,
          };
        });
    },

    async schedule(entry) {
      const Notifications = await load();
      await Notifications.scheduleNotificationAsync({
        identifier: entry.id,
        content: {
          title: entry.title,
          data: { day: entry.day, kind: WRITE_REMINDER_KIND, at: entry.at },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: entry.at,
          channelId: REMINDER_CHANNEL_ID,
        },
      });
    },

    async cancel(id) {
      try {
        const Notifications = await load();
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {
        // 이미 없어도 할 일은 없다.
      }
    },

    async presented() {
      const Notifications = await load();
      const shown = await Notifications.getPresentedNotificationsAsync();
      return shown
        .filter((notification) => ours(notification.request?.identifier))
        .map((notification) => ({
          id: notification.request.identifier,
          day: dayIn(dataOf(notification.request.content)),
        }));
    },

    async dismiss(id) {
      try {
        const Notifications = await load();
        await Notifications.dismissNotificationAsync(id);
      } catch {
        // 트레이에 없어도 던지지 않는다(020 N8).
      }
    },
  };
}
