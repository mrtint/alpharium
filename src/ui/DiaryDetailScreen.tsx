/**
 * 일기 전문 화면.
 *
 * 계약: specs/006-first-diary-app/contracts/screens.md §2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **여기서 지키는 것**:
 *  - 모델 식별자·파라미터·양자화·파일 이름을 보이지 않는다(S4, 원칙 III). **캐릭터
 *    이름조차 보이지 않는다** — 관측 근거가 없어 표시 문안을 아직 짓지 않았고(003·005),
 *    내부 식별자를 그대로 보이면 그것으로 모델을 역추적할 수 있다
 *  - 생성 시간·속도·토큰 수를 보이지 않는다(S5, 원칙 IV)
 *  - **`unknown`과 `none`을 다른 말로 옮긴다**(FR-032, 원칙 V) — 004가 값에서 지킨
 *    구분이 화면에서 무너지면 무의미해진다
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { DiaryEntry } from "../diary/types";
import type { DaySignals, SignalValue } from "../signals/types";

export type DiaryDetailScreenProps = {
  entry: DiaryEntry;
  /**
   * 저장됐는가 (006 FR-012b).
   *
   * 목록에서 연 일기는 이미 저장된 것이므로 기본값이 `true`다. 방금 생성했는데 저장에
   * 실패한 경우에만 `false`가 온다.
   */
  saved?: boolean;
  /**
   * 이전 일기를 덮어썼는가 (006 FR-034, 002 FR-023a).
   *
   * **조용히 덮어쓰면 사용자는 이전 일기가 사라진 줄도 모른다.** 목록에서 연 일기는
   * 방금 쓴 것이 아니므로 기본값이 `false`다.
   */
  overwrote?: boolean;
};

/**
 * 신호 하나를 사람이 읽는 말로 옮긴다 (FR-032).
 *
 * **세 갈래가 서로 다른 문장이 된다.** `none`은 「없었다」이고 `unknown`은 「모른다」이며,
 * 둘을 같은 말로 적으면 004가 지킨 구분이 여기서 무너진다 — 모르는 것을 「없었다」로
 * 적으면 화면이 거짓을 말한다.
 *
 * **`unknown`에 까닭을 싣지 않는다.** 「권한이 없다」·「안드로이드가 안 준다」는
 * 프롬프트가 모델에게 하는 말이고(005 `prompt.ts`), 화면에는 「모른다」로 충분하다.
 */
function describe<T>(signal: SignalValue<T>, known: (value: T) => string): string {
  switch (signal.kind) {
    case "known":
      return known(signal.value);
    case "none":
      return "없었다";
    case "unknown":
      return "모른다";
  }
}

/** 그 일기가 무엇을 보고 쓰였는가 (002 FR-011) */
function signalLines(signals: DaySignals): { label: string; value: string }[] {
  return [
    {
      label: "사진",
      value: describe(signals.photos, (observation) => `${observation.photos.length}장`),
    },
    {
      label: "다닌 자리",
      value: describe(signals.places, (places) => `${places.trace.visitCount}곳`),
    },
    { label: "걸음 수", value: describe(signals.steps, (steps) => `${steps}걸음`) },
  ];
}

export function DiaryDetailScreen({
  entry,
  saved = true,
  overwrote = false,
}: DiaryDetailScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.day}>{entry.date}</Text>

      {/* **저장하지 못했으면 남지 않는다는 것을 말한다**(FR-012b) */}
      {!saved && (
        <Text style={styles.unsaved}>저장하지 못했다. 앱을 나가면 이 일기는 사라진다</Text>
      )}

      {/* **덮어썼다는 사실을 알린다**(FR-034) — 사라진 일기는 되돌릴 수 없다 */}
      {overwrote && <Text style={styles.overwrote}>이전 일기를 덮어썼다</Text>}

      {/* 일기가 길면 스크롤된다 */}
      <Text style={styles.text}>{entry.text}</Text>

      {/*
        무엇을 보고 썼는가(002 FR-011). **모르는 것과 없는 것이 구분된다**(원칙 V).
      */}
      <View style={styles.signals}>
        <Text style={styles.signalsTitle}>이 일기가 본 것</Text>
        {signalLines(entry.signalsUsed).map((line) => (
          <Text key={line.label} style={styles.signal}>
            {line.label}: {line.value}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 16 },
  day: { fontSize: 14, opacity: 0.6 },
  unsaved: { fontSize: 14 },
  overwrote: { fontSize: 13, opacity: 0.7 },
  text: { fontSize: 16, lineHeight: 26 },
  signals: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ccc",
    gap: 4,
  },
  signalsTitle: { fontSize: 13, opacity: 0.6, marginBottom: 4 },
  signal: { fontSize: 14, opacity: 0.8 },
});
