/**
 * 050 — 대화상자 기반의 의존성 경계 (contracts/dialogs.md DEP1~DEP5, MIG3).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 소스를 읽는가**: 「새 네이티브 모듈이 없다」(research R1)는 C2(dev 1회 검증)의 전제다. RNR 레지스트리
 * 원본은 `react-native-screens`·`lucide-react-native`를 끌고 오는데(R2), 복사본에 그것이 되살아나도 jest는
 * 초록이다 — 설치되지 않은 모듈은 import 순간에만 죽고, 목이 있으면 그마저 없다. 그래서 import 문을 센다.
 *
 * 주석은 걷어내고 본다 — 이 저장소의 주석은 무엇을 왜 금지하는지 적으므로 금지어가 정당하게 나온다(011·035).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..");

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const child = `${dir}/${entry.name}`;
    if (entry.isDirectory()) found.push(...sourceFiles(child));
    else if (/\.tsx?$/.test(entry.name)) found.push(child);
  }
  return found;
}

const FILES = [...sourceFiles("src"), "App.tsx"];
const code = (file: string) => stripComments(readFileSync(join(ROOT, file), "utf8"));

describe("DEP1 — 네이티브 의존성을 끌고 오는 패키지를 import하지 않는다 (C2, research R2)", () => {
  it.each(["react-native-screens", "lucide-react-native", "react-native-svg"])("%s", (pkg) => {
    const offenders = FILES.filter((f) => new RegExp(`from\\s+["']${pkg}["']`).test(code(f)));
    expect(offenders).toEqual([]);
  });
});

describe("DEP2 — RNR 버튼·글자는 대화상자·메뉴 부품 안에서만 쓴다 (Q3)", () => {
  it("src/ui/rnr/button·text를 import하는 파일", () => {
    const importers = FILES.filter((f) =>
      /from\s+["'][^"']*rnr\/(button|text)["']/.test(code(f)),
    ).map((f) => relative(ROOT, join(ROOT, f)).replace(/\\/g, "/"));

    const allowed = (f: string) =>
      f.startsWith("src/ui/rnr/") || f === "src/ui/components/Dialog.tsx";
    expect(importers.filter((f) => !allowed(f))).toEqual([]);
  });
});

describe("DEP3 — 전역 스타일시트에 색·CSS 변수를 두지 않는다 (Q3, FR-022a)", () => {
  it("global.css는 @tailwind 세 줄뿐이다", () => {
    const lines = readFileSync(join(ROOT, "global.css"), "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    expect(lines).toEqual(["@tailwind base;", "@tailwind components;", "@tailwind utilities;"]);
  });
});

describe("DEP5 — PortalHost는 루트에 하나 (research R4)", () => {
  it("App.tsx에 <PortalHost 가 정확히 한 번, SafeAreaProvider 안에", () => {
    const app = code("App.tsx");
    expect(app.match(/<PortalHost\b/g) ?? []).toHaveLength(1);
    const open = app.indexOf("<SafeAreaProvider");
    const close = app.indexOf("</SafeAreaProvider>");
    const host = app.indexOf("<PortalHost");
    expect(open).toBeGreaterThanOrEqual(0);
    expect(host).toBeGreaterThan(open);
    expect(host).toBeLessThan(close);
  });
});

describe("MIG3 — 대화상자·메뉴가 RN 코어 Modal을 쓰지 않는다 (Q4)", () => {
  it.each([
    "src/ui/DownloadConsentDialog.tsx",
    "src/ui/OverwriteConfirmDialog.tsx",
    "src/ui/DateJumpDialog.tsx",
  ])("%s", (file) => {
    const source = code(file);
    const rnImport = source.match(/import\s*\{([^}]*)\}\s*from\s*["']react-native["']/);
    const names = rnImport ? rnImport[1].split(",").map((n) => n.trim()) : [];
    expect(names).not.toContain("Modal");
  });
});
