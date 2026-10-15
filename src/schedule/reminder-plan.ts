/**
 * 쓸 차례 알림의 계획 (085) — 순수 함수.
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md RP1~RP8
 *       spec.md FR-001~FR-005, research R3·R15
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 목표 시각마다 「그 날 몫을 쓸 차례다」를 알리는 **날짜별 일회 예약**을 앞으로 7번 고른다. DAILY 반복을 쓰지 않는 까닭은
 * expo의 `DailyTrigger`가 다시 걸어도 「오늘 목표 시각이 아직이면 오늘」 울려 이미 쓴 날을 건너뛰지 못하기 때문이다(research R3).
 *
 * **`now`를 인자로 받는다**(020 D4) — 안에서 「지금」을 읽으면 자정·월말을 테스트할 수 없다. **하루 경계·정오를 다시 계산하지
 * 않는다**(FR-021a, DB11) — 발화 하나가 겨냥하는 날은 `includesTodayAtHour(목표 시)`로 묻는다(056 미리보기의 「그날/어제」,
 * 078 `targetDay`와 같은 규칙). 발화 시각은 로컬 달력의 `Date` 생성자로 만들고, 비교는 `getTime()`으로만 한다.
 *
 * 이름이 없으면(`name === null`) 알리지 않는다 — 순수 계획의 방어다. 기본 조립(`reminder-deps.ts`)은 홈의 쓰기와 같이 고른 캐릭터가
 * 없으면 첫 실행 기본 캐릭터의 이름을 주므로 앱에서는 `null`이 오지 않는다(research R8 — 구현 중 실기기에서 바뀜).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { dayOf, includesTodayAtHour, type DayDate } from "../config/day-boundary";
import { reminderTitle } from "./notification-text";
import type { AutoDiarySettings } from "./settings";

/** 이 기능이 건 예약·알림을 가르는 유일한 규칙(data-model) */
export const REMINDER_ID_PREFIX = "diary-reminder-";

/** 앞으로 볼 발화의 수 — 앱이 이만큼의 날 동안 한 번도 돌지 않으면 알림이 멈춘다(받아들인 한계, spec US1 AS7) */
const FIRES = 7;

export type ReminderPlanEntry = {
  id: string;
  /** 그 발화가 겨냥하는 날(그 날 몫) */
  day: DayDate;
  /** 울릴 시각(ms) — 목표 시의 정각, `now`보다 뒤 */
  at: number;
  title: string;
};

export function planReminders(input: {
  now: Date;
  settings: AutoDiarySettings;
  writtenDays: readonly DayDate[];
  name: string | null;
}): ReminderPlanEntry[] {
  const { now, settings, name } = input;
  if (!settings.enabled || name === null) return [];

  const [year, month, date] = dayOf(now).split("-").map(Number);
  const sameDay = includesTodayAtHour(settings.targetHour);
  const written = new Set(input.writtenDays);

  const entries: ReminderPlanEntry[] = [];
  let fires = 0;
  for (let k = 0; fires < FIRES; k += 1) {
    const fire = new Date(year, month - 1, date + k, settings.targetHour);
    if (fire.getTime() <= now.getTime()) continue;
    fires += 1;
    const day = sameDay ? dayOf(fire) : dayOf(new Date(year, month - 1, date + k - 1));
    if (written.has(day)) continue;
    entries.push({
      id: `${REMINDER_ID_PREFIX}${day}`,
      day,
      at: fire.getTime(),
      title: reminderTitle(name, day),
    });
  }
  return entries;
}
