/**
 * 하루 경계 계약 테스트.
 *
 * 계약: specs/049-home-day-picker/contracts/day-picking.md DB1~DB9
 *       (이전: specs/002 「하루 경계」 04:00, specs/012 정오 규칙 — 049에서 바뀜)
 *
 * **049 — 하루는 기기 로컬 자정에 바뀐다**(Clarification Q2). 00:30은 이제 당일이고, 04:00에
 * 하루가 바뀌던 규칙은 없다. **오늘은 언제든 쓸 수 있다**(Q1, 012의 정오 제한 폐지).
 *
 * **남는 정오 하나**: `selectableDays()`(백그라운드·알림·미리 준비의 「사흘」)는 구성 규칙을
 * 그대로 지킨다 — 정오 이후에만 오늘이 들어온다(FR-020, DB6). 이것이 무너지면 백그라운드가
 * 아침에 오늘을 쓰기 시작한다(research R4).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  dayBounds,
  dayOf,
  isDayClosed,
  isDayWritable,
  latestClosedDay,
  nextDayStartAt,
  selectableDays,
  shiftWeek,
  weekOf,
} from "../../src/config/day-boundary";

const SOURCE = readFileSync(join(__dirname, "../../src/config/day-boundary.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

describe("DB1·DB2 dayOf — 기기 로컬 달력 날짜", () => {
  const cases: readonly { instant: string; expected: string; why: string }[] = [
    { instant: "2026-09-26T00:00:00", expected: "2026-09-26", why: "자정 정각은 새 하루" },
    { instant: "2026-09-25T23:59:59.999", expected: "2026-09-25", why: "자정 직전" },
    { instant: "2026-09-26T00:30:00", expected: "2026-09-26", why: "★ 049 — 새벽은 당일" },
    { instant: "2026-09-26T03:59:59", expected: "2026-09-26", why: "★ 04:00 경계가 없다" },
    { instant: "2026-09-26T04:00:00", expected: "2026-09-26", why: "04:00도 그냥 당일" },
    { instant: "2026-09-26T12:00:00", expected: "2026-09-26", why: "한낮" },
  ];

  it.each(cases)("$instant → $expected ($why)", ({ instant, expected }) => {
    expect(dayOf(new Date(instant))).toBe(expected);
  });

  it("월·연 경계", () => {
    expect(dayOf(new Date("2026-09-01T00:10:00"))).toBe("2026-09-01");
    expect(dayOf(new Date("2027-01-01T00:10:00"))).toBe("2027-01-01");
  });
});

describe("DB3 dayBounds — 자정~자정", () => {
  it("[day 00:00, day+1 00:00) 기기 시간대", () => {
    const { startMs, endMs } = dayBounds("2026-09-26");
    expect(startMs).toBe(new Date(2026, 8, 26, 0, 0, 0, 0).getTime());
    expect(endMs).toBe(new Date(2026, 8, 27, 0, 0, 0, 0).getTime());
  });

  it("D3 — 시작은 그 하루, 끝은 다음 하루", () => {
    const { startMs, endMs } = dayBounds("2026-12-31");
    expect(dayOf(new Date(startMs))).toBe("2026-12-31");
    expect(dayOf(new Date(endMs))).toBe("2027-01-01");
    expect(dayOf(new Date(endMs - 1))).toBe("2026-12-31");
  });
});

describe("isDayClosed — 자정이 지났는가", () => {
  it("다음 날 00:00에 닫힌다", () => {
    expect(isDayClosed("2026-09-25", new Date("2026-09-25T23:59:59"))).toBe(false);
    expect(isDayClosed("2026-09-25", new Date("2026-09-26T00:00:00"))).toBe(true);
  });
});

describe("DB4·DB5 isDayWritable — 미래가 아니면 쓸 수 있다", () => {
  const today = "2026-09-26";
  it.each(["00:00:00", "09:00:00", "11:59:00", "12:00:00", "23:59:00"])(
    "★ 오늘은 %s에도 쓸 수 있다 (정오 제한 폐지)",
    (time) => {
      expect(isDayWritable(today, new Date(`2026-09-26T${time}`))).toBe(true);
    },
  );

  it("내일은 쓸 수 없다", () => {
    expect(isDayWritable("2026-09-27", new Date("2026-09-26T23:59:00"))).toBe(false);
  });

  it("1년 전도 쓸 수 있다 — 과거 쪽 한계가 없다", () => {
    expect(isDayWritable("2025-09-26", new Date("2026-09-26T09:00:00"))).toBe(true);
  });
});

describe("latestClosedDay", () => {
  it("언제 불러도 어제 — 새벽에도", () => {
    expect(latestClosedDay(new Date("2026-09-26T00:30:00"))).toBe("2026-09-25");
    expect(latestClosedDay(new Date("2026-09-26T15:00:00"))).toBe("2026-09-25");
    expect(latestClosedDay(new Date("2026-01-01T01:00:00"))).toBe("2025-12-31");
  });
});

/**
 * **★ FR-020 — 「사흘」은 뜻이 바뀌지 않는다.** 백그라운드 재시도·알림 정리·미리 준비가 이것을 본다.
 * 정오 이전에 오늘이 들어오면 백그라운드가 아침에 오늘을 쓴다(research R4, 위반 주입 V1).
 */
describe("DB6·DB7 selectableDays — 사흘, 정오 이후에만 오늘", () => {
  it("★ DB6 — 정오 이전엔 어제·그제·그그제 (오늘 없음)", () => {
    expect(selectableDays(new Date("2026-09-26T09:00:00"))).toEqual([
      "2026-09-25",
      "2026-09-24",
      "2026-09-23",
    ]);
    expect(selectableDays(new Date("2026-09-26T11:59:59"))).toEqual([
      "2026-09-25",
      "2026-09-24",
      "2026-09-23",
    ]);
  });

  it("★ DB6 — 정오 이후엔 오늘·어제·그제", () => {
    expect(selectableDays(new Date("2026-09-26T12:00:00"))).toEqual([
      "2026-09-26",
      "2026-09-25",
      "2026-09-24",
    ]);
  });

  it("★ DB7 — 자정 직후는 이미 새 하루 기준이다", () => {
    expect(selectableDays(new Date("2026-09-26T00:30:00"))).toEqual([
      "2026-09-25",
      "2026-09-24",
      "2026-09-23",
    ]);
  });

  it("언제나 셋이고 내림차순이다", () => {
    for (const t of ["00:00", "06:00", "12:00", "18:00", "23:59"]) {
      const days = selectableDays(new Date(`2026-03-01T${t}:00`));
      expect(days).toHaveLength(3);
      expect([...days].sort().reverse()).toEqual(days);
    }
  });

  it("★ 선언에 둘째 인자가 없다 — 범위 크기를 밖에서 정하지 않는다 (009 FR-003)", () => {
    const raw = readFileSync(join(__dirname, "../../src/config/day-boundary.ts"), "utf8");
    expect(raw.match(/export function selectableDays\([^)]*\)/)?.[0]).toBe(
      "export function selectableDays(now: Date)",
    );
  });

  it("★ 범위 크기·정오 상수를 밖으로 내보내지 않는다", () => {
    expect(SOURCE).toContain("const SELECTABLE_DAY_COUNT");
    expect(SOURCE).not.toMatch(/export\s+const\s+(SELECTABLE_DAY_COUNT|WRITABLE_FROM_HOUR)/);
    expect(SOURCE).not.toMatch(/export\s*\{[^}]*(SELECTABLE_DAY_COUNT|WRITABLE_FROM_HOUR)/);
  });

  it("★ R4 — 오늘 포함 조건이 isDayWritable을 타지 않는다", () => {
    const body = SOURCE.slice(SOURCE.indexOf("export function selectableDays"));
    const fn = body.slice(0, body.indexOf("\n}\n"));
    expect(fn).not.toContain("isDayWritable");
  });
});

describe("DB8 weekOf·shiftWeek — 일요일 시작 주", () => {
  it("W1·W2 — 7칸, [0] 일요일 ~ [6] 토요일, 그 날을 포함", () => {
    const week = weekOf("2026-09-24");
    expect(week).toEqual([
      "2026-09-20",
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
    ]);
    week.forEach((day, i) => {
      const [y, m, d] = day.split("-").map(Number);
      expect(new Date(y, m - 1, d).getDay()).toBe(i);
    });
  });

  it("일요일·토요일 자신도 그 주에 든다", () => {
    expect(weekOf("2026-09-20")[0]).toBe("2026-09-20");
    expect(weekOf("2026-09-26")[6]).toBe("2026-09-26");
  });

  it("W3 — 월 경계를 넘는 주", () => {
    expect(weekOf("2026-08-31")).toEqual([
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
    ]);
  });

  it("W3 — 연말 2026-12-31 → 12-27 ~ 2027-01-02", () => {
    expect(weekOf("2026-12-31")).toEqual([
      "2026-12-27",
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });

  it("W4 — shiftWeek는 같은 요일로 ±7n일", () => {
    expect(shiftWeek("2026-09-26", -1)).toBe("2026-09-19");
    expect(shiftWeek("2026-09-19", 1)).toBe("2026-09-26");
    expect(shiftWeek("2027-01-02", -1)).toBe("2026-12-26");
    expect(shiftWeek("2026-09-26", -4)).toBe("2026-08-29");
    expect(weekOf(shiftWeek("2026-09-24", -1))[0]).toBe("2026-09-13");
  });
});

describe("DB9 nextDayStartAt — 다음 자정", () => {
  it("23:59:30 → 다음 날 00:00", () => {
    expect(nextDayStartAt(new Date("2026-09-26T23:59:30")).getTime()).toBe(
      new Date(2026, 8, 27, 0, 0, 0, 0).getTime(),
    );
  });

  it("자정 정각이면 그 다음 자정", () => {
    expect(nextDayStartAt(new Date("2026-09-26T00:00:00")).getTime()).toBe(
      new Date(2026, 8, 27, 0, 0, 0, 0).getTime(),
    );
  });
});

describe("현재 시각을 스스로 읽지 않는다", () => {
  it("소스에 new Date() (인자 없는 호출)가 없다", () => {
    expect(SOURCE).not.toMatch(/new Date\(\s*\)/);
    expect(SOURCE).not.toContain("Date.now(");
  });
});
