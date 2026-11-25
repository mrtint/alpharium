/**
 * 131 — 자동 쓰기 설정 창 훅.
 *
 * ⚠️ RNTL 14의 `render`는 Promise다 — await한다. `AppState` 스파이는 복원하지 않는다(AGENTS).
 */

import { act, render } from "@testing-library/react-native";
import { AppState } from "react-native";

import {
  useAutoWriteSetup,
  type AutoWriteSetupApi,
  type UseAutoWriteSetupDeps,
} from "../../src/app/use-auto-write-setup";
import { createLiveWrites } from "../../src/diary/live-write";
import type { BatteryExceptionStatus } from "../../src/schedule/battery-exception-port";
import type { AutoDiarySettings } from "../../src/schedule/settings";

const handlers = new Set<(state: string) => void>();
beforeAll(() => {
  jest.spyOn(AppState, "addEventListener").mockImplementation(((
    event: string,
    handler: (state: string) => void,
  ) => {
    if (event === "change") handlers.add(handler);
    return { remove: () => handlers.delete(handler) };
  }) as never);
});
beforeEach(() => handlers.clear());

const flush = () => act(async () => {});

function setup(
  over: Partial<UseAutoWriteSetupDeps> = {},
  status: BatteryExceptionStatus = "restricted",
) {
  const live = createLiveWrites();
  const box: { api: AutoWriteSetupApi | null; status: BatteryExceptionStatus } = {
    api: null,
    status,
  };
  const saved: AutoDiarySettings[] = [];
  const cleared = jest.fn(async () => {});
  const openList = jest.fn(async () => {});
  const deps: UseAutoWriteSetupDeps = {
    platform: "android",
    homeReady: true,
    flagLoaded: true,
    pending: true,
    firstDiaryEntered: false,
    firstDiaryDone: false,
    otherDialogOpen: false,
    liveWrites: live,
    batteryPort: { readStatus: async () => box.status, openSettingsList: openList },
    settings: { enabled: false, targetHour: 22 },
    effects: {
      applyTargetHour: async (c, hour) => ({ ...c, targetHour: hour }),
      applyToggleOn: async (c) => ({ settings: { ...c, enabled: true } }),
      applyToggleOff: async (c) => ({ ...c, enabled: false }),
    },
    clearPending: cleared,
    onSettingsChange: (next) => saved.push(next),
    ...over,
  };
  function Probe() {
    box.api = useAutoWriteSetup(deps);
    return null;
  }
  return { live, box, saved, cleared, openList, Probe };
}

describe("useAutoWriteSetup", () => {
  it("쓰기가 살아 있으면 내려가고 끝나면 다시 뜬다(R8)", async () => {
    const ctx = setup();
    await render(<ctx.Probe />);
    expect(ctx.box.api!.visible).toBe(true);
    let handle: ReturnType<typeof ctx.live.beginWrite> = null;
    await act(async () => {
      handle = ctx.live.beginWrite({ day: "2026-11-25" as never, owner: "screen" as never });
    });
    expect(ctx.box.api!.visible).toBe(false);
    await act(async () => {
      handle!.end({ ok: true });
    });
    expect(ctx.box.api!.visible).toBe(true);
  });

  it("시각을 고르던 중 쓰기가 시작되면 고르기를 접고, 끝나면 창으로 돌아온다", async () => {
    const ctx = setup();
    await render(<ctx.Probe />);
    await act(async () => ctx.box.api!.openHourPicker());
    expect(ctx.box.api!.pickingHour).toBe(true);
    let handle: ReturnType<typeof ctx.live.beginWrite> = null;
    await act(async () => {
      handle = ctx.live.beginWrite({ day: "2026-11-25" as never, owner: "screen" as never });
    });
    await act(async () => {
      handle!.end({ ok: true });
    });
    expect(ctx.box.api!.visible).toBe(true);
    expect(ctx.box.api!.pickingHour).toBe(false);
  });

  it("「켜기」: 고른 시각과 켬을 저장하고 대기를 지우며 다시 뜨지 않는다", async () => {
    const ctx = setup();
    await render(<ctx.Probe />);
    await act(async () => ctx.box.api!.selectHour(7));
    expect(ctx.box.api!.targetHour).toBe(7);
    await act(async () => ctx.box.api!.confirm());
    await flush();
    expect(ctx.saved.at(-1)).toEqual({ enabled: true, targetHour: 7 });
    expect(ctx.cleared).toHaveBeenCalledTimes(1);
    expect(ctx.box.api!.visible).toBe(false);
  });

  it("「나중에」: 저장하지 않고 대기만 지운다", async () => {
    const ctx = setup();
    await render(<ctx.Probe />);
    await act(async () => ctx.box.api!.later());
    expect(ctx.saved).toEqual([]);
    expect(ctx.cleared).toHaveBeenCalledTimes(1);
    expect(ctx.box.api!.visible).toBe(false);
  });

  it("배터리: 보일 때 읽고, 설정 목록을 열고, 돌아오면 다시 읽는다", async () => {
    const ctx = setup();
    await render(<ctx.Probe />);
    await flush();
    expect(ctx.box.api!.batteryTag).toBe("denied");
    await act(async () => ctx.box.api!.openBattery());
    expect(ctx.openList).toHaveBeenCalledTimes(1);
    ctx.box.status = "exempt";
    await act(async () => {
      handlers.forEach((h) => h("active"));
    });
    await flush();
    expect(ctx.box.api!.batteryTag).toBe("allowed");
  });

  it("배터리 상태를 모르면 꼬리표가 없다", async () => {
    const ctx = setup({}, "unknown");
    await render(<ctx.Probe />);
    await flush();
    expect(ctx.box.api!.batteryTag).toBeUndefined();
  });

  it("설정을 아직 못 읽었으면 띄우지 않는다", async () => {
    const ctx = setup({ settings: null });
    await render(<ctx.Probe />);
    expect(ctx.box.api!.visible).toBe(false);
  });
});
