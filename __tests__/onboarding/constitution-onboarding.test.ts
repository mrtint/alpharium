import { checkOnboardingFile } from "../../scripts/constitution-rules";

/**
 * `checkOnboardingFile`의 위반 주입 테스트 (021, 007~020 관례).
 *
 * 계약: specs/021-unified-permission-onboarding/contracts/onboarding-flag.md F5·F8
 *       specs/021-unified-permission-onboarding/plan.md Constitution Check
 *       research.md §8
 *
 * **새 규칙을 세울 때마다 실제로 어겨 보고 검사가 잡는지 확인한다**(AGENTS.md).
 * 규칙 자체는 `constitution-rules.ts`에 있고, 이 테스트는 그 동작을 잠근다.
 */

describe("checkOnboardingFile — 제품 계층·schedule 접촉 (원칙 III·IV)", () => {
  it("src/onboarding/이 아니면 아무것도 잡지 않는다", () => {
    expect(checkOnboardingFile("src/ui/Foo.tsx", 'import x from "../diary/prompt";')).toEqual([]);
    expect(
      checkOnboardingFile("src/schedule/decision.ts", 'import x from "../diary/prompt";'),
    ).toEqual([]);
  });

  it("onboarding/이 diary/prompt를 import하면 잡는다", () => {
    const v = checkOnboardingFile(
      "src/onboarding/decision.ts",
      'import { buildPrompt } from "../diary/prompt";',
    );
    expect(v).toHaveLength(1);
    expect(v[0].file).toBe("src/onboarding/decision.ts:1");
  });

  it("onboarding/이 diary/acceptance를 import하면 잡는다", () => {
    const v = checkOnboardingFile(
      "src/onboarding/decision.ts",
      'import { judge } from "../diary/acceptance";',
    );
    expect(v).toHaveLength(1);
  });

  it("onboarding/이 models/roster를 import하면 잡는다", () => {
    const v = checkOnboardingFile(
      "src/onboarding/requirements.ts",
      'import { assetFor } from "../models/roster";',
    );
    expect(v).toHaveLength(1);
  });

  it("onboarding/이 schedule/settings를 import하면 잡는다 (경계 — flag는 auto-diary.json을 직접 읽는다)", () => {
    const v = checkOnboardingFile(
      "src/onboarding/flag.ts",
      'import { loadAutoDiarySettings } from "../schedule/settings";',
    );
    expect(v.length).toBeGreaterThanOrEqual(1);
  });

  it("onboarding/이 backend.generate()를 부르면 잡는다", () => {
    const v = checkOnboardingFile(
      "src/onboarding/decision.ts",
      "const r = await backend.generate(day, character);",
    );
    expect(v).toHaveLength(1);
  });

  it("주석 안의 언급은 잡지 않는다", () => {
    const v = checkOnboardingFile(
      "src/onboarding/decision.ts",
      "// 이 파일은 diary/prompt를 import하지 않는다\n/* models/roster 도 마찬가지 */",
    );
    expect(v).toEqual([]);
  });

  it("정상 소스는 위반 0건", () => {
    const clean = [
      'import type { PermissionState } from "../signals/port";',
      'import { PERMISSION_REQUIREMENTS } from "./requirements";',
      "export function shouldShowOnboarding(flag) { return flag.completed !== true; }",
    ].join("\n");
    expect(checkOnboardingFile("src/onboarding/decision.ts", clean)).toEqual([]);
  });
});

describe("checkOnboardingFile — flag.ts 이력 금지 (원칙 IV)", () => {
  it("flag.ts에 new Date()가 있으면 잡는다", () => {
    const v = checkOnboardingFile("src/onboarding/flag.ts", "const now = new Date();");
    expect(v.length).toBeGreaterThanOrEqual(1);
    expect(v.some((x) => /이력·타임스탬프/.test(x.rule))).toBe(true);
  });

  it("flag.ts에 timestamp·history·count 토큰이 있으면 잡는다", () => {
    expect(
      checkOnboardingFile("src/onboarding/flag.ts", "type F = { timestamp: number };").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      checkOnboardingFile("src/onboarding/flag.ts", "const history = [];").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      checkOnboardingFile("src/onboarding/flag.ts", "let count = 0;").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("decision.ts의 Date는 이력 규칙 대상이 아니다 (flag.ts에만 적용)", () => {
    // decision.ts는 D1(순수성) 계약이 new Date를 따로 막지만, 이력 규칙은 flag 전용.
    const v = checkOnboardingFile("src/onboarding/decision.ts", "const x = 1; // count 라는 단어");
    expect(v).toEqual([]);
  });

  it("flag.ts 정상 소스 (boolean 2개)는 위반 0건", () => {
    const clean = [
      "export type OnboardingFlag = { completed: boolean; batteryNoticeShown: boolean };",
      "export const DEFAULT_ONBOARDING_FLAG = { completed: false, batteryNoticeShown: false };",
    ].join("\n");
    expect(checkOnboardingFile("src/onboarding/flag.ts", clean)).toEqual([]);
  });
});
