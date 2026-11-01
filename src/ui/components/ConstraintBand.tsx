/**
 * 108 — 제약 띠: 일기를 쓰기 전에 막힌 조건을 알리는 쓰기 바 위의 한 줄 (계약 constraint-band.md CP1~CP4).
 *
 * 글자 하나(한 줄, 넘치면 말줄임)와 채워진 버튼 하나뿐이다. **닫기도 글자 링크도 없다** — 조건이 풀리면 부르는 쪽이 띠를 걷는다.
 * 버튼은 항상 보여야 하므로 버튼이 줄어들지 않고 글자가 줄어든다. 글꼴 배율 상한 1.2는 큰 글꼴에서 첫 화면의 본문을 밀어내지 않게
 * 하는 값이다(104에서 실측 2.0배에서 본문 0줄 — 사람이 정한 값).
 *
 * `hidden`이면 보이지도 읽히지도 눌리지도 않지만 높이는 그대로다(토스트가 뜨는 동안 가렸다가 돌아올 때 지면이 튀지 않게).
 */

import { Pressable, View } from "react-native";

import { COLORS, RADIUS } from "../theme/tokens";
import { AppText } from "./Text";

/** 띠 글꼴 배율 상한 — 사람이 정한 값(104 실측: 2.0배에서 본문 0줄) */
const BAND_FONT_CAP = 1.2;

export type ConstraintBandProps = {
  text: string;
  action: string;
  onAction: () => void;
  hidden?: boolean;
};

export function ConstraintBand({ text, action, onAction, hidden = false }: ConstraintBandProps) {
  return (
    <View
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
      pointerEvents={hidden ? "none" : "auto"}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 8,
        paddingLeft: 16,
        paddingRight: 12,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        opacity: hidden ? 0 : 1,
      }}
      testID="constraint-band"
    >
      <AppText
        ellipsizeMode="tail"
        maxFontSizeMultiplier={BAND_FONT_CAP}
        numberOfLines={1}
        style={{ flex: 1, minWidth: 0 }}
        variant="caption"
      >
        {text}
      </AppText>
      <Pressable
        accessibilityLabel={action}
        accessibilityRole="button"
        onPress={onAction}
        style={{
          flexShrink: 0,
          minHeight: 44,
          justifyContent: "center",
          paddingHorizontal: 14,
          backgroundColor: COLORS.accent,
          borderRadius: RADIUS.control,
        }}
        testID="constraint-band-action"
      >
        <AppText
          maxFontSizeMultiplier={BAND_FONT_CAP}
          style={{ color: COLORS.accentForeground, fontWeight: "600" }}
          variant="body"
        >
          {action}
        </AppText>
      </Pressable>
    </View>
  );
}
