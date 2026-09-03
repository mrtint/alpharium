/**
 * 031 — DM2: 화면이 다크 모드를 감지하지 않는다.
 *
 * 계약: specs/031-oneui85-fixes/contracts/dark-mode.md DM2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 스펙은 "다크 모드에서도 **라이트로 고정**"이지 "다크 모드 대응"이 아니다.
 * 실제 다크 팔레트 작업은 로드맵 11번(NativeWind UI)의 범위다.
 *
 * `src/ui/`의 어느 화면이 `useColorScheme()`·`Appearance`를 읽기 시작하면 —
 * `userInterfaceStyle: "light"` + `forceDarkAllowed=false`로 앱은 항상 라이트인데
 * 그 값은 시스템을 따라 "dark"를 반환할 수 있어(RN Appearance는 OS 설정을 봄) —
 * 화면이 존재하지 않는 다크 팔레트로 분기하며 깨진다. 11번이 팔레트를 설계하기
 * 전까지 이 문은 닫아 둔다.
 *
 * **위반 주입**: 아무 `src/ui/*.tsx`에 `import { useColorScheme } from "react-native"`
 * 를 넣으면 이 테스트가 FAIL한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const UI_DIR = join(__dirname, "../../src/ui");

/**
 * `src/ui/` 아래 모든 `.tsx`·`.ts`를 훑는다.
 *
 * **032에서 `.ts`도 포함하도록 넓혔다** — `src/ui/theme/tokens.ts`(디자인 토큰),
 * `src/ui/components/*.tsx`(재사용 컴포넌트)까지 같은 문(색 스킴 미감지)을
 * 적용한다. 원래는 `.tsx`만 봤다(화면). 재귀는 이미 하고 있었다.
 */
function uiSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return uiSourceFiles(full);
    return e.isFile() && (e.name.endsWith(".tsx") || e.name.endsWith(".ts")) ? [full] : [];
  });
}

/** 주석을 걷어낸 소스 — 설명이 위반으로 잡히면 아무도 설명을 쓰지 않는다(008). */
function stripComments(src: string): string {
  return src.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

describe("DM2 — src/ui/는 색상 스킴을 감지하지 않는다 (032에서 theme/·components/까지 확장)", () => {
  const files = uiSourceFiles(UI_DIR);

  it("검사 대상 소스가 충분히 있다 (glob 회귀 방지)", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("★ 어느 화면·컴포넌트·토큰도 useColorScheme을 쓰지 않는다", () => {
    const offenders = files.filter((f) =>
      /\buseColorScheme\b/.test(stripComments(readFileSync(f, "utf8"))),
    );
    expect(offenders.map((f) => f.replace(UI_DIR, "src/ui"))).toEqual([]);
  });

  it("★ 어느 화면·컴포넌트·토큰도 Appearance를 읽지 않는다", () => {
    const offenders = files.filter((f) =>
      /\bAppearance\.(get|set|addChangeListener)/.test(stripComments(readFileSync(f, "utf8"))),
    );
    expect(offenders.map((f) => f.replace(UI_DIR, "src/ui"))).toEqual([]);
  });

  it("★ 어느 화면·컴포넌트도 dark: variant className을 쓰지 않는다 (032 BC6)", () => {
    const offenders = files.filter((f) =>
      /className=["'`][^"'`]*\bdark:/.test(readFileSync(f, "utf8")),
    );
    expect(offenders.map((f) => f.replace(UI_DIR, "src/ui"))).toEqual([]);
  });
});
