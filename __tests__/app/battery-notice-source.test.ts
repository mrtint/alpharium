/**
 * 104 — 배선을 소스에서 잠근다 (주석을 걷어낸 뒤 읽는다).
 *
 * 계약: specs/104-battery-exception-awareness/contracts/battery-exception.md RD6, home-notice.md HS1~HS3, spec FR-008·FR-015
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (file: string) =>
  readFileSync(join(__dirname, "../..", file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

describe("FR-008 — 앱 훅과 헤드리스 태스크가 같은 조립으로 예외 상태를 읽는다", () => {
  it("use-reminder-sync.ts와 task.ts 모두 expoReminderDeps를 쓴다", () => {
    expect(read("src/app/use-reminder-sync.ts")).toMatch(/expoReminderDeps\(/);
    expect(read("src/schedule/task.ts")).toMatch(/expoReminderDeps\(/);
  });

  it("그 조립(reminder-deps.ts)이 예외 상태를 batteryPort.readStatus로 읽는다", () => {
    expect(read("src/schedule/reminder-deps.ts")).toMatch(/loadBatteryStatus:[^,]*readStatus\(\)/);
  });
});

describe("HS — App.tsx가 안내를 홈에 배선한다", () => {
  const app = read("App.tsx");

  it("useBatteryNotice를 부르고 신호와 안내를 홈에 넘긴다", () => {
    expect(app).toMatch(/useBatteryNotice\(\{/);
    expect(app).toMatch(/onAutoWriteSaved=\{onAutoWriteSaved\}/);
    expect(app).toMatch(/batteryNotice=\{batteryNotice \?\? undefined\}/);
  });

  it("플랫폼은 appPlatform(Platform.OS)로, 닫은 시각 기록은 기기 통로로 넘긴다", () => {
    expect(app).toMatch(/platform: appPlatform\(Platform\.OS\)/);
    expect(app).toMatch(/port: batteryExceptionPort/);
    expect(app).toMatch(/expoBatteryNoticeStorePort\(\)/);
  });

  it("설정 꼬리표도 같은 예외 통로에서 읽는다 (읽기 실패는 unknown)", () => {
    expect(app).toMatch(/batteryPort\.readStatus\(\)\.catch\(unknown\)/);
  });
});

describe("FR-015·062 — 안내 화면에 한글 리터럴이 없다", () => {
  it("DiaryListScreen의 BatteryNoticeLine은 카탈로그(home.batteryNotice)만 읽는다", () => {
    const code = read("src/ui/DiaryListScreen.tsx");
    const start = code.indexOf("function BatteryNoticeLine");
    const part = code.slice(start, code.indexOf("\n}\n", start));
    expect(part).toMatch(/text\(\)\.home\.batteryNotice/);
    expect(part).not.toMatch(/[가-힣]/);
  });
});

describe("Q6 — 큰 글꼴에서 안내가 첫 화면 본문을 밀어내지 않는다 (실측 2.0배에서 본문 0줄)", () => {
  it("BatteryNoticeLine의 글자는 모두 글꼴 배율 상한을 받고, 설명과 버튼이 한 행에 있다", () => {
    const code = read("src/ui/DiaryListScreen.tsx");
    const start = code.indexOf("function BatteryNoticeLine");
    const part = code.slice(start, code.indexOf("\n}\n", start));
    expect(part.match(/maxFontSizeMultiplier=\{NOTICE_FONT_CAP\}/g)?.length).toBe(2);
    expect(part).toMatch(/flexDirection: "row"/);
    expect(code).toMatch(/const NOTICE_FONT_CAP = 1\.2;/);
  });
});

describe("원칙 IV — 예외 상태·닫은 시각 말고는 아무것도 남기지 않는다", () => {
  it("훅과 판정은 배터리 잔량·충전 상태·이력을 읽거나 쓰지 않는다", () => {
    for (const file of ["src/app/use-battery-notice.ts", "src/app/battery-notice.ts"]) {
      expect(read(file)).not.toMatch(/getBatteryLevelAsync|getBatteryStateAsync|history|counter/);
    }
  });
});
