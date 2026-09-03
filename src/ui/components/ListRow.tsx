/**
 * 032 — 목록 행 (contracts/ui-components.md UC3).
 *
 * 좌: `label`. 우: `value`(텍스트) 또는 `right`(임의 노드) 또는 chevron(`›`).
 * `onPress`가 있으면 `Pressable`(+`accessibilityRole="button"`), 없으면 `View`.
 * 하단에 hairline border.
 *
 * 일기 목록 항목, 설정 행에 쓴다. `testID`를 루트에 전달한다(Maestro·기존 화면
 * 테스트 호환 — UC-C2).
 */

import { Pressable, View, type ViewStyle } from "react-native";

import { COLORS } from "../theme/tokens";
import { AppText } from "./Text";

export type ListRowProps = {
  label: string;
  /** 우측 값 텍스트. `right`와 택일. */
  value?: string;
  /** 우측 임의 노드. `value`와 택일. */
  right?: React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: ViewStyle;
};

const ROW_STYLE: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 14,
  borderBottomWidth: 0.5,
  borderBottomColor: COLORS.border,
};

export function ListRow({
  label,
  value,
  right,
  onPress,
  chevron = false,
  disabled = false,
  testID,
  style,
}: ListRowProps) {
  const body = (
    <>
      <AppText variant="body">{label}</AppText>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {value !== undefined && <AppText variant="caption">{value}</AppText>}
        {right}
        {chevron && <AppText variant="body">{"›"}</AppText>}
      </View>
    </>
  );

  if (onPress !== undefined) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        className="flex-row items-center justify-between py-3.5 border-b border-border"
        disabled={disabled}
        onPress={disabled ? undefined : onPress}
        style={[ROW_STYLE, disabled ? { opacity: 0.5 } : null, style]}
        testID={testID}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View
      className="flex-row items-center justify-between py-3.5 border-b border-border"
      style={[ROW_STYLE, style]}
      testID={testID}
    >
      {body}
    </View>
  );
}
