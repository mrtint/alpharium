/**
 * 자동 쓰기의 시간 규칙 (106) — 「언제 쓸 차례인가」를 정하는 상수의 유일한 자리.
 *
 * 계약: specs/106-auto-write-fast-cycle/contracts/fast-cycle.md FC1·FC4·FC5·FC7
 *       research R1·R2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **두 가지 시간 규칙이 있다.** 배포(`productionTiming`) — 하루 한 번 목표 시각, 시도 창 3시간, 후보 사흘 — 과 개발 빌드 전용
 * 빠른 주기(`fastCycleTiming`) — 하루를 N분 주기로 줄여 같은 규칙을 계속 되풀이해 타 본다. 판정 함수(`decideSchedule`·
 * `resolveAutoWrite`·`planReminders`)는 이 인터페이스를 입력으로 받을 뿐 시(時)를 직접 읽지 않는다.
 *
 * **배포 동치(FC1)**: `productionTiming`은 106 이전 `decision.ts`의 시 단위 창·오전 목표 판정과 `includesTodayAtHour`를 **그대로
 * 옮긴 것**이다 — 새로 짠 논리가 아니다. 그래서 `getHours()`를 쓰고 DB11 허용 목록에 이 파일이 오른다(`day-boundary-source.test.ts`).
 *
 * **빠른 주기의 값은 사람이 정한 값이다 — 측정이 아니다**(원칙 V): 창 = ⌊N/2⌋분, 알림 지연 상한 = min(30, ⌊창 분 / 2⌋).
 * 주기 격자는 자정(`dayBounds`)에서 센다 — 하루 경계를 이 파일이 새로 정하지 않는다(DB11).
 *
 * 순수 함수. `now`를 인자로 받는다(020 D4).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { dayBounds, dayOf, includesTodayAtHour, type DayDate } from "../config/day-boundary";
import { REMINDER_DELAY_MINUTES } from "./reminder-plan";
import type { AutoDiarySettings } from "./settings";

/** 목표 시각으로부터 이 시간 안에 들면 「시도 창」이다. 근사치(FR-002)라 넉넉하다. 배포 값이며 밖으로 내보내지 않는다. */
const WINDOW_HOURS = 3;

/** 빠른 주기 값의 범위 (분) — 스펙 FR-004 */
export const MIN_PERIOD_MINUTES = 5;
export const MAX_PERIOD_MINUTES = 180;

const MINUTE_MS = 60_000;

export interface ScheduleTiming {
  readonly kind: "production" | "fast-cycle";
  /** 지금이 시도 창 안인가 */
  inWindow(now: Date): boolean;
  /** 창이 어제를 겨냥하는데(오전 목표) 목표 시각이 아직 안 왔는가 — 어제의 차례는 오늘 목표 시각에 온다 */
  targetAhead(now: Date): boolean;
  /** 목표 시각의 창이 겨냥하는 날 */
  readonly targetDay: "today" | "yesterday";
  /** 자동 쓰기가 다룰 후보 날. 배포는 입력 그대로(사흘), 빠른 주기는 오늘 하나 */
  candidateDays(selectable: readonly DayDate[], today: DayDate): readonly DayDate[];
  /** 배터리 예외가 확인된 기기의 쓸 차례 알림 지연 상한(분) */
  readonly reminderDelayCap: number;
}

/** 빠른 주기의 한 구간 */
export type Cycle = {
  /** `YYYY-MM-DD#순번` — 자정부터 N분 격자의 몇 번째인가 */
  id: string;
  startMs: number;
  /** 다음 주기의 시작. 하루의 마지막 주기는 자정에서 잘린다 */
  endMs: number;
  /** 시도 창의 끝(포함하지 않음) — 시작 + min(⌊N/2⌋분, 주기 길이) */
  windowEndMs: number;
};

export interface FastCycleTiming extends ScheduleTiming {
  readonly kind: "fast-cycle";
  readonly periodMinutes: number;
  /** `now`가 든 주기 */
  cycle(now: Date): Cycle;
  /** 다음 주기의 시작 시각 */
  nextCycleStart(now: Date): Date;
}

/** 빠른 주기 규칙인가 (타입 가드) */
export function isFastCycleTiming(timing: ScheduleTiming): timing is FastCycleTiming {
  return timing.kind === "fast-cycle";
}

/** 배포 규칙 — 106 이전 `decision.ts`의 논리를 그대로 옮겼다 */
export function productionTiming(settings: AutoDiarySettings): ScheduleTiming {
  const { targetHour } = settings;
  return {
    kind: "production",
    inWindow(now) {
      const hour = now.getHours();
      for (let offset = 0; offset < WINDOW_HOURS; offset += 1) {
        if ((targetHour + offset) % 24 === hour) return true;
      }
      return false;
    },
    targetAhead(now) {
      return now.getHours() < targetHour;
    },
    targetDay: includesTodayAtHour(targetHour) ? "today" : "yesterday",
    candidateDays: (selectable) => selectable,
    reminderDelayCap: REMINDER_DELAY_MINUTES,
  };
}

/** `now`가 든 주기. 자정은 `dayBounds`가 정한다 — 이 파일은 하루 경계를 새로 셈하지 않는다 */
export function cycleOf(periodMinutes: number, now: Date): Cycle {
  const day = dayOf(now);
  const bounds = dayBounds(day);
  const periodMs = periodMinutes * MINUTE_MS;
  const index = Math.floor((now.getTime() - bounds.startMs) / periodMs);
  const startMs = bounds.startMs + index * periodMs;
  const endMs = Math.min(startMs + periodMs, bounds.endMs);
  const windowMs = Math.min(Math.floor(periodMinutes / 2) * MINUTE_MS, endMs - startMs);
  return { id: `${day}#${index}`, startMs, endMs, windowEndMs: startMs + windowMs };
}

/** 빠른 주기 규칙 (개발 빌드 전용) */
export function fastCycleTiming(periodMinutes: number): FastCycleTiming {
  return {
    kind: "fast-cycle",
    periodMinutes,
    inWindow(now) {
      const cycle = cycleOf(periodMinutes, now);
      const at = now.getTime();
      return at >= cycle.startMs && at < cycle.windowEndMs;
    },
    targetAhead: () => false,
    targetDay: "today",
    candidateDays: (_selectable, today) => [today],
    // 창 길이(⌊N/2⌋분)의 절반 — 지연된 알림이 창이 닫히는 순간이 아니라 창 **안**에 울려, 눌렀을 때 앱 열기 판정이 아직 창 안이다(코드 리뷰).
    reminderDelayCap: Math.min(
      REMINDER_DELAY_MINUTES,
      Math.floor(Math.floor(periodMinutes / 2) / 2),
    ),
    cycle: (now) => cycleOf(periodMinutes, now),
    nextCycleStart: (now) => new Date(cycleOf(periodMinutes, now).endMs),
  };
}

/** 주기 값 문자열 → 분. 공백을 자른 십진 정수 문자열이고 5~180이면 그 수, 아니면 `null` */
export function parsePeriodMinutes(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value >= MIN_PERIOD_MINUTES && value <= MAX_PERIOD_MINUTES ? value : null;
}
