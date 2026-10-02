/**
 * 059 — 버전 연속 탭 판정 (계약 TP1~TP7).
 *
 * 판정은 「지금」을 인자로 받는 순수 함수다(`day-boundary.ts` 관례) — 기기·타이머 없이 1초 경계를 잠근다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  INITIAL_TAP_STATE,
  TAP_WINDOW_MS,
  registerTap,
  type TapState,
} from "../../src/app/developer-taps";

/** now 를 늘려 가며 n 번 누른다 — 마지막 결과를 준다 */
function tapN(n: number, gap: number, alreadyOn = false, start = 1000) {
  let state: TapState = INITIAL_TAP_STATE;
  let now = start;
  let last = registerTap(state, now, alreadyOn);
  state = last.state;
  for (let i = 1; i < n; i += 1) {
    now += gap;
    last = registerTap(state, now, alreadyOn);
    state = last.state;
  }
  return last;
}

describe("TP1·TP7 — 첫 탭", () => {
  it("첫 탭은 count 1, effect none 이다(lastAt null 은 간격 판정 없음)", () => {
    const r = registerTap(INITIAL_TAP_STATE, 5_000, false);
    expect(r.state).toEqual({ count: 1, lastAt: 5_000 });
    expect(r.effect).toEqual({ kind: "none" });
  });

  it("1~3번째 탭은 모두 none 이다", () => {
    for (let n = 1; n <= 3; n += 1) expect(tapN(n, 300).effect).toEqual({ kind: "none" });
  });
});

describe("TP2 — 1초 경계", () => {
  it("1000ms 이하는 이어 센다", () => {
    expect(TAP_WINDOW_MS).toBe(1000);
    const a = registerTap(INITIAL_TAP_STATE, 0, false);
    const b = registerTap(a.state, 1000, false);
    expect(b.state.count).toBe(2);
  });

  it("1001ms 면 그 탭이 1번째다", () => {
    const a = registerTap({ count: 3, lastAt: 0 }, 1001, false);
    expect(a.state).toEqual({ count: 1, lastAt: 1001 });
    expect(a.effect).toEqual({ kind: "none" });
  });
});

describe("TP3 — 남은 횟수", () => {
  it("4·5·6번째 탭은 tapsLeft 3/2/1 이다", () => {
    expect(tapN(4, 200).effect).toEqual({ kind: "tapsLeft", n: 3 });
    expect(tapN(5, 200).effect).toEqual({ kind: "tapsLeft", n: 2 });
    expect(tapN(6, 200).effect).toEqual({ kind: "tapsLeft", n: 1 });
  });
});

describe("TP4·TP5 — 7번째 탭", () => {
  it("alreadyOn=false 면 enabled, 횟수를 0으로 되돌린다", () => {
    const r = tapN(7, 200);
    expect(r.effect).toEqual({ kind: "enabled" });
    expect(r.state.count).toBe(0);
  });

  it("alreadyOn=true 면 already-on 이다", () => {
    const r = tapN(7, 200, true);
    expect(r.effect).toEqual({ kind: "already-on" });
    expect(r.state.count).toBe(0);
  });

  it("alreadyOn=true 면 4~6번째 탭은 none 이다", () => {
    for (const n of [4, 5, 6]) expect(tapN(n, 200, true).effect).toEqual({ kind: "none" });
  });
});

describe("TP6 — now 는 인자다", () => {
  it("소스에 new Date( · Date.now( 가 없다", () => {
    const source = readFileSync(join(__dirname, "../../src/app/developer-taps.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source).not.toMatch(/new Date\(/);
    expect(source).not.toMatch(/Date\.now\(/);
  });
});
