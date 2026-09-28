/**
 * 050 — React Native Reusables(RNR) 레지스트리 복사본: `components/ui/alert-dialog.tsx`.
 *
 * 원본: github.com/founded-labs/react-native-reusables
 *       packages/registry/src/nativewind/components/ui/alert-dialog.tsx (main @ 385834c, 2026-09-28)
 * 바꾼 것:
 * - ★ `react-native-screens`의 `FullWindowOverlay`를 뺐다(research R2). 원본도 iOS에서만 쓰고 안드로이드는
 *   `Fragment`다 — 그 패키지는 네이티브 모듈이라 들이면 C2(dev 1회 검증)의 전제가 깨진다.
 * - 웹 갈래(`animate-in`·`sm:`)를 뺐다. 경로 별칭 `@/`를 상대 경로로.
 * - `Action`·`Cancel` 래퍼를 뺐다 — 보드의 버튼 모양은 `components/Dialog.tsx`가 준다.
 * - 덮개·면의 `testID`·`style`을 받게 했다(jest에는 NativeWind 변환이 없어 인라인 값이 필요하다).
 *
 * **덮개가 누름을 받지 않는다** — 프리미티브의 `Overlay`는 `onPress`를 넘기지 않는다(설치본
 * `dist/alert-dialog.mjs`). 그래서 배경을 눌러도 닫히지 않는다(보드 `2d`). 뒤로 가기는 `Content`가
 * `BackHandler`로 `onOpenChange(false)`를 부른다(research R3).
 */
import * as AlertDialogPrimitive from "@rn-primitives/alert-dialog";
import type { ComponentProps } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { FadeIn, FadeOut, ReduceMotion } from "react-native-reanimated";

import { NativeOnlyAnimatedView } from "./native-only-animated-view";
import { cn } from "./utils";

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

function AlertDialogContent({
  className,
  overlayStyle,
  overlayTestID,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Content> & {
  overlayStyle?: StyleProp<ViewStyle>;
  overlayTestID?: string;
}) {
  return (
    <AlertDialogPortal>
      <AlertDialogPrimitive.Overlay
        asChild
        className="absolute bottom-0 left-0 right-0 top-0 z-50 flex items-center justify-center"
        style={overlayStyle}
        testID={overlayTestID}
      >
        <NativeOnlyAnimatedView
          as="Pressable"
          entering={FadeIn.duration(200).delay(50).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(150).reduceMotion(ReduceMotion.System)}
        >
          <AlertDialogPrimitive.Content
            className={cn("bg-background z-50 flex w-full flex-col", className)}
            {...props}
          />
        </NativeOnlyAnimatedView>
      </AlertDialogPrimitive.Overlay>
    </AlertDialogPortal>
  );
}

const AlertDialogTitle = AlertDialogPrimitive.Title;
const AlertDialogDescription = AlertDialogPrimitive.Description;

export { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle };
