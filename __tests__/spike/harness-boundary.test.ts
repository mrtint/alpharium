/**
 * 계약: specs/019-background-diary-feasibility/contracts/background-harness.md
 *
 * H1(제품 계층을 수정하지 않는다)과 H2(pipeline.run()을 우회하지 않는다)를
 * jest가 아니라 소스 문자열 검사로 확인한다 — 007·009 관례. jest는 타입을
 * 지우므로 "콜백이 pipeline.run() 대신 backend.generate()를 직접 부른다"
 * 같은 구조적 위반은 런타임 동작 테스트로 잡기 어렵다.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

const HARNESS_PATH = path.join(__dirname, "../../src/spike/background-diary-task.ts");

/**
 * 소스에서 주석을 걷어내고 돌려준다 — 설명 문구("backend.generate()를
 * 직접 부르지 않는다" 같은 JSDoc 예시)가 코드 검사와 혼동되지 않게 한다.
 * `scripts/constitution-rules.ts`가 이미 쓰는 것과 같은 접근이다.
 */
function readHarnessCode(): string {
  const source = readFileSync(HARNESS_PATH, "utf8");
  return source
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/\/\/.*$/, "")
        .replace(/^\s*\*.*$/, "")
        .replace(/^\s*\/\*\*?.*$/, ""),
    )
    .join("\n");
}

describe("background-diary-task.ts 소스 경계 (H1·H2)", () => {
  test("pipeline.run()과 createAppPipeline()을 호출한다", () => {
    const source = readHarnessCode();
    expect(source).toMatch(/pipeline\.run\(/);
    expect(source).toMatch(/createAppPipeline\(/);
  });

  test("backend.generate()를 직접 호출하지 않는다 (H2)", () => {
    const source = readHarnessCode();
    expect(source).not.toMatch(/backend\.generate\(/);
  });

  test("acceptance.ts의 판정 함수를 직접 참조하지 않는다 (H2)", () => {
    const source = readHarnessCode();
    expect(source).not.toMatch(/from ["']..\/diary\/acceptance["']/);
    expect(source).not.toMatch(/\bjudge\(/);
  });

  test("제품 계층(store/roster/prompt)을 import하지 않는다 (H1)", () => {
    const source = readHarnessCode();
    expect(source).not.toMatch(/from ["']..\/diary\/store["']/);
    expect(source).not.toMatch(/from ["']..\/models\/roster["']/);
    expect(source).not.toMatch(/from ["']..\/diary\/prompt["']/);
  });

  test("최상위 try/catch에서 threw 이벤트를 기록한다 (H4)", () => {
    const source = readHarnessCode();
    expect(source).toMatch(/outcome:\s*["']threw["']/);
  });
});
