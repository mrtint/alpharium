import { readFileSync } from "node:fs";
import { join } from "node:path";

import { decideSchedule } from "../../src/schedule/decision";
import type { AutoDiarySettings } from "../../src/schedule/settings";

/**
 * 스케줄 판정의 계약 테스트.
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/schedule-decision.md
 *       D1~D4·D6·D7
 *       spec.md FR-001·FR-003·FR-013
 *
 * **매 백그라운드 콜백이 이 판정을 한다** — "지금 자동 생성을 돌려야
 * 하는가, 돌린다면 어느 하루를". 순수 함수이므로 목표 시각 경계·자정
 * wrap을 기기 없이 검증한다.
 */

const ENABLED: AutoDiarySettings = { enabled: true, targetHour: 7, batteryExceptionPrompted: true };

/** 기기 현지 시각으로 특정 시(hour)를 만든다. */
function at(hour: number): Date {
  const d = new Date(2026, 7, 28, hour, 30, 0, 0); // 2026-08-28 hh:30 local
  return d;
}

const SELECTABLE = ["2026-08-27", "2026-08-26", "2026-08-25"] as const;

describe("D2-1 — 꺼져 있으면 안 한다", () => {
  it("enabled: false면 { act: false, reason: 'disabled' }", () => {
    const r = decideSchedule({
      settings: { ...ENABLED, enabled: false },
      now: at(7),
      selectableDays: SELECTABLE,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: false, reason: "disabled" });
  });
});

describe("D2-2 — 목표 시각 근방인가", () => {
  it("목표 시각 정각(7시)이면 근방 — act: true", () => {
    const r = decideSchedule({
      settings: ENABLED,
      now: at(7),
      selectableDays: SELECTABLE,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: true, day: "2026-08-27" });
  });

  it("목표 시각 직전(6시)이면 근방 아님 — not-near-target", () => {
    const r = decideSchedule({
      settings: ENABLED,
      now: at(6),
      selectableDays: SELECTABLE,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: false, reason: "not-near-target" });
  });

  it("창의 마지막 직전(9시, WINDOW=3 → [7,10))이면 근방", () => {
    const r = decideSchedule({
      settings: ENABLED,
      now: at(9),
      selectableDays: SELECTABLE,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: true, day: "2026-08-27" });
  });

  it("창의 끝(10시)이면 근방 아님 — [targetHour, targetHour+WINDOW)", () => {
    const r = decideSchedule({
      settings: ENABLED,
      now: at(10),
      selectableDays: SELECTABLE,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: false, reason: "not-near-target" });
  });
});

describe("D2-2 — 자정 wrap (targetHour + WINDOW > 24)", () => {
  const LATE: AutoDiarySettings = { ...ENABLED, targetHour: 23 };

  it("23시면 근방 (창 [23, 26) → 23·0·1)", () => {
    const r = decideSchedule({
      settings: LATE,
      now: at(23),
      selectableDays: SELECTABLE,
      existingDiaryDays: [],
    });
    expect(r.act).toBe(true);
  });

  it("자정 넘어 0시면 여전히 근방 (wrap)", () => {
    const r = decideSchedule({
      settings: LATE,
      now: at(0),
      selectableDays: SELECTABLE,
      existingDiaryDays: [],
    });
    expect(r.act).toBe(true);
  });

  it("1시면 여전히 근방", () => {
    const r = decideSchedule({
      settings: LATE,
      now: at(1),
      selectableDays: SELECTABLE,
      existingDiaryDays: [],
    });
    expect(r.act).toBe(true);
  });

  it("2시면 근방 아님", () => {
    const r = decideSchedule({
      settings: LATE,
      now: at(2),
      selectableDays: SELECTABLE,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: false, reason: "not-near-target" });
  });

  it("22시(창 시작 직전)면 근방 아님", () => {
    const r = decideSchedule({
      settings: LATE,
      now: at(22),
      selectableDays: SELECTABLE,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: false, reason: "not-near-target" });
  });
});

describe("D2-3 — 대상 하루 선정 (retry.ts 재사용)", () => {
  it("전부 써졌으면 { act: false, reason: 'all-written' }", () => {
    const r = decideSchedule({
      settings: ENABLED,
      now: at(7),
      selectableDays: SELECTABLE,
      existingDiaryDays: ["2026-08-27", "2026-08-26", "2026-08-25"],
    });
    expect(r).toEqual({ act: false, reason: "all-written" });
  });

  it("가장 최근이 써졌으면 그다음을 대상으로", () => {
    const r = decideSchedule({
      settings: ENABLED,
      now: at(8),
      selectableDays: SELECTABLE,
      existingDiaryDays: ["2026-08-27"],
    });
    expect(r).toEqual({ act: true, day: "2026-08-26" });
  });
});

describe("소스 검사 — D3·D4·D7", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/schedule/decision.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("D4 — now를 인자로 받는다 (안에서 new Date() 없음)", () => {
    expect(CODE).not.toMatch(/new Date\(\)/);
  });

  it("D3 — WINDOW_HOURS를 export하지 않는다", () => {
    expect(CODE).not.toMatch(/export\s+(const|let|function)\s+WINDOW_HOURS/);
    expect(CODE).toMatch(/\bWINDOW_HOURS\b/); // 상수 자체는 존재
  });

  it("D7 — 파이프라인·알림·잠금을 부르지 않는다 (순수 판정)", () => {
    expect(CODE).not.toMatch(/pipeline|\.run\(|notification|acquireLock|present\(/i);
  });

  it("D5 — pickRetryDay를 재사용한다 (대상 선정을 다시 구현하지 않음)", () => {
    expect(CODE).toMatch(/pickRetryDay/);
  });
});
