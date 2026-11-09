/**
 * 111 — 첫 일기 확인창 (규칙 문서 0-1).
 */

import { fireEvent, screen } from "@testing-library/react-native";
import { BackHandler } from "react-native";

import { FirstDiaryConfirmDialog } from "../../src/ui/MaterialDialogs";
import { renderWithPortal } from "./render-with-portal";

describe("FirstDiaryConfirmDialog", () => {
  it("규칙 문서의 문구를 그린다", async () => {
    await renderWithPortal(<FirstDiaryConfirmDialog onConfirm={() => {}} onLater={() => {}} />);
    expect(screen.getByText("오늘 사진으로 첫 일기를 써 볼까요?")).toBeTruthy();
    expect(
      screen.getByText("사진과 다닌 곳으로 하루를 짐작해 써요. 몇 분 걸릴 수 있어요."),
    ).toBeTruthy();
    expect(screen.getByText("써 보기")).toBeTruthy();
    expect(screen.getByText("나중에")).toBeTruthy();
  });

  it("두 버튼이 각각 부른다", async () => {
    const onConfirm = jest.fn();
    const onLater = jest.fn();
    await renderWithPortal(<FirstDiaryConfirmDialog onConfirm={onConfirm} onLater={onLater} />);
    await fireEvent.press(screen.getByTestId("first-diary-confirm-yes"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onLater).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId("first-diary-confirm-later"));
    expect(onLater).toHaveBeenCalledTimes(1);
  });

  it("뒤로 가기는 나중에와 같다", async () => {
    const add = jest.spyOn(BackHandler, "addEventListener");
    const onLater = jest.fn();
    await renderWithPortal(<FirstDiaryConfirmDialog onConfirm={() => {}} onLater={onLater} />);
    const handler = add.mock.calls.at(-1)?.[1] as (() => boolean) | undefined;
    expect(handler).toBeDefined();
    handler?.();
    expect(onLater).toHaveBeenCalledTimes(1);
  });
});
