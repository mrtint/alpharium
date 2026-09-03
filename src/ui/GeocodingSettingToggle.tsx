/**
 * 장소명 설정을 켜고 끄는 자리.
 *
 * 계약: specs/017-diary-body-screen/contracts/place-name.md L1·L8
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`VisionPicker.tsx`와 같은 자리에 놓인다**(research.md §6) — 둘 다 「쓰기
 * 전에 고르는 것」이라는 같은 범주다.
 *
 * **켤 때 고지 문구가 그 자리에서 뜬다**(FR-006) — 좌표를 기기의 지도
 * 서비스에 물어본다는 사실을 그대로 알린다. 새 권한과 기기 밖 조회가
 * 필요하므로 기본값은 꺼짐이다(FR-004).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Pressable, StyleSheet, View } from "react-native";

import type { GeocodingPreference } from "../app/geocoding-setting-store";
import { AppText } from "./components/Text";
import { COLORS, RADIUS } from "./theme/tokens";

/** 029 — 3-상태. "자동"이 기본. */
const OPTIONS: readonly { mode: GeocodingPreference; name: string; hint: string }[] = [
  { mode: "auto", name: "자동", hint: "위치 권한이 있으면 이름으로, 없으면 비워 둔다" },
  { mode: "on", name: "켬", hint: "다닌 자리를 숫자 대신 이름으로 보여준다" },
  { mode: "off", name: "끔", hint: "장소 이름을 옮기지 않는다" },
];

export type GeocodingSettingToggleProps = {
  /** 지금 설정. **기본값은 "auto"다**(029 FR-025) */
  mode: GeocodingPreference;
  onSelect: (mode: GeocodingPreference) => void;
};

export function GeocodingSettingToggle({ mode, onSelect }: GeocodingSettingToggleProps) {
  return (
    <View style={styles.container}>
      <AppText variant="sectionTitle">장소 이름으로 보기</AppText>
      {OPTIONS.map((opt) => {
        const isSelected = opt.mode === mode;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={opt.mode}
            onPress={() => onSelect(opt.mode)}
            style={[styles.row, isSelected && styles.rowSelected]}
            testID={`geocoding-${opt.mode}`}
          >
            <View style={styles.info}>
              <AppText variant="body">{opt.name}</AppText>
              <AppText variant="caption">{opt.hint}</AppText>
            </View>
            {isSelected && (
              <AppText variant="caption" style={{ color: COLORS.accent, fontWeight: "600" }}>
                선택
              </AppText>
            )}
          </Pressable>
        );
      })}

      {/* L8, FR-006 — 켤 때(또는 자동일 때) 고지 문구. */}
      {mode !== "off" && (
        <AppText variant="caption" style={{ paddingHorizontal: 4 }}>
          좌표를 기기의 지도 서비스에 물어봅니다.
        </AppText>
      )}
    </View>
  );
}

// 032 — 색은 tokens.ts에서. 구조·testID·문안 불변(SM5).
const styles = StyleSheet.create({
  container: { gap: 6 },
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
