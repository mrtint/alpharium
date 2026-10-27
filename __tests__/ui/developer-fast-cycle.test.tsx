/**
 * 106 — 개발자 화면의 「빠른 주기」 묶음과 켜기 확인창 (spec US5·US3 AS4, FR-009·FR-012).
 *
 * 화면은 판정하지 않는다 — 상태를 그리고 누름을 알릴 뿐이다. 직접 입력의 검증은 조립부가 한다(여기서는 콜백이 거절하면 오류가 보이는지만).
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 */

import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  DeveloperScreen,
  type DeveloperScreenProps,
  type FastCycleSection,
} from "../../src/ui/DeveloperScreen";
import { FastCycleConfirmDialog } from "../../src/ui/FastCycleConfirmDialog";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

function section(over: Partial<FastCycleSection> = {}): FastCycleSection {
  return {
    on: false,
    periodMinutes: null,
    cycleId: null,
    nextStartText: null,
    autoWriteEnabled: true,
    startFailed: false,
    onToggle: jest.fn(),
    onSelectPreset: jest.fn(),
    onSubmitCustom: jest.fn(() => true),
    ...over,
  };
}

function props(over: Partial<DeveloperScreenProps> = {}): DeveloperScreenProps {
  return {
    modules: { reading: null, writing: null },
    showsDiagnostics: true,
    onRedownload: jest.fn(),
    onReplayOnboarding: jest.fn(),
    onDisable: jest.fn(),
    onOpenDiagnostics: jest.fn(),
    attempts: [],
    failures: [],
    ...over,
  };
}

describe("US5 AS1·AS5 — 묶음은 개발 환경에서만 보인다", () => {
  it("fastCycle prop이 있으면 켬/끔·프리셋 셋·직접 입력·지금 주기·다음 주기 시작·한계 안내가 보인다", async () => {
    await render(
      <DeveloperScreen
        {...props({
          fastCycle: section({
            on: true,
            periodMinutes: 30,
            cycleId: "2026-10-26#20",
            nextStartText: "10:30",
          }),
        })}
      />,
    );
    expect(screen.getByTestId("developer-group-fast-cycle")).toBeTruthy();
    expect(screen.getByTestId("fast-cycle-toggle")).toBeTruthy();
    for (const m of [10, 30, 60]) expect(screen.getByTestId(`fast-cycle-preset-${m}`)).toBeTruthy();
    expect(screen.getByTestId("fast-cycle-custom-input")).toBeTruthy();
    expect(screen.getByText("2026-10-26#20")).toBeTruthy();
    expect(screen.getByText("10:30")).toBeTruthy();
    expect(screen.getByTestId("fast-cycle-limits")).toBeTruthy();
    // 선택된 프리셋에만 「선택됨」
    expect(screen.getAllByText("선택됨")).toHaveLength(1);
  });

  it("배포 환경(prop 없음)에는 묶음이 없다", async () => {
    await render(<DeveloperScreen {...props()} />);
    expect(screen.queryByTestId("developer-group-fast-cycle")).toBeNull();
  });
});

describe("누름이 콜백으로 간다", () => {
  it("토글·프리셋", async () => {
    const s = section();
    await render(<DeveloperScreen {...props({ fastCycle: s })} />);
    await fireEvent.press(screen.getByTestId("fast-cycle-toggle"));
    expect(s.onToggle).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId("fast-cycle-preset-10"));
    expect(s.onSelectPreset).toHaveBeenCalledWith(10);
    await fireEvent.press(screen.getByTestId("fast-cycle-preset-60"));
    expect(s.onSelectPreset).toHaveBeenCalledWith(60);
  });
});

describe("US5 AS2 — 직접 입력", () => {
  it("받아들여지면 오류 없이 입력이 비워진다", async () => {
    const s = section({ onSubmitCustom: jest.fn(() => true) });
    await render(<DeveloperScreen {...props({ fastCycle: s })} />);
    await fireEvent.changeText(screen.getByTestId("fast-cycle-custom-input"), "45");
    await fireEvent.press(screen.getByTestId("fast-cycle-custom-apply"));
    expect(s.onSubmitCustom).toHaveBeenCalledWith("45");
    expect(screen.queryByTestId("fast-cycle-custom-error")).toBeNull();
    expect(screen.getByTestId("fast-cycle-custom-input").props.value).toBe("");
  });

  it.each(["4", "181", "30.5"])("%j는 거절되고 오류가 보이며 입력은 그대로다", async (text) => {
    const s = section({ onSubmitCustom: jest.fn(() => false) });
    await render(<DeveloperScreen {...props({ fastCycle: s })} />);
    await fireEvent.changeText(screen.getByTestId("fast-cycle-custom-input"), text);
    await fireEvent.press(screen.getByTestId("fast-cycle-custom-apply"));
    expect(screen.getByTestId("fast-cycle-custom-error")).toBeTruthy();
    expect(screen.getByTestId("fast-cycle-custom-input").props.value).toBe(text);
  });

  it("다시 입력하면 오류가 사라진다", async () => {
    const s = section({ onSubmitCustom: jest.fn(() => false) });
    await render(<DeveloperScreen {...props({ fastCycle: s })} />);
    await fireEvent.changeText(screen.getByTestId("fast-cycle-custom-input"), "4");
    await fireEvent.press(screen.getByTestId("fast-cycle-custom-apply"));
    expect(screen.getByTestId("fast-cycle-custom-error")).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId("fast-cycle-custom-input"), "40");
    expect(screen.queryByTestId("fast-cycle-custom-error")).toBeNull();
  });
});

describe("US5 AS4 — 자동으로 쓰기가 꺼져 있으면 안내", () => {
  it("켜져 있고 자동 쓰기가 꺼져 있으면 안내가 보인다", async () => {
    await render(
      <DeveloperScreen
        {...props({ fastCycle: section({ on: true, periodMinutes: 30, autoWriteEnabled: false }) })}
      />,
    );
    expect(screen.getByTestId("fast-cycle-auto-off")).toBeTruthy();
  });

  it("자동 쓰기가 켜져 있거나 모드가 꺼져 있으면 안내가 없다", async () => {
    const view = await render(
      <DeveloperScreen
        {...props({ fastCycle: section({ on: true, periodMinutes: 30, autoWriteEnabled: true }) })}
      />,
    );
    expect(screen.queryByTestId("fast-cycle-auto-off")).toBeNull();
    await view.rerender(
      <DeveloperScreen
        {...props({ fastCycle: section({ on: false, autoWriteEnabled: false }) })}
      />,
    );
    expect(screen.queryByTestId("fast-cycle-auto-off")).toBeNull();
  });
});

describe("켜기 실패", () => {
  it("startFailed면 안내가 보이고 아니면 없다", async () => {
    const view = await render(
      <DeveloperScreen {...props({ fastCycle: section({ startFailed: true }) })} />,
    );
    expect(screen.getByTestId("fast-cycle-start-failed")).toBeTruthy();
    await view.rerender(<DeveloperScreen {...props({ fastCycle: section() })} />);
    expect(screen.queryByTestId("fast-cycle-start-failed")).toBeNull();
  });
});

describe("FR-009 — 켜기 확인창", () => {
  it("오늘 일기를 지운다고 말하고 확인·취소가 콜백으로 간다", async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await renderWithPortal(<FastCycleConfirmDialog onCancel={onCancel} onConfirm={onConfirm} />);
    expect(screen.getByText(/오늘 일기도 지워져요/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId("fast-cycle-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId("fast-cycle-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
