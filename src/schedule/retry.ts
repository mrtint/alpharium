/**
 * 재시도 대상 하루 선정 (020).
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/schedule-decision.md
 *       D5
 *       spec.md FR-013, spec Clarifications(재시도 대상)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **순수 함수. 04:00·3일을 다시 계산하지 않는다**(FR-021a).
 *
 * `selectableDays`(009의 `selectableDays(now)` 결과)와 저장소에 이미 있는
 * 일기 날짜만 본다. 009 범위 밖(그그제보다 오래된 날)은 애초에
 * `selectableDays`가 주지 않으므로, 이 함수가 그 배열만 보면 자동으로
 * 제약이 걸린다 — 별도 경계 코드가 필요 없다(009의 `latestClosedDay`·
 * `selectableDays`가 04:00과 3일을 이미 캡슐화).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DayDate } from "../config/day-boundary";

/**
 * `selectableDays` 중 일기가 없는 **가장 최근** 하루 1개를 돌려준다.
 * 전부 있으면 `null`.
 *
 * `YYYY-MM-DD`는 사전순이 곧 시간순이므로 "가장 최근" = 사전순 최대다.
 * 결과는 **항상 `selectableDays`의 원소이거나 `null`**이다.
 */
export function pickRetryDay(
  selectableDays: readonly DayDate[],
  existingDiaryDays: readonly DayDate[],
): DayDate | null {
  const existing = new Set(existingDiaryDays);
  const missing = selectableDays.filter((day) => !existing.has(day));
  if (missing.length === 0) return null;

  // 사전순 최대 = 가장 최근.
  return missing.reduce((latest, day) => (day > latest ? day : latest));
}
