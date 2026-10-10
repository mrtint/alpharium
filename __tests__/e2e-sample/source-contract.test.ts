import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * 070 — 소스 계약 (contracts/sample-seeding.md K-1~K-5).
 *
 * 소스를 읽어 「하지 않는 것」을 잠근다. 이 저장소의 주석은 무엇을 왜 금지하는가를 적으므로 읽기 전에 주석을 걷어낸다(AGENTS 「테스트 작성의 함정」).
 */

const ROOT = process.cwd();

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

function filesUnder(dir: string, pattern: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === ".cache" || name === "node_modules") return [];
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return filesUnder(full, pattern);
    return pattern.test(name) ? [full] : [];
  });
}

const SAMPLE_FILES = filesUnder(join(ROOT, "scripts", "e2e-sample"), /\.(ts|mts)$/).concat(
  [join(ROOT, "scripts", "sample-fetch.mts"), join(ROOT, "scripts", "sample-seed.mts")].filter(
    (p) => {
      try {
        statSync(p);
        return true;
      } catch {
        return false;
      }
    },
  ),
);

const read = (p: string) => stripComments(readFileSync(p, "utf8"));

describe("소스 계약", () => {
  it("표본 파일이 있다 (검사 대상이 비지 않았다)", () => {
    expect(SAMPLE_FILES.length).toBeGreaterThanOrEqual(7);
  });

  it("K-1: 앱 코드(src/)는 표본을 모른다", () => {
    const srcFiles = filesUnder(join(ROOT, "src"), /\.(ts|tsx)$/);
    expect(srcFiles.length).toBeGreaterThan(50);
    for (const file of srcFiles) {
      const source = read(file);
      expect(`${file}: ${/e2e-sample|PocketlogSeed|s30-/.test(source)}`).toBe(`${file}: false`);
    }
  });

  it("K-2: 지우는 명령은 s30- 접두 파일뿐이다 (rm -rf·폴더 통째 삭제·seed:clear 없음)", () => {
    for (const file of SAMPLE_FILES) {
      const source = read(file);
      expect(`${file}: ${/rm\s+-rf|removeSeedFolder|seed:clear|seed-clear/.test(source)}`).toBe(
        `${file}: false`,
      );
    }
    const device = read(join(ROOT, "scripts", "e2e-sample", "device.ts"));
    const deletions = device.match(/find [^`"]*-delete[^`"]*/g) ?? [];
    expect(deletions.length).toBeGreaterThanOrEqual(1);
    for (const d of deletions) expect(d).toContain("s30-");
    // 그 밖의 삭제 명령(rm)은 없다
    expect(device).not.toMatch(/\brm\b/);
  });

  it("K-3: 개발 기계에 기록을 두지 않는다 — 010 ledger를 import하지 않는다", () => {
    for (const file of SAMPLE_FILES) {
      expect(`${file}: ${/seed\/ledger|\.seed-ledger/.test(read(file))}`).toBe(`${file}: false`);
    }
  });

  it("K-4: 사진 바이트는 .cache와 OS 임시 폴더에만 쓴다 (저장소 경로에 쓰지 않는다)", () => {
    for (const file of SAMPLE_FILES) {
      const source = read(file);
      // writeFileSync/renameSync 대상이 되는 경로 상수가 scripts/ 안 사진 폴더를 가리키지 않는다
      expect(`${file}: ${/writeFileSync\([^)]*scripts[^)]*\.jpe?g/.test(source)}`).toBe(
        `${file}: false`,
      );
    }
    const cli = read(join(ROOT, "scripts", "sample-fetch.mts"));
    expect(cli).toContain(".cache");
  });

  it("K-5: 표본은 selectableDays(사흘)를 쓰지 않고 자기 범위 30일을 가진다", () => {
    for (const file of SAMPLE_FILES) {
      expect(`${file}: ${/selectableDays/.test(read(file))}`).toBe(`${file}: false`);
    }
  });
});
