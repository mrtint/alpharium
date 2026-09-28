/**
 * 날짜로 이동 (050, 보드 `2j`) — 헤더 날짜를 누르면 여는 달력.
 *
 * 계약: specs/050-dialog-foundation/contracts/dialogs.md CAL2~CAL11, data-model.md §2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **일반 대화상자다** — 덮개·뒤로 가기·「취소」로 닫히고, 닫으면 아무것도 바뀌지 않는다(FR-019). 날을
 * 누르면 확인 버튼 없이 곧바로 `onPick` — 부르는 쪽이 닫고 그 날을 고른다(FR-018). 스트립이 그 날이 든
 * 주로 바뀌는 것은 049가 고른 날에서 주를 계산하므로 저절로 성립한다(새 주 계산을 만들지 않는다).
 *
 * **판정하지 않는다**(FR-017, CAL5). 칸의 오늘·미래·일기 있음·선택은 스트립과 같은 `cellFor()` 하나에서
 * 오고, 보이는 달의 ‹ › 비활성과 월·연 목록은 `app/calendar.ts`가 정한다. 이 파일은 하루 경계를 모른다.
 *
 * **datepicker는 날짜 격자 하나로만 쓴다**(research R5) — 그 라이브러리의 ›는 가장 늦은 날을 보지 않고
 * 보이는 달을 바깥에서 되돌릴 수 없다. 그래서 머리(‹ 월 연 ›)와 월·연 목록은 여기서 그린다. 보이는
 * 달은 `month`/`year` + `key` 재마운트로 정한다.
 *
 * **보이는 달은 저장하지 않는다**(FR-020) — 대화상자 면 안의 상태라 닫히면(포털에서 내려가면) 사라지고,
 * 다시 열면 선택한 날의 달로 시작한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import dayjs from "dayjs";
import { useState } from "react";
import { Pressable, View, type TextStyle } from "react-native";
import DateTimePicker from "react-native-ui-datepicker";

import {
  dayDateFromPicker,
  isFutureMonth,
  isLatestMonth,
  isLatestYearPage,
  latestPickableDay,
  monthOf,
  shiftMonth,
  yearPageOf,
  type CalendarMonth,
  type CalendarView,
  type DayjsLike,
} from "../app/calendar";
import { cellFor, type DiaryListItem, type StripCell } from "../app/state";
import type { DayDate } from "../config/day-boundary";
import { AppText } from "./components/Text";
import { DialogCancelButton, DismissibleDialog } from "./components/Dialog";
import { CALENDAR_WEEKDAYS, DATE_JUMP, calendarMonthText, calendarYearText } from "./home-text";
import { CALENDAR, COLORS } from "./theme/tokens";

export type DateJumpDialogProps = {
  open: boolean;
  /** 점(일기 있음)을 찍을 목록 — 스트립과 같은 목록 */
  items: readonly DiaryListItem[];
  /** 지금 고른 날 — 열 때 이 날의 달을 보인다 */
  selectedDay: DayDate;
  /** "지금". 오늘·미래 판정이 이것 하나를 본다 */
  now: Date;
  /** 날을 골랐다 — 부르는 쪽이 닫고 그 날을 고른다 */
  onPick: (day: DayDate) => void;
  /** 아무것도 고르지 않고 닫는다(취소·덮개·뒤로 가기) */
  onClose: () => void;
};

export function DateJumpDialog({
  open,
  items,
  selectedDay,
  now,
  onPick,
  onClose,
}: DateJumpDialogProps) {
  return (
    <DismissibleDialog
      onClose={onClose}
      open={open}
      testID="calendar-dialog"
      title={DATE_JUMP.title}
    >
      <CalendarBody items={items} now={now} onPick={onPick} selectedDay={selectedDay} />
      <DialogCancelButton onPress={onClose} testID="calendar-cancel">
        {DATE_JUMP.cancel}
      </DialogCancelButton>
    </DismissibleDialog>
  );
}

/** 면 안에서만 사는 상태 — 대화상자가 닫히면 함께 사라진다(FR-020) */
function CalendarBody({
  items,
  selectedDay,
  now,
  onPick,
}: Pick<DateJumpDialogProps, "items" | "selectedDay" | "now" | "onPick">) {
  const [shown, setShown] = useState<CalendarMonth>(() => monthOf(selectedDay));
  const [view, setView] = useState<CalendarView>("day");
  const [yearPage, setYearPage] = useState<readonly number[]>(() =>
    yearPageOf(monthOf(selectedDay).year, now),
  );

  const cell = (day: DayDate): StripCell => cellFor(day, items, selectedDay, now);

  // ‹ ›의 뜻은 보기마다 다르다 — 날짜 보기는 한 달, 월 목록은 한 해, 연 목록은 한 쪽(12년).
  const latestYear = monthOf(latestPickableDay(now)).year;
  const nextDisabled =
    view === "day"
      ? isLatestMonth(shown, now)
      : view === "month"
        ? shown.year >= latestYear
        : isLatestYearPage(yearPage, now);

  const prev = () => {
    if (view === "day") setShown(shiftMonth(shown, -1));
    else if (view === "month") setShown({ ...shown, year: shown.year - 1 });
    else setYearPage(yearPageOf(yearPage[0] - 1, now));
  };
  const next = () => {
    if (nextDisabled) return;
    if (view === "day") setShown(shiftMonth(shown, 1));
    else if (view === "month") setShown({ ...shown, year: shown.year + 1 });
    else setYearPage(yearPageOf(yearPage[yearPage.length - 1] + 1, now));
  };

  return (
    <View style={{ gap: 12 }}>
      {/* 머리 — ‹ 9월 2026년 › */}
      <View style={HEADER}>
        <NavButton label="‹" onPress={prev} testID="calendar-prev" />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setView(view === "month" ? "day" : "month")}
            testID="calendar-month"
          >
            <AppText style={HEAD_LABEL}>{calendarMonthText(shown)}</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setYearPage(yearPageOf(shown.year, now));
              setView(view === "year" ? "day" : "year");
            }}
            testID="calendar-year"
          >
            <AppText style={HEAD_LABEL}>{calendarYearText(shown.year)}</AppText>
          </Pressable>
        </View>
        <NavButton disabled={nextDisabled} label="›" onPress={next} testID="calendar-next" />
      </View>

      {view === "day" && (
        <DateTimePicker
          components={{
            // 설치본 타입은 `date: string`이지만 실제 값은 dayjs다 — 변환은 `dayDateFromPicker` 한 곳(research R9).
            Day: (day) => (
              <CalendarCell cell={cell(dayDateFromPicker(day.date as unknown as DayjsLike))} />
            ),
            Weekday: (weekday) => (
              <AppText style={WEEKDAY} testID={`calendar-weekday-${weekday.index}`}>
                {CALENDAR_WEEKDAYS[weekday.index]}
              </AppText>
            ),
          }}
          date={selectedDay}
          disabledDates={(date) => !cell(dayDateFromPicker(dayjs(date))).selectable}
          firstDayOfWeek={0}
          hideHeader
          key={`${shown.year}-${shown.month}`}
          locale="ko"
          maxDate={latestPickableDay(now)}
          mode="single"
          month={shown.month - 1}
          onChange={({ date }) => {
            if (date instanceof Date) onPick(dayDateFromPicker(date));
          }}
          showOutsideDays={false}
          year={shown.year}
        />
      )}

      {view === "month" && (
        <View style={GRID}>
          {Array.from({ length: 12 }, (_, i) => {
            const month = { year: shown.year, month: i + 1 };
            const disabled = isFutureMonth(month, now);
            return (
              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                key={month.month}
                onPress={() => {
                  setShown(month);
                  setView("day");
                }}
                style={[GRID_ITEM, disabled ? DIMMED : null]}
                testID={`calendar-month-${month.month}`}
              >
                <AppText style={GRID_LABEL}>{calendarMonthText(month)}</AppText>
              </Pressable>
            );
          })}
        </View>
      )}

      {view === "year" && (
        <View style={GRID}>
          {yearPage.map((year) => (
            <Pressable
              accessibilityRole="button"
              key={year}
              onPress={() => {
                setShown({ ...shown, year, month: Math.min(shown.month, maxMonthIn(year)) });
                setView("day");
              }}
              style={GRID_ITEM}
              testID={`calendar-year-${year}`}
            >
              <AppText style={GRID_LABEL}>{calendarYearText(year)}</AppText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  /** 오늘이 든 해에서는 오늘의 달까지만 — 연을 골라 미래만 있는 달로 가지 않게 */
  function maxMonthIn(year: number): number {
    const latest = monthOf(latestPickableDay(now));
    return year >= latest.year ? latest.month : 12;
  }
}

function NavButton({
  label,
  onPress,
  disabled = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[NAV, disabled ? DIMMED : null]}
      testID={testID}
    >
      <AppText style={HEAD_LABEL}>{label}</AppText>
    </Pressable>
  );
}

/**
 * 날짜 칸 — 스트립(049 `DayPicker`)과 같은 표현(FR-016). 판정은 받은 `cell`이 전부다.
 * 누름은 datepicker가 감싸는 `Pressable`이 받고, 미래 칸은 그쪽이 `disabledDates`로 막는다.
 */
function CalendarCell({ cell }: { cell: StripCell }) {
  const { day, hasDiary, isToday, selectable, selected } = cell;
  const fg = selected ? COLORS.accentForeground : COLORS.text;
  return (
    <View
      style={[
        CELL,
        selected ? { backgroundColor: COLORS.accent } : null,
        selectable ? null : DIMMED,
      ]}
      testID={`calendar-day-${day}`}
    >
      <AppText style={[NUM, { color: fg }]}>{Number(day.slice(8, 10))}</AppText>
      <View
        style={[UNDERLINE, isToday ? { backgroundColor: selected ? fg : COLORS.accent } : null]}
        testID={isToday ? `calendar-today-${day}` : undefined}
      />
      <View
        style={[DOT, hasDiary ? { backgroundColor: selected ? fg : COLORS.accent } : null]}
        testID={hasDiary ? `calendar-dot-${day}` : undefined}
      />
    </View>
  );
}

/* 치수는 보드 `2j`의 값(설계 §3.1)을 토큰(`CALENDAR`)으로 옮긴 것. 색은 `COLORS.*`만. */

const HEADER = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
} as const;

const NAV = {
  width: CALENDAR.navSize,
  height: CALENDAR.navSize,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: COLORS.border,
} as const;

const DIMMED = { opacity: CALENDAR.disabledOpacity } as const;

/** 월·연 16/700 */
const HEAD_LABEL: TextStyle = { fontSize: 16, fontWeight: "700", color: COLORS.text };

/** 요일 머리 10 */
const WEEKDAY: TextStyle = { fontSize: 10, color: COLORS.text, textAlign: "center" };

const CELL = {
  width: "100%",
  height: CALENDAR.cellHeight,
  alignItems: "center",
  justifyContent: "center",
} as const;

/** 날짜 숫자 14/700 */
const NUM: TextStyle = { fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] };

/** 오늘 밑줄 — 숫자에서 3 떨어짐. 자리는 모든 칸에 둔다(049 S7 — 높이가 튀지 않게) */
const UNDERLINE = {
  width: 14,
  height: 2,
  marginTop: CALENDAR.underlineOffset,
} as const;

/** 일기 있음 점 4×4 */
const DOT = { width: CALENDAR.dot, height: CALENDAR.dot, marginTop: 2 } as const;

const GRID = { flexDirection: "row", flexWrap: "wrap" } as const;

const GRID_ITEM = {
  width: "25%",
  height: CALENDAR.cellHeight,
  alignItems: "center",
  justifyContent: "center",
} as const;

const GRID_LABEL: TextStyle = { fontSize: 14, fontWeight: "700", color: COLORS.text };
