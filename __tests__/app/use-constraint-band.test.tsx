/**
 * 108 — 제약 띠 훅 (계약 constraint-band.md UB1~UB4).
 *
 * ⚠️ RNTL 14의 `render`는 Promise다 — await한다. `AppState` 스파이는 복원하지 않는다(AGENTS).
 */

import { act, render } from "@testing-library/react-native";
import { AppState } from "react-native";

import type { ConstraintKind } from "../../src/app/constraint-band";
import {
  useConstraintBand,
  type ConstraintBandApi,
  type ConstraintBandDeps,
} from "../../src/app/use-constraint-band";
import type { BatteryExceptionStatus } from "../../src/schedule/battery-exception-port";

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
const comeToFront = () =>
  act(async () => {
    handlers.forEach((handler) => handler("active"));
  });

type Ctx = ReturnType<typeof setup>;

function setup(
  over: Partial<Omit<ConstraintBandDeps, "port">> & { status?: BatteryExceptionStatus } = {},
  portOver: Partial<ConstraintBandDeps["port"]> = {},
) {
  let status: BatteryExceptionStatus = over.status ?? "restricted";
  const readStatus = jest.fn(async () => status);
  const openSettingsList = jest.fn(async () => {});
  const api: { current: ConstraintBandApi | null } = { current: null };
  const deps: ConstraintBandDeps = {
    platform: "android",
    photoDenied: false,
    autoWriteEnabled: true,
    ...over,
    port: { readStatus, openSettingsList, ...portOver },
  };
  return {
    deps,
    readStatus,
    openSettingsList,
    api,
    kind: (): ConstraintKind | null => api.current!.kind,
    setStatus: (next: BatteryExceptionStatus) => {
      status = next;
    },
  };
}

function Harness({
  deps,
  onApi,
}: {
  deps: ConstraintBandDeps;
  onApi: (api: ConstraintBandApi) => void;
}) {
  onApi(useConstraintBand(deps));
  return null;
}

const mount = async (ctx: Ctx) => {
  const view = await render(
    <Harness
      deps={ctx.deps}
      onApi={(value) => {
        ctx.api.current = value;
      }}
    />,
  );
  await flush();
  return view;
};

describe("UB1 — 안드로이드는 마운트에서 읽고, iOS는 읽지 않는다", () => {
  it("restricted + 자동 쓰기 켬이면 배터리 띠", async () => {
    const ctx = setup();
    await mount(ctx);
    expect(ctx.readStatus).toHaveBeenCalledTimes(1);
    expect(ctx.kind()).toBe("battery");
  });

  it("읽기가 던지면 unknown으로 본다 — 띠 없음", async () => {
    const ctx = setup({}, { readStatus: jest.fn(async () => Promise.reject(new Error("x"))) });
    await mount(ctx);
    expect(ctx.kind()).toBeNull();
  });

  it("iOS는 읽지 않고 띠도 없다", async () => {
    const ctx = setup({ platform: "ios" });
    await mount(ctx);
    expect(ctx.readStatus).not.toHaveBeenCalled();
    expect(ctx.kind()).toBeNull();
  });

  it("사진 권한 거부가 먼저다 — 둘이 걸려도 photos 하나", async () => {
    const ctx = setup({ photoDenied: true });
    await mount(ctx);
    expect(ctx.kind()).toBe("photos");
  });

  it("자동 쓰기가 꺼져 있으면 배터리 띠가 없다", async () => {
    const ctx = setup({ autoWriteEnabled: false });
    await mount(ctx);
    expect(ctx.kind()).toBeNull();
  });
});

describe("UB2 — 앞으로 돌아오면 다시 읽는다", () => {
  it("예외를 주고 돌아오면 띠가 사라진다", async () => {
    const ctx = setup();
    await mount(ctx);
    expect(ctx.kind()).toBe("battery");
    ctx.setStatus("exempt");
    await comeToFront();
    expect(ctx.kind()).toBeNull();
  });

  it("다시 읽다 던지면 마지막 값을 지우지 않는다", async () => {
    const readStatus = jest
      .fn<Promise<BatteryExceptionStatus>, []>()
      .mockResolvedValueOnce("restricted")
      .mockRejectedValue(new Error("x"));
    const ctx = setup({}, { readStatus });
    await mount(ctx);
    expect(ctx.kind()).toBe("battery");
    await comeToFront();
    expect(ctx.kind()).toBe("battery");
  });

  it("뒤로 가는 신호에는 읽지 않는다", async () => {
    const ctx = setup();
    await mount(ctx);
    await act(async () => {
      handlers.forEach((handler) => handler("background"));
    });
    expect(ctx.readStatus).toHaveBeenCalledTimes(1);
  });
});

describe("UB2b — 읽기가 겹치면 가장 나중에 시작한 읽기의 결과만 쓴다", () => {
  it("먼저 시작한 읽기가 늦게 끝나도 최신 결과를 덮지 않는다", async () => {
    let resolveFirst: (value: BatteryExceptionStatus) => void = () => {};
    const readStatus = jest
      .fn<Promise<BatteryExceptionStatus>, []>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValue("exempt");
    const ctx = setup({}, { readStatus });
    await mount(ctx); // 첫 읽기는 아직 안 끝났다
    await comeToFront(); // 두 번째 읽기: exempt
    expect(ctx.kind()).toBeNull();
    await act(async () => resolveFirst("restricted")); // 늦게 온 옛 결과
    expect(ctx.kind()).toBeNull();
  });
});

describe("UB3 — 설정 목록 열기", () => {
  it("openSettingsList를 부르고, 실패해도 던지지 않는다", async () => {
    const ctx = setup(
      {},
      { openSettingsList: jest.fn(async () => Promise.reject(new Error("x"))) },
    );
    await mount(ctx);
    await act(async () => ctx.api.current!.onOpenBattery());
    expect(ctx.deps.port.openSettingsList).toHaveBeenCalledTimes(1);
  });
});

describe("UB4 — 닫기·기록이 없다", () => {
  it("반환에 닫기 계열이 없다", async () => {
    const ctx = setup();
    await mount(ctx);
    expect(Object.keys(ctx.api.current!).sort()).toEqual(["kind", "onOpenBattery"]);
  });
});
