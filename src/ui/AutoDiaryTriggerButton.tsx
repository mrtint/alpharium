/**
 * "지금 자동 생성 트리거" 디버그 버튼 (020).
 *
 * 계약: specs/020-scheduled-diary-notification/quickstart.md §4
 *       spec.md User Story 3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`runAutoDiaryTask()`를 그대로 부른다** — 019 하네스의 "지금 즉시
 * 트리거"와 같은 목적이며, `task.ts`의 판정·생성·알림·잠금 로직을 100%
 * 재사용한다(중복 없음). 경합 재현(화면 "쓰기" 직후 이 버튼)과 백그라운드
 * 완주 시간 측정에 쓴다.
 *
 * **`DiagnosticsScreen`(dev 게이트) 안에만 있다** — prod에서는 이 버튼에
 * 닿는 경로가 없다(FR-024·SC-013 계승).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { runAutoDiaryTask, type AutoDiaryTaskResult } from "../schedule/task";

export function AutoDiaryTriggerButton() {
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<AutoDiaryTaskResult | "error" | null>(null);

  const trigger = useCallback(async () => {
    setRunning(true);
    setLast(null);
    try {
      const result = await runAutoDiaryTask();
      setLast(result);
    } catch {
      setLast("error");
    } finally {
      setRunning(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        disabled={running}
        onPress={() => void trigger()}
        style={styles.button}
        testID="auto-diary-trigger"
      >
        <Text>{running ? "자동 생성 도는 중…" : "지금 자동 생성 트리거"}</Text>
      </Pressable>
      {last !== null && <Text style={styles.result}>결과: {last}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, marginTop: 8 },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  result: { fontSize: 13, opacity: 0.7 },
});
