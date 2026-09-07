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
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { COLORS, PRESS } from "../theme/tokens";
import { AppText } from "./Text";

export type ListRowProps = {
  /**
   * 좌측 내용.
   *
   * **033에서 `string`에 노드를 더했다**(data-model.md §2). 문자열이면 지금처럼
   * `AppText`로 감싸고, 노드면 그대로 그린다 — `CharacterListScreen`의 행은
   * 좌측이 이름·소개·상태·저장공간으로 **세로로 쌓이므로** 문자열 하나에 안
   * 담긴다. 032 T062가 "구조가 안 맞는다"고 판단한 이유가 이것이었고, 타입을
   * 넓히자 그 전제가 사라졌다.
   *
   * **순수 확장이다** — 기존 호출부(전부 문자열)가 하나도 안 깨진다.
   */
  label: string | React.ReactNode;
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
  /*
   * 033 — 눌림 반응 (contracts/press-feedback.md PF3·PF4·PF6).
   *
   * **`onPress`가 있는 갈래에만 준다** — 누를 수 없는 행(`View`)은 반응 대상이
   * 아니다. `disabled`도 마찬가지다(PF6).
   */
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  /* `Button.tsx`와 같은 이유로 이 한 줄에서만 규칙을 끈다 — shared value는 React
     렌더 트리 밖(UI 스레드)의 값이라 immutability 규칙의 대상이 아니다. */
  const setScale = (to: number) => {
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withTiming(to, { duration: PRESS.durationMs });
  };

  const body = (
    <>
      {typeof label === "string" ? <AppText variant="body">{label}</AppText> : label}
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
        onPressIn={disabled ? undefined : () => setScale(PRESS.scale)}
        onPressOut={disabled ? undefined : () => setScale(1)}
        style={[ROW_STYLE, disabled ? { opacity: 0.5 } : null, style]}
        testID={testID}
      >
        <Animated.View
          style={[
            pressStyle,
            {
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            },
          ]}
        >
          {body}
        </Animated.View>
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
