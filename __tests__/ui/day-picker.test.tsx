/**
 * DayPicker — 홈의 날 스트립 (119, 이전 049 보드 `1d`).
 *
 * 계약: specs/119-strip-continuous-scroll/contracts/strip-scroll.md CS-S1~S8
 *       (049 contracts/day-picking.md S1·S2·S3·S5를 잇는다. S4·S6은 119가 대신한다)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **119 — 오늘에서 끝나는 이어 스크롤.** 하루에 한 칸, 가로 목록이 칸 단위로 붙는다. 스크롤은 고른 날을
 * 바꾸지 않고 칸 누름만 바꾼다. 칸 목록은 `stripCellsFor()`가, 고른 칸을 화면 안으로 가져올 위치는
 * `stripScrollTarget()`가 정한다 — 스트립은 판정하지 않는다.
 *
 * **jest는 배선만 본다.** 관성·붙기의 실제 손맛은 실기기에서 본다(quickstart).
 * 칸 폭은 `onLayout`으로 안다 — 테스트는 스트립에 `layout` 이벤트(폭 350 → 칸 50)를 쏜다.
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise를 반환한다 — `await`한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { AccessibilityInfo, FlatList } from "react-native";

import type { StripCell } from "../../src/app/state";
import { DayPicker, newStripMemory } from "../../src/ui/DayPicker";
import { COLORS, DAY_STRIP } from "../../src/ui/theme/tokens";

jest.setTimeout(30000);

/** 오늘 2026-09-24(목), 23일 선택. 25·26은 흐린 칸(실제 스트립에는 미래 칸이 없지만 표시 규칙을 잠근다) */
const cells: readonly StripCell[] = [
  { day: "2026-09-20", hasDiary: false, isToday: false, selectable: true, selected: false },
  { day: "2026-09-21", hasDiary: true, isToday: false, selectable: true, selected: false },
  { day: "2026-09-22", hasDiary: false, isToday: false, selectable: true, selected: false },
  { day: "2026-09-23", hasDiary: true, isToday: false, selectable: true, selected: true },
  { day: "2026-09-24", hasDiary: false, isToday: true, selectable: true, selected: false },
  { day: "2026-09-25", hasDiary: false, isToday: false, selectable: false, selected: false },
  { day: "2026-09-26", hasDiary: false, isToday: false, selectable: false, selected: false },
];

/** 30칸 — 2026-09-01 ~ 09-30, 오늘 30일. 고른 날을 바꿔 가며 쓴다 */
function month(selected: string): StripCell[] {
  return Array.from({ length: 30 }, (_, i) => {
    const day = `2026-09-${String(i + 1).padStart(2, "0")}`;
    return {
      day,
      hasDiary: false,
      isToday: day === "2026-09-30",
      selectable: true,
      selected: day === selected,
    };
  });
}

const flatStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

const SOURCE = readFileSync(join(__dirname, "../../src/ui/DayPicker.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

const WIDTH = 350;
const CELL = WIDTH / 7;

async function layout() {
  await act(async () => {
    fireEvent(screen.getByTestId("day-strip"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: WIDTH, height: 60 } },
    });
  });
}

async function renderPicker(overrides: Partial<Parameters<typeof DayPicker>[0]> = {}) {
  const props = { cells, onSelect: jest.fn(), ...overrides };
  await render(<DayPicker {...props} />);
  await layout();
  return props;
}

/** 가로 목록 — testID `day-strip-list` */
function list() {
  return screen.getByTestId("day-strip-list");
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("119 DayPicker — 오늘에서 끝나는 이어 스크롤 스트립", () => {
  it("CS-S1·CS-S8 — 칸마다 날짜 testID와 요일·날짜 숫자, 스트립 testID는 day-strip", async () => {
    await renderPicker();

    expect(screen.getByTestId("day-strip")).toBeTruthy();
    for (const cell of cells) expect(screen.getByTestId(`day-${cell.day}`)).toBeTruthy();
    expect(screen.getByTestId("day-2026-09-20")).toHaveTextContent(/일\s*20/);
    expect(screen.getByTestId("day-2026-09-26")).toHaveTextContent(/토\s*26/);
  });

  it("폭을 재기 전에는 창 폭으로 어림해 칸을 그리고, 잰 뒤에는 그 폭으로 다시 세운다", async () => {
    await render(<DayPicker cells={month("2026-09-30")} onSelect={jest.fn()} />);
    expect(screen.getByTestId("day-2026-09-30")).toBeTruthy();
    const estimated = flatStyle(screen.getByTestId("day-2026-09-30").props.style).width;
    expect(estimated).toBeGreaterThan(0);
    await layout();
    expect(flatStyle(screen.getByTestId("day-2026-09-30").props.style).width).toBe(CELL);
    expect(list().props.initialScrollIndex).toBe(30 - 7);
  });

  it("CS-S1 — 일기가 있는 날에만 점", async () => {
    await renderPicker();
    expect(screen.getByTestId("day-dot-2026-09-21")).toBeTruthy();
    expect(screen.getByTestId("day-dot-2026-09-23")).toBeTruthy();
    expect(screen.queryByTestId("day-dot-2026-09-24")).toBeNull();
  });

  it("★ CS-S2 — 누를 수 있는 칸을 누르면 그 날이 전달된다", async () => {
    const props = await renderPicker();
    await fireEvent.press(screen.getByTestId("day-2026-09-24"));
    expect(props.onSelect).toHaveBeenCalledWith("2026-09-24");
  });

  it("★ CS-S3 — 스크롤만으로는 고른 날이 바뀌지 않는다", async () => {
    const props = await renderPicker({ cells: month("2026-09-30") });
    const event = { nativeEvent: { contentOffset: { x: 5 * CELL, y: 0 } } };
    await fireEvent.scroll(list(), event);
    await fireEvent(list(), "momentumScrollEnd", event);
    await fireEvent(list(), "scrollEndDrag", event);
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it("고른 칸은 selected이고 강조색 배경이다", async () => {
    await renderPicker();
    const chosen = screen.getByTestId("day-2026-09-23");
    expect(chosen.props.accessibilityState).toMatchObject({ selected: true });
    expect(flatStyle(chosen.props.style).backgroundColor).toBe(COLORS.accent);
  });

  it("★ 049 S2 — 오늘 칸만 밑줄, 선택되지 않았으면 강조색", async () => {
    await renderPicker();
    const underline = screen.getByTestId("day-today-2026-09-24");
    expect(flatStyle(underline.props.style).backgroundColor).toBe(COLORS.accent);
    expect(screen.queryByTestId("day-today-2026-09-23")).toBeNull();
  });

  it("049 S2 — 오늘이 선택되면 밑줄은 선택 칸 글자색", async () => {
    await renderPicker({
      cells: cells.map((c) => ({ ...c, selected: c.day === "2026-09-24" })),
    });
    const underline = screen.getByTestId("day-today-2026-09-24");
    expect(flatStyle(underline.props.style).backgroundColor).toBe(COLORS.accentForeground);
  });

  it("049 S3 — 흐린 칸은 disabled·불투명도 0.3이고 눌러도 아무 일도 없다", async () => {
    const props = await renderPicker();
    const future = screen.getByTestId("day-2026-09-25");
    await fireEvent.press(future);
    expect(props.onSelect).not.toHaveBeenCalled();
    expect(future.props.accessibilityState).toMatchObject({ disabled: true });
    expect(flatStyle(future.props.style).opacity).toBe(0.3);
  });

  it("088 FR-004~FR-007 — 요일(DOW)에 opacity가 없고 선택 칸은 accentForeground, 비선택 칸은 DAY_STRIP.dowMuted다 (C4)", async () => {
    await renderPicker();
    const chosenDow = within(screen.getByTestId("day-2026-09-23")).getByText("수");
    const chosenStyle = flatStyle(chosenDow.props.style);
    expect(chosenStyle.color).toBe(COLORS.accentForeground);
    expect(chosenStyle.opacity).toBeUndefined();
    expect(chosenStyle.fontSize).toBe(10);
    expect(chosenStyle.letterSpacing).toBe(0.6);

    const unselectedDow = within(screen.getByTestId("day-2026-09-24")).getByText("목");
    const unselectedStyle = flatStyle(unselectedDow.props.style);
    expect(unselectedStyle.color).toBe(DAY_STRIP.dowMuted);
    expect(unselectedStyle.opacity).toBeUndefined();
  });

  it("★ FR-004·FR-005 — 칸 폭은 스트립 폭의 1/7이고 칸 단위로 붙는다", async () => {
    await renderPicker({ cells: month("2026-09-30") });
    const props = list().props;
    expect(props.horizontal).toBe(true);
    expect(props.snapToInterval).toBe(CELL);
    expect(props.getItemLayout(null, 4)).toEqual({ length: CELL, offset: 4 * CELL, index: 4 });
    expect(flatStyle(screen.getByTestId("day-2026-09-30").props.style).width).toBe(CELL);
  });

  it("★ FR-008 — 오른쪽 끝(오늘)에서 시작한다", async () => {
    await renderPicker({ cells: month("2026-09-30") });
    expect(list().props.initialScrollIndex).toBe(30 - 7);
  });

  it("FR-008 — 고른 날이 그 화면 밖이면 고른 날이 왼쪽 끝인 위치에서 시작한다", async () => {
    await renderPicker({ cells: month("2026-09-05") });
    expect(list().props.initialScrollIndex).toBe(4);
  });

  it("FR-008 — 칸이 7보다 적으면 처음부터", async () => {
    await renderPicker({ cells: cells.slice(0, 3) });
    expect(list().props.initialScrollIndex).toBe(0);
  });

  it("★ CS-S6 — 고른 날이 화면 밖의 날로 바뀌면 그 칸이 보이게 스크롤한다", async () => {
    const spy = jest.spyOn(FlatList.prototype, "scrollToOffset").mockImplementation(() => {});
    const onSelect = jest.fn();
    await render(<DayPicker cells={month("2026-09-30")} onSelect={onSelect} />);
    await layout();
    spy.mockClear();

    // 지금 보이는 칸은 24~30일(인덱스 23~29). 3일(인덱스 2)은 왼쪽 밖이다.
    await screen.rerender(<DayPicker cells={month("2026-09-03")} onSelect={onSelect} />);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toMatchObject({ offset: 2 * CELL });
  });

  it("★ CS-S6 — 화면 안의 날로 바뀌면 스크롤하지 않는다", async () => {
    const spy = jest.spyOn(FlatList.prototype, "scrollToOffset").mockImplementation(() => {});
    const onSelect = jest.fn();
    await render(<DayPicker cells={month("2026-09-30")} onSelect={onSelect} />);
    await layout();
    spy.mockClear();

    await screen.rerender(<DayPicker cells={month("2026-09-26")} onSelect={onSelect} />);
    expect(spy).not.toHaveBeenCalled();
  });

  it("CS-S6 — 사용자가 스크롤한 위치를 기준으로 판정한다", async () => {
    const spy = jest.spyOn(FlatList.prototype, "scrollToOffset").mockImplementation(() => {});
    const onSelect = jest.fn();
    await render(<DayPicker cells={month("2026-09-30")} onSelect={onSelect} />);
    await layout();
    // 1~7일이 보이게 스크롤했다
    await fireEvent.scroll(list(), { nativeEvent: { contentOffset: { x: 0, y: 0 } } });
    spy.mockClear();

    await screen.rerender(<DayPicker cells={month("2026-09-05")} onSelect={onSelect} />);
    expect(spy).not.toHaveBeenCalled();
    await screen.rerender(<DayPicker cells={month("2026-09-20")} onSelect={onSelect} />);
    expect(spy.mock.calls[0][0]).toMatchObject({ offset: (19 - 6) * CELL });
  });

  it("★ CS-S7 — 동작 줄이기가 켜져 있으면 움직임 없이 옮긴다", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const spy = jest.spyOn(FlatList.prototype, "scrollToOffset").mockImplementation(() => {});
    const onSelect = jest.fn();
    await render(<DayPicker cells={month("2026-09-30")} onSelect={onSelect} />);
    await layout();
    spy.mockClear();

    await screen.rerender(<DayPicker cells={month("2026-09-03")} onSelect={onSelect} />);
    expect(spy.mock.calls[0][0]).toMatchObject({ animated: false });
  });

  it("CS-S7 — 동작 줄이기가 꺼져 있으면 가까운 칸으로는 미끄러진다", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    const spy = jest.spyOn(FlatList.prototype, "scrollToOffset").mockImplementation(() => {});
    const onSelect = jest.fn();
    await render(<DayPicker cells={month("2026-09-30")} onSelect={onSelect} />);
    await layout();
    spy.mockClear();

    // 보이는 칸 24~30일 — 20일(인덱스 19)은 네 칸 왼쪽이다.
    await screen.rerender(<DayPicker cells={month("2026-09-20")} onSelect={onSelect} />);
    expect(spy.mock.calls[0][0]).toMatchObject({ offset: 19 * CELL, animated: true });
  });

  it("리뷰 — 한 화면보다 먼 칸으로는 움직임 없이 옮긴다(수백 칸을 미끄러지지 않는다)", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    const spy = jest.spyOn(FlatList.prototype, "scrollToOffset").mockImplementation(() => {});
    const onSelect = jest.fn();
    await render(<DayPicker cells={month("2026-09-30")} onSelect={onSelect} />);
    await layout();
    spy.mockClear();

    await screen.rerender(<DayPicker cells={month("2026-09-03")} onSelect={onSelect} />);
    expect(spy.mock.calls[0][0]).toMatchObject({ offset: 2 * CELL, animated: false });
  });

  it("리뷰 — 범위 앞쪽이 늘어난 직후의 이동은 움직임 없이 옮긴다", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    const spy = jest.spyOn(FlatList.prototype, "scrollToOffset").mockImplementation(() => {});
    const onSelect = jest.fn();
    await render(<DayPicker cells={month("2026-09-30")} onSelect={onSelect} />);
    await layout();
    spy.mockClear();

    // 8월 31일을 골라 앞에 한 칸이 붙었다(먼 날을 골라 범위가 늘어난 것과 같다).
    const grown: StripCell[] = [
      { day: "2026-08-31", hasDiary: false, isToday: false, selectable: true, selected: true },
      ...month("none"),
    ];
    await screen.rerender(<DayPicker cells={grown} onSelect={onSelect} />);
    expect(spy.mock.calls[0][0]).toMatchObject({ offset: 0, animated: false });
  });

  it("범위 앞쪽이 바뀌어도(자정·먼 날) 보던 날을 기준으로 위치를 고친다", async () => {
    const spy = jest.spyOn(FlatList.prototype, "scrollToOffset").mockImplementation(() => {});
    const onSelect = jest.fn();
    const base = month("2026-09-30");
    await render(<DayPicker cells={base} onSelect={onSelect} />);
    await layout();
    spy.mockClear();

    // 첫 칸이 하나 빠지고(자정) 고른 날은 그대로 — 보이던 날들이 그대로 보이게 한 칸 당긴다.
    const shifted = base.slice(1);
    await screen.rerender(<DayPicker cells={shifted} onSelect={onSelect} />);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toMatchObject({ offset: 22 * CELL, animated: false });
  });

  it("★ CS-S4 — 주 넘김 팬이 없고 가로 목록이 있다(소스)", () => {
    expect(SOURCE).not.toMatch(/Gesture\.Pan/);
    expect(SOURCE).not.toContain("day-strip-pan");
    expect(SOURCE).not.toContain("swipeDirectionOf");
    expect(SOURCE).not.toContain("RUBBER_BAND");
    expect(SOURCE).not.toMatch(/\bonSwipe\b/);
    expect(SOURCE).toMatch(/\bFlatList\b/);
    expect(SOURCE).toContain("getItemLayout");
    expect(SOURCE).toContain("snapToInterval");
  });

  it("★ CS-S5 — 스트립은 판정하지 않는다 (지금 시각·경계를 모른다)", () => {
    expect(SOURCE).not.toContain("new Date(");
    expect(SOURCE).not.toContain("dayOf");
    expect(SOURCE).not.toMatch(/\bnow\s*\(/);
    expect(SOURCE).not.toContain("isDayWritable");
    expect(SOURCE).toContain("stripScrollTarget");
  });

  it("049 S7 — 밑줄 자리는 오늘 칸에만 생기지 않는다 (높이가 같다)", () => {
    expect(SOURCE).not.toMatch(/isToday\s*&&/);
    expect(SOURCE).toMatch(/testID=\{isToday \? `day-today-\$\{day\}` : undefined\}/);
  });

  it("088 FR-004 — opacity는 흐린 칸(CELL_DIMMED) 한 곳에만 있다 (C4)", () => {
    expect(SOURCE.match(/\bopacity\s*:/g) ?? []).toHaveLength(1);
    expect(SOURCE).toMatch(/const CELL_DIMMED\s*=\s*\{\s*opacity:\s*0\.3\s*\}/);
  });

  it("★ 리뷰 — 기억을 넘기면 다시 마운트돼도 보던 첫 칸에서 이어 간다(쓴 날 ↔ 안 쓴 날 갈래 전환)", async () => {
    const memoryRef = { current: newStripMemory() };
    const onSelect = jest.fn();
    const first = await render(
      <DayPicker cells={month("2026-09-30")} memoryRef={memoryRef} onSelect={onSelect} />,
    );
    await layout();
    // 5~11일이 보이게 밀었다.
    await fireEvent.scroll(list(), { nativeEvent: { contentOffset: { x: 4 * CELL, y: 0 } } });
    expect(memoryRef.current).toEqual({ firstDay: "2026-09-05", width: WIDTH });
    await first.unmount();

    // 보이던 8일을 눌러 갈래가 바뀌고 스트립이 새로 마운트된다 — 같은 자리(5일이 첫 칸)에서 시작한다.
    await render(
      <DayPicker cells={month("2026-09-08")} memoryRef={memoryRef} onSelect={onSelect} />,
    );
    expect(list().props.initialScrollIndex).toBe(4);
    expect(flatStyle(screen.getByTestId("day-2026-09-08").props.style).width).toBe(CELL);
  });

  it("리뷰 — 기억한 자리 밖의 날로 다시 마운트되면 그 칸이 보이게 최소 거리만 옮긴 자리에서 시작한다", async () => {
    const memoryRef = { current: { firstDay: "2026-09-05", width: WIDTH } };
    await render(
      <DayPicker cells={month("2026-09-20")} memoryRef={memoryRef} onSelect={jest.fn()} />,
    );
    expect(list().props.initialScrollIndex).toBe(19 - 6);
  });
});
