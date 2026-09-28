/**
 * HomeMenu — 하단 바의 `⋯` 메뉴 (048).
 *
 * 계약: specs/048-diary-home-modernist/contracts/home-screen.md M1~M5, B7
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **전역 탭 줄이 사라졌으므로 설정·개발자로 가는 유일한 길이다**(설계 D1·D2). 무엇을 담을지는
 * 부르는 쪽(`App.tsx`)이 정한다 — 개발자 항목은 prod에서 배열에 **아예 없다**(M6은
 * `home-navigation.test.tsx`가 소스로 잠근다). 이 컴포넌트는 받은 것만 그린다.
 *
 * **050 — RN 코어 `Modal`에서 RNR `DropdownMenu`로 옮겼다**(Clarifications Q4, contracts MIG2). 계약
 * (열기·항목·바깥 누름·뒤로 가기·testID)은 그대로이고, 포털로 뜨므로 `renderWithPortal`로 그린다. 코어
 * `Modal`에 묶였던 수단(`requestClose` 이벤트)은 프리미티브가 등록하는 뒤로 가기 핸들러로 바꿨다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { act, fireEvent, screen } from "@testing-library/react-native";
import { BackHandler } from "react-native";

import { HomeMenu, type HomeMenuItem } from "../../src/ui/HomeMenu";
import { COLORS } from "../../src/ui/theme/tokens";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

/**
 * 050 — 프리미티브 메뉴는 열 때 트리거를 `measure()`로 재고, 잰 값이 없으면 목록을 그리지 않는다
 * (`@rn-primitives/dropdown-menu`의 `Portal`이 `triggerPosition`이 없으면 `null`). jest의 RN 목은
 * `measure`가 콜백을 부르지 않는 빈 `jest.fn()`이라(`@react-native/jest-preset/jest/MockNativeMethods`)
 * 버튼 자리를 흉내 내 준다. 실제 위치(하단 바 윗선을 덮지 않는가)는 실기기에서 본다(C9).
 */
beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- RN jest 목 내부 객체라 경로로 가져온다
  const mockNativeMethods = require("@react-native/jest-preset/jest/MockNativeMethods").default;
  (mockNativeMethods.measure as jest.Mock).mockImplementation(
    (callback: (...args: number[]) => void) => callback(0, 0, 50, 50, 20, 700),
  );
});

const flatStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

function items(withDeveloper: boolean) {
  const settings = jest.fn();
  const developer = jest.fn();
  const list: HomeMenuItem[] = [
    { key: "settings", label: "설정", onPress: settings },
    ...(withDeveloper ? [{ key: "developer", label: "개발자", onPress: developer }] : []),
  ];
  return { list, settings, developer };
}

describe("048 HomeMenu", () => {
  it("닫혀 있을 때는 항목이 보이지 않는다", async () => {
    await renderWithPortal(<HomeMenu items={items(true).list} />);

    expect(screen.getByTestId("home-menu-button")).toBeTruthy();
    expect(screen.queryByTestId("home-menu-settings")).toBeNull();
  });

  it("M1·M2 — 누르면 위로 펼쳐지고 항목이 보인다", async () => {
    await renderWithPortal(<HomeMenu items={items(true).list} />);

    await fireEvent.press(screen.getByTestId("home-menu-button"));
    expect(screen.getByTestId("home-menu-settings")).toHaveTextContent("설정");
    expect(screen.getByTestId("home-menu-developer")).toHaveTextContent("개발자");
  });

  it("★ M3 — 개발자 항목을 받지 않으면 그 노드가 존재하지 않는다", async () => {
    await renderWithPortal(<HomeMenu items={items(false).list} />);

    await fireEvent.press(screen.getByTestId("home-menu-button"));
    expect(screen.getByTestId("home-menu-settings")).toBeTruthy();
    expect(screen.queryByTestId("home-menu-developer")).toBeNull();
    expect(screen.queryByText("개발자")).toBeNull();
  });

  it("M4 — 항목을 누르면 닫히고 그 동작이 한 번 불린다", async () => {
    const { list, settings, developer } = items(true);
    await renderWithPortal(<HomeMenu items={list} />);

    await fireEvent.press(screen.getByTestId("home-menu-button"));
    await fireEvent.press(screen.getByTestId("home-menu-settings"));
    expect(settings).toHaveBeenCalledTimes(1);
    expect(developer).not.toHaveBeenCalled();
    expect(screen.queryByTestId("home-menu-settings")).toBeNull();
  });

  it("M5 — 바깥을 누르면 아무 동작 없이 닫힌다", async () => {
    const { list, settings } = items(true);
    await renderWithPortal(<HomeMenu items={list} />);

    await fireEvent.press(screen.getByTestId("home-menu-button"));
    await fireEvent.press(screen.getByTestId("home-menu-backdrop"));
    expect(settings).not.toHaveBeenCalled();
    expect(screen.queryByTestId("home-menu-settings")).toBeNull();
  });

  it("M5 — 뒤로 가기로도 닫힌다", async () => {
    type Listener = () => boolean | null | undefined;
    const handlers: Listener[] = [];
    jest.spyOn(BackHandler, "addEventListener").mockImplementation((event, handler) => {
      if (event === "hardwareBackPress") handlers.push(handler as Listener);
      return { remove: () => {} } as ReturnType<typeof BackHandler.addEventListener>;
    });
    await renderWithPortal(<HomeMenu items={items(true).list} />);

    await fireEvent.press(screen.getByTestId("home-menu-button"));
    expect(screen.getByTestId("home-menu-list")).toBeTruthy();
    await act(async () => {
      for (const handler of [...handlers].reverse()) {
        if (handler() === true) break;
      }
    });
    expect(screen.queryByTestId("home-menu-settings")).toBeNull();
  });

  it("B7 — 버튼은 쓰기 바와 같은 높이의 정사각형이고 잉크색 테두리다", async () => {
    await renderWithPortal(<HomeMenu items={items(true).list} />);

    const style = flatStyle(screen.getByTestId("home-menu-button").props.style);
    expect(style.width).toBe(50);
    expect(style.height).toBe(50);
    expect(style.borderColor).toBe(COLORS.text);
    expect(style.borderColor).not.toBe(COLORS.accent);
  });
});
