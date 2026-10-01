/**
 * 이름 입력줄 — 보드 `1a`의 밑줄 입력 + 글자 수 카운터 (047, 055가 떼어 냄).
 *
 * 첫 실행 작명(`WelcomeScreen`)과 설정의 이름 바꾸기(`RenameScreen`, 055 Clarification)가 같은 입력줄을 쓴다 — 보드 `6c` ②
 * 「이름 짓기(1a)와 같은 입력 화면」. **모양만 공유한다** — 확정 버튼의 규칙(1a는 흐리지 않음, 설정은 빈 이름이면 흐림)은
 * 각 화면이 정한다.
 *
 * 카운터는 입력 중인 글자 수다 — 원칙 IV가 금지한 측정 지표가 아니다(047 research R6). 조각을 한 문자열로 합쳐 `testID`가
 * 접근성 트리에 남게 한다(025).
 */

import { TextInput, View } from "react-native";

import { AppText } from "./Text";
import { COLORS } from "../theme/tokens";

export function NameField({
  value,
  onChangeText,
  maxLength,
  placeholder,
  inputTestID,
  counterTestID,
  autoFocus,
}: {
  value: string;
  onChangeText: (text: string) => void;
  maxLength: number;
  placeholder: string;
  inputTestID: string;
  counterTestID: string;
  autoFocus?: boolean;
}) {
  const counter = `${value.length}/${maxLength}`;
  return (
    <View style={INPUT_ROW}>
      {/*
       * 025 실측 — 여러 텍스트 조각이 한 `<Text>`에 있으면 `testID`가 접근성 트리에 노출되지 않는다. 입력창은 조각이
       * 하나지만 Maestro가 확실히 찾도록 `accessibilityLabel`을 함께 준다.
       */}
      <TextInput
        accessibilityLabel={placeholder}
        autoFocus={autoFocus}
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        style={INPUT}
        testID={inputTestID}
        value={value}
      />
      <AppText
        accessibilityLabel={counter}
        style={COUNTER}
        testID={counterTestID}
        variant="caption"
      >
        {counter}
      </AppText>
    </View>
  );
}

/** 1a 입력줄 — 밑줄 2px 본문색, 입력 글자와 카운터가 한 줄 양 끝. */
const INPUT_ROW = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottomWidth: 2,
  borderBottomColor: COLORS.text,
  paddingTop: 8,
  paddingBottom: 10,
} as const;

/** 1a 입력 글자 — 28px / 800. 테두리는 `INPUT_ROW`의 밑줄뿐이다. */
const INPUT = {
  flex: 1,
  padding: 0,
  fontSize: 28,
  fontWeight: "800",
  color: COLORS.text,
} as const;

/** 1a 카운터 — 12px, 흐린 글자. */
const COUNTER = { fontSize: 12, lineHeight: 16, marginLeft: 8 } as const;
