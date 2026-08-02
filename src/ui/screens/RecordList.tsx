/**
 * T052 — **기록 목록** (006 FR-502·FR-503·FR-506)
 *
 * - **보이는 기록만** 나열한다 (FR-502) — 저장 축의 `listVisible`이 그것을 보장한다
 * - 각 항목에서 상세로 이동한다 (FR-503)
 * - 기록이 없는 상태는 **정상 상태**로 표현한다 — **오류로 표시하지 않는다** (FR-506)
 */
import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { RecordBundle } from "../../storage/bundle";

export interface RecordListProps {
  readonly bundles: readonly RecordBundle[];
  readonly onOpen: (date: string) => void;
}

export function RecordList({ bundles, onOpen }: RecordListProps) {
  // 기록이 없는 것은 오류가 아니다 (FR-506) — 실패 표시를 쓰지 않는다.
  if (bundles.length === 0) {
    return (
      <View testID="record-list-empty" style={styles.empty}>
        <Text style={styles.emptyText}>아직 쓴 것이 없다.</Text>
      </View>
    );
  }

  return (
    <FlatList
      testID="record-list"
      data={[...bundles].sort((a, b) => b.diary.date.localeCompare(a.diary.date))}
      keyExtractor={(bundle) => bundle.diary.date}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
        <Pressable
          testID={`record-list-item-${item.diary.date}`}
          accessibilityRole="button"
          style={styles.item}
          onPress={() => onOpen(item.diary.date)}
        >
          <Text style={styles.date}>{item.diary.date}</Text>
          <Text numberOfLines={2} style={styles.preview}>
            {item.diary.body}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  item: { padding: 16, borderRadius: 12, backgroundColor: "rgba(127,127,127,0.10)", gap: 6 },
  date: { fontSize: 13, fontWeight: "700", opacity: 0.7 },
  preview: { fontSize: 15, lineHeight: 22 },
  empty: { padding: 20 },
  emptyText: { fontSize: 15, opacity: 0.7 },
});
