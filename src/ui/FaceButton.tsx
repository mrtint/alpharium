/**
 * 135 — 쓴 날 사진 자리의 면 전환 단추(사진 ↔ 지도). 사진·지도 위 우측 하단에 같은 모양·같은 자리로 놓인다
 * (specs/135-diary-route-views/contracts/written-route.md WR2·WR3).
 *
 * **모양은 소유자가 골랐다(2026-11-26, A1)** — 검은 판에 기호 + 글자. 사진 면에서는 핀 기호 + 「지도」, 지도 면에서는 액자 기호 +
 * 「사진」. 배지(1 / 5)와 같은 평평한 판이고 반경·그림자가 없다. 기호는 아이콘 글꼴·라이브러리 없이 `View`로 그린다(핀의 둥근 머리만
 * 반경을 쓴다 — 면이 아니라 기호다). 누를 자리는 높이 30에 `hitSlop`으로 44 이상. 치수는 **사람이 정한 값이다**(원칙 V).
 */

import { Pressable, View, type TextStyle, type ViewStyle } from "react-native";

import { AppText } from "./components/Text";
import { ROUTE_TEXT } from "./home-text";
import { COLORS, WRITTEN_DAY } from "./theme/tokens";

/** 보이는 단추 높이 */
export const FACE_BUTTON_HEIGHT = 30;
const HIT = { top: 7, bottom: 7, left: 6, right: 6 } as const;

export function FaceButton({
  kind,
  onPress,
}: {
  /** 누르면 보일 면 — `map`이면 핀 + 「지도」(사진 위), `photos`면 액자 + 「사진」(지도 위) */
  kind: "map" | "photos";
  onPress: () => void;
}) {
  const isMap = kind === "map";
  return (
    <Pressable
      accessibilityLabel={isMap ? ROUTE_TEXT.showMapA11y : ROUTE_TEXT.showPhotosA11y}
      accessibilityRole="button"
      hitSlop={HIT}
      onPress={onPress}
      style={BUTTON}
      testID={isMap ? "show-route-map" : "show-photos"}
    >
      {isMap ? <PinIcon /> : <PhotoIcon />}
      <AppText allowFontScaling={false} style={LABEL}>
        {isMap ? ROUTE_TEXT.showMapLabel : ROUTE_TEXT.showPhotosLabel}
      </AppText>
    </Pressable>
  );
}

/** 핀 — 한 모서리만 뾰족한 둥근 판을 45° 돌린 물방울 + 가운데 구멍 */
function PinIcon() {
  return (
    <View style={ICON_BOX} testID="face-icon-pin">
      <View style={PIN_HEAD}>
        <View style={PIN_HOLE} />
      </View>
    </View>
  );
}

/** 액자 — 테두리 사각형 + 안의 해(점)와 산(기운 판) */
function PhotoIcon() {
  return (
    <View style={ICON_BOX} testID="face-icon-photo">
      <View style={FRAME}>
        <View style={SUN} />
        <View style={HILL} />
      </View>
    </View>
  );
}

const INK = COLORS.bg;

const BUTTON: ViewStyle = {
  position: "absolute",
  right: WRITTEN_DAY.badge.inset,
  bottom: WRITTEN_DAY.badge.inset,
  height: FACE_BUTTON_HEIGHT,
  paddingHorizontal: 10,
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  backgroundColor: COLORS.text,
};

const LABEL: TextStyle = { fontSize: 12, fontWeight: "700", lineHeight: 16, color: INK };

const ICON_BOX: ViewStyle = {
  width: 14,
  height: 14,
  alignItems: "center",
  justifyContent: "center",
};

const PIN_HEAD: ViewStyle = {
  width: 10,
  height: 10,
  marginTop: -2,
  borderTopLeftRadius: 5,
  borderTopRightRadius: 5,
  borderBottomLeftRadius: 5,
  borderBottomRightRadius: 0,
  backgroundColor: INK,
  transform: [{ rotate: "45deg" }],
  alignItems: "center",
  justifyContent: "center",
};

const PIN_HOLE: ViewStyle = {
  width: 3.5,
  height: 3.5,
  borderRadius: 1.75,
  backgroundColor: COLORS.text,
};

const FRAME: ViewStyle = {
  width: 14,
  height: 11,
  borderWidth: 1.6,
  borderColor: INK,
  overflow: "hidden",
};

const SUN: ViewStyle = {
  position: "absolute",
  left: 2,
  top: 1.5,
  width: 3,
  height: 3,
  backgroundColor: INK,
};

const HILL: ViewStyle = {
  position: "absolute",
  left: 2,
  bottom: -4,
  width: 9,
  height: 9,
  backgroundColor: INK,
  transform: [{ rotate: "45deg" }],
};
