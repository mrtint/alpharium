/**
 * 050 — React Native Reusables(RNR) 레지스트리 복사본: `components/ui/native-only-animated-view.tsx`.
 *
 * 원본: github.com/founded-labs/react-native-reusables
 *       packages/registry/src/nativewind/components/ui/native-only-animated-view.tsx (main @ 385834c, 2026-09-28)
 * 바꾼 것: 웹 갈래를 뺐다(앱은 안드로이드만 낸다). 대화상자·메뉴의 덮개가 이것으로 페이드한다 —
 * jest의 reanimated 목에는 움직임이 없으므로 움직임은 실기기에서 본다(C9).
 */
import type { ComponentProps } from "react";
import { Pressable } from "react-native";
import Animated from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// `key`는 React가 따로 다루므로 props 타입에서 뺀다 — reanimated 타입은 `key`에 SharedValue도 허용해
// 그대로 퍼뜨리면 tsc가 막는다.
type Props =
  | (Omit<ComponentProps<typeof Animated.View>, "key"> & { as?: "View" })
  | (Omit<ComponentProps<typeof AnimatedPressable>, "key"> & { as: "Pressable" });

export function NativeOnlyAnimatedView(props: Props) {
  if (props.as === "Pressable") {
    const { as: _as, ...rest } = props;
    return <AnimatedPressable {...rest} />;
  }
  const { as: _as, ...rest } = props;
  return <Animated.View {...rest} />;
}
