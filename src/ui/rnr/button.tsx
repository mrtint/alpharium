/**
 * 050 — React Native Reusables(RNR) 레지스트리 복사본: `components/ui/button.tsx`.
 *
 * 원본: github.com/founded-labs/react-native-reusables
 *       packages/registry/src/nativewind/components/ui/button.tsx (main @ 385834c, 2026-09-28)
 * 바꾼 것:
 * - 변형을 `default`·`outline`·`ghost`만 남겼다(대화상자·메뉴가 쓰는 것). 크기 변형을 뺐다 — 높이는
 *   보드 값(48)을 부르는 쪽이 준다.
 * - 웹·다크 갈래(`dark:`·`hover:`·`focus-visible:`)를 뺐다 — 앱은 안드로이드 라이트 고정이다(031).
 * - RNR의 `accent`(눌림 배경)는 우리 `accent`(빨강)와 이름이 겹쳐 `bg-surface`로 바꿨다(research R6).
 * - 반경은 `rounded-control`(토큰 `RADIUS.control` = 6).
 *
 * **대화상자·메뉴 부품 안에서만 쓴다**(Q3, DEP2). 화면의 버튼은 기존 `components/Button.tsx`다.
 */
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { Pressable } from "react-native";

import { TextClassContext } from "./text";
import { cn } from "./utils";

const buttonVariants = cva("shrink-0 flex-row items-center justify-center rounded-control", {
  variants: {
    variant: {
      default: "bg-primary active:opacity-90",
      outline: "border border-foreground bg-background active:bg-surface",
      ghost: "active:bg-surface",
    },
  },
  defaultVariants: { variant: "default" },
});

const buttonTextVariants = cva("text-base font-semibold", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      outline: "text-foreground",
      ghost: "text-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

type ButtonProps = ComponentProps<typeof Pressable> & VariantProps<typeof buttonVariants>;

function Button({ className, variant, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant })}>
      <Pressable
        className={cn(props.disabled && "opacity-50", buttonVariants({ variant }), className)}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
