/**
 * 하루를 고르는 자리 — 홈의 7칸 스트립 (048, 보드 `1d`).
 *
 * 계약: specs/048-diary-home-modernist/contracts/home-screen.md S1~S6
 *       (이전: specs/009-past-day-diary/contracts/write-prompt.md §3 — 세로 목록)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **날짜를 고르는 곳은 여기 한 곳뿐이다**(설계 D7, FR-014). 하단 바의 「n일」은 누를 수 없는
 * 글자다 — 두 곳이면 어느 쪽이 기준인지 흐려진다.
 *
 * **판정하지 않는다.** 어느 칸을 누를 수 있는지·어느 칸이 골라졌는지는 `stripCellsFor()`가
 * 정해서 넘긴다(009 FR-009d와 같은 원칙). 지금 시각도 읽지 않는다.
 *
 * **흐린 칸은 눌러도 아무 일도 없다** — 그 날에 쓴 일기가 있어도 마찬가지다. 점은 7칸 전부에
 * 찍히는 읽기 전용 정보이고, 일기를 여는 것은 아래 목록이 맡는다(설계 §2).
 *
 * 012가 여기 두었던 정오 이전 안내는 하단 바로 옮겨 갔다 — 아직 쓸 수 없는 오늘은 이제 고를
 * 수 있고, 무엇을 할 수 없는지는 쓰기 자리가 말한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Pressable, View, type TextStyle } from "react-native";

import { dayParts, type StripCell } from "../app/state";
import type { DayDate } from "../config/day-boundary";
import { AppText } from "./components/Text";
import { weekdayShort } from "./home-text";
import { COLORS } from "./theme/tokens";

export type DayPickerProps = {
  /** 7칸 — 오래된 것이 왼쪽. `stripCellsFor()`가 만든다 */
  cells: readonly StripCell[];
  onSelect: (day: DayDate) => void;
};

export function DayPicker({ cells, onSelect }: DayPickerProps) {
  return (
    <View style={STRIP} testID="day-strip">
      {cells.map(({ day, hasDiary, selectable, selected }) => {
        const { date, weekday } = dayParts(day);
        const fg = selected ? COLORS.accentForeground : COLORS.text;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: !selectable }}
            disabled={!selectable}
            key={day}
            onPress={selectable ? () => onSelect(day) : undefined}
            style={[CELL, selected ? CELL_SELECTED : null, selectable ? null : CELL_DIMMED]}
            // **하루마다 따로 준다** — RN 접근성 트리가 평탄화되어 Maestro의 `childOf`가
            // 통하지 않는다(008 실측). 009의 `day-<date>` 규칙을 그대로 잇는다(FR-013).
            testID={`day-${day}`}
          >
            <AppText style={[DOW, { color: fg }]}>{weekdayShort(weekday)}</AppText>
            <AppText style={[NUM, { color: fg }]}>{date}</AppText>
            {/* 쓴 날의 점 — 흐린 칸에도 찍힌다(읽기 전용). 골라진 칸에서는 글자색으로 보인다. */}
            <View
              style={[DOT, hasDiary ? { backgroundColor: selected ? fg : COLORS.accent } : null]}
              testID={hasDiary ? `day-dot-${day}` : undefined}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * 치수는 보드 `1d`의 값을 옮긴 레이아웃 숫자다(032·047 관례, FR-038). 색은 `COLORS.*`만.
 * 선택 칸 글자는 `accentForeground`(검정) — accent 위 AA를 만족하는 값은 검정뿐이다(043 R2).
 */
const STRIP = {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 18,
  borderTopWidth: 2,
  borderTopColor: COLORS.text,
  borderBottomWidth: 1,
  borderBottomColor: COLORS.border,
} as const;

const CELL = {
  flex: 1,
  alignItems: "center",
  gap: 6,
  paddingVertical: 10,
} as const;

const CELL_SELECTED = { backgroundColor: COLORS.accent } as const;

/** 고를 수 없는 칸 — 흐리게. 누름 자체는 `disabled`가 막는다. */
const CELL_DIMMED = { opacity: 0.35 } as const;

const DOW = { fontSize: 10, letterSpacing: 0.6, opacity: 0.7 } as const;

const NUM: TextStyle = { fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] };

const DOT = { width: 5, height: 5 } as const;
