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

import { Pressable, StyleSheet, Text, View } from "react-native";

import type { GeocodingPreference } from "../app/geocoding-setting-store";

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
      <Text style={styles.title}>장소 이름으로 보기</Text>
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
              <Text style={styles.name}>{opt.name}</Text>
              <Text style={styles.hint}>{opt.hint}</Text>
            </View>
            {isSelected && <Text style={styles.mark}>선택</Text>}
          </Pressable>
        );
      })}

      {/* L8, FR-006 — 켤 때(또는 자동일 때) 고지 문구. */}
      {mode !== "off" && <Text style={styles.notice}>좌표를 기기의 지도 서비스에 물어봅니다.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  title: { fontSize: 16, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 8,
  },
  rowSelected: { borderColor: "#333", borderWidth: 1 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15 },
  hint: { fontSize: 13, opacity: 0.7 },
  mark: { fontSize: 13, fontWeight: "600" },
  notice: { fontSize: 12, opacity: 0.6, paddingHorizontal: 4 },
});
