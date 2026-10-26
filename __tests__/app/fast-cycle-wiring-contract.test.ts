/**
 * 106 — 조립부(`App.tsx`)의 빠른 주기 배선을 소스로 잠근다 (contracts/cycle-reset.md CR8·CR9·CR11 · spec FR-013a·FR-014).
 *
 * `App.tsx`는 직접 그리기 어려운 큰 조립부라(082가 훅을 떼어 낸 이유와 같다) 배선은 소스 계약으로, 동작은 `use-fast-cycle`·
 * `fast-cycle-reset`·`use-auto-write-handoff` 테스트가 잠근다. 주석을 먼저 걷어내고 읽는다(AGENTS).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const APP = readFileSync(join(__dirname, "../../App.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

describe("빠른 주기 배선", () => {
  it("개발 환경 판정은 allowsFastCycle(environment)이다 — process.env를 직접 읽지 않는다", () => {
    expect(APP).toMatch(/const fastCycleAllowed = allowsFastCycle\(environment\);/);
    expect(APP).not.toMatch(/process\.env/);
  });

  it("리셋 클로저는 App에서만 만들고 devEnvironment에 fastCycleAllowed를 쓴다 (FL3)", () => {
    expect(APP).toMatch(/createFastCycleResetter\(/);
    expect(APP).toMatch(/devEnvironment: fastCycleAllowed/);
  });

  it("useFastCycle이 개발 환경 가드와 켜기·끄기 뒤 묶음(onChanged)을 받는다", () => {
    expect(APP).toMatch(/useFastCycle\(\{[\s\S]*?devEnvironment: fastCycleAllowed,/);
    expect(APP).toMatch(/onChanged: onFastCycleChanged/);
  });

  it("켜기·끄기·주기 변경 뒤: 잡 재등록(켜져 있을 때만)·쓸 차례 알림 맞추기·앱 열기 「한 번」 다시 열기 (FR-014·FR-009c)", () => {
    const changed = APP.slice(APP.indexOf("const onFastCycleChanged = useCallback("));
    const block = changed.slice(0, changed.indexOf("const fastCycle = useFastCycle("));
    expect(block).toMatch(/backgroundPort\.reschedule\(\)/);
    expect(block).toMatch(/reconcileReminders\(/);
    expect(block).toMatch(/rearmAutoWriteRef\.current\(\)/);
  });

  it("앱 열기 판정 훅에 리셋·시간 규칙 읽기·onCycleReset(rearm)을 넘긴다 (CR9)", () => {
    expect(APP).toMatch(/resetFastCycle=\{resetFastCycle\}/);
    expect(APP).toMatch(/loadFastCycleTiming=\{loadFastCycleTiming\}/);
    expect(APP).toMatch(/onCycleReset=\{rearmAutoWrite\}/);
    expect(APP).toMatch(/resetFastCycle,\s*onCycleReset,\s*loadTiming: loadFastCycleTiming,/);
  });

  it("합류한 쓰기가 실패하면 rearm으로 「한 번」을 한 번 다시 연다 (080 잔여 ④)", () => {
    expect(APP).toMatch(/onJoinedWriteFailed=\{rearmAutoWrite\}/);
    expect(APP).toMatch(/onJoinedWriteFailed=\{onJoinedWriteFailed\}/);
  });

  it("개발자 메뉴를 끄면 빠른 주기도 꺼진다 (FR-013a)", () => {
    const off = APP.slice(APP.indexOf("const onDisableDeveloper = useCallback("));
    const block = off.slice(0, off.indexOf("[developer, simulationClear"));
    expect(block).toMatch(/fastCycleDisable\(\)/);
  });

  it("개발자 화면의 묶음은 개발 환경에서만 넘기고(fastCycleSection) 진단 한 줄은 켜졌을 때만이다", () => {
    expect(APP).toMatch(/fastCycle=\{fastCycleSection\}/);
    expect(APP).toMatch(/if \(!fastCycleAllowed\) return undefined;/);
    expect(APP).toMatch(
      /fastCycle\.record === null\s*\?\s*undefined\s*:\s*text\(\)\.fastCycle\.diagLine/,
    );
    expect(APP).toMatch(/fastCycleLine=\{fastCycleLine\}/);
  });

  it("fastCycleSection은 useMemo로 시각을 고정하지 않는다 — 열린 화면의 지금 주기·다음 시작이 낡지 않게 (US5 AS1)", () => {
    expect(APP).not.toMatch(/const fastCycleSection = useMemo\(/);
    expect(APP).toMatch(/const fastCycleSection = \(\(\) => \{/);
  });

  it("켜기 확인창은 pendingEnable이 있을 때만 그린다 (FR-009)", () => {
    expect(APP).toMatch(/fastCycle\.pendingEnable !== null && \(\s*<FastCycleConfirmDialog/);
  });
});
