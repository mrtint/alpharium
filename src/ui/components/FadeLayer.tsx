/**
 * 마운트할 때의 투명도 `from`에서 `to`로 `durationMs` 동안 옮기는 겹 (049, 054에서 공용으로 꺼냈다).
 *
 * ★ **시작 투명도를 마운트 값으로 준다.** 값을 effect에서 되돌리면 effect는 첫 프레임을 그린 **뒤**에 돌아
 * 그 한 프레임이 샌다(049 실기기 — 「넘기는 중에 숫자가 여러 번 바뀐다」). 다시 쓰려면 부르는 쪽이 `key`를
 * 바꿔 새로 마운트한다. 누름을 가로채지 않는다(`pointerEvents="none"`).
 *
 * **jest는 배선만 본다**(C9) — 겹이 함께 그려지는지까지. 실제로 부드럽게 겹치는지는 실기기에서 본다.
 */

import { useEffect, type ReactNode } from "react";
import type { ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

export function FadeLayer({
  from,
  to,
  durationMs,
  style,
  testID,
  children,
}: {
  from: number;
  to: number;
  durationMs: number;
  style?: ViewStyle;
  testID?: string;
  children: ReactNode;
}) {
  const opacity = useSharedValue(from);
  useEffect(() => {
    if (from !== to) opacity.value = withTiming(to, { duration: durationMs });
    // 마운트 때 한 번만 — 값이 바뀌면 부르는 쪽이 `key`로 새로 마운트한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View pointerEvents="none" style={[style, fade]} testID={testID}>
      {children}
    </Animated.View>
  );
}
