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
 * **알림 문구는 고정 상수 2개다**(N2, 원칙 II):
 *  - 본문(일기 내용)을 요약해 넣지 않는다 — 열어야 확인 가능.
 *  - 감상·단정을 넣지 않는다 — "즐거운 하루였네요" 류 금지.
 *  - 날짜조차 문구에 안 넣는다. `data.day`로만 전달한다.
 *  - 캐릭터 이름·모델 정보 없음(원칙 III).
 *
 * 지연 import: `expo-notifications`를 메서드 안에서 `await import`한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { NotificationResponse } from "expo-notifications";

import type { DayDate } from "../config/day-boundary";

/** 안드로이드 채널 id. 채널이 없으면 권한 프롬프트도 안 뜨고 알림도 안 보인다. */
const CHANNEL_ID = "diary-completed";

/** 알림 제목. 일기 내용을 담지 않는다(FR-012, 원칙 II). */
const NOTIFICATION_TITLE = "오늘의 일기가 준비됐어요";
/** 알림 본문. 감상·요약을 담지 않는다 — 눌러서 열어야 확인 가능(FR-012). */
const NOTIFICATION_BODY = "눌러서 방금 쓰인 일기를 읽어보세요.";

export interface NotificationPort {
  /** 안드로이드 채널 보장. 앱 시작 시 1회. */
  ensureChannel(): Promise<void>;
  /** POST_NOTIFICATIONS 런타임 권한 요청 (Android 13+). 자동 생성 켤 때. */
  requestPermission(): Promise<"granted" | "denied">;
  /**
   * 즉시 로컬 알림. trigger: null. data에 { day }를 싣는다.
   * 반환값은 notification identifier (notified.json에 저장).
   */
  present(day: DayDate): Promise<string>;
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
        name: "일기 완성 알림",
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

    async present(day) {
      const Notifications = await import("expo-notifications");
      // **trigger: null = 즉시.** 예약·반복 트리거를 쓰지 않는다.
      return Notifications.scheduleNotificationAsync({
        content: {
          title: NOTIFICATION_TITLE,
          body: NOTIFICATION_BODY,
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
