/**
 * 089 — 대비 쌍 (FR-006·SC-002). 쌍 표는 정본에 사람이 적은 것이고, 이 테스트는 그 쌍을 라이트·다크에서 계산한다.
 * 계산은 앱 토큰 파일의 `contrastRatio`를 그대로 쓴다(두 곳에서 같은 식을 구현하지 않는다).
 */

import { contrastRatio } from "../../src/ui/theme/tokens";
import { loadTokens } from "./helpers";

type Mode = "light" | "dark";

const tokens = loadTokens();

function modesOf(mode: "light" | "dark" | "both"): Mode[] {
  return mode === "both" ? ["light", "dark"] : [mode];
}

describe("089 contrast — 라이트·다크 대비 쌍", () => {
  const cases = tokens.contrast.flatMap((p) =>
    modesOf(p.mode).map((m) => ({ ...p, m, label: `${p.fg}/${p.bg} (${m}) ≥ ${p.min}` })),
  );

  it("쌍 표가 비어 있지 않다", () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  it.each(cases)("$label", ({ fg, bg, m, min }) => {
    const ratio = contrastRatio(tokens.color.items[fg][m], tokens.color.items[bg][m]);
    expect(ratio).toBeGreaterThanOrEqual(min);
  });

  it("본문 글자 쌍(text·textMuted·danger × bg·surface)이 라이트·다크 모두 표에 있다 — 빠지면 대비가 조용히 검사되지 않는다", () => {
    for (const fg of ["text", "textMuted", "danger"]) {
      for (const bg of ["bg", "surface"]) {
        for (const m of ["light", "dark"] as Mode[]) {
          const found = cases.some((c) => c.fg === fg && c.bg === bg && c.m === m && c.min === 4.5);
          expect({ fg, bg, m, found }).toEqual({ fg, bg, m, found: true });
        }
      }
    }
  });

  it("면 위 글자(accentForeground/accent·dangerForeground/danger)가 표에 있다", () => {
    for (const [fg, bg] of [
      ["accentForeground", "accent"],
      ["dangerForeground", "danger"],
    ]) {
      expect(cases.some((c) => c.fg === fg && c.bg === bg)).toBe(true);
    }
  });

  it("min 3인 쌍은 라이트 accentForeground/accent 하나뿐이다(043 소유자 결정) — 다른 쌍이 느슨해지지 않게", () => {
    const lax = cases.filter((c) => c.min === 3);
    expect(lax.map((c) => `${c.fg}/${c.bg}/${c.m}`)).toEqual(["accentForeground/accent/light"]);
  });
});
