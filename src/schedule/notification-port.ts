/**
 * 로컬 알림 통로 (020).
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/notification.md
 *       N2·N3·N8
 *       spec.md FR-004·FR-006·FR-012·헌법 원칙 II
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **완성 알림은 즉시 게시이고 `diary-completed` 채널로 간다**(085 C2 — `trigger: null`이면 Expo 기본 채널
 * 「Miscellaneous」로 게시돼 앱 채널 설정이 아무 효과가 없었다, 062 관측). 예약은 이 파일에 없다 — 085의 쓸 차례
 * 알림(`reminder-port.ts`)에만 있다. 020이 예약 알림을 배제한 근거는 알림의 뜻이 「다 썼다」였을 때의 것이다
 * (specs/085-write-reminder/research.md R4).
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
import { REMINDER_CHANNEL_ID } from "./reminder-port";

/** 안드로이드 채널 id. 채널이 없으면 권한 프롬프트도 안 뜨고 알림도 안 보인다. */
const CHANNEL_ID = "diary-completed";

export interface NotificationPort {
  /**
   * 안드로이드 채널 보장 — 완성 알림(`diary-completed`)과 085 쓸 차례 알림(`diary-reminder`). 앱 시작 시 1회, 그리고 085부터
   * 맞추기·완성 알림이 예약·게시 전에 한 번 더 부른다(앱을 열기 전 헤드리스 실행에서 채널이 없으면 기본 채널로 간다 — research 085 R17).
   */
  ensureChannel(): Promise<void>;
  /** POST_NOTIFICATIONS 런타임 권한 요청 (Android 13+). 자동 생성 켤 때. */
  requestPermission(): Promise<"granted" | "denied">;
  /**
   * 현재 권한 상태만 조회한다 (요청하지 않는다). 021 온보딩이 단계 완료 여부를
   * 판정할 때 쓴다 — `requestPermission`은 창을 띄우므로 상태 표시에는 쓸 수 없다.
   */
  getPermission(): Promise<"granted" | "denied" | "undetermined" | "blocked">;
  /**
   * 즉시 로컬 알림. trigger: { channelId }(085 C2). data에 { day }를 싣는다. 제목은 부르는 쪽이 만든 한 줄, 본문 없음(057).
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
      // 085 — 채널마다 따로 만든다: 하나가 실패해도 다른 하나는 선다(없는 채널로 온 알림은 기본 채널로 간다).
      // 쓸 차례 알림은 DEFAULT(헤드업 없음) — 배터리 예외·iOS 사용자는 목표 시각에 쓸 차례 알림이 서고 몇 분 뒤 백그라운드가 쓰면
      // 그것이 거둬지고 완성 알림(HIGH)이 선다. 둘 다 HIGH면 두 번 크게 울린다(소유자 결정 2026-10-15, 코드 리뷰). 안드로이드는 이미 있는
      // 채널의 중요도를 사용자가 바꾸지 않았을 때 더 낮게만 바꿔 준다 — 시험 빌드의 HIGH 채널도 DEFAULT로 내려간다.
      const failures: unknown[] = [];
      for (const [id, name, importance] of [
        [CHANNEL_ID, text().notification.channelName, Notifications.AndroidImportance.HIGH],
        [REMINDER_CHANNEL_ID, text().reminder.channelName, Notifications.AndroidImportance.DEFAULT],
      ] as const) {
        await Notifications.setNotificationChannelAsync(id, { name, importance }).catch(
          (error: unknown) => failures.push(error),
        );
      }
      if (failures.length > 0) throw failures[0];
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
      // **채널만 준 트리거 = 즉시**(안드로이드는 그 채널로 게시, iOS는 null과 같다 — 085 research R5). 예약·반복 트리거를 쓰지 않는다.
      return Notifications.scheduleNotificationAsync({
        content: {
          title,
          data: { day },
        },
        trigger: { channelId: CHANNEL_ID },
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
