import { readFileSync } from "node:fs";
import { join } from "node:path";

import { extractTitle } from "../../src/diary/title";

/**
 * 일기 제목 분리 계약 테스트.
 *
 * 계약: specs/014-character-persona/contracts/title.md 「규칙 P1~P4」
 */

describe("정상 형식 — 첫 줄 + 빈 줄 + 본문", () => {
  it("첫 줄을 제목으로 떼어낸다", () => {
    const result = extractTitle("조용한 하루\n\n오늘은 아무 일도 없었다.");

    expect(result.title).toBe("조용한 하루");
    expect(result.body).toBe("오늘은 아무 일도 없었다.");
  });

  it("제목 줄의 앞뒤 공백을 정리한다", () => {
    const result = extractTitle("  조용한 하루  \n\n본문");

    expect(result.title).toBe("조용한 하루");
  });
});

describe("P3 — 빈 줄이 없으면 전체가 body다", () => {
  it("빈 줄 없는 텍스트는 title이 없다", () => {
    const text = "오늘은 아무 일도 없었다. 그냥 하루가 지나갔다.";
    const result = extractTitle(text);

    expect(result.title).toBeUndefined();
    expect(result.body).toBe(text);
  });
});

describe("첫 줄이 40자를 넘으면 전체가 body다", () => {
  it("41자 첫 줄은 제목으로 채택되지 않는다", () => {
    const longLine = "가".repeat(41);
    const text = `${longLine}\n\n본문`;
    const result = extractTitle(text);

    expect(result.title).toBeUndefined();
    expect(result.body).toBe(text);
  });

  it("40자 첫 줄은 제목으로 채택된다", () => {
    const line40 = "가".repeat(40);
    const text = `${line40}\n\n본문`;
    const result = extractTitle(text);

    expect(result.title).toBe(line40);
    expect(result.body).toBe("본문");
  });
});

describe("첫 부분이 여러 줄이면 전체가 body다", () => {
  it("빈 줄 앞에 줄바꿈이 하나 더 있으면 title이 없다", () => {
    const text = "첫 줄\n둘째 줄\n\n본문";
    const result = extractTitle(text);

    expect(result.title).toBeUndefined();
    expect(result.body).toBe(text);
  });
});

describe("P2 — 예외를 던지지 않는다", () => {
  it("빈 문자열에도 값을 반환한다", () => {
    const result = extractTitle("");

    expect(result.title).toBeUndefined();
    expect(result.body).toBe("");
  });

  it("빈 줄만 있는 문자열에도 값을 반환한다", () => {
    const result = extractTitle("\n\n");

    expect(() => extractTitle("\n\n")).not.toThrow();
    expect(result.body).toBeDefined();
  });
});

describe("P3 — 원문 보존", () => {
  it("title이 없으면 body가 원문과 완전히 같다", () => {
    // 첫 부분이 여러 줄이므로 title이 채택되지 않는다.
    const noTitleText = "첫 줄\n둘째 줄\n\n셋째\n\n넷째";
    const result = extractTitle(noTitleText);

    expect(result.title).toBeUndefined();
    expect(result.body).toBe(noTitleText);
  });

  it("title이 채택되면 body는 제목 줄과 구분 빈 줄만 제거된 나머지다", () => {
    const result = extractTitle("제목\n\n본문 첫 줄\n\n본문 안의 다른 빈 줄\n\n끝");

    expect(result.title).toBe("제목");
    expect(result.body).toBe("본문 첫 줄\n\n본문 안의 다른 빈 줄\n\n끝");
  });
});

describe("P4 — 지표를 담지 않는다(원칙 IV)", () => {
  it("반환 타입 선언에 title·body 외 필드가 없다", () => {
    const source = readFileSync(join(__dirname, "../../src/diary/title.ts"), "utf8");
    const match = source.match(/export type TitleExtraction\s*=\s*(\{[\s\S]*?\});/);

    expect(match).not.toBeNull();
    const declaration = match?.[1] ?? "";

    expect(declaration).toContain("title");
    expect(declaration).toContain("body");
    expect(declaration).not.toMatch(/elapsedMs|confidence|method|duration|score/i);
  });

  it("실제 반환값에도 title·body 외 키가 없다(빈 title 없이)", () => {
    const withTitle = extractTitle("제목\n\n본문");
    expect(Object.keys(withTitle).sort()).toEqual(["body", "title"]);
  });
});

describe("P1 — 판정과 무관하다", () => {
  it("extractTitle이 Character나 Ending을 인자로 받지 않는다", () => {
    // extractTitle(text: string)만 받는다 — 함수 시그니처는 타입 검사가 지키지만,
    // 여기서는 소스가 그 시그니처를 실제로 선언하는지 직접 확인한다.
    const source = readFileSync(join(__dirname, "../../src/diary/title.ts"), "utf8");
    const match = source.match(/export function extractTitle\(([^)]*)\)/);

    expect(match).not.toBeNull();
    const params = match?.[1] ?? "";
    expect(params).toMatch(/^text\s*:\s*string$/);
  });
});
