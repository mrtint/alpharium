/**
 * 확대 화면의 사진 한 장 — 핀치·두 번 탭·이동·아래로 끌어 닫기 (067).
 *
 * 계약: specs/067-photo-zoom-viewer/contracts/photo-viewer.md ZP6·ZP7·ZP8·ZP9·ZP10, data-model.md §4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **판정하지 않는다.** 배율 한계·끌어 닫기 문턱·이동 한계는 `src/app/photo-viewer.ts`가 정하고, 여기는 제스처 값을
 * 넘겨 결과를 공유값에 둔다.
 *
 * **팬 하나가 두 얼굴이다.** 배율 1이면 세로가 먼저 10을 넘을 때만 서고(`activeOffsetY`) 가로가 먼저면 실패해
 * (`failOffsetX`) 확대 화면 캐러셀의 넘김에 양보한다 — 아래로 끌면 닫기. 확대되면 어느 방향이든 서서 사진을 움직이고,
 * 넘김은 부모가 끈다(`onZoomChange` → `scrollEnabled={false}`). 그래서 확대된 채로 다른 장으로 넘어갈 수 없고, 손을 떼면
 * 배율이 1이면 정확히 1·위치 0으로 놓이므로(`settleScale`) 다른 장은 늘 배율 1에서 시작한다(FR-012).
 *
 * **제스처는 JS 스레드에서 돈다**(`runOnJS(true)`, 049 `DayPicker`와 같다) — jest에서 `fireGestureHandler`로 같은 콜백을
 * 쏠 수 있다. 실기기에서 핀치가 끊겨 보이면 그 제스처만 worklet으로 옮긴다(research R3 — 짐작).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { Image, View, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import {
  clampOffset,
  doubleTapScale,
  fittedSize,
  isZoomed,
  panLimit,
  pinchScale,
  settleScale,
  shouldDismiss,
  type Size,
} from "../app/photo-viewer";
import { AppText } from "./components/Text";
import { WRITTEN_DAY_TEXT } from "./home-text";
import type { CarouselPhoto } from "./PhotoCarousel";
import { COLORS } from "./theme/tokens";

/** 손을 뗀 뒤 제자리·확대로 옮겨 가는 시간(ms) — 사람이 정한 값 */
const SETTLE_MS = 180;

export type ZoomablePhotoProps = {
  photo: CarouselPhoto;
  /** 화면 상자 (확대 화면 전체) */
  width: number;
  height: number;
  /**
   * 배율 1에서 아래로 끈 거리가 바뀌었다 — 부모가 배경을 그만큼 옅게 그린다(`backdropOpacity`). 손을 떼고 제자리로
   * 돌아가면 0, 닫히면 부르지 않는다. 배경을 공유값 prop으로 받아 여기서 고치지 않는다(React Compiler — props는 불변).
   */
  onDragChange: (down: number, settle: boolean) => void;
  /** 확대됐는가가 바뀌었다 — 부모가 넘김을 끄고 켠다 */
  onZoomChange: (zoomed: boolean) => void;
  /** 배율 1에서 아래로 끌어 닫기 문턱을 넘었다 */
  onDismiss: () => void;
};

export function ZoomablePhoto({
  photo,
  width,
  height,
  onDragChange,
  onZoomChange,
  onDismiss,
}: ZoomablePhotoProps) {
  const box: Size = { width, height };
  const [failed, setFailed] = useState(false);
  const [fitted, setFitted] = useState<Size | undefined>(undefined);
  const [zoomed, setZoomed] = useState(false);

  const scale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const dragY = useSharedValue(0);
  // 제스처가 시작할 때의 값 — 렌더 중에 읽지 않으므로 공유값에 둔다(ref는 React Compiler가 렌더 중 접근으로 본다)
  const savedScale = useSharedValue(1);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const markZoom = (next: boolean) => {
    if (next === zoomed) return;
    setZoomed(next);
    onZoomChange(next);
  };

  /** 배율을 정하고, 그 배율의 이동 한계 안으로 위치를 다시 자른다 */
  const settleTo = (target: number) => {
    const limit = panLimit(fitted, box, target);
    scale.value = withTiming(target, { duration: SETTLE_MS });
    x.value = withTiming(clampOffset(x.value, limit.x), { duration: SETTLE_MS });
    y.value = withTiming(clampOffset(y.value, limit.y), { duration: SETTLE_MS });
    markZoom(isZoomed(target));
  };

  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .enabled(!failed)
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = pinchScale(savedScale.value * event.scale);
    })
    .onEnd(() => {
      settleTo(settleScale(scale.value));
    });

  const doubleTap = Gesture.Tap()
    .runOnJS(true)
    .enabled(!failed)
    .numberOfTaps(2)
    .onEnd((_event, success) => {
      if (success) settleTo(doubleTapScale(scale.value));
    });

  const pan = Gesture.Pan().runOnJS(true).withTestId(`photo-viewer-pan-${photo.photoId}`);
  if (zoomed) {
    // 확대됨 — 어느 방향이든 사진을 움직인다
    pan.minDistance(1);
  } else {
    // 배율 1 — 세로가 먼저일 때만(아래로 끌어 닫기). 가로가 먼저면 캐러셀 넘김에 양보한다
    pan.activeOffsetY([-10, 10]).failOffsetX([-10, 10]);
  }
  pan
    .onStart(() => {
      savedX.value = x.value;
      savedY.value = y.value;
    })
    .onUpdate((event) => {
      if (zoomed) {
        const limit = panLimit(fitted, box, scale.value);
        x.value = clampOffset(savedX.value + event.translationX, limit.x);
        y.value = clampOffset(savedY.value + event.translationY, limit.y);
        return;
      }
      const down = Math.max(0, event.translationY);
      dragY.value = down;
      onDragChange(down, false);
    })
    .onEnd((event) => {
      if (zoomed) return;
      if (shouldDismiss(event.translationY, event.velocityY)) {
        onDismiss();
        return;
      }
      dragY.value = withTiming(0, { duration: SETTLE_MS });
      onDragChange(0, true);
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const moved = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value + dragY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[{ width, height }, moved]}
        testID={`photo-viewer-face-${photo.photoId}`}
      >
        {failed ? (
          <View style={MISSING} testID="photo-viewer-missing">
            <AppText style={MISSING_TEXT}>{WRITTEN_DAY_TEXT.photoMissing}</AppText>
          </View>
        ) : (
          <Image
            onError={() => setFailed(true)}
            onLoad={(event) => setFitted(fittedSize(event.nativeEvent.source, box))}
            resizeMode="contain"
            source={{ uri: `file://${photo.resizedPath}` }}
            style={{ width, height }}
            testID="photo-viewer-image"
          />
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const MISSING: ViewStyle = { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 };

const MISSING_TEXT = { fontSize: 15, color: COLORS.bg, textAlign: "center" } as const;
