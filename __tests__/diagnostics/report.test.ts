/**
 * 진단 리포트 (014 → 060에서 캐릭터별 모델 줄·저장 점검·모듈 상태를 걷었다).
 *
 * 계약: specs/060-diagnostics-screen/contracts/diagnostics.md RP1~RP3, specs/022-prompt-preview PP4·PP9
 *
 * **`collectReport()`는 기기 없이도 안전하게 돈다** — 환경 판정·위치 선택·프롬프트 조립은 순수하다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CHARACTERS } from "../../src/diary/types";
import { collectReport } from "../../src/diagnostics/report";
import { SIGNAL_PRESETS } from "../../src/diagnostics/prompt-preview";

describe("060 RP1·RP2 — 진단 리포트는 화면이 읽는 것만 담는다", () => {
  it("environment·inferenceLocation·promptPreviews뿐이다", async () => {
    const report = await collectReport();
    expect(Object.keys(report).sort()).toEqual([
      "environment",
      "inferenceLocation",
      "promptPreviews",
    ]);
  });

  it("collectReport는 파일을 쓰거나 모델 모듈을 두드리지 않는다", () => {
    const raw = readFileSync(join(__dirname, "../../src/diagnostics/report.ts"), "utf8");
    const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(src).not.toMatch(/checkStorage|isAvailable|characterModels|displayName/);
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
