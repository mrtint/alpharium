/**
 * 백그라운드 검증 진단 패널.
 *
 * 계약: specs/019-background-diary-feasibility/quickstart.md, plan.md
 * Technical Context 「Project Type」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 파일은 제품 코드가 아니다.** `src/ui/DiagnosticsScreen.tsx`의 기존
 * `showsOnScreen()` 게이트(local·dev 전용) 안에서만 렌더링되므로, 배포
 * 빌드에서는 이 컴포넌트 자체가 화면에 닿지 않는다(007·014가 확립한 진단
 * 경로 경계 재사용).
 *
 * **H5를 지킨다** — 모델 식별자·소요 시간 비교·네이티브 지표를 표시하지
 * 않는다. 로그 원문(VerificationEvent)을 그대로 보여줄 뿐 해석·집계하지
 * 않는다(집계는 findings.md를 사람이 쓸 때 한다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";

import {
  BACKGROUND_DIARY_TASK_NAME,
  registerBackgroundDiaryTask,
  runBackgroundDiaryTask,
  unregisterBackgroundDiaryTask,
} from "./background-diary-task";
import {
  expoVerificationLogPort,
  readVerificationLog,
  type VerificationEvent,
} from "./verification-log";

/**
 * 헌법 로스터의 가장 느린 캐릭터(exaone, 콜드 최대 242초 관측 —
 * AGENTS.md). spec.md User Story 2 Acceptance Scenario 1이 요구하는
 * "가장 느린 캐릭터로 완주 여부 확인"을 위해 디버그 트리거에서만 쓴다.
 *
 * 사용자 화면이 아닌 진단 경로이므로 캐릭터 식별자를 노출해도 원칙 III
 * 위반이 아니다(007이 이미 확립한 경계).
 */
const SLOWEST_CHARACTER = "narrative" as const;

function statusLabel(status: BackgroundTask.BackgroundTaskStatus | null): string {
  if (status === null) return "확인 중…";
  return BackgroundTask.BackgroundTaskStatus[status];
}

export function DiagnosticsBackgroundPanel() {
  const [status, setStatus] = useState<BackgroundTask.BackgroundTaskStatus | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [log, setLog] = useState<VerificationEvent[] | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [forceSlowest, setForceSlowest] = useState(false);

  async function refresh() {
    setStatus(await BackgroundTask.getStatusAsync());
    setIsRegistered(await TaskManager.isTaskRegisteredAsync(BACKGROUND_DIARY_TASK_NAME));
  }

  async function toggle() {
    if (isRegistered) {
      await unregisterBackgroundDiaryTask();
    } else {
      await registerBackgroundDiaryTask();
    }
    await refresh();
  }

  async function loadLog() {
    setLog(await readVerificationLog(expoVerificationLogPort()));
  }

  async function triggerNow() {
    setTriggering(true);
    try {
      await runBackgroundDiaryTask(forceSlowest ? { forceCharacter: SLOWEST_CHARACTER } : {});
    } finally {
      setTriggering(false);
      await loadLog();
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>019 — 백그라운드 검증 (개발자 전용)</Text>

      <View style={styles.row}>
        <Text style={styles.label}>사용 가능 여부</Text>
        <Text style={styles.value}>{statusLabel(status)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>등록 상태</Text>
        <Text style={styles.value}>{isRegistered ? "등록됨" : "등록 안 됨"}</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={refresh}>
          <Text style={styles.buttonText}>상태 확인</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          disabled={status === BackgroundTask.BackgroundTaskStatus.Restricted}
          onPress={toggle}
        >
          <Text style={styles.buttonText}>{isRegistered ? "등록 취소" : "등록"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} disabled={triggering} onPress={triggerNow}>
          <Text style={styles.buttonText}>{triggering ? "실행 중…" : "지금 즉시 트리거"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={loadLog}>
          <Text style={styles.buttonText}>로그 보기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => setForceSlowest((v) => !v)}>
          <Text style={styles.buttonText}>
            {forceSlowest ? "☑ 가장 느린 캐릭터" : "☐ 가장 느린 캐릭터"}
          </Text>
        </TouchableOpacity>
      </View>

      {log && (
        <ScrollView style={styles.logBox}>
          {log.length === 0 ? (
            <Text style={styles.logLine}>기록된 이벤트 없음</Text>
          ) : (
            log.map((event, i) => (
              <Text key={i} style={styles.logLine}>
                {JSON.stringify(event)}
              </Text>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#888",
  },
  sectionTitle: {
    fontSize: 12,
    opacity: 0.6,
  },
  row: {
    gap: 2,
  },
  label: {
    fontSize: 12,
    opacity: 0.6,
  },
  value: {
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#888",
    borderRadius: 4,
  },
  buttonText: {
    fontSize: 13,
  },
  logBox: {
    maxHeight: 200,
    backgroundColor: "#0001",
    padding: 6,
  },
  logLine: {
    fontSize: 11,
    fontFamily: "monospace",
  },
});
