/**
 * 032 — 버튼 (contracts/ui-components.md UC1).
 *
 * `Pressable` 기반. `variant` 3종:
 *  - `primary`  — accent 배경 + accentForeground 글자 (주요 동작)
 *  - `secondary`— surface 배경 + text 글자 + border 테두리 (보조)
 *  - `danger`   — danger 배경 + dangerForeground 글자 (되돌릴 수 없는 동작)
 *
 * `disabled`면 눌러도 `onPress`가 불리지 않고 흐려진다. 색 스킴 미감지.
 */

import { Pressable, type PressableProps } from "react-native";

import { COLORS, RADIUS } from "../theme/tokens";
import { AppText } from "./Text";

export type ButtonVariant = "primary" | "secondary" | "danger";

export type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  variant?: ButtonVariant;
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  testID?: string;
};

const CLASS: Record<ButtonVariant, string> = {
  primary: "bg-accent",
  secondary: "bg-surface border border-border",
  danger: "bg-danger",
};

const BG: Record<ButtonVariant, string> = {
  primary: COLORS.accent,
  secondary: COLORS.surface,
  danger: COLORS.danger,
};

const FG: Record<ButtonVariant, string> = {
  primary: COLORS.accentForeground,
  secondary: COLORS.text,
  danger: COLORS.dangerForeground,
};

export function Button({
  variant = "primary",
  onPress,
  disabled = false,
  children,
  testID,
  ...rest
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`${CLASS[variant]} px-4 py-3 rounded-card items-center`}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={{
        backgroundColor: BG[variant],
        borderRadius: RADIUS.card,
        opacity: disabled ? 0.5 : 1,
        borderWidth: variant === "secondary" ? 1 : 0,
        borderColor: variant === "secondary" ? COLORS.border : undefined,
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: "center",
      }}
      testID={testID}
      {...rest}
    >
      <AppText variant="body" style={{ color: FG[variant], fontWeight: "600" }}>
        {children}
      </AppText>
    </Pressable>
  );
}
