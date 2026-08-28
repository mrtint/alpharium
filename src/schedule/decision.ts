/**
 * 스케줄 판정 — "지금 자동 생성을 돌려야 하는가, 돌린다면 어느 하루를" (020).
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/schedule-decision.md
 *       D1~D4·D7
 *       spec.md FR-001·FR-003·FR-013
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **매 백그라운드 콜백이 이 판정을 한다.** 019 하네스는 무조건
 * `pipeline.run()`을 불렀지만, 020은 조건이 맞을 때만 돈다.
 *
 * **순수 함수. `now`를 인자로 받는다**(D4) — `day-boundary.ts`의 모든 함수와
 * 같은 규칙. 안에서 `new Date()`를 부르면 목표 시각 경계·자정 wrap을
 * 테스트할 수 없다.
 *
 * **04:00·정오·3일은 `selectableDays`(주입)를 통해서만 본다.** 이 파일은
 * 그것을 다시 계산하지 않는다(FR-021a). "목표 시각"은 이 판정만의 축이다 —
 * "그 하루를 지금 쓸 수 있는가"(정오)와도, "어느 하루에 속하는가"(04:00)와도
 * 다르다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DayDate } from "../config/day-boundary";
import { pickRetryDay } from "./retry";
import type { AutoDiarySettings } from "./settings";

export type ScheduleDecision =
  | { act: false; reason: "disabled" | "not-near-target" | "all-written" }
  | { act: true; day: DayDate };

/**
 * 목표 시각으로부터 이 시간 안에 들면 "근방"으로 본다.
 *
 * 근사치(FR-002)이므로 넉넉히. SC-002(24시간 내 1회)와 SC-003(예외 시
 * 1시간 내 1회)은 이 "창"이 아니라 **시도 하한**을 재는 기준이다 — 이 창은
 * "매 15분 콜백 중 어느 구간에서 생성을 시도할 자격이 있는가"를 정한다.
 *
 * **export하지 않는다**(D3) — 부르는 쪽이 이 값을 알면 값이 두 곳에 생긴다
 * (009의 `SELECTABLE_DAY_COUNT`가 밖으로 안 나가는 것과 같은 방식). 테스트도
 * `decideSchedule` 결과로만 검증한다.
 */
const WINDOW_HOURS = 3;

/** `hour`가 `[targetHour, targetHour + WINDOW_HOURS)` 안인가. 자정 wrap 처리. */
function isNearTarget(hour: number, targetHour: number): boolean {
  for (let offset = 0; offset < WINDOW_HOURS; offset += 1) {
    if ((targetHour + offset) % 24 === hour) return true;
  }
  return false;
}

/**
 * 지금 자동 생성을 돌려야 하는가.
 *
 * 판정 순서(고정, D2):
 *  1. `settings.enabled === false` → `{ act: false, reason: "disabled" }`.
 *  2. `now`의 현지 시(hour)가 목표 시각 근방이 아니면
 *     → `{ act: false, reason: "not-near-target" }`.
 *  3. `pickRetryDay`가 `null`이면 → `{ act: false, reason: "all-written" }`.
 *  4. 그 외 → `{ act: true, day }`.
 */
export function decideSchedule(input: {
  settings: AutoDiarySettings;
  now: Date;
  selectableDays: readonly DayDate[];
  existingDiaryDays: readonly DayDate[];
}): ScheduleDecision {
  const { settings, now, selectableDays, existingDiaryDays } = input;

  if (!settings.enabled) {
    return { act: false, reason: "disabled" };
  }

  if (!isNearTarget(now.getHours(), settings.targetHour)) {
    return { act: false, reason: "not-near-target" };
  }

  const day = pickRetryDay(selectableDays, existingDiaryDays);
  if (day === null) {
    return { act: false, reason: "all-written" };
  }

  return { act: true, day };
}
