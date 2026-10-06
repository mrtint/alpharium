/**
 * 한국어 카탈로그 — 날짜 표기 (062, 원래 자리 `src/ui/home-text.ts` 048·049·050).
 *
 * 홈 헤더·스트립·날짜로 이동 달력이 함께 쓴다. **판정하지 않는다**(K4) — 무슨 요일·몇 월인가는 부르는 쪽이 정해 숫자로 준다.
 * `Intl`로 바꾸지 않는다(research R11 — 「2026년 9월」과 바이트 동일한지 실측이 없다).
 */

import type { Week } from "../shapes";

/** 요일 이름 — 0이 일요일(`Date.getDay()`와 같은 순서) */
const weekdayLong: Week = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

/** 스트립·달력 머리의 짧은 요일 */
const weekdayShort: Week = ["일", "월", "화", "수", "목", "금", "토"];

export const calendar = {
  weekdayLong,
  weekdayShort,
  /** 헤더의 월 표시. 예: 「2026년 9월」(보드 `t.monthLabel`) */
  monthText: (year: number, month: number): string => `${year}년 ${month}월`,
  /** 하단 바의 날짜 조각. 예: 「13일」 */
  dayOfMonthText: (date: number): string => `${date}일`,
  /** 달력 머리의 월. 예: 「9월」(보드 `cal.month`) */
  calendarMonthText: (month: number): string => `${month}월`,
  /** 달력 머리·연 목록의 해. 예: 「2026년」(보드 `cal.year`) */
  calendarYearText: (year: number): string => `${year}년`,
};
