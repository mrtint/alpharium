import { includesTodayAtHour } from "../../src/config/day-boundary";
import type { AutoDiarySettings } from "../../src/schedule/settings";
import {
  cycleOf,
  fastCycleTiming,
  parsePeriodMinutes,
  productionTiming,
} from "../../src/schedule/timing";

/**
 * 자동 쓰기 시간 규칙 해석기 (106).
 *
 * 계약: specs/106-auto-write-fast-cycle/contracts/fast-cycle.md FC1·FC4~FC7
 *
 * 배포 동치(FC1): `productionTiming`은 106 이전 `decision.ts`의 시 단위 창·오전 목표·`includesTodayAtHour` 논리를 그대로 옮긴 것이다.
 * 빠른 주기(FC4·FC5): 자정부터 N분 격자, 창은 주기 시작부터 ⌊N/2⌋분, 후보는 오늘 하나.
 */

const settings = (targetHour: number): AutoDiarySettings => ({ enabled: true, targetHour });

/** 2026-10-26 hh:mm:ss(.ms) — 기기 현지 시각 */
const at = (hour: number, minute = 0, second = 0, ms = 0) =>
  new Date(2026, 9, 26, hour, minute, second, ms);

describe("productionTiming — 배포 동치 (FC1)", () => {
  it("kind는 production이다", () => {
    expect(productionTiming(settings(22)).kind).toBe("production");
  });

  it("목표 22시: 창은 22·23·0시 세 시간 (자정 wrap) — 1시·3시·21시는 거짓", () => {
    const t = productionTiming(settings(22));
    expect([22, 23, 0].map((h) => t.inWindow(at(h, 30)))).toEqual([true, true, true]);
    expect([1, 2, 3, 21].map((h) => t.inWindow(at(h, 30)))).toEqual([false, false, false, false]);
  });

  it("창 경계는 분이 아니라 시로 본다: 22:00은 참, 21:59는 거짓, 00:59는 참, 01:00은 거짓", () => {
    const t = productionTiming(settings(22));
    expect(t.inWindow(at(22, 0))).toBe(true);
    expect(t.inWindow(at(21, 59))).toBe(false);
    expect(t.inWindow(at(0, 59))).toBe(true);
    expect(t.inWindow(at(1, 0))).toBe(false);
  });

  it("목표 7시 창은 7·8·9시 (오전 목표)", () => {
    const t = productionTiming(settings(7));
    expect([6, 7, 8, 9, 10].map((h) => t.inWindow(at(h, 30)))).toEqual([
      false,
      true,
      true,
      true,
      false,
    ]);
  });

  it("targetAhead는 지금 시가 목표 시보다 작은가", () => {
    const t = productionTiming(settings(7));
    expect(t.targetAhead(at(6, 59))).toBe(true);
    expect(t.targetAhead(at(7, 0))).toBe(false);
    expect(t.targetAhead(at(23, 0))).toBe(false);
  });

  it("targetDay는 includesTodayAtHour와 같다 — 오전 목표는 어제, 오후 목표는 오늘", () => {
    for (const hour of [0, 7, 11, 12, 14, 22, 23]) {
      expect(productionTiming(settings(hour)).targetDay).toBe(
        includesTodayAtHour(hour) ? "today" : "yesterday",
      );
    }
  });

  it("candidateDays는 입력을 그대로 돌려준다", () => {
    const days = ["2026-10-26", "2026-10-25", "2026-10-24"];
    expect(productionTiming(settings(22)).candidateDays(days, "2026-10-26")).toEqual(days);
  });

  it("알림 지연 상한은 30분이다 (REMINDER_DELAY_MINUTES)", () => {
    expect(productionTiming(settings(22)).reminderDelayCap).toBe(30);
  });
});

describe("cycleOf — 주기 수학 (FC4, research R2)", () => {
  it("30분 주기: 10:20은 순번 20, 10:00~10:30, 창 끝 10:15", () => {
    const c = cycleOf(30, at(10, 20));
    expect(c.id).toBe("2026-10-26#20");
    expect(c.startMs).toBe(at(10, 0).getTime());
    expect(c.endMs).toBe(at(10, 30).getTime());
    expect(c.windowEndMs).toBe(at(10, 15).getTime());
  });

  it("자정 정각은 그 날의 순번 0이다", () => {
    const c = cycleOf(30, at(0, 0));
    expect(c.id).toBe("2026-10-26#0");
    expect(c.startMs).toBe(at(0, 0).getTime());
  });

  it("주기 경계 1ms 전은 앞 주기, 정각은 다음 주기", () => {
    expect(cycleOf(30, at(10, 29, 59, 999)).id).toBe("2026-10-26#20");
    expect(cycleOf(30, at(10, 30, 0, 0)).id).toBe("2026-10-26#21");
  });

  it("날짜가 바뀌면 순번은 0부터 다시 시작한다", () => {
    expect(cycleOf(30, new Date(2026, 9, 26, 23, 59)).id).toBe("2026-10-26#47");
    expect(cycleOf(30, new Date(2026, 9, 27, 0, 0)).id).toBe("2026-10-27#0");
  });

  it("마지막 주기는 자정에서 잘린다 (N=50: 23:20~24:00, 창은 40분 안에 닫힌다)", () => {
    const c = cycleOf(50, at(23, 30));
    expect(c.startMs).toBe(at(23, 20).getTime());
    expect(c.endMs).toBe(new Date(2026, 9, 27, 0, 0).getTime());
    expect(c.windowEndMs).toBe(at(23, 45).getTime());
  });

  it("잘린 주기가 창보다 짧으면 창 끝은 주기 끝을 넘지 않는다 (N=100: 23:20~24:00, 창 50분 → 40분)", () => {
    const c = cycleOf(100, at(23, 30));
    expect(c.startMs).toBe(at(23, 20).getTime());
    expect(c.windowEndMs).toBe(c.endMs);
  });

  it("N=5의 창은 2분이다 (⌊5/2⌋)", () => {
    const c = cycleOf(5, at(10, 7));
    expect(c.startMs).toBe(at(10, 5).getTime());
    expect(c.windowEndMs).toBe(at(10, 7).getTime());
  });

  it("창 끝은 언제나 주기 끝 이하이고 시작 이상이다 (프리셋·경계 전수)", () => {
    for (const n of [5, 10, 30, 60, 100, 180]) {
      for (let minute = 0; minute < 1440; minute += 7) {
        const c = cycleOf(n, at(Math.floor(minute / 60), minute % 60));
        expect(c.windowEndMs).toBeGreaterThanOrEqual(c.startMs);
        expect(c.windowEndMs).toBeLessThanOrEqual(c.endMs);
        expect(c.endMs).toBeGreaterThan(c.startMs);
      }
    }
  });
});

describe("fastCycleTiming (FC4·FC5)", () => {
  const t = fastCycleTiming(30);

  it("kind는 fast-cycle이다", () => {
    expect(t.kind).toBe("fast-cycle");
  });

  it("inWindow는 [시작, 창 끝)에서만 참이다 — 10:00 참, 10:14:59.999 참, 10:15 거짓, 9:59 거짓", () => {
    expect(t.inWindow(at(10, 0))).toBe(true);
    expect(t.inWindow(at(10, 14, 59, 999))).toBe(true);
    expect(t.inWindow(at(10, 15))).toBe(false);
    expect(t.inWindow(at(9, 59))).toBe(false);
  });

  it("targetAhead는 늘 거짓, targetDay는 today", () => {
    expect(t.targetAhead(at(3, 0))).toBe(false);
    expect(t.targetDay).toBe("today");
  });

  it("후보 날은 오늘 하나다 — 선택 가능한 날에 오늘이 없어도", () => {
    expect(t.candidateDays(["2026-10-25", "2026-10-24", "2026-10-23"], "2026-10-26")).toEqual([
      "2026-10-26",
    ]);
  });

  it("알림 지연 상한은 min(30, ⌊창 분/2⌋)이다 — 창(⌊N/2⌋분)의 절반", () => {
    expect(fastCycleTiming(30).reminderDelayCap).toBe(7);
    expect(fastCycleTiming(10).reminderDelayCap).toBe(2);
    expect(fastCycleTiming(180).reminderDelayCap).toBe(30);
    expect(fastCycleTiming(5).reminderDelayCap).toBe(1);
  });

  it.each([5, 10, 30, 60, 100, 180])(
    "N=%d: 상한만큼 늦춘 알림 시각은 창 안이다 — 누르면 앱 열기 판정이 아직 창 안 (코드 리뷰 I1)",
    (n) => {
      const timing = fastCycleTiming(n);
      const cycle = timing.cycle(at(10, 7));
      const fireAt = new Date(cycle.startMs + timing.reminderDelayCap * 60_000);
      expect(timing.inWindow(fireAt)).toBe(true);
    },
  );

  it("nextCycleStart는 현재 주기의 끝이다", () => {
    expect(t.nextCycleStart(at(10, 20)).getTime()).toBe(at(10, 30).getTime());
    expect(t.nextCycleStart(at(23, 50)).getTime()).toBe(new Date(2026, 9, 27, 0, 0).getTime());
  });

  it("cycle(now)는 cycleOf와 같다", () => {
    expect(t.cycle(at(10, 20))).toEqual(cycleOf(30, at(10, 20)));
  });
});

describe("parsePeriodMinutes (FC7)", () => {
  it.each([
    ["30", 30],
    ["5", 5],
    ["180", 180],
    [" 30 ", 30],
    ["10", 10],
  ])("%j → %d", (text, expected) => {
    expect(parsePeriodMinutes(text)).toBe(expected);
  });

  it.each(["4", "181", "30.5", "3e1", "", " ", "-5", "abc", "0x1e", "１０"])(
    "%j → null",
    (text) => {
      expect(parsePeriodMinutes(text)).toBeNull();
    },
  );
});
