/**
 * DayPicker — 홈의 7칸 스트립 (048, 보드 `1d`).
 *
 * 계약: specs/048-diary-home-modernist/contracts/home-screen.md S1~S6
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **009·012의 세로 목록이 7칸 가로 스트립으로 바뀌었다.** 판정은 여전히 여기 없다 —
 * 어느 칸을 누를 수 있는지·어느 칸이 골라졌는지는 `stripCellsFor()`가 정해서 넘긴다.
 * 012가 여기 두었던 정오 이전 안내는 하단 바(「오늘 일기는 … 쓸 수 있어요」)로 옮겨 갔다.
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise를 반환한다 — `await`한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react-native";

import type { StripCell } from "../../src/app/state";
import { DayPicker } from "../../src/ui/DayPicker";
import { COLORS } from "../../src/ui/theme/tokens";

jest.setTimeout(30000);

/** 2026-09-24(목) 10:00 기준 — 누를 수 있는 칸은 21~24(24는 아직 쓸 수 없는 오늘) */
const cells: readonly StripCell[] = [
  { day: "2026-09-18", hasDiary: false, selectable: false, selected: false },
  { day: "2026-09-19", hasDiary: true, selectable: false, selected: false },
  { day: "2026-09-20", hasDiary: false, selectable: false, selected: false },
  { day: "2026-09-21", hasDiary: false, selectable: true, selected: false },
  { day: "2026-09-22", hasDiary: false, selectable: true, selected: false },
  { day: "2026-09-23", hasDiary: true, selectable: true, selected: true },
  { day: "2026-09-24", hasDiary: false, selectable: true, selected: false },
];

const flatStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

describe("048 DayPicker — 7칸 스트립", () => {
  it("S1 — 7칸이 날짜 testID와 요일·날짜 숫자를 갖는다", async () => {
    await render(<DayPicker cells={cells} onSelect={() => {}} />);

    expect(screen.getByTestId("day-strip")).toBeTruthy();
    for (const cell of cells) expect(screen.getByTestId(`day-${cell.day}`)).toBeTruthy();
    // 2026-09-24는 목요일, 18일은 금요일
    expect(screen.getByTestId("day-2026-09-24")).toHaveTextContent(/목\s*24/);
    expect(screen.getByTestId("day-2026-09-18")).toHaveTextContent(/금\s*18/);
  });

  it("S2 — 누를 수 있는 칸을 누르면 그 날이 전달된다", async () => {
    const onSelect = jest.fn();
    await render(<DayPicker cells={cells} onSelect={onSelect} />);

    await fireEvent.press(screen.getByTestId("day-2026-09-24"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("2026-09-24");
  });

  it("★ S3 — 흐린 칸은 눌러도 아무 일도 없다 (쓴 일기가 있어도)", async () => {
    const onSelect = jest.fn();
    await render(<DayPicker cells={cells} onSelect={onSelect} />);

    await fireEvent.press(screen.getByTestId("day-2026-09-19"));
    await fireEvent.press(screen.getByTestId("day-2026-09-18"));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByTestId("day-2026-09-19").props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it("S4 — 일기가 있는 날에는 점이 있다 (흐린 칸 포함)", async () => {
    await render(<DayPicker cells={cells} onSelect={() => {}} />);

    expect(screen.getByTestId("day-dot-2026-09-19")).toBeTruthy();
    expect(screen.getByTestId("day-dot-2026-09-23")).toBeTruthy();
    expect(screen.queryByTestId("day-dot-2026-09-24")).toBeNull();
  });

  it("S5 — 고른 칸은 selected이고 강조색 배경이다", async () => {
    await render(<DayPicker cells={cells} onSelect={() => {}} />);

    const chosen = screen.getByTestId("day-2026-09-23");
    expect(chosen.props.accessibilityState).toMatchObject({ selected: true });
    expect(flatStyle(chosen.props.style).backgroundColor).toBe(COLORS.accent);
    expect(screen.getByTestId("day-2026-09-22").props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  it("★ S6 — 스트립은 판정하지 않는다 (지금 시각을 스스로 읽지 않는다)", () => {
    const code = readFileSync(join(__dirname, "../../src/ui/DayPicker.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toContain("new Date(");
    expect(code).not.toMatch(/\bnow\s*\(/);
    expect(code).not.toContain("isDayWritable");
  });
});
