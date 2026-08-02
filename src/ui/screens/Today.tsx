/**
 * T044 — **오늘 자리** (006 FR-501) — 앱을 열었을 때 도달하는 자리, 생성 진입
 * T045 — 생성 진행 표시 (006 FR-520, 001 FR-041)
 * T048 — 빈 집계 알림 (006 FR-526, 001 FR-013)
 *
 * 요청은 **완료 또는 실패 중 하나의 결말에 도달한다** (006 FR-521) — 진행 중이던
 * 표시가 조용히 사라지는 경로가 없다.
 *
 * 빈 집계에서는 **쓸 재료가 없어 쓸 수 없음**을 알리고 **추론을 시도하지 않는다**
 * (001 FR-013). 대체 문장이 그 자리를 채우지 않는다 (001 FR-024).
 */
import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CloudBadge } from "../components/CloudBadge";
import { FailureNotice, type FailureKind } from "../components/FailureNotice";
import { ScaleNotice } from "../components/ScaleNotice";
import { OverwriteNotice } from "../components/OverwriteNotice";
import { ConfirmKind, runGenerateFlow, type FlowDeps, type FlowOutcome } from "../generate-flow";
import type { DailyDigest } from "../../signals/digest";

/** 사용자에게 물어야 하는 자리. 답이 올 때까지 흐름이 멈춰 선다. */
interface PendingConfirm {
  readonly kind: ConfirmKind;
  readonly digest: DailyDigest;
  readonly resolve: (proceed: boolean) => void;
}

export interface TodayProps {
  /** 흐름에 필요한 것들. 확인자는 이 화면이 붙인다. */
  readonly deps: Omit<FlowDeps, "confirmer">;
  readonly onCompleted?: (date: string) => void;
}

export function Today({ deps, onCompleted }: TodayProps) {
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<FlowOutcome | null>(null);
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const handleGenerate = async () => {
    setRunning(true);
    setOutcome(null);

    const result = await runGenerateFlow({
      ...deps,
      confirmer: {
        confirm: (kind, digest) =>
          new Promise<boolean>((resolve) => {
            setPending({
              kind,
              digest,
              resolve: (proceed) => {
                setPending(null);
                resolve(proceed);
              },
            });
          }),
      },
    });

    setRunning(false);
    setOutcome(result);
    if (result.kind === "completed") onCompleted?.(result.date);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <CloudBadge />

      <Text style={styles.title}>오늘</Text>

      <Pressable
        testID="today-generate"
        accessibilityRole="button"
        style={[styles.generate, running && styles.disabled]}
        disabled={running}
        onPress={handleGenerate}
      >
        <Text style={styles.generateLabel}>오늘을 써 달라고 한다</Text>
      </Pressable>

      {/* 진행 중임이 나타난다 (006 FR-520, 001 FR-041). */}
      {running && (
        <View testID="today-progress" style={styles.progress}>
          <ActivityIndicator />
          <Text style={styles.progressLabel}>쓰는 중이다</Text>
        </View>
      )}

      {/* 「적음」 확인 — 진행이 기본 선택이다 (006 FR-542). */}
      {pending?.kind === ConfirmKind.ModestScale && (
        <ScaleNotice
          digest={pending.digest}
          onProceed={() => pending.resolve(true)}
          onCancel={() => pending.resolve(false)}
        />
      )}

      {/* 덮어쓰기 확인 — 확인 없이 덮어쓰지 않는다 (001 FR-040). */}
      {pending?.kind === ConfirmKind.Overwrite && (
        <OverwriteNotice
          date={pending.digest.date}
          onOverwrite={() => pending.resolve(true)}
          onCancel={() => pending.resolve(false)}
        />
      )}

      {/* 빈 집계 — 추론하지 않았음을 알린다 (006 FR-526, 001 FR-013). */}
      {outcome?.kind === "empty-digest" && (
        <View testID="today-empty-digest" style={styles.notice}>
          <Text style={styles.noticeText}>오늘은 본 것이 없어서 쓸 수 없다.</Text>
        </View>
      )}

      {/* 실패 — 추론 실패와 **추론 외의 실패**를 모두 알린다 (006 FR-528). */}
      {outcome && failureOf(outcome) && (
        <FailureNotice failure={failureOf(outcome)!} onRetry={handleGenerate} />
      )}

      {outcome?.kind === "completed" && (
        <View testID="today-completed" style={styles.notice}>
          <Text style={styles.noticeText}>오늘 것을 다 썼다.</Text>
        </View>
      )}
    </ScrollView>
  );
}

/** 결말을 실패 표시로 옮긴다. 취소·완료·빈 집계는 실패가 아니다. */
function failureOf(outcome: FlowOutcome): FailureKind | null {
  switch (outcome.kind) {
    case "digest-failed":
      return { source: "digest" };
    case "storage-failed":
      return { source: "storage" };
    case "inference-failed":
      return { source: "inference", reason: outcome.reason };
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  title: { fontSize: 28, fontWeight: "800" },
  generate: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#6366F1",
  },
  disabled: { opacity: 0.6 },
  generateLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  progress: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressLabel: { fontSize: 14 },
  notice: { padding: 16, borderRadius: 12, backgroundColor: "rgba(127,127,127,0.12)" },
  noticeText: { fontSize: 15 },
});
