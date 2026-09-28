/**
 * 050 — React Native Reusables(RNR) 레지스트리 복사본: `components/ui/dropdown-menu.tsx`.
 *
 * 원본: github.com/founded-labs/react-native-reusables
 *       packages/registry/src/nativewind/components/ui/dropdown-menu.tsx (main @ 385834c, 2026-09-28)
 * 바꾼 것:
 * - ★ `react-native-screens`의 `FullWindowOverlay`와 `lucide-react-native` 아이콘을 뺐다(research R2).
 *   그 아이콘을 쓰던 하위 메뉴·체크·라디오 항목도 함께 뺐다 — 홈 메뉴(048)는 평평한 항목뿐이다.
 * - 웹 갈래를 뺐다. 경로 별칭 `@/`를 상대 경로로. RNR식 `accent`(눌림 배경) → `bg-surface`(research R6).
 * - 덮개·목록의 `testID`·`style`을 받게 했다(jest에는 NativeWind 변환이 없다).
 *
 * 덮개(`Overlay`)는 `Pressable` + `closeOnPress`, 목록(`Content`)은 `BackHandler`로 닫힌다. 항목(`Item`)은
 * 누르면 닫고 `onPress`를 부른다(설치본 `dist/dropdown-menu.mjs`, research R3·R7).
 */
import * as DropdownMenuPrimitive from "@rn-primitives/dropdown-menu";
import type { ComponentProps } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { FadeIn, ReduceMotion } from "react-native-reanimated";

import { NativeOnlyAnimatedView } from "./native-only-animated-view";
import { TextClassContext } from "./text";
import { cn } from "./utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

function DropdownMenuContent({
  className,
  overlayTestID,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content> & {
  overlayTestID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Overlay asChild style={StyleSheet.absoluteFill} testID={overlayTestID}>
        <NativeOnlyAnimatedView as="Pressable" entering={FadeIn.reduceMotion(ReduceMotion.System)}>
          <TextClassContext.Provider value="text-popover-foreground">
            <DropdownMenuPrimitive.Content
              className={cn(
                "bg-popover border-foreground min-w-[8rem] overflow-hidden border",
                className,
              )}
              {...props}
            />
          </TextClassContext.Provider>
        </NativeOnlyAnimatedView>
      </DropdownMenuPrimitive.Overlay>
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item> & { className?: string }) {
  return (
    <TextClassContext.Provider value="text-popover-foreground">
      <DropdownMenuPrimitive.Item
        className={cn("active:bg-surface flex flex-row items-center", className)}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger };
