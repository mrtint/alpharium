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
import { productionTiming, type ScheduleTiming } from "./timing";

export type ScheduleDecision =
  | { act: false; reason: "disabled" | "not-near-target" | "all-written" }
  /** `days`는 쓸 수 있는 후보 날 전부(최근→과거, 105). `day`는 그 첫 원소 — 훑기가 첫 후보부터 본다. */
  | { act: true; day: DayDate; days: readonly DayDate[] };

/**
 * 지금 자동 생성을 돌려야 하는가.
 * 판정 순서(고정, D2 — 078 개정):
 *  1. `settings.enabled === false` → `{ act: false, reason: "disabled" }`.
 *  2. `near` = `timing.inWindow(now)` — 지금이 시도 창 안인가(배포는 목표 시각 +3시간, 106 빠른 주기는 주기의 앞 절반). 후보는 `near`면
 *     `timing.candidateDays(selectableDays, today)` 전부(배포는 사흘, 빠른 주기는 오늘 하나).
 *     창 밖이면 **차례가 이미 지난 날**만이다 — 오늘은 뺀다(오늘은 창 안에서만), 그리고 창이 어제를
 *     겨냥하는데(`targetDay === "yesterday"`, 오전 목표) 오늘의 목표 시각이 아직 안 왔으면 어제도 뺀다
 *     (어제의 차례는 오늘 목표 시각에 온다 — 자정 직후에 쓰면 고른 시각이 무의미해진다).
 *     078: iOS `BGTaskScheduler`는 창 안에 깨운다는 보장이 없어, 놓친 날을 다음 기회에 쓴다.
 *  3. `pickRetryDays(후보, existingDiaryDays)`가 날을 주면 → `{ act: true, day: 첫 원소, days }`(105 — 훑기가 `days`를 본다).
 *  4. `null`이면: 후보 중 안 쓴 날이 남아 있으면(차례를 기다리는 중) `not-near-target`, 없으면 `all-written`.
 *
 * `today`·`targetDay`는 주입이다 — 이 파일은 하루 경계도 정오도 계산하지 않는다(FR-021a). 106 — 시(時)도 읽지 않는다: 창·오전 목표·
 * 후보 날은 `timing`(`timing.ts`)이 정한다. 주지 않으면 배포 규칙이라 106 이전과 같다.
 */
export function decideSchedule(input: {
  settings: AutoDiarySettings;
  now: Date;
  today: DayDate;
  /** 목표 시각의 창이 겨냥하는 날 — 목표 시(hour)에 사흘에 오늘이 드는가로 정한다(`includesTodayAtHour`) */
  targetDay: "today" | "yesterday";
  selectableDays: readonly DayDate[];
  existingDiaryDays: readonly DayDate[];
  /** 106 — 시간 규칙(창·오전 목표·후보 날). 주지 않으면 배포 규칙(`productionTiming(settings)`)이다 */
  timing?: ScheduleTiming;
}): ScheduleDecision {
  const { settings, now, existingDiaryDays } = input;
  const timing = input.timing ?? productionTiming(settings);

  if (!settings.enabled) {
    return { act: false, reason: "disabled" };
  }

  const near = timing.inWindow(now);
  const candidates = timing.candidateDays(input.selectableDays, input.today);
  const days = pickRetryDays(
    near ? candidates : dueOutsideWindow({ ...input, candidates, timing }),
    existingDiaryDays,
  );
  const [day] = days;
  if (day !== undefined) {
    return { act: true, day, days };
  }

  const waiting = !near && pickRetryDays(candidates, existingDiaryDays).length > 0;
  return { act: false, reason: waiting ? "not-near-target" : "all-written" };
}

/** 창 밖에서 쓸 수 있는 날 — 차례가 이미 지난 날만. */
function dueOutsideWindow(input: {
  now: Date;
  today: DayDate;
  targetDay: "today" | "yesterday";
  candidates: readonly DayDate[];
  timing: ScheduleTiming;
}): readonly DayDate[] {
  const past = input.candidates.filter((day) => day !== input.today);
  const yesterdayStillAhead =
    input.targetDay === "yesterday" && input.timing.targetAhead(input.now);
  if (!yesterdayStillAhead) return past;

  // 지난 날 중 가장 최근이 어제다(`YYYY-MM-DD`는 사전순이 시간순) — 날짜를 계산하지 않고 고른다.
  const yesterday = past.reduce<DayDate | null>(
    (latest, day) => (latest === null || day > latest ? day : latest),
    null,
  );
  return past.filter((day) => day !== yesterday);
}
