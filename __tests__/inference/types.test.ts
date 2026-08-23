import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * ProgressStage 계약 테스트.
 *
 * 계약: specs/015-writing-monologue/data-model.md 「ProgressStage」
 *       specs/015-writing-monologue/contracts/progress-signal.md
 *
 * 011의 `__tests__/vision/types.test.ts`와 같은 방식으로 소스 선언을 직접
 * 읽는다 — jest는 타입을 지우므로 `Object.keys()`로는 리터럴 유니온의
 * 갈래·필드 위반을 잡지 못한다(007 이후 관례).
 */

const SOURCE = readFileSync(join(__dirname, "../../src/inference/types.ts"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

function declarationOf(name: string): string {
  const asType = CODE.indexOf(`export type ${name} =`);
  const asInterface = CODE.indexOf(`export interface ${name} `);
  const start = asType >= 0 ? asType : asInterface;
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = CODE.slice(start);

  const nextExport = rest.indexOf("\nexport ", 1);
  const declaration = nextExport >= 0 ? rest.slice(0, nextExport) : rest;

  if (asType >= 0) {
    expect(declaration).toContain(`export type ${name} =`);
  } else {
    expect(declaration).toContain(`export interface ${name} `);
  }
  return declaration;
}

describe("ProgressStage — 문자열 리터럴 유니온뿐이다 (원칙 IV)", () => {
  const declaration = declarationOf("ProgressStage");

  it("갈래가 signals·vision·generation·load 넷이다 (016)", () => {
    const kinds = [...declaration.matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
    expect(kinds.sort()).toEqual(["generation", "load", "signals", "vision"]);
  });

  it("객체·필드를 담지 않는다 — 콜론이 없다", () => {
    // "export type ProgressStage =" 자체의 콜론은 없으므로, 필드 형태(key: type)가
    // 전혀 없어야 리터럴 유니온뿐이라고 말할 수 있다.
    expect(declaration).not.toMatch(/\{/);
  });

  it("숫자·Date를 가리키는 이름을 담지 않는다 (진행률 방지)", () => {
    const body = declaration.replace(/export type ProgressStage/, "");
    expect(body).not.toMatch(/number|Date|percent|index/i);
  });
});

describe("MonologueBranch — 문자열 리터럴 유니온뿐이다 (원칙 IV, 016 신설)", () => {
  const declaration = declarationOf("MonologueBranch");

  it("갈래가 cold·hot·normal·many 넷이다", () => {
    const kinds = [...declaration.matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
    expect(kinds.sort()).toEqual(["cold", "hot", "many", "normal"]);
  });

  it("객체·필드를 담지 않는다 — 콜론이 없다", () => {
    expect(declaration).not.toMatch(/\{/);
  });

  it("숫자·Date를 가리키는 이름을 담지 않는다 (진행률 방지)", () => {
    const body = declaration.replace(/export type MonologueBranch/, "");
    expect(body).not.toMatch(/number|Date|percent|index/i);
  });
});

describe("InferenceBackend.generate — onStage는 옵셔널 두 번째 인자이고 branch를 함께 받는다 (016)", () => {
  const declaration = declarationOf("InferenceBackend");

  it("generate가 onStage?: (stage: ProgressStage, branch?: MonologueBranch) => void를 받는다", () => {
    expect(declaration).toMatch(
      /onStage\?:\s*\(stage:\s*ProgressStage,\s*branch\?:\s*MonologueBranch\)\s*=>\s*void/,
    );
  });

  it("onStage가 필수 인자가 아니다 — 물음표가 있다", () => {
    const match = declaration.match(/generate\(([\s\S]*?)\):/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toMatch(/onStage\?:/);
  });
});
