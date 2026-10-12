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
