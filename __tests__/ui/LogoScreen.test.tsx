/**
 * 전체화면 로고 계약 테스트 (040).
 *
 * 계약: specs/040-onboarding-parallel-setup/spec.md FR-001
 *       tasks.md T011
 *
 * jest `ui` 프로젝트(jest-expo). `jest.useFakeTimers()`로 지연 전환을 검증한다.
 * RNTL 14 — `render`는 Promise를 반환하므로 `await` 필수(025·035 실측).
 */

import { act, render, screen } from "@testing-library/react-native";

import { LogoScreen, LOGO_DISPLAY_MS } from "../../src/ui/LogoScreen";

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe("LogoScreen — 렌더와 자동 전환", () => {
  it("렌더되면 testID=first-run-logo가 있다", async () => {
    await render(<LogoScreen onDone={() => {}} />);
    expect(screen.getByTestId("first-run-logo")).toBeTruthy();
  });

  it("일정 시간 후 onDone이 사용자 조작 없이 불린다", async () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    await render(<LogoScreen onDone={onDone} />);

    expect(onDone).not.toHaveBeenCalled();

    await act(() => {
      jest.advanceTimersByTime(LOGO_DISPLAY_MS);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("언마운트되면 타이머가 정리되어 onDone이 불리지 않는다", async () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    const { unmount } = await render(<LogoScreen onDone={onDone} />);
    await act(() => {
      unmount();
    });

    await act(() => {
      jest.advanceTimersByTime(LOGO_DISPLAY_MS);
    });

    expect(onDone).not.toHaveBeenCalled();
  });
});
