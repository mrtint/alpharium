/**
 * T051 — 덮어쓰기 확인 (001 FR-040·FR-040a, 003 FR-263)
 *
 * **확인 없이 덮어쓰지 않는다** (001 FR-040).
 *
 * 재생성 시 **집계를 새로 만든다** (001 FR-040a, 003 FR-263) — 이전 집계를 재사용하면
 * 저녁의 휴대폰이 아침의 기억으로 쓰게 된다. 그 보장은 `generate-flow`가 확인 이후
 * 새 집계로 진행하는 구조에 있고, 이 화면은 그 사실을 알린다.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface OverwriteNoticeProps {
  readonly date: string;
  readonly onOverwrite: () => void;
  readonly onCancel: () => void;
}

export function OverwriteNotice({ date, onOverwrite, onCancel }: OverwriteNoticeProps) {
  return (
    <View testID="overwrite-notice" style={styles.container}>
      <Text style={styles.message}>{date}에 이미 쓴 것이 있다.</Text>
      <Text style={styles.detail}>다시 쓰면 지금까지 관측한 것으로 새로 쓴다.</Text>

      <View style={styles.actions}>
        <Pressable
          testID="overwrite-notice-cancel"
          accessibilityRole="button"
          accessibilityState={{ selected: true }}
          style={[styles.action, styles.primary]}
          onPress={onCancel}
        >
          <Text style={styles.primaryLabel}>그대로 둔다</Text>
        </Pressable>
        <Pressable
          testID="overwrite-notice-confirm"
          accessibilityRole="button"
          accessibilityState={{ selected: false }}
          style={styles.action}
          onPress={onOverwrite}
        >
          <Text style={styles.label}>다시 쓴다</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10 },
  message: { fontSize: 16, fontWeight: "600" },
  detail: { fontSize: 14, opacity: 0.7 },
  actions: { flexDirection: "row", gap: 12, marginTop: 4 },
  action: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  primary: { backgroundColor: "#6366F1" },
  primaryLabel: { color: "#FFFFFF", fontWeight: "700" },
  label: { fontWeight: "600" },
});
