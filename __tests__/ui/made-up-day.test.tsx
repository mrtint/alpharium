/**
 * 053 US4 — 「지어낸 하루」 표시 (contracts/material.md MADE5).
 *
 * 본문 지면 맨 위(캐러셀 뒤, 본문 문단 앞)의 조용한 한 줄이다. 헤더는 바꾸지 않는다.
 *
 * ⚠️ RNTL 14의 `render`는 Promise를 반환한다 — `await`한다.
 */

import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import type { DiaryEntry } from "../../src/diary/types";
import { WrittenDayPaper } from "../../src/ui/WrittenDayPaper";
import { COLORS } from "../../src/ui/theme/tokens";

const entry = {
  date: "2026-09-26",
  title: "제목",
  text: "첫 문단이다.\n\n둘째 문단이다.",
  character: "quiet",
  signalsUsed: {},
  createdAt: new Date("2026-09-26T14:00:00"),
} as unknown as DiaryEntry;

describe("053 MADE5 — 지어낸 하루 한 줄", () => {
  it("madeUp이면 본문 안 첫 자리에 「지어낸 하루」가 있다 (보조색)", async () => {
    await render(<WrittenDayPaper paper={{ kind: "readable", entry, madeUp: true }} />);

    const line = screen.getByTestId("made-up-day");
    expect(line).toHaveTextContent("지어낸 하루");
    expect(StyleSheet.flatten(line.props.style).color).toBe(COLORS.textMuted);
    // 본문(written-body) 안에서 문단보다 앞에 있다.
    const body = screen.getByTestId("written-body");
    expect(body.children[0]).toBe(line);
    expect(screen.getByText("첫 문단이다.")).toBeTruthy();
  });

  it("madeUp이 아니면 그리지 않는다", async () => {
    await render(<WrittenDayPaper paper={{ kind: "readable", entry, madeUp: false }} />);
    expect(screen.queryByTestId("made-up-day")).toBeNull();
    expect(screen.queryByText("지어낸 하루")).toBeNull();
  });

  it("읽을 수 없는 지면에는 없다", async () => {
    await render(<WrittenDayPaper paper={{ kind: "unreadable" }} />);
    expect(screen.queryByTestId("made-up-day")).toBeNull();
  });
});
