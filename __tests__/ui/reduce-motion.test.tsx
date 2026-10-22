import { act, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Text } from "react-native";

import { useReduceMotion } from "../../src/ui/reduce-motion";

/**
 * 100 FR-007 — OS 「동작 줄이기」 값을 읽는 훅. 읽기 전에는 모른다(`undefined`) — 모르는 것을 기본값으로 채우지 않는다(원칙 V).
 * 읽지 못하면 켜지 않은 것으로 본다(종전 동작을 지킨다). 켜고 끄는 알림을 받아 따라간다.
 */

function Probe() {
  return <Text testID="value">{String(useReduceMotion())}</Text>;
}

describe("100 — useReduceMotion", () => {
  afterEach(() => jest.restoreAllMocks());

  it("읽기 전에는 undefined, 읽은 뒤에는 그 값이다", async () => {
    let resolve: (v: boolean) => void = () => {};
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(
      new Promise<boolean>((r) => {
        resolve = r;
      }),
    );
    jest
      .spyOn(AccessibilityInfo, "addEventListener")
      .mockReturnValue({ remove: jest.fn() } as never);

    await render(<Probe />);
    expect(screen.getByTestId("value").props.children).toBe("undefined");

    await act(async () => resolve(true));
    expect(screen.getByTestId("value").props.children).toBe("true");
  });

  it("읽지 못하면 켜지 않은 것으로 본다", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockRejectedValue(new Error("x"));
    jest
      .spyOn(AccessibilityInfo, "addEventListener")
      .mockReturnValue({ remove: jest.fn() } as never);

    await render(<Probe />);
    await act(async () => {});

    expect(screen.getByTestId("value").props.children).toBe("false");
  });

  it("알림이 먼저 오면 늦게 도착한 처음 읽은 값이 덮어쓰지 않는다", async () => {
    let resolve: (v: boolean) => void = () => {};
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(
      new Promise<boolean>((r) => {
        resolve = r;
      }),
    );
    let listener: (v: boolean) => void = () => {};
    jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation(((
      _name: string,
      handler: (v: boolean) => void,
    ) => {
      listener = handler;
      return { remove: jest.fn() };
    }) as never);

    await render(<Probe />);
    await act(async () => listener(true));
    await act(async () => resolve(false));

    expect(screen.getByTestId("value").props.children).toBe("true");
  });

  it("reduceMotionChanged 알림을 따라가고, 내려갈 때 구독을 푼다", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    const remove = jest.fn();
    let listener: (v: boolean) => void = () => {};
    const add = jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation(((
      _name: string,
      handler: (v: boolean) => void,
    ) => {
      listener = handler;
      return { remove };
    }) as never);

    const view = await render(<Probe />);
    await act(async () => {});
    expect(add).toHaveBeenCalledWith("reduceMotionChanged", expect.any(Function));
    expect(screen.getByTestId("value").props.children).toBe("false");

    await act(async () => listener(true));
    expect(screen.getByTestId("value").props.children).toBe("true");

    await view.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
