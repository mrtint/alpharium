/**
 * 홈 배터리 안내를 보일지 정한다 (104, 계약 home-notice.md BN1~BN4) — 순수 함수.
 *
 * 예외가 없는 안드로이드에서 「백그라운드가 못 써서 앱을 열어야 했던」 순간(앱 열기 자동 쓰기가 저장된 뒤)에만 배터리 예외를 권한다.
 * 닫으면 7일 동안 다시 보이지 않는다. **모르는 것은 보이지 않는다**(원칙 V) — 예외 상태를 읽지 못했거나(`unknown`) 닫은 시각 기록을
 * 읽지 못했으면(`"unreadable"`) 안내하지 않는다.
 *
 * 「7일」은 일기의 하루가 아니라 안내를 숨기는 기간이라 밀리초 차이다 — 하루 경계(자정, `day-boundary.ts`)를 쓰지 않는다(BN4).
 * 「지금」은 인자로 받는다.
 */

import type { BatteryExceptionStatus } from "../schedule/battery-exception-port";

import type { DismissedAt } from "./battery-notice-store";
import type { AppPlatform } from "./platform";

/** 안내를 닫은 뒤 다시 보이기까지 — 사람이 정한 값(7일) */
export const BATTERY_NOTICE_HIDE_MS = 7 * 24 * 60 * 60 * 1000;

export function shouldShowBatteryNotice(input: {
  platform: AppPlatform;
  status: BatteryExceptionStatus;
  dismissedAt: DismissedAt;
  now: Date;
}): boolean {
  if (input.platform !== "android" || input.status !== "restricted") return false;
  if (input.dismissedAt === "unreadable") return false;
  if (input.dismissedAt === null) return true;
  const elapsed = input.now.getTime() - input.dismissedAt;
  // 음수는 시계가 뒤로 갔다는 뜻이다 — 얼마나 지났는지 모르므로 보이지 않는다
  return elapsed >= BATTERY_NOTICE_HIDE_MS;
}
