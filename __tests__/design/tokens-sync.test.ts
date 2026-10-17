/**
 * 089 — 정본 ↔ 생성물 동기 (FR-002·SC-004, contracts/generated-outputs.md).
 *
 * 생성물(앱의 `tokens.ts` 생성 영역, 웹의 `tokens.css`)은 정본에서만 만들어진다. 한 글자라도 다르면 실패한다.
 * 생성기는 값을 만들지 않는다(원칙 V) — 아래 값 대조가 출력의 수치·문자열이 정본 그대로임을 본다.
 */

import { execFileSync } from "node:child_process";
import { join } from "node:path";

import {
  buildOutputs,
  extractRegion,
  REGION_BEGIN,
  REGION_END,
} from "../../scripts/design/tokens-build";
import { clone, loadTokens, readText, ROOT, TOKENS_CSS, TOKENS_TS } from "./helpers";

const tokens = loadTokens();
const out = buildOutputs(tokens);

/** 주석을 걷은 코드 — 이 저장소의 주석은 금지어를 설명하며 정당하게 담는다 */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

describe("089 tokens-sync — 생성물이 정본에서 만든 것과 같다", () => {
  it("G1 — tokens.ts의 생성 영역이 buildOutputs와 바이트 같다", () => {
    expect(extractRegion(readText(TOKENS_TS))).toBe(out.appRegion);
  });

  it("G1 — tokens.css가 buildOutputs와 바이트 같다", () => {
    expect(readText(TOKENS_CSS)).toBe(out.css);
  });

  it("표식 두 줄이 tokens.ts에 정확히 한 번씩 있다", () => {
    const src = readText(TOKENS_TS);
    expect(src.split(REGION_BEGIN).length - 1).toBe(1);
    expect(src.split(REGION_END).length - 1).toBe(1);
    expect(src.indexOf(REGION_BEGIN)).toBeLessThan(src.indexOf(REGION_END));
  });

  it("G1 — 정본의 값을 바꾸면 생성 결과가 달라진다(동기 테스트가 실제로 어긋남을 본다)", () => {
    const t = clone(tokens);
    t.color.items.accent.light = "#ec3014";
    const changed = buildOutputs(t);
    expect(changed.appRegion).not.toBe(out.appRegion);
    expect(changed.css).not.toBe(out.css);
  });
});

describe("089 앱 생성 영역 (G-A1~A5)", () => {
  const region = out.appRegion;

  it("A1 — COLORS는 const 리터럴이고 키 아홉, 라이트 값만 있다", () => {
    expect(region).toMatch(/export const COLORS = \{/);
    const block = region.slice(
      region.indexOf("export const COLORS"),
      region.indexOf("export const RADIUS"),
    );
    expect([...block.matchAll(/^\s{2}(\w+): "#[0-9a-f]{6}",$/gm)]).toHaveLength(9);
    for (const [role, v] of Object.entries(tokens.color.items)) {
      expect(block).toContain(`  ${role}: "${v.light}",`);
    }
    const lights = new Set(Object.values(tokens.color.items).map((v) => v.light));
    for (const v of Object.values(tokens.color.items)) {
      if (!lights.has(v.dark)) expect(block).not.toContain(`"${v.dark}"`);
    }
  });

  it("A1 — 다크 이름이 없다", () => {
    expect(code(region)).not.toMatch(/COLORS_DARK|darkColors|\bdark\b/i);
  });

  it("A2 — TYPE은 앱 공용 여섯 역할만 { fontSize, fontWeight, lineHeight } 모양으로 담는다", () => {
    const block = region.slice(
      region.indexOf("export const TYPE"),
      region.indexOf("export const FONT"),
    );
    expect([
      ...block.matchAll(/^\s{2}(\w+): \{ fontSize: \d+, fontWeight: "\d+", lineHeight: \d+ \},$/gm),
    ]).toHaveLength(6);
    expect(block).not.toMatch(/display|reading/);
  });

  it("A3 — FONT는 family·weights만 담는다(webWeights·fallback은 웹 전용)", () => {
    const block = region.slice(region.indexOf("export const FONT"));
    expect(block).toMatch(/family: "Pretendard"/);
    expect(block).toMatch(/weights: \["400", "500", "600", "700", "800"\]/);
    expect(block).not.toMatch(/webWeights|fallback/);
  });

  it("A4 — fontFamily 식별자가 영역 안에 없다(서체 이름은 FONT.family로만, 083 F1)", () => {
    expect(code(region)).not.toMatch(/\bfontFamily\b/);
  });

  it("A5 — tokens.ts가 prettier 기준을 통과한다", () => {
    const bin = join(ROOT, "node_modules", ".bin", "prettier");
    expect(() => execFileSync(bin, ["--check", TOKENS_TS], { stdio: "pipe" })).not.toThrow();
  });
});

describe("089 웹 변수 파일 (G-W1~W5)", () => {
  const css = out.css;

  it("W1 — 변수 이름이 규칙을 따른다", () => {
    const names = [...css.matchAll(/(--[a-zA-Z0-9-]+):/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) {
      expect(n).toMatch(
        /^--(color-[a-zA-Z]+|radius-[a-zA-Z]+|font-sans|text-[a-zA-Z]+-(size|weight|line)|space-\d+)$/,
      );
    }
  });

  it("W1 — 색 역할 아홉이 모두 있다", () => {
    for (const role of Object.keys(tokens.color.items)) expect(css).toContain(`--color-${role}:`);
  });

  it("W2 — 다크 값은 prefers-color-scheme: dark 안에만 있다(역할별로 본다)", () => {
    const [light, dark] = css.split("@media (prefers-color-scheme: dark)");
    expect(dark).toBeDefined();
    for (const [role, v] of Object.entries(tokens.color.items)) {
      expect(light).toContain(`--color-${role}: ${v.light};`);
      expect(dark).toContain(`--color-${role}: ${v.dark};`);
      if (v.dark !== v.light) expect(light).not.toContain(`--color-${role}: ${v.dark};`);
    }
  });

  it("W3 — 길이는 정본의 숫자에 px를 붙인 것 그대로다(환산 없음)", () => {
    for (const s of tokens.space.steps) expect(css).toContain(`--space-${s}: ${s}px;`);
    for (const [k, v] of Object.entries(tokens.type.items)) {
      expect(css).toContain(`--text-${k}-size: ${v.size}px;`);
      expect(css).toContain(`--text-${k}-line: ${v.lineHeight}px;`);
      expect(css).toContain(`--text-${k}-weight: ${v.weight};`);
    }
  });

  it("W4 — 웹 전용 글자 역할도 나온다", () => {
    const webOnly = Object.entries(tokens.type.items).filter(([, v]) => v.platforms !== undefined);
    expect(webOnly.length).toBeGreaterThan(0);
    for (const [k] of webOnly) expect(css).toContain(`--text-${k}-size:`);
  });

  it("W5 — --font-sans가 서체 이름으로 시작하고 sans-serif로 끝난다", () => {
    const m = /--font-sans: ([^;]+);/.exec(css);
    expect(m).not.toBeNull();
    expect(m![1].startsWith(`"${tokens.font.family}"`)).toBe(true);
    expect(m![1].trim().endsWith("sans-serif")).toBe(true);
  });
});

describe("089 CLI — --check", () => {
  it("현재 저장소 상태에서 어긋남이 없다(종료 코드 0)", () => {
    expect(() =>
      execFileSync(
        "node",
        [
          "--no-warnings=MODULE_TYPELESS_PACKAGE_JSON",
          "scripts/design/build-tokens.mts",
          "--check",
        ],
        { cwd: ROOT, stdio: "pipe" },
      ),
    ).not.toThrow();
  });
});
