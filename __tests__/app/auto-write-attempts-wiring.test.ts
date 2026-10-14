/**
 * 078 — 시도 기록의 조립부 배선 (소스 계약). App.tsx를 렌더하지 않는다(074 `AppFrame.firstrun.test.tsx`와 같은 방식).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const APP = readFileSync(join(__dirname, "../../App.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

/** `function Name(` 부터 다음 최상위 `function `·파일 끝까지 */
function functionBody(name: string): string {
  const start = APP.indexOf(`function ${name}(`);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = APP.slice(start + 1);
  const next = rest.search(/\nfunction [A-Za-z]/);
  return next < 0 ? rest : rest.slice(0, next);
}

describe("앱 열기 경로", () => {
  it("DiarySection이 판정 결과를 app-open 한 줄로 기록한다 — 판정의 now와 같은 시각, 갈래는 attemptOutcomeOf", () => {
    const section = functionBody("DiarySection");
    expect(section).toMatch(/const now = new Date\(\);/);
    expect(section).toMatch(/resolveAutoWrite\(\{\s*settings: autoDiarySettings,\s*now,/);
    expect(section).toMatch(
      /recordAttemptEnd\(attemptPort, "app-open", now, attemptOutcomeOf\(decision\)\)/,
    );
  });

  it("AppFrame이 통로 하나를 만들어 DiarySection에 넘긴다", () => {
    const frame = functionBody("AppFrame");
    expect(frame).toMatch(
      /const attemptPort = useMemo\(\(\) => expoAutoWriteAttemptPort\(\), \[\]\);/,
    );
    expect(frame).toMatch(/attemptPort=\{attemptPort\}/);
  });
});

describe("진단 화면", () => {
  it("DiagnosticsLayer가 실패 기록과 같은 시점에 읽어 attempts로 넘긴다", () => {
    const layer = functionBody("DiagnosticsLayer");
    expect(layer).toMatch(/loadAutoWriteAttempts\(attemptPort\)/);
    expect(layer).toMatch(/setAttempts\(attemptLines\(/);
    expect(layer).toMatch(/attempts=\{attempts\}/);
  });
});

describe("개발자 화면 (배포 빌드에서 보는 자리)", () => {
  it("AppFrame이 개발자 겹이 열릴 때 읽어 DeveloperScreen에 attempts로 넘긴다", () => {
    const frame = functionBody("AppFrame");
    expect(frame).toMatch(/loadAutoWriteAttempts\(attemptPort\)/);
    expect(frame).toMatch(/setDeveloperAttempts\(attemptLines\(/);
    expect(frame).toMatch(/attempts=\{developerAttempts\}/);
  });

  it("진단과 달리 showsDiagnostics에 묶이지 않는다 — 배포 빌드의 유일한 통로다", () => {
    const frame = functionBody("AppFrame");
    expect(frame).not.toMatch(/attempts=\{showsDiagnostics/);
  });
});

/* 081 — 개발자 화면의 「최근 실패」 (contracts/write-failure-reasons.md A1~A3) */
describe("081 — 개발자 화면이 실패 기록을 함께 읽는다", () => {
  it("A1 — AppFrame이 통로를 만들고 개발자 겹이 열릴 때 읽어 failures로 넘긴다", () => {
    const frame = functionBody("AppFrame");
    expect(frame).toMatch(/const failurePort = useMemo\(\(\) => expoWriteFailurePort\(\), \[\]\);/);
    expect(frame).toMatch(/loadWriteFailures\(failurePort\)/);
    expect(frame).toMatch(/setDeveloperFailures\(failureLines\(/);
    expect(frame).toMatch(/failures=\{developerFailures\}/);
  });

  it("A1 — 시도 기록과 같은 effect에서 읽는다(개발자 겹이 열릴 때만)", () => {
    const frame = functionBody("AppFrame");
    // 개발자 겹에 묶인 effect는 여럿이다(059 모듈 줄도 같은 조건이다) — 시도 기록을 읽는 것을 고른다
    const read = frame.indexOf("loadAutoWriteAttempts(attemptPort)");
    const start = frame.lastIndexOf('if (route !== "developer") return;', read);
    expect(start).toBeGreaterThan(-1);
    const body = frame.slice(start, frame.indexOf("}, [route", start));
    expect(body).toMatch(/loadAutoWriteAttempts\(attemptPort\)/);
    expect(body).toMatch(/loadWriteFailures\(failurePort\)/);
  });

  it("A2 — 상태를 바꾸는 자리마다 살아 있는가 검사가 앞선다", () => {
    const frame = functionBody("AppFrame");
    expect(frame).toMatch(/if \(alive\) setDeveloperFailures\(/);
    expect(frame).toMatch(/if \(alive\) setDeveloperAttempts\(/);
  });

  it("배포 빌드의 통로다 — showsDiagnostics에 묶이지 않는다", () => {
    expect(functionBody("AppFrame")).not.toMatch(/failures=\{showsDiagnostics/);
  });

  it("A3 — 진단 겹의 읽기는 그대로다", () => {
    const layer = functionBody("DiagnosticsLayer");
    expect(layer).toMatch(/loadWriteFailures\(failurePort\)/);
    expect(layer).toMatch(/setFailures\(failureLines\(/);
    expect(layer).toMatch(/failures=\{failures\}/);
  });
});
