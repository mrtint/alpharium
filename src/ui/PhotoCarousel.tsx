/**
 * 쓴 날의 사진 캐러셀 (051, 보드 `2c`·`2k`).
 *
 * 계약: specs/051-home-written-day/contracts/written-day.md CAR1~CAR11, data-model.md §6
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **025 슬라이더·풀스크린 갤러리를 대체한다.** 그 일기가 실제로 본 사진(`DiaryEntry.photos`, 023의
 * 시각순)을 한 번에 한 장, 흑백으로 잘라 채워 보인다.
 *
 * **순환한다 — 025 FR-011(「순환하지 않는다」)을 뒤집었다**(051 Clarifications, 보드 `loop`). 순환은
 * `ScrollView pagingEnabled`로 만들 수 없어 046에서 이미 설치된 `react-native-reanimated-carousel`
 * (순수 JS — research R1)을 **2장 이상일 때만** 쓴다. 1장은 사진 하나(배지·인디케이터·제스처 없음),
 * 0장은 아무것도 그리지 않는다(빈 칸·안내 문구 없음, 보드 `2k`).
 *
 * **사진을 누르지 않는다** — 보드에 누름이 없어 갤러리를 없앴다(Clarifications).
 *
 * **흑백은 새 아키텍처 `filter`다**(research R2 — 안드로이드 grayscale에 제약 없음). 실제 모습은
 * 실기기(quickstart D3)에서 본다. 배지·인디케이터는 흑백 면 밖에 둔다(accent가 회색이 되지 않게).
 *
 * **세로 지면 안의 가로 캐러셀**: `activeOffsetX([-10, 10])` — 가로 움직임이 10을 넘어야 캐러셀이
 * 잡는다(문서 FAQ). 이 콜백은 JS 스레드에서 한 번 불리므로 워크릿이 아니다(research R1 T017).
 *
 * 순번 배지는 성능 지표가 아니다(원칙 IV와 무관 — 025 FR-018과 같다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { memo, useCallback, useMemo, useState } from "react";
import { Image, View, type ViewStyle } from "react-native";
import { Carousel, type CarouselPanGesture } from "react-native-reanimated-carousel";

import { AppText } from "./components/Text";
import { WRITTEN_DAY_TEXT } from "./home-text";
import { COLORS, WRITTEN_DAY } from "./theme/tokens";

/** 이 일기가 실제로 본 사진 하나 (`DiaryEntry.photos[]`의 항목) */
export type CarouselPhoto = { photoId: string; takenAt: Date; resizedPath: string };

export type PhotoCarouselProps = {
  photos?: readonly CarouselPhoto[];
  /** 슬라이드 폭 = 스트립 폭. 부르는 쪽이 `onLayout`으로 잰다(창 폭을 가정하지 않는다) */
  width: number;
};

export function PhotoCarousel({ photos, width }: PhotoCarouselProps) {
  const [index, setIndex] = useState(0);

  if (photos === undefined || photos.length === 0) return null;

  if (photos.length === 1) {
    return (
      <View testID="photo-carousel-single">
        <PhotoFace photo={photos[0]} width={width} />
      </View>
    );
  }

  const count = photos.length;
  const position = `${index + 1} / ${count}`;

  return (
    <View>
      <View>
        <CarouselStrip onSnapToItem={setIndex} photos={photos} width={width} />
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
    </View>
  );
}

/**
 * 캐러셀 본체 — **props가 바뀌지 않으면 다시 그리지 않는다**(046 실측과 같은 까닭).
 *
 * `data={[...photos]}`나 인라인 `renderItem`처럼 렌더마다 새 참조를 넘기면 라이브러리가 매번 「새
 * 데이터」로 보고 내부 상태를 되돌린다(046 `DownloadProgressScreen` — 자동 전환이 영영 안 일어났다).
 * 여기서는 `onSnapToItem`이 부모의 `setIndex`라 넘길 때마다 부모가 다시 그려지므로 특히 위험하다.
 * `photos`는 저장된 일기의 배열(같은 참조), `onSnapToItem`은 `useState` 세터(안정)다.
 */
const CarouselStrip = memo(function CarouselStrip({
  photos,
  width,
  onSnapToItem,
}: {
  photos: readonly CarouselPhoto[];
  width: number;
  onSnapToItem: (index: number) => void;
}) {
  const style = useMemo(() => ({ width, height: WRITTEN_DAY.photoHeight }), [width]);
  const renderItem = useCallback(
    ({ item }: { item: CarouselPhoto }) => <PhotoFace photo={item} width={width} />,
    [width],
  );

  return (
    <Carousel<CarouselPhoto>
      // 라이브러리 타입이 가변 배열을 요구한다 — 복사하지 않는다(위 주석).
      data={photos as CarouselPhoto[]}
      loop
      onConfigurePanGesture={configurePan}
      onSnapToItem={onSnapToItem}
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
 * 사진 한 장 — 흑백으로 잘라 채운다. 사본을 못 불러오면 그 자리만 「이 사진은 이제 없어요」
 * (017 FR-002 — 개별 실패가 나머지를 무너뜨리지 않는다. 슬라이드를 빼지 않는다).
 */
function PhotoFace({ photo, width }: { photo: CarouselPhoto; width: number }) {
  const [failed, setFailed] = useState(false);
  const face: ViewStyle = {
    width,
    height: WRITTEN_DAY.photoHeight,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
    filter: [{ grayscale: 1 }],
  };

  return (
    <View style={face} testID={`photo-face-${photo.photoId}`}>
      {failed ? (
        <View style={MISSING} testID="diary-photo-missing">
          <AppText style={MISSING_TEXT}>{WRITTEN_DAY_TEXT.photoMissing}</AppText>
        </View>
      ) : (
        <Image
          onError={() => setFailed(true)}
          resizeMode="cover"
          source={{ uri: `file://${photo.resizedPath}` }}
          style={{ width, height: WRITTEN_DAY.photoHeight }}
          testID="diary-photo"
        />
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
