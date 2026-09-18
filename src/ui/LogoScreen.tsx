/**
 * 전체화면 스플래시 로고 (040, ★ 043 — Modernist 마크업 1k 레이아웃 재작성).
 *
 * 계약: specs/040-onboarding-parallel-setup/spec.md FR-001
 *       contracts/first-run-gate.md G3
 *       specs/043-modernist-splash-permissions/spec.md FR-001~FR-006
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 첫 실행의 첫 화면이다 — 사용자 조작 없이 고정 지연 후 `onDone`을 불러 다음
 * 단계(권한 온보딩)로 자동 전환한다(FR-006, "다음" 같은 화면 버튼을 두지 않는다).
 *
 * **지연값은 여기(화면 계층) 상수다** — `src/firstrun/`(순수 판정)이 아니라
 * `src/ui/`가 "얼마나 보여줄지"를 정한다(040 research.md #1과 같은 판단).
 *
 * **043 — 리뷰 보드 프레임 1k 레이아웃 그대로** — 상단(flex:1, 세로 중앙 정렬,
 * 좌측 정렬): 72×72 accent 정사각 로고 마크(모서리 반경 0) + "Alpharium"
 * 브랜드 타이틀. 하단(구분선 위): 좌측 안내 문구 "휴대폰 안에서만", 우측 로딩
 * 점 3개(정적 표시 — FR-005, 원칙 IV. 진행률·모델명을 계산해 보이지 않는다).
 *
 * 로딩 점 3번째 색(마크업 neutral-300 `#d7d3d3`)은 `COLORS`의 9개 역할에 없는
 * 순수 장식색이라 파일 로컬 상수로 둔다(DT1 "정확히 9개" 제약 보호,
 * 043 tasks.md T009).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "./components/Text";
import { COLORS, RADIUS } from "./theme/tokens";

/** 로고를 보여주는 고정 시간 (화면 계층 상수, 040 research.md #1과 같은 판단). */
export const LOGO_DISPLAY_MS = 1500;

/** 마크업 neutral-300 — COLORS 9개 역할에 없는 순수 장식색(DT1 보호). */
const LOADING_DOT_INACTIVE = "#d7d3d3";

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
      <View style={styles.top}>
        <View style={styles.logoMark} testID="splash-logo-mark" />
        <AppText style={styles.title}>Alpharium</AppText>
      </View>

      <View style={styles.bottom}>
        <AppText style={styles.caption}>휴대폰 안에서만</AppText>
        <View style={styles.dots}>
          <View
            style={[styles.dot, { backgroundColor: COLORS.accent }]}
            testID="splash-loading-dot-0"
          />
          <View
            style={[styles.dot, { backgroundColor: COLORS.accent, opacity: 0.5 }]}
            testID="splash-loading-dot-1"
          />
          <View
            style={[styles.dot, { backgroundColor: LOADING_DOT_INACTIVE }]}
            testID="splash-loading-dot-2"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: COLORS.bg,
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 44,
  },
  top: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 20,
  },
  logoMark: {
    width: 72,
    height: 72,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.card,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.03 * 30,
    lineHeight: 30,
    color: COLORS.text,
  },
  bottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  caption: {
    fontSize: 11,
    letterSpacing: 0.1 * 11,
    textTransform: "uppercase",
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.card,
  },
});
