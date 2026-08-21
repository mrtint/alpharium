/**
 * 도구가 「고를 수 있는 하루」를 스스로 정하지 않는다 (FR-005b).
 *
 * 계약: specs/010-synthetic-day-fixture/contracts/seeding.md 「0단계」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **04:00과 「셋」은 저장소에서 `src/config/day-boundary.ts` 한 자리에만 있다.**
 *
 * 002가 04:00을, 009가 `SELECTABLE_DAY_COUNT`를 그 파일에 넣었고 **밖으로 내보내지
 * 않았다.** 도구가 그 값을 다시 세면 두 곳이 생기고, 한쪽만 고쳐지는 날이 온다.
 *
 * **⚠️ 이 검사는 선언을 직접 읽는다.** 009에서 `expect(selectableDays.length).toBe(1)`이
 * 기본값 인자를 세지 않아 위반 주입을 놓친 일이 있었다 — 「검사가 있다」와 「그것이
 * 무엇을 잡는가」는 다르다. 그래서 소스를 `readFileSync`로 읽어 본다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { dayOf, selectableDays } from "../../src/config/day-boundary";
import { planSeeding } from "../../scripts/seed/plan";

const sourceOf = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8");

/** 주석을 걷어낸다 — 설명이 위반으로 잡히면 아무도 설명을 쓰지 않는다(008의 교훈) */
function codeOnly(source: string): string {
  return source
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, ""))
    .filter((line) => !/^\s*\*/.test(line) && !/^\s*\/\*/.test(line))
    .join("\n");
}

describe("도구가 하루 범위를 다시 세지 않는다 (FR-005b)", () => {
  const planSource = codeOnly(sourceOf("scripts", "seed", "plan.ts"));

  it("`selectableDays`를 앱에서 가져온다", () => {
    // `.ts` 확장자가 붙는다 — Node 24의 타입 스트리핑이 ESM 해석에 그것을 요구한다
    expect(planSource).toMatch(/from\s+["'][^"']*config\/day-boundary(\.ts)?["']/);
    expect(planSource).toContain("selectableDays");
  });

  /**
   * **하루의 개수를 도구가 적으면 안 된다.**
   *
   * `slice(0, 3)`이나 `length === 3` 같은 것이 들어오면 009가 한 자리에 모은 값이
   * 둘로 갈린다. 그것을 잡는다.
   */
  it("고를 수 있는 하루의 개수를 직접 적지 않는다", () => {
    expect(planSource).not.toMatch(/\bslice\s*\(\s*0\s*,\s*\d/);
    expect(planSource).not.toMatch(/SELECTABLE_DAY_COUNT\s*=/);
    expect(planSource).not.toMatch(/=\s*3\s*;/);
  });

  /** 04:00도 마찬가지다 — `dayBounds()`에서 받는다 */
  it("04:00 경계를 다시 계산하지 않는다", () => {
    expect(planSource).not.toMatch(/setHours\s*\(/);
    expect(planSource).not.toMatch(/DAY_STARTS_AT_HOUR/);
    expect(planSource).not.toMatch(/\b4\s*\*\s*60\s*\*\s*60/);
  });
});

describe("범위 밖 하루를 심기 전에 거부한다 (FR-005a)", () => {
  // 2026-08-22 10:00 기준으로 고를 수 있는 하루는 [08-21, 08-20, 08-19]
  const now = new Date(2026, 7, 22, 10, 0, 0);
  const days = selectableDays(now);

  it("고를 수 있는 하루는 받아들인다", () => {
    for (const day of days) {
      expect(planSeeding("rich", day, now).ok).toBe(true);
    }
  });

  it("오늘은 거부한다 — 아직 닫히지 않았다", () => {
    const result = planSeeding("rich", dayOf(now), now);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("day-out-of-range");
  });

  it("미래의 하루를 거부한다", () => {
    const result = planSeeding("rich", "2030-01-01", now);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("day-out-of-range");
  });

  it("너무 오래된 하루를 거부한다", () => {
    const result = planSeeding("rich", "2020-01-01", now);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("day-out-of-range");
  });

  /**
   * **거부의 까닭이 에이전트가 다음을 정할 수 있을 만큼 구체적이어야 한다**(FR-019).
   *
   * 「범위 밖」만 말하면 에이전트가 다시 물어야 한다. 고를 수 있는 하루를 함께 주면
   * 바로 고칠 수 있다.
   */
  it("거부할 때 고를 수 있는 하루를 알려준다", () => {
    const result = planSeeding("rich", "2030-01-01", now);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      for (const day of days) expect(result.detail).toContain(day);
    }
  });

  it("모양 이름이 틀리면 다른 갈래로 거부한다", () => {
    const result = planSeeding("없는모양", days[0], now);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unknown-shape");
  });
});

describe("심을 사진이 그 하루 안에 있다", () => {
  const now = new Date(2026, 7, 22, 10, 0, 0);
  const day = selectableDays(now)[0];

  it.each(["rich", "partial-location", "one-place"])(
    "%s의 모든 사진이 그 하루의 구간 안이다",
    (shape) => {
      const result = planSeeding(shape, day, now);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // 04:00 경계를 도구가 아니라 앱이 정한다 — dayOf로 되짚어 확인한다
      for (const photo of result.day.photos) {
        expect(dayOf(new Date(photo.takenAtMs))).toBe(day);
      }
    },
  );
});
