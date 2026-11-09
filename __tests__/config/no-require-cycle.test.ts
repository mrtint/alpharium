/**
 * 2026-11-09 — `src/` 안에 값 import의 순환이 없다.
 *
 * 실기기(SM-S901N, 개발 번들): `timing.ts ↔ reminder-plan.ts` 순환(106)이 매 실행 「Require cycle」 경고를 냈고, 개발 클라이언트가 그것을
 * 화면 아래 LogBox 토스트로 띄워 하단 쓰기 바를 덮었다 — 층 2 흐름 둘(`layer2-write-and-read`·`layer2-diagnostics-try-write`)이 토스트를 눌러 실패했다.
 * `import type`은 번들에서 지워져 순환을 만들지 않으므로 세지 않는다.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts") ? [path] : [];
  });
}

function resolveImport(from: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const base = resolve(dirname(from), spec);
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // 다음 후보
    }
  }
  return null;
}

/** 값으로 불러오는 상대 import (import type·export type 제외) */
function valueImports(file: string): string[] {
  const source = readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  const found: string[] = [];
  const pattern = /^\s*(import|export)\s+(type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']/gm;
  for (const match of source.matchAll(pattern)) {
    if (match[2] !== undefined) continue;
    const clause = match[3];
    // import { type A, type B } — 모두 type이면 값이 아니다
    const braced = /^\{([\s\S]*)\}$/.exec(clause.trim());
    if (braced !== null) {
      const names = braced[1]
        .split(",")
        .map((n) => n.trim())
        .filter((n) => n.length > 0);
      if (names.length > 0 && names.every((n) => n.startsWith("type "))) continue;
    }
    const target = resolveImport(file, match[4]);
    if (target !== null) found.push(target);
  }
  for (const match of source.matchAll(/^\s*import\s+["']([^"']+)["']/gm)) {
    const target = resolveImport(file, match[1]);
    if (target !== null) found.push(target);
  }
  return found;
}

function findCycles(files: string[]): string[][] {
  const graph = new Map(files.map((f) => [f, valueImports(f)]));
  const cycles: string[][] = [];
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];
  const visit = (node: string) => {
    state.set(node, "visiting");
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      if (state.get(next) === "visiting")
        cycles.push(stack.slice(stack.indexOf(next)).concat(next));
      else if (state.get(next) === undefined) visit(next);
    }
    stack.pop();
    state.set(node, "done");
  };
  for (const file of files) if (state.get(file) === undefined) visit(file);
  return cycles.map((cycle) => cycle.map((f) => relative(process.cwd(), f)));
}

describe("src 값 import 순환", () => {
  it("없다", () => {
    expect(findCycles(sourceFiles(ROOT))).toEqual([]);
  });
});
