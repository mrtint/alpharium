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
 * **배터리 예외가 있으면 울릴 시각을 늦춘다**(104) — 예외가 있는 기기는 백그라운드가 목표 시각 직후 쓰기를 시작해 완주하므로, 정각에 먼저
 * 「쓸 차례」가 뜨고 곧 「다 썼어요」가 오는 일을 없앤다. 늦추는 만큼만 `at`이 뒤로 가고 겨냥하는 날(`day`)과 `id`는 목표 시각 기준 그대로다
 * (하루 경계를 건드리지 않는다). 예약을 거두는 규칙은 여기 없다 — 맞추기(`reminders.ts`)가 그 날 일기 파일이 생긴 뒤에만 거둔다.
 *
 * 이름이 없으면(`name === null`) 알리지 않는다 — 순수 계획의 방어다. 기본 조립(`reminder-deps.ts`)은 홈의 쓰기와 같이 고른 캐릭터가
 * 없으면 첫 실행 기본 캐릭터의 이름을 주므로 앱에서는 `null`이 오지 않는다(research R8 — 구현 중 실기기에서 바뀜).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { dayOf, includesTodayAtHour, type DayDate } from "../config/day-boundary";
import type { BatteryExceptionStatus } from "./battery-exception-port";
import { reminderTitle } from "./notification-text";
import type { AutoDiarySettings } from "./settings";

/** 이 기능이 건 예약·알림을 가르는 유일한 규칙(data-model) */
export const REMINDER_ID_PREFIX = "diary-reminder-";

/**
 * 배터리 예외가 있을 때 쓸 차례 알림을 늦추는 분 (104).
 *
 * **사람이 정한 값이다 — 측정이 아니다**(원칙 V). 백그라운드 잡의 최소 반복 간격 15분(`background-port.ts`) + 백그라운드 쓰기 한도 600초(10분,
 * `assembly.ts`) = 최악 약 25분을 덮는다. 쓰기가 이 안에 저장되면 알림은 뜨기 전에 거둬지고 완성 알림만 온다.
 */
export const REMINDER_DELAY_MINUTES = 30;

/** 예외 상태에서 알림 지연(분)을 정한다. 예외가 있다고 확인된 때만 늦춘다 — 모르는 것은 늦추지 않는다(원칙 V) */
export function reminderDelayFor(status: BatteryExceptionStatus): number {
  return status === "exempt" ? REMINDER_DELAY_MINUTES : 0;
}

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
  /** 정각 뒤로 늦추는 분(0 이상 60 미만의 정수). 시를 넘기면 그 날 몫 계산이 어긋나 거부한다 */
  delayMinutes: number;
}): ReminderPlanEntry[] {
  const { now, settings, name, delayMinutes } = input;
  if (!Number.isInteger(delayMinutes) || delayMinutes < 0 || delayMinutes >= 60) {
    throw new RangeError(`delayMinutes must be an integer in [0, 60): ${delayMinutes}`);
  }
  if (!settings.enabled || name === null) return [];

  const [year, month, date] = dayOf(now).split("-").map(Number);
  const sameDay = includesTodayAtHour(settings.targetHour);
  const written = new Set(input.writtenDays);

  const entries: ReminderPlanEntry[] = [];
  let fires = 0;
  for (let k = 0; fires < FIRES; k += 1) {
    const fire = new Date(year, month - 1, date + k, settings.targetHour);
    const at = fire.getTime() + delayMinutes * 60_000;
    if (at <= now.getTime()) continue;
    fires += 1;
    const day = sameDay ? dayOf(fire) : dayOf(new Date(year, month - 1, date + k - 1));
    if (written.has(day)) continue;
    entries.push({
      id: `${REMINDER_ID_PREFIX}${day}`,
      day,
      at,
      title: reminderTitle(name, day),
    });
  }
  return entries;
}
