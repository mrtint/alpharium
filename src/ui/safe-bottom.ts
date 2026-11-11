/**
 * 아래 안전 영역(iPhone 홈 표시줄·안드로이드 내비게이션 바 자리)을 읽는다 (115, 보드 밖 초안).
 *
 * 홈은 루트에서 아래 안전 영역을 비우지 않는다 — 하단 바의 면이 화면 맨 아래까지 닿게 한다. 그 대신 인셋을 쓰는 곳(바·겹·토스트·지면 아래
 * 여백)이 이 훅 하나로 읽는다. 값은 기기에서 오므로 jest는 `SafeAreaInsetsContext`에 값을 주어 본다. 바 치수는 `bar-metrics.ts`다.
 *
 * **`useSafeAreaInsets`를 쓰지 않는다** — 제공자 없는 렌더에서 던진다(`PhotoViewer`가 같은 이유로 컨텍스트를 직접 읽는다). 값이 없으면 0이다.
 */

import { useContext } from "react";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { usableInset } from "./bar-metrics";

/** 지금 기기의 아래 안전 영역 높이. 컨텍스트가 없으면 0 */
export function useBottomInset(): number {
  return usableInset(useContext(SafeAreaInsetsContext)?.bottom ?? 0);
}
