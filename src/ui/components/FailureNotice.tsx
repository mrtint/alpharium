/**
 * T046 — 실패 표시 (006 FR-522~FR-524)
 * T047 — **추론 외의 실패 표시** (006 FR-528)
 *
 * - 실패는 **명시적으로** 표시된다 — 조용히 이전 화면으로 돌아가지 않는다 (FR-522)
 * - 표시는 **다음에 할 수 있는 일이 갈리는 만큼** 구별된다 (FR-523) —
 *   「재시도」와 「환경 확인」 두 갈래
 * - **어떤 실패 표시에서도 재시도 경로가 있다** (FR-524)
 * - **추론 외의 실패도 알린다** — 집계 생성 실패·저장 실패 (FR-528).
 *   _이것을 삼키는 것이 헌법 원칙 II의 흔한 빠져나감이다._
 *
 * 대체 문장으로 메우지 않는다 (004 FR-353) — 이 화면은 실패를 알릴 뿐 일기 자리를
 * 채우지 않는다.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TerminationReason } from "../../inference/failure";

/** 실패의 종류. 추론 넷에 더해 **추론 외의 둘**이 있다 (006 FR-528). */
export type FailureKind =
  | { readonly source: "inference"; readonly reason: TerminationReason }
  | { readonly source: "digest" }
  | { readonly source: "storage" };

/** 다음에 할 수 있는 일 (006 FR-523). 이 둘로 갈린다. */
export type NextAction = "retry" | "check-environment";

/**
 * 무엇이 갈리는지 정한다. 「환경 확인」은 사용자가 손댈 자리가 있는 경우이고,
 * 나머지는 그대로 다시 해 보는 것이 다음 수다.
 */
export function nextActionFor(failure: FailureKind): NextAction {
  if (failure.source === "digest") return "check-environment";
  if (failure.source === "storage") return "check-environment";
  return failure.reason === TerminationReason.EngineCall ? "check-environment" : "retry";
}

export function messageFor(failure: FailureKind): string {
  if (failure.source === "digest") return "오늘 관측을 모으지 못했다.";
  if (failure.source === "storage") return "기록을 저장하지 못했다.";

  switch (failure.reason) {
    case TerminationReason.PromptBuild:
      return "쓸 준비를 마치지 못했다.";
    case TerminationReason.EngineCall:
      return "생각이 닿지 않았다.";
    case TerminationReason.Format:
      return "쓴 것을 알아보지 못했다.";
    case TerminationReason.SpeakerViolation:
      return "내가 쓴 것이 아니게 되어 버렸다.";
    case TerminationReason.Cancelled:
      return "쓰다 말았다.";
  }
}

export interface FailureNoticeProps {
  readonly failure: FailureKind;
  readonly onRetry: () => void;
}

export function FailureNotice({ failure, onRetry }: FailureNoticeProps) {
  const next = nextActionFor(failure);

  return (
    <View testID="failure-notice" style={styles.container}>
      <Text testID="failure-notice-message" style={styles.message}>
        {messageFor(failure)}
      </Text>

      {next === "check-environment" && (
        <Text testID="failure-notice-hint" style={styles.hint}>
          연결과 권한을 확인한 뒤 다시 해 볼 수 있다.
        </Text>
      )}

      {/* 어떤 실패에서도 재시도 경로가 있다 (FR-524). */}
      <Pressable testID="failure-notice-retry" accessibilityRole="button" style={styles.retry} onPress={onRetry}>
        <Text style={styles.retryLabel}>다시 쓴다</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10 },
  message: { fontSize: 16, fontWeight: "600" },
  hint: { fontSize: 14, opacity: 0.7 },
  retry: {
    alignSelf: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#6366F1",
  },
  retryLabel: { color: "#FFFFFF", fontWeight: "700" },
});
