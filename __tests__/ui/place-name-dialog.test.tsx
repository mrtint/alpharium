/**
 * 056 — 장소 이름으로 보기 대화상자 (보드 `6l`, contracts/settings-time-place.md PD1~PD3).
 * 121 — 두 칸(켬·끔)과 고지 문구(contracts/diary-places.md ST2·ST3). 보드 `6l`의 「자동」 칸은 걷었다(보드 밖 변경).
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다. 대화상자는 포털로 올라가므로 `renderWithPortal`.
 */

import { act, fireEvent, screen, within } from "@testing-library/react-native";
import { BackHandler, StyleSheet } from "react-native";

import type { GeocodingPreference } from "../../src/app/geocoding-setting-store";
import { PlaceNameDialog } from "../../src/ui/PlaceNameDialog";
import { COLORS } from "../../src/ui/theme/tokens";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

type BackListener = () => boolean | null | undefined;

function captureBackHandlers(): BackListener[] {
  const handlers: BackListener[] = [];
  jest.spyOn(BackHandler, "addEventListener").mockImplementation((event, handler) => {
    if (event === "hardwareBackPress") handlers.push(handler as BackListener);
    return { remove: () => {} } as ReturnType<typeof BackHandler.addEventListener>;
  });
  return handlers;
}

const flat = (node: { props: { style?: unknown } }): Record<string, unknown> =>
  (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;

async function open(value: GeocodingPreference = "on") {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  const handlers = captureBackHandlers();
  await renderWithPortal(
    <PlaceNameDialog onClose={onClose} onSelect={onSelect} open value={value} />,
  );
  return { onSelect, onClose, handlers };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("PD1 — 열린 모양", () => {
  it("제목·두 칸(이름·설명)·고지·「취소」가 원문 그대로다", async () => {
    await open();
    expect(screen.getByText("장소 이름으로 보기")).toBeTruthy();
    const cases = [
      ["on", "켬", "일기를 쓸 때 다닌 자리 근처의 장소 이름을 참고해요"],
      ["off", "끔", "장소 이름을 옮기지 않아요"],
    ] as const;
    for (const [mode, name, desc] of cases) {
      const option = screen.getByTestId(`place-name-${mode}`);
      expect(within(option).getByText(name)).toBeTruthy();
      expect(within(option).getByText(desc)).toBeTruthy();
    }
    expect(screen.getByTestId("place-name-notice")).toHaveTextContent(
      "장소 이름은 휴대폰 안의 지도 자료에서 찾아요. 좌표는 밖으로 보내지 않아요.",
    );
    expect(screen.getByTestId("place-name-cancel")).toBeTruthy();
    // ST2 — 「자동」 칸이 없다
    expect(screen.queryByTestId("place-name-auto")).toBeNull();
    expect(screen.queryByText("자동")).toBeNull();
  });

  it.each(["on", "off"] as const)("지금 값 %s의 칸이 선택돼 있다", async (value) => {
    await open(value);
    for (const mode of ["on", "off"] as const) {
      expect(screen.getByTestId(`place-name-${mode}`).props.accessibilityState).toMatchObject({
        selected: mode === value,
      });
    }
  });

  it("선택 칸은 2px 본문색 테두리 + accent 표식, 아닌 칸은 1px 구분선", async () => {
    await open("off");
    expect(flat(screen.getByTestId("place-name-off"))).toMatchObject({
      borderWidth: 2,
      borderColor: COLORS.text,
    });
    expect(flat(screen.getByTestId("place-name-off-mark"))).toMatchObject({
      backgroundColor: COLORS.accent,
    });
    expect(flat(screen.getByText("끔"))).toMatchObject({
      fontSize: 16,
      fontWeight: "800",
      lineHeight: 16 * 1.55,
    });
    expect(flat(screen.getByText("켬"))).toMatchObject({ fontSize: 16, fontWeight: "600" });
    expect(flat(screen.getByTestId("place-name-on"))).toMatchObject({
      borderWidth: 1,
      borderColor: COLORS.border,
    });
  });
});

describe("PD2 — 칸 한 번에 적용", () => {
  it("다른 칸 → onSelect(값) 1회", async () => {
    const { onSelect, onClose } = await open("on");
    await fireEvent.press(screen.getByTestId("place-name-off"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("off");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("같은 칸 → onClose만", async () => {
    const { onSelect, onClose } = await open("on");
    await fireEvent.press(screen.getByTestId("place-name-on"));
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("연타해도 onSelect는 한 번", async () => {
    const { onSelect } = await open("off");
    const option = screen.getByTestId("place-name-on");
    await fireEvent.press(option);
    await fireEvent.press(option);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe("PD3 — 바꾸지 않고 닫기", () => {
  it("「취소」 → onClose만", async () => {
    const { onSelect, onClose } = await open();
    await fireEvent.press(screen.getByTestId("place-name-cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("바깥 → onClose만", async () => {
    const { onSelect, onClose } = await open();
    await fireEvent.press(screen.getByTestId("place-name-dialog-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("뒤로 → onClose만", async () => {
    const { onSelect, onClose, handlers } = await open();
    await act(async () => {
      for (const handler of [...handlers].reverse()) if (handler() === true) break;
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
