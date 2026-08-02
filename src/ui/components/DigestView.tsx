/**
 * T055 — 집계 표시 (006 FR-514·FR-515, 001 FR-010)
 *
 * - **미관측을 값-없음과 구별해** 보인다 (FR-514) — 「0」이나 빈칸으로 뭉개지 않는다
 * - 미관측을 **결함·미완으로 표시하지 않는다** (FR-515) — 못 본 것은 잘못이 아니다
 *
 * 「걸음 수 0」과 「걸음 수 미관측」이 화면에서도 다르게 보여야 001 FR-010이 성립한다.
 */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { isObserved, type Observation } from "../../signals/observation";
import type { DailyDigest } from "../../signals/digest";

/** 미관측일 때 놓는 문면. 결함이 아니라 **보지 못했다**는 사실이다 (FR-515). */
export const UNOBSERVED_LABEL = "보지 못했다";

interface RowProps<T> {
  readonly label: string;
  readonly value: Observation<T>;
  readonly render: (value: T) => string;
}

function Row<T>({ label, value, render }: RowProps<T>) {
  const observedValue = isObserved(value);

  return (
    <View style={styles.row} testID={`digest-row-${label}`}>
      <Text style={styles.label}>{label}</Text>
      <Text
        testID={`digest-value-${label}`}
        // 미관측은 값과 **다른 표시**를 받는다 (FR-514). 흐리게 둘 뿐 경고가 아니다.
        style={[styles.value, !observedValue && styles.unobserved]}
      >
        {observedValue ? render(value.value) : UNOBSERVED_LABEL}
      </Text>
    </View>
  );
}

const periodOf = (p: Observation<string>) => (isObserved(p) ? p.value : "");

export function DigestView({ digest }: { readonly digest: DailyDigest }) {
  return (
    <View testID="digest-view" style={styles.container}>
      <Row label="걸음 수" value={digest.steps} render={(n) => `${n}보`} />
      <Row label="움직인 시간대" value={digest.activePeriods} render={(ps) => ps.join(", ")} />
      <Row
        label="머문 곳"
        value={digest.stays}
        render={(ss) => ss.map((s) => `${periodOf(s.period)} ${s.place}`.trim()).join(", ")}
      />
      <Row label="이동" value={digest.moved} render={(m) => (m ? "있었다" : "없었다")} />
      <Row
        label="사진"
        value={digest.photos}
        render={(ps) =>
          ps
            .map((p) =>
              [periodOf(p.period), isObserved(p.caption) ? p.caption.value : ""].filter(Boolean).join(" "),
            )
            .filter(Boolean)
            .join(" / ")
        }
      />
      <Row
        label="일정"
        value={digest.events}
        render={(es) => es.map((e) => `${periodOf(e.period)} ${e.title}`.trim()).join(", ")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  label: { fontSize: 14, opacity: 0.7 },
  value: { fontSize: 14, fontWeight: "600" },
  // 결함이 아니라 「보지 못했다」는 사실이므로 색이 아니라 농도로만 구별한다 (FR-515).
  unobserved: { fontWeight: "400", opacity: 0.45, fontStyle: "italic" },
});
