/**
 * 131 — `App.tsx`가 자동 쓰기 설정 창을 잇는 모양. App은 jest에서 그리지 않는다 — 소스를 읽는다(`AppFrame.first-diary.test.tsx` 선례).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const APP = strip(readFileSync(join(__dirname, "../../App.tsx"), "utf8"));

describe("131 — 조립", () => {
  it("권한 단계를 처음 끝낼 때만 대기를 세운다(이미 끝낸 설치는 그 앞에서 돌아간다)", () => {
    expect(APP).toMatch(
      /if \(prev === null \|\| prev\.completed === true\) return prev;\s*const next = \{ \.\.\.prev, completed: true, autoWriteSetupPending: true \};/,
    );
    expect(APP.match(/autoWriteSetupPending: true/g)).toHaveLength(1);
  });

  it("홈이 보일 때·첫 일기 흐름 끝·다른 확인창이 없을 때만 판정에 넘긴다", () => {
    expect(APP).toMatch(/homeReady: firstRunStage === "done" && !readingFirstMaterial/);
    expect(APP).toMatch(/firstDiaryDone: firstDiary\.step === "done"/);
    expect(APP).toMatch(/firstDiary\.step === "asking"/);
    expect(APP).toMatch(/liveWrites,\s*batteryPort: setupBatteryPort/);
  });

  it("창은 보일 때만 그리고, 시각을 고르는 동안은 시각 대화상자만 그린다", () => {
    expect(APP).toMatch(
      /autoWriteSetup\.visible && !autoWriteSetup\.pickingHour && \(\s*<AutoWriteSetupDialog/,
    );
    expect(APP).toMatch(
      /autoWriteSetup\.visible && autoWriteSetup\.pickingHour && \(\s*<TargetHourDialog/,
    );
  });

  it("「켜기」는 설정 화면과 같은 효과 함수를 쓴다", () => {
    expect(APP).toMatch(/applyToggleOn: \(current\) => applyToggleOn\(current, setupEffectDeps\)/);
    expect(APP).toMatch(
      /applyTargetHour: \(current, hour\) => applyTargetHour\(current, hour, setupEffectDeps\)/,
    );
  });
});
