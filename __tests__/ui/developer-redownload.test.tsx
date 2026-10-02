/**
 * 059 — 모듈 다시 받기 확인 대화상자 (US3, 보드 `6e` ① — `2d`와 같은 틀).
 *
 * 계약: specs/059-developer-menu/contracts/developer-menu.md TX(보드 밖 문구)·RD2·RD3, spec FR-017·FR-020
 *
 * 그리기만 한다 — 「모바일 데이터로 {size}」는 연결이 모바일로 확인될 때만 부르는 쪽이 `cellularSize`를 준다(`planRedownload`).
 * 확인 대화상자라 덮개를 눌러도 닫히지 않고 뒤로 가기는 「취소」다(050). ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 */

import { fireEvent, screen } from "@testing-library/react-native";
import { BackHandler } from "react-native";

import { DEVELOPER_TEXT } from "../../src/ui/developer-text";
import { RedownloadConfirmDialog } from "../../src/ui/RedownloadConfirmDialog";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

describe("본문", () => {
  it("모바일이 확인되면 용량을 말한다", async () => {
    await renderWithPortal(
      <RedownloadConfirmDialog cellularSize="1.2GB" onCancel={jest.fn()} onConfirm={jest.fn()} />,
    );
    expect(screen.getByText(DEVELOPER_TEXT.redownloadTitle)).toBeTruthy();
    expect(screen.getByText("모바일 데이터로 1.2GB를 받아요.")).toBeTruthy();
    expect(screen.queryByText(DEVELOPER_TEXT.redownloadBody)).toBeNull();
  });

  it("cellularSize 가 null 이면 용량 없이 무엇을 하는지만 말한다", async () => {
    await renderWithPortal(
      <RedownloadConfirmDialog cellularSize={null} onCancel={jest.fn()} onConfirm={jest.fn()} />,
    );
    expect(screen.getByText(DEVELOPER_TEXT.redownloadBody)).toBeTruthy();
    expect(screen.queryByText(/모바일 데이터/)).toBeNull();
  });
});

describe("버튼", () => {
  it("「받기」는 onConfirm, 「취소」는 onCancel 만 부른다", async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await renderWithPortal(
      <RedownloadConfirmDialog cellularSize={null} onCancel={onCancel} onConfirm={onConfirm} />,
    );
    expect(screen.getByText(DEVELOPER_TEXT.redownloadConfirm)).toBeTruthy();
    await fireEvent.press(screen.getByTestId("redownload-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId("redownload-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("안드로이드 뒤로 가기는 「취소」와 같다", async () => {
    const handlers: (() => boolean | null | undefined)[] = [];
    jest.spyOn(BackHandler, "addEventListener").mockImplementation((event, handler) => {
      if (event === "hardwareBackPress") handlers.push(handler as () => boolean);
      return { remove: () => {} } as ReturnType<typeof BackHandler.addEventListener>;
    });
    const onCancel = jest.fn();
    await renderWithPortal(
      <RedownloadConfirmDialog cellularSize={null} onCancel={onCancel} onConfirm={jest.fn()} />,
    );
    const handled = [...handlers].reverse().some((handler) => handler() === true);
    expect(handled).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(1);
    jest.restoreAllMocks();
  });
});
