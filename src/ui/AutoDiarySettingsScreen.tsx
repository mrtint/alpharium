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

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { AutoDiarySettings } from "../schedule/settings";

export type AutoDiarySettingsScreenProps = {
  /** 지금 설정. 기본값은 꺼짐·7시(FR-009·FR-001) */
  settings: AutoDiarySettings;
  /** "자동 생성" on/off 토글. `App.tsx`가 S6 순서로 부수 효과를 배선한다 */
  onToggleEnabled: (enabled: boolean) => void;
  /** 목표 시각 변경 (0–23). enabled 유지 시 reschedule로 이어진다 */
  onChangeTargetHour: (hour: number) => void;
  /** 배터리 최적화 예외 설정 목록을 연다 (E4 상시 링크) */
  onOpenBatterySettings: () => void;
  /**
   * 알림 권한이 거부됐는가 (N8 Edge Case). true면 "앱을 열어 확인" 안내를
   * 보인다 — 자동 생성 자체는 켤 수 있다(생성은 알림과 무관하게 완주).
   */
  notificationDenied?: boolean;
};

/** 목표 시각 선택지. 시 단위(0–23) — 분은 두지 않는다(근사치, FR-002). */
const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function AutoDiarySettingsScreen({
  settings,
  onToggleEnabled,
  onChangeTargetHour,
  onOpenBatterySettings,
  notificationDenied,
}: AutoDiarySettingsScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>자동으로 일기 쓰기</Text>

      {/* ★ on/off 토글 (FR-001). */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: settings.enabled }}
        onPress={() => onToggleEnabled(!settings.enabled)}
        style={[styles.row, settings.enabled && styles.rowSelected]}
        testID="auto-diary-toggle"
      >
        <View style={styles.info}>
          <Text style={styles.name}>자동 생성</Text>
          <Text style={styles.hint}>하루가 지나면 휴대폰이 알아서 그 하루를 일기로 쓴다</Text>
        </View>
        {settings.enabled && <Text style={styles.mark}>켜짐</Text>}
      </Pressable>

      {/* ★ 목표 시각 선택 UI — 시 단위(0–23). */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>언제쯤 쓸까</Text>

        {/* ★ E5·SC-001 — 근사치 안내. 이 문구만 보고 "근방"임을 이해할 수 있어야 한다. */}
        <Text style={styles.notice}>
          고른 시각 그대로가 아니라 그 무렵에 씁니다. 기기 상태에 따라 더 늦어질 수 있어요.
        </Text>

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
                <Text style={isSelected ? styles.hourTextSelected : styles.hourText}>{hour}시</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ★ N8 — 알림 권한이 거부된 상태 안내. 자동 생성은 켤 수 있다. */}
      {notificationDenied === true && (
        <Text style={styles.warn}>
          알림 권한이 없어 완료를 알릴 수 없어요. 앱을 열어 새 일기를 확인하세요.
        </Text>
      )}

      {/* ★ E4 — 배터리 예외 상시 링크. batteryExceptionPrompted·enabled와 무관하게 항상. */}
      <View style={styles.section}>
        <Text style={styles.hint}>
          일기가 제때 안 써지나요? 배터리 설정에서 이 앱을 &apos;제한 없음&apos;으로 바꾸면 더 자주
          시도합니다.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onOpenBatterySettings}
          style={styles.link}
          testID="open-battery-settings"
        >
          <Text>배터리 설정 열기</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 16 },
  title: { fontSize: 20, fontWeight: "600" },
  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 8,
  },
  rowSelected: { borderColor: "#333", borderWidth: 1 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15 },
  hint: { fontSize: 13, opacity: 0.7, lineHeight: 19 },
  mark: { fontSize: 13, fontWeight: "600" },
  notice: { fontSize: 13, opacity: 0.75, lineHeight: 19 },
  warn: { fontSize: 13, opacity: 0.9, lineHeight: 19 },
  hourGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hourCell: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 6,
  },
  hourCellSelected: { borderWidth: 2, borderColor: "#333" },
  hourText: { fontSize: 14 },
  hourTextSelected: { fontSize: 14, fontWeight: "600" },
  link: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
});
