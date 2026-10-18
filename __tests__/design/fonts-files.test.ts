/**
 * 089 — 웹 서체 파일 (G6, FR-009·FR-010, contracts/generated-outputs.md 서체 절).
 *
 * 서체 파일은 배포처 것을 바이트 그대로 둔다(OFL — 서브셋·변환은 수정이고 수정판은 예약 서체명을 못 쓴다, 083).
 * 파일이 한 바이트라도 달라지거나 라이선스가 빠지면 실패한다.
 */

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { FONT } from "../../src/ui/theme/tokens";
import { FONTS_CSS, FONTS_DIR, loadTokens, parseFontFaces, readText, ROOT } from "./helpers";

const tokens = loadTokens();
const source = JSON.parse(readText(join(FONTS_DIR, "source.json"))) as {
  name: string;
  version: string;
  integrity: string;
  license: { file: string; sha256: string };
  weights: string[];
  files: { file: string; weight: string; sha256: string }[];
};

const sha256 = (path: string): string =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const woff2OnDisk = (): string[] => readdirSync(FONTS_DIR).filter((f) => f.endsWith(".woff2"));

describe("089 웹 서체 — 배포처 파일 그대로", () => {
  it("source.json이 패키지·버전·무결성을 적는다(앱과 같은 v1.3.9)", () => {
    expect(source.name).toBe("pretendard");
    expect(source.version).toBe("1.3.9");
    expect(source.integrity).toMatch(/^sha512-/);
  });

  it("source.json의 굵기 == 정본 webWeights ⊆ 앱 FONT.weights", () => {
    expect([...source.weights].sort()).toEqual([...tokens.font.webWeights].sort());
    for (const w of tokens.font.webWeights) expect(FONT.weights).toContain(w);
  });

  it("woff2 파일 목록이 디스크와 정확히 같고 굵기마다 조각 수가 같다", () => {
    expect(source.files.map((f) => f.file).sort()).toEqual(woff2OnDisk().sort());
    const counts = tokens.font.webWeights.map(
      (w) => source.files.filter((f) => f.weight === w).length,
    );
    expect(counts[0]).toBeGreaterThan(0);
    expect(new Set(counts).size).toBe(1);
  });

  it("파일마다 sha256이 source.json과 같다", () => {
    for (const f of source.files) {
      expect({ file: f.file, sha: sha256(join(FONTS_DIR, f.file)) }).toEqual({
        file: f.file,
        sha: f.sha256,
      });
    }
  });

  it("LICENSE.txt가 앱에 넣은 v1.3.9 라이선스와 바이트 같고 source.json의 해시와 같다", () => {
    const web = join(FONTS_DIR, "LICENSE.txt");
    const app = join(ROOT, "assets", "fonts", "pretendard", "LICENSE.txt");
    expect(existsSync(web)).toBe(true);
    expect(readFileSync(web).equals(readFileSync(app))).toBe(true);
    expect(sha256(web)).toBe(source.license.sha256);
  });
});

describe("089 fonts.css — @font-face", () => {
  const faces = parseFontFaces(readText(FONTS_CSS));

  it("선언이 있다", () => {
    expect(faces.length).toBeGreaterThan(0);
  });

  it("모든 선언이 Pretendard·normal·swap이고 woff2 파일 하나와 unicode-range를 가진다", () => {
    for (const f of faces) {
      expect(f.family).toBe(tokens.font.family);
      expect(f.style).toBe("normal");
      expect(f.display).toBe("swap");
      expect(f.file).not.toBe("");
      expect(f.ranges.length).toBeGreaterThan(0);
      expect(existsSync(join(FONTS_DIR, f.file))).toBe(true);
    }
  });

  it("선언한 굵기 집합 == 정본 webWeights", () => {
    expect([...new Set(faces.map((f) => f.weight))].sort()).toEqual(
      [...tokens.font.webWeights].sort(),
    );
  });

  it("모든 woff2 파일이 정확히 한 번 선언된다", () => {
    expect(faces.map((f) => f.file).sort()).toEqual(woff2OnDisk().sort());
  });

  it("외부 주소가 없다", () => {
    expect(readText(FONTS_CSS)).not.toMatch(/https?:\/\//);
  });
});
