/**
 * 진단 리포트 — 캐릭터별 모델 표시 이름 (014 US4).
 *
 * 계약: specs/014-character-persona/plan.md 「Constitution Check」
 *
 * **`collectReport()`는 기기 없이도 안전하게 돈다** — `checkStorage()`·
 * `selectBackend()`가 기기 통로 없이 예외를 던지지 않고 `unavailable`/`failed`로
 * 떨어지도록 이미 설계돼 있다(002·001의 기존 계약). 그래서 이 파일은 순수하게
 * `characterModels` 필드만 검사한다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CHARACTERS } from "../../src/diary/types";
import { collectReport } from "../../src/diagnostics/report";
import { SIGNAL_PRESETS } from "../../src/diagnostics/prompt-preview";

describe("014 US4 — 캐릭터별 모델 표시 이름 (FR-017)", () => {
  it("다섯 캐릭터 전부가 characterModels에 담긴다", async () => {
    const report = await collectReport();

    for (const character of CHARACTERS) {
      expect(typeof report.characterModels[character]).toBe("string");
      expect(report.characterModels[character].length).toBeGreaterThan(0);
    }
  });
});

describe("022 — 진단 리포트에 프롬프트 미리보기 (FR-005·FR-008, PP4)", () => {
  it("promptPreviews가 5캐릭터 × 전 프리셋을 덮는다", async () => {
    const report = await collectReport();
    const presetIds = SIGNAL_PRESETS.map((p) => p.id).sort();

    expect(Object.keys(report.promptPreviews).sort()).toEqual([...CHARACTERS].sort());
    for (const character of CHARACTERS) {
      const set = report.promptPreviews[character];
      expect(Object.keys(set).sort()).toEqual(presetIds);
      for (const id of presetIds) {
        const preview = set[id];
        expect(preview.ok).toBe(true);
        if (preview.ok) {
          expect(preview.text.length).toBeGreaterThan(0);
          expect(preview.approxChars).toBe(preview.text.length);
        }
      }
    }
  });

  it("PP9 — report.ts와 prompt-preview.ts가 파이프라인·판정·네이티브 추론에 닿지 않는다", () => {
    for (const rel of [
      "../../src/diagnostics/report.ts",
      "../../src/diagnostics/prompt-preview.ts",
    ]) {
      const raw = readFileSync(join(__dirname, rel), "utf8");
      // 주석 제거 — 설명에 나오는 낱말은 위반이 아니다.
      const src = raw
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .split(/\r?\n/)
        .map((line) => line.replace(/\/\/.*$/, ""))
        .filter((line) => !/^\s*\*/.test(line))
        .join("\n");
      expect(src).not.toMatch(/from\s+["'][^"']*diary\/(?:pipeline|acceptance)["']/);
      expect(src).not.toMatch(/from\s+["'][^"']*inference\/(?:llama-port|engine-port)["']/);
      expect(src).not.toContain("initLlama");
    }
  });
});
