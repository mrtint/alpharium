/**
 * 개발자 화면의 쓸 차례 예약 줄 (085).
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md DV1·DV4
 *       spec.md FR-022, research R12·R15
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 운영체제 예약표에서 읽은 우리 예약을 그대로 옮긴다 — 세거나 재는 것이 아니다(원칙 IV). 「다음」은 `data.at`이 가장 이른 것이다
 * (iOS는 예약표에서 시각을 되읽지 못한다 — research R2). 시각을 아는 예약이 하나도 없으면 줄을 그리지 않는다(FR-022 — 읽지
 * 못한 것을 「없음」으로 단정하지 않는다, 승인되지 않은 문구를 만들지 않는다).
 *
 * `getHours()`는 **표시용 시**다 — 하루 기준 계산이 아니다(DB11 허용 목록에 이 이유로 올라 있다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { text } from "../i18n/current";

export function reminderSummaryLine(list: readonly { at: number | null }[]): string | undefined {
  if (list.length === 0) return text().reminder.developerNone;
  const known = list.map((r) => r.at).filter((at): at is number => at !== null);
  if (known.length === 0) return undefined;
  const next = new Date(Math.min(...known));
  return text().reminder.developerLine(
    list.length,
    next.getMonth() + 1,
    next.getDate(),
    next.getHours(),
  );
}
