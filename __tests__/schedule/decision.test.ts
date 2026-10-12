import { readFileSync } from "node:fs";
import { join } from "node:path";

import { decideSchedule } from "../../src/schedule/decision";
import type { AutoDiarySettings } from "../../src/schedule/settings";

/**
 * 스케줄 판정의 계약 테스트.
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/schedule-decision.md D1~D4·D7 (078이 D1·D2를 고쳤다)
 *
 * 078 — **오늘은 시도 창 안에서만, 지난 날(`selectableDays` 중 `today`가 아닌 날)은 언제든 쓴다.** iOS `BGTaskScheduler`는
 * 창 안에 깨운다는 보장이 없고 앱 열기 경로도 같은 판정이라, 놓친 날을 다음 기회에 쓰지 않으면 iOS에서 일기가 영영 안 생겼다.
 */

const ENABLED: AutoDiarySettings = { enabled: true, targetHour: 7 };
const TODAY = "2026-08-28";

/** 기기 현지 시각으로 특정 시(hour)를 만든다 — 2026-08-28 hh:30 */
function at(hour: number): Date {
  return new Date(2026, 7, 28, hour, 30, 0, 0);
}

/** 정오 전의 사흘(오늘 없음) — `selectableDays()`의 구성 규칙(049) */
const PAST_ONLY = ["2026-08-27", "2026-08-26", "2026-08-25"] as const;
/** 정오 후의 사흘(오늘 포함) */
const WITH_TODAY = [TODAY, "2026-08-27", "2026-08-26"] as const;
const PAST_WRITTEN = ["2026-08-27", "2026-08-26", "2026-08-25"] as const;

describe("D2-1 — 꺼져 있으면 안 한다", () => {
  it("enabled: false면 { act: false, reason: 'disabled' } — 지난 날이 비어 있어도", () => {
    const r = decideSchedule({
      settings: { ...ENABLED, enabled: false },
      now: at(7),
      today: TODAY,
      selectableDays: PAST_ONLY,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: false, reason: "disabled" });
  });
});

describe("D2-2 — 오늘은 창 안에서만 (목표 14시, 창 [14, 17))", () => {
  const PM: AutoDiarySettings = { enabled: true, targetHour: 14 };

  it("창 안(14시)이고 오늘이 비어 있으면 오늘", () => {
    const r = decideSchedule({
      settings: PM,
      now: at(14),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: true, day: TODAY });
  });

  it("창의 마지막 시(16시)도 창 안", () => {
    const r = decideSchedule({
      settings: PM,
      now: at(16),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: true, day: TODAY });
  });

  it("창의 끝(17시)이면 오늘은 안 쓴다 — 오늘만 비어 있으면 not-near-target", () => {
    const r = decideSchedule({
      settings: PM,
      now: at(17),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: false, reason: "not-near-target" });
  });

  it("창 직전(13시)도 오늘은 안 쓴다", () => {
    const r = decideSchedule({
      settings: PM,
      now: at(13),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: false, reason: "not-near-target" });
  });

  it("창 안이고 오늘도 어제도 비어 있으면 가장 최근인 오늘", () => {
    const r = decideSchedule({
      settings: PM,
      now: at(15),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: true, day: TODAY });
  });
});

describe("D2-2 — 지난 날은 창과 무관하게 (078)", () => {
  it("창 밖(6시, 목표 7시)이어도 어제가 비어 있으면 어제", () => {
    const r = decideSchedule({
      settings: ENABLED,
      now: at(6),
      today: TODAY,
      selectableDays: PAST_ONLY,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: true, day: "2026-08-27" });
  });

  it("창 밖(17시)이고 오늘·어제가 비어 있으면 오늘을 건너 어제", () => {
    const r = decideSchedule({
      settings: { enabled: true, targetHour: 14 },
      now: at(17),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: true, day: "2026-08-27" });
  });

  it("창 밖이고 어제는 써 있고 그제가 비어 있으면 그제", () => {
    const r = decideSchedule({
      settings: ENABLED,
      now: at(3),
      today: TODAY,
      selectableDays: PAST_ONLY,
      existingDiaryDays: ["2026-08-27"],
    });
    expect(r).toEqual({ act: true, day: "2026-08-26" });
  });

  it("창 밖(6시)이고 지난 날이 다 써 있으면(오늘은 정오 전이라 후보 아님) all-written", () => {
    const r = decideSchedule({
      settings: ENABLED,
      now: at(6),
      today: TODAY,
      selectableDays: PAST_ONLY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: false, reason: "all-written" });
  });
});

describe("D2-2 — 자정 wrap (목표 23시, 창 [23, 26) → 23·0·1)", () => {
  const LATE: AutoDiarySettings = { ...ENABLED, targetHour: 23 };

  it("23시면 창 안 — 오늘(정오 후)을 쓴다", () => {
    const r = decideSchedule({
      settings: LATE,
      now: at(23),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: true, day: TODAY });
  });

  it("자정 넘어 0시면 창 안 — 새 날은 정오 전이라 후보에 없고 어제(그날)를 쓴다", () => {
    const r = decideSchedule({
      settings: LATE,
      now: at(0),
      today: TODAY,
      selectableDays: PAST_ONLY,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: true, day: "2026-08-27" });
  });

  it("1시도 창 안 — 어제", () => {
    const r = decideSchedule({
      settings: LATE,
      now: at(1),
      today: TODAY,
      selectableDays: PAST_ONLY,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: true, day: "2026-08-27" });
  });

  it("22시(창 시작 직전)면 오늘은 안 쓴다 — 오늘만 비어 있으면 not-near-target", () => {
    const r = decideSchedule({
      settings: LATE,
      now: at(22),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: false, reason: "not-near-target" });
  });

  it("22시여도 어제가 비어 있으면 어제", () => {
    const r = decideSchedule({
      settings: LATE,
      now: at(22),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: [TODAY, "2026-08-26"],
    });
    expect(r).toEqual({ act: true, day: "2026-08-27" });
  });
});

describe("D2-3 — 대상 하루 선정 (retry.ts 재사용)", () => {
  it("창 안이고 전부 써졌으면 { act: false, reason: 'all-written' }", () => {
    const r = decideSchedule({
      settings: ENABLED,
      now: at(7),
      today: TODAY,
      selectableDays: PAST_ONLY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: false, reason: "all-written" });
  });

  it("창 밖이고 오늘 포함 전부 써졌으면 all-written (not-near-target이 아니다)", () => {
    const r = decideSchedule({
      settings: ENABLED,
      now: at(17),
      today: TODAY,
      selectableDays: WITH_TODAY,
      existingDiaryDays: [TODAY, "2026-08-27", "2026-08-26"],
    });
    expect(r).toEqual({ act: false, reason: "all-written" });
  });

  it("가장 최근이 써졌으면 그다음을 대상으로", () => {
    const r = decideSchedule({
      settings: ENABLED,
      now: at(8),
      today: TODAY,
      selectableDays: PAST_ONLY,
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
    expect(CODE).toMatch(/\bWINDOW_HOURS\b/);
  });

  it("D7 — 파이프라인·알림·잠금을 부르지 않는다 (순수 판정)", () => {
    expect(CODE).not.toMatch(/pipeline|\.run\(|notification|acquireLock|present\(/i);
  });

  it("D5 — pickRetryDay를 재사용한다 (대상 선정을 다시 구현하지 않음)", () => {
    expect(CODE).toMatch(/pickRetryDay/);
  });

  it("078 — 하루 경계를 계산하지 않는다 (dayOf·getDate를 import·호출하지 않고 today를 주입받는다)", () => {
    expect(CODE).not.toMatch(/\bdayOf\b|getDate\(/);
    expect(CODE).toMatch(/today/);
  });
});
