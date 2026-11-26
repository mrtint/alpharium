/**
 * 135 — 쓴 날 사진 자리의 지도 면 (specs/135-diary-route-views/contracts/written-route.md WR3·WR4·WR7·WR8).
 *
 * ─────────────────────────────────────────────────
 * 캐러셀 사진과 **같은 폭·같은 높이**(`WRITTEN_DAY.photoHeight`)를 차지한다 — 사진 면과 바꿔도 아래 글이 움직이지 않는다.
 * 안의 지도 상자는 투영 비율(`ROUTE_ASPECT`)을 지켜 가운데에 맞추고(contain) 남는 띠는 `surface`다(research R3 — 투영을 다시
 * 계산하지 않는다).
 *
 * **점을 누르면 그 자리 사진이 폴라로이드 카드로 지도 위에 꽂힌다**(소유자 결정 2026-11-26). 카드 내용은 `routeCardFor`가
 * 저장된 `placeIndex`로만 정한다 — 옛 일기는 「남아 있지 않아요」(원칙 V). 카드를 누르면 기존 확대 화면이 그 사진만으로 열린다.
 * 같은 점·지도 빈 곳을 누르면 닫히고, 다른 점이면 옮겨간다. 카드는 저장하지 않는다 — 부르는 쪽은 지도 면을 보일 때만 이 부품을
 * 마운트하므로 면을 바꾸면 카드가 닫힌다(WR7).
 *
 * 이 부품은 위경도를 모른다 — `DayRoute`의 0~1 위치와 지도 경로 문자열만 받는다(WR10).
 * ─────────────────────────────────────────────────
 */

import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Image,
  Pressable,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { ROUTE_ASPECT, type DayRoute } from "../app/day-route";
import { routeCardFor, type RoutePhoto } from "../app/route-photos";
import { cardPlacement } from "./card-placement";
import { AppText } from "./components/Text";
import { FaceButton } from "./FaceButton";
import { ROUTE_TEXT } from "./home-text";
import type { CarouselPhoto } from "./PhotoCarousel";
import { PhotoViewer } from "./PhotoViewer";
import { markersFor, markerWidth, RouteCanvas, type Marker } from "./RouteCanvas";
import { COLORS, WRITTEN_DAY } from "./theme/tokens";

/** 카드 치수 — 사람이 정한 값(research R6). 사진 칸은 4:3 */
export const ROUTE_CARD = { width: 132, height: 116, pad: 5, photoHeight: 78, stack: 3 } as const;

export type RouteFaceProps = {
  route: DayRoute;
  photos: readonly (CarouselPhoto & RoutePhoto)[] | undefined;
  /** 면의 폭(캐러셀 폭과 같다) */
  width: number;
  /** 있으면 우측 하단에 사진 아이콘 — 사진이 0장이면 부르는 쪽이 주지 않는다(WR4) */
  onShowPhotos?: () => void;
  reduceMotion?: boolean;
};

export function RouteFace({ route, photos, width, onShowPhotos, reduceMotion }: RouteFaceProps) {
  const height = WRITTEN_DAY.photoHeight;
  // 투영 비율을 지키며 면 안에 맞춘 지도 상자
  const boxW = Math.min(width, height / ROUTE_ASPECT);
  const boxH = boxW * ROUTE_ASPECT;
  const offsetX = (width - boxW) / 2;
  const offsetY = (height - boxH) / 2;

  const [picked, setPicked] = useState<Marker | null>(null);
  const [viewer, setViewer] = useState<readonly CarouselPhoto[] | null>(null);

  const markers = markersFor(route.items, boxW, boxH);
  // 같은 점(첫 번호)이 다시 눌리면 닫는다
  const onPressMarker = (m: Marker) =>
    setPicked((cur) => (cur !== null && cur.numbers[0] === m.numbers[0] ? null : m));
  const current =
    picked === null ? null : (markers.find((m) => m.numbers[0] === picked.numbers[0]) ?? null);

  return (
    <View style={[FACE, { width, height }]} testID="route-face">
      <Pressable
        accessible={false}
        onPress={() => setPicked(null)}
        style={FILL}
        testID="route-face-backdrop"
      />
      <View style={{ position: "absolute", left: offsetX, top: offsetY }}>
        <RouteCanvas
          height={boxH}
          items={route.items}
          map={route.map}
          onPressMarker={onPressMarker}
          selected={current?.numbers}
          width={boxW}
        />
        {current !== null && (
          <Card
            box={{ width: boxW, height: boxH }}
            marker={current}
            onOpen={setViewer}
            photos={photos}
            route={route}
          />
        )}
      </View>
      {onShowPhotos !== undefined && <FaceButton kind="photos" onPress={onShowPhotos} />}
      {viewer !== null && (
        <PhotoViewer
          onClose={() => setViewer(null)}
          photos={viewer}
          reduceMotion={reduceMotion}
          startIndex={0}
        />
      )}
    </View>
  );
}

function Card({
  marker,
  box,
  route,
  photos,
  onOpen,
}: {
  marker: Marker;
  box: { width: number; height: number };
  route: DayRoute;
  photos: readonly (CarouselPhoto & RoutePhoto)[] | undefined;
  onOpen: (photos: readonly CarouselPhoto[]) => void;
}) {
  const at = cardPlacement(
    { cx: marker.cx, cy: marker.cy, halfW: markerWidth(marker) / 2 },
    ROUTE_CARD,
    box,
  );
  const card = routeCardFor(photos, marker.numbers);
  const numbers = marker.numbers.join("·");
  const first = route.items.find((it) => it.n === marker.numbers[0]);
  const label =
    route.items.find((it) => marker.numbers.includes(it.n) && it.label !== null)?.label ?? null;
  const period = first === undefined ? "" : ROUTE_TEXT.period[first.period];
  const line =
    label === null
      ? ROUTE_TEXT.lineNoName(numbers, period)
      : ROUTE_TEXT.line(numbers, period, label);
  const place: ViewStyle = { left: at.left, top: at.top };
  // 카드가 열리거나 옮겨가면 낭독기에 알린다 — 점을 누른 사람이 카드가 생긴 줄 알도록(코드 리뷰)
  const announcement =
    card.kind === "photos"
      ? `${line}. ${ROUTE_TEXT.cardA11y(numbers, card.photos.length)}`
      : `${line}. ${card.kind === "empty" ? ROUTE_TEXT.cardEmpty : ROUTE_TEXT.cardUnlinked}`;
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [announcement]);

  if (card.kind !== "photos") {
    return (
      <View accessibilityLabel={announcement} accessible style={[CARD, place]} testID="route-card">
        <View style={[CARD_PHOTO, EMPTY]}>
          <AppText style={EMPTY_TEXT} testID="route-card-empty">
            {card.kind === "empty" ? ROUTE_TEXT.cardEmpty : ROUTE_TEXT.cardUnlinked}
          </AppText>
        </View>
        <AppText numberOfLines={1} style={CARD_LINE}>
          {line}
        </AppText>
      </View>
    );
  }

  const shown = card.photos.slice(0, ROUTE_CARD.stack);
  const more = card.photos.length - shown.length;
  return (
    <Pressable
      accessibilityLabel={ROUTE_TEXT.cardA11y(numbers, card.photos.length)}
      accessibilityRole="button"
      onPress={() => onOpen(card.photos)}
      style={[CARD, place]}
      testID="route-card"
    >
      <View style={CARD_PHOTO}>
        {/* 겹친 사진 — 뒤의 장일수록 오른쪽 위로 3씩 비켜 보인다. 첫 장이 맨 앞이도록 거꾸로 그린다 */}
        {shown
          .map((p, i) => (
            <Image
              key={p.photoId}
              resizeMode="cover"
              source={{ uri: `file://${p.resizedPath}` }}
              style={[STACKED, { left: i * 3, top: (shown.length - 1 - i) * 3 }]}
              testID={`route-card-photo-${i}`}
            />
          ))
          .reverse()}
        {more > 0 && (
          <View style={MORE} testID="route-card-more">
            <AppText style={MORE_TEXT}>{ROUTE_TEXT.cardMore(more)}</AppText>
          </View>
        )}
      </View>
      <AppText numberOfLines={1} style={CARD_LINE}>
        {line}
      </AppText>
    </Pressable>
  );
}

/* ═══════════════════════════════ 치수 (보드 밖 초안 — 사람이 정한 값) ═══════════════════════════════ */

const FACE: ViewStyle = { backgroundColor: COLORS.surface, overflow: "hidden" };

const FILL: ViewStyle = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 };

/** 폴라로이드 — 흰 판(지면 `bg`), 반경·그림자 없음. 테두리 한 줄로 지도와 가른다 */
const CARD: ViewStyle = {
  position: "absolute",
  width: ROUTE_CARD.width,
  height: ROUTE_CARD.height,
  padding: ROUTE_CARD.pad,
  backgroundColor: COLORS.bg,
  borderWidth: 1,
  borderColor: COLORS.text,
  gap: 4,
};

const CARD_PHOTO: ViewStyle = {
  height: ROUTE_CARD.photoHeight,
  alignSelf: "stretch",
  overflow: "hidden",
};

const STACKED = {
  position: "absolute",
  width: ROUTE_CARD.width - ROUTE_CARD.pad * 2 - 8 - 2,
  height: ROUTE_CARD.photoHeight - 8,
  backgroundColor: COLORS.surface,
  borderWidth: 1,
  borderColor: COLORS.bg,
} as const;

const EMPTY: ViewStyle = {
  backgroundColor: COLORS.surface,
  alignItems: "center",
  justifyContent: "center",
  padding: 6,
};

const EMPTY_TEXT: TextStyle = {
  fontSize: 11,
  lineHeight: 15,
  color: COLORS.textMuted,
  textAlign: "center",
};

const MORE: ViewStyle = {
  position: "absolute",
  right: 0,
  bottom: 0,
  backgroundColor: COLORS.accent,
  paddingHorizontal: 5,
  paddingVertical: 2,
};

const MORE_TEXT: TextStyle = { fontSize: 11, fontWeight: "700", color: COLORS.accentForeground };

const CARD_LINE: TextStyle = {
  fontSize: 11,
  lineHeight: 15,
  fontWeight: "600",
  color: COLORS.text,
};
