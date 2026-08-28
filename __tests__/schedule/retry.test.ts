import { readFileSync } from "node:fs";
import { join } from "node:path";

import { pickRetryDay } from "../../src/schedule/retry";

/**
 * 재시도 대상 선정의 계약 테스트.
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/schedule-decision.md
 *       D5·D6
 *       spec.md FR-013, spec Clarifications(재시도 대상)
 *
 * **009 범위 밖은 자동으로 제외된다** — `selectableDays`가 애초에 마지막
 * 닫힌 하루 + 그 앞 둘(또는 정오 이후엔 오늘 포함 셋)만 주므로, 이 함수가
 * 그 배열만 보면 그그제보다 오래된 날은 후보가 될 수 없다. 이 함수는
 * 04:00·3일을 다시 계산하지 않는다(FR-021a).
 */

describe("pickRetryDay — 가장 최근 미완성 1개 (D5)", () => {
  it("전부 비었으면 가장 최근(사전순 최대)을 고른다", () => {
    expect(pickRetryDay(["2026-08-27", "2026-08-26", "2026-08-25"], [])).toBe("2026-08-27");
  });

  it("가장 최근이 이미 있으면 그다음 최근 미완성을 고른다", () => {
    expect(pickRetryDay(["2026-08-27", "2026-08-26", "2026-08-25"], ["2026-08-27"])).toBe(
      "2026-08-26",
    );
  });

  it("중간만 비어 있으면 그것을 고른다", () => {
    expect(
      pickRetryDay(["2026-08-27", "2026-08-26", "2026-08-25"], ["2026-08-27", "2026-08-25"]),
    ).toBe("2026-08-26");
  });

  it("전부 있으면 null", () => {
    expect(
      pickRetryDay(
        ["2026-08-27", "2026-08-26", "2026-08-25"],
        ["2026-08-27", "2026-08-26", "2026-08-25"],
      ),
    ).toBeNull();
  });

  it("selectableDays가 비어 있으면 null", () => {
    expect(pickRetryDay([], ["2026-08-27"])).toBeNull();
  });

  it("입력 순서와 무관하게 사전순 최대를 고른다", () => {
    expect(pickRetryDay(["2026-08-25", "2026-08-27", "2026-08-26"], [])).toBe("2026-08-27");
  });
});

/**
 * ★ 결과는 항상 selectableDays의 원소이거나 null (D5·D6).
 * 009 범위 밖 날짜가 후보가 될 수 없다.
 */
describe("009 범위 밖은 후보가 못 된다 (D6, 위반 주입)", () => {
  it("existingDiaryDays에 범위 밖 오래된 날짜가 없어도 결과가 안 바뀐다", () => {
    const selectable = ["2026-08-27", "2026-08-26", "2026-08-25"];
    // 그그제보다 오래된 2026-08-01은 selectableDays에 없으므로,
    // 그것이 비었든 아니든 결과에 영향을 주지 않는다.
    const withOld = pickRetryDay(selectable, ["2026-08-27", "2026-08-26"]);
    const withoutOld = pickRetryDay(selectable, ["2026-08-27", "2026-08-26", "2026-08-01"]);
    expect(withOld).toBe("2026-08-25");
    expect(withoutOld).toBe("2026-08-25");
  });

  it("결과는 언제나 selectableDays 안에 있거나 null", () => {
    const cases: [readonly string[], readonly string[]][] = [
      [["2026-08-27", "2026-08-26"], []],
      [["2026-08-27", "2026-08-26"], ["2026-08-27"]],
      [["2026-08-27"], ["2026-08-27"]],
      [[], []],
    ];
    for (const [selectable, existing] of cases) {
      const result = pickRetryDay(selectable, existing);
      expect(result === null || selectable.includes(result)).toBe(true);
    }
  });
});

describe("소스 검사 — 04:00·3일을 다시 계산하지 않는다 (D5, FR-021a)", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/schedule/retry.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    // 타입 전용 import는 계산이 아니다 — DayDate를 `import type`으로 받는 것은 허용.
    .replace(/import\s+type\s+\{[^}]*\}\s+from\s+["'][^"']*["'];?/g, "");

  it("day-boundary의 계산 함수를 호출하지 않는다 — 입력 배열만 본다", () => {
    expect(CODE).not.toMatch(/latestClosedDay\(|selectableDays\(|dayBounds\(|dayOf\(/);
  });

  it("new Date()·setDate·setHours를 쓰지 않는다 — 날짜 산술 없음", () => {
    expect(CODE).not.toMatch(/new Date\(|setDate|setHours|getHours/);
  });
});
