/**
 * 설정 탭 "일기 작성자" 섹션 — 준비된 캐릭터 중 하나를 작성자로 고정한다 (029).
 *
 * 계약: specs/029-writing-flow-simplification/contracts/settings-sections.md S1
 *       (SS1·SS2)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **화면은 모델을 모른다**(원칙 III, `checkSourceFile` `UI_TOUCHES_MODEL`). persona
 * 이름·소개와 준비 여부만 props로 받는다 — 007 `CharacterPicker` 선례.
 *
 * 미준비 캐릭터의 다운로드 관리(멈춤·삭제·재개)는 이 섹션 아래의
 * `CharacterListScreen`이 그대로 맡는다(SS4). 여기서는 "작성자로 선택"만.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "./components/Text";
import { COLORS, RADIUS } from "./theme/tokens";

export type AuthorOption = {
  /** persona 이름 (014). 모델 식별자가 아니다. */
  name: string;
  /** persona 소개 (014). */
  tagline: string;
  /** 이 캐릭터를 지금 작성자로 고를 수 있는가 (003 readiness). */
  ready: boolean;
  /** 지금 작성자로 고정돼 있는가. */
  selected: boolean;
};

export type AuthorPickerProps = {
  /** CHARACTERS 순서대로. `App.tsx`(조립)가 persona·readiness를 계산해 넘긴다. */
  options: readonly AuthorOption[];
  /** index로 고른다 — 화면은 Character 심볼을 모른다. */
  onSelect: (index: number) => void;
};

export function AuthorPicker({ options, onSelect }: AuthorPickerProps) {
  return (
    <View style={styles.container} testID="author-picker">
      <AppText variant="sectionTitle">일기 작성자</AppText>
      {options.map((opt, index) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: opt.selected, disabled: !opt.ready }}
          disabled={!opt.ready}
          key={opt.name}
          onPress={() => onSelect(index)}
          style={[styles.row, opt.selected && styles.rowSelected, !opt.ready && styles.rowDisabled]}
          testID={`author-option-${index}`}
        >
          <View style={styles.info}>
            <AppText variant="body">{opt.name}</AppText>
            <AppText variant="caption">{opt.tagline}</AppText>
            {!opt.ready && (
              <AppText variant="caption">아직 준비되지 않음 — 아래에서 내려받으세요</AppText>
            )}
          </View>
          {opt.selected && (
            <AppText variant="caption" style={{ color: COLORS.accent, fontWeight: "600" }}>
              작성자
            </AppText>
          )}
        </Pressable>
      ))}
    </View>
  );
}

// 032 — 색은 tokens.ts에서. persona 이름·소개·testID·문안 불변(SM5, 원칙 III).
const styles = StyleSheet.create({
  container: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: RADIUS.card,
  },
  rowSelected: { borderColor: COLORS.accent, borderWidth: 1 },
  rowDisabled: { opacity: 0.5 },
  info: { flex: 1, gap: 2 },
});
