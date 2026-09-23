/**
 * 홈 화면(048, 보드 `1d`)의 문구 조립.
 *
 * 계약: specs/048-diary-home-modernist/contracts/home-screen.md G10, data-model.md §2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **판정하지 않는다.** 날짜 조각은 `dayParts()`(state.ts)에서, 쓸 수 있게 되는 시각은
 * `writableAt()`(day-boundary.ts)이 준 `Date`에서 온다. 여기는 그것을 사람의 말로 옮길 뿐이다.
 *
 * **★ 시각 숫자를 문구로 적지 않는다.** 새벽이면 「오전 4시부터」, 오전이면 「오후 12시부터」인데
 * 어느 쪽인지는 `Date`가 이미 정했다. 여기서 숫자를 적으면 화면이 그 두 구간을 따로 판정하게
 * 되고, 그 순간 하루 경계가 두 곳에 생긴다(`home-text.test.ts` G10이 소스를 읽어 막는다).
 *
 * **해요체다**(FR-037) — 홈의 새 문구는 전부 이 파일에서 조립된다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { dayParts } from "../app/state";
import type { DayDate } from "../config/day-boundary";

/** 요일 이름 — 0이 일요일(`Date.getDay()`와 같은 순서). 이 표는 여기에만 있다. */
const WEEKDAY_LONG = [
  "일요일",
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
] as const;
const WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 12시간제의 한 바퀴. 하루 경계(04:00·정오 규칙)와 무관한 시계의 성질이다. */
const HALF_DAY_HOURS = 24 / 2;

export function weekdayLong(weekday: number): string {
  return WEEKDAY_LONG[weekday] ?? "";
}

export function weekdayShort(weekday: number): string {
  return WEEKDAY_SHORT[weekday] ?? "";
}

/** 헤더의 월 표시 — **고른 날의 달**(Clarification Q2). 예: 「2026년 9월」 */
export function monthText(day: DayDate): string {
  const { year, month } = dayParts(day);
  return `${year}년 ${month}월`;
}

/** 하단 바의 날짜 조각 — 누를 수 없는 글자(D7). 예: 「13일」 */
export function dayOfMonthText(day: DayDate): string {
  return `${dayParts(day).date}일`;
}

/** 목록 카드의 날짜 줄. 예: 「2026 · 09 · 12 · 토」 */
export function cardDateText(day: DayDate): string {
  const { year, month, date, weekday } = dayParts(day);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${year} · ${two(month)} · ${two(date)} · ${weekdayShort(weekday)}`;
}

/** 안내 캡션의 짧은 날짜. 예: 「9월 10일」 */
function shortDate(day: DayDate): string {
  const { month, date } = dayParts(day);
  return `${month}월 ${date}일`;
}

/** 되돌림 안내 (009 FR-009 → 048 해요체) */
export function revertedText(revertedFrom: DayDate, day: DayDate): string {
  return `${shortDate(revertedFrom)}은 이제 쓸 수 없어 ${shortDate(day)}로 바꿨어요`;
}

/**
 * 쓸 수 있게 되는 시각의 말 — 「오전 4시」·「오후 12시」.
 *
 * **숫자는 `at`에서 온다.** 오전/오후는 하루의 반(`getHours()`가 한낮 이전인가)으로 가르고,
 * 12시간제 숫자는 `(h + 11) % 12 + 1`로 만든다(0시 → 12, 13시 → 1).
 */
export function hourText(at: Date): string {
  const h = at.getHours();
  const half = h < HALF_DAY_HOURS ? "오전" : "오후";
  const clock = ((h + HALF_DAY_HOURS - 1) % HALF_DAY_HOURS) + 1;
  return `${half} ${clock}시`;
}
