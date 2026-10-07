/**
 * 064 — 상태 흉내 조립의 소스 계약 (contracts/simulation.md AF1~AF5, 「다섯 진입점이 차단을 본다」).
 *
 * `App.tsx`는 기기 통로를 만드는 조립부라 jest로 그리지 않는다 — 소스를 읽어 배선을 잠근다(055·060 관례). 주석은 걷어 낸다
 * (이 저장소의 주석은 금지하는 것을 설명하므로 금지어가 정당하게 나온다).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const code = (file: string) =>
  readFileSync(join(ROOT, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

const APP = code("App.tsx");
const HOME = code("src/ui/DiaryHomeScreen.tsx");
const TASK = code("src/schedule/task.ts");

/** `name = useCallback(...)` 또는 `function name(` 본문을 대략 잘라 낸다(다음 최상위 const까지) */
function block(source: string, start: RegExp): string {
  const at = source.search(start);
  expect(at).toBeGreaterThanOrEqual(0);
  const rest = source.slice(at);
  const end = rest.slice(1).search(/\n {2}const |\n {2}useEffect\(|\n {2}\/\*\*|\nfunction /);
  return end < 0 ? rest : rest.slice(0, end + 1);
}

describe("AF1 — 날짜 흉내가 홈의 고른 날을 옮긴다", () => {
  it("켜거나 바꾸면 그 날, 끄면 실제 오늘", () => {
    expect(APP).toMatch(/setChosenDay\(\s*date \?\? dayOf\(new Date\(\)\)\s*\)/);
  });

  it("앱을 열 때 저장된 날짜 흉내가 있으면 그 날을 고른다(앱을 열면 오늘이다 — 049)", () => {
    expect(APP).toMatch(/if \(loaded\.date !== null\) setChosenDay\(loaded\.date\);/);
    expect(APP).toMatch(/onLoaded: onSimulationLoaded/);
  });

  it("홈의 지금은 흉내 날짜로 만든다", () => {
    expect(APP).toMatch(/simulatedNow\(\s*simulationDate,\s*new Date\(\)\s*\)/);
  });
});

describe("AF2 — 개발자 메뉴를 끄면 흉내를 지운다", () => {
  it("onDisableDeveloper가 흉내를 지운다(simulationClear)", () => {
    expect(block(APP, /const onDisableDeveloper = useCallback/)).toMatch(/simulationClear\(\)/);
  });
});

describe("AF3 — 앱 열기 자동 쓰기의 claim", () => {
  const claim = () => block(APP, /const claimAutoWrite = useCallback/);

  it("흉내 기록을 읽기 전에는 판정하지 않는다", () => {
    expect(claim()).toMatch(/if \(!simulationLoaded\) return false;/);
  });

  it("막혀 있으면 한 번을 소모하고 거짓", () => {
    expect(claim()).toMatch(/autoWriteClaimed\.current = true;\s*return !writeBlocked;/);
    expect(APP).toMatch(/if \(writeBlocked\) autoWriteClaimed\.current = true;/);
  });
});

describe("AF4 — 자동 쓰기 판정은 흉내 미리보기를 보지 않는다", () => {
  it("resolveAutoWrite에 넘기는 통로는 실제 wiring.previewDay다", () => {
    expect(APP).toMatch(/const previewForAuto = wiring\.ok \? wiring\.previewDay : undefined;/);
    const auto = block(APP, /void resolveAutoWrite\(/);
    expect(auto).toMatch(/previewDay: previewForAuto/);
    expect(auto).not.toMatch(/simulat/i);
  });

  it("홈에만 흉내 미리보기를 넘긴다", () => {
    expect(APP).toMatch(
      /previewDay=\{homePreviewDay \?\? \(wiring\.ok \? wiring\.previewDay : undefined\)\}/,
    );
  });
});

describe("AF5 — 배포 환경에는 흉내가 없다", () => {
  it("흉내 훅은 개발 환경 판정으로만 켜진다", () => {
    expect(APP).toMatch(/useSimulation\(\{\s*devEnvironment: showsDiagnostics,/);
  });

  it("개발자 화면 묶음과 날짜 대화상자는 개발 환경일 때만", () => {
    expect(APP).toMatch(/simulation=\{\s*showsDiagnostics\s*\?/);
    expect(APP).toMatch(/\{showsDiagnostics && \(\s*<SimulationDateDialog/);
  });
});

describe("다섯 쓰기 진입점이 차단을 본다 (FR-012)", () => {
  it("① 홈 쓰기 바 — write() 맨 앞", () => {
    expect(HOME).toMatch(
      /const write = useCallback\(async \(\) => \{\s*if \(screen\.kind !== "list"\) return;\s*if \(writeBlocked\) \{\s*onWriteBlocked\?\.\(\);\s*return;/,
    );
  });

  it("② 앱 열기 자동 시작(057 effect)", () => {
    expect(HOME).toMatch(
      /if \(autoWriteDay == null \|\| claimAutoWrite === undefined\) return;\s*if \(writeBlocked\) return;/,
    );
  });

  it("③ 진단 쓰기 요청(060 effect)", () => {
    expect(HOME).toMatch(
      /if \(writeBlocked \|\| running\.current \|\| screen\.kind === "writing"\)/,
    );
  });

  it("④ 진단 두 버튼 — 조립부가 writeBlocked를 넘긴다", () => {
    expect(APP).toMatch(/<DiagnosticsLayer[\s\S]*?writeBlocked=\{writeBlocked\}/);
  });

  it("⑤ 백그라운드 — runAutoDiaryTask가 파이프라인 전에 끝낸다", () => {
    const at = TASK.indexOf("simulationBlocksWriting(simulation)");
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(TASK.indexOf("makePipeline(resolution"));
  });

  it("판정 함수는 하나다 — App.tsx도 simulationBlocksWriting으로 정한다", () => {
    expect(APP).toMatch(/const writeBlocked = simulationBlocksWriting\(simulation\.state\);/);
  });
});
