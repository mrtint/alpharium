/**
 * 104 → 108 — 배선을 소스에서 잠근다 (주석을 걷어낸 뒤 읽는다). 104의 홈 배터리 안내는 108에서 쓰기 바 위의 제약 띠가 되었다.
 *
 * 계약: specs/104-battery-exception-awareness/contracts/battery-exception.md RD6(예외 상태를 읽는 통로),
 *       specs/108-notice-unification/contracts/constraint-band.md UB·HP, spec FR-008·FR-015
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

describe("HS — App.tsx가 제약 띠를 홈에 배선한다", () => {
  const app = read("App.tsx");

  it("useConstraintBand를 부르고 종류와 배터리 설정 열기를 홈에 넘긴다", () => {
    expect(app).toMatch(/useConstraintBand\(\{/);
    expect(app).toMatch(/constraintKind=\{constraintKind\}/);
    expect(app).toMatch(/onOpenBatteryConstraint=\{onOpenBattery\}/);
  });

  it("플랫폼은 appPlatform(Platform.OS)로, 사진 권한·자동 쓰기 켬 여부를 입력으로 넘긴다", () => {
    expect(app).toMatch(/platform: appPlatform\(Platform\.OS\)/);
    expect(app).toMatch(/port: batteryExceptionPort/);
    expect(app).toMatch(/photoDenied,/);
    expect(app).toMatch(/autoWriteEnabled: autoDiarySettings\?\.enabled/);
  });

  it("닫은 시각 기록(옛 104 저장소)은 더 이상 쓰지 않는다", () => {
    expect(app).not.toMatch(/BatteryNoticeStore|useBatteryNotice|onAutoWriteSaved/);
  });

  it("설정 꼬리표도 같은 예외 통로에서 읽는다 (읽기 실패는 unknown)", () => {
    expect(app).toMatch(/batteryPort\.readStatus\(\)\.catch\(unknown\)/);
  });
});

describe("FR-015·062 — 띠 화면에 한글 리터럴이 없다", () => {
  it("ConstraintBand 부품과 홈 조립은 카탈로그(home.constraintBand)만 읽는다", () => {
    expect(read("src/ui/components/ConstraintBand.tsx")).not.toMatch(/[가-힣]/);
    expect(read("src/ui/DiaryHomeScreen.tsx")).toMatch(/text\(\)\.home\.constraintBand\[kind\]/);
  });
});

describe("Q6 — 큰 글꼴에서 띠가 첫 화면 본문을 밀어내지 않는다 (실측 2.0배에서 본문 0줄)", () => {
  it("띠의 글자는 모두 글꼴 배율 상한을 받고, 글자와 버튼이 한 행에 있다", () => {
    const code = read("src/ui/components/ConstraintBand.tsx");
    expect(code.match(/maxFontSizeMultiplier=\{BAND_FONT_CAP\}/g)?.length).toBe(2);
    expect(code).toMatch(/flexDirection: "row"/);
    expect(code).toMatch(/const BAND_FONT_CAP = 1\.2;/);
  });
});

describe("원칙 IV — 예외 상태 말고는 아무것도 남기지 않는다", () => {
  it("훅과 판정은 배터리 잔량·충전 상태·이력을 읽거나 쓰지 않고 기록 파일도 없다", () => {
    for (const file of ["src/app/use-constraint-band.ts", "src/app/constraint-band.ts"]) {
      const code = read(file);
      expect(code).not.toMatch(/getBatteryLevelAsync|getBatteryStateAsync|history|counter/);
      expect(code).not.toMatch(/\.json|writeFile|saveDismissed/);
    }
  });
});
