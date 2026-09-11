/**
 * 전체화면 로고 (040).
 *
 * 계약: specs/040-onboarding-parallel-setup/spec.md FR-001
 *       contracts/first-run-gate.md G3
 *       research.md #6
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 첫 실행의 첫 화면이다 — 사용자 조작 없이 고정 지연 후 `onDone`을 불러 다음
 * 단계(권한 온보딩)로 자동 전환한다(FR-001, "다음" 같은 화면 버튼을 두지 않는다).
 *
 * **지연값은 여기(화면 계층) 상수다** — `src/firstrun/`(순수 판정)이 아니라
 * `src/ui/`가 "얼마나 보여줄지"를 정한다(research.md #1과 같은 판단).
 *
 * **모델·진행 지표를 노출하지 않는다**(FR-012, 원칙 III·IV) — 문구는 브랜드
 * 이름뿐이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "./components/Text";
import { COLORS } from "./theme/tokens";

/** 로고를 보여주는 고정 시간 (화면 계층 상수, research.md #1과 같은 판단). */
export const LOGO_DISPLAY_MS = 1500;

export type LogoScreenProps = {
  /** 지연 후(또는 테스트에서 즉시) 다음 단계로 전환한다. */
  onDone: () => void;
};

export function LogoScreen({ onDone }: LogoScreenProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, LOGO_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <View style={styles.container} testID="first-run-logo">
      <AppText variant="title">알파리움</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
  },
});
