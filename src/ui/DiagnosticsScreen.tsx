import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { createAppPipeline } from "../app/wiring";
import { currentEnvironment } from "../config/environment";
import { CHARACTERS, type Character } from "../diary/types";
import { collectReport } from "../diagnostics/report";
import type { DiagnosticReport } from "../diagnostics/types";
import { expoPhotoPort } from "../signals/expo-port";
import { AutoDiaryTriggerButton } from "./AutoDiaryTriggerButton";
import { GenerationProbe } from "./GenerationProbe";
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

/**
 * 006 — 생성 파이프라인. 화면이 다시 그려질 때마다 새로 만들지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **005는 여기서 `onDeviceBackend()`를 직접 만들었고, 그것이 저장이 끊긴 원인이었다.**
 * 어댑터를 손에 쥐면 파이프라인을 건너뛰게 되고, 그러면 `store.save()`가 돌지 않는다.
 *
 * 지금은 **사용자 경로와 같은 `createAppPipeline()`을 쓴다**(006 FR-010a). 진단이라는
 * 이유로 저장을 건너뛰지 않으므로, 실기기에서 저장이 실제로 도는 것을 눈으로 확인할
 * 수 있다. 추론 위치도 `select.ts`가 고른다(FR-026).
 * ─────────────────────────────────────────────────────────────────────────────
 */
const generation = createAppPipeline(currentEnvironment());

/**
 * 진단에서 생성을 시험할 캐릭터.
 *
 * **어느 캐릭터의 모델이 기기에 있느냐에 달렸다** — 없으면 `model-load-failed`가 나오고
 * 그것이 정상이다. 캐릭터 목록에서 준비 상태를 보고 고르는 것은 사용자 화면의 몫이며,
 * 진단은 하나를 골라 두고 눌러 보기만 한다.
 *
 * 2026-08-17 실기기에 받아 둔 것이 `imaginative`이므로 그것으로 둔다.
 */
const PROBE_CHARACTER: Character = "imaginative";

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

      {/*
        014 — 캐릭터별 모델 표시 이름 (local·dev 전용, FR-017·019). `report`가 이미
        `roster.ts`의 `displayName()`을 담아 왔으므로 여기서는 그리기만 한다 —
        이 파일이 `roster.ts`를 직접 import하지 않는다(007 헌법 검사 유지).
      */}
      {CHARACTERS.map((character) => (
        <Row key={character} label={character} value={report.characterModels[character]} />
      ))}

      {/* 004 — 권한 상태와 요청. 이것이 없으면 실기기에서 영원히 unknown이다 */}
      <PermissionPanel port={photoPort} />
      <SignalProbe port={photoPort} />

      {/* 005 — 일기가 실제로 나오는지 확인한다(quickstart D2). 이것이 없으면
          실기기에서 생성을 눌러 볼 방법이 없다 */}
      {/*
        조립이 실패하면 생성 패널을 띄우지 않는다 — 환경을 모르는 채로 추론 위치를
        고를 수 없다(FR-035). 진단 화면이므로 까닭을 그대로 보인다.
      */}
      {generation.ok ? (
        <GenerationProbe pipeline={generation.pipeline} character={PROBE_CHARACTER} />
      ) : (
        <Text style={styles.failure}>생성 준비 실패: {generation.detail}</Text>
      )}

      {/* 020 — "지금 자동 생성 트리거"(quickstart.md §4). 경합 재현·백그라운드
          완주 시간 측정용. `runAutoDiaryTask()`를 그대로 부른다(로직 재사용). */}
      <AutoDiaryTriggerButton />

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
