/**
 * 일기 본문 밀기 — 안 쓴 날 재료 지면의 배선 (114, FR-001·006).
 *
 * 팬 배선은 한 테스트 안에서만 쏜다(`day-swipe-screen.test.tsx` 머리 주석).
 */

import { act, render, screen, within } from "@testing-library/react-native";
import { State } from "react-native-gesture-handler";
import { fireGestureHandler, getByGestureTestId } from "react-native-gesture-handler/jest-utils";

import { writePromptFor, weekCellsFor } from "../../src/app/state";
import { DiaryListScreen, type DiaryListScreenProps } from "../../src/ui/DiaryListScreen";

jest.setTimeout(30000);

const NOW = new Date("2026-09-24T10:00:00");

async function renderMaterial(over: Partial<DiaryListScreenProps> = {}) {
  const write = writePromptFor([], NOW, "2026-09-23");
  const props: DiaryListScreenProps = {
    items: [],
    onWrite: jest.fn(),
    onSelectDay: jest.fn(),
    onSwipeDay: jest.fn(),
    write,
    cells: weekCellsFor([], write, NOW),
    ...over,
  };
  await render(<DiaryListScreen {...props} />);
  return props;
}

describe("114 안 쓴 날 — 걸지 않는 경우", () => {
  it("onSwipeDay를 넘기지 않으면 밀기 영역이 없다", async () => {
    await renderMaterial({ onSwipeDay: undefined });
    expect(screen.queryByTestId("material-day-swipe")).toBeNull();
    expect(screen.getByTestId("material-paper")).toBeTruthy();
  });
});

/** 팬을 쏘는 테스트는 마지막에 둔다 — 쏜 뒤의 렌더는 앞 테스트의 핸들러·트리와 섞인다(`day-picker.test.tsx`). */
describe("114 안 쓴 날 재료 지면에 걸린 밀기", () => {
  it("★ 재료 지면 전체가 밀기 영역 안에 있고, 오른쪽으로 밀면 previous, 왼쪽이면 next가 불린다", async () => {
    const props = await renderMaterial();
    expect(
      within(screen.getByTestId("material-day-swipe")).getByTestId("material-paper"),
    ).toBeTruthy();

    const pan = (translationX: number) =>
      act(() => {
        fireGestureHandler(getByGestureTestId("day-swipe-pan"), [
          { state: State.BEGAN, translationX: 0, velocityX: 0 },
          { state: State.ACTIVE, translationX: translationX / 2, velocityX: 0 },
          { state: State.ACTIVE, translationX, velocityX: 0 },
          { state: State.END, translationX, velocityX: 0 },
        ]);
      });

    pan(90);
    expect(props.onSwipeDay).toHaveBeenLastCalledWith("previous");
    pan(-90);
    expect(props.onSwipeDay).toHaveBeenLastCalledWith("next");
  });
});
