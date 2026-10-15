/**
 * 한국어 카탈로그 — 쓸 차례 알림 (085).
 *
 * **보드 밖 — 소유자 승인 2026-10-15**(설계문서 `docs/superpowers/specs/2026-10-15-write-reminder-design.md` §6·spec Clarifications).
 * 062 골든 키에 묶인 영역(`settings`·`notification`)에 새 키를 섞지 않으려고 따로 둔다(074·078·081 선례).
 *
 * **일기 내용·감상을 담지 않는다**(020 FR-012, 원칙 II) — 이름과 날짜만. 이름은 사용자가 지은 호칭이다(원칙 III).
 */

import { particleFor } from "../../../diary/particle";

export const reminder = {
  /** 쓸 차례 알림 제목 — 「{이름}{이|가} {M}월 {d}일 일기를 쓸 차례예요」, 본문 없음 */
  title: (name: string, month: number, date: number): string =>
    `${name}${particleFor(name)} ${month}월 ${date}일 일기를 쓸 차례예요`,
  /** 안드로이드 알림 채널 이름 — OS 설정 화면에 보인다 */
  channelName: "일기 쓸 시각 알림",
  /** 자동 쓰기가 켜져 있고 알림이 허용 안 됨일 때 설정 알림 행 아래 빨간 줄 */
  notificationOff: "알림이 꺼져 있어 쓸 차례를 알리지 못해요",
  /** 개발자 화면 맨 아래 예약 줄 — 시는 24시간 */
  developerLine: (n: number, month: number, date: number, hour: number): string =>
    `쓸 차례 알림 · ${n}개 예약 · 다음 ${month}월 ${date}일 ${hour}시`,
  developerNone: "쓸 차례 알림 · 예약 없음",
};
