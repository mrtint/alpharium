/**
 * 032 — 디자인 토큰 계약 (contracts/design-tokens.md DT1~DT6).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * jest `logic` 프로젝트(node 환경). `src/ui/theme/tokens.ts`는 순수 값이라 RN
 * 런타임이 필요 없다 — 컴포넌트를 import하지 않는다(research R6/R8).
 *
 * 이 파일은 **토큰이 사람이 정한 상수인지**, **WCAG AA 대비를 만족하는지**,
 * **다크 값이 없는지**, **`tailwind.config.js`가 같은 출처를 쓰는지**를 잠근다.
 * 007 이후 관례대로 소스를 `readFileSync`로도 읽어 구조 위반(`let`, 하드코딩)을
 * 잡는다 — jest는 타입을 지우므로 `as const` 여부는 텍스트로 본다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { COLORS, RADIUS, TYPE, contrastRatio } from "../src/ui/theme/tokens";

const TOKENS_SRC = readFileSync(join(__dirname, "../src/ui/theme/tokens.ts"), "utf8");
const TAILWIND_SRC = readFileSync(join(__dirname, "../tailwind.config.js"), "utf8");

const COLOR_KEYS = [
  "bg",
  "surface",
  "border",
  "text",
  "textMuted",
  "accent",
  "accentForeground",
  "danger",
  "dangerForeground",
] as const;

describe("DT1 — 색 역할 토큰이 사람이 정한 readonly 상수다", () => {
  it("COLORS 키가 정확히 9개 역할이다", () => {
    expect(Object.keys(COLORS).sort()).toEqual([...COLOR_KEYS].sort());
  });

  it("각 값이 #rrggbb hex 문자열이다", () => {
    for (const key of COLOR_KEYS) {
      expect(COLORS[key]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("★ COLORS를 const로 선언한다 — let/var가 아니다 (원칙 V)", () => {
    // 값을 나중에 바꿔치기할 수 있으면 그것이 임계값 코드로 가는 길이다.
    expect(TOKENS_SRC).toMatch(/export\s+const\s+COLORS\s*=/);
    expect(TOKENS_SRC).not.toMatch(/export\s+(let|var)\s+COLORS\b/);
  });

  it("★ COLORS 값이 리터럴이다 — 함수 호출·조건의 결과가 아니다 (원칙 V)", () => {
    // `COLORS`의 여는 중괄호부터 닫는 중괄호까지 잘라 계산 흔적을 본다.
    const block = TOKENS_SRC.slice(
      TOKENS_SRC.indexOf("COLORS"),
      TOKENS_SRC.indexOf("as const", TOKENS_SRC.indexOf("COLORS")) + 8,
    );
    for (const forbidden of ["shade(", "compute", "?", "mix(", "darken", "lighten"]) {
      expect(block).not.toContain(forbidden);
    }
  });
});

describe("DT2 — 간격·반경·타이포 상수", () => {
  it("RADIUS에 card·pill (number)", () => {
    expect(typeof RADIUS.card).toBe("number");
    expect(typeof RADIUS.pill).toBe("number");
  });

  it("TYPE에 6개 역할, 각 { fontSize, fontWeight, lineHeight }", () => {
    for (const key of [
      "title",
      "sectionTitle",
      "body",
      "bodyStrong",
      "caption",
      "button",
    ] as const) {
      expect(typeof TYPE[key].fontSize).toBe("number");
      expect(typeof TYPE[key].fontWeight).toBe("string");
      expect(typeof TYPE[key].lineHeight).toBe("number");
    }
  });

  it("★ 커스텀 폰트 이름을 참조하지 않는다 — 시스템 서체다 (FR-019a)", () => {
    // fontFamily 키가 없거나, 있어도 커스텀 이름이 아니다.
    expect(TOKENS_SRC).not.toMatch(/fontFamily\s*:\s*["'](?!System)/);
    for (const font of ["Pretendard", "Noto", "Roboto", "SUIT", "Spoqa"]) {
      expect(TOKENS_SRC).not.toContain(font);
    }
  });
});

describe("DT3 — WCAG 대비 헬퍼", () => {
  it("contrastRatio가 순수 함수다 — 같은 입력에 같은 출력", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    // 대칭
    expect(contrastRatio("#123456", "#abcdef")).toBeCloseTo(
      contrastRatio("#abcdef", "#123456"),
      10,
    );
  });
});

describe("DT4 — 팔레트가 WCAG AA를 만족한다 (spec FR-002, SC-005)", () => {
  const pairs: [keyof typeof COLORS, keyof typeof COLORS, number][] = [
    ["text", "bg", 4.5],
    ["text", "surface", 4.5],
    ["textMuted", "bg", 4.5],
    ["accentForeground", "accent", 4.5],
    ["dangerForeground", "danger", 4.5],
    ["danger", "bg", 3.0],
  ];

  it.each(pairs)("★ %s vs %s ≥ %f", (a, b, min) => {
    expect(contrastRatio(COLORS[a], COLORS[b])).toBeGreaterThanOrEqual(min);
  });
});

describe("DT5 — 단일 출처 (tailwind.config.js가 tokens.ts를 require)", () => {
  it("tailwind.config.js가 tokens를 require한다", () => {
    expect(TAILWIND_SRC).toMatch(/require\(["'][^"']*ui\/theme\/tokens["']\)/);
  });

  it("★ tailwind.config.js에 하드코딩 hex가 없다 (값 이중 정의 금지)", () => {
    // 주석을 걷어내고 hex 리터럴을 찾는다.
    const code = TAILWIND_SRC.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code).not.toMatch(/#[0-9A-Fa-f]{6}/);
  });

  it("★ tailwind config의 색 키 집합 == COLORS 키 집합", () => {
    // require로 실제 로드해 비교한다.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const twConfig = require("../tailwind.config.js");
    const twColors = twConfig.theme?.extend?.colors ?? {};
    expect(Object.keys(twColors).sort()).toEqual([...COLOR_KEYS].sort());
  });
});

describe("DT6 — 다크 값 없음 (spec FR-003·FR-019)", () => {
  it("★ COLORS_DARK·darkColors·색 스킴 분기가 없다", () => {
    for (const forbidden of ["COLORS_DARK", "darkColors", "useColorScheme", "Appearance"]) {
      expect(TOKENS_SRC).not.toContain(forbidden);
    }
  });
});
