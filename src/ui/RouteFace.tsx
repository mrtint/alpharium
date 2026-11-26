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

import { useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  Image,
  Pressable,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";

import { ROUTE_ASPECT, type DayRoute } from "../app/day-route";
import { routeCardFor, type RoutePhoto } from "../app/route-photos";
import { cardPlacement } from "./card-placement";
import { AppText } from "./components/Text";
import { FaceButton } from "./FaceButton";
import { ROUTE_TEXT } from "./home-text";
import type { CarouselPhoto } from "./PhotoCarousel";
import { cameraFor, INTRO, introTimeline, type IntroFrame } from "./route-intro";
import { PhotoViewer } from "./PhotoViewer";
import { markersFor, markerWidth, ROUTE_DIAGRAM, RouteCanvas, type Marker } from "./RouteCanvas";
import { COLORS, MAP_COLORS, WRITTEN_DAY } from "./theme/tokens";

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
  /**
   * 135 — 첫 진입 애니메이션을 보일까(소유자 결정 2026-11-26). 부르는 쪽이 「그 날 아직 안 보였다」일 때만 준다. 마운트 때의 값만
   * 본다 — 시작하면 `onIntroStart`가 불려 부르는 쪽이 그 날을 「보였다」로 적고, 이 부품은 끝까지(또는 누를 때까지) 돌린다.
   * 동작 줄이기가 켜져 있으면 보이지 않는다.
   */
  intro?: boolean;
  onIntroStart?: () => void;
  /** 136 — 창(카드)이 열리고 닫힐 때 알린다. 부르는 쪽이 창 밖(글 등)을 덮는 판을 둔다 */
  onCardOpenChange?: (open: boolean) => void;
  /** 136 — 바뀌면 창을 닫는다(부르는 쪽의 덮는 판을 눌렀다) */
  dismissKey?: number;
};

export function RouteFace({
  route,
  photos,
  width,
  onShowPhotos,
  reduceMotion,
  intro,
  onIntroStart,
  onCardOpenChange,
  dismissKey = 0,
}: RouteFaceProps) {
  const height = WRITTEN_DAY.photoHeight;
  // 투영 비율을 지키며 면 안에 맞춘 지도 상자
  const boxW = Math.min(width, height / ROUTE_ASPECT);
  const boxH = boxW * ROUTE_ASPECT;
  const offsetX = (width - boxW) / 2;
  const offsetY = (height - boxH) / 2;

  const [picked, setPickedState] = useState<Marker | null>(null);
  // 창이 열리고 닫히는 곳은 모두 이것을 거친다 — 부르는 쪽의 덮는 판이 창 상태를 따라간다(136)
  const setPicked = (next: Marker | null) => {
    setPickedState(next);
    onCardOpenChange?.(next !== null);
  };
  // 부르는 쪽이 창 밖을 눌러 닫으라고 했다 — 렌더 중에 곧바로 닫는다(부르는 쪽은 이미 닫힘으로 알고 있다)
  const [seenDismiss, setSeenDismiss] = useState(dismissKey);
  if (seenDismiss !== dismissKey) {
    setSeenDismiss(dismissKey);
    setPickedState(null);
  }
  const [viewer, setViewer] = useState<readonly CarouselPhoto[] | null>(null);

  // 135 — 첫 진입 애니메이션. 장소마다 그 자리 사진 수(카드와 같은 규칙 — 옛 일기·사진 없는 자리는 0)로 시간표를 만든다
  const [introRunning, setIntroOn] = useState(() => intro === true && reduceMotion !== true);
  // 동작 줄이기 값이 마운트 뒤에 도착해도 곧바로 멈춘다(코드 리뷰 — 사진 0장인 날은 면이 바로 마운트된다). 꺼지면 아래 효과의 정리가 타이머를 모두 지운다
  const introOn = introRunning && reduceMotion !== true;
  const [frame, setFrame] = useState<IntroFrame>({ at: 0, phase: "stay", step: 1, shown: 0 });
  const [fading, setFading] = useState(false);
  const [returning, setReturning] = useState(false);
  const placePhotos = useMemo(
    () =>
      route.items.map((it) => {
        const card = routeCardFor(photos, [it.n]);
        return card.kind === "photos" ? card.photos.slice(0, INTRO.stack) : [];
      }),
    [route.items, photos],
  );
  const counts = placePhotos.map((p) => p.length).join(",");
  const timeline = useMemo(
    () => introTimeline(counts === "" ? [] : counts.split(",").map(Number)),
    [counts],
  );
  useEffect(() => {
    if (!introOn) return;
    onIntroStart?.();
    const { frames, fadeAt, returnAt, doneAt } = timeline;
    const timers = [
      ...frames.slice(1).map((f) => setTimeout(() => setFrame(f), f.at)),
      setTimeout(() => setFading(true), fadeAt),
      setTimeout(() => setReturning(true), returnAt),
      setTimeout(() => setIntroOn(false), doneAt),
    ];
    return () => timers.forEach(clearTimeout);
    // 마운트(시작) 때 한 번 — 시간표는 그때의 사진 수로 정한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introOn]);
  // 시간표의 단계(1부터)는 목록 순번이다 — 자리 번호(`n`)로 옮겨 그린다(코드 리뷰 — 번호가 순번과 다를 수 있다)
  const visibleUpTo = introOn ? route.items[frame.step - 1]?.n : undefined;

  const markers = markersFor(route.items, boxW, boxH, visibleUpTo);

  // 135 — 카메라: 애니메이션 동안 지도를 키워 지금 장소를 면 가운데에 두고, 빨간 점이 경로를 따라 다음 장소로 갈 때 함께 미끄러진다
  // (소유자 결정 2026-11-26). 지도 상자는 면 가운데에 있으므로 상자 중심을 기준으로 「t = −s·(p − 중심)」만큼 옮기면 p가 가운데에 온다.
  const allMarkers = useMemo(() => markersFor(route.items, boxW, boxH), [route.items, boxW, boxH]);
  const pointOf = (step: number) => {
    const n = route.items[step - 1]?.n;
    const m = allMarkers.find((mk) => n !== undefined && mk.numbers.includes(n));
    return m === undefined ? { x: boxW / 2, y: boxH / 2 } : { x: m.cx, y: m.cy };
  };
  /** 지금 장소 점의 반폭 — 합친 점(「1·4」)이면 그만큼 넓다(코드 리뷰) */
  const introHalfW = (step: number) => {
    const n = route.items[step - 1]?.n;
    const m = allMarkers.find((mk) => n !== undefined && mk.numbers.includes(n));
    return (m === undefined ? ROUTE_DIAGRAM.dot : markerWidth(m)) / 2;
  };
  const camS = useSharedValue(1);
  const camX = useSharedValue(0);
  const camY = useSharedValue(0);
  const travX = useSharedValue(0);
  const travY = useSharedValue(0);
  useEffect(() => {
    if (!introOn) {
      camS.value = 1;
      camX.value = 0;
      camY.value = 0;
      return;
    }
    const box = { width: boxW, height: boxH };
    const aim = (p: { x: number; y: number }, duration: number) => {
      const { x, y } = cameraFor(p, box, INTRO_ZOOM);
      camX.value = duration === 0 ? x : withTiming(x, { duration });
      camY.value = duration === 0 ? y : withTiming(y, { duration });
    };
    if (returning) {
      // 카드가 다 사라진 뒤에 지도를 원래 크기로 되돌린다
      camS.value = withTiming(1, { duration: INTRO.fadeMs });
      camX.value = withTiming(0, { duration: INTRO.fadeMs });
      camY.value = withTiming(0, { duration: INTRO.fadeMs });
      return;
    }
    if (fading) return;
    camS.value = INTRO_ZOOM;
    if (frame.phase === "move") {
      const to = pointOf(frame.step + 1);
      // 출발점은 머무는 장면에서 미리 놓아 두었다 — 마운트 첫 프레임에 엉뚱한 자리(0,0)에 번쩍이지 않게(코드 리뷰)
      travX.value = withTiming(to.x, { duration: timeline.moveMs });
      travY.value = withTiming(to.y, { duration: timeline.moveMs });
      aim(to, timeline.moveMs);
    } else {
      const here = pointOf(frame.step);
      travX.value = here.x;
      travY.value = here.y;
      aim(here, frame.at === 0 ? 0 : 120);
    }
    // 장면·상자 크기가 바뀔 때 다시 조준한다(`pointOf`는 상자 크기와 자리 목록에서 나온다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introOn, frame, fading, returning, boxW, boxH, timeline.moveMs]);
  const camera = useAnimatedStyle(() => ({
    transform: [{ translateX: camX.value }, { translateY: camY.value }, { scale: camS.value }],
  }));
  const traveler = useAnimatedStyle(() => ({
    left: travX.value - ROUTE_DIAGRAM.dot / 2,
    top: travY.value - ROUTE_DIAGRAM.dot / 2,
  }));
  // 같은 점(첫 번호)이 다시 눌리면 닫는다. 애니메이션 중에는 누름이 「건너뛰기」다
  const onPressMarker = (m: Marker) => {
    if (introOn) {
      setIntroOn(false);
      return;
    }
    setPicked(picked !== null && picked.numbers[0] === m.numbers[0] ? null : m);
  };
  const current =
    picked === null ? null : (markers.find((m) => m.numbers[0] === picked.numbers[0]) ?? null);

  return (
    <View
      // 애니메이션 동안 확대한 지도의 가장자리 밖은 지도 바탕색으로 이어 보이게 한다
      style={[
        FACE,
        { width, height },
        introOn && route.map !== undefined && { backgroundColor: MAP_COLORS.mapLand },
      ]}
      testID="route-face"
    >
      <Pressable
        accessible={false}
        onPress={() => (introOn ? setIntroOn(false) : setPicked(null))}
        style={FILL}
        testID="route-face-backdrop"
      />
      <Animated.View
        // 136 — 지도 상자는 누름을 받지 않는다(점·카드만) — 빈 곳 누름이 아래 판(`route-face-backdrop`)에 닿는다
        pointerEvents="box-none"
        style={[{ position: "absolute", left: offsetX, top: offsetY }, camera]}
        testID={introOn ? "route-intro" : "route-camera"}
      >
        <RouteCanvas
          height={boxH}
          items={route.items}
          map={route.map}
          onPressMarker={onPressMarker}
          selected={introOn ? undefined : current?.numbers}
          visibleUpTo={visibleUpTo}
          width={boxW}
        />
        {introOn && frame.phase === "move" && (
          <Animated.View
            pointerEvents="none"
            style={[TRAVELER, traveler]}
            testID="route-intro-traveler"
          />
        )}
        {!introOn && current !== null && (
          <Card
            box={{ width: boxW, height: boxH }}
            marker={current}
            onOpen={setViewer}
            photos={photos}
            route={route}
          />
        )}
      </Animated.View>
      {introOn && frame.phase === "stay" && frame.shown > 0 && (
        // 지금 장소는 면 가운데에 있다 — 카드를 면 기준으로 그 옆에 둔다(확대한 지도 안에 넣으면 카드도 커진다)
        <IntroCard
          box={{ width, height }}
          fading={fading}
          marker={{
            numbers: [route.items[frame.step - 1]!.n],
            cx: width / 2,
            cy: height / 2,
            halfW: introHalfW(frame.step) * INTRO_ZOOM,
          }}
          photos={placePhotos[frame.step - 1] ?? []}
          route={route}
          shown={frame.shown}
        />
      )}
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

/**
 * 135 — 애니메이션 동안의 카드. 번호를 눌렀을 때와 같은 폴라로이드 모양이고, 사진이 1·2·3장으로 겹쳐 쌓인다(소유자 결정 2026-11-26).
 * 누를 수 없고 「+N」·낭독 알림이 없다(지나가는 장면이다).
 */
function IntroCard({
  marker,
  box,
  route,
  photos,
  shown,
  fading,
}: {
  marker: { numbers: number[]; cx: number; cy: number; halfW: number };
  box: { width: number; height: number };
  route: DayRoute;
  photos: readonly (CarouselPhoto & RoutePhoto)[];
  shown: number;
  fading: boolean;
}) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (fading) opacity.value = withTiming(0, { duration: INTRO.fadeMs });
  }, [fading, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const at = cardPlacement(marker, ROUTE_CARD, box);
  const list = photos.slice(0, shown);
  return (
    <Animated.View
      pointerEvents="none"
      style={[CARD, { left: at.left, top: at.top }, fade]}
      testID="route-intro-polaroid"
    >
      <View style={CARD_PHOTO} testID="route-intro-card">
        {list
          .map((p, i) => (
            <Animated.Image
              entering={SNAP}
              key={p.photoId}
              resizeMode="cover"
              source={{ uri: `file://${p.resizedPath}` }}
              style={[STACKED, { left: i * 3, top: (ROUTE_CARD.stack - 1 - i) * 3 }]}
              testID={`route-intro-photo-${i}`}
            />
          ))
          .reverse()}
      </View>
      <AppText numberOfLines={1} style={CARD_LINE}>
        {cardLine(route, marker.numbers)}
      </AppText>
    </Animated.View>
  );
}

/** 카드 아래 한 줄 — 「번호 · 때 · 이름」(이름 없으면 「번호 · 때」). 합친 점의 때는 첫 번호, 이름은 이름 있는 첫 자리의 것 */
function cardLine(route: DayRoute, numberList: readonly number[]): string {
  const numbers = numberList.join("·");
  const first = route.items.find((it) => it.n === numberList[0]);
  const label =
    route.items.find((it) => numberList.includes(it.n) && it.label !== null)?.label ?? null;
  const period = first === undefined ? "" : ROUTE_TEXT.period[first.period];
  return label === null
    ? ROUTE_TEXT.lineNoName(numbers, period)
    : ROUTE_TEXT.line(numbers, period, label);
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
  const line = cardLine(route, marker.numbers);
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

/** 135 — 애니메이션 동안 지도 확대 배율과 카드 사진이 놓이는 움직임 — 사람이 정한 값 */
const INTRO_ZOOM = 1.6;
const SNAP = ZoomIn.duration(220);

/** 135 — 다음 장소로 가는 빨간 점(시작점과 같은 강조색, 번호 없음) */
const TRAVELER: ViewStyle = {
  position: "absolute",
  width: ROUTE_DIAGRAM.dot,
  height: ROUTE_DIAGRAM.dot,
  backgroundColor: COLORS.accent,
};

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
