/**
 * 099 BX2·BX3 — 모델 디렉터리 백업 제외 포트와 호출 지점.
 * 포트는 어떤 경우에도 던지지 않고(제외 실패가 모델 받기를 막으면 안 된다), 호출은 모델 디렉터리를 확인하는 자리 하나에서만 한다.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { createBackupExclusion } from "../../src/models/backup-exclusion-port";

type Mod = { setExcludedFromBackup(path: string): unknown };

describe("BX2 — 포트는 던지지 않는다", () => {
  it("모듈이 없으면(안드로이드·jest) unsupported", () => {
    expect(createBackupExclusion(() => null)("file:///d/models")).toBe("unsupported");
  });

  it("모듈이 던지면 failed", () => {
    const exclude = createBackupExclusion(() => ({
      setExcludedFromBackup() {
        throw new Error("boom");
      },
    }));
    expect(exclude("file:///d/models")).toBe("failed");
  });

  it("모듈을 찾다 던져도 failed", () => {
    const exclude = createBackupExclusion(() => {
      throw new Error("no module");
    });
    expect(exclude("file:///d/models")).toBe("failed");
  });

  it("false를 돌려주면 failed, true면 excluded", () => {
    expect(createBackupExclusion(() => ({ setExcludedFromBackup: () => false }))("p")).toBe(
      "failed",
    );
    expect(createBackupExclusion(() => ({ setExcludedFromBackup: () => true }))("p")).toBe(
      "excluded",
    );
  });
});

describe("BX2 — 프로세스당 한 번", () => {
  it("성공한 뒤에는 모듈을 다시 부르지 않는다", () => {
    const calls: string[] = [];
    const mod: Mod = {
      setExcludedFromBackup: (p) => {
        calls.push(p);
        return true;
      },
    };
    const exclude = createBackupExclusion(() => mod);
    exclude("file:///d/models");
    exclude("file:///d/models");
    expect(calls).toEqual(["file:///d/models"]);
  });

  it("실패한 뒤에는 다음 호출에서 다시 시도한다", () => {
    let n = 0;
    const exclude = createBackupExclusion(() => ({
      setExcludedFromBackup: () => ++n > 1,
    }));
    expect(exclude("p")).toBe("failed");
    expect(exclude("p")).toBe("excluded");
  });
});

const ROOT = join(__dirname, "../..");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("BX3 — 호출 지점", () => {
  it("expo-port의 openDirectory()가 디렉터리를 만든 직후 제외를 건다", () => {
    const src = strip(readFileSync(join(ROOT, "src/models/expo-port.ts"), "utf8"));
    const open = src.match(/async function openDirectory\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(open).toMatch(/dir\.create\(/);
    expect(open).toMatch(/excludeModelsFromBackup\(/);
    expect(open.indexOf("dir.create(")).toBeLessThan(open.indexOf("excludeModelsFromBackup("));
  });

  it("제외 호출은 src/models/expo-port.ts 한 곳에서만 한다 — 일기·설정·사진 사본 경로에는 닿지 않는다", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (
          /\.tsx?$/.test(name) &&
          strip(readFileSync(p, "utf8")).includes("excludeModelsFromBackup(")
        ) {
          hits.push(p.slice(ROOT.length + 1));
        }
      }
    };
    walk(join(ROOT, "src"));
    expect(hits.sort()).toEqual(["src/models/expo-port.ts"]);
  });
});
