/**
 * 101 — 「오픈소스 라이선스」 행의 문구 영역 `licenseLinks` (specs/101-license-notice/contracts/license-row.md LK1~LK3).
 *
 * 헌법 원칙 III: 모델 식별자·파라미터 수·양자화 방식은 사용자 화면에 노출하지 않는다. 고지는 앱 밖 페이지에만 모델 이름을
 * 적고(site/licenses/), 앱 안 문구는 이 테스트가 식별자를 막는다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ko } from "../../src/i18n/catalogs/ko";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf8");
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

/** 모델 식별자 — 이름, 파라미터 수, 양자화 표기, 파일 형식 (대소문자 무시) */
const MODEL_IDENTIFIERS = [
  "kanana",
  "카나나",
  "lfm",
  "liquid",
  "llama",
  "gguf",
  "mmproj",
  "2.1b",
  "450m",
  "q4",
  "q8",
] as const;

describe("101 LK — licenseLinks 영역", () => {
  it("LK1 — 영역은 row 하나뿐이다", () => {
    expect(Object.keys(ko.licenseLinks)).toEqual(["row"]);
    expect(ko.licenseLinks.row).toBe("오픈소스 라이선스");
  });

  it.each(MODEL_IDENTIFIERS)("LK2 — 영역의 어떤 값에도 모델 식별자 %s 가 없다", (id) => {
    for (const value of Object.values(ko.licenseLinks)) {
      expect(value.toLowerCase()).not.toContain(id);
    }
  });

  it("LK2 — 영역 소스 파일의 문자열 값에도 식별자가 없다(주석 제외)", () => {
    const code = stripComments(read("src/i18n/catalogs/ko/license-links.ts")).toLowerCase();
    for (const id of MODEL_IDENTIFIERS) expect(code).not.toContain(id);
  });

  it("LK3 — 문구 골든에 ADDED_AFTER_GOLDEN으로만 올라 있다", () => {
    const golden = read("__tests__/i18n/ko-golden.test.ts");
    const start = golden.indexOf("const ADDED_AFTER_GOLDEN");
    const end = golden.indexOf("];", start);
    expect(start).toBeGreaterThan(-1);
    expect(golden.slice(start, end)).toContain('"오픈소스 라이선스"');
    // 옛 값 보존 목록에는 들어가지 않는다.
    const changed = golden.indexOf("const CHANGED_AFTER_GOLDEN");
    if (changed !== -1) {
      expect(golden.slice(changed, golden.indexOf("];", changed))).not.toContain(
        "오픈소스 라이선스",
      );
    }
  });

  it("LK3 — 설정 화면 쪽 소스는 모델 로스터를 import하지 않는다", () => {
    for (const rel of ["src/ui/SettingsScreen.tsx", "src/ui/settings-text.ts"]) {
      const code = stripComments(read(rel));
      expect(code).not.toMatch(/models\/roster|vision\/roster/);
    }
  });
});
