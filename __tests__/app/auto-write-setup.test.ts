/**
 * 131 — 자동 쓰기 설정 창(안내 규칙 G4)의 판정과 「켜기」 조립.
 * 계약: specs/131-auto-write-setup-sheet/contracts/auto-write-setup.md
 */

import {
  confirmAutoWriteSetup,
  shouldShowAutoWriteSetup,
  type AutoWriteSetupInput,
} from "../../src/app/auto-write-setup";
import type { AutoDiarySettings } from "../../src/schedule/settings";

const READY: AutoWriteSetupInput = {
  homeReady: true,
  flagLoaded: true,
  pending: true,
  firstDiaryEntered: true,
  firstDiaryDone: true,
  writing: false,
  otherDialogOpen: false,
};

describe("AS1 — shouldShowAutoWriteSetup", () => {
  it("모든 조건이 맞으면 띄운다", () => {
    expect(shouldShowAutoWriteSetup(READY)).toBe(true);
  });

  it("이번 실행에 첫 일기 흐름에 들어가지 않았으면(앱이 중간에 죽은 뒤) 흐름 끝을 기다리지 않는다", () => {
    expect(
      shouldShowAutoWriteSetup({ ...READY, firstDiaryEntered: false, firstDiaryDone: false }),
    ).toBe(true);
  });

  it.each<[keyof AutoWriteSetupInput, boolean]>([
    ["homeReady", false],
    ["flagLoaded", false],
    ["pending", false],
    ["writing", true],
    ["otherDialogOpen", true],
  ])("%s가 %s면 띄우지 않는다", (key, value) => {
    expect(shouldShowAutoWriteSetup({ ...READY, [key]: value })).toBe(false);
  });

  it("첫 일기 흐름이 아직 끝나지 않았으면(묻는 중·쓰는 중) 띄우지 않는다", () => {
    expect(shouldShowAutoWriteSetup({ ...READY, firstDiaryDone: false })).toBe(false);
  });
});

function fakeDeps() {
  const calls: string[] = [];
  return {
    calls,
    deps: {
      applyTargetHour: async (current: AutoDiarySettings, hour: number) => {
        calls.push(`hour:${hour}`);
        return { ...current, targetHour: hour };
      },
      applyToggleOn: async (current: AutoDiarySettings) => {
        calls.push("on");
        return { settings: { ...current, enabled: true }, notificationDenied: false };
      },
      applyToggleOff: async (current: AutoDiarySettings) => {
        calls.push("off");
        return { ...current, enabled: false };
      },
      clearPending: async () => {
        calls.push("clear");
      },
    },
  };
}

const OFF_22: AutoDiarySettings = { enabled: false, targetHour: 22 };

describe("AS2 — confirmAutoWriteSetup", () => {
  it("켬 + 시각 그대로 → 켜기만 하고 대기를 지운다", async () => {
    const { calls, deps } = fakeDeps();
    const next = await confirmAutoWriteSetup({ enabled: true, targetHour: 22 }, OFF_22, deps);
    expect(calls).toEqual(["on", "clear"]);
    expect(next).toEqual({ enabled: true, targetHour: 22 });
  });

  it("시각을 바꿨으면 시각을 먼저 저장하고 켠다", async () => {
    const { calls, deps } = fakeDeps();
    const next = await confirmAutoWriteSetup({ enabled: true, targetHour: 7 }, OFF_22, deps);
    expect(calls).toEqual(["hour:7", "on", "clear"]);
    expect(next).toEqual({ enabled: true, targetHour: 7 });
  });

  it("창에서 토글을 끄고 「켜기」 → 이미 꺼져 있으면 끄지 않는다", async () => {
    const { calls, deps } = fakeDeps();
    await confirmAutoWriteSetup({ enabled: false, targetHour: 22 }, OFF_22, deps);
    expect(calls).toEqual(["clear"]);
  });

  it("창에서 토글을 끄고 「켜기」 → 켜져 있었으면 끈다", async () => {
    const { calls, deps } = fakeDeps();
    await confirmAutoWriteSetup(
      { enabled: false, targetHour: 22 },
      { ...OFF_22, enabled: true },
      deps,
    );
    expect(calls).toEqual(["off", "clear"]);
  });

  it("대기 지우기가 실패해도 던지지 않는다", async () => {
    const { deps } = fakeDeps();
    deps.clearPending = async () => {
      throw new Error("disk");
    };
    await expect(
      confirmAutoWriteSetup({ enabled: true, targetHour: 22 }, OFF_22, deps),
    ).resolves.toEqual({ enabled: true, targetHour: 22 });
  });
});
