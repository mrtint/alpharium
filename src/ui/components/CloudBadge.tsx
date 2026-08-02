/**
 * T056 — 클라우드 모드 표시 (006 FR-590~FR-593, 헌법 원칙 I)
 *
 * 헌법 원칙 I의 개발 예외 조건 3: 클라우드 어댑터를 쓰는 동안 **클라우드 사용 중임을
 * 지나칠 수 없는 자리에 표시**한다.
 *
 * **프로덕션에서는 표시하지 않는다** — 애초에 클라우드 어댑터가 번들에 포함되지 않으므로
 * 이 표시도 나타날 일이 없다.
 */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { isCloudMode } from "../../inference/engines";

export function CloudBadge() {
  // 프로덕션에서는 이 가지가 죽은 코드가 된다 (원칙 I).
  if (!isCloudMode()) return null;

  return (
    <View testID="cloud-badge" style={styles.badge}>
      <Text style={styles.text}>클라우드 추론 사용 중 — 개발 모드</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // 지나칠 수 없는 자리 — 화면 위쪽 전체 너비를 차지한다 (006 FR-591).
  badge: {
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#7C2D12",
  },
  text: { color: "#FFEDD5", fontSize: 12, fontWeight: "700", textAlign: "center" },
});
