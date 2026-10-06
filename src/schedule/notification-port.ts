/**
 * 로컬 알림 통로 (020).
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/notification.md
 *       N2·N3·N8
 *       spec.md FR-004·FR-006·FR-012·헌법 원칙 II
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **완료 직후 즉시 로컬 알림**(`trigger: null`)만 쓴다. 예약 알림·DAILY
 * 트리거·TIME_INTERVAL 반복은 쓰지 않는다(019의 alarm 배제 계승).
 *
 * **알림 문구**(N2 → 057 갱신, 원칙 II):
 *  - 제목은 부르는 쪽이 넘긴다 — 057부터 「{이름}{이|가} {M}월 {d}일 일기를 다 썼어요」(`notification-text.ts`).
 *    020의 고정 문구 「오늘의 일기가 준비됐어요」는 지난날을 써도 「오늘」이라고 해서 걷었다.
 *  - 본문 줄이 없다(057 Clarification Q4). 일기 내용을 요약해 넣지 않는다 — 열어야 확인 가능.
 *  - 감상·단정을 넣지 않는다 — "즐거운 하루였네요" 류 금지.
 *  - 모델 정보 없음(원칙 III). 이름은 사용자가 부르는 호칭뿐이다.
 *  - 누르면 갈 날은 `data.day`로 전달한다.
 *
 * 지연 import: `expo-notifications`를 메서드 안에서 `await import`한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { NotificationResponse } from "expo-notifications";

import type { DayDate } from "../config/day-boundary";
import { text } from "../i18n/current";

/** 안드로이드 채널 id. 채널이 없으면 권한 프롬프트도 안 뜨고 알림도 안 보인다. */
const CHANNEL_ID = "diary-completed";

export interface NotificationPort {
  /** 안드로이드 채널 보장. 앱 시작 시 1회. */
  ensureChannel(): Promise<void>;
  /** POST_NOTIFICATIONS 런타임 권한 요청 (Android 13+). 자동 생성 켤 때. */
  requestPermission(): Promise<"granted" | "denied">;
  /**
   * 현재 권한 상태만 조회한다 (요청하지 않는다). 021 온보딩이 단계 완료 여부를
   * 판정할 때 쓴다 — `requestPermission`은 창을 띄우므로 상태 표시에는 쓸 수 없다.
   */
  getPermission(): Promise<"granted" | "denied" | "undetermined" | "blocked">;
  /**
   * 즉시 로컬 알림. trigger: null. data에 { day }를 싣는다. 제목은 부르는 쪽이 만든 한 줄, 본문 없음(057).
   * 반환값은 notification identifier (notified.json에 저장).
   */
  present(day: DayDate, title: string): Promise<string>;
  /** 트레이에서 특정 알림을 걷어낸다 (replace 모드). */
  dismiss(notificationId: string): Promise<void>;
  /** 콜드 스타트: 앱을 연 마지막 알림 응답. 없으면 null. */
  lastResponse(): Promise<NotificationResponse | null>;
  /** 웜: 탭 응답 리스너. 반환값은 해제 함수. */
  onResponse(handler: (r: NotificationResponse) => void): () => void;
}

/**
 * 기기의 로컬 알림 통로.
 */
export function expoNotificationPort(): NotificationPort {
  return {
    async ensureChannel() {
      const Notifications = await import("expo-notifications");
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: text().notification.channelName,
        importance: Notifications.AndroidImportance.HIGH,
      });
    },

    async requestPermission() {
      const Notifications = await import("expo-notifications");
      const existing = await Notifications.getPermissionsAsync();
      if (existing.granted) return "granted";
      const requested = await Notifications.requestPermissionsAsync();
      return requested.granted ? "granted" : "denied";
    },

    async getPermission() {
      try {
        const Notifications = await import("expo-notifications");
        const existing = await Notifications.getPermissionsAsync();
        if (existing.granted) return "granted";
        if (existing.status === "undetermined") return "undetermined";
        return existing.canAskAgain ? "denied" : "blocked";
      } catch {
        return "undetermined";
      }
    },

    async present(day, title) {
      const Notifications = await import("expo-notifications");
      // **trigger: null = 즉시.** 예약·반복 트리거를 쓰지 않는다.
      return Notifications.scheduleNotificationAsync({
        content: {
          title,
          data: { day },
        },
        trigger: null,
      });
    },

    async dismiss(notificationId) {
      const Notifications = await import("expo-notifications");
      try {
        await Notifications.dismissNotificationAsync(notificationId);
      } catch {
        // 트레이에 없어도 예외를 밖으로 던지지 않는다(N8).
      }
    },

    async lastResponse() {
      const Notifications = await import("expo-notifications");
      return Notifications.getLastNotificationResponseAsync();
    },

    onResponse(handler) {
      let subscription: { remove: () => void } | undefined;
      void import("expo-notifications").then((Notifications) => {
        subscription = Notifications.addNotificationResponseReceivedListener(handler);
      });
      return () => subscription?.remove();
    },
  };
}
