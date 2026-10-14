/**
 * 057 — `App.tsx` 조립의 소스 계약 (자동 쓰기 규칙).
 *
 * 계약: specs/057-auto-write-rules/contracts/auto-write.md SL3·OP1·OP6·OP7
 *
 * 조립부는 기기 통로와 화면 겹이 얽혀 jest로 그리기 어렵다 — 「무엇을 어떤 조건에서 넘기는가」를 소스에서 잠근다
 * (주석을 걷은 뒤 — 이 저장소의 주석은 금지된 것을 설명하므로 금지어가 정당하게 나온다).
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const APP = strip(readFileSync(join(ROOT, "App.tsx"), "utf8"));
// 082 — 「한 번」과 넘겨 둔 날은 `src/app/`의 훅 둘로 옮겨졌다. 조립부가 잠그던 것을 그 파일들에서 잠근다.
const CLAIM = strip(readFileSync(join(ROOT, "src/app/use-auto-write-claim.ts"), "utf8"));
const HANDOFF = strip(readFileSync(join(ROOT, "src/app/use-auto-write-handoff.ts"), "utf8"));

describe("SL3 — 건너뜀 보조 줄은 사진 꼬리표가 「허용 안 함」일 때만", () => {
  it("photoSkipText를 denied 조건 아래에서만 넘긴다", () => {
    expect(APP).toMatch(
      /skippedDay !== null && permissionTags\.photos === "denied"\s*\?\s*\{\s*photoSkipText: skippedLineText\(/,
    );
    expect(APP.match(/photoSkipText/g)).toHaveLength(1);
  });

  it("기록은 사진 권한이 granted·limited일 때만 지운다 (읽지 못하면 지우지 않는다)", () => {
    expect(APP).toMatch(
      /if \(permission === "granted" \|\| permission === "limited"\) \{\s*await clearSkippedDay\(/,
    );
    expect(APP.match(/clearSkippedDay\(/g)).toHaveLength(1);
  });
});

describe("OP1 — 앱 열기 자동 쓰기의 문", () => {
  it("claimAutoWrite가 040 첫 실행 표식과 이미 시작했는가를 읽는다", () => {
    expect(CLAIM).toMatch(
      // 064 — 흉내 기록을 읽기 전에는 판정하지 않고, 흉내 중이면 한 번을 소모하고 거짓이다(simulation-wiring AF3)
      /const claimAutoWrite = useCallback\(\(\) => \{\s*if \(!simulationLoaded\) return false;\s*if \(firstRunTried\.current \|\| claimed\.current\) return false;\s*claimed\.current = true;\s*return !writeBlocked;/,
    );
  });

  it("조립부가 040의 autoGenerateTried를 첫 실행 표식으로 넘긴다", () => {
    expect(APP).toMatch(
      /useAutoWriteClaim\(\{\s*simulationLoaded: simulation\.loaded,\s*writeBlocked,\s*firstRunTried: autoGenerateTried,\s*\}\)/,
    );
    expect(APP.match(/useAutoWriteClaim\(/g)).toHaveLength(1);
  });

  it("판정은 DiarySection이 훅을 거쳐 resolveAutoWrite로 한다 (백그라운드와 같은 판정)", () => {
    const section = APP.slice(APP.indexOf("function DiarySection("));
    expect(section).toMatch(/useAutoWriteHandoff\(\{/);
    expect(APP.match(/useAutoWriteHandoff\(/g)).toHaveLength(1);
    expect(HANDOFF).toMatch(/resolveAutoWrite\(\{/);
    expect(HANDOFF.match(/resolveAutoWrite\(/g)).toHaveLength(1);
    // WP6 — 조립부는 판정을 직접 부르지 않는다.
    expect(APP).not.toMatch(/resolveAutoWrite/);
  });

  it("WP4 — 훅이 돌려준 값이 그대로 홈의 autoWriteDay로 간다", () => {
    const section = APP.slice(APP.indexOf("function DiarySection("));
    expect(section).toMatch(/const autoWriteDay = useAutoWriteHandoff\(\{/);
    expect(section).toMatch(/autoWriteDay=\{autoWriteDay\}/);
    expect(APP).not.toMatch(/setAutoWriteDay|autoWriteClaimed/);
  });

  it("DiarySection과 두 훅은 runAutoDiaryTask를 부르지 않는다 (R2)", () => {
    const section = APP.slice(
      APP.indexOf("function DiarySection("),
      APP.indexOf("function SettingsSection("),
    );
    expect(section).not.toMatch(/runAutoDiaryTask/);
    expect(HANDOFF).not.toMatch(/runAutoDiaryTask/);
    expect(CLAIM).not.toMatch(/runAutoDiaryTask/);
  });
});

describe("082 WP1~WP3 — 일기 모두 지우기가 그 실행의 한 번을 소모한다", () => {
  const wipe = () => {
    const start = APP.indexOf("const requestWipe = useCallback(");
    expect(start).toBeGreaterThanOrEqual(0);
    return APP.slice(
      start,
      APP.indexOf("const ", start + 10 + APP.slice(start + 10).indexOf("}, [")),
    );
  };

  it("WP1 — busy가 아닌 분기 안에서, 홈을 다시 마운트하기 전에 소모한다", () => {
    const fn = wipe();
    const branch = fn.slice(fn.indexOf('if (outcome.kind !== "busy") {'));
    expect(branch).toMatch(/^if \(outcome\.kind !== "busy"\) \{\s*spendAutoWrite\(\);/);
    expect(branch.indexOf("spendAutoWrite()")).toBeLessThan(branch.indexOf("setDiaryKey("));
    expect(branch.indexOf("spendAutoWrite()")).toBeGreaterThan(-1);
  });

  it("WP2 — 그 분기 밖에서는 소모하지 않는다 (지우지 못했으면 한 번이 남는다)", () => {
    const fn = wipe();
    const before = fn.slice(0, fn.indexOf('if (outcome.kind !== "busy") {'));
    expect(before).not.toMatch(/spendAutoWrite/);
  });

  it("WP3 — 소모를 부르는 곳은 조립부에서 지우기 하나다", () => {
    expect(APP.match(/spendAutoWrite\(\)/g)).toHaveLength(1);
  });
});

describe("082 X4 — 두 훅은 화면·파이프라인·추론에 닿지 않는다", () => {
  it.each([
    ["use-auto-write-claim.ts", CLAIM],
    ["use-auto-write-handoff.ts", HANDOFF],
  ])("%s", (_name, source) => {
    const imports = source.match(/from "[^"]+"/g) ?? [];
    expect(imports.filter((line) => /\/ui\/|diary\/pipeline|inference\//.test(line))).toEqual([]);
  });
});

describe("OP6 — 앱 열기 경로는 알림을 보내지 않는다", () => {
  it("홈과 DiarySection이 알림 통로를 부르지 않는다", () => {
    const section = APP.slice(
      APP.indexOf("function DiarySection("),
      APP.indexOf("function SettingsSection("),
    );
    expect(section).not.toMatch(/expoNotificationPort|\.present\(/);
    expect(HANDOFF).not.toMatch(/expoNotificationPort|\.present\(|expo-notifications/);
    expect(CLAIM).not.toMatch(/expoNotificationPort|\.present\(|expo-notifications/);
    const home = strip(readFileSync(join(ROOT, "src/ui/DiaryHomeScreen.tsx"), "utf8"));
    expect(home).not.toMatch(/expoNotificationPort|\.present\(|expo-notifications/);
  });
});

describe("OP7 — src/schedule/은 AppState를 보지 않는다 (AGENTS)", () => {
  it("모든 파일에 AppState가 없다", () => {
    const dir = join(ROOT, "src/schedule");
    for (const name of readdirSync(dir)) {
      const code = strip(readFileSync(join(dir, name), "utf8"));
      expect({ name, hit: /\bAppState\b/.test(code) }).toEqual({ name, hit: false });
    }
  });
});
