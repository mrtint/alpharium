/**
 * 132 — 쓰는 중 안내가 이어 하기 가능 여부를 본다 (contracts/lock-rules.md LN1~LN3, 규칙 문서 K11·R7).
 *
 * 앱 최소 iOS는 16.4인데 이어 하기는 iOS 26 이상에서만 신청된다(`#available(iOS 26)`). 모르면 말하지 않는다(원칙 V).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { continuedAvailableFor, writingLeaveNote } from "../../src/app/leave-note";

describe("LN1 — writingLeaveNote", () => {
  it("iOS·가능일 때만 한 줄이 있다", () => {
    expect(writingLeaveNote("ios", true)).toBe("앱을 나가도 계속 써요.");
    expect(writingLeaveNote("ios", false)).toBeUndefined();
    expect(writingLeaveNote("ios", undefined)).toBeUndefined();
    expect(writingLeaveNote("android", true)).toBeUndefined();
    expect(writingLeaveNote("android", undefined)).toBeUndefined();
  });
});

describe("LN2 — continuedAvailableFor", () => {
  it.each([
    ["26", true],
    ["26.0.1", true],
    ["27.0.1", true],
    [27, true],
    ["25.4", false],
    ["16.4", false],
  ] as const)("iOS %p → %p", (version, expected) => {
    expect(continuedAvailableFor("ios", version)).toBe(expected);
  });

  it("버전을 못 읽으면 모름", () => {
    expect(continuedAvailableFor("ios", undefined)).toBeUndefined();
    expect(continuedAvailableFor("ios", "")).toBeUndefined();
    expect(continuedAvailableFor("ios", "abc")).toBeUndefined();
  });

  it("안드로이드는 불가", () => {
    expect(continuedAvailableFor("android", 36)).toBe(false);
  });
});

describe("LN3 — 조립부는 가능 여부를 넘긴다", () => {
  it("App.tsx의 writingLeaveNote 호출은 인자가 둘이고 continuedAvailableFor를 쓴다", () => {
    const src = readFileSync(join(__dirname, "../../App.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    // 호출 하나를 괄호 깊이로 잘라 낸다(인자 안에 중첩 호출이 있다)
    const calls: string[] = [];
    for (
      let i = src.indexOf("writingLeaveNote(");
      i !== -1;
      i = src.indexOf("writingLeaveNote(", i + 1)
    ) {
      let depth = 0;
      let j = i + "writingLeaveNote".length;
      do {
        if (src[j] === "(") depth += 1;
        else if (src[j] === ")") depth -= 1;
        j += 1;
      } while (depth > 0 && j < src.length);
      calls.push(src.slice(i, j));
    }
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) expect(call).toMatch(/,\s*continuedAvailableFor\(/);
  });
});
