/**
 * 일기 본문 밀기 — 쓴 날 화면의 배선 (114, FR-001·004·006·008).
 *
 * `DiaryListScreen`에 `paper`를 넘겨 쓴 날을 그린다. 팬 배선은 한 테스트 안에서만 쏜다(gesture-handler의 jest 레지스트리는
 * testID로 핸들러를 찾아, 앞 테스트에서 쏜 뒤 새로 렌더한 것에 쏘면 앞 테스트의 핸들러가 불린다 — `day-picker.test.tsx`).
 * 안 쓴 날의 배선은 `day-swipe-material.test.tsx`다.
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — 반드시 await한다.
 */

import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { State } from "react-native-gesture-handler";
import { fireGestureHandler, getByGestureTestId } from "react-native-gesture-handler/jest-utils";

import type { PaperState } from "../../src/app/written-day";
import { writePromptFor, weekCellsFor, type DiaryListItem } from "../../src/app/state";
import type { DiaryEntry } from "../../src/diary/types";
import { DiaryListScreen, type DiaryListScreenProps } from "../../src/ui/DiaryListScreen";
import { DAY_SWIPE_ACTIONS } from "../../src/ui/home-text";

jest.setTimeout(30000);

const NOW = new Date("2026-09-24T10:00:00");
const DAY = "2026-09-22";

const entry = (withPhoto: boolean): DiaryEntry =>
  ({
    date: DAY,
    title: "비 온 뒤 산책",
    text: "첫 문단이다.\n\n둘째 문단이다.",
    character: "quiet",
    signalsUsed: {},
    createdAt: new Date(`${DAY}T14:00:00`),
    ...(withPhoto
      ? {
          photos: [
            {
              photoId: "p0",
              takenAt: new Date(`${DAY}T09:00:00`),
              resizedPath: "/a.jpg",
              ownsResizedPath: false,
            },
            {
              photoId: "p1",
              takenAt: new Date(`${DAY}T10:00:00`),
              resizedPath: "/b.jpg",
              ownsResizedPath: false,
            },
          ],
        }
      : {}),
  }) as unknown as DiaryEntry;

const items: DiaryListItem[] = [
  { day: DAY, readable: true, photos: { kind: "none" } } as DiaryListItem,
];

async function renderScreen(
  paper: PaperState | undefined,
  over: Partial<DiaryListScreenProps> = {},
) {
  const write = writePromptFor(items, NOW, DAY);
  const props: DiaryListScreenProps = {
    items,
    onWrite: jest.fn(),
    onSelectDay: jest.fn(),
    onPressDate: jest.fn(),
    onSwipeDay: jest.fn(),
    write,
    cells: weekCellsFor(items, write, NOW),
    paper,
    ...over,
  };
  await render(<DiaryListScreen {...props} />);
  return props;
}

describe("114 쓴 날 지면에 걸린 밀기", () => {
  it("읽을 수 있는 쓴 날 — 본문이 밀기 영역 안에 있고 사진 캐러셀은 밖에 있다 (FR-001·004)", async () => {
    await renderScreen({ kind: "readable", entry: entry(true), madeUp: false });

    const swipe = screen.getByTestId("written-day-swipe");
    expect(within(swipe).getByTestId("written-body")).toBeTruthy();
    expect(within(swipe).queryByTestId("photo-carousel")).toBeNull();
    expect(screen.getByTestId("photo-carousel")).toBeTruthy();
  });

  it("읽을 수 없는 일기·읽는 중(빈 지면)에도 밀기 영역이 있다 — 연달아 넘길 때 새 날이 읽히는 동안에도 다음 밀기가 된다", async () => {
    await renderScreen({ kind: "unreadable" });
    expect(
      within(screen.getByTestId("written-day-swipe")).getByTestId("written-unreadable"),
    ).toBeTruthy();
  });

  it("읽는 중에는 빈 밀기 영역이 있다", async () => {
    await renderScreen({ kind: "loading" });
    expect(screen.getByTestId("written-day-swipe")).toBeTruthy();
    expect(screen.queryByTestId("written-body")).toBeNull();
  });

  it("onSwipeDay를 넘기지 않으면 밀기 영역을 두지 않는다", async () => {
    await renderScreen(
      { kind: "readable", entry: entry(false), madeUp: false },
      { onSwipeDay: undefined },
    );
    expect(screen.queryByTestId("written-day-swipe")).toBeNull();
    expect(screen.getByTestId("written-body")).toBeTruthy();
  });

  it("쓰는 중에는 밀기 영역이 없다 (FR-006)", async () => {
    await renderScreen(
      { kind: "readable", entry: entry(false), madeUp: false },
      { writing: { line: "쓰는 중…", name: "금동이" } },
    );
    expect(screen.queryByTestId("written-day-swipe")).toBeNull();
    expect(screen.queryByTestId("material-day-swipe")).toBeNull();
  });

  it("★ 접근성 — 큰 날짜 요소에 「전날」·「다음 날」 동작이 있고 실행하면 밀기와 같은 결과다 (FR-008)", async () => {
    const props = await renderScreen({ kind: "readable", entry: entry(false), madeUp: false });

    const date = screen.getByTestId("home-date-button");
    const names = (date.props.accessibilityActions as { name: string; label: string }[]).map(
      (a) => [a.name, a.label],
    );
    expect(names).toEqual([
      ["previousDay", DAY_SWIPE_ACTIONS.previous],
      ["nextDay", DAY_SWIPE_ACTIONS.next],
    ]);

    await act(async () => {
      fireEvent(date, "accessibilityAction", { nativeEvent: { actionName: "previousDay" } });
    });
    expect(props.onSwipeDay).toHaveBeenLastCalledWith("previous");
    await act(async () => {
      fireEvent(date, "accessibilityAction", { nativeEvent: { actionName: "nextDay" } });
    });
    expect(props.onSwipeDay).toHaveBeenLastCalledWith("next");
    // 알 수 없는 동작은 무시한다.
    await act(async () => {
      fireEvent(date, "accessibilityAction", { nativeEvent: { actionName: "activate" } });
    });
    expect(props.onSwipeDay).toHaveBeenCalledTimes(2);
  });

  it("접근성 — 고른 날이 오늘이면 「다음 날」 동작을 뺀다 (반응 없는 동작을 고르지 않게)", async () => {
    const write = writePromptFor(items, NOW, null); // 기본 선택은 오늘
    expect(write.day).toBe("2026-09-24");
    await renderScreen({ kind: "unwritten" }, { write, cells: weekCellsFor(items, write, NOW) });

    const names = (
      screen.getByTestId("home-date-button").props.accessibilityActions as { name: string }[]
    ).map((a) => a.name);
    expect(names).toEqual(["previousDay"]);
  });

  it("접근성 동작은 onSwipeDay가 없으면 없다", async () => {
    await renderScreen(
      { kind: "readable", entry: entry(false), madeUp: false },
      { onSwipeDay: undefined },
    );
    expect(screen.getByTestId("home-date-button").props.accessibilityActions).toBeUndefined();
  });

  /** 팬 배선은 한 렌더 안에서만 쏜다 — 위 테스트들은 팬을 쏘지 않는다. */
  it("★ 본문을 오른쪽으로 밀면 onSwipeDay(previous), 왼쪽이면 next가 불린다 (FR-001)", async () => {
    const props = await renderScreen({ kind: "readable", entry: entry(true), madeUp: false });
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
    pan(20);
    expect(props.onSwipeDay).toHaveBeenCalledTimes(2);
  });
});
