/**
 * 상태 흉내 「오늘 날짜」를 고르는 대화상자 (064, 설계 B2 — 보드 `6e` ③에 고르는 화면이 없어 새로 정했다).
 *
 * 계약: specs/064-state-simulation/contracts/simulation.md DV3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 050 「날짜로 이동」(`DateJumpDialog`)과 같은 틀(`DismissibleDialog`)·같은 날짜 격자(`react-native-ui-datepicker`)를 쓰지만 **재사용하지
 * 않는다** — 그 달력은 미래 칸을 막고(`maxDate`·`disabledDates`) 쓴 날 점을 그린다. 흉내는 미래 날도 고른다(흉내 중에는 쓰기가 막혀 있다,
 * S8). 날을 누르면 바로 적용·닫힘(056 대화상자 관례), 아래에 「끄기」(날짜 흉내가 켜졌을 때만)·「취소」.
 *
 * dayjs 변환은 `app/calendar.ts`의 `dayDateFromPicker()` 한 곳이다(AGENTS — datepicker의 타입 선언과 실제 값이 다르다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { Pressable, View, type TextStyle } from "react-native";
import DateTimePicker from "react-native-ui-datepicker";

import {
  dayDateFromPicker,
  monthOf,
  shiftMonth,
  type CalendarMonth,
  type DayjsLike,
} from "../app/calendar";
import type { DayDate } from "../config/day-boundary";
import { AppText } from "./components/Text";
import { DialogCancelButton, DismissibleDialog } from "./components/Dialog";
import { SIMULATION_TEXT } from "./developer-text";
import { CALENDAR_WEEKDAYS, calendarMonthText, calendarYearText } from "./home-text";
import { CALENDAR, COLORS } from "./theme/tokens";

export type SimulationDateDialogProps = {
  open: boolean;
  /** 지금 흉내 날짜. 꺼져 있으면 `null` */
  date: DayDate | null;
  /** 흉내가 꺼져 있을 때 처음 보일 달의 날(실제 오늘) */
  initialDay: DayDate;
  onPick: (day: DayDate) => void;
  onOff: () => void;
  onClose: () => void;
};

export function SimulationDateDialog({
  open,
  date,
  initialDay,
  onPick,
  onOff,
  onClose,
}: SimulationDateDialogProps) {
  return (
    <DismissibleDialog
      onClose={onClose}
      open={open}
      testID="sim-date-dialog"
      title={SIMULATION_TEXT.date}
    >
      <CalendarBody onPick={onPick} selectedDay={date ?? initialDay} />
      <View style={{ opacity: date === null ? CALENDAR.disabledOpacity : 1 }}>
        <DialogCancelButton
          onPress={() => {
            if (date !== null) onOff();
          }}
          testID="sim-date-off"
        >
          {SIMULATION_TEXT.dateOff}
        </DialogCancelButton>
      </View>
      <DialogCancelButton onPress={onClose} testID="sim-date-cancel">
        {SIMULATION_TEXT.dateCancel}
      </DialogCancelButton>
    </DismissibleDialog>
  );
}

/** 면 안에서만 사는 상태 — 대화상자가 닫히면 함께 사라진다 */
function CalendarBody({
  selectedDay,
  onPick,
}: {
  selectedDay: DayDate;
  onPick: (day: DayDate) => void;
}) {
  const [shown, setShown] = useState<CalendarMonth>(() => monthOf(selectedDay));
  return (
    <View style={{ gap: 12 }}>
      <View style={HEADER}>
        <NavButton
          label="‹"
          onPress={() => setShown(shiftMonth(shown, -1))}
          testID="sim-date-prev"
        />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <AppText style={HEAD_LABEL} testID="sim-date-month">
            {calendarMonthText(shown)}
          </AppText>
          <AppText style={HEAD_LABEL} testID="sim-date-year">
            {calendarYearText(shown.year)}
          </AppText>
        </View>
        <NavButton
          label="›"
          onPress={() => setShown(shiftMonth(shown, 1))}
          testID="sim-date-next"
        />
      </View>
      <DateTimePicker
        components={{
          // 설치본 타입은 `date: string`이지만 실제 값은 dayjs다 — 변환은 `dayDateFromPicker` 한 곳.
          Day: (day) => {
            const value = dayDateFromPicker(day.date as unknown as DayjsLike);
            return <Cell day={value} selected={value === selectedDay} />;
          },
          Weekday: (weekday) => (
            <AppText style={WEEKDAY}>{CALENDAR_WEEKDAYS[weekday.index]}</AppText>
          ),
        }}
        date={selectedDay}
        firstDayOfWeek={0}
        hideHeader
        key={`${shown.year}-${shown.month}`}
        locale="ko"
        mode="single"
        month={shown.month - 1}
        onChange={({ date }) => {
          if (date instanceof Date) onPick(dayDateFromPicker(date));
        }}
        showOutsideDays={false}
        year={shown.year}
      />
    </View>
  );
}

function NavButton({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={NAV} testID={testID}>
      <AppText style={HEAD_LABEL}>{label}</AppText>
    </Pressable>
  );
}

function Cell({ day, selected }: { day: DayDate; selected: boolean }) {
  return (
    <View
      style={[CELL, selected ? { backgroundColor: COLORS.accent } : null]}
      testID={`sim-date-day-${day}`}
    >
      <AppText style={[NUM, { color: selected ? COLORS.accentForeground : COLORS.text }]}>
        {Number(day.slice(8, 10))}
      </AppText>
    </View>
  );
}

/* 치수는 050 「날짜로 이동」과 같은 토큰(`CALENDAR`)이다. 색은 `COLORS.*`만. */

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

const HEAD_LABEL: TextStyle = { fontSize: 16, fontWeight: "700", color: COLORS.text };

const WEEKDAY: TextStyle = { fontSize: 10, color: COLORS.text, textAlign: "center" };

const CELL = {
  width: "100%",
  height: CALENDAR.cellHeight,
  alignItems: "center",
  justifyContent: "center",
} as const;

const NUM: TextStyle = { fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] };
