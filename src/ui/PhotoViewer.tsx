/**
 * 쓴 날 사진 확대 화면 (067).
 *
 * 계약: specs/067-photo-zoom-viewer/contracts/photo-viewer.md ZP1~ZP10, data-model.md §3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **지면 사진을 누르면 열린다**(`PhotoCarousel`이 연다·닫는다). 그 일기가 본 사진 사본을 화면 가득, 원래 비율로
 * (잘리지 않게) 보인다. 원본 색 그대로다(051 결정).
 *
 * **코어 `Modal`이다** — 상태 표시줄·내비게이션 바까지 덮고 홈의 겹(055)보다 위에 있어야 한다. 안드로이드 `Modal`은 별도
 * 창이라 앱 루트의 `GestureHandlerRootView` 밖이므로 안을 다시 감싼다(research R4). 뒤로 가기는 그 창이 받아
 * `onRequestClose`로 온다 — 홈의 `BackHandler`에 닿지 않으므로 홈은 아무것도 등록하지 않는다(R5, 055 「등록 순서에 기대지
 * 않는다」).
 *
 * **넘김은 지면과 같은 순환 캐러셀**(2장 이상, R1). 확대된 동안은 넘기지 않는다(`scrollEnabled={!zoomed}`) — 사진 이동과
 * 겨루지 않게. 캐러셀의 팬은 가로가 먼저일 때만 서고 세로가 먼저면 놓는다 — 아래로 끌어 닫기와 겨루지 않게(051 지면
 * 캐러셀과 같은 설정).
 *
 * **닫을 때 마지막으로 본 장을 알린다**(`onClose(index)`) — 지면이 그 장으로 옮겨진다(FR-013). 순번은 ref에도 둔다 —
 * 닫기 콜백을 `renderItem`에 넘기는데, 순번이 바뀔 때마다 `renderItem`이 새 참조가 되면 캐러셀이 내부 상태를 되돌린다(046).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useContext, useRef, useState } from "react";
import { Modal, Pressable, useWindowDimensions, View, type ViewStyle } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Carousel, type CarouselPanGesture } from "react-native-reanimated-carousel";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { AppText } from "./components/Text";
import { PHOTO_VIEWER_TEXT } from "./home-text";
import { backdropOpacity, indexAtProgress } from "../app/photo-viewer";
import type { CarouselPhoto } from "./PhotoCarousel";
import { COLORS, WRITTEN_DAY } from "./theme/tokens";
import { ZoomablePhoto } from "./ZoomablePhoto";

export type PhotoViewerProps = {
  /** 그 일기가 본 사진 — 지면과 같은 배열(같은 참조) */
  photos: readonly CarouselPhoto[];
  /** 누른 장 */
  startIndex: number;
  /** 닫혔다 — 마지막으로 본 장 */
  onClose: (index: number) => void;
};

export function PhotoViewer({ photos, startIndex, onClose }: PhotoViewerProps) {
  const window = useWindowDimensions();
  const insets = useContext(SafeAreaInsetsContext);
  const count = photos.length;

  const [index, setIndex] = useState(startIndex);
  const indexRef = useRef(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const backdrop = useSharedValue(1);

  const close = useCallback(() => onClose(indexRef.current), [onClose]);

  // 아래로 끄는 동안 배경을 옅게 — 손을 떼고 제자리로 돌아가면 짧게 되돌린다(ZoomablePhoto의 SETTLE과 같은 길이)
  // `.set()`으로 고친다 — 훅에 넘긴 공유값에 `.value =`로 대입하면 React Compiler가 막는다(react-hooks/immutability).
  const onDragChange = useCallback(
    (down: number, settle: boolean) => {
      const opacity = backdropOpacity(down);
      backdrop.set(settle ? withTiming(opacity, { duration: 180 }) : opacity);
    },
    [backdrop],
  );

  const onProgressChange = useCallback(
    (progress: number) => {
      const next = indexAtProgress(progress, count);
      indexRef.current = next;
      setIndex(next);
    },
    [count],
  );

  const { width, height } = window;
  const renderItem = useCallback(
    ({ item }: { item: CarouselPhoto }) => (
      <ZoomablePhoto
        height={height}
        onDismiss={close}
        onDragChange={onDragChange}
        onZoomChange={setZoomed}
        photo={item}
        width={width}
      />
    ),
    [close, height, onDragChange, width],
  );

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const top = (insets?.top ?? 0) + CHROME_INSET;
  const position = `${index + 1} / ${count}`;

  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={close}
      statusBarTranslucent
      testID="photo-viewer"
      transparent
      visible
    >
      <GestureHandlerRootView style={ROOT}>
        <Animated.View pointerEvents="none" style={[BACKDROP, backdropStyle]} />
        {count > 1 ? (
          <Carousel<CarouselPhoto>
            // 라이브러리 타입이 가변 배열을 요구한다 — 복사하지 않는다(046·051).
            data={photos as CarouselPhoto[]}
            defaultIndex={startIndex}
            loop
            onConfigurePanGesture={configureViewerPan}
            onProgressChange={onProgressChange}
            renderItem={renderItem}
            scrollEnabled={!zoomed}
            style={{ width, height }}
            testID="photo-viewer-carousel"
          />
        ) : (
          photos[0] !== undefined && renderItem({ item: photos[0] })
        )}

        {count > 1 && (
          // 025 실측 — 여러 텍스트 조각이면 접근성 트리에 안 뜬다. 템플릿 리터럴 하나 + 라벨
          <View
            accessibilityLabel={position}
            pointerEvents="none"
            style={[BADGE, { top, left: CHROME_INSET }]}
            testID="photo-viewer-badge"
          >
            <AppText style={BADGE_TEXT}>{position}</AppText>
          </View>
        )}

        <Pressable
          accessibilityLabel={PHOTO_VIEWER_TEXT.close}
          accessibilityRole="button"
          hitSlop={8}
          onPress={close}
          style={[CLOSE, { top: top - (CLOSE_SIZE - BADGE_HEIGHT) / 2, right: CHROME_INSET }]}
          testID="photo-viewer-close"
        >
          <AppText allowFontScaling={false} style={CLOSE_TEXT}>
            ✕
          </AppText>
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}

/** 가로가 10을 넘어야 넘기고, 세로가 먼저 10을 넘으면 놓는다 — 아래로 끌어 닫기에 양보한다(051 지면과 같다) */
function configureViewerPan(gesture: CarouselPanGesture) {
  gesture.activeOffsetX([-10, 10]).failOffsetY([-10, 10]);
}

/* ═══════════════════════════════ 치수 ═══════════════════════════════ */

const { badge } = WRITTEN_DAY;

/** 배지·닫기 버튼의 화면 가장자리 여백 — 사람이 정한 값(지면 여백 20보다 조금 안쪽) */
const CHROME_INSET = 16;
/** 닫기 버튼 — 누르는 자리 44(접근성 최소) */
const CLOSE_SIZE = 44;
/** 배지 높이 근사 — 닫기 버튼을 배지와 같은 줄 가운데에 둔다 */
const BADGE_HEIGHT = badge.fontSize + badge.paddingV * 2 + 6;

const ROOT: ViewStyle = { flex: 1, justifyContent: "center" };

// 확대 화면의 어두운 면 — 새 색 토큰을 만들지 않고 가장 어두운 글자색을 쓴다(spec Assumptions).
const BACKDROP: ViewStyle = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  backgroundColor: COLORS.text,
};

const BADGE: ViewStyle = {
  position: "absolute",
  backgroundColor: COLORS.accent,
  paddingVertical: badge.paddingV,
  paddingHorizontal: badge.paddingH,
};

const BADGE_TEXT = {
  color: COLORS.accentForeground,
  fontSize: badge.fontSize,
  fontWeight: "700",
  letterSpacing: badge.letterSpacing,
} as const;

const CLOSE: ViewStyle = {
  position: "absolute",
  width: CLOSE_SIZE,
  height: CLOSE_SIZE,
  alignItems: "center",
  justifyContent: "center",
};

const CLOSE_TEXT = { color: COLORS.bg, fontSize: 22, lineHeight: 26, fontWeight: "700" } as const;
