/**
 * 하루를 고르는 자리 — 홈의 주간 스트립 (049, 보드 `1d` ③).
 *
 * 계약: specs/049-home-day-picker/contracts/day-picking.md S1~S6
 *       (이전: specs/048-diary-home-modernist/contracts/home-screen.md — 오늘로 끝나는 7일)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **언제나 일~토 7칸이다.** 칸 수·순서·폭은 바뀌지 않고, 고른 날을 가운데로 옮기거나 이어
 * 스크롤하지 않는다(보드 원문). 좌우로 넘기면 7칸이 통째로 이전·다음 주로 바뀐다 — 칸이 옆으로
 * 흘러 들어오는 페이지 애니메이션은 두지 않는다(교체는 즉시, research R7).
 *
 * **판정하지 않는다.** 어느 칸을 누를 수 있는지·어느 칸이 오늘인지는 `weekCellsFor()`가, 넘긴
 * 뒤 어느 날을 고를지는 `swipeWeek()`가 정한다. 여기는 방향(`"previous"`·`"next"`)만 알린다.
 * 지금 시각도 읽지 않는다(S5).
 *
 * **다음 주가 없으면 끌림에 저항을 건다**(`canSwipeNext`) — 「살짝 끌리다 제자리로 튕김」.
 * 튕김은 짧은 타이밍 애니메이션이 하고, 날을 바꾸지 않는 것은 `swipeWeek()`가 `null`을 주는 것으로 성립한다.
 *
 * ★ **넘기면 그 자리에서 바로 교체한다 — 새 주를 미끄러뜨리지 않는다**(실기기, 사용자 관측 「넘기는 중에
 * 숫자가 빠르게 여러 번 바뀐다」). 처음에는 넘길 때도 스프링으로 돌려 놓았는데, 새 주가 끌던 자리에
 * 나타나 되돌아오며 스프링이 좌우로 출렁여 숫자가 여러 번 바뀌는 것처럼 보였다(화면 녹화로 확인).
 * 이제 보이는 숫자는 **끌던 주와 도착한 주 둘뿐이다.** 튕김도 스프링 대신 출렁임 없는 타이밍이다.
 *
 * **팬은 JS 스레드에서 돈다**(`runOnJS(true)`) — worklet·`scheduleOnRN` 없이 콜백을 부를 수
 * 있고 jest에서 `fireGestureHandler`로 그대로 쏠 수 있다. 끌림이 끊겨 보이면(짐작 — 실기기
 * D4에서 확인) worklet으로 바꾼다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useLayoutEffect } from "react";
import { Pressable, View, type TextStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { dayParts, type StripCell, type SwipeDirection } from "../app/state";
import type { DayDate } from "../config/day-boundary";
import { AppText } from "./components/Text";
import { weekdayShort } from "./home-text";
import { COLORS } from "./theme/tokens";

/**
 * 넘김 판정 수치 — **사람이 정한 값이다**(보드에 수치 없음, research R7).
 * 실기기 D4에서 손에 맞지 않으면 여기를 고친다.
 */
const SWIPE_DISTANCE = 40;
const SWIPE_VELOCITY = 500;
/** 다음 주가 없을 때 끌림을 줄이는 비율 — 「살짝 끌리다」 */
const RUBBER_BAND = 0.25;
/** 넘기지 않고 놓았을 때 제자리로 돌아오는 시간(ms) — 출렁이지 않는다 */
const RETURN_MS = 180;
/** 넘겼는데 새 주가 이만큼 안 오면 제자리로 돌린다(ms) — 끌린 채 멈춰 있지 않게 하는 안전장치 */
const SWAP_TIMEOUT_MS = 1000;

/**
 * 손을 뗀 순간의 끌림으로 넘김 방향을 정한다 — 멀리 끌었거나 빠르게 튕겼으면 넘긴다.
 * 오른쪽으로 끌면(양수) 이전 주 — 과거가 왼쪽에서 들어온다.
 */
export function swipeDirectionOf(translationX: number, velocityX: number): SwipeDirection | null {
  const far = Math.abs(translationX) >= SWIPE_DISTANCE;
  const fast = Math.abs(velocityX) >= SWIPE_VELOCITY;
  if (!far && !fast) return null;
  const sign = translationX !== 0 ? translationX : velocityX;
  return sign > 0 ? "previous" : "next";
}

export type DayPickerProps = {
  /** 7칸 — 일요일이 왼쪽. `weekCellsFor()`가 만든다 */
  cells: readonly StripCell[];
  onSelect: (day: DayDate) => void;
  /** 넘긴 방향. 어느 날이 될지는 부르는 쪽이 `swipeWeek()`로 정한다 */
  onSwipe?: (direction: SwipeDirection) => void;
  /** 다음 주로 넘길 수 있는가. 거짓이면 왼쪽 끌림에 저항이 걸린다 */
  canSwipeNext?: boolean;
};

export function DayPicker({ cells, onSelect, onSwipe, canSwipeNext = false }: DayPickerProps) {
  const translateX = useSharedValue(0);

  // 끌림을 따라가고(`drag`), 넘기지 않으면 제자리로 돌아온다(`settle`).
  const drag = (to: number) => {
    translateX.value = to;
  };
  const settle = () => {
    translateX.value = withTiming(0, { duration: RETURN_MS });
  };

  // ★ 넘기면 **새 주가 그려지는 그 커밋에서** 제자리로 둔다. 손을 뗀 순간 0으로 두면 새 주가 그려질
  // 때까지(dev에서 약 0.2초) 끌던 주가 가운데로 돌아와 멈춰 있어, 끌던 주 → 같은 주 → 새 주로 두 번
  // 바뀌어 보였다(실기기 화면 녹화).
  const week = cells[0]?.day;
  const awaitingWeek = useSharedValue(false);
  const commit = (direction: SwipeDirection) => {
    awaitingWeek.value = true;
    onSwipe?.(direction);
    setTimeout(() => {
      if (!awaitingWeek.value) return;
      awaitingWeek.value = false;
      settle();
    }, SWAP_TIMEOUT_MS);
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    // 가로로 10pt를 넘겨야 팬이 된다 — 그 전에 손을 떼면 칸 탭이다.
    .activeOffsetX([-10, 10])
    // 세로로 먼저 움직이면 팬을 포기한다 — 홈의 세로 스크롤과 겨루지 않는다.
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      const dx = event.translationX;
      drag(canSwipeNext || dx > 0 ? dx : dx * RUBBER_BAND);
    })
    .onEnd((event) => {
      const direction = swipeDirectionOf(event.translationX, event.velocityX);
      // 다음 주가 없으면 넘기지 않는다 — 부르는 쪽의 `swipeWeek()`도 `null`을 주지만, 여기서
      // 거르지 않으면 교체 없이 제자리로 순간이동해 튕김이 사라진다.
      const moves = direction === "previous" || (direction === "next" && canSwipeNext);
      if (direction !== null && moves) {
        commit(direction);
      } else {
        settle();
      }
    })
    // 끌기 전에 끝났거나 취소됐을 때도 제자리로.
    .onFinalize((_event, success) => {
      if (!success) settle();
    })
    .withTestId("day-strip-pan");

  useLayoutEffect(() => {
    if (!awaitingWeek.value) return;
    awaitingWeek.value = false;
    translateX.value = 0;
  }, [week, translateX, awaitingWeek]);

  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[STRIP, dragStyle]} testID="day-strip">
        {cells.map(({ day, hasDiary, isToday, selectable, selected }) => {
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
              // 통하지 않는다(008 실측). 009의 `day-<date>` 규칙을 그대로 잇는다(FR-023).
              testID={`day-${day}`}
            >
              <AppText style={[DOW, { color: fg }]}>{weekdayShort(weekday)}</AppText>
              <View style={{ alignItems: "center" }}>
                <AppText style={[NUM, { color: fg }]}>{date}</AppText>
                {/* 오늘 — 숫자 밑줄(선택되면 선택 칸 글자색). 헤더에는 「오늘」 글자가 없다.
                    자리는 모든 칸에 둔다 — 오늘이 든 주에서만 스트립이 높아져 넘길 때 아래가 튀었다(실기기). */}
                <View
                  style={[
                    UNDERLINE,
                    isToday ? { backgroundColor: selected ? fg : COLORS.accent } : null,
                  ]}
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
        })}
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * 치수는 보드 `1d`의 값을 옮긴 레이아웃 숫자다(032·047 관례). 색은 `COLORS.*`만.
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

/** 미래 칸 — 흐리게(보드 달력 기준 0.3). 누름 자체는 `disabled`가 막는다. */
const CELL_DIMMED = { opacity: 0.3 } as const;

const DOW = { fontSize: 10, letterSpacing: 0.6, opacity: 0.7 } as const;

const NUM: TextStyle = { fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] };

/** 오늘 밑줄 — 2px, 숫자에서 4 떨어짐 */
const UNDERLINE = { alignSelf: "stretch", height: 2, marginTop: 4 } as const;

const DOT = { width: 5, height: 5 } as const;
