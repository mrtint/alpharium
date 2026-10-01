/**
 * 자동 일기 작성 설정 화면 (020).
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/auto-diary-settings.md
 *       S6
 *       specs/020-scheduled-diary-notification/contracts/battery-exception.md
 *       E3·E4·E5
 *       spec.md FR-001·FR-002·FR-010·SC-001
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **판정은 화면이 하지 않는다.** props로 받은 `settings`와 콜백만 쓴다 —
 * 부수 효과 순서(알림 권한 → 배터리 예외 1회 → save → register/unregister/
 * reschedule)는 `App.tsx`가 배선한다(S6). 007의 `CharacterPicker`,
 * 017의 `GeocodingSettingToggle`이 그리기만 하는 것과 같은 구조.
 *
 * **정밀도를 암시하는 문구를 두지 않는다**(FR-002, E5) — "정각에", "매일
 * 7시" 같은 표현 금지. 계약 테스트가 소스에서 그런 문자열이 없음을
 * 확인한다.
 *
 * **모델 정보 없음**(원칙 III) — 목표 시각·on/off만.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Pressable, StyleSheet, View } from "react-native";

import type { AutoDiarySettings } from "../schedule/settings";
import { AppText } from "./components/Text";
import { COLORS } from "./theme/tokens";

export type AutoDiarySettingsScreenProps = {
  /** 지금 설정. 기본값은 꺼짐·7시(FR-009·FR-001) */
  settings: AutoDiarySettings;
  /** 목표 시각 변경 (0–23). enabled 유지 시 reschedule로 이어진다 */
  onChangeTargetHour: (hour: number) => void;
  /**
   * 알림 권한이 거부됐는가 (N8 Edge Case). true면 "앱을 열어 확인" 안내를
   * 보인다 — 자동 생성 자체는 켤 수 있다(생성은 알림과 무관하게 완주).
   */
  notificationDenied?: boolean;
};

/** 목표 시각 선택지. 시 단위(0–23) — 분은 두지 않는다(근사치, FR-002). */
const HOURS = Array.from({ length: 24 }, (_, h) => h);

/**
 * ★ 055 — **시각 선택만 남았다.** on/off 토글은 설정 화면의 「자동으로 쓰기」 행(`SettingsScreen`, 보드 `6c` ③)이,
 * 배터리 링크는 「권한 · 휴대폰 설정으로 이동」의 배터리 행(앱 정보 화면)이 맡는다. 이 시각 목록은 분해 설계 §3.2(「매일 쓰는
 * 시각」 행 + 시 격자 대화상자)가 대신할 때까지 지금 동작·문구 그대로 「일기」 묶음 안에 놓인다(055 FR-019). 바깥 스크롤은
 * 설정 지면이 한다 — 여기서 `ScrollView`를 두지 않는다(겹치면 안쪽이 스크롤을 먹는다).
 */
export function AutoDiarySettingsScreen({
  settings,
  onChangeTargetHour,
  notificationDenied,
}: AutoDiarySettingsScreenProps) {
  return (
    <View style={styles.page}>
      {/* ★ 목표 시각 선택 UI — 시 단위(0–23). */}
      <View style={styles.section}>
        <AppText variant="sectionTitle">언제쯤 쓸까</AppText>

        {/* ★ E5·SC-001 — 근사치 안내. 이 문구만 보고 "근방"임을 이해할 수 있어야 한다. */}
        <AppText variant="caption">
          고른 시각 그대로가 아니라 그 무렵에 씁니다. 기기 상태에 따라 더 늦어질 수 있어요.
        </AppText>

        <View style={styles.hourGrid}>
          {HOURS.map((hour) => {
            const isSelected = hour === settings.targetHour;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={hour}
                onPress={() => onChangeTargetHour(hour)}
                style={[styles.hourCell, isSelected && styles.hourCellSelected]}
                testID={`target-hour-${hour}`}
              >
                <AppText variant="body" style={isSelected ? { fontWeight: "600" } : undefined}>
                  {hour}시
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ★ N8 — 알림 권한이 거부된 상태 안내. 자동 생성은 켤 수 있다. */}
      {notificationDenied === true && (
        <AppText variant="caption">
          알림 권한이 없어 완료를 알릴 수 없어요. 앱을 열어 새 일기를 확인하세요.
        </AppText>
      )}
    </View>
  );
}

// 032 — 색은 tokens.ts에서. 시각 시 단위(0–23)·정밀도 암시 문구 없음·testID 불변(SM5).
const styles = StyleSheet.create({
  // 055 — 설정 지면(좌우 20)과 같은 세로선에 선다. 위아래만 띄운다.
  page: { paddingVertical: 12, gap: 16 },
  section: { gap: 8 },
  hourGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hourCell: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 6,
  },
  hourCellSelected: { borderWidth: 2, borderColor: COLORS.accent },
});
