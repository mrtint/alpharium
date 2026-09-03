/**
 * 032 — 값 선택 행 (contracts/ui-components.md UC7).
 *
 * `options` 중 하나를 고른다. 각 옵션이 `Pressable`이고
 * `accessibilityState={{ selected, disabled }}`. 선택된 옵션에 시각 표식(테두리
 * 강조 + "선택" 라벨) — 표식이 여러 조각이 되지 않게 `accessibilityLabel`을
 * 함께 준다(025 교훈).
 *
 * `AuthorPicker`(일기 작성자)·자동 생성 시각·`VisionPicker` 패턴이 이걸로
 * 수렴한다. 이관 시 각 화면의 기존 `testID`(`author-option-<i>` 등)를 이
 * 컴포넌트의 `testID` prop으로 전달해 유지한다(UC-C2).
 *
 * controlled — `selectedIndex`를 prop으로 받고 `onSelect(index)`만 호출한다.
 */

import { Pressable, View, type ViewStyle } from "react-native";

import { COLORS, RADIUS } from "../theme/tokens";
import { AppText } from "./Text";
import { SectionHeader } from "./SectionHeader";

export type SelectRowOption = {
  label: string;
  /** 옵션 아래 보조 설명(선택). */
  hint?: string;
};

export type SelectRowProps = {
  label: string;
  options: readonly SelectRowOption[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  disabledIndices?: readonly number[];
  testID?: string;
  /**
   * 옵션별 `testID`를 직접 정한다 (기본은 `${testID}-option-${i}`).
   *
   * 032 이관에서 기존 화면들이 `vision-quick`·`geocoding-on`·`author-option-0`·
   * `target-hour-7` 같은 고유 키를 이미 쓰고 있어, `SelectRow`로 바꿔도 그
   * Maestro·테스트 키가 유지되도록 한다(SM 공통 원칙 — `testID` 불변).
   */
  optionTestID?: (index: number, option: SelectRowOption) => string | undefined;
};

const OPTION_STYLE: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 12,
  paddingHorizontal: 12,
  borderWidth: 0.5,
  borderColor: COLORS.border,
  borderRadius: RADIUS.card,
};

export function SelectRow({
  label,
  options,
  selectedIndex,
  onSelect,
  disabledIndices = [],
  testID,
  optionTestID,
}: SelectRowProps) {
  return (
    <View className="gap-2" style={{ gap: 8 }} testID={testID}>
      <SectionHeader>{label}</SectionHeader>
      {options.map((opt, index) => {
        const selected = index === selectedIndex;
        const disabled = disabledIndices.includes(index);
        const rowTestID =
          optionTestID?.(index, opt) ?? (testID ? `${testID}-option-${index}` : undefined);
        return (
          <Pressable
            accessibilityLabel={`${opt.label}${selected ? ", 선택됨" : ""}`}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            key={opt.label}
            onPress={disabled ? undefined : () => onSelect(index)}
            style={[
              OPTION_STYLE,
              selected ? { borderColor: COLORS.accent, borderWidth: 1 } : null,
              disabled ? { opacity: 0.5 } : null,
            ]}
            testID={rowTestID}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="body">{opt.label}</AppText>
              {opt.hint !== undefined && <AppText variant="caption">{opt.hint}</AppText>}
            </View>
            {selected && (
              <AppText variant="caption" style={{ color: COLORS.accent, fontWeight: "600" }}>
                선택
              </AppText>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
