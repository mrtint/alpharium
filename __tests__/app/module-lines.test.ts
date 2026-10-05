/**
 * 059 — 개발자 화면의 모듈 줄 (계약 MD1~MD5).
 *
 * 키 판정은 `src/app/`에서만 하고 화면은 문자열만 받는다(원칙 III, `UI_TOUCHES_ASSET`). 통로는 대역이다 — 실제 파일 크기·준비 상태는
 * 실기기에서 본다(quickstart 1).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  moduleKeyGroups,
  readModuleLines,
  type ModuleLinesDeps,
  type ReadinessKind,
} from "../../src/app/module-lines";
import { ESSENTIAL_ASSET_KEYS } from "../../src/onboarding/essential-assets";

const SIZES: Record<string, number> = {
  v1: 379_219_104,
  v2: 102_815_168,
  a1: 1_522_796_768,
};

function deps(over: Partial<ModuleLinesDeps> = {}): ModuleLinesDeps {
  return {
    essentialKeys: ESSENTIAL_ASSET_KEYS,
    writingKey: "a1",
    readStatuses: async () => ({ reading: "ready", writing: "ready" }),
    files: { bytesUsed: async (key: string) => SIZES[key] ?? 0 },
    ...over,
  };
}

describe("MD1 — 읽는/쓰는 키", () => {
  it("쓰는 키는 writingKey, 읽는 키는 필수 목록에서 그것을 뺀 나머지다", () => {
    expect(moduleKeyGroups(["v1", "v2", "a1"], "a1")).toEqual({
      reading: ["v1", "v2"],
      writing: "a1",
    });
  });

  it("읽는 크기는 그 키들의 bytesUsed 합이다", async () => {
    const lines = await readModuleLines(deps());
    // 379_219_104 + 102_815_168 = 482_034_272 → 482MB, 쓰는 쪽 1_522_796_768 → 1.5GB
    expect(lines.reading).toBe("loaded · 482MB");
    expect(lines.writing).toBe("loaded · 1.5GB");
  });
});

describe("MD2 — 상태어", () => {
  it.each([
    ["ready", "loaded"],
    ["partial", "partial"],
    ["not-downloaded", "missing"],
    ["unusable", "unusable"],
  ] as const)("%s → %s", async (kind, word) => {
    const lines = await readModuleLines(
      deps({
        readStatuses: async () => ({
          reading: kind as ReadinessKind,
          writing: kind as ReadinessKind,
        }),
      }),
    );
    expect(lines.reading?.startsWith(`${word} · `)).toBe(true);
    expect(lines.writing?.startsWith(`${word} · `)).toBe(true);
  });
});

describe("MD3 — 모델 이름·키·URL이 없다", () => {
  it("줄 문자열이 이름·키·확장자·URL 모양을 담지 않는다", async () => {
    const lines = await readModuleLines(deps());
    for (const line of [lines.reading, lines.writing]) {
      expect(line).not.toMatch(/\.(gguf|bin)|kanana|exaone|qwen|https?:|\bv[12]\b|\ba1\b/i);
    }
  });
});

describe("MD4 — 한 줄이 실패해도 다른 줄은 산다", () => {
  it("쓰는 쪽 크기를 못 읽으면 쓰는 줄만 null", async () => {
    const lines = await readModuleLines(
      deps({
        files: {
          bytesUsed: async (key: string) => {
            if (key === "a1") throw new Error("io");
            return SIZES[key] ?? 0;
          },
        },
      }),
    );
    expect(lines.writing).toBeNull();
    expect(lines.reading).toBe("loaded · 482MB");
  });

  it("상태 읽기가 던지면 두 줄 모두 null", async () => {
    const lines = await readModuleLines(
      deps({
        readStatuses: async () => {
          throw new Error("io");
        },
      }),
    );
    expect(lines).toEqual({ reading: null, writing: null });
  });
});

describe("MD5 — 화면은 입력을 모른다", () => {
  it("src/ui 어느 파일도 module-lines 를 import 하지 않는다", () => {
    const root = join(__dirname, "../../src/ui");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.tsx?$/.test(name)) files.push(full);
      }
    };
    walk(root);
    for (const file of files) {
      const code = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      expect(code).not.toMatch(/from\s+["'][^"']*module-lines["']/);
    }
  });
});
