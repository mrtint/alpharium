/**
 * 085 — 쓸 차례 알림의 계획 (순수).
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md RP1~RP8
 *       spec.md FR-001~FR-005
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { planReminders, REMINDER_ID_PREFIX } from "../../src/schedule/reminder-plan";
import { reminderTitle } from "../../src/schedule/notification-text";
import type { AutoDiarySettings } from "../../src/schedule/settings";

const ON22: AutoDiarySettings = { enabled: true, targetHour: 22 };
const ON7: AutoDiarySettings = { enabled: true, targetHour: 7 };

const plan = (
  now: Date,
  settings: AutoDiarySettings,
  writtenDays: string[] = [],
  name: string | null = "은동",
) => planReminders({ now, settings, writtenDays, name });

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
