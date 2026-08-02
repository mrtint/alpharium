/**
 * T022 — 일정 소스 어댑터 (003 FR-253)
 *
 * 내놓는 것은 **제목·시간대만**이다. 참석자·설명 본문·첨부·회의 링크·일정 식별자를
 * 담지 않는다 — 아래 변환을 지나면 그것들을 담을 자리가 없다.
 */
import { observed, unobserved } from "../observation";
import type { CalendarItem } from "../digest";
import { periodOfHour, type CalendarReading, type CollectionWindow } from "./source";
import { log } from "../../logging";

/** 소스가 읽은 일정 하나. 이 자리에서만 존재하고 집계로 넘어가지 않는다. */
export interface EventSample {
  readonly title: string;
  /** 시작 시각(0~23). 얻지 못했으면 `null` — 시간대가 미관측이 된다. */
  readonly hour: number | null;
}

export interface CalendarProvider {
  /** 그날의 일정들. 거부·미지원이면 `null`. */
  readEvents(window: CollectionWindow): Promise<readonly EventSample[] | null>;
}

/** 둘만 옮긴다. 참석자·설명·첨부·식별자는 통과할 자리가 없다 (003 FR-253). */
function toCalendarItem(sample: EventSample): CalendarItem {
  return {
    title: sample.title,
    period: sample.hour === null ? unobserved() : observed(periodOfHour(sample.hour)),
  };
}

export async function readEvents(
  window: CollectionWindow,
  provider: CalendarProvider,
): Promise<CalendarReading> {
  let samples: readonly EventSample[] | null;
  try {
    samples = await provider.readEvents(window);
  } catch (error) {
    log.warn("일정 소스 읽기 실패 — 미관측으로 남긴다", {
      error: error instanceof Error ? error.name : "unknown",
    });
    samples = null;
  }

  if (samples === null) return { events: unobserved() };

  return { events: observed(samples.map(toCalendarItem)) };
}

/** `expo-calendar`를 provider로 감싼다. 제목과 시작 시각만 읽는다. */
export function deviceCalendarProvider(): CalendarProvider {
  return {
    async readEvents(window) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Calendar = require("expo-calendar") as typeof import("expo-calendar");

      const { status } = await Calendar.getCalendarPermissionsAsync();
      if (status !== "granted") return null;

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      if (calendars.length === 0) return [];

      const start = new Date(window.observedAt);
      start.setHours(0, 0, 0, 0);

      const events = await Calendar.getEventsAsync(
        calendars.map((c) => c.id),
        start,
        window.observedAt,
      );

      // 제목과 시각만 옮긴다. notes·attendees·id는 여기서 끝난다.
      return events.map((event) => ({
        title: event.title,
        hour: event.startDate ? new Date(event.startDate).getHours() : null,
      }));
    },
  };
}
