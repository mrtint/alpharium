/**
 * 060 — 진단 → 홈 조립 (소스 계약 TO1~TO3)과 쓰기 실패 기록 지점 (WF7).
 *
 * `App.tsx`·홈·태스크의 조립은 jest가 실제로 돌리지 못한다 — 소스를 읽어 「어디서 무엇을 부르는가」를 잠근다(주석은 먼저 걷는다, AGENTS).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (file: string) =>
  readFileSync(join(__dirname, "..", "..", file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

const APP = read("App.tsx");

/** `function Name(`부터 다음 최상위 `}`까지 */
function functionBody(name: string): string {
  const start = APP.indexOf(`function ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const end = APP.indexOf("\n}\n", start);
  return APP.slice(start, end);
}

describe("TO1 — 「지금 한 번 써 보기」는 세 겹을 닫고 홈에 쓰기 요청을 올린다", () => {
  const frame = functionBody("AppFrame");
  const at = frame.indexOf("const onDiagnosticsTryOnce = useCallback(");
  const fn = frame.slice(at, frame.indexOf("}, [", at));

  it("goHome()으로 설정·개발자·진단을 닫고 요청과 토스트를 올린다", () => {
    expect(at).toBeGreaterThan(-1);
    expect(fn).toMatch(/goHome\(\)/);
    expect(fn).toMatch(
      /setWriteRequest\(\{ id: writeRequestId\.current, day: dayOf\(new Date\(\)\) \}\)/,
    );
    expect(fn).toMatch(/showToast\(DIAGNOSTICS_TEXT\.tryOnceToast\)/);
  });

  it("goHome은 route·이름 바꾸기·진단 겹을 모두 닫는다", () => {
    const goHome = frame.slice(frame.indexOf("const goHome = useCallback("));
    const body = goHome.slice(0, goHome.indexOf("}, ["));
    expect(body).toMatch(/setRoute\("home"\)/);
    expect(body).toMatch(/setDiagnosing\(false\)/);
    expect(body).toMatch(/setRenaming\(false\)/);
  });

  it("요청 번호는 증가식이고(같은 번호로 두 번 시작하지 않는다) 홈이 시작·거절하면 비운다", () => {
    expect(frame).toMatch(/writeRequestId\.current \+= 1/);
    expect(frame).toMatch(/onWriteRequestHandled = useCallback\(/);
    expect(frame).toMatch(/request\?\.id === id \? null : request/);
  });

  it("홈에 writeRequest·onWriteRequestHandled를 넘기고 DiarySection이 홈에 전한다", () => {
    expect(frame).toMatch(/writeRequest=\{writeRequest\}/);
    expect(frame).toMatch(/onWriteRequestHandled=\{onWriteRequestHandled\}/);
    const section = functionBody("DiarySection");
    expect(section).toMatch(/writeRequest=\{writeRequest\}/);
    expect(section).toMatch(/onWriteRequestHandled=\{onWriteRequestHandled\}/);
  });
});

describe("TO2 — 토스트는 진단 겹 안이 아니라 AppFrame 루트에서 그려진다", () => {
  it("DeveloperToast가 진단 StackLayer 밖에 있다", () => {
    const frame = functionBody("AppFrame");
    const guard = frame.indexOf("{showsDiagnostics && (");
    expect(guard).toBeGreaterThan(-1);
    const guardEnd = frame.indexOf("</StackLayer>", guard);
    expect(frame.slice(guard, guardEnd)).not.toContain("DeveloperToast");
    expect(frame.indexOf("<DeveloperToast")).toBeGreaterThan(guardEnd);
  });

  it("홈에서는 하단 바 위로 올린다(HOME_TOAST_BOTTOM)", () => {
    expect(APP).toMatch(/const toastBottom = route !== "home" \? 24 : HOME_TOAST_BOTTOM;/);
    expect(APP).toMatch(/bottom=\{toastBottom\}/);
  });
});

describe("TO3 — 진단은 파이프라인을 만들지 않는다", () => {
  it("DiagnosticsLayer에 createAppPipeline·GenerationProbe·pipeline.run이 없다", () => {
    const layer = functionBody("DiagnosticsLayer");
    expect(layer).not.toMatch(/createAppPipeline|GenerationProbe|pipeline\.run|\.generate\(/);
  });

  it("자동 쓰기 지금 실행은 runAutoDiaryTask({ manual: true })다", () => {
    expect(functionBody("DiagnosticsLayer")).toMatch(/runAutoDiaryTask\(\{ manual: true \}\)/);
  });

  it("미리보기 캐릭터는 식별자를 직접 적는다(목록 순서에 기대지 않는다, 037)", () => {
    expect(APP).toMatch(/const PREVIEW_CHARACTER: Character = "quiet";/);
    expect(functionBody("DiagnosticsLayer")).not.toMatch(/CHARACTERS\[/);
  });

  it("DS11 — 늦게 온 결과는 화면이 닫힌 뒤(언마운트)에는 상태를 바꾸지 않는다", () => {
    const layer = functionBody("DiagnosticsLayer");
    // cleanup이 alive를 내리고, 비동기 결과로 상태를 바꾸는 자리마다 alive 검사가 앞선다
    expect(layer).toMatch(/alive\.current = false/);
    for (const setter of ["setReport", "setPhoto", "setProbe", "setInspection", "setFailures"]) {
      const calls = [...layer.matchAll(new RegExp(setter + "\\(", "g"))];
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) {
        const before = layer.slice(Math.max(0, (call.index ?? 0) - 40), call.index);
        expect(before).toMatch(/alive\.current\)\s*$/);
      }
    }
  });

  it("값은 열 때와 「다시 읽기」에서만 읽는다 — 타이머·AppState가 없다", () => {
    const layer = functionBody("DiagnosticsLayer");
    expect(layer).not.toMatch(/AppState|setInterval|setTimeout/);
  });
});

describe("WF7 — 쓰기 실패 기록 지점 셋", () => {
  const home = read("src/ui/DiaryHomeScreen.tsx");
  const task = read("src/schedule/task.ts");
  const wiring = read("src/app/wiring.ts");

  it("홈 generate: 그만두기(시도별 isCancelled)를 거른 뒤에 recordFailure를 부른다 — 홈은 기록 통로를 모른다", () => {
    // 071 — 그만두었는가는 시도별 번호로 가린다(불리언 `cancelled` 하나가 아니다 — 새 시도가 되돌려 거짓 실패가 기록됐다, SE-2).
    // 마지막 `isCancelled()` 거름(파이프라인이 끝난 뒤의 것)이 기록보다 앞서야 한다 — 앞쪽 것은 앞 시도를 기다린 뒤의 거름이다.
    const cancelled = home.lastIndexOf("if (isCancelled()) return;");
    const record = home.indexOf("recordFailure?.(result)");
    expect(cancelled).toBeGreaterThan(-1);
    expect(record).toBeGreaterThan(cancelled);
    expect(home).not.toContain("write-failures");
  });

  it("조립부가 홈의 recordFailure에 recordWriteFailure를 연결한다", () => {
    const section = functionBody("DiarySection");
    expect(section).toMatch(/recordFailure=\{recordFailure\}/);
    expect(section).toMatch(/recordWriteFailure\(failurePort, result, new Date\(\)\)/);
  });

  it("태스크: already-running을 skipped로 돌리기 전에 기록하고 예상 못 한 예외도 기록한다", () => {
    const record = task.indexOf(
      "await recordWriteFailure(deps.failurePort ?? expoWriteFailurePort(), result, now)",
    );
    const mapped = task.indexOf('result.stage === "already-running"');
    expect(record).toBeGreaterThan(-1);
    expect(record).toBeLessThan(mapped);
    expect(task).toMatch(/stage: "unexpected"/);
  });

  it("첫 실행 자동 첫 일기: 결과를 받아 기록한다", () => {
    const fn = wiring.slice(wiring.indexOf("export async function triggerFirstRunAutoDiary("));
    expect(fn).toMatch(
      /recordWriteFailure\(deps\.failurePort \?\? expoWriteFailurePort\(\), result, input\.now\)/,
    );
  });

  it("WF9 — 파이프라인·일기 지우기는 이 모듈을 import하지 않는다", () => {
    expect(read("src/diary/pipeline.ts")).not.toContain("write-failures");
    expect(read("src/app/wipe-diaries.ts")).not.toContain("write-failures");
  });
});
