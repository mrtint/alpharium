/**
 * 홈에서 들어가는 하위 화면(설정·개발자)의 껍데기 (048 US4).
 *
 * 계약: specs/048-diary-home-modernist/contracts/home-screen.md N2·N3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **전역 탭 줄이 사라졌다**(설계 D1). 설정·개발자는 홈의 `⋯` 메뉴로 들어가는 하위 화면이 되고,
 * 돌아오는 길은 위의 「← 일기」와 안드로이드 뒤로 가기 둘이다(FR-004).
 *
 * **뒤로 가기는 이 프레임이 마운트된 동안만 가로챈다.** 홈에는 이 프레임이 없으므로 홈에서의
 * 뒤로 가기는 지금처럼 OS가 처리한다 — 앱이 가로채지 않는다.
 *
 * **안의 내용은 바꾸지 않는다**(FR-007) — 설정·개발자 화면을 그대로 감쌀 뿐이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ReactNode } from "react";
import { useEffect } from "react";
import { BackHandler, Pressable, View } from "react-native";

import { AppText } from "./components/Text";
import { COLORS } from "./theme/tokens";

export function SubScreenFrame({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [onBack]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={{ paddingVertical: 12, paddingHorizontal: 20, alignSelf: "flex-start" }}
          testID="back-to-home"
        >
          <AppText variant="bodyStrong">← 일기</AppText>
        </Pressable>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
