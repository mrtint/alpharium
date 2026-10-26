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
 * **하루 경계(049부터 자정)·정오·3일은 `selectableDays`(주입)를 통해서만 본다.**
 * 이 파일은 그것을 다시 계산하지 않는다(FR-021a). "목표 시각"은 이 판정만의 축이다 —
 * "사흘에 오늘이 드는가"(정오, `selectableDays` 안)와도, "어느 하루에 속하는가"(자정)와도
 * 다르다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DayDate } from "../config/day-boundary";
import { pickRetryDays } from "./retry";
import type { AutoDiarySettings } from "./settings";

export type ScheduleDecision =
  | { act: false; reason: "disabled" | "not-near-target" | "all-written" }
  /** `days`는 쓸 수 있는 후보 날 전부(최근→과거, 105). `day`는 그 첫 원소 — 훑기가 첫 후보부터 본다. */
  | { act: true; day: DayDate; days: readonly DayDate[] };

/**
 * 목표 시각으로부터 이 시간 안에 들면 "근방"으로 본다.
 *
 * 근사치(FR-002)이므로 넉넉히. SC-002(24시간 내 1회)와 SC-003(예외 시
 * 1시간 내 1회)은 이 "창"이 아니라 **시도 하한**을 재는 기준이다 — 이 창은
 * "어느 구간에서 **오늘**을 쓰기 시작할 자격이 있는가"를 정한다(078 — 지난 날 중
 * 안 쓴 날은 이 창과 무관하게 쓴다).
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
 * 지금이 시도 창 안인가 (078). 창의 크기는 여전히 이 파일만 안다(D3) — 부르는 쪽은 참·거짓만 받는다.
 * 백그라운드의 「창 밖 따라잡기는 하루 한 번」 상한(`task.ts`)이 묻는다.
 */
export function isInTargetWindow(settings: AutoDiarySettings, now: Date): boolean {
  return isNearTarget(now.getHours(), settings.targetHour);
}

/**
 * 지금 자동 생성을 돌려야 하는가.
 * 판정 순서(고정, D2 — 078 개정):
 *  1. `settings.enabled === false` → `{ act: false, reason: "disabled" }`.
 *  2. `near` = `now`의 현지 시(hour)가 목표 시각 근방인가. 후보는 `near`면 `selectableDays` 전부.
 *     창 밖이면 **차례가 이미 지난 날**만이다 — 오늘은 뺀다(오늘은 창 안에서만), 그리고 창이 어제를
 *     겨냥하는데(`targetDay === "yesterday"`, 오전 목표) 오늘의 목표 시각이 아직 안 왔으면 어제도 뺀다
 *     (어제의 차례는 오늘 목표 시각에 온다 — 자정 직후에 쓰면 고른 시각이 무의미해진다).
 *     078: iOS `BGTaskScheduler`는 창 안에 깨운다는 보장이 없어, 놓친 날을 다음 기회에 쓴다.
 *  3. `pickRetryDays(후보, existingDiaryDays)`가 날을 주면 → `{ act: true, day: 첫 원소, days }`(105 — 훑기가 `days`를 본다).
 *  4. `null`이면: 사흘 중 안 쓴 날이 남아 있으면(차례를 기다리는 중) `not-near-target`, 없으면 `all-written`.
 *
 * `today`·`targetDay`는 주입이다 — 이 파일은 하루 경계도 정오도 계산하지 않는다(FR-021a).
 */
export function decideSchedule(input: {
  settings: AutoDiarySettings;
  now: Date;
  today: DayDate;
  /** 목표 시각의 창이 겨냥하는 날 — 목표 시(hour)에 사흘에 오늘이 드는가로 정한다(`includesTodayAtHour`) */
  targetDay: "today" | "yesterday";
  selectableDays: readonly DayDate[];
  existingDiaryDays: readonly DayDate[];
}): ScheduleDecision {
  const { settings, now, selectableDays, existingDiaryDays } = input;

  if (!settings.enabled) {
    return { act: false, reason: "disabled" };
  }

  const near = isNearTarget(now.getHours(), settings.targetHour);
  const days = pickRetryDays(near ? selectableDays : dueOutsideWindow(input), existingDiaryDays);
  const [day] = days;
  if (day !== undefined) {
    return { act: true, day, days };
  }

  const waiting = !near && pickRetryDays(selectableDays, existingDiaryDays).length > 0;
  return { act: false, reason: waiting ? "not-near-target" : "all-written" };
}

/** 창 밖에서 쓸 수 있는 날 — 차례가 이미 지난 날만. */
function dueOutsideWindow(input: {
  settings: AutoDiarySettings;
  now: Date;
  today: DayDate;
  targetDay: "today" | "yesterday";
  selectableDays: readonly DayDate[];
}): readonly DayDate[] {
  const past = input.selectableDays.filter((day) => day !== input.today);
  const yesterdayStillAhead =
    input.targetDay === "yesterday" && input.now.getHours() < input.settings.targetHour;
  if (!yesterdayStillAhead) return past;

  // 지난 날 중 가장 최근이 어제다(`YYYY-MM-DD`는 사전순이 시간순) — 날짜를 계산하지 않고 고른다.
  const yesterday = past.reduce<DayDate | null>(
    (latest, day) => (latest === null || day > latest ? day : latest),
    null,
  );
  return past.filter((day) => day !== yesterday);
}
