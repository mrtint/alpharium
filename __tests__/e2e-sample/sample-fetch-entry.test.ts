import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 084 — 내려받기 진입점의 소스 계약 (contracts/photo-identity.md W-1·W-2).
 *
 * `scripts/sample-fetch.mts`는 jest가 실행하지 않는 진입점이라 소스로 잠근다: 목록 파일(photos.json)은 **성공했고 바뀐 것이 있는 실행에서만** 쓴다
 * (실패한 실행이 목록을 바꾸지 않는다 — FR-006). 주석은 무엇을 왜 금지하는가를 적으므로 걷어낸 뒤 읽는다(AGENTS 「테스트 작성의 함정」).
 */

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const source = stripComments(
  readFileSync(join(process.cwd(), "scripts", "sample-fetch.mts"), "utf8"),
);

describe("sample-fetch.mts (W-1·W-2)", () => {
  it("W-1: 목록 파일을 쓰는 자리는 하나다", () => {
    expect(source.match(/writeFileSync\(\s*CATALOG_PATH\(\)/g) ?? []).toHaveLength(1);
  });

  it("W-1: 그 쓰기는 실패 반환 뒤, result.changed를 보는 조건 안에 있다", () => {
    const write = source.search(/writeFileSync\(\s*CATALOG_PATH\(\)/);
    const failReturn = source.search(/if\s*\(\s*!result\.ok\s*\)\s*\{[\s\S]*?return 1;/);
    expect(failReturn).toBeGreaterThan(-1);
    expect(failReturn).toBeLessThan(write);
    const guard = source.slice(0, write).lastIndexOf("if (result.changed)");
    expect(guard).toBeGreaterThan(failReturn);
    // 조건과 쓰기 사이에 블록이 닫히지 않는다 (쓰기가 그 조건 안에 있다)
    expect(source.slice(guard, write)).not.toContain("}");
  });

  it("W-1: 쓰기가 기록 모드에 묶이지 않는다 (받아들인 변형도 기록 모드 밖에서 반영된다)", () => {
    const write = source.search(/writeFileSync\(\s*CATALOG_PATH\(\)/);
    expect(source.slice(source.slice(0, write).lastIndexOf("if ("), write)).not.toMatch(
      /recordHashes/,
    );
  });

  it("W-2: 받아들인 변형마다 한 줄을 출력한다", () => {
    expect(source).toMatch(/for\s*\(\s*const \w+ of result\.accepted\s*\)/);
    expect(source).toContain("새 썸네일 변형을 받아들였다");
  });

  it("원본 조회는 실제 통로(realLookupJson)를 넘긴다", () => {
    expect(source).toMatch(/lookupJson:\s*realLookupJson/);
  });
});
