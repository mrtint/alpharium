/**
 * 작명 완료, 다운로드 대기 화면 (040).
 *
 * 계약: specs/040-onboarding-parallel-setup/spec.md FR-006, Clarifications
 *       contracts/first-run-gate.md — resolveFirstRunStage의
 *       "waiting-for-download" 단계에 대응
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 사용자가 작명 화면에서 이름을 먼저 지었는데 모델 내려받기가 아직 안 끝났을
 * 때만 보인다. **그만두기/취소 경로가 없다** — 029의 필수 에셋(공용 사진 모델
 * + 기본 캐릭터)은 앱 동작에 반드시 필요하므로, 최초 온보딩은 다운로드
 * 완료까지 머무른다(clarify 답변, 007의 "그만두기 버튼"은 이미 받은 상태에서
 * 새로 받는 것에 적용되며 여기는 해당하지 않는다).
 *
 * **모델 식별자·진행 속도 지표를 노출하지 않는다**(FR-012, 원칙 III·IV) —
 * 보여주는 것은 0~1 사이의 합산 진행률(`029 essentialDownloadFraction`의
 * 결과) 하나뿐이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "./components/Text";
import { COLORS } from "./theme/tokens";

export type WaitingForDownloadScreenProps = {
  /** 029 `essentialDownloadFraction()`의 결과. 0~1. */
  fraction: number;
};

export function WaitingForDownloadScreen({ fraction }: WaitingForDownloadScreenProps) {
  const percent = Math.round(Math.max(0, Math.min(1, fraction)) * 100);

  return (
    <View style={styles.container} testID="waiting-for-download-screen">
      <ActivityIndicator color={COLORS.accent} size="large" />
      <AppText variant="title">잠시만요</AppText>
      <AppText variant="body" style={styles.centerText}>
        일기를 쓰는 데 필요한 것을 마저 내려받는 중이에요.
      </AppText>

      <View style={styles.progressTrack} testID="waiting-for-download-progress">
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 24,
    backgroundColor: COLORS.bg,
  },
  centerText: { textAlign: "center" },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  progressFill: { height: 8, backgroundColor: COLORS.accent },
});
