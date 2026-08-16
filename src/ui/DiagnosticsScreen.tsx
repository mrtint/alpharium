import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { collectReport } from "../diagnostics/report";
import type { DiagnosticReport } from "../diagnostics/types";
import { expoPhotoPort } from "../signals/expo-port";
import { PermissionPanel } from "./PermissionPanel";
import { SignalProbe } from "./SignalProbe";

/**
 * 진단 화면 — 개발자가 실기기에서 상태를 눈으로 확인한다(FR-006, SC-002).
 *
 * **헌법 원칙 IV — 이 화면이 원칙을 어기기 가장 쉬운 자리다.**
 * 추론 속도 측정, 출력 점수, 모델 비교를 여기에 넣지 않는다. 이 화면은 상태를 보여줄 뿐
 * 품질을 재지 않는다.
 *
 * **헌법 원칙 III** — 모델 식별자·파라미터 수·양자화 방식을 표시하지 않는다.
 *
 * prod에서 이 화면에 도달하는 경로가 존재하지 않아야 한다(SC-013). 그 판단은 호출자인
 * App.tsx가 sinksFor()로 한다.
 *
 * 화면 디자인은 이 기능의 범위 밖이다 — 상태가 읽히면 충분하다.
 */
/**
 * 기기에 닿는 통로. 화면이 다시 그려질 때마다 새로 만들지 않도록 밖에 둔다.
 *
 * 지연 import 하는 통로이므로 여기서 만들어도 모듈이 즉시 해석되지 않는다.
 */
const photoPort = expoPhotoPort();

export function DiagnosticsScreen() {
  const [report, setReport] = useState<DiagnosticReport | null>(null);

  useEffect(() => {
    let alive = true;
    collectReport().then((r) => {
      if (alive) setReport(r);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!report) {
    return (
      <View style={styles.container}>
        <Text>진단 정보를 모으는 중…</Text>
      </View>
    );
  }

  const environmentText = report.environment.ok
    ? report.environment.environment
    : `판정 실패 (${report.environment.reason}: ${String(report.environment.received)})`;

  const locationText = report.inferenceLocation.ok
    ? report.inferenceLocation.location
    : `선택되지 않음 (${report.inferenceLocation.reason})`;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Row label="환경" value={environmentText} />
      <Row label="추론 위치" value={locationText} />
      <Row label="모듈 상태" value={formatModuleStatus(report)} />
      <Row label="저장 점검" value={formatStorage(report)} />

      {/* 004 — 권한 상태와 요청. 이것이 없으면 실기기에서 영원히 unknown이다 */}
      <PermissionPanel port={photoPort} />
      <SignalProbe port={photoPort} />

      {report.failures.length > 0 && (
        <View style={styles.failures}>
          <Text style={styles.sectionTitle}>실패</Text>
          {report.failures.map((f, i) => (
            <Text key={i} style={styles.failure}>
              {f.what}: {f.reason}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function formatModuleStatus(report: DiagnosticReport): string {
  const status = report.moduleStatus;
  return status.kind === "loaded" ? "loaded" : `${status.kind} — ${status.reason}`;
}

/**
 * 저장 점검 결과.
 *
 * `unavailable`을 `ok`로 적지 않는다 — 돌지 못한 것은 통과가 아니다(헌법 원칙 V).
 * 시뮬레이터에서는 unavailable이 정상이고, 실기기에서 unavailable이면 문제다.
 */
function formatStorage(report: DiagnosticReport): string {
  const check = report.storage;
  return check.kind === "ok" ? `ok — ${check.detail}` : `${check.kind} — ${check.reason}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
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
  sectionTitle: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 4,
  },
  failures: {
    marginTop: 8,
  },
  failure: {
    fontSize: 14,
  },
});
