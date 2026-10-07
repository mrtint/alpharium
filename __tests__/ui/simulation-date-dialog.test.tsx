/**
 * 064 — 상태 흉내 「오늘 날짜」 대화상자 (contracts/simulation.md DV3, 설계 B2).
 *
 * 실제 datepicker를 그린다(050 date-jump-dialog.test와 같다). 미래 날도 고를 수 있다 — 흉내 중에는 쓰기가 막혀 있다.
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 */

import { fireEvent, screen } from "@testing-library/react-native";

import { SimulationDateDialog } from "../../src/ui/SimulationDateDialog";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

async function open(date: string | null, initialDay = "2026-10-07") {
  const onPick = jest.fn();
  const onOff = jest.fn();
  const onClose = jest.fn();
  await renderWithPortal(
    <SimulationDateDialog
      date={date}
      initialDay={initialDay}
      onClose={onClose}
      onOff={onOff}
      onPick={onPick}
      open
    />,
  );
  await screen.findByTestId("sim-date-dialog");
  return { onPick, onOff, onClose };
}

describe("DV3 — 오늘 날짜 대화상자", () => {
  it("제목은 「오늘 날짜」, 고른 날(없으면 실제 오늘)의 달을 연다", async () => {
    await open("2026-09-13");
    expect(screen.getByText("오늘 날짜")).toBeTruthy();
    expect(screen.getByTestId("sim-date-month")).toHaveTextContent("9월");
    expect(screen.getByTestId("sim-date-year")).toHaveTextContent("2026년");
  });

  it("날을 누르면 그 날로 onPick", async () => {
    const { onPick } = await open(null);
    await fireEvent.press(screen.getByTestId("sim-date-day-2026-10-03"));
    expect(onPick).toHaveBeenCalledWith("2026-10-03");
  });

  it("미래 날도 고를 수 있다", async () => {
    const { onPick } = await open(null);
    await fireEvent.press(screen.getByTestId("sim-date-next"));
    await fireEvent.press(screen.getByTestId("sim-date-day-2026-11-15"));
    expect(onPick).toHaveBeenCalledWith("2026-11-15");
  });

  it("「끄기」는 켜졌을 때만 누를 수 있다", async () => {
    const off = await open(null);
    await fireEvent.press(screen.getByTestId("sim-date-off"));
    expect(off.onOff).not.toHaveBeenCalled();
  });

  it("켜져 있으면 「끄기」가 onOff, 「취소」가 onClose", async () => {
    const on = await open("2026-09-13");
    await fireEvent.press(screen.getByTestId("sim-date-off"));
    expect(on.onOff).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId("sim-date-cancel"));
    expect(on.onClose).toHaveBeenCalledTimes(1);
  });
});
