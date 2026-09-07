import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  checkPromptFile,
  checkSourceFile,
  checkWelcomeFile,
} from "../../scripts/constitution-rules";

/**
 * 환영 연출·작명 경계의 헌법 검사 테스트.
 *
 * 계약: specs/035-model-ready-welcome-naming/contracts/liveness.md L5·L7·L8·L9·L11
 *       welcome-gate.md W5·W14
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **위반을 주입해 방어가 실제로 잡는지 확인한다** — 007~034 전체의 관례다.
 * 규칙을 세우고 통과만 보면 "초록불인데 아무것도 검증되지 않은 상태"가 된다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const root = join(__dirname, "../..");

/** 주석을 걷어낸 코드만 검사한다 (011 `vision/engine.test.ts` 관례). */
function codeOf(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

describe("checkWelcomeFile — 지금 소스는 깨끗하다", () => {
  it.each(["src/welcome/liveness.ts", "src/welcome/naming.ts", "src/welcome/decision.ts"])(
    "%s 위반 0건",
    (path) => {
      expect(checkWelcomeFile(path, readFileSync(join(root, path), "utf8"))).toEqual([]);
    },
  );

  it("src/welcome/ 밖 파일은 이 규칙의 대상이 아니다", () => {
    // 다른 축이 프롬프트를 부르는 것은 정상이다 — 이 규칙은 welcome/만 본다.
    expect(
      checkWelcomeFile("src/diary/pipeline.ts", 'import { buildPrompt } from "./prompt";'),
    ).toEqual([]);
  });
});

describe("L5·L7·L11 — 위반 주입: 연출 계층이 제품 계층에 닿으면 잡힌다", () => {
  it.each([
    ["L7 프롬프트", 'import { buildPrompt } from "../diary/prompt";'],
    ["L7 접두사", 'import { promptPrefix } from "../diary/prompt";'],
    ["L5 일기 판정", 'import { judge } from "../diary/acceptance";'],
    ["L11 저장소", 'import type { DiaryStore } from "../diary/store";'],
    ["L11 엔트리", 'import type { DiaryEntry } from "../diary/types";'],
    ["원칙 III 로스터", 'import { assetFor } from "../models/roster";'],
    ["원칙 III 자산", 'import type { ModelAsset } from "../models/types";'],
  ])("%s 를 주입하면 잡는다", (_label, line) => {
    const violations = checkWelcomeFile("src/welcome/liveness.ts", line);
    expect(violations.length).toBeGreaterThan(0);
  });
});

describe("L2 — 위반 주입: 확인 결과가 시간·토큰을 담으면 잡힌다 (원칙 IV)", () => {
  it.each([
    ["경과 시간 필드", "export type LivenessOutcome = { kind: string; elapsedMs: number };"],
    ["측정 호출", "const started = Date.now();"],
    ["네이티브 지표", "const count = result.tokens_predicted;"],
    ["속도", "const rate = result.perSecond;"],
  ])("%s 를 주입하면 잡는다", (_label, line) => {
    expect(checkWelcomeFile("src/welcome/liveness.ts", line).length).toBeGreaterThan(0);
  });

  it("상한 상수 선언은 잡지 않는다 — 상한은 측정이 아니다", () => {
    expect(
      checkWelcomeFile("src/welcome/liveness.ts", "export const LIVENESS_TIMEOUT_MS = 60_000;"),
    ).toEqual([]);
    expect(
      checkWelcomeFile("src/welcome/liveness.ts", "run(input, { timeoutMs: 60_000 });"),
    ).toEqual([]);
  });
});

describe("L7 역방향 — 프롬프트가 연출 계층을 참조하면 잡힌다", () => {
  it("지금 prompt.ts는 깨끗하다", () => {
    const path = "src/diary/prompt.ts";
    expect(checkPromptFile(path, readFileSync(join(root, path), "utf8"))).toEqual([]);
  });

  it.each([
    ["import", 'import { LIVENESS_INPUT } from "../welcome/liveness";'],
    ["상수 참조", "const probe = LIVENESS_INPUT;"],
  ])("%s 를 주입하면 잡는다", (_label, line) => {
    expect(checkPromptFile("src/diary/prompt.ts", line).length).toBeGreaterThan(0);
  });

  it("다른 파일은 이 규칙의 대상이 아니다", () => {
    // App.tsx·wiring은 양쪽을 다 알아야 조립할 수 있다.
    expect(
      checkPromptFile("src/app/wiring.ts", 'import { LIVENESS_INPUT } from "../welcome/liveness";'),
    ).toEqual([]);
  });
});

describe("W14 — 위반 주입: 화면이 연출 판정 계층에 닿으면 잡힌다", () => {
  it.each([
    ["판정 import", 'import { judgeLiveness } from "../welcome/liveness";'],
    ["입력 상수", 'import { LIVENESS_INPUT } from "../welcome/liveness";'],
    ["게이트 판정", 'import { shouldShowWelcome } from "../welcome/decision";'],
    ["저장 통로", 'import { loadCustomNames } from "../welcome/names-port";'],
  ])("%s 를 주입하면 잡는다", (_label, line) => {
    expect(checkSourceFile("src/ui/WelcomeScreen.tsx", line).length).toBeGreaterThan(0);
  });

  it("src/app/는 대상이 아니다 — 조립부는 양쪽을 안다", () => {
    const line = 'import { judgeLiveness } from "../welcome/liveness";';
    const violations = checkSourceFile("src/app/wiring.ts", line);
    expect(violations.filter((v) => v.rule.includes("연출 판정"))).toEqual([]);
  });
});

describe("L8 — 확인 경로가 prewarm()을 쓰지 않는다", () => {
  it("src/welcome/ 소스에 prewarm이 없다", () => {
    // prewarm()은 반환값이 없어(018 E6) 성공/실패를 알 수 없다.
    for (const path of ["src/welcome/liveness.ts", "src/welcome/decision.ts"]) {
      expect(codeOf(path)).not.toMatch(/\bprewarm\b/);
    }
  });
});

describe("L9 — RunResult의 경계가 그대로다 (원칙 IV)", () => {
  it("engine-port.ts의 RunResult가 여전히 필드 둘이다", () => {
    const code = codeOf("src/inference/engine-port.ts");
    const declaration = code.slice(
      code.indexOf("export type RunResult"),
      code.indexOf("export type LoadResult"),
    );

    expect(declaration).toContain("text: string");
    expect(declaration).toContain("ending: Ending");
    expect(declaration).not.toMatch(/elapsed|duration|tokens|perSecond|ms\b|score/i);
  });
});
