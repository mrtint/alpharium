import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pickMonologue } from "../../src/diary/monologue";
import type { MonologueBranch, ProgressStage } from "../../src/inference/types";

/**
 * 독백 문구 선택의 계약 테스트.
 *
 * 계약: specs/015-writing-monologue/contracts/monologue.md
 *       specs/015-writing-monologue/data-model.md 「MonologueLine」
 *       specs/016-writing-monologue-expansion/contracts/monologue-branch.md
 *       specs/016-writing-monologue-expansion/data-model.md 「MonologueLine (확장)」
 */

/** 매번 다음 값을 순서대로 돌려주는 결정론적 난수 함수 */
function sequence(...values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

/** (stage, branch) 조합 — 016이 다루는 여섯 갈래 */
const COMBOS: readonly [ProgressStage, MonologueBranch | undefined, string | undefined][] = [
  ["signals", undefined, undefined],
  ["vision", "normal", undefined],
  ["vision", "many", undefined],
  ["load", "cold", "루이"],
  ["load", "hot", "루이"],
  ["generation", undefined, undefined],
];

describe("pickMonologue — 단계별 문구 (FR-001)", () => {
  it.each(COMBOS)("%s/%s 갈래에서 문구를 돌려준다", (stage, branch, name) => {
    const line = pickMonologue(stage, branch, undefined, name, sequence(0));
    expect(typeof line).toBe("string");
    expect(line.length).toBeGreaterThan(0);
  });
});

describe("pickMonologue — 숫자를 담지 않는다 (FR-004, FR-013, SC-003, SC-008)", () => {
  it.each(COMBOS)("%s/%s 갈래의 모든 후보에 숫자가 없다", (stage, branch, name) => {
    // random을 0..1 사이로 돌며 모든 후보를 순회해 본다
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      seen.add(pickMonologue(stage, branch, undefined, name, sequence(i / 20)));
    }
    for (const line of seen) {
      expect(line).not.toMatch(/\d/);
    }
  });
});

describe("pickMonologue — 연속 호출에서 같은 문구를 고르지 않는다 (FR-010, SC-007)", () => {
  it.each(COMBOS)("%s/%s 갈래에서 previous와 다른 문구를 고른다", (stage, branch, name) => {
    let previous: string | undefined;
    // random이 항상 같은 값(0)을 주더라도 previous와 달라야 한다.
    for (let i = 0; i < 10; i++) {
      const line = pickMonologue(stage, branch, previous, name, sequence(0));
      if (previous !== undefined) expect(line).not.toBe(previous);
      previous = line;
    }
  });

  it("random이 매번 같은 값을 줘도 직전과 다른 후보로 넘어간다", () => {
    const first = pickMonologue("vision", "normal", undefined, undefined, sequence(0));
    const second = pickMonologue("vision", "normal", first, undefined, sequence(0));
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

describe("문구 갈래 — 여섯 갈래 전부 10개 이상 (FR-009, SC-006, 016)", () => {
  const RICH_COMBOS: readonly [ProgressStage, MonologueBranch | undefined, string][] = [
    ["signals", undefined, ""],
    ["vision", "normal", ""],
    ["vision", "many", ""],
    ["load", "cold", "루이"],
    ["load", "hot", "루이"],
    ["generation", undefined, ""],
  ];

  it.each(RICH_COMBOS)(
    "%s/%s 갈래에서 서로 다른 문구 10개 이상을 관측한다",
    (stage, branch, name) => {
      const seen = new Set<string>();
      let previous: string | undefined;
      // 충분히 많이 반복해 결정론적 시퀀스로도 10개 이상의 서로 다른 문구를 모은다.
      for (let i = 0; i < 200; i++) {
        const line = pickMonologue(stage, branch, previous, name || undefined, sequence(i / 200));
        seen.add(line);
        previous = line;
      }
      expect(seen.size).toBeGreaterThanOrEqual(10);
    },
  );
});

describe("사진 보기 문구 — 정직성 경계 (FR-005, SC-003)", () => {
  const FORBIDDEN = ["누구", "인물", "언제", "어디", "찍힌", "다녀온"];

  it.each<MonologueBranch>(["normal", "many"])(
    "vision/%s 풀에 정직성 경계를 넘는 낱말이 없다",
    (branch) => {
      const seen = new Set<string>();
      let previous: string | undefined;
      for (let i = 0; i < 200; i++) {
        const line = pickMonologue("vision", branch, previous, undefined, sequence(i / 200));
        seen.add(line);
        previous = line;
      }
      for (const line of seen) {
        for (const word of FORBIDDEN) {
          expect(line).not.toContain(word);
        }
      }
    },
  );
});

describe("모델 로드 문구 — 이름을 넣지 않는다 (2026-08-23 철회)", () => {
  it("cold 갈래 문구는 characterName을 받아도 문구에 이름을 넣지 않는다", () => {
    const line = pickMonologue("load", "cold", undefined, "루이", sequence(0));
    expect(line).not.toContain("루이");
  });

  it("hot 갈래 문구는 characterName을 받아도 문구에 이름을 넣지 않는다", () => {
    const line = pickMonologue("load", "hot", undefined, "루이", sequence(0));
    expect(line).not.toContain("루이");
  });

  it("characterName을 넘기지 않아도 문구를 정상적으로 고른다", () => {
    const line = pickMonologue("load", "cold", undefined, undefined, sequence(0));
    expect(typeof line).toBe("string");
    expect(line.length).toBeGreaterThan(0);
  });
});
