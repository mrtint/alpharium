/**
 * 125 — 쓴 날 지면에 「하루 동선」 칸을 붙인다 (`WrittenDayPaper`의 `route`).
 *
 * 계약: specs/125-day-route-diagram/contracts/day-route.md DF1·DF6, spec FR-001·FR-016
 *
 * DF1: 칸은 **본문 View 안, 문단 뒤**에 놓인다 — 하단 바가 비키는 아래 여백(104)은 그대로 칸 아래에 남고, 칸이 없을 때와
 * 첫 화면 본문 노출이 같다. DF6: 도식이 늦게 더해져 내용 높이가 늘어도 끝 판정(`onReachEndChange`)은 값이 바뀔 때만 한 번
 * 알린다 — 052의 같은 높이 무시·051의 끝 판정 그대로다(칸을 위한 자리 표시 높이를 미리 잡지 않는다).
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`·`rerender`는 Promise다 — `await`한다.
 */

import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import type { PaperState } from "../../src/app/written-day";
import type { DayRoute } from "../../src/app/day-route";
import type { DiaryEntry } from "../../src/diary/types";
import type { DaySignals } from "../../src/signals/types";
import { WrittenDayPaper } from "../../src/ui/WrittenDayPaper";
import { WRITTEN_DAY } from "../../src/ui/theme/tokens";

const SIGNALS: DaySignals = {
  date: "2026-11-16",
  photos: { kind: "none" },
  places: { kind: "none" },
  steps: { kind: "unknown", reason: "기록이 없다" },
  battery: { kind: "unknown", reason: "기록이 없다" },
  connectivity: { kind: "unknown", reason: "기록이 없다" },
};

const ENTRY: DiaryEntry = {
  date: "2026-11-16",
  title: "하루",
  text: "첫 문단이다.\n\n둘째 문단이다.",
  character: "quiet",
  signalsUsed: SIGNALS,
  createdAt: new Date("2026-11-16T22:00:00"),
};

const PAPER: PaperState = { kind: "readable", entry: ENTRY, madeUp: false };

/** 135 — 도식이 있는 날은 칸 대신 사진 자리의 지도 면이 된다(WR5). 아래 칸을 보는 이 파일은 목록만 있는 동선을 쓴다 */
const ROUTE: DayRoute = {
  items: [
    { n: 1, period: "morning", label: "시청", photos: 1 },
    { n: 2, period: "afternoon", label: "잠실", photos: 1 },
  ],
  more: 0,
  diagram: false,
};

describe("DF1 — 칸은 본문 뒤, 지면 맨 끝이다", () => {
  it("route가 있으면 본문 View의 마지막 자식으로 문단 뒤에 놓인다", async () => {
    await render(<WrittenDayPaper paper={PAPER} route={ROUTE} />);
    const body = await screen.findByTestId("written-body");
    const kids = body.children as unknown as { props?: { testID?: string } }[];
    const ids = kids.map((k) => k.props?.testID);
    expect(ids[ids.length - 1]).toBe("day-route");
    // 문단(testID 없는 텍스트)은 모두 칸보다 앞이다
    expect(ids.indexOf("day-route")).toBe(kids.length - 1);
    expect(kids.length).toBeGreaterThanOrEqual(3);
  });

  it("route가 없으면 칸이 없다 — 본문은 종전과 같다", async () => {
    await render(<WrittenDayPaper paper={PAPER} />);
    expect(await screen.findByTestId("written-body")).toBeTruthy();
    expect(screen.queryByTestId("day-route", { includeHiddenElements: true })).toBeNull();
    expect(screen.getByText("첫 문단이다.")).toBeTruthy();
  });

  it("하단 바가 비키는 아래 여백은 그대로 본문 맨 아래에 남는다", async () => {
    await render(<WrittenDayPaper paper={PAPER} route={ROUTE} />);
    const style = StyleSheet.flatten((await screen.findByTestId("written-body")).props.style);
    expect(style.paddingBottom).toBe(WRITTEN_DAY.body.paddingBottom);
  });
});

describe("DF6 — 칸이 늦게 더해져 높이가 늘어도 끝 판정은 값이 바뀔 때만 알린다", () => {
  it("끝 → (칸이 더해져 내용이 늘어) 끝 아님 → 같은 높이 재통지는 무시 → 다시 끝", async () => {
    const onReachEndChange = jest.fn();
    const { rerender } = await render(
      <WrittenDayPaper onReachEndChange={onReachEndChange} paper={PAPER} />,
    );
    const paper = await screen.findByTestId("written-paper", { includeHiddenElements: true });

    // 짧은 본문(내용 500 < 보이는 800) — 처음부터 끝이다
    await fireEvent(paper, "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
    });
    await fireEvent(paper, "contentSizeChange", 400, 500);
    expect(onReachEndChange.mock.calls).toEqual([[true]]);

    // 칸이 더해져 내용이 보이는 높이를 넘으면 끝이 아니게 된다 — 한 번만 알린다
    await rerender(
      <WrittenDayPaper onReachEndChange={onReachEndChange} paper={PAPER} route={ROUTE} />,
    );
    await fireEvent(paper, "contentSizeChange", 400, 1500);
    expect(onReachEndChange.mock.calls).toEqual([[true], [false]]);

    // 같은 높이(1px 미만 차이)로 다시 와도 끝 판정을 다시 돌리지 않는다(052)
    await fireEvent(paper, "contentSizeChange", 400, 1500.4);
    expect(onReachEndChange).toHaveBeenCalledTimes(2);

    // 끝까지 내리면 다시 끝이다 — 바뀐 값만 알린다
    await fireEvent.scroll(paper, { nativeEvent: { contentOffset: { y: 700 } } });
    expect(onReachEndChange.mock.calls).toEqual([[true], [false], [true]]);
    await fireEvent.scroll(paper, { nativeEvent: { contentOffset: { y: 705 } } });
    expect(onReachEndChange).toHaveBeenCalledTimes(3);
  });
});
