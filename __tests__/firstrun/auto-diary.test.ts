import { shouldAutoGenerate } from "../../src/firstrun/auto-diary";

/**
 * 자동 첫 일기 생성 시도 판정의 계약 테스트 (040).
 *
 * 계약: specs/040-onboarding-parallel-setup/data-model.md `AutoDiaryAttempt`
 *       research.md #4
 *       spec.md FR-008·FR-008a
 */

describe("shouldAutoGenerate — livenessOutcome===\"ok\" && dayWritable일 때만 true", () => {
  it("ok + writable → true", () => {
    expect(shouldAutoGenerate({ livenessOutcome: "ok", dayWritable: true })).toBe(true);
  });

  it("ok + not writable → false", () => {
    expect(shouldAutoGenerate({ livenessOutcome: "ok", dayWritable: false })).toBe(false);
  });

  it("failed + writable → false", () => {
    expect(shouldAutoGenerate({ livenessOutcome: "failed", dayWritable: true })).toBe(false);
  });

  it("failed + not writable → false", () => {
    expect(shouldAutoGenerate({ livenessOutcome: "failed", dayWritable: false })).toBe(false);
  });
});
