import { readFileSync } from "node:fs";
import { join } from "node:path";

import { includesTodayAtHour } from "../../src/config/day-boundary";
import { decideSchedule, isInTargetWindow } from "../../src/schedule/decision";
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

/**
 * `today`와 「창이 겨냥하는 날」을 채워 부른다. 겨냥하는 날은 제품과 같은 규칙으로 구한다 — 목표 시(hour)에 사흘에 오늘이 드는가
 * (`includesTodayAtHour`, 049 구성 규칙). 오후 목표는 오늘, 오전 목표는 어제를 겨냥한다(056 미리보기 문장과 같다).
 */
function decide(input: {
  settings: AutoDiarySettings;
  now: Date;
  selectableDays: readonly string[];
  existingDiaryDays: readonly string[];
}) {
  return decideSchedule({
    ...input,
    today: TODAY,
    targetDay: includesTodayAtHour(input.settings.targetHour) ? "today" : "yesterday",
  });
}

/** 정오 전의 사흘(오늘 없음) — `selectableDays()`의 구성 규칙(049) */
const PAST_ONLY = ["2026-08-27", "2026-08-26", "2026-08-25"] as const;
/** 정오 후의 사흘(오늘 포함) */
const WITH_TODAY = [TODAY, "2026-08-27", "2026-08-26"] as const;
const PAST_WRITTEN = ["2026-08-27", "2026-08-26", "2026-08-25"] as const;

describe("D2-1 — 꺼져 있으면 안 한다", () => {
  it("enabled: false면 { act: false, reason: 'disabled' } — 지난 날이 비어 있어도", () => {
    const r = decide({
      settings: { ...ENABLED, enabled: false },
      now: at(7),
      selectableDays: PAST_ONLY,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: false, reason: "disabled" });
  });
});

describe("D2-2 — 오늘은 창 안에서만 (목표 14시, 창 [14, 17))", () => {
  const PM: AutoDiarySettings = { enabled: true, targetHour: 14 };

  it("창 안(14시)이고 오늘이 비어 있으면 오늘", () => {
    const r = decide({
      settings: PM,
      now: at(14),
      selectableDays: WITH_TODAY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toMatchObject({ act: true, day: TODAY });
  });

  it("창의 마지막 시(16시)도 창 안", () => {
    const r = decide({
      settings: PM,
      now: at(16),
      selectableDays: WITH_TODAY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toMatchObject({ act: true, day: TODAY });
  });

  it("창의 끝(17시)이면 오늘은 안 쓴다 — 오늘만 비어 있으면 not-near-target", () => {
    const r = decide({
      settings: PM,
      now: at(17),
      selectableDays: WITH_TODAY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: false, reason: "not-near-target" });
  });

  it("창 직전(13시)도 오늘은 안 쓴다", () => {
    const r = decide({
      settings: PM,
      now: at(13),
      selectableDays: WITH_TODAY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: false, reason: "not-near-target" });
  });

  it("창 안이고 오늘도 어제도 비어 있으면 가장 최근인 오늘", () => {
    const r = decide({
      settings: PM,
      now: at(15),
      selectableDays: WITH_TODAY,
      existingDiaryDays: [],
    });
    expect(r).toMatchObject({ act: true, day: TODAY });
  });
});

describe("D2-2 — 지난 날은 창과 무관하게 (078)", () => {
  it("창이 지난 뒤(10시, 목표 7시)에는 어제가 비어 있으면 어제", () => {
    const r = decide({
      settings: ENABLED,
      now: at(10),
      selectableDays: PAST_ONLY,
      existingDiaryDays: [],
    });
    expect(r).toMatchObject({ act: true, day: "2026-08-27" });
  });

  it("창 밖(17시)이고 오늘·어제가 비어 있으면 오늘을 건너 어제", () => {
    const r = decide({
      settings: { enabled: true, targetHour: 14 },
      now: at(17),
      selectableDays: WITH_TODAY,
      existingDiaryDays: [],
    });
    expect(r).toMatchObject({ act: true, day: "2026-08-27" });
  });

  it("창 밖이고 어제는 써 있고 그제가 비어 있으면 그제", () => {
    const r = decide({
      settings: ENABLED,
      now: at(3),
      selectableDays: PAST_ONLY,
      existingDiaryDays: ["2026-08-27"],
    });
    expect(r).toMatchObject({ act: true, day: "2026-08-26" });
  });

  it("창 밖(6시)이고 지난 날이 다 써 있으면(오늘은 정오 전이라 후보 아님) all-written", () => {
    const r = decide({
      settings: ENABLED,
      now: at(6),
      selectableDays: PAST_ONLY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: false, reason: "all-written" });
  });
});

describe("D2-2 — 오전 목표의 어제는 오늘 목표 시각에 차례가 온다 (078 리뷰 I1)", () => {
  // 목표 7시 = 「매일 오전 7시쯤 어제 일기를 써요」. 어제의 창은 오늘 7시에 열린다 — 그 전(자정 직후 등)에 쓰면 고른 시각이 무의미해진다.
  it.each([0, 3, 6])("%i시(목표 7시 전)에는 어제를 건너 그제를 쓴다 — 어제만 기다린다", (hour) => {
    const r = decide({
      settings: ENABLED,
      now: at(hour),
      selectableDays: PAST_ONLY,
      existingDiaryDays: [],
    });
    // 그제·그끄제는 이미 차례가 지났으므로 쓴다 — 어제만 기다린다
    expect(r).toMatchObject({ act: true, day: "2026-08-26" });
  });

  it("목표 7시 전이고 어제만 비어 있으면 not-near-target (all-written이 아니다 — 어제가 기다리는 중이다)", () => {
    const r = decide({
      settings: ENABLED,
      now: at(3),
      selectableDays: PAST_ONLY,
      existingDiaryDays: ["2026-08-26", "2026-08-25"],
    });
    expect(r).toEqual({ act: false, reason: "not-near-target" });
  });

  it("창 안(7시)에는 종전대로 어제", () => {
    const r = decide({
      settings: ENABLED,
      now: at(7),
      selectableDays: PAST_ONLY,
      existingDiaryDays: ["2026-08-26", "2026-08-25"],
    });
    expect(r).toMatchObject({ act: true, day: "2026-08-27" });
  });

  it.each([10, 15, 23])("창이 지난 %i시에는 어제를 쓴다 (놓친 날)", (hour) => {
    const r = decide({
      settings: ENABLED,
      now: at(hour),
      selectableDays: hour >= 12 ? WITH_TODAY : PAST_ONLY,
      existingDiaryDays: hour >= 12 ? [TODAY, "2026-08-26"] : ["2026-08-26", "2026-08-25"],
    });
    expect(r).toMatchObject({ act: true, day: "2026-08-27" });
  });

  it("오후 목표(22시)는 새벽 3시에도 어제를 쓴다 — 어제의 창은 어제 22시에 이미 열렸다 (iOS가 밤에 깨우는 경우)", () => {
    const r = decide({
      settings: { enabled: true, targetHour: 22 },
      now: at(3),
      selectableDays: PAST_ONLY,
      existingDiaryDays: [],
    });
    expect(r).toMatchObject({ act: true, day: "2026-08-27" });
  });
});

describe("창 안인가 (078 리뷰 I2 — 따라잡기 상한이 묻는다)", () => {
  it("목표 7시: 7·8·9시는 창 안, 6·10시는 창 밖", () => {
    expect([6, 7, 8, 9, 10].map((h) => isInTargetWindow(ENABLED, at(h)))).toEqual([
      false,
      true,
      true,
      true,
      false,
    ]);
  });

  it("목표 23시: 23·0·1시는 창 안(자정 wrap), 22·2시는 창 밖", () => {
    const late = { enabled: true, targetHour: 23 };
    expect([22, 23, 0, 1, 2].map((h) => isInTargetWindow(late, at(h)))).toEqual([
      false,
      true,
      true,
      true,
      false,
    ]);
  });
});

describe("D2-2 — 자정 wrap (목표 23시, 창 [23, 26) → 23·0·1)", () => {
  const LATE: AutoDiarySettings = { ...ENABLED, targetHour: 23 };

  it("23시면 창 안 — 오늘(정오 후)을 쓴다", () => {
    const r = decide({
      settings: LATE,
      now: at(23),
      selectableDays: WITH_TODAY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toMatchObject({ act: true, day: TODAY });
  });

  it("자정 넘어 0시면 창 안 — 새 날은 정오 전이라 후보에 없고 어제(그날)를 쓴다", () => {
    const r = decide({
      settings: LATE,
      now: at(0),
      selectableDays: PAST_ONLY,
      existingDiaryDays: [],
    });
    expect(r).toMatchObject({ act: true, day: "2026-08-27" });
  });

  it("1시도 창 안 — 어제", () => {
    const r = decide({
      settings: LATE,
      now: at(1),
      selectableDays: PAST_ONLY,
      existingDiaryDays: [],
    });
    expect(r).toMatchObject({ act: true, day: "2026-08-27" });
  });

  it("22시(창 시작 직전)면 오늘은 안 쓴다 — 오늘만 비어 있으면 not-near-target", () => {
    const r = decide({
      settings: LATE,
      now: at(22),
      selectableDays: WITH_TODAY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: false, reason: "not-near-target" });
  });

  it("22시여도 어제가 비어 있으면 어제", () => {
    const r = decide({
      settings: LATE,
      now: at(22),
      selectableDays: WITH_TODAY,
      existingDiaryDays: [TODAY, "2026-08-26"],
    });
    expect(r).toMatchObject({ act: true, day: "2026-08-27" });
  });
});

describe("D2-3 — 대상 하루 선정 (retry.ts 재사용)", () => {
  it("창 안이고 전부 써졌으면 { act: false, reason: 'all-written' }", () => {
    const r = decide({
      settings: ENABLED,
      now: at(7),
      selectableDays: PAST_ONLY,
      existingDiaryDays: PAST_WRITTEN,
    });
    expect(r).toEqual({ act: false, reason: "all-written" });
  });

  it("창 밖이고 오늘 포함 전부 써졌으면 all-written (not-near-target이 아니다)", () => {
    const r = decide({
      settings: ENABLED,
      now: at(17),
      selectableDays: WITH_TODAY,
      existingDiaryDays: [TODAY, "2026-08-27", "2026-08-26"],
    });
    expect(r).toEqual({ act: false, reason: "all-written" });
  });

  it("가장 최근이 써졌으면 그다음을 대상으로", () => {
    const r = decide({
      settings: ENABLED,
      now: at(8),
      selectableDays: PAST_ONLY,
      existingDiaryDays: ["2026-08-27"],
    });
    expect(r).toMatchObject({ act: true, day: "2026-08-26" });
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

  it("D7 — 파이프라인·알림·등록부를 부르지 않는다 (순수 판정)", () => {
    // 080 — 잠금(`acquireLock`)은 등록부의 칸(`beginWrite`·`liveWrites`)이 됐다. 판정은 쓰기를 시작하지 않는다.
    expect(CODE).not.toMatch(/pipeline|\.run\(|notification|beginWrite|liveWrites|present\(/i);
  });

  it("D5 — pickRetryDay를 재사용한다 (대상 선정을 다시 구현하지 않음)", () => {
    expect(CODE).toMatch(/pickRetryDay/);
  });

  it("078 — 하루 경계를 계산하지 않는다 (dayOf·getDate를 import·호출하지 않고 today를 주입받는다)", () => {
    expect(CODE).not.toMatch(/\bdayOf\b|getDate\(/);
    expect(CODE).toMatch(/today/);
  });
});

describe("105 — 후보 날 전부(days)를 최근→과거로 싣는다", () => {
  it("창 안: 오늘 포함 비어 있는 사흘 전부, 첫 원소가 day", () => {
    const r = decide({
      settings: ENABLED,
      now: at(7),
      selectableDays: WITH_TODAY,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: true, day: TODAY, days: [TODAY, "2026-08-27", "2026-08-26"] });
  });

  it("쓴 날은 빠진다", () => {
    const r = decide({
      settings: ENABLED,
      now: at(7),
      selectableDays: WITH_TODAY,
      existingDiaryDays: ["2026-08-27"],
    });
    expect(r).toEqual({ act: true, day: TODAY, days: [TODAY, "2026-08-26"] });
  });

  it("창 밖(17시, 목표 7시): 오늘은 후보가 아니다", () => {
    const r = decide({
      settings: ENABLED,
      now: at(17),
      selectableDays: WITH_TODAY,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: true, day: "2026-08-27", days: ["2026-08-27", "2026-08-26"] });
  });

  it("오전 목표 시각 전(5시, 목표 7시): 어제도 후보가 아니다", () => {
    const r = decide({
      settings: ENABLED,
      now: at(5),
      selectableDays: PAST_ONLY,
      existingDiaryDays: [],
    });
    expect(r).toEqual({ act: true, day: "2026-08-26", days: ["2026-08-26", "2026-08-25"] });
  });
});
