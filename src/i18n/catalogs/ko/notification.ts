/**
 * 한국어 카탈로그 — 알림 (062). 헤드리스 백그라운드에서도 읽힌다(FR-010).
 *
 * 원래 자리: `src/schedule/notification-text.ts`(057 보드 `notif.autoWriteDone`), `src/schedule/notification-port.ts`의 채널 이름(020).
 *
 * **일기 내용·요약·감상을 담지 않는다**(020 FR-012, 원칙 II) — 이름과 날짜만. 이름은 사용자가 지은 호칭이라 번역하지 않는다(FR-018).
 */

import { particleFor } from "../../../diary/particle";

export const notification = {
  /** 「{이름}{이|가} {M}월 {d}일 일기를 다 썼어요」 — 본문 줄은 없다(057 Clarification Q4) */
  autoWriteDone: (name: string, month: number, date: number): string =>
    `${name}${particleFor(name)} ${month}월 ${date}일 일기를 다 썼어요`,
  /** 안드로이드 알림 채널 이름 — OS 설정 화면에 보인다 */
  channelName: "일기 완성 알림",
};
