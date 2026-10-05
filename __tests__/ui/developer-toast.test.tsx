/**
 * 059 — 설정·개발자 토스트 (계약 DV10).
 *
 * reanimated 목의 `useAnimatedStyle`은 `{}`를 준다 — 움직임은 검사하지 못한다(C9). 여기서 보는 것은 문구·접근성 역할·수명(가짜 시계)·
 * 「한 번에 하나」(`key`로 새로 마운트)다. ⚠️ RNTL 14의 `render`·`rerender`는 Promise다 — await한다.
 */

import { act, render, screen } from "@testing-library/react-native";

import { DeveloperToast, TOAST_SHOW_MS } from "../../src/ui/DeveloperToast";

jest.setTimeout(30000);

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("DV10 — 토스트", () => {
  it("제목과 보조 줄을 그리고 alert·polite live region이다", async () => {
    await render(
      <DeveloperToast
        bottom={24}
        onDismiss={jest.fn()}
        sub="이 기기에서만"
        text="개발자 메뉴가 켜졌어요"
      />,
    );
    expect(screen.getByText("개발자 메뉴가 켜졌어요")).toBeTruthy();
    expect(screen.getByText("이 기기에서만")).toBeTruthy();
    const toast = screen.getByTestId("developer-toast");
    expect(toast.props.accessibilityRole).toBe("alert");
    expect(toast.props.accessibilityLiveRegion).toBe("polite");
  });

  it("보조 줄이 없으면 그리지 않는다", async () => {
    await render(<DeveloperToast bottom={24} onDismiss={jest.fn()} text="이미 켜져 있어요" />);
    expect(screen.queryByTestId("developer-toast-sub")).toBeNull();
  });

  it("2초 뒤 onDismiss 가 한 번 불린다", async () => {
    expect(TOAST_SHOW_MS).toBe(2000);
    const onDismiss = jest.fn();
    await render(<DeveloperToast bottom={24} onDismiss={onDismiss} text="x" />);
    await act(async () => {
      jest.advanceTimersByTime(1999);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("key 를 바꿔 다시 마운트하면 새 문구가 이전 것을 대신한다(한 번에 하나)", async () => {
    const onDismiss = jest.fn();
    const view = await render(
      <DeveloperToast key="1" bottom={24} onDismiss={onDismiss} text="첫째" />,
    );
    await view.rerender(<DeveloperToast key="2" bottom={24} onDismiss={onDismiss} text="둘째" />);
    expect(screen.queryByText("첫째")).toBeNull();
    expect(screen.getByText("둘째")).toBeTruthy();
    expect(screen.getAllByTestId("developer-toast")).toHaveLength(1);
  });
});
