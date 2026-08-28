/**
 * 알림 응답 → 화면 라우팅 판정 (020).
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/notification.md N5
 *       spec.md FR-006·SC-004
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **순수 함수.** `NotificationResponse` 안의 `content.data.day`만 읽고,
 * 화면 전이는 하지 않는다 — `App.tsx`/`DiaryHomeScreen`이 결과를 받아
 * `initialScreen` 확장으로 처리한다.
 *
 * **`src/schedule/`가 아니라 `src/app/`에 둔다** — 이것은 앱 진입점의
 * 라우팅 접착제이지 스케줄 판정이 아니다. `diary/*`를 import하지 않는다는
 * 것을 아래 테스트가 검사하므로 `checkScheduleFile` 스캔 대상이 아니어도
 * 안전하다(F3).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { NotificationResponse } from "expo-notifications";

import type { DayDate } from "../config/day-boundary";

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 알림 응답에서 열어야 할 하루를 뽑는다.
 *
 *  - `response === null` → `null` (알림으로 안 열림, 정상 시작).
 *  - `content.data.day`가 `YYYY-MM-DD` 꼴 → `{ day }`.
 *  - 그 외(형식 불명, day 없음) → `null` (조용히 정상 시작 — 원칙 V,
 *    모르면 지어내지 않는다).
 */
export function routeFromNotification(
  response: NotificationResponse | null | undefined,
): { day: DayDate } | null {
  if (response === null || response === undefined) return null;

  const data = response.notification?.request?.content?.data as Record<string, unknown> | undefined;
  const day = data?.day;

  if (typeof day === "string" && DAY_PATTERN.test(day)) {
    return { day };
  }
  return null;
}
