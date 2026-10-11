import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AppState, Pressable, Text } from "react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { READ_LIMIT_MS } from "../../src/app/consent-gate";
import type { Connection } from "../../src/app/network-port";
import { useConsentGate } from "../../src/app/use-consent-gate";

/**
 * 074 — 동의 게이트 훅.
 *
 * 계약: specs/074-wifi-download-consent/contracts/consent-gate.md CG5~CG10
 *
 * 훅을 눈으로 볼 수 있게 작은 시험용 컴포넌트에 올린다. 연결·받을 양 통로는 주입 대역이다.
 * `AppState.addEventListener`의 스파이는 복원하지 않는다 — jest-expo의 목은 복원하면 구독 반환값을 잃는다.
 */

type Deps = {
  readConnection: () => Promise<Connection>;
  readSizeLabel: () => Promise<string | null>;
};

function Harness(deps: Deps) {
  const gate = useConsentGate(deps);
  return (
    <>
      <Text testID="view">{gate.view}</Text>
      <Text testID="size">{gate.sizeLabel ?? "없음"}</Text>
      <Pressable onPress={gate.defer} testID="defer" />
      <Pressable onPress={gate.recheck} testID="recheck" />
    </>
  );
}

const view = () => screen.getByTestId("view").props.children as string;
const size = () => screen.getByTestId("size").props.children as string;

function depsOf(
  connection: Connection | (() => Promise<Connection>),
  label: string | null = "2.0GB",
) {
  return {
    readConnection: jest.fn(typeof connection === "function" ? connection : async () => connection),
    readSizeLabel: jest.fn(async () => label),
  };
}

/** 마지막으로 등록된 AppState `change` 핸들러를 부른다 */
async function fireAppState(spy: jest.SpyInstance, state: string) {
  const handlers = spy.mock.calls
    .filter(([event]) => event === "change")
    .map(([, fn]) => fn as (s: string) => void);
  await act(async () => {
    const last = handlers[handlers.length - 1];
    if (last !== undefined) last(state);
  });
}

describe("CG5·CG6 — 읽는 순서", () => {
  it("마운트에서 연결을 정확히 한 번 읽고, 읽는 동안 reading이다", async () => {
    let release: (c: Connection) => void = () => {};
    const deps = depsOf(() => new Promise<Connection>((resolve) => (release = resolve)));
    await render(<Harness {...deps} />);
    expect(view()).toBe("reading");
    expect(deps.readConnection).toHaveBeenCalledTimes(1);
    await act(async () => release("wifi"));
    await waitFor(() => expect(view()).toBe("standard"));
    expect(deps.readConnection).toHaveBeenCalledTimes(1);
  });

  it("cellular면 그 뒤에 받을 양을 읽고 cellular + sizeLabel이다", async () => {
    const deps = depsOf("cellular", "2.0GB");
    await render(<Harness {...deps} />);
    await waitFor(() => expect(view()).toBe("cellular"));
    expect(size()).toBe("2.0GB");
    expect(deps.readSizeLabel).toHaveBeenCalledTimes(1);
  });

  it("★ 표준이면 받을 양을 읽지 않는다 — wifi·other·unknown", async () => {
    for (const c of ["wifi", "other", "unknown"] as const) {
      const deps = depsOf(c);
      const { unmount } = await render(<Harness {...deps} />);
      await waitFor(() => expect(view()).toBe("standard"));
      expect(deps.readSizeLabel).not.toHaveBeenCalled();
      await unmount();
    }
  });
});

describe("CG7 — 읽기 한도 (FR-001a)", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("연결 읽기가 한도 안에 안 끝나면 standard다(빈 화면에서 멈추지 않는다)", async () => {
    const deps = depsOf(() => new Promise<Connection>(() => {}));
    await render(<Harness {...deps} />);
    expect(view()).toBe("reading");
    await act(async () => {
      jest.advanceTimersByTime(READ_LIMIT_MS);
    });
    expect(view()).toBe("standard");
  });

  it("받을 양 읽기가 한도 안에 안 끝나면 cellular이고 sizeLabel은 없다", async () => {
    const deps = {
      readConnection: jest.fn(async (): Promise<Connection> => "cellular"),
      readSizeLabel: jest.fn(() => new Promise<string | null>(() => {})),
    };
    await render(<Harness {...deps} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(view()).toBe("reading");
    await act(async () => {
      jest.advanceTimersByTime(READ_LIMIT_MS);
    });
    expect(view()).toBe("cellular");
    expect(size()).toBe("없음");
  });

  it("연결 읽기가 거부되면 standard다", async () => {
    const deps = depsOf(async () => {
      throw new Error("조회 실패");
    });
    await render(<Harness {...deps} />);
    await waitFor(() => expect(view()).toBe("standard"));
  });

  it("받을 양 읽기가 거부되면 cellular이고 sizeLabel은 없다", async () => {
    const deps = {
      readConnection: jest.fn(async (): Promise<Connection> => "cellular"),
      readSizeLabel: jest.fn(async (): Promise<string | null> => {
        throw new Error("읽기 실패");
      }),
    };
    await render(<Harness {...deps} />);
    await waitFor(() => expect(view()).toBe("cellular"));
    expect(size()).toBe("없음");
  });
});

describe("CG8 — defer", () => {
  it("cellular에서 defer하면 deferred이고 sizeLabel을 비운다", async () => {
    const deps = depsOf("cellular");
    await render(<Harness {...deps} />);
    await waitFor(() => expect(view()).toBe("cellular"));
    await fireEvent.press(screen.getByTestId("defer"));
    expect(view()).toBe("deferred");
    expect(size()).toBe("없음");
  });
});

describe("CG9 — 다시 판정", () => {
  it("deferred에서 recheck하면 reading을 거쳐 새 연결로 판정한다 — 이제 wifi면 standard", async () => {
    const connections: Connection[] = ["cellular", "wifi"];
    const deps = depsOf(async () => connections.shift() ?? "wifi");
    await render(<Harness {...deps} />);
    await waitFor(() => expect(view()).toBe("cellular"));
    await fireEvent.press(screen.getByTestId("defer"));
    await fireEvent.press(screen.getByTestId("recheck"));
    await waitFor(() => expect(view()).toBe("standard"));
    expect(deps.readConnection).toHaveBeenCalledTimes(2);
  });

  it("recheck 뒤에도 여전히 cellular면 cellular다", async () => {
    const deps = depsOf("cellular");
    await render(<Harness {...deps} />);
    await waitFor(() => expect(view()).toBe("cellular"));
    await fireEvent.press(screen.getByTestId("defer"));
    await fireEvent.press(screen.getByTestId("recheck"));
    await waitFor(() => expect(view()).toBe("cellular"));
    expect(deps.readConnection).toHaveBeenCalledTimes(2);
  });

  it("deferred 상태에서 앱이 전경으로 돌아오면(active) 다시 읽는다", async () => {
    const spy = jest.spyOn(AppState, "addEventListener");
    const connections: Connection[] = ["cellular", "wifi"];
    const deps = depsOf(async () => connections.shift() ?? "wifi");
    await render(<Harness {...deps} />);
    await waitFor(() => expect(view()).toBe("cellular"));
    await fireEvent.press(screen.getByTestId("defer"));
    await fireAppState(spy, "active");
    await waitFor(() => expect(view()).toBe("standard"));
    expect(deps.readConnection).toHaveBeenCalledTimes(2);
  });

  it("★ cellular·standard 중에는 전경 복귀에 다시 읽지 않는다(눈앞의 대화상자를 바꾸지 않는다)", async () => {
    const spy = jest.spyOn(AppState, "addEventListener");
    spy.mockClear();
    const deps = depsOf("cellular");
    await render(<Harness {...deps} />);
    await waitFor(() => expect(view()).toBe("cellular"));
    await fireAppState(spy, "active");
    expect(deps.readConnection).toHaveBeenCalledTimes(1);
    expect(view()).toBe("cellular");
  });

  it("deferred에서 active가 아닌 상태 변화(background)는 무시한다", async () => {
    const spy = jest.spyOn(AppState, "addEventListener");
    const deps = depsOf("cellular");
    await render(<Harness {...deps} />);
    await waitFor(() => expect(view()).toBe("cellular"));
    await fireEvent.press(screen.getByTestId("defer"));
    await fireAppState(spy, "background");
    expect(deps.readConnection).toHaveBeenCalledTimes(1);
    expect(view()).toBe("deferred");
  });
});

describe("CG10 — 늦게 온 옛 결과는 버린다", () => {
  it("recheck 뒤에 먼저 시작한 읽기가 늦게 끝나도 새 판정을 덮지 않는다", async () => {
    const resolvers: ((c: Connection) => void)[] = [];
    const deps = depsOf(() => new Promise<Connection>((resolve) => resolvers.push(resolve)));
    await render(<Harness {...deps} />);
    await fireEvent.press(screen.getByTestId("recheck")); // 두 번째 읽기가 시작된다
    await waitFor(() => expect(resolvers).toHaveLength(2));
    await act(async () => resolvers[1]?.("wifi"));
    await waitFor(() => expect(view()).toBe("standard"));
    await act(async () => resolvers[0]?.("cellular")); // 옛 읽기가 늦게 도착
    expect(view()).toBe("standard");
  });

  it("언마운트 뒤에 읽기가 끝나도 오류가 없다", async () => {
    let release: (c: Connection) => void = () => {};
    const deps = depsOf(() => new Promise<Connection>((resolve) => (release = resolve)));
    const { unmount } = await render(<Harness {...deps} />);
    await unmount();
    await act(async () => release("cellular"));
    expect(deps.readSizeLabel).not.toHaveBeenCalled();
  });
});

describe("소스 — AppState.currentState를 판정에 쓰지 않는다 (AGENTS: 전경 복귀는 다시 판정할 때의 신호일 뿐)", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/app/use-consent-gate.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("currentState 참조가 없고 3000 리터럴도 없다(한도는 consent-gate.ts 한 곳)", () => {
    expect(SOURCE).not.toMatch(/currentState/);
    expect(SOURCE).not.toMatch(/\b3000\b|3_000/);
    expect(SOURCE).toMatch(/READ_LIMIT_MS/);
  });
});
