/**
 * 설정·개발자 토스트 — 제목 한 줄과 선택 보조 줄 (059, 보드 `6d` ② 「2초 뒤 사라짐」).
 *
 * 계약: specs/059-developer-menu/contracts/developer-menu.md DV10, research R11
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 054 `FailureToast`는 실패 전용(3초·쓸어 닫기·하단 바 높이)이라 재사용하지 않고 `TOAST` 토큰(색·여백·글자)만 공유한다. 쓸어 닫기가 없고
 * 2초 뒤 저절로 사라진다. **한 번에 하나** — 새 문구는 부르는 쪽이 `key`를 바꿔 새로 마운트한다(시작값을 마운트 값으로 준다: effect로 되돌리면
 * 첫 프레임이 샌다, 049). jest의 reanimated 목은 움직임을 못 본다(C9) — 실기기 녹화로 본다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AppText } from "./components/Text";
import { COLORS, TOAST } from "./theme/tokens";

/** 화면에 머무는 시간(ms). 사람이 정한 값 — 보드 「2초 뒤 사라짐」 */
export const TOAST_SHOW_MS = 2000;

const ENTER_OFFSET = 24;

export function DeveloperToast({
  text,
  sub,
  bottom,
  onDismiss,
}: {
  text: string;
  sub?: string;
  bottom: number;
  onDismiss: () => void;
}) {
  const translateY = useSharedValue(ENTER_OFFSET);
  const opacity = useSharedValue(0);

  const enter = () => {
    translateY.value = withTiming(0, { duration: TOAST.enterMs, easing: Easing.out(Easing.ease) });
    opacity.value = withTiming(1, { duration: TOAST.enterMs });
  };
  const fadeOut = () => {
    opacity.value = withTiming(0, { duration: TOAST.fadeOutMs });
  };

  useEffect(() => {
    // 마운트 때 한 번만 — 시작값은 위 `useSharedValue`가 이미 마운트 값으로 주었다.
    enter();
    const fade = setTimeout(fadeOut, TOAST_SHOW_MS - TOAST.fadeOutMs);
    const timer = setTimeout(onDismiss, TOAST_SHOW_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const motion = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    // 래퍼는 입력을 통과시킨다 — 토스트는 누를 곳이 없다
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", left: TOAST.inset, right: TOAST.inset, bottom }}
      testID="developer-toast-slot"
    >
      <Animated.View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        pointerEvents="none"
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: TOAST.markerGap,
            minHeight: TOAST.minHeight,
            paddingVertical: TOAST.padding.vertical,
            paddingHorizontal: TOAST.padding.horizontal,
            backgroundColor: COLORS.text,
            shadowColor: COLORS.text,
            shadowOffset: { width: 0, height: TOAST.shadow.offsetY },
            shadowOpacity: TOAST.shadow.opacity,
            shadowRadius: TOAST.shadow.blur / 2,
            elevation: 6,
          },
          motion,
        ]}
        testID="developer-toast"
      >
        <View
          style={{
            width: TOAST.marker,
            height: TOAST.marker,
            backgroundColor: COLORS.accent,
          }}
        />
        <View style={{ flex: 1 }}>
          <AppText
            style={{
              color: COLORS.bg,
              fontSize: TOAST.fontSize,
              fontWeight: TOAST.fontWeight,
              lineHeight: TOAST.lineHeight,
            }}
          >
            {text}
          </AppText>
          {sub !== undefined && (
            <AppText
              style={{ color: COLORS.bg, fontSize: 12, lineHeight: 16, opacity: 0.8 }}
              testID="developer-toast-sub"
            >
              {sub}
            </AppText>
          )}
        </View>
      </Animated.View>
    </View>
  );
}
