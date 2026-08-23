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

import { CHARACTERS } from "../../src/diary/types";
import { collectReport } from "../../src/diagnostics/report";

describe("014 US4 — 캐릭터별 모델 표시 이름 (FR-017)", () => {
  it("다섯 캐릭터 전부가 characterModels에 담긴다", async () => {
    const report = await collectReport();

    for (const character of CHARACTERS) {
      expect(typeof report.characterModels[character]).toBe("string");
      expect(report.characterModels[character].length).toBeGreaterThan(0);
    }
  });
});
