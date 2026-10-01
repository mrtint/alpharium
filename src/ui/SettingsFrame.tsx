/**
 * 설정·개발자·이름 바꾸기가 같이 쓰는 하위 화면 틀 (055, 보드 `6c` ①).
 *
 * 계약: specs/055-settings-entry-frame/contracts/settings-stack.md F1·F2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 고정 머리(「‹ 일기」 + 큰 제목 + 2px 선)와 그 아래 회색 지면이다. **지면만 스크롤된다** — 머리는 스크롤 밖에 있다.
 * 048의 `SubScreenFrame`(「← 일기」 한 줄)을 대신한다. 뒤로 가기 가로채기는 이 틀이 아니라 겹(`StackLayer`)이 한다 —
 * 틀은 그리기만 한다.
 *
 * **안전 영역은 더하지 않는다**(research R4) — 바깥 `SafeAreaView`(App.tsx, 네 변)가 이미 상단·하단 인셋을 뺐다. 머리 위
 * 10(보드 56에서 iOS 상태 표시줄 46을 뺀 값 — 홈 헤더 70 → 24와 같은 환산)은 상태 표시줄 아래에서, 지면 아래 40은 제스처 바
 * 위에서 잰다. 두 번 더하면 머리가 내려앉는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { AppText } from "./components/Text";
import { BACK_CHEVRON } from "./settings-text";
import { COLORS, SETTINGS, WRITTEN_DAY } from "./theme/tokens";

const { head, paperPadding } = SETTINGS;

export function SettingsFrame({
  backLabel,
  title,
  onBack,
  children,
  backTestID = "back-to-home",
}: {
  /** 뒤로 글자 — 앞의 ‹ 는 틀이 그린다 */
  backLabel: string;
  title: string;
  onBack: () => void;
  children: ReactNode;
  /** 048 흐름이 쓰는 `back-to-home`이 기본이다. 설정 위에 쌓인 화면은 다른 값을 준다 */
  backTestID?: string;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View
        style={{ paddingTop: head.paddingTop, paddingHorizontal: head.paddingH }}
        testID="settings-head"
      >
        <Pressable
          accessibilityLabel={backLabel}
          accessibilityRole="button"
          onPress={onBack}
          style={{
            minHeight: head.backMinHeight,
            marginLeft: -4,
            flexDirection: "row",
            alignItems: "center",
            gap: head.backGap,
            alignSelf: "flex-start",
          }}
          testID={backTestID}
        >
          <AppText style={{ fontSize: head.chevronSize, lineHeight: head.chevronSize }}>
            {BACK_CHEVRON}
          </AppText>
          <AppText style={{ fontSize: head.backSize, fontWeight: head.backWeight }}>
            {backLabel}
          </AppText>
        </Pressable>
        <View
          style={{
            paddingTop: head.titlePaddingTop,
            paddingBottom: head.titlePaddingBottom,
            borderBottomWidth: head.ruleWidth,
            borderBottomColor: COLORS.text,
          }}
          testID="settings-title-row"
        >
          <AppText
            accessibilityRole="header"
            style={{
              fontSize: head.titleSize,
              fontWeight: head.titleWeight,
              lineHeight: head.titleLineHeight,
              letterSpacing: head.titleSize * head.titleLetterSpacingEm,
            }}
            testID="settings-title"
          >
            {title}
          </AppText>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingTop: paperPadding.top,
          paddingHorizontal: paperPadding.horizontal,
          paddingBottom: paperPadding.bottom,
        }}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, backgroundColor: WRITTEN_DAY.paper }}
        testID="settings-paper"
      >
        {children}
      </ScrollView>
    </View>
  );
}
