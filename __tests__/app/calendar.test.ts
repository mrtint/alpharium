/**
 * 050 — 날짜로 이동 달력의 순수 판정 (contracts/dialogs.md CAL12, data-model §2).
 *
 * 「오늘」은 전부 `dayOf(now)`에서 온다 — 달력이 하루 경계를 따로 셈하지 않는다(049 DB11). 그래서 자정
 * 직전·직후로 가짜 시계를 두고 본다.
 */

import {
  dayDateFromPicker,
  isFutureMonth,
  isLatestMonth,
  isLatestYearPage,
  latestPickableDay,
  monthOf,
  shiftMonth,
  yearPageOf,
} from "../../src/app/calendar";

const beforeMidnight = new Date("2026-09-30T23:59:00");
const afterMidnight = new Date("2026-10-01T00:00:00");

describe("CAL12 — 보이는 달", () => {
  it("monthOf — 날의 달", () => {
    expect(monthOf("2026-09-28")).toEqual({ year: 2026, month: 9 });
    expect(monthOf("2016-03-15")).toEqual({ year: 2016, month: 3 });
  });

  it("shiftMonth — 연 경계를 넘는다", () => {
    expect(shiftMonth({ year: 2025, month: 12 }, 1)).toEqual({ year: 2026, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 9 }, -21)).toEqual({ year: 2024, month: 12 });
  });

  it("★ isLatestMonth — 오늘이 든 달에서만 참 (자정에 달이 바뀐다)", () => {
    expect(isLatestMonth({ year: 2026, month: 9 }, beforeMidnight)).toBe(true);
    expect(isLatestMonth({ year: 2026, month: 9 }, afterMidnight)).toBe(false);
    expect(isLatestMonth({ year: 2026, month: 10 }, afterMidnight)).toBe(true);
    expect(isLatestMonth({ year: 2025, month: 9 }, beforeMidnight)).toBe(false);
  });

  it("isFutureMonth — 오늘이 든 달보다 뒤", () => {
    expect(isFutureMonth({ year: 2026, month: 10 }, beforeMidnight)).toBe(true);
    expect(isFutureMonth({ year: 2026, month: 10 }, afterMidnight)).toBe(false);
    expect(isFutureMonth({ year: 2027, month: 1 }, afterMidnight)).toBe(true);
    expect(isFutureMonth({ year: 2016, month: 3 }, afterMidnight)).toBe(false);
  });
});

describe("CAL12 — 연 목록", () => {
  it("yearPageOf — 오늘이 든 해로 끝나는 12년 한 쪽 (과거 한계 없음)", () => {
    const now = new Date("2026-09-28T09:00:00");
    expect(yearPageOf(2026, now)).toEqual([
      2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026,
    ]);
    // 같은 쪽의 해는 같은 쪽을 준다
    expect(yearPageOf(2019, now)).toEqual(yearPageOf(2026, now));
    // 그 앞 쪽
    expect(yearPageOf(2014, now)).toEqual([
      2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014,
    ]);
  });

  it("isLatestYearPage — 오늘이 든 쪽에서만 참", () => {
    const now = new Date("2026-09-28T09:00:00");
    expect(isLatestYearPage(yearPageOf(2026, now), now)).toBe(true);
    expect(isLatestYearPage(yearPageOf(2014, now), now)).toBe(false);
  });
});

describe("CAL12 — 피커 날짜 변환과 가장 늦은 날", () => {
  it("★ dayDateFromPicker — datepicker의 두 모양 (research R9)", () => {
    expect(dayDateFromPicker("2026-09-28 00:00")).toBe("2026-09-28");
    expect(dayDateFromPicker("2016-03-15")).toBe("2016-03-15");
    expect(dayDateFromPicker(new Date(2026, 8, 28))).toBe("2026-09-28");
    // ★ 066 — `onChange`의 Date는 「그 날의 자정」인데 iOS에서는 몇 분 이르게 온다(실측: 10월 5일을
    // 누르면 10월 4일 23:51). 가장 가까운 자정의 날로 읽는다 — 누른 숫자와 고른 날이 같아야 한다.
    expect(dayDateFromPicker(new Date(2026, 9, 4, 23, 51))).toBe("2026-10-05");
    expect(dayDateFromPicker(new Date(2026, 9, 5, 0, 9))).toBe("2026-10-05");
    expect(dayDateFromPicker(new Date(2026, 9, 9, 23, 51))).toBe("2026-10-10");
    // 달·해 경계
    expect(dayDateFromPicker(new Date(2026, 8, 30, 23, 51))).toBe("2026-10-01");
    expect(dayDateFromPicker(new Date(2026, 11, 31, 23, 51))).toBe("2027-01-01");
    // ★ 날짜 칸·disabledDates가 실제로 주는 것은 dayjs 객체다(설치본 타입 선언과 다르다 — 구현 중 실측)
    expect(
      dayDateFromPicker({ format: (t: string) => (t === "YYYY-MM-DD" ? "2016-03-15" : "?") }),
    ).toBe("2016-03-15");
  });

  it("latestPickableDay — 오늘 (자정에 바뀐다)", () => {
    expect(latestPickableDay(beforeMidnight)).toBe("2026-09-30");
    expect(latestPickableDay(afterMidnight)).toBe("2026-10-01");
  });
});
