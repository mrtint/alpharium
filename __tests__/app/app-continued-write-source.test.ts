/**
 * 092 CW5·FR-008·FR-011 — `App.tsx`의 이어 쓰기 조립 소스 계약.
 *
 * 조립부는 기기 통로와 화면 겹이 얽혀 jest로 그리기 어렵다 — 「무엇을 어떤 순서·조건에서 하는가」를 소스에서 잠근다(주석을 걷은 뒤,
 * 058 `app-wipe-source.test.ts`와 같은 방식). 홈 쪽 동작은 `__tests__/ui/continued-write-home.test.tsx`가 그려서 본다.
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

describe("092 FR-011 — 세션은 iOS에서만 주입한다", () => {
  it("Platform.OS가 ios일 때만 createContinuedWrite(), 아니면 undefined", () => {
    expect(APP).toMatch(
      /const continuedWrite = useMemo\(\s*\(\) => \(Platform\.OS === "ios" \? createContinuedWrite\(\) : undefined\),\s*\[\],\s*\)/,
    );
    expect(APP).toMatch(/continuedWrite=\{continuedWrite\}/);
    expect(APP).toMatch(/onContinuedSaved=\{onContinuedSaved\}/);
    expect(APP.match(/createContinuedWrite\(/g)).toHaveLength(1);
  });
});

describe("092 CW5·FR-008 — 앱 밖 저장이면 맞추기 뒤 완성 알림", () => {
  it("홈의 저장 콜백은 notifyContinuedSaved 하나로만 간다 — 판정·순서는 continued-saved.ts(continued-saved.test.ts)", () => {
    const saved = body("const onContinuedSaved = useCallback(", "[characterNames],");
    expect(saved).toMatch(
      /notifyContinuedSaved\(day, character, characterNames, CONTINUED_SAVED_DEPS\)/,
    );
  });

  it("기기 통로: 앞 판정은 readLaunchState, 맞추기는 reconcileReminders, 알림은 sendCompletionNotification", () => {
    const deps = body("const CONTINUED_SAVED_DEPS: ContinuedSavedDeps = {", "};");
    expect(deps).toMatch(/launchState: \(\) => readLaunchState\(\)/);
    expect(deps).toMatch(
      /reconcile: \(names\) => reconcileReminders\(expoReminderDeps\(\{ names \}\)\)/,
    );
    expect(deps).toMatch(/notify: \(day, character, names\) =>\s*sendCompletionNotification\(/);
    const section = APP.slice(
      APP.indexOf("function DiarySection("),
      APP.indexOf("function SettingsSection("),
    );
    expect(section).not.toContain("CONTINUED_SAVED_DEPS: ContinuedSavedDeps");
  });

  it("task.ts가 완성 알림 함수를 내보낸다", () => {
    const task = strip(readFileSync(join(ROOT, "src/schedule/task.ts"), "utf8"));
    expect(task).toMatch(/export async function sendCompletionNotification\(/);
  });
});
