/**
 * DaySignals 계약 테스트.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/signals.md 「DaySignals 검증 표」
 *
 * **빈 하루는 오류가 아니다(FR-005b).** 휴대폰이 아무것도 보지 못한 것 자체가 일기의
 * 내용이 된다(헌법 원칙 II). 이 파일이 그것을 지킨다.
 */

import { emptyDay, partiallyUnknownDay, richDay, unknownDay } from "../../src/signals/fake";
import type { DaySignals } from "../../src/signals/types";

/** 하루의 신호를 모두 모아 순회한다. date는 신호가 아니므로 뺀다. */
function signalsOf(day: DaySignals) {
  const { date: _date, ...signals } = day;
  return Object.values(signals);
}

describe("DaySignals — 하루치 신호의 묶음", () => {
  // contracts/signals.md 「검증 표」 4행
  it("모든 신호가 unknown인 하루도 유효하다 (FR-005b)", () => {
    const day = unknownDay("2026-08-12");

    expect(day.date).toBe("2026-08-12");
    expect(signalsOf(day).every((s) => s.kind === "unknown")).toBe(true);
  });

  it("모든 신호가 none인 하루도 유효하다 (FR-005b)", () => {
    const day = emptyDay("2026-08-12");

    expect(day.date).toBe("2026-08-12");
    expect(signalsOf(day).every((s) => s.kind === "none")).toBe(true);
  });

  it("신호가 적어도 하루는 성립한다 — 양으로 거부하지 않는다 (FR-005a)", () => {
    // 집에만 있던 하루. 신호가 거의 없지만 이것도 하루다.
    const day = emptyDay("2026-08-12");

    expect(day).toBeDefined();
    expect(day.date).toBe("2026-08-12");
  });

  it("date가 있어야 하루가 성립한다 (FR-004)", () => {
    const day = richDay("2026-08-12");

    expect(day.date).toBe("2026-08-12");
    expect(typeof day.date).toBe("string");
  });

  it("다섯 신호 자리가 모두 있다 — 하나도 빠지지 않는다 (FR-001)", () => {
    const day = richDay("2026-08-12");

    expect(Object.keys(day).sort()).toEqual([
      "battery",
      "connectivity",
      "date",
      "photos",
      "places",
      "steps",
    ]);
  });
});

describe("가짜 신호 — 여러 모양을 만들 수 있다", () => {
  /**
   * 한 가지 모양만 있으면 경계 사례를 테스트할 수 없다(contracts/signals.md).
   */
  it("풍성한 하루는 관측된 신호를 갖는다", () => {
    const day = richDay("2026-08-12");

    expect(day.photos.kind).toBe("known");
    expect(day.places.kind).toBe("known");
  });

  it("일부만 unknown인 하루를 만들 수 있다", () => {
    const day = partiallyUnknownDay("2026-08-12");
    const kinds = signalsOf(day).map((s) => s.kind);

    expect(kinds).toContain("unknown");
    expect(kinds).toContain("known");
  });

  it("풍성한 하루에도 걸음 수는 unknown이다 — 안드로이드의 실제 제약", () => {
    // AGENTS.md 실측: 안드로이드에 기간 걸음 수 조회 통로가 없다.
    // 가짜 신호가 이 사실을 지우면 테스트가 현실과 어긋난다.
    const day = richDay("2026-08-12");

    expect(day.steps.kind).toBe("unknown");
  });

  it("네 모양 모두 같은 date를 그대로 쓴다", () => {
    for (const make of [richDay, emptyDay, unknownDay, partiallyUnknownDay]) {
      expect(make("2026-08-13").date).toBe("2026-08-13");
    }
  });
});
