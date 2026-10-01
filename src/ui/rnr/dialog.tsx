/**
 * 050 — React Native Reusables(RNR) 레지스트리 복사본: `components/ui/dialog.tsx`.
 *
 * 원본: github.com/founded-labs/react-native-reusables
 *       packages/registry/src/nativewind/components/ui/dialog.tsx (main @ 385834c, 2026-09-28)
 * 바꾼 것:
 * - ★ `react-native-screens`의 `FullWindowOverlay`와 `lucide-react-native`의 닫기 아이콘(X)을 뺐다
 *   (research R2 — 둘 다 네이티브 모듈을 끌고 온다). 보드 `2j`에는 닫기 X가 없고 「취소」 버튼이 있다.
 * - 웹 갈래를 뺐다. 경로 별칭 `@/`를 상대 경로로.
 * - 덮개·면의 `testID`·`style`을 받게 했다(jest에는 NativeWind 변환이 없다).
 * - 면 안쪽을 누를 때 덮개의 닫기가 불리지 않도록 면을 `Pressable`로 감싸 누름을 가둔다 — 원본은 웹에서만
 *   `event.target`으로 가렸고, 네이티브에서는 면이 덮개(Pressable) 안에 들어 있어 누름이 새어 나간다.
 *
 * **덮개를 누르면 닫힌다** — 프리미티브의 `Overlay`는 `Pressable`이고 `closeOnPress = true`가 기본이다
 * (설치본 `dist/dialog.mjs`). 뒤로 가기는 `Content`가 `BackHandler`로 닫는다(research R3).
 */
import * as DialogPrimitive from "@rn-primitives/dialog";
import type { ComponentProps } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import { FadeIn, FadeOut, ReduceMotion } from "react-native-reanimated";

import { NativeOnlyAnimatedView } from "./native-only-animated-view";
import { cn } from "./utils";

const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;

function DialogContent({
  className,
  overlayStyle,
  overlayTestID,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  overlayStyle?: StyleProp<ViewStyle>;
  overlayTestID?: string;
}) {
  return (
    <DialogPortal>
      <DialogPrimitive.Overlay
        asChild
        className="absolute bottom-0 left-0 right-0 top-0 flex items-center justify-center"
        style={overlayStyle}
        testID={overlayTestID}
      >
        <NativeOnlyAnimatedView
          as="Pressable"
          entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(150).reduceMotion(ReduceMotion.System)}
        >
          {/*
            면 안의 누름이 덮개의 닫기로 새지 않게 가둔다. 056 — 덮개 높이를 넘지 않고 줄어들어야 면(`flexShrink`)과 본문 스크롤이
            넘침을 맡는다(Dialog.tsx DLG8).
          */}
          <Pressable
            accessible={false}
            onPress={() => {}}
            style={{ width: "100%", maxHeight: "100%", flexShrink: 1 }}
          >
            <DialogPrimitive.Content
              className={cn("bg-background z-50 flex w-full flex-col", className)}
              {...props}
            />
          </Pressable>
        </NativeOnlyAnimatedView>
      </DialogPrimitive.Overlay>
    </DialogPortal>
  );
}

const DialogTitle = DialogPrimitive.Title;

export { Dialog, DialogContent, DialogTitle };
