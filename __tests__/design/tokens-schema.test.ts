/**
 * 089 — 토큰 정본 모양 (contracts/tokens-json.md C1~C9, data-model V1~V8).
 *
 * 정본이 규칙을 어기면 생성기는 아무것도 쓰지 않고 실패한다. 이 테스트는 (1) 실제 정본이 규칙을 지키는지,
 * (2) `validateTokens`가 위반을 실제로 거부하는지(위반 주입)를 함께 본다.
 */

import { validateTokens } from "../../scripts/design/tokens-build";
import { clone, loadTokens } from "./helpers";

const COLOR_ROLES = [
  "bg",
  "surface",
  "border",
  "text",
  "textMuted",
  "accent",
  "accentForeground",
  "danger",
  "dangerForeground",
];
const APP_TYPE_ROLES = ["title", "sectionTitle", "body", "bodyStrong", "caption", "button"];

describe("089 tokens.json — 정본 규칙", () => {
  const tokens = loadTokens();

  it("C1 — 최상위 키는 정해진 일곱뿐이다", () => {
    expect(Object.keys(tokens).sort()).toEqual(
      ["color", "contrast", "font", "radius", "space", "type", "version"].sort(),
    );
  });

  it("C2/V1/V2 — 색 역할은 정확히 아홉이고 라이트·다크 모두 #rrggbb 소문자다", () => {
    expect(Object.keys(tokens.color.items).sort()).toEqual([...COLOR_ROLES].sort());
    for (const [role, v] of Object.entries(tokens.color.items)) {
      expect({ role, light: v.light }).toEqual({
        role,
        light: expect.stringMatching(/^#[0-9a-f]{6}$/),
      });
      expect({ role, dark: v.dark }).toEqual({
        role,
        dark: expect.stringMatching(/^#[0-9a-f]{6}$/),
      });
    }
  });

  it("C3 — 반경은 card·pill·control, 0 이상의 정수", () => {
    expect(Object.keys(tokens.radius.items).sort()).toEqual(["card", "control", "pill"]);
    for (const v of Object.values(tokens.radius.items)) {
      expect(Number.isInteger(v.value) && v.value >= 0).toBe(true);
    }
  });

  it("C4/V3/V4 — 앱 공용 글자 역할은 정확히 여섯이고 굵기는 font.weights 안이다", () => {
    const app = Object.entries(tokens.type.items).filter(([, v]) => v.platforms === undefined);
    expect(app.map(([k]) => k).sort()).toEqual([...APP_TYPE_ROLES].sort());
    for (const [, v] of Object.entries(tokens.type.items)) {
      expect(tokens.font.weights).toContain(v.weight);
    }
    const webOnly = Object.entries(tokens.type.items).filter(([, v]) => v.platforms !== undefined);
    for (const [, v] of webOnly) expect(v.platforms).toEqual(["web"]);
  });

  it("C5/V7 — webWeights는 weights의 부분집합이고 서체 이름이 있다", () => {
    for (const w of tokens.font.webWeights) expect(tokens.font.weights).toContain(w);
    expect(tokens.font.family).toBe("Pretendard");
    expect(tokens.font.fallback[tokens.font.fallback.length - 1]).toBe("sans-serif");
  });

  it("C6/V5 — 간격 단계는 양의 정수의 증가 목록이다", () => {
    const steps = tokens.space.steps;
    expect(steps.length).toBeGreaterThan(0);
    for (const s of steps) expect(Number.isInteger(s) && s > 0).toBe(true);
    expect([...steps].sort((a, b) => a - b)).toEqual(steps);
    expect(new Set(steps).size).toBe(steps.length);
  });

  it("C7 — 대비 쌍은 정본 색 역할을 가리키고 min은 3 또는 4.5, 3이면 이유가 있다", () => {
    expect(tokens.contrast.length).toBeGreaterThan(0);
    for (const p of tokens.contrast) {
      expect(COLOR_ROLES).toContain(p.fg);
      expect(COLOR_ROLES).toContain(p.bg);
      expect([3, 4.5]).toContain(p.min);
      expect(["light", "dark", "both"]).toContain(p.mode);
      expect(p.note.length).toBeGreaterThan(0);
    }
  });

  it("C8 — note는 비어 있지 않고 주석을 닫는 기호를 담지 않는다", () => {
    const notes: string[] = [
      tokens.color.note,
      tokens.radius.note,
      tokens.type.note,
      tokens.font.note,
      tokens.space.note,
      ...Object.values(tokens.color.items).map((v) => v.note),
      ...Object.values(tokens.radius.items).map((v) => v.note),
      ...Object.values(tokens.type.items).map((v) => v.note),
    ];
    for (const n of notes) {
      expect(typeof n === "string" && n.trim().length > 0).toBe(true);
      expect(n).not.toContain("*/");
    }
  });

  it("validateTokens — 정본은 통과한다", () => {
    expect(() => validateTokens(tokens)).not.toThrow();
  });
});

describe("089 validateTokens — 위반 주입은 거부된다", () => {
  const base = loadTokens();

  it("색 역할 하나가 빠지면 거부", () => {
    const t = clone(base);
    delete t.color.items.border;
    expect(() => validateTokens(t)).toThrow(/color/);
  });

  it("hex가 아닌 값(대문자·짧은 꼴)은 거부", () => {
    const upper = clone(base);
    upper.color.items.bg.light = "#F3F2F2";
    expect(() => validateTokens(upper)).toThrow(/hex|색/);
    const short = clone(base);
    short.color.items.bg.dark = "#fff";
    expect(() => validateTokens(short)).toThrow(/hex|색/);
  });

  it("note가 비면 거부", () => {
    const t = clone(base);
    t.color.items.bg.note = "  ";
    expect(() => validateTokens(t)).toThrow(/note/);
  });

  it("note에 주석 닫기 기호가 있으면 거부", () => {
    const t = clone(base);
    t.space.note = "끝 */ 이후";
    expect(() => validateTokens(t)).toThrow(/note/);
  });

  it("모르는 최상위 키는 거부", () => {
    const t = clone(base) as unknown as Record<string, unknown>;
    t.extra = {};
    expect(() => validateTokens(t as unknown as typeof base)).toThrow(/extra|키/);
  });

  it("webWeights가 weights 밖이면 거부", () => {
    const t = clone(base);
    t.font.webWeights = ["400", "900"];
    expect(() => validateTokens(t)).toThrow(/webWeights/);
  });

  it("간격이 증가 목록이 아니면 거부", () => {
    const t = clone(base);
    t.space.steps = [8, 4];
    expect(() => validateTokens(t)).toThrow(/space/);
  });

  it("대비 쌍이 모르는 역할을 가리키면 거부", () => {
    const t = clone(base);
    t.contrast[0].fg = "nope";
    expect(() => validateTokens(t)).toThrow(/contrast/);
  });

  it("앱 공용 글자 역할이 하나 늘면(웹 전용 표시 없이) 거부", () => {
    const t = clone(base);
    t.type.items.extraRole = { size: 10, weight: "400", lineHeight: 12, note: "x" };
    expect(() => validateTokens(t)).toThrow(/type/);
  });

  it("글자 역할의 굵기가 웹에 올리지 않은 굵기면 거부(브라우저가 흉내 내 그린다)", () => {
    const t = clone(base);
    t.type.items.title.weight = "500";
    expect(() => validateTokens(t)).toThrow(/webWeights/);
  });

  it("min이 3·4.5가 아니면 거부", () => {
    const t = clone(base);
    t.contrast[0].min = 2;
    expect(() => validateTokens(t)).toThrow(/min|contrast/);
  });
});
