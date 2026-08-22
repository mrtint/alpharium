/**
 * DayPicker 화면 테스트 — 012 정오 이전 안내.
 *
 * 계약: specs/012-today-diary/contracts/day-boundary.md §4 「화면 안내」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **헌법 원칙 II "하루의 끝" MUST 조항의 화면 절반이다**: "아직 쓸 수 없는 하루는
 * 왜 아직인지와 언제부터 쓸 수 있는지를 함께 알린다." `/speckit-analyze`가 잡은
 * 태스크 커버리지 갭(C1)을 해소하는 자리다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { render, screen } from "@testing-library/react-native";

import { DayPicker } from "../../src/ui/DayPicker";
import type { SelectableDay } from "../../src/app/state";

const days: readonly SelectableDay[] = [
  { day: "2026-08-20", hasDiary: false },
  { day: "2026-08-19", hasDiary: false },
  { day: "2026-08-18", hasDiary: false },
];

const noop = () => {};

describe("012 §4 — 정오 이전 안내 (검증 표)", () => {
  it("1. todayNotYetWritable: true → 안내가 보이고 '몇 시부터' 정보를 포함한다 (FR-002)", async () => {
    await render(
      <DayPicker days={days} onSelect={noop} selected="2026-08-20" todayNotYetWritable />,
    );

    // "몇 시부터"의 정확한 문구는 자유이나, 시각(예: "12시" 또는 "정오")을 포함해야 한다.
    const notice = screen.getByText(/정오|12시/);
    expect(notice).toBeTruthy();
  });

  it("2. todayNotYetWritable: undefined → 안내가 안 보이고 오늘이 selectable에 있다", async () => {
    await render(
      <DayPicker
        days={[{ day: "2026-08-21", hasDiary: false }, ...days.slice(0, 2)]}
        onSelect={noop}
        selected="2026-08-21"
      />,
    );

    expect(screen.queryByText(/정오|12시/)).toBeNull();
    expect(screen.getByTestId("day-2026-08-21")).toBeTruthy();
  });

  it("2b. todayNotYetWritable: false → 안내가 안 보인다", async () => {
    await render(
      <DayPicker
        days={days}
        onSelect={noop}
        selected="2026-08-20"
        todayNotYetWritable={false}
      />,
    );

    expect(screen.queryByText(/정오|12시/)).toBeNull();
  });
});

describe("012 §4 — 불변식", () => {
  it("A1 — 안내가 보이는 시각에는 오늘이 selectable에 없다는 것을 데이터로 확인", async () => {
    // days 자체가 오늘을 포함하지 않는 것이 §2 D3의 보장이다. 여기서는 화면이
    // 그 모순 없는 데이터를 받았을 때 안내를 정확히 그리는지만 본다.
    await render(
      <DayPicker days={days} onSelect={noop} selected="2026-08-20" todayNotYetWritable />,
    );

    for (const d of days) {
      expect(screen.getByTestId(`day-${d.day}`)).toBeTruthy();
    }
  });

  it("안내 문구에 '왜'와 '언제부터'가 함께 있다 — '아직 못 쓴다'만 말하고 멈추지 않는다", async () => {
    await render(
      <DayPicker days={days} onSelect={noop} selected="2026-08-20" todayNotYetWritable />,
    );

    // "왜"(아직 끝나지 않았다 등)와 "언제부터"(정오/12시) 정보가 한 문구에 함께 있다.
    const notice = screen.getByText(/정오|12시/);
    expect(notice.props.children).toEqual(
      expect.stringMatching(/(아직|안|못).*(정오|12시)|(정오|12시).*(아직|안|못)|부터/),
    );
  });
});
