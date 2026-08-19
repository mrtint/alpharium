/**
 * 하루 경계 계약 테스트.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/signals.md 「하루 경계」
 *
 * 이 파일의 표는 계약의 검증 표를 그대로 옮긴 것이다.
 * **00:30→전날, 03:59→전날, 04:00→당일 — 이 세 행이 FR-021의 방어선이다.**
 * 자정 기준과 다른 지점이며, 여기가 무너지면 신호 수집과 일기 생성이 서로 다른 하루를 본다.
 */

import { dayOf, isDayClosed, latestClosedDay } from "../../src/config/day-boundary";

describe("dayOf — 시각이 속한 하루", () => {
  // contracts/signals.md 「dayOf 검증 표」 6행
  const cases: readonly { instant: string; expected: string; why: string }[] = [
    { instant: "2026-08-12T04:00:00", expected: "2026-08-12", why: "경계 시작" },
    { instant: "2026-08-12T12:00:00", expected: "2026-08-12", why: "한낮" },
    { instant: "2026-08-12T23:59:59", expected: "2026-08-12", why: "자정 직전" },
    { instant: "2026-08-13T00:30:00", expected: "2026-08-12", why: "자정을 넘겼지만 전날" },
    { instant: "2026-08-13T03:59:59", expected: "2026-08-12", why: "경계 직전" },
    { instant: "2026-08-13T04:00:00", expected: "2026-08-13", why: "새 하루" },
  ];

  it.each(cases)("$instant → $expected ($why)", ({ instant, expected }) => {
    expect(dayOf(new Date(instant))).toBe(expected);
  });

  it("자정 직후는 전날이다 — 자정 기준과 다른 지점 (FR-021)", () => {
    // 이 단언이 FR-021의 방어선이다. 자정으로 자르면 여기가 깨진다.
    expect(dayOf(new Date("2026-08-13T00:30:00"))).toBe("2026-08-12");
    expect(dayOf(new Date("2026-08-13T00:00:00"))).toBe("2026-08-12");
  });

  it("03:59:59는 전날이고 04:00:00은 당일이다 — 1초 사이에 하루가 바뀐다", () => {
    expect(dayOf(new Date("2026-08-13T03:59:59"))).toBe("2026-08-12");
    expect(dayOf(new Date("2026-08-13T04:00:00"))).toBe("2026-08-13");
  });

  it("월 경계를 넘어도 전날로 되돌아간다", () => {
    expect(dayOf(new Date("2026-09-01T02:00:00"))).toBe("2026-08-31");
  });

  it("연 경계를 넘어도 전날로 되돌아간다", () => {
    expect(dayOf(new Date("2027-01-01T01:00:00"))).toBe("2026-12-31");
  });
});

describe("isDayClosed — 하루가 닫혔는가", () => {
  // contracts/signals.md 「isDayClosed 검증 표」 4행
  const cases: readonly { day: string; now: string; expected: boolean; why: string }[] = [
    { day: "2026-08-12", now: "2026-08-13T03:59:00", expected: false, why: "아직 안 닫힘" },
    { day: "2026-08-12", now: "2026-08-13T04:00:00", expected: true, why: "닫힘" },
    { day: "2026-08-12", now: "2026-08-12T12:00:00", expected: false, why: "진행 중인 하루" },
    { day: "2026-08-11", now: "2026-08-13T12:00:00", expected: true, why: "지난 하루" },
  ];

  it.each(cases)("$day @ $now → $expected ($why)", ({ day, now, expected }) => {
    expect(isDayClosed(day, new Date(now))).toBe(expected);
  });

  it("닫히는 순간은 다음 날 04:00 정각이다", () => {
    expect(isDayClosed("2026-08-12", new Date("2026-08-13T03:59:59"))).toBe(false);
    expect(isDayClosed("2026-08-12", new Date("2026-08-13T04:00:00"))).toBe(true);
  });
});

describe("현재 시각을 스스로 읽지 않는다", () => {
  /**
   * 두 함수 모두 "지금"을 인자로 받는다. 함수 안에서 new Date()를 부르면 위의
   * 경계값 테스트가 불가능해진다 (research.md §4).
   */
  it("dayOf는 인자로 받은 시각만 본다 — 같은 입력에 같은 출력", () => {
    const instant = new Date("2026-08-13T00:30:00");
    expect(dayOf(instant)).toBe(dayOf(instant));
    expect(dayOf(instant)).toBe("2026-08-12");
  });

  it("isDayClosed는 인자로 받은 now만 본다", () => {
    const now = new Date("2026-08-13T04:00:00");
    expect(isDayClosed("2026-08-12", now)).toBe(true);
    expect(isDayClosed("2026-08-13", now)).toBe(false);
  });
});

/**
 * 006 FR-030 — **일기를 쓸 수 있는 가장 최근의 하루.**
 *
 * `dayOf(now)`는 오늘이고 오늘은 정의상 닫히지 않았으므로, 그것을 파이프라인에 넘기면
 * 언제나 `day-not-closed`로 멈춘다. 이 계산이 `dayOf`와 같은 파일에 있어야 04:00
 * 경계가 새어 나가지 않는다(FR-021a).
 */
describe("latestClosedDay (006 FR-030)", () => {
  it("낮에 부르면 어제가 나온다", () => {
    expect(latestClosedDay(new Date("2026-08-17T14:00:00"))).toBe("2026-08-16");
  });

  it("04:00 직후에 부르면 어제가 나온다 — 그때 어제가 막 닫혔다", () => {
    expect(latestClosedDay(new Date("2026-08-17T04:00:00"))).toBe("2026-08-16");
  });

  it("03:59에 부르면 그저께가 나온다 — 아직 어제가 닫히지 않았다", () => {
    // 03:59는 아직 8/16이므로 마지막으로 닫힌 하루는 8/15다.
    expect(latestClosedDay(new Date("2026-08-17T03:59:00"))).toBe("2026-08-15");
  });

  it("결과는 언제나 닫힌 하루다", () => {
    const instants = [
      "2026-08-17T00:30:00",
      "2026-08-17T04:00:00",
      "2026-08-17T12:00:00",
      "2026-08-17T23:59:00",
      "2026-03-01T05:00:00",
      "2026-01-01T02:00:00",
    ];

    for (const iso of instants) {
      const now = new Date(iso);
      expect(isDayClosed(latestClosedDay(now), now)).toBe(true);
    }
  });

  it("월·연 경계를 넘는다", () => {
    expect(latestClosedDay(new Date("2026-03-01T12:00:00"))).toBe("2026-02-28");
    expect(latestClosedDay(new Date("2026-01-01T12:00:00"))).toBe("2025-12-31");
  });
});
