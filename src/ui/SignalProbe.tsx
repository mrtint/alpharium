/**
 * 진단 화면에서 오늘의 신호를 조회해 본다.
 *
 * 계약: specs/004-photo-signal-collection/contracts/diagnostics.md
 *
 * **quickstart D2·D3이 이것으로 검증된다** — 실기기에서 「권한을 거절하면 `unknown`,
 * 허용하면 `known`/`none`」이 실제로 그런지 눈으로 본다. 그 확인 없이는 이 기능이
 * 검증되지 않은 상태다(헌법 원칙 V).
 *
 * **사용자용 화면이 아니다**(FR-022). 값을 그대로 보여줄 뿐 문안을 짓지 않는다.
 *
 * **모델 정보를 보이지 않는다**(FR-019) — 003의 경계 그대로다. 신호는 모델에 닿지 않으므로
 * 여기서 샐 것이 없지만, 나중에 이 화면이 자랄 때를 위해 적어 둔다.
 */

import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { dayOf } from "../config/day-boundary";
import { collectDaySignals } from "../signals/collect";
import type { PhotoPort } from "../signals/port";
import type { DaySignals, SignalValue } from "../signals/types";

/** 신호 하나를 사람이 읽을 한 줄로. **값을 꾸미지 않는다** */
function describeSignal(signal: SignalValue<unknown>): string {
  switch (signal.kind) {
    case "known":
      return "known";
    case "none":
      return "none";
    case "unknown":
      return `unknown — ${signal.reason}`;
  }
}

/** 사진 신호는 장수와 「전부인가」가 함께 보여야 한다(FR-014d) */
function describePhotos(signals: DaySignals): string {
  const photos = signals.photos;
  if (photos.kind !== "known") return describeSignal(photos);

  const { photos: list, complete } = photos.value;
  // **잘렸으면 그 사실이 보여야 한다** — 장수를 그대로 읽으면 거짓이 된다.
  return complete ? `known — ${list.length}장` : `known — ${list.length}장 (잘림, 전부가 아님)`;
}

/** 자리 신호는 「몇 장에서 얻었나」가 함께 보여야 뜻이 산다 */
function describePlaces(signals: DaySignals): string {
  const places = signals.places;
  if (places.kind !== "known") return describeSignal(places);

  const { trace, photosWithLocation, photosConsidered } = places.value;
  return `known — ${trace.visitCount}곳, ${trace.approximateDistanceMeters}m (사진 ${photosConsidered}장 중 ${photosWithLocation}장에서)`;
}

export function SignalProbe({ port }: { port: PhotoPort }) {
  const [signals, setSignals] = useState<DaySignals | null>(null);
  const [busy, setBusy] = useState(false);

  const probe = useCallback(async () => {
    setBusy(true);
    try {
      // "지금"을 여기서 읽는다 — `collectDaySignals`는 하루를 인자로 받는다.
      setSignals(await collectDaySignals(port, dayOf(new Date())));
    } finally {
      setBusy(false);
    }
  }, [port]);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>오늘의 신호</Text>

      <Pressable style={styles.button} onPress={probe} testID="signal-probe-run">
        <Text style={styles.buttonText}>{busy ? "조회 중…" : "신호 조회"}</Text>
      </Pressable>

      {signals !== null && (
        <View style={styles.results}>
          <Row label="사진" value={describePhotos(signals)} testID="signal-photos" />
          <Row label="자리" value={describePlaces(signals)} testID="signal-places" />
          <Row label="걸음" value={describeSignal(signals.steps)} testID="signal-steps" />
          <Row label="배터리" value={describeSignal(signals.battery)} testID="signal-battery" />
          <Row
            label="연결"
            value={describeSignal(signals.connectivity)}
            testID="signal-connectivity"
          />
        </View>
      )}
    </View>
  );
}

function Row({ label, value, testID }: { label: string; value: string; testID: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} testID={testID}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 8, marginTop: 8 },
  title: { fontSize: 12, opacity: 0.6 },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  buttonText: { fontSize: 14 },
  results: { gap: 6, marginTop: 4 },
  row: { gap: 2 },
  label: { fontSize: 12, opacity: 0.6 },
  value: { fontSize: 14 },
});
