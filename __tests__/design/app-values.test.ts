/**
 * 089 — 앱 토큰 값 불변 (FR-003·SC-005).
 *
 * 스냅샷(`fixtures/app-tokens-before.json`)은 생성 영역을 넣기 **전의** `tokens.ts`에서 뽑은 값이다.
 * 정본·생성기를 거친 뒤에도 앱이 쓰는 색·반경·글자·서체가 한 글자도 달라지지 않았음을 본다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { COLORS, FONT, RADIUS, TYPE } from "../../src/ui/theme/tokens";

const before = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "app-tokens-before.json"), "utf8"),
);

describe("089 앱 토큰 값 불변", () => {
  it("COLORS", () => {
    expect(COLORS).toEqual(before.COLORS);
  });

  it("RADIUS", () => {
    expect(RADIUS).toEqual(before.RADIUS);
  });

  it("TYPE — 여섯 역할, 웹 전용 역할이 새어 들어오지 않는다", () => {
    expect(TYPE).toEqual(before.TYPE);
    expect(Object.keys(TYPE)).toHaveLength(6);
  });

  it("FONT", () => {
    expect(FONT).toEqual(before.FONT);
  });

  it("스냅샷이 기대한 모양이다(비어 있지 않다)", () => {
    expect(Object.keys(before.COLORS)).toHaveLength(9);
    expect(Object.keys(before.TYPE)).toHaveLength(6);
    expect(before.FONT.weights).toEqual(["400", "500", "600", "700", "800"]);
  });
});
