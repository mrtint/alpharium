/**
 * 085 — 쓸 차례 알림의 계획 (순수).
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md RP1~RP8
 *       spec.md FR-001~FR-005
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  planReminders,
  REMINDER_DELAY_MINUTES,
  REMINDER_ID_PREFIX,
  reminderDelayFor,
} from "../../src/schedule/reminder-plan";
import { reminderTitle } from "../../src/schedule/notification-text";
import type { AutoDiarySettings } from "../../src/schedule/settings";
import { fastCycleTiming, productionTiming } from "../../src/schedule/timing";

const ON22: AutoDiarySettings = { enabled: true, targetHour: 22 };
const ON7: AutoDiarySettings = { enabled: true, targetHour: 7 };

const plan = (
  now: Date,
  settings: AutoDiarySettings,
  writtenDays: string[] = [],
  name: string | null = "은동",
  delayMinutes = 0,
) => planReminders({ now, settings, writtenDays, name, delayMinutes });

const at = (y: number, m: number, d: number, h: number) => new Date(y, m - 1, d, h).getTime();

describe("RP1 — 꺼져 있으면 비어 있다", () => {
  it("[]", () => {
    expect(plan(new Date(2026, 9, 15, 9), { enabled: false, targetHour: 22 })).toEqual([]);
  });
});

describe("RP8 — 고른 캐릭터가 없으면(이름 없음) 비어 있다", () => {
  it("[]", () => {
    expect(plan(new Date(2026, 9, 15, 9), ON22, [], null)).toEqual([]);
  });
});

describe("RP2 — 오후 목표는 발화하는 날을 겨냥한다", () => {
  it("목표 전이면 오늘부터", () => {
    const result = plan(new Date(2026, 9, 15, 21, 0), ON22);
    expect(result[0]).toMatchObject({ day: "2026-10-15", at: at(2026, 10, 15, 22) });
  });

  it("목표 정각이거나 그 뒤면 내일부터", () => {
    expect(plan(new Date(2026, 9, 15, 22, 0), ON22)[0]).toMatchObject({
      day: "2026-10-16",
      at: at(2026, 10, 16, 22),
    });
    expect(plan(new Date(2026, 9, 15, 22, 30), ON22)[0]).toMatchObject({
      day: "2026-10-16",
      at: at(2026, 10, 16, 22),
    });
  });

  it("7개이고 날이 모두 다르다", () => {
    const result = plan(new Date(2026, 9, 15, 21, 0), ON22);
    expect(result).toHaveLength(7);
    expect(new Set(result.map((r) => r.day)).size).toBe(7);
    expect(result.map((r) => r.day)).toEqual([
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
    ]);
  });
});

describe("RP3 — 오전 목표는 그 전날을 겨냥한다", () => {
  it("06:00이면 오늘 07:00 발화가 어제를 겨냥한다", () => {
    const result = plan(new Date(2026, 9, 15, 6, 0), ON7);
    expect(result[0]).toMatchObject({ day: "2026-10-14", at: at(2026, 10, 15, 7) });
    expect(result[6]).toMatchObject({ day: "2026-10-20", at: at(2026, 10, 21, 7) });
  });
});

describe("RP5 — 월말·연말을 넘긴다", () => {
  it("10월 31일 → 11월 1일", () => {
    const result = plan(new Date(2026, 9, 31, 23, 0), ON22);
    expect(result[0]).toMatchObject({ day: "2026-11-01", at: at(2026, 11, 1, 22) });
  });

  it("12월 31일 → 1월 1일, 오전 목표의 전날도", () => {
    expect(plan(new Date(2026, 11, 31, 23, 0), ON22)[0]).toMatchObject({ day: "2027-01-01" });
    expect(plan(new Date(2026, 11, 31, 8, 0), ON7)[0]).toMatchObject({
      day: "2026-12-31",
      at: at(2027, 1, 1, 7),
    });
  });
});

describe("RP6 — id와 제목", () => {
  it("id는 접두사 + 날, 제목은 reminderTitle", () => {
    const [first] = plan(new Date(2026, 9, 15, 21, 0), ON22);
    expect(first!.id).toBe(`${REMINDER_ID_PREFIX}2026-10-15`);
    expect(REMINDER_ID_PREFIX).toBe("diary-reminder-");
    expect(first!.title).toBe(reminderTitle("은동", "2026-10-15"));
  });

  it("제목 문구", () => {
    expect(reminderTitle("은동이", "2026-10-15")).toBe("은동이가 10월 15일 일기를 쓸 차례예요");
    expect(reminderTitle("은동", "2026-10-15")).toBe("은동이 10월 15일 일기를 쓸 차례예요");
    expect(reminderTitle("뽀삐", "2026-01-05")).toBe("뽀삐가 1월 5일 일기를 쓸 차례예요");
  });
});

describe("RP7 — 하루 경계를 다시 계산하지 않는다 (DB11)", () => {
  const source = readFileSync(join(__dirname, "..", "..", "src/schedule/reminder-plan.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("new Date()를 인자 없이 부르지 않는다", () => {
    expect(source).not.toMatch(/new Date\(\s*\)/);
  });

  it("getHours를 쓰지 않는다", () => {
    expect(source).not.toMatch(/getHours\s*\(/);
  });

  it("그 날 몫은 includesTodayAtHour로 묻는다", () => {
    expect(source).toMatch(/includesTodayAtHour\(/);
  });
});

describe("RP4 — 쓴 날은 빠진다", () => {
  it("오후 목표 — 오늘·모레가 쓴 날이면 그 둘이 없고 5개", () => {
    const result = plan(new Date(2026, 9, 15, 21, 0), ON22, ["2026-10-15", "2026-10-17"]);
    expect(result.map((r) => r.day)).toEqual([
      "2026-10-16",
      "2026-10-18",
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
    ]);
  });

  it("오전 목표 — 어제가 쓴 날이면 오늘 07:00 발화가 없다", () => {
    const result = plan(new Date(2026, 9, 15, 6, 0), ON7, ["2026-10-14"]);
    expect(result.map((r) => r.at)).not.toContain(at(2026, 10, 15, 7));
    expect(result).toHaveLength(6);
  });
});

/* ───────────────────────── 104 — 배터리 예외가 있으면 쓸 차례 알림을 늦춘다 ───────────────────────── */

const min = (n: number) => n * 60_000;

describe("RD1 — 예외 상태에서 지연이 정해진다", () => {
  it("exempt만 30분, 그 밖은 0", () => {
    expect(REMINDER_DELAY_MINUTES).toBe(30);
    expect(reminderDelayFor("exempt")).toBe(30);
    expect(reminderDelayFor("restricted")).toBe(0);
    expect(reminderDelayFor("unknown")).toBe(0);
  });
});

describe("RD2·RD3 — 지연은 at에만 더해지고 id·day·title은 정각 기준 그대로다", () => {
  it("오후 목표", () => {
    const now = new Date(2026, 9, 15, 21, 0);
    const base = plan(now, ON22);
    const delayed = plan(now, ON22, [], "은동", 30);
    expect(delayed).toHaveLength(base.length);
    delayed.forEach((entry, i) => {
      expect(entry.at).toBe(base[i]!.at + min(30));
      expect(entry.id).toBe(base[i]!.id);
      expect(entry.day).toBe(base[i]!.day);
      expect(entry.title).toBe(base[i]!.title);
    });
  });

  it("오전 목표의 그날/어제 매핑은 정각 기준이다", () => {
    const now = new Date(2026, 9, 15, 6, 0);
    const delayed = plan(now, ON7, [], "은동", 45);
    expect(delayed[0]).toMatchObject({ day: "2026-10-14", at: at(2026, 10, 15, 7) + min(45) });
    expect(delayed[6]).toMatchObject({ day: "2026-10-20", at: at(2026, 10, 21, 7) + min(45) });
  });

  it("23시 목표 + 59분도 같은 날에 머문다", () => {
    const now = new Date(2026, 9, 15, 20, 0);
    const [first] = plan(now, { enabled: true, targetHour: 23 }, [], "은동", 59);
    expect(first).toMatchObject({ day: "2026-10-15", at: at(2026, 10, 15, 23) + min(59) });
  });

  it("범위 밖 지연(음수·60 이상·소수·NaN)은 RangeError", () => {
    const now = new Date(2026, 9, 15, 21, 0);
    for (const bad of [-1, 60, 61, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => plan(now, ON22, [], "은동", bad)).toThrow(RangeError);
    }
  });
});

describe("RD4 — 지연 0은 이 변경 전 계획과 같다", () => {
  it("at이 정각이다", () => {
    const result = plan(new Date(2026, 9, 15, 21, 0), ON22, [], "은동", 0);
    expect(result[0]!.at).toBe(at(2026, 10, 15, 22));
  });
});

describe("RD5 — 정각은 지났지만 정각+지연 전이면 오늘 발화가 계획에 든다", () => {
  it("22:10, 지연 30분이면 오늘 22:30", () => {
    const result = plan(new Date(2026, 9, 15, 22, 10), ON22, [], "은동", 30);
    expect(result[0]).toMatchObject({ day: "2026-10-15", at: at(2026, 10, 15, 22) + min(30) });
    expect(result).toHaveLength(7);
  });

  it("22:30 정각이면 오늘 발화는 지났고 내일부터(지연 30분)", () => {
    const result = plan(new Date(2026, 9, 15, 22, 30), ON22, [], "은동", 30);
    expect(result[0]).toMatchObject({ day: "2026-10-16" });
  });

  it("같은 시각에 지연 0이면 내일부터다(종전)", () => {
    const result = plan(new Date(2026, 9, 15, 22, 10), ON22, [], "은동", 0);
    expect(result[0]).toMatchObject({ day: "2026-10-16" });
  });

  it("쓴 날은 지연이 있어도 빠진다", () => {
    const result = plan(new Date(2026, 9, 15, 22, 10), ON22, ["2026-10-15"], "은동", 30);
    expect(result[0]).toMatchObject({ day: "2026-10-16" });
  });
});

describe("106 FC6 — 빠른 주기: 다음 주기 시작의 알림 하나", () => {
  const T30 = fastCycleTiming(30);
  const NOW = new Date(2026, 9, 26, 10, 20); // 순번 20 (10:00~10:30) → 다음 주기 시작 10:30

  const fast = (over: Partial<Parameters<typeof planReminders>[0]> = {}) =>
    planReminders({
      now: NOW,
      settings: { enabled: true, targetHour: 22 },
      writtenDays: [],
      name: "은동",
      delayMinutes: 0,
      timing: T30,
      ...over,
    });

  it("정확히 한 개 — at은 다음 주기 시작, id는 그 날 기준", () => {
    const result = fast();
    expect(result).toEqual([
      {
        id: `${REMINDER_ID_PREFIX}2026-10-26`,
        day: "2026-10-26",
        at: new Date(2026, 9, 26, 10, 30).getTime(),
        title: reminderTitle("은동", "2026-10-26"),
      },
    ]);
  });

  it("지연이 더해진다 (배터리 예외 — 상한은 reminders.ts가 정한다)", () => {
    expect(fast({ delayMinutes: 15 })[0]!.at).toBe(new Date(2026, 9, 26, 10, 45).getTime());
  });

  it("written을 보지 않는다 — 오늘 일기가 있어도 다음 주기 시작 알림은 걸린다 (그때 리셋으로 지워진다)", () => {
    expect(fast({ writtenDays: ["2026-10-26"] })).toHaveLength(1);
  });

  it("하루의 마지막 주기면 다음 날 자정이 다음 주기 시작이고 id도 그 날이다", () => {
    const result = fast({ now: new Date(2026, 9, 26, 23, 50) });
    expect(result[0]).toMatchObject({
      day: "2026-10-27",
      id: `${REMINDER_ID_PREFIX}2026-10-27`,
      at: new Date(2026, 9, 27, 0, 0).getTime(),
    });
  });

  it("꺼져 있으면 비어 있다", () => {
    expect(fast({ settings: { enabled: false, targetHour: 22 } })).toEqual([]);
  });

  it("이름이 없으면 비어 있다 (RP8)", () => {
    expect(fast({ name: null })).toEqual([]);
  });

  it("지연은 여전히 [0, 60) 정수여야 한다", () => {
    expect(() => fast({ delayMinutes: 60 })).toThrow(RangeError);
  });

  it("timing이 production이거나 없으면 종전 7일치다", () => {
    const base = { now: NOW, settings: ON22, writtenDays: [], name: "은동", delayMinutes: 0 };
    const without = planReminders(base);
    const prod = planReminders({ ...base, timing: productionTiming(ON22) });
    expect(without).toHaveLength(7);
    expect(prod).toEqual(without);
  });
});
