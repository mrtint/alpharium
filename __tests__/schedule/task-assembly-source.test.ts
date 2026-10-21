/**
 * 079 — 백그라운드 자동 쓰기의 조립은 한 곳이고, 수동 실행을 위한 갈래가 없다
 * (specs/079-bg-auto-write-threads/contracts/assembly.md A9, FR-004).
 *
 * 진단의 「자동 쓰기 지금 실행」은 백그라운드 자동 쓰기와 같은 조건으로 돌아야 한다 — 검증 경로가
 * 제품 경로와 다르면 그 검증은 제품을 재현하지 못한다(042). `runAutoDiaryTask`가 파이프라인을
 * `lockOwner: "background"`로 조립하면 잠금 주체도, 모델을 여는 스레드 수도, 생성 시간 한도도
 * 백그라운드 값이 된다(`inference/assembly.ts`).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const code = readFileSync(join(__dirname, "../../src/schedule/task.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

describe("079 A9 — 자동 쓰기 태스크의 파이프라인 조립", () => {
  it("조립은 한 곳이다", () => {
    expect(code.match(/makePipeline\(/g)).toHaveLength(1);
  });

  it("조립 함수를 직접 부르지 않는다 — 주체 없이 부르면 화면 값으로 조립된다", () => {
    expect(code).toMatch(/const makePipeline = deps\.makePipeline \?\? createAppPipeline;/);
    expect(code).not.toMatch(/createAppPipeline\(/);
  });

  it("백그라운드 주체로 조립한다", () => {
    // 091 — 깬 요청(wake)이 있으면 함께 싣는다
    expect(code).toMatch(
      /makePipeline\(resolution,\s*\{\s*lockOwner:\s*"background",\s*\.\.\.\(wake === undefined \? \{\} : \{ wake \}\),?\s*\}\)/,
    );
  });

  it("주체를 수동 실행 여부로 가르지 않는다", () => {
    const lines = code.split("\n").filter((line) => line.includes("lockOwner"));
    expect(lines).toHaveLength(1);
    expect(lines.join("\n")).not.toMatch(/manual|"screen"/);
  });
});
