/**
 * 089 — 토큰 정본(`design/tokens.json`)에서 생성물 둘을 만드는 코어.
 *
 * 계약: specs/089-design-system-web/contracts/tokens-json.md · generated-outputs.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 코어는 값을 만들지 않는다**(헌법 원칙 V, FR-002). 출력의 모든 수치·문자열은 정본의 값 그대로이고,
 * 코어가 더하는 것은 식별자·구두점·`px` 같은 고정 꼴뿐이다. 계산·보정·파생(`darken()` 같은 것)을 넣는 순간
 * 코드가 색을 정하게 되고 그것이 원칙 V에서 벗어나는 길이다.
 *
 * 출력은 입력만으로 정해진다 — 시각·경로·환경을 읽지 않는다. 앱 생성 영역은 저장소의 prettier 설정(printWidth 100,
 * 큰따옴표, 후행 쉼표)과 같은 모양으로 직접 쓴다(prettier를 부르지 않는다 — jest(CJS)에서 prettier 3의 동적 import가
 * 안 돈다). 같은 모양인지는 `__tests__/design/tokens-sync.test.ts`가 `prettier --check`로 본다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface ColorEntry {
  light: string;
  dark: string;
  note: string;
}
export interface RadiusEntry {
  value: number;
  note: string;
}
export interface TypeEntry {
  size: number;
  weight: string;
  lineHeight: number;
  note: string;
  platforms?: string[];
}
export interface ContrastPair {
  fg: string;
  bg: string;
  min: number;
  mode: "light" | "dark" | "both";
  note: string;
}
export interface TokensJson {
  version: 1;
  color: { note: string; items: Record<string, ColorEntry> };
  radius: { note: string; items: Record<string, RadiusEntry> };
  type: { note: string; items: Record<string, TypeEntry> };
  font: {
    family: string;
    weights: string[];
    webWeights: string[];
    fallback: string[];
    note: string;
  };
  space: { steps: number[]; note: string };
  contrast: ContrastPair[];
}

export const REGION_BEGIN = "// <design-tokens:generated>";
export const REGION_END = "// </design-tokens:generated>";

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
const RADIUS_NAMES = ["card", "pill", "control"];
const APP_TYPE_ROLES = ["title", "sectionTitle", "body", "bodyStrong", "caption", "button"];
const TOP_KEYS = ["version", "color", "radius", "type", "font", "space", "contrast"];
const HEX = /^#[0-9a-f]{6}$/;

function fail(message: string): never {
  throw new Error(`design/tokens.json: ${message}`);
}

function checkNote(where: string, note: unknown): void {
  if (typeof note !== "string" || note.trim().length === 0) fail(`${where}.note 가 비어 있다`);
  if (note.includes("*/")) fail(`${where}.note 에 주석을 닫는 기호가 있다`);
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join("\0") === [...b].sort().join("\0");
}

/** 정본 규칙(tokens-json C1~C9)을 검사한다. 어기면 예외 — 생성기는 아무것도 쓰지 않는다. */
export function validateTokens(t: TokensJson): void {
  const keys = Object.keys(t);
  for (const k of keys) if (!TOP_KEYS.includes(k)) fail(`모르는 최상위 키 「${k}」`);
  for (const k of TOP_KEYS) if (!keys.includes(k)) fail(`최상위 키 「${k}」 가 없다`);
  if (t.version !== 1) fail("version 은 1이어야 한다");

  // 색 (C2)
  checkNote("color", t.color.note);
  if (!sameSet(Object.keys(t.color.items), COLOR_ROLES)) {
    fail(`color 의 역할이 정확히 ${COLOR_ROLES.join("·")} 아홉이 아니다`);
  }
  for (const [role, v] of Object.entries(t.color.items)) {
    for (const mode of ["light", "dark"] as const) {
      if (typeof v[mode] !== "string" || !HEX.test(v[mode])) {
        fail(`color.${role}.${mode} 가 #rrggbb 소문자 hex 색이 아니다`);
      }
    }
    checkNote(`color.${role}`, v.note);
  }

  // 반경 (C3)
  checkNote("radius", t.radius.note);
  if (!sameSet(Object.keys(t.radius.items), RADIUS_NAMES)) {
    fail(`radius 의 이름이 정확히 ${RADIUS_NAMES.join("·")} 가 아니다`);
  }
  for (const [name, v] of Object.entries(t.radius.items)) {
    if (!Number.isInteger(v.value) || v.value < 0) fail(`radius.${name}.value 가 0 이상의 정수가 아니다`);
    checkNote(`radius.${name}`, v.note);
  }

  // 서체 (C5)
  const f = t.font;
  checkNote("font", f.note);
  if (typeof f.family !== "string" || f.family.length === 0) fail("font.family 가 비어 있다");
  if (!Array.isArray(f.weights) || f.weights.length === 0) fail("font.weights 가 비어 있다");
  if (!f.webWeights.every((w) => f.weights.includes(w))) {
    fail("font.webWeights 가 font.weights 의 부분집합이 아니다");
  }
  if (f.webWeights.length === 0) fail("font.webWeights 가 비어 있다");
  if (f.fallback.length === 0 || f.fallback[f.fallback.length - 1] !== "sans-serif") {
    fail("font.fallback 의 마지막은 일반 계열 sans-serif 여야 한다");
  }

  // 글자 (C4)
  checkNote("type", t.type.note);
  const appRoles = Object.entries(t.type.items)
    .filter(([, v]) => v.platforms === undefined)
    .map(([k]) => k);
  if (!sameSet(appRoles, APP_TYPE_ROLES)) {
    fail(`type 의 앱 공용 글자 역할이 정확히 ${APP_TYPE_ROLES.join("·")} 여섯이 아니다`);
  }
  for (const [role, v] of Object.entries(t.type.items)) {
    if (v.platforms !== undefined && !(v.platforms.length === 1 && v.platforms[0] === "web")) {
      fail(`type.${role}.platforms 는 ["web"] 이어야 한다`);
    }
    if (!f.weights.includes(v.weight)) fail(`type.${role}.weight 가 font.weights 안에 없다`);
    // 같은 글자 역할이 웹(tokens.css)에도 나간다 — 자체 호스팅하지 않는 굵기는 브라우저가 흉내 내 그린다.
    if (!f.webWeights.includes(v.weight)) fail(`type.${role}.weight 가 font.webWeights 안에 없다(웹에 없는 굵기)`);
    if (!Number.isInteger(v.size) || v.size <= 0) fail(`type.${role}.size 가 양의 정수가 아니다`);
    if (!Number.isInteger(v.lineHeight) || v.lineHeight <= 0) {
      fail(`type.${role}.lineHeight 가 양의 정수가 아니다`);
    }
    checkNote(`type.${role}`, v.note);
  }

  // 간격 (C6)
  checkNote("space", t.space.note);
  const steps = t.space.steps;
  const increasing = steps.every((s, i) => Number.isInteger(s) && s > 0 && (i === 0 || s > steps[i - 1]));
  if (steps.length === 0 || !increasing) fail("space.steps 가 양의 정수의 증가 목록이 아니다");

  // 대비 (C7)
  t.contrast.forEach((p, i) => {
    const where = `contrast[${i}]`;
    if (!COLOR_ROLES.includes(p.fg) || !COLOR_ROLES.includes(p.bg)) {
      fail(`${where} 의 fg/bg 가 정본 색 역할이 아니다`);
    }
    if (p.min !== 3 && p.min !== 4.5) fail(`${where}.min 은 3 또는 4.5 여야 한다`);
    if (!["light", "dark", "both"].includes(p.mode)) fail(`${where}.mode 가 light·dark·both 가 아니다`);
    checkNote(where, p.note);
  });
}

// ─── 앱 생성 영역 ────────────────────────────────────────────────────────────

function doc(note: string, indent: string): string[] {
  const lines = note.split("\n");
  if (lines.length === 1) return [`${indent}/** ${note} */`];
  return [`${indent}/**`, ...lines.map((l) => `${indent} * ${l}`.trimEnd()), `${indent} */`];
}

function q(s: string): string {
  return JSON.stringify(s);
}

function appRegion(t: TokensJson): string {
  const out: string[] = [];
  out.push(`${REGION_BEGIN} — design/tokens.json에서 만든다. 손으로 고치지 않는다.`);
  out.push("");

  out.push(...doc(t.color.note, ""));
  out.push("export const COLORS = {");
  for (const role of COLOR_ROLES) {
    const v = t.color.items[role];
    out.push(...doc(v.note, "  "));
    out.push(`  ${role}: ${q(v.light)},`);
  }
  out.push("} as const;");
  out.push("");

  out.push(...doc(t.radius.note, ""));
  out.push("export const RADIUS = {");
  for (const name of RADIUS_NAMES) {
    const v = t.radius.items[name];
    out.push(...doc(v.note, "  "));
    out.push(`  ${name}: ${v.value},`);
  }
  out.push("} as const;");
  out.push("");

  out.push(...doc(t.type.note, ""));
  out.push("export const TYPE = {");
  for (const role of APP_TYPE_ROLES) {
    const v = t.type.items[role];
    out.push(...doc(v.note, "  "));
    out.push(`  ${role}: { fontSize: ${v.size}, fontWeight: ${q(v.weight)}, lineHeight: ${v.lineHeight} },`);
  }
  out.push("} as const;");
  out.push("");

  out.push(...doc(t.font.note, ""));
  out.push("export const FONT = {");
  out.push(`  family: ${q(t.font.family)},`);
  out.push(`  weights: [${t.font.weights.map(q).join(", ")}],`);
  out.push("} as const;");
  out.push(REGION_END);
  return out.join("\n");
}

// ─── 웹 변수 파일 ────────────────────────────────────────────────────────────

/** 이름에 공백이 있거나 서체 이름 자신이면 따옴표, 아니면 그대로(`-apple-system`·`sans-serif` 등) */
function cssNameOf(name: string, family: string): string {
  return /\s/.test(name) || name === family ? q(name) : name;
}

function css(t: TokensJson): string {
  const out: string[] = [];
  out.push("/* design/tokens.json에서 만든다. 손으로 고치지 않는다. */");
  out.push(":root {");
  out.push("  color-scheme: light dark;");
  for (const role of COLOR_ROLES) out.push(`  --color-${role}: ${t.color.items[role].light};`);
  for (const name of RADIUS_NAMES) out.push(`  --radius-${name}: ${t.radius.items[name].value}px;`);
  const stack = [q(t.font.family), ...t.font.fallback.map((n) => cssNameOf(n, t.font.family))];
  out.push(`  --font-sans: ${stack.join(", ")};`);
  for (const [role, v] of Object.entries(t.type.items)) {
    out.push(`  --text-${role}-size: ${v.size}px;`);
    out.push(`  --text-${role}-weight: ${v.weight};`);
    out.push(`  --text-${role}-line: ${v.lineHeight}px;`);
  }
  for (const s of t.space.steps) out.push(`  --space-${s}: ${s}px;`);
  out.push("}");
  out.push("");
  out.push("@media (prefers-color-scheme: dark) {");
  out.push("  :root {");
  for (const role of COLOR_ROLES) out.push(`    --color-${role}: ${t.color.items[role].dark};`);
  out.push("  }");
  out.push("}");
  return out.join("\n") + "\n";
}

export function buildOutputs(t: TokensJson): { appRegion: string; css: string } {
  validateTokens(t);
  return { appRegion: appRegion(t), css: css(t) };
}

// ─── tokens.ts 안의 생성 영역 다루기 ─────────────────────────────────────────

/** 표식 줄 포함 생성 영역 텍스트. 표식이 정확히 한 쌍이 아니면 예외. */
export function extractRegion(source: string): string {
  const [from, to] = regionBounds(source);
  return source.slice(from, to);
}

/** 생성 영역만 바꾼 새 소스 */
export function replaceRegion(source: string, region: string): string {
  const [from, to] = regionBounds(source);
  return source.slice(0, from) + region + source.slice(to);
}

function regionBounds(source: string): [number, number] {
  const count = (s: string) => source.split(s).length - 1;
  if (count(REGION_BEGIN) !== 1 || count(REGION_END) !== 1) {
    throw new Error(`tokens.ts: 생성 영역 표식(${REGION_BEGIN} / ${REGION_END})이 정확히 한 쌍이 아니다`);
  }
  const from = source.indexOf(REGION_BEGIN);
  const endMarker = source.indexOf(REGION_END);
  if (endMarker < from) throw new Error("tokens.ts: 생성 영역 표식의 순서가 거꾸로다");
  const lineEnd = source.indexOf("\n", endMarker);
  return [from, lineEnd === -1 ? source.length : lineEnd];
}
