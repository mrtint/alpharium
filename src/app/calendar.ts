/**
 * 날짜로 이동 달력의 순수 판정 (050, 보드 `2j`).
 *
 * 계약: specs/050-dialog-foundation/contracts/dialogs.md CAL12, data-model.md §2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **「오늘」은 `dayOf(now)`에서만 온다** — 달력이 하루 경계를 따로 셈하지 않는다(049 DB11). 칸 하나의
 * 판정(오늘·미래·일기 있음·선택)은 여기가 아니라 `state.ts`의 `cellFor()`다 — 스트립과 같은 판정 하나.
 *
 * **datepicker의 `›`는 가장 늦은 날을 모른다**(research R5) — 그래서 머리의 ‹ ›와 월·연 목록의 비활성을
 * 이 함수들이 정한다.
 *
 * **과거 한계가 없다**(Clarifications Q2) — ‹는 끝없이 앞으로 간다. 스트립(049)과 같은 범위다.
 *
 * `new Date()`를 부르지 않는다 — 「지금」을 인자로 받는다(002 FR-018a).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { dayOf, type DayDate } from "../config/day-boundary";

/** 달력에 보이는 달. `month`는 1–12 */
export type CalendarMonth = { year: number; month: number };

/** 달력의 보기 — 날짜 격자 / 월 목록 / 연 목록 */
export type CalendarView = "day" | "month" | "year";

/** 연 목록 한 쪽의 해 수 */
export const YEAR_PAGE_SIZE = 12;

/** 날의 달 */
export function monthOf(day: DayDate): CalendarMonth {
  return { year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) };
}

/** 달을 옮긴다 — 연 경계를 넘는다 */
export function shiftMonth(m: CalendarMonth, delta: number): CalendarMonth {
  const index = m.year * 12 + (m.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

const monthIndex = (m: CalendarMonth) => m.year * 12 + (m.month - 1);

/** 오늘이 든 달인가 — 참이면 ›(다음 달)가 비활성 */
export function isLatestMonth(m: CalendarMonth, now: Date): boolean {
  return monthIndex(m) === monthIndex(monthOf(dayOf(now)));
}

/** 오늘이 든 달보다 뒤인가 — 참이면 월 목록에서 누를 수 없다 */
export function isFutureMonth(m: CalendarMonth, now: Date): boolean {
  return monthIndex(m) > monthIndex(monthOf(dayOf(now)));
}

/**
 * `year`가 든 연 목록 한 쪽 — **오늘이 든 해로 끝나는 쪽**을 기준으로 12년씩 끊는다. 그래서 가장 늦은
 * 쪽에는 미래의 해가 없다(목록에 아예 없다 — CAL10).
 */
export function yearPageOf(year: number, now: Date): readonly number[] {
  const latest = monthOf(dayOf(now)).year;
  const pagesBack = Math.floor((latest - year) / YEAR_PAGE_SIZE);
  const last = latest - pagesBack * YEAR_PAGE_SIZE;
  return Array.from({ length: YEAR_PAGE_SIZE }, (_, i) => last - YEAR_PAGE_SIZE + 1 + i);
}

/** 오늘이 든 연 쪽인가 — 참이면 연 목록의 ›가 비활성 */
export function isLatestYearPage(page: readonly number[], now: Date): boolean {
  return page[page.length - 1] === monthOf(dayOf(now)).year;
}

const HALF_DAY_MS = 12 * 60 * 60 * 1000;

/** dayjs 객체의 필요한 부분만 — 이 파일이 dayjs를 import하지 않게 한다 */
export type DayjsLike = { format(template: string): string };

/**
 * datepicker가 넘기는 날짜를 `DayDate`로 (research R9).
 *
 * - ★ `components.Day`의 `day.date`와 `disabledDates`의 인자는 **dayjs 객체**다 — 설치본 타입 선언은
 *   `date: string`이라 적었지만 실제 값은 `generateCalendarDay()`가 넣은 dayjs다(구현 중 jest에서 실측,
 *   `utils.ts:562-580`). 기기 로컬 날짜로 `YYYY-MM-DD`를 뽑는다.
 * - 문자열(`'YYYY-MM-DD HH:mm'` 등) → 앞 10글자. 시간대 계산이 없다.
 * - `Date`(`onChange`가 주는 「그 날의 자정」) → **가장 가까운 로컬 자정의 날**.
 *   ★ 그 Date를 그대로 `dayOf()`에 넣지 않는다(066). datepicker는 누른 날을 dayjs 시간대 플러그인에
 *   한 번 통과시키는데, iOS에서는 그 플러그인이 잰 시간대 차이가 몇 분 어긋나(실측: 서울이 `+09:09`)
 *   자정이 전날 23:51로 온다 — 5일을 누르면 4일이 골라졌다. 반나절을 더해 그 날의 한낮으로 옮긴 뒤 읽는다.
 *   하루 기준을 옮기는 것이 아니라 부정확한 자정을 바로잡는 것이다(경계는 여전히 `dayOf()` 하나).
 */
export function dayDateFromPicker(value: string | Date | DayjsLike): DayDate {
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return dayOf(new Date(value.getTime() + HALF_DAY_MS));
  return value.format("YYYY-MM-DD");
}

/** 고를 수 있는 가장 늦은 날(= 오늘). datepicker `maxDate`용 — 달력 화면이 `dayOf`를 직접 부르지 않게(CAL5) */
export function latestPickableDay(now: Date): DayDate {
  return dayOf(now);
}
