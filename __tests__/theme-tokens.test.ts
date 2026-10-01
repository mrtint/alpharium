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

import {
  COLORS,
  RADIUS,
  RNR_COLOR_ALIASES,
  TYPE,
  contrastRatio,
  SETTINGS,
  WRITTEN_DAY,
} from "../src/ui/theme/tokens";

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
    // 보드의 오프화이트(3.76:1) — AA 본문 기준 미달을 알고 따른다(2026-10-01 저장소 소유자 결정).
    // 큰 글자·UI 기준(3:1)은 지킨다 — 더 옅은 글자로 바뀌는 것은 막는다.
    ["accentForeground", "accent", 3.0],
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

  it("★ tailwind config의 색 키 집합 == COLORS 키 ∪ RNR 별칭 키 (050)", () => {
    // require로 실제 로드해 비교한다.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const twConfig = require("../tailwind.config.js");
    const twColors = twConfig.theme?.extend?.colors ?? {};
    expect(Object.keys(twColors).sort()).toEqual(
      [...COLOR_KEYS, ...Object.keys(RNR_COLOR_ALIASES)].sort(),
    );
  });

  it("★ 050 DEP4 — RNR 별칭의 값은 전부 COLORS의 값이다 (새 색 없음)", () => {
    const palette = new Set<string>(Object.values(COLORS));
    for (const value of Object.values(RNR_COLOR_ALIASES)) {
      expect(palette.has(value)).toBe(true);
    }
  });

  it("050 — RADIUS.control(버튼 6)이 tailwind borderRadius에 있다", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const twConfig = require("../tailwind.config.js");
    expect(RADIUS.control).toBe(6);
    expect(twConfig.theme?.extend?.borderRadius?.control).toBe("6px");
  });
});

describe("DT6 — 다크 값 없음 (spec FR-003·FR-019)", () => {
  it("★ COLORS_DARK·darkColors·색 스킴 분기가 없다", () => {
    for (const forbidden of ["COLORS_DARK", "darkColors", "useColorScheme", "Appearance"]) {
      expect(TOKENS_SRC).not.toContain(forbidden);
    }
  });
});

describe("051 — 쓴 날 면 색의 대비 (research R7)", () => {
  it.each([
    ["본문 / 지면", COLORS.text, WRITTEN_DAY.paper, 4.5],
    ["「다시 쓰기」 / 바", COLORS.text, WRITTEN_DAY.rewriteBar, 4.5],
    // 11px 작은 글자 — 4.5:1이 필요하다. 경계에 가깝다(약 4.6).
    ["작성 시각 / 바", COLORS.textMuted, WRITTEN_DAY.rewriteBar, 4.5],
    ["읽을 수 없음 두 줄 / 지면", COLORS.text, WRITTEN_DAY.paper, 4.5],
    // 배지 — accent 위 오프화이트(보드, 2026-10-01 저장소 소유자 결정 — 3:1만 지킨다)
    ["배지 글자 / accent", COLORS.accentForeground, COLORS.accent, 3.0],
  ] as const)("%s — AA 이상", (_name, fg, bg, min) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  it("COLORS 아홉 역할은 그대로다 — 보드 램프 색은 WRITTEN_DAY에만 있다", () => {
    expect(Object.values(COLORS)).not.toContain(WRITTEN_DAY.paper);
    expect(Object.values(COLORS)).not.toContain(WRITTEN_DAY.rewriteBar);
  });
});

describe("055 — 설정 면 색의 대비 (research R10)", () => {
  it.each([
    ["「허용됨」 글자 / 꼬리표 면", SETTINGS.tagText, SETTINGS.tagFill, 4.5],
    ["「허용 안 함」 글자 / 지면", COLORS.danger, WRITTEN_DAY.paper, 4.5],
    ["값·보조 줄·「일부 허용」 글자 / 지면", COLORS.textMuted, WRITTEN_DAY.paper, 4.5],
    ["라벨 / 지면", COLORS.text, WRITTEN_DAY.paper, 4.5],
  ] as const)("%s — AA 이상", (_name, fg, bg, min) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  // › 는 장식 글리프다(누름 영역은 행 전체이고 뜻은 라벨이 말한다). 보드 neutral-500 그대로 둔다 —
  // 실측 약 2.65:1. 색을 바꾸려면 저장소 소유자에게 묻는다. 값이 더 흐려지지 않게만 잠근다.
  it("› / 지면 — 장식이라 대비 규칙 밖, 실측 2.6:1 아래로 내려가지 않는다", () => {
    expect(contrastRatio(SETTINGS.chevron, WRITTEN_DAY.paper)).toBeGreaterThanOrEqual(2.6);
  });

  it("새 색은 COLORS에 넣지 않는다 — 꼬리표 면은 「다시 쓰기」 바와 같은 값", () => {
    expect(SETTINGS.tagFill).toBe(WRITTEN_DAY.rewriteBar);
    expect(Object.values(COLORS)).not.toContain(SETTINGS.chevron);
    expect(Object.values(COLORS)).not.toContain(SETTINGS.tagText);
  });
});
