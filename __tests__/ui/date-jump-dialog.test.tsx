/**
 * 050 — 날짜로 이동 달력 (보드 `2j`).
 *
 * 계약: specs/050-dialog-foundation/contracts/dialogs.md CAL2~CAL5·CAL7·CAL10·CAL11 (US2), CAL8·CAL9 (US3)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **실제 datepicker를 그린다**(목으로 바꾸지 않는다) — 날짜 격자는 react-native-ui-datepicker가 만들고,
 * 머리(‹ 월 연 ›)와 월·연 목록은 직접 그린다(research R5). 칸 판정은 `cellFor()` 하나다(CAL5·CAL6).
 *
 * 뒤로 가기 스파이는 되돌리지 않는다(diary-home.test와 같다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, fireEvent, screen, within } from "@testing-library/react-native";
import { BackHandler, StyleSheet } from "react-native";

import type { DiaryListItem } from "../../src/app/state";
import { DateJumpDialog } from "../../src/ui/DateJumpDialog";
import { CALENDAR, COLORS } from "../../src/ui/theme/tokens";
import { renderWithPortal, withPortal } from "./render-with-portal";

jest.setTimeout(30000);

const NOW = new Date("2026-09-28T09:00:00"); // 월요일
const items: DiaryListItem[] = [
  { day: "2026-09-20", readable: true, photos: { kind: "none" } },
  { day: "2026-07-15", readable: true, photos: { kind: "none" } },
];

type Listener = () => boolean | null | undefined;

function captureBack(): Listener[] {
  const handlers: Listener[] = [];
  jest.spyOn(BackHandler, "addEventListener").mockImplementation((event, handler) => {
    if (event === "hardwareBackPress") handlers.push(handler as Listener);
    return { remove: () => {} } as ReturnType<typeof BackHandler.addEventListener>;
  });
  return handlers;
}

const flat = (node: { props: { style?: unknown } }): Record<string, unknown> =>
  (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;

async function renderCalendar(selectedDay = "2026-09-28", extra: { open?: boolean } = {}) {
  const back = captureBack();
  const onPick = jest.fn();
  const onClose = jest.fn();
  const result = await renderWithPortal(
    <DateJumpDialog
      items={items}
      now={NOW}
      onClose={onClose}
      onPick={onPick}
      open={extra.open ?? true}
      selectedDay={selectedDay}
    />,
  );
  await screen.findByTestId("calendar-dialog");
  return { onPick, onClose, back, result };
}

describe("CAL2 — 열 때 선택한 날의 달, 일요일 시작", () => {
  it("★ 제목·월·연·요일 머리", async () => {
    await renderCalendar();
    expect(screen.getByText("날짜로 이동")).toBeTruthy();
    expect(screen.getByTestId("calendar-month")).toHaveTextContent("9월");
    expect(screen.getByTestId("calendar-year")).toHaveTextContent("2026년");
    const heads = screen.getAllByTestId(/^calendar-weekday-/).map((n) => n.props.children);
    expect(heads).toEqual(["일", "월", "화", "수", "목", "금", "토"]);
  });

  it("선택한 날이 다른 달이면 그 달을 연다", async () => {
    await renderCalendar("2026-07-15");
    expect(screen.getByTestId("calendar-month")).toHaveTextContent("7월");
  });
});

describe("★ CAL3 — 오늘이 든 달에서 ›는 비활성", () => {
  it("9월(오늘이 든 달) → › disabled, 눌러도 9월", async () => {
    await renderCalendar();
    const next = screen.getByTestId("calendar-next");
    expect(next).toBeDisabled();
    await fireEvent.press(next);
    expect(screen.getByTestId("calendar-month")).toHaveTextContent("9월");
  });

  it("‹ 두 번 → 7월, 이제 ›가 눌린다", async () => {
    await renderCalendar();
    await fireEvent.press(screen.getByTestId("calendar-prev"));
    await fireEvent.press(screen.getByTestId("calendar-prev"));
    expect(screen.getByTestId("calendar-month")).toHaveTextContent("7월");
    expect(screen.getByTestId("calendar-next")).not.toBeDisabled();
    await fireEvent.press(screen.getByTestId("calendar-next"));
    expect(screen.getByTestId("calendar-month")).toHaveTextContent("8월");
  });

  it("‹는 해를 넘긴다 (1월 → 전 해 12월)", async () => {
    await renderCalendar("2026-01-10");
    await fireEvent.press(screen.getByTestId("calendar-prev"));
    expect(screen.getByTestId("calendar-month")).toHaveTextContent("12월");
    expect(screen.getByTestId("calendar-year")).toHaveTextContent("2025년");
  });
});

describe("★ CAL4 — 미래 칸은 눌리지 않고 흐리다", () => {
  it("9/29 누름 → onPick 0회, 불투명도 0.3", async () => {
    const { onPick } = await renderCalendar();
    const future = screen.getByTestId("calendar-day-2026-09-29");
    expect(flat(future).opacity).toBe(CALENDAR.disabledOpacity);
    await fireEvent.press(future);
    expect(onPick).not.toHaveBeenCalled();
  });
});

describe("★ CAL5 — 칸 판정은 cellFor() 하나 (소스)", () => {
  it("DateJumpDialog.tsx가 오늘·미래·일기 있음을 직접 계산하지 않는다", () => {
    const code = readFileSync(join(__dirname, "../../src/ui/DateJumpDialog.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).toContain("cellFor(");
    expect(code).not.toContain("dayOf(");
    expect(code).not.toContain("isDayWritable(");
    expect(code).not.toContain(".some(");
    expect(code).not.toMatch(/getHours\(\)/);
  });
});

describe("★ CAL7 — 날을 누르면 바로 고르고 닫힌다", () => {
  it("9/20 → onPick('2026-09-20') 1회", async () => {
    const { onPick } = await renderCalendar();
    await fireEvent.press(screen.getByTestId("calendar-day-2026-09-20"));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith("2026-09-20");
  });

  it("몇 달 전 날 — ‹ 두 번 뒤 7/15", async () => {
    const { onPick } = await renderCalendar();
    await fireEvent.press(screen.getByTestId("calendar-prev"));
    await fireEvent.press(screen.getByTestId("calendar-prev"));
    await fireEvent.press(screen.getByTestId("calendar-day-2026-07-15"));
    expect(onPick).toHaveBeenCalledWith("2026-07-15");
  });

  it("이미 선택된 날을 눌러도 onPick (닫힘, 고른 날 그대로)", async () => {
    const { onPick } = await renderCalendar();
    await fireEvent.press(screen.getByTestId("calendar-day-2026-09-28"));
    expect(onPick).toHaveBeenCalledWith("2026-09-28");
  });

  it("몇 년 전 날도 고를 수 있다 (과거 한계 없음 — SC-004a)", async () => {
    const { onPick } = await renderCalendar("2016-03-10");
    await fireEvent.press(screen.getByTestId("calendar-day-2016-03-15"));
    expect(onPick).toHaveBeenCalledWith("2016-03-15");
  });
});

describe("★ CAL10 — 월·연 목록", () => {
  it("월 표시 → 12칸, 오늘 이후 달은 비활성, 고르면 그 달의 날짜 보기", async () => {
    await renderCalendar();
    await fireEvent.press(screen.getByTestId("calendar-month"));
    expect(screen.getAllByTestId(/^calendar-month-\d+$/)).toHaveLength(12);
    expect(screen.getByTestId("calendar-month-10")).toBeDisabled();
    expect(screen.getByTestId("calendar-month-9")).not.toBeDisabled();

    await fireEvent.press(screen.getByTestId("calendar-month-3"));
    expect(screen.getByTestId("calendar-month")).toHaveTextContent("3월");
    expect(screen.getByTestId("calendar-day-2026-03-15")).toBeTruthy();
  });

  it("연 표시 → 12년(오늘이 든 해로 끝남, 미래 해 없음), 고르면 날짜 보기", async () => {
    await renderCalendar();
    await fireEvent.press(screen.getByTestId("calendar-year"));
    const years = screen.getAllByTestId(/^calendar-year-\d{4}$/).map((n) => n.props.testID);
    expect(years).toHaveLength(12);
    expect(years[years.length - 1]).toBe("calendar-year-2026");
    expect(screen.queryByTestId("calendar-year-2027")).toBeNull();
    expect(screen.getByTestId("calendar-next")).toBeDisabled();

    await fireEvent.press(screen.getByTestId("calendar-prev"));
    expect(screen.getByTestId("calendar-year-2014")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("calendar-year-2010"));
    expect(screen.getByTestId("calendar-year")).toHaveTextContent("2010년");
    expect(screen.getByTestId("calendar-month")).toHaveTextContent("9월");
  });
});

describe("★ CAL11 — 칸 모양 (스트립과 같은 표현)", () => {
  it("선택 = accent 배경, 점 4×4, 오늘 밑줄", async () => {
    await renderCalendar("2026-09-20");
    const selected = screen.getByTestId("calendar-day-2026-09-20");
    expect(flat(selected).backgroundColor).toBe(COLORS.accent);
    expect(flat(selected).height).toBe(CALENDAR.cellHeight);

    const dot = within(selected).getByTestId("calendar-dot-2026-09-20");
    expect(flat(dot).width).toBe(CALENDAR.dot);
    expect(flat(dot).height).toBe(CALENDAR.dot);
    // 선택된 칸의 점은 선택 칸 글자색
    expect(flat(dot).backgroundColor).toBe(COLORS.accentForeground);

    const today = screen.getByTestId("calendar-today-2026-09-28");
    expect(flat(today).backgroundColor).toBe(COLORS.accent);
    expect(flat(today).marginTop).toBe(CALENDAR.underlineOffset);
  });
});

describe("CAL8·CAL9 — 아무것도 바꾸지 않고 닫는다 (US3)", () => {
  it("★ 「취소」 → onClose 1회, onPick 0회", async () => {
    const { onPick, onClose } = await renderCalendar();
    await fireEvent.press(screen.getByTestId("calendar-cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("★ 덮개 → onClose 1회, onPick 0회", async () => {
    const { onPick, onClose } = await renderCalendar();
    await fireEvent.press(screen.getByTestId("calendar-dialog-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("★ 뒤로 가기 → onClose 1회, onPick 0회", async () => {
    const { onPick, onClose, back } = await renderCalendar();
    await act(async () => {
      for (const handler of [...back].reverse()) {
        if (handler() === true) break;
      }
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("★ CAL9 — 넘겨 보다 닫고 다시 열면 선택한 날의 달", async () => {
    const { result } = await renderCalendar();
    for (let i = 0; i < 4; i += 1) await fireEvent.press(screen.getByTestId("calendar-prev"));
    expect(screen.getByTestId("calendar-month")).toHaveTextContent("5월");

    const props = {
      items,
      now: NOW,
      onClose: jest.fn(),
      onPick: jest.fn(),
      selectedDay: "2026-09-28",
    };
    await act(async () => {
      result.rerender(withPortal(<DateJumpDialog {...props} open={false} />));
    });
    expect(screen.queryByTestId("calendar-dialog")).toBeNull();
    await act(async () => {
      result.rerender(withPortal(<DateJumpDialog {...props} open />));
    });
    expect(screen.getByTestId("calendar-month")).toHaveTextContent("9월");
  });
});
