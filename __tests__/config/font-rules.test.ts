/**
 * 083 — 서체 규칙 (contracts/font-rules.md F1~F5).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 서체 규칙이 어긋나도 앱은 오류 없이 시스템 서체나 가까운 굵기로 조용히 그려진다 — jest는 레이아웃·글꼴을 그리지 않으므로
 * 규칙을 소스와 파일에서 잠근다(AGENTS 「조용히 실패하는 결함의 계열」). 소스를 읽을 때는 주석을 먼저 걷는다 — 이 저장소의
 * 주석은 무엇을 왜 금지하는가를 적으므로 금지어가 설명 안에 정당하게 나온다.
 *
 * 대상 소스 = `App.tsx` + `src/` 아래 `.ts`·`.tsx`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// `src/ui/pretendard-license.ts`는 문자열 상수만 있어 RN 없이(logic 프로젝트) 불러올 수 있다.
import { PRETENDARD_LICENSE_NAME, PRETENDARD_LICENSE_TEXT } from "../../src/ui/pretendard-license";
import { FONT } from "../../src/ui/theme/tokens";

const ROOT = join(__dirname, "..", "..");
const TOKENS = "src/ui/theme/tokens.ts";
const FONT_DIR = "assets/fonts/pretendard";

/** RN 글자 부품을 직접 쓸 수 있는 자리 셋 (F2) */
const TEXT_PRIMITIVE_FILES = [
  "src/ui/components/Text.tsx",
  "src/ui/rnr/text.tsx",
  "src/ui/components/NameField.tsx",
];

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...filesUnder(rel));
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel);
  }
  return out;
}

const SOURCE_FILES = ["App.tsx", ...filesUnder("src")];

function code(file: string): string {
  return stripComments(readFileSync(join(ROOT, file), "utf8"));
}

/** `react-native`에서 값으로 가져온 이름들(type 전용은 뺀다) */
function reactNativeValueImports(source: string): string[] {
  const names: string[] = [];
  // `import { … }`·`import X, { … }` 둘 다 — 기본 가져오기 뒤의 중괄호도 센다
  for (const m of source.matchAll(
    /import\s+(type\s+)?(?:\w+\s*,\s*)?\{([^}]*)\}\s*from\s*["']react-native["']/g,
  )) {
    if (m[1] !== undefined) continue;
    for (const raw of m[2].split(",")) {
      const name = raw.trim();
      if (name === "" || name.startsWith("type ")) continue;
      names.push(name.split(/\s+as\s+/)[0].trim());
    }
  }
  return names;
}

const WEIGHT_NAMES: Record<string, string> = {
  normal: "400",
  bold: "700",
  thin: "100",
  extralight: "200",
  light: "300",
  medium: "500",
  semibold: "600",
  extrabold: "800",
  black: "900",
};

/** 소스 하나가 쓰는 굵기(숫자 문자열) */
function weightsIn(source: string): string[] {
  const found: string[] = [];
  // 굵기를 담는 키(`fontWeight`·`titleWeight`·`weight` …)의 값 식 안 — 삼항(`a ? "800" : "600"`)의 값까지 모두 센다
  for (const m of source.matchAll(/\b\w*[wW]eight\s*:\s*([^,}\n]+)/g)) {
    for (const v of m[1].matchAll(/["']([a-z0-9]+)["']/g)) found.push(WEIGHT_NAMES[v[1]] ?? v[1]);
  }
  for (const m of source.matchAll(
    /\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g,
  )) {
    found.push(WEIGHT_NAMES[m[1]]);
  }
  return found;
}

type FontDefinition = { path: string; weight: number; style?: string };
type ExpoFontConfig = {
  android?: { fonts?: { fontFamily: string; fontDefinitions: FontDefinition[] }[] };
  ios?: { fonts?: string[] };
};

function expoFontConfigs(): ExpoFontConfig[] {
  const app = JSON.parse(readFileSync(join(ROOT, "app.json"), "utf8")) as {
    expo: { plugins: unknown[] };
  };
  return app.expo.plugins
    .filter((p): p is [string, ExpoFontConfig] => Array.isArray(p) && p[0] === "expo-font")
    .map((p) => p[1]);
}

type Source = {
  version: string;
  license: { file: string; sha256: string };
  fonts: { file: string; weight: number; sha256: string }[];
};

const SOURCE = JSON.parse(readFileSync(join(ROOT, FONT_DIR, "source.json"), "utf8")) as Source;

function sha256(file: string): string {
  return createHash("sha256")
    .update(readFileSync(join(ROOT, file)))
    .digest("hex");
}

/** `./assets/fonts/pretendard/X.otf` → `assets/fonts/pretendard/X.otf` */
function repoPath(configPath: string): string {
  return configPath.replace(/^\.\//, "");
}

describe("F1 — 서체 이름은 토큰 한 곳에서만 정한다 (083 FR-007·FR-009)", () => {
  it("대상 소스가 실제로 있다(경로가 사라져 조용히 무력해지지 않게)", () => {
    expect(SOURCE_FILES).toContain(TOKENS);
    expect(SOURCE_FILES.length).toBeGreaterThan(100);
  });

  it.each(SOURCE_FILES.filter((f) => f !== TOKENS))("%s 에 fontFamily 가 없다", (file) => {
    expect(code(file)).not.toMatch(/\bfontFamily\b/);
  });

  it.each(SOURCE_FILES)("%s 에 고정폭 서체 이름이 없다", (file) => {
    expect(code(file)).not.toMatch(/Menlo|monospace/);
  });

  it("tokens.ts 는 fontFamily 를 FONT.family 로만 정한다", () => {
    const tokens = code(TOKENS);
    const families = [...tokens.matchAll(/fontFamily\s*:\s*([^,\n}]+)/g)].map((m) => m[1].trim());
    expect(families).toEqual(["FONT.family"]);
  });
});

describe("F2 — RN 글자 부품을 직접 쓰는 자리는 셋이고 셋 모두 공통 스타일을 쓴다 (083 FR-008)", () => {
  it("react-native 에서 Text·TextInput 을 값으로 가져오는 파일이 정확히 셋이다", () => {
    const importers = SOURCE_FILES.filter((file) =>
      reactNativeValueImports(code(file)).some((n) => n === "Text" || n === "TextInput"),
    );
    expect(importers.sort()).toEqual([...TEXT_PRIMITIVE_FILES].sort());
  });

  it.each(TEXT_PRIMITIVE_FILES)("%s 가 TEXT_FONT 를 가져와 스타일에 쓴다", (file) => {
    const source = code(file);
    expect(source).toMatch(
      /import\s*\{[^}]*\bTEXT_FONT\b[^}]*\}\s*from\s*["'][^"']*theme\/tokens["']/,
    );
    const withoutImports = source.replace(/import\s*\{[^}]*\}\s*from\s*["'][^"']*["'];?/g, "");
    expect(withoutImports).toMatch(/\bTEXT_FONT\b/);
  });

  it("react-native 를 이름공간째(`import * as`) 가져오는 파일이 없다 — `RN.Text`로 우회하지 못하게", () => {
    const namespaced = SOURCE_FILES.filter((file) =>
      /import\s+\*\s+as\s+\w+\s+from\s*["']react-native["']/.test(code(file)),
    );
    expect(namespaced).toEqual([]);
  });

  /*
   * 083 코드 리뷰 — 라이브러리 프리미티브도 글자를 그린다: `@rn-primitives`의 대화상자 `Title`·`Description`은 `asChild` 없이 쓰면
   * 안에서 RN `Text`를 직접 그린다. 그 자리는 반드시 `style={[TEXT_FONT, …]}`로 감싼다(`rnr/alert-dialog.tsx`·`rnr/dialog.tsx`).
   * 그대로 내보내면(`const X = Primitive.Title`) 대화상자 제목·설명만 시스템 서체가 된다 — 처음 구현이 그랬다.
   */
  it.each(SOURCE_FILES)("%s 의 프리미티브 Title·Description 은 TEXT_FONT 로 감싼다", (file) => {
    const source = code(file);
    const all = [...source.matchAll(/\b\w+Primitive\.(Title|Description|Text)\b/g)].length;
    const typed = [...source.matchAll(/typeof\s+\w+Primitive\.(Title|Description|Text)\b/g)].length;
    const wrapped = [
      ...source.matchAll(
        /<\w+Primitive\.(Title|Description|Text)\s+style=\{\[TEXT_FONT,\s*style\]\}/g,
      ),
    ].length;
    expect(all).toBe(typed + wrapped);
  });

  it("@rn-primitives 에서 Title·Description·Text 를 이름으로 가져오지 않는다 — 위 검사가 `XPrimitive.` 꼴만 보므로", () => {
    const named = SOURCE_FILES.filter((file) =>
      /import\s*\{[^}]*\b(?:Title|Description|Text)\b[^}]*\}\s*from\s*["']@rn-primitives\//.test(
        code(file),
      ),
    );
    expect(named).toEqual([]);
  });

  it("프리미티브 Title·Description 을 쓰는 파일을 실제로 찾는다(검사가 조용히 비지 않게)", () => {
    const users = SOURCE_FILES.filter((file) =>
      /\w+Primitive\.(Title|Description)\b/.test(code(file)),
    );
    expect(users.sort()).toEqual(["src/ui/rnr/alert-dialog.tsx", "src/ui/rnr/dialog.tsx"]);
  });

  it.each(SOURCE_FILES)("%s 가 글자 부품을 우회하는 애니메이션 글자를 만들지 않는다", (file) => {
    const source = code(file);
    expect(source).not.toMatch(/Animated\.Text\b/);
    expect(source).not.toMatch(/createAnimatedComponent\(\s*(?:RN)?Text(?:Input)?\b/);
  });
});

describe("F3 — 소스가 쓰는 굵기는 넣은 다섯 안에 있다 (083 FR-002·FR-006)", () => {
  const allowed = new Set<string>(FONT.weights);

  it("굵기를 실제로 찾는다(정규식이 조용히 아무것도 못 찾는 일을 막는다)", () => {
    const all = SOURCE_FILES.flatMap((file) => weightsIn(code(file)));
    expect(all.length).toBeGreaterThan(50);
    expect(new Set(all)).toEqual(allowed);
  });

  it.each([...SOURCE_FILES, "tailwind.config.js"])("%s 의 굵기가 다섯 안에 있다", (file) => {
    for (const weight of weightsIn(code(file))) expect(allowed).toContain(weight);
  });
});

describe("F4 — 빌드 설정의 서체 파일은 배포처 그대로다 (083 FR-004·FR-005·FR-016)", () => {
  it("app.json plugins 에 expo-font 설정이 하나 있다", () => {
    expect(expoFontConfigs()).toHaveLength(1);
  });

  it("android: fontFamily 가 FONT.family 인 묶음 하나, 굵기 집합이 FONT.weights, 스타일은 보통", () => {
    const [config] = expoFontConfigs();
    const families = config?.android?.fonts ?? [];
    expect(families.map((f) => f.fontFamily)).toEqual([FONT.family]);
    const defs = families[0]?.fontDefinitions ?? [];
    expect(defs.map((d) => String(d.weight)).sort()).toEqual([...FONT.weights].sort());
    for (const d of defs) expect(d.style ?? "normal").toBe("normal");
  });

  it("ios: 파일 집합이 android 와 같다", () => {
    const [config] = expoFontConfigs();
    const androidPaths = (config?.android?.fonts?.[0]?.fontDefinitions ?? []).map((d) => d.path);
    expect([...(config?.ios?.fonts ?? [])].sort()).toEqual([...androidPaths].sort());
  });

  it("설정이 가리키는 파일이 모두 있고 sha256·굵기가 출처 기록과 같다", () => {
    const [config] = expoFontConfigs();
    const defs = config?.android?.fonts?.[0]?.fontDefinitions ?? [];
    expect(defs).toHaveLength(5);
    for (const d of defs) {
      const file = repoPath(d.path);
      expect(file.startsWith(`${FONT_DIR}/`)).toBe(true);
      const name = file.slice(FONT_DIR.length + 1);
      const recorded = SOURCE.fonts.find((f) => f.file === name);
      expect(recorded).toBeDefined();
      expect(sha256(file)).toBe(recorded?.sha256);
      expect(d.weight).toBe(recorded?.weight);
    }
  });

  it("출처 기록: 서체 다섯·라이선스 파일이 있고 라이선스 해시가 같다", () => {
    expect(SOURCE.version).toBe("1.3.9");
    expect(SOURCE.fonts).toHaveLength(5);
    expect(SOURCE.fonts.map((f) => String(f.weight)).sort()).toEqual([...FONT.weights].sort());
    expect(sha256(`${FONT_DIR}/${SOURCE.license.file}`)).toBe(SOURCE.license.sha256);
  });
});

describe("F5 — 라이선스 전문은 배포처 파일과 같다 (083 FR-013·SC-005)", () => {
  const original = readFileSync(join(ROOT, FONT_DIR, "LICENSE.txt"), "utf8");

  it("전문이 LICENSE.txt 와 바이트 단위로 같다(끝 줄바꿈 포함)", () => {
    expect(PRETENDARD_LICENSE_TEXT).toBe(original);
  });

  it("엉뚱한 파일과 짝지어지지 않았다 — 저작권 줄·예약 서체명·OFL 1.1 머리", () => {
    const firstLine = original.split("\n")[0];
    expect(firstLine).toContain("Kil Hyung-jin");
    expect(original).toContain("Reserved Font Name Pretendard");
    expect(original).toContain("SIL OPEN FONT LICENSE Version 1.1");
    expect(PRETENDARD_LICENSE_NAME).toBe("SIL Open Font License 1.1");
  });
});
