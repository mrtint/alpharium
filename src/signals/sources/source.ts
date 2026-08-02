/**
 * 신호 소스의 공통 계약 (003 FR-201)
 *
 * 소스는 넷이다 — 활동·위치·사진·일정. 각 소스는 **자신이 담당하는 집계 항목만**
 * 내놓으며, 관측하지 못한 항목은 미관측으로 남긴다. 지어내지 않는다 (003 FR-235).
 *
 * 권한 거부는 **정상 경로**다 (003 FR-217, 헌법 원칙 V) — 크래시가 아닌 기능 축소로
 * 처리하므로, 거부된 소스는 미관측을 돌려주고 집계는 그대로 산출된다.
 */
import { type Observation } from "../observation";
import type { CalendarItem, PhotoItem, StayItem } from "../digest";

/** 하루의 시간대. 분 단위 로그를 담지 않기 위한 세분도다 (003 FR-248). */
export type DayPeriod = "새벽" | "아침" | "낮" | "저녁" | "밤";

export const DAY_PERIODS: readonly DayPeriod[] = ["새벽", "아침", "낮", "저녁", "밤"];

/** 시각(0~23시)을 시간대로 옮긴다. 분은 버린다 — 원본 로그가 남지 않게 하는 자리다. */
export function periodOfHour(hour: number): DayPeriod {
  if (hour < 6) return "새벽";
  if (hour < 11) return "아침";
  if (hour < 17) return "낮";
  if (hour < 21) return "저녁";
  return "밤";
}

/** 소스가 읽는 범위 — 로컬 날짜의 0시부터 관측 시점까지 (003 FR-247). */
export interface CollectionWindow {
  /** 집계가 귀속되는 로컬 날짜 (`YYYY-MM-DD`). */
  readonly date: string;
  /** 관측 시점. 이 시각까지만 읽는다. */
  readonly observedAt: Date;
}

export interface ActivityReading {
  readonly steps: Observation<number>;
  readonly activePeriods: Observation<readonly DayPeriod[]>;
}

export interface LocationReading {
  readonly stays: Observation<readonly StayItem[]>;
  readonly moved: Observation<boolean>;
}

export interface PhotoReading {
  readonly photos: Observation<readonly PhotoItem[]>;
}

export interface CalendarReading {
  readonly events: Observation<readonly CalendarItem[]>;
}
