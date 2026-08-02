/**
 * T053 — **일기 상세** (006 FR-504·FR-510, 001 FR-031)
 *
 * 본문·재료 요약·근거 집계·퍼소나 이름에 모두 도달한다 (006 FR-504).
 *
 * **대조는 부가 기능이 아니라 필수 구성이다** (006 FR-510) — 집계를 별도 영역으로
 * 벗어나게 하지 않는다. 본문 바로 아래에 근거가 놓인다. **이것이 이 앱의 유희가
 * 성립하는 지점이다** (001 FR-031).
 *
 * 재료 요약은 **저장된 값이 아니라 파생값**이다 (004 FR-304) — 여기서 계산한다.
 */
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { DigestView } from "../components/DigestView";
import { deriveMaterialSummary, hasNothingToCount } from "../material-summary";
import type { RecordBundle } from "../../storage/bundle";

export function DiaryDetail({ bundle }: { readonly bundle: RecordBundle }) {
  // 표시 시점에 짝이 되는 집계에서 파생한다 (004 FR-304, 005 FR-473).
  const summary = deriveMaterialSummary(bundle.digest);

  return (
    <ScrollView testID="diary-detail" contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text testID="diary-detail-date" style={styles.date}>
          {bundle.diary.date}
        </Text>
        <Text testID="diary-detail-persona" style={styles.persona}>
          {bundle.diary.personaName}이(가) 썼다
        </Text>
      </View>

      <Text testID="diary-detail-body" style={styles.body}>
        {bundle.diary.body}
      </Text>

      {/* 대조 — 별도 영역으로 벗어나지 않는다 (006 FR-510). */}
      <View testID="diary-detail-evidence" style={styles.evidence}>
        {/* 셀 대상이 없으면 0을 나열하지 않는다 (006 FR-513). */}
        {!hasNothingToCount(summary) && (
          <Text testID="diary-detail-summary" style={styles.summary}>
            {summary.map((c) => `${c.label} ${c.count}`).join(" · ")}
          </Text>
        )}

        <DigestView digest={bundle.digest} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  header: { gap: 4 },
  date: { fontSize: 13, fontWeight: "700", opacity: 0.7 },
  persona: { fontSize: 13, opacity: 0.7 },
  body: { fontSize: 16, lineHeight: 26 },
  // 본문과 같은 흐름 안에 놓인다 — 접히거나 다른 화면으로 밀려나지 않는다 (FR-510).
  evidence: {
    gap: 10,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(127,127,127,0.4)",
  },
  summary: { fontSize: 13, opacity: 0.75 },
});
