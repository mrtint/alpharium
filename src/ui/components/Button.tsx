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
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { COLORS, PRESS, RADIUS } from "../theme/tokens";
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
  /*
   * 033 — 눌림 반응 (contracts/press-feedback.md PF3·PF4·PF6).
   *
   * **`Animated.View`가 `Pressable` 안에 있다.** 밖에 두면 `testID`·
   * `accessibilityRole`이 애니메이션 노드로 밀려 Maestro 조회 경로가 바뀐다 —
   * 008이 실측한 "버튼이 자기 이름을 가져야 한다"가 깨지는 자리다.
   *
   * **`disabled`면 반응하지 않는다**(PF6). 반응만 있고 아무 일도 안 일어나면
   * 008이 고쳤던 「버튼이 고장났다」 인상이 돌아온다.
   *
   * transform만 바꾼다(PF4) — 레이아웃 속성을 건드리면 주변이 밀려난다.
   */
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  /*
   * **`react-hooks/immutability`를 이 한 줄에서만 끈다.**
   *
   * React Compiler 규칙은 `scale.value = …`를 React 상태 변경으로 보지만,
   * reanimated의 shared value는 React 렌더 트리 밖(UI 스레드)에 사는 값이라
   * 이 규칙의 대상이 아니다 — 이것이 reanimated의 정상 사용법이다.
   * 규칙을 설정 파일에서 통째로 끄면 진짜 위반까지 놓치므로 **여기서만** 끈다.
   */
  const setScale = (to: number) => {
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withTiming(to, { duration: PRESS.durationMs });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`${CLASS[variant]} px-4 py-3 rounded-card items-center`}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : () => setScale(PRESS.scale)}
      onPressOut={disabled ? undefined : () => setScale(1)}
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
      <Animated.View style={pressStyle}>
        <AppText variant="body" style={{ color: FG[variant], fontWeight: "600" }}>
          {children}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}
