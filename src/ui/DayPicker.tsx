/**
 * 하루를 고르는 자리 — 홈의 날 스트립 (119, 이전 049 보드 `1d` ③).
 *
 * 계약: specs/119-strip-continuous-scroll/contracts/strip-scroll.md CS-S1~S8
 *       (049 contracts/day-picking.md S1·S2·S3·S5를 잇는다)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **오늘에서 끝나는 이어 스크롤이다.** 하루에 한 칸, 오른쪽 끝이 오늘이고 왼쪽으로 지난날이 이어진다.
 * 한 화면에 7칸이 보이고 손을 떼면 칸 경계에 붙는다. 월·주 경계 표시는 없다(소유자가 보여 준 참조
 * 녹화에 없다 — 월은 헤더의 월 라벨이 고른 날 기준으로 보인다).
 *
 * **스크롤은 고른 날을 바꾸지 않는다.** 칸을 눌러야 `onSelect`가 불린다.
 *
 * **판정하지 않는다.** 칸 목록은 `stripCellsFor()`가, 고른 칸을 화면 안으로 가져올 위치는
 * `stripScrollTarget()`가 정한다. 여기는 지금 시각을 읽지 않는다(049 S5).
 *
 * **고른 날이 바깥(달력·본문 밀기·자정)에서 바뀌면** 그 칸이 화면 밖일 때만 최소 거리로 옮긴다 —
 * 화면 안이면 움직이지 않는다. 동작 줄이기가 켜져 있거나 값을 모르면 움직임 없이 옮긴다(100).
 *
 * **범위 앞쪽이 바뀌면**(자정에 첫 칸이 빠짐, 1년보다 먼 날을 골라 범위가 늘었다 줄어듦) 같은 오프셋이
 * 다른 날을 가리킨다. 그래서 앞 칸 목록과 비교해 늘거나 준 칸 수만큼 오프셋을 고쳐, 보던 날이 그대로
 * 보이게 한다(움직임 없이).
 *
 * **칸 폭은 `onLayout`으로 안다.** 재기 전 첫 프레임은 창 폭으로 어림해 그리고(칸 높이는 폭과 무관해 052 읽기
 * 스크롤 접힘이 기대는 높이가 흔들리지 않는다), 잰 폭이 다르면 목록을 그 폭으로 다시 세워 보던 첫 칸을 그대로 둔다
 * (`initialScrollIndex`는 처음 세울 때만 듣는다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { memo, useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  FlatList,
  Pressable,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextStyle,
  useWindowDimensions,
} from "react-native";

import { STRIP_VISIBLE_CELLS, dayParts, stripScrollTarget, type StripCell } from "../app/state";
import type { DayDate } from "../config/day-boundary";
import { AppText } from "./components/Text";
import { weekdayShort } from "./home-text";
import { useReduceMotion } from "./reduce-motion";
import { COLORS, DAY_STRIP } from "./theme/tokens";

/**
 * 스트립이 다시 마운트돼도 이어 가는 기억 — 보던 첫 칸의 날과 잰 폭. 부모가 하나 만들어 갈래(쓴 날·안 쓴 날·쓰는 중)를
 * 넘나드는 동안 같은 것을 넘긴다. 갈래마다 스트립이 트리의 다른 자리에 놓여 새로 마운트되기 때문이다(119 리뷰).
 * 부모가 `useRef(newStripMemory())`로 들고 ref를 넘기면 스트립이 직접 고쳐 쓴다(렌더에 쓰지 않는 값이라 상태로 두지 않는다).
 */
export type StripMemory = { firstDay: DayDate | null; width: number };

export function newStripMemory(): StripMemory {
  return { firstDay: null, width: 0 };
}

export type DayPickerProps = {
  /** 범위 시작일부터 오늘까지 하루에 한 칸, 오래된 것이 먼저. `stripCellsFor()`가 만든다 */
  cells: readonly StripCell[];
  onSelect: (day: DayDate) => void;
  /** 다시 마운트돼도 보던 자리를 잇는 기억. 없으면 마운트마다 처음 자리(FR-008)에서 시작한다 */
  memoryRef?: RefObject<StripMemory>;
};

/**
 * 바깥 변경으로 옮길 때 이 칸 수보다 멀면 움직임 없이 옮긴다 — **사람이 정한 값이다**(한 화면). 수백 칸을 미끄러지면
 * 「짧게 미끄러진다」가 아니게 되고 가상화된 빈 칸이 비칠 수 있다(추정).
 */
const ANIMATE_MAX_CELLS = STRIP_VISIBLE_CELLS;

/** 처음 보일 첫 칸 — 오른쪽 끝(오늘)이 보이게, 고른 칸이 그보다 앞이면 고른 칸이 왼쪽 끝 (FR-008) */
function initialFirstIndex(cells: readonly StripCell[]): number {
  const rightmost = Math.max(0, cells.length - STRIP_VISIBLE_CELLS);
  const selected = cells.findIndex((cell) => cell.selected);
  return selected >= 0 && selected < rightmost ? selected : rightmost;
}

/** 다시 마운트될 때의 첫 칸 — 기억한 날이 있으면 그 자리, 고른 칸이 그 화면 밖이면 최소 거리만 옮긴 자리 */
function mountFirstIndex(cells: readonly StripCell[], remembered: DayDate | null): number {
  const rememberedIndex =
    remembered === null ? -1 : cells.findIndex((cell) => cell.day === remembered);
  if (rememberedIndex < 0) return initialFirstIndex(cells);
  const rightmost = Math.max(0, cells.length - STRIP_VISIBLE_CELLS);
  const first = Math.min(rememberedIndex, rightmost);
  const selected = cells.findIndex((cell) => cell.selected);
  if (selected < 0 || (selected >= first && selected < first + STRIP_VISIBLE_CELLS)) return first;
  return selected < first ? selected : selected - STRIP_VISIBLE_CELLS + 1;
}

/** 앞 칸 목록의 첫 날이 새 목록에서 몇 칸 옮겨졌는가 — 범위 앞쪽이 늘면 양수, 줄면 음수 */
function headShift(previous: readonly StripCell[], next: readonly StripCell[]): number {
  const oldFirst = previous[0]?.day;
  const newFirst = next[0]?.day;
  if (oldFirst === undefined || newFirst === undefined || oldFirst === newFirst) return 0;
  const grown = next.findIndex((cell) => cell.day === oldFirst);
  if (grown >= 0) return grown;
  const shrunk = previous.findIndex((cell) => cell.day === newFirst);
  return shrunk >= 0 ? -shrunk : 0;
}

export function DayPicker({ cells, onSelect, memoryRef }: DayPickerProps) {
  const window = useWindowDimensions();
  // 기억은 마운트할 때 한 번만 읽는다(지연 초기화) — 렌더마다 읽지 않으므로 그 뒤의 바뀜이 렌더에 새지 않는다.
  // eslint-disable-next-line react-hooks/refs
  const [measured, setMeasured] = useState(() => memoryRef?.current.width ?? 0);
  const width = measured > 0 ? measured : window.width;
  const cellWidth = width / STRIP_VISIBLE_CELLS;
  const reduceMotion = useReduceMotion();

  const listRef = useRef<FlatList<StripCell>>(null);
  // 목록을 세울 때의 첫 칸 — 처음에는 기억한 자리(없으면 오른쪽 끝 또는 고른 칸), 폭이 바뀌어 다시 세우면 보던 첫 칸.
  // 기억은 위와 같이 마운트할 때 한 번만 읽는다.
  // eslint-disable-next-line react-hooks/refs
  const [firstIndex, setFirstIndex] = useState(() => {
    return mountFirstIndex(cells, memoryRef?.current.firstDay ?? null);
  });
  // 지금 스크롤 위치 — 다시 그리지 않으려고 상태가 아니라 ref에 둔다. 처음에는 목록을 세운 첫 칸이다.
  const offset = useRef(firstIndex * cellWidth);
  const currentCells = useRef(cells);
  const previousCells = useRef(cells);
  const selectedDay = cells.find((cell) => cell.selected)?.day ?? null;
  const previousSelectedDay = useRef(selectedDay);

  /** 스크롤 위치를 적고 기억에도 보던 첫 칸의 날을 남긴다 */
  const remember = useCallback(
    (x: number) => {
      offset.current = x;
      if (memoryRef !== undefined && cellWidth > 0) {
        const index = Math.round(x / cellWidth);
        memoryRef.current.firstDay = currentCells.current[index]?.day ?? memoryRef.current.firstDay;
      }
    },
    [memoryRef, cellWidth],
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const next = event.nativeEvent.layout.width;
      if (next <= 0) return;
      if (memoryRef !== undefined) memoryRef.current.width = next;
      if (next === width) return;
      const seen = cellWidth > 0 ? Math.round(offset.current / cellWidth) : firstIndex;
      offset.current = seen * (next / STRIP_VISIBLE_CELLS);
      setFirstIndex(seen);
      setMeasured(next);
    },
    [memoryRef, width, cellWidth, firstIndex],
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => remember(event.nativeEvent.contentOffset.x),
    [remember],
  );

  useLayoutEffect(() => {
    const before = previousCells.current;
    const selectedBefore = previousSelectedDay.current;
    currentCells.current = cells;
    previousCells.current = cells;
    previousSelectedDay.current = selectedDay;
    if (cellWidth <= 0 || before === cells) return;

    const shift = headShift(before, cells);
    if (shift !== 0) offset.current += shift * cellWidth;

    // 고른 날이 바뀌었을 때만 화면 안으로 가져온다 — 사용자가 스크롤만 했으면 끼어들지 않는다.
    const selectedIndex = cells.findIndex((cell) => cell.selected);
    const target =
      selectedDay !== selectedBefore && selectedIndex >= 0
        ? stripScrollTarget({ index: selectedIndex, offset: offset.current, cellWidth })
        : null;

    if (target !== null) {
      // 짧은 거리만 미끄러진다 — 범위 앞쪽이 바뀐 직후(네이티브 위치가 아직 옛 값)나 한 화면보다 멀면 움직임 없이.
      const near = Math.abs(target - offset.current) <= ANIMATE_MAX_CELLS * cellWidth;
      const animated = reduceMotion === false && shift === 0 && near;
      remember(target);
      listRef.current?.scrollToOffset({ offset: target, animated });
    } else if (shift !== 0) {
      remember(offset.current);
      listRef.current?.scrollToOffset({ offset: offset.current, animated: false });
    }
  }, [cells, selectedDay, cellWidth, reduceMotion, remember]);

  const getItemLayout = useCallback(
    (_data: ArrayLike<StripCell> | null | undefined, index: number) => ({
      length: cellWidth,
      offset: cellWidth * index,
      index,
    }),
    [cellWidth],
  );

  const renderItem = useCallback(
    ({ item }: { item: StripCell }) => <Cell cell={item} onSelect={onSelect} width={cellWidth} />,
    [onSelect, cellWidth],
  );

  return (
    <View onLayout={onLayout} style={STRIP} testID="day-strip">
      <FlatList
        data={cells}
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        horizontal
        initialNumToRender={STRIP_VISIBLE_CELLS * 2}
        initialScrollIndex={Math.min(firstIndex, Math.max(0, cells.length - STRIP_VISIBLE_CELLS))}
        keyExtractor={(cell) => cell.day}
        // 폭이 바뀌면 다시 세운다 — 칸 폭이 바뀐 목록의 처음 위치는 `initialScrollIndex`로만 정확히 맞는다.
        key={width}
        onScroll={onScroll}
        ref={listRef}
        renderItem={renderItem}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={cellWidth}
        testID="day-strip-list"
      />
    </View>
  );
}

const Cell = memo(function Cell({
  cell,
  onSelect,
  width,
}: {
  cell: StripCell;
  onSelect: (day: DayDate) => void;
  width: number;
}) {
  const { day, hasDiary, isToday, selectable, selected } = cell;
  const { date, weekday } = dayParts(day);
  const fg = selected ? COLORS.accentForeground : COLORS.text;
  const dowColor = selected ? COLORS.accentForeground : DAY_STRIP.dowMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !selectable }}
      disabled={!selectable}
      onPress={selectable ? () => onSelect(day) : undefined}
      style={[CELL, { width }, selected ? CELL_SELECTED : null, selectable ? null : CELL_DIMMED]}
      // **하루마다 따로 준다** — RN 접근성 트리가 평탄화되어 Maestro의 `childOf`가
      // 통하지 않는다(008 실측). 009의 `day-<date>` 규칙을 그대로 잇는다(FR-023).
      testID={`day-${day}`}
    >
      <AppText style={[DOW, { color: dowColor }]}>{weekdayShort(weekday)}</AppText>
      <View style={{ alignItems: "center" }}>
        <AppText style={[NUM, { color: fg }]}>{date}</AppText>
        {/* 오늘 — 숫자 밑줄(선택되면 선택 칸 글자색). 헤더에는 「오늘」 글자가 없다.
            자리는 모든 칸에 둔다 — 오늘 칸이 보일 때만 스트립이 높아지면 아래가 튄다(049 실기기). */}
        <View
          style={[UNDERLINE, isToday ? { backgroundColor: selected ? fg : COLORS.accent } : null]}
          testID={isToday ? `day-today-${day}` : undefined}
        />
      </View>
      {/* 쓴 날의 점. 골라진 칸에서는 글자색으로 보인다. */}
      <View
        style={[DOT, hasDiary ? { backgroundColor: selected ? fg : COLORS.accent } : null]}
        testID={hasDiary ? `day-dot-${day}` : undefined}
      />
    </Pressable>
  );
});

/**
 * 치수는 보드 `1d`의 값을 옮긴 레이아웃 숫자다(032·047 관례). 색은 `COLORS.*`·`DAY_STRIP.*`만.
 * 선택 칸 글자는 `accentForeground`(보드의 오프화이트).
 */
const STRIP = {
  marginTop: 18,
  borderTopWidth: 2,
  borderTopColor: COLORS.text,
  borderBottomWidth: 1,
  borderBottomColor: COLORS.border,
} as const;

const CELL = {
  alignItems: "center",
  gap: 6,
  paddingVertical: 10,
} as const;

const CELL_SELECTED = { backgroundColor: COLORS.accent } as const;

/** 미래 칸 — 흐리게(보드 달력 기준 0.3). 누름 자체는 `disabled`가 막는다. */
const CELL_DIMMED = { opacity: 0.3 } as const;

/** 088 FR-004~FR-006 — `opacity` 없이 명시적 색(`accentForeground` / `DAY_STRIP.dowMuted`)으로 구분한다 */
const DOW = { fontSize: 10, letterSpacing: 0.6 } as const;

const NUM: TextStyle = { fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] };

/** 오늘 밑줄 — 2px, 숫자에서 4 떨어짐 */
const UNDERLINE = { alignSelf: "stretch", height: 2, marginTop: 4 } as const;

const DOT = { width: 5, height: 5 } as const;
