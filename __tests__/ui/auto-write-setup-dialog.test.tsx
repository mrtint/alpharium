/**
 * 131 — 자동 쓰기 설정 창 (안내 규칙 D2·D5).
 * 계약: specs/131-auto-write-setup-sheet/contracts/auto-write-setup.md 「AutoWriteSetupDialog props」
 */

import { fireEvent, screen } from "@testing-library/react-native";
import { BackHandler } from "react-native";

import {
  AutoWriteSetupDialog,
  type AutoWriteSetupDialogProps,
} from "../../src/ui/AutoWriteSetupDialog";
import { renderWithPortal } from "./render-with-portal";

function props(over: Partial<AutoWriteSetupDialogProps> = {}): AutoWriteSetupDialogProps {
  return {
    platform: "android",
    enabled: true,
    targetHourText: "오후 10시쯤",
    batteryTag: "denied",
    onToggle: () => {},
    onPickHour: () => {},
    onOpenBattery: () => {},
    onConfirm: () => {},
    onLater: () => {},
    ...over,
  };
}

describe("AutoWriteSetupDialog", () => {
  it("안드로이드: 제목·세 행·안드로이드 조건 줄·두 버튼", async () => {
    await renderWithPortal(<AutoWriteSetupDialog {...props()} />);
    expect(screen.getByText("매일 일기를 써 드릴까요?")).toBeTruthy();
    expect(screen.getByText("자동으로 쓰기")).toBeTruthy();
    expect(screen.getByText("쓰는 시각")).toBeTruthy();
    expect(screen.getByText("오후 10시쯤")).toBeTruthy();
    expect(screen.getByText("배터리 제한 풀기")).toBeTruthy();
    expect(screen.getByText("허용 안 함")).toBeTruthy();
    expect(
      screen.getByText("이 시간에 배터리 제한을 풀거나 충전중이라면 자동으로 작성해요"),
    ).toBeTruthy();
    expect(screen.getByText("켜기")).toBeTruthy();
    expect(screen.getByText("나중에")).toBeTruthy();
  });

  it("iOS: 배터리 행이 없고 iOS 조건 줄", async () => {
    await renderWithPortal(<AutoWriteSetupDialog {...props({ platform: "ios" })} />);
    expect(screen.queryByText("배터리 제한 풀기")).toBeNull();
    expect(screen.getByText("이 시간에 충전중이라면 자동으로 작성해요")).toBeTruthy();
  });

  it("배터리 상태를 모르면 꼬리표를 그리지 않는다(원칙 V)", async () => {
    await renderWithPortal(<AutoWriteSetupDialog {...props({ batteryTag: undefined })} />);
    expect(screen.getByText("배터리 제한 풀기")).toBeTruthy();
    expect(screen.queryByText("허용 안 함")).toBeNull();
    expect(screen.queryByText("허용됨")).toBeNull();
  });

  it("허용됨 꼬리표", async () => {
    await renderWithPortal(<AutoWriteSetupDialog {...props({ batteryTag: "allowed" })} />);
    expect(screen.getByText("허용됨")).toBeTruthy();
  });

  it("행과 버튼이 각각 부른다", async () => {
    const p = {
      onToggle: jest.fn(),
      onPickHour: jest.fn(),
      onOpenBattery: jest.fn(),
      onConfirm: jest.fn(),
      onLater: jest.fn(),
    };
    await renderWithPortal(<AutoWriteSetupDialog {...props(p)} />);
    await fireEvent.press(screen.getByTestId("auto-write-setup-toggle"));
    expect(p.onToggle).toHaveBeenCalledWith(false);
    await fireEvent.press(screen.getByTestId("auto-write-setup-hour"));
    expect(p.onPickHour).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId("auto-write-setup-battery"));
    expect(p.onOpenBattery).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId("auto-write-setup-confirm"));
    expect(p.onConfirm).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId("auto-write-setup-later"));
    expect(p.onLater).toHaveBeenCalledTimes(1);
  });

  it("뒤로 가기는 나중에와 같다", async () => {
    const add = jest.spyOn(BackHandler, "addEventListener");
    const onLater = jest.fn();
    await renderWithPortal(<AutoWriteSetupDialog {...props({ onLater })} />);
    const handler = add.mock.calls.at(-1)?.[1] as (() => boolean) | undefined;
    handler?.();
    expect(onLater).toHaveBeenCalledTimes(1);
  });
});
