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
  it("claimAutoWrite가 040 autoGenerateTried와 이미 시작했는가를 읽는다", () => {
    expect(APP).toMatch(
      /const claimAutoWrite = useCallback\(\(\) => \{\s*if \(autoGenerateTried\.current \|\| autoWriteClaimed\.current\) return false;\s*autoWriteClaimed\.current = true;\s*return true;/,
    );
  });

  it("판정은 DiarySection이 resolveAutoWrite로 한다 (백그라운드와 같은 판정)", () => {
    const section = APP.slice(APP.indexOf("function DiarySection("));
    expect(section).toMatch(/resolveAutoWrite\(\{/);
    expect(APP.match(/resolveAutoWrite\(/g)).toHaveLength(1);
  });

  it("DiarySection은 runAutoDiaryTask를 부르지 않는다 (R2)", () => {
    const section = APP.slice(
      APP.indexOf("function DiarySection("),
      APP.indexOf("function SettingsSection("),
    );
    expect(section).not.toMatch(/runAutoDiaryTask/);
  });
});

describe("OP6 — 앱 열기 경로는 알림을 보내지 않는다", () => {
  it("홈과 DiarySection이 알림 통로를 부르지 않는다", () => {
    const section = APP.slice(
      APP.indexOf("function DiarySection("),
      APP.indexOf("function SettingsSection("),
    );
    expect(section).not.toMatch(/expoNotificationPort|\.present\(/);
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
