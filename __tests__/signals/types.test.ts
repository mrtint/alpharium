/**
 * 012 — 축 제외 상수 `USER_VISIBLE_SIGNAL_AXES`.
 *
 * 계약: specs/012-today-diary/contracts/signal-visibility.md §1 「축 제외」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **사람이 적은 상수임을 확인한다**(FR-010, MUST NOT — 코드가 판정하지 않는다).
 * 값을 보고 그때그때 판단하는 코드가 아니라 리터럴이어야 한다 — 그래서 소스를
 * 직접 읽어 확인한다(008의 "주석을 걷어내고 검사한다" 방식).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { USER_VISIBLE_SIGNAL_AXES } from "../../src/signals/types";

describe("USER_VISIBLE_SIGNAL_AXES (contracts/signal-visibility.md §1)", () => {
  it("photos·places는 true다 — 실제로 수집한다", () => {
    expect(USER_VISIBLE_SIGNAL_AXES.photos).toBe(true);
    expect(USER_VISIBLE_SIGNAL_AXES.places).toBe(true);
  });

  it("S1 — steps는 false다 (FR-006, 안드로이드가 기간 걸음 수를 안 준다)", () => {
    expect(USER_VISIBLE_SIGNAL_AXES.steps).toBe(false);
  });

  it("S2 — battery·connectivity는 false다 (FR-007, 기록 계층이 없다)", () => {
    expect(USER_VISIBLE_SIGNAL_AXES.battery).toBe(false);
    expect(USER_VISIBLE_SIGNAL_AXES.connectivity).toBe(false);
  });

  it("사람이 적은 리터럴 값이다 — 소스에 조건문·값 판정이 없다", () => {
    const source = readFileSync(join(__dirname, "..", "..", "src", "signals", "types.ts"), "utf8");
    const declaration = source.match(
      /USER_VISIBLE_SIGNAL_AXES[\s\S]*?=\s*\{[\s\S]*?\}\s*(?:as const)?/,
    );

    expect(declaration).not.toBeNull();
    // 값을 보고 판정하는 코드(kind === "unknown" 같은 것)가 선언 안에 없어야 한다.
    expect(declaration?.[0]).not.toMatch(/signal\.kind|\.kind\s*===/);
  });
});
