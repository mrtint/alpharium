import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * LoadResult 계약 테스트 (016).
 *
 * 계약: specs/016-writing-monologue-expansion/data-model.md 「LoadResult (확장)」
 *       specs/016-writing-monologue-expansion/contracts/load-signal.md
 *
 * jest는 타입을 지우므로 소스 선언을 직접 읽어 검사한다(007 이후 관례,
 * __tests__/inference/types.test.ts와 같은 방식).
 */

const SOURCE = readFileSync(join(__dirname, "../../src/inference/engine-port.ts"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

function declarationOf(name: string): string {
  const asType = CODE.indexOf(`export type ${name} =`);
  expect(asType).toBeGreaterThanOrEqual(0);
  const rest = CODE.slice(asType);
  const nextExport = rest.indexOf("\nexport ", 1);
  const declaration = nextExport >= 0 ? rest.slice(0, nextExport) : rest;
  expect(declaration).toContain(`export type ${name} =`);
  return declaration;
}

describe("LoadResult — { ok: true }에 warm이 있다, { ok: false }는 그대로다 (016)", () => {
  const declaration = declarationOf("LoadResult");

  it("{ ok: true } 갈래가 warm: boolean 필드를 갖는다", () => {
    expect(declaration).toMatch(/\{\s*ok:\s*true;\s*warm:\s*boolean\s*\}/);
  });

  it("{ ok: false } 갈래는 여전히 reason만 갖는다", () => {
    expect(declaration).toMatch(
      /\{\s*ok:\s*false;\s*reason:\s*"not-found"\s*\|\s*"load-failed"\s*\}/,
    );
  });

  it("{ ok: false } 갈래에 warm이 없다 — 실패에는 콜드/핫이 의미가 없다", () => {
    const falseBranch = declaration.match(/\{\s*ok:\s*false;[^}]*\}/)?.[0] ?? "";
    expect(falseBranch).not.toMatch(/warm/);
  });

  it("시간·모델명 등 다른 필드를 담지 않는다 (원칙 III·IV)", () => {
    expect(declaration).not.toMatch(/loadTimeMs|duration|modelName|model:/);
  });
});
