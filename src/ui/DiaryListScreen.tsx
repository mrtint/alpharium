/**
 * 일기 목록 화면.
 *
 * 계약: specs/006-first-diary-app/contracts/screens.md §2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 이 화면이 원칙 I을 어기기 가장 쉬운 자리다.**
 *
 * 006이 처음으로 「저장된 일기를 보여주는 화면」을 만든다. **읽기와 쓰기가 같은 동작에
 * 묶이지 않아야 한다**(S1) — 「이미 있으면 그것을 보여준다」는 지름길을 만들면 저장된
 * 것이 생성을 대신하고, 그 순간 헌법 원칙 I이 깨진다.
 *
 * 그래서 `onWrite`는 **목록을 보지 않는다.** 항목이 있든 없든 같은 일을 한다.
 *
 * **화면 디자인은 이 기능의 범위가 아니다**(FR-027). 읽히고 눌리면 충분하다 —
 * 001·003·004가 「상태가 읽히면 충분하다」로 둔 것과 같은 기준이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { DiaryListItem } from "../app/state";

export type DiaryListScreenProps = {
  items: DiaryListItem[];
  onOpen: (item: DiaryListItem) => void;
  /**
   * **목록을 인자로 받지 않는다**(S1). 저장 상태를 볼 수 없으면 그것으로 갈릴 수 없다 —
   * `state.ts`의 `toWriting()`이 인자를 받지 않는 것과 같은 방어다.
   */
  onWrite: () => void;
};

export function DiaryListScreen({ items, onOpen, onWrite }: DiaryListScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>일기</Text>

      {/* **빈 화면을 보이지 않는다**(FR-018, S7) — 무엇을 하면 생기는지 말한다 */}
      {items.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>아직 일기가 없다</Text>
          <Text style={styles.emptyHint}>
            아래 「일기 쓰기」를 누르면 휴대폰이 어제 하루를 일기로 쓴다.
          </Text>
        </View>
      )}

      {items.map((item) => (
        <Pressable
          accessibilityRole="button"
          key={item.day}
          onPress={() => onOpen(item)}
          style={styles.row}
        >
          <Text style={styles.day}>{item.day}</Text>

          {/*
            ★ 「읽을 수 없다」와 「일기가 없다」는 다른 상태다(S3, 원칙 V).
            조용히 빼면 사용자는 일기를 쓴 기억과 화면이 어긋나는 것을 설명할 수 없다.
          */}
          {!item.readable && <Text style={styles.unreadable}>읽을 수 없다</Text>}
        </Pressable>
      ))}

      {/* **항목이 있든 없든 같은 자리다** — 읽기가 쓰기를 대신하지 않는다(S1) */}
      <Pressable accessibilityRole="button" onPress={onWrite} style={styles.write}>
        <Text>일기 쓰기</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 12 },
  title: { fontSize: 20, fontWeight: "600" },
  empty: { paddingVertical: 24, gap: 8 },
  emptyTitle: { fontSize: 16 },
  emptyHint: { fontSize: 14, opacity: 0.7, lineHeight: 20 },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
    gap: 4,
  },
  day: { fontSize: 16 },
  unreadable: { fontSize: 13, opacity: 0.6 },
  write: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
});
