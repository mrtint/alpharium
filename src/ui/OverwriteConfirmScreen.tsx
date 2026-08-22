/**
 * 덮어쓰기 확인 화면.
 *
 * 계약: specs/012-today-diary/contracts/overwrite-confirm.md §2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **그리기만 한다.** 판정은 `state.ts`가 한다 — `confirm-overwrite` 상태를 받아
 * 날짜·확인·취소만 그린다.
 *
 * **props에 `entry`가 없다**(X1, 원칙 I). 담으면 이 화면이 「확인 대신 미리보기」로
 * 미끄러질 수 있다. 진행률·경과 시간도 없다(X2, 원칙 IV) — 이 화면은 아직 생성을
 * 시작하지 않은 상태다. 모델 이름·캐릭터 내부 식별자도 없다(X3, 원칙 III).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DayDate } from "../config/day-boundary";

export type OverwriteConfirmScreenProps = {
  day: DayDate;
  onCancel: () => void;
  onConfirm: () => void;
};

export function OverwriteConfirmScreen({
  day,
  onCancel,
  onConfirm,
}: OverwriteConfirmScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.day}>{day}</Text>
      <Text style={styles.notice}>이 날의 일기가 이미 있다. 덮어쓸지 확인이 필요하다</Text>

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.button}>
          <Text>취소</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onConfirm} style={styles.button}>
          <Text>확인</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 16 },
  day: { fontSize: 16, opacity: 0.6 },
  notice: { fontSize: 16, lineHeight: 24 },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 6,
  },
});
