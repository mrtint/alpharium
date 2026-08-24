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

export type GeocodingSettingToggleProps = {
  /** 지금 설정. **기본값은 꺼짐이다**(FR-004) */
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
};

export function GeocodingSettingToggle({ enabled, onToggle }: GeocodingSettingToggleProps) {
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: enabled }}
        onPress={() => onToggle(!enabled)}
        style={[styles.row, enabled && styles.rowSelected]}
        testID="geocoding-toggle"
      >
        <View style={styles.info}>
          <Text style={styles.name}>장소 이름으로 보기</Text>
          <Text style={styles.hint}>다닌 자리를 숫자 대신 이름으로 보여준다</Text>
        </View>

        {enabled && <Text style={styles.mark}>선택</Text>}
      </Pressable>

      {/* L8, FR-006 — 켤 때 고지 문구가 그 자리에서 뜬다 */}
      {enabled && <Text style={styles.notice}>좌표를 기기의 지도 서비스에 물어봅니다.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
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
