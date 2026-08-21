/**
 * 하루 경계 계약 테스트.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/signals.md 「하루 경계」
 *
 * 이 파일의 표는 계약의 검증 표를 그대로 옮긴 것이다.
 * **00:30→전날, 03:59→전날, 04:00→당일 — 이 세 행이 FR-021의 방어선이다.**
 * 자정 기준과 다른 지점이며, 여기가 무너지면 신호 수집과 일기 생성이 서로 다른 하루를 본다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { dayOf, isDayClosed, latestClosedDay, selectableDays } from "../../src/config/day-boundary";

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

/**
 * 009 FR-001~005 — **고를 수 있는 하루들.**
 *
 * 계약: specs/009-past-day-diary/contracts/write-prompt.md §1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 계산이 여기 있어야 하는 이유는 `latestClosedDay()`와 같다.**
 *
 * 「사흘」을 구하려면 하루씩 빼야 하고 하루의 시작은 04:00이다. 부르는 쪽에서
 * `setDate(-1)`을 하면 **04:00이 이 파일 밖으로 새어 나간다**(FR-004).
 *
 * **범위의 크기도 마찬가지다**(FR-003). 화면도 테스트도 3을 직접 적지 않고
 * `selectableDays()`가 돌려준 것의 길이로 안다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("selectableDays (009 §1 검증 표)", () => {
  // contracts/write-prompt.md §1 「검증 표」 6행
  const cases: readonly { now: string; expected: readonly string[]; why: string }[] = [
    {
      now: "2026-08-21T14:00:00",
      expected: ["2026-08-20", "2026-08-19", "2026-08-18"],
      why: "한낮",
    },
    {
      now: "2026-08-21T04:00:00",
      expected: ["2026-08-20", "2026-08-19", "2026-08-18"],
      why: "경계 직후 — 어제가 막 닫혔다",
    },
    {
      now: "2026-08-21T03:59:00",
      expected: ["2026-08-19", "2026-08-18", "2026-08-17"],
      why: "★ 경계 직전 — 셋이 통째로 하루 밀린다",
    },
    {
      now: "2026-03-01T12:00:00",
      expected: ["2026-02-28", "2026-02-27", "2026-02-26"],
      why: "월넘김",
    },
    {
      now: "2026-01-01T12:00:00",
      expected: ["2025-12-31", "2025-12-30", "2025-12-29"],
      why: "연넘김",
    },
    {
      now: "2026-03-02T12:00:00",
      expected: ["2026-03-01", "2026-02-28", "2026-02-27"],
      why: "월 경계를 걸친다",
    },
  ];

  it.each(cases)("$now → $why", ({ now, expected }) => {
    expect(selectableDays(new Date(now))).toEqual(expected);
  });

  /**
   * **★ 2번과 3번 행의 차이가 이 표의 핵심이다.**
   *
   * 1분 차이로 세 개가 통째로 밀린다 — 04:00이 정의처에서 오는 것을 확인하는 자리다.
   * 여기가 무너지면 화면이 「아직 닫히지 않은 하루」를 고르게 하고, 파이프라인은
   * `day-not-closed`로 멈춰 사용자가 막다른 길에 선다.
   */
  it("★ 04:00 경계에서 셋이 통째로 밀린다", () => {
    const before = selectableDays(new Date("2026-08-21T03:59:00"));
    const after = selectableDays(new Date("2026-08-21T04:00:00"));

    expect(before).not.toEqual(after);
    // 1분 뒤의 첫째가 1분 전의 첫째보다 하루 뒤다.
    expect(after[0]).toBe("2026-08-20");
    expect(before[0]).toBe("2026-08-19");
  });

  /* ───────────────────── 불변식 D1~D5 (계약 §1) ───────────────────── */

  const instants = [
    "2026-08-21T14:00:00",
    "2026-08-21T04:00:00",
    "2026-08-21T03:59:00",
    "2026-08-21T00:30:00",
    "2026-03-01T05:00:00",
    "2026-01-01T02:00:00",
    "2026-02-28T23:59:00",
  ];

  /**
   * **D1 — 006·007이 쓰는 값과 어긋나지 않는다.**
   *
   * `latestClosedDay()`를 지우지 않는 이유가 이것이다(T007). 둘이 갈리면 쓰기 자리가
   * 보여주는 기본값과 실제로 쓰이는 하루가 달라진다.
   */
  it("D1 — 첫째는 latestClosedDay와 같다", () => {
    for (const iso of instants) {
      const now = new Date(iso);
      expect(selectableDays(now)[0]).toBe(latestClosedDay(now));
    }
  });

  it("D2 — 언제나 셋이다 (FR-001)", () => {
    for (const iso of instants) {
      expect(selectableDays(new Date(iso))).toHaveLength(3);
    }
  });

  /**
   * **★ D3이 FR-002의 방어다.** 오늘이 섞이면 그것을 고른 사용자는 파이프라인의
   * `day-not-closed`에 막혀 아무것도 할 수 없다 — 화면이 고를 수 없는 것을 내민 셈이다.
   */
  it("★ D3 — 모든 원소가 닫힌 하루다 (FR-002 — 오늘이 섞이지 않는다)", () => {
    for (const iso of instants) {
      const now = new Date(iso);
      for (const day of selectableDays(now)) {
        expect(isDayClosed(day, now)).toBe(true);
      }
      // 오늘은 정의상 닫히지 않았으므로 목록에 없다.
      expect(selectableDays(now)).not.toContain(dayOf(now));
    }
  });

  it("D4 — 내림차순이며 하루씩 연속한다", () => {
    for (const iso of instants) {
      const days = selectableDays(new Date(iso));

      for (let i = 1; i < days.length; i += 1) {
        expect(days[i] < days[i - 1]).toBe(true);

        // 하루씩 이어지는지는 다음 날을 계산해 확인한다 — 04:00을 여기서 다시
        // 계산하지 않으려고 dayBounds가 아니라 문자열 비교로 본다.
        const [y, m, d] = days[i].split("-").map(Number);
        const next = new Date(y, m - 1, d + 1);
        const expected = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
        expect(expected).toBe(days[i - 1]);
      }
    }
  });

  it("D5 — 원소가 중복되지 않는다", () => {
    for (const iso of instants) {
      const days = selectableDays(new Date(iso));
      expect(new Set(days).size).toBe(days.length);
    }
  });

  /**
   * **「지금」을 인자로 받는다**(FR-005). 안에서 `new Date()`를 부르면 위의 3번 행을
   * 검증할 수 없다 — 03:59를 만들어 낼 방법이 없어진다.
   */
  it("인자로 받은 now만 본다 (FR-005)", () => {
    const a = selectableDays(new Date("2026-08-21T14:00:00"));
    const b = selectableDays(new Date("2026-08-21T14:00:00"));
    expect(a).toEqual(b);
    expect(a).not.toEqual(selectableDays(new Date("2026-08-22T14:00:00")));
  });

  /**
   * **범위 크기를 인자로 받지 않는다**(FR-003).
   *
   * 받으면 부르는 쪽이 3을 알게 되고 **그 순간 값이 두 곳에 생긴다.** 004가
   * `dayBounds()`에 04:00을 넘기지 않는 것과 같은 판단이다.
   */
  it("★ 인자가 하나뿐이다 — 범위 크기를 밖에서 정하지 않는다 (FR-003)", () => {
    expect(selectableDays.length).toBe(1);
  });

  /**
   * **★ `Function.length`만으로는 부족하다** (2026-08-21, 위반 주입으로 확인).
   *
   * ─────────────────────────────────────────────────────────────────────────
   * `selectableDays(now, count = 3)`으로 고쳐도 **`length`는 여전히 1이다** —
   * 기본값이 있는 인자는 세지 않기 때문이다. 그러면 부르는 쪽이 `selectableDays(now, 7)`로
   * **범위를 마음대로 늘릴 수 있고**, 그 순간 값이 두 곳에 생긴다(FR-003).
   *
   * 007이 「타입 위반을 `npm test`가 놓치고 `tsc`만 잡았다」고 남긴 것과 **같은 종류의
   * 구멍**이다 — 검사가 있다는 것과 그것이 무엇을 잡는지는 다르다.
   *
   * 그래서 **선언을 직접 읽는다.**
   * ─────────────────────────────────────────────────────────────────────────
   */
  it("★ 선언에 둘째 인자가 없다 — 기본값으로도 열어 두지 않는다 (FR-003)", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "src", "config", "day-boundary.ts"),
      "utf8",
    );
    const declaration = source.match(/export function selectableDays\([^)]*\)/);

    expect(declaration).not.toBeNull();
    expect(declaration?.[0]).toBe("export function selectableDays(now: Date)");
  });

  /**
   * **범위 크기가 이 파일 밖으로 나가지 않는다**(FR-003).
   *
   * `SELECTABLE_DAY_COUNT`를 export 하면 화면이 그것을 읽어 「셋을 그린다」고 쓸 수
   * 있게 되고, **그러면 값이 두 곳에 생긴다** — `DAY_STARTS_AT_HOUR`가 export 되지
   * 않은 것과 같은 이유다.
   */
  it("★ 범위 크기 상수를 밖으로 내보내지 않는다 (FR-003)", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "src", "config", "day-boundary.ts"),
      "utf8",
    );

    expect(source).toContain("const SELECTABLE_DAY_COUNT");
    expect(source).not.toContain("export const SELECTABLE_DAY_COUNT");
  });
});
