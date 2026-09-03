/**
 * 사진을 어떻게 다룰지 고르는 자리.
 *
 * 계약: specs/011-photo-vision-summary/spec.md FR-015·016·019·019a·020
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **헌법 「사진과 시각 처리」가 이 화면의 모양을 이미 정했다.**
 *
 * - 사진 이해 방식은 **캐릭터가 아니라 설정**이다(MUST)
 * - 사용자가 **시각 인코더를 고르게 하지 않는다**(MUST NOT)
 * - 「사진을 보지 않음 / 빠르게 봄 / 자세히 봄」 정도로 제시한다
 *
 * 그래서 이 자리에 **모델 이름·파일·크기·토큰 수가 하나도 없다**(FR-016, SC-004).
 * 007의 `CharacterPicker`가 캐릭터만 보이고 모델을 숨긴 것과 같은 구조다.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * **설명은 결과의 차이로 쓴다**(FR-019a). 「256토큰 대 1024토큰」이 아니라 「무엇이
 * 달라지는가」다 — 전자는 모델 설정이고 사용자가 판단할 수 없는 값이다.
 */

import { Pressable, StyleSheet, View } from "react-native";

import type { VisionPreference } from "../app/vision-setting-store";
import { AppText } from "./components/Text";
import { COLORS, RADIUS } from "./theme/tokens";

/** 029 — "자동"이 앞에 온다. 나머지 셋은 011의 VISION_SETTINGS 순서. */
const OPTIONS: readonly VisionPreference[] = ["auto", "none", "quick", "detailed"];

export type VisionPickerProps = {
  /** 지금 고른 것. **기본값은 "auto"다**(029 FR-024) */
  selected: VisionPreference;
  onSelect: (vision: VisionPreference) => void;
};

/**
 * 사람이 읽을 이름과 설명.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **설명이 「무엇이 달라지는가」로 쓰였다**(FR-019a).
 *
 * `detailed`의 「오래 걸린다」가 FR-020이다 — 헌법 원칙 III이 「기다림처럼 사용자의
 * 시간을 쓰는 것은 그 순간에 알린다」고 했고, 여기서는 **고르기 전에** 알린다.
 *
 * **초·백분율·배수를 쓰지 않는다**(원칙 IV). 「2배 느리다」는 측정값이며, 그것을 적으면
 * 사용자가 두 설정을 견주게 되고 그것이 곧 비교다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const LABELS: Readonly<Record<VisionPreference, { name: string; hint: string }>> = {
  auto: {
    name: "자동",
    hint: "그날 사진이 있으면 빠르게 보고, 없으면 보지 않는다",
  },
  none: {
    name: "사진을 보지 않음",
    hint: "사진이 몇 장 있었는지만 안다. 가장 빠르다",
  },
  quick: {
    name: "빠르게 봄",
    hint: "사진에 무엇이 담겼는지 훑어본다",
  },
  detailed: {
    name: "자세히 봄",
    hint: "사진을 더 꼼꼼히 본다. 그만큼 오래 걸린다",
  },
};

export function VisionPicker({ selected, onSelect }: VisionPickerProps) {
  return (
    <View style={styles.container}>
      <AppText variant="sectionTitle">사진을 어떻게 볼까</AppText>

      {OPTIONS.map((setting) => {
        const isSelected = setting === selected;
        const { name, hint } = LABELS[setting];

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={setting}
            onPress={() => onSelect(setting)}
            style={[styles.row, isSelected && styles.rowSelected]}
            // **설정마다 따로 준다** — RN은 접근성 트리가 평탄화되어 Maestro의
            // `childOf`가 통하지 않는다(008 실측). `testID`는 release에서 살아남는다.
            testID={`vision-${setting}`}
          >
            <View style={styles.info}>
              <AppText variant="body">{name}</AppText>
              <AppText variant="caption">{hint}</AppText>
            </View>

            {isSelected && (
              <AppText variant="caption" style={{ color: COLORS.accent, fontWeight: "600" }}>
                선택
              </AppText>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// 032 — 색은 tokens.ts에서. 구조·testID·문안 불변(SM5).
const styles = StyleSheet.create({
  container: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: RADIUS.card,
  },
  rowSelected: { borderColor: COLORS.accent, borderWidth: 1 },
  info: { flex: 1, gap: 2 },
});
