/**
 * T049 — 「적음」 확인 (006 FR-540~FR-544)
 *
 * **중립성을 문면이 아니라 구조로 지킨다.** 문장만 부드럽게 쓰고 취소를 기본 선택에
 * 두면 그것은 게이트다.
 *
 * - 「적음」일 때**만** 표시한다 (FR-540)
 * - **진행이 기본 선택**이다 (FR-542) — 자리도 먼저, 표시도 기본
 * - 평가어와 경고 기호를 쓰지 않는다 (FR-543)
 * - 전달하는 것은 **지금 반영되는 관측의 셈**이다 (FR-544) — 판단이 아니라 사실
 * - 적다는 이유로 거부·지연하지 않는다 (FR-546)
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { countObservedFields, type DailyDigest } from "../../signals/digest";
import { ScaleVerdict } from "../../signals/scale";

/** 006 FR-543이 금지한 평가어. 이 목록의 낱말을 문면에 쓰지 않는다. */
export const EVALUATIVE_WORDS = [
  "부족",
  "빈약",
  "미흡",
  "불충분",
  "적어서",
  "모자",
  "아쉬",
] as const;

/** 006 FR-543이 금지한 경고 기호. */
export const WARNING_SYMBOLS = ["⚠", "❗", "❌", "🚫", "‼"] as const;

/** 「적음」일 때만 참이다 (006 FR-540). */
export function shouldShowScaleNotice(scale: ScaleVerdict): boolean {
  return scale === ScaleVerdict.Modest;
}

export interface ScaleNoticeProps {
  readonly digest: DailyDigest;
  readonly onProceed: () => void;
  readonly onCancel: () => void;
}

export function ScaleNotice({ digest, onProceed, onCancel }: ScaleNoticeProps) {
  const count = countObservedFields(digest);

  return (
    <View style={styles.container}>
      {/* 전달하는 것은 셈이다 — 판단하지 않는다 (FR-544). */}
      <Text testID="scale-notice" style={styles.message}>
        지금 반영되는 관측은 여섯 가지 중 셋이다.
      </Text>
      <Text testID="scale-notice-count" style={styles.count}>
        관측된 항목 {count}개
      </Text>

      {/* 진행이 먼저 놓인다 (FR-542). */}
      <View testID="scale-notice-actions" style={styles.actions}>
        <Pressable
          testID="scale-notice-proceed"
          accessibilityRole="button"
          accessibilityState={{ selected: true }}
          style={[styles.action, styles.primary]}
          onPress={onProceed}
        >
          <Text style={styles.primaryLabel}>이대로 쓴다</Text>
        </Pressable>
        <Pressable
          testID="scale-notice-cancel"
          accessibilityRole="button"
          accessibilityState={{ selected: false }}
          style={styles.action}
          onPress={onCancel}
        >
          <Text style={styles.label}>나중에</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  message: { fontSize: 16 },
  count: { fontSize: 14, opacity: 0.7 },
  actions: { flexDirection: "row", gap: 12 },
  action: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  primary: { backgroundColor: "#6366F1" },
  primaryLabel: { color: "#FFFFFF", fontWeight: "700" },
  label: { fontWeight: "600" },
});
