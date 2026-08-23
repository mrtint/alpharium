import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pickMonologue } from "../../src/diary/monologue";
import type { ProgressStage } from "../../src/inference/types";

/**
 * 독백 문구 선택의 계약 테스트.
 *
 * 계약: specs/015-writing-monologue/contracts/monologue.md
 *       specs/015-writing-monologue/data-model.md 「MonologueLine」
 */

const STAGES: readonly ProgressStage[] = ["signals", "vision", "generation"];

/** 매번 다음 값을 순서대로 돌려주는 결정론적 난수 함수 */
function sequence(...values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe("pickMonologue — 단계별 문구 (FR-001)", () => {
  it.each(STAGES)("%s 단계에서 문구를 돌려준다", (stage) => {
    const line = pickMonologue(stage, undefined, sequence(0));
    expect(typeof line).toBe("string");
    expect(line.length).toBeGreaterThan(0);
  });
});

describe("pickMonologue — 숫자를 담지 않는다 (FR-004, FR-013, SC-003)", () => {
  it.each(STAGES)("%s 단계의 모든 후보에 숫자가 없다", (stage) => {
    // random을 0..1 사이로 돌며 모든 후보를 순회해 본다
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      seen.add(pickMonologue(stage, undefined, sequence(i / 20)));
    }
    for (const line of seen) {
      expect(line).not.toMatch(/\d/);
    }
  });
});

describe("pickMonologue — 연속 호출에서 같은 문구를 고르지 않는다 (FR-014, SC-007)", () => {
  it.each(STAGES)("%s 단계에서 previous와 다른 문구를 고른다", (stage) => {
    let previous: string | undefined;
    // random이 항상 같은 값(0)을 주더라도 previous와 달라야 한다.
    for (let i = 0; i < 10; i++) {
      const line = pickMonologue(stage, previous, sequence(0));
      if (previous !== undefined) expect(line).not.toBe(previous);
      previous = line;
    }
  });

  it("random이 매번 같은 값을 줘도 직전과 다른 후보로 넘어간다", () => {
    const first = pickMonologue("vision", undefined, sequence(0));
    const second = pickMonologue("vision", first, sequence(0));
    expect(second).not.toBe(first);
  });
});

describe("pickMonologue — roster.ts·persona.ts·Character를 import하지 않는다 (원칙 III)", () => {
  const source = readFileSync(join(__dirname, "../../src/diary/monologue.ts"), "utf8");

  it("roster를 import하지 않는다", () => {
    expect(source).not.toMatch(/from ["'].*roster["']/);
  });

  it("persona를 import하지 않는다", () => {
    expect(source).not.toMatch(/from ["'].*persona["']/);
  });

  it("Character 타입을 import하지 않는다", () => {
    expect(source).not.toMatch(/import[^;]*\bCharacter\b[^;]*;/);
  });
});

describe("후보 테이블 — 각 단계 최소 2개 (원칙 IV, C3 정정)", () => {
  const source = readFileSync(join(__dirname, "../../src/diary/monologue.ts"), "utf8");

  it("Record<ProgressStage, readonly [string, string, ...string[]]> 형태다", () => {
    expect(source).toMatch(
      /Record<ProgressStage,\s*readonly \[string,\s*string,\s*\.\.\.string\[\]\]>/,
    );
  });
});
