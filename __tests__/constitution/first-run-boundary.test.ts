import { readFileSync } from "node:fs";
import { join } from "node:path";

import { checkFirstRunFile } from "../../scripts/constitution-rules";

/**
 * 첫 실행 조율 계층 경계의 헌법 검사 테스트 (040, ★ 045가 G8을 제거).
 *
 * 계약: specs/040-onboarding-parallel-setup/contracts/first-run-gate.md G7
 *       (G8은 045에서 제거 — 아래 참고)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **위반을 주입해 방어가 실제로 잡는지 확인한다** — 021·035 전체의 관례다.
 * 규칙을 세우고 통과만 보면 "초록불인데 아무것도 검증되지 않은 상태"가 된다.
 *
 * **★ 045 — G8(시간·진행 지표 어휘 전면 금지)을 제거했다**(저장소 소유자
 * 지시, 2026-09-19). `resolveSlideStage()`가 `elapsedMs`를 순수 판정
 * 인자로 받는 설계와 옛 G8이 정면 충돌했다 — G8은 040이 "성능 임계값을
 * 코드에 두지 않는다"는 취지로 어휘 자체를 막았지만, 045의 경과 시간은
 * 성능 지표가 아니라 장식적 슬라이드 전환 타이머다(원칙 IV가 실제로
 * 막는 것은 진행 중 화면에 정밀한 시간·바이트·퍼센트를 노출하는 것).
 * `tokens_*`·`timings`는 여전히 `llama-port.ts` 경계가 별도로 막는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const root = join(__dirname, "../..");

describe("checkFirstRunFile — src/firstrun/ 밖 파일은 대상이 아니다", () => {
  it("다른 축이 파이프라인을 부르는 것은 정상이다 — 이 규칙은 firstrun/만 본다", () => {
    expect(
      checkFirstRunFile("src/app/wiring.ts", "pipeline.run({ day, now, character, vision });"),
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

describe("045 — G8 제거 이후: 경과 시간 어휘는 더 이상 잡히지 않는다", () => {
  it.each([
    ["경과 시간", "const elapsedMs = 1000;"],
    ["지속 시간", "const durationMs = end - start;"],
  ])("%s 는 firstrun/에서 더 이상 위반이 아니다(045)", (_label, line) => {
    expect(checkFirstRunFile("src/firstrun/consent.ts", line)).toEqual([]);
  });
});

describe("checkFirstRunFile — 지금 소스는 깨끗하다", () => {
  it.each([
    "src/firstrun/progress.ts",
    "src/firstrun/logo.ts",
    "src/firstrun/auto-diary.ts",
    "src/firstrun/consent.ts",
  ])("%s 위반 0건", (path) => {
    expect(checkFirstRunFile(path, readFileSync(join(root, path), "utf8"))).toEqual([]);
  });
});
