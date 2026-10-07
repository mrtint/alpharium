/**
 * 064 — 상태 흉내 훅 (tasks T007, contracts AF5).
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다. 통로는 메모리 대역이다.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import type { SimulationStorePort } from "../../src/app/simulation-store";
import { useSimulation } from "../../src/ui/use-simulation";

jest.setTimeout(30000);

function port(initial: string | null = null, fail = false) {
  let content = initial;
  const p: SimulationStorePort & { content: () => string | null } = {
    read: jest.fn(async () => {
      if (fail) throw new Error("io");
      return content;
    }),
    write: jest.fn(async (s: string) => {
      if (fail) throw new Error("io");
      content = s;
    }),
    remove: jest.fn(async () => {
      if (fail) throw new Error("io");
      content = null;
    }),
    content: () => content,
  };
  return p;
}

function Probe({ devEnvironment, store }: { devEnvironment: boolean; store: SimulationStorePort }) {
  const { state, set, clear, loaded } = useSimulation({ devEnvironment, port: store });
  return (
    <>
      <Text testID="state">{JSON.stringify(state)}</Text>
      <Text testID="loaded">{loaded ? "yes" : "no"}</Text>
      <Pressable onPress={() => set({ ...state, noPhoto: true })} testID="no-photo" />
      <Pressable onPress={() => set({ ...state, date: "2026-09-13" })} testID="date" />
      <Pressable onPress={clear} testID="clear" />
    </>
  );
}

const shown = () => JSON.parse(screen.getByTestId("state").props.children as string);

describe("개발 환경", () => {
  it("마운트 때 한 번 읽는다", async () => {
    const store = port(JSON.stringify({ failToast: true }));
    await render(<Probe devEnvironment store={store} />);
    await waitFor(() => expect(shown().failToast).toBe(true));
    expect(store.read).toHaveBeenCalledTimes(1);
  });

  it("바꾸면 즉시 반영하고 저장한다", async () => {
    const store = port();
    await render(<Probe devEnvironment store={store} />);
    await fireEvent.press(screen.getByTestId("no-photo"));
    expect(shown().noPhoto).toBe(true);
    await waitFor(() => expect(JSON.parse(store.content()!)).toEqual({ noPhoto: true }));
  });

  it("저장이 실패해도 그 실행의 상태는 바꾼다", async () => {
    const store = port(null, true);
    await render(<Probe devEnvironment store={store} />);
    await fireEvent.press(screen.getByTestId("date"));
    expect(shown().date).toBe("2026-09-13");
  });

  it("clear는 끄고 파일을 지운다(AF2)", async () => {
    const store = port(JSON.stringify({ noPhoto: true }));
    await render(<Probe devEnvironment store={store} />);
    await waitFor(() => expect(shown().noPhoto).toBe(true));
    await fireEvent.press(screen.getByTestId("clear"));
    expect(shown()).toEqual({ date: null, failToast: false, noMaterial: false, noPhoto: false });
    await waitFor(() => expect(store.remove).toHaveBeenCalled());
  });
});

describe("loaded — 기록을 읽었는가(앱 열기 자동 쓰기가 기다린다)", () => {
  it("개발 환경은 읽기가 끝나야 참", async () => {
    let release: (v: string | null) => void = () => {};
    const store = port();
    (store.read as jest.Mock).mockImplementation(
      () =>
        new Promise<string | null>((resolve) => {
          release = resolve;
        }),
    );
    await render(<Probe devEnvironment store={store} />);
    expect(screen.getByTestId("loaded").props.children).toBe("no");
    release(JSON.stringify({ noPhoto: true }));
    await waitFor(() => expect(screen.getByTestId("loaded").props.children).toBe("yes"));
    expect(shown().noPhoto).toBe(true);
  });

  it("읽은 뒤 onLoaded를 한 번 부른다 — 홈이 저장된 날짜 흉내를 고른다", async () => {
    const onLoaded = jest.fn();
    function WithLoaded() {
      useSimulation({ devEnvironment: true, port: store, onLoaded });
      return null;
    }
    const store = port(JSON.stringify({ date: "2026-10-14" }));
    await render(<WithLoaded />);
    await waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(1));
    expect(onLoaded.mock.calls[0][0].date).toBe("2026-10-14");
  });

  it("읽기가 실패해도 참(꺼짐으로)", async () => {
    await render(<Probe devEnvironment store={port(null, true)} />);
    await waitFor(() => expect(screen.getByTestId("loaded").props.children).toBe("yes"));
  });

  it("배포 환경은 처음부터 참", async () => {
    await render(<Probe devEnvironment={false} store={port()} />);
    expect(screen.getByTestId("loaded").props.children).toBe("yes");
  });
});

describe("배포 환경(AF5)", () => {
  it("읽지도 쓰지도 않고 늘 꺼짐", async () => {
    const store = port(JSON.stringify({ noPhoto: true }));
    await render(<Probe devEnvironment={false} store={store} />);
    await fireEvent.press(screen.getByTestId("no-photo"));
    expect(shown().noPhoto).toBe(false);
    expect(store.read).not.toHaveBeenCalled();
    expect(store.write).not.toHaveBeenCalled();
  });
});
