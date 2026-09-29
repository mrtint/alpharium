/**
 * 실패 토스트 — 하단 바 위에서 올라오는 한 줄 (054, 보드 `2i`).
 *
 * 계약: specs/054-in-place-writing/contracts/failure-toast.md T8~T11·T14
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **그리기만 한다.** 문구는 부르는 쪽이 `TOAST_TEXT`에서 골라 넘기고(정본은 `src/app/failure-toast.ts`), 이
 * 부품은 문자열 하나만 받는다 — 이유·모델·오류 코드가 들어올 자리가 없다(FR-016). 버튼이 없다(다시 쓰기는 하단
 * 바로 한다).
 *
 * - 좌우 12, 바닥에서 `bottom`(= 하단 바의 잰 높이 + 12, 부르는 쪽이 정한다). 하단 바를 가리거나 밀어내지 않고,
 *   래퍼는 `pointerEvents="box-none"`이라 토스트 밖의 입력을 통과시킨다(T11).
 * - `TOAST.showMs`(3초) 뒤 저절로 사라지고(`fadeOutMs` 전부터 페이드), 아래로 쓸면 바로 닫힌다. 문턱은
 *   `shouldDismissToast()`(사람이 정한 값 — 원칙 V)가 정한다.
 * - `accessibilityRole="alert"` + `accessibilityLiveRegion="polite"` — 나타날 때 읽힌다.
 *
 * ★ **슬라이드 인의 시작값을 마운트 값으로 준다.** effect로 되돌리면 첫 프레임이 샌다(049). 다시 띄우려면
 * 부르는 쪽이 `key`를 바꿔 새로 마운트한다. **jest는 움직임을 못 본다**(C9) — 실기기 녹화(D7·D8).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { shouldDismissToast } from "../app/failure-toast";
import { AppText } from "./components/Text";
import { COLORS, TOAST } from "./theme/tokens";

/** 올라오기 시작하는 아래쪽 거리 */
const ENTER_OFFSET = 24;

export function FailureToast({
  text,
  bottom,
  onDismiss,
}: {
  text: string;
  bottom: number;
  onDismiss: () => void;
}) {
  const translateY = useSharedValue(ENTER_OFFSET);
  const opacity = useSharedValue(0);

  // 한 번만 닫는다 — 타이머와 쓸어 닫기가 겹쳐도 `onDismiss`는 한 번이다(T10). 공유값으로 든다(ref는 렌더 규칙이 막는다).
  const dismissed = useSharedValue(false);

  // 움직임을 바꾸는 것은 전부 여기서 — effect보다 **먼저** 선언한다(049 `DayPicker`의 `drag`·`settle` 방식.
  // effect가 쓴 값을 그 뒤에서 바꾸면 lint가 막는다).
  const enter = () => {
    translateY.value = withTiming(0, { duration: TOAST.enterMs, easing: Easing.out(Easing.ease) });
    opacity.value = withTiming(1, { duration: TOAST.enterMs });
  };
  const fadeOut = () => {
    opacity.value = withTiming(0, { duration: TOAST.fadeOutMs });
  };
  const follow = (dy: number) => {
    // 아래로만 따라간다 — 위로 끌어도 제자리다.
    translateY.value = Math.max(0, dy);
  };
  const settle = () => {
    translateY.value = withTiming(0, { duration: TOAST.enterMs });
  };
  const dismiss = () => {
    if (dismissed.value) return;
    dismissed.value = true;
    onDismiss();
  };

  useEffect(() => {
    // 마운트 때 한 번만 — 시작값은 위 `useSharedValue`가 이미 마운트 값으로 주었다.
    enter();
    const fade = setTimeout(fadeOut, TOAST.showMs - TOAST.fadeOutMs);
    const timer = setTimeout(dismiss, TOAST.showMs);
    return () => {
      clearTimeout(fade);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pan = Gesture.Pan()
    .runOnJS(true)
    // 세로로 10pt를 넘겨야 팬이 된다. 가로로 먼저 움직이면 포기한다(칸 탭·스트립과 겨루지 않는다).
    .activeOffsetY([-10, 10])
    .failOffsetX([-10, 10])
    .onUpdate((event) => follow(event.translationY))
    .onEnd((event) => {
      if (shouldDismissToast(event.translationY, event.velocityY)) dismiss();
      else settle();
    })
    .onFinalize((_event, success) => {
      if (!success) settle();
    })
    .withTestId("failure-toast-pan");

  const motion = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    // 래퍼는 입력을 통과시킨다 — 토스트 본체만 팬을 받는다(T11)
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", left: TOAST.inset, right: TOAST.inset, bottom }}
      testID="failure-toast-slot"
    >
      <GestureDetector gesture={pan}>
        <Animated.View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[
            {
              flexDirection: "row",
              alignItems: "center",
              gap: TOAST.markerGap,
              minHeight: TOAST.minHeight,
              paddingVertical: TOAST.padding.vertical,
              paddingHorizontal: TOAST.padding.horizontal,
              backgroundColor: COLORS.text,
              // 보드 `0 8px 24px rgba(0,0,0,.18)` — RN의 반경은 blur의 절반
              shadowColor: COLORS.text,
              shadowOffset: { width: 0, height: TOAST.shadow.offsetY },
              shadowOpacity: TOAST.shadow.opacity,
              shadowRadius: TOAST.shadow.blur / 2,
              elevation: 6,
            },
            motion,
          ]}
          testID="failure-toast"
        >
          <View
            style={{
              flex: 0,
              width: TOAST.marker,
              height: TOAST.marker,
              backgroundColor: COLORS.accent,
            }}
            testID="failure-toast-marker"
          />
          <AppText
            style={{
              flex: 1,
              color: COLORS.bg,
              fontSize: TOAST.fontSize,
              fontWeight: TOAST.fontWeight,
              lineHeight: TOAST.lineHeight,
            }}
          >
            {text}
          </AppText>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
