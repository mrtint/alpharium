/**
 * 104 — 홈 배터리 안내 훅.
 *
 * 계약: specs/104-battery-exception-awareness/contracts/home-notice.md UB1~UB7
 *
 * ⚠️ RNTL 14의 `render`는 Promise다 — await한다. `AppState` 스파이는 복원하지 않는다(AGENTS).
 */

import { act, render } from "@testing-library/react-native";
import { AppState } from "react-native";

import {
  useBatteryNotice,
  type BatteryNoticeApi,
  type BatteryNoticeDeps,
} from "../../src/app/use-battery-notice";
import type { BatteryNoticeStorePort } from "../../src/app/battery-notice-store";
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

const NOW = new Date(2026, 9, 24, 12, 0);
const flush = () => act(async () => {});

function memoryStore(initial: string | null = null) {
  const store: BatteryNoticeStorePort & { stored: string | null } = {
    stored: initial,
    async read() {
      return store.stored;
    },
    async write(serialized) {
      store.stored = serialized;
    },
  };
  return store;
}

function setup(
  over: Partial<BatteryNoticeDeps> & { status?: BatteryExceptionStatus } = {},
  portOver: Partial<BatteryNoticeDeps["port"]> = {},
) {
  let status: BatteryExceptionStatus = over.status ?? "restricted";
  const readStatus = jest.fn(async () => status);
  const openSettingsList = jest.fn(async () => {});
  const port = { readStatus, openSettingsList, ...portOver };
  const store = memoryStore();
  const api: { current: BatteryNoticeApi | null } = { current: null };
  const deps: BatteryNoticeDeps = {
    platform: "android",
    port,
    store,
    now: () => NOW,
    ...over,
  };
  return {
    deps,
    readStatus,
    openSettingsList,
    store,
    api,
    setApi: (value: BatteryNoticeApi) => {
      api.current = value;
    },
    setStatus: (next: BatteryExceptionStatus) => {
      status = next;
    },
  };
}

function Harness({
  deps,
  onApi,
}: {
  deps: BatteryNoticeDeps;
  onApi: (api: BatteryNoticeApi) => void;
}) {
  onApi(useBatteryNotice(deps));
  return null;
}

const mount = async (ctx: ReturnType<typeof setup>) => {
  const view = await render(<Harness deps={ctx.deps} onApi={ctx.setApi} />);
  await flush();
  return view;
};

describe("UB2 — 저장 신호가 오면 판정이 참일 때 보인다", () => {
  it("restricted이고 닫은 적 없으면 보인다", async () => {
    const ctx = setup();
    await mount(ctx);
    expect(ctx.api.current!.notice).toBeNull();
    await act(async () => ctx.api.current!.onAutoWriteSaved());
    expect(ctx.api.current!.notice).not.toBeNull();
  });

  it.each(["exempt", "unknown"] as const)("%s이면 보이지 않는다", async (status) => {
    const ctx = setup({ status });
    await mount(ctx);
    await act(async () => ctx.api.current!.onAutoWriteSaved());
    expect(ctx.api.current!.notice).toBeNull();
  });

  it("신호가 없으면 상태를 읽지도 않는다 (마운트만으로는 보이지 않는다)", async () => {
    const ctx = setup();
    await mount(ctx);
    expect(ctx.readStatus).not.toHaveBeenCalled();
  });

  it("7일 안에 닫았으면 보이지 않고, 7일이 지났으면 다시 보인다", async () => {
    const recent = setup();
    recent.store.stored = JSON.stringify({ at: NOW.getTime() - 3 * 24 * 60 * 60 * 1000 });
    await mount(recent);
    await act(async () => recent.api.current!.onAutoWriteSaved());
    expect(recent.api.current!.notice).toBeNull();

    const old = setup();
    old.store.stored = JSON.stringify({ at: NOW.getTime() - 8 * 24 * 60 * 60 * 1000 });
    await mount(old);
    await act(async () => old.api.current!.onAutoWriteSaved());
    expect(old.api.current!.notice).not.toBeNull();
  });

  it("상태 읽기·기록 읽기가 던지면 보이지 않는다 (모르는 것을 채우지 않는다)", async () => {
    const noStatus = setup(
      {},
      {
        readStatus: async () => {
          throw new Error("native");
        },
      },
    );
    await mount(noStatus);
    await act(async () => noStatus.api.current!.onAutoWriteSaved());
    expect(noStatus.api.current!.notice).toBeNull();

    const noStore = setup({
      store: {
        read: async () => {
          throw new Error("io");
        },
        write: async () => {},
      },
    });
    await mount(noStore);
    await act(async () => noStore.api.current!.onAutoWriteSaved());
    expect(noStore.api.current!.notice).toBeNull();
  });

  it("UB6 — 이미 떠 있을 때 또 신호가 와도 그대로다", async () => {
    const ctx = setup();
    await mount(ctx);
    await act(async () => ctx.api.current!.onAutoWriteSaved());
    const first = ctx.api.current!.notice;
    await act(async () => ctx.api.current!.onAutoWriteSaved());
    expect(ctx.api.current!.notice).not.toBeNull();
    expect(first).not.toBeNull();
  });

  it("onAutoWriteSaved의 정체가 렌더마다 바뀌지 않는다 (홈의 generate 의존성이 흔들리지 않게)", async () => {
    const ctx = setup();
    const view = await mount(ctx);
    const before = ctx.api.current!.onAutoWriteSaved;
    await view.rerender(<Harness deps={{ ...ctx.deps, now: () => NOW }} onApi={ctx.setApi} />);
    expect(ctx.api.current!.onAutoWriteSaved).toBe(before);
  });
});

describe("UB3 — 떠 있는 동안 앞으로 돌아오면 다시 읽는다", () => {
  it("restricted가 아니면 숨기고 기록은 남기지 않는다", async () => {
    const ctx = setup();
    await mount(ctx);
    await act(async () => ctx.api.current!.onAutoWriteSaved());
    expect(ctx.api.current!.notice).not.toBeNull();

    ctx.setStatus("exempt");
    await act(async () => {
      [...handlers].forEach((h) => h("active"));
    });
    expect(ctx.api.current!.notice).toBeNull();
    expect(ctx.store.stored).toBeNull();
  });

  it("여전히 restricted이면 그대로 떠 있다", async () => {
    const ctx = setup();
    await mount(ctx);
    await act(async () => ctx.api.current!.onAutoWriteSaved());
    await act(async () => {
      [...handlers].forEach((h) => h("active"));
    });
    expect(ctx.api.current!.notice).not.toBeNull();
  });

  it("떠 있지 않으면 앞으로 돌아와도 읽지 않는다", async () => {
    const ctx = setup();
    await mount(ctx);
    await act(async () => {
      [...handlers].forEach((h) => h("active"));
    });
    expect(ctx.readStatus).not.toHaveBeenCalled();
  });

  it("다시 읽다 던지면 떠 있는 채로 둔다 (읽지 못한 것으로 지우지 않는다)", async () => {
    let fail = false;
    const ctx = setup(
      {},
      {
        readStatus: async () => {
          if (fail) throw new Error("native");
          return "restricted";
        },
      },
    );
    await mount(ctx);
    await act(async () => ctx.api.current!.onAutoWriteSaved());
    fail = true;
    await act(async () => {
      [...handlers].forEach((h) => h("active"));
    });
    expect(ctx.api.current!.notice).not.toBeNull();
  });
});

describe("UB4 — 닫기", () => {
  it("지금 시각을 기록하고 숨긴다", async () => {
    const ctx = setup();
    await mount(ctx);
    await act(async () => ctx.api.current!.onAutoWriteSaved());
    await act(async () => ctx.api.current!.notice!.onDismiss());
    expect(ctx.api.current!.notice).toBeNull();
    expect(JSON.parse(ctx.store.stored ?? "null")).toEqual({ at: NOW.getTime() });
  });

  it("기록이 실패해도 숨기고 던지지 않는다", async () => {
    const ctx = setup({
      store: {
        read: async () => null,
        write: async () => {
          throw new Error("io");
        },
      },
    });
    await mount(ctx);
    await act(async () => ctx.api.current!.onAutoWriteSaved());
    await act(async () => ctx.api.current!.notice!.onDismiss());
    expect(ctx.api.current!.notice).toBeNull();
  });
});

describe("UB5 — 설정 열기", () => {
  it("openSettingsList를 부르고 안내는 그대로 둔다 (돌아온 뒤 UB3이 판단)", async () => {
    const ctx = setup();
    await mount(ctx);
    await act(async () => ctx.api.current!.onAutoWriteSaved());
    await act(async () => ctx.api.current!.notice!.onOpenSettings());
    expect(ctx.openSettingsList).toHaveBeenCalledTimes(1);
    expect(ctx.api.current!.notice).not.toBeNull();
  });

  it("열기가 실패해도 던지지 않는다", async () => {
    const ctx = setup(
      {},
      {
        openSettingsList: async () => {
          throw new Error("intent");
        },
      },
    );
    await mount(ctx);
    await act(async () => ctx.api.current!.onAutoWriteSaved());
    await act(async () => ctx.api.current!.notice!.onOpenSettings());
    expect(ctx.api.current!.notice).not.toBeNull();
  });
});

describe("UB7 — iOS", () => {
  it("어떤 읽기도 하지 않고 보이지 않는다", async () => {
    const ctx = setup({ platform: "ios" });
    await mount(ctx);
    await act(async () => ctx.api.current!.onAutoWriteSaved());
    await act(async () => {
      [...handlers].forEach((h) => h("active"));
    });
    expect(ctx.api.current!.notice).toBeNull();
    expect(ctx.readStatus).not.toHaveBeenCalled();
  });
});

describe("저장소가 없으면(아직 조립 전) 보이지 않는다", () => {
  it("store가 undefined", async () => {
    const ctx = setup({ store: undefined });
    await mount(ctx);
    await act(async () => ctx.api.current!.onAutoWriteSaved());
    expect(ctx.api.current!.notice).toBeNull();
  });
});

describe("저장 신호의 읽기 도중에 닫으면 닫음이 이긴다 (리뷰)", () => {
  it("읽기가 끝난 뒤에도 안내가 다시 서지 않는다", async () => {
    let release: (value: BatteryExceptionStatus) => void = () => {};
    const ctx = setup(
      {},
      {
        readStatus: () => new Promise<BatteryExceptionStatus>((resolve) => (release = resolve)),
      },
    );
    await mount(ctx);
    // 앞 신호로 이미 떠 있는 안내를 만든다
    await act(async () => ctx.api.current!.onAutoWriteSaved());
    await act(async () => release("restricted"));
    expect(ctx.api.current!.notice).not.toBeNull();

    // 새 신호가 읽는 동안 사용자가 닫는다
    await act(async () => ctx.api.current!.onAutoWriteSaved());
    await act(async () => ctx.api.current!.notice!.onDismiss());
    await act(async () => release("restricted"));
    expect(ctx.api.current!.notice).toBeNull();
  });
});
