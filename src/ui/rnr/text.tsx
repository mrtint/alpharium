/**
 * 050 — React Native Reusables(RNR) 레지스트리 복사본: `components/ui/text.tsx`.
 *
 * 원본: github.com/founded-labs/react-native-reusables
 *       packages/registry/src/nativewind/components/ui/text.tsx (main @ 385834c, 2026-09-28)
 * 바꾼 것: 글자 변형(h1~muted)과 웹 갈래를 뺐다 — 대화상자·메뉴는 기본 하나만 쓴다. 경로 별칭 `@/`를
 * 상대 경로로.
 *
 * **대화상자·메뉴 부품 안에서만 쓴다**(Clarifications Q3, contracts DEP2). 화면의 글자는 기존
 * `components/Text.tsx`(`AppText`)다.
 */
import { Slot } from "@rn-primitives/slot";
import { createContext, useContext, type ComponentProps } from "react";
import { Text as RNText } from "react-native";

import { cn } from "./utils";

const TextClassContext = createContext<string | undefined>(undefined);

function Text({
  className,
  asChild = false,
  ...props
}: ComponentProps<typeof RNText> & { asChild?: boolean }) {
  const textClass = useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;
  return <Component className={cn("text-foreground text-base", textClass, className)} {...props} />;
}

export { Text, TextClassContext };
