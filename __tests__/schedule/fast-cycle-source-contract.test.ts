/**
 * 106 — 빠른 주기의 읽기·지우기 위치를 소스로 잠근다 (contracts/fast-cycle.md FC8 · research R13 — 헌법 검사 FL1~FL3의 소스 계약 짝).
 *
 * 주석을 먼저 걷어내고 소스를 읽는다(AGENTS). 헌법 검사(`scripts/constitution-rules.ts`)가 같은 규칙을 파일마다 잡고, 이 테스트는 실제 트리를
 * 한 번 더 읽어 규칙 구현과 무관하게 현재 소스가 지키는지 확인한다.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..");

const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const FILES = [...walk(join(ROOT, "src")), join(ROOT, "App.tsx")].map((full) => ({
  path: relative(ROOT, full).replace(/\\/g, "/"),
  code: strip(readFileSync(full, "utf8")),
}));

const read = (path: string) => strip(readFileSync(join(ROOT, path), "utf8"));

describe("FL1 — 가드 없는 읽기(loadFastCycle)는 timing-source.ts 하나만 부른다", () => {
  it("loadFastCycle(가드 없는 읽기)를 import하는 파일은 timing-source.ts뿐이다 — 다른 곳은 loadFastCycleRecord", () => {
    const importers = FILES.filter((f) =>
      /import\s*(?:type\s*)?\{[^}]*\bloadFastCycle\b(?!Record)[^}]*\}\s*from\s*["'][^"']*fast-cycle-store["']/.test(
        f.code,
      ),
    ).map((f) => f.path);
    expect(importers).toEqual(["src/schedule/timing-source.ts"]);
  });
});

describe("FL2 — timing-source.ts는 개발 환경 가드 뒤에서만 읽고 환경을 직접 읽지 않는다", () => {
  const code = read("src/schedule/timing-source.ts");

  it("process.env를 읽지 않는다 (환경 판정은 config/environment.ts에서만)", () => {
    expect(code).not.toMatch(/process\.env/);
  });

  it("기록 읽기(loadFastCycle( ) 앞에 devEnvironment 가드가 있다", () => {
    expect(code).toMatch(
      /if\s*\(\s*!devEnvironment\s*\)\s*return\s+null\s*;[\s\S]*loadFastCycle\(/,
    );
  });

  it("통로를 직접 읽지 않는다 (.read( 호출 없음)", () => {
    expect(code).not.toMatch(/\.read\(/);
  });
});

describe("FL3 — 리셋을 부르는 자리", () => {
  const callers = (name: string) =>
    FILES.filter((f) => new RegExp(`(?<!function\\s)\\b${name}\\s*\\(`).test(f.code)).map(
      (f) => f.path,
    );

  it("resetFastCycleIfDue(는 task.ts와 fast-cycle-reset.ts(클로저 공장)에서만 부른다", () => {
    expect(callers("resetFastCycleIfDue").sort()).toEqual([
      "src/app/fast-cycle-reset.ts",
      "src/schedule/task.ts",
    ]);
  });

  it("createFastCycleResetter는 App.tsx에서만 부른다 (src/ui·훅이 부르지 않는다)", () => {
    const users = callers("createFastCycleResetter").filter(
      (p) => p !== "src/app/fast-cycle-reset.ts",
    );
    expect(users).toEqual(["App.tsx"]);
  });

  it("앱 열기 판정 훅은 저장소·포트·리셋 모듈을 import하지 않는다 (주입된 클로저만 부른다)", () => {
    const hook = read("src/app/use-auto-write-handoff.ts");
    expect(hook).not.toMatch(/from\s+["'][^"']*fast-cycle-(?:reset|store)["']/);
    expect(hook).not.toMatch(/from\s+["'][^"']*timing-source["']/);
  });
});
