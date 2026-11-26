/**
 * 135 — 쓴 날 사진 자리의 면 전환 단추(사진 ↔ 지도). 사진·지도 위 우측 하단에 같은 모양·같은 자리로 놓인다
 * (소유자 결정 2026-11-26 — 캐러셀 순번 배지처럼 그림 위에 얹는다, specs/135-diary-route-views/contracts/written-route.md WR2·WR3).
 *
 * 아이콘 글꼴·라이브러리를 들이지 않고 평평한 사각형으로 그린다(Modernist — 반경·그림자 없음, `design/DESIGN.md`).
 * 지도는 세로 판 셋(접은 지도), 사진은 겹친 사각형 둘이다. 보이는 단추는 32, 누를 자리는 `hitSlop`으로 44 이상이다.
 * 치수는 **사람이 정한 값이다**(원칙 V).
 */

import { Pressable, View, type ViewStyle } from "react-native";

import { ROUTE_TEXT } from "./home-text";
import { COLORS, WRITTEN_DAY } from "./theme/tokens";

/** 보이는 단추 한 변 */
export const FACE_BUTTON_SIZE = 32;
const HIT = (44 - FACE_BUTTON_SIZE) / 2;

export function FaceButton({
  kind,
  onPress,
}: {
  /** 누르면 보일 면 — `map`이면 지도 아이콘(사진 위), `photos`면 사진 아이콘(지도 위) */
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
      {isMap ? (
        <View style={MAP_ICON}>
          <View style={[PANEL, { height: 14, marginTop: 2 }]} />
          <View style={[PANEL, { height: 14 }]} />
          <View style={[PANEL, { height: 14, marginTop: 2 }]} />
        </View>
      ) : (
        <View style={PHOTO_ICON}>
          <View style={[FRAME, { left: 0, top: 4 }]} />
          <View style={[FRAME, { left: 4, top: 0, backgroundColor: COLORS.text }]} />
        </View>
      )}
    </Pressable>
  );
}

const BUTTON: ViewStyle = {
  position: "absolute",
  right: WRITTEN_DAY.badge.inset,
  bottom: WRITTEN_DAY.badge.inset,
  width: FACE_BUTTON_SIZE,
  height: FACE_BUTTON_SIZE,
  backgroundColor: COLORS.bg,
  alignItems: "center",
  justifyContent: "center",
};

const MAP_ICON: ViewStyle = { flexDirection: "row", gap: 2, height: 18, alignItems: "flex-start" };

const PANEL: ViewStyle = { width: 5, backgroundColor: COLORS.text };

const PHOTO_ICON: ViewStyle = { width: 18, height: 18 };

const FRAME: ViewStyle = {
  position: "absolute",
  width: 14,
  height: 14,
  borderWidth: 2,
  borderColor: COLORS.text,
  backgroundColor: COLORS.bg,
};
