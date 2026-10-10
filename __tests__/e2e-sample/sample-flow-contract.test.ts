import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DAYS } from "../../scripts/e2e-sample/manifest";
import { probeEnv } from "../../scripts/e2e-sample/plan";

/**
 * 070 — `sample-days` 흐름 계약 (contracts/sample-days-flow.md FL-1~FL-10, T-1~T-4).
 *
 * 날별 기대값은 표(`manifest.ts`)가 유일한 출처이고 실행기가 `-e`로 넘긴다. 흐름 안에는 날짜·기대 수 리터럴이 없어야 한다.
 */

const ROOT = process.cwd();
const strip = (source: string) =>
  source
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");

const MAIN = strip(readFileSync(join(ROOT, ".maestro", "sample-days.yml"), "utf8"));
const PROBE = strip(readFileSync(join(ROOT, ".maestro", "_sample-probe.yml"), "utf8"));
const RUNNER = readFileSync(join(ROOT, "scripts", "run-device-tests.mjs"), "utf8");
const DEVICE = readFileSync(join(ROOT, "scripts", "layer1", "device.ts"), "utf8");

describe("sample-days 흐름", () => {
  it("T-1: P0~P7 정확히 여덟 묶음을 참조하고 표의 대표 날 수와 같다", () => {
    const keys = new Set(
      [...MAIN.matchAll(/\bP(\d+)_(DATE|BACK|PHOTOS|PLACES)\b/g)].map((m) => m[0]),
    );
    const groups = new Set([...MAIN.matchAll(/\bP(\d+)_/g)].map((m) => m[1]));
    expect([...groups].sort()).toEqual(["0", "1", "2", "3", "4", "5", "6", "7"]);
    expect(groups.size).toBe(DAYS.filter((d) => d.probe === true).length);
    expect(keys.size).toBe(8 * 4);
    expect(MAIN.match(/_sample-probe\.yml/g)?.length).toBe(8);
  });

  it("T-2: 날짜 리터럴도 기대 수 리터럴도 흐름 안에 없다 (값은 env로만 온다)", () => {
    for (const source of [MAIN, PROBE]) {
      expect(source).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      // 단언 text에 숫자 리터럴을 박지 않는다 — ${...}만
      expect(source).not.toMatch(/text:\s*["']?\d+["']?\s*$/m);
    }
    expect(PROBE).toMatch(/signal-photos-number/);
    expect(PROBE).toMatch(/signal-places-number/);
    expect(PROBE).toContain("${PHOTOS}");
    expect(PROBE).toContain("${PLACES}");
  });

  it("T-3: probeEnv가 만든 키와 흐름이 참조하는 키가 같다", () => {
    const made = Object.keys(probeEnv(new Date(2026, 9, 10))).sort();
    const referenced = [
      ...new Set([...MAIN.matchAll(/\bP\d+_(?:DATE|BACK|PHOTOS|PLACES)\b/g)].map((m) => m[0])),
    ].sort();
    expect(referenced).toEqual(made);
  });

  it("FL-2: 첫 단계가 P0_DATE의 존재를 단언한다 (값이 없으면 조용히 통과하지 않는다)", () => {
    const firstCommand = MAIN.split("---")[1] ?? "";
    expect(firstCommand.indexOf("P0_DATE")).toBeGreaterThan(-1);
    expect(firstCommand.indexOf("P0_DATE")).toBeLessThan(firstCommand.indexOf("_sample-probe.yml"));
  });

  it("FL-5: 프로브는 달력으로 그 날까지 이동한다 (BACK 만큼 이전 달)", () => {
    expect(PROBE).toContain("home-date-button");
    expect(PROBE).toContain("calendar-prev");
    expect(PROBE).toContain("calendar-day-${DATE}");
    expect(PROBE).toMatch(/BACK\s*>=\s*2/);
  });

  it("FL-6: 일기 본문·문장을 단언하지 않는다 (원칙 IV)", () => {
    for (const source of [MAIN, PROBE]) {
      expect(source).not.toMatch(/diary-text|diary-body|paper-body|written-text/);
    }
  });

  it("FL-8: 설정·상태를 바꾸는 명령이 없다", () => {
    for (const source of [MAIN, PROBE]) {
      expect(source).not.toMatch(
        /clearState|clearKeychain|setLocation|permissions:|inputText|eraseText/,
      );
    }
  });

  it("FL-9: sample-days는 FLOWS·LAYER1_FLOWS·NEEDS_LAYER1_BASELINE에 등록돼 있고 보조 흐름은 등록돼 있지 않다", () => {
    const listOf = (name: string): string => {
      const m = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`).exec(RUNNER);
      if (m === null) throw new Error(`${name} 없음`);
      return m[1]
        .split("\n")
        .filter((l) => !l.trim().startsWith("//"))
        .join("\n");
    };
    for (const name of ["FLOWS", "LAYER1_FLOWS", "NEEDS_LAYER1_BASELINE"]) {
      expect(listOf(name)).toContain(".maestro/sample-days.yml");
      expect(listOf(name)).not.toContain("_sample-probe.yml");
    }
  });

  it("T-4: 실행기 소스가 -e 값의 안전한 모양을 강제한다 (공백·따옴표 불가)", () => {
    expect(DEVICE).toMatch(/\[A-Za-z0-9_-\]\+/);
    expect(DEVICE).toContain('"-e"');
  });
});
