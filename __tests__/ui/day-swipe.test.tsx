/**
 * 일기 본문 밀기 (114, contracts/day-swipe.md).
 *
 * 순수 판정(`daySwipeDirectionOf`)과 제스처 배선(`DaySwipe`)을 본다. 실제로 손에 맞는지는 실기기에서 본다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { State } from "react-native-gesture-handler";
import { fireGestureHandler, getByGestureTestId } from "react-native-gesture-handler/jest-utils";

import {
  DaySwipe,
  DAY_SWIPE_ACTIVE_X,
  DAY_SWIPE_DISTANCE,
  DAY_SWIPE_FAIL_Y,
  DAY_SWIPE_VELOCITY,
  daySwipeDirectionOf,
} from "../../src/ui/DaySwipe";

const SOURCE = readFileSync(join(__dirname, "../../src/ui/DaySwipe.tsx"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("daySwipeDirectionOf — 손을 뗀 순간의 방향", () => {
  it("멀리 끌었으면 넘긴다 — 오른쪽(양수)은 전날, 왼쪽(음수)은 다음 날", () => {
    expect(daySwipeDirectionOf(DAY_SWIPE_DISTANCE, 0)).toBe("previous");
    expect(daySwipeDirectionOf(-DAY_SWIPE_DISTANCE, 0)).toBe("next");
  });

  it("거리가 모자라면 넘기지 않는다", () => {
    expect(daySwipeDirectionOf(DAY_SWIPE_DISTANCE - 1, 0)).toBeNull();
    expect(daySwipeDirectionOf(-(DAY_SWIPE_DISTANCE - 1), 0)).toBeNull();
  });

  it("빠르게 튕겼으면 거리가 짧아도 넘긴다", () => {
    expect(daySwipeDirectionOf(10, DAY_SWIPE_VELOCITY)).toBe("previous");
    expect(daySwipeDirectionOf(-10, -DAY_SWIPE_VELOCITY)).toBe("next");
    expect(daySwipeDirectionOf(10, DAY_SWIPE_VELOCITY - 1)).toBeNull();
  });

  it("거리가 0이면 속도 부호를 따른다", () => {
    expect(daySwipeDirectionOf(0, DAY_SWIPE_VELOCITY)).toBe("previous");
    expect(daySwipeDirectionOf(0, -DAY_SWIPE_VELOCITY)).toBe("next");
  });

  it("멀리 끌었다가 빠르게 되돌려 놓으면(거리와 속도가 반대) 넘기지 않는다 — 취소하려던 동작이다", () => {
    expect(daySwipeDirectionOf(DAY_SWIPE_DISTANCE + 10, -(DAY_SWIPE_VELOCITY + 100))).toBeNull();
    expect(daySwipeDirectionOf(-(DAY_SWIPE_DISTANCE + 10), DAY_SWIPE_VELOCITY + 100)).toBeNull();
  });

  it("멀리 끌고 천천히 되돌려도 거리의 방향으로 넘긴다", () => {
    expect(daySwipeDirectionOf(DAY_SWIPE_DISTANCE + 10, -(DAY_SWIPE_VELOCITY - 100))).toBe(
      "previous",
    );
  });

  it("멀리 끌고 같은 방향으로 빠르게 놓으면 그 방향이다", () => {
    expect(daySwipeDirectionOf(-(DAY_SWIPE_DISTANCE + 10), -(DAY_SWIPE_VELOCITY + 100))).toBe(
      "next",
    );
  });

  it("거리가 짧고 속도만 빠르면 속도의 방향이다", () => {
    expect(daySwipeDirectionOf(-10, DAY_SWIPE_VELOCITY + 100)).toBe("previous");
  });

  it("아무것도 못 미치면 null", () => {
    expect(daySwipeDirectionOf(0, 0)).toBeNull();
  });

  it("수치는 사람이 정한 값으로 못박혀 있다 (원칙 V)", () => {
    expect(DAY_SWIPE_DISTANCE).toBe(60);
    expect(DAY_SWIPE_VELOCITY).toBe(600);
    expect(DAY_SWIPE_ACTIVE_X).toBe(16);
    expect(DAY_SWIPE_FAIL_Y).toBe(12);
  });
});

describe("DaySwipe — 제스처 배선", () => {
  /**
   * **팬 배선은 한 렌더 안에서만 쏜다.** gesture-handler의 jest 레지스트리는 testID로 핸들러를 찾는데, 앞 테스트에서 쏜 뒤 새로
   * 렌더한 것에 쏘면 앞 테스트의 핸들러가 불린다(`day-picker.test.tsx`에서 실측). 그래서 배선은 이 테스트 하나에서 보고,
   * 문턱 판정은 위의 순수 함수 `daySwipeDirectionOf`로 따로 잠근다.
   */
  it("★ 끝난 끌림의 방향이 한 번씩 전달된다 (오른쪽 → previous, 왼쪽 → next, 짧음·취소는 없음)", async () => {
    const onSwipeDay = jest.fn();
    await render(
      <DaySwipe onSwipeDay={onSwipeDay}>
        <Text>본문</Text>
      </DaySwipe>,
    );
    const fire = (events: Parameters<typeof fireGestureHandler>[1]) =>
      act(() => {
        fireGestureHandler(getByGestureTestId("day-swipe-pan"), events);
      });
    /** 시작 → 끌림 → 끝 */
    const drag = (translationX: number, velocityX = 0) => [
      { state: State.BEGAN, translationX: 0, velocityX: 0 },
      { state: State.ACTIVE, translationX: translationX / 2, velocityX },
      { state: State.ACTIVE, translationX, velocityX },
      { state: State.END, translationX, velocityX },
    ];

    fire(drag(DAY_SWIPE_DISTANCE + 20));
    expect(onSwipeDay).toHaveBeenCalledTimes(1);
    expect(onSwipeDay).toHaveBeenLastCalledWith("previous");

    fire(drag(-(DAY_SWIPE_DISTANCE + 20)));
    expect(onSwipeDay).toHaveBeenCalledTimes(2);
    expect(onSwipeDay).toHaveBeenLastCalledWith("next");

    // 짧게 끌고 떼면 알리지 않는다.
    fire(drag(DAY_SWIPE_DISTANCE - 20));
    expect(onSwipeDay).toHaveBeenCalledTimes(2);

    // 취소되면 알리지 않는다.
    fire([
      { state: State.BEGAN, translationX: 0, velocityX: 0 },
      { state: State.ACTIVE, translationX: 200, velocityX: 0 },
      { state: State.CANCELLED, translationX: 200, velocityX: 0 },
    ]);
    expect(onSwipeDay).toHaveBeenCalledTimes(2);

    // 빠르게 튕기면 거리가 짧아도 알린다.
    fire(drag(-10, -(DAY_SWIPE_VELOCITY + 100)));
    expect(onSwipeDay).toHaveBeenCalledTimes(3);
    expect(onSwipeDay).toHaveBeenLastCalledWith("next");
  });
});

describe("DaySwipe — 소스 계약 (주석을 걷어낸 소스)", () => {
  it("가로 16pt 이상에서 활성, 세로 12pt에서 포기한다 (세로 스크롤·캐러셀과 겨루지 않는다)", () => {
    expect(CODE).toMatch(/activeOffsetX\(\[-DAY_SWIPE_ACTIVE_X, DAY_SWIPE_ACTIVE_X\]\)/);
    expect(CODE).toMatch(/failOffsetY\(\[-DAY_SWIPE_FAIL_Y, DAY_SWIPE_FAIL_Y\]\)/);
  });

  it("FR-009 — 새 전환 움직임이 없다: 끌림을 따라 움직이지도, 애니메이션을 쓰지도 않는다", () => {
    expect(CODE).not.toMatch(/useAnimatedStyle|withTiming|withSpring|translateX|useSharedValue/);
  });

  it("끌고 있는 동안에는 알리지 않는다 — 끝(onEnd)에서만 판정한다", () => {
    expect(CODE).toMatch(/\.onEnd\(/);
    expect(CODE).not.toMatch(/\.onUpdate\(|\.onChange\(/);
  });

  it("원칙 IV — 시간·속도를 재지 않는다 (속도는 제스처가 준 값을 판정에만 쓴다)", () => {
    expect(CODE).not.toMatch(/Date\.now|performance\.now|elapsed/);
  });
});
