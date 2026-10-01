/**
 * 홈 위에 쌓이는 하위 화면 겹 (055, 보드 `6a` 「오른쪽에서 밀려 들어옴(스택 push)」).
 *
 * 계약: specs/055-settings-entry-frame/contracts/settings-stack.md S6·S7
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **홈을 언마운트하지 않는다**(설계 D4). 048은 `route`로 홈과 설정을 바꿔 끼웠고, 그래서 설정에 다녀오면 쓰는
 * 중(054)·지면 스크롤(052)·접힘이 사라졌다. 이 겹은 홈 위에 절대 배치로 얹혀 `translateX`로 들어오고 나간다 —
 * 새 내비게이션 라이브러리 없이(research R1, `react-native-screens`는 050 DEP1이 막았다).
 *
 * **뒤로 가기는 마운트돼 있고 `active`일 때만 가로챈다**(048 N3 규칙 유지). `active`가 거짓이면(이 겹 위에 다른
 * 겹이 열렸다) **아예 등록하지 않는다** — 안드로이드 `BackHandler`는 나중에 등록한 것부터 부르므로, 등록 순서에
 * 기대면 effect가 다시 돌 때 아래 겹이 위로 올라와 엉뚱한 겹이 닫힌다(research R2와 같은 결함). 닫히는 중에도
 * 등록하지 않는다 — 이미 닫는 중이다.
 *
 * **언마운트는 JS 타이머로 한다**(054 `FailureToast`와 같은 방식) — worklet 콜백을 쓰지 않는다. 닫히는 동안
 * 겹은 그대로 그려져 있어 홈은 덮인 채다(FR-007). 그 상태는 `onSettled`로 부모에게 알린다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { BackHandler, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { COLORS, SETTINGS } from "./theme/tokens";

/** 겹이 밀리는 목표 — 열리면 제자리(0), 닫히면 화면 폭만큼 오른쪽(밖). */
export function slideTarget(open: boolean, width: number): number {
  return open ? 0 : width;
}

export function StackLayer({
  open,
  onClose,
  active = true,
  onSettled,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** 위에 다른 겹이 없는가. 거짓이면 뒤로 가기를 등록하지 않는다. 기본 참 */
  active?: boolean;
  /** 겹이 그려져 있는가가 바뀔 때 — 닫히는 움직임이 끝날 때까지 `true`다 */
  onSettled?: (mounted: boolean) => void;
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  // 마운트가 열림을 따라잡는다 — effect 안의 setState 대신 렌더에서 맞춘다(react-hooks/set-state-in-effect).
  if (open && !mounted) setMounted(true);

  const translateX = useSharedValue(slideTarget(false, width));

  // 공유값을 바꾸는 함수는 그것을 쓰는 effect보다 먼저 선언한다(054 react-hooks/immutability).
  const slide = (to: boolean) => {
    translateX.value = withTiming(slideTarget(to, width), {
      duration: SETTINGS.slideMs,
      easing: to ? Easing.out(Easing.ease) : Easing.in(Easing.ease),
    });
  };

  const settledRef = useRef(onSettled);
  useEffect(() => {
    settledRef.current = onSettled;
  });

  useEffect(() => {
    settledRef.current?.(mounted);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    slide(open);
    if (open) return;
    const timer = setTimeout(() => setMounted(false), SETTINGS.slideMs);
    return () => clearTimeout(timer);
    // 열림·닫힘이 바뀔 때만 움직인다. 폭이 바뀌어도(회전) 다음 움직임에서 맞는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted]);

  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open || !active) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      closeRef.current();
      return true;
    });
    return () => subscription.remove();
  }, [open, active]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  if (!mounted) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.layer, style]}>{children}</Animated.View>
  );
}

const styles = StyleSheet.create({
  // 불투명 전면 — 덮인 홈은 누름을 받지 않는다(R3).
  layer: { backgroundColor: COLORS.bg },
});
