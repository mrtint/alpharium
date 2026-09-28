/**
 * DayPicker — 홈의 주간 스트립 (049, 보드 `1d`).
 *
 * 계약: specs/049-home-day-picker/contracts/day-picking.md S1~S6
 *       (이전: specs/048-diary-home-modernist/contracts/home-screen.md — 오늘로 끝나는 7일)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **049 — 일~토 고정 주, 좌우로 넘겨 주 단위로 오간다.** 판정은 여전히 여기 없다 —
 * 칸은 `weekCellsFor()`가, 넘긴 뒤의 날은 `swipeWeek()`가 정한다. 스트립은 방향만 알린다.
 *
 * **jest는 배선만 본다**(C9). 끌림·튕김이 실제로 움직이는지는 reanimated 목 때문에 여기서
 * 검증할 수 없다 — quickstart D4·D5 실기기에서 본다.
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise를 반환한다 — `await`한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { State } from "react-native-gesture-handler";
import { fireGestureHandler, getByGestureTestId } from "react-native-gesture-handler/jest-utils";

import type { StripCell } from "../../src/app/state";
import { DayPicker, swipeDirectionOf } from "../../src/ui/DayPicker";
import { COLORS } from "../../src/ui/theme/tokens";

jest.setTimeout(30000);

/** 오늘 2026-09-24(목), 23일 선택. 25·26은 미래 */
const cells: readonly StripCell[] = [
  { day: "2026-09-20", hasDiary: false, isToday: false, selectable: true, selected: false },
  { day: "2026-09-21", hasDiary: true, isToday: false, selectable: true, selected: false },
  { day: "2026-09-22", hasDiary: false, isToday: false, selectable: true, selected: false },
  { day: "2026-09-23", hasDiary: true, isToday: false, selectable: true, selected: true },
  { day: "2026-09-24", hasDiary: false, isToday: true, selectable: true, selected: false },
  { day: "2026-09-25", hasDiary: false, isToday: false, selectable: false, selected: false },
  { day: "2026-09-26", hasDiary: false, isToday: false, selectable: false, selected: false },
];

const flatStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

const SOURCE = readFileSync(join(__dirname, "../../src/ui/DayPicker.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

async function renderPicker(overrides: Partial<Parameters<typeof DayPicker>[0]> = {}) {
  const props = {
    cells,
    onSelect: jest.fn(),
    onSwipe: jest.fn(),
    canSwipeNext: true,
    ...overrides,
  };
  await render(<DayPicker {...props} />);
  return props;
}

/** 팬 제스처를 끝까지 쏜다 — 시작 → 끌림 → 끝 */
function pan(translationX: number, velocityX = 0) {
  act(() => {
    fireGestureHandler(getByGestureTestId("day-strip-pan"), [
      { state: State.BEGAN, translationX: 0, velocityX: 0 },
      { state: State.ACTIVE, translationX: translationX / 2, velocityX },
      { state: State.ACTIVE, translationX, velocityX },
      { state: State.END, translationX, velocityX },
    ]);
  });
}

describe("049 DayPicker — 일~토 주간 스트립", () => {
  it("S1 — 7칸이 날짜 testID와 요일·날짜 숫자를 갖는다 (일~토)", async () => {
    await renderPicker();

    expect(screen.getByTestId("day-strip")).toBeTruthy();
    for (const cell of cells) expect(screen.getByTestId(`day-${cell.day}`)).toBeTruthy();
    expect(screen.getByTestId("day-2026-09-20")).toHaveTextContent(/일\s*20/);
    expect(screen.getByTestId("day-2026-09-26")).toHaveTextContent(/토\s*26/);
  });

  it("S1 — 일기가 있는 날에만 점", async () => {
    await renderPicker();
    expect(screen.getByTestId("day-dot-2026-09-21")).toBeTruthy();
    expect(screen.getByTestId("day-dot-2026-09-23")).toBeTruthy();
    expect(screen.queryByTestId("day-dot-2026-09-24")).toBeNull();
  });

  it("누를 수 있는 칸을 누르면 그 날이 전달된다", async () => {
    const props = await renderPicker();
    await fireEvent.press(screen.getByTestId("day-2026-09-24"));
    expect(props.onSelect).toHaveBeenCalledWith("2026-09-24");
  });

  it("고른 칸은 selected이고 강조색 배경이다", async () => {
    await renderPicker();
    const chosen = screen.getByTestId("day-2026-09-23");
    expect(chosen.props.accessibilityState).toMatchObject({ selected: true });
    expect(flatStyle(chosen.props.style).backgroundColor).toBe(COLORS.accent);
  });

  it("★ S2 — 오늘 칸만 밑줄, 선택되지 않았으면 강조색", async () => {
    await renderPicker();
    const underline = screen.getByTestId("day-today-2026-09-24");
    expect(flatStyle(underline.props.style).backgroundColor).toBe(COLORS.accent);
    expect(screen.queryByTestId("day-today-2026-09-23")).toBeNull();
  });

  it("S2 — 오늘이 선택되면 밑줄은 선택 칸 글자색", async () => {
    await renderPicker({
      cells: cells.map((c) => ({ ...c, selected: c.day === "2026-09-24" })),
    });
    const underline = screen.getByTestId("day-today-2026-09-24");
    expect(flatStyle(underline.props.style).backgroundColor).toBe(COLORS.accentForeground);
  });

  it("★ S3 — 흐린(미래) 칸은 disabled·불투명도 0.3이고 눌러도 아무 일도 없다", async () => {
    const props = await renderPicker();
    const future = screen.getByTestId("day-2026-09-25");
    await fireEvent.press(future);
    expect(props.onSelect).not.toHaveBeenCalled();
    expect(future.props.accessibilityState).toMatchObject({ disabled: true });
    expect(flatStyle(future.props.style).opacity).toBe(0.3);
  });

  /**
   * **팬 배선은 한 렌더 안에서만 쏜다.** gesture-handler의 jest 레지스트리는 testID로 핸들러를
   * 찾는데, 앞 테스트에서 팬을 쏜 뒤 새로 렌더한 스트립에 쏘면 **앞 테스트의 핸들러**가 불리는
   * 것을 실측했다(2026-09-27, 핸들러 태그가 매번 1). 그래서 배선은 이 테스트 하나에서 보고,
   * 문턱 판정은 순수 함수 `swipeDirectionOf`로 따로 잠근다.
   */
  it("★ S4 — 팬이 끝나면 방향이 전달된다 (오른쪽 → 이전 주, 왼쪽 → 다음 주, 짧으면 없음)", async () => {
    const props = await renderPicker();
    pan(80);
    expect(props.onSwipe).toHaveBeenLastCalledWith("previous");
    pan(-80);
    expect(props.onSwipe).toHaveBeenLastCalledWith("next");
    pan(20);
    expect(props.onSwipe).toHaveBeenCalledTimes(2);
  });

  it.each([
    [80, 0, "previous"],
    [-80, 0, "next"],
    [40, 0, "previous"],
    [39, 0, null],
    [20, 0, null],
    [15, 800, "previous"],
    [-15, -800, "next"],
    [0, 600, "previous"],
    [15, 100, null],
  ] as const)("S4 — swipeDirectionOf(%d, %d) = %s", (dx, vx, expected) => {
    expect(swipeDirectionOf(dx, vx)).toBe(expected);
  });

  it("★ S5 — 스트립은 판정하지 않는다 (지금 시각·경계를 모른다)", () => {
    expect(SOURCE).not.toContain("new Date(");
    expect(SOURCE).not.toContain("dayOf");
    expect(SOURCE).not.toMatch(/\bnow\s*\(/);
    expect(SOURCE).not.toContain("isDayWritable");
    expect(SOURCE).not.toContain("swipeWeek");
  });

  it("★ S6 — 이어 스크롤하지 않는다 (ScrollView·FlatList 없음)", () => {
    expect(SOURCE).not.toMatch(/\bScrollView\b/);
    expect(SOURCE).not.toMatch(/\bFlatList\b/);
  });

  // 실기기(2026-09-28): 밑줄을 오늘 칸에만 그리니 오늘이 든 주에서만 스트립이 높아져, 주를 넘길
  // 때마다 아래 신호 줄·목록이 위아래로 튀었다. 밑줄 자리는 모든 칸에 둔다.
  // 실기기(2026-09-28, 화면 녹화): 넘길 때도 스프링으로 돌려 놓으니 새 주가 끌던 자리에서 되돌아오며
  // 좌우로 출렁여 「숫자가 빠르게 여러 번 바뀐다」로 보였다. 넘기면 그 자리에서 교체하고, 튕김도
  // 출렁이지 않는다.
  it("★ S8 — 넘기면 즉시 교체, 되돌림은 출렁이지 않는다 (스프링 없음)", () => {
    expect(SOURCE).not.toContain("withSpring");
    // 새 주가 그려지는 커밋에서 제자리로 — 손을 뗀 순간이 아니다.
    expect(SOURCE).toMatch(
      /useLayoutEffect\(\(\) => \{[\s\S]*?translateX\.value = 0;[\s\S]*?\}, \[week, translateX, awaitingWeek\]\)/,
    );
    expect(SOURCE).not.toMatch(/onSwipe\?\.\(direction\);\s*translateX\.value = 0/);
  });

  it("★ S7 — 밑줄 자리는 오늘 칸에만 생기지 않는다 (주를 넘겨도 높이가 같다)", () => {
    expect(SOURCE).not.toMatch(/isToday\s*&&/);
    expect(SOURCE).toMatch(/testID=\{isToday \? `day-today-\$\{day\}` : undefined\}/);
  });
});
