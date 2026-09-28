/**
 * 050 — React Native Reusables(RNR) 레지스트리 복사본: `lib/utils.ts`.
 *
 * 원본: github.com/founded-labs/react-native-reusables
 *       packages/registry/src/nativewind/lib/utils.ts (main @ 385834c, 2026-09-28)
 * 바꾼 것: 없음.
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
