/**
 * 059 — 「온보딩부터 다시」 조립의 소스 계약.
 *
 * 계약: specs/059-developer-menu/contracts/developer-menu.md OB3·OB4, research R6·R7
 *
 * 게이트 판정 자체는 `__tests__/app/onboarding-gate.test.ts`가 잠근다. 여기서는 핸들러가 **쓰는 중인 홈을 먼저 멈추고**, 로고가 다시 나오도록
 * 세 상태를 모두 건드리며, 일기·이름·설정·모듈에 닿지 않는지를 본다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const APP = strip(readFileSync(join(ROOT, "App.tsx"), "utf8"));

function body(start: string, end: string): string {
  const from = APP.indexOf(start);
  expect(from).toBeGreaterThan(0);
  const to = APP.indexOf(end, from + start.length);
  expect(to).toBeGreaterThan(from);
  return APP.slice(from, to);
}

describe("OB3 — 핸들러", () => {
  const handler = () => body("const onReplayOnboarding = useCallback(", "}, [");

  it("await stopHome() 뒤에 세 상태를 모두 건드리고 홈으로 간다", () => {
    const fn = handler();
    const stop = fn.indexOf("await stopHome()");
    expect(stop).toBeGreaterThan(0);
    for (const call of [
      "setForceOnboarding(true)",
      "setPermissionStepsDecidedThisSession(false)",
      "setOnboardingStarted(false)",
      "goHome()",
    ]) {
      expect(fn.indexOf(call)).toBeGreaterThan(stop);
    }
  });

  it("권한 단계가 모두 끝나면 force 를 끈다", () => {
    const fn = body("const onAllPermissionStepsDecided = useCallback(", "}, [");
    expect(fn).toMatch(/setForceOnboarding\(false\)/);
  });

  it("게이트 계산이 onboarding-gate 의 함수를 쓴다(옛 식으로 되돌리지 않는다)", () => {
    expect(APP).toMatch(/from "\.\/src\/app\/onboarding-gate"/);
    expect(APP).toMatch(/permissionStepsDecided\(\{/);
    expect(APP).toMatch(/onboardingGateNeeded\(\{/);
    expect(APP).not.toMatch(/onboardingFlag\?\.completed === true;/);
  });
});

describe("OB4 — 일기·이름·설정·모듈에 닿지 않는다", () => {
  it("핸들러에 지우기·저장 어휘가 없다", () => {
    const fn = body("const onReplayOnboarding = useCallback(", "}, [");
    expect(fn).not.toMatch(/removeAll|saveCustomNames|saveAutoDiarySettings|\.remove\(|\.delete\(/);
  });
});
