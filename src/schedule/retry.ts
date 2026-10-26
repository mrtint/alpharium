/**
 * 재시도 대상 하루 선정 (020).
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/schedule-decision.md
 *       D5
 *       spec.md FR-013, spec Clarifications(재시도 대상)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **순수 함수. 하루 경계·3일을 다시 계산하지 않는다**(FR-021a).
 *
 * `selectableDays`(009의 `selectableDays(now)` 결과)와 저장소에 이미 있는
 * 일기 날짜만 본다. 009 범위 밖(그그제보다 오래된 날)은 애초에
 * `selectableDays`가 주지 않으므로, 이 함수가 그 배열만 보면 자동으로
 * 제약이 걸린다 — 별도 경계 코드가 필요 없다(009의 `latestClosedDay`·
 * `selectableDays`가 하루 경계(049부터 자정)와 3일을 이미 캡슐화).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DayDate } from "../config/day-boundary";

/**
 * `selectableDays` 중 일기가 없는 하루 **전부**를 가장 최근부터 돌려준다 (105).
 * 훑기(`resolveAutoWrite`)가 재료 있는 첫 날을 찾으려고 순서대로 본다. 전부 있으면 빈 배열.
 *
 * `YYYY-MM-DD`는 사전순이 곧 시간순이므로 「가장 최근 먼저」 = 사전순 내림차순이다.
 * 결과는 **항상 `selectableDays`의 부분집합**이다(후보를 넓히지 않는다).
 */
export function pickRetryDays(
  selectableDays: readonly DayDate[],
  existingDiaryDays: readonly DayDate[],
): DayDate[] {
  const existing = new Set(existingDiaryDays);
  return selectableDays
    .filter((day) => !existing.has(day))
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

/**
 * `selectableDays` 중 일기가 없는 **가장 최근** 하루 1개를 돌려준다.
 * 전부 있으면 `null`. `pickRetryDays`의 첫 원소다.
 */
export function pickRetryDay(
  selectableDays: readonly DayDate[],
  existingDiaryDays: readonly DayDate[],
): DayDate | null {
  return pickRetryDays(selectableDays, existingDiaryDays)[0] ?? null;
}
