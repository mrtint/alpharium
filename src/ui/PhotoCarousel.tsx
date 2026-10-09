/**
 * 쓴 날의 사진 캐러셀 (051, 보드 `2c`·`2k`).
 *
 * 계약: specs/051-home-written-day/contracts/written-day.md CAR1~CAR11, data-model.md §6
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **025 슬라이더·풀스크린 갤러리를 대체한다.** 그 일기가 실제로 본 사진(`DiaryEntry.photos`, 023의
 * 시각순)을 한 번에 한 장, 원본 색 그대로 잘라 채워 보인다.
 *
 * **순환한다 — 025 FR-011(「순환하지 않는다」)을 뒤집었다**(051 Clarifications, 보드 `loop`). 순환은
 * `ScrollView pagingEnabled`로 만들 수 없어 046에서 이미 설치된 `react-native-reanimated-carousel`
 * (순수 JS — research R1)을 **2장 이상일 때만** 쓴다. 1장은 사진 하나(배지·인디케이터·제스처 없음),
 * 0장은 아무것도 그리지 않는다(빈 칸·안내 문구 없음, 보드 `2k`).
 *
 * **사진을 누르면 확대 화면이 열린다**(067 — 051의 「사진을 누르지 않는다」를 뒤집었다, specs/067-photo-zoom-viewer).
 * 확대 화면(`PhotoViewer`)은 이 컴포넌트가 열고 닫는다 — 지면·홈은 모른다. 닫히면 마지막으로 본 장으로 지면 캐러셀을
 * 애니메이션 없이 옮긴다(`scrollTo`). 사본을 못 불러온 칸은 누를 수 없다. 누름은 캐러셀의 팬(가로 10 이상)보다 먼저
 * 끝나는 손가락이라 넘김을 빼앗지 않는다.
 *
 * **사진은 흑백으로 바꾸지 않는다**(2026-10-01 저장소 소유자 결정 — 보드의 `grayscale` 필터를 따르지
 * 않는다). 그 일기가 본 사진 그대로가 기록이다.
 *
 * **배지·인디케이터는 넘기는 손을 따라간다.** `onSnapToItem`은 넘김 애니메이션이 **끝난 뒤에** 불려
 * (라이브러리의 `onMovementEnd`) 사진이 이미 넘어간 뒤에야 막대가 움직였다 — 「한 박자 늦다」(실기기).
 * 지금은 `onProgressChange`(프레임마다의 위치)를 가장 가까운 장으로 반올림한다 — 반을 넘게 끌면 바뀐다.
 *
 * **세로 지면 안의 가로 캐러셀**: `activeOffsetX([-10, 10])` — 가로 움직임이 10을 넘어야 캐러셀이
 * 잡는다(문서 FAQ). 이 콜백은 JS 스레드에서 한 번 불리므로 워크릿이 아니다(research R1 T017).
 *
 * 순번 배지는 성능 지표가 아니다(원칙 IV와 무관 — 025 FR-018과 같다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { memo, useCallback, useMemo, useRef, useState, type RefObject } from "react";
import { Image, Pressable, View, type ViewStyle } from "react-native";
import {
  Carousel,
  type CarouselPanGesture,
  type CarouselRef,
} from "react-native-reanimated-carousel";

import { indexAtProgress, isTap, type Point } from "../app/photo-viewer";
import { AppText } from "./components/Text";
import { PHOTO_VIEWER_TEXT, WRITTEN_DAY_TEXT } from "./home-text";
import { PhotoViewer } from "./PhotoViewer";
import { COLORS, WRITTEN_DAY } from "./theme/tokens";

/** 이 일기가 실제로 본 사진 하나 (`DiaryEntry.photos[]`의 항목) */
export type CarouselPhoto = { photoId: string; takenAt: Date; resizedPath: string };

export type PhotoCarouselProps = {
  photos?: readonly CarouselPhoto[];
  /** 슬라이드 폭 = 스트립 폭. 부르는 쪽이 `onLayout`으로 잰다(창 폭을 가정하지 않는다) */
  width: number;
};

/** 051 — 순번 규칙은 확대 화면과 함께 쓰려고 `src/app/photo-viewer.ts`로 옮겼다(067) */
export { indexAtProgress };

export function PhotoCarousel({ photos, width }: PhotoCarouselProps) {
  const [index, setIndex] = useState(0);
  // 열린 확대 화면이 시작한 장 — 닫혀 있으면 null (data-model §2)
  const [viewerStart, setViewerStart] = useState<number | null>(null);
  const carouselRef = useRef<CarouselRef>(null);
  const count = photos?.length ?? 0;
  const onProgressChange = useCallback(
    (progress: number) => setIndex(indexAtProgress(progress, count)),
    [count],
  );
  const openViewer = useCallback((at: number) => setViewerStart(at), []);
  const closeViewer = useCallback((last: number) => {
    setViewerStart(null);
    setIndex(last);
    // 1장이면 캐러셀이 없어 ref가 비어 있다
    carouselRef.current?.scrollTo({ index: last, animated: false });
  }, []);

  if (photos === undefined || photos.length === 0) return null;

  const viewer = viewerStart !== null && (
    <PhotoViewer onClose={closeViewer} photos={photos} startIndex={viewerStart} />
  );

  if (photos.length === 1) {
    return (
      <View testID="photo-carousel-single">
        <PhotoFace onOpen={openViewer} photo={photos[0]} slide={0} width={width} />
        {viewer}
      </View>
    );
  }

  const position = `${index + 1} / ${count}`;

  return (
    <View>
      <View>
        <CarouselStrip
          carouselRef={carouselRef}
          onOpen={openViewer}
          onProgressChange={onProgressChange}
          photos={photos}
          width={width}
        />
        {/* 025 실측 — 여러 텍스트 조각이면 접근성 트리에 안 뜬다. 템플릿 리터럴 하나 + 라벨 */}
        <View accessibilityLabel={position} style={BADGE} testID="photo-carousel-badge">
          <AppText style={BADGE_TEXT}>{position}</AppText>
        </View>
      </View>
      <View style={INDICATOR} testID="photo-carousel-indicator">
        {photos.map((p, i) => (
          <View
            key={p.photoId}
            style={i === index ? DOT_ACTIVE : DOT_IDLE}
            testID={`photo-carousel-dot-${i}`}
          />
        ))}
      </View>
      {viewer}
    </View>
  );
}

/**
 * 캐러셀 본체 — **props가 바뀌지 않으면 다시 그리지 않는다**(046 실측과 같은 까닭).
 *
 * `data={[...photos]}`나 인라인 `renderItem`처럼 렌더마다 새 참조를 넘기면 라이브러리가 매번 「새
 * 데이터」로 보고 내부 상태를 되돌린다(046 `DownloadProgressScreen` — 자동 전환이 영영 안 일어났다).
 * 여기서는 `onProgressChange`가 부모의 `setIndex`를 불러 넘길 때마다 부모가 다시 그려지므로 특히
 * 위험하다. `photos`는 저장된 일기의 배열(같은 참조), `onProgressChange`는 `count`가 같으면 같은 참조다.
 * 067 — `onOpen`·`carouselRef`도 부모에서 한 번 만든 같은 참조다.
 */
const CarouselStrip = memo(function CarouselStrip({
  photos,
  width,
  onProgressChange,
  onOpen,
  carouselRef,
}: {
  photos: readonly CarouselPhoto[];
  width: number;
  onProgressChange: (progress: number) => void;
  onOpen: (index: number) => void;
  carouselRef: RefObject<CarouselRef | null>;
}) {
  const style = useMemo(() => ({ width, height: WRITTEN_DAY.photoHeight }), [width]);
  const renderItem = useCallback(
    ({ item, index }: { item: CarouselPhoto; index: number }) => (
      <PhotoFace onOpen={onOpen} photo={item} slide={index} width={width} />
    ),
    [onOpen, width],
  );

  return (
    <Carousel<CarouselPhoto>
      // 라이브러리 타입이 가변 배열을 요구한다 — 복사하지 않는다(위 주석).
      data={photos as CarouselPhoto[]}
      loop
      onConfigurePanGesture={configurePan}
      onProgressChange={onProgressChange}
      ref={carouselRef}
      renderItem={renderItem}
      style={style}
      testID="photo-carousel"
    />
  );
});

/**
 * 가로 움직임이 10을 넘어야 캐러셀이 잡고, 세로가 먼저 10을 넘으면 놓는다 — 세로 지면 스크롤을
 * 빼앗지 않는다(FR-014a).
 *
 * ★ 051 실기기(SM-S901N): 문서 FAQ대로 `activeOffsetX`만 두었더니 **세로로 700px 끄는 동안 가로로
 * 20px 흔들린 손가락**을 캐러셀이 잡아 사진이 넘어갔고 지면은 스크롤되지 않았다. `failOffsetY`를
 * 더해 세로가 먼저 움직이면 캐러셀이 실패하게 했다.
 */
function configurePan(gesture: CarouselPanGesture) {
  gesture.activeOffsetX([-10, 10]).failOffsetY([-10, 10]);
}

/**
 * 사진 한 장 — 원본 색 그대로 잘라 채운다. 사본을 못 불러오면 그 자리만 「이 사진은 이제 없어요」
 * (017 FR-002 — 개별 실패가 나머지를 무너뜨리지 않는다. 슬라이드를 빼지 않는다). 누르면 확대 화면(067) —
 * 못 불러온 칸은 누를 수 없다(FR-002).
 */
function PhotoFace({
  photo,
  width,
  slide,
  onOpen,
}: {
  photo: CarouselPhoto;
  width: number;
  /** 이 사진의 순번 — 누르면 확대 화면이 이 장부터 열린다 */
  slide: number;
  onOpen: (index: number) => void;
}) {
  const [failed, setFailed] = useState(false);
  // 누른 자리 — 쓸고 뗀 손가락을 누름으로 치지 않으려고(`isTap`, 067 실기기). 렌더와 무관하므로 ref
  const pressedAt = useRef<Point | undefined>(undefined);
  const face: ViewStyle = {
    width,
    height: WRITTEN_DAY.photoHeight,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  };

  return (
    <View style={face} testID={`photo-face-${photo.photoId}`}>
      {failed ? (
        <View style={MISSING} testID="diary-photo-missing">
          <AppText style={MISSING_TEXT}>{WRITTEN_DAY_TEXT.photoMissing}</AppText>
        </View>
      ) : (
        <Pressable
          accessibilityLabel={PHOTO_VIEWER_TEXT.open}
          accessibilityRole="imagebutton"
          onPress={(event) => {
            const end = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
            if (isTap(pressedAt.current, end)) onOpen(slide);
          }}
          onPressIn={(event) => {
            pressedAt.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
          }}
          testID={`photo-open-${photo.photoId}`}
        >
          <Image
            onError={() => setFailed(true)}
            resizeMode="cover"
            source={{ uri: `file://${photo.resizedPath}` }}
            style={{ width, height: WRITTEN_DAY.photoHeight }}
            testID="diary-photo"
          />
        </Pressable>
      )}
    </View>
  );
}

/* ═══════════════════════════════ 치수 (보드 `2c`) ═══════════════════════════════ */

const { badge, indicator } = WRITTEN_DAY;

const BADGE: ViewStyle = {
  position: "absolute",
  top: badge.inset,
  right: badge.inset,
  backgroundColor: COLORS.accent,
  paddingVertical: badge.paddingV,
  paddingHorizontal: badge.paddingH,
};

// accent 위 글자는 `accentForeground`(보드의 `bg` 오프화이트, C5).
const BADGE_TEXT = {
  color: COLORS.accentForeground,
  fontSize: badge.fontSize,
  fontWeight: "700",
  letterSpacing: badge.letterSpacing,
} as const;

const INDICATOR: ViewStyle = {
  flexDirection: "row",
  gap: indicator.gap,
  marginTop: indicator.marginTop,
};

const DOT_ACTIVE: ViewStyle = {
  width: indicator.activeWidth,
  height: indicator.height,
  backgroundColor: COLORS.text,
};

const DOT_IDLE: ViewStyle = {
  width: indicator.idleWidth,
  height: indicator.height,
  backgroundColor: WRITTEN_DAY.indicatorIdle,
};

const MISSING: ViewStyle = { flex: 1, alignItems: "center", justifyContent: "center", padding: 8 };

const MISSING_TEXT = { fontSize: 13, color: COLORS.textMuted, textAlign: "center" } as const;
