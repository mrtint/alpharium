/**
 * 일기 본문을 좌우로 밀어 전날·다음 날로 가는 제스처 (114, 보드 밖 초안).
 *
 * 계약: specs/114-day-swipe/contracts/day-swipe.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **새 움직임을 만들지 않는다**(FR-009). 끌림을 따라 지면이 움직이지 않고, 손을 뗀 순간 방향이 정해지면 부르는 쪽이
 * 고른 날을 바꾼다 — 스트립 칸을 눌렀을 때와 똑같이 보인다(큰 날짜·요일은 기존 크로스페이드, 049). 그래서 동작 줄이기·큰 글꼴에서도
 * 같은 동작이다. 어느 날이 될지는 `swipeDay()`(`app/state.ts`)가 정하고 이 파일은 방향만 알린다.
 *
 * **다른 입력과 겨루지 않는다**: 세로로 먼저 움직이면 포기해(`failOffsetY`) 지면 스크롤이 이기고, 사진 캐러셀은 이 영역 밖에
 * 둔다(캐러셀은 자기 가로 밀기가 있다, 051). 쓰는 중에는 부르는 쪽이 이 래퍼를 걸지 않는다(054).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ReactNode } from "react";
import type { ViewStyle } from "react-native";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import type { SwipeDirection } from "../app/state";

/**
 * 넘김 판정 수치 — **사람이 정한 값이다**(보드에 수치 없음, 원칙 V). 글을 읽다 스치는 오작동을 줄이려 스트립의 40pt·500보다
 * 크게 잡았다. iPhone에서 손에 맞지 않으면 여기를 고친다 — 실기기에서 재서 정한 값이 아니다.
 */
export const DAY_SWIPE_DISTANCE = 60;
export const DAY_SWIPE_VELOCITY = 600;
/** 팬이 활성이 되는 가로 이동(pt)과 포기하는 세로 이동(pt) — 같은 이유로 사람이 정한 값이다(원칙 V) */
export const DAY_SWIPE_ACTIVE_X = 16;
export const DAY_SWIPE_FAIL_Y = 12;

/**
 * 손을 뗀 순간의 끌림으로 넘김 방향을 정한다 — 멀리 끌었거나 빠르게 튕겼으면 넘긴다.
 * 오른쪽으로 끌면(양수) 전날 — 스트립(`swipeDirectionOf`)과 같다.
 */
export function daySwipeDirectionOf(
  translationX: number,
  velocityX: number,
): SwipeDirection | null {
  const far = Math.abs(translationX) >= DAY_SWIPE_DISTANCE;
  const fast = Math.abs(velocityX) >= DAY_SWIPE_VELOCITY;
  if (!far && !fast) return null;
  // 멀리 끌었다가 빠르게 되돌려 놓은 것(거리와 속도의 방향이 반대)은 취소하려던 동작이다 — 넘기지 않는다.
  if (far && fast && Math.sign(translationX) !== Math.sign(velocityX)) return null;
  // 멀리 끌었으면 거리의 방향, 빠르게 튕기기만 했으면 속도의 방향이다.
  const sign = far ? translationX : velocityX;
  return sign > 0 ? "previous" : "next";
}

export type DaySwipeProps = {
  /** 넘겼다 — 어느 날이 될지는 부르는 쪽이 `swipeDay()`로 정한다 */
  onSwipeDay: (direction: SwipeDirection) => void;
  children: ReactNode;
  style?: ViewStyle;
  testID?: string;
};

export function DaySwipe({ onSwipeDay, children, style, testID }: DaySwipeProps) {
  const pan = Gesture.Pan()
    .runOnJS(true)
    // 가로로 16pt를 넘겨야 팬이 된다 — 글을 읽다 살짝 스치는 정도로는 날이 넘어가지 않는다.
    .activeOffsetX([-DAY_SWIPE_ACTIVE_X, DAY_SWIPE_ACTIVE_X])
    // 세로로 먼저 움직이면 팬을 포기한다 — 지면의 세로 스크롤과 겨루지 않는다.
    .failOffsetY([-DAY_SWIPE_FAIL_Y, DAY_SWIPE_FAIL_Y])
    // 취소(시스템 가로채기·다른 제스처가 가져감)도 끝으로 불린다 — `success`가 거짓이면 날을 옮기지 않는다.
    .onEnd((event, success) => {
      if (!success) return;
      const direction = daySwipeDirectionOf(event.translationX, event.velocityX);
      if (direction !== null) onSwipeDay(direction);
    })
    .withTestId("day-swipe-pan");

  return (
    <GestureDetector gesture={pan}>
      <View style={style} testID={testID}>
        {children}
      </View>
    </GestureDetector>
  );
}
