import { readFileSync } from "node:fs";
import { join } from "node:path";

import { checkFirstRunFile } from "../../scripts/constitution-rules";

/**
 * 첫 실행 조율 계층 경계의 헌법 검사 테스트 (040).
 *
 * 계약: specs/040-onboarding-parallel-setup/contracts/first-run-gate.md G7·G8
 *       tasks.md T003
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **위반을 주입해 방어가 실제로 잡는지 확인한다** — 021·035 전체의 관례다.
 * 규칙을 세우고 통과만 보면 "초록불인데 아무것도 검증되지 않은 상태"가 된다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const root = join(__dirname, "../..");

describe("checkFirstRunFile — src/firstrun/ 밖 파일은 대상이 아니다", () => {
  it("다른 축이 파이프라인을 부르는 것은 정상이다 — 이 규칙은 firstrun/만 본다", () => {
    expect(
      checkFirstRunFile("src/app/wiring.ts", 'pipeline.run({ day, now, character, vision });'),
    ).toEqual([]);
  });
});

describe("G7 — 위반 주입: 제품 계층 직접 import를 잡는다 (원칙 III)", () => {
  it.each([
    ["로스터", 'import { assetFor } from "../models/roster";'],
    ["자산 타입", 'import type { ModelAsset } from "../models/types";'],
    ["프롬프트", 'import { buildPrompt } from "../diary/prompt";'],
    ["판정", 'import { judge } from "../diary/acceptance";'],
  ])("%s 를 주입하면 잡는다", (_label, line) => {
    const violations = checkFirstRunFile("src/firstrun/progress.ts", line);
    expect(violations.length).toBeGreaterThan(0);
  });
});

describe("G7 — 위반 주입: pipeline.run() 직접 호출을 잡는다", () => {
  it("firstrun/ 안에서 pipeline.run(...)을 직접 부르면 잡는다", () => {
    const violations = checkFirstRunFile(
      "src/firstrun/auto-diary.ts",
      "await pipeline.run({ day, now, character, vision });",
    );
    expect(violations.length).toBeGreaterThan(0);
  });

  it("타입 참조만 하는 것은 잡지 않는다", () => {
    expect(
      checkFirstRunFile(
        "src/firstrun/auto-diary.ts",
        'import type { Pipeline } from "../diary/pipeline";',
      ),
    ).toEqual([]);
  });
});

describe("G8 — 위반 주입: 시간·진행 지표 토큰을 잡는다 (원칙 IV)", () => {
  it.each([
    ["경과 시간", "const elapsedMs = 1000;"],
    ["측정 호출", "const started = Date.now();"],
    ["성능 API", "const t = performance.now();"],
    ["네이티브 지표", "const count = result.tokens_predicted;"],
    ["지속 시간", "const durationMs = end - start;"],
    ["timings", "const t = result.timings;"],
  ])("%s 를 주입하면 잡는다", (_label, line) => {
    expect(checkFirstRunFile("src/firstrun/progress.ts", line).length).toBeGreaterThan(0);
  });
});

describe("checkFirstRunFile — 지금 소스는 깨끗하다", () => {
  it.each(["src/firstrun/progress.ts", "src/firstrun/logo.ts", "src/firstrun/auto-diary.ts"])(
    "%s 위반 0건",
    (path) => {
      expect(checkFirstRunFile(path, readFileSync(join(root, path), "utf8"))).toEqual([]);
    },
  );
});
